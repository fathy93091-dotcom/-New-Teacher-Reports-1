/**
 * GoStars - Report Archive & Renewal Engine
 * 
 * Handles intelligent archiving when a month or package ends:
 * 1. Monthly System Students (نظام الشهر): Automatically archives past month reports on the 1st of every month
 *    and resets lesson numbering to start from Lesson #1 (حصة رقم 1 من جديد).
 * 2. Fixed-Package Students (نظام الباقة المحددة بعدد حصص معين): Does NOT archive on the 1st of the month;
 *    only archives automatically after the package's number of lessons is completed OR manually by the teacher,
 *    then starts the new package from Lesson #1.
 * 3. Groups archived reports into organized month/package folders with badges and counts.
 * 4. Enables 1-click manual archiving and renewal at any time.
 */

import {
  GeneratedReport,
  Student,
  AttendanceRecord,
  areReportsDuplicate,
  deduplicateReportsList
} from "../types";

export const ARABIC_MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

export const ENGLISH_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export interface ArchiveMonthGroup {
  groupKey: string;
  groupNameAr: string;
  groupNameEn: string;
  year: number;
  month: number;
  sortTimestamp: number;
  reports: GeneratedReport[];
  count: number;
}

export interface ActiveCycleInfo {
  cycleKey: string;
  startDate: string; // YYYY-MM-DD
  cycleNameAr: string;
  cycleNameEn: string;
  isCustomPackage: boolean;
  packageLessonsLimit?: number;
}

/**
 * Checks whether a student (or specific subject of the student) is on the
 * Fixed-Lessons Package System ("monthly_fixed_lessons" - نظام الباقة المحددة بعدد حصص معين)
 */
export function isFixedPackageStudent(student?: Student | null, subject?: string): boolean {
  if (!student) return false;

  if (subject && student.subjects && student.subjects.length > 0) {
    const normSubj = subject.trim().toLowerCase();
    const matchedSub = student.subjects.find(s => (s.subject || "").trim().toLowerCase() === normSubj);
    if (matchedSub && matchedSub.billingType) {
      return matchedSub.billingType === "monthly_fixed_lessons";
    }
  }

  if (student.billingType === "monthly_fixed_lessons") {
    return true;
  }

  if (student.subjects && student.subjects.length > 0) {
    // If primary or all subjects use monthly_fixed_lessons
    const primary = student.subjects[0];
    if (!student.billingType && primary?.billingType === "monthly_fixed_lessons") {
      return true;
    }
    if (student.subjects.every(s => s.billingType === "monthly_fixed_lessons")) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the target number of lessons in the package for a fixed-package student
 */
export function getPackageLessonsLimit(student?: Student | null, subject?: string): number {
  if (!student) return 8;
  if (subject && student.subjects && student.subjects.length > 0) {
    const normSubj = subject.trim().toLowerCase();
    const matchedSub = student.subjects.find(s => (s.subject || "").trim().toLowerCase() === normSubj);
    if (matchedSub?.lessonsPerMonth && matchedSub.lessonsPerMonth > 0) {
      return matchedSub.lessonsPerMonth;
    }
  }
  if (student.lessonsPerMonth && student.lessonsPerMonth > 0) {
    return student.lessonsPerMonth;
  }
  if (student.subjects && student.subjects[0]?.lessonsPerMonth && student.subjects[0].lessonsPerMonth > 0) {
    return student.subjects[0].lessonsPerMonth;
  }
  return 8;
}

/**
 * Parses any date string into year and month (1-12)
 */
export function parseYearMonth(dateStr?: string): { year: number; month: number; dateOnly: string } {
  if (!dateStr) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      dateOnly: now.toISOString().slice(0, 10)
    };
  }

  // Handle YYYY-MM-DD or ISO strings
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = match[3] ? String(parseInt(match[3], 10)).padStart(2, "0") : "01";
    const dateOnly = `${year}-${String(month).padStart(2, "0")}-${day}`;
    return {
      year,
      month,
      dateOnly
    };
  }

  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      dateOnly: d.toISOString().slice(0, 10)
    };
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    dateOnly: now.toISOString().slice(0, 10)
  };
}

