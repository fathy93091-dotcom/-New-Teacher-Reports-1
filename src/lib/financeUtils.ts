import { Student, AttendanceRecord, StudentSubjectPlan, StudyType, BillingType, RateType } from "../types";
import { getElapsedMonths } from "./financeEngine";

export interface SubjectFinancialDetail {
  id: string;
  subject: string;
  studyType: StudyType;
  billingType?: BillingType;
  rateType?: RateType;
  hourlyCost?: number;
  defaultDurationMinutes?: number;
  totalTaughtHours?: number;
  lessonCost: number;
  monthlyCost?: number;
  billedMonthsCount?: number;
  totalAttendedLessons: number;
  totalAccruedCost: number;
  totalPaidAmount: number;
  remainingLessons: number;
  remainingBalance: number;
  netBalance: number;
  amountDue: number;
  creditRemaining: number;
  isFullyPaid: boolean;
  statusBadge: {
    labelAr: string;
    labelEn: string;
    color: "emerald" | "amber" | "rose" | "blue";
  };
}

export interface StudentFinancialSummary {
  billingType: BillingType;
  rateType?: RateType;
  hourlyCost?: number;
  defaultDurationMinutes?: number;
  totalTaughtHours?: number;
  isMonthly: boolean;
  totalAttendedLessons: number;
  lessonCost: number;
  monthlyCost?: number;
  billedMonthsCount?: number;
  totalAccruedCost: number;
  totalPaidAmount: number;
  remainingLessons: number;
  remainingBalance: number;
  netBalance: number; // positive = credit remaining, negative = debt due
  amountDue: number; // >= 0
  creditRemaining: number; // >= 0
  isFullyPaid: boolean;
  subjectsDetails?: SubjectFinancialDetail[];
  statusBadge: {
    labelAr: string;
    labelEn: string;
    color: "emerald" | "amber" | "rose" | "blue";
  };
  detailsExplanationAr: string;
  detailsExplanationEn: string;
}

export function calculateSingleSubjectFinance(
  subj: StudentSubjectPlan,
  studentId: string,
  attendanceRecords?: AttendanceRecord[]
): SubjectFinancialDetail {
  const billingType: BillingType = subj.billingType || "per_lesson";
  const rateType = subj.rateType || "per_lesson";
  const defaultDuration = subj.defaultDurationMinutes || 60;
  const isMonthly = billingType === "monthly" || billingType === "monthly_fixed_lessons";
  const lessonCost = Math.max(0, subj.lessonCost !== undefined ? subj.lessonCost : 100);
  const hourlyCost = subj.hourlyCost || (rateType === "per_hour" ? lessonCost : Number(((lessonCost / defaultDuration) * 60).toFixed(2)));
  const monthlyCost = Math.max(0, subj.monthlyCost !== undefined ? subj.monthlyCost : (subj.lessonsPerMonth ? subj.lessonsPerMonth * lessonCost : lessonCost * 4));
  const billedMonths = Math.max(1, subj.customBilledMonths || 1);

  let totalAttended = subj.totalAttendedLessons || 0;
  let totalMinutes = 0;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === studentId && (r.subject === subj.subject || (!r.subject)) && (r.attendance === "present" || r.deducted)
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
    presentRecords.forEach(r => {
      totalMinutes += r.durationMinutes || defaultDuration;
    });
  } else {
    totalMinutes = totalAttended * defaultDuration;
  }

  const totalTaughtHours = Number((totalMinutes / 60).toFixed(1));

  let totalAccruedCost = 0;
  if (billingType === "monthly") {
    // شهر كامل ثابت
    totalAccruedCost = Number((billedMonths * monthlyCost).toFixed(2));
  } else if (billingType === "monthly_fixed_lessons") {
    // باقة شهرية بعدد حصص محددة
    const pkgLessons = subj.lessonsPerMonth || 8;
    const pkgCost = subj.monthlyCost !== undefined ? subj.monthlyCost : (pkgLessons * lessonCost);
    totalAccruedCost = Number((billedMonths * pkgCost).toFixed(2));
  } else {
    // per_lesson or monthly_elapsed_lessons: حسب الحصص المنفذة / المنقضية
    if (rateType === "per_hour") {
      totalAccruedCost = Number((totalTaughtHours * hourlyCost).toFixed(2));
    } else {
      totalAccruedCost = Number((totalAttended * lessonCost).toFixed(2));
    }
  }

  const totalPaid = subj.totalPaidAmount || 0;
  const netBalance = Number((totalPaid - totalAccruedCost).toFixed(2));
  const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const creditRemaining = netBalance > 0 ? netBalance : 0;
  const isFullyPaid = netBalance >= 0;

  let badgeLabelAr = "";
  let badgeLabelEn = "";
  let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

  if (amountDue > 0) {
    badgeLabelAr = `مستحق: ${amountDue} ج.م`;
    badgeLabelEn = `Due: ${amountDue} EGP`;
    badgeColor = "rose";
  } else if (creditRemaining > 0) {
    badgeLabelAr = `رصيد: +${creditRemaining} ج.م`;
    badgeLabelEn = `Credit: +${creditRemaining} EGP`;
    badgeColor = "emerald";
  } else if (totalPaid > 0) {
    badgeLabelAr = "مسدد بالكامل";
    badgeLabelEn = "Fully Settled";
    badgeColor = "emerald";
  } else {
    badgeLabelAr = "لا توجد حركة";
    badgeLabelEn = "No Activity";
    badgeColor = "blue";
  }

  return {
    id: subj.id,
    subject: subj.subject,
    studyType: subj.studyType,
    billingType: billingType,
    rateType,
    hourlyCost,
    defaultDurationMinutes: defaultDuration,
    totalTaughtHours,
    lessonCost,
    monthlyCost,
    billedMonthsCount: billedMonths,
    totalAttendedLessons: totalAttended,
    totalAccruedCost,
    totalPaidAmount: totalPaid,
    remainingLessons: creditRemaining > 0 ? Math.floor(creditRemaining / lessonCost) : 0,
    remainingBalance: creditRemaining,
    netBalance,
    amountDue,
    creditRemaining,
    isFullyPaid,
    statusBadge: {
      labelAr: badgeLabelAr,
      labelEn: badgeLabelEn,
      color: badgeColor
    }
  };
}

