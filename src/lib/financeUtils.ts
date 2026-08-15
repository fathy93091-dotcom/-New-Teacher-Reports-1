import { Student, AttendanceRecord, StudentSubjectPlan, StudyType, SubscriptionType, PaymentPlan } from "../types";

export interface SubjectFinancialDetail {
  id: string;
  subject: string;
  studyType: StudyType;
  subscriptionType: SubscriptionType;
  paymentPlan: PaymentPlan;
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

function calculateSingleSubjectFinance(
  subj: StudentSubjectPlan,
  studentId: string,
  attendanceRecords?: AttendanceRecord[]
): SubjectFinancialDetail {
  const lessonCost = Math.max(1, subj.lessonCost || 100);
  let totalAttended = subj.totalAttendedLessons || 0;

  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === studentId && r.attendance === "present"
    );
    // If multiple subjects, try to match by date or use proportional/recorded count
    totalAttended = Math.max(totalAttended, presentRecords.length);
  }

  const isMonthly = subj.subscriptionType === "monthly";
  const plan = subj.paymentPlan || "beginning_of_month";
  const totalAccruedCost = totalAttended * lessonCost;

  if (isMonthly) {
    const totalPaid = subj.totalPaidAmount ?? (plan === "beginning_of_month" ? totalAccruedCost : 0);
    const netBalance = totalPaid - totalAccruedCost;
    const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
    const creditRemaining = netBalance > 0 ? netBalance : 0;
    const isFullyPaid = netBalance >= 0;

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

    if (plan === "beginning_of_month") {
      if (netBalance > 0) {
        badgeLabelAr = `رصيد متبقي: +${creditRemaining} ج.م`;
        badgeLabelEn = `Credit: +${creditRemaining} EGP`;
        badgeColor = "emerald";
      } else if (netBalance === 0) {
        badgeLabelAr = totalPaid > 0 ? "مسدد بالكامل" : "بانتظار السداد";
        badgeLabelEn = totalPaid > 0 ? "Fully Paid" : "Awaiting Payment";
        badgeColor = totalPaid > 0 ? "emerald" : "amber";
      } else {
        badgeLabelAr = `مستحق: ${amountDue} ج.م`;
        badgeLabelEn = `Due: ${amountDue} EGP`;
        badgeColor = "rose";
      }
    } else if (plan === "end_of_month") {
      if (netBalance >= 0 && totalAccruedCost > 0) {
        badgeLabelAr = `مسدد لنهاية الشهر (${totalAccruedCost} ج.م)`;
        badgeLabelEn = `Settled (${totalAccruedCost} EGP)`;
        badgeColor = "emerald";
      } else if (totalAccruedCost === 0 && totalPaid === 0) {
        badgeLabelAr = "حساب نهاية الشهر";
        badgeLabelEn = "Month-End Plan";
        badgeColor = "blue";
      } else {
        badgeLabelAr = `مستحق نهاية الشهر: ${amountDue} ج.م`;
        badgeLabelEn = `Due: ${amountDue} EGP`;
        badgeColor = totalAttended > 0 ? "amber" : "blue";
      }
    } else {
      // Mixed
      if (netBalance > 0) {
        badgeLabelAr = `رصيد: +${netBalance} ج.م`;
        badgeLabelEn = `Credit: +${netBalance} EGP`;
        badgeColor = "emerald";
      } else if (netBalance === 0) {
        badgeLabelAr = "متوازن";
        badgeLabelEn = "Balanced";
        badgeColor = "emerald";
      } else {
        badgeLabelAr = `مستحق: ${amountDue} ج.م`;
        badgeLabelEn = `Due: ${amountDue} EGP`;
        badgeColor = "rose";
      }
    }

    return {
      id: subj.id,
      subject: subj.subject,
      studyType: subj.studyType,
      subscriptionType: subj.subscriptionType,
      paymentPlan: subj.paymentPlan,
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
  } else {
    // Package
    const remainingLessons = subj.remainingLessons ?? 0;
    const remainingBalance = remainingLessons * lessonCost;
    const totalPurchased = subj.totalPurchasedLessons || (remainingLessons + totalAttended) || 8;
    const isFullyPaid = remainingLessons > 0;
    const totalPaid = subj.totalPaidAmount ?? (totalPurchased * lessonCost);

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

    if (remainingLessons > 1) {
      badgeLabelAr = `باقة: متبقي ${remainingLessons} حصة`;
      badgeLabelEn = `Pack: ${remainingLessons} left`;
      badgeColor = "emerald";
    } else if (remainingLessons === 1) {
      badgeLabelAr = `⚠️ متبقي حصة واحدة`;
      badgeLabelEn = `⚠️ 1 lesson left`;
      badgeColor = "amber";
    } else {
      badgeLabelAr = "نفدت الباقة (مستحق التجديد)";
      badgeLabelEn = "Package Expired";
      badgeColor = "rose";
    }

    return {
      id: subj.id,
      subject: subj.subject,
      studyType: subj.studyType,
      subscriptionType: subj.subscriptionType,
      paymentPlan: subj.paymentPlan,
      lessonCost,
      totalAttendedLessons: totalAttended,
      totalAccruedCost,
      totalPaidAmount: totalPaid,
      remainingLessons,
      remainingBalance,
      netBalance: remainingBalance,
      amountDue: remainingLessons <= 0 ? (totalPurchased * lessonCost) : 0,
      creditRemaining: remainingBalance,
      isFullyPaid,
      statusBadge: {
        labelAr: badgeLabelAr,
        labelEn: badgeLabelEn,
        color: badgeColor
      }
    };
  }
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
    const remainingLessons = subjectsDetails.reduce((sum, d) => sum + d.remainingLessons, 0);
    const remainingBalance = subjectsDetails.reduce((sum, d) => sum + d.remainingBalance, 0);
    const amountDue = subjectsDetails.reduce((sum, d) => sum + d.amountDue, 0);
    const creditRemaining = subjectsDetails.reduce((sum, d) => sum + d.creditRemaining, 0);
    const netBalance = creditRemaining - amountDue;
    const isFullyPaid = amountDue === 0;

    const avgLessonCost = Math.round(
      subjectsDetails.reduce((sum, d) => sum + d.lessonCost, 0) / Math.max(1, subjectsDetails.length)
    );

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

    if (amountDue > 0) {
      badgeLabelAr = `مستحق سداد: ${amountDue} ج.م (${student.subjects.length} مواد)`;
      badgeLabelEn = `Due: ${amountDue} EGP (${student.subjects.length} subjects)`;
      badgeColor = "rose";
    } else if (creditRemaining > 0) {
      badgeLabelAr = `رصيد دائن: +${creditRemaining} ج.م (${student.subjects.length} مواد)`;
      badgeLabelEn = `Credit: +${creditRemaining} EGP (${student.subjects.length} subjects)`;
      badgeColor = "emerald";
    } else {
      badgeLabelAr = `مسدد بالكامل (${student.subjects.length} مواد)`;
      badgeLabelEn = `Fully Settled (${student.subjects.length} subjects)`;
      badgeColor = "emerald";
    }

    const subjectsSummaryText = student.subjects
      .map(s => `${s.subject} (${s.subscriptionType === "monthly" ? "شهري" : "باقة"} - ${s.lessonCost} ج.م)`)
      .join(" • ");

    const explanationAr = `طالب مسجل في ${student.subjects.length} مواد: [ ${subjectsSummaryText} ]. إجمالي الحصص المنفذة: ${totalAttendedLessons} حصة بقيمة ${totalAccruedCost} ج.م. المسدد: ${totalPaidAmount} ج.م. ${
      amountDue > 0 ? `المستحق المطلوب سداده: ${amountDue} ج.م.` : `الرصيد المتبقي: ${creditRemaining} ج.م.`
    }`;

    const explanationEn = `Enrolled in ${student.subjects.length} subjects. Total attended: ${totalAttendedLessons} lessons (${totalAccruedCost} EGP). Paid: ${totalPaidAmount} EGP. ${
      amountDue > 0 ? `Due amount: ${amountDue} EGP.` : `Credit left: ${creditRemaining} EGP.`
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

  // Single Subject Fallback
  const lessonCost = Math.max(1, student.lessonCost || 100);
  const totalPaidAmount = student.totalPaidAmount || 0;

  let totalAttended = student.totalAttendedLessons || 0;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r => r.studentId === student.id && r.attendance === "present"
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
  }

  const isMonthly = student.subscriptionType === "monthly";
  const plan = student.paymentPlan || "beginning_of_month";
  const totalAccruedCost = totalAttended * lessonCost;

  if (isMonthly) {
    const netBalance = totalPaidAmount - totalAccruedCost;
    const amountDue = netBalance < 0 ? Math.abs(netBalance) : 0;
    const creditRemaining = netBalance > 0 ? netBalance : 0;
    const isFullyPaid = netBalance >= 0;

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";
    let explanationAr = "";
    let explanationEn = "";

    if (plan === "beginning_of_month") {
      if (netBalance > 0) {
        badgeLabelAr = `مسدد مقدماً (رصيد: ${creditRemaining} ج.م)`;
        badgeLabelEn = `Prepaid (Credit: ${creditRemaining} EGP)`;
        badgeColor = "emerald";
        explanationAr = `حضر ${totalAttended} حصص (${totalAccruedCost} ج.م) من المدفوع مقدماً (${totalPaidAmount} ج.م) - المتبقي: ${creditRemaining} ج.م.`;
        explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP) out of prepaid (${totalPaidAmount} EGP) - Remaining: ${creditRemaining} EGP.`;
      } else if (netBalance === 0) {
        badgeLabelAr = totalPaidAmount > 0 ? "مسدد بالكامل" : "بداية الشهر - بانتظار السداد";
        badgeLabelEn = totalPaidAmount > 0 ? "Fully Paid" : "Awaiting Month Payment";
        badgeColor = totalPaidAmount > 0 ? "emerald" : "amber";
        explanationAr = totalPaidAmount > 0
          ? `مسدد بالضبط: حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م.`
          : `اشتراك شهري (دفع أول الشهر) - لم تسجل دفعات حتى الآن.`;
        explanationEn = totalPaidAmount > 0
          ? `Settled: Attended ${totalAttended} lessons worth ${totalAccruedCost} EGP.`
          : `Monthly advance plan - no payments recorded yet.`;
      } else {
        badgeLabelAr = `مستحق سداد: ${amountDue} ج.م`;
        badgeLabelEn = `Overdue: ${amountDue} EGP`;
        badgeColor = "rose";
        explanationAr = `حضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م، بينما المسدد ${totalPaidAmount} ج.م - مطلوب سداد فارق: ${amountDue} ج.م.`;
        explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP - Due amount: ${amountDue} EGP.`;
      }
    } else if (plan === "end_of_month") {
      if (netBalance >= 0 && totalAccruedCost > 0) {
        badgeLabelAr = `مسدد لنهاية الشهر (${totalAccruedCost} ج.م)`;
        badgeLabelEn = `Settled for month (${totalAccruedCost} EGP)`;
        badgeColor = "emerald";
        explanationAr = `تمت محاسبة نهاية الشهر بالكامل: ${totalAttended} حصص حضرها الطالب = ${totalAccruedCost} ج.م.`;
        explanationEn = `Full month-end settled: ${totalAttended} attended lessons = ${totalAccruedCost} EGP.`;
      } else if (totalAccruedCost === 0 && totalPaidAmount === 0) {
        badgeLabelAr = "حساب نهاية الشهر (0 حصة)";
        badgeLabelEn = "Month-End Billing (0 lessons)";
        badgeColor = "blue";
        explanationAr = "يتم احتساب التكلفة تلقائياً مع كل حصة يحضرها الطالب وسدادها نهاية الشهر.";
        explanationEn = "Cost accumulates per attended lesson and billed at month end.";
      } else {
        badgeLabelAr = `مستحق نهاية الشهر: ${amountDue} ج.م (${totalAttended} حصة)`;
        badgeLabelEn = `Due at month end: ${amountDue} EGP (${totalAttended} lss)`;
        badgeColor = totalAttended > 0 ? "amber" : "blue";
        explanationAr = `مرت وحضر ${totalAttended} حصص بقيمة ${totalAccruedCost} ج.م (سعر الحصة ${lessonCost} ج.م) - المستحق للدفع نهاية الشهر: ${amountDue} ج.م.`;
        explanationEn = `${totalAttended} lessons attended worth ${totalAccruedCost} EGP (${lessonCost} EGP/lesson) - Due at month-end: ${amountDue} EGP.`;
      }
    } else {
      // Mixed plan
      if (netBalance > 0) {
        badgeLabelAr = `رصيد متاح: +${netBalance} ج.م`;
        badgeLabelEn = `Positive Balance: +${netBalance} EGP`;
        badgeColor = "emerald";
        explanationAr = `حساب مختلط: حضر ${totalAttended} حصص (${totalAccruedCost} ج.م)، إجمالي الدفعات (${totalPaidAmount} ج.م)، الرصيد الصافي المتبقي: ${netBalance} ج.م.`;
        explanationEn = `Mixed plan: ${totalAttended} lessons attended (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP, credit left: ${netBalance} EGP.`;
      } else if (netBalance === 0) {
        badgeLabelAr = "الحساب متوازن";
        badgeLabelEn = "Balanced";
        badgeColor = "emerald";
        explanationAr = `حضر ${totalAttended} حصص (${totalAccruedCost} ج.م) وسدد ${totalPaidAmount} ج.م.`;
        explanationEn = `Attended ${totalAttended} lessons (${totalAccruedCost} EGP) and paid ${totalPaidAmount} EGP.`;
      } else {
        badgeLabelAr = `مستحق عليه: ${amountDue} ج.م`;
        badgeLabelEn = `Balance Due: ${amountDue} EGP`;
        badgeColor = "rose";
        explanationAr = `حساب مختلط: حضر ${totalAttended} حصص (${totalAccruedCost} ج.م)، المسدد (${totalPaidAmount} ج.م)، المستحق عليه: ${amountDue} ج.م.`;
        explanationEn = `Mixed plan: ${totalAttended} lessons attended (${totalAccruedCost} EGP), paid ${totalPaidAmount} EGP, due: ${amountDue} EGP.`;
      }
    }

    return {
      totalAttendedLessons: totalAttended,
      lessonCost,
      totalAccruedCost,
      totalPaidAmount,
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
      },
      detailsExplanationAr: explanationAr,
      detailsExplanationEn: explanationEn
    };
  } else {
    // Package / Lessons Count Subscription
    const remainingLessons = student.remainingLessons ?? 0;
    const remainingBalance = remainingLessons * lessonCost;
    const totalPurchased = student.totalPurchasedLessons || (remainingLessons + totalAttended) || 8;
    const isFullyPaid = remainingLessons > 0 && student.paymentStatus === "paid";
    const netBalance = remainingBalance;

    let badgeLabelAr = "";
    let badgeLabelEn = "";
    let badgeColor: "emerald" | "amber" | "rose" | "blue" = "emerald";

    if (remainingLessons > 1) {
      badgeLabelAr = `متبقي ${remainingLessons} حصة (${remainingBalance} ج.م)`;
      badgeLabelEn = `${remainingLessons} lessons left (${remainingBalance} EGP)`;
      badgeColor = "emerald";
    } else if (remainingLessons === 1) {
      badgeLabelAr = `⚠️ متبقي حصة واحدة (${lessonCost} ج.م)`;
      badgeLabelEn = `⚠️ 1 lesson left (${lessonCost} EGP)`;
      badgeColor = "amber";
    } else {
      badgeLabelAr = "نفدت باقة الحصص (مستحق التجديد)";
      badgeLabelEn = "Package finished (Renewal due)";
      badgeColor = "rose";
    }

    const explanationAr = `باقة عدد حصص: تم استهلاك ${totalAttended} حصة من إجمالي ${totalPurchased} حصة (سعر الحصة ${lessonCost} ج.م). المتبقي بالباقة: ${remainingLessons} حصة (${remainingBalance} ج.م).`;
    const explanationEn = `Package: Consumed ${totalAttended} out of ${totalPurchased} lessons (${lessonCost} EGP/lesson). Remaining: ${remainingLessons} lessons (${remainingBalance} EGP).`;

    return {
      totalAttendedLessons: totalAttended,
      lessonCost,
      totalAccruedCost,
      totalPaidAmount,
      remainingLessons,
      remainingBalance,
      netBalance,
      amountDue: remainingLessons <= 0 ? (totalPurchased * lessonCost) : 0,
      creditRemaining: remainingBalance,
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
}

