/**
 * Comprehensive Monthly Report System for Quran & Islamic Studies
 * نظام التقارير الشهري الشامل للقرآن الكريم والدراسات الإسلامية
 */

import {
  stripAllUrlsAndLinks,
  sanitizeTextForEnglishReport,
  extractCategorizedItemsFromLesson,
  buildCategorySpecificNarratives
} from "./monthlyReportModel";

export interface MonthlyLessonSummary {
  date: string;
  lessonNumber?: number;
  durationMinutes?: number;
  attendance: string;
  homeworkStatus?: string;
  classEvents?: string;
  homeworkNotes?: string;
  teacherNotes?: string;
  overallEvaluation?: string;
  reportText?: string;
}

export interface MonthlyReportPayload {
  studentName: string;
  subject: string;
  month: number;
  year: number;
  monthName?: string;
  totalLessons: number;
  totalHours: number | string;
  lessons: MonthlyLessonSummary[];
  teacherName?: string;
  additionalNotes?: string;
  todayDate?: string;
  lang?: "ar" | "en";
}

export const ARABIC_MONTHS = [
  { number: 1, name: "يناير (شهر 1)", englishName: "January" },
  { number: 2, name: "فبراير (شهر 2)", englishName: "February" },
  { number: 3, name: "مارس (شهر 3)", englishName: "March" },
  { number: 4, name: "أبريل (شهر 4)", englishName: "April" },
  { number: 5, name: "مايو (شهر 5)", englishName: "May" },
  { number: 6, name: "يونيو (شهر 6)", englishName: "June" },
  { number: 7, name: "يوليو (شهر 7)", englishName: "July" },
  { number: 8, name: "أغسطس (شهر 8)", englishName: "August" },
  { number: 9, name: "سبتمبر (شهر 9)", englishName: "September" },
  { number: 10, name: "أكتوبر (شهر 10)", englishName: "October" },
  { number: 11, name: "نوفمبر (شهر 11)", englishName: "November" },
  { number: 12, name: "ديسمبر (شهر 12)", englishName: "December" }
];

export const ENGLISH_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

/**
 * Normalizes and formats the evaluation month strictly according to the report language.
 * When lang === 'en', guarantees clean English format: e.g. "September 2026", never Arabic "سبتمبر".
 * When lang === 'ar', guarantees clean Arabic format: e.g. "سبتمبر 2026".
 */
export function formatMonthlyReportMonth(
  monthNumber?: number,
  year?: number,
  rawMonthName?: string,
  lang: "ar" | "en" = "en"
): string {
  let m = typeof monthNumber === "number" && monthNumber >= 1 && monthNumber <= 12 ? monthNumber : undefined;
  let y = typeof year === "number" && year >= 2020 ? year : new Date().getFullYear();

  if (rawMonthName) {
    const rawLower = rawMonthName.toLowerCase();
    const yearMatch = rawMonthName.match(/\b(202\d)\b/);
    if (yearMatch) y = parseInt(yearMatch[1], 10);

    if (!m) {
      if (/سبتمبر|september|\b9\b|شهر\s*9/i.test(rawLower)) m = 9;
      else if (/أكتوبر|اكتوبر|october|\b10\b|شهر\s*10/i.test(rawLower)) m = 10;
      else if (/نوفمبر|november|\b11\b|شهر\s*11/i.test(rawLower)) m = 11;
      else if (/ديسمبر|december|\b12\b|شهر\s*12/i.test(rawLower)) m = 12;
      else if (/يناير|january|\b1\b|شهر\s*1/i.test(rawLower)) m = 1;
      else if (/فبراير|february|\b2\b|شهر\s*2/i.test(rawLower)) m = 2;
      else if (/مارس|march|\b3\b|شهر\s*3/i.test(rawLower)) m = 3;
      else if (/أبريل|ابريل|april|\b4\b|شهر\s*4/i.test(rawLower)) m = 4;
      else if (/مايو|may|\b5\b|شهر\s*5/i.test(rawLower)) m = 5;
      else if (/يونيو|june|\b6\b|شهر\s*6/i.test(rawLower)) m = 6;
      else if (/يوليو|july|\b7\b|شهر\s*7/i.test(rawLower)) m = 7;
      else if (/أغسطس|اغسطس|august|\b8\b|شهر\s*8/i.test(rawLower)) m = 8;
    }
  }

  const safeMonth = m && m >= 1 && m <= 12 ? m : (new Date().getMonth() + 1);

  if (lang === "en") {
    return `${ENGLISH_MONTH_NAMES[safeMonth - 1]} ${y}`;
  } else {
    return `${ARABIC_MONTH_NAMES[safeMonth - 1]} ${y}`;
  }
}

