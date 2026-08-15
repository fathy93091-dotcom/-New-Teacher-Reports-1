import {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  StudentSubjectPlan,
  SubscriptionType,
  PaymentPlan
} from "../types";

/**
 * 4 Financial States according to the requirements:
 * 🟢 available_credit: رصيد متاح (has positive credit balance)
 * 🟠 low_credit: رصيد منخفض (package with 1 lesson left, or low credit)
 * 🔴 balance_due: مستحق عليه (student owes money for attended lessons)
 * ⚪ no_activity: لا توجد حركة (0 attended, 0 paid, 0 due)
 */
export type FinancialStatusType = "available_credit" | "low_credit" | "balance_due" | "no_activity";

export interface FinancialStatusBadge {
  type: FinancialStatusType;
  labelAr: string;
  labelEn: string;
  dotColor: string; // e.g. 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-400'
  badgeBg: string;  // e.g. 'bg-emerald-50 text-emerald-800 border-emerald-200'
}

export interface StudentFinancialProfile {
  student: Student;
  // Core Identifiers & Setup
  studentId: string;
  fullName: string;
  subjectName: string;
  studyTypeLabel: string;
  subscriptionType: SubscriptionType;
  paymentPlan: PaymentPlan;
  lessonCost: number;

  // Auto-calculated Metrics strictly from attendance & payments
  attendedLessonsCount: number; // الحصص المستخدمة / المنفذة (من واقع الحضور فقط)
  attendedLessonsCost: number;  // قيمة الحصص = عدد الحصص المنفذة * سعر الحصة
  totalPaidAmount: number;      // إجمالي المدفوع
  
  // Balance calculations based on plan
  netDifference: number;        // totalPaidAmount - attendedLessonsCost
  creditRemaining: number;      // الرصيد المتاح (إذا كان موجب)
  amountDue: number;            // المستحق عليه (إذا كان سالب)
  remainingPackageLessons: number; // للحصص المتبقية بالباقة

  // Financial Status Badge
  status: FinancialStatusBadge;

  // Detailed ledger statements
  attendanceHistory: AttendanceRecord[];
  paymentHistory: PaymentTransaction[];

  // Helper labels
  planLabelAr: string;
  planLabelEn: string;
  systemTypeLabelAr: string;
  systemTypeLabelEn: string;
  explanationAr: string;
  explanationEn: string;
}

/**
 * Helper to determine Financial Status Badge
 */
