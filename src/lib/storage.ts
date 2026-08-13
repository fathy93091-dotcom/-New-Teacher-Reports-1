import {
  Student,
  Group,
  PrivateLesson,
  Lesson,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings,
  GoStarsBackupData
} from "../types";
import {
  initialSettings,
  initialStudents,
  initialGroups,
  initialPrivateLessons,
  initialLessons,
  initialAttendanceRecords,
  initialExams,
  initialPaymentTransactions,
  initialReports
} from "../data/seedData";

const STORAGE_KEYS = {
  SETTINGS: "gostars_settings",
  STUDENTS: "gostars_students",
  GROUPS: "gostars_groups",
  PRIVATE_LESSONS: "gostars_private_lessons",
  LESSONS: "gostars_lessons",
  ATTENDANCE: "gostars_attendance",
  EXAMS: "gostars_exams",
  PAYMENTS: "gostars_payments",
  REPORTS: "gostars_reports"
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
  }
  return fallback;
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

const DEMO_TEACHER_NAMES = [
  "أستاذ أحمد",
  "استاذ احمد",
  "أحمد محمود",
  "احمد محمود",
  "أستاذ أحمد محمود",
  "استاذ احمد محمود",
  "الأستاذ أحمد",
  "الاستاذ احمد",
  "أحمد",
  "احمد",
  "مستر أحمد",
  "مستر احمد",
  "أ / أحمد",
  "أ/ أحمد",
  "أ/احمد",
  "Mr. Ahmed",
  "Ahmed Mahmoud",
  "Teacher Ahmed"
];

export function isDemoTeacherName(rawName?: string): boolean {
  if (!rawName) return false;
  const trimmed = rawName.trim().toLowerCase();
  if (!trimmed) return false;

  return DEMO_TEACHER_NAMES.some(demo => {
    const demoClean = demo.toLowerCase();
    return trimmed === demoClean || trimmed === `أ. ${demoClean}` || trimmed === `د. ${demoClean}`;
  });
}

export function sanitizeTeacherName(rawName?: string): string {
  if (!rawName) return "";
  if (isDemoTeacherName(rawName)) return "";

  const trimmed = rawName.trim();
  const cleaned = trimmed
    .replace(/القائد\s*/g, "")
    .replace(/^د\.\s*/g, "")
    .replace(/^د\/\s*/g, "")
    .replace(/^دكتور\s*/g, "")
    .replace(/^د\s+/g, "")
    .trim();

  return isDemoTeacherName(cleaned) ? "" : cleaned;
}

export function cleanSettings(s: AppSettings, defaultFallbackName?: string): AppSettings {
  const copy: AppSettings = { ...s };
  
  if (isDemoTeacherName(copy.teacherName)) {
    copy.teacherName = defaultFallbackName && !isDemoTeacherName(defaultFallbackName) ? defaultFallbackName : "";
  } else if (copy.teacherName) {
    copy.teacherName = sanitizeTeacherName(copy.teacherName);
  }

  if (copy.defaultSubject === "الرياضيات والفيزياء" || copy.defaultSubject === "الرياضيات والفيزياء (تجريبي)") {
    copy.defaultSubject = "";
  }

  if (!copy.subjectDefaults) {
    copy.subjectDefaults = [];
  }

  return copy;
}

