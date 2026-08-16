/**
 * GoStars - Teacher Management System
 * Core Domain Type Definitions
 */

export type StudyType = "group" | "private";

export type StudentStatus = "active" | "stopped";

export type AttendanceStatus = "present" | "absent" | "late";

export type HomeworkStatus = "done" | "not_done" | "late";

export type PaymentStatus = "paid" | "unpaid";

export type LessonStatus = "upcoming" | "starting_soon" | "completed";

export type SubscriptionType = "monthly" | "lessons_count";

export type PaymentPlan = "beginning_of_month" | "end_of_month" | "mixed";

export interface StudentSubjectPlan {
  id: string;
  subject: string;
  studyType: StudyType; // "group" | "private"
  academicYear?: string; // الصف الدراسي e.g. "الصف الأول الثانوي"
  curriculum?: string; // المنهج e.g. "مصري", "سعودي", "إماراتي", "دولي"
  subscriptionType: SubscriptionType; // "monthly" (بالشهر) | "lessons_count" (بعدد الحصص)
  paymentPlan: PaymentPlan; // "beginning_of_month" (أول الشهر) | "end_of_month" (آخر الشهر) | "mixed" (مختلط)
  lessonCost: number; // سعر الحصة للمادة
  totalPurchasedLessons?: number; // إجمالي الحصص المشتراة في الباقة
  remainingLessons?: number; // الحصص المتبقية
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
  curriculum?: string; // المنهج الدراسي e.g. "منهج مصري", "منهج سعودي", "منهج إماراتي", "منهج كويتي", "لغات / تجريبي", "International"
  parentContact: string; // WhatsApp number e.g. "+201000000000"
  whatsappGroupLink?: string; // WhatsApp group link e.g. "https://chat.whatsapp.com/..."
  studyType: StudyType;
  groupId?: string;
  groupName?: string;
  subject: string;
  subjects?: StudentSubjectPlan[]; // Multi-subject enrollment with individual subscription & payment systems
  status: StudentStatus;
  
  // Subscription & Payment System
  subscriptionType?: SubscriptionType; // "monthly" (بالشهر) | "lessons_count" (بعدد الحصص)
  paymentPlan?: PaymentPlan; // "beginning_of_month" (أول الشهر) | "end_of_month" (آخر الشهر) | "mixed" (مختلط)

  // Payment & Lesson Balance
  paymentStatus: PaymentStatus;
  totalPaidAmount: number; // e.g. 800
  totalPurchasedLessons: number; // e.g. 8
  totalAttendedLessons?: number; // Total lessons passed and attended by student
  lessonCost: number; // calculated = totalPaidAmount / totalPurchasedLessons
  remainingLessons: number; // e.g. 5
  remainingBalance: number; // calculated = remainingLessons * lessonCost
  
  notes?: string;
  scheduleSlots?: ScheduleSlot[]; // Direct custom schedules for this student
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
  lessonsCovered: number;
  lessonCost: number;
  date: string;
  notes?: string;
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