/**
 * Formats a month and year into Arabic and English labels
 */
export function formatMonthYearLabel(year: number, month: number): { ar: string; en: string; key: string } {
  const safeMonth = Math.min(Math.max(month, 1), 12);
  const ar = `${ARABIC_MONTH_NAMES[safeMonth - 1]} ${year}`;
  const en = `${ENGLISH_MONTH_NAMES[safeMonth - 1]} ${year}`;
  const key = `${year}-${String(safeMonth).padStart(2, "0")}`;
  return { ar, en, key };
}

/**
 * Determines the current active cycle for a student:
 * - For Fixed-Package students (نظام الباقة المحددة بعدد حصص):
 *   Does NOT reset on the 1st of the calendar month! Keeps the package active across months
 *   until the package lesson count is finished or manually archived.
 * - For Monthly System students (نظام الشهر):
 *   Automatically starts a new cycle on the 1st of every calendar month (YYYY-MM-01).
 */
export function getActiveCycleInfo(student?: Student | null): ActiveCycleInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const defaultLabel = formatMonthYearLabel(currentYear, currentMonth);

  const isFixedPkg = isFixedPackageStudent(student);

  if (isFixedPkg) {
    const pkgLimit = getPackageLessonsLimit(student);
    const pkgStartDate = student?.currentCycleStartDate || student?.subscriptionStartDate || "2000-01-01";
    const cycleParsed = student?.currentCycleStartDate
      ? parseYearMonth(student.currentCycleStartDate)
      : { year: currentYear, month: currentMonth };
    const label = formatMonthYearLabel(cycleParsed.year, cycleParsed.month);

    return {
      cycleKey: `pkg_${pkgStartDate}`,
      startDate: pkgStartDate,
      cycleNameAr: student?.currentCycleName || `باقة (${pkgLimit} حصص) - ${label.ar}`,
      cycleNameEn: student?.currentCycleName || `Package (${pkgLimit} Lessons) - ${label.en}`,
      isCustomPackage: true,
      packageLessonsLimit: pkgLimit
    };
  }

  // Monthly System Student (نظام الشهر):
  // Automatically rolls over on the 1st of every calendar month!
  // Only uses student.currentCycleStartDate if it is within the current month (e.g. manual mid-month reset).
  if (student?.currentCycleStartDate && student.currentCycleStartDate >= currentMonthStart) {
    const cycleParsed = parseYearMonth(student.currentCycleStartDate);
    const label = formatMonthYearLabel(cycleParsed.year, cycleParsed.month);
    return {
      cycleKey: student.currentCycleStartDate,
      startDate: student.currentCycleStartDate,
      cycleNameAr: student.currentCycleName || label.ar,
      cycleNameEn: student.currentCycleName || label.en,
      isCustomPackage: false
    };
  }

  return {
    cycleKey: defaultLabel.key,
    startDate: currentMonthStart,
    cycleNameAr: defaultLabel.ar,
    cycleNameEn: defaultLabel.en,
    isCustomPackage: false
  };
}

/**
 * Determines whether a report belongs to the current active month/package
 */
export function isReportInActiveCycle(
  report: GeneratedReport,
  student?: Student | null,
  activeCycle?: ActiveCycleInfo
): boolean {
  // If explicitly archived by user or automatic archiver
  if (report.archived === true) {
    return false;
  }

  // If explicitly unarchived/restored to active by user or marked active
  if ((report as any).manuallyUnarchived === true || report.archived === false) {
    return true;
  }

  const isFixedPkg = isFixedPackageStudent(student, report.subject);
  const reportDateOnly = parseYearMonth(report.date || report.createdAt).dateOnly;

  if (isFixedPkg) {
    // Fixed-package students are NOT archived by calendar month change.
    // Only archived if explicitly marked archived === true or before an explicit package reset startDate.
    if (student?.currentCycleStartDate) {
      return reportDateOnly >= student.currentCycleStartDate;
    }
    return true;
  }

  const cycle = activeCycle || getActiveCycleInfo(student);
  // Active if on or after the start date of the active month/cycle (at least YYYY-MM-01)
  return reportDateOnly >= cycle.startDate;
}