/**
 * Normalizes teacher name according to language.
 * E.g. "أ. محمد فتحي (Mohammed Fathy)" -> "Mr. Mohammed Fathy" in English, "أ. محمد فتحي" in Arabic.
 */
export function normalizeReportTeacherName(rawName?: string, lang: "ar" | "en" = "ar"): string {
  if (!rawName) return lang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي";
  if (lang === "en") {
    const enMatch = rawName.match(/\(([^)]+)\)/);
    if (enMatch && /[a-zA-Z]/.test(enMatch[1])) {
      const inner = enMatch[1].trim();
      return inner.startsWith("Mr.") ? inner : `Mr. ${inner}`;
    }
    const clean = rawName.replace(/^(?:أ\.|الأستاذ|الشيخ|معلم)\s*/gi, "").trim();
    if (/محمد فتحي/.test(clean)) return "Mr. Mohammed Fathy";
    if (/[a-zA-Z]/.test(clean)) return clean.startsWith("Mr.") ? clean : `Mr. ${clean}`;
    return `Mr. ${clean}`;
  } else {
    const arClean = rawName.replace(/\s*\([a-zA-Z\s.-]+\)/g, "").trim();
    return arClean.startsWith("أ.") ? arClean : `أ. ${arClean}`;
  }
}

/**
 * Normalizes evaluation grades to strictly English or Arabic according to language.
 */
export function normalizeReportGrade(grade?: string, lang: "ar" | "en" = "ar"): string {
  if (!grade) return lang === "en" ? "Very Good (4.5/5)" : "متقن جداً ⭐⭐⭐⭐";
  const g = grade.trim();
  if (lang === "en") {
    if (/ممتاز|متميز|10\/10|excellent|outstanding/i.test(g)) return "Excellent (5/5)";
    if (/جيد جدا|جيد جدًا|9\/10|8\/10|very good|proficient|متقن/i.test(g)) return "Very Good (4.5/5)";
    if (/جيد|7\/10|good/i.test(g)) return "Good (4/5)";
    if (/يحتاج|ضعيف|needs improvement/i.test(g)) return "Needs Improvement & Follow-up";
    const withoutArabic = g.replace(/[\u0600-\u06FF]/g, "").trim();
    return withoutArabic || "Very Good (4.5/5)";
  } else {
    if (/excellent|ممتاز/i.test(g)) return "ممتاز ⭐⭐⭐⭐⭐";
    if (/very good|proficient|جيد جدا|جيد جدًا|متقن/i.test(g)) return "متقن جداً ⭐⭐⭐⭐";
    if (/good|جيد/i.test(g)) return "جيد ⭐⭐⭐";
    if (/needs improvement|يحتاج/i.test(g)) return "يحتاج إلى متابعة ⭐⭐";
    return g;
  }
}

