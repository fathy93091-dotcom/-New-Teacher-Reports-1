/**
 * GoStars - Teacher Management System
 * Core Domain Type Definitions
 */

export type StudyType = "group" | "private";

/**
 * Supported Billing Types:
 * - "monthly": شهر كامل ثابت (اشتراك شهري ثابت)
 * - "per_lesson": محاسبة بالحصة المنفذة
 * - "monthly_elapsed_lessons": محاسبة حسب عدد حصص الشهر المنقضية (وفقاً للتقويم/الحصص المنفذة)
 * - "monthly_fixed_lessons": محاسبة شهرية حسب باقة محددة من الحصص (مثال 8 حصص شهرياً)
 */
export type BillingType =
  | "monthly"
  | "per_lesson"
  | "monthly_elapsed_lessons"
  | "monthly_fixed_lessons";

export type RateType = "per_lesson" | "per_hour" | "per_month";

export type StudentStatus = "active" | "stopped";

export type AttendanceStatus = "present" | "absent" | "late";

export type HomeworkStatus = "done" | "not_done" | "late" | "no_homework";

export type PaymentStatus = "paid" | "unpaid";

export type NavTab = "home" | "groups" | "students" | "monthly_report" | "schedule" | "finance";

export type LessonStatus = "upcoming" | "starting_soon" | "completed";

export interface StudentSubjectPlan {
  id: string;
  subject: string;
  studyType: StudyType; // "group" | "private"
  billingType?: BillingType; // طريقة الدفع والمحاسبة للمادة
  rateType?: RateType; // وحدة المحاسبة: "per_lesson" (سعر الحصة) أو "per_hour" (سعر الساعة)
  hourlyCost?: number; // سعر الساعة (في حال اختيار سعر الساعة)
  defaultDurationMinutes?: number; // مدة الحصة المعتادة بالدقائق (مثال: 60 دقيقة)
  academicYear?: string; // الصف الدراسي e.g. "الصف الأول الثانوي"
  curriculum?: string; // المنهج e.g. "مصري", "سعودي", "إماراتي", "دولي"
  lessonCost: number; // سعر الحصة للمادة
  monthlyCost?: number; // قيمة الاشتراك الشهري الكامل
  lessonsPerMonth?: number; // عدد الحصص المحددة شهرياً (في حالة باقة الحصص الشهرية مثل 8 حصص)
  customBilledMonths?: number; // عدد الشهور المحتسبة للاشتراك الشهري
  totalPaidAmount?: number; // إجمالي المسدد لهذه المادة
  totalAttendedLessons?: number; // إجمالي الحصص المنفذة لهذه المادة
  notes?: string;
}

export interface StudentReportPreferences {
  includeStudentName?: boolean; // تفعيل اسم الطالب (افتراضي: true)
  includeTeacherName?: boolean; // تفعيل اسم المعلم (افتراضي: true)
  includeLessonNumber?: boolean; // تفعيل رقم الحصة (افتراضي: true)
  includeDuration?: boolean; // تفعيل مدة الحصة (افتراضي: false أو محدد)
  includeLessonDate?: boolean; // تفعيل تاريخ الحصة (افتراضي: true)
  teacherName?: string; // اسم المعلم المخصص لهذا الطالب
  reportLanguage?: "ar" | "en"; // لغة التقرير: العربية أو الإنجليزية
}

export interface Student {
  id: string;
  fullName: string;
  studentNumber?: string;
  studentPhone?: string;
  phone?: string; // alias for studentPhone
  remainingLessons?: number; // remaining lessons balance
  subscriptionType?: any; // subscription type
  academicYear?: string; // الصف الدراسي e.g. "الصف الأول الثانوي", "الصف الثالث الإعدادي"
  curriculum?: string; // المنهج الدراسي
  parentContact: string; // WhatsApp number e.g. "+201000000000"
  whatsappGroupLink?: string; // WhatsApp group link
  studyType: StudyType;
  groupId?: string;
  groupName?: string;
  subject: string;
  subjects?: StudentSubjectPlan[]; // Multi-subject enrollment
  status: StudentStatus;
  
  // Unified Financial & Billing System
  billingType?: BillingType; // طريقة الدفع والمحاسبة للطالب
  rateType?: RateType; // وحدة المحاسبة: "per_lesson" (سعر الحصة) أو "per_hour" (سعر الساعة)
  hourlyCost?: number; // سعر الساعة
  defaultDurationMinutes?: number; // مدة الحصة المعتادة بالدقائق
  monthlyCost?: number; // قيمة الاشتراك الشهري الكامل (مثلاً 400 ج.م شهرياً)
  lessonsPerMonth?: number; // عدد الحصص المحددة شهرياً (مثلاً 8 حصص شهرياً)
  monthlyBillingDay?: number; // يوم تجديد الاشتراك الشهري (الافتراضي 1)
  customBilledMonths?: number; // عدد الأشهر المحتسبة (إذا تم تخصيصها يدوياً)
  subscriptionStartDate?: string; // تاريخ بدء الاشتراك الشهري
  currentCycleStartDate?: string; // تاريخ بدء الباقة أو الشهر الحالي (YYYY-MM-DD)
  currentCycleName?: string; // مسمى الباقة أو الشهر الحالي (مثال: "أكتوبر 2026" أو "باقة 8 حصص")
  
