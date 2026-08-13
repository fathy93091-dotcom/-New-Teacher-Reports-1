import { GoogleGenAI } from "@google/genai";

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

export interface ReportGenerationRequest {
  studentName: string;
  subject: string;
  date?: string;
  attendanceStatus?: string; // حاضر, غائب, متأخر
  homeworkStatus?: string; // تم, لم يتم, متأخر
  examScores?: string; // e.g. "48/50"
  teacherNotes: string; // ماذا حدث في الحصة؟
  aiInstructions: string; // تعليمات للذكاء الاصطناعي
  preferredLanguage?: "ar" | "en";
  attachment?: {
    fileName?: string;
    mimeType: string;
    data: string; // base64 string
  };
}

export async function generateGoStarsReportAI(req: ReportGenerationRequest): Promise<string> {
  const {
    studentName,
    subject,
    date = new Date().toISOString().split("T")[0],
    attendanceStatus = "حاضر",
    homeworkStatus = "تم إنجازه",
    examScores = "لا يوجد",
    teacherNotes,
    aiInstructions,
    preferredLanguage = "ar",
    attachment
  } = req;

  const systemInstruction = `أنت المساعد الذكي لنظام GoStars لإدارة المعلم. وظيفتك هي إنشاء تقرير متابعة دراسي احترافي لولي الأمر بناءً على ملاحظات وتعليمات المعلم والملفات أو الصور المرفقة إن وجدت، بدون اختلاق أي معلومات غير مذكورة.

تعليمات الصياغة:
1. استخدم لغة ${preferredLanguage === "ar" ? "عربية فصيحة، راقية، وتشجيعية" : "إنجليزية احترافية ومشجعة"}.
2. ابدأ بنقطة إيجابية وتحية طيبة لولي الأمر.
3. استعرض ما تم في الحصة وحالة الحضور والواجب واستخرج أي تفاصيل مهمة من الملف أو الصورة المرفقة إن وجدت.
4. اتبع تعليمات المعلم الخاصة بالتقرير بدقة شديدة: "${aiInstructions}".
5. لا تجعل التقرير طويلاً جداً، بل منسق في فقرات قصيرة مع نقاط واضحة ورسالة ختم طيبة.`;

  const userPromptText = `أنشئ تقريراً لولي أمر الطالب/الطالبة: ${studentName}
- المادة: ${subject}
- التاريخ: ${date}
- حالة الحضور: ${attendanceStatus}
- حالة الواجب: ${homeworkStatus}
- درجات الاختبار: ${examScores}

📝 ماذا حدث في الحصة؟ (ملاحظات المعلم):
${teacherNotes || "تم شرح الدرس بانتظام ومتابعة الأداء."}

🤖 تعليمات المعلم للذكاء الاصطناعي:
${aiInstructions || "اكتب تقريراً مشجعاً واحترافياً لولي الأمر مع توصية بسيطة."}`;

  const parts: any[] = [];

  if (attachment && attachment.data && attachment.mimeType) {
    const cleanBase64 = attachment.data.includes("base64,")
      ? attachment.data.split("base64,")[1]
      : attachment.data;

    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: cleanBase64
      }
    });

    parts.push({
      text: `${userPromptText}\n\n📎 ملحوظة هامة للمساعد الذكي: تم إرفاق ملف/صورة (${attachment.fileName || "مرفق"}) تحتوي على معلومات دراسية أو واجبات أو ملاحظات أو أوراق عمل/كتاب. يُرجى تحليل الملف/الصورة بدقة واستخراج الملاحظات والمعلومات الهامة المكتوبة بها وتطعيمها في التقرير بشكل احترافي ومشجع.`
    });
  } else {
    parts.push({ text: userPromptText });
  }

  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (e) {
      console.error("Gemini API call failed, generating rule-based report fallback:", e);
    }
  }

  // Fallback if API key is missing or errored
  return buildFallbackReportText(studentName, subject, attendanceStatus, homeworkStatus, teacherNotes, aiInstructions, preferredLanguage);
}

function buildFallbackReportText(
  studentName: string,
  subject: string,
  attendance: string,
  homework: string,
  notes: string,
  instructions: string,
  lang: "ar" | "en"
): string {
  if (lang === "en") {
    return `Dear Parent of ${studentName},

We are pleased to share the student's lesson update for ${subject}:
• Attendance: ${attendance}
• Homework: ${homework}

Lesson Overview:
${notes || "The lesson was completed smoothly with good comprehension."}

Teacher's Note & Guidance:
${instructions || "Keep up the excellent dedication and review the covered material daily."}

Thank you for your ongoing support!
Best regards,
GoStars Academic System`;
  }

  return `عزيزي ولي أمر الطالب/الطالبة ${studentName}،

تحية طيبة وبعد،،
يسرنا أن نضع بين أيديكم تقرير المتابعة الخاص بحصة مادة (${subject}):

📌 حالة الحضور: ${attendance}
📌 حالة الواجب المنزلي: ${homework}

📝 تفاصيل ما تم في الحصة:
${notes || "تم الشرح والتطبيق العملي بشكل ممتاز وتفاعل الطالب بفاعلية."}

💡 التوجيه والتوصية:
${instructions || "نوصي بمتابعة مراجعة المادة لمدة 15 دقيقة يومياً للحفاظ على هذا المستوى المتألق."}

شاكرين لكم حسن تعاونكم ودعمكم المستمر.
مع أطيب التحيات،
نظام GoStars لإدارة المعلم`;
}
