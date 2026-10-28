import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  FileText,
  Sparkles,
  Info,
  Clock,
  Check,
  Hash,
  Plus,
  Copy,
  Trash2,
  Layers,
  BookOpen,
  Globe,
  Eraser
} from "lucide-react";
import {
  AppSettings,
  MonthlyReportTemplate,
  DEFAULT_DAILY_ANALYSIS_INSTRUCTIONS,
  DEFAULT_MONTHLY_REPORT_TEMPLATES,
  getEffectiveMonthlyReportSettings
} from "../types";
import { SmartStepMemory } from "../lib/smartStepMemory";

interface MonthlyReportSettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onBack: () => void;
  isArabic: boolean;
}

const SUBJECT_OPTIONS = [
  { value: "Quran, Arabic and Islamic Studies", labelAr: "Quran, Arabic and Islamic Studies (المجموعة الشاملة)", labelEn: "Quran, Arabic and Islamic Studies" },
  { value: "قرآن كريم", labelAr: "قرآن كريم (وتجويد)", labelEn: "Holy Qur'an & Tajweed" },
  { value: "لغة عربية", labelAr: "لغة عربية ونور البيان", labelEn: "Arabic Language & Noor Al-Bayan" },
  { value: "الدراسات الإسلامية", labelAr: "الدراسات الإسلامية", labelEn: "Islamic Studies" },
  { value: "نور البيان", labelAr: "نور البيان والتأسيس القرائي", labelEn: "Noor Al-Bayan Foundation" },
  { value: "all", labelAr: "عام (جميع المواد)", labelEn: "General (All Subjects)" }
];

