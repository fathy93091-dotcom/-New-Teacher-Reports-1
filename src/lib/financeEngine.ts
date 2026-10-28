import {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  GeneratedReport,
  BillingType,
  RateType,
  StudyType,
  SubjectPaymentAllocation,
  Group,
  PrivateLesson,
  ScheduleSlot
} from "../types";
import { StorageEngine } from "./storage";
import { getActiveCycleInfo } from "./reportArchiveEngine";

/**
 * Counts occurrences of specific weekdays in a given calendar month
 */
export function getWeekdayOccurrencesInMonth(
  year: number,
  monthIndex: number, // 0-11
  daysList: string[]
): number {
  if (!daysList || daysList.length === 0) return 4;

  const dayMap: Record<string, number> = {
    "الأحد": 0, "الاحد": 0, "sunday": 0, "sun": 0,
    "الإثنين": 1, "الاثنين": 1, "الاتنين": 1, "monday": 1, "mon": 1,
    "الثلاثاء": 2, "التلات": 2, "tuesday": 2, "tue": 2,
    "الأربعاء": 3, "الاربعاء": 3, "wednesday": 3, "wed": 3,
    "الخميس": 4, "thursday": 4, "thu": 4,
    "الجمعة": 5, "friday": 5, "fri": 5,
    "السبت": 6, "saturday": 6, "sat": 6,
  };

  const targetWeekdays = new Set<number>();
  daysList.forEach(d => {
    if (!d) return;
    const clean = d.trim().toLowerCase();
    if (dayMap[clean] !== undefined) {
      targetWeekdays.add(dayMap[clean]);
    }
  });

  if (targetWeekdays.size === 0) {
    return Math.max(1, daysList.length * 4);
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (targetWeekdays.has(d.getDay())) {
      count++;
    }
  }
  return count > 0 ? count : Math.max(1, daysList.length * 4);
}

/**
 * Expected revenue info for a single student for the current/target month
 */
export interface StudentExpectedRevenueInfo {
  studentId: string;
  expectedMonthlyRevenue: number;
  expectedRevenue?: number;
  expectedLessonsCount: number;
  actualPaidThisMonth: number;
  actualAttendedThisMonth: number;
  remainingExpectedToCollect: number;
  collectionProgressPercent: number;
  billingType: BillingType;
  rateType: RateType;
  scheduleSummary: string;
  scheduleDescription?: string;
  formulaDescription: string;
  breakdownBySubject: {
    subject: string;
    billingType: BillingType;
    expectedRevenue: number;
    expectedLessons: number;
    lessonCost: number;
    formula: string;
  }[];
}

/**
 * Overall Expected Monthly Revenue Summary across all active students
 */
export interface ExpectedMonthlyRevenueSummary {
  year: number;
  month: number;
  monthNameAr: string;
  monthNameEn: string;
  totalExpectedRevenue: number;
  totalActualCollectedThisMonth: number;
  totalEarnedRevenueThisMonth: number;
  totalRemainingToCollect: number;
  overallCollectionPercent: number;
  totalExpectedLessons: number;
  totalAttendedThisMonth: number;
  activeStudentsCount: number;
  byBillingType: {
    monthly: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; earnedThisMonth: number };
    monthly_fixed_lessons: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; earnedThisMonth: number; totalLessons: number };
    per_lesson: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; earnedThisMonth: number; totalLessons: number };
    monthly_elapsed_lessons: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; earnedThisMonth: number; totalLessons: number };
  };
  studentMap: Map<string, StudentExpectedRevenueInfo>;
}

/**
 * Calculates expected monthly revenue for a single student based on schedule and billing system
 */