  paymentStatus: PaymentStatus;
  lessonCost: number; // سعر الحصة
  totalPaidAmount: number; // إجمالي المدفوعات المسددة
  totalAttendedLessons?: number; // إجمالي الحصص المنفذة
  remainingBalance?: number; // رصيد الحساب المتبقي
  
  notes?: string;
  combinedGroupId?: string; // ID of the combined student file this student belongs to
  scheduleSlots?: ScheduleSlot[];
  reportPreferences?: StudentReportPreferences;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleSlot {
  day: string; // e.g. "السبت", "الأحد"
  time: string; // e.g. "17:00", "19:00", "05:00 PM"
  durationMinutes?: number; // e.g. 60, 90
}

export interface Group {
  id: string;
  name: string; // e.g., "مجموعة الفيزياء أ"
  subject: string;
  days: string[]; // e.g., ["السبت", "الأحد"]
  time: string; // default/fallback time e.g., "16:00"
  durationMinutes: number; // e.g., 90
  defaultDurationMinutes?: number;
  scheduleSlots?: ScheduleSlot[]; // mixed/custom per-day times e.g. [{day: "السبت", time: "17:00"}, {day: "الأحد", time: "19:00"}]
  studentIds: string[];
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  parentWhatsapp?: string; // Parent or group WhatsApp link/number
  createdAt: string;
  updatedAt?: string;
}

export interface PrivateLesson {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  days: string[]; // e.g., ["السبت", "الأحد"]
  time: string; // default/fallback time e.g., "16:00"
  durationMinutes: number;
  defaultDurationMinutes?: number;
  scheduleSlots?: ScheduleSlot[]; // mixed/custom per-day times e.g. [{day: "السبت", time: "17:00"}, {day: "الأحد", time: "19:00"}]
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  parentWhatsapp?: string;
  parentContact?: string;
  studentPhone?: string;
  phone?: string;
  academicYear?: string;
  fee?: number;
  lessonCost?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  lessonId: string;
  studentId: string;
  studentName?: string;
  subject?: string;
  lessonNumber?: number;
  attendance: AttendanceStatus;
  homeworkStatus: HomeworkStatus;
  durationMinutes?: number; // مدة الحصة بالدقائق
  lessonDuration?: string; // نص مدة الحصة مثل "60 دقيقة"
  includeDuration?: boolean; // تفعيل أو إلغاء مدة الحصة
  teacherNotes?: string;
  classEvents?: string; // ما حدث داخل الحصة
  homeworkNotes?: string; // الواجب
  aiInstructions?: string;
  generatedReportText?: string;
  deducted: boolean; // whether 1 lesson was deducted upon "present" or billable absent
  date: string;
  billedCost?: number; // تكلفة الحصة المحسوبة وقت تسجيلها أو تعديلها
  hourlyRate?: number; // سعر الساعة للحصة
  archived?: boolean; // أرشفة سجل الحضور عند أرشفة الشهر/الباقة
  archivedAt?: string;
  archiveGroup?: string;
  manuallyUnarchived?: boolean;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  studyType: StudyType;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  subject: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  status: LessonStatus;
  whatsappGroupLink?: string; // WhatsApp group link
  teacherNotes?: string; // ماذا حدث في الحصة؟
  classEvents?: string; // ما حدث داخل الحصة
  homeworkNotes?: string; // الواجب والتكليفات
  aiInstructions?: string; // تعليمات للذكاء الاصطناعي
  generatedReport?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExamRecord {
  id: string;
  studentId: string;
  studentName?: string;
  examName: string;
  score: number;
  totalScore: number;
  date: string;
  updatedAt?: string;
}

export interface SubjectPaymentAllocation {
  subjectId?: string;
  subjectName: string;
  amount: number;
  lessonsCovered?: number;
}

export interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  notes?: string;
  lessonsCovered?: number;
  lessonsCount?: number; // alias for lessonsCovered
  lessonCost?: number;
  subject?: string;
  subjectAllocations?: SubjectPaymentAllocation[];
  updatedAt?: string;
}

export interface ReportAttachment {
  fileName?: string;
  mimeType: string;
  data: string; // Base64 string without data:mime;base64, prefix
  previewUrl?: string;
  fileSize?: number; // الحجم بالبايت
  fileExtension?: string; // e.g. "pdf", "pptx", "xlsx", "docx", "png"
}

export interface GeneratedReport {
  id: string;
  reportType?: "lesson" | "monthly_comprehensive" | "daily_personal"; // نوع التقرير: حصة عادية أو تقرير أداء شهري شامل أو تقرير يومي شخصي
  evaluationMonth?: string; // شهر وسنة التقييم للتقرير الشهري e.g. "شهر 7 (يوليو 2026)"
  lessonId?: string;
  studentId: string;
  studentName: string;
  teacherName?: string;
  date: string;
  subject: string;
  lessonNumber?: number;
  attendance?: AttendanceStatus;
  deductCost?: boolean;
  durationMinutes?: number; // مدة الحصة بالدقائق
  lessonDuration?: string; // مدة الحصة كنص e.g. "60 دقيقة (ساعة)"
  includeStudentName?: boolean;
  includeTeacherName?: boolean;
  includeLessonNumber?: boolean;
  includeDuration?: boolean; // هل تم تفعيل عرض مدة الحصة بالتقرير
  includeLessonDate?: boolean;
  reportLanguage?: "ar" | "en";
  homeworkStatus?: HomeworkStatus;
  teacherNotes: string;
  classEvents?: string; // الحقل الأول: ما حدث داخل الحصة
  homeworkNotes?: string; // الحقل الثاني: الواجب والتكليفات
  overallEvaluation?: string; // التقييم الإجمالي ومستوى الأداء
  aiInstructions: string;
  reportText?: string;
  generatedText?: string;
  archived?: boolean;
  archivedAt?: string;
  archiveGroup?: string; // مسمى الشهر أو الباقة التي أرشف التقرير تحتها (مثال: "أرشيف سبتمبر 2026" أو "باقة سبتمبر 2026")
  manuallyUnarchived?: boolean;
  archiveReason?: "manual" | "auto_6_months" | null;
  createdAt: string;
  updatedAt?: string;
}

export function isMonthlyComprehensiveReport(report?: Partial<GeneratedReport> | null): boolean {
  if (!report) return false;
  return (
    report.reportType === "monthly_comprehensive" ||
    (typeof report.id === "string" && report.id.startsWith("monthly_comprehensive"))
  );
}

export function isDailyPersonalReport(report?: Partial<GeneratedReport> | null): boolean {
  if (!report) return false;
  return !isMonthlyComprehensiveReport(report);
}

/**
/**
 * Normalizes Arabic or English subject names to canonical categories for accurate comparison:
 * - "quran": القرآن الكريم، قرآن، تجويد، تلاوة، حفظ
 * - "arabic": اللغة العربية، عربي، نور البيان، قراءة، كتابة، نحو
 * - "islamic": الدراسات الإسلامية، تربية إسلامية، فقه، سيرة، حديث، عقيدة
 * - "all_subjects": Quran, Arabic and Islamic Studies، عام، مجمع (متوافق مع أي مادة)
 */
export function normalizeArabicSubject(sub?: string | null): string {
  if (!sub) return "";
  const raw = sub
    .toString()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^(ال|al-?|el-?)/i, "")
    .replace(/[\s\-_]+/g, " ")
    .trim()
    .toLowerCase();