export function calculateStudentFinancials(
  student: Student,
  attendanceRecords?: AttendanceRecord[]
): StudentFinancialSummary {
  const isMonthly = student.billingType === "monthly" || (student.subjects && student.subjects.length > 0 && student.subjects.every(s => s.billingType === "monthly"));
  const billingType: BillingType = isMonthly ? "monthly" : "per_lesson";
  const defaultElapsedMonths = getElapsedMonths(student.subscriptionStartDate || student.createdAt);
  const billedMonthsCount = Math.max(1, student.customBilledMonths || defaultElapsedMonths);
  const monthlyCost = Math.max(1, student.monthlyCost || student.lessonCost || 400);

  // If student has multiple subjects defined
  if (student.subjects && student.subjects.length > 0) {
    const subjectsDetails = student.subjects.map(subj =>
      calculateSingleSubjectFinance(subj, student.id, attendanceRecords)
    );

    const totalAttendedLessons = subjectsDetails.reduce((sum, d) => sum + d.totalAttendedLessons, 0);
    const totalAccruedCost = subjectsDetails.reduce((sum, d) => sum + d.totalAccruedCost, 0);
    const totalPaidAmount = student.totalPaidAmount || subjectsDetails.reduce((sum, d) => sum + d.totalPaidAmount, 0);
    const netBalance = totalPaidAmount - totalAccruedCost;
    const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
    const creditRemaining = netBalance > 0 ? netBalance : 0;
    const remainingBalance = creditRemaining;
    const remainingLessons = !isMonthly && creditRemaining > 0 ? Math.floor(creditRemaining / Math.max(1, student.lessonCost || 100)) : 0;
    const isFullyPaid = amountDue === 0;

    const avgLessonCost = Math.round(
      subjectsDetails.reduce((sum, d) => sum + d.lessonCost, 0) / Math.max(1, subjectsDetails.length)
    );

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

    if (amountDue > 0) {
      badgeLabelAr = `مستحق سداد: ${amountDue} ج.م`;
      badgeLabelEn = `Due: ${amountDue} EGP`;
      badgeColor = "rose";
    } else if (creditRemaining > 0) {
      badgeLabelAr = `رصيد دائن: +${creditRemaining} ج.م`;
      badgeLabelEn = `Credit: +${creditRemaining} EGP`;
      badgeColor = "emerald";
    } else if (totalPaidAmount > 0) {
      badgeLabelAr = `مسدد بالكامل`;
      badgeLabelEn = `Fully Settled`;
      badgeColor = "emerald";
    } else {
      badgeLabelAr = "لا توجد حركة";
      badgeLabelEn = "No Activity";
      badgeColor = "blue";
    }

    const subjectsSummaryText = student.subjects
      .map(s => `${s.subject} (${s.billingType === "monthly" ? `${s.monthlyCost || s.lessonCost} ج.م/شهر` : `${s.lessonCost} ج.م/حصة`})`)
      .join(" • ");

    const explanationAr = isMonthly
      ? `نظام اشتراك شهري (${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${totalAccruedCost} ج.م). المواد: [ ${subjectsSummaryText} ]. إجمالي المسدد: ${totalPaidAmount} ج.م. ${
          amountDue > 0 ? `المستحق المطلوب سداده: ${amountDue} ج.م.` : `الرصيد المتبقي: ${creditRemaining} ج.م.`
        }`
      : `مسجل في ${student.subjects.length} مواد: [ ${subjectsSummaryText} ]. إجمالي الحصص المنفذة: ${totalAttendedLessons} حصة بقيمة ${totalAccruedCost} ج.م. المسدد: ${totalPaidAmount} ج.م. ${
          amountDue > 0 ? `المستحق المطلوب سداده: ${amountDue} ج.م.` : `الرصيد المتبقي: ${creditRemaining} ج.م.`
        }`;

    const explanationEn = isMonthly
      ? `Monthly subscription (${billedMonthsCount} mo × ${monthlyCost} EGP = ${totalAccruedCost} EGP). Subjects: [ ${subjectsSummaryText} ]. Paid: ${totalPaidAmount} EGP. ${
          amountDue > 0 ? `Due: ${amountDue} EGP.` : `Credit: ${creditRemaining} EGP.`
        }`
      : `Enrolled in ${student.subjects.length} subjects. Attended: ${totalAttendedLessons} lessons (${totalAccruedCost} EGP). Paid: ${totalPaidAmount} EGP. ${
          amountDue > 0 ? `Due: ${amountDue} EGP.` : `Credit: ${creditRemaining} EGP.`
        }`;

    const totalTaughtHours = Number(subjectsDetails.reduce((sum, d) => sum + (d.totalTaughtHours || 0), 0).toFixed(1));
    const primaryRateType = student.rateType || subjectsDetails[0]?.rateType || "per_lesson";
    const primaryHourlyCost = student.hourlyCost || subjectsDetails[0]?.hourlyCost || avgLessonCost;

    return {
      billingType,
      rateType: primaryRateType,
      hourlyCost: primaryHourlyCost,
      defaultDurationMinutes: student.defaultDurationMinutes || subjectsDetails[0]?.defaultDurationMinutes || 60,
      totalTaughtHours,
      isMonthly,
      totalAttendedLessons,
      lessonCost: avgLessonCost,
      monthlyCost,
      billedMonthsCount,
      totalAccruedCost,
      totalPaidAmount,
      remainingLessons,
      remainingBalance,
      netBalance,
      amountDue,
      creditRemaining,
      isFullyPaid,
      subjectsDetails,
      statusBadge: {
        labelAr: badgeLabelAr,
        labelEn: badgeLabelEn,
        color: badgeColor
      },
      detailsExplanationAr: explanationAr,
      detailsExplanationEn: explanationEn
    };
  }

  // Single Subject
  const rateType = student.rateType || "per_lesson";
  const defaultDuration = student.defaultDurationMinutes || 60;
  const lessonCost = Math.max(1, student.lessonCost || 100);
  const hourlyCost = student.hourlyCost || (rateType === "per_hour" ? lessonCost : Math.round((lessonCost / defaultDuration) * 60));
  const totalPaidAmount = student.totalPaidAmount || 0;

  let totalAttended = student.totalAttendedLessons || 0;
  let totalMinutes = 0;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === student.id && (r.attendance === "present" || r.deducted)
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
    presentRecords.forEach(r => {
      totalMinutes += r.durationMinutes || defaultDuration;
    });
  } else {
    totalMinutes = totalAttended * defaultDuration;
  }

  const totalTaughtHours = Number((totalMinutes / 60).toFixed(1));

  let totalAccruedCost = 0;
  if (isMonthly) {
    totalAccruedCost = billedMonthsCount * monthlyCost;
  } else {
    if (rateType === "per_hour") {
      totalAccruedCost = Math.round(totalTaughtHours * hourlyCost);
    } else {
      totalAccruedCost = totalAttended * lessonCost;
    }
  }

  const netBalance = totalPaidAmount - totalAccruedCost;
  const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const creditRemaining = netBalance > 0 ? netBalance : 0;
  const remainingBalance = creditRemaining;
  const remainingLessons = !isMonthly && creditRemaining > 0 ? Math.floor(creditRemaining / lessonCost) : 0;
  const isFullyPaid = netBalance >= 0;

  let badgeLabelAr = "";
  let badgeLabelEn = "";
  let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";
  let explanationAr = "";
  let explanationEn = "";

  if (totalAttended === 0 && totalPaidAmount === 0 && (!isMonthly || totalAccruedCost === 0)) {
    badgeLabelAr = "لا توجد حركة";
    badgeLabelEn = "No Activity";
    badgeColor = "blue";
    explanationAr = "لم تسجل أي حصص حضور أو دفعات مالية للطالب بعد.";
    explanationEn = "No lessons or payments recorded yet.";
  } else if (amountDue > 0) {
    badgeLabelAr = `مستحق سداد: ${amountDue} ج.م`;
    badgeLabelEn = `Due: ${amountDue} EGP`;
    badgeColor = "rose";
    explanationAr = isMonthly
      ? `اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${totalAccruedCost} ج.م (يحسب الشهر كاملاً سواء حضر أو غاب)، والمسدد ${totalPaidAmount} ج.م. المطلوب سداده: ${amountDue} ج.م.`
      : `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. المطلوب سداده: ${amountDue} ج.م.`;
    explanationEn = isMonthly
      ? `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${totalAccruedCost} EGP (flat fee), paid ${totalPaidAmount} EGP. Due: ${amountDue} EGP.`
      : `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
  } else if (creditRemaining > 0) {
    badgeLabelAr = `رصيد متبقي: +${creditRemaining} ج.م`;
    badgeLabelEn = `Credit: +${creditRemaining} EGP`;
    badgeColor = "emerald";
    explanationAr = isMonthly
      ? `اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: +${creditRemaining} ج.م.`
      : `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: ${creditRemaining} ج.م.`;
    explanationEn = isMonthly
      ? `Monthly subscription: ${billedMonthsCount} mo × ${monthlyCost} EGP = ${totalAccruedCost} EGP, paid ${totalPaidAmount} EGP. Credit left: +${creditRemaining} EGP.`
      : `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP. Credit left: ${creditRemaining} EGP.`;
  } else {
    badgeLabelAr = "مسدد بالكامل";
    badgeLabelEn = "Fully Settled";
    badgeColor = "emerald";
    explanationAr = isMonthly
      ? `اشتراك شهري: ${billedMonthsCount} شهر × ${monthlyCost} ج.م = ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الحساب مسدد بالكامل.`
      : `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الحساب مسدد بالكامل.`;
    explanationEn = `Paid ${totalPaidAmount} EGP. Fully settled.`;
  }

  return {
    billingType,
    rateType,
    hourlyCost,
    defaultDurationMinutes: defaultDuration,
    totalTaughtHours,
    isMonthly,
    totalAttendedLessons: totalAttended,
    lessonCost,
    monthlyCost,
    billedMonthsCount,
    totalAccruedCost,
    totalPaidAmount,
    remainingLessons,
    remainingBalance,
    netBalance,
    amountDue,
    creditRemaining,
    isFullyPaid,
    statusBadge: {
      labelAr: badgeLabelAr,
      labelEn: badgeLabelEn,
      color: badgeColor
    },
    detailsExplanationAr: explanationAr,
    detailsExplanationEn: explanationEn
  };
}

export interface CombinedGroupFinancialSummary {
  totalAttendedLessons: number;
  totalAccruedCost: number;
  totalPaidAmount: number;
  netBalance: number;
  amountDue: number;
  creditRemaining: number;
  isFullyPaid: boolean;
  studentBreakdowns: {
    student: Student;
    financials: StudentFinancialSummary;
  }[];
}

export function calculateCombinedGroupFinancials(
  groupStudents: Student[] = [],
  attendanceRecords?: AttendanceRecord[]
): CombinedGroupFinancialSummary {
  const safeGroupStudents = Array.isArray(groupStudents) ? groupStudents.filter(Boolean) : [];
  const studentBreakdowns = safeGroupStudents.map(st => ({
    student: st,
    financials: calculateStudentFinancials(st, attendanceRecords)
  }));

  const totalAttendedLessons = studentBreakdowns.reduce(
    (sum, b) => sum + b.financials.totalAttendedLessons,
    0
  );
  const totalAccruedCost = studentBreakdowns.reduce(
    (sum, b) => sum + b.financials.totalAccruedCost,
    0
  );
  const totalPaidAmount = studentBreakdowns.reduce(
    (sum, b) => sum + b.financials.totalPaidAmount,
    0
  );
  const netBalance = totalPaidAmount - totalAccruedCost;
  const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const creditRemaining = netBalance > 0 ? netBalance : 0;
  const isFullyPaid = amountDue === 0;

  return {
    totalAttendedLessons,
    totalAccruedCost,
    totalPaidAmount,
    netBalance,
    amountDue,
    creditRemaining,
    isFullyPaid,
    studentBreakdowns
  };
}

