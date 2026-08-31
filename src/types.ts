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

export interface Student {
  id: string;
  fullName: string;
  studentNumber?: string;
  studentPhone?: string;
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
  
  paymentStatus: PaymentStatus;
  lessonCost: number; // سعر الحصة
  totalPaidAmount: number; // إجمالي المدفوعات المسددة
  totalAttendedLessons?: number; // إجمالي الحصص المنفذة
  
  notes?: string;
  combinedGroupId?: string; // ID of the combined student file this student belongs to
  scheduleSlots?: ScheduleSlot[];
  createdAt: string;
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
  scheduleSlots?: ScheduleSlot[]; // mixed/custom per-day times e.g. [{day: "السبت", time: "17:00"}, {day: "الأحد", time: "19:00"}]
  studentIds: string[];
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  parentWhatsapp?: string; // Parent or group WhatsApp link/number
  createdAt: string;
}

export interface PrivateLesson {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  days: string[]; // e.g., ["السبت", "الأحد"]
  time: string; // default/fallback time e.g., "16:00"
  durationMinutes: number;
  scheduleSlots?: ScheduleSlot[]; // mixed/custom per-day times e.g. [{day: "السبت", time: "17:00"}, {day: "الأحد", time: "19:00"}]
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  parentWhatsapp?: string;
  createdAt: string;
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
}

export interface ExamRecord {
  id: string;
  studentId: string;
  studentName?: string;
  examName: string;
  score: number;
  totalScore: number;
  date: string;
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
  lessonCost?: number;
  subject?: string;
  subjectAllocations?: SubjectPaymentAllocation[];
}

export interface ReportAttachment {
  fileName?: string;
  mimeType: string;
  data: string; // Base64 string without data:mime;base64, prefix
  previewUrl?: string;
}

export interface GeneratedReport {
  id: string;
  lessonId?: string;
  studentId: string;
  studentName: string;
  date: string;
  subject: string;
  lessonNumber?: number;
  attendance?: AttendanceStatus;
  deductCost?: boolean;
  durationMinutes?: number; // مدة الحصة بالدقائق
  lessonDuration?: string; // مدة الحصة كنص e.g. "60 دقيقة (ساعة)"
  includeDuration?: boolean; // هل تم تفعيل عرض مدة الحصة بالتقرير
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
  createdAt: string;
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

export interface AppSettings {
  teacherName: string;
  preferredLanguage: "ar" | "en";
  generalAiInstructions: string;
  defaultSubject?: string;
  subjectDefaults: SubjectAiInstruction[];
  notificationMinutesBefore: number; // 5, 10, 15
  notificationsEnabled: boolean;
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
}
