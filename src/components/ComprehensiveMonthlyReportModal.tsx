import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  Copy,
  Check,
  Share2,
  Save,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import {
  Student,
  AppSettings,
  AttendanceRecord,
  GeneratedReport,
  getEffectiveMonthlyReportSettings
} from "../types";
import {
  aggregateMonthlyStudentData,
  buildStructuredMonthlyReportText,
  formatEvaluationMonth,
  ARABIC_MONTH_NAMES,
  ENGLISH_MONTH_NAMES
} from "../lib/monthlyAggregationEngine";

interface ComprehensiveMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  subject: string; // "قرآن كريم" or "Quran, Arabic and Islamic Studies"
  settings: AppSettings;
  attendanceRecords?: AttendanceRecord[];
  reports?: GeneratedReport[];
  onSaveReport?: (reportData: Partial<GeneratedReport>) => Promise<void> | void;
  onOpenWhatsAppChooser?: (text: string, student: Student) => void;
}

export const ComprehensiveMonthlyReportModal: React.FC<ComprehensiveMonthlyReportModalProps> = ({
  isOpen,
  onClose,
  student,
  subject,
  settings,
  attendanceRecords = [],
  reports = [],
  onSaveReport,
  onOpenWhatsAppChooser
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const now = new Date();
  const isEn = subject === "Quran, Arabic and Islamic Studies";
  const [reportLang, setReportLang] = useState<"ar" | "en">(isEn ? "en" : "ar");

  // Default to current month and year
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [generatedReportText, setGeneratedReportText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Aggregate monthly student data using our dedicated engine
  const aggregatedData = useMemo(() => {
    return aggregateMonthlyStudentData({
      student,
      subject,
      year: selectedYear,
      month: selectedMonth,
      allReports: reports,
      allAttendance: attendanceRecords,
      lang: reportLang
    });
  }, [student, subject, selectedYear, selectedMonth, reports, attendanceRecords, reportLang]);

  // Update initial text when criteria change
  useEffect(() => {
    if (aggregatedData) {
      const initialText = buildStructuredMonthlyReportText(aggregatedData, reportLang);
      setGeneratedReportText(initialText);
      setSavedSuccess(false);
      setErrorMessage("");
    }
  }, [aggregatedData, reportLang]);

  if (!isOpen) return null;

  // Generate with AI
  const handleGenerateAI = async () => {
    if (!aggregatedData) return;
    setIsGenerating(true);
    setErrorMessage("");
    setSavedSuccess(false);

    try {
      const effectiveMonthlySettings = getEffectiveMonthlyReportSettings(settings);

      const payload = {
        studentName: student.fullName,
        subject,
        month: selectedMonth,
        year: selectedYear,
        monthName: formatEvaluationMonth(selectedMonth, selectedYear, reportLang),
        totalLessons: aggregatedData.totalLessonsCount,
        totalHours: aggregatedData.totalHours,
        teacherName: settings.teacherName || (reportLang === "en" ? "Mohammed Fathy" : "أ. محمد فتحي"),
        lang: reportLang,
        dailyAnalysisInstructions: effectiveMonthlySettings.dailyAnalysisInstructions,
        monthlyTemplateInstructions: effectiveMonthlySettings.monthlyTemplateInstructions,
        lessons: aggregatedData.lessons.map(l => ({
          date: l.date,
          lessonNumber: l.lessonNumber,
          durationMinutes: l.durationMinutes,
          attendance: l.attendance,
          homeworkStatus: l.homeworkStatus,
          classEvents: l.classEvents,
          homeworkNotes: l.homeworkNotes,
          teacherNotes: l.teacherNotes,
          overallEvaluation: l.overallEvaluation,
          reportText: l.reportText
        }))
      };

      const res = await fetch("/api/ai/generate-monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.reportText) {
          setGeneratedReportText(data.reportText.trim());
          setIsGenerating(false);
          return;
        }
      }

      setGeneratedReportText(buildStructuredMonthlyReportText(aggregatedData, reportLang));
    } catch (err) {
      console.warn("AI generation fallback to structured template:", err);
      setGeneratedReportText(buildStructuredMonthlyReportText(aggregatedData, reportLang));
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy text
  const handleCopy = async () => {
    if (!generatedReportText) return;
    try {
      await navigator.clipboard.writeText(generatedReportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp
  const handleWhatsApp = () => {
    if (!generatedReportText) return;
    if (onOpenWhatsAppChooser) {
      onOpenWhatsAppChooser(generatedReportText, student);
      return;
    }
    const phone = student.phone ? student.phone.replace(/[^0-9+]/g, "") : "";
    const encoded = encodeURIComponent(generatedReportText);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Save to profile
  const handleSaveToProfile = async () => {
    if (!generatedReportText.trim() || !onSaveReport || !aggregatedData) return;

    try {
      await onSaveReport({
        studentId: student.id,
        studentName: student.fullName,
        subject,
        reportType: "monthly_comprehensive",
        evaluationMonth: formatEvaluationMonth(selectedMonth, selectedYear, reportLang),
        date: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
        lessonNumber: aggregatedData.totalLessonsCount,
        durationMinutes: aggregatedData.totalHours * 60,
        reportLanguage: reportLang,
        reportText: generatedReportText,
        generatedText: generatedReportText
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (e: any) {
      console.error("Failed to save report:", e);
      setErrorMessage(isArabic ? "تعذر حفظ التقرير في السجل" : "Failed to save report");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in" dir={isArabic ? "rtl" : "ltr"}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isArabic ? "التقرير الشهري الشامل" : "Comprehensive Monthly Report"}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {student.fullName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {subject} • {formatEvaluationMonth(selectedMonth, selectedYear, reportLang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setReportLang("ar")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  reportLang === "ar" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setReportLang("en")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  reportLang === "en" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="font-bold text-slate-400 block mb-1">
                {isArabic ? "الشهر" : "Month"}
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-white outline-none"
              >
                {(reportLang === "en" ? ENGLISH_MONTH_NAMES : ARABIC_MONTH_NAMES).map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-400 block mb-1">
                {isArabic ? "السنة" : "Year"}
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-white outline-none"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-400 block mb-1">
                {isArabic ? "الحصص المسترجعة" : "Retrieved Lessons"}
              </label>
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-blue-300">
                {aggregatedData?.totalLessonsCount || 0} {isArabic ? "حصة" : "lessons"} ({aggregatedData?.totalHours || 0} {isArabic ? "ساعة" : "hrs"})
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>{isArabic ? "نص التقرير المنظم (قابل للتحرير المباشر):" : "Structured Report Text (Directly Editable):"}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                <span>{isGenerating ? (isArabic ? "جارٍ التوليد..." : "Generating...") : (isArabic ? "تحليل بالذكاء الاصطناعي ✨" : "AI Analyze ✨")}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!generatedReportText}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? (isArabic ? "تم النسخ!" : "Copied!") : (isArabic ? "نسخ" : "Copy")}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                disabled={!generatedReportText}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isArabic ? "واتساب" : "WhatsApp"}</span>
              </button>
            </div>
          </div>

          {/* Success / Error Messages */}
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? "تم حفظ التقرير الشهري في سجل الطالب بنجاح!" : "Monthly report saved to profile!"}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Textarea for Output */}
          <textarea
            rows={18}
            value={generatedReportText}
            onChange={e => setGeneratedReportText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 font-mono text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition leading-relaxed resize-y min-h-[350px]"
            dir={reportLang === "ar" ? "rtl" : "ltr"}
            placeholder={isArabic ? "سيظهر نص التقرير هنا..." : "Report text will appear here..."}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSaveToProfile}
            disabled={!generatedReportText.trim() || !onSaveReport}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isArabic ? "حفظ التقرير في سجل الطالب" : "Save to Student History"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
