import React, { useState, useRef } from "react";
import {
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Star,
  CheckCircle2,
  Lightbulb,
  Target,
  Download,
  Printer,
  Globe,
  User,
  ShieldCheck,
  FileImage,
  RefreshCw,
  FileType,
  FileText,
  Layers,
  GraduationCap
} from "lucide-react";
import { toPng } from "html-to-image";
import { MonthlyReportPayload, getSubjectDefaultReportLanguage } from "../lib/monthlyQuranReport";
import {
  extractTwoPageReportData,
  exportMonthlyReportAsPdf,
  exportMonthlyReportAsWord
} from "../lib/reportExportUtils";
import {
  buildTwoPageReportStyles,
  buildPage1InnerHtml,
  buildPage2InnerHtml
} from "../lib/twoPageReportTemplates";

interface VisualInfographicReportProps {
  payload: MonthlyReportPayload;
  reportMarkdown?: string;
  onClose?: () => void;
}

export const VisualInfographicReport: React.FC<VisualInfographicReportProps> = ({
  payload,
  reportMarkdown,
  onClose
}) => {
  const initialLang = getSubjectDefaultReportLanguage(payload?.subject);
  const [lang, setLang] = useState<"ar" | "en">(initialLang);
  const [isExporting, setIsExporting] = useState(false);
  const [activePreviewPage, setActivePreviewPage] = useState<"all" | "page1" | "page2">("all");
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // Sync language if payload subject changes
  React.useEffect(() => {
    setLang(getSubjectDefaultReportLanguage(payload?.subject));
  }, [payload?.subject]);

  const isAr = lang === "ar";
  const data = extractTwoPageReportData(payload, reportMarkdown, lang);

  // Handle Export 2-Page PDF
  const handleExportPdf = () => {
    exportMonthlyReportAsPdf(payload, reportMarkdown, lang);
    setExportSuccessMessage(
      isAr
        ? "تم فتح نافذة حفظ التقرير الشهري كـ PDF من صفحتين A4 بنجاح! 📄"
        : "2-Page A4 PDF export dialog opened successfully! 📄"
    );
    setTimeout(() => setExportSuccessMessage(null), 5000);
  };

  // Handle Export 2-Page Word (.doc)
  const handleExportWord = () => {
    exportMonthlyReportAsWord(payload, reportMarkdown, lang);
    setExportSuccessMessage(
      isAr
        ? "تم تنزيل ملف التقرير الشهري بصيغة Word (.doc) من صفحتين منسقتين بالكامل! 📝"
        : "2-Page formatted Word document downloaded successfully! 📝"
    );
    setTimeout(() => setExportSuccessMessage(null), 5000);
  };

  // Handle Export as Image (PNG)
  const handleExportImage = async () => {
    const targetContainer = activePreviewPage === "page2" ? page2Ref.current : page1Ref.current;
    if (!targetContainer) return;
    const targetRef = (targetContainer.querySelector(".report-page") as HTMLElement) || targetContainer;
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const dataUrl = await toPng(targetRef, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#FDFBF7"
      });

      const safeName = data.studentName.replace(/[^\w\u0600-\u06FF\s-]/g, "").trim() || "Student";
      const safeMonth = data.monthName.replace(/[^\w\u0600-\u06FF\s-]/g, "").trim() || "Month";
      const pageSuffix = activePreviewPage === "page2" ? "Page_2" : "Page_1";
      const link = document.createElement("a");
      link.download = `Infographic_Report_${safeName}_${safeMonth}_${pageSuffix}.png`;
      link.href = dataUrl;
      link.click();

      setExportSuccessMessage(
        isAr ? "تم تنزيل التقرير البصري كصورة PNG عالية الجودة بنجاح! 🎉" : "Visual report downloaded as PNG successfully! 🎉"
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Failed to export image:", err);
      alert(isAr ? "حدث خطأ أثناء حفظ التقرير كصورة. يرجى استخدام خيار PDF أو Word." : "Failed to export image. Please use PDF or Word.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="no-print p-3 sm:p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm">
                {isAr ? "التقرير الشهري الشامل — صفحتان A4 بالضبط" : "Comprehensive Monthly Report — Exact 2 Pages"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                My Qur'an Journey
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr ? "جاهز للتصدير والطباعة والمشاركة مع ولي الأمر" : "Ready for export, printing and parent sharing"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Page view toggle in preview */}
          <div className="bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActivePreviewPage("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activePreviewPage === "all" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "الصفحتان معاً" : "Both Pages"}
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPage("page1")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activePreviewPage === "page1" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "صفحة 1" : "Page 1"}
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPage("page2")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activePreviewPage === "page2" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "صفحة 2" : "Page 2"}
            </button>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(l => (l === "ar" ? "en" : "ar"))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            title={isAr ? "تغيير لغة العرض إلى الإنجليزية" : "Switch Language to Arabic"}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>

          {/* Download Word (2 Pages) */}
          <button
            type="button"
            onClick={handleExportWord}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition active:scale-95"
            title={isAr ? "تنزيل كملف Microsoft Word من صفحتين منسقتين" : "Download 2-Page Word Document"}
          >
            <FileType className="w-3.5 h-3.5 text-blue-200" />
            <span>{isAr ? "تصدير Word (صفحتين)" : "Download Word (2 Pages)"}</span>
          </button>

          {/* Download PDF (2 Pages) */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition active:scale-95"
            title={isAr ? "تصدير وحفظ كملف PDF عالي الجودة من صفحتين A4" : "Download 2-Page A4 PDF"}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isAr ? "تصدير PDF (صفحتين A4)" : "Download PDF (2-Pages)"}</span>
          </button>

          {/* Download Image (PNG) */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportImage}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            title={isAr ? "حفظ التقرير كصورة PNG" : "Save as PNG Image"}
          >
            {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
            <span>{isAr ? "صورة PNG" : "PNG"}</span>
          </button>
        </div>
      </div>

      {exportSuccessMessage && (
        <div className="no-print p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* Styles for Exact 2-Page A4 Layout Matching Image 1 & Image 2 */}
      <style dangerouslySetInnerHTML={{ __html: buildTwoPageReportStyles(isAr ? "rtl" : "ltr", isAr) }} />

      {/* ======================================================== */}
      {/* PAGE 1: ACHIEVEMENTS & PERFORMANCE INDICATORS (IMAGE 1)  */}
      {/* ======================================================== */}
      {(activePreviewPage === "all" || activePreviewPage === "page1") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>{isAr ? "الصفحة الأولى: نظرة عامة بصرية ومؤشرات الأداء" : "Page 1: Monthly Overview & Performance Indicators"}</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">A4 • Page 1 of 2</span>
          </div>

          <div
            ref={page1Ref}
            className="report-page-container flex justify-center"
            dangerouslySetInnerHTML={{ __html: buildPage1InnerHtml(data, lang) }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: STRENGTHS, RECOMMENDATIONS & NEXT MONTH PLAN (IMAGE 2) */}
      {/* ======================================================== */}
      {(activePreviewPage === "all" || activePreviewPage === "page2") && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>{isAr ? "الصفحة الثانية: التقييم الأكاديمي والتوصيات والخطة" : "Page 2: Academic Strengths, Recommendations & Plan"}</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">A4 • Page 2 of 2</span>
          </div>

          <div
            ref={page2Ref}
            className="report-page-container flex justify-center"
            dangerouslySetInnerHTML={{ __html: buildPage2InnerHtml(data, lang) }}
          />
        </div>
      )}
    </div>
  );
};
