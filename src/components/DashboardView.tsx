import React from "react";
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
  RotateCcw
} from "lucide-react";
import { Student, Lesson, AppSettings, AttendanceRecord, Group, PrivateLesson } from "../types";
import { sanitizeTeacherName } from "../lib/storage";
import { calculateStudentFinancials } from "../lib/financeUtils";

interface DashboardViewProps {
  settings: AppSettings;
  students: Student[];
  groups?: Group[];
  privateLessons?: PrivateLesson[];
  lessons: Lesson[];
  attendanceRecords?: AttendanceRecord[];
  onOpenLessonDetails: (lesson: Lesson) => void;
  onNavigateToTab: (tab: "groups" | "students" | "schedule" | "finance") => void;
  dismissedNotificationIds?: string[];
  onDismissNotification?: (id: string) => void;
  onDismissAllNotifications?: (ids: string[]) => void;
  onRestoreNotifications?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  students,
  groups = [],
  privateLessons = [],
  lessons,
  attendanceRecords = [],
  onOpenLessonDetails,
  onNavigateToTab,
  dismissedNotificationIds = [],
  onDismissNotification,
  onDismissAllNotifications,
  onRestoreNotifications
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const todayStr = new Date().toISOString().split("T")[0];

  // Calculations
  const todayLessons = lessons.filter(l => l.date === todayStr || true); // show today's lessons + active
  const activeStudents = students.filter(s => s.status === "active");
  const presentStudentsToday = students.filter(s => s.status === "active" && s.paymentStatus === "paid");
  const activeGroups = groups.filter(g => g.status === "active");
  
  // Calculate real-time financials for each active student
  const studentFinancialSummaries = activeStudents.map(student => ({
    student,
    summary: calculateStudentFinancials(student, attendanceRecords)
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

      {/* Metric Stat Cards Grid - 6 High-Density Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
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

        {/* Students Present Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "الحاضرون اليوم" : "Present Today"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">{presentStudentsToday.length}</div>
          <p className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">
            {isArabic ? "تم تسجيل حضورهم" : "Recorded"}
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
                return (
                  <div
                    key={lesson.id}
                    className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isGroup ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {isGroup ? "👥" : "👤"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {isGroup ? lesson.groupName : lesson.studentName}
                          </h3>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isGroup ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            }`}
                          >
                            {isGroup ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                          {lesson.subject} • {lesson.time} ({lesson.durationMinutes} {isArabic ? "دقيقة" : "mins"})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          lesson.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : lesson.status === "starting_soon"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {lesson.status === "completed"
                          ? (isArabic ? "تمت" : "Completed")
                          : lesson.status === "starting_soon"
                          ? (isArabic ? "حان وقتها" : "Starting Soon")
                          : (isArabic ? "قادمة" : "Upcoming")}
                      </span>

                      <button
                        onClick={() => onOpenLessonDetails(lesson)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1"
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
                          {isArabic
                            ? `مستحق سداد: ${summary.amountDue} ج.م (${summary.totalAttendedLessons} حصص منفذة)`
                            : `Due: ${summary.amountDue} EGP (${summary.totalAttendedLessons} attended)`}
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
    </div>
  );
};