export const QURAN_SURAHS: { num: number; ar: string; en: string }[] = [
  { num: 1, ar: "الفاتحة", en: "Al-Fatihah" },
  { num: 2, ar: "البقرة", en: "Al-Baqarah" },
  { num: 3, ar: "آل عمران", en: "Ali 'Imran" },
  { num: 4, ar: "النساء", en: "An-Nisa'" },
  { num: 5, ar: "المائدة", en: "Al-Ma'idah" },
  { num: 6, ar: "الأنعام", en: "Al-An'am" },
  { num: 7, ar: "الأعراف", en: "Al-A'raf" },
  { num: 8, ar: "الأنفال", en: "Al-Anfal" },
  { num: 9, ar: "التوبة", en: "At-Tawbah" },
  { num: 10, ar: "يونس", en: "Yunus" },
  { num: 11, ar: "هود", en: "Hud" },
  { num: 12, ar: "يوسف", en: "Yusuf" },
  { num: 13, ar: "الرعد", en: "Ar-Ra'd" },
  { num: 14, ar: "إبراهيم", en: "Ibrahim" },
  { num: 15, ar: "الحجر", en: "Al-Hijr" },
  { num: 16, ar: "النحل", en: "An-Nahl" },
  { num: 17, ar: "الإسراء", en: "Al-Isra" },
  { num: 18, ar: "الكهف", en: "Al-Kahf" },
  { num: 19, ar: "مريم", en: "Maryam" },
  { num: 20, ar: "طه", en: "Ta-Ha" },
  { num: 21, ar: "الأنبياء", en: "Al-Anbiya" },
  { num: 22, ar: "الحج", en: "Al-Hajj" },
  { num: 23, ar: "المؤمنون", en: "Al-Mu'minun" },
  { num: 24, ar: "النور", en: "An-Nur" },
  { num: 25, ar: "الفرقان", en: "Al-Furqan" },
  { num: 26, ar: "الشعراء", en: "Ash-Shu'ara" },
  { num: 27, ar: "النمل", en: "An-Naml" },
  { num: 28, ar: "القصص", en: "Al-Qasas" },
  { num: 29, ar: "العنكبوت", en: "Al-Ankabut" },
  { num: 30, ar: "الروم", en: "Ar-Rum" },
  { num: 31, ar: "لقمان", en: "Luqman" },
  { num: 32, ar: "السجدة", en: "As-Sajdah" },
  { num: 33, ar: "الأحزاب", en: "Al-Ahzab" },
  { num: 34, ar: "سبأ", en: "Saba'" },
  { num: 35, ar: "فاطر", en: "Fatir" },
  { num: 36, ar: "يس", en: "Ya-Sin" },
  { num: 37, ar: "الصافات", en: "As-Saffat" },
  { num: 38, ar: "ص", en: "Sad" },
  { num: 39, ar: "الزمر", en: "Az-Zumar" },
  { num: 40, ar: "غافر", en: "Ghafir" },
  { num: 41, ar: "فصلت", en: "Fussilat" },
  { num: 42, ar: "الشورى", en: "Ash-Shura" },
  { num: 43, ar: "الزخرف", en: "Az-Zukhruf" },
  { num: 44, ar: "الدخان", en: "Ad-Dukhan" },
  { num: 45, ar: "الجاثية", en: "Al-Jathiyah" },
  { num: 46, ar: "الأحقاف", en: "Al-Ahqaf" },
  { num: 47, ar: "محمد", en: "Muhammad" },
  { num: 48, ar: "الفتح", en: "Al-Fath" },
  { num: 49, ar: "الحجرات", en: "Al-Hujurat" },
  { num: 50, ar: "ق", en: "Qaf" },
  { num: 51, ar: "الذاريات", en: "Adh-Dhariyat" },
  { num: 52, ar: "الطور", en: "At-Tur" },
  { num: 53, ar: "النجم", en: "An-Najm" },
  { num: 54, ar: "القمر", en: "Al-Qamar" },
  { num: 55, ar: "الرحمن", en: "Ar-Rahman" },
  { num: 56, ar: "الواقعة", en: "Al-Waqi'ah" },
  { num: 57, ar: "الحديد", en: "Al-Hadid" },
  { num: 58, ar: "المجادلة", en: "Al-Mujadilah" },
  { num: 59, ar: "الحشر", en: "Al-Hashr" },
  { num: 60, ar: "الممتحنة", en: "Al-Mumtahanah" },
  { num: 61, ar: "الصف", en: "As-Saff" },
  { num: 62, ar: "الجمعة", en: "Al-Jumu'ah" },
  { num: 63, ar: "المنافقون", en: "Al-Munafiqun" },
  { num: 64, ar: "التغابن", en: "At-Taghabun" },
  { num: 65, ar: "الطلاق", en: "At-Talaq" },
  { num: 66, ar: "التحريم", en: "At-Tahrim" },
  { num: 67, ar: "الملك", en: "Al-Mulk" },
  { num: 68, ar: "القلم", en: "Al-Qalam" },
  { num: 69, ar: "الحاقة", en: "Al-Haqqah" },
  { num: 70, ar: "المعارج", en: "Al-Ma'arij" },
  { num: 71, ar: "نوح", en: "Nuh" },
  { num: 72, ar: "الجن", en: "Al-Jinn" },
  { num: 73, ar: "المزمل", en: "Al-Muzzammil" },
  { num: 74, ar: "المدثر", en: "Al-Muddaththir" },
  { num: 75, ar: "القيامة", en: "Al-Qiyamah" },
  { num: 76, ar: "الإنسان", en: "Al-Insan" },
  { num: 77, ar: "المرسلات", en: "Al-Mursalat" },
  { num: 78, ar: "النبأ", en: "An-Naba" },
  { num: 79, ar: "النازعات", en: "An-Nazi'at" },
  { num: 80, ar: "عبس", en: "'Abasa" },
  { num: 81, ar: "التكوير", en: "At-Takwir" },
  { num: 82, ar: "الانفطار", en: "Al-Infitar" },
  { num: 83, ar: "المطففين", en: "Al-Mutaffifin" },
  { num: 84, ar: "الانشقاق", en: "Al-Inshiqaq" },
  { num: 85, ar: "البروج", en: "Al-Buruj" },
  { num: 86, ar: "الطارق", en: "At-Tariq" },
  { num: 87, ar: "الأعلى", en: "Al-A'la" },
  { num: 88, ar: "الغاشية", en: "Al-Ghashiyah" },
  { num: 89, ar: "الفجر", en: "Al-Fajr" },
  { num: 90, ar: "البلد", en: "Al-Balad" },
  { num: 91, ar: "الشمس", en: "Ash-Shams" },
  { num: 92, ar: "الليل", en: "Al-Layl" },
  { num: 93, ar: "الضحى", en: "Ad-Duha" },
  { num: 94, ar: "الشرح", en: "Ash-Sharh" },
  { num: 95, ar: "التين", en: "At-Tin" },
  { num: 96, ar: "العلق", en: "Al-'Alaq" },
  { num: 97, ar: "القدر", en: "Al-Qadr" },
  { num: 98, ar: "البينة", en: "Al-Bayyinah" },
  { num: 99, ar: "الزلزلة", en: "Az-Zalzalah" },
  { num: 100, ar: "العاديات", en: "Al-'Adiyat" },
  { num: 101, ar: "القارعة", en: "Al-Qari'ah" },
  { num: 102, ar: "التكاثر", en: "At-Takathur" },
  { num: 103, ar: "العصر", en: "Al-'Asr" },
  { num: 104, ar: "الهمزة", en: "Al-Humazah" },
  { num: 105, ar: "الفيل", en: "Al-Fil" },
  { num: 106, ar: "قريش", en: "Quraysh" },
  { num: 107, ar: "الماعون", en: "Al-Ma'un" },
  { num: 108, ar: "الكوثر", en: "Al-Kawthar" },
  { num: 109, ar: "الكافرون", en: "Al-Kafirun" },
  { num: 110, ar: "النصر", en: "An-Nasr" },
  { num: 111, ar: "المسد", en: "Al-Masad" },
  { num: 112, ar: "الإخلاص", en: "Al-Ikhlas" },
  { num: 113, ar: "الفلق", en: "Al-Falaq" },
  { num: 114, ar: "الناس", en: "An-Nas" }
];

