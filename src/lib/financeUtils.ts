import { Student, AttendanceRecord, PaymentTransaction, GeneratedReport, StudentSubjectPlan, StudyType, BillingType, RateType } from "../types";
import { getElapsedMonths, calculateStudentFinancialProfile, isAttendedOrDeductedRecord, normalizeArabicText, matchesStudentRecord } from "./financeEngine";

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
  attendanceRecords?: AttendanceRecord[],
  studentName?: string
): SubjectFinancialDetail {
  const billingType: BillingType = subj.billingType || "per_lesson";
  const rateType = subj.rateType || "per_lesson";
  const defaultDuration = subj.defaultDurationMinutes || 60;
  const isMonthly = billingType === "monthly" || billingType === "monthly_fixed_lessons";
  const lessonCost = Math.max(0, subj.lessonCost !== undefined ? subj.lessonCost : 100);
  const hourlyCost = subj.hourlyCost || (rateType === "per_hour" ? lessonCost : Number(((lessonCost / defaultDuration) * 60).toFixed(2)));
  const monthlyCost = Math.max(0, subj.monthlyCost !== undefined ? subj.monthlyCost : (subj.lessonsPerMonth ? subj.lessonsPerMonth * lessonCost : lessonCost * 4));
  const billedMonths = Math.max(1, subj.customBilledMonths || 1);

  const mockStudent = { id: studentId, fullName: studentName || "" } as Student;

  let totalAttended = subj.totalAttendedLessons || 0;
  let totalMinutes = 0;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(
      r =>
        (r.studentId === studentId || String(r.studentId).trim() === String(studentId).trim() || (studentName ? matchesStudentRecord(r, mockStudent) : false)) &&
        (r.subject === subj.subject ||
          (!r.subject) ||
          (r.subject && subj.subject && normalizeArabicText(r.subject) === normalizeArabicText(subj.subject)) ||
          (r.subject && subj.subject && (normalizeArabicText(r.subject).includes(normalizeArabicText(subj.subject)) || normalizeArabicText(subj.subject).includes(normalizeArabicText(r.subject))))) &&
        isAttendedOrDeductedRecord(r)
    );
    totalAttended = Math.max(totalAttended, presentRecords.length);
    presentRecords.forEach(r => {
      let dur = r.durationMinutes;
      if (!dur && r.lessonDuration) {
        const m = r.lessonDuration.match(/(\d+)/);
        if (m) dur = parseInt(m[1], 10);
      }
      totalMinutes += dur && dur > 0 ? dur : defaultDuration;
    });
    const unrecordedCount = Math.max(0, totalAttended - presentRecords.length);
    totalMinutes += unrecordedCount * defaultDuration;
  } else {
    totalMinutes = totalAttended * defaultDuration;
  }

  const exactHours = totalMinutes / 60;
  const totalTaughtHours = Number(exactHours.toFixed(2));

  let totalAccruedCost = 0;
  if (billingType === "monthly") {
    // شهر كامل ثابت
    totalAccruedCost = Number((billedMonths * monthlyCost).toFixed(2));
  } else if (billingType === "monthly_fixed_lessons") {
    // باقة شهرية بعدد حصص محددة: المحاسبة على الحصص المنفذة فعلياً من الباقة
    const pkgLessons = subj.lessonsPerMonth || 8;
    const effRate = subj.monthlyCost !== undefined ? (subj.monthlyCost / pkgLessons) : (rateType === "per_hour" ? Number(((hourlyCost * defaultDuration) / 60).toFixed(2)) : lessonCost);
    totalAccruedCost = Number((totalAttended * effRate).toFixed(2));
  } else {
    // per_lesson or monthly_elapsed_lessons: حسب الحصص المنفذة / المنقضية
    const presentRecords = attendanceRecords ? attendanceRecords.filter(
      r =>
        (r.studentId === studentId || String(r.studentId).trim() === String(studentId).trim() || (studentName ? matchesStudentRecord(r, mockStudent) : false)) &&
        (r.subject === subj.subject ||
          (!r.subject) ||
          (r.subject && subj.subject && normalizeArabicText(r.subject) === normalizeArabicText(subj.subject)) ||
          (r.subject && subj.subject && (normalizeArabicText(r.subject).includes(normalizeArabicText(subj.subject)) || normalizeArabicText(subj.subject).includes(normalizeArabicText(r.subject))))) &&
        isAttendedOrDeductedRecord(r)
    ) : [];
    const hasCustomBilled = presentRecords.some(r => r.billedCost !== undefined && r.billedCost !== null);
    if (hasCustomBilled) {
      let sumCost = 0;
      presentRecords.forEach(r => {
        if (r.billedCost !== undefined && r.billedCost !== null) {
          sumCost += Number(r.billedCost);
        } else {
          let dur = r.durationMinutes;
          if (!dur && r.lessonDuration) {
            const m = r.lessonDuration.match(/(\d+)/);
            if (m) dur = parseInt(m[1], 10);
          }
          const effDur = dur && dur > 0 ? dur : defaultDuration;
          sumCost += rateType === "per_hour" ? Number(((effDur / 60) * hourlyCost).toFixed(2)) : lessonCost;
        }
      });
      const unrecordedCount = Math.max(0, totalAttended - presentRecords.length);
      sumCost += unrecordedCount * (rateType === "per_hour" ? Number(((defaultDuration / 60) * hourlyCost).toFixed(2)) : lessonCost);
      totalAccruedCost = Number(sumCost.toFixed(2));
    } else {
      if (rateType === "per_hour") {
        totalAccruedCost = Number((exactHours * hourlyCost).toFixed(2));
      } else {
        totalAccruedCost = Number((totalAttended * lessonCost).toFixed(2));
      }
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
  attendanceRecords: AttendanceRecord[] = [],
  paymentTransactions: PaymentTransaction[] = [],
  reports: GeneratedReport[] = []
): StudentFinancialSummary {
  const profile = calculateStudentFinancialProfile(
    student,
    attendanceRecords,
    paymentTransactions,
    [],
    [],
    reports
  );

  const subjectsDetails: SubjectFinancialDetail[] | undefined = profile.subjectBreakdown
    ? profile.subjectBreakdown.map(sb => ({
        id: sb.id || sb.subjectId || `subj_${sb.subjectName}`,
        subject: sb.subjectName,
        studyType: sb.studyType,
        billingType: sb.billingType,
        rateType: sb.rateType,
        hourlyCost: sb.hourlyCost,
        defaultDurationMinutes: student.subjects?.find(s => s.subject === sb.subjectName)?.defaultDurationMinutes || profile.defaultDurationMinutes,
        totalTaughtHours: sb.totalTaughtHours,
        lessonCost: sb.lessonCost,
        monthlyCost: sb.monthlyCost,
        billedMonthsCount: sb.billedMonthsCount,
        totalAttendedLessons: sb.attendedCount,
        totalAccruedCost: sb.accruedCost,
        totalPaidAmount: sb.paidAmount,
        remainingLessons: sb.billingType === "monthly_fixed_lessons"
          ? Math.max(0, (student.subjects?.find(s => s.subject === sb.subjectName)?.lessonsPerMonth || student.lessonsPerMonth || 8) - sb.attendedCount)
          : (sb.creditRemaining > 0 && sb.lessonCost > 0 ? Math.floor(sb.creditRemaining / sb.lessonCost) : 0),
        remainingBalance: sb.creditRemaining,
        netBalance: Number((sb.paidAmount - sb.accruedCost).toFixed(2)),
        amountDue: sb.amountDue,
        creditRemaining: sb.creditRemaining,
        isFullyPaid: sb.amountDue === 0,
        statusBadge: {
          labelAr: sb.status.labelAr,
          labelEn: sb.status.labelEn,
          color: sb.status.type === "balance_due" ? "rose" : sb.status.type === "available_credit" ? "emerald" : sb.status.type === "settled" ? "emerald" : "blue"
        }
      }))
    : undefined;

  const badgeColor: "emerald" | "amber" | "rose" | "blue" =
    profile.status.type === "balance_due" ? "rose" :
    profile.status.type === "available_credit" ? "emerald" :
    profile.status.type === "settled" ? "emerald" : "blue";

  return {
    billingType: profile.billingType,
    rateType: profile.rateType,
    hourlyCost: profile.hourlyCost,
    defaultDurationMinutes: profile.defaultDurationMinutes,
    totalTaughtHours: profile.totalTaughtHours,
    isMonthly: profile.isMonthly,
    totalAttendedLessons: profile.attendedLessonsCount,
    lessonCost: profile.lessonCost,
    monthlyCost: profile.monthlyCost,
    billedMonthsCount: profile.billedMonthsCount,
    totalAccruedCost: profile.attendedLessonsCost,
    totalPaidAmount: profile.totalPaidAmount,
    remainingLessons: student.billingType === "monthly_fixed_lessons"
      ? Math.max(0, (student.lessonsPerMonth || 8) - profile.attendedLessonsCount)
      : (!profile.isMonthly && profile.creditRemaining > 0 && profile.lessonCost > 0 ? Math.floor(profile.creditRemaining / profile.lessonCost) : 0),
    remainingBalance: profile.creditRemaining,
    netBalance: profile.netDifference,
    amountDue: profile.amountDue,
    creditRemaining: profile.creditRemaining,
    isFullyPaid: profile.amountDue === 0,
    subjectsDetails,
    statusBadge: {
      labelAr: profile.status.labelAr,
      labelEn: profile.status.labelEn,
      color: badgeColor
    },
    detailsExplanationAr: profile.explanationAr,
    detailsExplanationEn: profile.explanationEn
  };
}

export interface CombinedGroupFinancialSummary {
  totalAttendedLessons: number;
  totalTaughtHours: number;
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
  attendanceRecords?: AttendanceRecord[],
  paymentTransactions?: PaymentTransaction[],
  reports?: GeneratedReport[]
): CombinedGroupFinancialSummary {
  const safeGroupStudents = Array.isArray(groupStudents) ? groupStudents.filter(Boolean) : [];
  const studentBreakdowns = safeGroupStudents.map(st => ({
    student: st,
    financials: calculateStudentFinancials(st, attendanceRecords, paymentTransactions, reports)
  }));

  const totalAttendedLessons = studentBreakdowns.reduce(
    (sum, b) => sum + b.financials.totalAttendedLessons,
    0
  );
  const totalTaughtHours = Number(
    studentBreakdowns.reduce((sum, b) => sum + (b.financials.totalTaughtHours || 0), 0).toFixed(2)
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
    totalTaughtHours,
    totalAccruedCost,
    totalPaidAmount,
    netBalance,
    amountDue,
    creditRemaining,
    isFullyPaid,
    studentBreakdowns
  };
}

/**
 * Formats fractional hours into clean human-readable text (e.g., 2.5h -> "ساعتان و 30 دقيقة" / "2 hours 30 mins")
 */
export function formatHoursHuman(totalHours: number, isArabic = true): string {
  const totalMin = Math.round((Math.max(0, totalHours) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (isArabic) {
    if (h === 0) return `${m} دقيقة`;
    const hText = h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : h >= 3 && h <= 10 ? `${h} ساعات` : `${h} ساعة`;
    if (m === 0) return hText;
    return `${hText} و ${m} دقيقة`;
  } else {
    if (h === 0) return `${m} mins`;
    const hText = h === 1 ? "1 hour" : `${h} hours`;
    if (m === 0) return hText;
    return `${hText} ${m}m`;
  }
}

export interface StatementDataPayload {
  studentName: string;
  subjectName?: string;
  studyTypeLabel?: string;
  totalTaughtHours: number;
  totalAttendedLessons: number;
  totalAccruedCost: number;
  totalPaidAmount: number;
  amountDue: number;
  creditRemaining: number;
  isMonthly?: boolean;
  billedMonthsCount?: number;
  monthlyCost?: number;
  subjectsBreakdown?: {
    subjectName: string;
    totalTaughtHours: number;
    attendedCount: number;
    accruedCost: number;
    paidAmount: number;
    amountDue: number;
  }[];
  recentAttendance?: {
    lessonNumber?: number;
    date?: string;
    durationMinutes?: number;
    subject?: string;
  }[];
}

export function generateStudentStatementWhatsAppMessage(data: StatementDataPayload, isArabic = true): string {
  const totalMin = Math.round((data.totalTaughtHours || 0) * 60);
  const hoursFormatted = formatHoursHuman(data.totalTaughtHours, isArabic);
  const dateStr = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  
  if (isArabic) {
    let msg = `📊 *كشف الحساب المالي للطالب*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *اسم الطالب:* ${data.studentName}\n`;
    if (data.subjectName) {
      msg += `📚 *المادة الدراسية:* ${data.subjectName}${data.studyTypeLabel ? ` (${data.studyTypeLabel})` : ""}\n`;
    }
    msg += `📅 *تاريخ الإصدار:* ${dateStr}\n\n`;
    
    msg += `⏱️ *عدد الساعات التي درسها:* ${data.totalTaughtHours} ساعة (${hoursFormatted} • ${totalMin} دقيقة تدريس فعلي)\n`;
    msg += `🎟️ *عدد الحصص المنفذة:* ${data.totalAttendedLessons} حصة حضور\n`;
    if (data.isMonthly && data.billedMonthsCount) {
      msg += `🗓️ *الشهور المحتسبة:* ${data.billedMonthsCount} شهر${data.monthlyCost ? ` (اشتراك شهري: ${data.monthlyCost} ج.م)` : ""}\n`;
    }
    msg += `💵 *إجمالي الرسوم المحسوبة:* ${data.totalAccruedCost} ج.م\n`;
    msg += `💳 *إجمالي المبالغ المسددة:* ${data.totalPaidAmount} ج.م\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (data.amountDue > 0) {
      msg += `🔴 *المبلغ المستحق المطلوب سداده:* ${data.amountDue} ج.م\n`;
    } else if (data.creditRemaining > 0) {
      msg += `🟢 *الرصيد الفائض المتبقي للطالب:* +${data.creditRemaining} ج.م\n`;
    } else {
      msg += `🟢 *الحالة المالية:* مسدد بالكامل (لا توجد مستحقات)\n`;
    }
    
    if (data.subjectsBreakdown && data.subjectsBreakdown.length > 1) {
      msg += `\n📑 *تفصيل الساعات والحساب لكل مادة:*\n`;
      data.subjectsBreakdown.forEach((s, idx) => {
        msg += `${idx + 1}. *${s.subjectName}*: درس ${s.totalTaughtHours} ساعة (${s.attendedCount} حصة) • المحسوب: ${s.accruedCost} ج.م • المسدد: ${s.paidAmount} ج.م ${s.amountDue > 0 ? `(مستحق: ${s.amountDue} ج.م)` : `(مسدد)`}\n`;
      });
    }

    if (data.recentAttendance && data.recentAttendance.length > 0) {
      msg += `\n🗓️ *آخر الحصص المنفذة وساعاتها:*\n`;
      const recent = data.recentAttendance.slice(0, 5);
      recent.forEach((ar, idx) => {
        const dur = ar.durationMinutes || 60;
        msg += `• حصة #${ar.lessonNumber || (idx + 1)}${ar.date ? ` بتاريخ ${ar.date}` : ""}: مدتها ${dur} دقيقة (${(dur / 60).toFixed(1)} ساعة)\n`;
      });
      if (data.recentAttendance.length > 5) {
        msg += `... والمزيد بإجمالي ${data.totalAttendedLessons} حصة و ${data.totalTaughtHours} ساعة دراسة.\n`;
      }
    }
    
    msg += `\nمع خالص الشكر والتقدير للمتابعة الكريمة 🌸`;
    return msg;
  } else {
    let msg = `📊 *Student Financial Statement*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Student:* ${data.studentName}\n`;
    if (data.subjectName) {
      msg += `📚 *Subject:* ${data.subjectName}${data.studyTypeLabel ? ` (${data.studyTypeLabel})` : ""}\n`;
    }
    msg += `📅 *Date:* ${dateStr}\n\n`;
    msg += `⏱️ *Hours Studied:* ${data.totalTaughtHours} hours (${hoursFormatted} • ${totalMin} minutes)\n`;
    msg += `🎟️ *Attended Lessons:* ${data.totalAttendedLessons} lessons\n`;
    msg += `💵 *Total Accrued Cost:* ${data.totalAccruedCost} EGP\n`;
    msg += `💳 *Total Amount Paid:* ${data.totalPaidAmount} EGP\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (data.amountDue > 0) {
      msg += `🔴 *Balance Due:* ${data.amountDue} EGP\n`;
    } else if (data.creditRemaining > 0) {
      msg += `🟢 *Prepaid Credit Remaining:* +${data.creditRemaining} EGP\n`;
    } else {
      msg += `🟢 *Status:* Fully Settled\n`;
    }
    return msg;
  }
}


