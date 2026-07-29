import React, { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Download,
  Plus,
  Share2,
  Copy,
  Layers,
  BarChart2
} from "lucide-react";
import { DailyReport, MonthlyReport, Student, AppSettings } from "../types";

interface ReportsViewProps {
  reports: DailyReport[];
  monthlyReports: MonthlyReport[];
  students: Student[];
  settings: AppSettings;
  onSelectReport: (report: DailyReport) => void;
  onDeleteReport: (id: string) => void;
  onGenerateMonthlyReport: (studentId: string, month: string, year: number) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports = [],
  monthlyReports = [],
  students = [],
  settings,
  onSelectReport,
  onDeleteReport,
  onGenerateMonthlyReport
}) => {
  const isArabic = settings?.preferredLanguage === "ar";
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStudentId, setFilterStudentId] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<"all" | "approved" | "draft">("all");

  const safeReports = Array.isArray(reports) ? reports : [];
  const safeMonthlyReports = Array.isArray(monthlyReports) ? monthlyReports : [];
  const safeStudents = Array.isArray(students) ? students : [];

  // Monthly Report Wizard modal state
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [selectedStudentForMonthly, setSelectedStudentForMonthly] = useState<string>(safeStudents[0]?.id || "");
  const [monthlyMonth, setMonthlyMonth] = useState<string>("July");
  const [monthlyYear, setMonthlyYear] = useState<number>(2026);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);

  const filteredDailyReports = safeReports.filter(r => {
    const matchesSearch =
      (r.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.overallPerformanceSummary || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStudent = filterStudentId === "all" || r.studentId === filterStudentId;

    if (filterApproval === "approved") return matchesSearch && matchesStudent && r.isApproved;
    if (filterApproval === "draft") return matchesSearch && matchesStudent && !r.isApproved;
    return matchesSearch && matchesStudent;
  });

  const filteredMonthlyReports = safeMonthlyReports.filter(m => {
    const matchesSearch =
      (m.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.month || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.overallProgress || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStudent = filterStudentId === "all" || m.studentId === filterStudentId;
    return matchesSearch && matchesStudent;
  });

  const handleTriggerGenerateMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForMonthly) return;

    setGeneratingMonthly(true);
    await onGenerateMonthlyReport(selectedStudentForMonthly, monthlyMonth, monthlyYear);
    setGeneratingMonthly(false);
    setIsMonthlyModalOpen(false);
    setActiveTab("monthly");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 rounded-2xl shadow-md text-white border border-emerald-700">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-300" />
            <span>{isArabic ? "مستودع التقارير التعليمية" : "Educational Reports Hub"}</span>
          </h1>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            {isArabic
              ? "مراجعة واعتماد التقارير اليومية والشهرية، التصدير للوالدين، ومتابعة سجلات الاعتماد"
              : "Review daily and monthly educational reports, approve drafts, and export for parents"}
          </p>
        </div>

        <button
          onClick={() => setIsMonthlyModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center gap-2 shadow-md transition"
        >
          <Sparkles className="w-4 h-4 text-emerald-900" />
          <span>{isArabic ? "توليد تقرير شهري" : "Generate Monthly Report"}</span>
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        {/* Daily vs Monthly Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "daily" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isArabic ? "التقارير اليومية" : "Daily Reports"} ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "monthly" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isArabic ? "التقارير الشهرية" : "Monthly Reports"} ({monthlyReports.length})</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "بحث بالتقرير أو اسم الطالب..." : "Search report or student..."}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-xs outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <select
            value={filterStudentId}
            onChange={e => setFilterStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs outline-none"
          >
            <option value="all">{isArabic ? "جميع الطلاب" : "All Students"}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>

          {activeTab === "daily" && (
            <select
              value={filterApproval}
              onChange={e => setFilterApproval(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs outline-none"
            >
              <option value="all">{isArabic ? "جميع الحالات" : "All Status"}</option>
              <option value="approved">{isArabic ? "المعتمدة فقط" : "Approved Only"}</option>
              <option value="draft">{isArabic ? "المسودات" : "Drafts Only"}</option>
            </select>
          )}
        </div>
      </div>

      {/* DAILY REPORTS LIST */}
      {activeTab === "daily" && (
        <div className="space-y-3">
          {filteredDailyReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-emerald-100 text-slate-500 font-medium text-sm">
              No daily reports match your filter criteria.
            </div>
          ) : (
            filteredDailyReports.map(rep => (
              <div
                key={rep.id}
                className="bg-white border border-emerald-100 rounded-2xl p-5 hover:border-emerald-300 transition space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{rep.title}</h3>
                      {rep.isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Student: <strong className="text-slate-800">{rep.studentName}</strong> • Session #{rep.sessionNumber} • Date: {rep.date} ({rep.durationMinutes} mins)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => onSelectReport(rep)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{rep.isApproved ? "View & Export" : "Review & Approve"}</span>
                    </button>

                    <button
                      onClick={() => onDeleteReport(rep.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-2">
                  {rep.overallPerformanceSummary}
                </div>

                {/* Subjects & Homework Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex flex-wrap gap-1.5">
                    {rep.subjectsCovered.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                        {s.subject}
                      </span>
                    ))}
                  </div>

                  {rep.homeworkSummary.length > 0 && (
                    <span className="text-slate-500 font-medium">
                      Homework: <strong className="text-amber-800 font-bold">{rep.homeworkSummary.length} task(s) assigned</strong>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MONTHLY REPORTS LIST */}
      {activeTab === "monthly" && (
        <div className="space-y-3">
          {filteredMonthlyReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-emerald-100 text-slate-500 font-medium text-sm">
              No monthly reports generated yet. Click "Generate Monthly Report" above to synthesize approved daily reports.
            </div>
          ) : (
            filteredMonthlyReports.map(m => (
              <div key={m.id} className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{m.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Student: <strong className="text-slate-800">{m.studentName}</strong> • Month: {m.month} {m.year}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                    {m.homeworkCompletionRate}% Homework Rate
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-bold">Overall Progress</span>
                    <p className="text-slate-800 mt-1 font-medium line-clamp-3">{m.overallProgress}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-bold">Key Strengths</span>
                    <ul className="list-disc list-inside text-emerald-800 font-bold mt-1 space-y-0.5">
                      {m.strengths.slice(0, 3).map((st, idx) => (
                        <li key={idx} className="truncate">{st}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-bold">Teacher Recommendations</span>
                    <p className="text-slate-800 mt-1 font-medium line-clamp-3">{m.teacherRecommendations}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* GENERATE MONTHLY REPORT MODAL */}
      {isMonthlyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>Generate Monthly Progress Summary</span>
            </h2>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Per SRS Chapter 6.11, Monthly Reports summarize approved daily reports exclusively without introducing external or fabricated assumptions.
            </p>

            <form onSubmit={handleTriggerGenerateMonthly} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Student</label>
                <select
                  value={selectedStudentForMonthly}
                  onChange={e => setSelectedStudentForMonthly(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Month</label>
                  <select
                    value={monthlyMonth}
                    onChange={e => setMonthlyMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Year</label>
                  <input
                    type="number"
                    value={monthlyYear}
                    onChange={e => setMonthlyYear(parseInt(e.target.value) || 2026)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingMonthly}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{generatingMonthly ? "Synthesizing..." : "Generate Monthly Report"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
