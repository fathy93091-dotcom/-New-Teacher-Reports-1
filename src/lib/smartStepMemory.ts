/**
 * GoStars - Smart Step & Workflow Memory Engine
 * محرك الذاكرة الذكية لحفظ آخر خطوات المعلم وإعداداته ومسوداته تلقائياً
 * 
 * يحفظ حالة التصفح، الفلاتر، الطالب المحدد، إعدادات التقارير، والمسودات قيد الكتابة
 * بحيث لا يحتاج المعلم إلى تكرار نفس الخطوات في كل مرة.
 */

import { NavTab, BillingType, RateType, AttendanceStatus, HomeworkStatus } from "../types";
import { MonthlyReportFontScale } from "../components/monthlyReport/MonthlyReportDocument";

const MEMORY_PREFIX = "gostars_smart_memory_v1_";

function getActiveUidSuffix(): string {
  try {
    const uid = localStorage.getItem("gostars_active_uid");
    return uid ? `${uid}_` : "guest_";
  } catch {
    return "guest_";
  }
}

function readMemory<T>(key: string, fallback: T): T {
  try {
    const scopedKey = `${MEMORY_PREFIX}${getActiveUidSuffix()}${key}`;
    const raw = localStorage.getItem(scopedKey) ?? localStorage.getItem(`${MEMORY_PREFIX}guest_${key}`);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writeMemory<T>(key: string, data: Partial<T>, defaultFallback: T): void {
  try {
    const current = readMemory<T>(key, defaultFallback);
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    const scopedKey = `${MEMORY_PREFIX}${getActiveUidSuffix()}${key}`;
    localStorage.setItem(scopedKey, JSON.stringify(updated));
    // Also mirror to guest key so it's available immediately before auth hydration finishes
    localStorage.setItem(`${MEMORY_PREFIX}guest_${key}`, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

// 1. حالة التنقل العام للتطبيق (App Navigation State)
export interface AppNavigationMemory {
  activeTab: NavTab;
  searchQuery: string;
}

const DEFAULT_APP_NAV: AppNavigationMemory = {
  activeTab: "home",
  searchQuery: ""
};

export const SmartStepMemory = {
  // --- Global App Navigation ---
  getAppNav(): AppNavigationMemory {
    return readMemory<AppNavigationMemory>("app_nav", DEFAULT_APP_NAV);
  },

  saveAppNav(patch: Partial<AppNavigationMemory>): void {
    writeMemory<AppNavigationMemory>("app_nav", patch, DEFAULT_APP_NAV);
  },

  // --- Students View State (حالة صفحة الطلاب وملف الطالب المفتوح) ---
  getStudentsViewState(): {
    filterStatus: "all" | "active" | "stopped";
    filterCurriculum: string;
    filterGrade: string;
    viewLayout: "grid" | "table";
    selectedStudentId: string | null;
    profileTab: "daily_reports" | "monthly_reports" | "finance" | "attendance";
    reportArchiveFilter: "active" | "archived" | "all";
    archiveSubjectFilter: string;
  } {
    return readMemory("students_view", {
      filterStatus: "all",
      filterCurriculum: "all",
      filterGrade: "all",
      viewLayout: "grid",
      selectedStudentId: null,
      profileTab: "daily_reports",
      reportArchiveFilter: "all",
      archiveSubjectFilter: "all"
    });
  },

  saveStudentsViewState(patch: Partial<{
    filterStatus: "all" | "active" | "stopped";
    filterCurriculum: string;
    filterGrade: string;
    viewLayout: "grid" | "table";
    selectedStudentId: string | null;
    profileTab: "daily_reports" | "monthly_reports" | "finance" | "attendance";
    reportArchiveFilter: "active" | "archived" | "all";
    archiveSubjectFilter: string;
  }>): void {
    writeMemory("students_view", patch, {
      filterStatus: "all",
      filterCurriculum: "all",
      filterGrade: "all",
      viewLayout: "grid",
      selectedStudentId: null,
      profileTab: "daily_reports",
      reportArchiveFilter: "all",
      archiveSubjectFilter: "all"
    });
  },

  // --- Last Add-Student Defaults (حفظ آخر إعدادات إضافة طالب جديد لعدم تكرارها) ---
  getLastNewStudentDefaults(): {
    curriculum: string;
    academicYear: string;
    subject: string;
    billingType: BillingType;
    rateType: RateType;
    lessonCost: number;
    monthlyCost: number;
    lessonsPerMonth: number;
    defaultDurationMinutes: number;
  } {
    return readMemory("new_student_defaults", {
      curriculum: "منهج مصري (عربي)",
      academicYear: "",
      subject: "قرآن كريم",
      billingType: "monthly_elapsed_lessons",
      rateType: "per_lesson",
      lessonCost: 100,
      monthlyCost: 400,
      lessonsPerMonth: 8,
      defaultDurationMinutes: 60
    });
  },

  saveLastNewStudentDefaults(patch: Partial<{
    curriculum: string;
    academicYear: string;
    subject: string;
    billingType: BillingType;
    rateType: RateType;
    lessonCost: number;
    monthlyCost: number;
    lessonsPerMonth: number;
    defaultDurationMinutes: number;
  }>): void {
    writeMemory("new_student_defaults", patch, {
      curriculum: "منهج مصري (عربي)",
      academicYear: "",
      subject: "قرآن كريم",
      billingType: "monthly_elapsed_lessons",
      rateType: "per_lesson",
      lessonCost: 100,
      monthlyCost: 400,
      lessonsPerMonth: 8,
      defaultDurationMinutes: 60
    });
  },

  // --- Per-Student Lesson Report Draft & Last Steps (حفظ خطوات ومسودة تقرير الحصة لكل طالب) ---
  getStudentLessonDraft(studentId: string): {
    hasDraft: boolean;
    reportSubject?: string;
    reportDurationMinutes?: number;
    reportAttendance?: AttendanceStatus;
    reportDeductCost?: boolean;
    reportHomeworkStatus?: HomeworkStatus;
    reportDate?: string;
    absentNotes?: string;
    classEvents?: string;
    homeworkNotes?: string;
    overallEvaluation?: string;
    newAiInstructions?: string;
    newGeneratedReportText?: string;
  } {
    if (!studentId) return { hasDraft: false };
    return readMemory(`lesson_draft_${studentId}`, { hasDraft: false });
  },

  saveStudentLessonDraft(studentId: string, draft: {
    hasDraft: boolean;
    reportSubject?: string;
    reportDurationMinutes?: number;
    reportAttendance?: AttendanceStatus;
    reportDeductCost?: boolean;
    reportHomeworkStatus?: HomeworkStatus;
    reportDate?: string;
    absentNotes?: string;
    classEvents?: string;
    homeworkNotes?: string;
    overallEvaluation?: string;
    newAiInstructions?: string;
    newGeneratedReportText?: string;
  }): void {
    if (!studentId) return;
    writeMemory(`lesson_draft_${studentId}`, draft, { hasDraft: false });
  },

  clearStudentLessonDraft(studentId: string, keepPreferences?: {
    reportSubject?: string;
    reportDurationMinutes?: number;
    reportDeductCost?: boolean;
    newAiInstructions?: string;
  }): void {
    if (!studentId) return;
    try {
      const scopedKey = `${MEMORY_PREFIX}${getActiveUidSuffix()}lesson_draft_${studentId}`;
      const guestKey = `${MEMORY_PREFIX}guest_lesson_draft_${studentId}`;
      const cleanState = {
        hasDraft: false,
        reportSubject: keepPreferences?.reportSubject,
        reportDurationMinutes: keepPreferences?.reportDurationMinutes,
        reportDeductCost: keepPreferences?.reportDeductCost,
        newAiInstructions: keepPreferences?.newAiInstructions,
        classEvents: "",
        homeworkNotes: "",
        overallEvaluation: "",
        absentNotes: "",
        newGeneratedReportText: ""
      };
      localStorage.setItem(scopedKey, JSON.stringify(cleanState));
      localStorage.setItem(guestKey, JSON.stringify(cleanState));
    } catch {}
  },

  // --- Monthly Comprehensive Report State & Cache (حفظ خطوات التقرير الشهري فقط بدون حفظ تحليلات مسبقة) ---
  getMonthlyReportViewState(): {
    dataSourceMode: "app_data" | "upload_file" | "paste_text";
    selectedStudentId: string;
    selectedSubject: string;
    selectedTemplateId?: string;
    selectedYear: number;
    selectedMonth: number;
    selectedArchiveGroup: string;
    reportLang: "ar" | "en";
    teacherName: string;
    fontScale: MonthlyReportFontScale;
    pastedText: string;
    manualStudentName: string;
  } {
    const now = new Date();
    return readMemory("monthly_report_view", {
      dataSourceMode: "app_data",
      selectedStudentId: "",
      selectedSubject: "قرآن كريم",
      selectedTemplateId: "",
      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth() + 1,
      selectedArchiveGroup: "all_month",
      reportLang: "ar",
      teacherName: "",
      fontScale: "large",
      pastedText: "",
      manualStudentName: ""
    });
  },

  saveMonthlyReportViewState(patch: Partial<{
    dataSourceMode: "app_data" | "upload_file" | "paste_text";
    selectedStudentId: string;
    selectedSubject: string;
    selectedTemplateId?: string;
    selectedYear: number;
    selectedMonth: number;
    selectedArchiveGroup: string;
    reportLang: "ar" | "en";
    teacherName: string;
    fontScale: MonthlyReportFontScale;
    pastedText: string;
    manualStudentName: string;
  }>): void {
    const now = new Date();
    writeMemory("monthly_report_view", patch, {
      dataSourceMode: "app_data",
      selectedStudentId: "",
      selectedSubject: "قرآن كريم",
      selectedTemplateId: "",
      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth() + 1,
      selectedArchiveGroup: "all_month",
      reportLang: "ar",
      teacherName: "",
      fontScale: "large",
      pastedText: "",
      manualStudentName: ""
    });
  },

  // تم إيقاف تخزين تحليلات التقرير الشهري المسبقة لضمان الاعتماد 100% على خانة تعليمات التحليل الحالية فقط
  getCachedMonthlyReport(_cacheKey: string): any | null {
    return null;
  },

  saveCachedMonthlyReport(_cacheKey: string, _reportData: any): void {
    // No-op: Monthly report analysis must never rely on saved/cached analysis
  },

  clearMonthlyReportCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes("monthly_report_cache")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};