export function getFinancialStatus(
  subscriptionType: SubscriptionType,
  paymentPlan: PaymentPlan,
  attendedLessons: number,
  totalPaid: number,
  attendedCost: number,
  remainingLessons: number
): FinancialStatusBadge {
  // Case 0: No activity
  if (attendedLessons === 0 && totalPaid === 0) {
    return {
      type: "no_activity",
      labelAr: "لا توجد حركة",
      labelEn: "No Activity",
      dotColor: "bg-slate-400",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-300"
    };
  }

  // Package Mode
  if (subscriptionType === "lessons_count") {
    if (remainingLessons > 1) {
      return {
        type: "available_credit",
        labelAr: `رصيد متاح (${remainingLessons} حصص)`,
        labelEn: `Credit (${remainingLessons} lss)`,
        dotColor: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
      };
    } else if (remainingLessons === 1) {
      return {
        type: "low_credit",
        labelAr: "رصيد منخفض (متبقي حصة واحدة)",
        labelEn: "Low Credit (1 lesson left)",
        dotColor: "bg-amber-500",
        badgeBg: "bg-amber-50 text-amber-800 border-amber-200"
      };
    } else {
      return {
        type: "balance_due",
        labelAr: "مستحق عليه (نفدت الباقة)",
        labelEn: "Balance Due (Package Expired)",
        dotColor: "bg-rose-500",
        badgeBg: "bg-rose-50 text-rose-800 border-rose-200"
      };
    }
  }

  // Monthly / Flexible Modes
  const net = totalPaid - attendedCost;

  if (paymentPlan === "end_of_month") {
    // مؤخر: قيمة الحصص - المدفوع = المستحق
    const due = attendedCost - totalPaid;
    if (due > 0) {
      return {
        type: "balance_due",
        labelAr: `مستحق عليه: ${due} ج.م`,
        labelEn: `Due: ${due} EGP`,
        dotColor: "bg-rose-500",
        badgeBg: "bg-rose-50 text-rose-800 border-rose-200"
      };
    } else if (due < 0) {
      return {
        type: "available_credit",
        labelAr: `رصيد متاح: +${Math.abs(due)} ج.م`,
        labelEn: `Credit: +${Math.abs(due)} EGP`,
        dotColor: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
      };
    } else {
      return {
        type: "available_credit",
        labelAr: "مسدد بالكامل",
        labelEn: "Fully Settled",
        dotColor: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
      };
    }
  }

  if (paymentPlan === "beginning_of_month") {
    // مقدم: المدفوع - قيمة الحصص = الرصيد
    if (net > 0) {
      return {
        type: "available_credit",
        labelAr: `رصيد متاح: +${net} ج.م`,
        labelEn: `Available Credit: +${net} EGP`,
        dotColor: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
      };
    } else if (net === 0) {
      return {
        type: totalPaid > 0 ? "available_credit" : "low_credit",
        labelAr: totalPaid > 0 ? "مسدد بالكامل" : "رصيد منخفض (بانتظار السداد)",
        labelEn: totalPaid > 0 ? "Settled" : "Low Credit (Awaiting)",
        dotColor: totalPaid > 0 ? "bg-emerald-500" : "bg-amber-500",
        badgeBg: totalPaid > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
      };
    } else {
      const due = Math.abs(net);
      return {
        type: "balance_due",
        labelAr: `مستحق عليه: ${due} ج.م`,
        labelEn: `Due: ${due} EGP`,
        dotColor: "bg-rose-500",
        badgeBg: "bg-rose-50 text-rose-800 border-rose-200"
      };
    }
  }

  // Mixed Plan (مختلط)
  if (net > 0) {
    return {
      type: "available_credit",
      labelAr: `رصيد متاح: +${net} ج.م`,
      labelEn: `Credit: +${net} EGP`,
      dotColor: "bg-emerald-500",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
    };
  } else if (net === 0) {
    return {
      type: totalPaid > 0 ? "available_credit" : "no_activity",
      labelAr: totalPaid > 0 ? "الحساب متوازن" : "لا توجد حركة",
      labelEn: totalPaid > 0 ? "Balanced" : "No Activity",
      dotColor: totalPaid > 0 ? "bg-emerald-500" : "bg-slate-400",
      badgeBg: totalPaid > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-300"
    };
  } else {
    const due = Math.abs(net);
    return {
      type: "balance_due",
      labelAr: `مستحق عليه: ${due} ج.م`,
      labelEn: `Due: ${due} EGP`,
      dotColor: "bg-rose-500",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200"
    };
  }
}

/**
 * Calculates financial profile for a single student strictly adhering to:
 * - Rule 10: Attended lessons come ONLY from Attendance records (no manual lesson input)
 * - Rule 9: Calculations rules (مؤخر / مقدم / مختلط)
 */