export function calculateStudentExpectedMonthlyRevenue(
  student: Student,
  groups: Group[] = [],
  privateLessons: PrivateLesson[] = [],
  paymentTransactions: PaymentTransaction[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  targetDate: Date = new Date()
): StudentExpectedRevenueInfo {
  const year = targetDate.getFullYear();
  const monthIndex = targetDate.getMonth();
  const currentMonthStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  // Find linked group and private lesson
  const studentGroup = groups.find(g => (g.studentIds && g.studentIds.includes(student.id)) || (student.groupId && g.id === student.groupId));
  const studentPrivate = privateLessons.find(pl => pl.studentId === student.id);

  // Extract scheduled days
  let scheduledDays: string[] = [];
  if (student.scheduleSlots && student.scheduleSlots.length > 0) {
    scheduledDays = student.scheduleSlots.map(s => s.day).filter(Boolean);
  } else if (studentGroup) {
    scheduledDays = studentGroup.scheduleSlots && studentGroup.scheduleSlots.length > 0
      ? studentGroup.scheduleSlots.map(s => s.day).filter(Boolean)
      : (studentGroup.days || []);
  } else if (studentPrivate) {
    scheduledDays = studentPrivate.scheduleSlots && studentPrivate.scheduleSlots.length > 0
      ? studentPrivate.scheduleSlots.map(s => s.day).filter(Boolean)
      : (studentPrivate.days || []);
  }

  // Count scheduled lessons occurring in this calendar month
  const calendarLessonsCount = scheduledDays.length > 0
    ? getWeekdayOccurrencesInMonth(year, monthIndex, scheduledDays)
    : (student.lessonsPerMonth || 4);

  // Actual payments & attendance in target month
  const actualPaidThisMonth = paymentTransactions
    .filter(pt => pt.studentId === student.id && pt.date && pt.date.startsWith(currentMonthStr))
    .reduce((sum, pt) => sum + (Number(pt.amount) || 0), 0);

  const actualAttendedThisMonth = attendanceRecords
    .filter(ar => ar.studentId === student.id && ar.date && ar.date.startsWith(currentMonthStr) && (ar.attendance === "present" || ar.deducted))
    .length;

  const breakdownBySubject: StudentExpectedRevenueInfo["breakdownBySubject"] = [];
  let totalExpectedRevenue = 0;
  let totalExpectedLessons = 0;

  if (student.subjects && student.subjects.length > 0) {
    student.subjects.forEach(sub => {
      const bType: BillingType = sub.billingType || student.billingType || "per_lesson";
      const rType: RateType = sub.rateType || student.rateType || "per_lesson";
      const lCost = Math.max(0, sub.lessonCost !== undefined ? sub.lessonCost : (student.lessonCost || 100));
      const hCost = Math.max(0, sub.hourlyCost !== undefined ? sub.hourlyCost : lCost);
      const dur = sub.defaultDurationMinutes || student.defaultDurationMinutes || 60;
      const effectiveLessonRate = rType === "per_hour" ? Number(((hCost * dur) / 60).toFixed(2)) : lCost;

      let subExpectedRev = 0;
      let subExpectedLessons = 0;
      let formula = "";

      if (bType === "monthly") {
        subExpectedRev = Math.max(0, sub.monthlyCost !== undefined ? sub.monthlyCost : (sub.lessonsPerMonth ? sub.lessonsPerMonth * lCost : lCost * 4));
        subExpectedLessons = sub.lessonsPerMonth || calendarLessonsCount || 4;
        formula = `اشتراك شهري: ${subExpectedRev} ج.م (${subExpectedLessons} حصص)`;
      } else if (bType === "monthly_fixed_lessons") {
        const pkgCount = sub.lessonsPerMonth || 8;
        subExpectedLessons = pkgCount;
        if (rType === "per_month") {
          subExpectedRev = Math.max(0, sub.monthlyCost !== undefined ? sub.monthlyCost : pkgCount * lCost);
          formula = `باقة (${pkgCount} حصص): ${subExpectedRev} ج.م`;
        } else {
          subExpectedRev = sub.monthlyCost !== undefined ? sub.monthlyCost : Number((pkgCount * effectiveLessonRate).toFixed(2));
          formula = `باقة (${pkgCount} حصص × ${effectiveLessonRate} ج.م) = ${subExpectedRev} ج.م`;
        }
      } else {
        // per_lesson or monthly_elapsed_lessons
        subExpectedLessons = calendarLessonsCount;
        subExpectedRev = Number((calendarLessonsCount * effectiveLessonRate).toFixed(2));
        formula = `وفق الجدول (${calendarLessonsCount} حصص × ${effectiveLessonRate} ج.م) = ${subExpectedRev} ج.م`;
      }

      totalExpectedRevenue += subExpectedRev;
      totalExpectedLessons += subExpectedLessons;

      breakdownBySubject.push({
        subject: sub.subject,
        billingType: bType,
        expectedRevenue: subExpectedRev,
        expectedLessons: subExpectedLessons,
        lessonCost: effectiveLessonRate,
        formula
      });
    });
  } else {
    // Single subject
    const bType: BillingType = student.billingType || "per_lesson";
    const rType: RateType = student.rateType || "per_lesson";
    const lCost = Math.max(0, student.lessonCost !== undefined ? student.lessonCost : 100);
    const hCost = Math.max(0, student.hourlyCost !== undefined ? student.hourlyCost : lCost);
    const dur = student.defaultDurationMinutes || 60;
    const effectiveLessonRate = rType === "per_hour" ? Number(((hCost * dur) / 60).toFixed(2)) : lCost;

    if (bType === "monthly") {
      totalExpectedRevenue = Math.max(0, student.monthlyCost !== undefined ? student.monthlyCost : (student.lessonsPerMonth ? student.lessonsPerMonth * lCost : lCost * 4));
      totalExpectedLessons = student.lessonsPerMonth || calendarLessonsCount || 4;
    } else if (bType === "monthly_fixed_lessons") {
      const pkgCount = student.lessonsPerMonth || 8;
      totalExpectedLessons = pkgCount;
      if (rType === "per_month") {
        totalExpectedRevenue = Math.max(0, student.monthlyCost !== undefined ? student.monthlyCost : pkgCount * lCost);
      } else {
        totalExpectedRevenue = student.monthlyCost !== undefined ? student.monthlyCost : Number((pkgCount * effectiveLessonRate).toFixed(2));
      }
    } else {
      // per_lesson or monthly_elapsed_lessons
      totalExpectedLessons = calendarLessonsCount;
      totalExpectedRevenue = Number((calendarLessonsCount * effectiveLessonRate).toFixed(2));
    }
  }

  totalExpectedRevenue = Number(totalExpectedRevenue.toFixed(2));

  // Schedule Summary Label
  let scheduleSummary = "";
  if (scheduledDays.length > 0) {
    scheduleSummary = `${scheduledDays.join(" و ")} (${calendarLessonsCount} حصص هذا الشهر)`;
  } else if (student.lessonsPerMonth) {
    scheduleSummary = `باقة ${student.lessonsPerMonth} حصة شهرياً`;
  } else {
    scheduleSummary = `4 حصص شهرياً (الافتراضي)`;
  }

  const rootBillingType: BillingType = student.billingType || (student.subjects && student.subjects[0]?.billingType) || "per_lesson";
  const rootRateType: RateType = student.rateType || (student.subjects && student.subjects[0]?.rateType) || "per_lesson";

  let formulaDescription = "";
  if (rootBillingType === "monthly") {
    formulaDescription = `اشتراك شهري ثابت (${totalExpectedRevenue} ج.م/شهر)`;
  } else if (rootBillingType === "monthly_fixed_lessons") {
    formulaDescription = `باقة ${totalExpectedLessons} حصص = ${totalExpectedRevenue} ج.م`;
  } else {
    formulaDescription = `${totalExpectedLessons} حصص مجدولة × ${student.lessonCost || 100} ج.م = ${totalExpectedRevenue} ج.م`;
  }

  const remainingExpectedToCollect = Math.max(0, Number((totalExpectedRevenue - actualPaidThisMonth).toFixed(2)));
  const collectionProgressPercent = totalExpectedRevenue > 0
    ? Math.min(100, Math.round((actualPaidThisMonth / totalExpectedRevenue) * 100))
    : 100;

  return {
    studentId: student.id,
    expectedMonthlyRevenue: totalExpectedRevenue,
    expectedLessonsCount: totalExpectedLessons,
    actualPaidThisMonth,
    actualAttendedThisMonth,
    remainingExpectedToCollect,
    collectionProgressPercent,
    billingType: rootBillingType,
    rateType: rootRateType,
    scheduleSummary,
    formulaDescription,
    breakdownBySubject
  };
}

/**
 * Calculates total expected monthly revenue aggregated across all active students
 */
export function calculateTotalExpectedMonthlyRevenue(
  students: Student[] = [],
  groups: Group[] = [],
  privateLessons: PrivateLesson[] = [],
  paymentTransactions: PaymentTransaction[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  targetDate: Date = new Date()
): ExpectedMonthlyRevenueSummary {
  const activeStudents = students.filter(s => s.status === "active");
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const englishMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthNameAr = `${arabicMonths[month - 1]} ${year}`;
  const monthNameEn = `${englishMonths[month - 1]} ${year}`;

  let totalExpectedRevenue = 0;
  let totalActualCollectedThisMonth = 0;
  let totalEarnedRevenueThisMonth = 0;
  let totalExpectedLessons = 0;
  let totalAttendedThisMonth = 0;

  const currentMonthStr = `${year}-${String(month).padStart(2, "0")}`;

  const byBillingType = {
    monthly: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, earnedThisMonth: 0 },
    monthly_fixed_lessons: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, earnedThisMonth: 0, totalLessons: 0 },
    per_lesson: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, earnedThisMonth: 0, totalLessons: 0 },
    monthly_elapsed_lessons: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, earnedThisMonth: 0, totalLessons: 0 }
  };

  const studentMap = new Map<string, StudentExpectedRevenueInfo>();

  activeStudents.forEach(st => {
    const info = calculateStudentExpectedMonthlyRevenue(
      st,
      groups,
      privateLessons,
      paymentTransactions,
      attendanceRecords,
      targetDate
    );

    studentMap.set(st.id, info);

    totalExpectedRevenue += info.expectedMonthlyRevenue;
    totalActualCollectedThisMonth += info.actualPaidThisMonth;
    totalExpectedLessons += info.expectedLessonsCount;
    totalAttendedThisMonth += info.actualAttendedThisMonth;

    // Calculate earned revenue for this student in target month (Accrual basis)
    let studentEarnedThisMonth = 0;
    const bType = info.billingType;
    if (bType === "monthly") {
      studentEarnedThisMonth = info.expectedMonthlyRevenue;
    } else {
      // Calculate value of lessons actually attended by student in target month
      const attendedRecordsThisMonth = attendanceRecords.filter(
        ar => ar.studentId === st.id && ar.date && ar.date.startsWith(currentMonthStr) && (ar.attendance === "present" || ar.deducted)
      );
      attendedRecordsThisMonth.forEach(ar => {
        const dur = ar.durationMinutes || st.defaultDurationMinutes || 60;
        const rType = st.rateType || "per_lesson";
        const lCost = st.lessonCost !== undefined ? st.lessonCost : 100;
        const hCost = st.hourlyCost !== undefined ? st.hourlyCost : lCost;
        const rate = rType === "per_hour" ? Number(((hCost * dur) / 60).toFixed(2)) : lCost;
        studentEarnedThisMonth += rate;
      });
    }

    studentEarnedThisMonth = Number(studentEarnedThisMonth.toFixed(2));
    totalEarnedRevenueThisMonth += studentEarnedThisMonth;

    if (byBillingType[bType]) {
      byBillingType[bType].expectedRevenue += info.expectedMonthlyRevenue;
      byBillingType[bType].studentsCount += 1;
      byBillingType[bType].collectedThisMonth += info.actualPaidThisMonth;
      byBillingType[bType].earnedThisMonth += studentEarnedThisMonth;
      if ("totalLessons" in byBillingType[bType]) {
        (byBillingType[bType] as any).totalLessons += info.expectedLessonsCount;
      }
    }
  });

  totalExpectedRevenue = Number(totalExpectedRevenue.toFixed(2));
  totalActualCollectedThisMonth = Number(totalActualCollectedThisMonth.toFixed(2));
  totalEarnedRevenueThisMonth = Number(totalEarnedRevenueThisMonth.toFixed(2));
  const totalRemainingToCollect = Math.max(0, Number((totalExpectedRevenue - totalActualCollectedThisMonth).toFixed(2)));
  const overallCollectionPercent = totalExpectedRevenue > 0
    ? Math.min(100, Math.round((totalActualCollectedThisMonth / totalExpectedRevenue) * 100))
    : 100;

  return {
    year,
    month,
    monthNameAr,
    monthNameEn,
    totalExpectedRevenue,
    totalActualCollectedThisMonth,
    totalEarnedRevenueThisMonth,
    totalRemainingToCollect,
    overallCollectionPercent,
    totalExpectedLessons,
    totalAttendedThisMonth,
    activeStudentsCount: activeStudents.length,
    byBillingType,
    studentMap
  };
}

