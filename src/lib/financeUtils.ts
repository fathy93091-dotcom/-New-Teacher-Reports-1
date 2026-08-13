import { Student, AttendanceRecord } from "../types";

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
  statusBadge: {
    labelAr: string;
    labelEn: string;
    color: "emerald" | "amber" | "rose" | "blue";
  };
  detailsExplanationAr: string;
  detailsExplanationEn: string;
}

export function calculateStudentFinancials(
  student: Student,
  attendanceRecords?: AttendanceRecord[]
): StudentFinancialSummary {
  const lessonCost = Math.max(1, student.lessonCost || 100);
  const totalPaidAmount = student.totalPaidAmount || 0;

  // Calculate attended lessons from attendanceRecords if available, or student's stored counter
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
