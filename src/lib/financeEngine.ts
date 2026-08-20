import {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  BillingType
} from "../types";

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

export interface StudentFinancialProfile {
  student: Student;
  // Core Identifiers
  studentId: string;
  fullName: string;
  subjectName: string;
  studyTypeLabel: string;
  billingType: BillingType; // "per_lesson" | "monthly"
  isMonthly: boolean;
  lessonCost: number;
  monthlyCost: number;
  billedMonthsCount: number; // عدد الشهور المحتسبة للاشتراك

  // Metrics
  attendedLessonsCount: number; // عدد الحصص المنفذة فعلياً
  attendedLessonsCost: number;  // إجمالي القيمة المحسوبة (إما بالحصة أو بالاشتراك الشهري الكامل)
  totalPaidAmount: number;      // إجمالي المدفوعات المسددة
  
  // Balance calculations:
  // إذا كانت المدفوعات أقل -> يظهر المبلغ المستحق
  // إذا كانت أكبر -> يظهر الرصيد المتبقي
  netDifference: number;        // totalPaidAmount - attendedLessonsCost
  creditRemaining: number;      // الرصيد المتبقي (إذا كان موجب)
  amountDue: number;            // المبلغ المستحق (إذا كان سالب)

  // Financial Status Badge
  status: FinancialStatusBadge;

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
  paymentTransactions: PaymentTransaction[] = []
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

  // Sum of all payments
  const sumOfTransactions = studentPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPaidAmount = Math.max(sumOfTransactions, student.totalPaidAmount || 0);

  // Determine Billing Type
  const isMonthly = student.billingType === "monthly" || (student.subjects && student.subjects.length > 0 && student.subjects.every(s => s.billingType === "monthly"));
  const billingType: BillingType = isMonthly ? "monthly" : "per_lesson";

  const lessonCost = Math.max(1, student.lessonCost || 100);
  const monthlyCost = Math.max(1, student.monthlyCost || student.lessonCost || 400);

  const defaultElapsedMonths = getElapsedMonths(student.subscriptionStartDate || student.createdAt);
  const billedMonthsCount = Math.max(1, student.customBilledMonths || defaultElapsedMonths);

  let attendedLessonsCost = 0;

  // Handle Multi-subject breakdown if defined
  if (student.subjects && student.subjects.length > 0) {
    attendedLessonsCost = student.subjects.reduce((sum, subj) => {
      if (subj.billingType === "monthly") {
        const subMonths = Math.max(1, subj.customBilledMonths || billedMonthsCount);
        const subCost = Math.max(1, subj.monthlyCost || subj.lessonCost || 400);
        return sum + (subMonths * subCost);
      } else {
        // Per lesson
        const subjAttended = attendanceRecords.filter(
          ar => ar.studentId === student.id && (ar.subject === subj.subject || (!ar.subject && student.subjects?.length === 1)) && (ar.attendance === "present" || ar.deducted)
        ).length;
        const count = Math.max(subjAttended, subj.totalAttendedLessons || (attendedLessonsCount / (student.subjects?.length || 1)));
        return sum + (Math.round(count) * (subj.lessonCost || 100));
      }
    }, 0);
  } else {
    // Single subject
    if (isMonthly) {
      // Monthly Subscription - flat fee per month regardless of attendance
      attendedLessonsCost = billedMonthsCount * monthlyCost;
    } else {
      // Per Lesson billing
      attendedLessonsCost = attendedLessonsCount * lessonCost;
    }
  }

  // Calculations
  const netDifference = totalPaidAmount - attendedLessonsCost;
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

  if (isMonthly) {
    if (totalPaidAmount === 0 && attendedLessonsCost === 0) {
      explanationAr = "نظام اشتراك شهري كامل (يحسب الشهر كاملاً سواء حضر أو غاب) - لا توجد حركة دفع حتى الآن.";
      explanationEn = "Full Monthly Subscription (flat fee regardless of attendance) - No payments recorded yet.";
    } else if (amountDue > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً سواء حضر أو غاب). المسدد: ${totalPaidAmount} ج.م. المبلغ المطلوب سداده: ${amountDue} ج.م. (حضر فعلياً: ${attendedLessonsCount} حصص)`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP (flat monthly fee). Paid: ${totalPaidAmount} EGP. Due: ${amountDue} EGP. (Attended: ${attendedLessonsCount} lessons)`;
    } else if (creditRemaining > 0) {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الرصيد الفائض المتبقي له: +${creditRemaining} ج.م.`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Credit: +${creditRemaining} EGP.`;
    } else {
      explanationAr = `نظام اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${attendedLessonsCost} ج.م (يحسب الشهر كاملاً). المسدد: ${totalPaidAmount} ج.م. الحساب مسدد بالكامل ومضبوط.`;
      explanationEn = `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${attendedLessonsCost} EGP. Paid: ${totalPaidAmount} EGP. Fully settled.`;
    }
  } else {
    // Per lesson
    if (attendedLessonsCount === 0 && totalPaidAmount === 0) {
      explanationAr = "نظام المحاسبة بالحصة المنفذة - لم تسجل أي حصص حضور أو دفعات مالية للطالب حتى الآن.";
      explanationEn = "Per-lesson billing - No lessons or payments recorded yet.";
    } else if (amountDue > 0) {
      explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م (${lessonCost} ج.م/حصة)، والمسدد ${totalPaidAmount} ج.م. المبلغ المستحق: ${amountDue} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP @ ${lessonCost}/lesson), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
    } else if (creditRemaining > 0) {
      explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م (${lessonCost} ج.م/حصة)، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: +${creditRemaining} ج.م.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), paid ${totalPaidAmount} EGP. Remaining credit: +${creditRemaining} EGP.`;
    } else {
      explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م (${lessonCost} ج.م/حصة)، والمسدد ${totalPaidAmount} ج.م. الحساب متوازن ومسدد بالكامل.`;
      explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), paid ${totalPaidAmount} EGP. Fully settled.`;
    }
  }

  return {
    student,
    studentId: student.id,
    fullName: student.fullName,
    subjectName: student.subject,
    studyTypeLabel: student.studyType === "group" ? "مجموعة" : "خاص",
    billingType,
    isMonthly,
    lessonCost,
    monthlyCost,
    billedMonthsCount,
    attendedLessonsCount,
    attendedLessonsCost,
    totalPaidAmount,
    netDifference,
    creditRemaining,
    amountDue,
    status: statusBadge,
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
    items.push({
      id: pt.id,
      type: "payment",
      date: pt.date,
      studentId: pt.studentId,
      studentName: pt.studentName || student?.fullName || "طالب",
      subjectName: student?.subject || "عام",
      amount: pt.amount,
      descriptionAr: `سداد دفعة نقدية (+${pt.amount} ج.م)`,
      descriptionEn: `Payment (+${pt.amount} EGP)`,
      notes: pt.notes
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