export const MonthlyReportSettingsView: React.FC<MonthlyReportSettingsViewProps> = ({
  settings,
  onSaveSettings,
  onBack,
  isArabic
}) => {
  const effective = getEffectiveMonthlyReportSettings(settings);

  const [dailyAnalysisInstructions, setDailyAnalysisInstructions] = useState<string>(
    effective.dailyAnalysisInstructions
  );
  const [templates, setTemplates] = useState<MonthlyReportTemplate[]>(
    effective.templates || DEFAULT_MONTHLY_REPORT_TEMPLATES
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    effective.activeTemplateId || (effective.templates?.[0]?.id ?? DEFAULT_MONTHLY_REPORT_TEMPLATES[0].id)
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "cache_cleared">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(effective.updatedAt || null);

  // Sync state ONLY if settings prop updates with a newer save timestamp from cloud
  useEffect(() => {
    const eff = getEffectiveMonthlyReportSettings(settings);
    if (eff.updatedAt && eff.updatedAt !== lastSavedTime) {
      setDailyAnalysisInstructions(eff.dailyAnalysisInstructions);
      if (eff.templates && eff.templates.length > 0) {
        setTemplates(eff.templates);
      }
      if (eff.activeTemplateId) {
        setActiveTemplateId(eff.activeTemplateId);
      }
      setLastSavedTime(eff.updatedAt);
    }
  }, [settings, lastSavedTime]);

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) || templates[0] || DEFAULT_MONTHLY_REPORT_TEMPLATES[0];

  const updateActiveTemplate = (patch: Partial<MonthlyReportTemplate>) => {
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.id === activeTemplate.id
          ? { ...tpl, ...patch, updatedAt: new Date().toISOString() }
          : tpl
      )
    );
  };

  const handleAddTemplate = () => {
    const newId = `tpl_custom_${Date.now()}`;
    const newTpl: MonthlyReportTemplate = {
      id: newId,
      name: isArabic ? `قالب مخصص جديد (${templates.length + 1})` : `New Custom Template (${templates.length + 1})`,
      subject: "all",
      lang: "en",
      instructions: activeTemplate?.instructions || DEFAULT_MONTHLY_REPORT_TEMPLATES[0].instructions,
      updatedAt: new Date().toISOString()
    };
    setTemplates((prev) => [...prev, newTpl]);
    setActiveTemplateId(newId);
  };

  const handleDuplicateTemplate = () => {
    if (!activeTemplate) return;
    const newId = `tpl_copy_${Date.now()}`;
    const copyTpl: MonthlyReportTemplate = {
      ...activeTemplate,
      id: newId,
      name: isArabic ? `${activeTemplate.name} (نسخة)` : `${activeTemplate.name} (Copy)`,
      isDefault: false,
      updatedAt: new Date().toISOString()
    };
    setTemplates((prev) => [...prev, copyTpl]);
    setActiveTemplateId(newId);
  };

  const handleDeleteTemplate = (idToDelete: string) => {
    if (templates.length <= 1) return;
    const remaining = templates.filter((t) => t.id !== idToDelete);
    setTemplates(remaining);
    if (activeTemplateId === idToDelete) {
      setActiveTemplateId(remaining[0].id);
    }
  };

  const handleClearSavedAnalyses = () => {
    SmartStepMemory.clearMonthlyReportCache();
    setSaveStatus("cache_cleared");
    setTimeout(() => {
      setSaveStatus("idle");
    }, 3000);
  };

  const hasChanges =
    dailyAnalysisInstructions !== effective.dailyAnalysisInstructions ||
    activeTemplateId !== effective.activeTemplateId ||
    JSON.stringify(templates) !== JSON.stringify(effective.templates);

  const handleSave = () => {
    const nowIso = new Date().toISOString();
    const currentActive = templates.find((t) => t.id === activeTemplateId) || templates[0];
    SmartStepMemory.clearMonthlyReportCache();

    const updatedSettings: AppSettings = {
      ...settings,
      monthlyReportSettings: {
        dailyAnalysisInstructions: dailyAnalysisInstructions.trim(),
        monthlyTemplateInstructions: currentActive.instructions.trim(),
        templates,
        activeTemplateId: currentActive.id,
        updatedAt: nowIso
      }
    };

    onSaveSettings(updatedSettings);
    setLastSavedTime(nowIso);
    setSaveStatus("saved");

    setTimeout(() => {
      setSaveStatus("idle");
    }, 3500);
  };

  const handleResetToDefaults = () => {
    const defaultTemplates = DEFAULT_MONTHLY_REPORT_TEMPLATES.map((t) => ({ ...t }));
    setDailyAnalysisInstructions(DEFAULT_DAILY_ANALYSIS_INSTRUCTIONS);
    setTemplates(defaultTemplates);
    setActiveTemplateId(defaultTemplates[0].id);
    SmartStepMemory.clearMonthlyReportCache();
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return isArabic ? "لم يتم التعديل بعد (القيم الافتراضية)" : "Never modified (Using defaults)";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 animate-fadeIn" dir={isArabic ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 md:p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 hover:text-white transition-all duration-200 border border-slate-600/50 shadow-sm flex items-center gap-1.5 cursor-pointer"
              title={isArabic ? "العودة للتقرير الشهري" : "Back to Monthly Report"}
            >
              {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span className="text-sm font-semibold">{isArabic ? "العودة" : "Back"}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-6 h-6 text-emerald-400" />
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {isArabic ? "إعدادات التقرير الشهري ومكتبة القوالب" : "Monthly Report Settings & Templates"}
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                {isArabic
                  ? "اعتماد كامل 100% على تعليمات التحليل، ومكتبة قوالب متعددة ثابتة الهيكل قابلة للتخصيص لكل مادة"
                  : "100% instruction-driven daily report analysis & multi-template library per subject"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleClearSavedAnalyses}
              className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 text-xs md:text-sm font-medium border border-rose-700/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={isArabic ? "مسح أي تحليلات شهرية مؤقتة" : "Purge cached monthly analyses"}
            >
              <Eraser className="w-4 h-4 text-rose-400" />
              <span>
                {saveStatus === "cache_cleared"
                  ? isArabic
                    ? "تم مسح التحليلات المحفوظة ✓"
                    : "Purged ✓"
                  : isArabic
                  ? "تصفير التحليلات المحفوظة"
                  : "Clear Cached Analysis"}
              </span>
            </button>

            <button
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs md:text-sm font-medium border border-slate-600/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={isArabic ? "استعادة القيم الافتراضية" : "Restore Defaults"}
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>{isArabic ? "الافتراضيات" : "Restore Defaults"}</span>
            </button>

            <button
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                saveStatus === "saved"
                  ? "bg-emerald-600 text-white shadow-emerald-900/30 scale-102"
                  : hasChanges
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20 active:scale-98 ring-2 ring-emerald-400/50"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200"
              }`}
            >
              {saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{isArabic ? "تم الحفظ بنجاح!" : "Saved Successfully!"}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? "حفظ الإعدادات والقوالب" : "Save Settings & Templates"}</span>
                  {hasChanges && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync & Persistence Badge */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {isArabic ? "آخر تحديث محفوظ:" : "Last Saved:"} {formatTimestamp(lastSavedTime)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>
              {isArabic
                ? "تم إلغاء جميع التحليلات المسبقة المحفوظة — يعتمد النظام حصرياً على التعليمات أدناه"
                : "Pre-saved monthly analysis disabled — relies 100% on instructions below"}
            </span>
          </div>
        </div>

        {/* Section 1: Daily Reports Analysis Instructions */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                  {isArabic ? "المرحلة الأولى (المصدر الوحيد للتحليل)" : "Stage 1 (Sole Analysis Source)"}
                </span>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>Daily Reports Analysis Instructions</span>
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                {isArabic
                  ? "التعليمات الوحيدة التي يعتمد عليها النظام لتحليل التقارير اليومية واستخراج معلومات التقرير الشهري (بدون أي قوالب تحليل مسبقة محفوظة)."
                  : "The sole directives used to analyze daily student reports and extract monthly findings."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {dailyAnalysisInstructions.length} {isArabic ? "حرف" : "chars"} |{" "}
                {dailyAnalysisInstructions.trim().split(/\s+/).filter(Boolean).length} {isArabic ? "كلمة" : "words"}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isArabic ? "كيف يعمل نظام التحليل الآن؟" : "How does the analysis engine work now?"}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pr-2 pl-2">
              <li>{isArabic ? "تم حذف جميع التحليلات المسبقة المحفوظة والقواعد الجامدة التي كانت تفرض تقسيمات ثابتة قبل الذكاء الاصطناعي." : "All pre-saved monthly analysis caches and rigid pre-filters have been removed."}</li>
              <li>{isArabic ? "يقرأ الذكاء الاصطناعي جميع التقارير اليومية للطالب في الشهر المحدد ويطبق تعليماتك المكتوبة هنا حرفياً." : "The AI reads all daily reports for the student in the selected month and applies your instructions below literally."}</li>
            </ul>
          </div>

          <div className="relative">
            <textarea
              value={dailyAnalysisInstructions}
              onChange={(e) => setDailyAnalysisInstructions(e.target.value)}
              rows={11}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all leading-relaxed"
              placeholder={isArabic ? "اكتب تعليمات تحليل التقارير اليومية هنا..." : "Write daily analysis directives here..."}
            />
          </div>
        </div>

        {/* Section 2: Monthly Report Templates Library */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-lg space-y-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                  {isArabic ? "المرحلة الثانية (مكتبة القوالب المتعددة)" : "Stage 2 (Multi-Template Library)"}
                </span>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-400" />
                  <span>{isArabic ? "مكتبة قوالب التقرير الشهري (Monthly Report Templates)" : "Monthly Report Templates Library"}</span>
                </h2>
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                {isArabic
                  ? "صمم واحفظ قوالب متعددة (قالب لكل مادة أو قالب موحد) واستخدم القالب لأكثر من مرة مع التزام حرفي بهيكله وعناوينه دون أن يتغير شكله العام."
                  : "Create and save multiple templates linked to specific subjects. Reports strictly adhere to the selected template's headings and layout."}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddTemplate}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isArabic ? "إنشاء قالب جديد" : "New Template"}</span>
              </button>

              <button
                type="button"
                onClick={handleDuplicateTemplate}
                className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-600 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>{isArabic ? "تكرار القالب" : "Duplicate"}</span>
              </button>
            </div>
          </div>

          {/* Saved Templates Grid Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {templates.map((tpl) => {
              const isSelected = tpl.id === activeTemplate.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplateId(tpl.id)}
                  className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/30 shadow-md"
                      : "bg-slate-900/70 border-slate-700/80 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                      {tpl.name}
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 font-black text-[10px] shrink-0">
                        {isArabic ? "محدد" : "Active"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-300">
                    <span className="truncate flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{tpl.subject === "all" ? (isArabic ? "جميع المواد" : "All Subjects") : tpl.subject}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] uppercase">
                        {tpl.lang}
                      </span>
                      {templates.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          title={isArabic ? "حذف القالب" : "Delete Template"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Template Metadata Editor (Name, Linked Subject, Output Language) */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-bold text-sky-300 mb-1.5">
                  {isArabic ? "اسم القالب (لحفظه والرجوع إليه):" : "Template Name:"}
                </label>
                <input
                  type="text"
                  value={activeTemplate.name}
                  onChange={(e) => updateActiveTemplate({ name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder={isArabic ? "مثال: قالب القرآن الكريم الشامل" : "e.g. Comprehensive Quran Template"}
                />
              </div>

              {/* Linked Subject */}
              <div>
                <label className="block text-xs font-bold text-sky-300 mb-1.5">
                  {isArabic ? "المادة المرتبطة بهذا القالب:" : "Linked Subject:"}
                </label>
                <select
                  value={
                    SUBJECT_OPTIONS.some((o) => o.value === activeTemplate.subject)
                      ? activeTemplate.subject
                      : "custom"
                  }
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      updateActiveTemplate({ subject: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isArabic ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                  {!SUBJECT_OPTIONS.some((o) => o.value === activeTemplate.subject) && (
                    <option value="custom">{activeTemplate.subject}</option>
                  )}
                </select>
              </div>

              {/* Template Language */}
              <div>
                <label className="block text-xs font-bold text-sky-300 mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isArabic ? "لغة إخراج هذا القالب:" : "Template Output Language:"}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveTemplate({ lang: "en" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeTemplate.lang === "en"
                        ? "bg-sky-500 text-slate-950 border-sky-400 shadow-sm"
                        : "bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveTemplate({ lang: "ar" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeTemplate.lang === "ar"
                        ? "bg-sky-500 text-slate-950 border-sky-400 shadow-sm"
                        : "bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    العربية (AR)
                  </button>
                </div>
              </div>
            </div>

            {/* Template Instructions Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>
                    {isArabic
                      ? `تعليمات وهيكل القالب المحدد (${activeTemplate.name}):`
                      : `Instructions & Exact Structure for (${activeTemplate.name}):`}
                  </span>
                </span>
                <span className="text-slate-400">
                  {activeTemplate.instructions.length} {isArabic ? "حرف" : "chars"}
                </span>
              </div>

              <textarea
                value={activeTemplate.instructions}
                onChange={(e) => updateActiveTemplate({ instructions: e.target.value })}
                rows={13}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all leading-relaxed"
                placeholder={
                  isArabic
                    ? "اكتب عنوان التقرير، وعناوين الأقسام بالترتيب الذي تريده أن يظهر حرفياً في التقرير..."
                    : "Specify the report title, exact section headings in order, and formatting instructions..."
                }
              />

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isArabic
                  ? "💡 نصيحة: يلتزم النظام حرفياً بالعناوين وترتيب الأقسام التي تكتبها هنا في كل من المعاينة (Step 1 & Step 2) وملف PDF وملف Word (DOCX) دون تغيير الشكل العام من طالب لآخر."
                  : "💡 Tip: The system strictly follows the exact section headings and sequence defined here across Preview, PDF, and Word DOCX."}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Mandatory Inviolable Accuracy Guardrails */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base md:text-lg font-bold text-amber-300">
                {isArabic ? "قواعد عامة إلزامية للدقة (غير قابلة للتجاوز)" : "Mandatory Inviolable Accuracy Guardrails"}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              {isArabic ? "حماية تلقائية في النظام" : "System-Level Enforcement"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <span>{isArabic ? "يمنع اختلاق أي معلومات أو إنجازات أو تقييمات أو واجبات لا تدعمها البيانات." : "Zero hallucination: Never invent Surahs, verses, topics, or homework."}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <span>{isArabic ? "لا تعتبر قراءة السورة أو تلاوتها دليلاً على حفظها." : "Reading or reciting a Surah in class is NEVER proof of memorization."}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <span>{isArabic ? "لا تعتبر تدريس القاعدة أو شرحها دليلاً على إتقانها." : "Teaching or explaining a rule is NEVER proof of student mastery."}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
              <span>{isArabic ? "لا تنشئ نسباً مئوية مثل 98% أو 100% إلا إذا كانت محسوبة من بيانات فعلية." : "Zero fake percentages: Follow strictly verified calculations."}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
              <span>{isArabic ? "لا تدّعِ تحسن الطالب خلال الشهر دون وجود بيانات كافية للمقارنة." : "Never claim student improvement without sequential comparative evidence."}</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">6</span>
              <span>{isArabic ? "لا تحذف المراجعات الحقيقية التي تمت في أيام مختلفة." : "Preserve distinct review sessions conducted on different days."}</span>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            {isArabic ? "إلغاء والعودة" : "Cancel & Return"}
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isArabic ? "حفظ الإعدادات والقوالب" : "Save Settings & Templates"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
