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
  Share2,
  Brain,
  ThumbsUp,
  ThumbsDown,
  AlertCircle
} from "lucide-react";
import { DailyReport, AppSettings, MemoryUpdateSuggestion } from "../types";

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

  const [suggestions, setSuggestions] = useState<MemoryUpdateSuggestion[]>(
    report.suggestedMemoryUpdates || []
  );

  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const currentText = activeLangTab === "en" ? englishText : (arabicText || englishText);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWord = () => {
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

  const handleAcceptSuggestion = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => (s.id === id ? { ...s, status: "approved" } : s))
    );
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => (s.id === id ? { ...s, status: "rejected" } : s))
    );
  };

  const startEditSuggestion = (s: MemoryUpdateSuggestion) => {
    setEditingSuggestionId(s.id);
    setEditingText(s.text);
  };

  const saveEditedSuggestion = (id: string) => {
    setSuggestions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, text: editingText, status: "edited" } : s
      )
    );
    setEditingSuggestionId(null);
  };

  const handleApprove = () => {
    const updated: DailyReport = {
      ...report,
      contentEnglish: englishText,
      contentArabic: arabicText,
      suggestedMemoryUpdates: suggestions,
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
      suggestedMemoryUpdates: suggestions,
      isApproved: false,
      isDraft: true,
      lastModified: new Date().toISOString()
    };
    onSaveAsDraft(updated);
  };

  const getTypeBadge = (type: MemoryUpdateSuggestion["type"]) => {
    switch (type) {
      case "strength":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{isArabicDefault ? "نقطة قوة" : "Strength"}</span>;
      case "areaForImprovement":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{isArabicDefault ? "مجال للتحسين" : "Area to Focus"}</span>;
      case "recurringMistake":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{isArabicDefault ? "ملاحظة خطأ" : "Mistake Recorded"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">{isArabicDefault ? "ملاحظة معلم" : "Teacher Note"}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-emerald-100 rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{report.title}</h2>
                {report.isApproved ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Approved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                    Draft Review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Student: <strong className="text-slate-800">{report.studentName}</strong> • Date: {report.date} • Duration: {report.durationMinutes} mins
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Bar: Tabs & Quick Tools */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 px-6">
          {/* Language Switch Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setActiveLangTab("en")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeLangTab === "en" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              English Report
            </button>
            <button
              onClick={() => setActiveLangTab("ar")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeLangTab === "ar" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              التقرير بالعربية
            </button>
          </div>

          {/* Quick Tools: Edit toggle, Copy, Export */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                isEditing
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
              <span>{isEditing ? "Editing Mode" : "Edit Report"}</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center gap-1.5 transition"
              title="Export as Microsoft Word"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Export Word</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Report Preview & Editor */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 font-sans text-sm leading-relaxed text-slate-800">
          {/* Top Subjects Summary Badge List */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 self-center">Subjects:</span>
            {report.subjectsCovered.map((s, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200">
                {s.subject}
              </span>
            ))}
          </div>

          {/* Report Main Content Area */}
          {isEditing ? (
            <textarea
              rows={12}
              value={activeLangTab === "en" ? englishText : arabicText}
              onChange={e => {
                if (activeLangTab === "en") setEnglishText(e.target.value);
                else setArabicText(e.target.value);
              }}
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs leading-relaxed font-mono focus:border-emerald-600 focus:bg-white outline-none resize-none"
              dir={activeLangTab === "ar" ? "rtl" : "ltr"}
            />
          ) : (
            <div
              className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-800 font-medium"
              dir={activeLangTab === "ar" ? "rtl" : "ltr"}
            >
              {currentText}
            </div>
          )}

          {/* Islamic Closing Dua Highlight */}
          {report.closingMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 italic font-serif font-bold">
              "{report.closingMessage}"
            </div>
          )}

          {/* Suggested Student Memory Updates (Teacher Approval required) */}
          {suggestions.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {isArabicDefault ? "مقترحات ذاكرة الطالب (تتطلب موافقة المعلم)" : "Suggested Student Memory Updates (Requires Teacher Approval)"}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">
                  {suggestions.filter(s => s.status === "approved" || s.status === "edited").length} / {suggestions.length} {isArabicDefault ? "مقبول" : "Approved"}
                </span>
              </div>

              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      s.status === "approved" || s.status === "edited"
                        ? "bg-emerald-50 border-emerald-300"
                        : s.status === "rejected"
                        ? "bg-slate-100 border-slate-200 opacity-60"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(s.type)}
                        {s.subject && <span className="text-[10px] font-bold text-slate-500">• {s.subject}</span>}
                        {s.status === "approved" && <span className="text-[10px] text-emerald-700 font-bold">✓ Approved</span>}
                        {s.status === "edited" && <span className="text-[10px] text-amber-700 font-bold">✎ Edited & Approved</span>}
                        {s.status === "rejected" && <span className="text-[10px] text-slate-400 line-through">Rejected</span>}
                      </div>

                      {editingSuggestionId === s.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            className="flex-1 px-3 py-1 bg-white border border-emerald-500 rounded-lg text-slate-900 text-xs outline-none"
                          />
                          <button
                            onClick={() => saveEditedSuggestion(s.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className={`text-slate-800 font-medium ${s.status === "rejected" ? "line-through text-slate-400" : ""}`}>
                          {s.text}
                        </p>
                      )}
                    </div>

                    {/* Action buttons: Accept, Edit, Reject */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleAcceptSuggestion(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                          s.status === "approved"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50"
                        }`}
                        title="Accept suggestion"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isArabicDefault ? "قبول" : "Accept"}</span>
                      </button>

                      <button
                        onClick={() => startEditSuggestion(s)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-800 border border-slate-200 hover:bg-amber-50 transition flex items-center gap-1"
                        title="Edit text"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" />
                        <span>{isArabicDefault ? "تعديل" : "Edit"}</span>
                      </button>

                      <button
                        onClick={() => handleRejectSuggestion(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                          s.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                        title="Reject suggestion"
                      >
                        <X className="w-3 h-3" />
                        <span>{isArabicDefault ? "رفض" : "Reject"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onRegenerate}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
            <span>Regenerate with AI</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDraft}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200"
            >
              <Save className="w-4 h-4 text-amber-600" />
              <span>Save as Draft</span>
            </button>

            <button
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isArabicDefault ? "اعتماد وحفظ (تحديث الذاكرة بالفيسبايس)" : "Approve & Save (Update Memory & Firebase)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