  // Check for combined umbrella group name first
  if (
    raw.includes("quran, arabic and islamic") ||
    raw.includes("قران وعربي") ||
    raw.includes("قران ولغه") ||
    raw.includes("شامل") ||
    raw === "عام" ||
    raw === "all" ||
    raw === "المجموعه"
  ) {
    return "all_subjects";
  }

  // Quran family
  if (
    raw.includes("quran") ||
    raw.includes("coran") ||
    raw.includes("قران") ||
    raw.includes("تجويد") ||
    raw.includes("تلاوه") ||
    raw.includes("حفظ")
  ) {
    return "quran";
  }

  // Arabic family
  if (
    raw.includes("arabic") ||
    raw.includes("عرب") ||
    raw.includes("نور البيان") ||
    raw.includes("نحو") ||
    raw.includes("صرف") ||
    raw.includes("املاء") ||
    raw.includes("قراءه") ||
    raw.includes("كتابه")
  ) {
    return "arabic";
  }

  // Islamic studies family
  if (
    raw.includes("islamic") ||
    raw.includes("اسلامي") ||
    raw.includes("فقه") ||
    raw.includes("سيره") ||
    raw.includes("حديث") ||
    raw.includes("عقيده") ||
    raw.includes("اذكار") ||
    raw.includes("اداب")
  ) {
    return "islamic";
  }

  return raw;
}

/**
 * Checks whether two subjects are compatible / same course track.
 * If either is "all_subjects" (the umbrella group name) or empty, they are considered compatible.
 */
