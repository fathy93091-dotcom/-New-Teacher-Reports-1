import React from "react";
import {
  Sparkles,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Play,
  UserCheck,
  ChevronRight
} from "lucide-react";
import { Student, Lesson, AppSettings, AttendanceRecord } from "../types";
import { sanitizeTeacherName } from "../lib/storage";
import { calculateStudentFinancials } from "../lib/financeUtils";

interface DashboardViewProps {
  settings: AppSettings;
  students: Student[];
  lessons: Lesson[];
  attendanceRecords?: AttendanceRecord[];
  onOpenLessonDetails: (lesson: Lesson) => void;
  onNavigateToTab: (tab: "groups" | "students" | "schedule" | "finance") => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  students,
  lessons,
  attendanceRecords = [],
  onOpenLessonDetails,
  onNavigateToTab
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const todayStr = new Date().toISOString().split("T")[0];

  // Calculations
  const todayLessons = lessons.filter(l => l.date === todayStr || true); // show today's lessons + active
  const activeStudents = students.filter(s => s.status === "active");
  const presentStudentsToday = students.filter(s => s.status === "active" && s.paymentStatus === "paid");
  
  // Calculate real-time financials for each active student
  const studentFinancialSummaries = activeStudents.map(student => ({
    student,
    summary: calculateStudentFinancials(student, attendanceRecords)
  }));

  const unpaidStudents = studentFinancialSummaries.filter(
    item => item.summary.amountDue > 0
  );

  const lowBalanceStudents = studentFinancialSummaries.filter(
    item => item.student.subscriptionType === "lessons_count" && item.summary.remainingLessons <= 1 && item.summary.amountDue === 0
  );

  const paymentAlertsCount = unpaidStudents.length + lowBalanceStudents.length;

  return (
    <div className="space-y-4 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                {isArabic ? "متابعة دروسك اليومية" : "Daily Overview"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {(() => {
                const clean = sanitizeTeacherName(settings.teacherName);
                if (!clean) return isArabic ? "أهلاً بك 👋" : "Welcome 👋";
                return isArabic ? `أهلاً بك، ${clean}` : `Welcome, ${clean}`;
              })()}
            </h1>

          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNavigateToTab("schedule")}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <span>{isArabic ? "عرض الجدول الأسبوعي" : "Weekly Schedule"}</span>
              <ChevronRight className="w-4 h-4 dir-rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards Grid - Mobile Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Today's Lessons */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "حصص اليوم" : "Today's Lessons"}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{todayLessons.length}</div>
          <p className="text-[9.5px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
            {isArabic ? "حصص قادمة ومكتملة" : "Upcoming & completed"}
          </p>
        </div>

        {/* Active Students */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "الطلاب النشطون" : "Active Students"}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{activeStudents.length}</div>
          <p className="text-[9.5px] sm:text-[11px] text-teal-600 font-semibold mt-0.5 truncate">
            {isArabic ? "طالب مقيد للنظام" : "Registered pupils"}
          </p>
        </div>

        {/* Students Present Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "الحاضرون اليوم" : "Present Today"}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{presentStudentsToday.length}</div>
          <p className="text-[9.5px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5 truncate">
            {isArabic ? "تم تسجيل حضورهم" : "Attendance recorded"}
          </p>
        </div>

        {/* Payment Alerts */}
        <div
          onClick={() => onNavigateToTab("finance")}
          className="bg-white border border-amber-200 rounded-xl p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate">
              {isArabic ? "تنبيهات الدفع" : "Payment Alerts"}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">{paymentAlertsCount}</div>
          <p className="text-[9.5px] sm:text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-0.5 truncate">
            <span className="truncate">{isArabic ? "لم يدفعوا أو رصيد منخفض" : "Overdue/low"}</span>
            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Missions vs Important Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Lessons List (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
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

          <div className="space-y-2.5">
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
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {lesson.subject} • {lesson.time} ({lesson.durationMinutes} {isArabic ? "دقيقة" : "mins"})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
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
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1"
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">
                {isArabic ? "التنبيهات المهمة" : "Important Alerts"}
              </h2>
            </div>

            <div className="space-y-2">
              {unpaidStudents.length === 0 && lowBalanceStudents.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-emerald-500 opacity-60" />
                  <p className="text-xs font-semibold">
                    {isArabic ? "جميع الطلاب سددوا مستحقاتهم ورصيدهم متوفر!" : "No payment issues found!"}
                  </p>
                </div>
              ) : (
                <>
                  {unpaidStudents.map(({ student, summary }) => (
                    <div
                      key={student.id}
                      onClick={() => onNavigateToTab("finance")}
                      className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 hover:bg-rose-100/60 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-rose-900 text-xs">{student.fullName}</p>
                        <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                          {isArabic
                            ? `مستحق سداد: ${summary.amountDue} ج.م (${summary.totalAttendedLessons} حصص منفذة)`
                            : `Due: ${summary.amountDue} EGP (${summary.totalAttendedLessons} attended)`}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                  ))}

                  {lowBalanceStudents.map(({ student, summary }) => (
                    <div
                      key={student.id}
                      onClick={() => onNavigateToTab("finance")}
                      className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 hover:bg-amber-100/60 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-amber-900 text-xs">{student.fullName}</p>
                        <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                          {isArabic
                            ? `رصيد متبقٍ: ${summary.remainingLessons} حصة فقط (${summary.remainingBalance} ج.م)`
                            : `Low Balance (${summary.remainingLessons} left)`}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                  ))}
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
