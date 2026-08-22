import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
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

  const hasCustomGroupInst = !!(aiInstructions && aiInstructions.trim());

  const systemInstruction = `أنت المسؤول عن توليد "تقرير متابعة الحصة الجماعية" داخل نظام إدارة الطلاب GoStars.

${hasCustomGroupInst ? `🚨 [الأولوية المطلقة لتعليمات وقالب المعلم]:
قام المعلم بوضع تعليمات خاصة أو قالب محدد للتقرير الجماعي:
"""
${aiInstructions.trim()}
"""
يجب الالتزام بتعليمات وقالب المعلم بدقة متناهية 100%. إذا طلب المعلم قالباً أو ترتيباً أو أسلوباً معيناً، فطبقه بالكامل واملأه ببيانات الطلاب والحصة.
` : `📌 [الهيكل المعتمد للتقرير الجماعي]:`}

عند إنشاء تقرير جماعي لمجموعة من الطلاب، التزم بالهيكل التالي (إلا إذا حدد المعلم قالباً خاصاً في تعليماته أعلاه):

أولًا: رأس التقرير
📚 تقرير متابعة (${subject})
━━━━━━━━━━━━━━━━━━
📅 تاريخ الحصة: ${date}
👨‍🏫 اسم المعلم: ${teacherName}
━━━━━━━━━━━━━━━━━━

ثانيًا: بيانات كل طالب
[رمز الطالب 👨‍🎓 أو 👩‍🎓] [اسم الطالب]

🟢 الحضور: [حالة الحضور: حاضر / غائب]
📝 الواجب: [حالة الواجب: منجز / غير منجز / أنجز بعضه]
⭐ التقييم: [الدرجة] / 10

📌 ملاحظة المعلم:
[ملاحظة المعلم بعد تحسين صياغتها إن وجدت]

━━━━━━━━━━━━━━━━━━

ثالثًا: قواعد البيانات
- لا تكتب "الطالب 1" أو "الطالب 2" بجانب الاسم. استخدم اسم الطالب مباشرة.
- حافظ على ترتيب الطلاب الموجود في بيانات الحصة تمامًا.
- لا تحذف أي طالب من التقرير، ولا تضف طالبًا غير موجود في البيانات.
- لا تغير درجات الطلاب أو حالة الحضور أو الواجب.
- لا تخترع ملاحظات للطلاب من عندك.
- استثناء هام للواجب: إذا كانت حالة الواجب "لم يكن هناك واجب" (no_homework أو لا يوجد واجب)، فلا تذكر سطر الواجب.
- إذا كانت هناك ملاحظة عامة للحصة، أضفها قبل الخاتمة.

رابعًا: خاتمة التقرير
━━━━━━━━━━━━━━━━━━
🤲 نسأل الله لهم مزيدًا من التوفيق والتميز. 🤍

خامسًا: قواعد الإخراج
- لا تذكر أسماء حقول التوجيهات أو الذكاء الاصطناعي، بل طبق التعليمات مباشرة.
- أخرج نص التقرير النهائي فقط بدون أي مقدمات وبدون \`\`\` blocks.`;

  const studentsDetailsText = students.map((st, idx) => {
    return `الطالب ${idx + 1}:
الاسم: ${st.name}
الجنس: ${st.gender || "غير محدد"}
الحضور: ${st.attendance}
الواجب: ${st.homework}
الدرجة: ${st.score || "غير محددة"}
ملاحظة المعلم: ${st.notes ? st.notes : "لا توجد ملاحظة خاصة"}`;
  }).join("\n---\n");

  const promptText = `أنشئ تقرير متابعة الحصة الجماعية التالي:
المادة: ${subject}
التاريخ: ${date}
اسم المعلم: ${teacherName}
ملاحظة عامة للحصة: ${generalNotes ? generalNotes : "لا توجد"}

بيانات الطلاب:
${studentsDetailsText}

${hasCustomGroupInst ? `⭐ تعليمات وقالب المعلم المطلوب تطبيقها بدقة تامة (إلزامية 100%):
"""
${aiInstructions.trim()}
"""` : ""}`;

  const client = getGeminiClient();
  if (client) {
    try {
      let response;
      try {
        response = await client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.3
          }
        });
      } catch (errFirst) {
        console.warn("Retrying group report with gemini-flash-latest:", errFirst);
        response = await client.models.generateContent({
          model: "gemini-flash-latest",
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.3
          }
        });
      }

      if (response && response.text) {
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

    const isNoHw =
      !st.homework ||
      st.homework === "no_homework" ||
      st.homework === "none" ||
      st.homework.includes("لم يكن هناك واجب") ||
      st.homework.includes("لا يوجد واجب");

    if (!isNoHw) {
      let hwText = "📝 الواجب: منجز";
      if (st.homework === "not_done" || st.homework === "غير منجز" || st.homework === "لم ينجزه") {
        hwText = "⚠️ الواجب: غير منجز";
      } else if (st.homework === "partial" || st.homework === "أنجز بعضه") {
        hwText = "⚠️ الواجب: أنجز بعضه";
      }
      out += `${hwText}\n`;
    }

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
    aiInstructions = "",
    preferredLanguage = "ar",
    attachment
  } = req;

  const isNoHw =
    !homeworkStatus ||
    homeworkStatus === "no_homework" ||
    homeworkStatus === "none" ||
    homeworkStatus.includes("لم يكن هناك واجب") ||
    homeworkStatus.includes("لا يوجد واجب");

  const hasCustomInstructions = !!(aiInstructions && aiInstructions.trim());

  const systemInstruction = `أنت المساعد الذكي لنظام GoStars لإدارة المعلم، متخصص في صياغة تقارير المتابعة الدراسية للطلاب وإرسالها لأولياء الأمور.

${hasCustomInstructions ? `🚨 [الأولوية القصوى والمطلقة - تعليمات وقالب المعلم]:
قام المعلم بوضع تعليمات خاصة أو قالب محدد للتقرير كالتالي:
"""
${aiInstructions.trim()}
"""

