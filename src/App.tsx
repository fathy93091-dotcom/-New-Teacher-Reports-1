import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { MobileBottomNav, NavTab } from "./components/MobileBottomNav";
import { DashboardView } from "./components/DashboardView";
import { GroupsView } from "./components/GroupsView";
import { StudentsView } from "./components/StudentsView";
import { ScheduleView } from "./components/ScheduleView";
import { FinanceView } from "./components/FinanceView";
import { MonthlyComprehensiveReportView } from "./components/MonthlyComprehensiveReportView";
import { SettingsAndBackupModal } from "./components/SettingsAndBackupModal";
import { AIChatModal } from "./components/AIChatModal";

import {
  Student,
  CombinedStudentGroup,
  Group,
  PrivateLesson,
  Lesson,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  SubjectPaymentAllocation,
  GeneratedReport,
  AppSettings,
  AttendanceStatus,
  HomeworkStatus,
  StudentStatus,
  GoStarsBackupData,
  ReportAttachment,
  isMonthlyComprehensiveReport,
  isDailyPersonalReport,
  areReportsDuplicate,
  deduplicateReportsList
} from "./types";
import { StorageEngine, mergeEntityLists } from "./lib/storage";
import { calculateStudentFinancialProfile, sanitizeStudent, normalizeArabicText, matchesStudentRecord } from "./lib/financeEngine";
import { archiveEndedCycleAndStartNew, runAutomaticArchivingCheck } from "./lib/reportArchiveEngine";
import { SmartStepMemory } from "./lib/smartStepMemory";
import {
  auth,
  onAuthStateChanged,
  logoutFirebase,
  subscribeToUserData,
  saveUserDataToFirestore,
  fetchLatestUserDataFromFirestore,
  deleteStudentPermanentlyFromFirestore,
  isFirestoreQuotaExceeded,
  resetFirestoreQuotaCooldown,
  User as FirebaseUser
} from "./lib/firebase";
import {
  processSyncQueue,
  triggerDebouncedSync,
  enqueueCloudSync,
  enqueueWorkspaceDeltas,
  SYNC_STATUS_EVENT,
  SyncStatusState
} from "./lib/syncQueue";
import { idbClearSyncedQueue } from "./lib/idbStorage";
import { LoginView } from "./components/LoginView";
import { FirebaseRulesModal } from "./components/FirebaseRulesModal";