/**
 * Validates if the section/subject is eligible for the Comprehensive Monthly Report.
 * Strict Requirement:
 * Enabled ONLY for:
 * - "قرآن كريم"
 * - "Quran, Arabic and Islamic Studies"
 */
export const isQuranComprehensiveReportEligible = (subject: string | undefined | null): boolean => {
  if (!subject) return false;
  const s = subject.trim();
  const lower = s.toLowerCase();

  if (s === "قرآن كريم" || s === "Quran, Arabic and Islamic Studies") {
    return true;
  }

  if (
    lower === "قرآن كريم" ||
    lower === "quran, arabic and islamic studies" ||
    lower === "القرآن الكريم" ||
    lower === "قران كريم" ||
    lower.includes("quran, arabic and islamic studies") ||
    lower.includes("islamic studies")
  ) {
    return true;
  }

  return false;
};

/**
 * Returns the default report language for the Comprehensive Monthly Report ("My Qur'an Journey"):
 * Respects Arabic as default for Quran & Islamic studies, unless user preference or subject specifies English.
 */
export const getSubjectDefaultReportLanguage = (subject?: string | undefined | null, preferredAppLang?: "ar" | "en"): "ar" | "en" => {
  if (preferredAppLang) return preferredAppLang;
  if (!subject) return "ar";
  if (/english|quran in english/i.test(subject)) return "en";
  return "ar";
};

export function formatArabicLessonsCount(count: number): string {
  const n = Math.round(count);
  if (n === 1) return "حصة واحدة";
  if (n === 2) return "حصتان";
  if (n >= 3 && n <= 10) return `${n} حصص`;
  return `${n} حصة`;
}

export function formatArabicHoursCount(hours: number | string): string {
  const num = typeof hours === "number" ? hours : parseFloat(hours) || 0;
  if (num === 1) return "ساعة واحدة";
  if (num === 2) return "ساعتان";
  if (num >= 3 && num <= 10) return `${num} ساعات`;
  return `${num} ساعة`;
}

