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

export interface GroupReportStudentItem {
  name: string;
  attendance: string; // e.g. "حاضر" | "غائب"
  homework: string; // e.g. "منجز" | "غير منجز" | "أنجز بعضه"
  score?: string; // e.g. "8" or "8 / 10"
  notes?: string; // e.g. "شوية تركيز"
  gender?: "male" | "female";
}

export interface GroupReportGenerationRequest {
  subject: string;
  date: string;
  teacherName: string;
  students: GroupReportStudentItem[];
  generalNotes?: string;
  aiInstructions?: string;
}

export async function generateGoStarsGroupReportAI(req: GroupReportGenerationRequest): Promise<string> {
  const {
    subject = "عام",
    date = new Date().toISOString().split("T")[0],
    teacherName = "المعلم",
    students = [],
    generalNotes = "",
    aiInstructions = ""
  } = req;

  const systemInstruction = `أنت المسؤول عن توليد "تقرير متابعة الحصة الجماعية" داخل نظام إدارة الطلاب.

عند إنشاء تقرير جماعي لمجموعة من الطلاب، يجب الالتزام بالقواعد والتنسيق التاليين بشكل صارم وثابت:

أولًا: الهدف من التقرير
يجب أن يكون التقرير احترافيًا، منظمًا، واضحًا، وسهل القراءة على الهاتف وخصوصًا عبر WhatsApp.
التقرير ليس مجرد قائمة بيانات، بل يجب أن يظهر بشكل مرتب وموحد لجميع الطلاب، مع الحفاظ على بساطة التصميم وعدم الإطالة غير الضرورية.

ثانيًا: رأس التقرير
ابدأ التقرير بهذا الشكل تمامًا:

📚 تقرير متابعة (${subject})

━━━━━━━━━━━━━━━━━━
📅 تاريخ الحصة: ${date}
👨🏫 اسم المعلم: ${teacherName}
━━━━━━━━━━━━━━━━━━

ثالثًا: بيانات كل طالب
يجب إنشاء قسم مستقل لكل طالب، ويكون بنفس الترتيب والتنسيق دائمًا.
استخدم هذا الهيكل:

[رمز الطالب 👨🎓 أو 👩🎓] [اسم الطالب]

🟢 الحضور: [حالة الحضور: حاضر / غائب]
📝 الواجب: [حالة الواجب: منجز / غير منجز / أنجز بعضه]
⭐ التقييم: [الدرجة] / 10

📌 ملاحظة المعلم:
[ملاحظة المعلم بعد تحسين صياغتها إن وجدت]

━━━━━━━━━━━━━━━━━━

رابعًا: قواعد البيانات
- لا تكتب "الطالب 1" أو "الطالب 2" بجانب الاسم. استخدم اسم الطالب مباشرة.
- حافظ على ترتيب الطلاب الموجود في بيانات الحصة تمامًا.
- لا تحذف أي طالب من التقرير.
- لا تضف طالبًا غير موجود في البيانات.
- لا تغير درجات الطلاب.
- لا تغير حالة الحضور.
- لا تغير حالة الواجب.
- لا تخترع ملاحظات للطلاب. إذا لم تكن هناك ملاحظة للطالب، لا تخترع ملاحظة من عندك ولا تضع قسم الملاحظة إذا كانت فارغة.
- إذا كانت هناك ملاحظة قصيرة أو غير رسمية من المعلم، قم بتحسين صياغتها لغويًا مع الحفاظ على معناها الأصلي بدقة (مثال: "شوية تركيز" تصبح "تحتاج إلى قليل من التركيز أثناء المراجعة").
- لا تضف معلومات تعليمية أو تقييمات لم يذكرها المعلم.

خامسًا: الدرجات
اعرض الدرجة دائمًا بهذا الشكل:
⭐ التقييم: [الدرجة] / 10
إذا أدخل المعلم رقمًا مثل 8 اعرضه "8 / 10". إذا لم يُدخل درجة (فارغة)، اعرض "10 / 10" للطالب الحاضر المنجز أو "- / 10".

سادسًا: الحضور والواجب
اعرض حالة الحضور وحالة الواجب برموز واضحة:
🟢 الحضور: حاضر (أو 🔴 الحضور: غائب)
📝 الواجب: منجز (أو ⚠️ الواجب: غير منجز / أنجز بعضه)

سابعًا: الملاحظة العامة
لا تضف قسم "ملاحظة عامة" تلقائيًا إلا إذا كانت موجودة في بيانات المعلم.
إذا قام المعلم بإدخال ملاحظة عامة، أضفها قبل الخاتمة بهذا الشكل:
🌟 ملاحظة عامة
[الملاحظة العامة]

ثامنًا: خاتمة التقرير
في نهاية التقرير أضف العبارة التالية دائمًا:
━━━━━━━━━━━━━━━━━━

🤲 نسأل الله لهم مزيدًا من التوفيق والتميز. 🤍

تاسعًا: قيود صارمة
- النتيجة النهائية يجب أن تكون نص التقرير المنسق فقط بدون أي مقدمات ("إليك التقرير...") وبدون شروحات أو كتل كود markdown (no \`\`\` blocks).
- مناسب للإرسال المباشر على WhatsApp.
- الفواصل بين الطلاب هي خط ━━━━━━━━━━━━━━━━━━ فقط.`;

  const studentsDetailsText = students.map((st, idx) => {
    return `الطالب ${idx + 1}:
الاسم: ${st.name}
الجنس: ${st.gender || "غير محدد"}
الحضور: ${st.attendance}
الواجب: ${st.homework}
الدرجة: ${st.score || "غير محددة"}
ملاحظة المعلم: ${st.notes ? st.notes : "لا توجد ملاحظة خاصة"}`;
  }).join("\n---\n");

  const promptText = `أنشئ تقرير متابعة الحصة الجماعية التالي بدقة متناهية:
المادة: ${subject}
التاريخ: ${date}
اسم المعلم: ${teacherName}
ملاحظة عامة للحصة: ${generalNotes ? generalNotes : "لا توجد"}
توجيهات إضافية من المعلم: ${aiInstructions ? aiInstructions : "لا توجد"}

بيانات الطلاب:
${studentsDetailsText}

تذكر: التزم بالهيكل المطلوب تماماً ولا تخترع أي معلومات جديدة. أخرج نص التقرير النهائي فقط.`;

  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        // Remove any markdown code fence if wrapped
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
        }
        return cleanText;
      }
    } catch (e) {
      console.error("Gemini API group report call failed, using deterministic builder:", e);
    }
  }

  // Fallback deterministic builder that 100% strictly matches the required format
  return buildStandardGroupReportText(subject, date, teacherName, students, generalNotes);
}

