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
  teacherNotes?: string;
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

export interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  notes?: string;
  lessonsCovered?: number;
  lessonCost?: number;
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
  homeworkStatus?: HomeworkStatus;
  teacherNotes: string;
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

export function findSubjectAiInstruction(
  subjectDefaults: SubjectAiInstruction[] | undefined,
  subject: string,
  generalFallback: string = ""
): string {
  if (!subjectDefaults || subjectDefaults.length === 0) {
    return generalFallback || "";
  }
  const clean = (subject || "").trim().toLowerCase();
  if (!clean) return generalFallback || "";

  // 1. Exact match (case-insensitive, trimmed)
  const exact = subjectDefaults.find(
    s => (s.subject || "").trim().toLowerCase() === clean
  );
  if (exact && exact.instruction && exact.instruction.trim()) {
    return exact.instruction.trim();
  }

  // 2. Match without Arabic definite article "ال" or common prefixes
  const stripAl = (str: string) => str.replace(/^(ال|al-?|el-?)/i, "").trim();
  const strippedClean = stripAl(clean);

  const matchedStripped = subjectDefaults.find(s => {
    const sClean = stripAl((s.subject || "").trim().toLowerCase());
    return (
      (sClean && strippedClean && sClean === strippedClean) ||
      (sClean && strippedClean && (sClean.includes(strippedClean) || strippedClean.includes(sClean)))
    );
  });

  if (matchedStripped && matchedStripped.instruction && matchedStripped.instruction.trim()) {
    return matchedStripped.instruction.trim();
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

export interface GoStarsBackupData {
  version: string;
  exportedAt: string;
  students: Student[];
  groups: Group[];
  privateLessons: PrivateLesson[];
  lessons: Lesson[];
  attendanceRecords: AttendanceRecord[];
  examRecords: ExamRecord[];
  paymentTransactions: PaymentTransaction[];
  reports: GeneratedReport[];
  settings: AppSettings;
}
