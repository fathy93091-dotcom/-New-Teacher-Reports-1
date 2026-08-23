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
  notes?: string; // e.g. "ملاحظة المعلم"
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

  // Strict System Instruction
  let systemInstruction = "";

  if (hasCustomGroupInst) {
    systemInstruction = `أنت أداة متخصصة لصياغة تقارير الحصص الجماعية بناءً على تعليمات المعلم فقط.
قام المعلم بوضع تعليمات وقالب وشروط إلزامية للتقرير كالتالي:
"""
${aiInstructions.trim()}
"""

⚠️ [الأولوية والقواعد المطلقة]:
1. [الالتزام التام 100%]: التزم بتعليمات وقالب وأسلوب المعلم الموضح أعلاه بنسبة 100%. لا تفرض أي هيكل افتراضي، ولا تضع أي عبارات أو مقدمات أو خواتم أو رموز إلا إذا كانت مطلوبة في تعليمات المعلم.
2. [بيانات الطلاب]: طبق تعليمات وقالب المعلم على جميع الطلاب المذكورين في الحصة بدقة وبنفس الترتيب.
3. [المعلومات الواقعية]: التزم ببيانات الحصة الحقيقية وملاحظات المعلم لكل طالب دون اختلاق معلومات غير موجودة.
4. [ممنوع الإضافات الافتراضية]: يُمنع منعاً باتاً إضافة أي نصوص افتراضية أو تصنيفات أو قوالب سابقة لم يطلبها المعلم.
5. [المخرج النهائي]: أخرج نص التقرير النهائي الصافي فقط الجاهز للإرسال دون أي مقدمات ("إليك التقرير...") ودون كتل كود markdown (no \`\`\` blocks).`;
  } else {
    systemInstruction = `أنت المساعد الذكي لصياغة تقرير متابعة الحصة الجماعية.
قم بإنشاء تقرير جماعي واضح وموجز ومرتب لجميع الطلاب بناءً على بيانات الحصة (المادة: ${subject}، التاريخ: ${date}، اسم المعلم: ${teacherName}).
اعرض حالة الحضور والواجب والدرجة وملاحظة المعلم لكل طالب بشكل مباشر ومرتب ومناسب للمحادثات.
أخرج نص التقرير النهائي فقط بدون أي مقدمات أو كتل كود.`;
  }

  const studentsDetailsText = students.map((st, idx) => {
    return `الطالب ${idx + 1}:
الاسم: ${st.name}
الجنس: ${st.gender || "غير محدد"}
الحضور: ${st.attendance}
الواجب: ${st.homework}
الدرجة/التقييم: ${st.score || "غير محددة"}
ملاحظة المعلم: ${st.notes ? st.notes : "لا توجد ملاحظة خاصة"}`;
  }).join("\n---\n");

  const promptText = `بيانات الحصة الجماعية:
- المادة: ${subject}
- التاريخ: ${date}
- اسم المعلم: ${teacherName}
- ملاحظة عامة للحصة: ${generalNotes ? generalNotes : "لا توجد"}

بيانات الطلاب:
${studentsDetailsText}

${hasCustomGroupInst ? `⭐ التعليمات والقالب المطلوب تطبيقه حصرياً (إلزامي 100%):
"""
${aiInstructions.trim()}
"""` : "أنشئ تقرير متابعة الحصة الجماعية بناءً على هذه البيانات."}`;

  const client = getGeminiClient();
  if (client) {
    const candidateModels = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.2
          }
        });

        if (response && response.text) {
          let cleanText = response.text.trim();
          if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
          }
          if (cleanText) {
            return cleanText;
          }
        }
      } catch (err) {
        console.warn(`Model ${modelName} call failed, trying next:`, err);
      }
    }
  }

  // Fallback builder
  return buildStandardGroupReportText(subject, date, teacherName, students, generalNotes, aiInstructions);
}

