import React, { useState, useMemo } from "react";
import {
  Sparkles,
  BookOpen,
  Users,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Play,
  UserCheck,
  ChevronRight,
  Trash2,
  RotateCcw,
  Bell,
  Send,
  Copy,
  Check
} from "lucide-react";
import { Student, Lesson, AppSettings, AttendanceRecord, Group, PrivateLesson, PaymentTransaction, GeneratedReport } from "../types";
import { sanitizeTeacherName } from "../lib/storage";
import { calculateStudentFinancials } from "../lib/financeUtils";
import { StudentLessonReminderModal, ReminderTargetInfo } from "./StudentLessonReminderModal";
import { calculateLessonTimeInfo, buildWhatsAppUrl, formatTimeRange, formatTime12h, normalizeDayName, getTodayNormalizedDay, parseTimeString } from "../lib/timeUtils";

interface DashboardViewProps {
  settings: AppSettings;
  students: Student[];
  groups?: Group[];
  privateLessons?: PrivateLesson[];
  lessons: Lesson[];
  attendanceRecords?: AttendanceRecord[];
  reports?: GeneratedReport[];
  paymentTransactions?: PaymentTransaction[];
  onOpenLessonDetails: (lesson: Lesson) => void;
  onNavigateToTab: (tab: "groups" | "students" | "schedule" | "finance") => void;
  dismissedNotificationIds?: string[];
  onDismissNotification?: (id: string) => void;
  onDismissAllNotifications?: (ids: string[]) => void;
  onRestoreNotifications?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  students = [],
  groups = [],
  privateLessons = [],
  lessons = [],
  attendanceRecords = [],
  reports = [],
  paymentTransactions = [],
  onOpenLessonDetails,
  onNavigateToTab,
  dismissedNotificationIds = [],
  onDismissNotification,
  onDismissAllNotifications,
  onRestoreNotifications
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [activeReminderTarget, setActiveReminderTarget] = useState<ReminderTargetInfo | null>(null);
  const [quickCopiedStudentId, setQuickCopiedStudentId] = useState<string | null>(null);

  const handleQuickCopyReminder = (student: Student, sessionTime: string, subject?: string) => {
    const info = calculateLessonTimeInfo(sessionTime, student.fullName, subject);
    navigator.clipboard.writeText(info.reminderText);
    setQuickCopiedStudentId(student.id);
    setTimeout(() => setQuickCopiedStudentId(null), 2000);
  };

