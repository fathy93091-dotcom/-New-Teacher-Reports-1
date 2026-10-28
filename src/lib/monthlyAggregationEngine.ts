/**
 * GoStars Monthly Comprehensive Report Engine
 * محرك تجميع وتحليل التقرير الشهري الشامل للقرآن الكريم والدراسات الإسلامية
 * 
 * المبادئ الصارمة:
 * 1. مقتصر حصراً على المادتين: "قرآن كريم" و "Quran, Arabic and Islamic Studies"
 * 2. تجميع كل تقارير وحصص الطالب في الشهر والسنة المحددة بدقة تامة.
 * 3. منع اختلاط البيانات: لا يقرأ بيانات طالب آخر أو شهر آخر أو مادة أخرى.
 * 4. منع اختراع البيانات: الاعتماد حصراً على البيانات المسجلة دون اختلاق سور أو درجات.
 * 5. منع تكرار الحفظ: دمج السور والآيات المتكررة في نطاق واحد متصل.
 * 6. إخراج تقرير نصي منظم مطابق تماماً للهيكل المطلوب.
 */

import { Student, GeneratedReport, AttendanceRecord } from "../types";
import {
  buildStructuredMonthlyAnalysis,
  buildCategorySpecificNarratives,
  deduplicateSurahScope,
  isSubjectEligibleForMonthlyReport,
  getEligibleSubjectsForStudent,
  filterEligibleStudentsForMonthly
} from "./monthlyReportModel";
import { formatMonthlyReportMonth } from "./monthlyQuranReport";

export const ELIGIBLE_MONTHLY_SUBJECTS = [
  "Quran, Arabic and Islamic Studies",
  "قرآن كريم"
] as const;

export type EligibleMonthlySubject = typeof ELIGIBLE_MONTHLY_SUBJECTS[number];

export const isEligibleMonthlySubject = isSubjectEligibleForMonthlyReport;
export const getStudentEligibleSubjects = getEligibleSubjectsForStudent;
export const filterEligibleStudents = filterEligibleStudentsForMonthly;

export interface MonthlyLessonRecord {
  date: string;
  lessonNumber?: number;
  durationMinutes: number;
  attendance: "present" | "absent" | "late";
  attendanceLabel: string;
  homeworkStatus?: string;
  classEvents: string;
  homeworkNotes: string;
  teacherNotes: string;
  overallEvaluation: string;
  reportText?: string;
}

export interface AggregatedMonthlyData {
  student: Student;
  subject: string;
  year: number;
  month: number;
  monthPrefix: string;
  monthLabel: string;
  totalLessonsCount: number;
  attendedLessonsCount: number;
  absentLessonsCount: number;
  totalHours: number;
  lessons: MonthlyLessonRecord[];

  newMemorization?: {
    content: string;
    evaluation: string;
  };
  revision?: {
    content: string;
    evaluation: string;
  };
  recitationAndFoundation?: {
    content: string;
    evaluation: string;
  };
  islamicStudies?: {
    content: string;
    evaluation: string;
  };

  indicators: {
    memorizationSpeed: number;
    revisionStrength: number;
    tajweedAndFoundation: number;
    commitment: number;
  };

  strengths: string;
  recommendations: string;
  nextMonthPlan: string;
  pedagogicalAnalysis?: string;
  deductiveInference?: string;
}

export const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export const ENGLISH_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function formatEvaluationMonth(month: number, year: number, lang: "ar" | "en" = "ar"): string {
  return formatMonthlyReportMonth(month, year, undefined, lang);
}

export function deduplicateQuranScope(items: string[], lang: "ar" | "en" = "ar"): string {
  return deduplicateSurahScope(items, lang);
}

/**
 * محرك التجميع والتحليل الشامل لبيانات الطالب
 */
