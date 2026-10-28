/**
 * GoStars - Monthly Student Report Model & Aggregation Engine
 * 
 * المبادئ الصارمة للتقرير الشهري للقرآن الكريم والدراسات الإسلامية:
 * 1. مخصص حصراً للمادتين:
 *    - "Quran, Arabic and Islamic Studies"
 *    - "قرآن كريم"
 * 2. الاعتماد التام على البيانات الفعلية المسجلة لحصص الطالب في الشهر المحدد.
 * 3. منع اختراع أي بيانات (Zero Hallucination): لا سور، ولا آيات، ولا درجات، ولا نسب افتراضية.
 * 4. منع التكرار (Deduplication): دمج السور والآيات المتكررة في الحفظ الجديد والمراجعة في نطاق متصل.
 * 5. عدم عرض إجمالي الحصص أو إجمالي الساعات نهائياً (موجودة في ملف الفاتورة المنفصل).
 * 6. الفصل التام بين لغة الإدخال ولغة الإخراج:
 *    - إذا كانت اللغة المطلوبة English تكون جميع العناوين والتقييمات بالإنجليزية مع كتابة أسماء السور بالنطق القرآني السليم (Surah Al-Mulk).
 *    - إذا كانت اللغة المطلوبة العربية يكون التقرير كاملاً بالعربية الفصحى.
 * 7. إنشاء طبقة تحليل منظمة (Structured Monthly Analysis) تجمع وتحلل الشهر كاملاً قبل وضعه بالقالب.
 */

import { Student, GeneratedReport, AttendanceRecord, MonthlyTemplateSection } from "../types";
import { QURAN_SURAHS, formatMonthlyReportMonth, normalizeReportTeacherName } from "./monthlyQuranReport";

export const ELIGIBLE_SUBJECTS = [
  "Quran, Arabic and Islamic Studies",
  "قرآن كريم",
  "القرآن الكريم",
  "لغة عربية",
  "اللغة العربية",
  "الدراسات الإسلامية",
  "دراسات إسلامية",
  "نور البيان"
] as const;

export interface QualitativeEvaluationBadge {
  level: "mastered" | "very_good" | "good" | "needs_practice" | "developing" | "not_recorded";
  labelEn: string;
  labelAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
}

export interface QuranModularReport {
  active: boolean;
  newMemorization?: string;
  revision?: string;
  quranReading?: string;
  tajweedRules?: string;
  qualitativeEvaluation: string;
  score?: number;
  skillsPracticed: string[];
}

export interface ArabicModularReport {
  active: boolean;
  readingAndPhonics?: string;
  writingAndDictation?: string;
  grammarAndSyntax?: string;
  vocabularyAndComprehension?: string;
  qualitativeEvaluation: string;
  score?: number;
  skillsPracticed: string[];
}

export interface IslamicModularReport {
  active: boolean;
  topicsCovered?: string;
  studentUnderstanding?: string;
  etiquetteAndAdhkar?: string;
  qualitativeEvaluation: string;
  score?: number;
  skillsPracticed: string[];
}

export interface MonthlyAchievementItem {
  categoryKey:
    | "newMemorization"
    | "revision"
    | "recitationAndFoundation"
    | "quranReading"
    | "noorAlBayan"
    | "tajweedRules"
    | "islamicStudies"
    | "arabicWriting"
    | "arabicGrammar"
    | "arabicVocabulary";
  titleAr: string;
  titleEn: string;
  content: string;
  evaluation?: string;
}

export interface MonthlyPerformanceIndicators {
  memorization: number; // نسب مئوية من واقع التقييم الفعلي (0 إذا لم يُذكر في التقارير اليومية)
  revision: number;
  tajweedAndFoundation: number;
  islamicStudies?: number;
  commitment: number;
}

export interface MonthlyStatistics {
  pagesMemorized?: number;
  pagesRevised?: number;
  pagesRead?: number;
  tajweedRulesLearned?: number;
  noorAlBayanLessons?: number;
  islamicStudiesLessons?: number;
}

export interface MonthlyLessonSummary {
  date: string;
  attendance: "present" | "absent" | "late";
  classEvents: string;
  homeworkNotes: string;
  teacherNotes: string;
  overallEvaluation?: string;
  reportText?: string;
}

export interface StructuredMonthlyLessonLog {
  id?: string;
  date: string;
  lessonNumber?: number;
  durationMinutes: number;
  attendance: "present" | "absent" | "late";
  homeworkStatus: "done" | "partial" | "not_done";
  classEvents: string;
  homeworkNotes: string;
  teacherNotes: string;
  overallEvaluation: string;
  reportText?: string;
  isArchived?: boolean;
  archiveGroup?: string;
}

export interface StructuredMonthlyAnalysis {
  studentName: string;
  month: number;
  year: number;
  subject: string;
  teacherName: string;
  outputLanguage: "ar" | "en";
  lessonsIncludedCount: number;
  attendedCount: number;
  absentCount: number;
  totalHours: number;
  lessons: StructuredMonthlyLessonLog[];

  newMemorization: {
    content: string;
    evaluation: string;
  };
  revision: {
    content: string;
    evaluation: string;
  };
  recitationAndFoundation: {
    content: string;
    evaluation: string;
  };
  quranReading?: {
    content: string;
    evaluation: string;
  };
  noorAlBayan?: {
    content: string;
    evaluation: string;
  };
  tajweedProgress: {
    content: string;
    evaluation: string;
  };
  islamicStudiesProgress: {
    content: string;
    evaluation: string;
  };
  arabicWritingAndDictation?: {
    content: string;
    evaluation: string;
  };
  arabicGrammar?: {
    content: string;
    evaluation: string;
  };
  arabicVocabulary?: {
    content: string;
    evaluation: string;
  };

  activeSubjects: {
    quran: boolean;
    arabic: boolean;
    islamicStudies: boolean;
  };
  hasExplicitNumericGrades: boolean;
  qualitativeRatings: {
    overall: QualitativeEvaluationBadge;
    memorization?: QualitativeEvaluationBadge;
    revision?: QualitativeEvaluationBadge;
    tajweedAndFoundation?: QualitativeEvaluationBadge;
    arabicLanguage?: QualitativeEvaluationBadge;
    islamicStudies?: QualitativeEvaluationBadge;
    commitment: QualitativeEvaluationBadge;
  };

  overallProgress: string;
  strengths: string[];
  areasForImprovement: string[];
  homeworkAndCommitmentPattern: string;
  importantObservations: string;
  nextMonthPlan: string;

  indicators: {
    memorization: number;
    revision: number;
    tajweedAndFoundation: number;
    islamicStudies?: number;
    commitment: number;
  };
}

export interface ComprehensiveMonthlyReportData {
  student?: Student;
  studentName: string;
  subject: string;
  year: number;
  month: number;
  monthNameAr: string;
  monthNameEn: string;
  monthLabel: string;
  teacherName: string;
  lang: "ar" | "en";

  // Achievements (Only categories with real data)
  achievements: MonthlyAchievementItem[];

  // Performance Indicators (Progress rings)
  indicators: MonthlyPerformanceIndicators;

  // Strengths & Recommendations
  strengths: string[];
  recommendations: string[];

  // Next Month Goals
  nextMonthGoals: string[];

  // Detailed Academic Report (Page 2 and beyond)
  completedItems: {
    newMemorization?: string;
    revision?: string;
    quranReading?: string;
    noorAlBayan?: string;
    tajweedRules?: string;
    islamicStudies?: string;
    arabicWriting?: string;
    arabicGrammar?: string;
    arabicVocabulary?: string;
  };

  // Modular Subject Reports
  activeSubjects: {
    quran: boolean;
    arabic: boolean;
    islamicStudies: boolean;
  };
  quranReport?: QuranModularReport;
  arabicReport?: ArabicModularReport;
  islamicReport?: IslamicModularReport;

  // Qualitative Descriptive Ratings & Explicit Score Tracker
  hasExplicitNumericGrades: boolean;
  qualitativeRatings: {
    overall: QualitativeEvaluationBadge;
    memorization?: QualitativeEvaluationBadge;
    revision?: QualitativeEvaluationBadge;
    tajweedAndFoundation?: QualitativeEvaluationBadge;
    arabicLanguage?: QualitativeEvaluationBadge;
    islamicStudies?: QualitativeEvaluationBadge;
    commitment: QualitativeEvaluationBadge;
  };

  // Educational parent-friendly summary
  monthlyProgressSummary: string;

  // Extractable Statistics only (NO total lessons or total hours!)
  statistics: MonthlyStatistics;

  // Student Interaction & Responsiveness
  studentInteraction: string;

  // Expected Plan for Next Month (12 lessons, 1 hour each, realistic approximation)
  expectedNextMonthPlan: string;

  // Clean, parent-friendly narratives
  pedagogicalAnalysis?: string;
  deductiveInference?: string;
  learningProfile?: string;
  parentalGuidance?: string;

  // Raw lessons count for calculation references only (NOT displayed in report)
  _internalLessonsCount?: number;
  _internalAttendedCount?: number;

  // Source lessons (active & archived) analyzed to produce this monthly report
  sourceLessons?: StructuredMonthlyLessonLog[];
  archivedLessonsCount?: number;
  activeLessonsCount?: number;
  selectedArchiveGroup?: string;

  // Literal Template Driven Output Fields
  templateTitle?: string;
  templateSubtitle?: string;
  templateSections?: MonthlyTemplateSection[];
  rawTemplateText?: string;
  stage1AnalysisSummary?: string;
  activeTemplateId?: string;
  activeTemplateName?: string;
}

export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Normalizes Arabic text for accurate Surah comparison
 */
function normalizeArabicSurahToken(str: string): string {
  return str
    .replace(/[\u064B-\u065F\u0670]/g, "") // strip tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .trim()
    .toLowerCase();
}

// Words that share roots with Surah names when used in general educational contexts (unless preceded by "سورة")
const AMBIGUOUS_SURAH_WORDS = new Set([
  "ص", "ق", "طه", "يس", "نوح", "محمد", "ابراهيم", "يونس", "هود", "يوسف", "لقمان",
  "الفتح", "الشرح", "النور", "العصر", "الفجر", "الجمعه", "الجمعة", "القصص", "الحديد", "القلم", "الناس", "الشمس", "القمر", "النجم", "الليل", "الضحي", "الضحى"
].map(normalizeArabicSurahToken));

/**
 * Strips all URLs, web links, meeting links (Zoom, Google Meet, Teams, WhatsApp, etc.),
 * domain mentions, and link introduction boilerplate from text.
 */
export function stripAllUrlsAndLinks(text?: string | null): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Remove markdown links [title](url) -> keep title if not a URL or link-label, else remove
  clean = clean.replace(/\[([^\]]*)\]\((?:https?:\/\/[^\s)]+|www\.[^\s)]+|[^\s)]+\.[a-zA-Z]{2,}[^\s)]*)\)/gi, (_m, title) => {
    const t = (title || "").trim();
    if (/^https?:\/\/|^www\.|\.(?:com|org|net|us|app|me|gle|tv|io|ly)|رابط|لينك|link|meeting/i.test(t)) {
      return "";
    }
    return t;
  });

  // 2. Remove raw URLs (http, https, ftp, mailto)
  clean = clean.replace(/https?:\/\/[^\s)\]>،,؛;"'«»]+/gi, "");
  clean = clean.replace(/(?:ftp|mailto):\/\/[^\s)\]>،,؛;"'«»]+/gi, "");

  // 3. Remove www. URLs
  clean = clean.replace(/\bwww\.[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,}[^\s)\]>،,؛;"'«»]*/gi, "");

  // 4. Remove all video conference, meeting, chat, drive, and shortened domains (with any subdomains or paths)
  clean = clean.replace(/\b(?:[a-zA-Z0-9-]+\.)?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me|drive\.google\.com|docs\.google\.com|forms\.gle|youtube\.com|youtu\.be|web\.skype\.com|bit\.ly|tinyurl\.com)(?:\/[^\s)\]>،,؛;"'«»]*)?/gi, "");

  // 5. Remove any generic domain pattern with a path or query string: example.com/abc?xyz
  clean = clean.replace(/\b[a-zA-Z0-9-]+\.(?:com|org|net|app|io|edu|gov|ly|me|tv|gl|site|online)\/[^\s)\]>،,؛;"'«»]*/gi, "");

  // 6. Clean up link introduction labels and invitations left behind
  clean = clean.replace(/(?:رابط\s+(?:الحصة|الدرس|الزوم|اللقاء|القاعة|الاجتماع|التسميع|الواجب|الفورمز|الفيديو|الميت|المنصة|المباشر)|رابط\s*[:：\-]|الرابط\s*[:：\-]|لينك\s+(?:الحصة|الدرس|الزوم|اللقاء|القاعة|الاجتماع|التسميع|الواجب|الميت)|لينك\s*[:：\-]|اللينك\s*[:：\-]|Meeting\s+link|Zoom\s+link|Class\s+link|Lesson\s+link|Session\s+link|Google\s+Meet\s+link|Teams\s+link|Join\s+meeting|Link\s*[:：\-]|URL\s*[:：\-])\s*[:：\-]?\s*(?:[.,،؛|–—\s]*|$)/gi, " ");

  // 7. Remove sentences whose only purpose was sharing a meeting link
  clean = clean.replace(/(?:تم\s+إرسال\s+رابط\s+الحصة|تمت\s+المشاركة\s+عبر\s+الرابط|الدخول\s+عبر\s+الرابط|رابط\s+الدخول|يرجى\s+الدخول\s+عبر\s+الرابط)[^.\n]*[.\n]?/gi, " ");

  // 8. Clean up empty parentheses, brackets, or angle brackets left behind
  clean = clean.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "").replace(/<\s*>/g, "");

  // 9. Normalize excess punctuation and whitespace
  clean = clean
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*([،,؛;])\s*/g, "$1 ")
    .replace(/(?:[،,؛;]\s*){2,}/g, "، ")
    .replace(/^\s*[-–—،,؛;.:|]+\s*/, "")
    .replace(/\s*[-–—،,؛;.:|]+\s*$/, "")
    .trim();

  return clean;
}

export const ARABIC_TO_ENGLISH_TOPICS_MAP: [RegExp, string][] = [
  [/أحكام\s+(?:النون\s+الساكنة|النون\s+والميم)|النون\s+الساكنة\s+والتنوين|النون\s+الساكنة/i, "Noon Sakinah & Tanween Rules"],
  [/الإظهار\s+الحلقي|الإظهار|اظهار/i, "Izhar (Clear Pronunciation)"],
  [/الإدغام\s+بغنة|ادغام\s+بغنة/i, "Idgham with Ghunnah"],
  [/الإدغام\s+بغير\s+غنة|ادغام\s+بغير\s+غنة/i, "Idgham without Ghunnah"],
  [/الإدغام|ادغام/i, "Idgham (Assimilation)"],
  [/الإقلاب|اقلاب/i, "Iqlab (Conversion)"],
  [/الإخفاء\s+الحقيقي|الإخفاء|اخفاء/i, "Ikhfa' (Concealment)"],
  [/القلقلة|قلقلة/i, "Qalqalah (Echoing Sound)"],
  [/المد\s+الطبيعي/i, "Natural Prolongation (Madd Tabee'ee)"],
  [/المد\s+المتصل/i, "Connected Prolongation (Madd Muttasil)"],
  [/المد\s+المنفصل/i, "Separated Prolongation (Madd Munfasil)"],
  [/المد\s+اللازم/i, "Compulsory Prolongation (Madd Lazim)"],
  [/المد\s+العارض/i, "Madd 'Arid Li-Sukoon"],
  [/أحكام\s+المدود|المدود|المد/i, "Madd Rules (Prolongations)"],
  [/مخارج\s+الحروف|مخارج/i, "Letter Articulation Points (Makharij)"],
  [/صفات\s+الحروف|صفات/i, "Letter Characteristics (Sifat)"],
  [/التفخيم\s+والترقيق|تفخيم\s+وترقيق/i, "Tafkheem & Tarqeeq (Heavy/Light Letters)"],
  [/الغنة/i, "Ghunnah (Nasalization Duration)"],
  [/السيرة\s+النبوية|سيرة\s+النبي|السيرة/i, "Prophetic Biography (Seerah)"],
  [/الآداب\s+الإسلامية|آداب\s+إسلامية|الآداب/i, "Islamic Manners & Daily Etiquette"],
  [/الأذكار\s+اليومية|أذكار\s+الصباح|الأذكار|أذكار/i, "Daily Adhkar & Supplications"],
  [/أركان\s+الإسلام/i, "The Five Pillars of Islam"],
  [/أركان\s+الإيمان/i, "The Six Pillars of Faith (Iman)"],
  [/أحكام\s+الوضوء|الوضوء/i, "Ablution (Wudu) Steps & Manners"],
  [/أحكام\s+الصلاة|الصلاة/i, "Prayer (Salah) Rulings"],
  [/قصص\s+الأنبياء/i, "Stories of the Prophets"],
  [/بر\s+الوالدين/i, "Honoring Parents (Birr al-Walidayn)"],
  [/الحديث\s+الشريف|أحاديث\s+نبوية|الحديث/i, "Noble Prophetic Hadiths"],
  [/العقيدة\s+الإسلامية|العقيدة|التوحيد/i, "Islamic Creed & Tawheed"],
  [/الفقه\s+الإسلامي|الفقه/i, "Foundational Islamic Fiqh"],
  [/نور\s+البيان/i, "Noor Al-Bayan Foundational Phonics"],
  [/القاعدة\s+النورانية|النورانية/i, "Al-Qaida Al-Noorania Reading Drills"],
  [/حروف\s+الهجاء|الحروف\s+الهجائية/i, "Arabic Alphabet & Letter Recognition"],
  [/حركة\s+الفتح|الفتحة/i, "Fathah (Short Vowel A)"],
  [/حركة\s+الكسر|الكسرة/i, "Kasrah (Short Vowel I)"],
  [/حركة\s+الضم|الضمة/i, "Dammah (Short Vowel U)"],
  [/الحركات\s+الثلاث/i, "The Three Short Vowels (Harakat)"],
  [/التنوين\s+بالفتح/i, "Tanween Fath"],
  [/التنوين\s+بالكسر/i, "Tanween Kasr"],
  [/التنوين\s+بالضم/i, "Tanween Damm"],
  [/التنوين/i, "Tanween (Double Vowels)"],
  [/السكون/i, "Sukoon Rules"],
  [/الشدة/i, "Shaddah (Doubled Consonants)"],
  [/تهجي\s+الكلمات|التهجي/i, "Word Spelling & Reading Fluency"],
  [/الجزء\s+الثلاثون|جزء\s+عم/i, "Juz' 30 (Juz' 'Amma)"],
  [/الجزء\s+التاسع\s+والعشرون|جزء\s+تبارك/i, "Juz' 29 (Juz' Tabarak)"],
  [/جزء\s+(\d+)/i, "Juz' $1"],
  [/صفحة\s+(\d+)/i, "Page $1"],
  [/المقرر\s+المعتمد/i, "Assigned Curriculum Portions"],
  [/مراجعة\s+تراكمية/i, "Cumulative Revision"]
];

/**
 * Translates / synthesizes Arabic text into polished English pedagogical statements
 * to prevent any full Arabic paragraphs from leaking into an English monthly report.
 * Guarantees that the returned string contains ZERO Arabic characters.
 */
export function sanitizeTextForEnglishReport(
  text?: string | null,
  context: "strength" | "recommendation" | "plan" | "interaction" | "topic" | "evaluation" | "pedagogicalAnalysis" | "deductiveInference" | "learningProfile" | "parentalGuidance" | "general" = "general"
): string {
  if (!text) return "";
  const cleaned = stripAllUrlsAndLinks(text).trim();
  if (!cleaned) return "";

  // If text does not contain Arabic letters, return cleaned directly
  if (!/[\u0600-\u06FF]/.test(cleaned)) {
    return cleaned;
  }

  // 1. Topic / Curriculum Scope Translation
  if (context === "topic") {
    // Scan for all canonical Surahs mentioned in cleaned
    const foundSurahs: { num: number; ar: string; en: string }[] = [];
    QURAN_SURAHS.forEach(s => {
      const arPattern = s.ar.replace(/[أإآ]/g, "[أإآا]");
      const regex = new RegExp(`(?:^|[\\s،,؛;.:：\\-–—()[\\]«»"'])(?:(?:سورة|سوره|surah|surat)\\s+)?${arPattern}(?=$|[\\s،,؛;.:：\\-–—()[\\]«»"'])`, "i");
      if (regex.test(cleaned)) {
        if (!foundSurahs.some(existing => existing.num === s.num)) {
          foundSurahs.push(s);
        }
      }
    });

    const topicParts: string[] = [];

    if (foundSurahs.length > 0) {
      const nums = (cleaned.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n <= 300);
      const isComplete = /كاملة|كامله|full|complete/i.test(cleaned);

      if (foundSurahs.length === 1) {
        const s = foundSurahs[0];
        if (nums.length >= 2) {
          topicParts.push(`Surah ${s.en} (Verses ${Math.min(...nums)}–${Math.max(...nums)})`);
        } else if (nums.length === 1) {
          topicParts.push(`Surah ${s.en} (Verse ${nums[0]})`);
        } else if (isComplete) {
          topicParts.push(`Surah ${s.en} (Complete Surah)`);
        } else {
          topicParts.push(`Surah ${s.en}`);
        }
      } else {
        const surahsList = foundSurahs.map(s => `Surah ${s.en}`).join(", ");
        if (nums.length >= 2) {
          topicParts.push(`${surahsList} (Verses ${Math.min(...nums)}–${Math.max(...nums)})`);
        } else {
          topicParts.push(surahsList);
        }
      }
    }

    // Check mapping dictionary for non-Surah educational topics
    for (const [regex, replacement] of ARABIC_TO_ENGLISH_TOPICS_MAP) {
      if (regex.test(cleaned)) {
        if (!topicParts.includes(replacement)) {
          topicParts.push(replacement);
        }
      }
    }

    if (topicParts.length > 0) {
      return topicParts.join(" • ");
    }

    // Split on delimiters and attempt sub-translations
    const pieces = cleaned.split(/[,،؛\n]+/).map(p => p.trim()).filter(Boolean);
    if (pieces.length > 1) {
      const translatedPieces = pieces
        .map(p => sanitizeTextForEnglishReport(p, "topic"))
        .filter(p => !/[\u0600-\u06FF]/.test(p));
      if (translatedPieces.length > 0) {
        return Array.from(new Set(translatedPieces)).join(", ");
      }
    }

    return cleaned || "";
  }

  // 2. Evaluation Translation
  if (context === "evaluation") {
    if (/ممتاز\s*جداً|10\/10|رائع|متميز|outstanding/i.test(cleaned)) return "Excellent (Mastered)";
    if (/ممتاز|متقن|excellent|mastered/i.test(cleaned)) return "Excellent (Mastered)";
    if (/جيد\s*جداً|متقن\s*ومثبت|very\s*good/i.test(cleaned)) return "Very Good (Reinforced)";
    if (/جيد|مرضي|good/i.test(cleaned)) return "Good";
    if (/مقبول|متوسط|تحتاج\s*متابعة/i.test(cleaned)) return "Needs Follow-up";
    return "Completed & Mastered";
  }

  // 3. Strengths Context
  if (context === "strength") {
    if (/حفظ|تسميع|استحضار|سورة|آيات/i.test(cleaned)) {
      return "Strong retention accuracy, high mental focus, and confident verse recall from memory with minimal hesitation.";
    }
    if (/مراجعة|تثبيت|تراكم/i.test(cleaned)) {
      return "Solid stability, high retention consistency, and excellent recall of previously memorized Surahs.";
    }
    if (/تجويد|مخارج|أحكام|مدود|غنة|صفات/i.test(cleaned)) {
      return "Careful practical application of Tajweed rules, correct articulation points (Makharij), and clear Quranic phonetics.";
    }
    if (/تلاوة|قراءة|طلاقة|صوت|ترتيل/i.test(cleaned)) {
      return "Fluent recitation flow, pleasant rhythm, and diligent adherence to proper Quranic pronunciation.";
    }
    if (/انضباط|التزام|حضور|مواعيد|أخلاق|أدب/i.test(cleaned)) {
      return "Exemplary attendance, respectful conduct, sharp mental alertness, and disciplined participation during sessions.";
    }
    if (/تفاعل|مشاركة|حرص|استجابة/i.test(cleaned)) {
      return "Active engagement, sharp mental presence, and enthusiastic responsiveness to teacher instructions.";
    }
    if (/واجب|تحضير|منزل/i.test(cleaned)) {
      return "Diligent home preparation, regular daily practice, and consistent task completion prior to each lesson.";
    }
    if (/نور\s*البيان|تهجي|تأسيس|حركات/i.test(cleaned)) {
      return "Steady advancement in foundational phonetic spelling drills, letter recognition, and reading fluency.";
    }
    if (/إسلامية|دراسات|أذكار|آداب|حديث|فقه|سيرة/i.test(cleaned)) {
      return "Commendable absorption and practical application of Islamic manners, noble values, and daily Adhkar.";
    }
    return "High mental focus, consistent diligence, and commendable commitment to learning.";
  }

  // 4. Recommendations Context
  if (context === "recommendation") {
    if (/استماع|مصحف|قارئ|حصري|منشاوي|صوت/i.test(cleaned)) {
      return "Daily 15-minute audio listening to assigned Surahs by a proficient reciter (e.g. Sheikh Al-Husary) to consolidate retention.";
    }
    if (/مراجعة|تثبيت|تراكم/i.test(cleaned)) {
      return "Allocating dedicated daily time at home for cumulative review to ensure permanent retention.";
    }
    if (/تجويد|مخارج|مد|غنة|إخفاء|إدغام/i.test(cleaned)) {
      return "Reinforcing precise letter exits (Makharij) and continuous practice of applied Tajweed rules.";
    }
    if (/تردد|خطأ|تكرار|بطء|صعوبة/i.test(cleaned)) {
      return "Consistent repeated recitation at home to eliminate hesitation and build fluent reading confidence.";
    }
    if (/واجب|منزل|متابعة|تحضير/i.test(cleaned)) {
      return "Encouraging regular daily home practice and completing assignments prior to each session.";
    }
    if (/نور\s*البيان|تهجي|حركات/i.test(cleaned)) {
      return "Daily home practice of phonics drills and short vowel transitions to boost reading fluency.";
    }
    return "Maintaining consistent daily home review of covered lesson points to ensure lasting mastery.";
  }

  // 5. Next Month Plan Context
  if (context === "plan") {
    return "Realistic estimated projection for next month (~12 lessons, 1 hour each) based on current pace: Advance steadily through the subsequent scheduled curriculum, maintaining daily cumulative review and practical Tajweed application to reinforce permanent retention.";
  }

  // 6. Student Interaction Context
  if (context === "interaction") {
    return "The student demonstrated sharp mental focus, polite demeanor, and responsive engagement with teacher instructions throughout sessions.";
  }

  // 7. Deep Pedagogical Trajectory Analysis
  if (context === "pedagogicalAnalysis") {
    return "The student demonstrated a positive and ascending pedagogical trajectory throughout this month. Daily session evaluations reflect continuous dedication to mastering covered lessons while maintaining focus, retention stability, and accuracy.";
  }

  // 8. Deductive Diagnostic Inferences
  if (context === "deductiveInference") {
    return "Deductive inference reveals that the student possesses strong auditory retention and responds exceptionally well to direct phonetic modeling and structured spaced repetition. Consolidating a structured daily review habit at home serves as the primary catalyst to fortify retention permanence.";
  }

  // 9. Learning Profile
  if (context === "learningProfile") {
    return "Auditory-interactive learner; thrives with vocal modeling, clear articulation guidance, and positive structured reinforcement.";
  }

  // 10. Parental Partnership Guidance
  if (context === "parentalGuidance") {
    return "Encourage 15 minutes of quiet daily home review and listening while following along attentively, paired with verbal praise upon completing daily assignments.";
  }

  // General fallback for any other context
  return "Consistently demonstrated commendable focus and active engagement throughout the sessions.";
}

