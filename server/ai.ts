import { GoogleGenAI, Type } from "@google/genai";
import {
  Session,
  Student,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AIRule,
  SubjectSessionRecord,
  MemoryUpdateSuggestion
} from "../src/types";

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return ai;
}

export interface GenerateDailyReportParams {
  session: Session;
  student: Student;
  teacherName: string;
  activeAiRules: AIRule[];
  studentMemory?: StudentMemory;
  targetLanguage?: "en" | "ar";
  selectedTemplate?: {
    name: string;
    structure: {
      promptInstructions: string;
      sectionsOrder: string[];
      headerFormat: string;
    };
  };
}

export interface GenerateMonthlyReportParams {
  student: Student;
  teacherName: string;
  month: string;
  year: number;
  approvedReports: DailyReport[];
  activeAiRules: AIRule[];
  targetLanguage?: "en" | "ar";
}

/**
 * Generate Daily Report according to SRS Chapter 5 & 6 rules
 */
export async function generateDailyReportAI(params: GenerateDailyReportParams): Promise<DailyReport> {
  const { session, student, teacherName, activeAiRules, studentMemory, selectedTemplate, targetLanguage = "en" } = params;

  // Build full context prompt
  const rulesPrompt = activeAiRules
    .map(r => `- [${r.category.toUpperCase()}] ${r.name}: ${r.instruction}`)
    .join("\n");

  const templatePrompt = selectedTemplate ? `
STRUCTURAL TEMPLATE INSTRUCTIONS (${selectedTemplate.name}):
- Sections Order: ${selectedTemplate.structure.sectionsOrder.join(" -> ")}
- Header Format: ${selectedTemplate.structure.headerFormat}
- AI Structural Rules: ${selectedTemplate.structure.promptInstructions}
` : "";

  const subjectsPrompt = session.subjectRecords.map(sr => {
    return `--- Subject: ${sr.subject} ---
Teacher Notes: ${sr.teacherNotes || "N/A"}
Student Performance Ratings: Participation: ${sr.performance.participation}/5, Focus: ${sr.performance.focus}/5, Understanding: ${sr.performance.understanding}/5, Confidence: ${sr.performance.confidence}/5, Behavior: ${sr.performance.behavior}/5
Written Observations: ${sr.performance.writtenObservations || "None"}
Mistakes Recorded: ${sr.mistakes.length ? sr.mistakes.join(", ") : "None"}
Achievements Recorded: ${sr.achievements.length ? sr.achievements.join(", ") : "None"}
Homework Assigned: ${sr.homework.length ? sr.homework.map(h => `${h.category}: ${h.task} [Status: ${h.status}]`).join("; ") : "None"}
Custom Subject Instructions: ${sr.customAiInstructions || "None"}`;
  }).join("\n\n");

  const memoryContext = studentMemory ? `
Student Memory Context (For Continuity Only - Do NOT invent new facts):
- Historical Strengths: ${studentMemory.strengths.join(", ") || "None"}
- Areas Needing Focus: ${studentMemory.areasForImprovement.join(", ") || "None"}
- Past Homework Progress: ${studentMemory.homeworkHistory.slice(0, 3).map(h => h.task).join("; ") || "None"}
` : "";

  const systemInstruction = `You are DITA (Daily Islamic Teacher Assistant), an AI educational assistant for teachers, NOT a conversational chatbot.

STRICT EVIDENCE GROUNDING RULES (NO INVENTED FACTS):
1. THE AI MUST NEVER INVENT INFORMATION. Generate report content and memory suggestions ONLY from:
   - Teacher notes
   - Uploaded lesson files/attachments
   - Student Memory history
   - Previous reports
   - Active Teacher AI Rules
2. THE TEACHER IS ALWAYS THE FINAL DECISION MAKER. All AI outputs are pending suggestions for teacher review and final approval.
3. ONE LESSON MAY CONTAIN MULTIPLE SUBJECTS (e.g. Holy Qur'an, Tajweed, Arabic Language, Islamic Studies, English). Generate ONE well-organized, unified report covering all subjects in the session.
4. SUGGESTED STUDENT MEMORY UPDATES:
   - Analyze the lesson notes, performance ratings, mistakes, and achievements.
   - Suggest 2-5 concrete updates for Student Memory (type: strength, areaForImprovement, recurringMistake, or teacherNote).
   - NEVER update Student Memory automatically; suggestions require explicit teacher review with Accept, Edit, or Reject options.
5. Output language: ${targetLanguage === "ar" ? "Arabic" : "Professional English"}.

ACTIVE PERMANENT AI RULES:
${rulesPrompt}
${templatePrompt}
`;

  const userPrompt = `Generate a comprehensive multi-subject Daily Report and suggested Student Memory updates for student "${student.fullName}".

Session Details:
- Student Name: ${student.fullName} (Age: ${student.age}, Level: ${student.currentLevel})
- Date: ${session.date}
- Session Number: #${session.sessionNumber}
- Duration: ${session.durationMinutes} minutes
- Teacher: ${teacherName}

SUBJECT RECORDS:
${subjectsPrompt}

${memoryContext}

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Daily Educational Report - Session #${session.sessionNumber}",
  "overallPerformanceSummary": "A concise paragraph summarizing multi-subject performance and engagement.",
  "subjectsCovered": [
    {
      "subject": "Name of subject",
      "summary": "1-2 sentence summary of material covered strictly from teacher notes.",
      "lessonsStudied": ["List of specific lessons or topics from notes"],
      "surahsRecited": ["List of Surahs or verses if Quran"],
      "grammarOrTopics": ["Grammar or Tajweed topics if applicable"],
      "vocabularyOrRules": ["Key rules or vocabulary"],
      "performanceNotes": "Observations on student performance in this subject",
      "homework": ["Assigned homework items for this subject"]
    }
  ],
  "teacherRemarks": "Encouraging overall teacher remarks.",
  "closingMessage": "Respectful closing Islamic dua or parent message.",
  "contentEnglish": "Full formatted text version of the report in English",
  "contentArabic": "Full formatted text version of the report in Arabic",
  "suggestedMemoryUpdates": [
    {
      "id": "sug_1",
      "type": "strength | areaForImprovement | recurringMistake | teacherNote",
      "subject": "Subject name if specific",
      "text": "Evidence-grounded update suggestion derived strictly from lesson notes/achievements/mistakes",
      "status": "pending"
    }
  ]
}`;

  const client = getGeminiClient();

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        const reportId = `rep_${Date.now()}`;

        // Build homework items list
        const allHomework = session.subjectRecords.flatMap(sr => sr.homework);

        const rawSuggestions: any[] = Array.isArray(parsed.suggestedMemoryUpdates) ? parsed.suggestedMemoryUpdates : [];
        const suggestedMemoryUpdates: MemoryUpdateSuggestion[] = rawSuggestions.map((s, i) => ({
          id: s.id || `sug_${Date.now()}_${i}`,
          type: s.type || "teacherNote",
          subject: s.subject,
          text: s.text || "Lesson observation",
          status: "pending"
        }));

        return {
          id: reportId,
          sessionId: session.id,
          studentId: student.id,
          studentName: student.fullName,
          teacherId: session.teacherId,
          teacherName,
          reportType: "daily",
          title: parsed.title || `Daily Educational Report - Session #${session.sessionNumber}`,
          date: session.date,
          sessionNumber: session.sessionNumber,
          durationMinutes: session.durationMinutes,
          subjectsCovered: parsed.subjectsCovered || [],
          overallPerformanceSummary: parsed.overallPerformanceSummary || "Session completed successfully.",
          homeworkSummary: allHomework,
          teacherRemarks: parsed.teacherRemarks || "Great effort in today's lesson.",
          closingMessage: parsed.closingMessage || "May Allah bless the student with continuous knowledge and wisdom. Ameen.",
          contentEnglish: parsed.contentEnglish || buildFallbackText(student, session, teacherName, "en"),
          contentArabic: parsed.contentArabic || buildFallbackText(student, session, teacherName, "ar"),
          suggestedMemoryUpdates,
          isApproved: false,
          isDraft: true,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error("Gemini API call failed, falling back to rule-based engine:", err);
    }
  }

  // Fallback Rule-Based Generation Engine (guarantees offline/unconfigured key operation)
  return createFallbackDailyReport(session, student, teacherName, targetLanguage);
}