export function buildStandardGroupReportText(
  subject: string,
  date: string,
  teacherName: string,
  students: GroupReportStudentItem[],
  generalNotes?: string,
  _aiInstructions?: string
): string {
  let out = `📚 تقرير متابعة (${subject})\n\n`;
  out += `━━━━━━━━━━━━━━━━━━\n`;
  out += `📅 التاريخ: ${date}\n`;
  if (teacherName && teacherName.trim()) {
    out += `👨‍🏫 المعلم: ${teacherName.trim()}\n`;
  }
  out += `━━━━━━━━━━━━━━━━━━\n\n`;

  students.forEach((st) => {
    const isFemale = st.gender === "female" || isLikelyFemaleName(st.name);
    const icon = isFemale ? "👩‍🎓" : "👨‍🎓";
    
    out += `${icon} ${st.name}\n`;

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

    if (st.score && st.score.trim() !== "") {
      const clean = st.score.replace(/\/10|\/ 10/, "").trim();
      out += `⭐ التقييم: ${clean} / 10\n`;
    }

    if (st.notes && st.notes.trim() !== "") {
      out += `📌 ملاحظة المعلم: ${st.notes.trim()}\n`;
    }

    out += `\n━━━━━━━━━━━━━━━━━━\n\n`;
  });

  if (generalNotes && generalNotes.trim() !== "") {
    out += `🌟 ملاحظة عامة:\n${generalNotes.trim()}\n\n`;
  }

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

  // 1. Strict System Instruction with explicit priority hierarchy and Anti-Hallucination rules
  const systemInstruction = `أنت محرك صياغة التقارير المدرسية المخصص لنظام إدارة الطلاب GoStars.

📌 [ترتيب الأولوية الإلزامي في صياغة التقرير]:
1. الأولوية الأولى (المصدر الحصري للحقائق): بيانات الطالب الفعلية والمسجلة بالحصة وملاحظات المعلم فقط.
2. الأولوية الثانية (قواعد الصياغة والأسلوب): تعليمات وقالب المعلم الخاصة بالتقرير.
3. الأولوية الثالثة: الأسلوب العام للنظام ولغة الإخراج.

⛔ [قواعد صارمة جداً لمنع التأليف أو الاختلاق (Strict Grounding Rules)]:
- التقرير يجب أن يعتمد حصرياً وفقط على البيانات الفعلية المسجلة.
- يُمنع منعاً باتاً اختراع أو افتراض أو استنتاج أي معلومات غير مسجلة صراحة (مثل: حضور/غياب، درجات، مستويات، سلوك، إنجاز، نقاط قوة أو ضعف لم يذكرها المعلم).
- إذا كانت هناك معلومة أو تفصيلة غير مذكورة في البيانات أو الملاحظات، لا تختلقها ولا تفترضها كحقيقة على الإطلاق.
- لا تضف عبارات عامة أو حشواً إنشائياً أو معلومات تعليمية مصطنعة لمجرد ملء التقرير.

${hasCustomInstructions ? `🚨 [تعليمات وقالب المعلم - ملزمة وواجبة التطبيق 100%]:
قام المعلم بوضع التعليمات والشروط التالية لصياغة التقرير:
"""
${aiInstructions.trim()}
"""
قواعد تطبيق تعليمات المعلم:
- تعليمات المعلم ملزمة تماماً ويحظر تجاهلها.
- إذا طلب المعلم صياغة معينة (مثل: "ركز على الواجب"، "اذكر نقاط الضعف فقط"، "اكتب التقرير بأسلوب مختصر"، "بدون مقدمات"، أو وضع قالباً معيناً)، فيجب تطبيق ذلك فعلياً في صياغة وهيكل ومضمون التقرير.
- لا تكتب عبارات وصفية مثل "بناءً على تعليمات المعلم"، بل طبق التعليمات مباشرة داخل نص التقرير.` : `📌 [توجيه عام]:
اكتب تقريراً واضحاً، دقيقاً، وموجزاً باللغة ${preferredLanguage === "ar" ? "العربية" : "الإنجليزية"} يعكس بيانات الحصة وملاحظات المعلم فقط دون أية مبالغات أو حشو.`}

${isNoHw ? "🚫 حالة الواجب: لم يكن هناك واجب مسجل، لذا لا تذكر أي بند أو إشارة عن الواجب في التقرير نهائياً." : ""}
- المخرج المطلوب: نص التقرير الصافي فقط الجاهز للإرسال لولي الأمر، بدون أي مقدمات خارج التقرير ("إليك التقرير...") وبدون كتل كود markdown (no \`\`\` blocks).`;

  const userPromptText = `بيانات الحصة المسجلة فعلياً:
- اسم الطالب/الطالبة: ${studentName}
- المادة: ${subject}
- التاريخ: ${date}
- حالة الحضور: ${attendanceStatus}
${!isNoHw ? `- حالة الواجب: ${homeworkStatus}` : "- حالة الواجب: لم يكن هناك واجب"}
${examScores && examScores !== "لا يوجد" && examScores !== "غير محدد" ? `- درجة التقييم/الاختبار المسجلة: ${examScores}` : "- التقييم/الاختبار: لا توجد درجة مسجلة"}

📝 ملاحظات المعلم الفعلية حول ما تم في الحصة وأداء الطالب:
${teacherNotes && teacherNotes.trim() ? teacherNotes.trim() : "تم شرح الدرس ومتابعة التطبيق العملي."}

${hasCustomInstructions ? `⭐ تعليمات المعلم الملزمة لصياغة هذا التقرير (طبقها بدقة وتجنب أي اختلاق):
"""
${aiInstructions.trim()}
"""` : ""}

تذكر: التزم بالبيانات المسجلة أعلاه فقط وبشروط المعلم، ولا تخترع أي معلومات من عندك. أخرج نص التقرير النهائي فقط.`;

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
      text: `${userPromptText}\n\n📎 ملحوظة: تم إرفاق ملف/صورة (${attachment.fileName || "مرفق"}). يُرجى استخراج البيانات والملاحظات الفعلية منها وتضمينها بالتقرير بدقة دون افتراضات غير واردة فيها.`
    });
  } else {
    parts.push({ text: userPromptText });
  }

  const client = getGeminiClient();
  if (client) {
    const candidateModels = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            temperature: 0.1
          }
        });

        if (response && response.text) {
          let cleanText = response.text.trim();
          if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
          }
          if (cleanText) {
            return cleanText;
          }
        }
      } catch (err) {
        console.warn(`Model ${modelName} call failed, trying next:`, err);
      }
    }
  }

  // Fallback if API key is missing or all models failed
  return buildFallbackReportText(studentName, subject, date, attendanceStatus, homeworkStatus, teacherNotes, aiInstructions, preferredLanguage);
}