/**
 * Calculates calendar months elapsed between a start date and current date (inclusive of start month, min 1)
 */
export function getElapsedMonths(startDateStr?: string): number {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return 1;
  
  const now = new Date();
  const yearDiff = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff + 1;
  return Math.max(1, totalMonths);
}

/**
 * 4 Financial States for Unified Collection:
 * 🟢 available_credit: رصيد متبقي (له رصيد فائض: المدفوع > قيمة الحصص أو الاشتراك)
 * 🔴 balance_due: مستحق عليه (المدفوع < قيمة الحصص أو الاشتراك)
 * 🟢 settled: مسدد بالكامل (المدفوع == قيمة الحصص أو الاشتراك، وأكبر من صفر)
 * ⚪ no_activity: لا توجد حركة (0 حصص/شهور و 0 مدفوع)
 */
export type FinancialStatusType = "available_credit" | "balance_due" | "settled" | "no_activity";

export interface FinancialStatusBadge {
  type: FinancialStatusType;
  labelAr: string;
  labelEn: string;
  dotColor: string;
  badgeBg: string;
}

export interface SubjectFinancialItem {
  id?: string;
  subjectId?: string;
  subjectName: string;
  studyType: StudyType;
  studyTypeLabel?: string;
  billingType: BillingType;
  rateType: RateType;
  isMonthly?: boolean;
  lessonCost: number;
  hourlyCost?: number;
  monthlyCost?: number;
  billedMonthsCount: number;
  attendedCount: number;
  totalTaughtHours: number;
  accruedCost: number;
  attendedCost?: number;
  paidAmount: number;
  amountDue: number;
  creditRemaining: number;
  status: FinancialStatusBadge;
}

export interface StudentFinancialProfile {
  student: Student;
  // Core Identifiers
  studentId: string;
  fullName: string;
  subjectName: string;
  studyTypeLabel: string;
  billingType: BillingType; // "per_lesson" | "monthly" | "monthly_elapsed_lessons" | "monthly_fixed_lessons"
  rateType: RateType; // سعر الحصة أو سعر الساعة أو سعر الشهر
  isMonthly: boolean;
  lessonCost: number;
  hourlyCost: number;
  defaultDurationMinutes: number;
  monthlyCost: number;
  billedMonthsCount: number; // عدد الشهور المحتسبة للاشتراك

  // Metrics: Lessons & Hours
  attendedLessonsCount: number; // عدد الحصص المنفذة فعلياً
  totalTaughtHours: number;     // إجمالي الساعات التدريسية المنفذة
  attendedLessonsCost: number;  // إجمالي القيمة المحسوبة (إما بالحصة أو بالساعة أو بالاشتراك الشهري)
  totalPaidAmount: number;      // إجمالي المدفوعات المسددة
  
  // Balance calculations:
  netDifference: number;        // totalPaidAmount - attendedLessonsCost
  creditRemaining: number;      // الرصيد المتبقي (إذا كان موجب)
  amountDue: number;            // المبلغ المستحق (إذا كان سالب)

  // Financial Status Badge
  status: FinancialStatusBadge;

  // Breakdown per subject (for multi-subject students)
  subjectBreakdown?: SubjectFinancialItem[];