/**
 * Generate Monthly Report according to SRS Chapter 6.11
 */
export async function generateMonthlyReportAI(params: GenerateMonthlyReportParams): Promise<MonthlyReport> {
  const { student, teacherName, month, year, approvedReports, activeAiRules, targetLanguage = "en" } = params;

  const totalSessions = approvedReports.length;
  const homeworkItems = approvedReports.flatMap(r => r.homeworkSummary);
  const completedHw = homeworkItems.filter(h => h.status === "Completed").length;
  const completionRate = homeworkItems.length ? Math.round((completedHw / homeworkItems.length) * 100) : 100;

  const client = getGeminiClient();
  if (client && approvedReports.length > 0) {
    try {
      const reportsSummaryPrompt = approvedReports.map(r => `
Date: ${r.date} (Session #${r.sessionNumber})
Subjects: ${r.subjectsCovered.map(s => s.subject).join(", ")}
Summary: ${r.overallPerformanceSummary}
Homework: ${r.homeworkSummary.map(h => `${h.task} (${h.status})`).join("; ")}
`).join("\n---\n");

      const prompt = `Generate a Monthly Progress Report for student ${student.fullName} for ${month} ${year}.
Teacher Name: ${teacherName}
Total Approved Sessions: ${totalSessions}
Homework Completion Rate: ${completionRate}%

Approved Daily Reports History:
${reportsSummaryPrompt}

Respond strictly with a JSON object matching this schema:
{
  "title": "Monthly Progress Report - ${month} ${year}",
  "overallProgress": "Summary of learning progress across the month.",
  "learningDevelopment": "Detailed growth points in Quran, Tajweed, or Arabic.",
  "strengths": ["Strength 1", "Strength 2"],
  "areasForImprovement": ["Area 1", "Area 2"],
  "teacherRecommendations": "Actionable recommendations for parents at home.",
  "closingMessage": "Closing blessing/dua.",
  "contentEnglish": "Full English report formatted text"
}`;

      const res = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are DITA AI engine generating monthly student progress reports based ONLY on approved daily reports.",
          responseMimeType: "application/json"
        }
      });

      if (res.text) {
        const parsed = JSON.parse(res.text.trim());
        return {
          id: `mrep_${Date.now()}`,
          studentId: student.id,
          studentName: student.fullName,
          teacherId: student.teacherId,
          month,
          year,
          reportType: "monthly",
          title: parsed.title || `Monthly Report - ${month} ${year}`,
          overallProgress: parsed.overallProgress || `Student completed ${totalSessions} sessions with high dedication.`,
          totalSessionsCompleted: totalSessions,
          attendanceDays: totalSessions,
          homeworkCompletionRate: completionRate,
          learningDevelopment: parsed.learningDevelopment || "Consistent growth across all studied subjects.",
          strengths: parsed.strengths || ["Strong commitment to daily lessons", "Active participation"],
          areasForImprovement: parsed.areasForImprovement || ["Adherence to daily revision schedule"],
          teacherRecommendations: parsed.teacherRecommendations || "Continue encouraging quiet daily recitation review.",
          closingMessage: parsed.closingMessage || "May Allah bless the student's learning journey.",
          contentEnglish: parsed.contentEnglish || `Monthly Progress Report for ${student.fullName} (${month} ${year})\nTotal Sessions: ${totalSessions}\nHomework Completion: ${completionRate}%\nProgress: ${parsed.overallProgress}`,
          isApproved: false,
          createdAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.error("Monthly AI generation error:", e);
    }
  }

  // Fallback monthly report
  return {
    id: `mrep_${Date.now()}`,
    studentId: student.id,
    studentName: student.fullName,
    teacherId: student.teacherId,
    month,
    year,
    reportType: "monthly",
    title: `Monthly Progress Report - ${month} ${year}`,
    overallProgress: `${student.fullName} completed ${totalSessions} sessions in ${month} ${year}. Demonstrated great diligence and progress in ${student.subjects.join(", ")}.`,
    totalSessionsCompleted: totalSessions,
    attendanceDays: totalSessions,
    homeworkCompletionRate: completionRate,
    learningDevelopment: "Consistent engagement during recitation and subject exercises.",
    strengths: [
      "Active engagement during lessons",
      "Good comprehension of core concepts"
    ],
    areasForImprovement: [
      "Regular daily revision routine at home"
    ],
    teacherRecommendations: "Allocate 15 minutes for daily review of studied lessons.",
    closingMessage: "May Allah grant the student continuous success. Ameen.",
    contentEnglish: `Monthly Report for ${student.fullName}\nMonth: ${month} ${year}\nTotal Sessions: ${totalSessions}\nHomework Rate: ${completionRate}%\nOverall Progress: High dedication shown in all lessons.`,
    isApproved: false,
    createdAt: new Date().toISOString()
  };
}

