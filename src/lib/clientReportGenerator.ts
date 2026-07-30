import { DailyReport, MonthlyReport, Session, Student, AppSettings, MemoryUpdateSuggestion } from "../types";

export function generateClientSideDailyReport(
  session: Session,
  student: Student | undefined,
  settings: AppSettings
): DailyReport {
  const isArabic = settings.preferredLanguage === "ar";
  const studentName = student?.fullName || "الطالب";
  const teacherName = settings.teacherName || (isArabic ? "معلم المادة" : "Teacher");

  const subjectsCovered = (session.subjectRecords || []).map(sr => {
    return {
      subject: sr.subject,
      summary: sr.teacherNotes
        ? (isArabic ? `دراسة ${sr.subject}: ${sr.teacherNotes}` : `Studied ${sr.subject}: ${sr.teacherNotes}`)
        : (isArabic ? `تم إنجاز حصة ${sr.subject} بنجاح` : `Completed ${sr.subject} lesson successfully`),
      lessonsStudied: [sr.teacherNotes || (isArabic ? "تم أداء التمارين والتطبيقات" : "Completed exercises")],
      surahsRecited: sr.subject === "Holy Qur'an" && sr.teacherNotes ? [sr.teacherNotes] : [],
      performanceNotes: isArabic
        ? `المشاركة: ${sr.performance.participation}/5, التركيز: ${sr.performance.focus}/5, الفهم: ${sr.performance.understanding}/5`
        : `Participation: ${sr.performance.participation}/5, Focus: ${sr.performance.focus}/5, Understanding: ${sr.performance.understanding}/5`,
      homework: (sr.homework || []).map(h => h.task)
    };
  });

  const allHomework = (session.subjectRecords || []).flatMap(sr => sr.homework || []);

  const suggestedMemoryUpdates: MemoryUpdateSuggestion[] = [];
  (session.subjectRecords || []).forEach((sr, idx) => {
    (sr.achievements || []).forEach((ach, aIdx) => {
      suggestedMemoryUpdates.push({
        id: `sug_ach_${Date.now()}_${idx}_${aIdx}`,
        type: "strength",
        subject: sr.subject,
        text: isArabic ? `إنجاز في ${sr.subject}: ${ach}` : `Achievement in ${sr.subject}: ${ach}`,
        status: "pending"
      });
    });
    (sr.mistakes || []).forEach((m, mIdx) => {
      suggestedMemoryUpdates.push({
        id: `sug_mis_${Date.now()}_${idx}_${mIdx}`,
        type: "recurringMistake",
        subject: sr.subject,
        text: isArabic ? `تنبيه تجويدي/أكاديمي في ${sr.subject}: ${m}` : `Observation in ${sr.subject}: ${m}`,
        status: "pending"
      });
    });
    if (sr.performance.writtenObservations) {
      suggestedMemoryUpdates.push({
        id: `sug_obs_${Date.now()}_${idx}`,
        type: "teacherNote",
        subject: sr.subject,
        text: sr.performance.writtenObservations,
        status: "pending"
      });
    }
  });

  const contentArabic = `بسم الله الرحمن الرحيم
تقرير متابعة اليومي - الحصة رقم #${session.sessionNumber}
اسم الطالب: ${studentName}
التاريخ: ${session.date} | مدة الحصة: ${session.durationMinutes} دقيقة
المعلم: ${teacherName}

المواد التي تم تدريسها:
${(session.subjectRecords || []).map(sr => `• ${sr.subject}:\n  - ملاحظات الحصة: ${sr.teacherNotes || 'أداء ممتاز'}\n  - التقييم: مشاركة ${sr.performance.participation}/5، تركيز ${sr.performance.focus}/5`).join("\n\n")}

الواجبات المنزلية:
${allHomework.length > 0 ? allHomework.map(h => `• ${h.task}`).join("\n") : "• لا يوجد واجبات جديدة"}

توصيات وملاحظات المعلم:
أداء الطالب طيب ومستمر في التقدم والتحصيل بفضل الله. نسأل الله أن يبارك في علمه وعمله.`;

  const contentEnglish = `Daily Educational Report - Session #${session.sessionNumber}
Student: ${studentName}
Date: ${session.date} | Duration: ${session.durationMinutes} mins
Teacher: ${teacherName}

Subjects Covered:
${(session.subjectRecords || []).map(sr => `• ${sr.subject}:\n  - Notes: ${sr.teacherNotes || 'Excellent performance'}\n  - Evaluation: Participation ${sr.performance.participation}/5, Focus ${sr.performance.focus}/5`).join("\n\n")}

Homework Assigned:
${allHomework.length > 0 ? allHomework.map(h => `• ${h.task}`).join("\n") : "• None"}

Teacher Remarks:
The student demonstrated clear progress today. May Allah grant continuous wisdom and achievement.`;

  return {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sessionId: session.id,
    studentId: session.studentId,
    studentName,
    teacherId: session.teacherId || "teacher_001",
    teacherName,
    reportType: "daily",
    title: isArabic ? `تقرير متابعة يومي - حصة #${session.sessionNumber}` : `Daily Educational Report - Session #${session.sessionNumber}`,
    date: session.date,
    sessionNumber: session.sessionNumber,
    durationMinutes: session.durationMinutes,
    subjectsCovered,
    overallPerformanceSummary: isArabic ? `تم أداء الحصة رقم #${session.sessionNumber} بنجاح ومتابعة جميع المحاور المقررة.` : `Session #${session.sessionNumber} completed successfully with active student participation.`,
    homeworkSummary: allHomework,
    teacherRemarks: isArabic ? "أداء ممتاز ومشاركة فعالة أثناء الحصة." : "Great effort and active engagement during the lesson.",
    closingMessage: isArabic ? "نسأل الله تبارك وتعالى أن ينفع بالطالب ويزيده علماً وحفظاً." : "May Allah bless the student with continuous success.",
    contentEnglish,
    contentArabic,
    suggestedMemoryUpdates,
    isApproved: false,
    isDraft: true,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
}

export function generateClientSideMonthlyReport(
  student: Student,
  month: string,
  year: number,
  approvedReports: DailyReport[],
  settings: AppSettings
): MonthlyReport {
  const isArabic = settings.preferredLanguage === "ar";
  const teacherName = settings.teacherName || (isArabic ? "معلم المادة" : "Teacher");
  const totalSessions = approvedReports.length;
  const allHw = approvedReports.flatMap(r => r.homeworkSummary || []);
  const completedHw = allHw.filter(h => h.status === "Completed").length;
  const completionRate = allHw.length > 0 ? Math.round((completedHw / allHw.length) * 100) : 100;

  const contentArabic = `تقرير الإنجاز الشهري - ${month} ${year}
الطالب: ${student.fullName}
المعلم: ${teacherName}
إجمالي الحصص المعتمدة: ${totalSessions} حصة
نسبة إنجاز الواجبات: ${completionRate}%

ملخص الأداء والمتابعة الشهرية:
أظهر الطالب ${student.fullName} التزاماً ممتازاً ومواظبة طيبة خلال شهر ${month}. وتمت مراجعة الحفظ وتثبيت أحكام التجويد بانتظام بفضل الله وتوفيقه.

التوصيات والتوجيهات للشهر القادم:
الاستمرار في المراجعة اليومية المنتظمة، والتركيز على تطبيق مخارج الحروف والإدغام بغنة.`;

  const contentEnglish = `Monthly Progress Report - ${month} ${year}
Student: ${student.fullName}
Teacher: ${teacherName}
Total Approved Sessions: ${totalSessions}
Homework Completion Rate: ${completionRate}%

Overall Monthly Learning Summary:
Student ${student.fullName} displayed steady dedication and consistent learning development throughout ${month}.

Pedagogical Recommendations:
Maintain daily revision habit and focus on Tajweed application during recitation.`;

  return {
    id: `mrep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: student.id,
    studentName: student.fullName,
    teacherId: student.teacherId || "teacher_001",
    month,
    year,
    reportType: "monthly",
    title: isArabic ? `تقرير متابعة شهري - ${month} ${year}` : `Monthly Progress Report - ${month} ${year}`,
    overallProgress: isArabic ? `تقدم ممتاز ومستمر خلال شهر ${month}` : `Steady academic growth across ${month}`,
    totalSessionsCompleted: totalSessions,
    attendanceDays: totalSessions,
    homeworkCompletionRate: completionRate,
    learningDevelopment: isArabic ? "تحسن ملحوظ في التلاوة وحفظ السور المقررة" : "Significant improvement in Quranic recitation and memorization",
    strengths: [isArabic ? "الالتزام بالحضور" : "Attendance consistency", isArabic ? "حسن الاستماع والتركيز" : "Active listening"],
    areasForImprovement: [isArabic ? "مراجعة الواجبات بانتظام" : "Daily homework review"],
    teacherRecommendations: isArabic ? "الاستمرار في الجدول اليومي للمراجعة" : "Maintain daily revision schedule",
    closingMessage: isArabic ? "وفق الله الطالب لما يحبه ويرضاه" : "May Allah grant the student success in all endeavors",
    contentEnglish,
    contentArabic,
    isApproved: true,
    createdAt: new Date().toISOString()
  };
}
