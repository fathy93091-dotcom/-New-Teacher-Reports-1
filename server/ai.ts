import { GoogleGenAI, Type } from "@google/genai";
import {
  Session,
  Student,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AIRule,
  SubjectSessionRecord
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
  const { session, student, teacherName, activeAiRules, studentMemory, targetLanguage = "en" } = params;

  // Build full context prompt
  const rulesPrompt = activeAiRules
    .map(r => `- [${r.category.toUpperCase()}] ${r.name}: ${r.instruction}`)
    .join("\n");

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

  const systemInstruction = `You are DITA (Daily Islamic Teacher Assistant), an intelligent AI assistant built exclusively for Islamic & Arabic education teachers.
Your mandate is to convert verified teacher lesson input into a professional, structured, parent-friendly daily report.

STRICT ACCURACY RULES (SRS Chapter 5):
1. THE TEACHER IS THE PRIMARY AUTHORITY. Generate report content ONLY from provided teacher notes, performance scores, and homework.
2. NEVER INVENT or fabricate Quranic verses, Hadith, Fatwas, homework, mistakes, or unrecorded student activities.
3. If information is absent for a section, omit that section cleanly.
4. Output language must be ${targetLanguage === "ar" ? "Arabic" : "Professional English"}.
5. Follow all active AI Rules provided below.

ACTIVE PERMANENT AI RULES:
${rulesPrompt}
`;

  const userPrompt = `Generate a comprehensive Daily Report for student "${student.fullName}".

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
  "overallPerformanceSummary": "A concise paragraph summarizing the session performance and engagement.",
  "subjectsCovered": [
    {
      "subject": "Name of subject",
      "summary": "1-2 sentence summary of material covered.",
      "lessonsStudied": ["List of specific lessons or topics"],
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
  "contentArabic": "Full formatted text version of the report in Arabic"
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
export async function enhanceTeacherNotes(rawNotes: string, subject: string): Promise<string> {
  if (!rawNotes.trim()) return rawNotes;

  const client = getGeminiClient();
  if (client) {
    try {
      const res = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Refine and format the following raw teacher notes for subject "${subject}". Make grammar clear, organize into clean bullet points, but DO NOT add any fake facts or unmentioned lessons.

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