export function calculateStudentFinancialProfile(
  student: Student,
  attendanceRecords: AttendanceRecord[] = [],
  paymentTransactions: PaymentTransaction[] = []
): StudentFinancialProfile {
  // Filter student-specific records
  const studentAttendance = attendanceRecords.filter(
    ar => ar.studentId === student.id && (ar.attendance === "present" || ar.deducted)
  );

  const studentPayments = paymentTransactions.filter(
    pt => pt.studentId === student.id
  );

  // Lesson Cost
  const lessonCost = Math.max(1, student.lessonCost || 100);

  // Attended lessons count (Real attendance count from attendance system)
  // Fallback to student.totalAttendedLessons if greater (e.g. legacy migrated records)
  const attendedLessonsCount = Math.max(studentAttendance.length, student.totalAttendedLessons || 0);

  // Total Accrued Lesson Value
  const attendedLessonsCost = attendedLessonsCount * lessonCost;

  // Total Paid Amount (From payment transactions or student.totalPaidAmount)
  const sumOfTransactions = studentPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaidAmount = Math.max(sumOfTransactions, student.totalPaidAmount || 0);

  // Subscription & Plan
  const subscriptionType: SubscriptionType = student.subscriptionType || "monthly";
  const paymentPlan: PaymentPlan = student.paymentPlan || (subscriptionType === "lessons_count" ? "beginning_of_month" : "beginning_of_month");

  // Calculations
  const netDifference = totalPaidAmount - attendedLessonsCost;
  const creditRemaining = netDifference > 0 ? netDifference : 0;
  const amountDue = netDifference < 0 ? Math.abs(netDifference) : 0;

  // Package Remaining Lessons
  let remainingPackageLessons = 0;
  if (subscriptionType === "lessons_count") {
    if (student.remainingLessons !== undefined && student.remainingLessons >= 0) {
      remainingPackageLessons = student.remainingLessons;
    } else {
      const purchased = student.totalPurchasedLessons || Math.floor(totalPaidAmount / lessonCost) || 8;
      remainingPackageLessons = Math.max(0, purchased - attendedLessonsCount);
    }
  } else {
    remainingPackageLessons = creditRemaining > 0 ? Math.floor(creditRemaining / lessonCost) : 0;
  }

  // Badge determination
  const statusBadge = getFinancialStatus(
    subscriptionType,
    paymentPlan,
    attendedLessonsCount,
    totalPaidAmount,
    attendedLessonsCost,
    remainingPackageLessons
  );

  // Plan Labels
  let planLabelAr = "مقدم (أول الشهر)";
  let planLabelEn = "Prepaid";
  if (paymentPlan === "end_of_month") {
    planLabelAr = "مؤخر (نهاية الشهر)";
    planLabelEn = "Postpaid";
  } else if (paymentPlan === "mixed") {
    planLabelAr = "مختلط (مرن)";
    planLabelEn = "Mixed";
  }

  let systemTypeLabelAr = "اشتراك شهري";
  let systemTypeLabelEn = "Monthly Plan";
  if (subscriptionType === "lessons_count") {
    systemTypeLabelAr = "باقة حصص";
    systemTypeLabelEn = "Package Plan";
  }

  // Explanations
  const explanationAr =
    subscriptionType === "lessons_count"
      ? `نظام باقة حصص: حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م من المدفوع ${totalPaidAmount} ج.م (المتبقي: ${remainingPackageLessons} حصص).`
      : paymentPlan === "end_of_month"
      ? `نظام مؤخر: تم تنفيذ ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م، المسدد ${totalPaidAmount} ج.م، المستحق للدفع: ${amountDue} ج.م.`
      : paymentPlan === "beginning_of_month"
      ? `نظام مقدم: المسدد ${totalPaidAmount} ج.م، قيمة الحصص المنفذة ${attendedLessonsCost} ج.م (${attendedLessonsCount} حصص)، الرصيد المتاح: ${creditRemaining} ج.م.`
      : `نظام مختلط: المسدد ${totalPaidAmount} ج.م مقابل ${attendedLessonsCost} ج.م (${attendedLessonsCount} حصص). الفرق: ${netDifference >= 0 ? `+${creditRemaining} ج.م رصيد` : `${amountDue} ج.م مستحق`}.`;

  const explanationEn =
    subscriptionType === "lessons_count"
      ? `Package: Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP) out of ${totalPaidAmount} EGP paid (${remainingPackageLessons} lss left).`
      : `Plan (${paymentPlan}): Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), Paid ${totalPaidAmount} EGP.`;

  return {
    student,
    studentId: student.id,
    fullName: student.fullName,
    subjectName: student.subject,
    studyTypeLabel: student.studyType === "group" ? "مجموعة" : "خاص",
    subscriptionType,
    paymentPlan,
    lessonCost,
    attendedLessonsCount,
    attendedLessonsCost,
    totalPaidAmount,
    netDifference,
    creditRemaining,
    amountDue,
    remainingPackageLessons,
    status: statusBadge,
    attendanceHistory: studentAttendance,
    paymentHistory: studentPayments,
    planLabelAr,
    planLabelEn,
    systemTypeLabelAr,
    systemTypeLabelEn,
    explanationAr,
    explanationEn
  };
}

/**
 * Unified Transaction Record for Central Transactions Log (الدفعات + الحصص + التسويات)
 */
export interface CentralTransactionItem {
  id: string;
  type: "payment" | "lesson_attendance" | "settlement";
  date: string;
  studentId: string;
  studentName: string;
  subjectName: string;
  amount: number; // positive for payment (inflow), negative/recorded for lesson (outflow)
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
      lessonCost: pt.lessonCost,
      descriptionAr: pt.lessonsCovered > 0
        ? `سداد دفعة نقدية (${pt.lessonsCovered} حصص - سعر الحصة ${pt.lessonCost} ج.م)`
        : `سداد دفعة اشتراك مالي (${pt.amount} ج.م)`,
      descriptionEn: `Payment of ${pt.amount} EGP`,
      notes: pt.notes
    });
  });

  // 2. Attended Lessons (Automated Accrual Log)
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
        amount: -cost, // deducted value
        lessonCost: cost,
        lessonNumber: ar.lessonNumber,
        descriptionAr: `تنفيذ واحتساب حصة حضور ${ar.lessonNumber ? `#${ar.lessonNumber}` : ""} (-${cost} ج.م)`,
        descriptionEn: `Lesson Attendance Accrual (-${cost} EGP)`,
        notes: ar.teacherNotes || (ar.attendance === "present" ? "حضور مؤكد" : "غياب مع الخصم")
      });
    }
  });

  // Sort by date descending
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
