import React, { useState, useEffect } from "react";
import {
  FolderArchive,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Clock,
  BookOpen,
  Copy,
  Printer,
  Share2,
  Trash2,
  Edit,
  RotateCcw,
  Sparkles,
  Check
} from "lucide-react";
import { GeneratedReport } from "../types";
import { ArchiveMonthGroup } from "../lib/reportArchiveEngine";

interface ArchivedReportsFolderListProps {
  groups: ArchiveMonthGroup[];
  isArabic?: boolean;
  onToggleArchiveReport?: (reportId: string) => void;
  onEditReport?: (report: GeneratedReport) => void;
  onDeleteReport?: (reportId: string) => void;
  onPrintReport?: (report: GeneratedReport) => void;
  onCopyReport?: (report: GeneratedReport) => void;
  onShareWhatsApp?: (report: GeneratedReport) => void;
  searchActive?: boolean;
}

export const ArchivedReportsFolderList: React.FC<ArchivedReportsFolderListProps> = ({
  groups,
  isArabic = true,
  onToggleArchiveReport,
  onEditReport,
  onDeleteReport,
  onPrintReport,
  onCopyReport,
  onShareWhatsApp,
  searchActive = false
}) => {
  // Store expanded group keys; by default open the first (newest) group or all if search is active
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>(() => {
    return groups.length > 0 ? [groups[0].groupKey] : [];
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If user searched, auto-expand all folders
  useEffect(() => {
    if (searchActive && groups.length > 0) {
      setExpandedGroupKeys(groups.map((g) => g.groupKey));
    }
  }, [searchActive, groups]);

  const toggleGroup = (key: string) => {
    setExpandedGroupKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const expandAll = () => {
    setExpandedGroupKeys(groups.map((g) => g.groupKey));
  };

  const collapseAll = () => {
    setExpandedGroupKeys([]);
  };

  const handleCopy = (report: GeneratedReport) => {
    if (onCopyReport) {
      onCopyReport(report);
    } else {
      const text = report.generatedText || report.reportText || report.teacherNotes || "";
      if (text && navigator?.clipboard) {
        navigator.clipboard.writeText(text);
      }
    }
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (groups.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
        <FolderArchive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="font-bold text-slate-600">
          {isArabic ? "لا توجد تقارير في الأرشيف حتى الآن." : "No archived reports yet."}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {isArabic
            ? "عند انتهاء أي شهر أو باقة، ستدخل تقاريرها تلقائياً إلى مجلد الأرشيف الخاص بها."
            : "When a month or package ends, its reports are organized into its archive folder."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-slate-500">
          {isArabic
            ? `مجلدات الأرشيف (${groups.length} فترات/شهور منتهية)`
            : `Archive Folders (${groups.length} ended cycles/months)`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
          >
            {isArabic ? "فتح الكل" : "Expand All"}
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition"
          >
            {isArabic ? "طي الكل" : "Collapse All"}
          </button>
        </div>
      </div>

      {/* Folders List */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGroupKeys.includes(group.groupKey);

          return (
            <div
              key={group.groupKey}
              className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200"
            >
              {/* Folder Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.groupKey)}
                className="w-full p-3.5 bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-3 text-start transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                    <FolderArchive className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      {isArabic ? group.groupNameAr : group.groupNameEn}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isArabic
                        ? `محفوظات منتهية تشمل (${group.count}) تقرير`
                        : `Concluded cycle with (${group.count}) reports`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 bg-slate-900 text-amber-300 text-xs font-black rounded-full border border-slate-700 shadow-2xs">
                    {group.count} {isArabic ? "تقرير" : "reports"}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-600">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Folder Content: Reports List */}
              {isExpanded && (
                <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                  {group.reports.map((rep) => {
                    const reportDate = rep.date || rep.createdAt;
                    const reportText =
                      rep.generatedText || rep.reportText || rep.teacherNotes || "";

                    return (
                      <div
                        key={rep.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-purple-300 transition"
                      >
                        {/* Report Meta Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-black rounded-lg border border-purple-200/60 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              <span>{reportDate}</span>
                            </span>

                            {rep.lessonNumber !== undefined && (
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200/60">
                                {isArabic
                                  ? `حصة رقم ${rep.lessonNumber}`
                                  : `Lesson #${rep.lessonNumber}`}
                              </span>
                            )}

                            {rep.subject && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200/60">
                                {rep.subject}
                              </span>
                            )}

                            {rep.overallEvaluation && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200/60">
                                ⭐ {rep.overallEvaluation}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(rep)}
                              title={isArabic ? "نسخ التقرير" : "Copy Report"}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            >
                              {copiedId === rep.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Print button */}
                            {onPrintReport && (
                              <button
                                type="button"
                                onClick={() => onPrintReport(rep)}
                                title={isArabic ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* WhatsApp share */}
                            {onShareWhatsApp && (
                              <button
                                type="button"
                                onClick={() => onShareWhatsApp(rep)}
                                title={isArabic ? "مشاركة عبر واتساب" : "Share WhatsApp"}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Restore to Active button */}
                            {onToggleArchiveReport && (
                              <button
                                type="button"
                                onClick={() => onToggleArchiveReport(rep.id)}
                                title={isArabic ? "استعادة للتقارير الحالية النشطة" : "Restore to Active"}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  {isArabic ? "استعادة للنشطة" : "Restore"}
                                </span>
                              </button>
                            )}

                            {/* Delete report */}
                            {onDeleteReport && (
                              <button
                                type="button"
                                onClick={() => onDeleteReport(rep.id)}
                                title={isArabic ? "حذف التقرير" : "Delete Report"}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Report Content Body */}
                        {reportText ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap select-text">
                            {reportText}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            {isArabic ? "لا يوجد نص تقرير محفوظ." : "No report text content."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