export function aggregateMonthlyStudentData(params: {
  student: Student;
  subject: string;
  year: number;
  month: number;
  allReports: GeneratedReport[];
  allAttendance: AttendanceRecord[];
  lang?: "ar" | "en";
}): AggregatedMonthlyData {
  const { student, subject, year, month, allReports = [], allAttendance = [], lang = "ar" } = params;

  const analysis = buildStructuredMonthlyAnalysis({
    student,
    subject,
    year,
    month,
    allReports,
    allAttendance,
    lang
  });

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthLabel = formatMonthlyReportMonth(month, year, undefined, lang);

  const mappedLessons: MonthlyLessonRecord[] = analysis.lessons.map(l => ({
    date: l.date,
    lessonNumber: l.lessonNumber,
    durationMinutes: l.durationMinutes,
    attendance: l.attendance,
    attendanceLabel: lang === "en" ? (l.attendance === "present" ? "Present" : l.attendance === "late" ? "Late" : "Absent") : (l.attendance === "present" ? "حاضر" : l.attendance === "late" ? "متأخر" : "غائب"),
    homeworkStatus: l.homeworkStatus,
    classEvents: l.classEvents,
    homeworkNotes: l.homeworkNotes,
    teacherNotes: l.teacherNotes,
    overallEvaluation: l.overallEvaluation,
    reportText: l.reportText
  }));

  const dynamicNarratives = buildCategorySpecificNarratives({
    hasHefz: Boolean(analysis.newMemorization.content),
    hasRev: Boolean(analysis.revision.content),
    hasRead: Boolean(analysis.quranReading?.content || analysis.recitationAndFoundation.content),
    hasNoor: Boolean(analysis.noorAlBayan?.content),
    hasTajweed: Boolean(analysis.tajweedProgress.content),
    hasIslamic: Boolean(analysis.islamicStudiesProgress.content),
    isEn: lang === "en"
  });

  return {
    student,
    subject,
    year,
    month,
    monthPrefix,
    monthLabel,
    totalLessonsCount: analysis.lessonsIncludedCount,
    attendedLessonsCount: analysis.attendedCount,
    absentLessonsCount: analysis.absentCount,
    totalHours: analysis.totalHours,
    lessons: mappedLessons,
    newMemorization: analysis.newMemorization.content ? analysis.newMemorization : undefined,
    revision: analysis.revision.content ? analysis.revision : undefined,
    recitationAndFoundation: analysis.recitationAndFoundation.content ? analysis.recitationAndFoundation : undefined,
    islamicStudies: analysis.islamicStudiesProgress.content ? analysis.islamicStudiesProgress : undefined,
    indicators: {
      memorizationSpeed: analysis.indicators.memorization,
      revisionStrength: analysis.indicators.revision,
      tajweedAndFoundation: analysis.indicators.tajweedAndFoundation,
      commitment: analysis.indicators.commitment
    },
    strengths: analysis.strengths.join(lang === "en" ? ". " : " • "),
    recommendations: analysis.areasForImprovement.join(lang === "en" ? ". " : " • "),
    nextMonthPlan: analysis.nextMonthPlan,
    pedagogicalAnalysis: dynamicNarratives.pedagogicalAnalysis,
    deductiveInference: dynamicNarratives.deductiveInference
  };
}

/**
 * صياغة التقرير الشهري الشامل في الهيكل النصي المحدد
 */
