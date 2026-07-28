import React, { useState, useEffect } from "react";
import { Header, ActiveTab } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { StudentsView } from "./components/StudentsView";
import { SessionBuilder } from "./components/SessionBuilder";
import { ReportsView } from "./components/ReportsView";
import { ReportPreviewModal } from "./components/ReportPreviewModal";
import { StudentMemoryView } from "./components/StudentMemoryView";
import { SettingsView } from "./components/SettingsView";
import { TemplatesView } from "./components/TemplatesView";
import { ApiDocsView } from "./components/ApiDocsView";
import { UnitTestsView } from "./components/UnitTestsView";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { testFirebaseConnection } from "./lib/firebase";
import {
  saveStudentToFirestore,
  saveSessionToFirestore,
  saveDailyReportToFirestore,
  saveMonthlyReportToFirestore,
  saveStudentMemoryToFirestore,
  saveSettingsToFirestore,
  loadInitialFirestoreData
} from "./lib/firestoreService";
import {
  initialStudents,
  initialSessions,
  initialDailyReports,
  initialMonthlyReports,
  initialMemories,
  initialSettings
} from "./data/seedData";
import {
  Student,
  Session,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AppSettings,
  AIRule
} from "./types";
import { CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";

export function App() {

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  // Domain State seeded with rich initial defaults
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(initialDailyReports);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>(initialMonthlyReports);
  const [memories, setMemories] = useState<Record<string, StudentMemory>>(initialMemories);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const [loading, setLoading] = useState(true);

  // Session Builder & Report Preview Modal state
  const [isSessionBuilderOpen, setIsSessionBuilderOpen] = useState(false);
  const [preselectedStudentIdForSession, setPreselectedStudentIdForSession] = useState<string | undefined>(undefined);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<DailyReport | null>(null);
  const [selectedStudentForMemory, setSelectedStudentForMemory] = useState<string | undefined>(undefined);

  // Notification Toast State
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial Data Fetcher
  const refreshAllData = async () => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    try {
      const [stRes, seRes, drRes, mrRes, setRes] = await Promise.all([
        safeFetch("/api/students"),
        safeFetch("/api/sessions"),
        safeFetch("/api/reports/daily"),
        safeFetch("/api/reports/monthly"),
        safeFetch("/api/settings")
      ]);

      if (Array.isArray(stRes) && stRes.length > 0) setStudents(stRes);
      if (Array.isArray(seRes) && seRes.length > 0) setSessions(seRes);
      if (Array.isArray(drRes) && drRes.length > 0) setDailyReports(drRes);
      if (Array.isArray(mrRes) && mrRes.length > 0) setMonthlyReports(mrRes);
      if (setRes && typeof setRes === "object" && !("error" in setRes) && setRes.preferredLanguage) {
        setSettings(setRes);
      }

      // Fetch memory for each active student
      const memoryMap: Record<string, StudentMemory> = { ...initialMemories };
      if (Array.isArray(stRes)) {
        for (const st of stRes) {
          const mem = await safeFetch(`/api/memory/${st.id}`);
          if (mem && !("error" in mem)) memoryMap[st.id] = mem;
        }
      }
      setMemories(memoryMap);
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testFirebaseConnection();
    refreshAllData();
  }, []);

  // --- Student Actions ---
  const handleAddStudent = async (studentData: Omit<Student, "id" | "teacherId" | "createdAt">) => {
    const tempId = `std_${Date.now()}`;
    const newSt: Student = {
      ...studentData,
      id: tempId,
      teacherId: "teacher_001",
      createdAt: new Date().toISOString()
    };
    setStudents(prev => [newSt, ...prev]);
    showNotification(settings.preferredLanguage === "ar" ? `تم إضافة الطالب: ${newSt.fullName}` : `Added new student: ${newSt.fullName}`);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        const created = await res.json();
        setStudents(prev => prev.map(s => s.id === tempId ? created : s));
      }
    } catch (err) {
      console.warn("Server sync skipped - student stored in local state:", err);
    }
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    showNotification(settings.preferredLanguage === "ar" ? "تم تحديث بيانات الطالب بنجاح" : "Student profile updated successfully");
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const updated = students.find(s => s.id === id);
      if (updated) {
        await saveStudentToFirestore({ ...updated, ...updates });
      }
    } catch (err) {
      console.warn("Sync student update:", err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    showNotification(
      settings.preferredLanguage === "ar"
        ? `تم حذف ملف الطالب "${student?.fullName || ""}"`
        : `Student "${student?.fullName || ""}" deleted`
    );
    try {
      await fetch(`/api/students/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Delete student sync:", err);
    }
  };

  const handleArchiveStudent = async (id: string) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, status: "Archived" } : s)));
    showNotification(settings.preferredLanguage === "ar" ? "تم أرشفة ملف الطالب" : "Student profile archived");
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived" })
      });
    } catch (err) {
      console.warn("Server sync skipped - archived in local state:", err);
    }
  };

  const handleRestoreStudent = async (id: string) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, status: "Active" } : s)));
    showNotification(settings.preferredLanguage === "ar" ? "تم استعادة الطالب القائمة النشطة" : "Student restored to active list");
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" })
      });
    } catch (err) {
      console.warn("Server sync skipped - restored in local state:", err);
    }
  };

  // --- Session & AI Report Actions ---
  const handleCreateSessionAndGenerateReport = async (
    sessionData: Omit<Session, "id" | "teacherId" | "createdAt">
  ) => {
    try {
      setIsSessionBuilderOpen(false);
      showNotification(settings.preferredLanguage === "ar" ? "جاري تسجيل الحصة وتوليد التقرير بالذكاء الاصطناعي..." : "Recording session & generating AI report...", "info");

      // 1. Create Session
      const sesRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData)
      });
      const newSession = await sesRes.json();
      setSessions(prev => [newSession, ...prev]);

      // 2. Generate AI Daily Report
      const repRes = await fetch("/api/reports/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newSession.id, targetLanguage: settings.preferredLanguage })
      });
      const reportData: DailyReport = await repRes.json();

      setDailyReports(prev => [reportData, ...prev]);
      setSelectedReportForPreview(reportData);
      showNotification(settings.preferredLanguage === "ar" ? "تم توليد التقرير اليومي بالذكاء الاصطناعي بنجاح!" : "AI Daily Report generated successfully!");
    } catch (err) {
      console.error(err);
      showNotification(settings.preferredLanguage === "ar" ? "تعذر الاتصال بخادم الذكاء الاصطناعي" : "Failed to generate AI report", "error");
    }
  };

  const handleApproveReport = async (updatedReport: DailyReport) => {
    try {
      // 1. Process teacher-approved memory update suggestions
      const approvedSuggestions = (updatedReport.suggestedMemoryUpdates || []).filter(
        s => s.status === "approved" || s.status === "edited"
      );

      let updatedMemory: StudentMemory | undefined = undefined;
      if (approvedSuggestions.length > 0 && updatedReport.studentId) {
        const currentMemory = memories[updatedReport.studentId] || {
          id: `mem_${updatedReport.studentId}`,
          studentId: updatedReport.studentId,
          educationalHistory: [],
          homeworkHistory: [],
          strengths: [],
          areasForImprovement: [],
          recurringMistakes: [],
          teacherNotes: [],
          progressSummary: "",
          lastUpdated: new Date().toISOString()
        };

        const newStrengths = [...currentMemory.strengths];
        const newAreas = [...currentMemory.areasForImprovement];
        const newMistakes = [...currentMemory.recurringMistakes];
        const newNotes = [...currentMemory.teacherNotes];

        approvedSuggestions.forEach(s => {
          if (s.type === "strength" && !newStrengths.includes(s.text)) newStrengths.push(s.text);
          else if (s.type === "areaForImprovement" && !newAreas.includes(s.text)) newAreas.push(s.text);
          else if (s.type === "recurringMistake" && !newMistakes.includes(s.text)) newMistakes.push(s.text);
          else if (s.type === "teacherNote" && !newNotes.includes(s.text)) newNotes.push(s.text);
        });

        const historyRecord = {
          id: `hist_${Date.now()}`,
          date: updatedReport.date,
          sessionId: updatedReport.sessionId,
          sessionNumber: updatedReport.sessionNumber,
          summary: updatedReport.overallPerformanceSummary,
          subjects: updatedReport.subjectsCovered.map(s => s.subject),
          keyAchievements: approvedSuggestions.filter(s => s.type === "strength").map(s => s.text),
          areasToFocus: approvedSuggestions.filter(s => s.type === "areaForImprovement" || s.type === "recurringMistake").map(s => s.text)
        };

        updatedMemory = {
          ...currentMemory,
          strengths: newStrengths,
          areasForImprovement: newAreas,
          recurringMistakes: newMistakes,
          teacherNotes: newNotes,
          educationalHistory: [historyRecord, ...currentMemory.educationalHistory],
          lastUpdated: new Date().toISOString()
        };

        setMemories(prev => ({ ...prev, [updatedReport.studentId]: updatedMemory! }));
      }

      // 2. Local State Updates
      setDailyReports(prev => [updatedReport, ...prev.filter(r => r.id !== updatedReport.id)]);

      const matchingSession = sessions.find(s => s.id === updatedReport.sessionId);
      let updatedSession: Session | undefined = undefined;
      if (matchingSession) {
        updatedSession = { ...matchingSession, reportStatus: "approved", reportId: updatedReport.id };
        setSessions(prev => prev.map(s => (s.id === updatedSession!.id ? updatedSession! : s)));
      }

      // 3. Direct Firebase Firestore Persistence (Session, DailyReport, Approved Student Memory)
      await saveDailyReportToFirestore(updatedReport);
      if (updatedSession) {
        await saveSessionToFirestore(updatedSession);
      }
      if (updatedMemory) {
        await saveStudentMemoryToFirestore(updatedMemory);
      }

      // 4. Express Server Sync
      await fetch("/api/reports/daily/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: updatedReport, isApproved: true })
      });

      setSelectedReportForPreview(null);
      showNotification(
        settings.preferredLanguage === "ar"
          ? "تم حفظ الجلسة والتقرير وتحديث ذاكرة الطالب المعتمدة في الفايربيس بنجاح!"
          : "Session, Report & Approved Student Memory saved to Firebase!",
        "success"
      );
    } catch (err) {
      console.error("Save error:", err);
      setSelectedReportForPreview(null);
      setDailyReports(prev => [updatedReport, ...prev.filter(r => r.id !== updatedReport.id)]);
      showNotification(
        settings.preferredLanguage === "ar" ? "تم إعتماد التقرير وحفظه بنجاح" : "Report approved & saved locally.",
        "success"
      );
    }
  };

  const handleSaveDraftReport = async (updatedReport: DailyReport) => {
    try {
      await fetch("/api/reports/daily/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: updatedReport, isApproved: false })
      });

      setSelectedReportForPreview(null);
      await refreshAllData();
      showNotification(settings.preferredLanguage === "ar" ? "تم حفظ التقرير كمسودة" : "Report saved as draft", "info");
    } catch (err) {
      setSelectedReportForPreview(null);
      setDailyReports(prev => [updatedReport, ...prev.filter(r => r.id !== updatedReport.id)]);
      showNotification(settings.preferredLanguage === "ar" ? "تم حفظ المسودة بنجاح" : "Draft saved locally", "info");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm(settings.preferredLanguage === "ar" ? "هل أنت تأكد من حذف هذا التقرير؟" : "Are you sure you want to delete this report?")) return;
    setDailyReports(prev => prev.filter(r => r.id !== id));
    showNotification(settings.preferredLanguage === "ar" ? "تم حذف التقرير" : "Report removed");
  };

  const handleGenerateMonthlyReport = async (studentId: string, month: string, year: number) => {
    try {
      showNotification(settings.preferredLanguage === "ar" ? "جاري تجميع التقرير الشهري من السجلات المعمدة..." : "Synthesizing monthly report from approved daily records...", "info");
      const res = await fetch("/api/reports/monthly/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, month, year, targetLanguage: settings.preferredLanguage })
      });
      const monthlyData = await res.json();
      setMonthlyReports(prev => [monthlyData, ...prev]);
      showNotification(settings.preferredLanguage === "ar" ? `تم إنشاء التقرير الشهري للطالب: ${monthlyData.studentName}` : `Monthly Report for ${monthlyData.studentName} created!`);
    } catch (err) {
      showNotification(settings.preferredLanguage === "ar" ? "فشل إنشاء التقرير الشهري" : "Failed to generate monthly report", "error");
    }
  };

  // --- Memory & Settings Actions ---
  const handleUpdateMemory = async (studentId: string, updates: Partial<StudentMemory>) => {
    setMemories(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { id: `mem_${studentId}`, studentId }), ...updates }
    }));
    showNotification(settings.preferredLanguage === "ar" ? "تم تحديث ذاكرة الطالب" : "Student memory updated");
    try {
      await fetch(`/api/memory/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.warn("Memory updated locally:", err);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings); // Optimistic immediate state update!
    showNotification(
      newSettings.preferredLanguage === "ar"
        ? "تم حفظ الإعدادات وقواعد الذكاء الاصطناعي ومزامنتها بنجاح!"
        : "Settings & AI Rules saved and synced successfully!",
      "success"
    );

    try {
      await saveSettingsToFirestore(newSettings);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn("Settings saved locally & Firestore - server update skipped:", err);
    }
  };

  const handleAddAIRule = (rule: Omit<AIRule, "id">) => {
    const newRule: AIRule = { ...rule, id: `rule_${Date.now()}` };
    handleUpdateSettings({ aiRules: [...settings.aiRules, newRule] });
  };

  const handleUpdateAIRule = (id: string, updates: Partial<AIRule>) => {
    const updatedRules = settings.aiRules.map(r => (r.id === id ? { ...r, ...updates } : r));
    handleUpdateSettings({ aiRules: updatedRules });
  };

  const handleDeleteAIRule = (id: string) => {
    const updatedRules = settings.aiRules.filter(r => r.id !== id);
    handleUpdateSettings({ aiRules: updatedRules });
  };

  const isArabic = settings?.preferredLanguage === "ar";

  useEffect(() => {
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.documentElement.lang = isArabic ? "ar" : "en";
  }, [isArabic]);

  if (loading) {
    return (
      <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          {isArabic ? "جاري تحميل مساعد المعلم الإسلامي اليومي (DITA)..." : "Loading Daily Islamic Teacher Assistant..."}
        </p>
      </div>
    );
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-950 text-emerald-200 border-emerald-500"
                : notification.type === "error"
                ? "bg-rose-950 text-rose-200 border-rose-500"
                : "bg-blue-950 text-blue-200 border-blue-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Primary Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          setIsSessionBuilderOpen(false);
        }}
        settings={settings}
        pendingReportsCount={Array.isArray(dailyReports) ? dailyReports.filter(r => !r.isApproved).length : 0}
        onLanguageToggle={lang => handleUpdateSettings({ ...settings, preferredLanguage: lang })}
        onStartNewSession={() => {
          setPreselectedStudentIdForSession(undefined);
          setIsSessionBuilderOpen(true);
        }}
        onOpenQuickSearch={() => setActiveTab("students")}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Render Session Builder when triggered */}
        {isSessionBuilderOpen ? (
          <SessionBuilder
            students={students}
            settings={settings}
            preselectedStudentId={preselectedStudentIdForSession}
            onCreateSessionAndGenerateReport={handleCreateSessionAndGenerateReport}
            onCancel={() => setIsSessionBuilderOpen(false)}
          />
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardView
                students={students}
                sessions={sessions}
                reports={dailyReports}
                settings={settings}
                setActiveTab={setActiveTab}
                onStartSession={studentId => {
                  setPreselectedStudentIdForSession(studentId);
                  setIsSessionBuilderOpen(true);
                }}
                onAddStudent={() => setActiveTab("students")}
                onGenerateReportForSession={async session => {
                  showNotification("Generating AI report for session...", "info");
                  try {
                    const res = await fetch("/api/reports/daily/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sessionId: session.id })
                    });
                    const rep = await res.json();
                    setSelectedReportForPreview(rep);
                  } catch (e) {
                    showNotification("Failed to generate report", "error");
                  }
                }}
                onSelectReport={rep => setSelectedReportForPreview(rep)}
              />
            )}

            {activeTab === "students" && (
              <StudentsView
                students={students}
                settings={settings}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onArchiveStudent={handleArchiveStudent}
                onRestoreStudent={handleRestoreStudent}
                onStartSessionForStudent={studentId => {
                  setPreselectedStudentIdForSession(studentId);
                  setIsSessionBuilderOpen(true);
                }}
                onViewStudentMemory={studentId => {
                  setSelectedStudentForMemory(studentId);
                  setActiveTab("memory");
                }}
              />
            )}

            {activeTab === "sessions" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <h1 className="text-xl font-bold text-white">Recorded Lessons History</h1>
                  <button
                    onClick={() => {
                      setPreselectedStudentIdForSession(undefined);
                      setIsSessionBuilderOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    + Record New Lesson
                  </button>
                </div>
                <div className="space-y-3">
                  {sessions.map(s => {
                    const student = students.find(st => st.id === s.studentId);
                    return (
                      <div key={s.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white">{student?.fullName || "Student"}</h3>
                          <p className="text-xs text-slate-400">
                            Session #{s.sessionNumber} • {s.date} ({s.time}) • {s.durationMinutes} mins
                          </p>
                          <div className="flex gap-1 mt-1">
                            {s.subjectRecords.map(sr => (
                              <span key={sr.subject} className="px-2 py-0.5 bg-slate-800 text-teal-300 rounded text-[10px] font-semibold">
                                {sr.subject}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            showNotification("Generating AI report...", "info");
                            const res = await fetch("/api/reports/daily/generate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ sessionId: s.id })
                            });
                            const rep = await res.json();
                            setSelectedReportForPreview(rep);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold"
                        >
                          Generate AI Report
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <ReportsView
                reports={dailyReports}
                monthlyReports={monthlyReports}
                students={students}
                settings={settings}
                onSelectReport={rep => setSelectedReportForPreview(rep)}
                onDeleteReport={handleDeleteReport}
                onGenerateMonthlyReport={handleGenerateMonthlyReport}
              />
            )}

            {activeTab === "memory" && (
              <StudentMemoryView
                students={students}
                settings={settings}
                memories={memories}
                selectedStudentId={selectedStudentForMemory}
                onUpdateMemory={handleUpdateMemory}
              />
            )}

            {activeTab === "templates" && (
              <TemplatesView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                showNotification={showNotification}
              />
            )}

            {activeTab === "settings" && (
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onAddAIRule={handleAddAIRule}
                onUpdateAIRule={handleUpdateAIRule}
                onDeleteAIRule={handleDeleteAIRule}
              />
            )}

            {activeTab === "apiDocs" && <ApiDocsView settings={settings} />}

            {activeTab === "unitTests" && <UnitTestsView settings={settings} />}
          </>
        )}
      </main>

      {/* Report Preview & Approval Modal */}
      {selectedReportForPreview && (
        <ReportPreviewModal
          report={selectedReportForPreview}
          settings={settings}
          onApproveAndSave={handleApproveReport}
          onSaveAsDraft={handleSaveDraftReport}
          onRegenerate={async () => {
            showNotification("Regenerating AI Report...", "info");
            const res = await fetch("/api/reports/daily/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: selectedReportForPreview.sessionId })
            });
            const rep = await res.json();
            setSelectedReportForPreview(rep);
          }}
          onClose={() => setSelectedReportForPreview(null)}
        />
      )}
      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          setIsSessionBuilderOpen(false);
        }}
        settings={settings}
        pendingReportsCount={Array.isArray(dailyReports) ? dailyReports.filter(r => !r.isApproved).length : 0}
        onStartNewSession={() => {
          setPreselectedStudentIdForSession(undefined);
          setIsSessionBuilderOpen(true);
        }}
      />
    </div>
  );
}

export default App;