export const StorageEngine = {
  cleanSettings,

  // Settings
  getSettings(): AppSettings {
    const s = getItem<AppSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    const cleaned = cleanSettings(s);
    if (JSON.stringify(cleaned) !== JSON.stringify(s)) {
      setItem(STORAGE_KEYS.SETTINGS, cleaned);
    }
    return cleaned;
  },
  saveSettings(settings: AppSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  },

  // Students
  getStudents(): Student[] {
    return getItem(STORAGE_KEYS.STUDENTS, initialStudents);
  },
  saveStudents(students: Student[]): void {
    setItem(STORAGE_KEYS.STUDENTS, students);
  },

  // Groups
  getGroups(): Group[] {
    return getItem(STORAGE_KEYS.GROUPS, initialGroups);
  },
  saveGroups(groups: Group[]): void {
    setItem(STORAGE_KEYS.GROUPS, groups);
  },

  // Private Lessons
  getPrivateLessons(): PrivateLesson[] {
    return getItem(STORAGE_KEYS.PRIVATE_LESSONS, initialPrivateLessons);
  },
  savePrivateLessons(privateLessons: PrivateLesson[]): void {
    setItem(STORAGE_KEYS.PRIVATE_LESSONS, privateLessons);
  },

  // Lessons
  getLessons(): Lesson[] {
    return getItem(STORAGE_KEYS.LESSONS, initialLessons);
  },
  saveLessons(lessons: Lesson[]): void {
    setItem(STORAGE_KEYS.LESSONS, lessons);
  },

  // Attendance Records
  getAttendanceRecords(): AttendanceRecord[] {
    return getItem(STORAGE_KEYS.ATTENDANCE, initialAttendanceRecords);
  },
  saveAttendanceRecords(records: AttendanceRecord[]): void {
    setItem(STORAGE_KEYS.ATTENDANCE, records);
  },

  // Exams
  getExams(): ExamRecord[] {
    return getItem(STORAGE_KEYS.EXAMS, initialExams);
  },
  saveExams(exams: ExamRecord[]): void {
    setItem(STORAGE_KEYS.EXAMS, exams);
  },

  // Payment Transactions
  getPayments(): PaymentTransaction[] {
    return getItem(STORAGE_KEYS.PAYMENTS, initialPaymentTransactions);
  },
  savePayments(payments: PaymentTransaction[]): void {
    setItem(STORAGE_KEYS.PAYMENTS, payments);
  },

  // Reports
  getReports(): GeneratedReport[] {
    return getItem(STORAGE_KEYS.REPORTS, initialReports);
  },
  saveReports(reports: GeneratedReport[]): void {
    setItem(STORAGE_KEYS.REPORTS, reports);
  },

  // Backup Export
  exportBackupJSON(): GoStarsBackupData {
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      students: this.getStudents(),
      groups: this.getGroups(),
      privateLessons: this.getPrivateLessons(),
      lessons: this.getLessons(),
      attendanceRecords: this.getAttendanceRecords(),
      examRecords: this.getExams(),
      paymentTransactions: this.getPayments(),
      reports: this.getReports()
    };
  },

  // Backup Restore
  restoreBackupJSON(data: GoStarsBackupData): boolean {
    if (!data || typeof data !== "object") return false;
    if (data.settings) this.saveSettings(data.settings);
    if (Array.isArray(data.students)) this.saveStudents(data.students);
    if (Array.isArray(data.groups)) this.saveGroups(data.groups);
    if (Array.isArray(data.privateLessons)) this.savePrivateLessons(data.privateLessons);
    if (Array.isArray(data.lessons)) this.saveLessons(data.lessons);
    if (Array.isArray(data.attendanceRecords)) this.saveAttendanceRecords(data.attendanceRecords);
    if (Array.isArray(data.examRecords)) this.saveExams(data.examRecords);
    if (Array.isArray(data.paymentTransactions)) this.savePayments(data.paymentTransactions);
    if (Array.isArray(data.reports)) this.saveReports(data.reports);
    return true;
  },

  // Wipe Sample Data / Reset to Clean Empty Slate
  purgeAllData(): void {
    setItem(STORAGE_KEYS.STUDENTS, []);
    setItem(STORAGE_KEYS.GROUPS, []);
    setItem(STORAGE_KEYS.PRIVATE_LESSONS, []);
    setItem(STORAGE_KEYS.LESSONS, []);
    setItem(STORAGE_KEYS.ATTENDANCE, []);
    setItem(STORAGE_KEYS.EXAMS, []);
    setItem(STORAGE_KEYS.PAYMENTS, []);
    setItem(STORAGE_KEYS.REPORTS, []);
  }
};