export function areSubjectsCompatible(subA?: string | null, subB?: string | null): boolean {
  if (!subA || !subB) return true;
  const a = normalizeArabicSubject(subA);
  const b = normalizeArabicSubject(subB);
  if (!a || !b) return true;
  if (a === "all_subjects" || b === "all_subjects") return true;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Normalizes report date string to standard YYYY-MM-DD format using local date coordinates
 * (avoids UTC timezone shift issues where 11pm shifts to the previous day).
 */
export function normalizeReportDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const clean = dateStr
    .toString()
    .trim()
    .replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/\//g, "-");

  // Format 1: Starts with YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, "0");
    const d = ymdMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Format 2: DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Format 3: Parseable date string (use local year/month/date)
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return clean;
}

/**
 * Normalizes report text for comparison (collapses spacing, removes punctuation differences, tashkeel, trailing ...)
 */
export function normalizeReportText(text?: string | null): string {
  if (!text) return "";
  return text
    .toString()
    .replace(/\.{3,}$/, "")
    .replace(/…$/, "")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\r\n/g, "\n")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalizes student name for comparison
 */
export function normalizeStudentName(name?: string | null): string {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, " ");
}

/**
 * Determines whether two reports are duplicate instances of the same report.
 */
export function areReportsDuplicate(
  a?: Partial<GeneratedReport> | null,
  b?: Partial<GeneratedReport> | null
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  // 1. Must be the same report type (cannot confuse monthly comprehensive with daily personal)
  const aIsMonthly = isMonthlyComprehensiveReport(a);
  const bIsMonthly = isMonthlyComprehensiveReport(b);
  if (aIsMonthly !== bIsMonthly) return false;

  // 2. Must be the same student
  const aId = String(a.studentId || "").trim();
  const bId = String(b.studentId || "").trim();
  const aName = normalizeStudentName(a.studentName);
  const bName = normalizeStudentName(b.studentName);

  const sameStudent = (aId && bId && aId === bId) || (aName && bName && aName === bName);
  if (!sameStudent) return false;

  // 3. For monthly comprehensive reports: compare evaluation month or date
  if (aIsMonthly && bIsMonthly) {
    if (a.evaluationMonth && b.evaluationMonth && a.evaluationMonth.trim() === b.evaluationMonth.trim()) {
      return true;
    }
    const aDateNorm = normalizeReportDate(a.date || a.createdAt);
    const bDateNorm = normalizeReportDate(b.date || b.createdAt);
    if (aDateNorm && bDateNorm && aDateNorm.slice(0, 7) === bDateNorm.slice(0, 7)) {
      return true;
    }
    const aText = normalizeReportText(a.reportText || a.generatedText);
    const bText = normalizeReportText(b.reportText || b.generatedText);
    if (aText && bText && (aText === bText || aText.includes(bText) || bText.includes(aText))) {
      return true;
    }
    return false;
  }

  // 4. For daily personal reports: compare normalized date
  const aDateNorm = normalizeReportDate(a.date || a.createdAt);
  const bDateNorm = normalizeReportDate(b.date || b.createdAt);

  // If dates are valid and genuinely different calendar days -> NEVER duplicate!
  if (aDateNorm && bDateNorm && aDateNorm !== bDateNorm) {
    return false;
  }

  // Compare lesson numbers
  const aLesson = a.lessonNumber !== undefined && a.lessonNumber !== null ? String(a.lessonNumber).trim() : "";
  const bLesson = b.lessonNumber !== undefined && b.lessonNumber !== null ? String(b.lessonNumber).trim() : "";
  const sameLessonNumber = Boolean(aLesson && bLesson && aLesson === bLesson);
  const differentLessonNumbers = Boolean(aLesson && bLesson && aLesson !== bLesson);

  // If explicitly different lesson numbers -> NEVER duplicate!
  if (differentLessonNumbers) {
    return false;
  }

  const sameSubject = areSubjectsCompatible(a.subject, b.subject);
  if (!sameSubject && a.subject && b.subject) {
    return false;
  }

  // Compare content text (strictly identical)
  const aText = normalizeReportText(a.reportText || a.generatedText || a.teacherNotes);
  const bText = normalizeReportText(b.reportText || b.generatedText || b.teacherNotes);
  const identicalText = Boolean(aText && bText && aText === bText);

  // If same lesson number and compatible subject on the same date -> definite duplicate
  if (sameLessonNumber && sameSubject && aDateNorm && bDateNorm && aDateNorm === bDateNorm) {
    return true;
  }

  // If identical full text on the same date -> duplicate
  if (identicalText && aDateNorm && bDateNorm && aDateNorm === bDateNorm) {
    return true;
  }

  // If one is synthetic attendance record and one is direct report on the same date and compatible subject:
  const isASyntheticAtt = Boolean(a.id && (a.id.startsWith("att_") || a.id.startsWith("att_rep_")));
  const isBSyntheticAtt = Boolean(b.id && (b.id.startsWith("att_") || b.id.startsWith("att_rep_")));
  if ((isASyntheticAtt || isBSyntheticAtt) && aDateNorm && bDateNorm && aDateNorm === bDateNorm && sameSubject) {
    return true;
  }

  return false;
}