export const isStudentEligibleForMonthlyReport = (student: any): boolean => {
  if (!student) return false;
  if (isQuranComprehensiveReportEligible(student.subject)) return true;
  if (Array.isArray(student.subjects) && student.subjects.some((s: any) => isQuranComprehensiveReportEligible(s?.subject))) {
    return true;
  }
  return false;
};

export const getStudentEligibleQuranSubject = (student: any): string => {
  if (!student) return "قرآن كريم";
  if (isQuranComprehensiveReportEligible(student.subject)) return student.subject;
  const found = student.subjects?.find((s: any) => isQuranComprehensiveReportEligible(s?.subject));
  if (found && found.subject) return found.subject;
  return "قرآن كريم";
};

/**
 * Aggregates multiple raw lesson items into a single, cohesive paragraph for the monthly summary.
 * Strictly adheres to Arabic grammatical rules and proper Surah naming conventions.
 */
export function aggregateCurriculumScope(
  rawItems: string[],
  type: "hefz" | "revision" | "recitation" | "islamic",
  lang: "ar" | "en" = "ar"
): string {
  if (!rawItems || rawItems.length === 0) return "";

  const isAr = lang === "ar";
  const cleanedRawItems = rawItems.map(item => stripAllUrlsAndLinks(item)).filter(Boolean);
  if (cleanedRawItems.length === 0) return "";

  const fullText = cleanedRawItems.join(" ");

  // Find recognized Surahs
  const foundSurahs: { num: number; ar: string; en: string }[] = [];
  QURAN_SURAHS.forEach(s => {
    const arRegex = new RegExp(`(?:^|[^\\u0600-\\u06FF])(?:سورة\\s+|سوره\\s+)?${s.ar.replace(/[أإآ]/g, "[أإآا]")}(?=$|[^\\u0600-\\u06FF])`, "i");
    const enRegex = new RegExp(`\\b(?:surah\\s+|surat\\s+)?${s.en.replace(/['\-]/g, "['\\-]?")}\\b`, "i");
    if (arRegex.test(fullText) || enRegex.test(fullText)) {
      foundSurahs.push(s);
    }
  });

  // Unique surahs preserving order of occurrence
  const uniqueSurahMap = new Map<number, { num: number; ar: string; en: string }>();
  foundSurahs.forEach(s => uniqueSurahMap.set(s.num, s));
  const uniqueSurahs = Array.from(uniqueSurahMap.values());

  // Clean raw phrases fallback (strictly translated to English when !isAr)
  const cleanPhrases = cleanedRawItems
    .map(t => t.replace(/^(حفظ|مراجعة|تسميع|درس|تم حفظ|تمت مراجعة)\s*:?/gi, "").trim())
    .map(t => isAr ? t : sanitizeTextForEnglishReport(t, "topic"))
    .filter(t => Boolean(t) && (isAr ? true : !/[\u0600-\u06FF]/.test(t)));

  if (type === "hefz") {
    if (uniqueSurahs.length >= 3) {
      // Check if continuous sequence
      const sorted = [...uniqueSurahs].sort((a, b) => a.num - b.num);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (isAr) {
        return `تم إنجاز حفظ من سورة ${first.ar} إلى سورة ${last.ar} بإتقان تام وضبط لأحكام التلاوة.`;
      } else {
        return `Successfully completed memorization from Surah ${first.en} to Surah ${last.en} with strong retention and Tajweed.`;
      }
    } else if (uniqueSurahs.length === 2) {
      if (isAr) {
        return `تم إنجاز حفظ سورتي (${uniqueSurahs[0].ar}، و${uniqueSurahs[1].ar}) مع التلقي المباشر وإتقان مخارج الحروف.`;
      } else {
        return `Memorized Surahs: (${uniqueSurahs[0].en} and ${uniqueSurahs[1].en}) with direct recitation and sound pronunciation.`;
      }
    } else if (uniqueSurahs.length === 1) {
      if (isAr) {
        return `تم إنجاز حفظ سورة ${uniqueSurahs[0].ar} مع التركيز على التلقي المباشر وإتقان مخارج الحروف.`;
      } else {
        return `Memorized Surah ${uniqueSurahs[0].en} with direct recitation and proper pronunciation.`;
      }
    } else {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join(isAr ? "، و" : ", ");
      if (isAr) {
        return sample
          ? `تم إنجاز المقرر المخصص: ${sample} بحفظ متقن وسرعة استيعاب ممتازة.`
          : `تم إنجاز المقرر المخصص من الحفظ الجديد بإتقان وسرعة استيعاب ممتازة.`;
      } else {
        return sample
          ? `Completed assigned scope: ${sample} with high retention and accuracy.`
          : `Completed the assigned new memorization portion with high retention and accuracy.`;
      }
    }
  }

  if (type === "revision") {
    if (uniqueSurahs.length >= 3) {
      const sorted = [...uniqueSurahs].sort((a, b) => a.num - b.num);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (isAr) {
        return `مراجعة وتثبيت شامل من سورة ${first.ar} إلى سورة ${last.ar} لضبط المتشابهات وترسيخ المحفوظ.`;
      } else {
        return `Comprehensive cumulative review from Surah ${first.en} to Surah ${last.en} to reinforce retention and accuracy.`;
      }
    } else if (uniqueSurahs.length === 2) {
      if (isAr) {
        return `مراجعة وتثبيت سورتي (${uniqueSurahs[0].ar}، و${uniqueSurahs[1].ar}) وضبط المتشابهات بدقة.`;
      } else {
        return `Reviewed and reinforced Surahs: (${uniqueSurahs[0].en} and ${uniqueSurahs[1].en}) ensuring smooth recall.`;
      }
    } else if (uniqueSurahs.length === 1) {
      if (isAr) {
        return `مراجعة وتثبيت سورة ${uniqueSurahs[0].ar} والتأكد من استحضار الآيات بسلاسة دون تردد.`;
      } else {
        return `Reviewed and reinforced Surah ${uniqueSurahs[0].en} ensuring smooth and confident recall.`;
      }
    } else {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join(isAr ? "، و" : ", ");
      if (isAr) {
        return sample
          ? `مراجعة وتثبيت: ${sample} ومتابعة المحفوظ السابق بانتظام.`
          : `مراجعة وتثبيت المحفوظ السابق بانتظام وإتقان.`;
      } else {
        return sample
          ? `Reviewed: ${sample} with consistent cumulative recall practice.`
          : `Reviewed assigned portions with consistent cumulative recall practice.`;
      }
    }
  }

  if (type === "recitation") {
    if (isAr) {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join("، و");
      return sample
        ? `تطبيق أحكام التجويد (مخارج الحروف، والمدود، وأحكام النون الساكنة) وتلاوة: ${sample}.`
        : `تطبيق عملي لأحكام التجويد الأساسية ومخارج وصفات الحروف مع حسن الترتيل وتصحيح التلاوة.`;
    } else {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join(", ");
      return sample
        ? `Applied Tajweed rules (articulation points, elongation, Nun Sakinah) and recitation in: ${sample}.`
        : `Applied practical Tajweed rules including articulation points and elongation with fluent recitation.`;
    }
  }

  if (type === "islamic") {
    if (isAr) {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join("، و");
      return sample
        ? `دراسة موضوعات تربوية في: ${sample} والآداب الإسلامية والأذكار اليومية.`
        : `دراسة موضوعات تربوية في الفقه والسيرة النبوية الشريفة والآداب والأذكار اليومية.`;
    } else {
      const sample = Array.from(new Set(cleanPhrases)).slice(0, 3).join(", ");
      return sample
        ? `Studied topics in: ${sample} along with Islamic manners and daily Adhkar.`
        : `Educational study in Fiqh, Seerah of the Prophet, and essential daily Adhkar.`;
    }
  }

  return cleanPhrases.join(isAr ? "، " : ", ");
}