/**
 * Calculates the next lesson number (starting from 1) strictly within the student's current active cycle!
 * - For Monthly System students: automatically starts from Lesson #1 on the 1st of every month.
 * - For Fixed Package students: continues across months until the package's lessonsPerMonth is completed
 *   or manually archived, then starts from Lesson #1.
 */
export function getNextActiveLessonNumber(
  studentOrParams?: Student | null | {
    student?: Student | null;
    subject?: string;
    allReports?: GeneratedReport[];
    allAttendance?: AttendanceRecord[];
  },
  subjectArg?: string,
  allReportsArg?: GeneratedReport[],
  allAttendanceArg?: AttendanceRecord[]
): number {
  let student: Student | null | undefined = null;
  let subject = "";
  let allReports: GeneratedReport[] = [];
  let allAttendance: AttendanceRecord[] = [];

  if (studentOrParams && typeof studentOrParams === "object" && ("allReports" in studentOrParams || "allAttendance" in studentOrParams || "student" in studentOrParams)) {
    const p = studentOrParams as {
      student?: Student | null;
      subject?: string;
      allReports?: GeneratedReport[];
      allAttendance?: AttendanceRecord[];
    };
    student = p.student;
    subject = p.subject || "";
    allReports = p.allReports || [];
    allAttendance = p.allAttendance || [];
  } else {
    student = studentOrParams as Student | null | undefined;
    subject = subjectArg || "";
    allReports = allReportsArg || [];
    allAttendance = allAttendanceArg || [];
  }

  if (!student) return 1;

  const normSubj = subject.trim().toLowerCase();
  const activeCycle = getActiveCycleInfo(student);
  const isFixedPkg = isFixedPackageStudent(student, subject);
  const pkgLimit = isFixedPkg ? getPackageLessonsLimit(student, subject) : 0;

  // 1. Filter reports strictly in the active cycle for this student & subject
  const activeReports = allReports.filter((r) => {
    if (!r || r.reportType === "monthly_comprehensive") return false;
    const matchesStudent =
      r.studentId === student.id ||
      (r.studentName && r.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
    if (!matchesStudent) return false;
    if (normSubj && r.subject && r.subject.trim().toLowerCase() !== normSubj) return false;
    return isReportInActiveCycle(r, student, activeCycle);
  });

  // Collect archived report IDs/dates so we don't count archived attendance records
  const archivedReportIds = new Set<string>();
  allReports.forEach((r) => {
    if (!r) return;
    const matchesStudent =
      r.studentId === student.id ||
      (r.studentName && r.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
    if (matchesStudent && !isReportInActiveCycle(r, student, activeCycle)) {
      if (r.id) archivedReportIds.add(r.id);
      if (r.lessonId) archivedReportIds.add(r.lessonId);
    }
  });

  // 2. Filter attendance records strictly in the active cycle for this student & subject
  const activeAttendance = allAttendance.filter((ar) => {
    if (!ar || ar.archived === true) return false;
    const matchesStudent =
      ar.studentId === student.id ||
      (ar.studentName && ar.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
    if (!matchesStudent) return false;
    if (normSubj && ar.subject && ar.subject.trim().toLowerCase() !== normSubj) return false;
    if (ar.id && archivedReportIds.has(ar.id)) return false;
    if (ar.lessonId && archivedReportIds.has(ar.lessonId)) return false;

    const arDateOnly = parseYearMonth(ar.date).dateOnly;
    if (isFixedPkg) {
      if (student.currentCycleStartDate && arDateOnly < student.currentCycleStartDate) return false;
      return true;
    } else {
      return arDateOnly >= activeCycle.startDate;
    }
  });

  // If no active lessons exist in the current month/package, start from Lesson #1!
  if (activeReports.length === 0 && activeAttendance.length === 0) {
    return 1;
  }

  const maxInReports = activeReports.reduce((max, r) => Math.max(max, r.lessonNumber || 0), 0);
  const maxInAtt = activeAttendance.reduce((max, ar) => Math.max(max, ar.lessonNumber || 0), 0);
  const highestLessonNum = Math.max(maxInReports, maxInAtt, activeReports.length, activeAttendance.length);

  // If fixed package and the student already completed the package limit, start new package at #1
  if (isFixedPkg && pkgLimit > 0 && highestLessonNum >= pkgLimit) {
    return 1;
  }

  return highestLessonNum + 1;
}

/**
 * Gets the display archive group name for a report
 */
export function getReportArchiveGroupName(report: GeneratedReport, isEn = false): string {
  if (report.archiveGroup && report.archiveGroup.trim()) {
    return report.archiveGroup.trim();
  }

  const parsed = parseYearMonth(report.date || report.createdAt);
  const label = formatMonthYearLabel(parsed.year, parsed.month);
  return isEn ? `Archive ${label.en}` : `أرشيف ${label.ar}`;
}

/**
 * Groups archived reports by month or package name for clean foldered display
 */
export function groupArchivedReports(
  archivedReports: GeneratedReport[],
  isEn = false
): ArchiveMonthGroup[] {
  const groupsMap = new Map<string, ArchiveMonthGroup>();

  archivedReports.forEach((rep) => {
    let key: string;
    let nameAr: string;
    let nameEn: string;
    let year: number;
    let month: number;
    let sortTimestamp: number;

    const parsed = parseYearMonth(rep.date || rep.createdAt);
    year = parsed.year;
    month = parsed.month;
    sortTimestamp = new Date(rep.date || rep.createdAt || 0).getTime();

    if (rep.archiveGroup && rep.archiveGroup.trim()) {
      const customName = rep.archiveGroup.trim();
      key = `group_${customName}`;
      nameAr = customName.startsWith("أرشيف") || customName.startsWith("باقة") ? customName : `أرشيف ${customName}`;
      nameEn = customName.toLowerCase().startsWith("archive") ? customName : `Archive ${customName}`;
    } else {
      const label = formatMonthYearLabel(year, month);
      key = label.key;
      nameAr = `أرشيف ${label.ar}`;
      nameEn = `${label.en} Archive`;
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        groupKey: key,
        groupNameAr: nameAr,
        groupNameEn: nameEn,
        year,
        month,
        sortTimestamp,
        reports: [],
        count: 0
      });
    }

    const group = groupsMap.get(key)!;
    group.reports.push(rep);
    group.count++;
    // Keep max timestamp for sorting groups
    if (sortTimestamp > group.sortTimestamp) {
      group.sortTimestamp = sortTimestamp;
    }
  });

  // Convert to array and sort groups: Newest month/cycle first
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return b.sortTimestamp - a.sortTimestamp;
  });

  // Sort reports inside each group: Newest first
  sortedGroups.forEach((g) => {
    g.reports.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  });

  return sortedGroups;
}

