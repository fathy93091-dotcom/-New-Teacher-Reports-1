import {
  Student,
  AttendanceRecord,
  PaymentTransaction
} from "../types";

/**
 * 4 Financial States for Unified Collection:
 * 🟢 available_credit: رصيد متبقي (له رصيد فائض: المدفوع > قيمة الحصص)
 * 🔴 balance_due: مستحق عليه (المدفوع < قيمة الحصص)
 * 🟢 settled: مسدد بالكامل (المدفوع == قيمة الحصص، وأكبر من صفر)
 * ⚪ no_activity: لا توجد حركة (0 حصص و 0 مدفوع)
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
  lessonCost: number;

  // Auto-calculated Metrics strictly from attendance & payments
  attendedLessonsCount: number; // عدد الحصص المنفذة
  attendedLessonsCost: number;  // إجمالي قيمة الحصص = عدد الحصص * سعر الحصة
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
  attendedLessonsCount: number,
  attendedLessonsCost: number,
  totalPaidAmount: number
): FinancialStatusBadge {
  if (attendedLessonsCount === 0 && totalPaidAmount === 0) {
    return {
      type: "no_activity",
      labelAr: "لا توجد حركة",
      labelEn: "No Activity",
      dotColor: "bg-slate-400",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-300"
    };
  }

  const net = totalPaidAmount - attendedLessonsCost;

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
 * Calculates financial profile for a single student strictly adhering to:
 * - قيمة الحصص المنفذة = عدد الحصص المنفذة من سجل الحضور * سعر الحصة
 * - إجمالي المدفوعات = مجموع كافة الدفعات المسجلة للطالب
 * - إذا كانت المدفوعات أقل يظهر المبلغ المستحق، وإذا كانت أكبر يظهر الرصيد المتبقي
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

  // Lesson Cost
  const lessonCost = Math.max(1, student.lessonCost || 100);

  // Real attended lessons count
  const attendedLessonsCount = Math.max(studentAttendance.length, student.totalAttendedLessons || 0);

  // Attended lessons cost
  const attendedLessonsCost = attendedLessonsCount * lessonCost;

  // Sum of all payments
  const sumOfTransactions = studentPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalPaidAmount = Math.max(sumOfTransactions, student.totalPaidAmount || 0);

  // Calculations
  const netDifference = totalPaidAmount - attendedLessonsCost;
  const creditRemaining = netDifference > 0 ? netDifference : 0;
  const amountDue = netDifference < 0 ? Math.abs(netDifference) : 0;

  // Status Badge
  const statusBadge = getFinancialStatus(
    attendedLessonsCount,
    attendedLessonsCost,
    totalPaidAmount
  );

  // Direct clear explanations
  let explanationAr = "";
  let explanationEn = "";

  if (attendedLessonsCount === 0 && totalPaidAmount === 0) {
    explanationAr = "لم تسجل أي حصص حضور أو دفعات مالية للطالب حتى الآن.";
    explanationEn = "No lessons or payments recorded yet.";
  } else if (amountDue > 0) {
    explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م، والمسدد ${totalPaidAmount} ج.م. المبلغ المستحق: ${amountDue} ج.م.`;
    explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
  } else if (creditRemaining > 0) {
    explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: +${creditRemaining} ج.م.`;
    explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), paid ${totalPaidAmount} EGP. Remaining credit: +${creditRemaining} EGP.`;
  } else {
    explanationAr = `حضر ${attendedLessonsCount} حصص بقيمة ${attendedLessonsCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الحساب متوازن ومسدد بالكامل.`;
    explanationEn = `Attended ${attendedLessonsCount} lessons (${attendedLessonsCost} EGP), paid ${totalPaidAmount} EGP. Fully settled.`;
  }

  return {
    student,
    studentId: student.id,
    fullName: student.fullName,
    subjectName: student.subject,
    studyTypeLabel: student.studyType === "group" ? "مجموعة" : "خاص",
    lessonCost,
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
