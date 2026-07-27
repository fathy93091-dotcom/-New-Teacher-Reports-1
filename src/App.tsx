import React, { useState, useEffect } from "react";
import { Header, ActiveTab } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { StudentsView } from "./components/StudentsView";
import { SessionBuilder } from "./components/SessionBuilder";
import { ReportsView } from "./components/ReportsView";
import { ReportPreviewModal } from "./components/ReportPreviewModal";
import { StudentMemoryView } from "./components/StudentMemoryView";
import { SettingsView } from "./components/SettingsView";
import { ApiDocsView } from "./components/ApiDocsView";
import { UnitTestsView } from "./components/UnitTestsView";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { testFirebaseConnection } from "./lib/firebase";
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

  // Domain State
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [memories, setMemories] = useState<Record<string, StudentMemory>>({});
  const [settings, setSettings] = useState<AppSettings>({
    preferredLanguage: "ar",
    reportStyle: "detailed",
    aiRules: [],
    defaultClosingMessage: "جزاكم الله خيراً ونفع بدراستكم وحفظكم للقرآن الكريم."
  });

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

      setStudents(Array.isArray(stRes) ? stRes : []);
      setSessions(Array.isArray(seRes) ? seRes : []);
      setDailyReports(Array.isArray(drRes) ? drRes : []);
      setMonthlyReports(Array.isArray(mrRes) ? mrRes : []);
      if (setRes && typeof setRes === "object" && !("error" in setRes)) {
        setSettings(setRes);
      }

      // Fetch memory for each active student
      const memoryMap: Record<string, StudentMemory> = {};
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
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
      });
      const newSt = await res.json();
      setStudents(prev => [newSt, ...prev]);
      showNotification(`Added new student: ${newSt.fullName}`);
    } catch (err) {
      showNotification("Failed to create student", "error");
    }
  };

  const handleArchiveStudent = async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived" })
      });
      setStudents(prev => prev.map(s => (s.id === id ? { ...s, status: "Archived" } : s)));
      showNotification("Student profile archived");
    } catch (err) {
      showNotification("Failed to archive student", "error");
    }
  };

  const handleRestoreStudent = async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" })
      });
      setStudents(prev => prev.map(s => (s.id === id ? { ...s, status: "Active" } : s)));
      showNotification("Student restored to active list");
    } catch (err) {
      showNotification("Failed to restore student", "error");
    }
  };

  // --- Session & AI Report Actions ---
  const handleCreateSessionAndGenerateReport = async (
    sessionData: Omit<Session, "id" | "teacherId" | "createdAt">
  ) => {
    try {
      setIsSessionBuilderOpen(false);
      showNotification("Recording session & generating AI report...", "info");

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
        body: JSON.stringify({ sessionId: newSession.id })
      });
      const reportData: DailyReport = await repRes.json();

      setDailyReports(prev => [reportData, ...prev]);
      setSelectedReportForPreview(reportData);
      showNotification("AI Daily Report generated successfully!");
    } catch (err) {
      console.error(err);
      showNotification("Failed to generate AI report", "error");
    }
  };

  const handleApproveReport = async (updatedReport: DailyReport) => {
    try {
      const res = await fetch("/api/reports/daily/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: updatedReport, isApproved: true })
      });
      const result = await res.json();

      setSelectedReportForPreview(null);
      await refreshAllData();
      showNotification("Report approved & saved! Student Memory updated automatically.", "success");
    } catch (err) {
      showNotification("Failed to approve report", "error");
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
      showNotification("Report saved as draft", "info");
    } catch (err) {
      showNotification("Failed to save draft", "error");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    setDailyReports(prev => prev.filter(r => r.id !== id));
    showNotification("Report removed");
  };

  const handleGenerateMonthlyReport = async (studentId: string, month: string, year: number) => {
    try {
      showNotification("Synthesizing monthly report from approved daily records...", "info");
      const res = await fetch("/api/reports/monthly/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, month, year })
      });
      const monthlyData = await res.json();
      setMonthlyReports(prev => [monthlyData, ...prev]);
      showNotification(`Monthly Report for ${monthlyData.studentName} created!`);
    } catch (err) {
      showNotification("Failed to generate monthly report", "error");
    }
  };

  // --- Memory & Settings Actions ---
  const handleUpdateMemory = async (studentId: string, updates: Partial<StudentMemory>) => {
    try {
      const res = await fetch(`/api/memory/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const updatedMem = await res.json();
      setMemories(prev => ({ ...prev, [studentId]: updatedMem }));
      showNotification("Student memory updated");
    } catch (err) {
      showNotification("Failed to update memory", "error");
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      setSettings(data);
      showNotification("Settings saved");
    } catch (err) {
      showNotification("Failed to update settings", "error");
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
                onUpdateStudent={() => {}}
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
