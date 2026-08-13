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

export interface Student {
  id: string;
  fullName: string;
  studentNumber?: string;
  parentContact: string; // WhatsApp number e.g. "+201000000000"
  whatsappGroupLink?: string; // WhatsApp group link e.g. "https://chat.whatsapp.com/..."
  studyType: StudyType;
  groupId?: string;
  groupName?: string;
  subject: string;
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
  createdAt: string;
}

export interface Group {
  id: string;
  name: string; // e.g., "مجموعة الفيزياء أ"
  subject: string;
  days: string[]; // e.g., ["الأحد", "الأربعاء"] or ["Sun", "Wed"]
  time: string; // e.g., "16:00"
  durationMinutes: number; // e.g., 90
  studentIds: string[];
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  createdAt: string;
}

export interface PrivateLesson {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  days: string[];
  time: string;
  durationMinutes: number;
  status: "active" | "paused";
  whatsappGroupLink?: string; // WhatsApp group link
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  lessonId: string;
  studentId: string;
  studentName?: string;
  attendance: AttendanceStatus;
  homeworkStatus: HomeworkStatus;
  teacherNotes?: string;
  aiInstructions?: string;
  generatedReportText?: string;
  deducted: boolean; // whether 1 lesson was deducted upon "present"
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
  teacherNotes: string;
  aiInstructions: string;
  reportText?: string;
  generatedText?: string;
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