/**
 * Automatic Archiving Engine:
 * 1. Monthly System Students (نظام الشهر):
 *    Automatically archives any unarchived reports/attendance from previous calendar months (< YYYY-MM-01)
 *    under their respective month name, and resets the student's active cycle to the 1st of the current month
 *    so lesson numbering starts from Lesson #1.
 * 2. Fixed-Package Students (نظام الباقة المحددة بعدد حصص معين):
 *    Does NOT archive on the 1st of the month. Automatically archives ONLY when the active completed lessons
 *    reach the package's target lesson count (`lessonsPerMonth`), resetting the active cycle to start from Lesson #1.
 */
export function runAutomaticArchivingCheck(params: {
  students: Student[];
  reports: GeneratedReport[];
  attendanceRecords: AttendanceRecord[];
}): {
  hasChanges: boolean;
  updatedStudents: Student[];
  updatedReports: GeneratedReport[];
  updatedAttendance: AttendanceRecord[];
  autoArchivedSummaries: string[];
} {
  const { students = [], reports = [], attendanceRecords = [] } = params;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const currentMonthLabel = formatMonthYearLabel(currentYear, currentMonth);
  const nowIso = now.toISOString();
  const todayStr = nowIso.slice(0, 10);

  let hasChanges = false;
  const autoArchivedSummaries: string[] = [];

  const nextReports = [...reports];
  const nextAttendance = [...attendanceRecords];

  const nextStudents = students.map((student) => {
    if (!student) return student;
    const isFixedPkg = isFixedPackageStudent(student);

    if (!isFixedPkg) {
      // =====================================================================
      // CASE 1: MONTHLY SYSTEM STUDENT (نظام الشهر - أرشفة تلقائية كل أول شهر)
      // =====================================================================
      let studentArchivedAny = false;

      // Archive any unarchived lesson report from a previous month (< currentMonthStart)
      for (let i = 0; i < nextReports.length; i++) {
        const rep = nextReports[i];
        if (!rep || rep.archived === true || (rep as any).manuallyUnarchived === true || rep.reportType === "monthly_comprehensive") continue;
        const matchesStudent =
          rep.studentId === student.id ||
          (rep.studentName && rep.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
        if (!matchesStudent) continue;

        const parsed = parseYearMonth(rep.date || rep.createdAt);
        if (parsed.dateOnly < currentMonthStart) {
          const repMonthLabel = formatMonthYearLabel(parsed.year, parsed.month);
          nextReports[i] = {
            ...rep,
            archived: true,
            archivedAt: nowIso,
            archiveGroup: rep.archiveGroup || `أرشيف ${repMonthLabel.ar}`
          };
          studentArchivedAny = true;
          hasChanges = true;
        }
      }

      // Archive any unarchived attendance record from a previous month (< currentMonthStart)
      for (let i = 0; i < nextAttendance.length; i++) {
        const ar = nextAttendance[i];
        if (!ar || ar.archived === true || (ar as any).manuallyUnarchived === true) continue;
        const matchesStudent =
          ar.studentId === student.id ||
          (ar.studentName && ar.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
        if (!matchesStudent) continue;

        const parsed = parseYearMonth(ar.date);
        if (parsed.dateOnly < currentMonthStart) {
          const arMonthLabel = formatMonthYearLabel(parsed.year, parsed.month);
          nextAttendance[i] = {
            ...ar,
            archived: true,
            archivedAt: nowIso,
            archiveGroup: ar.archiveGroup || `أرشيف ${arMonthLabel.ar}`
          };
          studentArchivedAny = true;
          hasChanges = true;
        }
      }

      // If student had a cycle start date from a previous month or just archived past month records,
      // roll over their active cycle to the 1st of the current month and recount only current month's active lessons.
      const needsCycleRollover =
        studentArchivedAny ||
        (student.currentCycleStartDate && student.currentCycleStartDate < currentMonthStart);

      if (needsCycleRollover) {
        // Count active attended lessons in the new current month
        const currentMonthActiveAttended = nextAttendance.filter((ar) => {
          if (!ar || ar.archived === true) return false;
          const matchesStudent =
            ar.studentId === student.id ||
            (ar.studentName && ar.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
          if (!matchesStudent) return false;
          const d = parseYearMonth(ar.date).dateOnly;
          return d >= currentMonthStart && (ar.attendance === "present" || ar.attendance === "late" || ar.deducted);
        }).length;

        const updatedSubjects = student.subjects?.map((sub) => {
          const subActiveCount = nextAttendance.filter((ar) => {
            if (!ar || ar.archived === true) return false;
            const matchesStudent =
              ar.studentId === student.id ||
              (ar.studentName && ar.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
            if (!matchesStudent) return false;
            if (ar.subject && sub.subject && ar.subject.trim().toLowerCase() !== sub.subject.trim().toLowerCase()) {
              return false;
            }
            const d = parseYearMonth(ar.date).dateOnly;
            return d >= currentMonthStart && (ar.attendance === "present" || ar.attendance === "late" || ar.deducted);
          }).length;
          return {
            ...sub,
            totalAttendedLessons: subActiveCount
          };
        });

        hasChanges = true;
        if (studentArchivedAny) {
          autoArchivedSummaries.push(`تمت الأرشفة التلقائية للشهر السابق للطالب ${student.fullName} وبدء شهر ${currentMonthLabel.ar} من الحصة رقم 1`);
        }

        return {
          ...student,
          currentCycleStartDate: currentMonthStart,
          currentCycleName: currentMonthLabel.ar,
          totalAttendedLessons: currentMonthActiveAttended,
          subjects: updatedSubjects
        };
      }

      return student;
    } else {
      // =====================================================================
      // CASE 2: FIXED-PACKAGE STUDENT (نظام الباقة المحددة بعدد حصص معين)
      // لا يتم أرشفتها إلا بعد انتهاء عدد الحصص المحددة للباقة (أو يدوياً)
      // =====================================================================
      const pkgLimit = getPackageLessonsLimit(student);
      if (!pkgLimit || pkgLimit <= 0) return student;

      const pkgStartDate = student.currentCycleStartDate || student.subscriptionStartDate || "2000-01-01";

      // Gather active lesson reports in this package
      const activeStudentReportIndices: number[] = [];
      nextReports.forEach((rep, idx) => {
        if (!rep || rep.archived === true || rep.reportType === "monthly_comprehensive") return;
        const matchesStudent =
          rep.studentId === student.id ||
          (rep.studentName && rep.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
        if (!matchesStudent) return;
        const d = parseYearMonth(rep.date || rep.createdAt).dateOnly;
        if (d >= pkgStartDate || (rep as any).manuallyUnarchived === true || rep.archived === false) {
          activeStudentReportIndices.push(idx);
        }
      });

      // Gather active attendance records in this package
      const activeStudentAttIndices: number[] = [];
      const allActivePkgAttIndices: number[] = [];
      nextAttendance.forEach((ar, idx) => {
        if (!ar || ar.archived === true) return;
        const matchesStudent =
          ar.studentId === student.id ||
          (ar.studentName && ar.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase());
        if (!matchesStudent) return;
        const d = parseYearMonth(ar.date).dateOnly;
        if (d >= pkgStartDate || (ar as any).manuallyUnarchived === true) {
          allActivePkgAttIndices.push(idx);
          if (ar.attendance === "present" || ar.attendance === "late" || ar.deducted) {
            activeStudentAttIndices.push(idx);
          }
        }
      });

      // Count unique active completed sessions in this package
      const sessionKeys = new Set<string>();
      activeStudentAttIndices.forEach((idx) => {
        const ar = nextAttendance[idx];
        const key = `${parseYearMonth(ar.date).dateOnly}_${(ar.subject || "").trim().toLowerCase()}_${ar.lessonNumber || ar.id}`;
        sessionKeys.add(key);
      });
      activeStudentReportIndices.forEach((idx) => {
        const rep = nextReports[idx];
        if (rep.attendance === "absent") return;
        const d = parseYearMonth(rep.date || rep.createdAt).dateOnly;
        const hasMatchingAtt = activeStudentAttIndices.some((aIdx) => {
          const ar = nextAttendance[aIdx];
          return parseYearMonth(ar.date).dateOnly === d && (ar.lessonNumber === rep.lessonNumber || !ar.lessonNumber || !rep.lessonNumber);
        });
        if (!hasMatchingAtt) {
          sessionKeys.add(`${d}_${(rep.subject || "").trim().toLowerCase()}_${rep.lessonNumber || rep.id}`);
        }
      });

      const activeCompletedCount = Math.max(
        sessionKeys.size,
        activeStudentReportIndices.filter(i => nextReports[i].attendance !== "absent").length,
        activeStudentAttIndices.length
      );

      // Only auto-archive when the package's target number of lessons has finished!
      if (activeCompletedCount >= pkgLimit && (activeStudentReportIndices.length > 0 || activeStudentAttIndices.length > 0)) {
        // Determine label for the completed package based on its lessons' dates
        const sampleDate =
          (activeStudentReportIndices.length > 0 ? nextReports[activeStudentReportIndices[0]].date : undefined) ||
          (activeStudentAttIndices.length > 0 ? nextAttendance[activeStudentAttIndices[0]].date : undefined) ||
          todayStr;
        const parsedPkg = parseYearMonth(sampleDate);
        const pkgMonthLabel = formatMonthYearLabel(parsedPkg.year, parsedPkg.month);
        const archiveFolderTitle = `باقة ${pkgMonthLabel.ar} (${pkgLimit} حصص)`;

        activeStudentReportIndices.forEach((idx) => {
          nextReports[idx] = {
            ...nextReports[idx],
            archived: true,
            archivedAt: nowIso,
            archiveGroup: nextReports[idx].archiveGroup || archiveFolderTitle,
            ...({ manuallyUnarchived: false } as any)
          };
        });

        allActivePkgAttIndices.forEach((idx) => {
          nextAttendance[idx] = {
            ...nextAttendance[idx],
            archived: true,
            archivedAt: nowIso,
            archiveGroup: nextAttendance[idx].archiveGroup || archiveFolderTitle,
            ...({ manuallyUnarchived: false } as any)
          };
        });

        const updatedSubjects = student.subjects?.map((sub) => ({
          ...sub,
          totalAttendedLessons: 0
        }));

        hasChanges = true;
        autoArchivedSummaries.push(
          `اكتملت باقة الطالب ${student.fullName} (${pkgLimit} حصص) وتمت أرشفتها تلقائياً في "${archiveFolderTitle}" وبدء الباقة الجديدة من الحصة رقم 1`
        );

        return {
          ...student,
          currentCycleStartDate: todayStr,
          currentCycleName: `باقة ${currentMonthLabel.ar} (${pkgLimit} حصص)`,
          totalAttendedLessons: 0,
          remainingLessons: pkgLimit,
          subjects: updatedSubjects
        };
      }

      return student;
    }
  });

  return {
    hasChanges,
    updatedStudents: nextStudents,
    updatedReports: nextReports,
    updatedAttendance: nextAttendance,
    autoArchivedSummaries
  };
}

/**
 * 1-Click Manual Action: Archives the ended month/package and starts a fresh new active cycle from Lesson #1
 */
export function archiveEndedCycleAndStartNew(params: {
  student: Student;
  allReports: GeneratedReport[];
  allAttendance?: AttendanceRecord[];
  archiveGroupName?: string; // Optional custom title, e.g. "أرشيف سبتمبر 2026" or "باقة سبتمبر (8 حصص)"
  newCycleStartDate?: string; // Optional start date for new package/cycle (defaults to today)
  newCycleName?: string; // Optional name for new package/cycle, e.g. "أكتوبر 2026" or "باقة جديدة"
  resetLessonBalance?: boolean; // For package subscriptions: reset balance to student's lessonsPerMonth
}): {
  updatedReports: GeneratedReport[];
  updatedAttendance: AttendanceRecord[];
  updatedStudent: Student;
  archivedCount: number;
} {
  const {
    student,
    allReports,
    allAttendance = [],
    archiveGroupName,
    newCycleStartDate,
    newCycleName,
    resetLessonBalance
  } = params;

  const activeCycle = getActiveCycleInfo(student);
  const now = new Date();
  const nowIso = now.toISOString();
  const effectiveNewStartDate = newCycleStartDate || nowIso.slice(0, 10);
  const isFixedPkg = isFixedPackageStudent(student);
  const pkgLimit = getPackageLessonsLimit(student);

  // Format the default archive name for the cycle that just concluded
  const parsedCycle = parseYearMonth(activeCycle.startDate !== "2000-01-01" ? activeCycle.startDate : effectiveNewStartDate);
  const cycleLabel = formatMonthYearLabel(parsedCycle.year, parsedCycle.month);
  const effectiveArchiveName =
    archiveGroupName?.trim() ||
    (isFixedPkg
      ? `باقة ${cycleLabel.ar} (${pkgLimit} حصص)`
      : `أرشيف ${cycleLabel.ar}`);

  const effectiveNewCycleName =
    newCycleName?.trim() ||
    (isFixedPkg
      ? `باقة ${formatMonthYearLabel(now.getFullYear(), now.getMonth() + 1).ar} (${pkgLimit} حصص)`
      : formatMonthYearLabel(now.getFullYear(), now.getMonth() + 1).ar);

  let archivedCount = 0;
  const studentIdStr = String(student.id || "").trim();
  const studentNameNorm = (student.fullName || "").trim().toLowerCase();

  // Update all reports for this student that were not already archived
  const updatedReports = allReports.map((r) => {
    if (!r) return r;
    const matchesStudent =
      (r.studentId && String(r.studentId).trim() === studentIdStr) ||
      (r.studentName && r.studentName.trim().toLowerCase() === studentNameNorm);
    if (matchesStudent && r.reportType !== "monthly_comprehensive") {
      const wasActive = isReportInActiveCycle(r, student, activeCycle) || r.archived !== true;
      if (wasActive) {
        archivedCount++;
        return {
          ...r,
          archived: true,
          archivedAt: nowIso,
          archiveGroup: r.archived === true && r.archiveGroup ? r.archiveGroup : effectiveArchiveName,
          ...({ manuallyUnarchived: false } as any)
        };
      }
    }
    return r;
  });

  // Also archive all active attendance records for this student, and promote any attendance-only reports
  const promotedReports: GeneratedReport[] = [];
  const updatedAttendance = allAttendance.map((ar) => {
    if (!ar) return ar;
    const isStudent =
      (ar.studentId && String(ar.studentId).trim() === studentIdStr) ||
      (ar.studentName && ar.studentName.trim().toLowerCase() === studentNameNorm);
    if (isStudent && ar.archived !== true) {
      const hasReportText = Boolean(ar.generatedReportText || ar.teacherNotes);
      if (hasReportText) {
        const candidateReport: Partial<GeneratedReport> = {
          id: ar.id,
          studentId: student.id,
          studentName: student.fullName || ar.studentName || "",
          subject: ar.subject || student.subject || "",
          date: ar.date,
          lessonNumber: ar.lessonNumber,
          reportText: ar.generatedReportText || ar.teacherNotes || "",
          generatedText: ar.generatedReportText || ar.teacherNotes || "",
          reportType: "daily_personal"
        };
        const alreadyInReports = updatedReports.some((sr) => areReportsDuplicate(sr, candidateReport));
        if (!alreadyInReports) {
          archivedCount++;
          promotedReports.push({
            id: ar.id,
            studentId: student.id,
            studentName: student.fullName || ar.studentName || "",
            subject: ar.subject || student.subject || "",
            lessonNumber: ar.lessonNumber,
            attendance: ar.attendance,
            deductCost: ar.deducted,
            date: ar.date,
            teacherNotes: ar.teacherNotes || "",
            aiInstructions: ar.aiInstructions || "",
            reportText: ar.generatedReportText || ar.teacherNotes || "",
            generatedText: ar.generatedReportText || ar.teacherNotes || "",
            reportType: "daily_personal",
            archived: true,
            archivedAt: nowIso,
            archiveGroup: ar.archiveGroup || effectiveArchiveName,
            createdAt: ar.date
          });
        }
      }

      return {
        ...ar,
        archived: true,
        archivedAt: nowIso,
        archiveGroup: ar.archiveGroup || effectiveArchiveName,
        ...({ manuallyUnarchived: false } as any)
      };
    }
    return ar;
  });

  const rawFinalReports = promotedReports.length > 0 ? [...promotedReports, ...updatedReports] : updatedReports;
  const finalReports = deduplicateReportsList(rawFinalReports);

  // Update student with the new active cycle start date and reset active cycle attended lessons to 0 (so next lesson is #1)
  let updatedSubjects = student.subjects;
  if (updatedSubjects && updatedSubjects.length > 0) {
    updatedSubjects = updatedSubjects.map(sub => ({
      ...sub,
      totalAttendedLessons: 0
    }));
  }

  const updatedStudent: Student = {
    ...student,
    currentCycleStartDate: effectiveNewStartDate,
    currentCycleName: effectiveNewCycleName,
    totalAttendedLessons: 0,
    subjects: updatedSubjects,
    ...(resetLessonBalance || isFixedPkg
      ? {
          totalPaidAmount: resetLessonBalance ? 0 : student.totalPaidAmount,
          remainingLessons: pkgLimit
        }
      : {})
  };

  return {
    updatedReports: finalReports,
    updatedAttendance,
    updatedStudent,
    archivedCount
  };
}
