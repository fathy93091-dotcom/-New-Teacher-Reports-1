import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): { client: GoogleGenAI; keySource: string } | null {
  const possibleKeys: [string, string | undefined][] = [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["GOOGLE_API_KEY", process.env.GOOGLE_API_KEY],
    ["GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY],
    ["GEMINI_KEY", process.env.GEMINI_KEY],
    ["GOOGLE_KEY", process.env.GOOGLE_KEY],
    ["GEMINI_TOKEN", process.env.GEMINI_TOKEN],
    ["VITE_GEMINI_API_KEY", process.env.VITE_GEMINI_API_KEY],
    ["VITE_GOOGLE_API_KEY", process.env.VITE_GOOGLE_API_KEY],
    ["API_KEY", process.env.API_KEY]
  ];

  for (const [name, rawValue] of possibleKeys) {
    if (rawValue && typeof rawValue === "string") {
      const key = rawValue.trim().replace(/^["']|["']$/g, "");
      if (key && key !== "MY_GEMINI_API_KEY" && key.length >= 8) {
        try {
          const client = new GoogleGenAI({ apiKey: key });
          return { client, keySource: name };
        } catch (initErr: any) {
          console.error(`[GoStars AI] Error initializing GoogleGenAI with ${name}:`, initErr?.message || initErr);
        }
      }
    }
  }

  // Also try fallback to default GoogleGenAI({}) in case environment has auto-detected credentials
  try {
    const defaultClient = new GoogleGenAI({});
    return { client: defaultClient, keySource: "auto-detect" };
  } catch {
    return null;
  }
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
  generalAiInstructions?: string;
  subjectAiInstructions?: string;
}

export async function generateGoStarsGroupReportAI(req: GroupReportGenerationRequest): Promise<string> {
  const {
    subject = "عام",
    date = new Date().toISOString().split("T")[0],
    teacherName = "المعلم",
    students = [],
    generalNotes = "",
    aiInstructions = "",
    generalAiInstructions = "",
    subjectAiInstructions = ""
  } = req;

  const cleanGeneral = (generalAiInstructions || "").trim();
  const cleanSubject = (subjectAiInstructions || "").trim();
  const cleanCustom = (aiInstructions || "").trim();

  const hasAnyInstructions = !!(cleanGeneral || cleanSubject || cleanCustom);

  // Assemble instruction layers
  const instructionLayers: { title: string; content: string }[] = [];
  if (cleanGeneral) {
    instructionLayers.push({
      title: "1️⃣ التعليمات والضوابط العامة (المعتمدة لجميع المواد):",
      content: cleanGeneral
    });
  }
  if (cleanSubject && cleanSubject !== cleanGeneral) {
    instructionLayers.push({
      title: `2️⃣ التعليمات الخاصة بمادة (${subject}):`,
      content: cleanSubject
    });
  }
  if (cleanCustom && cleanCustom !== cleanGeneral && cleanCustom !== cleanSubject) {
    instructionLayers.push({
      title: "3️⃣ تعليمات وقالب إضافي مخصص لهذه الحصة:",
      content: cleanCustom
    });
  }

  const instructionsText = instructionLayers
    .map(l => `${l.title}\n"""\n${l.content}\n"""`)
    .join("\n\n");

  const systemInstruction = `أنت محرك صياغة التقارير المدرسية المخصص لنظام إدارة الطلاب GoStars.

📌 [ترتيب الأولوية الإلزامي والحاسم في صياغة التقرير]:
1. الأولوية الأولى (المصدر الحصري للحقائق والمعلومات الواقعية):
   - بيانات الحصة الفعلية المسجلة لكل طالب وملاحظات المعلم فقط.
   - لا يجوز لأي تعليمات أو قوالب أن تخترع حقائق غير مسجلة.
2. الأولوية الثانية (التعليمات المخصصة للمادة والشروط الإلزامية):
   - التعليمات الخاصة بمادة (${subject}) وأي شروط وقوالب حددها المعلم.
   - هذه التعليمات قواعد إلزامية واجبة التطبيق 100% وليست مجرد اقتراحات.
3. الأولوية الثالثة (التعليمات العامة للنظام):
   - التعليمات العامة المعتمدة من المعلم.

⛔ [قواعد صارمة جداً لمنع الاختلاق وحظر التلفيق (Strict Grounding Rules)]:
1. [منع الاختلاق التام]: يُمنع منعاً باتاً اختراع أو افتراض أو استنتاج أي معلومات لم يذكرها المعلم صراحة (مثل: اختراع واجب لم يُسجل، أو إضافة مهارة، أو نشاط، أو تقييم، أو مستوى، أو درجات غير مسجلة).
2. [الأمثلة التوضيحية في التعليمات والقوالب ليست حقائق]: إذا كانت تعليمات المادة أو القالب تحتوي على نصوص أو أمثلة توضيحية (مثل أرقام صفحات، أسماء دروس، واجبات مقترحة، درجات افتراضية)، يجب معاملتها كأمثلة على الهيكل والأسلوب فقط، ويُحظر تماماً نقل هذه الأمثلة أو استخدامها كمعلومات فعلية إلا إذا وردت صراحة في بيانات وملاحظات الحصة.
3. [حذف الأقسام الفارغة]: إذا نصت التعليمات أو القالب على أن قسماً أو بنداً معيناً يظهر فقط عند توفر معلومات عنه (أو إذا لم تكن هناك بيانات متوفرة لهذا البند كعدم وجود واجب أو درجات)، فيجب حذف القسم بالكامل من التقرير بدلاً من تركه فارغاً أو اختراع محتوى له.
4. [حفظ الروابط والأرقام والأسماء]: يجب الحفاظ بدقة تامة على أسماء الطلاب، والتواريخ، والأرقام، والروابط، وأي بيانات أدخلها المعلم دون تغيير أو تبديل أو تحريف.
5. [لا حشو إنشائي]: تجنب إضافة عبارات عامة مكررة أو نصوص تعليمية مصطنعة لمجرد ملء التقرير.

${hasAnyInstructions ? `🚨 [تعليمات وقواعد المعلم الإلزامية للتقرير]:\n${instructionsText}\n\nتنبيه: طبق هذه التعليمات بدقة في هيكل وأسلوب ومضمون التقرير دون كتابة عبارات وصفية مثل "بناء على تعليمات المعلم".` : "اكتب تقريراً جماعياً واضحاً وموجزاً ومرتباً يعكس بيانات وملاحظات الحصة الحالية فقط."}

- المخرج المطلوب: نص التقرير النهائي الصافي فقط الجاهز للإرسال، بدون أي مقدمات خارج التقرير ("إليك التقرير...") وبدون كتل كود markdown (no \`\`\` blocks).`;

  const studentsDetailsText = students.map((st, idx) => {
    return `الطالب ${idx + 1}:
الاسم: ${st.name}
الجنس: ${st.gender || "غير محدد"}
الحضور: ${st.attendance}
الواجب: ${st.homework}
الدرجة/التقييم: ${st.score || "غير محددة"}
ملاحظة المعلم: ${st.notes ? st.notes : "لا توجد ملاحظة خاصة"}`;
  }).join("\n---\n");

  const promptText = `بيانات الحصة الجماعية الفعلية المسجلة:
- المادة: ${subject}
- التاريخ: ${date}
- اسم المعلم: ${teacherName}
- ملاحظة عامة للحصة: ${generalNotes ? generalNotes : "لا توجد"}

بيانات الطلاب المسجلة:
${studentsDetailsText}

${hasAnyInstructions ? `⭐ تعليمات وقالب المعلم المطلوب تطبيقها بدقة تامة (إلزامية 100%):
${instructionsText}` : ""}

تذكر: التزم بالبيانات المسجلة أعلاه فقط وبشروط المعلم، ولا تخترع أي معلومات من عندك. أخرج نص التقرير النهائي فقط.`;

  console.log(`[GoStars AI Server] Starting group report generation. Subject: "${subject}", Students count: ${students.length}`);
  const clientObj = getGeminiClient();
  if (!clientObj) {
    console.error("[GoStars AI Server] GEMINI_API_KEY is missing or empty in environment variables.");
    throw new Error("مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير محدد في متغيرات بيئة Vercel (Project Settings > Environment Variables). يرجى إضافته هناك ثم إعادة النشر.");
  }

  const { client, keySource } = clientObj;
  console.log(`[GoStars AI Server] GoogleGenAI initialized using key source: "${keySource}"`);

  const candidateModels = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  let lastErrorMsg = "";
  for (const modelName of candidateModels) {
    try {
      console.log(`[GoStars AI Server] Calling Gemini model: ${modelName} for group report...`);
      const response = await client.models.generateContent({
        model: modelName,
        contents: promptText,
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
          console.log(`[GoStars AI Server] Gemini model ${modelName} generated group report successfully. Characters: ${cleanText.length}`);
          return cleanText;
        }
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`[GoStars AI Server] Model ${modelName} call failed, trying next:`, lastErrorMsg);
    }
  }

  console.error("[GoStars AI Server] All Gemini candidate models failed for group report:", lastErrorMsg);
  throw new Error(`فشل استدعاء نماذج الذكاء الاصطناعي Gemini (${candidateModels.join(", ")}): ${lastErrorMsg}`);
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
  teacherNotes?: string; // ماذا حدث في الحصة؟ (أو المدخل المجمع)
  classEvents?: string; // الحقل الأول: ما حدث داخل الحصة (محتوى الدرس وأداء الطالب)
  homeworkNotes?: string; // الحقل الثاني: الواجب والتكليفات المطلوبة
  aiInstructions?: string; // تعليمات خاصة بالتقرير أو مدخلة يدوياً
  generalAiInstructions?: string; // التعليمات العامة لجميع المواد
  subjectAiInstructions?: string; // التعليمات المخصصة للمادة
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
    subject = "عام",
    date = new Date().toISOString().split("T")[0],
    attendanceStatus = "حاضر",
    homeworkStatus = "تم إنجازه",
    examScores = "لا يوجد",
    teacherNotes = "",
    classEvents = "",
    homeworkNotes = "",
    aiInstructions = "",
    generalAiInstructions = "",
    subjectAiInstructions = "",
    preferredLanguage = "ar",
    attachment
  } = req;

  // Resolve what happened in class vs homework notes
  const effectiveClassEvents = (classEvents || "").trim() || (teacherNotes || "").trim() || "تم شرح الدرس ومتابعة التطبيق العملي للدرس بانتظام وتفاعل الطالب بتركيز.";
  const effectiveHomeworkNotes = (homeworkNotes || "").trim();

  const isNoHw =
    (!effectiveHomeworkNotes && (!homeworkStatus ||
    homeworkStatus === "no_homework" ||
    homeworkStatus === "none" ||
    homeworkStatus.includes("لم يكن هناك واجب") ||
    homeworkStatus.includes("لا يوجد واجب")));

  const cleanGeneral = (generalAiInstructions || "").trim();
  const cleanSubject = (subjectAiInstructions || "").trim();
  const cleanCustom = (aiInstructions || "").trim();

  const hasAnyInstructions = !!(cleanGeneral || cleanSubject || cleanCustom);

  // Assemble instruction layers
  const instructionLayers: { title: string; content: string }[] = [];
  if (cleanGeneral) {
    instructionLayers.push({
      title: "1️⃣ التعليمات والضوابط العامة (المعتمدة لجميع المواد):",
      content: cleanGeneral
    });
  }
  if (cleanSubject && cleanSubject !== cleanGeneral) {
    instructionLayers.push({
      title: `2️⃣ التعليمات الخاصة بمادة (${subject}):`,
      content: cleanSubject
    });
  }
  if (cleanCustom && cleanCustom !== cleanGeneral && cleanCustom !== cleanSubject) {
    instructionLayers.push({
      title: "3️⃣ تعليمات وقالب إضافي مخصص لهذه الحصة:",
      content: cleanCustom
    });
  }

  const instructionsText = instructionLayers
    .map(l => `${l.title}\n"""\n${l.content}\n"""`)
    .join("\n\n");

  // 1. Strict System Instruction with explicit priority hierarchy and Anti-Hallucination rules
  const systemInstruction = `أنت محرك صياغة التقارير المدرسية المخصص لنظام إدارة الطلاب GoStars.

📌 [ترتيب الأولوية الإلزامي والحاسم في صياغة التقرير]:
1. الأولوية الأولى (المصدر الحصري للحقائق والمعلومات الواقعية):
   - مدخلات المعلم الفعلية في حقلي التقرير (1. ما حدث داخل الحصة، 2. الواجب والتكليفات) وبيانات الحصة المسجلة فقط.
   - لا يجوز لأي تعليمات أو قوالب أن تخترع حقائق غير مسجلة.
2. الأولوية الثانية (التعليمات المخصصة للمادة والشروط الإلزامية):
   - التعليمات الخاصة بمادة (${subject}) وأي شروط وقوالب حددها المعلم لكلا الحقلين (محتوى الحصة + الواجب).
   - هذه التعليمات قواعد إلزامية واجبة التطبيق 100% وليست مجرد اقتراحات.
3. الأولوية الثالثة (التعليمات العامة للنظام):
   - التعليمات العامة المعتمدة من المعلم.

📋 [معالجة حقلي إدخال المعلم (ما حدث داخل الحصة + الواجب)]:
- الحقل الأول [ما حدث داخل الحصة]: يحتوي على تفاصيل ما تم شرحه ونقاط الأداء والتفاعل والفهم الفعلي داخل الحصة. صغه بأسلوب تربوي محفز ومنسق وفق قالب وتعليمات المادة.
- الحقل الثاني [الواجب]: يحتوي على الواجب والتكليفات المحددة من المعلم للحصة القادمة. ضعه في قسم أو بند الواجب بالتقرير وفق قالب وتعليمات المادة بدقة تامة. إذا تم إدخال واجب محدد، اذكره نصاً ودقة. إذا كان الحقل فارغاً أو كانت حالة الواجب "لم يكن هناك واجب"، التزم بعدم اختراع أي واجب نهائياً واتبع التعليمات.
- يلتزم الذكاء الاصطناعي بتطبيق التعليمات والشروط والقوالب الخاصة بالمادة أو النظام على كِلا الحقلين معاً التزاماً تاماً وموثوقاً.

⛔ [قواعد صارمة جداً لمنع الاختلاق وحظر التلفيق (Strict Grounding Rules)]:
1. [منع الاختلاق التام]: يُمنع منعاً باتاً اختراع أو افتراض أو استنتاج أي معلومات لم يذكرها المعلم صراحة في حقلي الإدخال (مثل: اختراع واجب لم يُسجل، أو إضافة مهارة، أو نشاط، أو تقييم، أو مستوى، أو درجات، أو نقاط قوة/ضعف، أو سلوك لم يذكره المعلم).
2. [الأمثلة التوضيحية في التعليمات والقوالب ليست حقائق]: إذا كانت تعليمات المادة أو القالب تحتوي على نصوص أو أمثلة توضيحية (مثل أرقام صفحات، أسماء دروس، واجبات مقترحة، درجات افتراضية)، يجب معاملتها كأمثلة على الهيكل والأسلوب فقط، ويُحظر تماماً نقل هذه الأمثلة أو استخدامها كمعلومات فعلية إلا إذا وردت صراحة في مدخلات المعلم.
3. [حذف الأقسام الفارغة]: إذا نصت التعليمات أو القالب على أن قسماً أو بنداً معيناً يظهر فقط عند توفر معلومات عنه (أو إذا لم تكن هناك بيانات متوفرة كعدم وجود واجب أو درجات)، فيجب حذف القسم بالكامل من التقرير بدلاً من تركه فارغاً أو اختراع محتوى له.
4. [حفظ الروابط والأرقام والأسماء]: يجب الحفاظ بدقة تامة على أسماء الطلاب، والتواريخ، والأرقام، والروابط، وأي بيانات أدخلها المعلم دون تغيير أو تبديل أو تحريف.
5. [لا حشو إنشائي]: تجنب إضافة عبارات عامة مكررة أو نصوص تعليمية مصطنعة لمجرد ملء التقرير.

${hasAnyInstructions ? `🚨 [تعليمات وقواعد المعلم الإلزامية للتقرير]:\n${instructionsText}\n\nتنبيه: طبق هذه التعليمات بدقة على كِلا حقلي الحصة والواجب في هيكل وأسلوب ومضمون التقرير دون كتابة عبارات وصفية مثل "بناء على تعليمات المعلم".` : `📌 [توجيه عام]:
اكتب تقريراً واضحاً، دقيقاً، وموجزاً باللغة ${preferredLanguage === "ar" ? "العربية" : "الإنجليزية"} يعكس بيانات الحصة وملاحظات المعلم (ما تم بالحصة + الواجب) فقط دون أية مبالغات أو حشو.`}

${isNoHw ? "🚫 [تنبيه خاص بالواجب]: حالة الواجب في هذه الحصة هي (لا يوجد واجب / لم يتم تحديد واجب)، لذلك يُمنع منعاً باتاً ذكر أي بند أو سطر أو إشارة عن الواجب في التقرير نهائياً ما لم يحدده المعلم." : ""}
- المخرج المطلوب: نص التقرير الصافي فقط الجاهز للإرسال لولي الأمر، بدون أي مقدمات خارج التقرير ("إليك التقرير...") وبدون كتل كود markdown (no \`\`\` blocks).`;

  const userPromptText = `بيانات الحصة المسجلة فعلياً:
- اسم الطالب/الطالبة: ${studentName}
- المادة: ${subject}
- التاريخ: ${date}
- حالة الحضور: ${attendanceStatus}
${!isNoHw ? `- حالة الواجب: ${homeworkStatus}` : "- حالة الواجب: لم يكن هناك واجب"}
${examScores && examScores !== "لا يوجد" && examScores !== "غير محدد" ? `- درجة التقييم/الاختبار المسجلة: ${examScores}` : "- التقييم/الاختبار: لا توجد درجة مسجلة"}

📝 مدخلات المعلم المقسمة للحصة:
1️⃣ الحقل الأول (ما حدث داخل الحصة ومحتوى الدرس وتفاعل الطالب):
${effectiveClassEvents}

2️⃣ الحقل الثاني (الواجب والتكليفات المطلوبة):
${effectiveHomeworkNotes ? effectiveHomeworkNotes : (isNoHw ? "لم يتم تكليف الطالب بواجب في هذه الحصة." : "تابع ما تم إنجازه أو التكليف المعتاد.")}

${hasAnyInstructions ? `⭐ تعليمات وقواعد المعلم الإلزامية لصياغة هذا التقرير (طبقها بدقة على الحصة والواجب وتجنب أي اختلاق):
${instructionsText}` : ""}

تذكر: التزم بالبيانات المسجلة في الحقلين أعلاه فقط وبشروط المعلم، ولا تخترع أي معلومات من عندك. أخرج نص التقرير النهائي فقط.`;

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

  console.log(`[GoStars AI Server] Starting single report generation. Student: "${studentName}", Subject: "${subject}"`);
  const clientObj = getGeminiClient();
  if (!clientObj) {
    console.error("[GoStars AI Server] GEMINI_API_KEY is missing or empty in environment variables.");
    throw new Error("مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير محدد في متغيرات بيئة Vercel (Project Settings > Environment Variables). يرجى إضافته هناك ثم إعادة النشر.");
  }

  const { client, keySource } = clientObj;
  console.log(`[GoStars AI Server] GoogleGenAI initialized using key source: "${keySource}"`);

  const candidateModels = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  let lastErrorMsg = "";
  for (const modelName of candidateModels) {
    try {
      console.log(`[GoStars AI Server] Calling Gemini model: ${modelName} for student: ${studentName}...`);
      const response = await client.models.generateContent({
        model: modelName,
        contents: parts.length === 1 && typeof parts[0]?.text === "string" ? parts[0].text : parts,
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
          console.log(`[GoStars AI Server] Gemini model ${modelName} generated student report successfully. Characters: ${cleanText.length}`);
          return cleanText;
        }
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`[GoStars AI Server] Model ${modelName} call failed, trying next:`, lastErrorMsg);
    }
  }

  console.error("[GoStars AI Server] All Gemini candidate models failed for student report:", lastErrorMsg);
  throw new Error(`فشل استدعاء نماذج الذكاء الاصطناعي Gemini (${candidateModels.join(", ")}): ${lastErrorMsg}`);
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