  // Expected Monthly Revenue Details for current month
  expectedRevenueInfo?: StudentExpectedRevenueInfo;

  // Detailed ledger statements
  attendanceHistory: AttendanceRecord[];
  paymentHistory: PaymentTransaction[];

  // Explanations
  explanationAr: string;
  explanationEn: string;
}

/**
 * Helper to determine Financial Status Badge
 */
export function getFinancialStatus(
  activityCount: number,
  totalAccruedCost: number,
  totalPaidAmount: number
): FinancialStatusBadge {
  if (activityCount === 0 && totalAccruedCost === 0 && totalPaidAmount === 0) {
    return {
      type: "no_activity",
      labelAr: "لا توجد حركة",
      labelEn: "No Activity",
      dotColor: "bg-slate-400",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-300"
    };
  }

  const net = totalPaidAmount - totalAccruedCost;

  if (net < 0) {
    const due = Math.abs(net);
    return {
      type: "balance_due",
      labelAr: `مستحق عليه: ${due} ج.م`,
      labelEn: `Due: ${due} EGP`,
      dotColor: "bg-rose-500",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200"
    };
  }

  if (net > 0) {
    return {
      type: "available_credit",
      labelAr: `رصيد متبقي: +${net} ج.م`,
      labelEn: `Credit: +${net} EGP`,
      dotColor: "bg-emerald-500",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
    };
  }

  // net === 0
  return {
    type: "settled",
    labelAr: "مسدد بالكامل",
    labelEn: "Fully Settled",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
  };
}

/**
 * Calculates financial profile for a single student adhering to:
 * 1. إذا كان نظام المحاسبة "اشتراك شهري كامل" (monthly):
 *    - يحسب الشهر كاملاً ثابتاً سواء حضر الطالب الحصص أو غاب
 *    - إجمالي القيمة المستحقة = عدد الشهور المحتسبة × قيمة الاشتراك الشهري
 * 2. إذا كان نظام المحاسبة "بالحصة" (per_lesson):
 *    - قيمة الحصص المنفذة = عدد الحصص المنفذة من سجل الحضور × سعر الحصة
 * 3. إجمالي المدفوعات = مجموع كافة الدفعات المسجلة للطالب
 * 4. الرصيد = المدفوع - المستحق (موجب = رصيد، سالب = مستحق)
 */
/**
 * Sanitizes and auto-corrects student financial fields.
 * Fixes any existing legacy student record where hourly rate was set or where
 * rateType is "per_hour" but lessonCost was stored incorrectly as full hour price.
 */
export function sanitizeStudent(rawStudent: Student): Student {
  if (!rawStudent) return rawStudent;

  const defaultDuration = rawStudent.defaultDurationMinutes || (rawStudent.subjects && rawStudent.subjects[0]?.defaultDurationMinutes) || 60;
  const rootBillingType: BillingType = rawStudent.billingType || (rawStudent.subjects && rawStudent.subjects[0]?.billingType) || "monthly_elapsed_lessons";

  let sanitizedSubjects = rawStudent.subjects;
  if (sanitizedSubjects && sanitizedSubjects.length > 0) {
    sanitizedSubjects = sanitizedSubjects.map((sub, idx) => {
      const dur = sub.defaultDurationMinutes || defaultDuration || 60;
      const rType: RateType = sub.rateType === "per_hour" ? "per_hour" : "per_lesson";
      const bType: BillingType = sub.billingType || rootBillingType || "monthly_elapsed_lessons";
      
      // If primary subject, also consider rawStudent root values if they were updated directly
      let lCost = sub.lessonCost !== undefined ? Number(sub.lessonCost) : (idx === 0 && rawStudent.lessonCost !== undefined ? Number(rawStudent.lessonCost) : 100);
      let hCost = sub.hourlyCost !== undefined ? Number(sub.hourlyCost) : (idx === 0 && rawStudent.hourlyCost !== undefined ? Number(rawStudent.hourlyCost) : lCost);

      if (rType === "per_hour") {
        lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
      } else {
        hCost = Math.max(0, Number(((lCost / dur) * 60).toFixed(2)));
      }

      const mCost = sub.monthlyCost !== undefined
        ? Number(sub.monthlyCost)
        : (idx === 0 && rawStudent.monthlyCost !== undefined ? Number(rawStudent.monthlyCost) : (bType === "monthly" ? 400 : 0));

      const lPerMonth = sub.lessonsPerMonth !== undefined
        ? Number(sub.lessonsPerMonth)
        : (idx === 0 && rawStudent.lessonsPerMonth !== undefined ? Number(rawStudent.lessonsPerMonth) : 8);

      return {
        ...sub,
        billingType: bType,
        defaultDurationMinutes: dur,
        rateType: rType,
        hourlyCost: hCost,
        lessonCost: lCost,
        monthlyCost: mCost,
        lessonsPerMonth: lPerMonth
      };
    });
  }

  const primarySub = sanitizedSubjects && sanitizedSubjects.length > 0 ? sanitizedSubjects[0] : null;

  const rateType: RateType = primarySub 
    ? primarySub.rateType!
    : (rawStudent.rateType === "per_hour" ? "per_hour" : "per_lesson");

  const billingType: BillingType = primarySub
    ? (primarySub.billingType || rootBillingType)
    : rootBillingType;

  const defaultDurationMinutes = primarySub ? primarySub.defaultDurationMinutes! : defaultDuration;
  const lessonCost = primarySub ? primarySub.lessonCost : (rawStudent.lessonCost !== undefined ? Number(rawStudent.lessonCost) : 100);
  const hourlyCost = primarySub ? primarySub.hourlyCost : (rawStudent.hourlyCost !== undefined ? Number(rawStudent.hourlyCost) : lessonCost);
  const monthlyCost = primarySub ? (primarySub.monthlyCost ?? 0) : (rawStudent.monthlyCost !== undefined ? Number(rawStudent.monthlyCost) : (billingType === "monthly" ? 400 : 0));
  const lessonsPerMonth = primarySub ? (primarySub.lessonsPerMonth || 8) : (rawStudent.lessonsPerMonth || 8);

  return {
    ...rawStudent,
    billingType,
    defaultDurationMinutes,
    rateType,
    hourlyCost,
    lessonCost,
    monthlyCost,
    lessonsPerMonth,
    subjects: sanitizedSubjects
  };
}

// Normalize Arabic text for robust fuzzy name matching (handling alef, taa marbuta, yaa, diacritics, spaces)
export function normalizeArabicText(text?: string): string {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove harakat/tashkeel
    .replace(/\s+/g, " ");
}