  const handleQuickSendWhatsApp = (
    student: Student,
    sessionTime: string,
    subject?: string,
    groupLink?: string
  ) => {
    const info = calculateLessonTimeInfo(sessionTime, student.fullName, subject);
    const targetContact = groupLink || student.whatsappGroupLink || student.parentContact;
    const { url } = buildWhatsAppUrl(targetContact, info.reminderText);
    navigator.clipboard.writeText(info.reminderText);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper to get attendance status for today
  const getTodayAttendanceStatus = (studentId?: string, studentName?: string, subject?: string) => {
    if (!studentId && !studentName) return null;
    const rep = reports.find(r =>
      (r.studentId === studentId || (studentName && r.studentName && r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (r.date === todayStr || r.createdAt?.startsWith(todayStr)) &&
      (!subject || !r.subject || r.subject.trim().toLowerCase() === subject.trim().toLowerCase())
    );
    if (rep) return rep.attendance === "absent" ? "absent" : "present";

    const att = attendanceRecords.find(a =>
      (a.studentId === studentId || (studentName && a.studentName && a.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (a.date === todayStr) &&
      (!subject || !a.subject || a.subject.trim().toLowerCase() === subject.trim().toLowerCase())
    );
    if (att) return att.attendance === "absent" ? "absent" : "present";

    // Fallback without subject restriction
    const repFb = reports.find(r =>
      (r.studentId === studentId || (studentName && r.studentName && r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (r.date === todayStr || r.createdAt?.startsWith(todayStr))
    );
    if (repFb) return repFb.attendance === "absent" ? "absent" : "present";

    const attFb = attendanceRecords.find(a =>
      (a.studentId === studentId || (studentName && a.studentName && a.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (a.date === todayStr)
    );
    if (attFb) return attFb.attendance === "absent" ? "absent" : "present";

    return null;
  };

  const todayNormalizedDayAr = getTodayNormalizedDay(true);
  const todayNormalizedDayEn = getTodayNormalizedDay(false);

  const activeStudents = students.filter(s => s.status === "active");
  const activeGroups = groups.filter(g => g.status === "active");

  // Calculations: Today's lessons from explicit instances OR recurring schedules active on today's day
  const todayLessons = useMemo(() => {
    // 1. Explicit recorded/scheduled lessons for today
    const explicitToday = lessons.filter(l => l.date === todayStr);

    // 2. Scheduled active groups for today
    const scheduledGroupLessons: Lesson[] = [];
    activeGroups.forEach(g => {
      const matchDay = (g.scheduleSlots && g.scheduleSlots.length > 0)
        ? g.scheduleSlots.find(s => normalizeDayName(s.day, true) === todayNormalizedDayAr || normalizeDayName(s.day, false) === todayNormalizedDayEn)
        : (g.days && g.days.some(d => normalizeDayName(d, true) === todayNormalizedDayAr || normalizeDayName(d, false) === todayNormalizedDayEn)
            ? { day: todayNormalizedDayAr, time: g.time, durationMinutes: g.durationMinutes }
            : null);

      if (matchDay) {
        const alreadyExists = explicitToday.some(el => el.groupId === g.id);
        if (!alreadyExists) {
          scheduledGroupLessons.push({
            id: `sched_grp_${g.id}_${todayStr}`,
            studyType: "group",
            groupId: g.id,
            groupName: g.name,
            subject: g.subject,
            date: todayStr,
            time: matchDay.time || g.time || "16:00",
            durationMinutes: matchDay.durationMinutes || g.durationMinutes || 60,
            status: "upcoming",
            createdAt: g.createdAt || new Date().toISOString()
          });
        }
      }
    });

    // 3. Scheduled active private lessons for today
    const scheduledPrivateLessons: Lesson[] = [];
    privateLessons.filter(p => p.status === "active").forEach(p => {
      const matchDay = (p.scheduleSlots && p.scheduleSlots.length > 0)
        ? p.scheduleSlots.find(s => normalizeDayName(s.day, true) === todayNormalizedDayAr || normalizeDayName(s.day, false) === todayNormalizedDayEn)
        : (p.days && p.days.some(d => normalizeDayName(d, true) === todayNormalizedDayAr || normalizeDayName(d, false) === todayNormalizedDayEn)
            ? { day: todayNormalizedDayAr, time: p.time, durationMinutes: p.durationMinutes }
            : null);

      if (matchDay) {
        const alreadyExists = explicitToday.some(el => el.studentId === p.studentId || el.id === p.id);
        if (!alreadyExists) {
          scheduledPrivateLessons.push({
            id: `sched_prv_${p.id}_${todayStr}`,
            studyType: "private",
            studentId: p.studentId,
            studentName: p.studentName,
            subject: p.subject,
            date: todayStr,
            time: matchDay.time || p.time || "16:00",
            durationMinutes: matchDay.durationMinutes || p.durationMinutes || 60,
            status: "upcoming",
            createdAt: p.createdAt || new Date().toISOString()
          });
        }
      }
    });

    const combined = [...explicitToday, ...scheduledGroupLessons, ...scheduledPrivateLessons];
    return combined.sort((a, b) => {
      const tA = parseTimeString(a.time);
      const tB = parseTimeString(b.time);
      return (tA.hour24 * 60 + tA.minute) - (tB.hour24 * 60 + tB.minute);
    });
  }, [lessons, activeGroups, privateLessons, todayStr, todayNormalizedDayAr, todayNormalizedDayEn]);
  
  // Calculate real-time financials for each active student
  const studentFinancialSummaries = activeStudents.map(student => ({
    student,
    summary: calculateStudentFinancials(student, attendanceRecords, paymentTransactions)
  }));

  const allUnpaidStudents = studentFinancialSummaries.filter(
    item => item.summary.amountDue > 0
  );

  // Filter out dismissed alerts
  const unpaidStudents = allUnpaidStudents.filter(
    item => !dismissedNotificationIds.includes(`unpaid_${item.student.id}`)
  );

  const totalGeneratedAlerts = allUnpaidStudents.length;
  const paymentAlertsCount = unpaidStudents.length;
  const dismissedCount = totalGeneratedAlerts - paymentAlertsCount;

  const handleDismissAll = () => {
    if (onDismissAllNotifications) {
      const idsToDismiss = [
        ...unpaidStudents.map(u => `unpaid_${u.student.id}`)
      ];
      onDismissAllNotifications(idsToDismiss);
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Welcome Banner - Compact Space-Saving Design */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 rounded-2xl p-3 sm:p-4 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center font-black shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                  {(() => {
                    const clean = sanitizeTeacherName(settings.teacherName);
                    if (!clean) return isArabic ? "أهلاً بك 👋" : "Welcome 👋";
                    return isArabic ? `أهلاً بك، ${clean}` : `Welcome, ${clean}`;
                  })()}
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
                  {isArabic ? "المتابعة اليومية" : "Daily Overview"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isArabic
                  ? "لوحة تحكم ذكية ترصد الحصص، الحضور، وتنبيهات السداد في الوقت الفعلي."
                  : "Smart dashboard monitoring classes, attendance, and real-time payment alerts."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <button
              onClick={() => onNavigateToTab("schedule")}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <span>{isArabic ? "عرض الجدول الأسبوعي" : "Weekly Schedule"}</span>
              <ChevronRight className="w-3.5 h-3.5 dir-rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards Grid - 5 High-Density Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {/* Today's Lessons */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "حصص اليوم" : "Today's Lessons"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{todayLessons.length}</div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
            {isArabic ? "حصص مقررة" : "Scheduled"}
          </p>
        </div>

        {/* Groups */}
        <div
          onClick={() => onNavigateToTab("groups")}
          className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-blue-300"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "المجموعات" : "Groups"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-700">{groups.length}</div>
          <p className="text-[9px] sm:text-[10px] text-indigo-600 font-semibold truncate">
            {activeGroups.length} {isArabic ? "نشطة" : "active"}
          </p>
        </div>

        {/* Private Lessons */}
        <div
          onClick={() => onNavigateToTab("groups")}
          className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-purple-300"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "الدروس الخاصة" : "Private"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <User className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700">{privateLessons.length}</div>
          <p className="text-[9px] sm:text-[10px] text-purple-600 font-semibold truncate">
            {isArabic ? "دروس فردية" : "Private slots"}
          </p>
        </div>

        {/* Active Students */}
        <div
          onClick={() => onNavigateToTab("students")}
          className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-teal-300"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "الطلاب المقيدون" : "Students"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{students.length}</div>
          <p className="text-[9px] sm:text-[10px] text-teal-600 font-semibold truncate">
            {activeStudents.length} {isArabic ? "نشط" : "active"}
          </p>
        </div>

        {/* Payment Alerts */}
        <div
          onClick={() => onNavigateToTab("finance")}
          className="bg-white border border-amber-200 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition cursor-pointer group hover:border-amber-400"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate">
              {isArabic ? "تنبيهات الدفع" : "Payment Alerts"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition shrink-0">
              <AlertTriangle className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600">{paymentAlertsCount}</div>
          <p className="text-[9px] sm:text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 truncate">
            <span className="truncate">{isArabic ? "مستحق أو منخفض" : "Overdue"}</span>
            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Missions vs Important Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Today's Lessons List (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isArabic ? "حصص اليوم ومواعيد الدراسة" : "Today's Missions"}
              </h2>
            </div>
            <button
              onClick={() => onNavigateToTab("groups")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              {isArabic ? "إدارة المجموعات والخاصة" : "Manage Classes"}
            </button>
          </div>

          <div className="space-y-2">
            {todayLessons.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p className="text-xs font-medium">
                  {isArabic ? "لا توجد حصص مسجلة لليوم." : "No lessons scheduled for today."}
                </p>
              </div>
            ) : (
              todayLessons.map(lesson => {
                const isGroup = lesson.studyType === "group";
                const sessTimeInfo = calculateLessonTimeInfo(
                  lesson.time,
                  isGroup ? (lesson.groupName || "") : (lesson.studentName || ""),
                  lesson.subject
                );

                // Find student for private lesson or first student for group
                let matchedStudent: Student | null = null;
                if (!isGroup) {
                  matchedStudent = students.find(
                    st => st.id === lesson.studentId || st.fullName === lesson.studentName
                  ) || ({
                    id: lesson.studentId || "priv-st",
                    fullName: lesson.studentName || "الطالب",
                    parentContact: "",
                    subject: lesson.subject,
                    studyType: "private",
                    status: "active",
                    paymentStatus: "unpaid",
                    lessonCost: 0,
                    totalPaidAmount: 0,
                    createdAt: new Date().toISOString()
                  } as Student);
                } else if (lesson.groupId) {
                  const grp = groups.find(g => g.id === lesson.groupId);
                  if (grp && grp.studentIds && grp.studentIds.length > 0) {
                    matchedStudent = students.find(st => grp.studentIds?.includes(st.id)) || null;
                  }
                }

                return (
                  <div
                    key={lesson.id}
                    className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 transition flex flex-col gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isGroup ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {isGroup ? "👥" : "👤"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {isGroup ? lesson.groupName : lesson.studentName}
                            </h3>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                isGroup ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-purple-50 text-purple-600 border border-purple-200"
                              }`}
                            >
                              {isGroup ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")}
                            </span>
                            {(() => {
                              const attStatus = getTodayAttendanceStatus(
                                !isGroup ? (lesson.studentId || matchedStudent?.id) : undefined,
                                !isGroup ? lesson.studentName : undefined,
                                lesson.subject
                              );
                              if (attStatus === "absent") {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                                    <span>🔴</span>
                                    <span>{isArabic ? "غائب" : "Absent"}</span>
                                  </span>
                                );
                              } else if (attStatus === "present") {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                    <span>🟢</span>
                                    <span>{isArabic ? "حاضر" : "Present"}</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                            {lesson.subject} • {formatTimeRange(lesson.time, lesson.durationMinutes, isArabic)}
                          </p>
                        </div>
                      </div>

                      {/* Status / Countdown badge */}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border shrink-0 ${
                          sessTimeInfo.status === "now"
                            ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                            : sessTimeInfo.status === "past"
                            ? "bg-slate-100 text-slate-700 border-slate-300"
                            : "bg-emerald-50 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {sessTimeInfo.status === "now"
                          ? (isArabic ? "الآن" : "Now")
                          : sessTimeInfo.status === "past"
                          ? (isArabic ? `بدأت منذ ${Math.abs(sessTimeInfo.remainingMinutes)} د` : `${Math.abs(sessTimeInfo.remainingMinutes)}m ago`)
                          : (isArabic ? `بعد ${sessTimeInfo.remainingMinutes} دقيقة` : `In ${sessTimeInfo.remainingMinutes}m`)}
                      </span>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      {/* Reminder Button */}
                      {matchedStudent ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReminderTarget({
                                student: matchedStudent!,
                                sessionTime: lesson.time,
                                subject: lesson.subject,
                                groupName: lesson.groupName,
                                type: isGroup ? "group" : "private"
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <Bell className="w-3 h-3 text-amber-600" />
                            <span>{isArabic ? "إرسال تذكير بالحصة" : "Send Reminder"}</span>
                          </button>

                          <button
                            type="button"
                            title={isArabic ? "نسخ نص التذكير" : "Copy Reminder"}
                            onClick={() => handleQuickCopyReminder(matchedStudent!, lesson.time, lesson.subject)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            {quickCopiedStudentId === matchedStudent.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isArabic ? "تذكير الحصة" : "Lesson reminder"}
                        </span>
                      )}

                      <button
                        onClick={() => onOpenLessonDetails(lesson)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isArabic ? "تسجيل الحضور" : "Attendance"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Important Alerts Card (1 col) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {isArabic ? "التنبيهات المهمة" : "Important Alerts"}
                </h2>
                {paymentAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                    {paymentAlertsCount}
                  </span>
                )}
              </div>

              {paymentAlertsCount > 0 && onDismissAllNotifications && (
                <button
                  type="button"
                  onClick={handleDismissAll}
                  title={isArabic ? "حذف جميع التنبيهات" : "Clear all alerts"}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[10.5px] font-bold transition flex items-center gap-1 border border-slate-200/60"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>{isArabic ? "مسح الكل" : "Clear"}</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {paymentAlertsCount === 0 ? (
                <div className="text-center py-6 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 opacity-70" />
                  <p className="text-xs font-semibold text-slate-700">
                    {dismissedCount > 0
                      ? (isArabic ? "تم حذف وتصفية جميع التنبيهات!" : "All alerts cleared!")
                      : (isArabic ? "جميع الطلاب سددوا مستحقاتهم ورصيدهم متوفر!" : "No payment issues found!")}
                  </p>
                  {dismissedCount > 0 && onRestoreNotifications && (
                    <button
                      type="button"
                      onClick={onRestoreNotifications}
                      className="mt-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isArabic ? `استعادة التنبيهات المحذوفة (${dismissedCount})` : `Restore alerts (${dismissedCount})`}</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {unpaidStudents.map(({ student, summary }) => (
                    <div
                      key={student.id}
                      onClick={() => onNavigateToTab("finance")}
                      className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 hover:bg-rose-100/60 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-rose-900 text-xs truncate">{student.fullName}</p>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-200/80 text-rose-800">
                            {isArabic ? "مستحق سداد" : "Unpaid"}
                          </span>
                        </div>
                        <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                          {student.billingType === "monthly" || student.subjects?.some(s => s.billingType === "monthly")
                            ? (isArabic
                                ? `مستحق سداد: ${summary.amountDue} ج.م (اشتراك شهري كامل)`
                                : `Due: ${summary.amountDue} EGP (Monthly Subscription)`)
                            : (isArabic
                                ? `مستحق سداد: ${summary.amountDue} ج.م (${summary.totalAttendedLessons} حصص منفذة)`
                                : `Due: ${summary.amountDue} EGP (${summary.totalAttendedLessons} attended)`)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {onDismissNotification && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onDismissNotification(`unpaid_${student.id}`);
                            }}
                            title={isArabic ? "حذف هذا التنبيه" : "Dismiss alert"}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-200 flex items-center justify-center transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                    </div>
                  ))}

                  {dismissedCount > 0 && onRestoreNotifications && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={onRestoreNotifications}
                        className="text-[10.5px] font-bold text-slate-500 hover:text-blue-600 transition flex items-center justify-center gap-1 mx-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isArabic ? `استعادة ${dismissedCount} تنبيه محذوف` : `Restore ${dismissedCount} dismissed`}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab("finance")}
            className="w-full mt-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5"
          >
            <span>{isArabic ? "الانتقال إلى الإدارة المالية" : "Open Finance Section"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Student Lesson Reminder Modal */}
      {activeReminderTarget && (
        <StudentLessonReminderModal
          target={activeReminderTarget}
          isArabic={isArabic}
          onClose={() => setActiveReminderTarget(null)}
        />
      )}
    </div>
  );
};