export function buildStandardGroupReportText(
  subject: string,
  date: string,
  teacherName: string,
  students: GroupReportStudentItem[],
  generalNotes?: string
): string {
  let out = `📚 تقرير متابعة (${subject})\n\n`;
  out += `━━━━━━━━━━━━━━━━━━\n`;
  out += `📅 تاريخ الحصة: ${date}\n`;
  out += `👨‍🏫 اسم المعلم: ${teacherName || "المعلم"}\n`;
  out += `━━━━━━━━━━━━━━━━━━\n\n`;

  students.forEach((st) => {
    const isFemale = st.gender === "female" || isLikelyFemaleName(st.name);
    const icon = isFemale ? "👩‍🎓" : "👨‍🎓";
    
    out += `${icon} ${st.name}\n\n`;

    const attText = st.attendance === "absent" || st.attendance === "غائب" ? "🔴 الحضور: غائب" : "🟢 الحضور: حاضر";
    out += `${attText}\n`;

    let hwText = "📝 الواجب: منجز";
    if (st.homework === "not_done" || st.homework === "غير منجز" || st.homework === "لم ينجزه") {
      hwText = "⚠️ الواجب: غير منجز";
    } else if (st.homework === "partial" || st.homework === "أنجز بعضه") {
      hwText = "⚠️ الواجب: أنجز بعضه";
    }
    out += `${hwText}\n`;

    let scoreDisplay = "10";
    if (st.score && st.score.trim() !== "") {
      const clean = st.score.replace(/\/10|\/ 10/, "").trim();
      scoreDisplay = clean;
    }
    out += `⭐ التقييم: ${scoreDisplay} / 10\n\n`;

    if (st.notes && st.notes.trim() !== "") {
      out += `📌 ملاحظة المعلم:\n${st.notes.trim()}\n\n`;
    }

    out += `━━━━━━━━━━━━━━━━━━\n\n`;
  });

  if (generalNotes && generalNotes.trim() !== "") {
    out += `🌟 ملاحظة عامة\n${generalNotes.trim()}\n\n`;
    out += `━━━━━━━━━━━━━━━━━━\n\n`;
  }

  out += `🤲 نسأل الله لهم مزيدًا من التوفيق والتميز. 🤍`;

  return out.trim();
}

function isLikelyFemaleName(name: string): boolean {
  if (!name) return false;
  const femaleKeywords = [
    "مريم", "فاطمة", "نور", "سارة", "ساره", "منة", "منه", "هنا", "ملك", "جنى",
    "حبيبة", "حبيبه", "فريدة", "فريده", "ريم", "رنا", "ندى", "آية", "اية", "شهد",
    "روان", "يارا", "مروة", "مروه", "إيمان", "ايمان", "هبة", "هبه", "دنيا", "ياسمين",
    "أميرة", "اميرة", "ندين", "نادين", "سلمى", "جودي", "ليلى", "تسنيم", "خديجة", "عائشة"
  ];
  const firstWord = name.trim().split(" ")[0];
  return femaleKeywords.some(f => firstWord.includes(f) || firstWord === f);
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
