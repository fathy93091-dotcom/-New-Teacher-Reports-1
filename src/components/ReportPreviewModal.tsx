import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Save,
  RotateCcw,
  Copy,
  Download,
  FileText,
  Globe,
  X,
  Edit3,
  Check,
  Share2
} from "lucide-react";
import { DailyReport, AppSettings } from "../types";

interface ReportPreviewModalProps {
  report: DailyReport;
  settings: AppSettings;
  onApproveAndSave: (updatedReport: DailyReport) => void;
  onSaveAsDraft: (updatedReport: DailyReport) => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  report,
  settings,
  onApproveAndSave,
  onSaveAsDraft,
  onRegenerate,
  onClose
}) => {
  const isArabicDefault = settings.preferredLanguage === "ar";
  const [activeLangTab, setActiveLangTab] = useState<"en" | "ar">(isArabicDefault ? "ar" : "en");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [englishText, setEnglishText] = useState(report.contentEnglish);
  const [arabicText, setArabicText] = useState(report.contentArabic || "");

  const currentText = activeLangTab === "en" ? englishText : (arabicText || englishText);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportText = () => {
    const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DITA_Report_${report.studentName.replace(/\s+/g, "_")}_Session${report.sessionNumber}.txt`;
    a.click();
  };

  const handleExportWord = () => {
    // Generate simple html-based DOCX compatible file
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${report.title}</title></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #047857;">${report.title}</h2>
        <p><strong>Student:</strong> ${report.studentName} | <strong>Date:</strong> ${report.date} | <strong>Teacher:</strong> ${report.teacherName}</p>
        <hr />
        <pre style="font-family: inherit; whitespace: pre-wrap;">${currentText}</pre>
      </body>
      </html>
    `;
    const blob = new Blob([wordContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DITA_Report_${report.studentName.replace(/\s+/g, "_")}_Session${report.sessionNumber}.doc`;
    a.click();
  };

  const handleApprove = () => {
    const updated: DailyReport = {
      ...report,
      contentEnglish: englishText,
      contentArabic: arabicText,
      isApproved: true,
      isDraft: false,
      lastModified: new Date().toISOString()
    };
    onApproveAndSave(updated);
  };

  const handleDraft = () => {
    const updated: DailyReport = {
      ...report,
      contentEnglish: englishText,
      contentArabic: arabicText,
      isApproved: false,
      isDraft: true,
      lastModified: new Date().toISOString()
    };
    onSaveAsDraft(updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">{report.title}</h2>
                {report.isApproved ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Approved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    Draft Review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Student: <strong className="text-slate-200">{report.studentName}</strong> • Date: {report.date} • Duration: {report.durationMinutes} mins
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Bar: Tabs & Quick Tools */}
        <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 px-6">
          {/* Language Switch Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLangTab("en")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeLangTab === "en" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              English Report
            </button>
            <button
              onClick={() => setActiveLangTab("ar")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeLangTab === "ar" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              التقرير بالعربية
            </button>
          </div>

          {/* Quick Tools: Edit toggle, Copy, Export */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                isEditing
                  ? "bg-amber-500/20 text-amber-300 border-amber-500"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Editing Mode" : "Edit Report"}</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium flex items-center gap-1.5 transition"
              title="Export as Microsoft Word"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Word</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Report Preview & Editor */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-sm leading-relaxed text-slate-200">
          {/* Top Subjects Summary Badge List */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 self-center">Subjects:</span>
            {report.subjectsCovered.map((s, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 text-xs font-medium border border-slate-700">
                {s.subject}
              </span>
            ))}
          </div>

          {/* Report Main Content Area */}
          {isEditing ? (
            <textarea
              rows={14}
              value={activeLangTab === "en" ? englishText : arabicText}
              onChange={e => {
                if (activeLangTab === "en") setEnglishText(e.target.value);
                else setArabicText(e.target.value);
              }}
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs leading-relaxed font-mono focus:border-emerald-500 outline-none resize-none"
              dir={activeLangTab === "ar" ? "rtl" : "ltr"}
            />
          ) : (
            <div
              className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-200"
              dir={activeLangTab === "ar" ? "rtl" : "ltr"}
            >
              {currentText}
            </div>
          )}

          {/* Islamic Closing Dua Highlight */}
          {report.closingMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center text-xs text-emerald-300 italic font-serif">
              "{report.closingMessage}"
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onRegenerate}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Regenerate with AI</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDraft}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save as Draft</span>
            </button>

            <button
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/50 flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Save (Update Memory)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
