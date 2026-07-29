import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
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
import { AuthModal } from "./components/AuthModal";
import { testFirebaseConnection, auth } from "./lib/firebase";
import {
  saveStudentToFirestore,
  deleteStudentFromFirestore,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  saveDailyReportToFirestore,
  deleteDailyReportFromFirestore,
  saveMonthlyReportToFirestore,
  deleteMonthlyReportFromFirestore,
  saveStudentMemoryToFirestore,
  saveSettingsToFirestore,
  syncAllDataToFirestore,
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
import { CheckCircle2, AlertCircle, Info, Sparkles, CloudCheck } from "lucide-react";

function getStoredStateWithFallback<T>(keys: string[], fallback: T): T {
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(fallback)) {
          if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
        } else if (typeof fallback === "object" && fallback !== null) {
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) return parsed as T;
        } else if (parsed !== null && parsed !== undefined) {
          return parsed as T;
        }
      }
    } catch (err) {
      console.warn(`Error reading localStorage key ${key}:`, err);
    }
  }
  return fallback;
}

const syncToStorageKeys = (keys: string[], data: any) => {
  const json = JSON.stringify(data);
  keys.forEach(k => {
    try { localStorage.setItem(k, json); } catch (e) {}
  });
};

export function App() {

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  // Firebase Auth State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        showNotification(
          settings.preferredLanguage === "ar"
            ? `مرحباً بك، ${user.displayName || user.email} (تم ربط Firebase Auth)`
            : `Welcome, ${user.displayName || user.email} (Connected to Firebase)`,
          "success"
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Domain State seeded with rich initial defaults & multi-key localStorage fallback
  const [students, setStudents] = useState<Student[]>(() =>
    getStoredStateWithFallback(["dita_students_store_v2", "dita_students_store", "dita_students"], initialStudents)
  );
  const [sessions, setSessions] = useState<Session[]>(() =>
    getStoredStateWithFallback(["dita_sessions_store_v2", "dita_sessions_store", "dita_sessions"], initialSessions)
  );
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() =>
    getStoredStateWithFallback(["dita_daily_reports_store_v2", "dita_daily_reports_store", "dita_daily_reports"], initialDailyReports)
  );
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>(() =>
    getStoredStateWithFallback(["dita_monthly_reports_store_v2", "dita_monthly_reports_store", "dita_monthly_reports"], initialMonthlyReports)
  );
  const [memories, setMemories] = useState<Record<string, StudentMemory>>(() =>
    getStoredStateWithFallback(["dita_memories_store_v2", "dita_memories_store", "dita_memories"], initialMemories)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    getStoredStateWithFallback(["dita_settings_store_v2", "dita_settings_store", "dita_settings"], initialSettings)
  );

  const [loading, setLoading] = useState(true);

  // Sync state to localStorage across all key versions automatically on updates
  useEffect(() => {
    syncToStorageKeys(["dita_students_store_v2", "dita_students_store", "dita_students"], students);
  }, [students]);

  useEffect(() => {
    syncToStorageKeys(["dita_sessions_store_v2", "dita_sessions_store", "dita_sessions"], sessions);
  }, [sessions]);

  useEffect(() => {
    syncToStorageKeys(["dita_daily_reports_store_v2", "dita_daily_reports_store", "dita_daily_reports"], dailyReports);
  }, [dailyReports]);

  useEffect(() => {
    syncToStorageKeys(["dita_monthly_reports_store_v2", "dita_monthly_reports_store", "dita_monthly_reports"], monthlyReports);
  }, [monthlyReports]);

  useEffect(() => {
    syncToStorageKeys(["dita_memories_store_v2", "dita_memories_store", "dita_memories"], memories);
  }, [memories]);

  useEffect(() => {
    syncToStorageKeys(["dita_settings_store_v2", "dita_settings_store", "dita_settings"], settings);
  }, [settings]);

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

  // Initial Data Fetcher - Merges Firestore, Express API, and LocalStorage
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
      // 1. Fetch from Firestore
      const fsData = await loadInitialFirestoreData();

      // 2. Fetch from Express API
      const [stRes, seRes, drRes, mrRes, setRes] = await Promise.all([
        safeFetch("/api/students"),
        safeFetch("/api/sessions"),
        safeFetch("/api/reports/daily"),
        safeFetch("/api/reports/monthly"),
        safeFetch("/api/settings")
      ]);

      const mergeItems = <T extends { id: string }>(
        currentLocal: T[],
        fsItems: T[],
        apiItems: T[] | null
      ): T[] => {
        const map = new Map<string, T>();
        if (Array.isArray(apiItems)) {
          apiItems.forEach(i => map.set(i.id, i));
        }
        fsItems.forEach(i => map.set(i.id, i));
        currentLocal.forEach(i => map.set(i.id, i));
        return Array.from(map.values());
      };

      setStudents(prev => {
        const merged = mergeItems(prev, fsData.students, stRes);
        return merged.length > 0 ? merged : prev;
      });

      setSessions(prev => {
        const merged = mergeItems(prev, fsData.sessions, seRes);
        return merged.length > 0 ? merged : prev;
      });

      setDailyReports(prev => {
        const merged = mergeItems(prev, fsData.dailyReports, drRes);
        return merged.length > 0 ? merged : prev;
      });

      setMonthlyReports(prev => {
        const merged = mergeItems(prev, fsData.monthlyReports, mrRes);
        return merged.length > 0 ? merged : prev;
      });

      const mergeSettings = (local: AppSettings, incoming?: AppSettings | null): AppSettings => {
        if (!incoming || typeof incoming !== "object") return local;

        const ruleMap = new Map<string, AIRule>();
        if (Array.isArray(incoming.aiRules)) {
          incoming.aiRules.forEach(r => {
            if (r && (r.id || r.name)) ruleMap.set(r.id || r.name, r);
          });
        }
        if (Array.isArray(local.aiRules)) {
          local.aiRules.forEach(r => {
            if (r && (r.id || r.name)) ruleMap.set(r.id || r.name, r);
          });
        }

        const templateMap = new Map<string, any>();
        if (Array.isArray(incoming.templates)) {
          incoming.templates.forEach(t => { if (t && t.id) templateMap.set(t.id, t); });
        }
        if (Array.isArray(local.templates)) {
          local.templates.forEach(t => { if (t && t.id) templateMap.set(t.id, t); });
        }

        const mergedRules = Array.from(ruleMap.values());
        const mergedTemplates = Array.from(templateMap.values());

        return {
          ...incoming,
          ...local,
          aiRules: mergedRules.length > 0 ? mergedRules : (local.aiRules || []),
          templates: mergedTemplates.length > 0 ? mergedTemplates : (local.templates || [])
        };
      };

      setSettings(prev => {
        let merged = prev;
        if (fsData.settings) {
          merged = mergeSettings(merged, fsData.settings);
        }
        if (setRes && typeof setRes === "object" && !("error" in setRes) && setRes.preferredLanguage) {
          merged = mergeSettings(merged, setRes);
        }
        try {
          localStorage.setItem("dita_settings_store_v2", JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });

      setMemories(prev => ({
        ...prev,
        ...fsData.memories
      }));

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

    saveStudentToFirestore(newSt);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        const created = await res.json();
        setStudents(prev => prev.map(s => s.id === tempId ? created : s));
        saveStudentToFirestore(created);
      }
    } catch (err) {
      console.warn("Server sync skipped - student stored in local state & Firestore:", err);
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
      saveSessionToFirestore(newSession);

      // 2. Generate AI Daily Report
      const repRes = await fetch("/api/reports/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newSession.id, targetLanguage: settings.preferredLanguage })
      });
      const reportData: DailyReport = await repRes.json();

      setDailyReports(prev => [reportData, ...prev]);
      saveDailyReportToFirestore(reportData);
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
      saveDailyReportToFirestore(updatedReport);
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
    try {
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Delete report sync:", err);
    }
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
      saveMonthlyReportToFirestore(monthlyData);
      showNotification(settings.preferredLanguage === "ar" ? `تم إنشاء التقرير الشهري للطالب: ${monthlyData.studentName}` : `Monthly Report for ${monthlyData.studentName} created!`);
    } catch (err) {
      showNotification(settings.preferredLanguage === "ar" ? "فشل إنشاء التقرير الشهري" : "Failed to generate monthly report", "error");
    }
  };

  // --- Memory & Settings Actions ---
  const handleUpdateMemory = async (studentId: string, updates: Partial<StudentMemory>) => {
    const existing = memories[studentId] || { id: `mem_${studentId}`, studentId };
    const updated = { ...existing, ...updates };
    setMemories(prev => ({
      ...prev,
      [studentId]: updated
    }));
    saveStudentMemoryToFirestore(updated as StudentMemory);
    showNotification(settings.preferredLanguage === "ar" ? "تم تحديث ذاكرة الطالب" : "Student memory updated");
    try {
      await fetch(`/api/memory/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.warn("Memory updated locally & Firestore:", err);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const nextSettings: AppSettings = { ...prev, ...updates };

      try {
        localStorage.setItem("dita_settings_store_v2", JSON.stringify(nextSettings));
      } catch (e) {
        console.warn("localStorage write error:", e);
      }

      saveSettingsToFirestore(nextSettings).catch(err => console.warn("Firestore settings error:", err));

      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings)
      }).catch(err => console.warn("API settings error:", err));

      return nextSettings;
    });

    showNotification(
      (updates.preferredLanguage || settings.preferredLanguage) === "ar"
        ? "تم حفظ وتحديث قواعد الذكاء الاصطناعي والإعدادات بنجاح!"
        : "Settings & AI Rules saved and synced successfully!",
      "success"
    );
  };

  const handleAddAIRule = (rule: Omit<AIRule, "id">) => {
    const newRule: AIRule = { ...rule, id: `rule_${Date.now()}` };
    setSettings(prev => {
      const currentRules = prev.aiRules || [];
      const updatedRules = [...currentRules, newRule];
      const nextSettings = { ...prev, aiRules: updatedRules };

      try {
        localStorage.setItem("dita_settings_store_v2", JSON.stringify(nextSettings));
      } catch (e) {}

      saveSettingsToFirestore(nextSettings).catch(e => console.warn(e));
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings)
      }).catch(e => console.warn(e));

      return nextSettings;
    });

    showNotification(
      settings.preferredLanguage === "ar"
        ? `تم إضافة قاعدة الذكاء الاصطناعي "${rule.name}" ومزامنتها بنجاح!`
        : `AI Rule "${rule.name}" added and synced successfully!`,
      "success"
    );
  };

  const handleUpdateAIRule = (id: string, updates: Partial<AIRule>) => {
    setSettings(prev => {
      const currentRules = prev.aiRules || [];
      const updatedRules = currentRules.map(r => (r.id === id ? { ...r, ...updates } : r));
      const nextSettings = { ...prev, aiRules: updatedRules };

      try {
        localStorage.setItem("dita_settings_store_v2", JSON.stringify(nextSettings));
      } catch (e) {}

      saveSettingsToFirestore(nextSettings).catch(e => console.warn(e));
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings)
      }).catch(e => console.warn(e));

      return nextSettings;
    });

    showNotification(
      settings.preferredLanguage === "ar"
        ? "تم تحديث قاعدة الذكاء الاصطناعي ومزامنتها"
        : "AI Rule updated and synced",
      "success"
    );
  };

  const handleDeleteAIRule = (id: string) => {
    setSettings(prev => {
      const currentRules = prev.aiRules || [];
      const updatedRules = currentRules.filter(r => r.id !== id);
      const nextSettings = { ...prev, aiRules: updatedRules };

      try {
        localStorage.setItem("dita_settings_store_v2", JSON.stringify(nextSettings));
      } catch (e) {}

      saveSettingsToFirestore(nextSettings).catch(e => console.warn(e));
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings)
      }).catch(e => console.warn(e));

      return nextSettings;
    });

    showNotification(
      settings.preferredLanguage === "ar"
        ? "تم حذف قاعدة الذكاء الاصطناعي ومزامنتها"
        : "AI Rule deleted and synced",
      "info"
    );
  };

  const handleSyncAllToFirebase = async () => {
    try {
      showNotification(
        settings.preferredLanguage === "ar"
          ? "جاري مزامنة وحفظ جميع البيانات على Firebase والحافظة المحلية..."
          : "Syncing all data to Firebase Cloud & Local Backup...",
        "info"
      );
      // Sync with Express backend
      try {
        await fetch("/api/sync/all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            students,
            sessions,
            reports: dailyReports,
            monthlyReports,
            memories,
            settings
          })
        });
      } catch (e) {
        console.warn("Backend sync skipped:", e);
      }

      // Sync with Firestore
      await syncAllDataToFirestore({
        students,
        sessions,
        dailyReports,
        monthlyReports,
        memories,
        settings
      });
      showNotification(
        settings.preferredLanguage === "ar"
          ? "تمت المزامنة وحفظ البيانات بنجاح على Firebase والحافظة السحابية!"
          : "All data successfully synced & saved to Firebase Firestore!",
        "success"
      );
    } catch (err) {
      console.error(err);
      showNotification(
        settings.preferredLanguage === "ar"
          ? "حدث خطأ أثناء المزامنة مع Firebase"
          : "Error syncing data to Firebase",
        "error"
      );
    }
  };

  const handleExportBackup = () => {
    try {
      const backupBundle = {
        app: "Daily Islamic Teacher Assistant",
        version: "2.5",
        exportedAt: new Date().toISOString(),
        students,
        sessions,
        dailyReports,
        monthlyReports,
        memories,
        settings
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupBundle, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dita_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification(
        settings.preferredLanguage === "ar"
          ? "تم تصدير النسخة الاحتياطية بنجاح على جهازك!"
          : "Backup exported successfully to your device!",
        "success"
      );
    } catch (err) {
      console.error("Export backup error:", err);
      showNotification(
        settings.preferredLanguage === "ar" ? "فشل تصدير النسخة الاحتياطية" : "Failed to export backup",
        "error"
      );
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid backup file format");
      }
      if (Array.isArray(data.students)) setStudents(data.students);
      if (Array.isArray(data.sessions)) setSessions(data.sessions);
      if (Array.isArray(data.dailyReports)) setDailyReports(data.dailyReports);
      if (Array.isArray(data.monthlyReports)) setMonthlyReports(data.monthlyReports);
      if (data.memories && typeof data.memories === "object") setMemories(data.memories);
      if (data.settings && typeof data.settings === "object") setSettings(prev => ({ ...prev, ...data.settings }));

      // Sync to Express Server
      try {
        await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            students: data.students,
            sessions: data.sessions,
            reports: data.dailyReports,
            monthlyReports: data.monthlyReports,
            memories: data.memories,
            settings: data.settings
          })
        });
      } catch (e) {
        console.warn("Backend restore sync skipped:", e);
      }

      // Sync to Firebase
      try {
        await syncAllDataToFirestore({
          students: data.students || students,
          sessions: data.sessions || sessions,
          dailyReports: data.dailyReports || dailyReports,
          monthlyReports: data.monthlyReports || monthlyReports,
          memories: data.memories || memories,
          settings: data.settings ? { ...settings, ...data.settings } : settings
        });
      } catch (e) {
        console.warn("Firestore backup restore skipped:", e);
      }

      showNotification(
        settings.preferredLanguage === "ar"
          ? "تم استعادة كافة بيانات الطلاب والقواعد والتقارير بنجاح!"
          : "All student profiles, AI rules, and reports restored successfully!",
        "success"
      );
    } catch (err: any) {
      console.error("Backup import error:", err);
      showNotification(
        settings.preferredLanguage === "ar" ? "فشل استعادة الملف: تأكد من صحة الملف" : "Failed to import backup file",
        "error"
      );
    }
  };

  const isArabic = settings?.preferredLanguage === "ar";

  useEffect(() => {
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.documentElement.lang = isArabic ? "ar" : "en";
  }, [isArabic]);

  if (loading) {
    return (
      <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f9f6] text-slate-800 flex flex-col items-center justify-center space-y-4">
        <Sparkles className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-slate-700">
          {isArabic ? "جاري تحميل مساعد المعلم الإسلامي اليومي (DITA)..." : "Loading Daily Islamic Teacher Assistant..."}
        </p>
      </div>
    );
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f9f6] text-slate-800 font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-emerald-900/10"
                : notification.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-300 shadow-rose-900/10"
                : "bg-blue-50 text-blue-900 border-blue-300 shadow-blue-900/10"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
        authUser={authUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
                dailyReports={dailyReports}
                monthlyReports={monthlyReports}
                onSelectReport={rep => setSelectedReportForPreview(rep)}
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
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <h1 className="text-xl font-bold text-emerald-950">
                    {isArabic ? "سجل الحصص التعليمية المسجلة" : "Recorded Lessons History"}
                  </h1>
                  <button
                    onClick={() => {
                      setPreselectedStudentIdForSession(undefined);
                      setIsSessionBuilderOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
                  >
                    + {isArabic ? "تسجيل حصة جديدة" : "Record New Lesson"}
                  </button>
                </div>
                <div className="space-y-3">
                  {sessions.map(s => {
                    const student = students.find(st => st.id === s.studentId);
                    return (
                      <div key={s.id} className="bg-white border border-emerald-100/80 p-4 rounded-2xl flex justify-between items-center shadow-xs hover:border-emerald-300 transition">
                        <div>
                          <h3 className="font-bold text-slate-900">{student?.fullName || "Student"}</h3>
                          <p className="text-xs text-slate-500">
                            {isArabic ? `الحصة رقم #${s.sessionNumber} • ${s.date} (${s.time}) • ${s.durationMinutes} دقيقة` : `Session #${s.sessionNumber} • ${s.date} (${s.time}) • ${s.durationMinutes} mins`}
                          </p>
                          <div className="flex gap-1 mt-1.5">
                            {s.subjectRecords.map(sr => (
                              <span key={sr.subject} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded text-[10px] font-bold">
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
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                        >
                          {isArabic ? "توليد التقرير" : "Generate AI Report"}
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
                authUser={authUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onSyncAllToFirebase={handleSyncAllToFirebase}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
              />
            )}

            {activeTab === "apiDocs" && <ApiDocsView settings={settings} />}

            {activeTab === "unitTests" && <UnitTestsView settings={settings} />}
          </>
        )}
      </main>

      {/* Firebase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={authUser}
        isArabic={settings.preferredLanguage === "ar"}
      />

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