export function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State initialized from LocalStorage (per user)
  const [settings, setSettings] = useState<AppSettings>(() => StorageEngine.getSettings());
  const [students, setStudents] = useState<Student[]>(() => StorageEngine.getStudents());
  const [combinedStudentGroups, setCombinedStudentGroups] = useState<CombinedStudentGroup[]>(() =>
    StorageEngine.getCombinedStudentGroups()
  );
  const [groups, setGroups] = useState<Group[]>(() => StorageEngine.getGroups());
  const [privateLessons, setPrivateLessons] = useState<PrivateLesson[]>(() => StorageEngine.getPrivateLessons());
  const [lessons, setLessons] = useState<Lesson[]>(() => StorageEngine.getLessons());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageEngine.getAttendanceRecords());
  const [examRecords, setExamRecords] = useState<ExamRecord[]>(() => StorageEngine.getExams());
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => StorageEngine.getPayments());
  const [reports, setReports] = useState<GeneratedReport[]>(() => StorageEngine.getReports());

  // Dismissed Notifications State (Persisted in localStorage)
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gostars_dismissed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotification = (id: string) => {
    setDismissedNotificationIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem("gostars_dismissed_notifications", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDismissAllNotifications = (ids: string[]) => {
    setDismissedNotificationIds(prev => {
      const next = Array.from(new Set([...prev, ...ids]));
      try {
        localStorage.setItem("gostars_dismissed_notifications", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRestoreNotifications = () => {
    setDismissedNotificationIds([]);
    try {
      localStorage.removeItem("gostars_dismissed_notifications");
    } catch {}
  };

  // Flags to prevent sync race conditions
  const isSyncingFromRemoteRef = useRef(false);
  const hasLoadedRemoteRef = useRef(false);
  const isHydratedRef = useRef(false);
  const lastSyncedWorkspaceRef = useRef<GoStarsBackupData | null>(null);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        hasLoadedRemoteRef.current = false;
        isHydratedRef.current = false;
        try {
          localStorage.setItem("gostars_active_uid", user.uid);
        } catch {}
        // Warm memory from IndexedDB if localStorage was previously capped
        await StorageEngine.hydrateFromIndexedDB(user.uid);

        // Load this specific user's scoped local data
        let userSettings = StorageEngine.getSettings(user.uid);
        let userStudents = StorageEngine.getStudents(user.uid);
        let userCombined = StorageEngine.getCombinedStudentGroups(user.uid);
        let userGroups = StorageEngine.getGroups(user.uid);
        let userPrivateLessons = StorageEngine.getPrivateLessons(user.uid);
        let userLessons = StorageEngine.getLessons(user.uid);
        let userAttendance = StorageEngine.getAttendanceRecords(user.uid);
        let userExams = StorageEngine.getExams(user.uid);
        let userPayments = StorageEngine.getPayments(user.uid);
        let userReports = StorageEngine.recoverAllReports(user.uid);

        // Migrate guest settings to user if user has blank/partial settings
        const guestSettings = StorageEngine.getSettings();
        userSettings = StorageEngine.mergeSettings(guestSettings, userSettings, user.displayName || "");
        StorageEngine.saveSettings(userSettings, user.uid);

        // If logged-in user scope has no students yet, check if there's guest data to migrate
        const guestStudents = StorageEngine.getStudents();
        const guestReports = StorageEngine.getReports();
        const guestAttendance = StorageEngine.getAttendanceRecords();

        if ((!userStudents || userStudents.length === 0) && guestStudents && guestStudents.length > 0) {
          userStudents = guestStudents;
          userCombined = StorageEngine.getCombinedStudentGroups();
          userGroups = StorageEngine.getGroups();
          userPrivateLessons = StorageEngine.getPrivateLessons();
          userLessons = StorageEngine.getLessons();
          userAttendance = guestAttendance;
          userExams = StorageEngine.getExams();
          userPayments = StorageEngine.getPayments();
          userReports = guestReports;

          // Save migrated guest workspace to this user's local storage scope
          StorageEngine.saveUserWorkspace(user.uid, {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            settings: userSettings,
            students: userStudents,
            combinedStudentGroups: userCombined,
            groups: userGroups,
            privateLessons: userPrivateLessons,
            lessons: userLessons,
            attendanceRecords: userAttendance,
            examRecords: userExams,
            paymentTransactions: userPayments,
            reports: userReports
          });
        } else if (guestReports && guestReports.length > 0) {
          // If user already had data, still merge any guest reports created recently
          userReports = mergeEntityLists(userReports || [], guestReports);
          StorageEngine.saveReports(userReports, user.uid);
        }

        setSettings(userSettings);
        setStudents(userStudents);
        setCombinedStudentGroups(userCombined);
        setGroups(userGroups);
        setPrivateLessons(userPrivateLessons);
        setLessons(userLessons);
        setAttendanceRecords(userAttendance);
        setExamRecords(userExams);
        setPaymentTransactions(userPayments);
        setReports(userReports);
        isHydratedRef.current = true;
      } else {
        hasLoadedRemoteRef.current = true;
        isHydratedRef.current = false;
        try {
          localStorage.removeItem("gostars_active_uid");
        } catch {}
        // Guest mode: Load guest-scoped local data from LocalStorage and IndexedDB
        await StorageEngine.hydrateFromIndexedDB(undefined);
        const guestSettings = StorageEngine.getSettings();
        const guestStudents = StorageEngine.getStudents();
        const guestCombined = StorageEngine.getCombinedStudentGroups();
        const guestGroups = StorageEngine.getGroups();
        const guestPrivateLessons = StorageEngine.getPrivateLessons();
        const guestLessons = StorageEngine.getLessons();
        const guestAttendance = StorageEngine.getAttendanceRecords();
        const guestExams = StorageEngine.getExams();
        const guestPayments = StorageEngine.getPayments();
        const guestReports = StorageEngine.recoverAllReports();

        setSettings(guestSettings);
        setStudents(guestStudents);
        setCombinedStudentGroups(guestCombined);
        setGroups(guestGroups);
        setPrivateLessons(guestPrivateLessons);
        setLessons(guestLessons);
        setAttendanceRecords(guestAttendance);
        setExamRecords(guestExams);
        setPaymentTransactions(guestPayments);
        setReports(guestReports);
        isHydratedRef.current = true;
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for Firestore real-time updates when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    // Sanitize local settings for this user
    const cleanedLocalSettings = StorageEngine.cleanSettings(settings, currentUser.displayName || "");
    if (JSON.stringify(cleanedLocalSettings) !== JSON.stringify(settings)) {
      setSettings(cleanedLocalSettings);
      StorageEngine.saveSettings(cleanedLocalSettings, uid);
    }

    // Fallback safety timer: ensure changes are allowed to save to Firestore after 2s
    const fallbackTimer = setTimeout(() => {
      hasLoadedRemoteRef.current = true;
    }, 2000);

    const unsubscribe = subscribeToUserData(uid, (remoteData, meta) => {
      clearTimeout(fallbackTimer);
      
      // If this snapshot is just an echo of our own pending local write, skip replacing local state
      if (meta && meta.hasPendingWrites) {
        hasLoadedRemoteRef.current = true;
        return;
      }

      if (remoteData) {
        isSyncingFromRemoteRef.current = true;

        if (remoteData.settings) {
          setSettings(prev => {
            const merged = StorageEngine.mergeSettings(prev, remoteData.settings, currentUser.displayName || "");
            StorageEngine.saveSettings(merged, uid);
            return merged;
          });
        }

        // Collect and register tombstones from remote deletedStudentIds
        const tombstones = StorageEngine.getTombstones(uid);
        if (Array.isArray(remoteData.deletedStudentIds)) {
          remoteData.deletedStudentIds.forEach(id => {
            if (id) {
              const safe = String(id).trim();
              tombstones.add(safe);
              StorageEngine.addTombstone(safe, uid);
            }
          });
        }

        // Students: safely merge remote students with local students so no added student is lost, strictly excluding deleted students
        if (Array.isArray(remoteData.students)) {
          setStudents(prevLocalStudents => {
            const cleanRemote = remoteData.students.filter(s => s && s.id && !tombstones.has(String(s.id).trim()));
            const cleanLocal = prevLocalStudents.filter(s => s && s.id && !tombstones.has(String(s.id).trim()));
            const merged = mergeEntityLists(cleanLocal, cleanRemote, sanitizeStudent, tombstones);
            StorageEngine.saveStudents(merged, uid);
            return merged;
          });
        }

        // Combined Groups: safely merge
        if (Array.isArray(remoteData.combinedStudentGroups)) {
          setCombinedStudentGroups(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.combinedStudentGroups);
            const cleaned = merged.map(cg => ({
              ...cg,
              studentIds: (cg.studentIds || []).filter(id => !tombstones.has(String(id).trim()))
            }));
            StorageEngine.saveCombinedStudentGroups(cleaned, uid);
            return cleaned;
          });
        }

        // Groups: safely merge
        if (Array.isArray(remoteData.groups)) {
          setGroups(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.groups);
            const cleaned = merged.map(g => ({
              ...g,
              studentIds: (g.studentIds || []).filter(id => !tombstones.has(String(id).trim()))
            }));
            StorageEngine.saveGroups(cleaned, uid);
            return cleaned;
          });
        }

        // Private Lessons: safely merge
        if (Array.isArray(remoteData.privateLessons)) {
          setPrivateLessons(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.privateLessons);
            const cleaned = merged.filter(p => !p.studentId || !tombstones.has(String(p.studentId).trim()));
            StorageEngine.savePrivateLessons(cleaned, uid);
            return cleaned;
          });
        }

        // Lessons: safely merge
        if (Array.isArray(remoteData.lessons)) {
          setLessons(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.lessons);
            StorageEngine.saveLessons(merged, uid);
            return merged;
          });
        }

        // Reports: safely merge remote reports with local reports so no locally-authored reports are lost
        if (Array.isArray(remoteData.reports)) {
          setReports(prevLocalReports => {
            const cleanRemote = remoteData.reports.filter(r => r && (!r.studentId || !tombstones.has(String(r.studentId).trim())));
            const cleanLocal = prevLocalReports.filter(r => r && (!r.studentId || !tombstones.has(String(r.studentId).trim())));
            const merged = deduplicateReportsList(mergeEntityLists(cleanLocal, cleanRemote));
            const sorted = [...merged].sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
            StorageEngine.saveReports(sorted, uid);
            return sorted;
          });
        }

        // Attendance records: safely merge remote attendance
        if (Array.isArray(remoteData.attendanceRecords)) {
          setAttendanceRecords(prevLocal => {
            const cleanRemote = remoteData.attendanceRecords.filter(a => a && (!a.studentId || !tombstones.has(String(a.studentId).trim())));
            const cleanLocal = prevLocal.filter(a => a && (!a.studentId || !tombstones.has(String(a.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const cleaned = merged.filter(a => a && a.id && !a.id.startsWith("att_rec_") && a.studentId && a.studentId !== "group" && !tombstones.has(String(a.studentId).trim()));
            const sorted = [...cleaned].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.saveAttendanceRecords(sorted, uid);
            return sorted;
          });
        }

        // Exam records: safely merge remote exams
        if (Array.isArray(remoteData.examRecords)) {
          setExamRecords(prevLocal => {
            const cleanRemote = remoteData.examRecords.filter(e => e && (!e.studentId || !tombstones.has(String(e.studentId).trim())));
            const cleanLocal = prevLocal.filter(e => e && (!e.studentId || !tombstones.has(String(e.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const sorted = [...merged].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.saveExams(sorted, uid);
            return sorted;
          });
        }

        // Payment transactions: safely merge remote payments
        if (Array.isArray(remoteData.paymentTransactions)) {
          setPaymentTransactions(prevLocal => {
            const cleanRemote = remoteData.paymentTransactions.filter(p => p && (!p.studentId || !tombstones.has(String(p.studentId).trim())));
            const cleanLocal = prevLocal.filter(p => p && (!p.studentId || !tombstones.has(String(p.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const sorted = [...merged].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.savePayments(sorted, uid);
            return sorted;
          });
        }

        lastSyncedWorkspaceRef.current = remoteData;
        hasLoadedRemoteRef.current = true;
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 300);
      } else {
        // First login for this email or no remote document yet: preserve local workspace and save to Firestore
        const cleanInitial = StorageEngine.cleanSettings(settings, currentUser.displayName || "");
        const localStudents = StorageEngine.getStudents(uid) || [];
        const localCombined = StorageEngine.getCombinedStudentGroups(uid) || [];
        const localGroups = StorageEngine.getGroups(uid) || [];
        const localPrivateLessons = StorageEngine.getPrivateLessons(uid) || [];
        const localLessons = StorageEngine.getLessons(uid) || [];
        const localAttendance = StorageEngine.getAttendanceRecords(uid) || [];
        const localExams = StorageEngine.getExams(uid) || [];
        const localPayments = StorageEngine.getPayments(uid) || [];
        const localReports = StorageEngine.getReports(uid) || [];

        setSettings(cleanInitial);
        const initialWorkspace: GoStarsBackupData = {
          version: "2.0",
          exportedAt: new Date().toISOString(),
          settings: cleanInitial,
          students: (Array.isArray(localStudents) && localStudents.length > 0) ? localStudents : (Array.isArray(students) ? students : []),
          combinedStudentGroups: (Array.isArray(localCombined) && localCombined.length > 0) ? localCombined : (Array.isArray(combinedStudentGroups) ? combinedStudentGroups : []),
          groups: (Array.isArray(localGroups) && localGroups.length > 0) ? localGroups : (Array.isArray(groups) ? groups : []),
          privateLessons: (Array.isArray(localPrivateLessons) && localPrivateLessons.length > 0) ? localPrivateLessons : (Array.isArray(privateLessons) ? privateLessons : []),
          lessons: (Array.isArray(localLessons) && localLessons.length > 0) ? localLessons : (Array.isArray(lessons) ? lessons : []),
          attendanceRecords: (Array.isArray(localAttendance) && localAttendance.length > 0) ? localAttendance : (Array.isArray(attendanceRecords) ? attendanceRecords : []),
          examRecords: (Array.isArray(localExams) && localExams.length > 0) ? localExams : (Array.isArray(examRecords) ? examRecords : []),
          paymentTransactions: (Array.isArray(localPayments) && localPayments.length > 0) ? localPayments : (Array.isArray(paymentTransactions) ? paymentTransactions : []),
          reports: (Array.isArray(localReports) && localReports.length > 0) ? localReports : (Array.isArray(reports) ? reports : [])
        };

        StorageEngine.saveUserWorkspace(uid, initialWorkspace);
        lastSyncedWorkspaceRef.current = initialWorkspace;
        if (!isFirestoreQuotaExceeded()) {
          saveUserDataToFirestore(uid, initialWorkspace, true).catch(() => {});
        }
        hasLoadedRemoteRef.current = true;
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
      }
    }, (err) => {
      console.warn("Firestore user sync error:", err);
      setCloudSyncStatus("error");
      setCloudSyncError(err?.message || "Permission denied");
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // Clean up any stale synthetic phantom records from attendance state on load
  useEffect(() => {
    const hasPhantom = attendanceRecords.some(a => !a || !a.id || a.id.startsWith("att_rec_") || !a.studentId || a.studentId === "group");
    if (hasPhantom) {
      setAttendanceRecords(prev => {
        const cleaned = prev.filter(a => a && a.id && !a.id.startsWith("att_rec_") && a.studentId && a.studentId !== "group");
        const uid = currentUser ? currentUser.uid : undefined;
        StorageEngine.saveAttendanceRecords(cleaned, uid);
        return cleaned;
      });
    }
  }, []);

  // UI State - Smart Step Memory restores last active tab
  const [activeTab, setActiveTabState] = useState<NavTab>(() => SmartStepMemory.getAppNav().activeTab);
  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    SmartStepMemory.saveAppNav({ activeTab: tab });
  };
  const [searchQuery, setSearchQuery] = useState("");

  // Automatic Monthly Archiving Check:
  // Runs seamlessly at the start of every month for "Monthly System" students (نظام الشهر).
  // Strictly preserves "Fixed Package" students (نظام الباقة المحددة بعدد حصص) until full completion or manual archive.
  useEffect(() => {
    if (!students || students.length === 0) return;
    const { updatedStudents, updatedReports, updatedAttendance, hasChanges } = runAutomaticArchivingCheck({
      students,
      reports,
      attendanceRecords
    });

    if (hasChanges) {
      const uid = currentUser ? currentUser.uid : undefined;
      setStudents(updatedStudents);
      setReports(updatedReports);
      setAttendanceRecords(updatedAttendance);

      StorageEngine.saveStudents(updatedStudents, uid);
      StorageEngine.saveReports(updatedReports, uid);
      StorageEngine.saveAttendanceRecords(updatedAttendance, uid);
    }
  }, [students.length, reports.length, attendanceRecords.length]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "error" | "offline">("synced");
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Listen for real-time background sync queue updates and network state
  useEffect(() => {
    const handleSyncStatus = (event: any) => {
      const detail: SyncStatusState = event?.detail;
      if (!detail) return;
      if (!detail.isOnline) {
        setCloudSyncStatus("offline");
      } else if (detail.lastError && detail.pendingCount > 0) {
        if (isFirestoreQuotaExceeded()) {
          setCloudSyncStatus("synced");
          setCloudSyncError(null);
        } else {
          setCloudSyncStatus("error");
          setCloudSyncError(detail.lastError);
        }
      } else if (detail.isSyncing || detail.pendingCount > 0) {
        setCloudSyncStatus("syncing");
      } else {
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
        if (detail.lastSyncAt) {
          const formatted = new Date(detail.lastSyncAt).toLocaleTimeString(
            settings.preferredLanguage === "ar" ? "ar-EG" : "en-US",
            { hour: "2-digit", minute: "2-digit", second: "2-digit" }
          );
          setLastSyncTime(formatted);
        }
      }
    };

    window.addEventListener(SYNC_STATUS_EVENT as any, handleSyncStatus);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT as any, handleSyncStatus);
    };
  }, [settings.preferredLanguage]);

  const handleRecoverMissingReports = () => {
    const uid = currentUser ? currentUser.uid : undefined;
    const recovered = StorageEngine.recoverAllReports(uid);
    setReports(recovered);
    if (uid) {
      saveUserDataToFirestore(uid, {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        settings,
        students,
        combinedStudentGroups,
        groups,
        privateLessons,
        lessons,
        attendanceRecords,
        examRecords,
        paymentTransactions,
        reports: recovered,
        deletedStudentIds: Array.from(StorageEngine.getTombstones(uid))
      }, true).catch(() => {});
    }
    setSyncMessage({
      text: settings.preferredLanguage === "ar"
        ? `تم استعادة وتحديث جميع التقارير بنجاح (${recovered.length} تقريراً)!`
        : `Successfully recovered and updated all reports (${recovered.length} reports)!`,
      type: "success"
    });
    setTimeout(() => setSyncMessage(null), 5000);
  };

  // Manual Force Sync / PWA Refresh handler
  const handleForceSync = async () => {
    setIsSyncing(true);
    setCloudSyncStatus("syncing");
    setCloudSyncError(null);
    setSyncMessage(null);
    
    try {
      if (!currentUser) {
        setCloudSyncStatus("offline");
        setSyncMessage({
          text: settings.preferredLanguage === "ar"
            ? "أنت غير مسجل الدخول بحساب Google. البيانات محفوظة محلياً على هذا الجهاز فقط."
            : "Not signed in with Google. Data is saved locally only.",
          type: "info"
        });
        setIsSyncing(false);
        return;
      }

      const uid = currentUser.uid;

      // 0. Clear any temporary cooldowns and process pending offline queue
      resetFirestoreQuotaCooldown();
      await processSyncQueue(uid);

      // 1. FIRST: Push all current in-memory local workspace data to Firestore cloud
      const currentWorkspace: GoStarsBackupData = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        settings,
        students,
        combinedStudentGroups,
        groups,
        privateLessons,
        lessons,
        attendanceRecords,
        examRecords,
        paymentTransactions,
        reports,
        deletedStudentIds: Array.from(StorageEngine.getTombstones(uid))
      };

      const pushResult = await saveUserDataToFirestore(uid, currentWorkspace, true);
      if (!pushResult.success) {
        throw new Error(pushResult.error || "Failed to save data to cloud");
      }

      lastSyncedWorkspaceRef.current = currentWorkspace;
      await idbClearSyncedQueue();

      if (pushResult.quotaExceeded) {
        const nowFormatted = new Date().toLocaleTimeString(settings.preferredLanguage === "ar" ? "ar-EG" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        setLastSyncTime(nowFormatted);
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
        setSyncMessage({
          text: settings.preferredLanguage === "ar"
            ? "تم حفظ وتأمين كافة البيانات محلياً على هذا الجهاز بنجاح 💾 (المزامنة السحابية ستُستأنف تلقائياً)"
            : "All data safely saved locally on this device 💾 (Cloud sync will resume automatically)",
          type: "success"
        });
        setIsSyncing(false);
        return;
      }

      // 2. SECOND: Fetch latest remote changes and merge
      const remoteData = await fetchLatestUserDataFromFirestore(uid);

      if (remoteData) {
        isSyncingFromRemoteRef.current = true;
        if (remoteData.settings) {
          setSettings(prev => {
            const merged = StorageEngine.mergeSettings(prev, remoteData.settings, currentUser.displayName || "");
            StorageEngine.saveSettings(merged, uid);
            return merged;
          });
        }

        // Collect and register tombstones from remote deletedStudentIds
        const tombstones = StorageEngine.getTombstones(uid);
        if (Array.isArray(remoteData.deletedStudentIds)) {
          remoteData.deletedStudentIds.forEach(id => {
            if (id) {
              const safe = String(id).trim();
              tombstones.add(safe);
              StorageEngine.addTombstone(safe, uid);
            }
          });
        }

        if (Array.isArray(remoteData.students)) {
          setStudents(prevLocalStudents => {
            const cleanRemote = remoteData.students.filter(s => s && s.id && !tombstones.has(String(s.id).trim()));
            const cleanLocal = prevLocalStudents.filter(s => s && s.id && !tombstones.has(String(s.id).trim()));
            const merged = mergeEntityLists(cleanLocal, cleanRemote, sanitizeStudent, tombstones);
            StorageEngine.saveStudents(merged, uid);
            return merged;
          });
        }
        if (Array.isArray(remoteData.combinedStudentGroups)) {
          setCombinedStudentGroups(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.combinedStudentGroups);
            const cleaned = merged.map(cg => ({
              ...cg,
              studentIds: (cg.studentIds || []).filter(id => !tombstones.has(String(id).trim()))
            }));
            StorageEngine.saveCombinedStudentGroups(cleaned, uid);
            return cleaned;
          });
        }
        if (Array.isArray(remoteData.groups)) {
          setGroups(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.groups);
            const cleaned = merged.map(g => ({
              ...g,
              studentIds: (g.studentIds || []).filter(id => !tombstones.has(String(id).trim()))
            }));
            StorageEngine.saveGroups(cleaned, uid);
            return cleaned;
          });
        }
        if (Array.isArray(remoteData.privateLessons)) {
          setPrivateLessons(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.privateLessons);
            const cleaned = merged.filter(p => !p.studentId || !tombstones.has(String(p.studentId).trim()));
            StorageEngine.savePrivateLessons(cleaned, uid);
            return cleaned;
          });
        }
        if (Array.isArray(remoteData.lessons)) {
          setLessons(prevLocal => {
            const merged = mergeEntityLists(prevLocal, remoteData.lessons);
            StorageEngine.saveLessons(merged, uid);
            return merged;
          });
        }
        if (Array.isArray(remoteData.attendanceRecords)) {
          setAttendanceRecords(prevLocal => {
            const cleanRemote = remoteData.attendanceRecords.filter(a => a && (!a.studentId || !tombstones.has(String(a.studentId).trim())));
            const cleanLocal = prevLocal.filter(a => a && (!a.studentId || !tombstones.has(String(a.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const cleaned = merged.filter(a => a && a.id && !a.id.startsWith("att_rec_") && a.studentId && a.studentId !== "group" && !tombstones.has(String(a.studentId).trim()));
            const sorted = [...cleaned].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.saveAttendanceRecords(sorted, uid);
            return sorted;
          });
        }
        if (Array.isArray(remoteData.examRecords)) {
          setExamRecords(prevLocal => {
            const cleanRemote = remoteData.examRecords.filter(e => e && (!e.studentId || !tombstones.has(String(e.studentId).trim())));
            const cleanLocal = prevLocal.filter(e => e && (!e.studentId || !tombstones.has(String(e.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const sorted = [...merged].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.saveExams(sorted, uid);
            return sorted;
          });
        }
        if (Array.isArray(remoteData.paymentTransactions)) {
          setPaymentTransactions(prevLocal => {
            const cleanRemote = remoteData.paymentTransactions.filter(p => p && (!p.studentId || !tombstones.has(String(p.studentId).trim())));
            const cleanLocal = prevLocal.filter(p => p && (!p.studentId || !tombstones.has(String(p.studentId).trim())));
            const merged = mergeEntityLists(cleanLocal, cleanRemote);
            const sorted = [...merged].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            StorageEngine.savePayments(sorted, uid);
            return sorted;
          });
        }
        if (Array.isArray(remoteData.reports)) {
          setReports(prevLocalReports => {
            const cleanRemote = remoteData.reports.filter(r => r && (!r.studentId || !tombstones.has(String(r.studentId).trim())));
            const cleanLocal = prevLocalReports.filter(r => r && (!r.studentId || !tombstones.has(String(r.studentId).trim())));
            const merged = deduplicateReportsList(mergeEntityLists(cleanLocal, cleanRemote));
            const sorted = [...merged].sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
            StorageEngine.saveReports(sorted, uid);
            return sorted;
          });
        }

        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 300);
      }

      // Check Service Worker cache / updates
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.update());
        }).catch(() => {});
      }

      const nowFormatted = new Date().toLocaleTimeString(settings.preferredLanguage === "ar" ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setLastSyncTime(nowFormatted);
      setCloudSyncStatus("synced");
      setCloudSyncError(null);
      setSyncMessage({
        text: settings.preferredLanguage === "ar"
          ? "تم حفظ وتحديث ومزامنة كافة البيانات سحابياً بنجاح! ☁️"
          : "All data successfully saved and synced to cloud! ☁️",
        type: "success"
      });
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      setCloudSyncStatus("error");
      const errText = err?.message || "Cloud sync failure";
      setCloudSyncError(errText);
      setSyncMessage({
        text: settings.preferredLanguage === "ar"
          ? `تعذر الحفظ السحابي: ${errText}`
          : `Cloud sync failed: ${errText}`,
        type: "error"
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncMessage(null);
      }, 5000);
    }
  };

  // Local persistence and Firestore real-time synchronization are safely managed by subscribeToUserData and state effects.

  // Sync to LocalStorage & Firestore on state changes for the active user or guest
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const uid = currentUser ? currentUser.uid : undefined;

    StorageEngine.saveSettings(settings, uid);
    StorageEngine.saveStudents(students, uid);
    StorageEngine.saveCombinedStudentGroups(combinedStudentGroups, uid);
    StorageEngine.saveGroups(groups, uid);
    StorageEngine.savePrivateLessons(privateLessons, uid);
    StorageEngine.saveLessons(lessons, uid);
    StorageEngine.saveAttendanceRecords(attendanceRecords, uid);
    StorageEngine.saveExams(examRecords, uid);
    StorageEngine.savePayments(paymentTransactions, uid);
    StorageEngine.saveReports(reports, uid);

    const handleBeforeUnload = () => {
      if (!isHydratedRef.current) return;
      StorageEngine.saveSettings(settings, uid);
      StorageEngine.saveStudents(students, uid);
      StorageEngine.saveCombinedStudentGroups(combinedStudentGroups, uid);
      StorageEngine.saveGroups(groups, uid);
      StorageEngine.savePrivateLessons(privateLessons, uid);
      StorageEngine.saveLessons(lessons, uid);
      StorageEngine.saveAttendanceRecords(attendanceRecords, uid);
      StorageEngine.saveExams(examRecords, uid);
      StorageEngine.savePayments(paymentTransactions, uid);
      StorageEngine.saveReports(reports, uid);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    if (!currentUser) {
      setCloudSyncStatus("offline");
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Only sync to Firestore if initial remote load has already completed and we are not processing an incoming remote update
    if (hasLoadedRemoteRef.current && !isSyncingFromRemoteRef.current && currentUser) {
      if (isFirestoreQuotaExceeded()) {
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
        return () => {
          if (debounceTimer) clearTimeout(debounceTimer);
        };
      }

      debounceTimer = setTimeout(async () => {
        if (!currentUser) return;
        const currentWs: GoStarsBackupData = {
          version: "2.0",
          exportedAt: new Date().toISOString(),
          settings,
          students,
          combinedStudentGroups,
          groups,
          privateLessons,
          lessons,
          attendanceRecords,
          examRecords,
          paymentTransactions,
          reports,
          deletedStudentIds: Array.from(StorageEngine.getTombstones(currentUser.uid))
        };
        const prevWs = lastSyncedWorkspaceRef.current;
        lastSyncedWorkspaceRef.current = currentWs;

        const deltasCount = await enqueueWorkspaceDeltas(currentUser.uid, prevWs, currentWs);
        if (deltasCount > 0) {
          triggerDebouncedSync(currentUser.uid, 500);
        }
      }, 1000);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    settings,
    students,
    combinedStudentGroups,
    groups,
    privateLessons,
    lessons,
    attendanceRecords,
    examRecords,
    paymentTransactions,
    reports,
    currentUser
  ]);


  // Settings Handler with Immediate Synchronous Persistence
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveSettings(newSettings, uid);
    if (currentUser) {
      enqueueCloudSync({
        userId: currentUser.uid,
        entityType: "settings",
        entityId: "appSettings",
        operation: "update",
        payload: newSettings
      }).catch(() => {});
      triggerDebouncedSync(currentUser.uid, 300);
    }
  };

  // Handlers
  const handleAddGroup = (newGroupData: Omit<Group, "id" | "createdAt">) => {
    const newGroup: Group = {
      ...newGroupData,
      id: `grp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setGroups(prev => [newGroup, ...prev]);
  };

  const handleAddPrivateLesson = (newData: Omit<PrivateLesson, "id" | "createdAt">) => {
    const newPrv: PrivateLesson = {
      ...newData,
      id: `prv_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setPrivateLessons(prev => [newPrv, ...prev]);
  };

  const handleUpdatePrivateLesson = (id: string, partial: Partial<PrivateLesson>) => {
    setPrivateLessons(prev =>
      prev.map(p => (p.id === id ? { ...p, ...partial } : p))
    );
  };

  const handleDeletePrivateLesson = (id: string) => {
    setPrivateLessons(prev => prev.filter(p => p.id !== id));
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.deletePrivateLesson(id, uid);
  };

  const handleUpdateGroup = (id: string, partial: Partial<Group>) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, ...partial } : g))
    );
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.deleteGroup(id, uid);
  };

  const handleAddStudent = (newData: Omit<Student, "id" | "createdAt">) => {
    const studentId = `stu_${Date.now()}`;
    const newStudent: Student = {
      ...newData,
      id: studentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const sanitized = sanitizeStudent(newStudent);
    setStudents(prev => [sanitized, ...prev]);
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveStudent(sanitized, uid);
  };

  const handleBatchAddStudents = (
    newStudentsData: Array<Omit<Student, "id" | "createdAt">>,
    targetGroupId?: string
  ) => {
    const timestamp = Date.now();
    const createdStudents: Student[] = newStudentsData.map((data, idx) => sanitizeStudent({
      ...data,
      id: `stu_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setStudents(prev => {
      const nextList = [...createdStudents, ...prev];
      const uid = currentUser ? currentUser.uid : undefined;
      StorageEngine.saveStudents(nextList, uid);
      return nextList;
    });

    if (targetGroupId) {
      const createdIds = createdStudents.map(s => s.id);
      setGroups(prev =>
        prev.map(g =>
          g.id === targetGroupId
            ? {
                ...g,
                studentIds: Array.from(new Set([...(g.studentIds || []), ...createdIds]))
              }
            : g
        )
      );
    }
  };

  const handleEditStudent = (
    studentId: string,
    updatedData: Partial<Student>,
    applyToPrevious: boolean = true
  ) => {
    let oldStudent: Student | undefined;
    let savedUpdatedStudent: Student | undefined;

    setStudents(prev =>
      prev.map(s => {
        if (s.id === studentId) {
          oldStudent = s;

          const merged: Student = {
            ...s,
            ...updatedData,
            updatedAt: updatedData.updatedAt || new Date().toISOString()
          };

          // If individual pricing/subject properties were provided, propagate to primary subject in subjects array
          if (merged.subjects && merged.subjects.length > 0) {
            merged.subjects = merged.subjects.map((sub, idx) => {
              if (idx === 0) {
                return {
                  ...sub,
                  subject: updatedData.subject !== undefined ? updatedData.subject : sub.subject,
                  lessonCost: updatedData.lessonCost !== undefined ? Number(updatedData.lessonCost) : sub.lessonCost,
                  hourlyCost: updatedData.hourlyCost !== undefined ? Number(updatedData.hourlyCost) : sub.hourlyCost,
                  rateType: updatedData.rateType !== undefined ? updatedData.rateType : sub.rateType,
                  defaultDurationMinutes: updatedData.defaultDurationMinutes !== undefined ? Number(updatedData.defaultDurationMinutes) : sub.defaultDurationMinutes,
                  billingType: updatedData.billingType !== undefined ? updatedData.billingType : sub.billingType,
                  monthlyCost: updatedData.monthlyCost !== undefined ? Number(updatedData.monthlyCost) : sub.monthlyCost,
                  lessonsPerMonth: updatedData.lessonsPerMonth !== undefined ? Number(updatedData.lessonsPerMonth) : sub.lessonsPerMonth
                };
              }
              return sub;
            });
          }

          // If subjects array was provided in updatedData, synchronize root student fields
          if (updatedData.subjects && updatedData.subjects.length > 0) {
            const pSub = updatedData.subjects[0];
            merged.lessonCost = pSub.lessonCost !== undefined ? Number(pSub.lessonCost) : merged.lessonCost;
            merged.hourlyCost = pSub.hourlyCost !== undefined ? Number(pSub.hourlyCost) : merged.hourlyCost;
            merged.rateType = pSub.rateType || merged.rateType;
            merged.billingType = pSub.billingType || merged.billingType;
            merged.defaultDurationMinutes = pSub.defaultDurationMinutes || merged.defaultDurationMinutes;
            merged.monthlyCost = pSub.monthlyCost !== undefined ? Number(pSub.monthlyCost) : merged.monthlyCost;
            merged.lessonsPerMonth = pSub.lessonsPerMonth !== undefined ? Number(pSub.lessonsPerMonth) : merged.lessonsPerMonth;
          }

          savedUpdatedStudent = sanitizeStudent(merged);
          return savedUpdatedStudent;
        }
        return s;
      })
    );

    if (savedUpdatedStudent) {
      const uid = currentUser ? currentUser.uid : undefined;
      StorageEngine.saveStudent(savedUpdatedStudent, uid);
    }

    // Apply retroactively or preserve past records based on user's choice
    const nowIso = new Date().toISOString();
    if (applyToPrevious) {
      if (updatedData.fullName) {
        setAttendanceRecords(prev =>
          prev.map(a => (a.studentId === studentId ? { ...a, studentName: updatedData.fullName!, updatedAt: nowIso } : a))
        );
        setExamRecords(prev =>
          prev.map(e => (e.studentId === studentId ? { ...e, studentName: updatedData.fullName!, updatedAt: nowIso } : e))
        );
        setPaymentTransactions(prev =>
          prev.map(p => (p.studentId === studentId ? { ...p, studentName: updatedData.fullName!, updatedAt: nowIso } : p))
        );
        setReports(prev =>
          prev.map(r => (r.studentId === studentId ? { ...r, studentName: updatedData.fullName!, updatedAt: nowIso } : r))
        );
        setLessons(prev =>
          prev.map(l => (l.studentId === studentId ? { ...l, studentName: updatedData.fullName!, updatedAt: nowIso } : l))
        );
      }

      if (updatedData.subject) {
        setAttendanceRecords(prev =>
          prev.map(a => (a.studentId === studentId ? { ...a, subject: updatedData.subject!, updatedAt: nowIso } : a))
        );
        setReports(prev =>
          prev.map(r => (r.studentId === studentId ? { ...r, subject: updatedData.subject!, updatedAt: nowIso } : r))
        );
        setLessons(prev =>
          prev.map(l => (l.studentId === studentId ? { ...l, subject: updatedData.subject!, updatedAt: nowIso } : l))
        );
      }

      // Reset billedCost so past attendance recalculates with new pricing
      setAttendanceRecords(prev =>
        prev.map(a => {
          if (a.studentId === studentId) {
            const { billedCost, hourlyRate, ...rest } = a;
            return { ...rest, updatedAt: nowIso };
          }
          return a;
        })
      );
    } else {
      // applyToPrevious is FALSE:
      // Lock past attendance records with their historical cost
      const oldLessonCost = oldStudent?.lessonCost ?? (oldStudent?.subjects?.[0]?.lessonCost ?? 100);
      const oldHourlyCost = oldStudent?.hourlyCost ?? oldLessonCost;
      const oldRateType = oldStudent?.rateType ?? "per_lesson";
      const oldDuration = oldStudent?.defaultDurationMinutes ?? 60;

      setAttendanceRecords(prev =>
        prev.map(a => {
          if (a.studentId === studentId) {
            if (a.billedCost !== undefined && a.billedCost !== null) {
              return a; // Already locked
            }
            const dur = a.durationMinutes || oldDuration;
            const cost = oldRateType === "per_hour" ? Number(((dur / 60) * oldHourlyCost).toFixed(2)) : oldLessonCost;
            return {
              ...a,
              billedCost: cost,
              hourlyRate: oldHourlyCost,
              updatedAt: nowIso
            };
          }
          return a;
        })
      );
    }

    // Sync updated student info to existing private lessons if needed
    if (updatedData.fullName || updatedData.whatsappGroupLink !== undefined || updatedData.subject) {
      setPrivateLessons(prev =>
        prev.map(p => {
          if (p.studentId === studentId) {
            return {
              ...p,
              studentName: updatedData.fullName || p.studentName,
              subject: updatedData.subject || p.subject,
              whatsappGroupLink: updatedData.whatsappGroupLink !== undefined ? updatedData.whatsappGroupLink : p.whatsappGroupLink,
              updatedAt: nowIso
            };
          }
          return p;
        })
      );
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    const updatedStudents = students.filter(s => s.id !== studentId);
    const updatedPrivateLessons = privateLessons.filter(p => p.studentId !== studentId);
    const updatedGroups = groups.map(g => ({
      ...g,
      studentIds: (g.studentIds || []).filter(id => id !== studentId)
    }));
    const updatedCombinedGroups = (combinedStudentGroups || []).map(cg => ({
      ...cg,
      studentIds: (cg.studentIds || []).filter(id => id !== studentId)
    }));
    const updatedAttendance = attendanceRecords.filter(a => a.studentId !== studentId);
    const updatedExams = examRecords.filter(e => e.studentId !== studentId);
    const updatedPayments = paymentTransactions.filter(p => p.studentId !== studentId);
    const updatedReports = reports.filter(r => r.studentId !== studentId);

    // 1. Immediately update React memory states
    setStudents(updatedStudents);
    setPrivateLessons(updatedPrivateLessons);
    setGroups(updatedGroups);
    setCombinedStudentGroups(updatedCombinedGroups);
    setAttendanceRecords(updatedAttendance);
    setExamRecords(updatedExams);
    setPaymentTransactions(updatedPayments);
    setReports(updatedReports);

    // 2. Immediately update local storage and vaults
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.deleteStudent(studentId, uid);
    StorageEngine.savePrivateLessons(updatedPrivateLessons, uid);
    StorageEngine.saveGroups(updatedGroups, uid);
    StorageEngine.saveCombinedStudentGroups(updatedCombinedGroups, uid);
    StorageEngine.saveAttendanceRecords(updatedAttendance, uid);
    StorageEngine.saveExams(updatedExams, uid);
    StorageEngine.savePayments(updatedPayments, uid);
    StorageEngine.saveReports(updatedReports, uid);

    // 3. Immediately and permanently wipe from Firestore cloud
    if (uid) {
      deleteStudentPermanentlyFromFirestore(uid, studentId).catch(err => {
        console.warn("[GoStars Cloud] Permanent student deletion note:", err);
      });
    }
  };

  // Combined Student Group Handlers
  const handleAddCombinedGroup = (
    name: string,
    studentIds: string[],
    notes?: string,
    sharedParentContact?: string,
    sharedGroupLink?: string
  ) => {
    const safeStudentIds = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
    if (safeStudentIds.length === 0) return;

    const newGroup: CombinedStudentGroup = {
      id: `cgrp_${Date.now()}`,
      name: name.trim() || `ملف مجمع (${safeStudentIds.length} طلاب)`,
      studentIds: safeStudentIds,
      notes: notes?.trim() || undefined,
      sharedParentContact: sharedParentContact?.trim() || undefined,
      sharedGroupLink: sharedGroupLink?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setCombinedStudentGroups(prev => {
      const existing = (prev || []).map(cg => ({
        ...cg,
        studentIds: (cg.studentIds || []).filter(id => !safeStudentIds.includes(id))
      }));
      return [newGroup, ...existing];
    });

    // Update students with combinedGroupId
    setStudents(prev =>
      (prev || []).map(s => (safeStudentIds.includes(s.id) ? { ...s, combinedGroupId: newGroup.id } : s))
    );
  };

  const handleUpdateCombinedGroup = (id: string, partial: Partial<CombinedStudentGroup>) => {
    setCombinedStudentGroups(prev =>
      (prev || []).map(cg => (cg.id === id ? { ...cg, ...partial } : cg))
    );
  };

  const handleDeleteCombinedGroup = (id: string) => {
    const targetGroup = (combinedStudentGroups || []).find(cg => cg.id === id);
    setCombinedStudentGroups(prev => (prev || []).filter(cg => cg.id !== id));
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.deleteCombinedStudentGroup(id, uid);

    // Release students back to standalone
    if (targetGroup && Array.isArray(targetGroup.studentIds)) {
      setStudents(prev =>
        (prev || []).map(s =>
          targetGroup.studentIds.includes(s.id) ? { ...s, combinedGroupId: undefined } : s
        )
      );
    }
  };

  const handleAddStudentToCombinedGroup = (groupId: string, studentId: string) => {
    setCombinedStudentGroups(prev =>
      (prev || []).map(cg =>
        cg.id === groupId
          ? {
              ...cg,
              studentIds: Array.from(new Set([...(cg.studentIds || []), studentId]))
            }
          : cg
      )
    );

    setStudents(prev =>
      (prev || []).map(s => (s.id === studentId ? { ...s, combinedGroupId: groupId } : s))
    );
  };

  const handleRemoveStudentFromCombinedGroup = (groupId: string, studentId: string) => {
    setCombinedStudentGroups(prev =>
      (prev || [])
        .map(cg => {
          if (cg.id === groupId) {
            return {
              ...cg,
              studentIds: (cg.studentIds || []).filter(id => id !== studentId)
            };
          }
          return cg;
        })
        .filter(cg => (cg.studentIds || []).length > 0)
    );

    setStudents(prev =>
      (prev || []).map(s => (s.id === studentId ? { ...s, combinedGroupId: undefined } : s))
    );
  };

  const handleUpdateStudentStatus = (studentId: string, status: StudentStatus) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleRecordPayment = (
    studentId: string,
    amount: number,
    notes?: string,
    date?: string,
    subjectAllocations?: SubjectPaymentAllocation[],
    targetSubject?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student || amount <= 0) return;

    const paymentDate = date || new Date().toISOString().split("T")[0];

    // Determine subject tag for the transaction
    let assignedSubject = targetSubject;
    if (!assignedSubject && subjectAllocations && subjectAllocations.length > 0) {
      if (subjectAllocations.length === 1) {
        assignedSubject = subjectAllocations[0].subjectName;
      } else {
        assignedSubject = subjectAllocations.map(a => `${a.subjectName}: ${a.amount} ج.م`).join(" • ");
      }
    }

    const newTransaction: PaymentTransaction = {
      id: `pay_${Date.now()}`,
      studentId,
      studentName: student.fullName,
      amount,
      date: paymentDate,
      notes,
      subject: assignedSubject || student.subject,
      subjectAllocations: subjectAllocations && subjectAllocations.length > 0 ? subjectAllocations : undefined
    };

    setPaymentTransactions(prev => [newTransaction, ...prev]);

    // Update Student Balance & Payment Status & per-subject paid amounts
    setStudents(prev =>
      prev.map(s => {
        if (s.id === studentId) {
          const newTotalPaid = (s.totalPaidAmount || 0) + amount;

          let updatedSubjects = s.subjects;
          if (s.subjects && s.subjects.length > 0) {
            if (subjectAllocations && subjectAllocations.length > 0) {
              updatedSubjects = s.subjects.map(sub => {
                const alloc = subjectAllocations.find(
                  a => (a.subjectId && a.subjectId === sub.id) || a.subjectName === sub.subject
                );
                if (alloc) {
                  return {
                    ...sub,
                    totalPaidAmount: (sub.totalPaidAmount || 0) + alloc.amount
                  };
                }
                return sub;
              });
            } else if (targetSubject) {
              updatedSubjects = s.subjects.map(sub => {
                if (sub.subject === targetSubject || sub.id === targetSubject) {
                  return {
                    ...sub,
                    totalPaidAmount: (sub.totalPaidAmount || 0) + amount
                  };
                }
                return sub;
              });
            } else if (s.subjects.length === 1) {
              updatedSubjects = s.subjects.map(sub => ({
                ...sub,
                totalPaidAmount: (sub.totalPaidAmount || 0) + amount
              }));
            }
          }

          return {
            ...s,
            subjects: updatedSubjects,
            totalPaidAmount: newTotalPaid
          };
        }
        return s;
      })
    );

    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.savePayment(newTransaction, uid);
    if (currentUser) {
      triggerDebouncedSync(currentUser.uid, 500);
    }
  };

  const handleAddExamRecord = (
    studentId: string,
    examName: string,
    score: number,
    totalScore: number,
    date: string
  ) => {
    const student = students.find(s => s.id === studentId);
    const newExam: ExamRecord = {
      id: `ex_${Date.now()}`,
      studentId,
      studentName: student ? student.fullName : "طالب",
      examName,
      score,
      totalScore,
      date
    };
    setExamRecords(prev => [newExam, ...prev]);

    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveExams([newExam, ...examRecords], uid);
    if (currentUser) {
      enqueueCloudSync({
        userId: currentUser.uid,
        entityType: "exam",
        entityId: newExam.id,
        operation: "create",
        payload: newExam
      }).catch(() => {});
      triggerDebouncedSync(currentUser.uid, 500);
    }
  };

  // Main Attendance & Notes Engine
  const handleSaveAttendanceAndNotes = (
    lessonId: string,
    attendanceList: { studentId: string; attendance: AttendanceStatus; homeworkStatus: HomeworkStatus }[],
    teacherNotes: string,
    aiInstructions: string,
    generatedReportText?: string
  ) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newRecords: AttendanceRecord[] = [];

    // Find lesson metadata if linked to a group or private lesson
    const targetGroup = groups.find(g => g.id === lessonId);
    const targetPrivate = privateLessons.find(p => p.id === lessonId);
    const lessonSubject = targetGroup?.subject || targetPrivate?.subject || "";
    const lessonDuration = targetGroup?.durationMinutes || targetPrivate?.durationMinutes || 60;

    attendanceList.forEach(item => {
      const isDeducted = item.attendance === "present" || item.attendance === "late";
      newRecords.push({
        id: `att_${Date.now()}_${item.studentId}`,
        lessonId,
        studentId: item.studentId,
        date: todayStr,
        attendance: item.attendance,
        homeworkStatus: item.homeworkStatus,
        teacherNotes,
        aiInstructions,
        generatedReportText,
        deducted: isDeducted,
        subject: lessonSubject,
        durationMinutes: lessonDuration
      });
    });

    const updatedAttendance = [...newRecords, ...attendanceRecords];

    let updatedReports = reports;
    // Add generated report to reports history if present
    if (generatedReportText) {
      const firstStudentId = attendanceList[0]?.studentId;
      const stObj = students.find(s => s.id === firstStudentId);

      const newReport: GeneratedReport = {
        id: `rep_${Date.now()}`,
        studentId: firstStudentId || "group",
        studentName: stObj ? stObj.fullName : "المجموعة",
        subject: lessonSubject || (stObj ? stObj.subject : "المادة"),
        date: todayStr,
        reportText: generatedReportText,
        generatedText: generatedReportText,
        teacherNotes,
        aiInstructions,
        createdAt: new Date().toISOString()
      };
      updatedReports = [newReport, ...reports];
      setReports(updatedReports);
    }

    // Clone students list and accurately recalculate financial balance & attendance counts
    let updatedStudents = [...students];

    attendanceList.forEach(item => {
      const studentIndex = updatedStudents.findIndex(s => s.id === item.studentId);
      const isDeducted = item.attendance === "present" || item.attendance === "late";

      if (studentIndex !== -1 && isDeducted) {
        const student = updatedStudents[studentIndex];

        let updatedSubjects = student.subjects;
        if (updatedSubjects && updatedSubjects.length > 0) {
          updatedSubjects = updatedSubjects.map(sub => {
            const subNameNorm = (sub.subject || "").trim().toLowerCase();
            const lessonSubjNorm = lessonSubject.trim().toLowerCase();
            if (!lessonSubjNorm || subNameNorm === lessonSubjNorm || updatedSubjects!.length === 1) {
              return {
                ...sub,
                totalAttendedLessons: (sub.totalAttendedLessons || 0) + 1
              };
            }
            return sub;
          });
        }

        const candidateStudent: Student = {
          ...student,
          subjects: updatedSubjects,
          totalAttendedLessons: (student.totalAttendedLessons || 0) + 1
        };

        const profile = calculateStudentFinancialProfile(
          candidateStudent,
          updatedAttendance,
          paymentTransactions,
          groups,
          privateLessons,
          updatedReports
        );

        updatedStudents[studentIndex] = {
          ...candidateStudent,
          paymentStatus: profile.amountDue === 0 ? "paid" : "unpaid"
        };
      }
    });

    setAttendanceRecords(updatedAttendance);
    setStudents(updatedStudents);

    // Direct synchronous local + cloud persistence
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveAttendanceRecords(updatedAttendance, uid);
    StorageEngine.saveStudents(updatedStudents, uid);
    if (generatedReportText) {
      StorageEngine.saveReports(updatedReports, uid);
    }

    if (currentUser) {
      newRecords.forEach(attRec => {
        enqueueCloudSync({
          userId: currentUser.uid,
          entityType: "attendance",
          entityId: attRec.id,
          operation: "create",
          payload: attRec
        }).catch(() => {});
      });
      attendanceList.forEach(item => {
        const st = updatedStudents.find(s => s.id === item.studentId);
        if (st) {
          enqueueCloudSync({
            userId: currentUser.uid,
            entityType: "student",
            entityId: st.id,
            operation: "update",
            payload: st
          }).catch(() => {});
        }
      });
      if (generatedReportText && updatedReports.length > 0) {
        enqueueCloudSync({
          userId: currentUser.uid,
          entityType: "report",
          entityId: updatedReports[0].id,
          operation: "create",
          payload: updatedReports[0]
        }).catch(() => {});
      }
      triggerDebouncedSync(currentUser.uid, 300);
    }
  };

  const handleAddReport = (reportData: Omit<GeneratedReport, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    const isMonthly = isMonthlyComprehensiveReport(reportData);
    const reportType = isMonthly ? "monthly_comprehensive" : (reportData.reportType || "daily_personal");
    const existingRep = reports.find(r => areReportsDuplicate(r, reportData));
    const newReportId = reportData.id || existingRep?.id || (isMonthly ? `monthly_comprehensive_${reportData.studentId}_${Date.now()}` : `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const newReport: GeneratedReport = {
      ...(existingRep || {}),
      ...reportData,
      reportType,
      id: newReportId,
      archived: false,
      manuallyUnarchived: true,
      createdAt: reportData.createdAt || existingRep?.createdAt || new Date().toISOString()
    };
    const updatedReports = deduplicateReportsList([
      newReport,
      ...reports.filter(r => r.id !== newReport.id && !areReportsDuplicate(r, newReport))
    ]);
    setReports(updatedReports);

    // Synchronize Attendance Record and Student Balance
    const isDeduct = reportData.deductCost ?? (reportData.attendance === "present" || reportData.attendance === "late");
    const attStatus: AttendanceStatus = reportData.attendance || "present";
    const hwStatus: HomeworkStatus = reportData.homeworkStatus || "done";

    // Determine effective lesson duration
    const studentObj = students.find(s => s.id === reportData.studentId);
    const effDuration = reportData.durationMinutes || studentObj?.defaultDurationMinutes || studentObj?.subjects?.find(s => s.subject === reportData.subject)?.defaultDurationMinutes || 60;

    // Save linked attendance entry
    const newAttendance: AttendanceRecord = {
      id: `att_${Date.now()}_${reportData.studentId}`,
      lessonId: reportData.lessonId || `les_${Date.now()}`,
      studentId: reportData.studentId,
      studentName: reportData.studentName,
      subject: reportData.subject,
      lessonNumber: reportData.lessonNumber,
      date: reportData.date,
      attendance: attStatus,
      homeworkStatus: hwStatus,
      durationMinutes: effDuration,
      lessonDuration: reportData.lessonDuration || `${effDuration} دقيقة`,
      includeDuration: reportData.includeDuration,
      teacherNotes: reportData.teacherNotes,
      aiInstructions: reportData.aiInstructions,
      generatedReportText: reportData.reportText || reportData.generatedText,
      deducted: isDeduct
    };

    let updatedStudents = [...students];
    if (isDeduct && reportData.studentId && reportData.reportType !== "monthly_comprehensive") {
      const updatedAttendanceRecords = [newAttendance, ...attendanceRecords];
      updatedStudents = students.map(s => {
        if (s.id === reportData.studentId) {
          let updatedSubjects = s.subjects;

          if (s.subjects && s.subjects.length > 0 && reportData.subject) {
            const normSubj = reportData.subject.trim().toLowerCase();
            updatedSubjects = s.subjects.map(sp => {
              if (sp.subject.trim().toLowerCase() === normSubj) {
                return {
                  ...sp,
                  totalAttendedLessons: (sp.totalAttendedLessons ?? 0) + 1
                };
              }
              return sp;
            });
          }

          const newAttended = (s.totalAttendedLessons || 0) + 1;
          const updatedStudent: Student = {
            ...s,
            subjects: updatedSubjects,
            totalAttendedLessons: newAttended
          };

          const profile = calculateStudentFinancialProfile(
            updatedStudent,
            updatedAttendanceRecords,
            paymentTransactions,
            groups,
            privateLessons
          );

          return {
            ...updatedStudent,
            paymentStatus: profile.amountDue === 0 ? "paid" : "unpaid"
          };
        }
        return s;
      });
      setStudents(updatedStudents);
    }

    const updatedAttendance = reportData.reportType === "monthly_comprehensive"
      ? attendanceRecords
      : [
          newAttendance,
          ...attendanceRecords.filter(a => !(a.studentId === newAttendance.studentId && a.date === newAttendance.date && a.subject === newAttendance.subject))
        ];

    if (reportData.reportType !== "monthly_comprehensive") {
      setAttendanceRecords(updatedAttendance);
    }

    // Direct synchronous local + cloud persistence
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveReports(updatedReports, uid);
    StorageEngine.saveAttendanceRecords(updatedAttendance, uid);
    StorageEngine.saveStudents(updatedStudents, uid);

    if (currentUser) {
      enqueueCloudSync({
        userId: currentUser.uid,
        entityType: "report",
        entityId: newReport.id,
        operation: "create",
        payload: newReport
      }).catch(() => {});

      if (reportData.reportType !== "monthly_comprehensive") {
        enqueueCloudSync({
          userId: currentUser.uid,
          entityType: "attendance",
          entityId: newAttendance.id,
          operation: "create",
          payload: newAttendance
        }).catch(() => {});
      }

      if (reportData.studentId) {
        const affectedStudent = updatedStudents.find(s => s.id === reportData.studentId);
        if (affectedStudent) {
          enqueueCloudSync({
            userId: currentUser.uid,
            entityType: "student",
            entityId: affectedStudent.id,
            operation: "update",
            payload: affectedStudent
          }).catch(() => {});
        }
      }

      triggerDebouncedSync(currentUser.uid, 300);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    const targetReport = reports.find(r => r.id === reportId);
    const updatedReports = reports.filter(r => r.id !== reportId);
    setReports(updatedReports);

    // Identify student and subject
    const studentId = targetReport?.studentId;
    const studentNameNorm = targetReport?.studentName ? targetReport.studentName.trim().toLowerCase() : "";
    const reportDate = targetReport?.date;
    const reportSubject = targetReport?.subject ? targetReport.subject.trim().toLowerCase() : "";
    const isMonthlyComprehensive = targetReport?.reportType === "monthly_comprehensive";
    const wasDeductedOrAttended = targetReport
      ? (!isMonthlyComprehensive && (targetReport.deductCost !== false || targetReport.attendance === "present" || targetReport.attendance === "late"))
      : true;

    // Remove or clear associated attendance record so the lesson duration & cost are deducted from calculations
    const removedAttendanceIds: string[] = [];
    const updatedAttendance = attendanceRecords.filter(a => {
      if (a.id === reportId) {
        removedAttendanceIds.push(a.id);
        return false;
      }
      if (targetReport && a.studentId === targetReport.studentId && a.date === targetReport.date) {
        if (!targetReport.subject || !a.subject || a.subject.trim().toLowerCase() === reportSubject) {
          removedAttendanceIds.push(a.id);
          return false;
        }
      }
      return true;
    });
    setAttendanceRecords(updatedAttendance);

    // Update students list: decrement totalAttendedLessons and recalculate financial balance & hours
    let updatedStudents = [...students];
    let updatedStudentRecord: Student | undefined;
    if (wasDeductedOrAttended && (studentId || studentNameNorm)) {
      updatedStudents = students.map(s => {
        const matchesStudent = (studentId && s.id === studentId) || (studentNameNorm && s.fullName.trim().toLowerCase() === studentNameNorm);
        if (matchesStudent) {
          let updatedSubjects = s.subjects;

          if (s.subjects && s.subjects.length > 0) {
            updatedSubjects = s.subjects.map((sp, idx) => {
              const spSubjNorm = sp.subject ? sp.subject.trim().toLowerCase() : "";
              if ((!reportSubject && idx === 0) || spSubjNorm === reportSubject || s.subjects?.length === 1) {
                return {
                  ...sp,
                  totalAttendedLessons: Math.max(0, (sp.totalAttendedLessons ?? 0) - 1)
                };
              }
              return sp;
            });
          }

          const newAttended = Math.max(0, (s.totalAttendedLessons || 0) - 1);
          const updatedStudent: Student = {
            ...s,
            subjects: updatedSubjects,
            totalAttendedLessons: newAttended,
            updatedAt: new Date().toISOString()
          };

          const profile = calculateStudentFinancialProfile(
            updatedStudent,
            updatedAttendance,
            paymentTransactions,
            groups,
            privateLessons
          );

          const finalStudent: Student = {
            ...updatedStudent,
            paymentStatus: profile.amountDue === 0 ? "paid" : "unpaid",
            updatedAt: new Date().toISOString()
          };
          updatedStudentRecord = finalStudent;
          return finalStudent;
        }
        return s;
      });
      setStudents(updatedStudents);
    }

    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.deleteReport(reportId, uid);
    removedAttendanceIds.forEach(attId => {
      StorageEngine.deleteAttendanceRecord(attId, uid);
    });
    StorageEngine.saveAttendanceRecords(updatedAttendance, uid);
    StorageEngine.saveStudents(updatedStudents, uid);
    if (uid && updatedStudentRecord) {
      enqueueCloudSync({
        userId: uid,
        entityType: "student",
        entityId: updatedStudentRecord.id,
        operation: "update",
        payload: updatedStudentRecord
      }).catch(() => {});
      triggerDebouncedSync(uid, 300);
    }
  };

  const handleToggleArchiveReport = (reportId: string) => {
    const targetReport = reports.find(r => r.id === reportId);
    const targetAtt = attendanceRecords.find(ar => ar.id === reportId);

    const currentlyArchived = targetReport
      ? Boolean(targetReport.archived)
      : targetAtt
      ? Boolean((targetAtt as any).archived)
      : false;
    const newArchived = !currentlyArchived;
    const nowIso = new Date().toISOString();

    const updatedReports = reports.map(r => {
      const matchesDirect = r.id === reportId;
      const matchesViaAtt = Boolean(
        !targetReport &&
        targetAtt &&
        r.studentId === targetAtt.studentId &&
        r.date === targetAtt.date &&
        normalizeArabicText(r.subject || "") === normalizeArabicText(targetAtt.subject || "")
      );
      if (matchesDirect || matchesViaAtt) {
        return {
          ...r,
          archived: newArchived,
          archivedAt: newArchived ? nowIso : undefined,
          archiveGroup: newArchived ? r.archiveGroup : undefined,
          manuallyUnarchived: !newArchived
        } as GeneratedReport;
      }
      return r;
    });

    // Also synchronize archived status to matching attendance record(s) so accounting and attendance-backed reports stay in sync
    const updatedAttendance = attendanceRecords.map(ar => {
      const matchesId = ar.id === reportId || (targetReport && ar.id === targetReport.id);
      const matchesLessonId = Boolean(targetReport?.lessonId && ar.lessonId === targetReport.lessonId);
      const matchesDateSubj = Boolean(
        targetReport &&
        ar.studentId === targetReport.studentId &&
        ar.date === targetReport.date &&
        normalizeArabicText(ar.subject || "") === normalizeArabicText(targetReport.subject || "")
      );
      if (matchesId || matchesLessonId || matchesDateSubj) {
        return {
          ...ar,
          archived: newArchived,
          archivedAt: newArchived ? nowIso : undefined,
          archiveGroup: newArchived ? (ar as any).archiveGroup : undefined,
          manuallyUnarchived: !newArchived
        };
      }
      return ar;
    });

    setReports(updatedReports);
    setAttendanceRecords(updatedAttendance);
    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveReports(updatedReports, uid);
    StorageEngine.saveAttendanceRecords(updatedAttendance, uid);

    if (currentUser) {
      const toggled = updatedReports.find(r => r.id === reportId);
      if (toggled) {
        enqueueCloudSync({
          userId: currentUser.uid,
          entityType: "report",
          entityId: toggled.id,
          operation: "update",
          payload: toggled
        }).catch(() => {});
      }
      const toggledAtt = updatedAttendance.find(ar => ar.id === reportId);
      if (toggledAtt) {
        enqueueCloudSync({
          userId: currentUser.uid,
          entityType: "attendance",
          entityId: toggledAtt.id,
          operation: "update",
          payload: toggledAtt
        }).catch(() => {});
      }
      triggerDebouncedSync(currentUser.uid, 300);
    }
  };

  const handleArchiveEndedCycle = (params: {
    studentId: string;
    archiveGroupName: string;
    newCycleStartDate: string;
    newCycleName: string;
    resetLessonBalance: boolean;
  }) => {
    const targetStudent = students.find(s => s.id === params.studentId);
    if (!targetStudent) return;

    const result = archiveEndedCycleAndStartNew({
      student: targetStudent,
      allReports: reports,
      allAttendance: attendanceRecords,
      archiveGroupName: params.archiveGroupName,
      newCycleStartDate: params.newCycleStartDate,
      newCycleName: params.newCycleName,
      resetLessonBalance: params.resetLessonBalance
    });

    const updatedStudents = students.map(s => s.id === targetStudent.id ? result.updatedStudent : s);
    setReports(result.updatedReports);
    setAttendanceRecords(result.updatedAttendance);
    setStudents(updatedStudents);

    const uid = currentUser ? currentUser.uid : undefined;
    StorageEngine.saveReports(result.updatedReports, uid);
    StorageEngine.saveAttendanceRecords(result.updatedAttendance, uid);
    StorageEngine.saveStudents(updatedStudents, uid);

    if (currentUser) {
      enqueueCloudSync({
        userId: currentUser.uid,
        entityType: "student",
        entityId: targetStudent.id,
        operation: "update",
        payload: result.updatedStudent
      }).catch(() => {});

      result.updatedReports
        .filter(r => r.studentId === targetStudent.id)
        .forEach(r => {
          enqueueCloudSync({
            userId: currentUser.uid,
            entityType: "report",
            entityId: r.id,
            operation: "update",
            payload: r
          }).catch(() => {});
        });

      result.updatedAttendance
        .filter(ar => ar.studentId === targetStudent.id && ar.archived)
        .forEach(ar => {
          enqueueCloudSync({
            userId: currentUser.uid,
            entityType: "attendance",
            entityId: ar.id,
            operation: "update",
            payload: ar
          }).catch(() => {});
        });

      triggerDebouncedSync(currentUser.uid, 300);
    }
  };

  // Call Server Gemini API
  const handleGenerateReportAi = async (payload: {
    studentName: string;
    subject: string;
    date?: string;
    teacherName?: string;
    lessonNumber?: number;
    lessonDuration?: string;
    includeStudentName?: boolean;
    includeTeacherName?: boolean;
    includeLessonNumber?: boolean;
    includeDuration?: boolean;
    includeLessonDate?: boolean;
    preferredLanguage?: "ar" | "en";
    durationMinutes?: number;
    attendanceStatus?: string;
    homeworkStatus?: string;
    teacherNotes?: string;
    classEvents?: string;
    homeworkNotes?: string;
    overallEvaluation?: string;
    aiInstructions?: string;
    generalAiInstructions?: string;
    subjectAiInstructions?: string;
    attachment?: ReportAttachment;
  }): Promise<string> => {
    console.log("[GoStars Client] Sending POST /api/ai/generate-report for student:", payload.studentName, "Subject:", payload.subject);
    const res = await fetch("/api/ai/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("[GoStars Client] Response HTTP status:", res.status, res.statusText);

    let data: any = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("[GoStars Client] Failed to parse JSON response:", parseErr);
      throw new Error(`استجابة غير صالحة من الخادم (رمز الحالة: ${res.status})`);
    }

    console.log("[GoStars Client] Response body:", {
      success: data?.success,
      hasReportText: !!data?.reportText,
      error: data?.error,
      details: data?.details
    });

    if (!res.ok || !data || !data.success || !data.reportText) {
      const errorMsg = data?.details || data?.error || `فشل إنشاء التقرير (رمز الحالة: ${res.status})`;
      console.error("[GoStars Client] AI Report generation failed:", errorMsg);
      throw new Error(errorMsg);
    }

    return data.reportText;
  };

  // Backup & Restore
  const handleExportBackup = (): GoStarsBackupData => {
    return StorageEngine.exportBackupJSON(currentUser?.uid);
  };

  const handleRestoreBackup = (data: GoStarsBackupData): boolean => {
    const uid = currentUser?.uid;
    const success = StorageEngine.restoreBackupJSON(data, uid);
    if (success) {
      setSettings(StorageEngine.getSettings(uid));
      setStudents(StorageEngine.getStudents(uid));
      setCombinedStudentGroups(StorageEngine.getCombinedStudentGroups(uid));
      setGroups(StorageEngine.getGroups(uid));
      setPrivateLessons(StorageEngine.getPrivateLessons(uid));
      setLessons(StorageEngine.getLessons(uid));
      setAttendanceRecords(StorageEngine.getAttendanceRecords(uid));
      setExamRecords(StorageEngine.getExams(uid));
      setPaymentTransactions(StorageEngine.getPayments(uid));
      setReports(StorageEngine.getReports(uid));
    }
    return success;
  };

  const handleToggleLanguage = () => {
    setSettings(prev => ({
      ...prev,
      preferredLanguage: prev.preferredLanguage === "ar" ? "en" : "ar"
    }));
  };

  if (authLoading) {
    return (
      <div
        dir={settings.preferredLanguage === "ar" ? "rtl" : "ltr"}
        className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans"
      >
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">
          {settings.preferredLanguage === "ar" ? "جاري الاتصال بـ Firebase..." : "Verifying Firebase session..."}
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView isArabic={settings.preferredLanguage === "ar"} />;
  }

  return (
    <div
      dir={settings.preferredLanguage === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white antialiased"
    >
      {/* Top Header */}
      <Header
        settings={settings}
        students={students}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenBackupModal={() => setShowSettingsModal(true)}
        onSearchChange={setSearchQuery}
        activeSearchQuery={searchQuery}
        currentUser={currentUser}
        onLogout={logoutFirebase}
        onToggleLanguage={handleToggleLanguage}
        dismissedNotificationIds={dismissedNotificationIds}
        onDismissNotification={handleDismissNotification}
        onDismissAllNotifications={handleDismissAllNotifications}
        onRestoreNotifications={handleRestoreNotifications}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        syncMessage={syncMessage}
        cloudSyncStatus={cloudSyncStatus}
        cloudSyncError={cloudSyncError}
        onOpenRulesModal={() => setShowRulesModal(true)}
        onOpenAIChat={() => setShowAIChatModal(true)}
      />

      {/* Main Content View Container - Full Width Space Optimization */}
      <main className="flex-1 w-full max-w-[1850px] mx-auto px-3 sm:px-4 lg:px-6 2xl:px-8 pt-3 pb-24 lg:pb-6">
        {activeTab === "home" && (
          <DashboardView
            settings={settings}
            students={students}
            groups={groups}
            privateLessons={privateLessons}
            lessons={lessons}
            attendanceRecords={attendanceRecords}
            reports={reports}
            paymentTransactions={paymentTransactions}
            onOpenLessonDetails={() => setActiveTab("groups")}
            onNavigateToTab={setActiveTab}
            dismissedNotificationIds={dismissedNotificationIds}
            onDismissNotification={handleDismissNotification}
            onDismissAllNotifications={handleDismissAllNotifications}
            onRestoreNotifications={handleRestoreNotifications}
          />
        )}

        {activeTab === "groups" && (
          <GroupsView
            settings={settings}
            groups={groups}
            privateLessons={privateLessons}
            students={students}
            lessons={lessons}
            attendanceRecords={attendanceRecords}
            examRecords={examRecords}
            paymentTransactions={paymentTransactions}
            reports={reports}
            onAddGroup={handleAddGroup}
            onAddPrivateLesson={handleAddPrivateLesson}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onUpdatePrivateLesson={handleUpdatePrivateLesson}
            onDeletePrivateLesson={handleDeletePrivateLesson}
            onAddStudent={handleAddStudent}
            onBatchAddStudents={handleBatchAddStudents}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudentStatus={handleUpdateStudentStatus}
            onRecordPayment={handleRecordPayment}
            onAddExamRecord={handleAddExamRecord}
            onSaveAttendanceAndNotes={handleSaveAttendanceAndNotes}
            onGenerateReportAi={handleGenerateReportAi}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
            onToggleArchiveReport={handleToggleArchiveReport}
            onArchiveEndedCycle={handleArchiveEndedCycle}
          />
        )}

        {activeTab === "students" && (
          <StudentsView
            settings={settings}
            students={students}
            combinedStudentGroups={combinedStudentGroups}
            privateLessons={privateLessons}
            attendanceRecords={attendanceRecords}
            examRecords={examRecords}
            paymentTransactions={paymentTransactions}
            reports={reports}
            onAddStudent={handleAddStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudentStatus={handleUpdateStudentStatus}
            onRecordPayment={handleRecordPayment}
            onAddExamRecord={handleAddExamRecord}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
            onToggleArchiveReport={handleToggleArchiveReport}
            onGenerateReportAi={handleGenerateReportAi}
            onAddPrivateLesson={handleAddPrivateLesson}
            onUpdatePrivateLesson={handleUpdatePrivateLesson}
            onDeletePrivateLesson={handleDeletePrivateLesson}
            onAddCombinedGroup={handleAddCombinedGroup}
            onUpdateCombinedGroup={handleUpdateCombinedGroup}
            onDeleteCombinedGroup={handleDeleteCombinedGroup}
            onAddStudentToCombinedGroup={handleAddStudentToCombinedGroup}
            onRemoveStudentFromCombinedGroup={handleRemoveStudentFromCombinedGroup}
            onArchiveEndedCycle={handleArchiveEndedCycle}
            onRecoverReports={handleRecoverMissingReports}
          />
        )}

        {activeTab === "monthly_report" && (
          <MonthlyComprehensiveReportView
            students={students}
            reports={reports}
            attendanceRecords={attendanceRecords}
            settings={settings}
            isArabic={settings.preferredLanguage === "ar"}
            onAddReport={handleAddReport}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === "schedule" && (
          <ScheduleView
            settings={settings}
            groups={groups}
            privateLessons={privateLessons}
            lessons={lessons}
            students={students}
            reports={reports}
            attendanceRecords={attendanceRecords}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
            onToggleArchiveReport={handleToggleArchiveReport}
            onArchiveEndedCycle={handleArchiveEndedCycle}
            onGenerateReportAi={handleGenerateReportAi}
            onOpenLesson={() => setActiveTab("groups")}
          />
        )}

        {activeTab === "finance" && (
          <FinanceView
            settings={settings}
            students={students}
            combinedStudentGroups={combinedStudentGroups}
            groups={groups}
            privateLessons={privateLessons}
            attendanceRecords={attendanceRecords}
            paymentTransactions={paymentTransactions}
            reports={reports}
            onRecordPayment={handleRecordPayment}
          />
        )}
      </main>

      {/* Mobile & Tablet Bottom Navigation (Only visible on mobile/tablet <1024px) */}
      <div className="lg:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isArabic={settings.preferredLanguage === "ar"}
        />
      </div>

      {/* Settings & Backup Modal */}
      <SettingsAndBackupModal
        settings={settings}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaveSettings={handleSaveSettings}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        currentUser={currentUser}
      />

      {/* Firebase Security Rules Activation Modal */}
      <FirebaseRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onRetrySync={handleForceSync}
        isSyncing={isSyncing}
        isArabic={settings.preferredLanguage === "ar"}
        projectId="gostars-assistant"
      />

      {/* AI Chatbot Assistant (Gemini Multi-Turn Chat) */}
      <AIChatModal
        isOpen={showAIChatModal}
        onClose={() => setShowAIChatModal(false)}
        isArabic={settings.preferredLanguage === "ar"}
        defaultCustomInstruction={settings.generalAiInstructions}
      />
    </div>
  );
}

export default App;
