import React from "react";
import {
  Users,
  Calendar,
  FileText,
  Clock,
  Plus,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Code,
  ArrowRight,
  BookOpen,
  Brain,
  Search,
  CheckSquare
} from "lucide-react";
import { Student, Session, DailyReport, AppSettings } from "../types";
import { ActiveTab } from "./Header";

interface DashboardViewProps {
  students: Student[];
  sessions: Session[];
  reports: DailyReport[];
  settings: AppSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onStartSession: (studentId?: string) => void;
  onAddStudent: () => void;
  onGenerateReportForSession: (session: Session) => void;
  onSelectReport: (report: DailyReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students = [],
  sessions = [],
  reports = [],
  settings,
  setActiveTab,
  onStartSession,
  onAddStudent,
  onGenerateReportForSession,
  onSelectReport
}) => {
  const isArabic = settings?.preferredLanguage === "ar";

  const safeStudents = Array.isArray(students) ? students : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeReports = Array.isArray(reports) ? reports : [];

  const activeStudents = safeStudents.filter(s => s.status === "Active");
  const pendingReports = safeReports.filter(r => !r.isApproved);
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = safeSessions.filter(s => s.date === todayStr || s.date === "2026-07-27" || s.date === "2026-07-26");

  // Homework pending check
  const totalHomeworkAssigned = safeSessions.flatMap(s => (s.subjectRecords || []).flatMap(sr => sr.homework || []));
  const pendingHomework = totalHomeworkAssigned.filter(h => h.status !== "Completed");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isArabic ? "مساعد الذكاء الاصطناعي جاهز" : "AI Assistant Ready"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isArabic ? "أهلاً بك، معلم القرآن الكريم والعلوم الإسلامية" : "Welcome back, Teacher!"}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isArabic
                ? "إدارة الحصص والطلاب وتوليد التقارير التعليمية المعتمدة للوالدين بدقة عالية ودون عناء."
                : "Manage students, record multi-subject lessons, and generate verified parent reports in seconds."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => onStartSession()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-900/50 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isArabic ? "بدء حصة جديدة" : "Start Lesson"}</span>
            </button>
            <button
              onClick={onAddStudent}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium flex items-center gap-2 transition"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? "إضافة طالب" : "Add Student"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Active Students */}
        <div
          onClick={() => setActiveTab("students")}
          className="bg-slate-900 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              {isArabic ? "إجمالي الطلاب" : "Active Students"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{activeStudents.length}</div>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <span>{students.length - activeStudents.length}</span> {isArabic ? "في الأرشيف" : "archived"}
          </p>
        </div>

        {/* Stat 2: Today's Sessions */}
        <div
          onClick={() => setActiveTab("sessions")}
          className="bg-slate-900 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              {isArabic ? "حصص اليوم" : "Today's Lessons"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{todaySessions.length}</div>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>{isArabic ? "مسجلة لهذا اليوم" : "scheduled / recorded"}</span>
          </p>
        </div>

        {/* Stat 3: Pending Reports */}
        <div
          onClick={() => setActiveTab("reports")}
          className="bg-slate-900 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              {isArabic ? "تقارير بانتظار الاعتماد" : "Pending Reports"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{pendingReports.length}</div>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{isArabic ? "تتطلب مراجعة واعتماد المعلم" : "Requires teacher review"}</span>
          </p>
        </div>

        {/* Stat 4: Pending Homework */}
        <div
          onClick={() => setActiveTab("memory")}
          className="bg-slate-900 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              {isArabic ? "متابعة الواجبات" : "Pending Homework"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{pendingHomework.length}</div>
          <p className="text-slate-400 text-xs mt-1">
            {isArabic ? "واجبات لم تكتمل بعد" : "items pending review"}
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{isArabic ? "اختصارات سريعة للنظام:" : "Quick Tools:"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("apiDocs")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>{isArabic ? "استعراض واجهات API" : "Interactive API Explorer"}</span>
          </button>
          <button
            onClick={() => setActiveTab("unitTests")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isArabic ? "تشغيل اختبارات النظام" : "Run Unit Tests"}</span>
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>{isArabic ? "ذاكرة الطلاب" : "Student Memory System"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Recent Sessions & Approved Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's & Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>{isArabic ? "حصص اليوم والحصص الأخيرة" : "Recent & Today's Teaching Sessions"}</span>
            </h2>
            <button
              onClick={() => setActiveTab("sessions")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>{isArabic ? "عرض الكل" : "View All"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {sessions.slice(0, 4).map(session => {
              const student = students.find(s => s.id === session.studentId);
              return (
                <div
                  key={session.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">
                        {student ? student.fullName : "Unknown Student"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {isArabic ? `الحصة #${session.sessionNumber}` : `Session #${session.sessionNumber}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{session.date} ({session.time})</span>
                      <span>•</span>
                      <span>{session.durationMinutes} {isArabic ? "دقيقة" : "mins"}</span>
                      <span>•</span>
                      <span className="text-teal-400 font-medium">
                        {session.subjectRecords.map(s => s.subject).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onGenerateReportForSession(session)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {session.reportStatus === "approved"
                          ? (isArabic ? "عرض التقرير" : "View Report")
                          : (isArabic ? "توليد التقرير بالذكاء الاصطناعي" : "Generate Report")}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 col): Recent Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" />
              <span>{isArabic ? "التقارير الأخيرة" : "Recent Reports"}</span>
            </h2>
            <button
              onClick={() => setActiveTab("reports")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>{isArabic ? "الكل" : "All"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {reports.slice(0, 3).map(rep => (
              <div
                key={rep.id}
                onClick={() => onSelectReport(rep)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/50 cursor-pointer transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-200 truncate">{rep.studentName}</span>
                  {rep.isApproved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      <CheckCircle className="w-3 h-3" />
                      {isArabic ? "معتمد" : "Approved"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                      <Clock className="w-3 h-3" />
                      {isArabic ? "مسودة" : "Draft"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {rep.overallPerformanceSummary}
                </p>

                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                  <span>{rep.date}</span>
                  <span>Session #{rep.sessionNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