قواعد الالتزام بتعليمات المعلم:
1. تعليمات المعلم وقوالبه هي المرجع الأول والأساسي والأعلى سلطة ويجب تنفيذها والالتزام بها بنسبة 100% دون أي تحريف أو تجاهل.
2. إذا حدد المعلم قالباً (Template) أو هيكلاً أو عناوين معينة، فاملأ هذا القالب ببيانات الطالب والحصة ولا تغير ترتيب العناوين أو تلغِ أي قسم طلبه.
3. إذا طلب المعلم أسلوباً محدداً (مثل: نقاط فقط، اختصار شديد، عدم وضع مقدمة، صيغة معينة، تركيز على جانب محدد)، التزم بذلك تماماً.
4. لا تتصرف من تلقاء نفسك ولا تضف أشكالاً أو أقساماً تخالف ما حدده المعلم.
` : `📌 [التوجيه الافتراضي للتقرير]:
اكتب تقريراً تربوياً راقياً، محفزاً، وموجزاً ومناسباً لرسائل الواتساب مع ولي الأمر.`}

📋 القواعد العامة:
1. استخدم لغة ${preferredLanguage === "ar" ? "عربية فصيحة وسلسة" : "إنجليزية احترافية ومشجعة"}.
2. التزم ببيانات الحصة الحقيقية وملاحظات المعلم ومحتوى الملف/الصورة المرفقة إن وجدت، ولا تختلق معلومات غير مذكورة.
${isNoHw ? "3. حالة الواجب: لم يكن هناك واجب، لذا لا تذكر أي سطر أو بند عن الواجب المنزلي نهائياً." : ""}
4. لا تذكر أي عبارات تتعلق بالخصومات المالية أو الرسوم أو شروط الاشتراكات.
5. لا تكتب عبارات وصفية مثل "بناءً على تعليمات المعلم" أو "تعليمات الذكاء الاصطناعي"، بل طبق التعليمات مباشرة داخل التقرير.
6. أخرج نص التقرير النهائي الجاهز للإرسال فقط بدون أي مقدمات ("إليك التقرير...") وبدون كتل كود markdown (no \`\`\` blocks).`;

  const userPromptText = `أنشئ تقرير متابعة الحصة التالي:
- اسم الطالب/الطالبة: ${studentName}
- المادة: ${subject}
- التاريخ: ${date}
- حالة الحضور: ${attendanceStatus}
${!isNoHw ? `- حالة الواجب: ${homeworkStatus}` : "- حالة الواجب: لم يكن هناك واجب (تجاهل بند الواجب)"}
${examScores && examScores !== "لا يوجد" && examScores !== "غير محدد" ? `- درجة التقييم/الاختبار: ${examScores}` : ""}

📝 ملاحظات المعلم حول الحصة ومستوى الطالب:
${teacherNotes || "تم شرح الدرس ومتابعة التطبيق العملي بانتظام وتفاعل الطالب بتركيز."}

${hasCustomInstructions ? `⭐ تعليمات وقالب المعلم المطلوب تطبيقها بدقة تامة (إلزامية 100%):
"""
${aiInstructions.trim()}
"""` : ""}`;

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
      text: `${userPromptText}\n\n📎 ملحوظة: تم إرفاق ملف/صورة (${attachment.fileName || "مرفق"}). يُرجى تحليل الملف/الصورة بدقة واستخراج المعلومات والملاحظات الهامة منها وتضمينها في التقرير بشكل احترافي ومشجع.`
    });
  } else {
    parts.push({ text: userPromptText });
  }

  const client = getGeminiClient();
  if (client) {
    try {
      let response;
      try {
        response = await client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: { parts },
          config: {
            systemInstruction,
            temperature: 0.5
          }
        });
      } catch (errFirst) {
        console.warn("Retrying report with gemini-flash-latest:", errFirst);
        response = await client.models.generateContent({
          model: "gemini-flash-latest",
          contents: { parts },
          config: {
            systemInstruction,
            temperature: 0.5
          }
        });
      }

      if (response && response.text) {
        let cleanText = response.text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
        }
        return cleanText;
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
  _instructions: string,
  lang: "ar" | "en"
): string {
  const isNoHw =
    !homework ||
    homework === "no_homework" ||
    homework === "none" ||
    homework.includes("لم يكن هناك واجب") ||
    homework.includes("لا يوجد واجب");

  if (lang === "en") {
    return `Dear Parent of ${studentName},

We are pleased to share the student's lesson update for ${subject}:
• Attendance: ${attendance}${!isNoHw ? `\n• Homework: ${homework}` : ""}

Lesson Overview:
${notes || "The lesson was completed smoothly with good comprehension and active practice."}

Teacher's Recommendation:
Keep up the regular daily review and practice to maintain this outstanding progress.

Thank you for your ongoing support and cooperation!
Best regards,
GoStars Academic System`;
  }

  let autoRecommendation = "نوصي بمتابعة المراجعة الدورية للمفاهيم المشروحة للحفاظ على هذا المستوى المتميز.";
  if (notes.includes("واجب") || notes.includes("تمرين") || notes.includes("حل")) {
    autoRecommendation = "الحرص على مراجعة التدريبات وتثبيت الخطوات العملية أولاً بأول.";
  } else if (notes.includes("تركيز") || notes.includes("انتباه")) {
    autoRecommendation = "تشجيع الطالب على مواصلة التركيز والتفاعل الإيجابي في الحصص القادمة.";
  }

  return `عزيزي ولي أمر الطالب/الطالبة ${studentName}،

تحية طيبة وبعد،،
يسرنا أن نضع بين أيديكم تقرير المتابعة الخاص بحصة مادة (${subject}):

📌 حالة الحضور: ${attendance}${!isNoHw ? `\n📌 حالة الواجب المنزلي: ${homework}` : ""}

📝 تفاصيل ما تم في الحصة:
${notes || "تم الشرح والتطبيق العملي بشكل ممتاز وتفاعل الطالب بتركيز."}

💡 التوجيه والتوصية:
${autoRecommendation}

شاكرين لكم حسن تعاونكم ودعمكم المستمر.
مع أطيب التحيات،
نظام GoStars لإدارة المعلم`;
}