/**
 * Deduplicates an array of reports, preserving the most complete record and priority IDs (e.g. rep_ / monthly_ over att_).
 */
export function deduplicateReportsList(reports: GeneratedReport[]): GeneratedReport[] {
  if (!Array.isArray(reports) || reports.length <= 1) return reports || [];

  const result: GeneratedReport[] = [];

  for (const rep of reports) {
    if (!rep) continue;
    const existingIndex = result.findIndex(r => areReportsDuplicate(r, rep));
    if (existingIndex === -1) {
      result.push(rep);
    } else {
      const existing = result[existingIndex];
      // Prefer non-att id, longer text, defined lessonNumber, specific subject, etc.
      const preferIncomingId = !existing.id.startsWith("rep_") && rep.id.startsWith("rep_");
      const chosenId = preferIncomingId ? rep.id : existing.id;
      const chosenCreatedAt = rep.createdAt || existing.createdAt || "";

      const textA = existing.reportText || existing.generatedText || existing.teacherNotes || "";
      const textB = rep.reportText || rep.generatedText || rep.teacherNotes || "";
      const bestText = textB.length >= textA.length ? textB : textA;

      const genTextA = existing.generatedText || existing.reportText || "";
      const genTextB = rep.generatedText || rep.reportText || "";
      const bestGenText = genTextB.length >= genTextA.length ? genTextB : genTextA;

      const notesA = existing.teacherNotes || "";
      const notesB = rep.teacherNotes || "";
      const bestNotes = notesB.length >= notesA.length ? notesB : notesA;

      const eventsA = existing.classEvents || "";
      const eventsB = rep.classEvents || "";
      const bestEvents = eventsB.length >= eventsA.length ? eventsB : eventsA;

      const chosenLessonNum = rep.lessonNumber ?? existing.lessonNumber;
      const chosenDuration = rep.durationMinutes ?? existing.durationMinutes;

      // Prefer specific subject over umbrella group subject
      const isExistingGeneric = normalizeArabicSubject(existing.subject) === "all_subjects";
      const isIncomingGeneric = normalizeArabicSubject(rep.subject) === "all_subjects";
      const chosenSubject = (isExistingGeneric && !isIncomingGeneric)
        ? (rep.subject || existing.subject)
        : (existing.subject || rep.subject);

      // If either report is explicitly active (archived === false), do NOT force it to archived!
      const isArchived = (rep.archived === false || existing.archived === false)
        ? false
        : Boolean(rep.archived || existing.archived);

      result[existingIndex] = {
        ...existing,
        ...rep,
        id: chosenId,
        subject: chosenSubject,
        createdAt: chosenCreatedAt,
        date: rep.date || existing.date,
        reportText: bestText || rep.reportText || existing.reportText || "",
        generatedText: bestGenText || rep.generatedText || existing.generatedText || "",
        teacherNotes: bestNotes || rep.teacherNotes || existing.teacherNotes || "",
        classEvents: bestEvents || rep.classEvents || existing.classEvents || "",
        lessonNumber: chosenLessonNum,
        durationMinutes: chosenDuration,
        archived: isArchived,
        archivedAt: rep.archivedAt || existing.archivedAt,
        archiveGroup: rep.archiveGroup || existing.archiveGroup,
        manuallyUnarchived: rep.manuallyUnarchived || existing.manuallyUnarchived
      };
    }
  }

  return result;
}

/**
 * Safely merges primary direct reports with secondary attendance fallback reports,
 * ensuring absolutely NO duplicate entries are introduced.
 */
export function mergeDirectAndAttendanceReports(
  directReports: GeneratedReport[],
  attendanceReports: GeneratedReport[]
): GeneratedReport[] {
  const cleanDirect = deduplicateReportsList(directReports);
  const result = [...cleanDirect];

  if (Array.isArray(attendanceReports)) {
    for (const attRep of attendanceReports) {
      if (!attRep) continue;
      // If a matching report already exists in directReports or already added, DO NOT add the synthetic attendance report
      const alreadyExists = result.some(r => areReportsDuplicate(r, attRep));
      if (!alreadyExists) {
        result.push(attRep);
      }
    }
  }

  return deduplicateReportsList(result);
}

export interface SubjectAiInstruction {
  subject: string;
  instruction: string;
}

