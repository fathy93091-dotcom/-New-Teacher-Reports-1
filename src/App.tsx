import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { MobileBottomNav, NavTab } from "./components/MobileBottomNav";
import { DashboardView } from "./components/DashboardView";
import { GroupsView } from "./components/GroupsView";
import { StudentsView } from "./components/StudentsView";
import { ScheduleView } from "./components/ScheduleView";
import { FinanceView } from "./components/FinanceView";
import { SettingsAndBackupModal } from "./components/SettingsAndBackupModal";

import {
  Student,
  Group,
  PrivateLesson,
  Lesson,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings,
  AttendanceStatus,
  HomeworkStatus,
  StudentStatus,
  GoStarsBackupData,
  ReportAttachment
} from "./types";
import { StorageEngine } from "./lib/storage";
import {
  auth,
  onAuthStateChanged,
  logoutFirebase,
  subscribeToUserData,
  saveUserDataToFirestore,
  User as FirebaseUser
} from "./lib/firebase";
import { LoginView } from "./components/LoginView";

export function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State initialized from LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => StorageEngine.getSettings());
  const [students, setStudents] = useState<Student[]>(() => StorageEngine.getStudents());
  const [groups, setGroups] = useState<Group[]>(() => StorageEngine.getGroups());
  const [privateLessons, setPrivateLessons] = useState<PrivateLesson[]>(() => StorageEngine.getPrivateLessons());
  const [lessons, setLessons] = useState<Lesson[]>(() => StorageEngine.getLessons());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageEngine.getAttendanceRecords());
  const [examRecords, setExamRecords] = useState<ExamRecord[]>(() => StorageEngine.getExams());
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => StorageEngine.getPayments());
  const [reports, setReports] = useState<GeneratedReport[]>(() => StorageEngine.getReports());

  // One-time automatic purge of demo mock data if present
  useEffect(() => {
    const cleanedSettings = StorageEngine.cleanSettings(settings, currentUser?.displayName || "");
    if (JSON.stringify(cleanedSettings) !== JSON.stringify(settings)) {
      setSettings(cleanedSettings);
      StorageEngine.saveSettings(cleanedSettings);
    }

    if (students.some(s => s.id.startsWith("std_10") || s.id.startsWith("demo_"))) {
      StorageEngine.purgeAllData();
      setStudents(prev => prev.filter(s => !s.id.startsWith("std_10") && !s.id.startsWith("demo_")));
      setGroups(prev => prev.filter(g => !g.id.startsWith("grp_10") && !g.id.startsWith("demo_")));
      setPrivateLessons(prev => prev.filter(p => !p.id.startsWith("prv_10") && !p.id.startsWith("demo_")));
      setLessons(prev => prev.filter(l => !l.id.startsWith("les_10") && !l.id.startsWith("demo_")));
      setAttendanceRecords(prev => prev.filter(a => !a.id.startsWith("att_10") && !a.id.startsWith("demo_")));
      setExamRecords(prev => prev.filter(e => !e.id.startsWith("ex_10") && !e.id.startsWith("demo_")));
      setPaymentTransactions(prev => prev.filter(p => !p.id.startsWith("pay_10") && !p.id.startsWith("demo_")));
      setReports(prev => prev.filter(r => !r.id.startsWith("rep_10") && !r.id.startsWith("demo_")));
    }
  }, [students, currentUser]);

  // Flag to prevent triggering Firestore write loop during incoming remote state update
  const isSyncingFromRemoteRef = useRef(false);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for Firestore real-time updates when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    // Sanitize local settings first
    const cleanedLocalSettings = StorageEngine.cleanSettings(settings, currentUser.displayName || "");
    if (JSON.stringify(cleanedLocalSettings) !== JSON.stringify(settings)) {
      setSettings(cleanedLocalSettings);
      StorageEngine.saveSettings(cleanedLocalSettings);
    }

    const unsubscribe = subscribeToUserData(currentUser.uid, remoteData => {
      if (remoteData) {
        isSyncingFromRemoteRef.current = true;
        if (remoteData.settings) {
          const cleanedRemote = StorageEngine.cleanSettings(remoteData.settings, currentUser.displayName || "");
          setSettings(cleanedRemote);
          StorageEngine.saveSettings(cleanedRemote);
        }
        if (Array.isArray(remoteData.students)) {
          const valid = remoteData.students.filter(s => !s.id.startsWith("std_10") && !s.id.startsWith("demo_"));
          setStudents(valid);
          StorageEngine.saveStudents(valid);
        }
        if (Array.isArray(remoteData.groups)) {
          const valid = remoteData.groups.filter(g => !g.id.startsWith("grp_10") && !g.id.startsWith("demo_"));
          setGroups(valid);
          StorageEngine.saveGroups(valid);
        }
        if (Array.isArray(remoteData.privateLessons)) {
          const valid = remoteData.privateLessons.filter(p => !p.id.startsWith("prv_10") && !p.id.startsWith("demo_"));
          setPrivateLessons(valid);
          StorageEngine.savePrivateLessons(valid);
        }
        if (Array.isArray(remoteData.lessons)) {
          const valid = remoteData.lessons.filter(l => !l.id.startsWith("les_10") && !l.id.startsWith("demo_"));
          setLessons(valid);
          StorageEngine.saveLessons(valid);
        }
        if (Array.isArray(remoteData.attendanceRecords)) {
          const valid = remoteData.attendanceRecords.filter(a => !a.id.startsWith("att_10") && !a.id.startsWith("demo_"));
          setAttendanceRecords(valid);
          StorageEngine.saveAttendanceRecords(valid);
        }
        if (Array.isArray(remoteData.examRecords)) {
          const valid = remoteData.examRecords.filter(e => !e.id.startsWith("ex_10") && !e.id.startsWith("demo_"));
          setExamRecords(valid);
          StorageEngine.saveExams(valid);
        }
        if (Array.isArray(remoteData.paymentTransactions)) {
          const valid = remoteData.paymentTransactions.filter(p => !p.id.startsWith("pay_10") && !p.id.startsWith("demo_"));
          setPaymentTransactions(valid);
          StorageEngine.savePayments(valid);
        }
        if (Array.isArray(remoteData.reports)) {
          const valid = remoteData.reports.filter(r => !r.id.startsWith("rep_10") && !r.id.startsWith("demo_"));
          setReports(valid);
          StorageEngine.saveReports(valid);
        }
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 500);
      } else {
        // First login: upload current clean initial data to Firestore
        const cleanInitial = StorageEngine.cleanSettings(settings, currentUser.displayName || "");
        setSettings(cleanInitial);
        saveUserDataToFirestore(currentUser.uid, {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          settings: cleanInitial,
          students,
          groups,
          privateLessons,
          lessons,
          attendanceRecords,
          examRecords,
          paymentTransactions,
          reports
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // UI State
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sync to LocalStorage & Firestore on state changes
  useEffect(() => {
    StorageEngine.saveSettings(settings);
    if (currentUser && !isSyncingFromRemoteRef.current) {
      saveUserDataToFirestore(currentUser.uid, {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        settings,
        students,
        groups,
        privateLessons,
        lessons,
        attendanceRecords,
        examRecords,
        paymentTransactions,
        reports
      });
    }
  }, [settings, students, groups, privateLessons, lessons, attendanceRecords, examRecords, paymentTransactions, reports, currentUser]);

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

  const handleUpdateGroup = (id: string, partial: Partial<Group>) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, ...partial } : g))
    );
  };

  const handleAddStudent = (newData: Omit<Student, "id" | "createdAt">) => {
    const newStudent: Student = {
      ...newData,
      id: `stu_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setStudents(prev => [newStudent, ...prev]);
  };

  const handleEditStudent = (studentId: string, updatedData: Partial<Student>) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, ...updatedData } : s))
    );
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleUpdateStudentStatus = (studentId: string, status: StudentStatus) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleRecordPayment = (
    studentId: string,
    amount: number,
    lessonsCount: number,
    notes?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const isLessonsCount = student.subscriptionType === "lessons_count";
    const effectiveLessons = isLessonsCount ? Math.max(1, lessonsCount || 1) : 0;
    const lessonCost = student.lessonCost || (effectiveLessons > 0 ? amount / effectiveLessons : 100);

    const newTransaction: PaymentTransaction = {
      id: `pay_${Date.now()}`,
      studentId,
      studentName: student.fullName,
      amount,
      lessonsCovered: effectiveLessons,
      lessonCost,
      date: new Date().toISOString().split("T")[0],
      notes
    };

    setPaymentTransactions(prev => [newTransaction, ...prev]);

    // Update Student Balance & Payment Status
    const updatedRemainingLessons = isLessonsCount ? (student.remainingLessons + effectiveLessons) : 0;
    const updatedRemainingBalance = isLessonsCount ? (updatedRemainingLessons * lessonCost) : 0;

    setStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              paymentStatus: "paid",
              totalPaidAmount: (s.totalPaidAmount || 0) + amount,
              totalPurchasedLessons: isLessonsCount ? ((s.totalPurchasedLessons || 0) + effectiveLessons) : (s.totalPurchasedLessons || 0),
              lessonCost: s.lessonCost || lessonCost,
              remainingLessons: updatedRemainingLessons,
              remainingBalance: updatedRemainingBalance
            }
          : s
      )
    );
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
  };

  // Main Attendance & Auto-Deduction Engine
  const handleSaveAttendanceAndNotes = (
    lessonId: string,
    attendanceList: { studentId: string; attendance: AttendanceStatus; homeworkStatus: HomeworkStatus }[],
    teacherNotes: string,
    aiInstructions: string,
    generatedReportText?: string
  ) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newRecords: AttendanceRecord[] = [];

    // Clone students list for batch update
    let updatedStudents = [...students];

    attendanceList.forEach(item => {
      const studentIndex = updatedStudents.findIndex(s => s.id === item.studentId);
      let isDeducted = false;

      if (studentIndex !== -1) {
        const student = updatedStudents[studentIndex];

        // Deduct 1 lesson if Present
        if (item.attendance === "present") {
          if (student.subscriptionType === "lessons_count" && student.remainingLessons > 0) {
            const newRemaining = student.remainingLessons - 1;
            const newBalance = newRemaining * student.lessonCost;

            updatedStudents[studentIndex] = {
              ...student,
              remainingLessons: newRemaining,
              remainingBalance: newBalance,
              paymentStatus: newRemaining <= 0 ? "unpaid" : "paid"
            };
            isDeducted = true;
          } else if (student.subscriptionType === "monthly") {
            isDeducted = true;
          }
        }
      }

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
        deducted: isDeducted
      });
    });

    setAttendanceRecords(prev => [...newRecords, ...prev]);
    setStudents(updatedStudents);

    // Add generated report to reports history if present
    if (generatedReportText) {
      const firstStudentId = attendanceList[0]?.studentId;
      const stObj = students.find(s => s.id === firstStudentId);

      setReports(prev => [
        {
          id: `rep_${Date.now()}`,
          studentId: firstStudentId || "group",
          studentName: stObj ? stObj.fullName : "المجموعة",
          subject: stObj ? stObj.subject : "المادة",
          date: todayStr,
          reportText: generatedReportText,
          generatedText: generatedReportText,
          teacherNotes,
          aiInstructions,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };

  const handleAddReport = (reportData: Omit<GeneratedReport, "id" | "createdAt">) => {
    const newReport: GeneratedReport = {
      ...reportData,
      id: `rep_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
  };

  const handleDeleteReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  // Call Server Gemini API
  const handleGenerateReportAi = async (payload: {
    studentName: string;
    subject: string;
    teacherNotes: string;
    aiInstructions: string;
    attachment?: ReportAttachment;
  }): Promise<string> => {
    try {
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.reportText) {
        return data.reportText;
      }
    } catch (e) {
      console.error("API error:", e);
    }
    return `تقرير متابعة الطالب ${payload.studentName} في مادة (${payload.subject}):\n${payload.teacherNotes}`;
  };

  // Backup & Restore
  const handleExportBackup = (): GoStarsBackupData => {
    return StorageEngine.exportBackupJSON();
  };

  const handleRestoreBackup = (data: GoStarsBackupData): boolean => {
    const success = StorageEngine.restoreBackupJSON(data);
    if (success) {
      setSettings(StorageEngine.getSettings());
      setStudents(StorageEngine.getStudents());
      setGroups(StorageEngine.getGroups());
      setPrivateLessons(StorageEngine.getPrivateLessons());
      setLessons(StorageEngine.getLessons());
      setAttendanceRecords(StorageEngine.getAttendanceRecords());
      setExamRecords(StorageEngine.getExams());
      setPaymentTransactions(StorageEngine.getPayments());
      setReports(StorageEngine.getReports());
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
      className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white"
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
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-5 lg:px-6 pt-2 sm:pt-3.5 pb-16 sm:pb-12">
        {activeTab === "home" && (
          <DashboardView
            settings={settings}
            students={students}
            lessons={lessons}
            attendanceRecords={attendanceRecords}
            onOpenLessonDetails={() => setActiveTab("groups")}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === "groups" && (
          <GroupsView
            settings={settings}
            groups={groups}
            privateLessons={privateLessons}
            students={students}
            lessons={lessons}
            onAddGroup={handleAddGroup}
            onAddPrivateLesson={handleAddPrivateLesson}
            onUpdateGroup={handleUpdateGroup}
            onSaveAttendanceAndNotes={handleSaveAttendanceAndNotes}
            onGenerateReportAi={handleGenerateReportAi}
          />
        )}

        {activeTab === "students" && (
          <StudentsView
            settings={settings}
            students={students}
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
            onGenerateReportAi={handleGenerateReportAi}
          />
        )}

        {activeTab === "schedule" && (
          <ScheduleView
            settings={settings}
            groups={groups}
            privateLessons={privateLessons}
            lessons={lessons}
            onOpenLesson={() => setActiveTab("groups")}
          />
        )}

        {activeTab === "finance" && (
          <FinanceView
            settings={settings}
            students={students}
            attendanceRecords={attendanceRecords}
            paymentTransactions={paymentTransactions}
            onRecordPayment={handleRecordPayment}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden">
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
        onSaveSettings={setSettings}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
      />
    </div>
  );
}

export default App;