/**
 * Enhance Teacher Notes without altering educational facts (SRS REQ-AI-003)
 */
export async function enhanceTeacherNotes(rawNotes: string, subject: string, activeAiRules?: AIRule[]): Promise<string> {
  if (!rawNotes.trim()) return rawNotes;

  const rulesText = Array.isArray(activeAiRules) && activeAiRules.length > 0
    ? `\n\nFollow these specific teacher AI rules:\n` + activeAiRules.map(r => `- ${r.name}: ${r.instruction}`).join("\n")
    : "";

  const client = getGeminiClient();
  if (client) {
    try {
      const res = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Refine and format the following raw teacher notes for subject "${subject}". Make grammar clear, organize into clean bullet points, but DO NOT add any fake facts or unmentioned lessons.${rulesText}

Raw Notes:
${rawNotes}`,
        config: {
          systemInstruction: "You are an educational proofreader. Improve grammar and clarity while preserving 100% of the original factual facts."
        }
      });
      if (res.text) return res.text.trim();
    } catch (e) {
      console.error("Enhance notes error:", e);
    }
  }

  return rawNotes;
}

// Helper: Rule-based fallback daily report
function createFallbackDailyReport(session: Session, student: Student, teacherName: string, lang: "en" | "ar"): DailyReport {
  const subjectsCovered = session.subjectRecords.map(sr => {
    return {
      subject: sr.subject,
      summary: sr.teacherNotes ? `Studied ${sr.subject}. Notes: ${sr.teacherNotes}` : `Completed ${sr.subject} section successfully.`,
      lessonsStudied: [sr.teacherNotes || "Lesson exercises completed."],
      surahsRecited: sr.subject === "Holy Qur'an" ? [sr.teacherNotes] : [],
      performanceNotes: `Participation: ${sr.performance.participation}/5, Focus: ${sr.performance.focus}/5.`,
      homework: sr.homework.map(h => h.task)
    };
  });

  const allHw = session.subjectRecords.flatMap(sr => sr.homework);

  const suggestedMemoryUpdates: MemoryUpdateSuggestion[] = [];
  session.subjectRecords.forEach((sr, idx) => {
    sr.achievements.forEach((ach, aIdx) => {
      suggestedMemoryUpdates.push({
        id: `sug_ach_${idx}_${aIdx}`,
        type: "strength",
        subject: sr.subject,
        text: `Achievement in ${sr.subject}: ${ach}`,
        status: "pending"
      });
    });
    sr.mistakes.forEach((m, mIdx) => {
      suggestedMemoryUpdates.push({
        id: `sug_mis_${idx}_${mIdx}`,
        type: "recurringMistake",
        subject: sr.subject,
        text: `Area to focus in ${sr.subject}: ${m}`,
        status: "pending"
      });
    });
    if (sr.performance.writtenObservations) {
      suggestedMemoryUpdates.push({
        id: `sug_obs_${idx}`,
        type: "teacherNote",
        subject: sr.subject,
        text: `Observation in ${sr.subject}: ${sr.performance.writtenObservations}`,
        status: "pending"
      });
    }
  });

  return {
    id: `rep_${Date.now()}`,
    sessionId: session.id,
    studentId: student.id,
    studentName: student.fullName,
    teacherId: session.teacherId,
    teacherName,
    reportType: "daily",
    title: `Daily Educational Report - Session #${session.sessionNumber}`,
    date: session.date,
    sessionNumber: session.sessionNumber,
    durationMinutes: session.durationMinutes,
    subjectsCovered,
    overallPerformanceSummary: `${student.fullName} completed Session #${session.sessionNumber} (${session.durationMinutes} minutes) covering ${session.subjectRecords.map(s => s.subject).join(", ")}.`,
    homeworkSummary: allHw,
    teacherRemarks: "Good progress demonstrated today. Keep up the consistent effort.",
    closingMessage: "May Allah grant the student continuous success in knowledge and character. Ameen.",
    contentEnglish: buildFallbackText(student, session, teacherName, "en"),
    contentArabic: buildFallbackText(student, session, teacherName, "ar"),
    suggestedMemoryUpdates,
    isApproved: false,
    isDraft: true,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
}

function buildFallbackText(student: Student, session: Session, teacherName: string, lang: "en" | "ar"): string {
  if (lang === "ar") {
    return `تقرير المتابعة اليومي للطالب ${student.fullName}
الحصة رقم: #${session.sessionNumber} | التاريخ: ${session.date} | المدة: ${session.durationMinutes} دقيقة
المعلم: ${teacherName}

المواد المدروسة:
${session.subjectRecords.map(sr => `- ${sr.subject}: ${sr.teacherNotes}`).join("\n")}

الواجب المنزلي:
${session.subjectRecords.flatMap(sr => sr.homework).map(h => `- [${h.subject}] ${h.task}`).join("\n") || "لا يوجد واجب جديد"}

ملاحظات المعلم: أظهر الطالب التزاما وإقبالا محمودا في الحصة.
بارك الله في الطالب وأهله.`;
  }

  return `Daily Educational Progress Report
Student: ${student.fullName}
Session #${session.sessionNumber} | Date: ${session.date} | Duration: ${session.durationMinutes} mins
Teacher: ${teacherName}

Subjects Covered:
${session.subjectRecords.map(sr => `• ${sr.subject}: ${sr.teacherNotes}`).join("\n")}

Homework Assigned:
${session.subjectRecords.flatMap(sr => sr.homework).map(h => `• [${h.subject}] ${h.task}`).join("\n") || "No new homework assigned."}

Teacher Observations: High engagement and commendable dedication throughout the session.

May Allah grant ${student.fullName} continuous wisdom and success. Ameen.`;
}