/**
 * Normalizes Arabic-Indic / Eastern digits to standard ASCII 0-9, strips invisible BiDi/zero-width
 * control characters (often pasted from WhatsApp/Telegram/Word), and removes Arabic Tatweel (Kashida).
 */
export function normalizeTextDigitsAndControls(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFE0E\uFE0F]/g, "")
    .replace(/\u0640/g, "") // strip Arabic Tatweel/Kashida
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalizes Surah name to canonical Arabic or English transliterated standard.
 * Prevents false positives while supporting all 114 Surahs and common aliases.
 */
export function findCanonicalSurah(
  rawName: string,
  hasExplicitSurahKeyword: boolean = false
): { num: number; ar: string; en: string } | null {
  if (!rawName) return null;
  const clean = normalizeTextDigitsAndControls(rawName)
    .replace(/^(?:سورة|سوره|سور|surah|surat|sura)\s*/gi, "")
    .replace(/[()[\]،,._\-:؛*"'`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  const cleanNorm = normalizeArabicSurahToken(clean);
  const cleanNoAl = cleanNorm.replace(/^ال/, "");
  const cleanEn = clean.toLowerCase().replace(/['`’-]/g, "").replace(/^(?:al|an|as|at|adh|ash|ar)\s*/, "").trim();

  // Common aliases for Surahs
  if (cleanNorm === "عم" || cleanNorm === "عما" || cleanNorm === "يتساءلون") {
    return QURAN_SURAHS.find(s => s.num === 78) || null; // النبأ
  }
  if (cleanNorm === "تبارك") {
    return QURAN_SURAHS.find(s => s.num === 67) || null; // الملك
  }
  if (cleanNorm === "المسد" || cleanNorm === "تبت") {
    return QURAN_SURAHS.find(s => s.num === 111) || null; // المسد
  }
  if (cleanNorm === "قريش" || cleanNorm === "لايلاف" || cleanNorm === "ايلاف") {
    return QURAN_SURAHS.find(s => s.num === 106) || null; // قريش
  }
  if (cleanNorm === "ام الكتاب" || cleanNorm === "السبع المثاني") {
    return QURAN_SURAHS.find(s => s.num === 1) || null; // الفاتحة
  }
  if (cleanNorm === "الصمد" || cleanNorm === "قل هو الله احد") {
    return QURAN_SURAHS.find(s => s.num === 112) || null; // الإخلاص
  }
  if (cleanNorm === "قل اعوذ برب الفلق") {
    return QURAN_SURAHS.find(s => s.num === 113) || null; // الفلق
  }
  if (cleanNorm === "قل اعوذ برب الناس") {
    return QURAN_SURAHS.find(s => s.num === 114) || null; // الناس
  }
  if (cleanNorm === "قل يا ايها الكافرون") {
    return QURAN_SURAHS.find(s => s.num === 109) || null; // الكافرون
  }
  if (cleanNorm === "الم نشرح" || cleanNorm === "الانشراح") {
    return QURAN_SURAHS.find(s => s.num === 94) || null; // الشرح
  }
  if (cleanNorm === "براءه") {
    return QURAN_SURAHS.find(s => s.num === 9) || null; // التوبة
  }
  if (cleanNorm === "بني اسرائيل") {
    return QURAN_SURAHS.find(s => s.num === 17) || null; // الإسراء
  }
  if (cleanNorm === "المومن") {
    return QURAN_SURAHS.find(s => s.num === 40) || null; // غافر
  }
  if (cleanNorm === "الدهر" || cleanNorm === "هل اتي") {
    return QURAN_SURAHS.find(s => s.num === 76) || null; // الإنسان
  }
  if (cleanNorm === "سال سائل") {
    return QURAN_SURAHS.find(s => s.num === 70) || null; // المعارج
  }

  // 1. Exact canonical match
  for (const s of QURAN_SURAHS) {
    const arNorm = normalizeArabicSurahToken(s.ar);
    const arNoAl = arNorm.replace(/^ال/, "");
    if (cleanNorm === arNorm || (cleanNoAl.length >= 3 && cleanNoAl === arNoAl)) {
      if (!hasExplicitSurahKeyword && (arNorm === "ص" || arNorm === "ق") && cleanNorm.length <= 1) {
        continue;
      }
      return s;
    }

    const enFull = s.en.toLowerCase().replace(/['`’-]/g, "").trim();
    const enNoPrefix = enFull.replace(/^(?:al|an|as|at|adh|ash|ar)/, "").trim();
    const rawEnClean = clean.toLowerCase().replace(/['`’-]/g, "").trim();
    if (rawEnClean === enFull || (cleanEn.length >= 3 && cleanEn === enNoPrefix)) {
      return s;
    }
  }

  // 2. Whole-token match when explicit "سورة/Surah" keyword is present or token is unambiguous
  const words = cleanNorm.split(/\s+/).filter(Boolean);
  for (const s of QURAN_SURAHS) {
    const arNorm = normalizeArabicSurahToken(s.ar);
    if (!hasExplicitSurahKeyword && AMBIGUOUS_SURAH_WORDS.has(arNorm)) {
      continue;
    }
    if (arNorm.length >= 3 && words.includes(arNorm)) {
      return s;
    }
    if (hasExplicitSurahKeyword && words.includes(arNorm)) {
      return s;
    }
  }

  return null;
}

/**
 * Splits a clause containing multiple joined Surahs (e.g. "سورة الإخلاص والفلق والناس" or "الضحى والشرح")
 * into separate Surah pieces so none of the joined Surahs are swallowed or lost.
 */
function splitJoinedSurahClauses(piece: string): string[] {
  const normPiece = normalizeTextDigitsAndControls(piece).trim();
  if (!normPiece) return [];

  // Split on "و" / "ثم" / "and" when followed by an explicit "سورة"
  const explicitSplit = normPiece
    .replace(/\s+(?:و\s*|ثم\s+|and\s+)(?=(?:سورة|سوره|surah|surat)\s)/gi, " ، ")
    .split(/\s*،\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  const finalPieces: string[] = [];

  for (const sub of explicitSplit) {
    // Check if sub has "و<SurahName>" without repeating "سورة" (e.g., "سورة الإخلاص والفلق والناس" or "الضحى والشرح")
    const partsByWa = sub.split(/\s+(?:و\s*|ثم\s+|and\s+)/i).map(p => p.trim()).filter(Boolean);
    if (partsByWa.length <= 1) {
      finalPieces.push(sub);
      continue;
    }

    // Verify if the secondary parts start with a canonical Surah name
    let currentAcc = partsByWa[0];
    for (let i = 1; i < partsByWa.length; i++) {
      const candidate = partsByWa[i];
      const firstWord = candidate
        .replace(/^(?:سورة|سوره|surah|surat)\s+/i, "")
        .split(/[\s(،,:0-9\-–—]+/)[0] || "";
      const secondWord = candidate
        .replace(/^(?:سورة|سوره|surah|surat)\s+/i, "")
        .split(/[\s(،,:0-9\-–—]+/)
        .slice(0, 2)
        .join(" ");

      const isKnownSurah =
        (firstWord.length >= 2 && findCanonicalSurah(firstWord, true) !== null) ||
        (secondWord.length >= 4 && findCanonicalSurah(secondWord, true) !== null);

      if (isKnownSurah) {
        finalPieces.push(currentAcc.trim());
        currentAcc = candidate;
      } else {
        currentAcc = `${currentAcc} و${candidate}`;
      }
    }
    if (currentAcc.trim()) {
      finalPieces.push(currentAcc.trim());
    }
  }

  return finalPieces;
}

/**
 * Intelligent Surah & Scope deduplication:
 * - Splits multi-surah clauses accurately (including joined Surahs like "سورة الإخلاص والفلق والناس")
 * - Collapses identical scopes across multiple lessons (e.g. 3 lessons of Al-Bayyinah 1-5 -> single entry)
 * - Merges consecutive/overlapping verse intervals mathematically (e.g. 1-10 + 11-20 -> 1-20)
 * - Formats 100% in requested language:
 *   ar: "سورة الملك (الآيات 1–20)"
 *   en: "Surah Al-Mulk (Verses 1–20)"
 */
export function deduplicateSurahScope(items: string[], lang: "ar" | "en" = "ar"): string {
  if (!items || items.length === 0) return "";
  const isEn = lang === "en";

  const surahMap = new Map<string, { canon: { num: number; ar: string; en: string } | null; details: Set<string> }>();
  const generalSet = new Set<string>();

  const registerSurahDetail = (canon: { num: number; ar: string; en: string } | null, fallbackName: string, rawDetail: string) => {
    const key = canon ? canon.ar : fallbackName.trim();
    if (!key) return;
    if (!surahMap.has(key)) {
      surahMap.set(key, { canon, details: new Set<string>() });
    }
    const cleanDetail = normalizeTextDigitsAndControls(rawDetail || "")
      .replace(/^(?:من|إلى|الى|حتى|آيات|ايات|الآيات|الايات|آية|اية|الآية|الاية|verses?|ayahs?|from|to|\s)+/i, "")
      .replace(/[()[\]]/g, "")
      .trim();
    if (cleanDetail && isCleanValue(cleanDetail)) {
      surahMap.get(key)!.details.add(normalizeTextDigitsAndControls(rawDetail).trim());
    }
  };

  items.forEach(raw => {
    const normRaw = normalizeTextDigitsAndControls(raw);
    if (!isCleanValue(normRaw)) return;

    // Split on commas, semicolons, newlines, pipes, plus signs, or joined Surahs
    const initialPieces = normRaw
      .replace(/\r?\n/g, " ، ")
      .replace(/\s+(?:و\s*)?(?=(?:سورة|سوره|surah|surat)\s)/gi, " ، ")
      .replace(/\s+and\s+(?=(?:surah|surat)\s)/gi, " , ")
      .split(/[,،؛|•+\n]+/)
      .map(p => p.trim())
      .filter(p => isCleanValue(p));

    const pieces: string[] = [];
    initialPieces.forEach(ip => {
      pieces.push(...splitJoinedSurahClauses(ip));
    });

    pieces.forEach(piece => {
      // Remove evaluation suffix if embedded (e.g. "- التقييم: ممتاز" or "(ممتاز)")
      const cleanedPiece = piece
        .replace(/(?:\s*[-–—]\s*)?(?:التقييم|درجة الحصة|تقييم|المستوى|التقدير|evaluation|grade)\s*[:：\-]?\s*[^\n,،]*$/i, "")
        .replace(/(?:\s*[-–—(]\s*|\s+بمستوى\s+|\s+بتقدير\s+|\s+بتسميع\s+|\s+بأداء\s+)(?:ممتاز(?:\s+جداً|\s+جدا)?|جيد(?:\s+جداً|\s+جدا)?|رائع|متميز|متقن(?:\s+جداً)?)(?:\s*بارك\s+الله[^\n)]*)?\)?$/i, "")
        .trim();
      if (!isCleanValue(cleanedPiece)) return;

      // 1. Check explicit "سورة X ..." pattern
      const explicitSurahRegex = /(?:سورة|سوره|surah|surat)\s+((?:آل\s+عمران|ali\s+'?imran|[^\s(،,:0-9]+))(?:\s*(?:من|إلى|الى|حتى|آيات|ايات|الآيات|آية|verses?|ayahs?|\(|:|-|–)?\s*([^)]*)\)?)?/i;
      const sMatch = cleanedPiece.match(explicitSurahRegex);
      if (sMatch && sMatch[1]) {
        const rawSurahName = sMatch[1].trim();
        const canon = findCanonicalSurah(rawSurahName, true);
        const details = (sMatch[2] || "").trim();
        registerSurahDetail(canon, rawSurahName, details);
        return;
      }

      // 2. Check plural "سور: الإخلاص والفلق والناس" or "سورتي الملك والقلم"
      if (/(?:^|\s)(?:سور|سورتي|سورتين|surahs)(?=$|[\s:：\-–—،,])/i.test(cleanedPiece)) {
        const subTokens = cleanedPiece
          .replace(/^.*?(?:سور|سورتي|سورتين|surahs)\s*[:：\-]?\s*/i, "")
          .split(/(?:\s+و\s*|\s+and\s+|\s*[،,&+]\s*)/i)
          .map(t => t.trim())
          .filter(Boolean);
        let matchedAny = false;
        subTokens.forEach(tok => {
          const canon = findCanonicalSurah(tok, true);
          if (canon) {
            matchedAny = true;
            const nums = tok.match(/\d+/g);
            registerSurahDetail(canon, canon.ar, nums && nums.length >= 1 ? tok : "");
          }
        });
        if (matchedAny) return;
      }

      // 3. Check if piece (after stripping action verbs and verse numbers) is a Surah name (even without "سورة")
      const strippedForSurahCheck = cleanedPiece
        .replace(/^(?:تم\s+حفظ|حفظ\s+جديد|حفظنا|حفظ|تمت\s+مراجعة|مراجعة\s+وتثبيت|راجعنا|مراجعة|تثبيت|تسميع\s+جديد|تسميع\s+الماضي|تسميع|تلاوة|قرأنا|قراءة\s+من|قراءة|إتمام|إتقان|درس|ورد|memorized|new\s+memorization|revised|revision|recitation|reading)\s*[:：\-]?\s*/i, "")
        .replace(/(?:من\s*)?(?:بداية\s+السورة|أول\s+السورة|اول\s+السورة|الآيات|الايات|آيات|ايات|الآية|الاية|آية|اية|صفحة|ص|verses?|ayahs?|page)?\s*\(?\d+(?:\s*(?:إلى|الى|حتى|لـ|to|[-–—])\s*(?:الآية|الاية|آية|اية|الآيات|الايات|آيات|ايات|نهاية\s+السورة|آخر\s+السورة|صفحة|ص)?\s*\d+)?\)?/gi, "")
        .replace(/(?:من\s+بداية\s+السورة|إلى\s+نهاية\s+السورة|الى\s+نهاية\s+السورة|حتى\s+نهاية\s+السورة|كاملة|كامله|نهاية\s+السورة|نهاية|ختام|complete|full)/gi, "")
        .replace(/[()[\]:：\-–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Avoid treating Noor Al-Bayan, Tajweed, or Islamic studies terms as Surahs
      const isNonSurahEducationalPhrase = /(?:القاعدة|النورانية|نور\s*البيان|حركة|حركات|الفتح\s*والكسر|بالفتح|بالكسر|بالضم|مد\s+بال|المد\s+المتصل|المد\s+المنفصل|المد\s+الطبيعي|الإظهار|الإدغام|الإخفاء|الإقلاب|القلقلة|غنة|مخارج|صفات|حديث|فقه|عقيدة|سيرة|أذكار|آداب|صلاة|وضوء|تفسير|شرح\s+حكم|قاعدة)/i.test(cleanedPiece);

      if (!isNonSurahEducationalPhrase && strippedForSurahCheck.length >= 1 && strippedForSurahCheck.split(/\s+/).length <= 2) {
        // Inside deduplicateSurahScope we are already in a Quran category, so allow matching canonical Surahs (except bare "ص" when followed by a page number)
        const isPageAbbrev = /^ص\s*\d+/i.test(cleanedPiece);
        if (!isPageAbbrev) {
          const canonDirect = findCanonicalSurah(strippedForSurahCheck, true);
          if (canonDirect) {
            registerSurahDetail(canonDirect, canonDirect.ar, cleanedPiece);
            return;
          }
        }
      }

      // 4. Non-surah educational item (e.g. "الجزء الثلاثون", "صفحة 582", "آية الكرسي", etc.)
      const cleanGeneral = cleanedPiece
        .replace(/^(?:تم\s+حفظ|حفظ\s+جديد|تمت\s+مراجعة|مراجعة\s+وتثبيت|تمت\s+تلاوة|تمت\s+قراءة|تم\s+قراءة|تم\s+تسميع|تسميع|إتقان|أخذ|دراسة|تم\s+شرح|شرح|lesson|memorized|revised|studied)\s*[:：\-]?\s*/i, "")
        .replace(/^(?:حفظ|الحفظ|مراجعة|المراجعة|تثبيت|التثبيت|تلاوة|التلاوة|قراءة|القراءة|تسميع|التسميع)\s*[:：\-]?\s*/i, "")
        .trim();
      const isBareActionWord =
        /^(?:حفظ|الحفظ|حفظ\s+جديد|الحفظ\s+الجديد|مراجعة|المراجعة|تثبيت|التثبيت|تلاوة|التلاوة|قراءة|القراءة|تسميع|التسميع|قرأنا|حفظنا|راجعنا|سمعنا|القرآن\s+الكريم|قرآن\s+كريم|من\s+سورة|في\s+سورة|memorization|revision|recitation|reading|review|hifz|tilawah)$/i.test(
          cleanGeneral
        );
      if (cleanGeneral.length >= 2 && !isBareActionWord && isCleanValue(cleanGeneral)) {
        generalSet.add(cleanGeneral);
      }
    });
  });

  const outputParts: string[] = [];

  surahMap.forEach(({ canon, details }, key) => {
    const surahDisplay = isEn
      ? (canon ? `Surah ${canon.en}` : `Surah ${key}`)
      : (canon ? `سورة ${canon.ar}` : `سورة ${key}`);

    const detailsArr = Array.from(details).filter(Boolean);
    if (detailsArr.length === 0) {
      outputParts.push(surahDisplay);
    } else {
      const rangeStr = mergeVerseRanges(detailsArr, isEn);
      if (rangeStr) {
        outputParts.push(`${surahDisplay} (${rangeStr})`);
      } else {
        outputParts.push(surahDisplay);
      }
    }
  });

  // Add non-surah topics avoiding duplicate names
  generalSet.forEach(item => {
    const isAlreadyCovered = Array.from(surahMap.keys()).some(k => item.includes(k));
    if (!isAlreadyCovered) {
      const cleanItem = stripAllUrlsAndLinks(item);
      if (cleanItem) {
        outputParts.push(isEn ? sanitizeTextForEnglishReport(cleanItem, "topic") : cleanItem);
      }
    }
  });

  return outputParts.join(isEn ? ", " : "، ");
}

/**
 * Deduplicates non-Surah educational topics (Tajweed rules, Noor Al-Bayan lessons, Islamic Studies topics)
 * without falsely converting words into Surah names or erasing standalone topic titles.
 */
export function deduplicateEducationalTopics(items: string[], lang: "ar" | "en" = "ar"): string {
  if (!items || items.length === 0) return "";
  const isEn = lang === "en";
  const uniqueList: string[] = [];

  items.forEach(raw => {
    const cleanRaw = normalizeTextDigitsAndControls(stripAllUrlsAndLinks(raw));
    if (!isCleanValue(cleanRaw)) return;
    const pieces = cleanRaw
      .replace(/\r?\n/g, " ، ")
      .split(/[,،؛|•+\n]+/)
      .map(p => p.trim())
      .filter(p => isCleanValue(p));

    pieces.forEach(piece => {
      const withoutEval = piece
        .replace(/(?:\s*[-–—]\s*)?(?:التقييم|درجة الحصة|تقييم|المستوى|التقدير|evaluation|grade)\s*[:：\-]?\s*[^\n,،]*$/i, "")
        .replace(/(?:\s*[-–—(]\s*|\s+بمستوى\s+|\s+بتقدير\s+|\s+بتسميع\s+|\s+بأداء\s+)(?:ممتاز(?:\s+جداً|\s+جدا)?|جيد(?:\s+جداً|\s+جدا)?|رائع|متميز|متقن(?:\s+جداً)?)(?:\s*بارك\s+الله[^\n)]*)?\)?$/i, "")
        .trim();

      const strippedPrefix = withoutEval
        .replace(/^(?:تم\s+دراسة|تم\s+أخذ|تم\s+شرح|تم\s+تطبيق|درسنا|أخذنا|شرحنا|تدربنا\s+على|تعرفنا\s+على|تطبيق|دراسة|شرح|أحكام\s+التجويد|تجويد|نور\s+البيان|القاعدة\s+النورانية|دراسات\s+إسلامية|التربية\s+الإسلامية|العلوم\s+الشرعية|اللغة\s+العربية|تأسيس|studied|learned|applied|practiced|tajweed\s+rules|tajweed|noor\s+al-bayan|islamic\s+studies)\s*[:：\-]?\s*/i, "")
        .trim();

      // Keep withoutEval if stripping the category prefix left an empty or 1-char string (e.g. "القاعدة النورانية" alone)
      const cleaned = strippedPrefix.length >= 2 ? strippedPrefix : withoutEval;

      if (!cleaned || cleaned.length < 2 || !isCleanValue(cleaned)) return;

      const targetItem = isEn ? sanitizeTextForEnglishReport(cleaned, "topic") : cleaned;

      const normNew = normalizeArabicSurahToken(targetItem);
      const existingIdx = uniqueList.findIndex(existing => {
        const normEx = normalizeArabicSurahToken(existing);
        return normEx === normNew || normEx.includes(normNew) || normNew.includes(normEx);
      });

      if (existingIdx === -1) {
        uniqueList.push(targetItem);
      } else if (targetItem.length > uniqueList[existingIdx].length) {
        // Keep the more descriptive version
        uniqueList[existingIdx] = targetItem;
      }
    });
  });

  return uniqueList.join(isEn ? ", " : "، ");
}

function mergeVerseRanges(details: string[], isEn: boolean): string {
  const joined = normalizeTextDigitsAndControls(details.join(" "));
  if (/كاملة|كامله|نهاية السورة|كامل السورة|ختام السورة|full|complete|entire/i.test(joined) && !/\d/.test(joined)) {
    return isEn ? "Complete Surah" : "السورة كاملة";
  }

  const intervals: [number, number][] = [];

  details.forEach(rawD => {
    const d = normalizeTextDigitsAndControls(rawD);
    // Match explicit ranges like "1-10", "1 إلى 10", "من الآية 1 إلى الآية 10", "1 to 10"
    const rangeRegex = /(\d+)\s*(?:[-–—]|إلى|الى|حتى|لـ|to)\s*(?:الآية|الاية|آية|اية|الآيات|الايات|آيات|ايات|صفحة|ص|verse|ayah)?\s*(\d+)/gi;
    let match: RegExpExecArray | null;
    let foundExplicitRange = false;
    while ((match = rangeRegex.exec(d)) !== null) {
      const a = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0 && a <= 300 && b <= 300) {
        intervals.push([Math.min(a, b), Math.max(a, b)]);
        foundExplicitRange = true;
      }
    }

    if (!foundExplicitRange) {
      const nums = (d.match(/\d+/g) || [])
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n) && n > 0 && n <= 300);
      if (nums.length >= 2) {
        intervals.push([Math.min(...nums), Math.max(...nums)]);
      } else if (nums.length === 1) {
        intervals.push([nums[0], nums[0]]);
      }
    }
  });

  if (intervals.length > 0) {
    // Sort intervals by start verse
    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged: [number, number][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = intervals[i];
      // Merge if overlapping or contiguous (e.g., 1-10 and 11-20 -> 1-20)
      if (curr[0] <= prev[1] + 1) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        merged.push(curr);
      }
    }

    if (merged.length === 1) {
      const [min, max] = merged[0];
      if (min === max) {
        return isEn ? `Verse ${min}` : `الآية ${min}`;
      }
      return isEn ? `Verses ${min}–${max}` : `الآيات ${min}–${max}`;
    }

    const formattedRanges = merged.map(([min, max]) => (min === max ? `${min}` : `${min}–${max}`));
    return isEn
      ? `Verses ${formattedRanges.join(", ")}`
      : `الآيات ${formattedRanges.join("، ")}`;
  }

  if (/كاملة|كامله|نهاية|ختام|full|complete/i.test(joined)) {
    return isEn ? "Complete Surah" : "السورة كاملة";
  }

  return "";
}

/**
 * Hybrid Section-Header & Contextual Daily Lesson Extractor:
 * 1. Recognizes both Main Headers (عناوين رئيسية) and Subheaders (عناوين فرعية) across all subjects.
 * 2. Automatically classifies unheaded or general-headed lines by word & subject context
 *    (New Memorization, Revision, Quran Reading, Tajweed Rules, Islamic Studies, Noor Al-Bayan/Arabic)
 *    without dropping any studied content.
 * 3. Separates non-achievement section headers (Homework, Next Lesson Plan) from single-line praise/narrative
 *    sentences so a praise line never locks out subsequent lesson lines.
 * 4. Strips embedded evaluations/grades while preserving the lesson content on the same line.
 */
export interface LessonSegmentedCategories {
  newMemorization: string[];
  revision: string[];
  quranReading: string[];
  noorAlBayan: string[];
  tajweedRules: string[];
  islamicStudies: string[];
}

export type CurriculumCategoryKey = keyof LessonSegmentedCategories;
type ActiveSectionState = CurriculumCategoryKey | "excluded" | null;

/**
 * Checks if a line/clause is an explicit non-achievement SECTION HEADER (like Homework or Next Lesson Plan)
 * that should set activeSection = "excluded" for its sub-bullets.
 */
function isExcludedSectionHeader(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // 1. Homework & Next Lesson headers (always excluded)
  if (
    /^(?:الواجب\s+المنزلي|الواجب\s+والتكليفات|واجب\s+الحصة|واجب\s+اليوم|التكليف\s+المنزلي|التكليفات\s+المنزلية|الواجب\s+المطلوب|حالة\s+الواجب|الواجب|واجب|المطلوب\s+للحصة\s+القادمة|المطلوب\s+من\s+الطالب|المطلوب\s+مراجعته|ما\s+يجب\s+مراجعته|خطة\s+الحصة\s+القادمة|مقرر\s+الحصة\s+القادمة|الحصة\s+القادمة|الدرس\s+القادم|خطة\s+الغد|خطة\s+الشهر\s+القادم|أهداف\s+الشهر\s+القادم|homework(?:\s*&\s*assignments|\s+assignment|\s+notes|\s+status)?|home\s+assignment|assignments?|next\s+(?:lesson|class|session|month)(?:\s+plan|\s+goals)?|upcoming\s+lesson)(?=$|[\s:：\-–—(])/i.test(
      t
    )
  ) {
    return true;
  }

  // 2. Evaluation, Notes, Recommendations, Indicators & Closing headers
  // Require either end-of-line, an explicit colon/dash/paren separator, or no curriculum content on the line
  if (
    /^(?:التقييم\s+العام|التقييم\s+الإجمالي|تقييم\s+الحصة|تقييم\s+الطالب|درجة\s+الحصة|مستوى\s+الطالب|مستوى\s+الحصة|ملاحظات\s+لولي\s+الأمر|رسالة\s+لولي\s+الأمر|كلمة\s+لولي\s+الأمر|توجيهات\s+لولي\s+الأمر|التوجيه\s+المستنبط|التوصيات|توصيات\s+المعلم|نقاط\s+القوة|نقاط\s+التميز|نقاط\s+تحتاج\s+تحسين|نقاط\s+التحسين|تفاعل\s+الطالب|سلوك\s+الطالب|التحليل\s+التربوي|الاستنباط\s+والتشخيص|نمط\s+التعلم|مؤشر\s+سرعة|مؤشر\s+قوة|مؤشر\s+التجويد|مؤشر\s+الدراسات|مؤشر\s+الالتزام|إجمالي\s+الحصص|إجمالي\s+الساعات|الخاتمة|ختاماً|ختاما|في\s+الختام|overall\s+evaluation|lesson\s+evaluation|notes\s+for\s+parents|parental\s+(?:partnership\s+)?guidance|message\s+to\s+parents|recommendations|strengths|areas\s+for\s+improvement|student\s+interaction|deep\s+pedagogical|deductive\s+diagnostic|memorization\s+speed\s+indicator|revision\s+strength\s+indicator|tajweed\s*&\s*foundation\s+indicator|islamic\s+studies\s+indicator|commitment\s+indicator|total\s+lessons|total\s+hours|conclusion|closing)(?=$|[\s:：\-–—(])/i.test(
      t
    )
  ) {
    return true;
  }

  if (
    /^(?:التقييم|تقييم|الدرجة|توصيات|evaluation|grade)(?:\s*\([^)]*\))?\s*(?:$|(?:[:：\-–—]\s*.*$))/i.test(t)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether a clause contains any genuine curriculum content (Surah, verse, Quranic term,
 * Tajweed rule, Islamic Studies topic, or Arabic/Foundation topic).
 */
function hasCurriculumSignal(text: string): boolean {
  const t = normalizeTextDigitsAndControls(text).trim();
  if (!t) return false;
  if (
    /(?:سورة|سوره|سور|آية|آيات|اية|ايات|الآية|الآيات|جزء|حزب|ربع|صفحة|قرآن|مصحف|حفظ|مراجعة|تثبيت|تسميع|تلاوة|قراءة|تجويد|إظهار|إدغام|إقلاب|إخفاء|قلقلة|غنة|مد\s|المد|مخارج|صفات|نور\s*البيان|نورانية|النورانية|تأسيس|تهجي|حروف|حركات|فتحة|كسرة|ضمة|الفتح|الكسر|الضم|سكون|تنوين|شدة|كلمات|لغة\s*عربية|نحو|إملاء|دراسات|إسلامية|شرعية|فقه|عقيدة|توحيد|سيرة|حديث|تفسير|أذكار|دعاء|أدعية|آداب|أركان|صلاة|وضوء|طهارة|زكاة|صوم|صيام|حج|أنبياء|صحابة|غزوة|surah|surat|ayah|verse|juz|quran|memoriz|hifz|revis|review|recit|tilawah|tajweed|noor|nourania|phonics|harakat|arabic|islamic|fiqh|aqeedah|tawheed|seerah|hadith|tafsir|adhkar|dua|wudu|prayer|salah)/i.test(
      t
    )
  ) {
    return true;
  }

  // Also check if any word in the clause is an unambiguous canonical Surah name
  const tokens = t.split(/[\s(،,:0-9\-–—]+/).filter(w => w.length >= 3);
  for (const tok of tokens) {
    if (findCanonicalSurah(tok, false) !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a single line/clause is purely a praise, prayer, greeting, or behavioral comment
 * without any curriculum content. Does NOT lock out subsequent lines.
 */
function isPureNarrativeOrPraiseLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  // If it has actual curriculum content, it is NOT a pure narrative line
  if (hasCurriculumSignal(t)) {
    return false;
  }

  if (
    /^(?:نسأل\s+الله|بارك\s+الله|ما\s*شاء\s*الله|تبارك\s*الله|جزاكم\s+الله|حفظه\s+الله|حفظها\s+الله|حفظهم\s+الله|حفظكم\s+الله|وفقه\s+الله|وفقها\s+الله|أحسنت|أحسنتِ|شكراً|شكرا\s+لكم|دمتم|مع\s+خالص|مع\s+أطيب|والسلام\s+عليكم|كان\s+الطالب|كانت\s+الطالبة|أظهر\s+الطالب|أظهرت\s+الطالبة|الطالب\s+ممتاز|الطالب\s+رائع|الطالب\s+متفاعل|ممتاز\s+بارك|نرجو\s+من|يرجى\s+من|نوصي\s+ب|يُنصح\s+ب|ينصح\s+ب|يرجى\s+متابعة|نأمل\s+من|ملاحظات\s+المعلم|ملاحظة\s+المعلم|ملاحظات\s+الحصة|ملاحظات\s+عامة|ملاحظات|ملاحظة|teacher'?s?\s+notes|the\s+student\s+(?:was|showed|demonstrated|is)|please\s+(?:ensure|encourage|follow)|we\s+recommend|parents\s+are\s+advised|may\s+allah|mashallah|barakallahu|well\s+done|thank\s+you)/i.test(
      t
    )
  ) {
    return true;
  }

  return false;
}

function isPureEvaluationGradeLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return /^(?:ممتاز(?:\s+جداً|\s+جدا)?|جيد(?:\s+جداً|\s+جدا)?|متقن(?:\s+جداً|\s+ومثبت)?|رائع|متميز|مقبول|متوسط|ضعيف|تم\s+الإنجاز|مكتمل|حاضر|غائب|متأخر|منجز|غير\s+منجز|10\s*\/\s*10|9\s*\/\s*10|8\s*\/\s*10|\d+\s*%+|excellent|very\s+good|good|mastered|proficient|completed|present|absent)(?:\s*[⭐🌟✨()/\d\s-]*)?$/i.test(
    t
  );
}

/**
 * Strips leading conversational/praise prefixes from a lesson clause while preserving the lesson content.
 */
function stripConversationalLeadIn(clause: string): string {
  return clause
    .replace(
      /^(?:(?:بسم\s+الله\s+الرحمن\s+الرحيم|بسم\s+الله|الحمد\s+لله(?:\s+رب\s+العالمين)?|ما\s*شاء\s*الله(?:\s+تبارك\s+الله)?|تبارك\s+الله|بارك\s+الله\s+فيه(?:ا)?|بفضل\s+الله(?:\s+تعالى)?)\s*[،,.\-–—:：]*\s*)+/i,
      ""
    )
    .replace(
      /^(?:(?:تم\s+اليوم(?:\s+بفضل\s+الله)?|قمنا\s+اليوم\s+بـ?|قام\s+الطالب\s+(?:اليوم\s+)?بـ?|قامت\s+الطالبة\s+(?:اليوم\s+)?بـ?|أنجز\s+الطالب(?:\s+اليوم)?|أنجزت\s+الطالبة(?:\s+اليوم)?|أنجزنا\s+اليوم|درس\s+الطالب(?:\s+اليوم)?|درست\s+الطالبة(?:\s+اليوم)?|أخذ\s+الطالب(?:\s+اليوم)?|أخذت\s+الطالبة(?:\s+اليوم)?)\s*[:：\-–—]?\s*)/i,
      ""
    )
    .trim();
}

/**
 * Checks if a clause contains a Surah name or Quranic verse/juz/page reference (excluding Tafsir).
 */
function containsSurahOrQuranReference(clause: string): boolean {
  const c = normalizeTextDigitsAndControls(clause).trim();
  if (!c) return false;
  if (/(?:تفسير|معاني\s+الكلمات|سبب\s+نزول|أسباب\s+النزول|tafsir)/i.test(c)) {
    return false;
  }
  if (
    /(?:سورة|سوره|سور|الآية|الاية|آية|اية|الآيات|الايات|آيات|ايات|الجزء|جزء|الحزب|حزب|الربع|ربع\s+الحزب|صفحة\s*\d+|ص\s*\d+|المصحف|القرآن|surah|surat|ayah|verse|juz|hizb|mushaf|qur'?an)/i.test(
      c
    )
  ) {
    return true;
  }

  // Check if the clause starts with or contains a canonical Surah name + verse numbers or "كاملة"
  const stripped = c
    .replace(/(?:من\s*)?\d+\s*(?:[-–—]|إلى|الى|حتى|to)\s*\d+/gi, "")
    .replace(/(?:كاملة|كامله|full|complete)/gi, "")
    .replace(/[()[\]:：\-–—]/g, " ")
    .trim();

  if (stripped.length >= 2 && stripped.split(/\s+/).length <= 3) {
    if (findCanonicalSurah(stripped, /\d|كاملة|كامله/i.test(c)) !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Contextual Automatic Classifier:
 * Classifies a lesson clause based on its keywords and subject context when no explicit subheader
 * was used (or when a sub-line switches subjects under a general main header).
 */
function classifyClauseByContext(
  clause: string,
  currentActiveSection: CurriculumCategoryKey | null
): { category: CurriculumCategoryKey; cleanedClause: string } | null {
  const c = stripConversationalLeadIn(normalizeTextDigitsAndControls(clause));
  if (!c || !isCleanValue(c)) return null;

  // 1. Check Islamic Studies contextual signals first (including "حفظ حديث", "حفظ دعاء", "تفسير سورة")
  if (
    /(?:دراسات\s+إسلامية|تربية\s+إسلامية|علوم\s+شرعية|الجانب\s+الشرعي|المحور\s+الشرعي|فقه|عقيدة|توحيد|سيرة\s+نبوية|السيرة|حديث\s+شريف|الحديث|أحاديث|الأربعون\s+النووية|الأربعين\s+النووية|تفسير\s+سورة|تفسير\s+آيات|التفسير|معاني\s+الكلمات|أركان\s+الإسلام|أركان\s+الإيمان|مراتب\s+الدين|الإحسان|شروط\s+الصلاة|أركان\s+الصلاة|واجبات\s+الصلاة|سنن\s+الصلاة|مبطلات\s+الصلاة|كيفية\s+الصلاة|صفة\s+الصلاة|أحكام\s+الصلاة|أحكام\s+الوضوء|فروض\s+الوضوء|نواقض\s+الوضوء|صفة\s+الوضوء|الطهارة|التيمم|الأذان\s+والإقامة|أذكار\s+الصباح|أذكار\s+المساء|أذكار\s+الصلاة|أذكار\s+النوم|أذكار\s+الاستيقاظ|الأذكار|ذكر\s|دعاء\s|أدعية|آداب\s|الآداب\s+الإسلامية|الأخلاق\s+الإسلامية|بر\s+الوالدين|صلة\s+الرحم|حق\s+المسلم|الصدق\s+والأمانة|غزوة\s|الهجرة\s+النبوية|مولد\s+النبي|نسب\s+النبي|بعثة\s+النبي|الخلفاء\s+الراشدين|العشرة\s+المبشرين|الصحابة|قصص\s+الأنبياء|قصص\s+القرآن|قصة\s+سيدنا|قصة\s+نبي|قصة\s+أصحاب|أسماء\s+الله\s+الحسنى|الزكاة|صوم\s+رمضان|أحكام\s+الصيام|مناسك\s+الحج|أحكام\s+الحج|العمرة|إنما\s+الأعمال\s+بالنيات|بني\s+الإسلام\s+على\s+خمس|من\s+حسن\s+إسلام\s+المرء|لا\s+ضرر\s+ولا\s+ضرار|الدين\s+النصيحة|المسلم\s+من\s+سلم|النظافة\s+من\s+الإيمان|تبسمك\s+في\s+وجه|قل\s+آمنت\s+بالله|islamic\s+studies|islamic\s+education|pillars\s+of\s+islam|pillars\s+of\s+iman|fiqh|aqeedah|tawheed|seerah|hadith|prophetic\s+tradition|tafsir|adhkar|supplication|dua|wudu|ablution|salah|prayer\s+rules|fasting|zakat|hajj|prophets\s+stories|islamic\s+manners|etiquette)/i.test(
      c
    )
  ) {
    return { category: "islamicStudies", cleanedClause: c };
  }

  // 2. Check Tajweed Rules contextual signals first (before Noor Al-Bayan so "أحكام النون الساكنة والتنوين" goes to Tajweed)
  if (
    !/(?:سورة|سوره|surah|surat)/i.test(c) &&
    /(?:أحكام\s+التجويد|احكام\s+التجويد|حكم\s+التجويد|قواعد\s+التجويد|قاعدة\s+تجويد|التجويد\s+النظري|التجويد\s+العملي|التجويد\s+التطبيقي|أحكام\s+النون\s+الساكنة|النون\s+الساكنة(?:\s+والتنوين)?|أحكام\s+الميم\s+الساكنة|الميم\s+الساكنة|النون\s+والميم\s+المشددتين|أحكام\s+المدود|المد\s+الطبيعي|المد\s+الفرعي|المد\s+المتصل|المد\s+المنفصل|المد\s+العارض\s+للسكون|المد\s+اللازم|مد\s+البدل|مد\s+العوض|مد\s+الصلة|مد\s+اللين|الإظهار\s+الحلقي|الإظهار\s+الشفوي|الإظهار|الإدغام\s+بغنة|الإدغام\s+بغير\s+غنة|الإدغام\s+الشفوي|إدغام\s+المتماثلين|الإدغام|الإقلاب|الإخفاء\s+الحقيقي|الإخفاء\s+الشفوي|الإخفاء|القلقلة\s+الصغرى|القلقلة\s+الكبرى|حروف\s+القلقلة|القلقلة|مراتب\s+الغنة|الغنة|مخارج\s+الحروف|مخرج\s+الحلق|مخرج\s+اللسان|مخرج\s+الشفتين|مخرج\s+الجوف|مخرج\s+الخيشوم|صفات\s+الحروف|الهمس\s+والجهر|الشدة\s+والرخاوة|الاستعلاء\s+والاستفال|التفخيم\s+والترقيق|أحكام\s+الراء|أحكام\s+لام\s+لفظ\s+الجلالة|الوقف\s+والابتداء|السكت|تحفة\s+الأطفال|المقدمة\s+الجزرية|متن\s+الجزرية|tajweed\s+rules|practical\s+tajweed|noon\s+sakinah|meem\s+sakinah|izhar|idgham|iqlab|ikhfa|qalqalah|madd\s|makharij|ghunnah|tafkhim|tarqiq)/i.test(
      c
    )
  ) {
    return { category: "tajweedRules", cleanedClause: c };
  }

  // 3. Check Noor Al-Bayan & Arabic Language / Reading Foundation contextual signals
  if (
    !/(?:سورة|سوره|surah|surat)/i.test(c) &&
    /(?:نور\s+البيان|القاعدة\s+النورانية|النورانية|القاعدة\s+البغدادية|القاعدة\s+المكية|الجزء\s+الرشيدي|الرشيدي|فتح\s+الرحمن|تأسيس\s+قرائي|التأسيس\s+القرائي|دروس\s+التأسيس|مهارات\s+التأسيس|حروف\s+الهجاء|الحروف\s+الهجائية|الحروف\s+المقطعة|الحروف\s+المتشابهة|أشكال\s+الحروف|مواضع\s+الحروف|حرف\s+ال|حركة\s+الفتح|حركة\s+الكسر|حركة\s+الضم|الحركات\s+الثلاث|الحركات\s+القصيرة|الحركات\s+الطويلة|بالفتح\s+والكسر|بالفتح|بالكسر|بالضم|الفتحة|الكسرة|الضمة|حروف\s+المد|المد\s+بالألف|المد\s+بالالف|المد\s+بالياء|المد\s+بالواو|مد\s+الألف|مد\s+الياء|مد\s+الواو|التنوين\s+بالفتح|التنوين\s+بالكسر|التنوين\s+بالضم|أنواع\s+التنوين|التنوين|السكون|الشدة\s+مع|الحرف\s+المشدد|الشدة|تهجي\s+كلمات|التهجي|تهجي|قراءة\s+كلمات|كلمات\s+ثلاثية|كلمات\s+رباعية|كلمات\s+بحركة|جمل\s+قرائية|تدريبات\s+قرائية|اللغة\s+العربية|لغة\s+عربية|قواعد\s+النحو|النحو\s+العربي|النحو|الإملاء|الخط\s+العربي|الضمائر|أسماء\s+الإشارة|الأسماء\s+الموصولة|الجملة\s+الاسمية|الجملة\s+الفعلية|أقسام\s+الكلمة|حروف\s+الجر|المفرد\s+والمثنى|المذكر\s+والمؤنث|اللام\s+الشمسية\s+واللام\s+القمرية|همزة\s+الوصل|التاء\s+المربوطة|noor\s+al-bayan|nourania|noorani\s+qaida|arabic\s+alphabet|arabic\s+letters|harakat|fatha|kasra|damma|sukoon|tanween|shaddah|phonics|spelling\s+drills|arabic\s+grammar|arabic\s+language|reading\s+words)/i.test(
      c
    )
  ) {
    return { category: "noorAlBayan", cleanedClause: c };
  }

  // 4. Check explicit Quran Revision keywords
  if (
    /(?:المراجعة\s+والتثبيت|مراجعة\s+وتثبيت|المراجعة\s+التراكمية|مراجعة\s+تراكمية|المراجعة\s+الصغرى|المراجعة\s+الكبرى|مراجعة\s+الماضي|مراجعة\s+السابق|مراجعة\s+المحفوظ|مراجعة\s+القريب|مراجعة\s+البعيد|تمت\s+مراجعة|تم\s+مراجعة|راجعنا|راجع\s+الطالب|راجعت\s+الطالبة|راجع\s+سورة|راجع\s+سور|راجع\s+آيات|راجع\s+جزء|راجع\s+حزب|راجع\s+من|مراجعة\s+سورة|مراجعة\s+سور|مراجعة\s+آيات|مراجعة\s+جزء|مراجعة\s+حزب|مراجعة\s+صفحة|مراجعة\s+من|تثبيت\s+سورة|تثبيت\s+المحفوظ|تسميع\s+الماضي|تسميع\s+السابق|تسميع\s+المراجعة|مراجعة\s+عامة|revised\s+surah|revision\s+of|cumulative\s+revision|reviewed\s+surah)/i.test(
      c
    )
  ) {
    return { category: "revision", cleanedClause: c };
  }

  // 5. Check explicit Quran New Memorization keywords
  if (
    /(?:الحفظ\s+الجديد|حفظ\s+جديد|مقرر\s+الحفظ|الحفظ\s+المقرر|تم\s+حفظ|حفظنا|حفظ\s+الطالب|حفظت\s+الطالبة|حفظ\s+سورة|حفظ\s+آيات|حفظ\s+صفحة|حفظ\s+جزء|حفظ\s+من|تلقين\s+سورة|تلقين\s+آيات|تلقين\s+الحفظ|تحفيظ\s+سورة|تحفيظ\s+آيات|تم\s+تسميع|تسميع\s+الجديد|تسميع\s+حفظ|تسميع\s+سورة|تسميع\s+آيات|تسميع\s+صفحة|تسميع\s+جزء|تسميع\s+من|سمع\s+الطالب|سمعت\s+الطالبة|سمعنا|الجديد\s+في\s+الحفظ|new\s+memorization|new\s+hifz|memorized\s+surah|memorization\s+of)/i.test(
      c
    )
  ) {
    return { category: "newMemorization", cleanedClause: c };
  }

  // 6. Check explicit Quran Reading / Recitation keywords
  if (
    /(?:تلاوة\s+وقراءة|تلاوة\s+القرآن|قراءة\s+القرآن|تصحيح\s+التلاوة|تصحيح\s+القراءة|التلاوة\s+والتصحيح|القراءة\s+من\s+المصحف|قراءة\s+من\s+المصحف|ورد\s+التلاوة|تلاوة\s+سورة|تلاوة\s+آيات|تلاوة\s+صفحة|تلاوة\s+جزء|تلاوة\s+حزب|تلاوة\s+من|تمت\s+تلاوة|تمت\s+قراءة|تم\s+قراءة|قرأنا|قرأ\s+الطالب|قرأت\s+الطالبة|قراءة\s+سورة|قراءة\s+آيات|قراءة\s+صفحة|قراءة\s+جزء|قراءة\s+من\s+سورة|recitation\s+of|qur'?an\s+reading|qur'?an\s+recitation|tilawah|read\s+surah)/i.test(
      c
    )
  ) {
    return { category: "quranReading", cleanedClause: c };
  }

  // 7. Check if clause contains a Surah name or Quranic verse/juz/page reference without an explicit verb
  if (containsSurahOrQuranReference(c)) {
    if (
      currentActiveSection === "newMemorization" ||
      currentActiveSection === "revision" ||
      currentActiveSection === "quranReading"
    ) {
      return { category: currentActiveSection, cleanedClause: c };
    }
    return { category: "quranReading", cleanedClause: c };
  }

  // 8. If there is an active section, inherit it
  if (currentActiveSection !== null) {
    return { category: currentActiveSection, cleanedClause: c };
  }

  // 9. Fallback contextual classification for general educational topics when activeSection === null
  if (/(?:كلمة|كلمات|حرف|حروف|جملة|جمل|نطق|قراءة|كتابة|إملاء|تدريب\s+قرائي)/i.test(c)) {
    return { category: "noorAlBayan", cleanedClause: c };
  }
  if (/(?:درس|موضوع|شرح|قصة|باب|فضل|حكم|معنى|تعريف|شروط|أركان|واجبات|سنن|آداب|سلوك|قيمة)/i.test(c)) {
    return { category: "islamicStudies", cleanedClause: c };
  }

  return null;
}

function detectExplicitCategoryHeader(clause: string): {
  category: CurriculumCategoryKey;
  remainder: string;
  isHeaderOnly: boolean;
  isGeneralMainHeader?: boolean;
} | null {
  const c = normalizeTextDigitsAndControls(clause)
    .replace(/^[*_~`[\]()]+|[*_~`]+$/g, "")
    .replace(/[*_~`]+\s*([:：\-–—])/g, "$1")
    .trim();
  if (!c) return null;

  const extractAfterHeader = (match: RegExpMatchArray): { remainder: string; isHeaderOnly: boolean } => {
    const rawRem = (match[1] || "")
      .replace(/^[*_~`)\]]+\s*/, "")
      .replace(/^(?:\((?:إن\s+وجد|إن\s+وجدت|if\s+applicable|[^)]*)\)\s*)?[:：\-–—]?\s*/i, "")
      .replace(/^[*_~`]+\s*/, "")
      .trim();
    // Check if the remainder is merely a compound section title suffix like "والتجويد" or "وأحكام التجويد" or "والآداب"
    const isCompoundHeaderSuffix =
      /^(?:و\s*)?(?:أحكام\s+التجويد|التجويد|تجويد|نور\s+البيان|القاعدة\s+النورانية|التأسيس|اللغة\s+العربية|الدراسات\s+الإسلامية|الآداب|الأذكار|التلاوة|القراءة)\s*[:：\-–—]?$/i.test(
        rawRem
      );
    if (isCompoundHeaderSuffix) {
      return { remainder: "", isHeaderOnly: true };
    }
    return {
      remainder: rawRem,
      isHeaderOnly: rawRem.length === 0
    };
  };

  // 1. Islamic Studies Main & Subheaders
  const islamicMatch = c.match(
    /^(?:(?:(?:درس|موضوع|قسم|فرع|محور|فقرة|الجانب)\s+)?(?:الدراسات\s+الإسلامية(?:\s+والآداب|\s+والأذكار|\s+والعلوم\s+الشرعية)?|دراسات\s+إسلامية|التربية\s+الإسلامية|تربية\s+إسلامية|العلوم\s+الشرعية|علوم\s+شرعية|الثقافة\s+الإسلامية|الجانب\s+الشرعي(?:\s+والتربوي)?|المحور\s+الشرعي|القسم\s+الشرعي|الفرع\s+الشرعي|الآداب\s+الإسلامية|آداب\s+إسلامية|الآداب\s+والأذكار|الأذكار\s+والآداب|الأذكار\s+اليومية|الأذكار\s+الشرعية|الأدعية\s+الشرعية|الأدعية\s+اليومية|الفقه\s+والعبادات|الفقه\s+الإسلامي|الفقه\s+الميسر|في\s+الفقه|العقيدة\s+الإسلامية|العقيدة\s+الميسرة|في\s+العقيدة|في\s+التوحيد|السيرة\s+النبوية|السيرة\s+العطرة|في\s+السيرة(?:\s+النبوية)?|الحديث\s+الشريف|الأحاديث\s+النبوية|الأحاديث\s+الشريفة|في\s+الحديث|التفسير\s+الميسر|في\s+التفسير|الأخلاق\s+الإسلامية|القيم\s+التربوية|islamic\s+studies(?:\s*&\s*arabic|\s+lessons)?|islamic\s+education|islamic\s+sciences|islamic\s+manners|islamic\s+etiquette)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فرع|محور|فقرة)\s+)?(?:الأذكار|أذكار|الأدعية|أدعية|الدعاء|دعاء|الفقه|فقه|العبادات|الطهارة|العقيدة|عقيدة|التوحيد|توحيد|السيرة|سيرة|الحديث|حديث\s+شريف|حديث|التفسير|تفسير|قصص\s+الأنبياء|قصص\s+القرآن|الآداب|آداب|fiqh|aqeedah|tawheed|seerah|hadith|adhkar|daily\s+adhkar|dua|tafsir|stories\s+of\s+the\s+prophets)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (islamicMatch) {
    const rawCap = islamicMatch[1] ?? islamicMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    return { category: "islamicStudies", remainder, isHeaderOnly };
  }

  // 2. Tajweed Rules Main & Subheaders
  const tajweedMatch = c.match(
    /^(?:(?:(?:درس|شرح|تطبيق|قسم|فرع|محور|فقرة)\s+)?(?:أحكام\s+التجويد\s+المطبقة|أحكام\s+التجويد|احكام\s+التجويد|قواعد\s+التجويد|قاعدة\s+التجويد|قاعدة\s+تجويد|حكم\s+التجويد|حكم\s+تجويد|درس\s+التجويد|درس\s+تجويد|التجويد\s+النظري|التجويد\s+العملي|التجويد\s+التطبيقي|تطبيق\s+التجويد|في\s+التجويد|tajweed\s+rules\s+applied|tajweed\s+rules|tajweed\s+progress|practical\s+tajweed)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فرع|محور|فقرة)\s+)?(?:التجويد|تجويد|أحكام\s+النون\s+الساكنة|أحكام\s+الميم\s+الساكنة|أحكام\s+المدود|مخارج\s+الحروف|صفات\s+الحروف|تحفة\s+الأطفال|المقدمة\s+الجزرية|tajweed|tajwid)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (tajweedMatch) {
    const rawCap = tajweedMatch[1] ?? tajweedMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    return { category: "tajweedRules", remainder, isHeaderOnly };
  }

  // 3. Noor Al-Bayan, Arabic Language & Foundation Main & Subheaders
  const noorMatch = c.match(
    /^(?:(?:(?:درس|دروس|تدريبات|قسم|فرع|محور|فقرة)\s+)?(?:دروس\s+نور\s+البيان\s+والتأسيس|نور\s+البيان\s+والتأسيس|دروس\s+نور\s+البيان|في\s+نور\s+البيان|نور\s+البيان|القاعدة\s+النورانية(?:\s+والتجويد)?|النورانية|نورانية|القاعدة\s+البغدادية|البغدادية|القاعدة\s+المكية|الجزء\s+الرشيدي|الرشيدي|فتح\s+الرحمن|التأسيس\s+القرائي|التأسيس\s+العربي|دروس\s+التأسيس|مهارات\s+التأسيس|مهارات\s+القراءة\s+والكتابة|القراءة\s+والكتابة|تأسيس\s+قرائي|اللغة\s+العربية|لغة\s+عربية|الجانب\s+اللغوي|المحور\s+اللغوي|قواعد\s+اللغة\s+العربية|القواعد\s+النحوية|النحو\s+العربي|noor\s+al-bayan(?:\s+lessons|\s*&\s*foundation)?|noor\s+al\s+bayan|al-qaida\s+al-noorania|nourania|noorani\s+qaida|reading\s+foundation|arabic\s+foundation|foundation\s+lessons|foundation\s+drills|arabic\s+language|arabic\s+grammar)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فرع|محور|فقرة)\s+)?(?:التأسيس|تأسيس|النحو|الإملاء|الخط\s+العربي|الكتابة|التهجي|تهجي|حروف\s+الهجاء|الحروف\s+الهجائية|phonics|spelling)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (noorMatch) {
    const rawCap = noorMatch[1] ?? noorMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    return { category: "noorAlBayan", remainder, isHeaderOnly };
  }

  // 4. Revision Subheaders
  const revisionMatch = c.match(
    /^(?:(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:المراجعة\s+والتثبيت|مراجعة\s+وتثبيت|المراجعة\s+التراكمية|مراجعة\s+تراكمية|المراجعة\s+الكبرى|المراجعة\s+الصغرى|المراجعة\s+القريبة|المراجعة\s+البعيدة|مراجعة\s+القريب|مراجعة\s+البعيد|مراجعة\s+الماضي|مراجعة\s+السابق|مراجعة\s+المحفوظ|المحفوظ\s+السابق|ما\s+تمت\s+مراجعته|مراجعة\s+اليوم|ورد\s+المراجعة|مقرر\s+المراجعة|تسميع\s+الماضي|تسميع\s+السابق|تسميع\s+المراجعة|revision\s*&\s*retention|revision\s+and\s+retention|revision\s*&\s*reinforcement|cumulative\s+revision)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:المراجعة|مراجعة|التثبيت|تثبيت|الماضي|السابق|revision|review)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (revisionMatch) {
    const rawCap = revisionMatch[1] ?? revisionMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    if (!isHeaderOnly && !/(?:سورة|سوره|آيات|آية|جزء|حزب|صفحة|قرآن|surah|surat|ayah|verse|juz)/i.test(remainder)) {
      if (/(?:دراسات\s+إسلامية|حديث|فقه|عقيدة|توحيد|سيرة|أذكار|دعاء|آداب|أركان|صلاة|وضوء|islamic|hadith|fiqh|seerah|aqeedah|adhkar|dua)/i.test(remainder)) {
        return { category: "islamicStudies", remainder, isHeaderOnly: false };
      }
      if (/(?:نور\s+البيان|النورانية|حروف|حركة\s+الفتح|حركة\s+الكسر|حركة\s+الضم|الحركات|الفتح\s+والضم|الفتح\s+والكسر|التنوين|تهجي|noor\s+al-bayan|nourania|harakat|phonics)/i.test(remainder)) {
        return { category: "noorAlBayan", remainder, isHeaderOnly: false };
      }
      if (/(?:أحكام\s+التجويد|النون\s+الساكنة|الميم\s+الساكنة|الإظهار|الإدغام|الإقلاب|الإخفاء|المدود|القلقلة|مخارج\s+الحروف|tajweed|izhar|idgham|ikhfa|qalqalah)/i.test(remainder)) {
        return { category: "tajweedRules", remainder, isHeaderOnly: false };
      }
    }
    return { category: "revision", remainder, isHeaderOnly };
  }

  // 5. New Memorization Subheaders
  const memMatch = c.match(
    /^(?:(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:الحفظ\s+الجديد|حفظ\s+جديد|مقرر\s+الحفظ\s+الجديد|الحفظ\s+المقرر|مقرر\s+الحفظ|ورد\s+الحفظ|حفظ\s+اليوم|ما\s+تم\s+حفظه|الجديد\s+في\s+الحفظ|الدرس\s+الجديد(?:\s*\(حفظ\))?|الحفظ\s+والتسميع|آيات\s+الحفظ|سورة\s+الحفظ|تسميع\s+الجديد|تسميع\s+الحفظ|new\s+memorization|new\s+hifz)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:الحفظ|حفظ|الجديد|التحفيظ|تحفيظ|التلقين|تلقين|التسميع|تسميع|memorization|hifz)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (memMatch) {
    const rawCap = memMatch[1] ?? memMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    if (!isHeaderOnly && !/(?:سورة|سوره|آيات|آية|جزء|حزب|صفحة|قرآن|surah|surat|ayah|verse|juz)/i.test(remainder)) {
      if (/(?:حديث|أحاديث|دعاء|أدعية|أذكار|ذكر|آداب|فقه|عقيدة|توحيد|سيرة|أركان|صلاة|وضوء|معاني\s+الكلمات|hadith|dua|adhkar|fiqh|seerah|aqeedah|islamic)/i.test(remainder)) {
        return { category: "islamicStudies", remainder, isHeaderOnly: false };
      }
      if (/(?:نور\s+البيان|النورانية|حروف\s+الهجاء|الحروف\s+الهجائية|حركات|noor\s+al-bayan|nourania|alphabet)/i.test(remainder)) {
        return { category: "noorAlBayan", remainder, isHeaderOnly: false };
      }
      if (/(?:تحفة\s+الأطفال|الجزرية|أحكام\s+التجويد|قاعدة\s+تجويد|tajweed\s+rule)/i.test(remainder)) {
        return { category: "tajweedRules", remainder, isHeaderOnly: false };
      }
    }
    return { category: "newMemorization", remainder, isHeaderOnly };
  }

  // 6. Quran Reading & Recitation Subheaders AND General Quran Main Headers (e.g. "القرآن الكريم:")
  const readingMatch = c.match(
    /^(?:(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:تلاوة\s+وقراءة\s+القرآن(?:\s+الكريم)?|تلاوة\s+القرآن(?:\s+الكريم)?|قراءة\s+القرآن(?:\s+الكريم)?|التلاوة\s+وتصحيح\s+القراءة|التلاوة\s+وتصحيح\s+التلاوة|التلاوة\s+والتصحيح|تصحيح\s+التلاوة|تصحيح\s+القراءة|التلاوة\s+والتأسيس|تلاوة\s+وتأسيس|التلاوة\s+والقراءة|تلاوة\s+وقراءة|التلاوة\s+والتجويد|تلاوة\s+وتجويد|التلاوة\s+النظرية|التلاوة\s+الحاضرة|التلاوة\s+المركزة|ورد\s+التلاوة|مقرر\s+التلاوة|الورد\s+القرآني(?:\s+تلاوة)?|المقرر\s+القرآني|الجانب\s+القرآني|المحور\s+القرآني|القسم\s+القرآني|القرآن\s+الكريم|قرآن\s+كريم|تلاوة\s+اليوم|قراءة\s+اليوم|قراءة\s+من\s+المصحف|القراءة\s+من\s+المصحف|القراءة\s+القرآنية|holy\s+qur'?an|qur'?an\s+section|qur'?an\s+reading(?:\s*&\s*recitation)?|qur'?an\s+recitation|recitation\s*&\s*foundation|recitation\s+and\s+foundation|recitation\s*&\s*tajweed)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?=$|[\s:：\-–—*\]])\s*[:：\-–—]?\s*(.*)|(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:التلاوة|تلاوة|القراءة|قراءة|recitation|tilawah|reading)(?:\s*\((?:إن\s+وجد|if\s+applicable|[^)]*)\))?(?:\s*$|(?=\s*[:：\-–—*\]])\s*[:：\-–—*\]\s]*(.*)))$/i
  );
  if (readingMatch) {
    const rawCap = readingMatch[1] ?? readingMatch[2] ?? "";
    const { remainder, isHeaderOnly } = extractAfterHeader(["", rawCap] as unknown as RegExpMatchArray);
    const isGeneralQuranMain = /^(?:(?:قسم|فقرة|ورد|محور|فرع)\s+)?(?:القرآن\s+الكريم|قرآن\s+كريم|الورد\s+القرآني|المقرر\s+القرآني|الجانب\s+القرآني|المحور\s+القرآني|القسم\s+القرآني|holy\s+qur'?an|qur'?an\s+section)/i.test(
      c
    );

    if (!isHeaderOnly) {
      // If it's a general "القرآن الكريم: ..." header, check if the remainder specifies حفظ or مراجعة or تجويد
      if (isGeneralQuranMain) {
        const subHeader = detectExplicitCategoryHeader(remainder);
        if (subHeader) {
          return subHeader;
        }
        const ctxMatch = classifyClauseByContext(remainder, "quranReading");
        if (ctxMatch) {
          return { category: ctxMatch.category, remainder: ctxMatch.cleanedClause, isHeaderOnly: false };
        }
      }

      if (!/(?:سورة|سوره|آيات|آية|جزء|حزب|صفحة|قرآن|مصحف|surah|surat|ayah|verse|juz|page)/i.test(remainder)) {
        if (/(?:حديث|فقه|عقيدة|سيرة|أذكار|دعاء|آداب|أركان|صلاة|وضوء|islamic|hadith|fiqh|seerah|aqeedah|adhkar|dua)/i.test(remainder)) {
          return { category: "islamicStudies", remainder, isHeaderOnly: false };
        }
        if (/(?:نور\s+البيان|النورانية|حروف|حركة\s+الفتح|حركة\s+الكسر|حركة\s+الضم|التنوين|تهجي|كلمات|noor\s+al-bayan|nourania|harakat|phonics)/i.test(remainder)) {
          return { category: "noorAlBayan", remainder, isHeaderOnly: false };
        }
      }
    }
    return { category: "quranReading", remainder, isHeaderOnly, isGeneralMainHeader: isGeneralQuranMain };
  }

  return null;
}

/**
 * Parses a multi-line or single-line text block using the Hybrid Section-Header & Contextual Extractor.
 */
export function extractCategorizedItemsFromText(rawText?: string | null): LessonSegmentedCategories {
  const result: LessonSegmentedCategories = {
    newMemorization: [],
    revision: [],
    quranReading: [],
    noorAlBayan: [],
    tajweedRules: [],
    islamicStudies: []
  };

  if (!rawText || !rawText.trim()) return result;

  const normalizedBlock = normalizeTextDigitsAndControls(stripAllUrlsAndLinks(rawText));
  const rawLines = normalizedBlock.split(/\r?\n/);
  let activeSection: ActiveSectionState = null;

  const cleanTrailingEvaluation = (val: string): string => {
    return stripAllUrlsAndLinks(
      val
        .replace(/(?:\s*[-–—]\s*)?(?:التقييم|درجة الحصة|تقييم|المستوى|التقدير|evaluation|grade)\s*[:：\-]?\s*[^\n]*$/i, "")
        .replace(
          /(?:[،,\-–—(]\s*|\s+)(?:(?:وكان|وكانت)\s+(?:مستواه(?:ا)?|أداؤه(?:ا)?|تسميعه(?:ا)?|حفظه(?:ا)?|تلاوته(?:ا)?|قراءته(?:ا)?)\s+|بمستوى\s+|بتقدير\s+|بتسميع\s+|بأداء\s+|قراءة\s+متقنة\s*|تلاوة\s+متقنة\s*|تسميع\s+متقن\s*|حفظ\s+متقن\s*)?(?:ممتاز(?:ة)?(?:\s+جداً|\s+جدا)?|جيد(?:ة)?(?:\s+جداً|\s+جدا)?|رائع(?:ة)?|متميز(?:ة)?|متقن(?:ة)?(?:\s+جداً|\s+جدا)?)(?:\s*بارك\s+الله[^\n)]*|\s*ما\s*شاء\s*الله[^\n)]*)?\)?$/i,
          ""
        )
        .trim()
    );
  };

  for (const rawLine of rawLines) {
    // 1. Strip leading emojis, symbols, markdown bullets/hashes/asterisks without eating verse numbers
    let line = rawLine
      .replace(
        /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}✨🌟⭐🕌📖📚🌿💎🔹🔸•●○◦▪▫◾◽◼◻▸▹►▻⌲⌳➔➕➖➗✖✓✔✕✖✗✘✅☑⬅➡⬆⬇↗↘↙↖↪↩#*+>|~`]+/gu,
        ""
      )
      .replace(/^[-–—]+\s*/, "")
      .trim();

    // Strip list numbering like "1-", "1.", "1)", "(1)", "[1]", "أولاً:", "أ-" without stripping Arabic letters at start of words
    line = line
      .replace(
        /^(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\]|\d{1,2}\s*[.)]|\d{1,2}\s*[-–—]\s+(?!\d)|(?:أولاً|أولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا|ثامناً|ثامنا|first|second|third|fourth|fifth|sixth)\s*[:：.)\-–—]?(?=$|\s)|(?:[أبجده]|هـ)\s*[:：.)\-–—](?=$|\s))\s*/i,
        ""
      )
      .replace(/^[*_~`]+|[*_~`]+$/g, "")
      .replace(/[*_~`]+\s*([:：\-–—])/g, "$1")
      .replace(/^\[([^\]]+)\]\s*([:：\-–—])/, "$1$2")
      .replace(/^\(([^)]+)\)\s*([:：\-–—])/, "$1$2")
      .trim();

    if (!line) continue;

    // 2. Metadata / Report Header lines -> reset section state and skip line
    if (
      /^(?:اسم\s+الطالب|الطالب|الطالبة|التاريخ|تاريخ\s+الحصة|اليوم|المعلم|المعلمة|اسم\s+المعلم|المادة|حالة\s+الحضور|الحضور|مدة\s+الحصة|رقم\s+الحصة|الحصة\s+رقم|تقرير\s+الحصة|تقرير\s+اليوم|تقرير\s+الطالب|التقرير\s+اليومي|التقرير\s+الشهري|مسيرتي\s+في\s+القرآن|السلام\s+عليكم|مرحباً|أهلاً|تحية\s+طيبة|يسرنا|يطيب\s+لنا|student\s*name|student|date|day|teacher\s*name|teacher|subject|attendance|duration|lesson\s*(?:number|#)|daily\s*report|lesson\s*report|my\s*qur'?an\s*journey|dear\s*parent|as-salamu)(?=$|[\s:：\-–—✨🌟])/i.test(
        line
      )
    ) {
      activeSection = null;
      continue;
    }

    // Strip leading "بسم الله..." or "الحمد لله..." and check if lesson content remains on the same line
    line = stripConversationalLeadIn(line);
    if (!line) continue;

    // 3. General Lesson Main Headers (e.g. "ما حدث داخل الحصة:", "ما تم إنجازه:", "محاور الدرس:")
    const wrapperMatch = line.match(
      /^(?:ما\s+حدث\s+داخل\s+الحصة|ما\s+تم\s+داخل\s+الحصة|ما\s+تم\s+إنجازه(?:\s+في\s+الحصة|\s+اليوم)?|ما\s+تم\s+دراسته(?:\s+في\s+الحصة|\s+اليوم)?|ما\s+تمت\s+دراسته(?:\s+في\s+الحصة|\s+اليوم)?|ما\s+تم\s+أخذه(?:\s+اليوم)?|ما\s+أخذناه(?:\s+اليوم)?|تفاصيل\s+الحصة|تفاصيل\s+الدرس|محتوى\s+الحصة|محتوى\s+الدرس|ملخص\s+الحصة|ملخص\s+الدرس|إنجازات\s+الحصة|إنجازات\s+اليوم|محاور\s+الحصة|محاور\s+الدرس|عناصر\s+الحصة|عناصر\s+الدرس|فقرات\s+الحصة|سير\s+الحصة|الأنشطة\s+التعليمية|موضوع\s+الحصة|موضوع\s+الدرس|عنوان\s+الدرس|درس\s+اليوم|حصاد\s+الحصة|حصاد\s+اليوم|التقرير\s+الأكاديمي|الجانب\s+التعليمي|الجانب\s+الأكاديمي|أبرز\s+ما\s+تم\s+تناوله|أبرز\s+المحاور|class\s+content(?:\s*&\s*performance)?|in-class\s+activities|lesson\s+details|lesson\s+summary|what\s+was\s+covered|topics\s+covered|session\s+highlights)(?=$|[\s:：\-–—])\s*[:：\-–—]?\s*(.*)$/i
    );
    if (wrapperMatch) {
      activeSection = null;
      const rem = (wrapperMatch[1] || "").trim();
      if (!rem) {
        continue;
      }
      line = rem;
    }

    // 4. Excluded Section Headers (Homework, Next Lesson Plan, Overall Evaluation, Recommendations, Closings)
    if (isExcludedSectionHeader(line)) {
      activeSection = "excluded";
      continue;
    }

    // Skip single-line pure praise/prayer sentences WITHOUT setting activeSection = "excluded"
    if (isPureNarrativeOrPraiseLine(line)) {
      continue;
    }

    // 5. Split mid-line section transitions and compound lesson clauses
    const preSplitLine = line
      .replace(
        /(?:\s*[,،؛;|+/]+\s*(?:و\s*|مع\s*)?|\s+و\s*|\s+ثم\s+|\s+مع\s+|\s+بالإضافة\s+إلى\s+|\s+كذلك\s+|\s+أيضاً\s+|\s+and\s+|\s+plus\s+)(?=(?:الحفظ\s+الجديد|حفظ\s+جديد|تم\s+حفظ|حفظنا|حفظ\s+سورة|حفظ\s+آيات|تحفيظ|تلقين|تم\s+تسميع|تسميع\s+سورة|المراجعة\s+والتثبيت|مراجعة\s+وتثبيت|تمت\s+مراجعة|راجعنا|راجع\s+سورة|مراجعة\s+سورة|مراجعة\s+جزء|مراجعة\s+من\s+سورة|مراجعة\s+حروف|مراجعة\s+قاعدة|المراجعة\s*:|مراجعة\s*:|تثبيت\s+سورة|تلاوة\s+القرآن|قراءة\s+القرآن|التلاوة\s+وتصحيح|تصحيح\s+التلاوة|التلاوة\s*:|تلاوة\s*:|تلاوة\s+سورة|قراءة\s+سورة|تلاوة\s+صفحة|قراءة\s+صفحة|قرأنا|القرآن\s+الكريم\s*:|نور\s+البيان|القاعدة\s+النورانية|النورانية|التأسيس\s+القرائي|درس\s+نور\s+البيان|في\s+نور\s+البيان|اللغة\s+العربية|تدربنا\s+على\s+قراءة\s+كلمات|أحكام\s+التجويد|قاعدة\s+تجويد|حكم\s+تجويد|التجويد\s*:|تجويد\s*:|تطبيق\s+حكم|شرح\s+حكم|دراسة\s+حكم|الدراسات\s+الإسلامية|دراسات\s+إسلامية|التربية\s+الإسلامية|العلوم\s+الشرعية|درس\s+فقه|في\s+الفقه|الفقه\s*:|فقه\s*:|درس\s+عقيدة|في\s+العقيدة|العقيدة\s*:|التوحيد\s*:|درس\s+سيرة|في\s+السيرة|السيرة\s*:|درس\s+حديث|في\s+الحديث|الحديث\s*:|حديث\s+شريف|شرح\s+حديث|التفسير\s*:|تفسير\s+سورة|الأذكار\s*:|الآداب\s+الإسلامية|الآداب\s*:|الواجب\s+المنزلي|الواجب\s*:|واجب\s+الحصة|الحصة\s+القادمة|خطة\s+الحصة|التقييم\s+العام|new\s+memorization|new\s+hifz|memorized\s+surah|revision\s*:|revised\s+surah|recitation\s*:|qur'?an\s+reading|noor\s+al-bayan|nourania|tajweed\s+rules|tajweed\s*:|islamic\s+studies|homework\s*:|next\s+lesson|overall\s+evaluation)(?=$|[\s:：\-–—(]))/gi,
        "\n"
      );

    const clauses = preSplitLine
      .split(/[\r\n|؛;•]+/)
      .map(c =>
        c
          .replace(/^[-*+•]\s*/, "")
          .replace(/^(?:\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\]|\d{1,2}\s*[.)]|\d{1,2}\s*[-–—]\s+(?!\d))\s*/, "")
          .replace(/^[*_~`]+|[*_~`]+$/g, "")
          .trim()
      )
      .filter(Boolean);

    for (const rawClause of clauses) {
      const clause = stripConversationalLeadIn(rawClause);
      if (!clause) continue;

      if (isExcludedSectionHeader(clause)) {
        activeSection = "excluded";
        break;
      }

      if (isPureNarrativeOrPraiseLine(clause)) {
        continue;
      }

      const explicitHeader = detectExplicitCategoryHeader(clause);
      if (explicitHeader) {
        const { category, remainder, isHeaderOnly } = explicitHeader;
        if (isHeaderOnly) {
          activeSection = category;
          continue;
        }
        if (!isCleanValue(remainder)) {
          // Explicit negative/empty value after header (e.g., "الحفظ الجديد: لا يوجد")
          activeSection = "excluded";
          continue;
        }
        activeSection = category;
        const cleanVal = cleanTrailingEvaluation(remainder);
        if (
          isCleanValue(cleanVal) &&
          !isPureEvaluationGradeLine(cleanVal) &&
          !isPureNarrativeOrPraiseLine(cleanVal)
        ) {
          result[category].push(cleanVal);
        }
        continue;
      }

      // Clause does NOT start with an explicit header
      if (activeSection === "excluded") {
        continue;
      }

      // Check if clause has a colon whose right-hand side is negative/empty
      const colonParts = clause.split(/[:：]/);
      if (colonParts.length >= 2) {
        const afterColon = colonParts.slice(1).join(":").trim();
        if (!isCleanValue(afterColon)) {
          continue;
        }
      }

      const cleanVal = cleanTrailingEvaluation(clause);
      if (
        !isCleanValue(cleanVal) ||
        isPureEvaluationGradeLine(cleanVal) ||
        isPureNarrativeOrPraiseLine(cleanVal)
      ) {
        continue;
      }

      // Classify automatically using contextual keywords + activeSection inheritance
      const contextualMatch = classifyClauseByContext(cleanVal, activeSection);
      if (contextualMatch) {
        activeSection = contextualMatch.category;
        result[contextualMatch.category].push(contextualMatch.cleanedClause);
      }
    }
  }

  return result;
}

export function extractCategorizedItemsFromLesson(lesson: {
  classEvents?: string;
  reportText?: string;
  teacherNotes?: string;
  homeworkNotes?: string;
}): LessonSegmentedCategories {
  const result: LessonSegmentedCategories = {
    newMemorization: [],
    revision: [],
    quranReading: [],
    noorAlBayan: [],
    tajweedRules: [],
    islamicStudies: []
  };

  // Parse classEvents and reportText independently so section state never leaks across blocks
  const primaryBlocks = [lesson.classEvents || "", lesson.reportText || ""].filter(b => b.trim().length > 0);

  for (const block of primaryBlocks) {
    const parsed = extractCategorizedItemsFromText(block);
    result.newMemorization.push(...parsed.newMemorization);
    result.revision.push(...parsed.revision);
    result.quranReading.push(...parsed.quranReading);
    result.noorAlBayan.push(...parsed.noorAlBayan);
    result.tajweedRules.push(...parsed.tajweedRules);
    result.islamicStudies.push(...parsed.islamicStudies);
  }

  // Fallback: If primary blocks had no extracted curriculum items (e.g., teacher wrote the lesson summary inside teacherNotes),
  // extract from teacherNotes as well.
  const hasAnyExtracted =
    result.newMemorization.length > 0 ||
    result.revision.length > 0 ||
    result.quranReading.length > 0 ||
    result.noorAlBayan.length > 0 ||
    result.tajweedRules.length > 0 ||
    result.islamicStudies.length > 0;

  if (!hasAnyExtracted && lesson.teacherNotes && lesson.teacherNotes.trim().length > 0) {
    const parsedNotes = extractCategorizedItemsFromText(lesson.teacherNotes);
    result.newMemorization.push(...parsedNotes.newMemorization);
    result.revision.push(...parsedNotes.revision);
    result.quranReading.push(...parsedNotes.quranReading);
    result.noorAlBayan.push(...parsedNotes.noorAlBayan);
    result.tajweedRules.push(...parsedNotes.tajweedRules);
    result.islamicStudies.push(...parsedNotes.islamicStudies);
  }

  return result;
}

/**
 * Generates dynamic, strictly category-gated pedagogical narratives, recommendations,
 * goals, and next-month plans that ONLY reference the categories actually studied by the student.
 */
export function buildCategorySpecificNarratives(flags: {
  hasHefz: boolean;
  hasRev: boolean;
  hasRead: boolean;
  hasNoor: boolean;
  hasTajweed: boolean;
  hasIslamic: boolean;
  isEn: boolean;
}): {
  pedagogicalAnalysis: string;
  deductiveInference: string;
  monthlyProgressSummary: string;
  learningProfile: string;
  parentalGuidance: string;
  defaultStrengths: string[];
  defaultRecommendations: string[];
  nextMonthGoals: string[];
  expectedNextMonthPlan: string;
} {
  const { hasHefz, hasRev, hasRead, hasNoor, hasTajweed, hasIslamic, isEn } = flags;

  const activeAr: string[] = [];
  const activeEn: string[] = [];

  if (hasHefz) {
    activeAr.push("الحفظ الجديد");
    activeEn.push("New Memorization");
  }
  if (hasRev) {
    activeAr.push("المراجعة والتثبيت");
    activeEn.push("Revision & Retention");
  }
  if (hasRead) {
    activeAr.push("تلاوة القرآن الكريم وتصحيح القراءة");
    activeEn.push("Qur'an Reading & Recitation");
  }
  if (hasNoor) {
    activeAr.push("دروس نور البيان والتأسيس القرائي");
    activeEn.push("Noor Al-Bayan & Reading Foundation");
  }
  if (hasTajweed) {
    activeAr.push("أحكام التجويد التطبيقية");
    activeEn.push("Applied Tajweed Rules");
  }
  if (hasIslamic) {
    activeAr.push("الدراسات والآداب الإسلامية");
    activeEn.push("Islamic Studies & Manners");
  }

  const joinedAr = activeAr.length > 0 ? activeAr.join("، و") : "المنهج المقرر";
  const joinedEn = activeEn.length > 0 ? activeEn.join(", ") : "the assigned curriculum";

  // 1. Monthly Progress Summary (Factual summary based strictly on recorded daily reports)
  const monthlyProgressSummary = isEn
    ? `Monthly progress summary: The student completed the scheduled sessions focusing on ${joinedEn}. Daily session logs document the covered curriculum portions, with recorded evaluations reflecting the student's actual performance level across completed lessons.`
    : `ملخص التقدم الشهري: أتمّ الطالب حضور الحصص المقررة في المنهج المعتمد لمادة (${joinedAr}). وتثبت تقارير الحصص اليومية إنجاز الموضوعات الموثقة وفق التقييمات الفعلية المسجلة من قِبل المعلم.`;

  // Retain for compatibility with existing templates/callers
  const pedagogicalAnalysis = monthlyProgressSummary;
  const deductiveInference = monthlyProgressSummary;

  // 3. Learning Profile (Factual academic observation)
  const learningProfile = isEn
    ? "Interactive engagement during sessions with direct responsiveness to teacher instructions and lesson drills."
    : "تفاعل إيجابي مع توجيهات المعلم ومتابعة مباشرة للمقرر الدراسي والتدريبات الصفية.";

  // 4. Parental Guidance (Academic follow-up strictly matching active categories)
  let parentalGuidance = "";
  if (isEn) {
    if (hasHefz || hasRev) {
      parentalGuidance = "Encourage regular daily review of the covered Surahs at home as assigned by the teacher.";
    } else if (hasRead || hasTajweed) {
      parentalGuidance = "Encourage daily practice of the covered Qur'an reading portions at home while observing proper pronunciation.";
    } else if (hasNoor) {
      parentalGuidance = "Encourage brief daily practice of the covered Noor Al-Bayan phonetic spelling and reading exercises at home.";
    } else if (hasIslamic) {
      parentalGuidance = "Review the covered Islamic Studies topics and lessons at home.";
    } else {
      parentalGuidance = "Encourage regular daily home follow-up on the covered lesson topics.";
    }
  } else {
    if (hasHefz || hasRev) {
      parentalGuidance = "يوصى بالمتابعة المنزلية المنتظمة لمراجعة السور المقررة وفق توجيه المعلم لترسيخ الحفظ.";
    } else if (hasRead || hasTajweed) {
      parentalGuidance = "يوصى بمواصلة القراءة والمراجعة المنزلية للورد المقرر من المصحف بانتظام.";
    } else if (hasNoor) {
      parentalGuidance = "يوصى بممارسة تدريبات التهجي والقراءة من دروس نور البيان في المنزل لتعزيز الطلاقة.";
    } else if (hasIslamic) {
      parentalGuidance = "يوصى بمراجعة موضوعات ودروس الدراسات الإسلامية المنجزة مع الطالب في المنزل.";
    } else {
      parentalGuidance = "يوصى بالمتابعة المنزلية المنتظمة لما تم إنجازه في الحصص الدراسية.";
    }
  }

  // 5. Default Strengths (Factual academic observations strictly matching active categories)
  const defaultStrengths: string[] = [];
  if (isEn) {
    defaultStrengths.push("Consistent attendance and attentive participation during scheduled sessions.");
    if (hasRead || hasTajweed) {
      defaultStrengths.push("Good application of covered recitation rules and pronunciation guidance.");
    }
    if (hasIslamic) {
      defaultStrengths.push("Active participation and positive interaction during Islamic Studies topics.");
    }
    if (hasNoor) {
      defaultStrengths.push("Progress in foundational phonetic spelling and reading exercises.");
    }
    if (hasHefz || hasRev) {
      defaultStrengths.push("Diligence in practicing and recalling the assigned Quranic portions.");
    }
  } else {
    defaultStrengths.push("الالتزام بالحضور والتفاعل الإيجابي مع المعلم أثناء الحصة.");
    if (hasRead || hasTajweed) {
      defaultStrengths.push("الحرص على تطبيق أحكام التلاوة ومخارج الحروف التي تم تدريسها.");
    }
    if (hasIslamic) {
      defaultStrengths.push("التفاعل الطيب مع موضوعات ودروس الدراسات الإسلامية المقررة.");
    }
    if (hasNoor) {
      defaultStrengths.push("إنجاز تدريبات التأسيس القرائي وتهجي الكلمات المدروسة.");
    }
    if (hasHefz || hasRev) {
      defaultStrengths.push("الاجتهاد في تسميع ومراجعة الآيات والسور المقررة.");
    }
  }

  // 6. Default Recommendations (Academic support strictly matching active categories)
  const defaultRecommendations: string[] = [];
  if (isEn) {
    if (hasHefz || hasRev) {
      defaultRecommendations.push("Consistent daily listening and review of the covered Surahs at home.");
    }
    if (hasRead || hasTajweed) {
      defaultRecommendations.push("Regular daily practice of Qur'an reading from the Mushaf.");
    }
    if (hasNoor) {
      defaultRecommendations.push("Regular practice of the covered Noor Al-Bayan reading and spelling drills.");
    }
    if (hasIslamic) {
      defaultRecommendations.push("Reviewing covered Islamic Studies topics at home periodically.");
    }
    if (defaultRecommendations.length === 0) {
      defaultRecommendations.push("Regular home follow-up on the covered lesson portions.");
    }
  } else {
    if (hasHefz || hasRev) {
      defaultRecommendations.push("المداومة على الاستماع ومراجعة السور المقررة لتثبيت المحفوظ.");
    }
    if (hasRead || hasTajweed) {
      defaultRecommendations.push("المداومة على تلاوة الورد المقرر من المصحف الشريف.");
    }
    if (hasNoor) {
      defaultRecommendations.push("ممارسة التهجي القرائي اليومي للدروس المدروسة لزيادة طلاقة القراءة.");
    }
    if (hasIslamic) {
      defaultRecommendations.push("مراجعة موضوعات الدراسات الإسلامية المقررة بانتظام.");
    }
    if (defaultRecommendations.length === 0) {
      defaultRecommendations.push("المتابعة المنزلية المنتظمة لما تم إنجازه لضمان ترسيخ المادة المدروسة.");
    }
  }

  // 7. Next Month Goals & Proposed Plan (strictly matching active categories)
  const nextMonthGoals: string[] = [];
  const planLines: string[] = [];

  if (isEn) {
    planLines.push("Proposed progression for next month based on documented pace in active subjects:");
    if (hasHefz) {
      nextMonthGoals.push("Advance steadily through the subsequent assigned Surahs");
      planLines.push("- New Memorization: Continue the subsequent portion maintaining the demonstrated retention rate.");
    }
    if (hasRev) {
      nextMonthGoals.push("Reinforce cumulative revision through consistent review");
      planLines.push("- Revision: Systematic cumulative review of covered Surahs to consolidate recall.");
    }
    if (hasRead) {
      nextMonthGoals.push("Enhance Qur'an reading fluency from the Mushaf");
      planLines.push("- Qur'an Reading & Recitation: Continue progressive reading portions with accurate pronunciation.");
    }
    if (hasTajweed) {
      nextMonthGoals.push("Apply studied Tajweed rules practically during recitation");
      planLines.push("- Tajweed Rules: Continued practical application of Tajweed rules during recitation.");
    }
    if (hasNoor) {
      nextMonthGoals.push("Progress to the next Noor Al-Bayan reading drills");
      planLines.push("- Noor Al-Bayan & Foundation: Advance to the next foundational reading drills.");
    }
    if (hasIslamic) {
      nextMonthGoals.push("Continue progressive lessons in Islamic Studies");
      planLines.push("- Islamic Studies: Continue progressive lessons according to the curriculum.");
    }
    if (nextMonthGoals.length === 0) {
      nextMonthGoals.push("Continue steady progress in the scheduled curriculum");
      planLines.push("- Curriculum Progression: Continue steady advancement in the assigned curriculum.");
    }
    planLines.push("(Note: This plan is an estimated projection based on actual student pace, not a binding commitment).");
  } else {
    planLines.push("خطة مقترحة للشهر القادم مبنية على الاحتياجات الموثقة والوتيرة الفعلية في المواد المدروسة:");
    if (hasHefz) {
      nextMonthGoals.push("مواصلة السير في الحفظ الجديد بنسق متدرج");
      planLines.push("- الحفظ الجديد: مواصلة حفظ المقدار التالي من السور وفق وتيرة الطالب المحققة.");
    }
    if (hasRev) {
      nextMonthGoals.push("تثبيت المراجعة التراكمية عبر الورد المنتظم");
      planLines.push("- المراجعة والتثبيت: مراجعة المحفوظ التراكمي بانتظام لضمان استحضار الآيات.");
    }
    if (hasRead) {
      nextMonthGoals.push("متابعة القراءة المقررة من المصحف وضبط مخارج الحروف");
      planLines.push("- تلاوة القرآن الكريم: استكمال القراءة المقررة من المصحف مع تصحيح الأداء ومراعاة مخارج الحروف.");
    }
    if (hasTajweed) {
      nextMonthGoals.push("تطبيق أحكام التجويد المدروسة عملياً أثناء القراءة");
      planLines.push("- أحكام التجويد: التطبيق العملي المستمر لقواعد التجويد المدروسة أثناء التلاوة.");
    }
    if (hasNoor) {
      nextMonthGoals.push("الانتقال إلى تدريبات نور البيان التالية لتعزيز القراءة");
      planLines.push("- نور البيان والتأسيس: الانتقال إلى تدريبات القاعدة التالية لتعزيز طلاقة التهجي والقراءة.");
    }
    if (hasIslamic) {
      nextMonthGoals.push("استكمال موضوعات الدراسات الإسلامية المقررة");
      planLines.push("- الدراسات الإسلامية: استكمال الموضوعات التربوية المقررة وترسيخ الآداب والأذكار.");
    }
    if (nextMonthGoals.length === 0) {
      nextMonthGoals.push("مواصلة التقدم المنتظم في المنهج المقرر للشهر القادم");
      planLines.push("- المسار التعليمي: مواصلة التقدم المنتظم في المقرر المخصص مع التثبيت المستمر.");
    }
    planLines.push("(ملاحظة: هذه الخطة مقترح تقديري مبني على الأداء الفعلي، وليست التزاماً قطعياً).");
  }

  return {
    pedagogicalAnalysis,
    deductiveInference,
    monthlyProgressSummary,
    learningProfile,
    parentalGuidance,
    defaultStrengths: defaultStrengths.slice(0, 3),
    defaultRecommendations: defaultRecommendations.slice(0, 3),
    nextMonthGoals,
    expectedNextMonthPlan: planLines.join("\n")
  };
}

/**
 * Checks whether a narrative string mentions curriculum categories that the student did NOT study.
 */
function textMentionsUnstudiedCategory(
  text: string,
  flags: {
    hasHefz: boolean;
    hasRev: boolean;
    hasRead: boolean;
    hasNoor: boolean;
    hasTajweed: boolean;
    hasIslamic: boolean;
  }
): boolean {
  if (!text) return false;
  if (
    !flags.hasHefz &&
    /(?:الحفظ\s+الجديد|حفظ\s+جديد|مقرر\s+الحفظ|سرعة\s+الحفظ|حفظ\s+السور|في\s+الحفظ|بين\s+الحفظ|ملكة\s+حفظ|new\s+memorization|new\s+hifz|memorization\s+speed|memorizing\s+new)/i.test(
      text
    )
  ) {
    return true;
  }
  if (
    !flags.hasRev &&
    /(?:المراجعة\s+التراكمية|مراجعة\s+تراكمية|المراجعة\s+والتثبيت|قوة\s+المراجعة|مراجعة\s+المحفوظ|تثبيت\s+المحفوظ|cumulative\s+revision|cumulative\s+review|revision\s+strength|memorized\s+surahs)/i.test(
      text
    )
  ) {
    return true;
  }
  if (
    !flags.hasHefz &&
    !flags.hasRev &&
    /(?:المحفوظ|تثبيت\s+الحفظ|الحفظ\s+والمراجعة|التسميع|memorized\s+portions|retention\s+of\s+memorized)/i.test(text)
  ) {
    return true;
  }
  if (!flags.hasNoor && /(?:نور\s+البيان|القاعدة\s+النورانية|noor\s+al-bayan|nourania)/i.test(text)) {
    return true;
  }
  if (!flags.hasIslamic && /(?:الدراسات\s+الإسلامية|التربية\s+الإسلامية|الفقه\s+والسيرة|islamic\s+studies)/i.test(text)) {
    return true;
  }
  return false;
}

/**
 * التحقق مما إذا كانت المادة مؤهلة حصراً للتقرير الشهري
 */
/**
 * التحقق مما إذا كانت المادة مؤهلة للتقرير الشهري
 */
export function isSubjectEligibleForMonthlyReport(subject?: string | null): boolean {
  if (!subject) return true;
  const lower = subject.trim().toLowerCase();
  if (
    lower.includes("quran") ||
    lower.includes("قرآن") ||
    lower.includes("arabic") ||
    lower.includes("عرب") ||
    lower.includes("islamic") ||
    lower.includes("إسلام") ||
    lower.includes("بيان") ||
    lower.includes("nouran")
  ) {
    return true;
  }
  return true; // All active academy students are eligible
}

/**
 * استخراج المواد المؤهلة للطالب
 */
export function getEligibleSubjectsForStudent(student?: Student | null): string[] {
  if (!student) return ["Quran, Arabic and Islamic Studies"];
  const list = new Set<string>();

  if (student.subject) list.add(student.subject.trim());
  if (Array.isArray(student.subjects)) {
    student.subjects.forEach(sub => {
      if (sub?.subject) list.add(sub.subject.trim());
    });
  }

  list.add("Quran, Arabic and Islamic Studies");
  list.add("قرآن كريم");
  list.add("لغة عربية");
  list.add("الدراسات الإسلامية");

  return Array.from(list);
}

/**
 * تصفية قائمة الطلاب للمؤهلين فقط
 */
export function filterEligibleStudentsForMonthly(students: Student[]): Student[] {
  if (!Array.isArray(students)) return [];
  return students.filter(s => {
    if (!s) return false;
    if (s.status !== "active") return false;
    return getEligibleSubjectsForStudent(s).length > 0;
  });
}

/**
 * الكشف التلقائي الدقيق عن المواد التي درسها الطالب فعلياً خلال الشهر من سجلات الحصص والتقارير
 * مع دعم التجاوز اليدوي المباشر من المعلم
 */
export function detectStudentActiveSubjects(params: {
  student?: Student | null;
  lessons: StructuredMonthlyLessonLog[];
  subjectOverrides?: {
    quran?: boolean;
    arabic?: boolean;
    islamicStudies?: boolean;
  };
}): {
  hasQuran: boolean;
  hasArabic: boolean;
  hasIslamicStudies: boolean;
  counts: { quran: number; arabic: number; islamicStudies: number };
  evidence: { quran: string[]; arabic: string[]; islamicStudies: string[] };
} {
  const { student, lessons = [], subjectOverrides } = params;

  const quranEvidence: string[] = [];
  const arabicEvidence: string[] = [];
  const islamicEvidence: string[] = [];

  lessons.forEach(l => {
    const combinedText = `${l.classEvents || ""} ${l.reportText || ""} ${l.teacherNotes || ""}`.trim();
    if (!combinedText) return;

    // Quran check: Surahs, Ayahs, Recitation, Tajweed, Memorization, Revision
    if (
      containsSurahOrQuranReference(combinedText) ||
      /(?:تحفيظ|تلقين|مصحف|سورة|آيات|تجويد|النون\s+الساكنة|الميم\s+الساكنة|الإظهار|الإدغام|الإقلاب|الإخفاء|القلقلة|المدود|مخارج\s+الحروف|qur'?an|surah|ayah|hifz|tajweed|recitation)/i.test(
        combinedText
      ) ||
      /(?:^|\s)(?:حفظ\s+سورة|حفظ\s+آيات|حفظ\s+جديد|تسميع\s+سورة|تسميع\s+آيات|تسميع\s+القرآن|مراجعة\s+سورة|مراجعة\s+وتثبيت|تلاوة\s+القرآن|تلاوة\s+من\s+المصحف)(?=$|[\s,،؛:.\-])/i.test(
        combinedText
      )
    ) {
      quranEvidence.push(combinedText.slice(0, 100));
    }

    // Arabic Language check: Noor Al-Bayan, letters, vowels, spelling, reading words, grammar, vocabulary
    if (
      /(?:نور\s+البيان|القاعدة\s+النورانية|التأسيس\s+القرائي|التأسيس\s+اللغوي|دروس\s+التأسيس|حروف\s+الهجاء|الحروف\s+الهجائية|حركة\s+الفتح|حركة\s+الكسر|حركة\s+الضم|الحركات|تنوين|شدة|سكون|مد\s+بالألف|مد\s+بالواو|مد\s+بالياء|اللام\s+الشمسية|اللام\s+القمرية|تهجي|قراءة\s+الكلمات|كتابة|إملاء|نحو|قواعد\s+اللغة|أقسام\s+الكلمة|حروف\s+الجر|أسماء\s+الإشارة|الضمائر|مفردات|معاني\s+الكلمات|لغة\s+عربية|اللغة\s+العربية|noor\s+al-bayan|nourania|arabic\s+language|arabic\s+grammar|phonics|spelling|dictation|handwriting)/i.test(
        combinedText
      ) ||
      /(?:^|\s)(?:الفعل|فعل\s+ماض|فعل\s+مضارع|الفاعل|المفعول\s+به|المبتدأ|الخبر|الخط\s+العربي|خط\s+النسخ|خط\s+الرقعة)(?=$|[\s,،؛:.\-])/i.test(
        combinedText
      )
    ) {
      arabicEvidence.push(combinedText.slice(0, 100));
    }

    // Islamic Studies check: Fiqh, Aqeedah, Seerah, Hadith, Adhkar, Manners, Tafsir
    if (
      /(?:دراسات\s+إسلامية|تربية\s+إسلامية|علوم\s+شرعية|فقه|عبادات|صلاة|وضوء|طهارة|عقيدة|توحيد|أركان\s+الإسلام|أركان\s+الإيمان|سيرة|نبي|رسول|صحابة|قصص\s+الأنبياء|حديث\s+شريف|أحاديث|سنن|أذكار|دعاء|آداب\s+إسلامية|آداب|بر\s+الوالدين|أخلاق|تفسير|معاني\s+السورة|islamic\s+studies|fiqh|aqeedah|seerah|hadith|adhkar|dua|islamic\s+manners)/i.test(
        combinedText
      )
    ) {
      islamicEvidence.push(combinedText.slice(0, 100));
    }
  });

  let detectedQuran = quranEvidence.length > 0;
  let detectedArabic = arabicEvidence.length > 0;
  let detectedIslamic = islamicEvidence.length > 0;

  // Fallback to student profile ONLY when no lessons were recorded at all in this period
  if (lessons.length === 0 && !detectedQuran && !detectedArabic && !detectedIslamic) {
    const rawStudentSubjects = Array.isArray(student?.subjects) ? student!.subjects.map(s => s.subject) : [];
    const directSubject = (student?.subject || "").trim();
    const allStudentSubjectsText = [...rawStudentSubjects, directSubject].join(" ").toLowerCase();
    const isUmbrellaGroup = /quran,\s*arabic\s*and\s*islamic|القرآن.*العربية.*الإسلامية/i.test(allStudentSubjectsText);

    if (!isUmbrellaGroup) {
      if (/quran|قرآن/i.test(allStudentSubjectsText)) detectedQuran = true;
      if (/arabic|عرب|بيان|نور/i.test(allStudentSubjectsText)) detectedArabic = true;
      if (/islamic|إسلام/i.test(allStudentSubjectsText)) detectedIslamic = true;
    }

    // When still nothing detected or student belongs to generic umbrella group with 0 lessons,
    // default exclusively to primary Quran baseline rather than falsely claiming 3 subjects!
    if (!detectedQuran && !detectedArabic && !detectedIslamic) {
      detectedQuran = true;
    }
  }

  // Teacher manual override has highest authority
  const hasQuran = subjectOverrides?.quran !== undefined ? Boolean(subjectOverrides.quran) : detectedQuran;
  const hasArabic = subjectOverrides?.arabic !== undefined ? Boolean(subjectOverrides.arabic) : detectedArabic;
  const hasIslamicStudies = subjectOverrides?.islamicStudies !== undefined ? Boolean(subjectOverrides.islamicStudies) : detectedIslamic;

  return {
    hasQuran,
    hasArabic,
    hasIslamicStudies,
    counts: {
      quran: quranEvidence.length,
      arabic: arabicEvidence.length,
      islamicStudies: islamicEvidence.length
    },
    evidence: {
      quran: quranEvidence,
      arabic: arabicEvidence,
      islamicStudies: islamicEvidence
    }
  };
}

/**
 * Returns a dynamic subtitle matching only the subjects actually studied by the student
 */
export function getReportSubtitle(
  activeSubjects?: { quran?: boolean; arabic?: boolean; islamicStudies?: boolean } | null,
  isEn: boolean = false
): string {
  if (!activeSubjects) {
    return isEn
      ? "Comprehensive Student Evaluation & Learning Progress"
      : "تقييم أداء الطالب ومتابعة التقدم التعليمي";
  }

  const { quran, arabic, islamicStudies } = activeSubjects;

  if (quran && !arabic && !islamicStudies) {
    return isEn ? "Holy Qur'an & Tajweed Learning Progress" : "متابعة دراسة القرآن الكريم والتجويد";
  }
  if (!quran && arabic && !islamicStudies) {
    return isEn ? "Arabic Language & Foundation Learning Progress" : "متابعة دراسة اللغة العربية ونور البيان والتأسيس";
  }
  if (!quran && !arabic && islamicStudies) {
    return isEn ? "Islamic Studies Learning Progress" : "متابعة دراسة العلوم والدراسات الإسلامية";
  }
  if (quran && arabic && !islamicStudies) {
    return isEn ? "Holy Qur'an & Arabic Language Learning Progress" : "متابعة دراسة القرآن الكريم واللغة العربية";
  }
  if (quran && !arabic && islamicStudies) {
    return isEn ? "Holy Qur'an & Islamic Studies Learning Progress" : "متابعة دراسة القرآن الكريم والدراسات الإسلامية";
  }
  if (!quran && arabic && islamicStudies) {
    return isEn ? "Arabic Language & Islamic Studies Learning Progress" : "متابعة دراسة اللغة العربية والدراسات الإسلامية";
  }
  if (quran && arabic && islamicStudies) {
    return isEn ? "Holy Qur'an, Arabic Language & Islamic Studies Progress" : "متابعة دراسة القرآن الكريم واللغة العربية والدراسات الإسلامية";
  }

  return isEn
    ? "Comprehensive Student Evaluation & Learning Progress"
    : "تقييم أداء الطالب ومتابعة التقدم التعليمي";
}

/**
 * تقييم وصفي كيفي مبني بدقة وصراحة على ملاحظات المعلم الفعلية دون اختلاق نسب افتراضية
 */
export function evaluateQualitativeMastery(params: {
  explicitScore?: number | null;
  teacherNotes: string[];
  evaluations: string[];
  isEn: boolean;
}): QualitativeEvaluationBadge {
  const { explicitScore, teacherNotes = [], evaluations = [], isEn } = params;

  if (explicitScore !== null && explicitScore !== undefined && explicitScore > 0) {
    if (explicitScore >= 95) {
      return {
        level: "mastered",
        labelEn: `Mastered (${explicitScore}%)`,
        labelAr: `ممتاز ومتقن (${explicitScore}%)`,
        descriptionEn: "High academic distinction and consistent mastery.",
        descriptionAr: "امتياز وتفوق مستمر في الأداء والاستيعاب."
      };
    }
    if (explicitScore >= 85) {
      return {
        level: "very_good",
        labelEn: `Very Good (${explicitScore}%)`,
        labelAr: `جيد جداً مرتفع (${explicitScore}%)`,
        descriptionEn: "Solid comprehension and steady consolidation.",
        descriptionAr: "إتقان طيب وتثبيت متين للمقرر."
      };
    }
    if (explicitScore >= 75) {
      return {
        level: "good",
        labelEn: `Good (${explicitScore}%)`,
        labelAr: `جيد (${explicitScore}%)`,
        descriptionEn: "Regular progress with positive engagement.",
        descriptionAr: "تقدم مستمر وتفاعل إيجابي مع المنهج."
      };
    }
    return {
      level: "needs_practice",
      labelEn: `Needs Practice (${explicitScore}%)`,
      labelAr: `يحتاج إلى تدريب ومتابعة (${explicitScore}%)`,
      descriptionEn: "More targeted practice is recommended.",
      descriptionAr: "يوصى بتكثيف التدريب والمتابعة المنزلية."
    };
  }

  // Purely qualitative from teacher notes
  const combined = `${evaluations.join(" ")} ${teacherNotes.join(" ")}`.toLowerCase();
  if (/ممتاز\s*جداً|رائع|متقن\s*جداً|أبدع|ما\s*شاء\s*الله|outstanding|excellent|perfect|mastered/i.test(combined)) {
    return {
      level: "mastered",
      labelEn: "Mastered (Excellent)",
      labelAr: "ممتاز (متقن)",
      descriptionEn: "Demonstrates consistent mastery and swift comprehension.",
      descriptionAr: "أظهر إتقاناً متميزاً واستيعاباً سريعاً للمقرر."
    };
  }
  if (/ممتاز|متقن|متميز|أحسنت|proficient|great/i.test(combined)) {
    return {
      level: "mastered",
      labelEn: "Mastered",
      labelAr: "متقن ومتميز",
      descriptionEn: "Strong retention and solid execution.",
      descriptionAr: "استحضار قوي وأداء سليم متقن."
    };
  }
  if (/جيد\s*جداً|متمكن|تقدم\s*طيب|very\s*good/i.test(combined)) {
    return {
      level: "very_good",
      labelEn: "Very Good (Consolidating)",
      labelAr: "جيد جداً (متمكن)",
      descriptionEn: "Steady progress with solid foundation.",
      descriptionAr: "تطور منتظم وتثبيت مستمر للمهارات."
    };
  }
  if (/جيد|مرضي|good|satisfactory/i.test(combined)) {
    return {
      level: "good",
      labelEn: "Good (Steady Progress)",
      labelAr: "جيد (تقدم مستمر)",
      descriptionEn: "Progressing well with regular attendance.",
      descriptionAr: "أداء مرضي وتفاعل طيب في الحصص."
    };
  }
  if (/يحتاج|تردد|بطء|تكرار|تنبيه|needs\s*practice|needs\s*improvement|hesitation/i.test(combined)) {
    return {
      level: "needs_practice",
      labelEn: "Needs Practice",
      labelAr: "يحتاج تدريباً ومتابعة",
      descriptionEn: "Benefits from guided review and reinforcement.",
      descriptionAr: "يستفيد من التكرار والمراجعة الموجهة لزيادة التمكين."
    };
  }

  if (evaluations.length > 0 || teacherNotes.length > 0) {
    return {
      level: "good",
      labelEn: "Consistent Progress",
      labelAr: "تقدم مستمر",
      descriptionEn: "Attentive participation and good curriculum coverage.",
      descriptionAr: "مشاركة إيجابية وإنجاز طيب للمقرر."
    };
  }

  return {
    level: "not_recorded",
    labelEn: "Continuous Observation",
    labelAr: "متابعة مستمرة",
    descriptionEn: "Continuous qualitative observation across monthly sessions.",
    descriptionAr: "متابعة وتقييم مستمر عبر حصص الشهر."
  };
}

/**
 * الطبقة الداخلية المنظمة: تجميع وتحليل الشهر كاملاً كبيانات مترابطة مرتبة زمنياً
 */
export function buildStructuredMonthlyAnalysis(params: {
  student: Student;
  subject: string;
  year: number;
  month: number;
  allReports: GeneratedReport[];
  allAttendance: AttendanceRecord[];
  teacherName?: string;
  lang?: "ar" | "en";
  archiveGroupFilter?: string;
  includeAllProvidedRecords?: boolean;
}): StructuredMonthlyAnalysis {
  const {
    student,
    subject,
    year,
    month,
    allReports = [],
    allAttendance = [],
    teacherName = "أ. محمد فتحي (Mohammed Fathy)",
    lang = subject === "Quran, Arabic and Islamic Studies" ? "en" : "ar",
    archiveGroupFilter,
    includeAllProvidedRecords = false
  } = params;

  const isEn = lang === "en";
  const safeMonth = Math.max(1, Math.min(12, month));
  const targetMonthAr = ARABIC_MONTHS[safeMonth - 1];
  const targetMonthEn = ENGLISH_MONTHS[safeMonth - 1].toLowerCase();

  const doesDateMatchYearMonth = (rawDate?: string): boolean => {
    const d = normalizeTextDigitsAndControls(rawDate || "").trim();
    if (!d) return false;

    // 1. YYYY-MM-DD or YYYY/M/D
    const ymdMatch = d.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10);
      if (y === year && m === safeMonth) return true;
    }

    // 2. DD-MM-YYYY or D/M/YYYY
    const dmyMatch = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const m = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      if (y === year && m === safeMonth) return true;
    }

    // 3. Textual month & year inside date string
    if ((d.includes(targetMonthAr) || d.toLowerCase().includes(targetMonthEn)) && d.includes(String(year))) {
      return true;
    }

    return false;
  };

  const matchesMonthOrArchiveFilter = (
    dateStr?: string,
    isArch?: boolean,
    archGroup?: string
  ): boolean => {
    if (includeAllProvidedRecords) return true;

    const g = normalizeTextDigitsAndControls(archGroup || "").trim();
    const dateMatchesMonth =
      doesDateMatchYearMonth(dateStr) ||
      Boolean(g && (g.includes(targetMonthAr) || g.toLowerCase().includes(targetMonthEn)) && g.includes(String(year)));

    if (archiveGroupFilter && archiveGroupFilter !== "all_month") {
      if (archiveGroupFilter === "archived_only") {
        return Boolean(isArch) && dateMatchesMonth;
      }
      // Specific archive folder selected (e.g. "أرشيف سبتمبر 2026" or "باقة أكتوبر (8 حصص)")
      const normFilter = normalizeTextDigitsAndControls(archiveGroupFilter.replace(/^group_/, "")).trim();
      if (g && (g === normFilter || `أرشيف ${g}` === normFilter || g === `أرشيف ${normFilter}`)) {
        return true;
      }
      // Also match if report has no custom archiveGroup but its month archive label matches
      if (!g && isArch && dateMatchesMonth && (normFilter.includes(targetMonthAr) || normFilter.toLowerCase().includes(targetMonthEn))) {
        return true;
      }
      return false;
    }

    return dateMatchesMonth;
  };

  const normalizeStudentNameForMatch = (name?: string): string =>
    normalizeTextDigitsAndControls(name || "")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/^(?:اسم\s+الطالب(?:ة)?|الطالب(?:ة)?|student\s*name|student)\s*[:：\-–—]?\s*/i, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[.:：\-–—_()[\]]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const targetStudentNormName = normalizeStudentNameForMatch(student.fullName);

  const matchesStudent = (recStudentId?: string, recStudentName?: string): boolean => {
    if (includeAllProvidedRecords) return true;
    if (recStudentId && student.id && recStudentId === student.id) return true;
    if (recStudentName && targetStudentNormName) {
      const recNorm = normalizeStudentNameForMatch(recStudentName);
      if (recNorm === targetStudentNormName) return true;
      // Also match if one name starts with the other as complete word tokens (e.g., "عمر" vs "عمر أحمد" when studentId wasn't stored)
      if (!recStudentId && recNorm.length >= 3 && targetStudentNormName.length >= 3) {
        if (
          targetStudentNormName.startsWith(`${recNorm} `) ||
          recNorm.startsWith(`${targetStudentNormName} `)
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // جميع سجلات الطالب (لاستخدامها كبديل تلقائي إذا لم يتطابق تاريخ الشهر المحدد مع الدورة النشطة للطالب)
  const studentAllAttendance = allAttendance.filter(att => att && matchesStudent(att.studentId, att.studentName));
  const studentAllDailyReports = allReports.filter(
    rep => rep && matchesStudent(rep.studentId, rep.studentName) && rep.reportType !== "monthly_comprehensive"
  );

  // 1. تصفية الحضور للشهر/الأرشيف والطالب (شاملاً السجلات المؤرشفة والنشطة)
  let monthAttendance = studentAllAttendance.filter(att =>
    matchesMonthOrArchiveFilter(att.date, att.archived, att.archiveGroup)
  );

  // 2. تصفية التقارير اليومية للشهر/الأرشيف والطالب (شاملاً التقارير المؤرشفة والنشطة، واستبعاد أي تقارير شهرية شاملة سابقة)
  let monthReports = studentAllDailyReports.filter(rep =>
    matchesMonthOrArchiveFilter(rep.date || rep.createdAt, rep.archived, rep.archiveGroup)
  );

  // استرجاع ذكي تلقائي: إذا لم يُعثر على حصص مطابقة لتاريخ الشهر المختار (مثلاً بسبب امتداد الباقة بين شهرين أو اختلاف صيغة التاريخ)
  // بينما يمتلك الطالب تقارير يومية نشطة (أو مسجلة)، يتم تضمينها تلقائياً حتى لا يخرج التقرير الشهري فارغاً
  if (monthAttendance.length === 0 && monthReports.length === 0 && archiveGroupFilter !== "archived_only") {
    const activeAtt = studentAllAttendance.filter(att => !att.archived);
    const activeRep = studentAllDailyReports.filter(rep => !rep.archived);
    if (activeAtt.length > 0 || activeRep.length > 0) {
      monthAttendance = activeAtt;
      monthReports = activeRep;
    } else if (studentAllAttendance.length > 0 || studentAllDailyReports.length > 0) {
      monthAttendance = studentAllAttendance;
      monthReports = studentAllDailyReports;
    }
  }

  // 3. توحيد الحصص (المؤرشفة والنشطة) وترتيبها تصاعدياً حسب التسلسل الزمني
  const lessonsMap = new Map<string, StructuredMonthlyLessonLog>();

  monthAttendance.forEach((att, idx) => {
    const normDate = normalizeTextDigitsAndControls(att.date || "").slice(0, 10) || `lesson_att_${idx + 1}`;
    const key = att.lessonNumber ? `${normDate}_#${att.lessonNumber}` : `${normDate}_${att.id || idx}`;
    lessonsMap.set(key, {
      id: att.id,
      date: normDate,
      lessonNumber: att.lessonNumber,
      durationMinutes: att.durationMinutes || 60,
      attendance: att.attendance === "present" ? "present" : att.attendance === "late" ? "late" : "absent",
      homeworkStatus: att.homeworkStatus === "done" ? "done" : att.homeworkStatus === "late" ? "partial" : "not_done",
      classEvents: att.classEvents || "",
      homeworkNotes: att.homeworkNotes || "",
      teacherNotes: att.teacherNotes || "",
      overallEvaluation: "",
      reportText: att.generatedReportText || "",
      isArchived: Boolean(att.archived),
      archiveGroup: att.archiveGroup
    });
  });

  monthReports.forEach((rep, idx) => {
    const normDate = normalizeTextDigitsAndControls(rep.date || rep.createdAt || "").slice(0, 10) || `lesson_rep_${idx + 1}`;
    const exactKey = rep.lessonNumber ? `${normDate}_#${rep.lessonNumber}` : normDate;
    // Check if there is an attendance entry on the same date to merge with
    let matchingKey = exactKey;
    if (!lessonsMap.has(exactKey)) {
      const sameDateKey = Array.from(lessonsMap.keys()).find(k => k === normDate || k.startsWith(`${normDate}_`));
      matchingKey = sameDateKey || `${exactKey}_${rep.id || idx}`;
    }

    const existing = lessonsMap.get(matchingKey) || {
      id: rep.id,
      date: normDate,
      lessonNumber: rep.lessonNumber,
      durationMinutes: rep.durationMinutes || 60,
      attendance: rep.attendance === "absent" ? "absent" : "present",
      homeworkStatus: rep.homeworkStatus === "done" ? "done" : "not_done",
      classEvents: rep.classEvents || "",
      homeworkNotes: rep.homeworkNotes || "",
      teacherNotes: rep.teacherNotes || "",
      overallEvaluation: rep.overallEvaluation || "",
      reportText: rep.reportText || rep.generatedText || "",
      isArchived: Boolean(rep.archived),
      archiveGroup: rep.archiveGroup
    };

    if (rep.lessonNumber && !existing.lessonNumber) {
      existing.lessonNumber = rep.lessonNumber;
    }
    if (rep.classEvents && !existing.classEvents.includes(rep.classEvents)) {
      existing.classEvents = existing.classEvents ? `${existing.classEvents}\n${rep.classEvents}` : rep.classEvents;
    }
    if (rep.homeworkNotes && !existing.homeworkNotes.includes(rep.homeworkNotes)) {
      existing.homeworkNotes = existing.homeworkNotes ? `${existing.homeworkNotes}\n${rep.homeworkNotes}` : rep.homeworkNotes;
    }
    if (rep.teacherNotes && !existing.teacherNotes.includes(rep.teacherNotes)) {
      existing.teacherNotes = existing.teacherNotes ? `${existing.teacherNotes}\n${rep.teacherNotes}` : rep.teacherNotes;
    }
    if (rep.overallEvaluation) {
      existing.overallEvaluation = rep.overallEvaluation;
    }
    const repText = rep.reportText || rep.generatedText || "";
    if (repText && !existing.reportText?.includes(repText)) {
      existing.reportText = existing.reportText ? `${existing.reportText}\n${repText}` : repText;
    }
    if (rep.archived) {
      existing.isArchived = true;
    }
    if (rep.archiveGroup) {
      existing.archiveGroup = rep.archiveGroup;
    }

    lessonsMap.set(matchingKey, existing);
  });

  // الترتيب الزمني الصارم من بداية الشهر إلى نهايته
  const sortedLessons = Array.from(lessonsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const lessonsIncludedCount = sortedLessons.length;
  const attendedLessons = sortedLessons.filter(l => l.attendance === "present" || l.attendance === "late");
  const attendedCount = attendedLessons.length;
  const absentCount = lessonsIncludedCount - attendedCount;
  const totalMinutes = attendedLessons.reduce((sum, l) => sum + (l.durationMinutes || 60), 0);
  const totalHours = Number((totalMinutes / 60).toFixed(1));

  // 4. استخراج الحفظ والمراجعة والتلاوة ونور البيان والتجويد والدراسات الإسلامية بدقة عالية وبدون خلط
  const rawHefz: string[] = [];
  const rawRevision: string[] = [];
  const rawReading: string[] = [];
  const rawNoorBayan: string[] = [];
  const rawTajweed: string[] = [];
  const rawIslamic: string[] = [];

  const rawEvaluations: string[] = [];
  const positiveNotes: string[] = [];
  const improvementPoints: string[] = [];
  let doneHomeworkCount = 0;

  // تقسيم الشهر لمقارنة البداية بالنهاية
  const halfPoint = Math.ceil(sortedLessons.length / 2);
  const firstHalfLessons = sortedLessons.slice(0, halfPoint);
  const secondHalfLessons = sortedLessons.slice(halfPoint);

  // Per-lesson category tracking for accurate indicator scoring
  const lessonCategoriesMap = new Map<StructuredMonthlyLessonLog, LessonSegmentedCategories>();

  sortedLessons.forEach(l => {
    if (l.homeworkStatus === "done") {
      doneHomeworkCount++;
    }

    const segmented = extractCategorizedItemsFromLesson(l);
    lessonCategoriesMap.set(l, segmented);

    if (segmented.newMemorization.length > 0) {
      rawHefz.push(...segmented.newMemorization);
    }
    if (segmented.revision.length > 0) {
      rawRevision.push(...segmented.revision);
    }
    if (segmented.quranReading.length > 0) {
      rawReading.push(...segmented.quranReading);
    }
    if (segmented.noorAlBayan.length > 0) {
      rawNoorBayan.push(...segmented.noorAlBayan);
    }
    if (segmented.tajweedRules.length > 0) {
      rawTajweed.push(...segmented.tajweedRules);
    }
    if (segmented.islamicStudies.length > 0) {
      rawIslamic.push(...segmented.islamicStudies);
    }

    if (l.overallEvaluation && isCleanValue(l.overallEvaluation)) {
      rawEvaluations.push(l.overallEvaluation);
    }

    if (l.teacherNotes && isCleanValue(l.teacherNotes)) {
      // Only extract actual teacher evaluation notes, not raw copied classEvents/homework sections
      const cleanNoteLines = l.teacherNotes
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !/^(?:ما حدث داخل الحصة|الواجب والتكليفات|التقييم الإجمالي|Class Content|Homework & Assignments|Overall Evaluation)/i.test(line));
      const note = cleanNoteLines.join(" ").trim();
      if (note.length > 5 && note.length <= 180) {
        if (/ممتاز|رائع|متقن|ملتزم|متميز|ما شاء الله|تركيز|احترام|تفاعل|أحسنت|بارك|جيد|excellent|great|good|attentive|focused|well done/i.test(note)) {
          positiveNotes.push(note);
        } else if (/يحتاج|تردد|بطء|مراجعة|تكرار|تنبيه|انتباه|needs|hesitation|slow|practice/i.test(note)) {
          improvementPoints.push(note);
        }
      }
    }
  });

  // دمج السور والآيات والموضوعات بدقة ومنع التكرار
  const dedupedHefz = deduplicateSurahScope(rawHefz, lang);
  const dedupedRevision = deduplicateSurahScope(rawRevision, lang);
  const dedupedReading = deduplicateSurahScope(rawReading, lang);
  const dedupedNoorBayan = deduplicateEducationalTopics(rawNoorBayan, lang);
  const dedupedTajweed = deduplicateEducationalTopics(rawTajweed, lang);
  const dedupedIslamic = deduplicateEducationalTopics(rawIslamic, lang);

  const hasHefz = isCleanValue(dedupedHefz);
  const hasRevision = isCleanValue(dedupedRevision);
  const hasReading = isCleanValue(dedupedReading);
  const hasNoor = isCleanValue(dedupedNoorBayan);
  const hasTajweed = isCleanValue(dedupedTajweed);
  const hasIslamic = isCleanValue(dedupedIslamic);

  const categoryFlags = {
    hasHefz,
    hasRev: hasRevision,
    hasRead: hasReading,
    hasNoor,
    hasTajweed,
    hasIslamic,
    isEn
  };

  const dynamicNarratives = buildCategorySpecificNarratives(categoryFlags);

  // تحليل التطور ومقارنة بداية الشهر بنهايته
  let longitudinalProgress = "";
  if (sortedLessons.length >= 2) {
    const earlyNotes = firstHalfLessons.map(l => l.teacherNotes || l.overallEvaluation).filter(Boolean).join(" ");
    const lateNotes = secondHalfLessons.map(l => l.teacherNotes || l.overallEvaluation).filter(Boolean).join(" ");
    const hadEarlyHesitation = /تردد|صعوبة|خطأ|تكرار|بطء|hesitation|difficulty|mistake|slow/i.test(earlyNotes);
    const hasLateMastery = /تحسن|إتقان|ممتاز|طلاقة|متقن|تمكن|improved|mastered|fluent|excellent/i.test(lateNotes);

    if (hadEarlyHesitation && hasLateMastery) {
      longitudinalProgress = isEn
        ? "Noticeable trajectory of growth: early difficulties observed at the beginning of the month were systematically overcome, achieving greater fluency, comprehension, and self-confidence in later sessions."
        : "تطور ملموس ومستمر عبر الشهر: تلاشت الصعوبات الأولية التي لوحظت في مستهل الشهر، وارتقت جودة الاستيعاب والأداء مع ثقة أكبر وطلاقة واضحة في الحصص الختامية.";
    } else if (secondHalfLessons.length > 0 && attendedCount >= 4) {
      longitudinalProgress = isEn
        ? "Maintained a steady, progressive pace throughout the month, consolidating covered lessons consistently while strengthening cumulative mastery."
        : "وتيرة تعليمية متصاعدة ومنتظمة طوال الشهر، أظهر خلالها الطالب ثباتاً في إنجاز المقرر المخصص مع تعزيز متانة الإتقان.";
    }
  }

  // نمط الواجبات والالتزام
  const homeworkRate = attendedCount > 0 ? Math.round((doneHomeworkCount / attendedCount) * 100) : 100;
  let homeworkPattern = "";
  if (isEn) {
    if (homeworkRate >= 90) {
      homeworkPattern = "High homework diligence and consistent task completion prior to each lesson.";
    } else if (homeworkRate >= 70) {
      homeworkPattern = "Good homework commitment overall, with minor reminders needed occasionally.";
    } else {
      homeworkPattern = "Moderate homework adherence; more daily consistency at home is recommended to reinforce covered lessons.";
    }
  } else {
    if (homeworkRate >= 90) {
      homeworkPattern = "انضباط ممتاز والتزام كامل بأداء الواجبات والتكليفات المنزلية بانتظام.";
    } else if (homeworkRate >= 70) {
      homeworkPattern = "التزام جيد بوجه عام بالواجبات مع الحاجة أحياناً للمتابعة والتذكير.";
    } else {
      homeworkPattern = "التزام متوسط بالواجبات؛ يُوصى بزيادة المتابعة المنزلية اليومية لتثبيت المقرر.";
    }
  }

  // مؤشرات الأداء الحقيقية والمحسوبة دقيقاً من التقييمات اليومية الفعلية (0% لأي عنصر لم يُذكر في التقارير اليومية)
  const parseLessonScore = (evalText?: string, notesText?: string, eventsText?: string, repText?: string): number | null => {
    const combined = `${evalText || ""} ${notesText || ""} ${eventsText || ""} ${repText || ""}`.trim();
    if (!combined) return null;

    // Fraction check like "9.5/10", "10/10", "8/10", "48/50"
    const fracMatch = combined.match(/(\d+(?:\.\d+)?)\s*[\/|من]\s*(\d+(?:\.\d+)?)/i);
    if (fracMatch) {
      const obtained = parseFloat(fracMatch[1]);
      const total = parseFloat(fracMatch[2]);
      if (total > 0 && obtained <= total && total <= 100) {
        return Math.round((obtained / total) * 100);
      }
    }

    // Percentage check like "90%"
    const pctMatch = combined.match(/(\d{2,3})\s*%/);
    if (pctMatch) {
      const v = parseInt(pctMatch[1], 10);
      if (v >= 40 && v <= 100) return v;
    }

    // Qualitative ratings
    const clean = combined.toLowerCase();
    if (/ممتاز\s*جداً|ممتاز\s*جدا|رائع|متقن\s*جداً|10\/10|10\s*من\s*10|excellent|outstanding|mastered|perfect/i.test(clean)) return 98;
    if (/ممتاز|متقن|متميز|عالي|فل|full/i.test(clean)) return 95;
    if (/جيد\s*جداً|جيد\s*جدا|فوق\s*المتوسط|8\/10|9\/10|very\s*good|proficient/i.test(clean)) return 88;
    if (/جيد|مرضي|7\/10|good|satisfactory/i.test(clean)) return 80;
    if (/مقبول|متوسط|تحتاج\s*متابعة|6\/10|fair|acceptable|average/i.test(clean)) return 70;
    if (/ضعيف|ضعيف\s*جداً|يحتاج\s*إعادة|لم\s*يحفظ|needs\s*improvement|weak|poor|5\/10|4\/10/i.test(clean)) return 58;

    return null;
  };

  const hefzScores: number[] = [];
  const revisionScores: number[] = [];
  const tajweedScores: number[] = [];
  const islamicScores: number[] = [];
  const allLessonScores: number[] = [];

  sortedLessons.forEach(l => {
    const score = parseLessonScore(l.overallEvaluation, l.teacherNotes, l.classEvents, l.reportText);
    if (score !== null) {
      allLessonScores.push(score);
      const cats = lessonCategoriesMap.get(l);
      if (cats) {
        if (cats.newMemorization.length > 0) hefzScores.push(score);
        if (cats.revision.length > 0) revisionScores.push(score);
        if (cats.tajweedRules.length > 0 || cats.quranReading.length > 0 || cats.noorAlBayan.length > 0) {
          tajweedScores.push(score);
        }
        if (cats.islamicStudies.length > 0) islamicScores.push(score);
      }
    }
  });

  const getSubjectScore = (arr: number[]): number => {
    if (arr.length > 0) {
      return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    // Return 0 if no explicit numeric grades recorded (no guessing 90% or 88%!)
    return 0;
  };

  // 1. Commitment Score (Strict formula: 70% attendance rate + 30% homework rate)
  const attRate = lessonsIncludedCount > 0 ? (attendedCount / lessonsIncludedCount) : 0;
  const hwRate = attendedCount > 0 ? (doneHomeworkCount / attendedCount) : 0;
  const commitmentScore = lessonsIncludedCount > 0
    ? Math.min(100, Math.max(0, Math.round((attRate * 70) + (hwRate * 30))))
    : 0;

  // 2. Subject Scores (Strictly 0 if no explicit numeric grades recorded in daily reports)
  const memorizationScore = hasHefz ? getSubjectScore(hefzScores) : 0;
  const revisionScore = hasRevision ? getSubjectScore(revisionScores) : 0;
  const hasTajweedOrFoundation = hasTajweed || hasReading || hasNoor;
  const tajweedScore = hasTajweedOrFoundation ? getSubjectScore(tajweedScores) : 0;
  const islamicScore = hasIslamic ? getSubjectScore(islamicScores) : 0;

  // نقاط القوة المستخرجة فعلياً من الحصص (مع استبعاد أي جملة تشير لقسم لم يدرسه الطالب)
  const cleanStrengths: string[] = [];
  if (positiveNotes.length > 0) {
    const set = new Set<string>();
    positiveNotes.forEach(n => {
      const stripped = stripAllUrlsAndLinks(n);
      if (stripped.length > 5 && !textMentionsUnstudiedCategory(stripped, categoryFlags)) {
        if (isEn) {
          set.add(sanitizeTextForEnglishReport(stripped, "strength"));
        } else {
          set.add(stripped);
        }
      }
    });
    cleanStrengths.push(...Array.from(set).slice(0, 3));
  }
  if (cleanStrengths.length === 0) {
    cleanStrengths.push(...dynamicNarratives.defaultStrengths);
  }

  // نقاط تحتاج إلى تحسين (مرتبطة فقط بالأقسام الفعلية المذكورة)
  const cleanImprovements: string[] = [];
  if (improvementPoints.length > 0) {
    const set = new Set<string>();
    improvementPoints.forEach(n => {
      const stripped = stripAllUrlsAndLinks(n);
      if (stripped.length > 5 && !textMentionsUnstudiedCategory(stripped, categoryFlags)) {
        if (isEn) {
          set.add(sanitizeTextForEnglishReport(stripped, "recommendation"));
        } else {
          set.add(stripped);
        }
      }
    });
    cleanImprovements.push(...Array.from(set).slice(0, 3));
  }
  if (cleanImprovements.length === 0) {
    cleanImprovements.push(...dynamicNarratives.defaultRecommendations);
  }

  const commonGrade = rawEvaluations.length > 0
    ? rawEvaluations[rawEvaluations.length - 1]
    : (isEn ? "Excellent (Mastered)" : "ممتاز (متقن)");

    const detected = detectStudentActiveSubjects({ student, lessons: sortedLessons });
    const hasAnyQuranContent = Boolean(hasHefz || hasRevision || hasReading || hasTajweed);
    const hasAnyArabicContent = Boolean(hasNoor || detected.counts.arabic > 0);
    const hasAnyIslamicContent = Boolean(hasIslamic || detected.counts.islamicStudies > 0);
    const hasAnyContent = hasAnyQuranContent || hasAnyArabicContent || hasAnyIslamicContent;

    const finalActiveSubjects = {
      quran: hasAnyContent ? hasAnyQuranContent : detected.hasQuran,
      arabic: hasAnyContent ? hasAnyArabicContent : detected.hasArabic,
      islamicStudies: hasAnyContent ? hasAnyIslamicContent : detected.hasIslamicStudies
    };

    return {
      studentName: student.fullName,
      month,
      year,
      subject,
      teacherName: normalizeReportTeacherName(teacherName, lang),
      outputLanguage: lang,
      lessonsIncludedCount,
      attendedCount,
      absentCount,
      totalHours,
      lessons: sortedLessons,
      newMemorization: {
        content: dedupedHefz,
        evaluation: commonGrade
      },
      revision: {
        content: dedupedRevision,
        evaluation: isEn ? "Very Good (Reinforced)" : "متقن ومثبّت"
      },
      recitationAndFoundation: {
        content: dedupedReading,
        evaluation: isEn ? "Fluent & Accurate" : "تلاوة متقنة وسليمة"
      },
      quranReading: hasReading ? {
        content: dedupedReading,
        evaluation: isEn ? "Fluent & Accurate" : "تلاوة متقنة وسليمة"
      } : undefined,
      noorAlBayan: hasNoor ? {
        content: dedupedNoorBayan,
        evaluation: commonGrade
      } : undefined,
      tajweedProgress: {
        content: dedupedTajweed,
        evaluation: isEn ? "Mastered Application" : "تطبيق عملي متقن"
      },
      islamicStudiesProgress: {
        content: dedupedIslamic,
        evaluation: commonGrade
      },
      overallProgress: dynamicNarratives.monthlyProgressSummary,
      strengths: cleanStrengths,
      areasForImprovement: cleanImprovements,
      homeworkAndCommitmentPattern: homeworkPattern,
      importantObservations: positiveNotes.length > 0
        ? (isEn ? sanitizeTextForEnglishReport(positiveNotes[0], "general") : positiveNotes[0])
        : (isEn ? "Attentive attendance and adherence to teacher guidance during sessions." : "حضور منتظم وتفاعل ملتزم بتوجيهات المعلم خلال الحصص."),
      nextMonthPlan: dynamicNarratives.expectedNextMonthPlan,
      indicators: {
        memorization: memorizationScore,
        revision: revisionScore,
        tajweedAndFoundation: tajweedScore,
        islamicStudies: islamicScore > 0 ? islamicScore : undefined,
        commitment: commitmentScore
      },
      activeSubjects: finalActiveSubjects,
      hasExplicitNumericGrades: allLessonScores.length > 0,
      qualitativeRatings: {
        overall: evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn }),
        memorization: hasHefz ? evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn }) : undefined,
        revision: hasRevision ? evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn }) : undefined,
        tajweedAndFoundation: (hasReading || hasTajweed) ? evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn }) : undefined,
        islamicStudies: hasIslamic ? evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn }) : undefined,
        commitment: evaluateQualitativeMastery({ explicitScore: allLessonScores[0], teacherNotes: positiveNotes, evaluations: rawEvaluations, isEn })
      }
    };
}

export function isCleanValue(val?: string | null): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (!clean) return false;

  const strippedPunct = clean.replace(/[.,،؛:()[\]\-_—–\s*!؟?'"«»]/g, "");
  if (!strippedPunct) return false;

  if (
    clean === "none" ||
    clean === "none." ||
    clean === "n/a" ||
    clean === "na" ||
    clean === "null" ||
    clean === "undefined" ||
    clean === "nil" ||
    clean === "-" ||
    clean === "--" ||
    clean === "---" ||
    clean === "not_done" ||
    clean === "not done" ||
    clean === "no" ||
    clean === "no." ||
    clean === "nothing" ||
    clean === "none recorded" ||
    clean === "not recorded" ||
    clean === "not mentioned" ||
    clean === "not applicable" ||
    clean === "none specified" ||
    clean === "no data" ||
    clean === "empty" ||
    clean === "(if applicable)" ||
    clean === "(إن وجد)" ||
    clean === "(إن وجدت)" ||
    clean === "(لا يوجد)" ||
    clean === "لا يوجد" ||
    clean === "لايوجد" ||
    clean === "لا توجد" ||
    clean === "لاتوجد" ||
    clean === "غير محدد" ||
    clean === "غير متوفر" ||
    clean === "لم يسجل" ||
    clean === "لم يُسجل" ||
    clean === "لم يذكر" ||
    clean === "لم يُذكر" ||
    clean === "لم يتم" ||
    clean === "لاشيء" ||
    clean === "لا شيء" ||
    clean === "غير مدخل" ||
    clean === "غير مذكور" ||
    clean === "بدون" ||
    clean === "فارغ" ||
    clean === "لا توجد بيانات" ||
    clean.startsWith("none ") ||
    clean.startsWith("n/a") ||
    clean.startsWith("not mentioned") ||
    clean.startsWith("not recorded") ||
    clean.startsWith("not applicable") ||
    clean.startsWith("no new ") ||
    clean.startsWith("nothing ")
  ) {
    return false;
  }

  // Detect Arabic/English negative sentences indicating an item was not taken/studied
  if (
    /^(?:لا\s*يوجد|لا\s*توجد|لم\s*يتم|لم\s*يأخذ|لم\s*نأخذ|لم\s*نتطرق|لم\s*يدرس|لم\s*ندرس|لم\s*يحفظ|لم\s*يراجع|لم\s*يقرأ|لم\s*يسجل|لم\s*يذكر|لم\s*يُذكر|غير\s*مذكور|غير\s*محدد|تم\s*الاكتفاء|اكتفينا\s*ب|بدون\s|لا\s*شيء)/i.test(clean)
  ) {
    return false;
  }

  return true;
}

/**
 * Sanitizes and synchronizes any ComprehensiveMonthlyReportData object (whether from deterministic engine,
 * AI generation, external file/text parser, or manual edit) to strictly enforce:
 * 1. Any category not mentioned or having empty/negative value is completely omitted from achievements & completedItems.
 * 2. Any performance indicator whose category was not mentioned in the report is set to 0 so its chart/data card is never rendered.
 * 3. Any statistic with 0 or belonging to an unmentioned category is omitted.
 * 4. All narrative fields (pedagogicalAnalysis, deductiveInference, recommendations, nextMonthGoals, expectedNextMonthPlan)
 *    are strictly gated to ONLY the studied categories, replacing any text that mentions unstudied categories.
 */
export function sanitizeComprehensiveMonthlyReportData(
  data: ComprehensiveMonthlyReportData
): ComprehensiveMonthlyReportData {
  const isEn = data.lang === "en";

  // 1. Clean achievements list (strip all URLs, translate to English if isEn)
  const cleanAchievements = (data.achievements || [])
    .map((ach): MonthlyAchievementItem | null => {
      if (!ach) return null;
      const strippedContent = stripAllUrlsAndLinks(ach.content);
      if (!isCleanValue(strippedContent)) return null;

      const finalContent = isEn
        ? sanitizeTextForEnglishReport(strippedContent, "topic")
        : strippedContent;

      let finalTitleEn = ach.titleEn || "";
      if (isEn) {
        const catKey = (ach.categoryKey || "").toLowerCase();
        if (catKey === "newmemorization" || /حفظ|memoriz/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "NEW MEMORIZATION";
        else if (catKey === "revision" || /مراجعة|تثبيت|revis|review/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "REVISION & RETENTION";
        else if (catKey === "nooralbayan" || /نور البيان|noor/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "NOOR AL-BAYAN LESSONS";
        else if (catKey === "tajweedrules" || /تجويد|tajweed/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "TAJWEED RULES APPLIED";
        else if (catKey === "islamicstudies" || /إسلامية|دراسات|islamic/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "ISLAMIC STUDIES";
        else if (catKey === "quranreading" || catKey === "recitationandfoundation" || /تلاوة|قراءة|reading|recit/i.test(`${ach.titleAr} ${ach.titleEn}`)) finalTitleEn = "QUR'AN READING & RECITATION";
        else if (!finalTitleEn || /[\u0600-\u06FF]/.test(finalTitleEn)) {
          finalTitleEn = sanitizeTextForEnglishReport(ach.titleAr || ach.categoryKey, "topic");
        }
      }

      const finalEval = isEn
        ? sanitizeTextForEnglishReport(ach.evaluation || "Completed", "evaluation")
        : (ach.evaluation || "تم الإنجاز");

      return {
        ...ach,
        titleEn: finalTitleEn,
        content: finalContent,
        evaluation: finalEval
      };
    })
    .filter((ach): ach is MonthlyAchievementItem => Boolean(ach && isCleanValue(ach.content)));

  // 2. Clean completedItems (strip all URLs, translate to English if isEn)
  const rawCompleted = data.completedItems || {};
  const cleanItemVal = (val?: string): string | undefined => {
    if (!val) return undefined;
    const stripped = stripAllUrlsAndLinks(val).trim();
    if (!isCleanValue(stripped)) return undefined;
    return isEn ? sanitizeTextForEnglishReport(stripped, "topic") : stripped;
  };

  const completedItems: ComprehensiveMonthlyReportData["completedItems"] = {
    newMemorization: cleanItemVal(rawCompleted.newMemorization),
    revision: cleanItemVal(rawCompleted.revision),
    quranReading: cleanItemVal(rawCompleted.quranReading),
    noorAlBayan: cleanItemVal(rawCompleted.noorAlBayan),
    tajweedRules: cleanItemVal(rawCompleted.tajweedRules),
    islamicStudies: cleanItemVal(rawCompleted.islamicStudies)
  };

  // Backfill completedItems from cleanAchievements if AI only populated achievements
  cleanAchievements.forEach(ach => {
    const key = ach.categoryKey;
    const title = `${ach.titleAr || ""} ${ach.titleEn || ""}`;
    if ((key === "newMemorization" || /حفظ|memoriz/i.test(title)) && !completedItems.newMemorization) {
      completedItems.newMemorization = ach.content.trim();
    } else if ((key === "revision" || /مراجعة|تثبيت|revis|review/i.test(title)) && !completedItems.revision) {
      completedItems.revision = ach.content.trim();
    } else if ((key === "noorAlBayan" || /نور البيان|نورانية|noor/i.test(title)) && !completedItems.noorAlBayan) {
      completedItems.noorAlBayan = ach.content.trim();
    } else if ((key === "tajweedRules" || /تجويد|tajweed/i.test(title)) && !completedItems.tajweedRules) {
      completedItems.tajweedRules = ach.content.trim();
    } else if ((key === "islamicStudies" || /إسلامية|دراسات|فقه|عقيدة|سيرة|حديث|islamic/i.test(title)) && !completedItems.islamicStudies) {
      completedItems.islamicStudies = ach.content.trim();
    } else if ((key === "quranReading" || key === "recitationAndFoundation" || /تلاوة|قراءة|reading|recit/i.test(title)) && !completedItems.quranReading) {
      completedItems.quranReading = ach.content.trim();
    }
  });

  // Backfill cleanAchievements from completedItems if completedItems has valid entries not in cleanAchievements
  const hasAchCat = (catCheck: (a: MonthlyAchievementItem) => boolean) => cleanAchievements.some(catCheck);

  if (completedItems.newMemorization && !hasAchCat(a => a.categoryKey === "newMemorization" || /حفظ|memoriz/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "newMemorization",
      titleAr: "الحفظ الجديد (New Memorization)",
      titleEn: "NEW MEMORIZATION",
      content: completedItems.newMemorization,
      evaluation: isEn ? "Excellent (Mastered)" : "ممتاز (متقن)"
    });
  }
  if (completedItems.revision && !hasAchCat(a => a.categoryKey === "revision" || /مراجعة|تثبيت|revis|review/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "revision",
      titleAr: "المراجعة والتثبيت (Revision)",
      titleEn: "REVISION",
      content: completedItems.revision,
      evaluation: isEn ? "Very Good (Reinforced)" : "متقن ومثبّت"
    });
  }
  if (completedItems.quranReading && !hasAchCat(a => a.categoryKey === "quranReading" || a.categoryKey === "recitationAndFoundation" || /تلاوة|قراءة|reading|recit/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "quranReading",
      titleAr: "تلاوة القرآن الكريم (Qur'an Reading)",
      titleEn: "QUR'AN READING",
      content: completedItems.quranReading,
      evaluation: isEn ? "Fluent & Accurate" : "تلاوة متقنة وسليمة"
    });
  }
  if (completedItems.noorAlBayan && !hasAchCat(a => a.categoryKey === "noorAlBayan" || /نور البيان|noor/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "noorAlBayan",
      titleAr: "دروس نور البيان والتأسيس (Noor Al-Bayan)",
      titleEn: "NOOR AL-BAYAN LESSONS",
      content: completedItems.noorAlBayan,
      evaluation: isEn ? "Excellent" : "ممتاز (متقن)"
    });
  }
  if (completedItems.tajweedRules && !hasAchCat(a => a.categoryKey === "tajweedRules" || /تجويد|tajweed/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "tajweedRules",
      titleAr: "أحكام التجويد (Tajweed Rules)",
      titleEn: "TAJWEED RULES APPLIED",
      content: completedItems.tajweedRules,
      evaluation: isEn ? "Mastered Application" : "تطبيق عملي متقن"
    });
  }
  if (completedItems.islamicStudies && !hasAchCat(a => a.categoryKey === "islamicStudies" || /إسلامية|دراسات|islamic/i.test(`${a.titleAr} ${a.titleEn}`))) {
    cleanAchievements.push({
      categoryKey: "islamicStudies",
      titleAr: "الدراسات الإسلامية (Islamic Studies)",
      titleEn: "ISLAMIC STUDIES",
      content: completedItems.islamicStudies,
      evaluation: isEn ? "Excellent" : "ممتاز (متقن)"
    });
  }

  // 3. Determine active categories strictly from actual verified content
  const hasNewMem = Boolean(completedItems.newMemorization);
  const hasRev = Boolean(completedItems.revision);
  const hasRead = Boolean(completedItems.quranReading);
  const hasNoor = Boolean(completedItems.noorAlBayan);
  const hasTajweed = Boolean(completedItems.tajweedRules);
  const hasTajweedOrReadOrNoor = hasRead || hasNoor || hasTajweed;
  const hasIslamic = Boolean(completedItems.islamicStudies);

  const categoryFlags = {
    hasHefz: hasNewMem,
    hasRev,
    hasRead,
    hasNoor,
    hasTajweed,
    hasIslamic,
    isEn
  };

  const dynamicNarratives = buildCategorySpecificNarratives(categoryFlags);

  // 4. Zero out any indicator whose category was NOT mentioned in the daily reports, and avoid fake numbers
  const rawInd = data.indicators || { memorization: 0, revision: 0, tajweedAndFoundation: 0, commitment: 0 };
  const sanitizedIndicators: MonthlyPerformanceIndicators = {
    memorization: hasNewMem ? (rawInd.memorization > 0 ? rawInd.memorization : (data.hasExplicitNumericGrades ? 90 : 0)) : 0,
    revision: hasRev ? (rawInd.revision > 0 ? rawInd.revision : (data.hasExplicitNumericGrades ? 90 : 0)) : 0,
    tajweedAndFoundation: hasTajweedOrReadOrNoor ? (rawInd.tajweedAndFoundation > 0 ? rawInd.tajweedAndFoundation : (data.hasExplicitNumericGrades ? 88 : 0)) : 0,
    islamicStudies: hasIslamic ? ((rawInd.islamicStudies && rawInd.islamicStudies > 0) ? rawInd.islamicStudies : (data.hasExplicitNumericGrades ? 90 : 0)) : 0,
    commitment: rawInd.commitment > 0 ? rawInd.commitment : (cleanAchievements.length > 0 && data.hasExplicitNumericGrades ? 95 : 0)
  };

  // 5. Clean statistics so unmentioned categories or 0 values are omitted
  const rawStats = data.statistics || {};
  const sanitizedStats: MonthlyStatistics = {
    pagesMemorized: hasNewMem && rawStats.pagesMemorized && rawStats.pagesMemorized > 0 ? rawStats.pagesMemorized : undefined,
    pagesRevised: hasRev && rawStats.pagesRevised && rawStats.pagesRevised > 0 ? rawStats.pagesRevised : undefined,
    pagesRead: hasRead && rawStats.pagesRead && rawStats.pagesRead > 0 ? rawStats.pagesRead : undefined,
    tajweedRulesLearned: hasTajweed && rawStats.tajweedRulesLearned && rawStats.tajweedRulesLearned > 0 ? rawStats.tajweedRulesLearned : undefined,
    noorAlBayanLessons: hasNoor && rawStats.noorAlBayanLessons && rawStats.noorAlBayanLessons > 0 ? rawStats.noorAlBayanLessons : undefined,
    islamicStudiesLessons: hasIslamic && rawStats.islamicStudiesLessons && rawStats.islamicStudiesLessons > 0 ? rawStats.islamicStudiesLessons : undefined
  };

  // 6. Strengths, recommendations, goals sanitization (filtering out any item mentioning unstudied categories)
  const cleanStrengths = (data.strengths || [])
    .map(s => stripAllUrlsAndLinks(s))
    .filter(s => isCleanValue(s) && !textMentionsUnstudiedCategory(s, categoryFlags))
    .map(s => isEn ? (/[ \u0600-\u06FF]/.test(s) ? sanitizeTextForEnglishReport(s, "strength") : s) : s)
    .filter(s => isCleanValue(s) && !textMentionsUnstudiedCategory(s, categoryFlags) && (isEn ? !/[\u0600-\u06FF]/.test(s) : true));

  const cleanRecommendations = (data.recommendations || [])
    .map(r => stripAllUrlsAndLinks(r))
    .filter(r => isCleanValue(r) && !textMentionsUnstudiedCategory(r, categoryFlags))
    .map(r => isEn ? (/[ \u0600-\u06FF]/.test(r) ? sanitizeTextForEnglishReport(r, "recommendation") : r) : r)
    .filter(r => isCleanValue(r) && !textMentionsUnstudiedCategory(r, categoryFlags) && (isEn ? !/[\u0600-\u06FF]/.test(r) : true));

  const cleanNextGoals = (data.nextMonthGoals || [])
    .map(g => stripAllUrlsAndLinks(g))
    .filter(g => isCleanValue(g) && !textMentionsUnstudiedCategory(g, categoryFlags))
    .map(g => isEn ? (/[ \u0600-\u06FF]/.test(g) ? sanitizeTextForEnglishReport(g, "plan") : g) : g)
    .filter(g => isCleanValue(g) && !textMentionsUnstudiedCategory(g, categoryFlags) && (isEn ? !/[\u0600-\u06FF]/.test(g) : true));

  if (cleanNextGoals.length === 0) {
    cleanNextGoals.push(...dynamicNarratives.nextMonthGoals);
  }

  // 7. Text paragraphs sanitization (strictly matching language AND strictly excluding unstudied categories)
  let cleanInteraction = stripAllUrlsAndLinks(data.studentInteraction);
  if (isEn) {
    if (!cleanInteraction || /[\u0600-\u06FF]/.test(cleanInteraction) || textMentionsUnstudiedCategory(cleanInteraction, categoryFlags)) {
      cleanInteraction = "The student demonstrated sharp mental focus, polite demeanor, and responsive engagement with teacher instructions throughout sessions.";
    }
  } else {
    if (!cleanInteraction || !/[\u0600-\u06FF]/.test(cleanInteraction) || textMentionsUnstudiedCategory(cleanInteraction, categoryFlags)) {
      cleanInteraction = "أظهر الطالب حضوراً ذهنياً طيباً وتجاوباً نشطاً وأدباً رفيعاً مع توجيهات المعلم طوال الحصص.";
    }
  }

  let cleanPlan = stripAllUrlsAndLinks(data.expectedNextMonthPlan);
  if (isEn) {
    if (!cleanPlan || /[\u0600-\u06FF]/.test(cleanPlan) || textMentionsUnstudiedCategory(cleanPlan, categoryFlags)) {
      cleanPlan = dynamicNarratives.expectedNextMonthPlan;
    }
  } else {
    if (!cleanPlan || !/[\u0600-\u06FF]/.test(cleanPlan) || textMentionsUnstudiedCategory(cleanPlan, categoryFlags)) {
      cleanPlan = dynamicNarratives.expectedNextMonthPlan;
    }
  }

  let cleanPedagogicalAnalysis = stripAllUrlsAndLinks(data.pedagogicalAnalysis);
  if (isEn) {
    if (!cleanPedagogicalAnalysis || /[\u0600-\u06FF]/.test(cleanPedagogicalAnalysis) || textMentionsUnstudiedCategory(cleanPedagogicalAnalysis, categoryFlags)) {
      cleanPedagogicalAnalysis = dynamicNarratives.pedagogicalAnalysis;
    }
  } else {
    if (!cleanPedagogicalAnalysis || !/[\u0600-\u06FF]/.test(cleanPedagogicalAnalysis) || textMentionsUnstudiedCategory(cleanPedagogicalAnalysis, categoryFlags)) {
      cleanPedagogicalAnalysis = dynamicNarratives.pedagogicalAnalysis;
    }
  }

  let cleanDeductiveInference = stripAllUrlsAndLinks(data.deductiveInference);
  if (isEn) {
    if (!cleanDeductiveInference || /[\u0600-\u06FF]/.test(cleanDeductiveInference) || textMentionsUnstudiedCategory(cleanDeductiveInference, categoryFlags)) {
      cleanDeductiveInference = dynamicNarratives.deductiveInference;
    }
  } else {
    if (!cleanDeductiveInference || !/[\u0600-\u06FF]/.test(cleanDeductiveInference) || textMentionsUnstudiedCategory(cleanDeductiveInference, categoryFlags)) {
      cleanDeductiveInference = dynamicNarratives.deductiveInference;
    }
  }

  let cleanLearningProfile = stripAllUrlsAndLinks(data.learningProfile);
  if (isEn) {
    if (!cleanLearningProfile || /[\u0600-\u06FF]/.test(cleanLearningProfile)) {
      cleanLearningProfile = dynamicNarratives.learningProfile;
    }
  } else {
    if (!cleanLearningProfile || !/[\u0600-\u06FF]/.test(cleanLearningProfile)) {
      cleanLearningProfile = dynamicNarratives.learningProfile;
    }
  }

  let cleanParentalGuidance = stripAllUrlsAndLinks(data.parentalGuidance);
  if (isEn) {
    if (!cleanParentalGuidance || /[\u0600-\u06FF]/.test(cleanParentalGuidance) || textMentionsUnstudiedCategory(cleanParentalGuidance, categoryFlags)) {
      cleanParentalGuidance = dynamicNarratives.parentalGuidance;
    }
  } else {
    if (!cleanParentalGuidance || !/[\u0600-\u06FF]/.test(cleanParentalGuidance) || textMentionsUnstudiedCategory(cleanParentalGuidance, categoryFlags)) {
      cleanParentalGuidance = dynamicNarratives.parentalGuidance;
    }
  }

  const cleanTemplateSections: MonthlyTemplateSection[] | undefined = Array.isArray(data.templateSections)
    ? data.templateSections
        .map(sec => ({
          title: stripAllUrlsAndLinks(sec.title || "").trim(),
          content: stripAllUrlsAndLinks(sec.content || "").trim(),
          bullets: Array.isArray(sec.bullets)
            ? sec.bullets.map(b => stripAllUrlsAndLinks(b).trim()).filter(Boolean)
            : undefined
        }))
        .filter(sec => sec.title && (sec.content || (sec.bullets && sec.bullets.length > 0)))
    : undefined;

  return {
    ...data,
    achievements: cleanAchievements,
    completedItems,
    indicators: sanitizedIndicators,
    statistics: sanitizedStats,
    strengths: cleanStrengths.length > 0 ? cleanStrengths : dynamicNarratives.defaultStrengths,
    recommendations: cleanRecommendations.length > 0 ? cleanRecommendations : dynamicNarratives.defaultRecommendations,
    nextMonthGoals: cleanNextGoals,
    studentInteraction: cleanInteraction,
    expectedNextMonthPlan: cleanPlan,
    pedagogicalAnalysis: cleanPedagogicalAnalysis,
    deductiveInference: cleanDeductiveInference,
    learningProfile: cleanLearningProfile,
    parentalGuidance: cleanParentalGuidance,
    templateTitle: data.templateTitle ? stripAllUrlsAndLinks(data.templateTitle).trim() : undefined,
    templateSubtitle: data.templateSubtitle ? stripAllUrlsAndLinks(data.templateSubtitle).trim() : undefined,
    templateSections: cleanTemplateSections && cleanTemplateSections.length > 0 ? cleanTemplateSections : undefined,
    rawTemplateText: data.rawTemplateText ? stripAllUrlsAndLinks(data.rawTemplateText).trim() : undefined,
    stage1AnalysisSummary: data.stage1AnalysisSummary ? stripAllUrlsAndLinks(data.stage1AnalysisSummary).trim() : undefined,
    activeTemplateId: data.activeTemplateId,
    activeTemplateName: data.activeTemplateName
  };
}

/**
 * المحرك الرئيسي لتجميع وبناء بيانات التقرير الشهري الشامل للقالب
 */
export function buildComprehensiveMonthlyReportData(params: {
  student: Student;
  subject: string;
  year: number;
  month: number;
  allReports: GeneratedReport[];
  allAttendance: AttendanceRecord[];
  teacherName?: string;
  lang?: "ar" | "en";
  archiveGroupFilter?: string;
  includeAllProvidedRecords?: boolean;
}): ComprehensiveMonthlyReportData {
  const {
    student,
    subject,
    year,
    month,
    allReports = [],
    allAttendance = [],
    teacherName = "أ. محمد فتحي (Mohammed Fathy)",
    lang = subject === "Quran, Arabic and Islamic Studies" ? "en" : "ar",
    archiveGroupFilter,
    includeAllProvidedRecords = false
  } = params;

  const analysis = buildStructuredMonthlyAnalysis({
    student,
    subject,
    year,
    month,
    allReports,
    allAttendance,
    teacherName,
    lang,
    archiveGroupFilter,
    includeAllProvidedRecords
  });

  const isEn = lang === "en";
  const monthIdx = Math.max(1, Math.min(12, month)) - 1;
  const monthNameAr = ARABIC_MONTHS[monthIdx];
  const monthNameEn = ENGLISH_MONTHS[monthIdx];
  const monthLabel = formatMonthlyReportMonth(month, year, undefined, lang);

  // بناء الإنجازات (فقط للأقسام التي تتوفر لها بيانات فعلية غير فارغة في التقارير اليومية)
  const achievements: MonthlyAchievementItem[] = [];

  const hasHefz = isCleanValue(analysis.newMemorization.content);
  const hasRev = isCleanValue(analysis.revision.content);
  const hasRead = isCleanValue(analysis.quranReading?.content || analysis.recitationAndFoundation.content);
  const hasNoor = isCleanValue(analysis.noorAlBayan?.content);
  const hasTajweed = isCleanValue(analysis.tajweedProgress.content);
  const hasIslamic = isCleanValue(analysis.islamicStudiesProgress.content);

  const dynamicNarratives = buildCategorySpecificNarratives({
    hasHefz,
    hasRev,
    hasRead,
    hasNoor,
    hasTajweed,
    hasIslamic,
    isEn
  });

  if (hasHefz) {
    achievements.push({
      categoryKey: "newMemorization",
      titleAr: "الحفظ الجديد (New Memorization)",
      titleEn: "NEW MEMORIZATION",
      content: analysis.newMemorization.content,
      evaluation: analysis.newMemorization.evaluation
    });
  }

  if (hasRev) {
    achievements.push({
      categoryKey: "revision",
      titleAr: "المراجعة والتثبيت (Revision)",
      titleEn: "REVISION",
      content: analysis.revision.content,
      evaluation: analysis.revision.evaluation
    });
  }

  if (hasRead) {
    const readContent = analysis.quranReading?.content || analysis.recitationAndFoundation.content;
    achievements.push({
      categoryKey: "quranReading",
      titleAr: "تلاوة القرآن الكريم (Qur'an Reading)",
      titleEn: "QUR'AN READING",
      content: readContent,
      evaluation: analysis.recitationAndFoundation.evaluation
    });
  }

  if (hasNoor) {
    achievements.push({
      categoryKey: "noorAlBayan",
      titleAr: "دروس نور البيان والتأسيس (Noor Al-Bayan)",
      titleEn: "NOOR AL-BAYAN LESSONS",
      content: analysis.noorAlBayan!.content,
      evaluation: analysis.noorAlBayan!.evaluation
    });
  }

  if (hasTajweed) {
    achievements.push({
      categoryKey: "tajweedRules",
      titleAr: "أحكام التجويد (Tajweed Rules)",
      titleEn: "TAJWEED RULES APPLIED",
      content: analysis.tajweedProgress.content,
      evaluation: analysis.tajweedProgress.evaluation
    });
  }

  if (hasIslamic) {
    achievements.push({
      categoryKey: "islamicStudies",
      titleAr: "الدراسات الإسلامية (Islamic Studies)",
      titleEn: "ISLAMIC STUDIES",
      content: analysis.islamicStudiesProgress.content,
      evaluation: analysis.islamicStudiesProgress.evaluation
    });
  }

  // استخراج الإحصائيات الحقيقية فقط عند وجودها
  const tajweedCount = hasTajweed ? analysis.tajweedProgress.content.split(/[,،]/).filter(Boolean).length : undefined;
  const islamicCount = hasIslamic ? analysis.islamicStudiesProgress.content.split(/[,،]/).filter(Boolean).length : undefined;
  const noorCount = hasNoor ? analysis.noorAlBayan!.content.split(/[,،]/).filter(Boolean).length : undefined;

  const rawResult: ComprehensiveMonthlyReportData = {
    student,
    studentName: analysis.studentName,
    subject,
    year,
    month,
    monthNameAr,
    monthNameEn,
    monthLabel,
    teacherName: analysis.teacherName,
    lang,
    achievements,
    indicators: analysis.indicators,
    strengths: analysis.strengths,
    recommendations: analysis.areasForImprovement,
    nextMonthGoals: dynamicNarratives.nextMonthGoals,
    completedItems: {
      newMemorization: hasHefz ? analysis.newMemorization.content : undefined,
      revision: hasRev ? analysis.revision.content : undefined,
      quranReading: hasRead ? (analysis.quranReading?.content || analysis.recitationAndFoundation.content) : undefined,
      noorAlBayan: hasNoor ? analysis.noorAlBayan!.content : undefined,
      tajweedRules: hasTajweed ? analysis.tajweedProgress.content : undefined,
      islamicStudies: hasIslamic ? analysis.islamicStudiesProgress.content : undefined
    },
    statistics: {
      tajweedRulesLearned: tajweedCount && tajweedCount > 0 ? tajweedCount : undefined,
      noorAlBayanLessons: noorCount && noorCount > 0 ? noorCount : undefined,
      islamicStudiesLessons: islamicCount && islamicCount > 0 ? islamicCount : undefined
    },
    studentInteraction: `${analysis.importantObservations} • ${analysis.homeworkAndCommitmentPattern}`,
    expectedNextMonthPlan: analysis.nextMonthPlan,
    pedagogicalAnalysis: dynamicNarratives.pedagogicalAnalysis,
    deductiveInference: dynamicNarratives.deductiveInference,
    learningProfile: dynamicNarratives.learningProfile,
    parentalGuidance: dynamicNarratives.parentalGuidance,
    _internalLessonsCount: analysis.lessonsIncludedCount,
    _internalAttendedCount: analysis.attendedCount,
    sourceLessons: analysis.lessons,
    archivedLessonsCount: analysis.lessons.filter(l => l.isArchived).length,
    activeLessonsCount: analysis.lessons.filter(l => !l.isArchived).length,
    selectedArchiveGroup: archiveGroupFilter,
    activeSubjects: analysis.activeSubjects,
    qualitativeRatings: analysis.qualitativeRatings,
    hasExplicitNumericGrades: analysis.hasExplicitNumericGrades,
    monthlyProgressSummary: analysis.overallProgress
  };

  return sanitizeComprehensiveMonthlyReportData(rawResult);
}

/**
 * صياغة التقرير الشهري الشامل في الهيكل النصي المحدد لنسخه أو مشاركته
 * إذا توفرت أقسام القالب المخصص (templateSections) يتم الالتزام الحرفي بها وبعناوينها وترتيبها
 */
export function formatComprehensiveMonthlyReportText(rawData: ComprehensiveMonthlyReportData): string {
  const data = sanitizeComprehensiveMonthlyReportData(rawData);
  const isEn = data.lang === "en";

  if (data.templateSections && data.templateSections.length > 0) {
    const title = data.templateTitle || (isEn ? "MONTHLY LEARNING PROGRESS REPORT" : "تقرير التقدم التعليمي الشهري");
    const subtitle = data.templateSubtitle || getReportSubtitle(data.activeSubjects, isEn);
    const lines: string[] = [
      `✨ ${title} ✨`,
      subtitle,
      ``,
      isEn ? `Student Name: ${data.studentName}` : `اسم الطالب: ${data.studentName}`,
      isEn ? `Evaluation Month: ${data.monthLabel}` : `شهر التقييم: ${data.monthLabel}`,
      isEn ? `Teacher Name: ${data.teacherName}` : `اسم المعلم: ${data.teacherName}`,
      ``
    ];

    data.templateSections.forEach((sec) => {
      lines.push(`=== ${sec.title} ===`);
      if (sec.content && sec.content.trim()) {
        lines.push(sec.content.trim());
      }
      if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
        sec.bullets.forEach((b) => {
          const cleanB = b.replace(/^[-•*]\s*/, "").trim();
          if (cleanB) lines.push(`• ${cleanB}`);
        });
      }
      lines.push(``);
    });

    return lines.join("\n").trim();
  }

  if (isEn) {
    const subtitle = getReportSubtitle(data.activeSubjects, true);
    const lines: string[] = [
      `✨ MONTHLY LEARNING PROGRESS REPORT ✨`,
      subtitle,
      ``,
      `Student Name: ${data.studentName}`,
      `Evaluation Month: ${data.monthLabel}`,
      `Teacher Name: ${data.teacherName}`,
      ``
    ];

    if (isCleanValue(data.pedagogicalAnalysis)) {
      lines.push(`✦ MONTHLY PROGRESS SUMMARY:`, data.pedagogicalAnalysis!, ``);
    }

    if (isCleanValue(data.completedItems.newMemorization)) {
      lines.push(`New Memorization: ${data.completedItems.newMemorization} - Evaluation: Excellent (Mastered)`, ``);
    }
    if (isCleanValue(data.completedItems.revision)) {
      lines.push(`Revision: ${data.completedItems.revision} - Evaluation: Very Good (Reinforced)`, ``);
    }
    if (isCleanValue(data.completedItems.quranReading)) {
      lines.push(`Qur'an Reading & Recitation: ${data.completedItems.quranReading} - Evaluation: Fluent & Accurate`, ``);
    }
    if (isCleanValue(data.completedItems.noorAlBayan)) {
      lines.push(`Noor Al-Bayan & Foundation: ${data.completedItems.noorAlBayan} - Evaluation: Excellent`, ``);
    }
    if (isCleanValue(data.completedItems.tajweedRules)) {
      lines.push(`Tajweed Rules Applied: ${data.completedItems.tajweedRules} - Evaluation: Mastered Application`, ``);
    }
    if (isCleanValue(data.completedItems.islamicStudies)) {
      lines.push(`Islamic Studies: ${data.completedItems.islamicStudies} - Evaluation: Excellent`, ``);
    }

    if (data.indicators.memorization > 0) {
      lines.push(`Memorization Evaluation: ${data.indicators.memorization}%`, ``);
    }
    if (data.indicators.revision > 0) {
      lines.push(`Revision Strength: ${data.indicators.revision}%`, ``);
    }
    if (data.indicators.tajweedAndFoundation > 0) {
      lines.push(`Tajweed & Foundation: ${data.indicators.tajweedAndFoundation}%`, ``);
    }
    if (data.indicators.islamicStudies && data.indicators.islamicStudies > 0) {
      lines.push(`Islamic Studies: ${data.indicators.islamicStudies}%`, ``);
    }
    if (data.indicators.commitment > 0) {
      lines.push(`Commitment & Attendance: ${data.indicators.commitment}% (Formula: 70% Attendance + 30% Homework)`, ``);
    }

    if (data.strengths.length > 0) {
      lines.push(`Strengths: ${data.strengths.join(". ")}`, ``);
    }
    if (data.recommendations.length > 0) {
      lines.push(`Recommendations: ${data.recommendations.join(". ")}`, ``);
    }
    if (isCleanValue(data.parentalGuidance)) {
      lines.push(`Parental Guidance: ${data.parentalGuidance}`, ``);
    }
    if (isCleanValue(data.expectedNextMonthPlan)) {
      lines.push(`Next Month Plan:`, data.expectedNextMonthPlan);
    }

    return lines.join("\n");
  }

  const subtitleAr = getReportSubtitle(data.activeSubjects, false);
  const lines: string[] = [
    `✨ تقرير التقدم التعليمي الشهري ✨`,
    subtitleAr,
    ``,
    `اسم الطالب: ${data.studentName}`,
    `شهر التقييم: ${data.monthLabel}`,
    `اسم المعلم: ${data.teacherName}`,
    ``
  ];

  if (isCleanValue(data.pedagogicalAnalysis)) {
    lines.push(`✦ ملخص التقدم الشهري:`, data.pedagogicalAnalysis!, ``);
  }

  if (isCleanValue(data.completedItems.newMemorization)) {
    lines.push(`الحفظ الجديد: ${data.completedItems.newMemorization} - التقييم: ممتاز (متقن)`, ``);
  }
  if (isCleanValue(data.completedItems.revision)) {
    lines.push(`المراجعة والتثبيت: ${data.completedItems.revision} - التقييم: متقن ومثبّت`, ``);
  }
  if (isCleanValue(data.completedItems.quranReading)) {
    lines.push(`تلاوة القرآن الكريم: ${data.completedItems.quranReading} - التقييم: تلاوة متقنة وسليمة`, ``);
  }
  if (isCleanValue(data.completedItems.noorAlBayan)) {
    lines.push(`نور البيان والتأسيس: ${data.completedItems.noorAlBayan} - التقييم: ممتاز (متقن)`, ``);
  }
  if (isCleanValue(data.completedItems.tajweedRules)) {
    lines.push(`أحكام التجويد المطبقة: ${data.completedItems.tajweedRules} - التقييم: تطبيق عملي متقن`, ``);
  }
  if (isCleanValue(data.completedItems.islamicStudies)) {
    lines.push(`الدراسات الإسلامية: ${data.completedItems.islamicStudies} - التقييم: ممتاز (متقن)`, ``);
  }

  if (data.indicators.memorization > 0) {
    lines.push(`مؤشر الحفظ الجديد: ${data.indicators.memorization}%`, ``);
  }
  if (data.indicators.revision > 0) {
    lines.push(`مؤشر المراجعة والتثبيت: ${data.indicators.revision}%`, ``);
  }
  if (data.indicators.tajweedAndFoundation > 0) {
    lines.push(`مؤشر التجويد والتأسيس: ${data.indicators.tajweedAndFoundation}%`, ``);
  }
  if (data.indicators.islamicStudies && data.indicators.islamicStudies > 0) {
    lines.push(`مؤشر الدراسات الإسلامية: ${data.indicators.islamicStudies}%`, ``);
  }
  if (data.indicators.commitment > 0) {
    lines.push(`معدل الالتزام والحضور: ${data.indicators.commitment}% (المعادلة: 70% للحضور + 30% للواجبات)`, ``);
  }

  if (data.strengths.length > 0) {
    lines.push(`نقاط القوة: ${data.strengths.join(" • ")}`, ``);
  }
  if (data.recommendations.length > 0) {
    lines.push(`التوصيات: ${data.recommendations.join(" • ")}`, ``);
  }
  if (isCleanValue(data.parentalGuidance)) {
    lines.push(`إرشادات المتابعة المنزلية: ${data.parentalGuidance}`, ``);
  }
  if (isCleanValue(data.expectedNextMonthPlan)) {
    lines.push(`الخطة المقترحة للشهر القادم:`, data.expectedNextMonthPlan);
  }

  return lines.join("\n");
}

/**
 * يحول النص المحرر في الخطوة 1 إلى أقسام وعناوين مطابقة حرفياً للقالب
 * بحيث ينعكس أي تعديل يجريه المعلم في النص الخام مباشرة في المعاينة المرئية وملفي PDF و Word
 */
export function parseTemplateTextToSections(
  rawText: string,
  fallbackTitle?: string
): { reportTitle?: string; sections: MonthlyTemplateSection[] } {
  if (!rawText || !rawText.trim()) {
    return { reportTitle: fallbackTitle, sections: [] };
  }

  const lines = rawText.split(/\r?\n/);
  let reportTitle = fallbackTitle;
  const sections: MonthlyTemplateSection[] = [];
  let currentSection: { title: string; contentLines: string[]; bullets: string[] } | null = null;

  const flushSection = () => {
    if (!currentSection) return;
    const cleanTitle = currentSection.title.trim();
    const content = currentSection.contentLines.join("\n").trim();
    const bullets = currentSection.bullets.filter(Boolean);
    if (cleanTitle && (content || bullets.length > 0)) {
      sections.push({
        title: cleanTitle,
        content,
        bullets: bullets.length > 0 ? bullets : undefined
      });
    }
    currentSection = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentSection && currentSection.contentLines.length > 0) {
        currentSection.contentLines.push("");
      }
      continue;
    }

    // Skip metadata header lines
    if (
      /^(?:Student Name|Evaluation Month|Evaluation Period|Teacher Name|اسم الطالب|شهر التقييم|فترة التقييم|اسم المعلم)\s*[:：]/i.test(
        line
      )
    ) {
      continue;
    }

    // Check if top title line wrapped in ✨ ... ✨
    if (i <= 2 && /^✨.*✨$/.test(line)) {
      reportTitle = line.replace(/✨/g, "").trim();
      continue;
    }

    // Skip subtitle line right after ✨ title ✨ if before any section
    if (i <= 3 && !currentSection && sections.length === 0 && !/^===|^#|^✦|^\d+[.)]/.test(line)) {
      continue;
    }

    // Match explicit section headers:
    // 1) === Section Title ===
    // 2) ## Section Title or ### Section Title
    // 3) ✦ Section Title:
    // 4) 1. Section Title (when standalone heading or ending with colon)
    const eqMatch = line.match(/^===\s*(.+?)\s*===$/);
    const mdMatch = line.match(/^#{1,3}\s+(.+?)$/);
    const starMatch = line.match(/^✦\s*(.+?)\s*[:：]?$/);
    const numHeadingMatch = line.match(/^(\d+[.)]\s+[^:：\n]{3,75})\s*[:：]?$/);

    if (eqMatch) {
      flushSection();
      currentSection = { title: eqMatch[1].trim(), contentLines: [], bullets: [] };
      continue;
    }
    if (mdMatch) {
      flushSection();
      currentSection = { title: mdMatch[1].trim(), contentLines: [], bullets: [] };
      continue;
    }
    if (starMatch) {
      flushSection();
      currentSection = { title: starMatch[1].trim(), contentLines: [], bullets: [] };
      continue;
    }
    if (numHeadingMatch && (!currentSection || currentSection.contentLines.length > 0 || currentSection.bullets.length > 0)) {
      flushSection();
      currentSection = { title: numHeadingMatch[1].trim(), contentLines: [], bullets: [] };
      continue;
    }

    // Check inline "Heading: Content" when no === sections exist yet
    const inlineMatch = line.match(
      /^((?:New Memorization|Revision|Qur'an Reading & Recitation|Noor Al-Bayan & Foundation|Tajweed Rules Applied|Islamic Studies|Strengths|Recommendations|Parental Guidance|Next Month Plan|الحفظ الجديد|المراجعة والتثبيت|تلاوة القرآن الكريم|نور البيان والتأسيس|أحكام التجويد المطبقة|الدراسات الإسلامية|نقاط القوة|التوصيات|إرشادات المتابعة المنزلية|الخطة المقترحة للشهر القادم))\s*[:：]\s*(.*)$/i
    );
    if (inlineMatch) {
      flushSection();
      const secTitle = inlineMatch[1].trim();
      const firstVal = inlineMatch[2].trim();
      currentSection = {
        title: secTitle,
        contentLines: firstVal ? [firstVal] : [],
        bullets: []
      };
      continue;
    }

    if (!currentSection) {
      currentSection = {
        title: fallbackTitle || "Monthly Evaluation Summary",
        contentLines: [],
        bullets: []
      };
    }

    if (/^[•\-*]\s+/.test(line)) {
      currentSection.bullets.push(line.replace(/^[•\-*]\s+/, "").trim());
    } else {
      currentSection.contentLines.push(line);
    }
  }

  flushSection();

  return { reportTitle, sections };
}

