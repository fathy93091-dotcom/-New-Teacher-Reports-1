import React from "react";
import {
  ComprehensiveMonthlyReportData,
  isCleanValue,
  sanitizeComprehensiveMonthlyReportData,
  getReportSubtitle
} from "../../lib/monthlyReportModel";
import { IslamicHeader } from "./IslamicHeader";
import { IslamicFooter } from "./IslamicFooter";
import {
  Award,
  BookOpen,
  CheckCircle,
  Compass,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Target,
  MessageSquare,
  Calendar,
  CheckCircle2,
  BookmarkCheck,
  ShieldCheck
} from "lucide-react";

export type MonthlyReportFontScale = "normal" | "large" | "xlarge";

interface MonthlyReportDocumentProps {
  data: ComprehensiveMonthlyReportData;
  fontScale?: MonthlyReportFontScale;
}

interface IndicatorCardProps {
  label: string;
  sublabel?: string;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  isEn?: boolean;
  fontScale?: MonthlyReportFontScale;
  compact?: boolean;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({
  label,
  sublabel,
  percentage,
  color,
  icon,
  isEn = false,
  fontScale = "large",
  compact = false
}) => {
  const cleanPct = Math.min(100, Math.max(0, Math.round(percentage)));

  const getRating = (pct: number) => {
    if (pct >= 90) return isEn ? "Excellent" : "ممتاز (متقن)";
    if (pct >= 80) return isEn ? "Very Good" : "جيد جداً";
    if (pct >= 70) return isEn ? "Good" : "جيد";
    if (pct > 0) return isEn ? "In Progress" : "قيد المتابعة";
    return isEn ? "Not Specified" : "غير محدد";
  };

  if (compact) {
    return (
      <div
        dir={isEn ? "ltr" : "rtl"}
        className="w-full bg-white rounded-2xl border-2 border-[#E2D9C5] border-s-6 p-2.5 sm:p-3 shadow-xs flex flex-col justify-between gap-1.5"
        style={{ borderInlineStartColor: color }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FAF7EE] border border-[#E2D9C5] flex items-center justify-center text-[#0D4733] flex-shrink-0 shadow-xs">
              {icon}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-[#0D4733] leading-tight truncate">
                {label}
              </h4>
              {sublabel && (
                <p className="text-[10px] sm:text-[11px] text-[#52635A] mt-0.5 font-bold leading-tight truncate">
                  {sublabel}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-base sm:text-lg font-black text-[#0D4733] font-mono" style={{ unicodeBidi: "isolate" }}>
              {cleanPct}%
            </span>
            <span className="px-2 py-0.5 bg-[#0A3826] text-[#FDF0CD] text-[9.5px] sm:text-[10px] font-black rounded-full border border-[#D4AF37]">
              {getRating(cleanPct)}
            </span>
          </div>
        </div>
        {/* Full-width smooth horizontal progress bar */}
        <div className="w-full h-2 sm:h-2.5 bg-[#EFE8D6] rounded-full overflow-hidden mt-0.5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${cleanPct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  }

  const labelClass =
    fontScale === "xlarge"
      ? "text-2xl sm:text-3xl"
      : fontScale === "normal"
      ? "text-lg sm:text-xl"
      : "text-xl sm:text-2xl";

  const sublabelClass =
    fontScale === "xlarge"
      ? "text-base sm:text-lg"
      : fontScale === "normal"
      ? "text-xs sm:text-sm"
      : "text-sm sm:text-base";

  const pctClass =
    fontScale === "xlarge"
      ? "text-4xl sm:text-5xl"
      : fontScale === "normal"
      ? "text-2xl sm:text-3xl"
      : "text-3xl sm:text-4xl";

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="w-full bg-white rounded-2xl border-2 border-[#E2D9C5] border-s-8 p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-3"
      style={{ borderInlineStartColor: color }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FAF7EE] border border-[#E2D9C5] flex items-center justify-center text-[#0D4733] flex-shrink-0 shadow-xs">
            {icon}
          </div>
          <div>
            <h4 className={`${labelClass} font-black text-[#0D4733] leading-tight`}>
              {label}
            </h4>
            {sublabel && (
              <p className={`${sublabelClass} text-[#52635A] mt-1 font-bold leading-tight`}>
                {sublabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <span className={`${pctClass} font-black text-[#0D4733] font-mono`} style={{ unicodeBidi: "isolate" }}>
            {cleanPct}%
          </span>
          <span className="px-3.5 py-1.5 bg-[#0A3826] text-[#FDF0CD] text-xs sm:text-sm font-black rounded-full border border-[#D4AF37]">
            {getRating(cleanPct)}
          </span>
        </div>
      </div>
      {/* Full-width smooth horizontal progress bar */}
      <div className="w-full h-4 sm:h-5 bg-[#EFE8D6] rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${cleanPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const MonthlyReportDocument: React.FC<MonthlyReportDocumentProps> = ({
  data: rawData,
  fontScale = "large"
}) => {
  const data = sanitizeComprehensiveMonthlyReportData(rawData);
  const isEn = data.lang === "en";

  // Generously sized, high-contrast typography designed for effortless readability and exact A4 fit
  const bodyClass =
    fontScale === "xlarge"
      ? "text-lg sm:text-xl font-bold leading-relaxed text-[#1C2D24]"
      : fontScale === "normal"
      ? "text-sm sm:text-base font-bold leading-relaxed text-[#1C2D24]"
      : "text-base sm:text-lg font-bold leading-relaxed text-[#1C2D24]";

  const titleClass =
    fontScale === "xlarge"
      ? "text-2xl sm:text-3xl font-black text-[#0D4733]"
      : fontScale === "normal"
      ? "text-lg sm:text-xl font-black text-[#0D4733]"
      : "text-xl sm:text-2xl font-black text-[#0D4733]";

  const cardTitleClass =
    fontScale === "xlarge"
      ? "text-xl sm:text-2xl font-black text-[#0D4733]"
      : fontScale === "normal"
      ? "text-base sm:text-lg font-black text-[#0D4733]"
      : "text-lg sm:text-xl font-black text-[#0D4733]";

  // 1. Filter verified clean achievements
  const validAchievements = (data.achievements || []).filter(ach => isCleanValue(ach.content));

  // 2. Filter verified clean pedagogical points
  const validStrengths = (data.strengths || []).filter(st => isCleanValue(st));
  const validRecommendations = (data.recommendations || []).filter(rec => isCleanValue(rec));

  // 3. Filter verified clean curriculum completed items (100% omit empty / unmentioned items)
  const validCompletedItems = [
    {
      key: "newMemorization",
      label: isEn ? "New Memorization (Surahs & Verses)" : "الحفظ الجديد (السور والآيات)",
      content: data.completedItems.newMemorization,
      border: "border-s-[#0D4733]",
      badgeColor: "text-[#0D4733]"
    },
    {
      key: "revision",
      label: isEn ? "Revision & Reinforcement" : "المراجعة والتثبيت",
      content: data.completedItems.revision,
      border: "border-s-[#C59B27]",
      badgeColor: "text-[#C59B27]"
    },
    {
      key: "quranReading",
      label: isEn ? "Qur'an Reading & Recitation" : "تلاوة وقراءة القرآن الكريم",
      content: data.completedItems.quranReading,
      border: "border-s-[#15803D]",
      badgeColor: "text-[#15803D]"
    },
    {
      key: "noorAlBayan",
      label: isEn ? "Noor Al-Bayan & Foundation Lessons" : "دروس نور البيان والتأسيس",
      content: data.completedItems.noorAlBayan,
      border: "border-s-[#0D4733]",
      badgeColor: "text-[#0D4733]"
    },
    {
      key: "tajweedRules",
      label: isEn ? "New Tajweed Rules Applied" : "أحكام التجويد المطبقة",
      content: data.completedItems.tajweedRules,
      border: "border-s-[#C59B27]",
      badgeColor: "text-[#C59B27]"
    },
    {
      key: "islamicStudies",
      label: isEn ? "Islamic Studies Lessons" : "دروس الدراسات الإسلامية",
      content: data.completedItems.islamicStudies,
      border: "border-s-[#15803D]",
      badgeColor: "text-[#15803D]"
    }
  ].filter(item => isCleanValue(item.content));

  // 4. Goals & future plan items
  const validGoals = (data.nextMonthGoals || []).filter(g => isCleanValue(g));
  const hasInteraction = isCleanValue(data.studentInteraction);
  const hasPlan = isCleanValue(data.expectedNextMonthPlan);

  // Build the array of dynamic page definitions
  interface PageDefinition {
    id: string;
    titleAr: string;
    titleEn: string;
    render: () => React.ReactNode;
  }

  const pages: PageDefinition[] = [];

  // =========================================================================
  // LITERAL TEMPLATE RENDERING ENGINE (الالتزام الحرفي بهيكل وعناوين القالب المحدد)
  // =========================================================================
  if (data.templateSections && data.templateSections.length > 0) {
    const sections = data.templateSections;
    // Chunk sections cleanly across A4 pages: up to 3 sections on Page 1 (which includes IslamicHeader),
    // and up to 4 sections on subsequent pages so each A4 page stays well-proportioned.
    const chunks: typeof sections[] = [];
    if (sections.length <= 4) {
      chunks.push(sections);
    } else {
      chunks.push(sections.slice(0, 3));
      for (let i = 3; i < sections.length; i += 4) {
        chunks.push(sections.slice(i, i + 4));
      }
    }

    chunks.forEach((chunk, pageIdx) => {
      const isFirstPage = pageIdx === 0;
      const isLastPage = pageIdx === chunks.length - 1;
      const borderColors = [
        "border-s-[#0D4733]",
        "border-s-[#C59B27]",
        "border-s-[#15803D]",
        "border-s-[#0A3826]"
      ];

      pages.push({
        id: `template-page-${pageIdx + 1}`,
        titleAr: chunk[0]?.title || "التقرير الشهري",
        titleEn: chunk[0]?.title || "Monthly Report",
        render: () => (
          <div className="flex-1 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3.5">
              {isFirstPage ? (
                <IslamicHeader
                  studentName={data.studentName}
                  monthLabel={data.monthLabel}
                  teacherName={data.teacherName}
                  isEn={isEn}
                  reportTitle={data.templateTitle}
                  subtitle={data.templateSubtitle || getReportSubtitle(data.activeSubjects, isEn)}
                />
              ) : (
                <div className="w-full bg-[#0A3826] text-white rounded-2xl p-3.5 sm:p-4 border-2 border-[#C59B27] flex items-center justify-between shadow-xs">
                  <span className="text-xs sm:text-sm font-bold text-[#D4AF37]">
                    {data.studentName} • {data.monthLabel}
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-[#FDF0CD]">
                    {data.templateTitle || (isEn ? "MONTHLY LEARNING PROGRESS REPORT" : "تقرير التقدم التعليمي الشهري")}
                  </h2>
                </div>
              )}

              <div className="flex flex-col gap-3.5">
                {chunk.map((sec, secIdx) => {
                  const borderColor = borderColors[(pageIdx * 3 + secIdx) % borderColors.length];
                  return (
                    <section
                      key={secIdx}
                      dir={isEn ? "ltr" : "rtl"}
                      className={`w-full bg-white rounded-2xl border-2 border-[#E2D9C5] border-s-8 ${borderColor} p-4 sm:p-5 shadow-xs flex flex-col gap-2`}
                    >
                      <div className="flex items-center gap-2.5 pb-2 border-b border-[#F0EBE0]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C59B27] flex-shrink-0" />
                        <h3 className={cardTitleClass} style={{ unicodeBidi: "isolate" }}>
                          {sec.title}
                        </h3>
                      </div>

                      {sec.content && sec.content.trim() && (
                        <p
                          dir={isEn ? "ltr" : "rtl"}
                          className={`${bodyClass} whitespace-pre-line`}
                          style={{ unicodeBidi: "isolate", wordBreak: "normal" }}
                        >
                          {sec.content}
                        </p>
                      )}

                      {Array.isArray(sec.bullets) && sec.bullets.length > 0 && (
                        <ul className="space-y-2 mt-1">
                          {sec.bullets.map((b, bIdx) => (
                            <li
                              key={bIdx}
                              dir={isEn ? "ltr" : "rtl"}
                              className="flex items-start gap-2.5"
                            >
                              <CheckCircle className="w-5 h-5 text-[#0D4733] flex-shrink-0 mt-1" />
                              <span className={bodyClass} style={{ unicodeBidi: "isolate" }}>
                                {b}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            {isLastPage && <IslamicFooter teacherName={data.teacherName} isEn={isEn} />}
          </div>
        )
      });
    });

    const totalTemplatePages = pages.length;

    return (
      <div
        id="monthly-report-printable"
        className="w-full flex flex-col gap-10 items-center selection:bg-[#D4AF37]/30"
      >
        {pages.map((page, idx) => (
          <article
            key={page.id}
            id={`monthly-report-page-${idx + 1}`}
            dir={isEn ? "ltr" : "rtl"}
            className={`monthly-report-page w-full max-w-[794px] bg-[#FAF7EE] text-[#1C2D24] rounded-3xl border-2 border-[#D4AF37]/50 shadow-2xl p-5 sm:p-6 pb-6 relative flex flex-col justify-between ${
              isEn ? "text-left" : "text-right"
            }`}
            style={{ minHeight: "1123px", width: "100%", maxWidth: "794px", boxSizing: "border-box" }}
          >
            <div className="absolute inset-0 pointer-events-none border-8 border-[#FAF7EE] rounded-3xl" />
            <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#D4AF37]/25 rounded-2xl" />

            <div className="relative z-10 flex-1 flex flex-col justify-between">
              {page.render()}
            </div>

            <div className="relative z-10 mt-6 pt-3.5 border-t border-[#E2D9C5] flex items-center justify-between text-xs sm:text-sm font-bold text-[#52635A]">
              <span className="text-[#0D4733]">
                {data.activeTemplateName || (isEn ? "Academic Evaluation Portal" : "منظومة التقييم والمتابعة")}
              </span>
              <span className="text-[#C59B27]">
                {isEn
                  ? `Page ${idx + 1} of ${totalTemplatePages}`
                  : `الصفحة ${idx + 1} من ${totalTemplatePages}`}
              </span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  // =========================================================================
  // PAGE 1: Student Accomplishments & Achievements (عناصر الإنجاز في الصفحة الأولى)
  // =========================================================================
  const normalizeCategoryKey = (key?: string, title?: string): string => {
    const k = (key || "").trim().toLowerCase();
    const t = (title || "").trim().toLowerCase();
    if (k === "newmemorization" || /حفظ|memoriz/i.test(t)) return "newMemorization";
    if (k === "revision" || /مراجعة|تثبيت|revis|review/i.test(t)) return "revision";
    if (k === "nooralbayan" || /نور البيان|noor/i.test(t)) return "noorAlBayan";
    if (k === "tajweedrules" || /تجويد|tajweed/i.test(t)) return "tajweedRules";
    if (k === "islamicstudies" || /إسلامية|دراسات|islamic/i.test(t)) return "islamicStudies";
    if (k === "quranreading" || k === "recitationandfoundation" || /تلاوة|قراءة|reading|recit/i.test(t)) return "quranReading";
    return k || t;
  };

  const combinedAchievementsList = [
    ...validAchievements.map(ach => ({
      ...ach,
      _normCat: normalizeCategoryKey(ach.categoryKey, ach.titleAr || ach.titleEn)
    })),
    ...validCompletedItems.map(it => ({
      categoryKey: it.key as any,
      titleAr: it.label,
      titleEn: it.label,
      content: it.content,
      evaluation: isEn ? "Completed" : "تم الإنجاز",
      _normCat: normalizeCategoryKey(it.key, it.label)
    }))
  ];

  const uniqueAchievements = combinedAchievementsList.filter(
    (item, index, self) =>
      index ===
      self.findIndex(
        t =>
          (t._normCat && item._normCat && t._normCat === item._normCat) ||
          t.titleAr === item.titleAr ||
          (t.content && item.content && t.content.trim() === item.content.trim())
      )
  );

  const isCompactFirstPage = uniqueAchievements.length >= 4;

  pages.push({
    id: "student-accomplishments-first-page",
    titleAr: "إنجازات الطالب والدروس المنجزة",
    titleEn: "Student Accomplishments",
    render: () => (
      <div className="flex-1 flex flex-col justify-start gap-3.5">
        {/* 1. Official Header at top of Page 1 */}
        <IslamicHeader
          studentName={data.studentName}
          monthLabel={data.monthLabel}
          teacherName={data.teacherName}
          isEn={isEn}
          subtitle={getReportSubtitle(data.activeSubjects, isEn)}
        />

        {/* 2. Banner */}
        <div className="w-full bg-[#0A3826] text-white rounded-2xl p-3 sm:p-3.5 border-2 border-[#C59B27] flex items-center justify-between shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
            {isEn ? "Monthly Accomplishments" : "منظومة التقييم والمتابعة"}
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#FDF0CD]">
            {isEn ? "Completed Curriculum & Accomplishments" : "إنجازات هذا الشهر والدروس المنجزة"}
          </h2>
        </div>

        {/* 3. Recorded Accomplishments List */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 mb-0.5">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#C59B27] flex-shrink-0" />
            <h3 className={`${titleClass} tracking-normal`}>
              {isEn ? "RECORDED ACHIEVEMENTS & CURRICULUM" : "تفاصيل ما أنجزه الطالب من حفظ ومراجعة ودروس"}
            </h3>
          </div>

          {uniqueAchievements.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border-2 border-[#E2D9C5] text-center text-[#52635A] font-bold text-base">
              {isEn
                ? "Excellent progress across all scheduled monthly curriculum sessions."
                : "تمت متابعة وحضور الحصص المقررة وإنجاز المنهج المخصص لهذا الشهر بنجاح."}
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${uniqueAchievements.length >= 5 ? "sm:grid-cols-2" : ""} gap-2.5`}>
              {uniqueAchievements.map((ach, idx) => (
                <div
                  key={idx}
                  dir={isEn ? "ltr" : "rtl"}
                  className={`w-full bg-white rounded-2xl border-2 border-[#E2D9C5] border-s-8 border-s-[#C59B27] ${
                    isCompactFirstPage ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4"
                  } shadow-xs flex flex-col justify-between gap-1.5`}
                >
                  <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-[#F0EBE0]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D4733] flex-shrink-0" />
                      <h4 className={cardTitleClass}>
                        {isEn ? ach.titleEn : ach.titleAr}
                      </h4>
                    </div>
                    {ach.evaluation && (
                      <span className="px-2.5 py-0.5 bg-[#0A3826] text-[#FDF0CD] text-xs font-black rounded-full border border-[#D4AF37] flex-shrink-0">
                        {ach.evaluation}
                      </span>
                    )}
                  </div>
                  <p
                    dir={isEn ? "ltr" : "rtl"}
                    className={bodyClass}
                    style={{ unicodeBidi: "isolate", wordBreak: "normal" }}
                  >
                    {ach.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  });

  // =========================================================================
  // PAGE 2: Performance Indicators & Mastery (البطاقات البيانية في الصفحة الثانية)
  // تظهر حصراً البطاقات البيانية للأقسام المذكورة والمدروسة فعلياً في التقارير اليومية
  // =========================================================================
  const activeIndicatorCards: {
    id: string;
    label: string;
    sublabel: string;
    percentage: number;
    color: string;
    icon: React.ReactNode;
  }[] = [];

  const hasHefzData = Boolean(isCleanValue(data.completedItems.newMemorization));
  if (data.indicators.memorization > 0 && hasHefzData) {
    activeIndicatorCards.push({
      id: "memorization",
      label: isEn ? "New Memorization" : "الحفظ الجديد",
      sublabel: isEn ? "Retention Rate & Mastery" : "معدل الاستيعاب والإتقان",
      percentage: data.indicators.memorization,
      color: "#0D4733",
      icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
    });
  }

  const hasRevisionData = Boolean(isCleanValue(data.completedItems.revision));
  if (data.indicators.revision > 0 && hasRevisionData) {
    activeIndicatorCards.push({
      id: "revision",
      label: isEn ? "Revision & Recall" : "قوة المراجعة والتثبيت",
      sublabel: isEn ? "Recall Strength & Stability" : "جودة الاستحضار والتمكين",
      percentage: data.indicators.revision,
      color: "#C59B27",
      icon: <BookmarkCheck className="w-5 h-5 sm:w-6 sm:h-6" />
    });
  }

  const hasTajweed = Boolean(isCleanValue(data.completedItems.tajweedRules));
  const hasReading = Boolean(isCleanValue(data.completedItems.quranReading));
  const hasNoor = Boolean(isCleanValue(data.completedItems.noorAlBayan));
  const hasTajweedOrFoundationData = hasTajweed || hasReading || hasNoor;

  if (data.indicators.tajweedAndFoundation > 0 && hasTajweedOrFoundationData) {
    let tajweedLabel = isEn ? "Tajweed & Foundation" : "التجويد والتأسيس";
    let tajweedSub = isEn ? "Practical Recitation Rules" : "التطبيق العملي لأحكام التلاوة";
    if (hasNoor && !hasTajweed && !hasReading) {
      tajweedLabel = isEn ? "Noor Al-Bayan & Foundation" : "نور البيان والتأسيس";
      tajweedSub = isEn ? "Phonetic & Reading Drills" : "التهجي القرائي والتأسيس السليم";
    } else if (!hasNoor && (hasTajweed || hasReading)) {
      tajweedLabel = isEn ? "Recitation & Tajweed" : "التلاوة وأحكام التجويد";
      tajweedSub = isEn ? "Pronunciation & Rules Applied" : "مخارج الحروف وأحكام التلاوة";
    }

    activeIndicatorCards.push({
      id: "tajweedAndFoundation",
      label: tajweedLabel,
      sublabel: tajweedSub,
      percentage: data.indicators.tajweedAndFoundation,
      color: "#15803D",
      icon: <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
    });
  }

  const hasIslamicData = Boolean(isCleanValue(data.completedItems.islamicStudies));
  if ((data.indicators.islamicStudies || 0) > 0 && hasIslamicData) {
    activeIndicatorCards.push({
      id: "islamicStudies",
      label: isEn ? "Islamic Studies" : "الدراسات الإسلامية",
      sublabel: isEn ? "Manners & Core Lessons" : "الآداب والموضوعات التربوية",
      percentage: data.indicators.islamicStudies!,
      color: "#0A3826",
      icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />
    });
  }

  if (data.indicators.commitment > 0) {
    activeIndicatorCards.push({
      id: "commitment",
      label: isEn ? "Commitment & Discipline" : "الالتزام والحضور",
      sublabel: isEn ? "Punctuality & Homework" : "الانضباط وحل الواجبات",
      percentage: data.indicators.commitment,
      color: "#0D4733",
      icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
    });
  }

  const hasSubjectNumericScores = activeIndicatorCards.some(c => c.id !== "commitment" && c.percentage > 0);
  const avgMastery = activeIndicatorCards.length > 0
    ? Math.round(activeIndicatorCards.reduce((sum, c) => sum + c.percentage, 0) / activeIndicatorCards.length)
    : (data.indicators.commitment > 0 ? data.indicators.commitment : 0);

  pages.push({
    id: "overview-indicators-page-two",
    titleAr: "مؤشرات الأداء والإتقان",
    titleEn: "Performance Indicators",
    render: () => (
      <div className="flex-1 flex flex-col justify-between gap-5">
        {/* Page 2 Top Header Banner */}
        <div className="w-full bg-[#0A3826] text-white rounded-2xl p-4 sm:p-5 border-2 border-[#C59B27] flex items-center justify-between shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
            {isEn ? "Mastery & Performance Evaluation" : "منظومة التقييم والمتابعة"}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-[#FDF0CD]">
            {isEn ? "Performance Indicators & Mastery Rates" : "مؤشرات الأداء التعليمي ومعدلات الإتقان"}
          </h2>
        </div>

        {/* 2. Performance Indicators Section (البطاقات البيانية للأقسام المعتمدة فقط) */}
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-[#C59B27] flex-shrink-0" />
              <h3 className={`${titleClass} tracking-normal`}>
                {isEn ? "VERIFIED PERFORMANCE INDICATORS" : "المؤشرات التعليمية الفعلية ومستوى التحصيل"}
              </h3>
            </div>
            <span className="px-3 py-1 bg-[#0A3826] text-[#FDF0CD] text-xs sm:text-sm font-black rounded-full border border-[#D4AF37]">
              {isEn ? "Mastery Evaluation" : "تقييم التمكن"}
            </span>
          </div>

          {activeIndicatorCards.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border-2 border-[#E2D9C5] text-center text-[#52635A] font-bold text-base">
              {isEn ? "Active performance indicators are recorded according to daily lesson evaluations." : "تُعرض المؤشرات التعليمية استناداً إلى التقييمات اليومية الفعلية."}
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${activeIndicatorCards.length >= 2 ? "sm:grid-cols-2" : ""} gap-3.5 sm:gap-4`}>
              {activeIndicatorCards.map(card => (
                <IndicatorCard
                  key={card.id}
                  label={card.label}
                  sublabel={card.sublabel}
                  percentage={card.percentage}
                  color={card.color}
                  icon={card.icon}
                  isEn={isEn}
                  fontScale={fontScale}
                />
              ))}
            </div>
          )}
        </section>

        {/* 3. Monthly Study Summary & Overall Mastery Banner */}
        <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#C59B27] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0A3826] text-[#FDF0CD] flex items-center justify-center font-black text-xl shadow-xs flex-shrink-0">
              {avgMastery > 0 ? `${avgMastery}%` : "✦"}
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-[#0D4733] leading-tight">
                {avgMastery > 0
                  ? (isEn ? "Overall Monthly Mastery Rate" : "المعدل العام للإتقان والتحصيل الشهري")
                  : (isEn ? "Qualitative Monthly Evaluation" : "التقييم النوعي والوصفي للشهر")}
              </h4>
              <p className="text-xs sm:text-sm text-[#52635A] font-bold mt-0.5">
                {avgMastery > 0
                  ? hasSubjectNumericScores
                    ? (isEn ? "Calculated from verified lesson scores and attendance metrics" : "معادلة الاحتساب: متوسط درجات الحصص المسجلة ومؤشر الالتزام")
                    : (isEn ? "Formula: (Attendance Rate × 70%) + (Homework Rate × 30%)" : "معادلة الاحتساب: (نسبة الحضور × 70%) + (نسبة الواجبات × 30%)")
                  : (isEn ? "Based on continuous qualitative observation from daily teacher notes" : "مستند إلى الملاحظة الوصفية والتقييم النوعي المستمر من المعلم")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-[#FAF7EE] text-[#0D4733] border border-[#D4AF37]/50 rounded-xl text-xs sm:text-sm font-black">
              {avgMastery >= 90
                ? isEn ? "⭐ High Distinction" : "⭐ امتياز فائق"
                : avgMastery >= 80
                ? isEn ? "✨ Very Good" : "✨ جيد جداً مرتفع"
                : avgMastery > 0
                ? isEn ? "Good Progress" : "تقدم طيب"
                : isEn ? "Consistent Attendance" : "حضور ومتابعة مستمرة"}
            </span>
          </div>
        </section>
      </div>
    )
  });

  // =========================================================================
  // PAGE 3: Standalone Strengths & Pedagogical Recommendations
  // =========================================================================
  pages.push({
    id: "pedagogical-directives-standalone",
    titleAr: "نقاط القوة والتوصيات التربوية",
    titleEn: "Strengths & Recommendations",
    render: () => (
      <div className="flex-1 flex flex-col justify-start gap-6">
        <div className="w-full bg-[#0A3826] text-white rounded-2xl p-5 border-2 border-[#C59B27] flex items-center justify-between shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
            {isEn ? "Pedagogical Directives & Guidance" : "التوجيه التربوي والتميز"}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-[#FDF0CD]">
            {isEn ? "Strengths & Pedagogical Recommendations" : "نقاط القوة والتوصيات التربوية"}
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          {/* STRENGTHS */}
          {validStrengths.length > 0 ? (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#15803D] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-4 border-b border-[#F0EBE0] pb-3">
                <Sparkles className="w-7 h-7 text-[#15803D] flex-shrink-0" />
                <h3 className={cardTitleClass}>
                  {isEn ? "STRENGTHS & HIGHLIGHTS" : "نقاط القوة والتميز"}
                </h3>
              </div>
              <ul className="space-y-3.5">
                {validStrengths.map((st, i) => (
                  <li key={i} className="flex items-start gap-3.5" dir={isEn ? "ltr" : "rtl"}>
                    <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#15803D] flex-shrink-0 mt-0.5" />
                    <span className={bodyClass} style={{ unicodeBidi: "isolate" }}>{st}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#15803D] p-6 sm:p-7 shadow-xs text-center text-[#52635A]">
              <p className={bodyClass}>{isEn ? "Excellent general performance across recorded sessions." : "أداء عام متميز والتزام طيب خلال حصص الشهر."}</p>
            </section>
          )}

          {/* RECOMMENDATIONS */}
          {validRecommendations.length > 0 && (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#C59B27] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-4 border-b border-[#F0EBE0] pb-3">
                <Lightbulb className="w-7 h-7 text-[#C59B27] flex-shrink-0" />
                <h3 className={cardTitleClass}>
                  {isEn ? "PEDAGOGICAL RECOMMENDATIONS" : "التوصيات والتوجيهات التربوية"}
                </h3>
              </div>
              <ul className="space-y-3.5">
                {validRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3.5" dir={isEn ? "ltr" : "rtl"}>
                    <span className="text-[#C59B27] font-black text-3xl leading-none flex-shrink-0 mt-0.5">•</span>
                    <span className={bodyClass} style={{ unicodeBidi: "isolate" }}>{rec}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    )
  });

  // =========================================================================
  // PAGE 4: Standalone Future Plan & Closing
  // =========================================================================
  pages.push({
    id: "future-plan-endorsement-standalone",
    titleAr: "الخطة المستقبلية والختام",
    titleEn: "Future Plan & Closing",
    render: () => (
      <div className="flex-1 flex flex-col justify-between gap-6">
        <div className="w-full bg-[#0A3826] text-white rounded-2xl p-5 border-2 border-[#C59B27] flex items-center justify-between shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
            {isEn ? "Future Trajectory & Goals" : "المسار المستقبلي والأهداف"}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-[#FDF0CD]">
            {isEn ? "Next Month Plan & Goals" : "الخطة المستقبلية وأهداف الشهر القادم"}
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {/* 1. NEXT MONTH GOALS */}
          {validGoals.length > 0 && (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#0D4733] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[#F0EBE0]">
                <Target className="w-7 h-7 text-[#0D4733] flex-shrink-0" />
                <h3 className={cardTitleClass}>
                  {isEn ? "NEXT MONTH GOALS" : "أهداف الشهر القادم"}
                </h3>
              </div>
              <ul className="space-y-2.5">
                {validGoals.map((g, i) => (
                  <li key={i} className="flex items-start gap-3" dir={isEn ? "ltr" : "rtl"}>
                    <Compass className="w-6 h-6 text-[#0D4733] flex-shrink-0 mt-0.5" />
                    <span className={bodyClass} style={{ unicodeBidi: "isolate" }}>{g}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 2. STUDENT INTERACTION & BEHAVIOR */}
          {hasInteraction && (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#0D4733] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-2.5 pb-2 border-b border-[#F0EBE0]">
                <MessageSquare className="w-7 h-7 text-[#C59B27] flex-shrink-0" />
                <h3 className={cardTitleClass}>
                  {isEn ? "STUDENT INTERACTION & BEHAVIOR" : "تفاعل الطالب وسلوكه التعليمي"}
                </h3>
              </div>
              <p
                dir={isEn ? "ltr" : "rtl"}
                className={bodyClass}
                style={{ unicodeBidi: "isolate", wordBreak: "normal" }}
              >
                {data.studentInteraction}
              </p>
            </section>
          )}

          {/* 3. EXPECTED PLAN FOR NEXT MONTH */}
          {hasPlan && (
            <section className="bg-white rounded-3xl border-2 border-[#E2D9C5] border-s-8 border-s-[#C59B27] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-2.5 pb-2 border-b border-[#F0EBE0]">
                <Calendar className="w-7 h-7 text-[#C59B27] flex-shrink-0" />
                <h3 className={cardTitleClass}>
                  {isEn ? "EXPECTED PLAN FOR NEXT MONTH" : "الخطة المتوقعة للشهر القادم"}
                </h3>
              </div>
              <p
                dir={isEn ? "ltr" : "rtl"}
                className={`${bodyClass} whitespace-pre-line`}
                style={{ unicodeBidi: "isolate", wordBreak: "normal" }}
              >
                {data.expectedNextMonthPlan}
              </p>
            </section>
          )}
        </div>

        {/* 4. FOOTER: Closing Duaa & Small Teacher Name */}
        <IslamicFooter teacherName={data.teacherName} isEn={isEn} />
      </div>
    )
  });

  const totalPages = pages.length;

  return (
    <div
      id="monthly-report-printable"
      className="w-full flex flex-col gap-10 items-center selection:bg-[#D4AF37]/30"
    >
      {pages.map((page, idx) => (
        <article
          key={page.id}
          id={`monthly-report-page-${idx + 1}`}
          dir={isEn ? "ltr" : "rtl"}
          className={`monthly-report-page w-full max-w-[794px] bg-[#FAF7EE] text-[#1C2D24] rounded-3xl border-2 border-[#D4AF37]/50 shadow-2xl p-5 sm:p-6 pb-6 relative flex flex-col justify-between ${
            isEn ? "text-left" : "text-right"
          }`}
          style={{ minHeight: "1123px", width: "100%", maxWidth: "794px", boxSizing: "border-box" }}
        >
          {/* Islamic Frame Accents */}
          <div className="absolute inset-0 pointer-events-none border-8 border-[#FAF7EE] rounded-3xl" />
          <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#D4AF37]/25 rounded-2xl" />

          {/* Dynamic Page Content */}
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            {page.render()}
          </div>

          {/* Page Footer Marker with Dynamic Total Count */}
          <div className="relative z-10 mt-6 pt-3.5 border-t border-[#E2D9C5] flex items-center justify-between text-xs sm:text-sm font-bold text-[#52635A]">
            <span className="text-[#0D4733]">
              {isEn ? "Academic Evaluation Portal" : "منظومة التقييم والمتابعة"}
            </span>
            <span className="text-[#C59B27]">
              {isEn
                ? `Page ${idx + 1} of ${totalPages} (${page.titleEn})`
                : `الصفحة ${idx + 1} من ${totalPages} (${page.titleAr})`}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
};