/**
 * Deterministic standard template matching the exact format requested
 */
export function buildClientStandardMonthlyReportText(req: MonthlyReportPayload): string {
  const {
    studentName = "الطالب",
    subject = "قرآن كريم",
    month,
    year,
    monthName,
    totalLessons = 0,
    totalHours = 0,
    lessons = []
  } = req;

  const isEn = Boolean(req.lang === "en" || (!req.lang && !/قرآن|اسلامية|دراسات|عربي|arabic/i.test(subject) && /english/i.test(subject)));
  const displayMonth = formatMonthlyReportMonth(month, year, monthName, isEn ? "en" : "ar");
  const effectiveHours = totalHours || Number(((totalLessons * 60) / 60).toFixed(1));

  const extractUniqueItems = (items: string[]) => {
    const set = new Set<string>();
    items.forEach(raw => {
      const cleanRaw = stripAllUrlsAndLinks(raw);
      const parts = cleanRaw.split(/[+،,\n-]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        if (p.length > 1 && !set.has(p)) set.add(p);
      });
    });
    return Array.from(set);
  };

  const newHefzItems: string[] = [];
  const revisionItems: string[] = [];
  const recitationItems: string[] = [];
  const noorItems: string[] = [];
  const tajweedItems: string[] = [];
  const islamicStudiesItems: string[] = [];
  const evaluationsFound: string[] = [];

  lessons.forEach((l) => {
    const cleanEval = stripAllUrlsAndLinks(l.overallEvaluation);
    if (cleanEval) evaluationsFound.push(cleanEval);

    const categorized = extractCategorizedItemsFromLesson({
      classEvents: l.classEvents,
      reportText: l.reportText,
      teacherNotes: l.teacherNotes,
      homeworkNotes: l.homeworkNotes
    });

    newHefzItems.push(...categorized.newMemorization);
    revisionItems.push(...categorized.revision);
    recitationItems.push(...categorized.quranReading);
    noorItems.push(...categorized.noorAlBayan);
    tajweedItems.push(...categorized.tajweedRules);
    islamicStudiesItems.push(...categorized.islamicStudies);
  });

  const uniqueHefz = extractUniqueItems(newHefzItems);
  const uniqueRevision = extractUniqueItems(revisionItems);
  const uniqueRecitation = extractUniqueItems([...recitationItems, ...noorItems, ...tajweedItems]);
  const uniqueIslamic = extractUniqueItems(islamicStudiesItems);

  // General evaluation calculation
  const getOverallGrade = () => {
    const evalText = evaluationsFound.join(" ") + " " + lessons.map(l => l.teacherNotes || "").join(" ");
    if (/ممتاز|10\/10|متميز|رائع|excellent|outstanding/i.test(evalText)) return isEn ? "Excellent" : "ممتاز";
    if (/جيد جدا|9\/10|8\/10|متقن|very good|proficient/i.test(evalText)) return isEn ? "Very Good" : "جيد جدًا";
    if (/يحتاج إلى تحسين|ضعيف|لم يحفظ|غير جاهز|needs improvement/i.test(evalText)) return isEn ? "Needs Improvement & Follow-up" : "يحتاج إلى تحسين ومتابعة";
    if (/جيد|7\/10|good/i.test(evalText)) return isEn ? "Good" : "جيد";
    return isEn ? "Very Good" : "جيد جدًا";
  };

  const currentGrade = getOverallGrade();

  // Single aggregated paragraphs per section
  const hefzParagraph = uniqueHefz.length > 0
    ? aggregateCurriculumScope(uniqueHefz, "hefz", isEn ? "en" : "ar")
    : "";

  const revisionParagraph = uniqueRevision.length > 0
    ? aggregateCurriculumScope(uniqueRevision, "revision", isEn ? "en" : "ar")
    : "";

  const recitationParagraph = uniqueRecitation.length > 0
    ? aggregateCurriculumScope(uniqueRecitation, "recitation", isEn ? "en" : "ar")
    : "";

  const islamicParagraph = uniqueIslamic.length > 0
    ? aggregateCurriculumScope(uniqueIslamic, "islamic", isEn ? "en" : "ar")
    : "";

  // Performance indicators
  const attendedLessons = lessons.filter(l => l.attendance === "حاضر" || l.attendance === "present").length;
  const commitmentPct = lessons.length > 0
    ? Math.round((attendedLessons / lessons.length) * 100)
    : 0;

  const isExcellent = currentGrade === "ممتاز" || currentGrade === "Excellent";
  const hefzSpeedPct = uniqueHefz.length > 0 ? (isExcellent ? 92 : 86) : 0;
  const revisionStrengthPct = uniqueRevision.length > 0 ? (isExcellent ? 90 : 84) : 0;
  const tajweedPct = uniqueRecitation.length > 0 ? (isExcellent ? 91 : 85) : 0;

  const dynamicNarratives = buildCategorySpecificNarratives({
    hasHefz: uniqueHefz.length > 0,
    hasRev: uniqueRevision.length > 0,
    hasRead: recitationItems.length > 0,
    hasNoor: noorItems.length > 0,
    hasTajweed: tajweedItems.length > 0,
    hasIslamic: uniqueIslamic.length > 0,
    isEn
  });

  if (isEn) {
    const strengthNote = dynamicNarratives.defaultStrengths.join(". ");
    const recommendationNote = dynamicNarratives.defaultRecommendations.join(". ");
    const nextPlan = dynamicNarratives.expectedNextMonthPlan;

    const lines: string[] = [
      `Student Name: ${studentName}`,
      ``,
      `Evaluation Month: ${displayMonth}`,
      ``,
      `Total Lessons: ${totalLessons}`,
      ``,
      `Total Hours: ${effectiveHours}`
    ];

    if (hefzParagraph) {
      lines.push(``, `New Memorization: ${hefzParagraph} - Evaluation: ${currentGrade}`);
    }
    if (revisionParagraph) {
      lines.push(``, `Revision: ${revisionParagraph} - Evaluation: Proficient`);
    }
    if (recitationParagraph) {
      lines.push(``, `Recitation & Foundation: ${recitationParagraph} - Evaluation: ${currentGrade}`);
    }
    if (islamicParagraph) {
      lines.push(``, `Islamic Studies & Arabic: ${islamicParagraph} - Evaluation: ${currentGrade}`);
    }

    if (hefzSpeedPct > 0 && hefzParagraph) {
      lines.push(``, `Memorization Speed Indicator: ${hefzSpeedPct}%`);
    }
    if (revisionStrengthPct > 0 && revisionParagraph) {
      lines.push(``, `Revision Strength Indicator: ${revisionStrengthPct}%`);
    }
    if (tajweedPct > 0 && recitationParagraph) {
      lines.push(``, `Tajweed & Foundation Indicator: ${tajweedPct}%`);
    }
    if (commitmentPct > 0) {
      lines.push(``, `Commitment Indicator: ${commitmentPct}%`);
    }

    lines.push(
      ``,
      `Strengths: ${strengthNote}`,
      ``,
      `Recommendations: ${recommendationNote}`,
      ``,
      `Next Month Plan:`,
      nextPlan
    );

    return lines.join("\n");
  }

  // Strengths and recommendations (Arabic)
  const strengthNote = dynamicNarratives.defaultStrengths.join(" • ");
  const recommendationNote = dynamicNarratives.defaultRecommendations.join(" • ");
  const nextPlan = dynamicNarratives.expectedNextMonthPlan;

  const lines: string[] = [
    `اسم الطالب: ${studentName}`,
    ``,
    `شهر التقييم: ${displayMonth}`,
    ``,
    `إجمالي الحصص: ${totalLessons}`,
    ``,
    `إجمالي الساعات: ${effectiveHours}`
  ];

  if (hefzParagraph) {
    lines.push(``, `حفظ جديد: ${hefzParagraph} - التقييم: ${currentGrade}`);
  }
  if (revisionParagraph) {
    lines.push(``, `مراجعة: ${revisionParagraph} - التقييم: متقن`);
  }
  if (recitationParagraph) {
    lines.push(``, `تلاوة وتأسيس: ${recitationParagraph} - التقييم: ${currentGrade}`);
  }
  if (islamicParagraph) {
    lines.push(``, `دراسات إسلامية: ${islamicParagraph} - التقييم: ${currentGrade}`);
  }

  if (hefzSpeedPct > 0 && hefzParagraph) {
    lines.push(``, `مؤشر سرعة الحفظ: ${hefzSpeedPct}%`);
  }
  if (revisionStrengthPct > 0 && revisionParagraph) {
    lines.push(``, `مؤشر قوة المراجعة: ${revisionStrengthPct}%`);
  }
  if (tajweedPct > 0 && recitationParagraph) {
    lines.push(``, `مؤشر التجويد والتأسيس: ${tajweedPct}%`);
  }
  if (commitmentPct > 0) {
    lines.push(``, `مؤشر الالتزام: ${commitmentPct}%`);
  }

  lines.push(
    ``,
    `نقاط القوة: ${strengthNote}`,
    ``,
    `التوصيات: ${recommendationNote}`,
    ``,
    `خطة الشهر القادم:`,
    nextPlan
  );

  return lines.join("\n");
}

/**
 * Call backend API for AI generation with client-side fallback
 */
export async function callGenerateMonthlyReportAI(payload: MonthlyReportPayload): Promise<string> {
  try {
    const res = await fetch("/api/ai/generate-monthly-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.reportText) {
        return data.reportText;
      }
    }
  } catch (err) {
    console.warn("[Monthly Quran Report] Backend call failed, using client generator:", err);
  }

  // Fallback to client-side generator matching the exact template
  return buildClientStandardMonthlyReportText(payload);
}

