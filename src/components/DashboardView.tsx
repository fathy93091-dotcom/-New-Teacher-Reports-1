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
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isArabic ? "محرك الذكاء الاصطناعي جاهز" : "AI Assistant Ready"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isArabic ? "أهلاً بك، معلم القرآن الكريم والعلوم الإسلامية" : "Welcome back, Teacher!"}
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              {isArabic
                ? "إدارة الحصص والطلاب وتوليد التقارير التعليمية المعتمدة للوالدين بدقة عالية ودون عناء."
                : "Manage students, record multi-subject lessons, and generate verified parent reports in seconds."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => onStartSession()}
              className="px-4.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-md flex items-center gap-2 transition"
            >
              <Plus className="w-4.5 h-4.5 text-slate-950" />
              <span>{isArabic ? "بدء حصة جديدة" : "Start Lesson"}</span>
            </button>
            <button
              onClick={onAddStudent}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-bold flex items-center gap-2 transition"
            >
              <Users className="w-4 h-4 text-emerald-200" />
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
          className="bg-white hover:bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 shadow-xs cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              {isArabic ? "إجمالي الطلاب" : "Active Students"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-3">{activeStudents.length}</div>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 font-medium">
            <span>{students.length - activeStudents.length}</span> {isArabic ? "في الأرشيف" : "archived"}
          </p>
        </div>

        {/* Stat 2: Today's Sessions */}
        <div
          onClick={() => setActiveTab("sessions")}
          className="bg-white hover:bg-teal-50/40 p-5 rounded-2xl border border-teal-100 shadow-xs cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              {isArabic ? "حصص اليوم" : "Today's Lessons"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center border border-teal-200 group-hover:scale-110 transition">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">{todaySessions.length}</div>
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{isArabic ? "مسجلة لهذا اليوم" : "scheduled / recorded"}</span>
          </p>
        </div>

        {/* Stat 3: Pending Reports */}
        <div
          onClick={() => setActiveTab("reports")}
          className="bg-white hover:bg-amber-50/40 p-5 rounded-2xl border border-amber-200 shadow-xs cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              {isArabic ? "تقارير بانتظار الاعتماد" : "Pending Reports"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-900 mt-3">{pendingReports.length}</div>
          <p className="text-slate-600 text-xs mt-1 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{isArabic ? "تتطلب مراجعة واعتماد المعلم" : "Requires teacher review"}</span>
          </p>
        </div>

        {/* Stat 4: Pending Homework */}
        <div
          onClick={() => setActiveTab("memory")}
          className="bg-white hover:bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 shadow-xs cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              {isArabic ? "متابعة الواجبات" : "Pending Homework"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-3">{pendingHomework.length}</div>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            {isArabic ? "واجبات لم تكتمل بعد" : "items pending review"}
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{isArabic ? "اختصارات سريعة للنظام:" : "Quick Tools:"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("apiDocs")}
            className="px-3 py-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 text-xs font-bold border border-emerald-200/80 flex items-center gap-1.5 transition"
          >
            <Code className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isArabic ? "استعراض واجهات API" : "Interactive API Explorer"}</span>
          </button>
          <button
            onClick={() => setActiveTab("unitTests")}
            className="px-3 py-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 text-xs font-bold border border-emerald-200/80 flex items-center gap-1.5 transition"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isArabic ? "تشغيل اختبارات النظام" : "Run Unit Tests"}</span>
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition"
          >
            <Brain className="w-3.5 h-3.5 text-amber-700" />
            <span>{isArabic ? "ذاكرة الطلاب" : "Student Memory System"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Recent Sessions & Approved Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's & Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>{isArabic ? "حصص اليوم والحصص الأخيرة" : "Recent & Today's Teaching Sessions"}</span>
            </h2>
            <button
              onClick={() => setActiveTab("sessions")}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
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
                  className="bg-white border border-emerald-100/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 shadow-xs transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        {student ? student.fullName : "Unknown Student"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {isArabic ? `الحصة #${session.sessionNumber}` : `Session #${session.sessionNumber}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{session.date} ({session.time})</span>
                      <span>•</span>
                      <span>{session.durationMinutes} {isArabic ? "دقيقة" : "mins"}</span>
                      <span>•</span>
                      <span className="text-teal-700 font-bold">
                        {session.subjectRecords.map(s => s.subject).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onGenerateReportForSession(session)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>{isArabic ? "التقارير الأخيرة" : "Recent Reports"}</span>
            </h2>
            <button
              onClick={() => setActiveTab("reports")}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
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
                className="bg-white border border-emerald-100 rounded-2xl p-4 hover:border-emerald-400 cursor-pointer transition space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 truncate">{rep.studentName}</span>
                  {rep.isApproved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      {isArabic ? "معتمد" : "Approved"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {isArabic ? "مسودة" : "Draft"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                  {rep.overallPerformanceSummary}
                </p>

                <div className="text-[10px] text-slate-500 font-medium flex justify-between pt-2 border-t border-slate-100">
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
