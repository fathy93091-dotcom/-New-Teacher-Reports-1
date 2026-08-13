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

export function sanitizeTeacherName(rawName?: string): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  if (trimmed === "أستاذ أحمد" || trimmed === "أحمد محمود" || trimmed === "أستاذ أحمد محمود") return "";
  const cleaned = trimmed
    .replace(/القائد\s*/g, "")
    .replace(/^د\.\s*/g, "")
    .replace(/^د\/\s*/g, "")
    .replace(/^دكتور\s*/g, "")
    .replace(/^د\s+/g, "")
    .trim();
  return (cleaned === "أستاذ أحمد" || cleaned === "أحمد محمود" || cleaned === "أستاذ أحمد محمود") ? "" : cleaned;
}

export const StorageEngine = {
  // Settings
  getSettings(): AppSettings {
    const s = getItem<AppSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    let updated = false;

    if (s) {
      if (s.teacherName === "أستاذ أحمد" || s.teacherName === "أحمد محمود" || s.teacherName === "أستاذ أحمد محمود") {
        s.teacherName = "";
        updated = true;
      } else if (s.teacherName) {
        const sanitized = sanitizeTeacherName(s.teacherName);
        if (sanitized !== s.teacherName) {
          s.teacherName = sanitized;
          updated = true;
        }
      }

      if (s.defaultSubject === "الرياضيات والفيزياء") {
        s.defaultSubject = "";
        updated = true;
      }

      if (!s.subjectDefaults) {
        s.subjectDefaults = [];
        updated = true;
      }
    }

    if (updated) {
      setItem(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
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
