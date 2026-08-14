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

function getScopedKey(baseKey: string, userId?: string): string {
  if (!userId) return `gostars_guest_${baseKey}`;
  return `gostars_${userId}_${baseKey}`;
}

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

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
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
  getSettings(userId?: string): AppSettings {
    const key = getScopedKey("settings", userId);
    const s = getItem<AppSettings>(key, initialSettings);
    const cleaned = cleanSettings(s);
    if (JSON.stringify(cleaned) !== JSON.stringify(s)) {
      setItem(key, cleaned);
    }
    return cleaned;
  },
  saveSettings(settings: AppSettings, userId?: string): void {
    const key = getScopedKey("settings", userId);
    setItem(key, settings);
  },

  // Students
  getStudents(userId?: string): Student[] {
    const key = getScopedKey("students", userId);
    return getItem(key, initialStudents);
  },
  saveStudents(students: Student[], userId?: string): void {
    const key = getScopedKey("students", userId);
    setItem(key, students);
  },

  // Groups
  getGroups(userId?: string): Group[] {
    const key = getScopedKey("groups", userId);
    return getItem(key, initialGroups);
  },
  saveGroups(groups: Group[], userId?: string): void {
    const key = getScopedKey("groups", userId);
    setItem(key, groups);
  },

  // Private Lessons
  getPrivateLessons(userId?: string): PrivateLesson[] {
    const key = getScopedKey("private_lessons", userId);
    return getItem(key, initialPrivateLessons);
  },
  savePrivateLessons(privateLessons: PrivateLesson[], userId?: string): void {
    const key = getScopedKey("private_lessons", userId);
    setItem(key, privateLessons);
  },

  // Lessons
  getLessons(userId?: string): Lesson[] {
    const key = getScopedKey("lessons", userId);
    return getItem(key, initialLessons);
  },
  saveLessons(lessons: Lesson[], userId?: string): void {
    const key = getScopedKey("lessons", userId);
    setItem(key, lessons);
  },

  // Attendance Records
  getAttendanceRecords(userId?: string): AttendanceRecord[] {
    const key = getScopedKey("attendance", userId);
    return getItem(key, initialAttendanceRecords);
  },
  saveAttendanceRecords(records: AttendanceRecord[], userId?: string): void {
    const key = getScopedKey("attendance", userId);
    setItem(key, records);
  },

  // Exams
  getExams(userId?: string): ExamRecord[] {
    const key = getScopedKey("exams", userId);
    return getItem(key, initialExams);
  },
  saveExams(exams: ExamRecord[], userId?: string): void {
    const key = getScopedKey("exams", userId);
    setItem(key, exams);
  },

  // Payment Transactions
  getPayments(userId?: string): PaymentTransaction[] {
    const key = getScopedKey("payments", userId);
    return getItem(key, initialPaymentTransactions);
  },
  savePayments(payments: PaymentTransaction[], userId?: string): void {
    const key = getScopedKey("payments", userId);
    setItem(key, payments);
  },

  // Reports
  getReports(userId?: string): GeneratedReport[] {
    const key = getScopedKey("reports", userId);
    return getItem(key, initialReports);
  },
  saveReports(reports: GeneratedReport[], userId?: string): void {
    const key = getScopedKey("reports", userId);
    setItem(key, reports);
  },

  // Get complete isolated user workspace
  getUserWorkspace(userId?: string): GoStarsBackupData {
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(userId),
      students: this.getStudents(userId),
      groups: this.getGroups(userId),
      privateLessons: this.getPrivateLessons(userId),
      lessons: this.getLessons(userId),
      attendanceRecords: this.getAttendanceRecords(userId),
      examRecords: this.getExams(userId),
      paymentTransactions: this.getPayments(userId),
      reports: this.getReports(userId)
    };
  },

  // Save complete isolated user workspace
  saveUserWorkspace(userId: string | undefined, data: GoStarsBackupData): void {
    if (!data || typeof data !== "object") return;
    if (data.settings) this.saveSettings(data.settings, userId);
    if (Array.isArray(data.students)) this.saveStudents(data.students, userId);
    if (Array.isArray(data.groups)) this.saveGroups(data.groups, userId);
    if (Array.isArray(data.privateLessons)) this.savePrivateLessons(data.privateLessons, userId);
    if (Array.isArray(data.lessons)) this.saveLessons(data.lessons, userId);
    if (Array.isArray(data.attendanceRecords)) this.saveAttendanceRecords(data.attendanceRecords, userId);
    if (Array.isArray(data.examRecords)) this.saveExams(data.examRecords, userId);
    if (Array.isArray(data.paymentTransactions)) this.savePayments(data.paymentTransactions, userId);
    if (Array.isArray(data.reports)) this.saveReports(data.reports, userId);
  },

  // Backup Export
  exportBackupJSON(userId?: string): GoStarsBackupData {
    return this.getUserWorkspace(userId);
  },

  // Backup Restore
  restoreBackupJSON(data: GoStarsBackupData, userId?: string): boolean {
    if (!data || typeof data !== "object") return false;
    this.saveUserWorkspace(userId, data);
    return true;
  },

  // Wipe User Data / Reset this user to Clean Empty Slate
  purgeUserData(userId?: string): void {
    const keys = ["students", "groups", "private_lessons", "lessons", "attendance", "exams", "payments", "reports"];
    keys.forEach(k => {
      setItem(getScopedKey(k, userId), []);
    });
  }
};