function buildFallbackReportText(
  studentName: string,
  subject: string,
  date: string,
  attendance: string,
  homework: string,
  notes: string,
  aiInstructions: string,
  lang: "ar" | "en"
): string {
  const isNoHw =
    !homework ||
    homework === "no_homework" ||
    homework === "none" ||
    homework.includes("لم يكن هناك واجب") ||
    homework.includes("لا يوجد واجب");

  // If user provided a specific template/instructions, use a clean structured output
  if (aiInstructions && aiInstructions.trim()) {
    let out = `تقرير متابعة: ${studentName}\nالمادة: ${subject}\nالتاريخ: ${date}\n\n`;
    out += `• الحضور: ${attendance}\n`;
    if (!isNoHw) {
      out += `• الواجب: ${homework}\n`;
    }
    if (notes && notes.trim()) {
      out += `• ملاحظات الحصة: ${notes.trim()}\n`;
    }
    return out.trim();
  }

  if (lang === "en") {
    return `Student Report: ${studentName}
Subject: ${subject}
Date: ${date}
Attendance: ${attendance}${!isNoHw ? `\nHomework: ${homework}` : ""}

Lesson Notes:
${notes || "Lesson completed successfully with active student participation."}`;
  }

  let out = `📋 تقرير متابعة: ${studentName}\n`;
  out += `📚 المادة: ${subject}\n`;
  out += `📅 التاريخ: ${date}\n`;
  out += `🟢 الحضور: ${attendance}\n`;
  if (!isNoHw) {
    out += `📝 الواجب: ${homework}\n`;
  }
  if (notes && notes.trim()) {
    out += `\n📝 ملاحظات الحصة:\n${notes.trim()}`;
  }
  return out.trim();
}