export function getSubjectSpecificAiInstruction(
  subjectDefaults: SubjectAiInstruction[] | undefined,
  subject: string
): string {
  if (!subjectDefaults || subjectDefaults.length === 0) {
    return "";
  }
  const clean = (subject || "").trim().toLowerCase();
  if (!clean) return "";

  // 1. Exact match (case-insensitive, trimmed)
  const exact = subjectDefaults.find(
    s => (s.subject || "").trim().toLowerCase() === clean
  );
  if (exact && exact.instruction && exact.instruction.trim()) {
    return exact.instruction.trim();
  }

  // 2. Normalize Arabic letters and prefixes for fuzzy robust matching
  const normalizeArabic = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/^(ال|al-?|el-?)/i, "")
      .replace(/[\s\-_]+/g, " ")
      .trim()
      .toLowerCase();
  };

  const normClean = normalizeArabic(clean);

  // Match normalized exact
  const matchedNorm = subjectDefaults.find(s => {
    const sNorm = normalizeArabic((s.subject || "").trim());
    return sNorm && normClean && sNorm === normClean;
  });
  if (matchedNorm && matchedNorm.instruction && matchedNorm.instruction.trim()) {
    return matchedNorm.instruction.trim();
  }

  // Match substring/inclusion
  const matchedSub = subjectDefaults.find(s => {
    const sNorm = normalizeArabic((s.subject || "").trim());
    return (
      sNorm &&
      normClean &&
      (sNorm.includes(normClean) || normClean.includes(sNorm))
    );
  });
  if (matchedSub && matchedSub.instruction && matchedSub.instruction.trim()) {
    return matchedSub.instruction.trim();
  }

  return "";
}

export function findSubjectAiInstruction(
  subjectDefaults: SubjectAiInstruction[] | undefined,
  subject: string,
  generalFallback: string = ""
): string {
  const subjInst = getSubjectSpecificAiInstruction(subjectDefaults, subject);
  if (subjInst) {
    return subjInst;
  }
  return generalFallback || "";
}

export interface MonthlyReportTemplate {
  id: string;
  name: string;
  subject: string; // "all" or specific subject name
  lang: "ar" | "en";
  instructions: string;
  isDefault?: boolean;
  updatedAt?: string;
}

export interface MonthlyTemplateSection {
  title: string;
  content: string;
  bullets?: string[];
}

export interface MonthlyReportSettings {
  dailyAnalysisInstructions: string;
  monthlyTemplateInstructions: string;
  templates?: MonthlyReportTemplate[];
  activeTemplateId?: string;
  updatedAt?: string;
}

export const DEFAULT_DAILY_ANALYSIS_INSTRUCTIONS = `1. نطاق الجمع والفحص الكامل:
- جمع وتحليل جميع التقارير اليومية وسجلات الحصص المسجلة للطالب خلال الشهر/الدورة المحددة كاملة دون الاكتفاء بتقرير واحد أو الحصة الأخيرة فقط.
- استخراج الدروس والموضوعات، ومستوى التفاعل، والتقييمات، والواجبات، وملاحظات المعلم الدقيقة عبر جميع الحصص.

2. الفرز الموضوعي للمواد والأنشطة الفعلية:
- تحديد المواد والأنشطة التي دُرست فعلياً في الحصص، حتى لو كان اسم المجموعة أو المادة الموحد هو "Quran, Arabic and Islamic Studies".
- إذا دُرست مواد متعددة في الحصة نفسها (مثل: قرآن + إسلاميات + نور بيان/لغة عربية)، تُفرز وتُصنف بدقة تامة دون خلط.
- إذا لم يُذكر في التقارير أي نشاط لمادة معينة (كالدراسات الإسلامية مثلاً)، تُستبعد تماماً ولا يُفترض أو يُخترع أي محتوى لها.

3. التمييز التعليمي الصارم:
- التمييز الواضح بين:
  * ما دَرسه الطالب (شرح مبدئي أو قراءة).
  * ما أتقنه الطالب فعلياً بتفوق.
  * ما يحتاج إلى مراجعة وتثبيت إضافي.
  * ما كُلّف به من واجبات منزلية، وما أتمه وأنجزه منها بالفعل.
- قراءة السورة في الحصة لا تُعتبر دليلاً على حفظها.
- تدريس أو شرح قاعدة تجويد أو قاعدة لغوية لا يُعتبر دليلاً على إتقانها ما لم ينص التقرير على ذلك.

4. قياس التقدم الحقيقي ومقارنة التقييمات:
- مقارنة الملاحظات والتقييمات والدرجات عبر جلسات الشهر لتحديد التطور الحقيقي للطالب فقط عند توفر بيانات كافية تسمح بالمقارنة.
- عدم ادعاء حدوث قفزة أو تحسن إذا لم تتوفر معطيات كافية للمقارنة عبر جلسات متتالية.

5. إزالة التكرار مع الحفاظ على المراجعات الحقيقية:
- إزالة التكرار اللفظي والعبارات العامة الناتجة عن دمج التقارير.
- دمج الآيات المتتالية لنفس السورة في نطاق موحد متصل (مثال: سورة الملك الآيات 1–20).
- الحفاظ التام على جلسات المراجعة الحقيقية التي تمت في أيام وتواريخ مختلفة، وعدم حذفها لأن تكرار المراجعة إنجاز مقصود يثبت الإتقان.`;

