import { Student, AttendanceRecord, StudentSubjectPlan, StudyType } from "../types";

export interface SubjectFinancialDetail {
  id: string;
  subject: string;
  studyType: StudyType;
  lessonCost: number;
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
  totalAttendedLessons: number;
  lessonCost: number;
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
  const lessonCost = Math.max(1, subj.lessonCost || 100);
  let totalAttended = subj.totalAttendedLessons || 0;

  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === studentId && (r.attendance === "present" || r.deducted)
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
  }

  const totalAccruedCost = totalAttended * lessonCost;
  const totalPaid = subj.totalPaidAmount || 0;
  const netBalance = totalPaid - totalAccruedCost;
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
    lessonCost,
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
    const remainingLessons = creditRemaining > 0 ? Math.floor(creditRemaining / Math.max(1, student.lessonCost || 100)) : 0;
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
      .map(s => `${s.subject} (${s.lessonCost} ج.م)`)
      .join(" • ");

    const explanationAr = `مسجل في ${student.subjects.length} مواد: [ ${subjectsSummaryText} ]. إجمالي الحصص المنفذة: ${totalAttendedLessons} حصة بقيمة ${totalAccruedCost} ج.م. المسدد: ${totalPaidAmount} ج.م. ${
      amountDue > 0 ? `المستحق المطلوب سداده: ${amountDue} ج.م.` : `الرصيد المتبقي: ${creditRemaining} ج.م.`
    }`;

    const explanationEn = `Enrolled in ${student.subjects.length} subjects. Attended: ${totalAttendedLessons} lessons (${totalAccruedCost} EGP). Paid: ${totalPaidAmount} EGP. ${
      amountDue > 0 ? `Due: ${amountDue} EGP.` : `Credit: ${creditRemaining} EGP.`
    }`;

    return {
      totalAttendedLessons,
      lessonCost: avgLessonCost,
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
  const lessonCost = Math.max(1, student.lessonCost || 100);
  const totalPaidAmount = student.totalPaidAmount || 0;

  let totalAttended = student.totalAttendedLessons || 0;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === student.id && (r.attendance === "present" || r.deducted)
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
  }

  const totalAccruedCost = totalAttended * lessonCost;
  const netBalance = totalPaidAmount - totalAccruedCost;
  const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const creditRemaining = netBalance > 0 ? netBalance : 0;
  const remainingBalance = creditRemaining;
  const remainingLessons = creditRemaining > 0 ? Math.floor(creditRemaining / lessonCost) : 0;
  const isFullyPaid = netBalance >= 0;

  let badgeLabelAr = "";
  let badgeLabelEn = "";
  let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";
  let explanationAr = "";
  let explanationEn = "";

  if (totalAttended === 0 && totalPaidAmount === 0) {
    badgeLabelAr = "لا توجد حركة";
    badgeLabelEn = "No Activity";
    badgeColor = "blue";
    explanationAr = "لم تسجل أي حصص حضور أو دفعات مالية للطالب بعد.";
    explanationEn = "No lessons or payments recorded yet.";
  } else if (amountDue > 0) {
    badgeLabelAr = `مستحق سداد: ${amountDue} ج.م`;
    badgeLabelEn = `Due: ${amountDue} EGP`;
    badgeColor = "rose";
    explanationAr = `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. المطلوب سداده: ${amountDue} ج.م.`;
    explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP. Due amount: ${amountDue} EGP.`;
  } else if (creditRemaining > 0) {
    badgeLabelAr = `رصيد متبقي: +${creditRemaining} ج.م`;
    badgeLabelEn = `Credit: +${creditRemaining} EGP`;
    badgeColor = "emerald";
    explanationAr = `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الرصيد المتبقي له: ${creditRemaining} ج.م.`;
    explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP. Credit left: ${creditRemaining} EGP.`;
  } else {
    badgeLabelAr = "مسدد بالكامل";
    badgeLabelEn = "Fully Settled";
    badgeColor = "emerald";
    explanationAr = `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، والمسدد ${totalPaidAmount} ج.م. الحساب مسدد بالكامل.`;
    explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP. Fully settled.`;
  }

  return {
    totalAttendedLessons: totalAttended,
    lessonCost,
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
