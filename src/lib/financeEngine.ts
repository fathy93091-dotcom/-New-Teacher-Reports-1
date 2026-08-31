import {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  BillingType,
  RateType,
  StudyType,
  SubjectPaymentAllocation,
  Group,
  PrivateLesson,
  ScheduleSlot
} from "../types";

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
  expectedLessonsCount: number;
  actualPaidThisMonth: number;
  actualAttendedThisMonth: number;
  remainingExpectedToCollect: number;
  collectionProgressPercent: number;
  billingType: BillingType;
  rateType: RateType;
  scheduleSummary: string;
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
  totalRemainingToCollect: number;
  overallCollectionPercent: number;
  totalExpectedLessons: number;
  totalAttendedThisMonth: number;
  activeStudentsCount: number;
  byBillingType: {
    monthly: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number };
    monthly_fixed_lessons: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; totalLessons: number };
    per_lesson: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; totalLessons: number };
    monthly_elapsed_lessons: { expectedRevenue: number; studentsCount: number; collectedThisMonth: number; totalLessons: number };
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
  let totalExpectedLessons = 0;
  let totalAttendedThisMonth = 0;

  const byBillingType = {
    monthly: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0 },
    monthly_fixed_lessons: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, totalLessons: 0 },
    per_lesson: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, totalLessons: 0 },
    monthly_elapsed_lessons: { expectedRevenue: 0, studentsCount: 0, collectedThisMonth: 0, totalLessons: 0 }
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

    const bType = info.billingType;
    if (byBillingType[bType]) {
      byBillingType[bType].expectedRevenue += info.expectedMonthlyRevenue;
      byBillingType[bType].studentsCount += 1;
      byBillingType[bType].collectedThisMonth += info.actualPaidThisMonth;
      if ("totalLessons" in byBillingType[bType]) {
        (byBillingType[bType] as any).totalLessons += info.expectedLessonsCount;
      }
    }
  });

  totalExpectedRevenue = Number(totalExpectedRevenue.toFixed(2));
  totalActualCollectedThisMonth = Number(totalActualCollectedThisMonth.toFixed(2));
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
export function calculateStudentFinancialProfile(
  student: Student,
  attendanceRecords: AttendanceRecord[] = [],
  paymentTransactions: PaymentTransaction[] = [],
  groups: Group[] = [],
  privateLessons: PrivateLesson[] = []
): StudentFinancialProfile {
  // Filter student-specific attendance records
  const studentAttendance = attendanceRecords.filter(
    ar => ar.studentId === student.id && (ar.attendance === "present" || ar.deducted)
  );

  // Filter student-specific payments
  const studentPayments = paymentTransactions.filter(
    pt => pt.studentId === student.id
  );

  // Real attended lessons count
  const attendedLessonsCount = Math.max(studentAttendance.length, student.totalAttendedLessons || 0);

  // Calculate total taught hours from attendance durations or default
  const defaultDurationMinutes = student.defaultDurationMinutes || 60;
  const totalTaughtMinutes = studentAttendance.reduce(
    (sum, ar) => sum + (ar.durationMinutes && ar.durationMinutes > 0 ? ar.durationMinutes : defaultDurationMinutes),
    0
  );
  // If no detailed records but student has attendedLessonsCount, estimate hours using defaultDurationMinutes
  const totalTaughtHours = totalTaughtMinutes > 0
    ? Number((totalTaughtMinutes / 60).toFixed(1))
    : Number(((attendedLessonsCount * defaultDurationMinutes) / 60).toFixed(1));

  // Sum of all payments
  const sumOfTransactions = studentPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPaidAmount = Math.max(sumOfTransactions, student.totalPaidAmount || 0);

  // Determine Billing Type & Rate Type
  const billingType: BillingType = student.billingType || (student.subjects && student.subjects[0]?.billingType) || "per_lesson";
  const rateType: RateType = student.rateType || (student.subjects && student.subjects[0]?.rateType) || "per_lesson";
  const isMonthly = billingType === "monthly" || billingType === "monthly_fixed_lessons";

  const lessonCost = Math.max(0, student.lessonCost !== undefined ? student.lessonCost : 100);
  const hourlyCost = Math.max(0, student.hourlyCost !== undefined ? student.hourlyCost : lessonCost);
  const monthlyCost = Math.max(0, student.monthlyCost !== undefined ? student.monthlyCost : (student.lessonsPerMonth ? student.lessonsPerMonth * lessonCost : lessonCost * 4));

  const defaultElapsedMonths = getElapsedMonths(student.subscriptionStartDate || student.createdAt);
  const billedMonthsCount = Math.max(1, student.customBilledMonths || defaultElapsedMonths);

  let attendedLessonsCost = 0;
  let subjectBreakdown: SubjectFinancialItem[] | undefined = undefined;

  // Handle Multi-subject breakdown if defined
  if (student.subjects && student.subjects.length > 0) {
    subjectBreakdown = student.subjects.map(subj => {
      const subBilling = subj.billingType || "per_lesson";
      const subRateType = subj.rateType || "per_lesson";
      const subLessonCost = Math.max(0, subj.lessonCost !== undefined ? subj.lessonCost : 100);
      const subHourlyCost = Math.max(0, subj.hourlyCost !== undefined ? subj.hourlyCost : subLessonCost);
      const subMonthlyCost = Math.max(0, subj.monthlyCost !== undefined ? subj.monthlyCost : (subj.lessonsPerMonth ? subj.lessonsPerMonth * subLessonCost : subLessonCost * 4));
      const subMonths = Math.max(1, subj.customBilledMonths || billedMonthsCount);

      const subjAttendedRecords = attendanceRecords.filter(
        ar => ar.studentId === student.id && (ar.subject === subj.subject || (!ar.subject && student.subjects?.length === 1)) && (ar.attendance === "present" || ar.deducted)
      );
      const count = Math.max(subjAttendedRecords.length, subj.totalAttendedLessons || 0);

      const subMinutes = subjAttendedRecords.reduce((m, ar) => m + (ar.durationMinutes || subj.defaultDurationMinutes || 60), 0);
      const subHours = subMinutes > 0 ? Number((subMinutes / 60).toFixed(1)) : Number(((count * (subj.defaultDurationMinutes || 60)) / 60).toFixed(1));

      let subAccrued = 0;
      if (subBilling === "monthly") {
        subAccrued = subMonths * subMonthlyCost;
      } else if (subBilling === "monthly_fixed_lessons") {
        const pkgLessons = subj.lessonsPerMonth || 8;
        const pkgCost = subj.monthlyCost !== undefined ? subj.monthlyCost : (subRateType === "per_hour" ? pkgLessons * subHourlyCost : pkgLessons * subLessonCost);
        subAccrued = subMonths * pkgCost;
      } else {
        if (subRateType === "per_hour") {
          subAccrued = Number((subHours * subHourlyCost).toFixed(2));
        } else {
          subAccrued = Number((count * subLessonCost).toFixed(2));
        }
      }

      // Calculate paid amount for this subject from payments and/or subject record
      let subPaid = 0;
      let hasExplicitPayments = false;
      studentPayments.forEach(p => {
        if (p.subjectAllocations && p.subjectAllocations.length > 0) {
          const alloc = p.subjectAllocations.find(a => (a.subjectId && a.subjectId === subj.id) || a.subjectName === subj.subject);
          if (alloc) {
            subPaid += alloc.amount;
            hasExplicitPayments = true;
          }
        } else if (p.subject === subj.subject) {
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
  } else {
    // Single subject
    if (billingType === "monthly") {
      // Monthly Flat Subscription
      attendedLessonsCost = Number((billedMonthsCount * monthlyCost).toFixed(2));
    } else if (billingType === "monthly_fixed_lessons") {
      // Monthly Fixed Lesson Package
      const pkgLessons = student.lessonsPerMonth || 8;
      const pkgCost = student.monthlyCost !== undefined ? student.monthlyCost : (rateType === "per_hour" ? pkgLessons * hourlyCost : pkgLessons * lessonCost);
      attendedLessonsCost = Number((billedMonthsCount * pkgCost).toFixed(2));
    } else {
      // Per Lesson billing or calendar elapsed lessons
      if (rateType === "per_hour") {
        attendedLessonsCost = Number((totalTaughtHours * hourlyCost).toFixed(2));
      } else {
        attendedLessonsCost = Number((attendedLessonsCount * lessonCost).toFixed(2));
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

  const rateTypeLabelAr = rateType === "per_hour" ? `${hourlyCost} ج.م/ساعة` : `${lessonCost} ج.م/حصة`;
  const rateTypeLabelEn = rateType === "per_hour" ? `${hourlyCost} EGP/hr` : `${lessonCost} EGP/lesson`;

  if (isMonthly) {
    if (totalPaidAmount === 0 && attendedLessonsCost === 0) {
      explanationAr = "نظام اشتراك شهري كامل (يحسب الشهر كاملاً سواء حضر أو غاب) - لا توجد حركة دفع حتى الآن.";
      explanationEn = "Full Monthly Subscription (flat fee regardless of attendance) - No payments recorded yet.";
    } else if (amountDue > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً سواء حضر أو غاب). المسدد: ${totalPaidAmount} ج.م. المبلغ المطلوب سداده: ${amountDue} ج.م. (حضر فعلياً: ${attendedLessonsCount} حصص • ${totalTaughtHours} ساعة تدريسية)`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Due: ${amountDue} EGP. (Attended: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    } else if (creditRemaining > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الرصيد الفائض المتبقي له: +${creditRemaining} ج.م. (حضر فعلياً: ${attendedLessonsCount} حصص • ${totalTaughtHours} ساعة)`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Credit: +${creditRemaining} EGP. (Attended: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    } else {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الحساب مسدد بالكامل ومضبوط. (نفذ: ${attendedLessonsCount} حصص • ${totalTaughtHours} ساعة)`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Fully settled. (Completed: ${attendedLessonsCount} lessons • ${totalTaughtHours} hours)`;
    }
  } else {
    // Per lesson or per hour
    if (attendedLessonsCount === 0 && totalPaidAmount === 0) {
      explanationAr = `نظام المحاسبة ${rateType === "per_hour" ? "بالساعة" : "بالحصة المنفذة"} (${rateTypeLabelAr}) - لم تسجل أي حصص حضور أو دفعات مالية للطالب حتى الآن.`;
      explanationEn = `Billing (${rateTypeLabelEn}) - No lessons or payments recorded yet.`;
    } else if (amountDue > 0) {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${totalTaughtHours} ساعة تدريسية) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. المبلغ المستحق: ${amountDue} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${totalTaughtHours} hrs) totalling ${attendedLessonsCost} EGP (${rateTypeLabelEn}), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
    } else if (creditRemaining > 0) {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${totalTaughtHours} ساعة تدريسية) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: +${creditRemaining} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${totalTaughtHours} hrs) totalling ${attendedLessonsCost} EGP, paid ${totalPaidAmount} EGP. Remaining credit: +${creditRemaining} EGP.`;
    } else {
      explanationAr = `نفذ ${attendedLessonsCount} حصص (${totalTaughtHours} ساعة تدريسية) بقيمة إجمالية ${attendedLessonsCost} ج.م (${rateTypeLabelAr})، والمسدد ${totalPaidAmount} ج.م. الحساب متوازن ومسدد بالكامل.`;
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
      const cost = student?.lessonCost || 100;
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