// Helper to check if an attendance record represents an attended or deducted lesson
export function isAttendedOrDeductedRecord(ar: AttendanceRecord): boolean {
  if (!ar) return false;
  if (ar.deducted === true) return true;
  const status = (ar.attendance || "").toString().trim().toLowerCase();
  // If explicitly marked as absent, cancelled, or excused without deduction, ignore
  if (
    status === "absent" ||
    status === "غائب" ||
    status === "غياب" ||
    status === "cancelled" ||
    status === "ملغي" ||
    status === "excused" ||
    status === "معتذر"
  ) {
    return false;
  }
  // Attended statuses
  return (
    status === "present" ||
    status === "late" ||
    status === "attended" ||
    status === "حاضر" ||
    status === "متأخر" ||
    status === "حضور"
  );
}

// Helper to check if record belongs to student by ID or exact Name
export function matchesStudentRecord(
  rec: { studentId?: string; studentName?: string },
  student: Student
): boolean {
  if (!rec || !student) return false;
  const sId = String(student.id || "").trim();
  const rId = String(rec.studentId || "").trim();

  // If record has an explicit valid student ID, strictly compare ID
  if (rId && rId !== "group" && rId !== "all") {
    return sId === rId;
  }

  // If record has no valid ID, only match if normalized full name is exact match
  const sName = normalizeArabicText(student.fullName);
  const rName = normalizeArabicText(rec.studentName);
  if (sName && rName && rName !== "المجموعة" && rName !== "مجموعة") {
    return sName === rName;
  }

  return false;
}

