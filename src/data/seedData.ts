import {
  Student,
  Group,
  PrivateLesson,
  Lesson,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings
} from "../types";

export const initialSettings: AppSettings = {
  teacherName: "",
  defaultSubject: "",
  preferredLanguage: "ar",
  generalAiInstructions: "اكتب تقريراً احترافياً ومشجعاً لولي الأمر، ابدأ بنقطة إيجابية، ثم وضح ما يحتاج الطالب إلى تحسينه، وأنهِ التقرير بتوصية قصيرة.",
  subjectDefaults: [],
  notificationMinutesBefore: 15,
  notificationsEnabled: true
};

export const initialStudents: Student[] = [];

export const initialGroups: Group[] = [];

export const initialPrivateLessons: PrivateLesson[] = [];

export const initialLessons: Lesson[] = [];

export const initialAttendanceRecords: AttendanceRecord[] = [];

export const initialExams: ExamRecord[] = [];

export const initialPaymentTransactions: PaymentTransaction[] = [];

export const initialReports: GeneratedReport[] = [];