export const DEFAULT_MONTHLY_TEMPLATE_INSTRUCTIONS = `عنوان التقرير الرسمي:
MONTHLY ACADEMIC PROGRESS REPORT

ترتيب الأقسام والعناوين الإلزامية في التقرير (يلتزم النظام حرفياً بهذه العناوين وترتيبها):
1. Executive Summary & Monthly Overview
   - ملخص أكاديمي شامل لمسار الطالب خلال الشهر بناءً على الحصص الفعلية فقط.
2. Verified Academic Achievements (By Studied Subject)
   - عرض ما أُنجز فعلياً (حفظ، مراجعة، تلاوة، تجويد، لغة عربية/نور بيان، دراسات إسلامية) مع حذف أي مادة لم تُدرس.
3. Key Strengths & Demonstrated Competencies
   - نقاط القوة والمهارات التي أظهرها الطالب فعلياً في الحصص.
4. Areas for Growth & Constructive Guidance for Parents
   - الجوانب التي تحتاج تثبيتاً وإرشادات عملية واضحة لولي الأمر في المنزل.
5. Next Month's Learning Trajectory
   - خطة الشهر القادم الواقعية والمبنية على وتيرة الطالب الفعلية.

ضوابط الشكل والأسلوب:
- صياغة التقرير بلغة إنجليزية أكاديمية وتربوية راقية (100% Fluent Pedagogical English) موجهة لولي الأمر.
- الالتزام الحرفي بأسماء العناوين أعلاه وترتيبها دون تغيير في الشكل العام من طالب لآخر.
- ممنوع ذكر أي روابط اجتماعات أو أرقام هواتف أو إحصائيات غير مدعومة.`;

export const DEFAULT_MONTHLY_REPORT_TEMPLATES: MonthlyReportTemplate[] = [
  {
    id: "tpl_comprehensive_en",
    name: "القالب الشامل الموحد (English - Quran, Arabic & Islamic)",
    subject: "Quran, Arabic and Islamic Studies",
    lang: "en",
    isDefault: true,
    instructions: DEFAULT_MONTHLY_TEMPLATE_INSTRUCTIONS
  },
  {
    id: "tpl_quran_ar",
    name: "قالب مسيرة القرآن الكريم والتجويد (العربية)",
    subject: "قرآن كريم",
    lang: "ar",
    instructions: `عنوان التقرير الرسمي:
التقرير الشهري لمسيرة القرآن الكريم والتجويد

ترتيب الأقسام والعناوين الإلزامية في التقرير (يلتزم النظام حرفياً بهذه العناوين وترتيبها):
1. الملخص العام لمسيرة الشهر
   - وصف تربوي دقيق لمستوى الطالب وانتظامه خلال حصص الشهر.
2. ما تم إنجازه في القرآن الكريم والتجويد
   - تفصيل السور والآيات المحفوظة، والسور التي تمت مراجعتها وتثبيتها، وأحكام التجويد أو التلاوة المطبقة فعلياً (مع إخفاء أي فرع لم يُدرس).
3. نقاط القوة والتميز القرآني
   - أبرز جوانب الإتقان في الحفظ والأداء الصوتي ومخارج الحروف والالتزام.
4. التوصيات التربوية وإرشادات المتابعة المنزلية
   - توجيهات عملية لولي الأمر لتثبيت المحفوظ ومراجعة الورد اليومي في المنزل.
5. الخطة المقترحة للشهر القادم
   - الأهداف القرآنية الواقعية للشهر القادم بناءً على سرعة استيعاب الطالب.

ضوابط الشكل والأسلوب:
- لغة عربية فصحى رصينة ومشجعة موجهة لولي الأمر.
- ثبات تام في هيكل وعناوين الأقسام الخمسة أعلاه في كل مرة يُستخدم فيها هذا القالب.`
  },
  {
    id: "tpl_arabic_noor_ar",
    name: "قالب اللغة العربية ونور البيان والتأسيس (العربية)",
    subject: "لغة عربية",
    lang: "ar",
    instructions: `عنوان التقرير الرسمي:
التقرير الشهري لتقدم الطالب في اللغة العربية ونور البيان

ترتيب الأقسام والعناوين الإلزامية في التقرير (يلتزم النظام حرفياً بهذه العناوين وترتيبها):
1. نظرة عامة على الأداء اللغوي والقرائي
   - ملخص لمستوى تفاعل الطالب وتطوره في مهارات اللغة العربية أو التأسيس خلال الشهر.
2. المهارات والدروس المنجزة خلال الشهر
   - عرض دقيق لما دُرس فعلياً في القراءة والتهجي (نور البيان)، الإملاء والكتابة، أو القواعد والمفردات (دون إضافة فروع لم تُدرس).
3. نقاط التميز والمهارات المتقنة
   - المهارات اللغوية والقرائية التي أتقنها الطالب بثقة.
4. جوانب تحتاج إلى تدريب وتوصيات الأسرة
   - المهارات التي تحتاج لممارسة إضافية في المنزل وكيفية متابعتها.
5. خطة الشهر القادم اللغوية
   - الخطوات والدروس المستهدفة للشهر القادم.

ضوابط الشكل والأسلوب:
- لغة عربية فصحى واضحة ومرتبة مع الحفاظ الحرفي على العناوين الخمسة وترتيبها.`
  },
  {
    id: "tpl_islamic_ar",
    name: "قالب الدراسات الإسلامية والآداب (العربية)",
    subject: "الدراسات الإسلامية",
    lang: "ar",
    instructions: `عنوان التقرير الرسمي:
التقرير الشهري للدراسات الإسلامية والتربية الإيمانية

ترتيب الأقسام والعناوين الإلزامية في التقرير (يلتزم النظام حرفياً بهذه العناوين وترتيبها):
1. ملخص التفاعل والاستيعاب خلال الشهر
   - تقييم مجمل لحضور الطالب وتفاعله مع الموضوعات الإسلامية المدروسة.
2. الموضوعات والدروس الشرعية المنجزة
   - عرض الدروس التي أُخذت فعلياً في العقيدة، الفقه والعبادات، السيرة النبوية، الحديث، أو الآداب والأذكار.
3. نقاط القوة والأثر التربوي
   - مدى استيعاب الطالب للمعاني والقيم الإسلامية المدروسة.
4. إرشادات التطبيق العملي مع الأسرة
   - توصيات لولي الأمر لتعزيز تطبيق الآداب والعبادات التي تعلمها الطالب.
5. خطة الشهر القادم
   - الموضوعات المقررة للشهر القادم بمشيئة الله.`
  }
];