export function buildStructuredMonthlyReportText(data: AggregatedMonthlyData, lang: "ar" | "en" = "ar"): string {
  const isEn = lang === "en";

  if (isEn) {
    const lines: string[] = [
      `✨ MONTHLY LEARNING PROGRESS REPORT ✨`,
      ``,
      `Student Name: ${data.student.fullName}`,
      `Evaluation Month: ${data.monthLabel}`,
      ``
    ];

    if (data.pedagogicalAnalysis) {
      lines.push(`✦ MONTHLY PROGRESS SUMMARY:`, data.pedagogicalAnalysis, ``);
    }

    if (data.newMemorization && data.newMemorization.content) {
      lines.push(`New Memorization (if applicable): ${data.newMemorization.content} - Evaluation: ${data.newMemorization.evaluation}`, ``);
    }
    if (data.revision && data.revision.content) {
      lines.push(`Revision (if applicable): ${data.revision.content} - Evaluation: ${data.revision.evaluation}`, ``);
    }
    if (data.recitationAndFoundation && data.recitationAndFoundation.content) {
      lines.push(`Recitation & Foundation (if applicable): ${data.recitationAndFoundation.content} - Evaluation: ${data.recitationAndFoundation.evaluation}`, ``);
    }
    if (data.islamicStudies && data.islamicStudies.content) {
      lines.push(`Islamic Studies (if applicable): ${data.islamicStudies.content} - Evaluation: ${data.islamicStudies.evaluation}`, ``);
    }

    if (data.indicators.memorizationSpeed > 0 && data.newMemorization?.content) {
      lines.push(`Memorization Speed Indicator: ${data.indicators.memorizationSpeed}%`, ``);
    }
    if (data.indicators.revisionStrength > 0 && data.revision?.content) {
      lines.push(`Revision Strength Indicator: ${data.indicators.revisionStrength}%`, ``);
    }
    if (data.indicators.tajweedAndFoundation > 0 && data.recitationAndFoundation?.content) {
      lines.push(`Tajweed & Foundation Indicator: ${data.indicators.tajweedAndFoundation}%`, ``);
    }
    if (data.indicators.commitment > 0) {
      lines.push(`Commitment Indicator: ${data.indicators.commitment}%`, ``);
    }

    lines.push(
      `Strengths: ${data.strengths}`,
      ``,
      `Recommendations: ${data.recommendations}`,
      ``,
      `Next Month Plan:`,
      data.nextMonthPlan
    );

    return lines.join("\n");
  }

  const lines: string[] = [
    `✨ تقرير التقدم التعليمي الشهري ✨`,
    ``,
    `اسم الطالب: ${data.student.fullName}`,
    `شهر التقييم: ${data.monthLabel}`,
    ``
  ];

  if (data.pedagogicalAnalysis) {
    lines.push(`✦ ملخص التقدم الشهري:`, data.pedagogicalAnalysis, ``);
  }

  if (data.newMemorization && data.newMemorization.content) {
    lines.push(`حفظ جديد (إن وجد): ${data.newMemorization.content} - التقييم: ${data.newMemorization.evaluation}`, ``);
  }
  if (data.revision && data.revision.content) {
    lines.push(`مراجعة (إن وجد): ${data.revision.content} - التقييم: ${data.revision.evaluation}`, ``);
  }
  if (data.recitationAndFoundation && data.recitationAndFoundation.content) {
    lines.push(`تلاوة وتأسيس (إن وجد): ${data.recitationAndFoundation.content} - التقييم: ${data.recitationAndFoundation.evaluation}`, ``);
  }
  if (data.islamicStudies && data.islamicStudies.content) {
    lines.push(`دراسات إسلامية (إن وجد): ${data.islamicStudies.content} - التقييم: ${data.islamicStudies.evaluation}`, ``);
  }

  if (data.indicators.memorizationSpeed > 0 && data.newMemorization?.content) {
    lines.push(`مؤشر سرعة الحفظ: ${data.indicators.memorizationSpeed}%`, ``);
  }
  if (data.indicators.revisionStrength > 0 && data.revision?.content) {
    lines.push(`مؤشر قوة المراجعة: ${data.indicators.revisionStrength}%`, ``);
  }
  if (data.indicators.tajweedAndFoundation > 0 && data.recitationAndFoundation?.content) {
    lines.push(`مؤشر التجويد والتأسيس: ${data.indicators.tajweedAndFoundation}%`, ``);
  }
  if (data.indicators.commitment > 0) {
    lines.push(`مؤشر الالتزام: ${data.indicators.commitment}%`, ``);
  }

  lines.push(
    `نقاط القوة: ${data.strengths}`,
    ``,
    `التوصيات: ${data.recommendations}`,
    ``,
    `خطة الشهر القادم:`,
    data.nextMonthPlan
  );

  return lines.join("\n");
}