export function calculateStudentFinancialProfile(
  rawStudent: Student,
  attendanceRecords: AttendanceRecord[] = [],
  paymentTransactions: PaymentTransaction[] = [],
  groups: Group[] = [],
  privateLessons: PrivateLesson[] = [],
  reports: GeneratedReport[] = []
): StudentFinancialProfile {
  const student = sanitizeStudent(rawStudent);

  // Active Cycle Isolation:
  // When a month/package ends and is archived, only newly executed lessons and reports in the active cycle appear.
  // Past archived cycles/reports/attendance are completely excluded from active counts and finances.
  const activeCycle = getActiveCycleInfo(student);
  const cycleStartDate = activeCycle.startDate;

  // Load saved reports if not directly provided
  const effectiveReports = (Array.isArray(reports) && reports.length > 0)
    ? reports
    : (typeof window !== "undefined" ? StorageEngine.getReports() : []);

  // Collect all archived report identifiers to eliminate ghost attendance records
  const archivedReportIds = new Set<string>();
  const archivedLessonIds = new Set<string>();
  const archivedDateSubjKeys = new Set<string>();
  const activeDateSubjKeys = new Set<string>();

  effectiveReports.forEach(r => {
    if (!r || !matchesStudentRecord(r, student) || r.reportType === "monthly_comprehensive") return;
    const rDate = r.date || (r.createdAt ? r.createdAt.slice(0, 10) : "");
    const isArchived = r.archived === true || Boolean(cycleStartDate && rDate && rDate < cycleStartDate);
    if (isArchived) {
      if (r.id) archivedReportIds.add(r.id);
      if (r.lessonId) archivedLessonIds.add(r.lessonId);
      if (rDate) {
        archivedDateSubjKeys.add(`${rDate}_${normalizeArabicText(r.subject || "")}`);
        archivedDateSubjKeys.add(`${rDate}_all`);
      }
    } else if (rDate) {
      activeDateSubjKeys.add(`${rDate}_${normalizeArabicText(r.subject || "")}`);
      activeDateSubjKeys.add(`${rDate}_all`);
    }
  });

  // Filter student-specific attendance records for the active cycle (strictly excluding archived)
  const studentAttendance = attendanceRecords.filter(ar => {
    if (!ar || !matchesStudentRecord(ar, student) || !isAttendedOrDeductedRecord(ar)) return false;
    if ((ar as any).archived === true) return false;
    const arDate = ar.date ? ar.date.slice(0, 10) : "";
    if (cycleStartDate && arDate && arDate < cycleStartDate) return false;

    // Exclude if linked to an archived report
    if (ar.id && archivedReportIds.has(ar.id)) return false;
    if (ar.lessonId && archivedLessonIds.has(ar.lessonId)) return false;
    if (arDate) {
      const arKey = `${arDate}_${normalizeArabicText(ar.subject || "")}`;
      const hasActiveOnSameDate = activeDateSubjKeys.has(arKey) || activeDateSubjKeys.has(`${arDate}_all`);
      if (!hasActiveOnSameDate && (archivedDateSubjKeys.has(arKey) || archivedDateSubjKeys.has(`${arDate}_all`))) {
        return false;
      }
    }

    return true;
  });

  // Filter student-specific daily saved reports for the active cycle (strictly excluding archived)
  const studentReports = effectiveReports.filter(r => {
    if (!r || !matchesStudentRecord(r, student) || r.reportType === "monthly_comprehensive") return false;
    if (r.archived === true) return false;
    const rDate = r.date || (r.createdAt ? r.createdAt.slice(0, 10) : "");
    if (cycleStartDate && rDate && rDate < cycleStartDate) return false;
    const attStr = (r.attendance || "").toString().trim().toLowerCase();
    return (
      attStr !== "absent" &&
      attStr !== "غائب" &&
      attStr !== "غياب" &&
      attStr !== "cancelled" &&
      attStr !== "ملغي" &&
      attStr !== "excused" &&
      attStr !== "معتذر"
    );
  });

  // Filter student-specific payments for the active cycle
  const studentPayments = paymentTransactions.filter(pt => {
    if (!pt || !matchesStudentRecord(pt, student)) return false;
    const ptDate = pt.date ? pt.date.slice(0, 10) : "";
    if (cycleStartDate && ptDate && ptDate < cycleStartDate) return false;
    return true;
  });

  const defaultDurationMinutes = student.defaultDurationMinutes || (student.subjects && student.subjects[0]?.defaultDurationMinutes) || 60;

  // Helper to resolve exact record duration
  const getRecordDur = (rec: { durationMinutes?: number; lessonDuration?: string }, fallbackDur: number): number => {
    if (rec.durationMinutes && rec.durationMinutes > 0) return rec.durationMinutes;
    if (rec.lessonDuration) {
      const match = rec.lessonDuration.match(/(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > 0) return parsed;
      }
    }
    return fallbackDur;
  };

  // Build unified deduplicated list of student's actual attended lesson sessions
  interface UnifiedLessonSession {
    id: string;
    date: string;
    lessonId?: string;
    lessonNumber?: number;
    subject?: string;
    durationMinutes: number;
    billedCost?: number;
    source: "attendance" | "report";
  }

  const sessionMap = new Map<string, UnifiedLessonSession>();

  // Add from attendance records (each distinct attendance record is an independent session)
  studentAttendance.forEach(ar => {
    const key = `att_${ar.id || `${ar.date}_${ar.lessonId || ""}_${ar.subject || ""}`}`;
    const dur = getRecordDur(ar, defaultDurationMinutes);
    sessionMap.set(key, {
      id: ar.id,
      date: ar.date || "",
      lessonId: ar.lessonId,
      lessonNumber: ar.lessonNumber,
      subject: ar.subject,
      durationMinutes: dur,
      billedCost: ar.billedCost,
      source: "attendance"
    });
  });

  // Add from saved daily reports ONLY if not already represented by an existing attendance record
  studentReports.forEach(r => {
    const rDate = r.date || (r.createdAt ? r.createdAt.split("T")[0] : "");
    const rSubjectNorm = normalizeArabicText(r.subject || "");

    // Check if there is already a matching attendance record for this exact session
    const isAlreadyCovered = Array.from(sessionMap.values()).some(existing => {
      if (existing.source !== "attendance") return false;
      if (r.id && existing.id === r.id) return true;
      if (r.lessonId && existing.lessonId && r.lessonId === existing.lessonId) return true;
      const sameDate = existing.date === rDate;
      const sameSubj = !existing.subject || !r.subject || normalizeArabicText(existing.subject) === rSubjectNorm;
      const sameLessonNum = !r.lessonNumber || !existing.lessonNumber || existing.lessonNumber === r.lessonNumber;
      return sameDate && sameSubj && sameLessonNum;
    });

    if (!isAlreadyCovered) {
      const dur = getRecordDur(r, defaultDurationMinutes);
      const key = `rep_${r.id || `${rDate}_${r.lessonNumber || ""}_${r.subject || ""}`}`;
      sessionMap.set(key, {
        id: r.id,
        date: rDate,
        lessonId: r.lessonId,
        lessonNumber: r.lessonNumber,
        subject: r.subject,
        durationMinutes: dur,
        source: "report"
      });
    }
  });

  const uniqueSessions = Array.from(sessionMap.values());

  // Real attended lessons count: exactly the count of unique attended/reported lessons
  let attendedLessonsCount = uniqueSessions.length;
  if (attendedLessonsCount === 0 && (student.totalAttendedLessons || 0) > 0 && attendanceRecords.length === 0 && effectiveReports.length === 0) {
    attendedLessonsCount = student.totalAttendedLessons || 0;
  }

  // Calculate total taught hours from unique sessions
  let totalTaughtMinutes = 0;
  if (uniqueSessions.length > 0) {
    totalTaughtMinutes = uniqueSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  } else {
    totalTaughtMinutes = attendedLessonsCount * defaultDurationMinutes;
  }

  const totalExactHours = totalTaughtMinutes / 60;
  let totalTaughtHours = Number(totalExactHours.toFixed(2));

  // Sum of all payments in the active cycle
  const sumOfTransactions = studentPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPaidAmount = student.currentCycleStartDate
    ? sumOfTransactions
    : Math.max(sumOfTransactions, student.totalPaidAmount || 0);

  // Determine Billing Type & Rate Type
  const billingType: BillingType = student.billingType || (student.subjects && student.subjects[0]?.billingType) || "per_lesson";
  const rateType: RateType = student.rateType || (student.subjects && student.subjects[0]?.rateType) || "per_lesson";
  const isMonthly = billingType === "monthly";

  const rawLessonCost = Math.max(0, student.lessonCost !== undefined ? student.lessonCost : 100);
  const hourlyCost = Math.max(0, student.hourlyCost !== undefined ? student.hourlyCost : rawLessonCost);
  const lessonCost = rateType === "per_hour"
    ? Number(((hourlyCost * defaultDurationMinutes) / 60).toFixed(2))
    : rawLessonCost;

  const monthlyCost = Math.max(0, student.monthlyCost !== undefined ? student.monthlyCost : (student.lessonsPerMonth ? student.lessonsPerMonth * lessonCost : lessonCost * 4));

  const defaultElapsedMonths = student.currentCycleStartDate
    ? getElapsedMonths(student.currentCycleStartDate)
    : getElapsedMonths(student.subscriptionStartDate || student.createdAt);
  const billedMonthsCount = Math.max(1, student.customBilledMonths || defaultElapsedMonths);

  let attendedLessonsCost = 0;
  let subjectBreakdown: SubjectFinancialItem[] | undefined = undefined;

  // Handle Multi-subject breakdown if defined
  if (student.subjects && student.subjects.length > 0) {
    subjectBreakdown = student.subjects.map((subj, idx) => {
      const subBilling = subj.billingType || "per_lesson";
      const subRateType = subj.rateType || "per_lesson";
      const subDefaultDuration = subj.defaultDurationMinutes || defaultDurationMinutes;
      const subRawLessonCost = Math.max(0, subj.lessonCost !== undefined ? subj.lessonCost : 100);
      const subHourlyCost = Math.max(0, subj.hourlyCost !== undefined ? subj.hourlyCost : subRawLessonCost);
      const subLessonCost = subRateType === "per_hour"
        ? Number(((subHourlyCost * subDefaultDuration) / 60).toFixed(2))
        : subRawLessonCost;

      const subMonthlyCost = Math.max(0, subj.monthlyCost !== undefined ? subj.monthlyCost : (subj.lessonsPerMonth ? subj.lessonsPerMonth * subLessonCost : subLessonCost * 4));
      const subMonths = Math.max(1, subj.customBilledMonths || billedMonthsCount);

      const subjSessions = uniqueSessions.filter(s => {
        if (student.subjects?.length === 1) return true;
        if (!s.subject || !s.subject.trim()) {
          return idx === 0;
        }
        if (!subj.subject || !subj.subject.trim()) {
          return idx === 0;
        }
        return normalizeArabicText(s.subject) === normalizeArabicText(subj.subject);
      });
      const count = subjSessions.length;

      const subMinutes = subjSessions.reduce((m, s) => m + s.durationMinutes, 0);
      const subExactHours = subMinutes / 60;
      const subHours = Number(subExactHours.toFixed(2));

      let subAccrued = 0;
      if (subBilling === "monthly") {
        subAccrued = subMonths * subMonthlyCost;
      } else if (subBilling === "monthly_fixed_lessons") {
        const pkgLessons = subj.lessonsPerMonth || 8;
        const effRate = subj.monthlyCost !== undefined ? (subj.monthlyCost / pkgLessons) : (subRateType === "per_hour" ? Number(((subHourlyCost * (subj.defaultDurationMinutes || 60)) / 60).toFixed(2)) : subLessonCost);
        subAccrued = Number((count * effRate).toFixed(2));
      } else {
        const hasCustomBilled = subjSessions.some(s => s.billedCost !== undefined && s.billedCost !== null);
        if (hasCustomBilled) {
          let sumRecords = 0;
          subjSessions.forEach(s => {
            if (s.billedCost !== undefined && s.billedCost !== null) {
              sumRecords += Number(s.billedCost);
            } else {
              sumRecords += subRateType === "per_hour" ? Number(((s.durationMinutes / 60) * subHourlyCost).toFixed(2)) : subLessonCost;
            }
          });
          subAccrued = Number(sumRecords.toFixed(2));
        } else {
          if (subRateType === "per_hour") {
            subAccrued = Number((subExactHours * subHourlyCost).toFixed(2));
          } else {
            subAccrued = Number((count * subLessonCost).toFixed(2));
          }
        }
      }

      // Calculate paid amount for this subject from payments and/or subject record
      let subPaid = 0;
      let hasExplicitPayments = false;
      studentPayments.forEach(p => {
        if (p.subjectAllocations && p.subjectAllocations.length > 0) {
          const alloc = p.subjectAllocations.find(a => (a.subjectId && a.subjectId === subj.id) || (a.subjectName && subj.subject && a.subjectName.trim().toLowerCase() === subj.subject.trim().toLowerCase()));
          if (alloc) {
            subPaid += alloc.amount;
            hasExplicitPayments = true;
          }
        } else if (p.subject && subj.subject && p.subject.trim().toLowerCase() === subj.subject.trim().toLowerCase()) {
          subPaid += p.amount;
          hasExplicitPayments = true;
        }
      });

      if (!hasExplicitPayments && subj.totalPaidAmount !== undefined && subj.totalPaidAmount > 0) {
        subPaid = subj.totalPaidAmount;
      }

      const subNet = Number((subPaid - subAccrued).toFixed(2));
      const subDue = subNet < 0 ? Math.abs(subNet) : 0;
      const subCredit = subNet > 0 ? subNet : 0;
      const subStatus = getFinancialStatus(subBilling === "monthly" ? subMonths : count, subAccrued, subPaid);

      return {
        id: subj.id,
        subjectId: subj.id,
        subjectName: subj.subject,
        studyType: subj.studyType || "group",
        studyTypeLabel: subj.studyType === "group" ? "مجموعة" : "خاص",
        billingType: subBilling,
        rateType: subRateType,
        isMonthly: subBilling === "monthly" || subBilling === "monthly_fixed_lessons",
        lessonCost: subLessonCost,
        hourlyCost: subHourlyCost,
        monthlyCost: subMonthlyCost,
        billedMonthsCount: subMonths,
        attendedCount: count,
        totalTaughtHours: subHours,
        accruedCost: Number(subAccrued.toFixed(2)),
        attendedCost: Number(subAccrued.toFixed(2)),
        paidAmount: Number(subPaid.toFixed(2)),
        amountDue: subDue,
        creditRemaining: subCredit,
        status: subStatus
      };
    });

    attendedLessonsCost = subjectBreakdown.reduce((sum, item) => sum + item.accruedCost, 0);
    
    // Ensure top-level attended count and total hours accurately reflect all subjects
    const totalSubjectAttended = subjectBreakdown.reduce((sum, item) => sum + item.attendedCount, 0);
    const totalSubjectHours = Number(subjectBreakdown.reduce((sum, item) => sum + item.totalTaughtHours, 0).toFixed(2));
    attendedLessonsCount = totalSubjectAttended;
    totalTaughtHours = totalSubjectHours;
  } else {
    // Single subject
    if (billingType === "monthly") {
      // Monthly Flat Subscription
      attendedLessonsCost = Number((billedMonthsCount * monthlyCost).toFixed(2));
    } else if (billingType === "monthly_fixed_lessons") {
      // Monthly Fixed Lesson Package: Accrued cost is earned as lessons are attended
      const pkgLessons = student.lessonsPerMonth || 8;
      const effRate = student.monthlyCost !== undefined ? (student.monthlyCost / pkgLessons) : (rateType === "per_hour" ? Number(((hourlyCost * defaultDurationMinutes) / 60).toFixed(2)) : lessonCost);
      attendedLessonsCost = Number((attendedLessonsCount * effRate).toFixed(2));
    } else {
      // Per Lesson billing or calendar elapsed lessons
      const hasCustomBilled = uniqueSessions.some(s => s.billedCost !== undefined && s.billedCost !== null);
      if (hasCustomBilled) {
        let sumRecords = 0;
        uniqueSessions.forEach(s => {
          if (s.billedCost !== undefined && s.billedCost !== null) {
            sumRecords += Number(s.billedCost);
          } else {
            sumRecords += rateType === "per_hour" ? Number(((s.durationMinutes / 60) * hourlyCost).toFixed(2)) : lessonCost;
          }
        });
        attendedLessonsCost = Number(sumRecords.toFixed(2));
      } else {
        if (rateType === "per_hour") {
          attendedLessonsCost = Number((totalExactHours * hourlyCost).toFixed(2));
        } else {
          attendedLessonsCost = Number((attendedLessonsCount * lessonCost).toFixed(2));
        }
      }
    }
  }

  attendedLessonsCost = Number(attendedLessonsCost.toFixed(2));

  // Calculations
  const netDifference = Number((totalPaidAmount - attendedLessonsCost).toFixed(2));
  const creditRemaining = netDifference > 0 ? netDifference : 0;
  const amountDue = netDifference < 0 ? Math.abs(netDifference) : 0;

  // Status Badge
  const statusBadge = getFinancialStatus(
    isMonthly ? billedMonthsCount : attendedLessonsCount,
    attendedLessonsCost,
    totalPaidAmount
  );

  // Direct clear explanations
  let explanationAr = "";
  let explanationEn = "";

  const totalMinsFormatted = Math.round(totalExactHours * 60);
  const durationDescAr = totalMinsFormatted < 60
    ? `${totalMinsFormatted} دقيقة`
    : `${totalTaughtHours} ساعة (${totalMinsFormatted} دقيقة)`;

  const rateTypeLabelAr = rateType === "per_hour"
    ? `${hourlyCost} ج.م/ساعة (${lessonCost} ج.م/حصة)`
    : `${lessonCost} ج.م/حصة`;
  const rateTypeLabelEn = rateType === "per_hour"
    ? `${hourlyCost} EGP/hr (${lessonCost} EGP/lesson)`
    : `${lessonCost} EGP/lesson`;

  if (isMonthly) {
    if (totalPaidAmount === 0 && attendedLessonsCost === 0) {
      explanationAr = "نظام اشتراك شهري كامل (يحسب الشهر كاملاً سواء حضر أو غاب) - لا توجد حركة دفع حتى الآن.";
      explanationEn = "Full Monthly Subscription (flat fee regardless of attendance) - No payments recorded yet.";
    } else if (amountDue > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً سواء حضر أو غاب). المسدد: ${totalPaidAmount} ج.م. المبلغ المطلوب سداده: ${amountDue} ج.م. (حضر فعلياً: ${attendedLessonsCount} حصص • ${durationDescAr})`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Due: ${amountDue} EGP. (Attended: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    } else if (creditRemaining > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الرصيد الفائض المتبقي له: +${creditRemaining} ج.م. (حضر فعلياً: ${attendedLessonsCount} حصص • ${durationDescAr})`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Credit: +${creditRemaining} EGP. (Attended: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    } else {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الحساب مسدد بالكامل ومضبوط. (نفذ: ${attendedLessonsCount} حصص • ${durationDescAr})`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Fully settled. (Completed: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    }
  } else {
    // Per lesson or per hour
    if (attendedLessonsCount === 0 && totalPaidAmount === 0) {
      explanationAr = `نظام المحاسبة ${rateType === "per_hour" ? "بالساعة" : "بالحصة المنفذة"} (${rateTypeLabelAr}) - لم تسجل أي حصص حضور أو دفعات مالية للطالب حتى الآن.`;
      explanationEn = `Billing (${rateTypeLabelEn}) - No lessons or payments recorded yet.`;
    } else if (amountDue > 0) {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${durationDescAr}) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. المبلغ المستحق: ${amountDue} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${totalTaughtHours} hrs) totalling ${attendedLessonsCost} EGP (${rateTypeLabelEn}), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
    } else if (creditRemaining > 0) {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${durationDescAr}) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: +${creditRemaining} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${totalTaughtHours} hrs) totalling ${attendedLessonsCost} EGP, paid ${totalPaidAmount} EGP. Remaining credit: +${creditRemaining} EGP.`;
    } else {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${durationDescAr}) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. الحساب متوازن ومسدد بالكامل.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${totalTaughtHours} hrs) totalling ${attendedLessonsCost} EGP, paid ${totalPaidAmount} EGP. Fully settled.`;
    }
  }

  return {
    student,
    studentId: student.id,
    fullName: student.fullName,
    subjectName: student.subject,
    studyTypeLabel: student.studyType === "group" ? "مجموعة" : "خاص",
    billingType,
    rateType,
    isMonthly,
    lessonCost,
    hourlyCost,
    defaultDurationMinutes,
    monthlyCost,
    billedMonthsCount,
    attendedLessonsCount,
    totalTaughtHours,
    attendedLessonsCost,
    totalPaidAmount,
    netDifference,
    creditRemaining,
    amountDue,
    status: statusBadge,
    subjectBreakdown,
    expectedRevenueInfo: calculateStudentExpectedMonthlyRevenue(
      student,
      groups,
      privateLessons,
      paymentTransactions,
      attendanceRecords
    ),
    attendanceHistory: studentAttendance,
    paymentHistory: studentPayments,
    explanationAr,
    explanationEn
  };
}

/**
 * Unified Transaction Record for Central Transactions Log
 */
export interface CentralTransactionItem {
  id: string;
  type: "payment" | "lesson_attendance";
  date: string;
  studentId: string;
  studentName: string;
  subjectName: string;
  amount: number; // positive for payment, negative for attended lesson
  lessonCost?: number;
  lessonNumber?: number;
  descriptionAr: string;
  descriptionEn: string;
  notes?: string;
  subjectAllocations?: SubjectPaymentAllocation[];
}

export function buildCentralTransactionsLog(
  paymentTransactions: PaymentTransaction[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  students: Student[] = []
): CentralTransactionItem[] {
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  const items: CentralTransactionItem[] = [];

  // 1. Payments
  paymentTransactions.forEach(pt => {
    const student = studentMap.get(pt.studentId);
    let descAr = `سداد دفعة نقدية (+${pt.amount} ج.م)`;
    let descEn = `Payment (+${pt.amount} EGP)`;

    if (pt.subjectAllocations && pt.subjectAllocations.length > 0) {
      const allocSummary = pt.subjectAllocations.map(a => `${a.subjectName} (${a.amount} ج.م)`).join(" • ");
      descAr = `سداد دفعة موزعة: ${allocSummary}`;
      descEn = `Allocated Payment: ${allocSummary}`;
    } else if (pt.subject && pt.subject !== "عام") {
      descAr = `سداد دفعة لمادة ${pt.subject} (+${pt.amount} ج.م)`;
      descEn = `Payment for ${pt.subject} (+${pt.amount} EGP)`;
    }

    items.push({
      id: pt.id,
      type: "payment",
      date: pt.date,
      studentId: pt.studentId,
      studentName: pt.studentName || student?.fullName || "طالب",
      subjectName: pt.subject || student?.subject || "عام",
      amount: pt.amount,
      descriptionAr: descAr,
      descriptionEn: descEn,
      notes: pt.notes,
      subjectAllocations: pt.subjectAllocations
    });
  });

  // 2. Attended Lessons
  attendanceRecords.forEach(ar => {
    if (ar.attendance === "present" || ar.deducted) {
      const student = studentMap.get(ar.studentId);
      let cost = 100;
      if (ar.billedCost !== undefined && ar.billedCost !== null) {
        cost = Number(ar.billedCost);
      } else if (student) {
        const matchedSubj = student.subjects?.find(
          sp => ar.subject && sp.subject && normalizeArabicText(sp.subject) === normalizeArabicText(ar.subject)
        ) || student.subjects?.[0];
        const effRateType = matchedSubj?.rateType || student.rateType || "per_lesson";
        const effLessonCost = matchedSubj?.lessonCost ?? student.lessonCost ?? 100;
        const effHourlyCost = matchedSubj?.hourlyCost ?? student.hourlyCost ?? effLessonCost;
        const effDur = ar.durationMinutes || matchedSubj?.defaultDurationMinutes || student.defaultDurationMinutes || 60;
        cost = effRateType === "per_hour"
          ? Number(((effDur / 60) * effHourlyCost).toFixed(2))
          : effLessonCost;
      }
      items.push({
        id: ar.id,
        type: "lesson_attendance",
        date: ar.date,
        studentId: ar.studentId,
        studentName: ar.studentName || student?.fullName || "طالب",
        subjectName: ar.subject || student?.subject || "مادة",
        amount: -cost,
        lessonCost: cost,
        lessonNumber: ar.lessonNumber,
        descriptionAr: `تنفيذ واحتساب حصة حضور ${ar.lessonNumber ? `#${ar.lessonNumber}` : ""} (-${cost} ج.م)`,
        descriptionEn: `Lesson Attendance (-${cost} EGP)`,
        notes: ar.teacherNotes || (ar.attendance === "present" ? "حضور مؤكد" : "غياب مع احتساب الحصة")
      });
    }
  });

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