export function getEffectiveMonthlyReportSettings(settings?: AppSettings): MonthlyReportSettings {
  const savedTemplates = settings?.monthlyReportSettings?.templates;
  const templates =
    Array.isArray(savedTemplates) && savedTemplates.length > 0
      ? savedTemplates
      : DEFAULT_MONTHLY_REPORT_TEMPLATES.map(t => ({ ...t }));

  const activeTemplateId =
    settings?.monthlyReportSettings?.activeTemplateId &&
    templates.some(t => t.id === settings.monthlyReportSettings?.activeTemplateId)
      ? settings.monthlyReportSettings.activeTemplateId
      : templates[0].id;

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  return {
    dailyAnalysisInstructions:
      settings?.monthlyReportSettings?.dailyAnalysisInstructions?.trim() ||
      DEFAULT_DAILY_ANALYSIS_INSTRUCTIONS,
    monthlyTemplateInstructions:
      settings?.monthlyReportSettings?.monthlyTemplateInstructions?.trim() ||
      activeTemplate?.instructions?.trim() ||
      DEFAULT_MONTHLY_TEMPLATE_INSTRUCTIONS,
    templates,
    activeTemplateId,
    updatedAt: settings?.monthlyReportSettings?.updatedAt
  };
}

export interface AppSettings {
  teacherName: string;
  preferredLanguage: "ar" | "en";
  generalAiInstructions: string;
  defaultSubject?: string;
  subjectDefaults: SubjectAiInstruction[];
  notificationMinutesBefore: number; // 5, 10, 15
  notificationsEnabled: boolean;
  monthlyReportSettings?: MonthlyReportSettings;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  type: "unpaid" | "low_balance" | "reminder" | "system";
  title: string;
  message: string;
  studentId?: string;
  studentName?: string;
  amountDue?: number;
  remainingLessons?: number;
  date?: string;
}

export interface SubCombinedGroup {
  id: string;
  name: string; // e.g., "الأخوين الأكبر" أو "مجموعة الرياضيات والفيزياء"
  studentIds: string[]; // IDs of students in this sub-merged group (subset of parent group's studentIds)
  notes?: string;
  sharedParentContact?: string;
  sharedGroupLink?: string;
  createdAt: string;
}

export interface CombinedStudentGroup {
  id: string;
  name: string; // e.g., "أبناء عائلة الشريف" or "أحمد وسارة"
  studentIds: string[]; // List of student IDs bundled in this group
  subGroups?: SubCombinedGroup[]; // دمج داخل الدمج: مجموعات فرعية مدمجة داخل هذا الملف المجمع
  notes?: string;
  sharedParentContact?: string; // Optional custom shared parent WhatsApp / phone
  sharedGroupLink?: string; // Optional shared WhatsApp/Telegram group link
  createdAt: string;
  updatedAt?: string;
}

export interface GoStarsBackupData {
  version: string;
  exportedAt: string;
  students: Student[];
  combinedStudentGroups?: CombinedStudentGroup[];
  groups: Group[];
  privateLessons: PrivateLesson[];
  lessons: Lesson[];
  attendanceRecords: AttendanceRecord[];
  examRecords: ExamRecord[];
  paymentTransactions: PaymentTransaction[];
  reports: GeneratedReport[];
  settings: AppSettings;
  deletedStudentIds?: string[];
}
