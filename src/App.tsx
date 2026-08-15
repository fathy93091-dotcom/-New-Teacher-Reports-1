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

  // App State initialized from LocalStorage (per user)
  const [settings, setSettings] = useState<AppSettings>(() => StorageEngine.getSettings());
  const [students, setStudents] = useState<Student[]>(() => StorageEngine.getStudents());
  const [groups, setGroups] = useState<Group[]>(() => StorageEngine.getGroups());
  const [privateLessons, setPrivateLessons] = useState<PrivateLesson[]>(() => StorageEngine.getPrivateLessons());
  const [lessons, setLessons] = useState<Lesson[]>(() => StorageEngine.getLessons());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageEngine.getAttendanceRecords());
  const [examRecords, setExamRecords] = useState<ExamRecord[]>(() => StorageEngine.getExams());
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => StorageEngine.getPayments());
  const [reports, setReports] = useState<GeneratedReport[]>(() => StorageEngine.getReports());

  // Flag to prevent triggering Firestore write loop during incoming remote state update
  const isSyncingFromRemoteRef = useRef(false);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Load this specific user's scoped local data immediately
        const userSettings = StorageEngine.getSettings(user.uid);
        const userStudents = StorageEngine.getStudents(user.uid);
        const userGroups = StorageEngine.getGroups(user.uid);
        const userPrivateLessons = StorageEngine.getPrivateLessons(user.uid);
        const userLessons = StorageEngine.getLessons(user.uid);
        const userAttendance = StorageEngine.getAttendanceRecords(user.uid);
        const userExams = StorageEngine.getExams(user.uid);
        const userPayments = StorageEngine.getPayments(user.uid);
        const userReports = StorageEngine.getReports(user.uid);

        setSettings(userSettings);
        setStudents(userStudents);
        setGroups(userGroups);
        setPrivateLessons(userPrivateLessons);
        setLessons(userLessons);
        setAttendanceRecords(userAttendance);
        setExamRecords(userExams);
        setPaymentTransactions(userPayments);
        setReports(userReports);
      } else {
        // Clear in-memory state on logout so no information is shared between user sessions
        setSettings(StorageEngine.cleanSettings(StorageEngine.getSettings()));
        setStudents([]);
        setGroups([]);
        setPrivateLessons([]);
        setLessons([]);
        setAttendanceRecords([]);
        setExamRecords([]);
        setPaymentTransactions([]);
        setReports([]);
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

    const unsubscribe = subscribeToUserData(uid, remoteData => {
      if (remoteData) {
        isSyncingFromRemoteRef.current = true;
        if (remoteData.settings) {
          const cleanedRemote = StorageEngine.cleanSettings(remoteData.settings, currentUser.displayName || "");
          setSettings(cleanedRemote);
          StorageEngine.saveSettings(cleanedRemote, uid);
        }
        if (Array.isArray(remoteData.students)) {
          const valid = remoteData.students.filter(s => !s.id.startsWith("std_10") && !s.id.startsWith("demo_"));
          setStudents(valid);
          StorageEngine.saveStudents(valid, uid);
        }
        if (Array.isArray(remoteData.groups)) {
          const valid = remoteData.groups.filter(g => !g.id.startsWith("grp_10") && !g.id.startsWith("demo_"));
          setGroups(valid);
          StorageEngine.saveGroups(valid, uid);
        }
        if (Array.isArray(remoteData.privateLessons)) {
          const valid = remoteData.privateLessons.filter(p => !p.id.startsWith("prv_10") && !p.id.startsWith("demo_"));
          setPrivateLessons(valid);
          StorageEngine.savePrivateLessons(valid, uid);
        }
        if (Array.isArray(remoteData.lessons)) {
          const valid = remoteData.lessons.filter(l => !l.id.startsWith("les_10") && !l.id.startsWith("demo_"));
          setLessons(valid);
          StorageEngine.saveLessons(valid, uid);
        }
        if (Array.isArray(remoteData.attendanceRecords)) {
          const valid = remoteData.attendanceRecords.filter(a => !a.id.startsWith("att_10") && !a.id.startsWith("demo_"));
          setAttendanceRecords(valid);
          StorageEngine.saveAttendanceRecords(valid, uid);
        }
        if (Array.isArray(remoteData.examRecords)) {
          const valid = remoteData.examRecords.filter(e => !e.id.startsWith("ex_10") && !e.id.startsWith("demo_"));
          setExamRecords(valid);
          StorageEngine.saveExams(valid, uid);
        }
        if (Array.isArray(remoteData.paymentTransactions)) {
          const valid = remoteData.paymentTransactions.filter(p => !p.id.startsWith("pay_10") && !p.id.startsWith("demo_"));
          setPaymentTransactions(valid);
          StorageEngine.savePayments(valid, uid);
        }
        if (Array.isArray(remoteData.reports)) {
          const valid = remoteData.reports.filter(r => !r.id.startsWith("rep_10") && !r.id.startsWith("demo_"));
          setReports(valid);
          StorageEngine.saveReports(valid, uid);
        }
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 500);
      } else {
        // First login for this email: initialize isolated clean user workspace in Firestore
        const cleanInitial = StorageEngine.cleanSettings(settings, currentUser.displayName || "");
        setSettings(cleanInitial);
        StorageEngine.saveUserWorkspace(uid, {
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
        saveUserDataToFirestore(uid, {
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

  // Sync to LocalStorage & Firestore on state changes for the active logged-in user
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    StorageEngine.saveSettings(settings, uid);
    StorageEngine.saveStudents(students, uid);
    StorageEngine.saveGroups(groups, uid);
    StorageEngine.savePrivateLessons(privateLessons, uid);
    StorageEngine.saveLessons(lessons, uid);
    StorageEngine.saveAttendanceRecords(attendanceRecords, uid);
    StorageEngine.saveExams(examRecords, uid);
    StorageEngine.savePayments(paymentTransactions, uid);
    StorageEngine.saveReports(reports, uid);

    if (!isSyncingFromRemoteRef.current) {
      saveUserDataToFirestore(uid, {
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

  const handleUpdatePrivateLesson = (id: string, partial: Partial<PrivateLesson>) => {
    setPrivateLessons(prev =>
      prev.map(p => (p.id === id ? { ...p, ...partial } : p))
    );
  };

  const handleDeletePrivateLesson = (id: string) => {
    setPrivateLessons(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateGroup = (id: string, partial: Partial<Group>) => {
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, ...partial } : g))
    );
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleAddStudent = (newData: Omit<Student, "id" | "createdAt">) => {
    const studentId = `stu_${Date.now()}`;
    const newStudent: Student = {
      ...newData,
      id: studentId,
      createdAt: new Date().toISOString()
    };
    setStudents(prev => [newStudent, ...prev]);
  };

  const handleEditStudent = (studentId: string, updatedData: Partial<Student>) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, ...updatedData } : s))
    );

    // Sync updated student info to existing private lessons if needed
    if (updatedData.fullName || updatedData.whatsappGroupLink !== undefined) {
      setPrivateLessons(prev =>
        prev.map(p => {
          if (p.studentId === studentId) {
            return {
              ...p,
              studentName: updatedData.fullName || p.studentName,
              whatsappGroupLink: updatedData.whatsappGroupLink !== undefined ? updatedData.whatsappGroupLink : p.whatsappGroupLink
            };
          }
          return p;
        })
      );
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setPrivateLessons(prev => prev.filter(p => p.studentId !== studentId));
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

    // Synchronize Attendance Record and Student Balance
    const isDeduct = reportData.deductCost ?? (reportData.attendance === "present");
    const attStatus: AttendanceStatus = reportData.attendance || "present";
    const hwStatus: HomeworkStatus = reportData.homeworkStatus || "done";

    if (isDeduct && reportData.studentId) {
      setStudents(prev =>
        prev.map(s => {
          if (s.id === reportData.studentId) {
            let updatedSubjects = s.subjects;
            let targetCost = s.lessonCost;

            if (s.subjects && s.subjects.length > 0 && reportData.subject) {
              const normSubj = reportData.subject.trim().toLowerCase();
              updatedSubjects = s.subjects.map(sp => {
                if (sp.subject.trim().toLowerCase() === normSubj) {
                  targetCost = sp.lessonCost || targetCost;
                  if (sp.subscriptionType === "lessons_count" && (sp.remainingLessons ?? 0) > 0) {
                    const newRem = (sp.remainingLessons ?? 0) - 1;
                    return {
                      ...sp,
                      remainingLessons: newRem,
                      totalAttendedLessons: (sp.totalAttendedLessons ?? 0) + 1
                    };
                  } else {
                    return {
                      ...sp,
                      totalAttendedLessons: (sp.totalAttendedLessons ?? 0) + 1
                    };
                  }
                }
                return sp;
              });
            }

            let newRemainingLessons = s.remainingLessons;
            let newBalance = s.remainingBalance;
            let newPaymentStatus = s.paymentStatus;

            if (s.subscriptionType === "lessons_count" && s.remainingLessons > 0) {
              newRemainingLessons = s.remainingLessons - 1;
              newBalance = newRemainingLessons * (s.lessonCost || targetCost || 100);
              newPaymentStatus = newRemainingLessons <= 0 ? "unpaid" : "paid";
            }

            return {
              ...s,
              subjects: updatedSubjects,
              remainingLessons: newRemainingLessons,
              remainingBalance: newBalance,
              paymentStatus: newPaymentStatus,
              totalAttendedLessons: (s.totalAttendedLessons || 0) + 1
            };
          }
          return s;
        })
      );
    }

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
      teacherNotes: reportData.teacherNotes,
      aiInstructions: reportData.aiInstructions,
      generatedReportText: reportData.reportText || reportData.generatedText,
      deducted: isDeduct
    };

    setAttendanceRecords(prev => [newAttendance, ...prev]);
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
    return StorageEngine.exportBackupJSON(currentUser?.uid);
  };

  const handleRestoreBackup = (data: GoStarsBackupData): boolean => {
    const uid = currentUser?.uid;
    const success = StorageEngine.restoreBackupJSON(data, uid);
    if (success) {
      setSettings(StorageEngine.getSettings(uid));
      setStudents(StorageEngine.getStudents(uid));
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-5 lg:px-6 pt-2 sm:pt-3.5 pb-24 lg:pb-12">
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
            onDeleteGroup={handleDeleteGroup}
            onUpdatePrivateLesson={handleUpdatePrivateLesson}
            onDeletePrivateLesson={handleDeletePrivateLesson}
            onSaveAttendanceAndNotes={handleSaveAttendanceAndNotes}
            onGenerateReportAi={handleGenerateReportAi}
          />
        )}

        {activeTab === "students" && (
          <StudentsView
            settings={settings}
            students={students}
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
            onGenerateReportAi={handleGenerateReportAi}
            onAddPrivateLesson={handleAddPrivateLesson}
            onUpdatePrivateLesson={handleUpdatePrivateLesson}
            onDeletePrivateLesson={handleDeletePrivateLesson}
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
        onSaveSettings={setSettings}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
      />
    </div>
  );
}

export default App;
