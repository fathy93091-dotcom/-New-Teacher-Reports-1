import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { Header, ActiveTab } from "./components/Header";
import { AuthLandingGate } from "./components/AuthLandingGate";
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
  generateClientSideDailyReport,
  generateClientSideMonthlyReport
} from "./lib/clientReportGenerator";
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
          if (Array.isArray(parsed)) return parsed as T;
        } else if (typeof fallback === "object" && fallback !== null) {
          if (parsed && typeof parsed === "object") return parsed as T;
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

  // Firebase Auth & App Entry Gate State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("dita_is_demo_mode") === "true";
    } catch {
      return false;
    }
  });
  const [authChecked, setAuthChecked] = useState(false);

  // Notification Toast State
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Domain State seeded dynamically based on Teacher Account or Demo Mode
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [memories, setMemories] = useState<Record<string, StudentMemory>>({});
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const [loading, setLoading] = useState(true);

  // Load state based on current Auth User or Demo Mode
  const loadWorkspaceState = (user: User | null, demo: boolean) => {
    if (user) {
      const teacherKey = `dita_teacher_${user.uid}`;
      const isInitialized = localStorage.getItem(`${teacherKey}_initialized`);

      if (isInitialized) {
        setStudents(getStoredStateWithFallback([`${teacherKey}_students`], []));
        setSessions(getStoredStateWithFallback([`${teacherKey}_sessions`], []));
        setDailyReports(getStoredStateWithFallback([`${teacherKey}_daily_reports`], []));
        setMonthlyReports(getStoredStateWithFallback([`${teacherKey}_monthly_reports`], []));
        setMemories(getStoredStateWithFallback([`${teacherKey}_memories`], {}));
        setSettings(
          getStoredStateWithFallback([`${teacherKey}_settings`], {
            ...initialSettings,
            teacherName: user.displayName || user.email || "معلم الحلقة"
          })
        );
      } else {
        // Brand NEW teacher workspace -> CLEAN SLATE (No students, no reports)
        setStudents([]);
        setSessions([]);
        setDailyReports([]);
        setMonthlyReports([]);
        setMemories({});
        const newSettings: AppSettings = {
          ...initialSettings,
          teacherName: user.displayName || user.email || "معلم الحلقة"
        };
        setSettings(newSettings);
        try {
          localStorage.setItem(`${teacherKey}_initialized`, "true");
          localStorage.setItem(`${teacherKey}_students`, JSON.stringify([]));
          localStorage.setItem(`${teacherKey}_sessions`, JSON.stringify([]));
          localStorage.setItem(`${teacherKey}_daily_reports`, JSON.stringify([]));
          localStorage.setItem(`${teacherKey}_monthly_reports`, JSON.stringify([]));
          localStorage.setItem(`${teacherKey}_memories`, JSON.stringify({}));
          localStorage.setItem(`${teacherKey}_settings`, JSON.stringify(newSettings));
        } catch (e) {}
      }
    } else if (demo) {
      // Demo Mode -> Seed with sample students and reports for exploration
      setStudents(getStoredStateWithFallback(["dita_demo_students"], initialStudents));
      setSessions(getStoredStateWithFallback(["dita_demo_sessions"], initialSessions));
      setDailyReports(getStoredStateWithFallback(["dita_demo_daily_reports"], initialDailyReports));
      setMonthlyReports(getStoredStateWithFallback(["dita_demo_monthly_reports"], initialMonthlyReports));
      setMemories(getStoredStateWithFallback(["dita_demo_memories"], initialMemories));
      setSettings(getStoredStateWithFallback(["dita_demo_settings"], initialSettings));
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);
      setLoading(false);

      if (user) {
        setIsDemoMode(false);
        try { sessionStorage.removeItem("dita_is_demo_mode"); } catch (e) {}
        loadWorkspaceState(user, false);
        showNotification(
          settings.preferredLanguage === "ar"
            ? `مرحباً بك، ${user.displayName || user.email}! تم فتح مساحتك الخاصة.`
            : `Welcome, ${user.displayName || user.email}! Teacher workspace active.`,
          "success"
        );
      } else if (isDemoMode) {
        loadWorkspaceState(null, true);
      }
    });
    return () => unsubscribe();
  }, [isDemoMode]);

  // Handle Quick Demo Activation
  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    try { sessionStorage.setItem("dita_is_demo_mode", "true"); } catch (e) {}
    loadWorkspaceState(null, true);
    setLoading(false);
    showNotification(
      settings.preferredLanguage === "ar"
        ? "تم الدخول في الوضع التجريبي! يمكنك استكشاف جميع ميزات الموقع."
        : "Entered Demo Mode! You can now explore all features with sample data.",
      "info"
    );
  };

  // Handle Sign Out or Switch to Auth Landing Gate
  const handleSwitchToAuthLanding = async () => {
    setIsDemoMode(false);
    try { sessionStorage.removeItem("dita_is_demo_mode"); } catch (e) {}
    if (authUser) {
      await signOut(auth);
    }
    showNotification(
      settings.preferredLanguage === "ar"
        ? "تم العودة لصفحة تسجيل الدخول والدخول السريع"
        : "Returned to Login & Quick Entry screen",
      "info"
    );
  };

  // Sync state to localStorage automatically on updates
  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_students`;
      syncToStorageKeys([key], students);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_students"], students);
    }
  }, [students, authUser, isDemoMode]);

  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_sessions`;
      syncToStorageKeys([key], sessions);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_sessions"], sessions);
    }
  }, [sessions, authUser, isDemoMode]);

  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_daily_reports`;
      syncToStorageKeys([key], dailyReports);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_daily_reports"], dailyReports);
    }
  }, [dailyReports, authUser, isDemoMode]);

  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_monthly_reports`;
      syncToStorageKeys([key], monthlyReports);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_monthly_reports"], monthlyReports);
    }
  }, [monthlyReports, authUser, isDemoMode]);

  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_memories`;
      syncToStorageKeys([key], memories);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_memories"], memories);
    }
  }, [memories, authUser, isDemoMode]);

  useEffect(() => {
    if (authUser) {
      const key = `dita_teacher_${authUser.uid}_settings`;
      syncToStorageKeys([key], settings);
    } else if (isDemoMode) {
      syncToStorageKeys(["dita_demo_settings"], settings);
    }
  }, [settings, authUser, isDemoMode]);

  // Session Builder & Report Preview Modal state
  const [isSessionBuilderOpen, setIsSessionBuilderOpen] = useState(false);
  const [preselectedStudentIdForSession, setPreselectedStudentIdForSession] = useState<string | undefined>(undefined);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<DailyReport | null>(null);
  const [selectedStudentForMemory, setSelectedStudentForMemory] = useState<string | undefined>(undefined);

  // Helper utilities for clean data deduplication
  const cleanAndDeduplicateStudents = (studentsList: Student[]): Student[] => {
    if (!Array.isArray(studentsList)) return [];
    const map = new Map<string, Student>();
    const normNameMap = new Map<string, Student>();

    studentsList.forEach(s => {
      if (!s || !s.id) return;
      const normName = (s.fullName || "").trim().toLowerCase();

      if (map.has(s.id)) {
        map.set(s.id, { ...map.get(s.id)!, ...s });
        return;
      }

      if (normName && normNameMap.has(normName)) {
        const existing = normNameMap.get(normName)!;
        const merged: Student = {
          ...existing,
          ...s,
          id: existing.id,
          parentName: s.parentName || existing.parentName,
          parentContact: s.parentContact || existing.parentContact,
          currentLevel: s.currentLevel || existing.currentLevel,
          subjects: (s.subjects && s.subjects.length > 0) ? s.subjects : existing.subjects,
        };
        map.set(existing.id, merged);
        normNameMap.set(normName, merged);
        return;
      }

      map.set(s.id, s);
      if (normName) {
        normNameMap.set(normName, s);
      }
    });

    return Array.from(map.values());
  };

  const cleanAndDeduplicateItems = <T extends { id: string }>(items: T[]): T[] => {
    if (!Array.isArray(items)) return [];
    const map = new Map<string, T>();
    items.forEach(i => {
      if (!i || typeof i !== "object") return;
      if ((i as any).error) return; // Ignore error responses like { error: "Session not found" }
      if (!i.id || typeof i.id !== "string" || i.id.trim().length === 0) return;
      // Filter out invalid or corrupted report stubs
      if ("reportType" in i) {
        const r = i as any;
        if (!r.title && !r.contentArabic && !r.contentEnglish) return;
      }
      map.set(i.id, i);
    });
    return Array.from(map.values());
  };

  // Initial Data Fetcher - Merges Firestore & local state cleanly
  const refreshAllData = async () => {
    try {
      // 1. Fetch from Firestore
      const fsData = await loadInitialFirestoreData();

      // 2. ONLY fetch sample Express mock data if user is in Demo Mode
      let apiStudents: Student[] | null = null;
      let apiSessions: Session[] | null = null;
      let apiDailyReports: DailyReport[] | null = null;
      let apiMonthlyReports: MonthlyReport[] | null = null;
      let apiSettings: AppSettings | null = null;

      if (!authUser && isDemoMode) {
        const safeFetch = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        };

        const [stRes, seRes, drRes, mrRes, setRes] = await Promise.all([
          safeFetch("/api/students"),
          safeFetch("/api/sessions"),
          safeFetch("/api/reports/daily"),
          safeFetch("/api/reports/monthly"),
          safeFetch("/api/settings")
        ]);

        apiStudents = stRes;
        apiSessions = seRes;
        apiDailyReports = drRes;
        apiMonthlyReports = mrRes;
        apiSettings = setRes;
      }

      // Filter Firestore items by teacherId if an authenticated user is active
      const fsStudents = authUser
        ? (fsData.students || []).filter(s => !s.teacherId || s.teacherId === authUser.uid)
        : (fsData.students || []);
      const fsSessions = authUser
        ? (fsData.sessions || []).filter(s => s.teacherId === authUser.uid)
        : (fsData.sessions || []);
      const fsDailyReports = authUser
        ? (fsData.dailyReports || []).filter(r => r.teacherId === authUser.uid)
        : (fsData.dailyReports || []);
      const fsMonthlyReports = authUser
        ? (fsData.monthlyReports || []).filter(r => r.teacherId === authUser.uid)
        : (fsData.monthlyReports || []);

      setStudents(prev => {
        const rawMerged = [
          ...prev,
          ...fsStudents,
          ...(isDemoMode && !authUser ? (apiStudents || []) : [])
        ];
        return cleanAndDeduplicateStudents(rawMerged);
      });

      setSessions(prev => {
        const rawMerged = [
          ...prev,
          ...fsSessions,
          ...(isDemoMode && !authUser ? (apiSessions || []) : [])
        ];
        return cleanAndDeduplicateItems(rawMerged);
      });

      setDailyReports(prev => {
        const rawMerged = [
          ...prev,
          ...fsDailyReports,
          ...(isDemoMode && !authUser ? (apiDailyReports || []) : [])
        ];
        return cleanAndDeduplicateItems(rawMerged);
      });

      setMonthlyReports(prev => {
        const rawMerged = [
          ...prev,
          ...fsMonthlyReports,
          ...(isDemoMode && !authUser ? (apiMonthlyReports || []) : [])
        ];
        return cleanAndDeduplicateItems(rawMerged);
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
        if (apiSettings && typeof apiSettings === "object" && !("error" in apiSettings) && apiSettings.preferredLanguage) {
          merged = mergeSettings(merged, apiSettings);
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
    const normName = (studentData.fullName || "").trim().toLowerCase();
    const existing = students.find(s => (s.fullName || "").trim().toLowerCase() === normName);

    if (existing) {
      // Update existing student instead of creating a duplicate record
      const updatedSt: Student = {
        ...existing,
        ...studentData,
        parentName: studentData.parentName || existing.parentName,
        parentContact: studentData.parentContact || existing.parentContact,
        currentLevel: studentData.currentLevel || existing.currentLevel,
        subjects: (studentData.subjects && studentData.subjects.length > 0) ? studentData.subjects : existing.subjects
      };
      setStudents(prev => prev.map(s => s.id === existing.id ? updatedSt : s));
      showNotification(
        settings.preferredLanguage === "ar"
          ? `تم تحديث ملف الطالب الموجود بالفعل: ${existing.fullName}`
          : `Updated existing student profile: ${existing.fullName}`
      );
      await saveStudentToFirestore(updatedSt);
      try {
        await fetch(`/api/students/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSt)
        });
      } catch (e) {}
      return;
    }

    const studentId = (studentData as any).id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentTeacherId = authUser ? authUser.uid : "teacher_001";

    const newSt: Student = {
      ...studentData,
      id: studentId,
      teacherId: currentTeacherId,
      createdAt: new Date().toISOString(),
      status: studentData.status || "Active"
    };

    setStudents(prev => cleanAndDeduplicateStudents([newSt, ...prev]));
    showNotification(
      settings.preferredLanguage === "ar"
        ? `تم إضافة الطالب: ${newSt.fullName}`
        : `Added new student: ${newSt.fullName}`
    );

    // Save directly to Firestore using canonical studentId
    await saveStudentToFirestore(newSt);

    try {
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSt)
      });
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
      await deleteStudentFromFirestore(id);
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
      showNotification(
        settings.preferredLanguage === "ar"
          ? "جاري تسجيل الحصة وتوليد التقرير بالذكاء الاصطناعي..."
          : "Recording session & generating AI report...",
        "info"
      );

      const targetStudent = students.find(s => s.id === sessionData.studentId);
      let newSession: Session;

      // 1. Create/Register Session
      try {
        const sesRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionData)
        });
        if (sesRes.ok) {
          newSession = await sesRes.json();
        } else {
          throw new Error("API session creation failed");
        }
      } catch (err) {
        newSession = {
          ...sessionData,
          id: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          teacherId: authUser ? authUser.uid : "teacher_001",
          createdAt: new Date().toISOString()
        };
      }

      setSessions(prev => cleanAndDeduplicateItems([newSession, ...prev]));
      await saveSessionToFirestore(newSession);

      // 2. Generate AI Daily Report with payload fallbacks
      let reportData: DailyReport | null = null;
      try {
        const repRes = await fetch("/api/reports/daily/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: newSession.id,
            session: newSession,
            student: targetStudent,
            targetLanguage: settings.preferredLanguage,
            customAiRules: settings.aiRules
          })
        });
        if (repRes.ok) {
          const resJson = await repRes.json();
          if (resJson && !resJson.error && resJson.id) {
            reportData = resJson;
          }
        }
      } catch (err) {
        console.warn("AI report generation endpoint unreachable, generating local report:", err);
      }

      // If server response was invalid or failed, use client generator fallback
      if (!reportData || (reportData as any).error) {
        reportData = generateClientSideDailyReport(newSession, targetStudent, settings);
      }

      setDailyReports(prev => cleanAndDeduplicateItems([reportData!, ...prev]));
      await saveDailyReportToFirestore(reportData!);
      setSelectedReportForPreview(reportData!);
      showNotification(
        settings.preferredLanguage === "ar"
          ? "تم توليد التقرير اليومي بالذكاء الاصطناعي بنجاح!"
          : "AI Daily Report generated successfully!",
        "success"
      );
    } catch (err) {
      console.error(err);
      showNotification(
        settings.preferredLanguage === "ar" ? "حدث خطأ أثناء إنشاء التقرير" : "Failed to generate report",
        "error"
      );
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
    setDailyReports(prev => prev.filter(r => r.id !== id));
    showNotification(settings.preferredLanguage === "ar" ? "تم حذف التقرير بنجاح" : "Report removed successfully");
    try {
      await deleteDailyReportFromFirestore(id);
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Delete report sync:", err);
    }
  };

  const handleDeleteMonthlyReport = async (id: string) => {
    setMonthlyReports(prev => prev.filter(r => r.id !== id));
    showNotification(settings.preferredLanguage === "ar" ? "تم حذف التقرير الشهري بنجاح" : "Monthly report removed successfully");
    try {
      await deleteMonthlyReportFromFirestore(id);
      await fetch(`/api/reports/monthly/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Delete monthly report sync:", err);
    }
  };

  const handleGenerateMonthlyReport = async (studentId: string, month: string, year: number) => {
    try {
      showNotification(
        settings.preferredLanguage === "ar"
          ? "جاري تجميع التقرير الشهري من السجلات المعتمدة..."
          : "Synthesizing monthly report from approved daily records...",
        "info"
      );

      const targetStudent = students.find(s => s.id === studentId);
      if (!targetStudent) {
        showNotification(
          settings.preferredLanguage === "ar" ? "تعذر العثور على الطالب" : "Student not found",
          "error"
        );
        return;
      }

      const approvedDailyReports = dailyReports.filter(
        r => r && (r.studentId === studentId || (r.studentName || "").trim().toLowerCase() === (targetStudent.fullName || "").trim().toLowerCase()) && r.isApproved
      );

      let monthlyData: MonthlyReport | null = null;
      try {
        const res = await fetch("/api/reports/monthly/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            student: targetStudent,
            approvedReports: approvedDailyReports,
            month,
            year,
            targetLanguage: settings.preferredLanguage,
            customAiRules: settings.aiRules
          })
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson && !resJson.error && resJson.id) {
            monthlyData = resJson;
          }
        }
      } catch (err) {
        console.warn("Server monthly report generation endpoint unreachable, using fallback:", err);
      }

      if (!monthlyData || (monthlyData as any).error) {
        monthlyData = generateClientSideMonthlyReport(targetStudent, month, year, approvedDailyReports, settings);
      }

      setMonthlyReports(prev => cleanAndDeduplicateItems([monthlyData!, ...prev]));
      await saveMonthlyReportToFirestore(monthlyData!);
      showNotification(
        settings.preferredLanguage === "ar"
          ? `تم إنشاء التقرير الشهري للطالب: ${monthlyData.studentName}`
          : `Monthly Report for ${monthlyData.studentName} created!`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showNotification(
        settings.preferredLanguage === "ar" ? "فشل إنشاء التقرير الشهري" : "Failed to generate monthly report",
        "error"
      );
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

  if (loading || !authChecked) {
    return (
      <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f9f6] text-slate-800 flex flex-col items-center justify-center space-y-4">
        <Sparkles className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-slate-700">
          {isArabic ? "جاري تحميل مساعد المعلم الإسلامي اليومي (DITA)..." : "Loading Daily Islamic Teacher Assistant..."}
        </p>
      </div>
    );
  }

  // ENTRY GATE: If no active teacher session and not in quick demo mode, render AuthLandingGate
  if (!authUser && !isDemoMode) {
    return (
      <AuthLandingGate
        onEnterDemo={handleEnterDemoMode}
        onAuthSuccess={(user) => {
          setAuthUser(user);
          setIsDemoMode(false);
          try { sessionStorage.removeItem("dita_is_demo_mode"); } catch (e) {}
        }}
      />
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
        isDemoMode={isDemoMode}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSwitchToAuthLanding={handleSwitchToAuthLanding}
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
                            {isArabic ? `الحصة رقم #${s.sessionNumber} • ${s.date} • ${s.durationMinutes} دقيقة` : `Session #${s.sessionNumber} • ${s.date} • ${s.durationMinutes} mins`}
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
                onDeleteMonthlyReport={handleDeleteMonthlyReport}
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
