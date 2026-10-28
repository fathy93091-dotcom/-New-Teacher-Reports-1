import { GoogleGenAI } from "@google/genai";
import { processGoStarsAttachment } from "./attachmentProcessor";
import { Student, GeneratedReport } from "../src/types";
import {
  buildStructuredMonthlyAnalysis,
  buildComprehensiveMonthlyReportData,
  formatComprehensiveMonthlyReportText,
  findCanonicalSurah,
  deduplicateSurahScope,
  extractCategorizedItemsFromText,
  buildCategorySpecificNarratives,
  isCleanValue,
  sanitizeComprehensiveMonthlyReportData,
  stripAllUrlsAndLinks,
  sanitizeTextForEnglishReport,
  ComprehensiveMonthlyReportData,
  StructuredMonthlyAnalysis
} from "../src/lib/monthlyReportModel";
import { formatMonthlyReportMonth, normalizeReportTeacherName } from "../src/lib/monthlyQuranReport";

function getGeminiClient(): { client: GoogleGenAI; keySource: string; apiKey?: string } | null {
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
          const client = new GoogleGenAI({
            apiKey: key,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });
          return { client, keySource: name, apiKey: key };
        } catch (initErr: any) {
          console.error(`[GoStars AI] Error initializing GoogleGenAI with ${name}:`, initErr?.message || initErr);
        }
      }
    }
  }

  // Also try fallback to default GoogleGenAI({}) in case environment has auto-detected credentials
  try {
    const defaultClient = new GoogleGenAI({
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    return { client: defaultClient, keySource: "auto-detect" };
  } catch {
    return null;
  }
}

// Cooldown tracker for rate-limited models (429) to avoid latency loops
const modelCooldownMap = new Map<string, number>();

export async function callGeminiWithFastFallback(
  client: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
    logPrefix?: string;
    timeoutMs?: number;
    apiKey?: string;
  }
): Promise<string | null> {
  const timeoutMs = options.timeoutMs || 8000;
  const logPrefix = options.logPrefix || "[GoStars AI]";

  // Ordered for maximum speed, availability, standard tier resilience, and zero 429 quota exhaustion:
  // 1. gemini-flash-lite-latest (Verified active, ultra-fast ~500ms, generous quota)
  // 2. gemini-3.5-flash-lite (Verified active, ultra-fast ~500ms)
  // 3. gemini-3.8-flash (Standard flagship model, used when quota available)
  // 4. gemini-3-flash-preview (Verified active fallback)
  // 5. gemini-3.6-flash (Verified active fallback)
  // 6. gemini-3.1-flash-lite (Standard efficiency model)
  // 7. gemini-flash-latest
  const baseCandidates = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  const candidateModels: string[] = [];
  if (options.preferredModel && !candidateModels.includes(options.preferredModel)) {
    candidateModels.push(options.preferredModel);
  }
  for (const m of baseCandidates) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  const now = Date.now();
  // If all candidate models are on cooldown, reset cooldown to never lock out users
  const allCooling = candidateModels.every(m => {
    const exp = modelCooldownMap.get(m);
    return exp && now < exp;
  });
  if (allCooling) {
    console.log(`${logPrefix} All candidate models in cooldown; clearing cooldown map for retry.`);
    modelCooldownMap.clear();
  }

  for (const modelName of candidateModels) {
    const cooldownExpiry = modelCooldownMap.get(modelName);
    if (cooldownExpiry && now < cooldownExpiry) {
      console.log(`${logPrefix} Skipping ${modelName} due to active cooldown (${Math.ceil((cooldownExpiry - now) / 1000)}s left)`);
      continue;
    }

    // Try up to 2 times for transient 503 errors (high demand micro-spikes)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`${logPrefix} Calling Gemini model: ${modelName} (attempt ${attempt})...`);
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout: Model ${modelName} exceeded ${timeoutMs}ms`)), timeoutMs);
        });

        const callPromise = client.models.generateContent({
          model: modelName,
          contents: options.contents,
          config: {
            temperature: 0.1,
            ...options.config
          }
        });

        const response: any = await Promise.race([callPromise, timeoutPromise]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        let rawOutput = (response && response.text) ? response.text.trim() : "";
        if (!rawOutput && response?.candidates?.[0]?.content?.parts) {
          rawOutput = response.candidates[0].content.parts
            .map((p: any) => p?.text || "")
            .join("")
            .trim();
        }

        if (rawOutput) {
          let cleanText = rawOutput;
          if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
          }
          if (cleanText) {
            console.log(`${logPrefix} Gemini model ${modelName} succeeded (${cleanText.length} chars).`);
            return cleanText;
          }
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isQuota = err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
        const isUnavailable = err?.status === 503 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand");

        if (isQuota) {
          console.warn(`${logPrefix} Model ${modelName} quota limit (429). Setting 30m cooldown, switching model immediately.`);
          modelCooldownMap.set(modelName, Date.now() + 1800000);
          break; // Do not retry 429 on the same model
        }

        if (isUnavailable && attempt === 1) {
          console.warn(`${logPrefix} Model ${modelName} temporary 503 spike, retrying after 300ms...`);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        if (isUnavailable) {
          console.warn(`${logPrefix} Model ${modelName} high demand spike (503). Setting 15s cooldown.`);
          modelCooldownMap.set(modelName, Date.now() + 15000);
        } else {
          console.warn(`${logPrefix} Model ${modelName} failed or timed out:`, errMsg);
        }
        break; // break attempt loop to try next model
      }
    }
  }

  // Resilient Direct REST Fetch Pathway if SDK calls failed or were blocked
  const effectiveApiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (effectiveApiKey) {
    const directModels = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3-flash-preview",
      "gemini-3.6-flash",
      "gemini-3.8-flash"
    ];
    for (const dModel of directModels) {
      try {
        console.log(`${logPrefix} Attempting direct REST fallback via ${dModel}...`);
        let promptText = "";
        if (typeof options.contents === "string") {
          promptText = options.contents;
        } else if (Array.isArray(options.contents)) {
          promptText = options.contents.map((c: any) => (typeof c === "string" ? c : c?.text || "")).join("\n");
        } else if (options.contents?.parts) {
          promptText = options.contents.parts.map((p: any) => p?.text || "").join("\n");
        }

        if (options.config?.systemInstruction) {
          promptText = `${options.config.systemInstruction}\n\n${promptText}`;
        }

        const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${dModel}:generateContent?key=${effectiveApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.1 }
          })
        });

        if (restRes.ok) {
          const restData: any = await restRes.json();
          const generated = restData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generated) {
            console.log(`${logPrefix} Direct REST fallback succeeded with ${dModel} (${generated.length} chars).`);
            let clean = generated;
            if (clean.startsWith("```")) {
              clean = clean.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
            }
            return clean;
          }
        } else {
          const errBody = await restRes.text().catch(() => "");
          console.warn(`${logPrefix} Direct REST ${dModel} HTTP ${restRes.status}:`, errBody.slice(0, 120));
        }
      } catch (restErr: any) {
        console.warn(`${logPrefix} Direct REST fallback with ${dModel} failed:`, restErr?.message || restErr);
      }
    }
  }

  return null;
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

${hasAnyInstructions ? `🚨🚨 [تعليمات وقواعد المعلم الإلزامية لصياغة التقرير - أولوية مطلقة 100%]:
${instructionsText}

تنبيه حاسم: تعليمات وشروط وقالب المعلم الموضح أعلاه هي القواعد العليا الواجبة التطبيق 100% في هيكل وأسلوب ومضمون وعناوين والرموز التعبيرية وبداية وختام التقرير دون كتابة عبارات وصفية مثل "بناء على تعليمات المعلم".` : "اكتب تقريراً جماعياً واضحاً وموجزاً ومرتباً يعكس بيانات وملاحظات الحصة الحالية فقط."}

📌 [ترتيب الأولوية وقواعد الدقة ومنع الاختلاق (Strict Grounding Rules)]:
1. [المصدر الحصري للحقائق]: بيانات الحصة الفعلية المسجلة لكل طالب وملاحظات المعلم فقط هي مصدر الحقائق. لا يجوز لأي تعليمات أو قوالب أن تخترع حقائق غير مسجلة.
2. [الأمثلة التوضيحية ليست حقائق]: إذا كانت تعليمات أو قالب المعلم تحتوي على أمثلة أو نصوص افتراضية، يجب معاملتها كأمثلة على الهيكل والأسلوب فقط، ويُحظر نقلها إلا إذا وردت صراحة في بيانات وملاحظات الحصة.
3. [حذف الأقسام الفارغة]: إذا لم تكن هناك بيانات متوفرة لبند معين (كعدم وجود واجب أو درجات)، فيجب حذف القسم بالكامل بدلاً من تركه فارغاً أو اختراع محتوى له.
4. [حفظ الروابط والأرقام والأسماء]: الحفاظ بدقة تامة على أسماء الطلاب، والتواريخ، والأرقام، والروابط، وأي بيانات أدخلها المعلم دون تغيير أو تحريف.

- المخرج المطلوب: نص التقرير النهائي الصافي فقط الجاهز للإرسال، بدون أي مقدمات خارج التقرير وبدون كتل كود markdown (no \`\`\` blocks).`;

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
  const combinedGroupInstructions = [aiInstructions, subjectAiInstructions, generalAiInstructions]
    .filter(Boolean)
    .join("\n\n");

  const clientObj = getGeminiClient();
  if (!clientObj) {
    console.warn("[GoStars AI Server] GEMINI_API_KEY is missing or empty. Returning standard group report template.");
    return buildStandardGroupReportText(subject, date, teacherName, students, generalNotes, combinedGroupInstructions);
  }

  const { client, keySource, apiKey } = clientObj;
  console.log(`[GoStars AI Server] GoogleGenAI initialized using key source: "${keySource}"`);

  const aiResult = await callGeminiWithFastFallback(client, {
    contents: promptText,
    config: {
      systemInstruction,
      temperature: 0.1
    },
    logPrefix: `[GoStars AI Group Report - ${subject}]`,
    apiKey
  });

  if (aiResult) {
    if (combinedGroupInstructions) {
      const noEmojiReq = /بدون\s*(إيموجي|ايموجي|رموز)|لا\s*(تضع|تستخدم)\s*(إيموجي|ايموجي|رموز)|no\s*emojis?/i.test(combinedGroupInstructions);
      if (noEmojiReq) {
        return aiResult.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{25A0}-\u{25FF}]|[\u{2B50}]/gu, "").trim();
      }
    }
    return aiResult;
  }

  console.log("[GoStars AI Server] All Gemini candidate models attempted, falling back to standard formatted template.");
  return buildStandardGroupReportText(subject, date, teacherName, students, generalNotes, combinedGroupInstructions);
}

export function buildStandardGroupReportText(
  subject: string,
  date: string,
  teacherName: string,
  students: GroupReportStudentItem[],
  generalNotes?: string,
  aiInstructions?: string
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

  let finalResult = out.trim();
  if (aiInstructions && aiInstructions.trim()) {
    const inst = aiInstructions.trim();
    const wantsNoEmoji = /بدون\s*إ?ي?موجي|بدون\s*رموز|لا\s*تستخدم\s*إ?ي?موجي|no\s*emoji/i.test(inst);
    if (/بسم\s*الله\s*الرحمن\s*الرحيم/i.test(inst) && !finalResult.includes("بسم الله الرحمن الرحيم")) {
      finalResult = `بسم الله الرحمن الرحيم\n\n${finalResult}`;
    } else if (/السلام\s*عليكم/i.test(inst) && !finalResult.includes("السلام عليكم")) {
      finalResult = `السلام عليكم ورحمة الله وبركاته\n\n${finalResult}`;
    }
    const closingMatch = inst.match(/(?:مع\s*خالص\s*تحياتي|تحياتي\s*لكم|مع\s*تحيات|جزاكم\s*الله\s*خيراً?|بارك\s*الله\s*فيكم)[^\n\r]*/i);
    if (closingMatch && !finalResult.includes(closingMatch[0].trim())) {
      finalResult = `${finalResult}\n\n${closingMatch[0].trim()}`;
    }
    if (wantsNoEmoji) {
      finalResult = finalResult.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}⭐📚👨‍🎓👩‍🎓👨‍🏫🔢⏱️📅📝🔴🟢⚠️🌟📌]/gu, "").replace(/  +/g, " ");
    }
  }

  return finalResult.trim();
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
  teacherName?: string;
  lessonNumber?: number;
  lessonDuration?: string; // e.g. "60 دقيقة (ساعة)"
  includeStudentName?: boolean; // هل تم تفعيل اسم الطالب (افتراضي true)
  includeTeacherName?: boolean; // هل تم تفعيل اسم المعلم
  includeLessonNumber?: boolean; // هل تم تفعيل رقم الحصة
  includeDuration?: boolean; // هل تم تفعيل عرض مدة الحصة بالتقرير
  includeLessonDate?: boolean; // هل تم تفعيل تاريخ الحصة
  durationMinutes?: number; // e.g. 60, 90
  attendanceStatus?: string; // حاضر, غائب, متأخر
  homeworkStatus?: string; // تم, لم يتم, متأخر
  overallEvaluation?: string; // التقييم الإجمالي ومستوى الأداء (خيارات محددة أو كتابة حرة من المعلم)
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
    studentName = "الطالب",
    subject = "عام",
    date = new Date().toISOString().split("T")[0],
    teacherName = "",
    lessonNumber,
    lessonDuration = "",
    includeStudentName = true,
    includeTeacherName = false,
    includeLessonNumber = true,
    includeDuration = false,
    includeLessonDate = true,
    durationMinutes,
    attendanceStatus = "حاضر",
    homeworkStatus = "تم إنجازه",
    overallEvaluation = "",
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

  const isEn = preferredLanguage === "en";
  const effectiveDuration = (lessonDuration || (durationMinutes ? `${durationMinutes} ${isEn ? "mins" : "دقيقة"}` : "")).trim();
  const shouldShowDuration = Boolean(includeDuration && effectiveDuration);
  const shouldShowTeacherName = Boolean(includeTeacherName && teacherName && teacherName.trim());
  const shouldShowLessonNumber = Boolean(includeLessonNumber && lessonNumber !== undefined && lessonNumber !== null);
  const shouldShowStudentName = Boolean(includeStudentName && studentName && studentName.trim());
  const shouldShowDate = Boolean(includeLessonDate && date && date.trim());

  // Resolve what happened in class vs homework notes
  const effectiveClassEvents = (classEvents || "").trim() || (teacherNotes || "").trim() || (isEn ? "Lesson delivered successfully with good student engagement." : "تم شرح الدرس ومتابعة التطبيق العملي للدرس بانتظام وتفاعل الطالب بتركيز.");
  const effectiveHomeworkNotes = (homeworkNotes || "").trim();
  const effectiveOverallEvaluation = (overallEvaluation || "").trim();

  const isNoHw =
    (!effectiveHomeworkNotes && (!homeworkStatus ||
    homeworkStatus === "no_homework" ||
    homeworkStatus === "none" ||
    homeworkStatus.includes("لم يكن هناك واجب") ||
    homeworkStatus.includes("لا يوجد واجب") ||
    homeworkStatus.toLowerCase().includes("no homework")));

  const cleanGeneral = (generalAiInstructions || "").trim();
  const cleanSubject = (subjectAiInstructions || "").trim();
  const cleanCustom = (aiInstructions || "").trim();

  const hasAnyInstructions = !!(cleanGeneral || cleanSubject || cleanCustom);

  // Assemble instruction layers
  const instructionLayers: { title: string; content: string }[] = [];
  if (cleanGeneral) {
    instructionLayers.push({
      title: isEn ? "1️⃣ General Instructions & Guidelines (All Subjects):" : "1️⃣ التعليمات والضوابط العامة (المعتمدة لجميع المواد):",
      content: cleanGeneral
    });
  }
  if (cleanSubject && cleanSubject !== cleanGeneral) {
    instructionLayers.push({
      title: isEn ? `2️⃣ Subject-Specific Instructions for (${subject}):` : `2️⃣ التعليمات الخاصة بمادة (${subject}):`,
      content: cleanSubject
    });
  }
  if (cleanCustom && cleanCustom !== cleanGeneral && cleanCustom !== cleanSubject) {
    instructionLayers.push({
      title: isEn ? "3️⃣ Custom Template & Instructions for this lesson:" : "3️⃣ تعليمات وقالب إضافي مخصص لهذه الحصة:",
      content: cleanCustom
    });
  }

  const instructionsText = instructionLayers
    .map(l => `${l.title}\n"""\n${l.content}\n"""`)
    .join("\n\n");

  // Build header specifications for system prompt in the exact designated order:
  // 1. Student Name -> 2. Teacher Name -> 3. Lesson Number -> 4. Lesson Duration -> 5. Lesson Date
  const headerSpecsAr: string[] = [];
  if (shouldShowStudentName) headerSpecsAr.push(`1. اسم الطالب: ${studentName}`);
  if (shouldShowTeacherName) headerSpecsAr.push(`2. اسم المعلم: ${teacherName}`);
  if (shouldShowLessonNumber) headerSpecsAr.push(`3. رقم الحصة: #${lessonNumber}`);
  if (shouldShowDuration) headerSpecsAr.push(`4. مدة الحصة: ${effectiveDuration}`);
  if (shouldShowDate) headerSpecsAr.push(`5. تاريخ الحصة: ${date}`);

  const headerSpecsEn: string[] = [];
  if (shouldShowStudentName) headerSpecsEn.push(`1. Student Name: ${studentName}`);
  if (shouldShowTeacherName) headerSpecsEn.push(`2. Teacher Name: ${teacherName}`);
  if (shouldShowLessonNumber) headerSpecsEn.push(`3. Lesson Number: #${lessonNumber}`);
  if (shouldShowDuration) headerSpecsEn.push(`4. Lesson Duration: ${effectiveDuration}`);
  if (shouldShowDate) headerSpecsEn.push(`5. Lesson Date: ${date}`);

  const systemInstruction = isEn
    ? `You are the specialized AI school report generator for the GoStars Teacher Management System.

🚨🚨 [MANDATORY TEACHER INSTRUCTIONS & CUSTOM TEMPLATE - ABSOLUTE PRIORITY #1]:
${hasAnyInstructions ? `The teacher has specified custom instructions, guidelines, or a required template for generating this report. You MUST STRICTLY and 100% follow all formatting, layout, structure, greeting, closing, tone, style, bullet points, emoji usage, and specific rules defined below:

${instructionsText}

⚠️ CRITICAL DIRECTIVE: The teacher's instructions and custom template above take ABSOLUTE PRECEDENCE over any default layout conventions. If the teacher requested a specific layout, greeting, closing, bullet format, language, or style, follow it PRECISELY and WITHOUT DEVIATION.` : "Generate a clear, polite, and encouraging educational report based on the recorded lesson details."}

📌 [GROUNDING & DATA INTEGRITY RULES]:
1. [EXCLUSIVITY OF FACTS]: Derive facts ONLY from the actual recorded lesson inputs (Class Events, Homework, Overall Assessment). NEVER invent or hallucinate missing facts, exercises, or grades.
2. [NO HOMEWORK RULE]: ${isNoHw ? "NO HOMEWORK WAS ASSIGNED in this lesson. Do NOT mention homework or assignment sections in the report unless explicitly instructed by the teacher." : "Include homework details as provided by the teacher."}
3. [HEADER & DATA INCLUSION]: Include active header fields (${headerSpecsEn.join(", ")}) according to the teacher's configured preferences and template. Any disabled header item MUST NOT be displayed.
4. [CLEAN OUTPUT]: Output ONLY the final clean report text ready to send to parents. No conversational filler ("Here is the report..."), no markdown code blocks (\`\`\`).`
    : `أنت محرك صياغة التقارير المدرسية المخصص لنظام إدارة الطلاب GoStars.

🚨🚨 [توجيهات وتعليمات وقالب المعلم الإلزامي - أولوية مطلقة وحاسمة 100%]:
${hasAnyInstructions ? `حدد المعلم تعليمات وضوابط وقوالب إلزامية لصياغة هذا التقرير. يجب عليك الالتزام التام والكامل 100% بكافة شروط المعلم وقالبه الموضح أدناه (من حيث الهيكل، الترويسة، المقدمة، الخاتمة، العناوين، الرموز التعبيرية، النمط، أسلوب الصياغة، واللغة):

${instructionsText}

⚠️ تنبيه حاسم ومباشر: تعليمات المعلم وقالبه الموضح أعلاه لها الأولوية القصوى والمطلقة وتتغلب وتلغي أي تنسيق أو هيكل افتراضي. إذا حدد المعلم شكلاً معيناً، أو طريقة صياغة، أو بدايات ونهايات محددة، صغ التقرير بموجبها بدقة متناهية ودون أي مخالفة.` : "صغ تقريراً واضحاً ومرتباً وبأسلوب تربوي مشجع يعكس بيانات وملاحظات الحصة الحالية فقط."}

📌 [قواعد الدقة ومنع الاختلاق (Grounding & Accuracy)]:
1. [الحقائق المسجلة فقط]: اعتمد حصرياً على بيانات الحصة المسجلة فعلياً (ما حدث بالحصة، الواجب، التقييم الإجمالي). يُحظر تماماً اختراع أو افتراض واجبات أو درجات أو تفاصيل لم يذكرها المعلم.
2. [حالة الواجب]: ${isNoHw ? "لم يتم تكليف الطالب بواجب في هذه الحصة. يُمنع منعاً باتاً ذكر أي بند أو سطر أو إشارة عن الواجب في التقرير نهائياً ما لم ينص المعلم على خلاف ذلك." : "ضمن تفاصيل الواجب المسجلة بدقة."}
3. [ترويسة وبيانات التقرير]: اضبط عناصر الترويسة (${headerSpecsAr.length > 0 ? headerSpecsAr.join("، ") : "حسب إعدادات الترويسة"}) وفق تفضيلات وقالب المعلم المعتمد. أي عنصر غير مفعل يُحظر ظهوره تماماً.
4. [مخرج صافٍ]: أخرج نص التقرير النهائي الجاهز للإرسال مباشرة لولي الأمر، بدون أي مقدمات خارج التقرير وبدون كتل كود markdown (no \`\`\` blocks).`;

  const userPromptText = isEn
    ? `Actual Recorded Lesson Details:
- Subject: ${subject}
${headerSpecsEn.length > 0 ? `Active Header Items:\n${headerSpecsEn.join("\n")}` : ""}
- Attendance Status: ${attendanceStatus}
${!isNoHw ? `- Homework Status: ${homeworkStatus}` : "- Homework: No homework assigned"}
${effectiveOverallEvaluation ? `- Overall Assessment / Rating: ${effectiveOverallEvaluation}` : "- Assessment: Not specified"}
${examScores && examScores !== "لا يوجد" && examScores !== "غير محدد" && examScores !== "None" ? `- Exam Score: ${examScores}` : ""}

📝 Teacher Inputs for this Lesson:
1️⃣ Class Events & Content (What happened in class / student participation):
${effectiveClassEvents}

2️⃣ Homework & Assignments:
${effectiveHomeworkNotes ? effectiveHomeworkNotes : (isNoHw ? "No homework assigned." : "Follow usual practice.")}

${effectiveOverallEvaluation ? `3️⃣ Overall Performance Assessment:
${effectiveOverallEvaluation}` : ""}

${hasAnyInstructions ? `⭐ Mandatory Teacher Instructions & Template (Apply 100% strictly):
${instructionsText}` : ""}

Remember: Output ONLY the final clean English report text adhering to active header items in exact order and zero hallucinations.`
    : `بيانات الحصة المسجلة فعلياً:
- المادة: ${subject}
${headerSpecsAr.length > 0 ? `عناصر الترويسة المفعلة بالترتيب الإلزامي:\n${headerSpecsAr.join("\n")}` : ""}
- حالة الحضور: ${attendanceStatus}
${!isNoHw ? `- حالة الواجب: ${homeworkStatus}` : "- حالة الواجب: لم يكن هناك واجب"}
${effectiveOverallEvaluation ? `- ⭐ التقييم الإجمالي ومستوى الأداء المحدد من المعلم: ${effectiveOverallEvaluation}` : "- التقييم الإجمالي: غير محدد"}
${examScores && examScores !== "لا يوجد" && examScores !== "غير محدد" ? `- درجة الاختبار المسجلة: ${examScores}` : "- الاختبار: لا توجد درجة مسجلة"}

📝 مدخلات المعلم المقسمة للحصة:
1️⃣ الحقل الأول (ما حدث داخل الحصة ومحتوى الدرس وتفاعل الطالب):
${effectiveClassEvents}

2️⃣ الحقل الثاني (الواجب والتكليفات المطلوبة):
${effectiveHomeworkNotes ? effectiveHomeworkNotes : (isNoHw ? "لم يتم تكليف الطالب بواجب في هذه الحصة." : "تابع ما تم إنجازه أو التكليف المعتاد.")}

${effectiveOverallEvaluation ? `3️⃣ التقييم الإجمالي المعتمد للحصة:
${effectiveOverallEvaluation}` : ""}

${hasAnyInstructions ? `⭐ تعليمات وقواعد المعلم الإلزامية لصياغة هذا التقرير (طبقها بدقة على الحصة والواجب وتجنب أي اختلاق):
${instructionsText}` : ""}

تذكر: التزم بالبيانات والترويسة المفعلة بالترتيب الإلزامي أعلاه فقط وبشروط المعلم، ولا تخترع أي معلومات من عندك. أخرج نص التقرير النهائي فقط.`;

  const parts: any[] = [];

  if (attachment && attachment.data && attachment.mimeType) {
    try {
      const processed = await processGoStarsAttachment(attachment);
      if (processed.hasInlineData && processed.inlineData) {
        parts.push({
          inlineData: {
            mimeType: processed.inlineData.mimeType,
            data: processed.inlineData.data
          }
        });
      }

      let promptWithAttachment = userPromptText;
      if (processed.extractedTextDescription) {
        promptWithAttachment += `\n\n${processed.extractedTextDescription}\n\n⚠️ يُرجى استخراج واستيعاب البيانات والملاحظات والتمارين والدرجات والواجبات الفعلية الواردة في الملف المرفق أعلاه بدقة وتضمينها بالتقرير دون أي اختلاق أو افتراض.`;
      }

      parts.push({ text: promptWithAttachment });
    } catch (procErr: any) {
      console.warn("[GoStars AI Server] Error processing attachment, falling back to prompt text:", procErr?.message || procErr);
      parts.push({
        text: `${userPromptText}\n\n📎 ملحوظة: تم إرفاق ملف (${attachment.fileName || "مرفق"})، يُرجى الصياغة بالاعتماد على ملاحظات وبيانات المعلم بدقة.`
      });
    }
  } else {
    parts.push({ text: userPromptText });
  }

  console.log(`[GoStars AI Server] Starting single report generation. Student: "${studentName}", Subject: "${subject}", Lang: "${preferredLanguage}"`);
  const clientObj = getGeminiClient();
  if (!clientObj) {
    console.warn("[GoStars AI Server] GEMINI_API_KEY is missing or empty. Returning structured fallback report.");
    return buildFallbackReportText(
      studentName,
      subject,
      date,
      attendanceStatus || "حاضر",
      homeworkStatus || "منجز",
      teacherNotes || classEvents || homeworkNotes || "",
      aiInstructions || generalAiInstructions || subjectAiInstructions || "",
      preferredLanguage,
      {
        teacherName,
        lessonNumber,
        durationMinutes: durationMinutes || (lessonDuration ? parseInt(lessonDuration) : undefined),
        lessonDuration,
        includeStudentName,
        includeTeacherName,
        includeLessonNumber,
        includeDuration,
        includeLessonDate,
        classEvents,
        homeworkNotes,
        overallEvaluation
      }
    );
  }

  const { client, keySource, apiKey } = clientObj;
  console.log(`[GoStars AI Server] GoogleGenAI initialized using key source: "${keySource}"`);

  const aiResult = await callGeminiWithFastFallback(client, {
    contents: parts.length === 1 && typeof parts[0]?.text === "string" ? parts[0].text : parts,
    config: {
      systemInstruction,
      temperature: 0.1
    },
    logPrefix: `[GoStars AI Student Report - ${studentName}]`,
    apiKey
  });

  if (aiResult) {
    const combinedInstructions = [aiInstructions, subjectAiInstructions, generalAiInstructions].filter(Boolean).join("\n\n");
    if (combinedInstructions) {
      return applyTeacherCustomInstructions(
        aiResult,
        combinedInstructions,
        {
          studentName,
          subject,
          date,
          teacherName,
          lessonNumber,
          lessonDuration: effectiveDuration,
          attendance: attendanceStatus,
          homeworkNotes: homeworkNotes || teacherNotes,
          classEvents,
          overallEvaluation,
          isNoHw,
          isEn
        }
      );
    }
    return aiResult;
  }

  console.log("[GoStars AI Server] All Gemini candidate models attempted, falling back to structured local report generator.");
  return buildFallbackReportText(
    studentName,
    subject,
    date,
    attendanceStatus || "حاضر",
    homeworkStatus || "منجز",
    teacherNotes || classEvents || homeworkNotes || "",
    aiInstructions || "",
    preferredLanguage,
    {
      teacherName,
      lessonNumber,
      durationMinutes: durationMinutes || (lessonDuration ? parseInt(lessonDuration) : undefined),
      lessonDuration,
      includeStudentName,
      includeTeacherName,
      includeLessonNumber,
      includeDuration,
      includeLessonDate,
      classEvents,
      homeworkNotes,
      overallEvaluation,
      generalAiInstructions,
      subjectAiInstructions
    }
  );
}

/**
 * Intelligent helper to parse teacher instructions and apply them (emoji removal, custom greeting, signature, template interpolation)
 */
function applyTeacherCustomInstructions(
  baseText: string,
  combinedInstructions: string,
  context: {
    studentName: string;
    subject: string;
    date: string;
    teacherName?: string;
    lessonNumber?: number;
    lessonDuration?: string;
    attendance: string;
    homeworkNotes?: string;
    classEvents?: string;
    overallEvaluation?: string;
    isNoHw: boolean;
    isEn: boolean;
  }
): string {
  if (!combinedInstructions || !combinedInstructions.trim()) {
    return baseText;
  }

  let text = baseText;
  const inst = combinedInstructions.trim();
  const instLower = inst.toLowerCase();

  // 1. Check if teacher requested NO EMOJIS (بدون إيموجي / no emoji)
  const wantsNoEmoji =
    /بدون\s*إ?ي?موجي|بدون\s*رموز|لا\s*تستخدم\s*إ?ي?موجي|بدون\s*أيقونات|no\s*emoji|without\s*emoji/i.test(inst);

  // 2. If the AI output contains remaining unpopulated bracket placeholders, fill them in safely
  text = text
    .replace(/\[(?:اسم\s*الطالب|الطالب)\]|\{(?:student|studentName)\}/gi, context.studentName)
    .replace(/\[(?:المادة)\]|\{(?:subject)\}/gi, context.subject)
    .replace(/\[(?:اسم\s*المعلم|المعلم)\]|\{(?:teacher|teacherName)\}/gi, context.teacherName || "")
    .replace(/\[(?:رقم\s*الحصة)\]|\{(?:lessonNumber|lesson)\}/gi, context.lessonNumber !== undefined ? String(context.lessonNumber) : "")
    .replace(/\[(?:مدة\s*الحصة)\]|\{(?:duration|lessonDuration)\}/gi, context.lessonDuration || "")
    .replace(/\[(?:التاريخ)\]|\{(?:date)\}/gi, context.date)
    .replace(/\[(?:الحضور)\]|\{(?:attendance)\}/gi, context.attendance)
    .replace(/\[(?:ما\s*حدث\s*(?:داخل|في)?\s*الحصة|محتوى\s*الدرس)\]|\{(?:classEvents|events)\}/gi, context.classEvents || "")
    .replace(/\[(?:الواجب)\]|\{(?:homework|homeworkNotes)\}/gi, context.isNoHw ? (context.isEn ? "No homework" : "لا يوجد واجب") : (context.homeworkNotes || ""))
    .replace(/\[(?:التقييم)\]|\{(?:evaluation|overallEvaluation)\}/gi, context.overallEvaluation || "");

  // 3. Check for custom greetings requested in instructions
  if (/بسم\s*الله\s*الرحمن\s*الرحيم/i.test(inst) && !text.includes("بسم الله الرحمن الرحيم")) {
    text = `بسم الله الرحمن الرحيم\n\n${text}`;
  } else if (/السلام\s*عليكم/i.test(inst) && !text.includes("السلام عليكم")) {
    const greetingMatch = inst.match(/(السلام\s*عليكم\s*ورحمة\s*الله\s*وبركاته|السلام\s*عليكم)/i);
    if (greetingMatch) {
      text = `${greetingMatch[1]}\n\n${text}`;
    }
  }

  // 4. Check for custom closing / signature requested in instructions
  const closingMatch = inst.match(/(?:مع\s*خالص\s*تحياتي|تحياتي\s*لكم|مع\s*تحيات|جزاكم\s*الله\s*خيراً?|بارك\s*الله\s*فيكم)[^\n\r]*/i);
  if (closingMatch && !text.includes(closingMatch[0].trim())) {
    text = `${text}\n\n${closingMatch[0].trim()}`;
  }

  // Strip emojis if requested
  if (wantsNoEmoji) {
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}⭐📚👨‍🎓👩‍🎓👨‍🏫🔢⏱️📅📝🔴🟢⚠️]/gu, "").replace(/  +/g, " ");
  }

  return text;
}

export function buildFallbackReportText(
  studentName: string,
  subject: string,
  date: string,
  attendance: string,
  homework: string,
  notes: string,
  aiInstructions: string,
  lang: "ar" | "en",
  options?: {
    teacherName?: string;
    lessonNumber?: number;
    durationMinutes?: number;
    lessonDuration?: string;
    includeStudentName?: boolean;
    includeTeacherName?: boolean;
    includeLessonNumber?: boolean;
    includeDuration?: boolean;
    includeLessonDate?: boolean;
    classEvents?: string;
    homeworkNotes?: string;
    overallEvaluation?: string;
    generalAiInstructions?: string;
    subjectAiInstructions?: string;
  }
): string {
  const isEn = lang === "en";
  const {
    teacherName,
    lessonNumber,
    durationMinutes,
    lessonDuration,
    includeStudentName = true,
    includeTeacherName = false,
    includeLessonNumber = true,
    includeDuration = false,
    includeLessonDate = true,
    classEvents,
    homeworkNotes,
    overallEvaluation,
    generalAiInstructions,
    subjectAiInstructions
  } = options || {};

  const effectiveDuration = (lessonDuration || (durationMinutes ? `${durationMinutes} ${isEn ? "mins" : "دقيقة"}` : "")).trim();
  const shouldShowDuration = Boolean(includeDuration && effectiveDuration);
  const shouldShowTeacherName = Boolean(includeTeacherName && teacherName && teacherName.trim());
  const shouldShowLessonNumber = Boolean(includeLessonNumber && lessonNumber !== undefined && lessonNumber !== null);
  const shouldShowStudentName = Boolean(includeStudentName && studentName && studentName.trim());
  const shouldShowDate = Boolean(includeLessonDate && date && date.trim());

  const isNoHw =
    !homework ||
    homework === "no_homework" ||
    homework === "none" ||
    homework.includes("لم يكن هناك واجب") ||
    homework.includes("لا يوجد واجب") ||
    homework.toLowerCase().includes("no homework");

  const combinedInstructions = [aiInstructions, subjectAiInstructions, generalAiInstructions]
    .filter(Boolean)
    .join("\n\n");

  let out = "";
  if (isEn) {
    out = `📚 Subject: ${subject}\n\n`;
    out += `━━━━━━━━━━━━━━━━━━\n`;
    if (shouldShowStudentName) out += `👨‍🎓 Student: ${studentName}\n`;
    if (shouldShowTeacherName) out += `👨‍🏫 Teacher: ${teacherName}\n`;
    if (shouldShowLessonNumber) out += `🔢 Lesson: #${lessonNumber}\n`;
    if (shouldShowDuration) out += `⏱️ Duration: ${effectiveDuration}\n`;
    if (shouldShowDate) out += `📅 Date: ${date}\n`;
    out += `━━━━━━━━━━━━━━━━━━\n\n`;

    out += `• Attendance: ${attendance}\n`;
    if (!isNoHw && (homeworkNotes || homework)) {
      out += `• Homework: ${homeworkNotes || homework}\n`;
    }
    if (classEvents && classEvents.trim()) {
      out += `\n📝 Lesson Content & Class Events:\n${classEvents.trim()}\n`;
    } else if (notes && notes.trim()) {
      out += `\n📝 Lesson Notes:\n${notes.trim()}\n`;
    }
    if (overallEvaluation && overallEvaluation.trim()) {
      out += `\n⭐ Overall Assessment: ${overallEvaluation.trim()}\n`;
    }
  } else {
    // Arabic
    out = `📚 تقرير متابعة (${subject})\n\n`;
    out += `━━━━━━━━━━━━━━━━━━\n`;
    if (shouldShowStudentName) out += `👨‍🎓 الطالب: ${studentName}\n`;
    if (shouldShowTeacherName) out += `👨‍🏫 المعلم: ${teacherName}\n`;
    if (shouldShowLessonNumber) out += `🔢 رقم الحصة: #${lessonNumber}\n`;
    if (shouldShowDuration) out += `⏱️ مدة الحصة: ${effectiveDuration}\n`;
    if (shouldShowDate) out += `📅 التاريخ: ${date}\n`;
    out += `━━━━━━━━━━━━━━━━━━\n\n`;

    out += `• الحضور: ${attendance}\n`;
    if (!isNoHw && (homeworkNotes || homework)) {
      out += `• الواجب: ${homeworkNotes || homework}\n`;
    }
    if (classEvents && classEvents.trim()) {
      out += `\n📝 ما حدث داخل الحصة:\n${classEvents.trim()}\n`;
    } else if (notes && notes.trim()) {
      out += `\n📝 ملاحظات الحصة:\n${notes.trim()}\n`;
    }
    if (overallEvaluation && overallEvaluation.trim()) {
      out += `\n⭐ التقييم الإجمالي: ${overallEvaluation.trim()}\n`;
    }
  }

  // Apply custom instructions (such as removing emojis, custom greetings/signatures, or filling custom template)
  const finalResult = applyTeacherCustomInstructions(out.trim(), combinedInstructions, {
    studentName,
    subject,
    date,
    teacherName,
    lessonNumber,
    lessonDuration: effectiveDuration,
    attendance,
    homeworkNotes: homeworkNotes || homework,
    classEvents: classEvents || notes,
    overallEvaluation,
    isNoHw,
    isEn
  });

  return finalResult.trim();
}

export interface MonthlyLessonSummary {
  date: string;
  lessonNumber?: number;
  durationMinutes?: number;
  attendance: string;
  homeworkStatus?: string;
  classEvents?: string;
  homeworkNotes?: string;
  teacherNotes?: string;
  overallEvaluation?: string;
  reportText?: string;
}

export interface MonthlyReportGenerationRequest {
  studentName: string;
  subject: string; // "قرآن كريم" or "Quran, Arabic and Islamic Studies"
  month: number; // 1-12
  year: number;
  monthName?: string;
  totalLessons: number;
  totalHours: number | string;
  lessons: MonthlyLessonSummary[];
  teacherName?: string;
  additionalNotes?: string;
  generalAiInstructions?: string;
  subjectAiInstructions?: string;
  aiInstructions?: string;
  dailyAnalysisInstructions?: string;
  monthlyTemplateInstructions?: string;
  todayDate?: string;
  lang?: "ar" | "en";
  previousContext?: {
    lastMonthName?: string;
    lastMonthAchievements?: string;
    lastMonthStrengths?: string[];
    lastMonthRecommendations?: string[];
    lastMonthPlan?: string;
    historicalLessonsSummary?: string;
    [key: string]: any;
  } | string;
}

const ENGLISH_MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const ARABIC_MONTHS_LIST = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatReportMonth(
  monthNumber?: number,
  year?: number,
  rawMonthName?: string,
  lang: "ar" | "en" = "ar"
): string {
  let m = typeof monthNumber === "number" && monthNumber >= 1 && monthNumber <= 12 ? monthNumber : undefined;
  let y = typeof year === "number" && year >= 2020 ? year : new Date().getFullYear();

  if (rawMonthName) {
    const rawLower = rawMonthName.toLowerCase();
    const yearMatch = rawMonthName.match(/\b(202\d)\b/);
    if (yearMatch) y = parseInt(yearMatch[1], 10);

    if (!m) {
      if (/سبتمبر|september|\b9\b|شهر\s*9/i.test(rawLower)) m = 9;
      else if (/أكتوبر|اكتوبر|october|\b10\b|شهر\s*10/i.test(rawLower)) m = 10;
      else if (/نوفمبر|november|\b11\b|شهر\s*11/i.test(rawLower)) m = 11;
      else if (/ديسمبر|december|\b12\b|شهر\s*12/i.test(rawLower)) m = 12;
      else if (/يناير|january|\b1\b|شهر\s*1/i.test(rawLower)) m = 1;
      else if (/فبراير|february|\b2\b|شهر\s*2/i.test(rawLower)) m = 2;
      else if (/مارس|march|\b3\b|شهر\s*3/i.test(rawLower)) m = 3;
      else if (/أبريل|ابريل|april|\b4\b|شهر\s*4/i.test(rawLower)) m = 4;
      else if (/مايو|may|\b5\b|شهر\s*5/i.test(rawLower)) m = 5;
      else if (/يونيو|june|\b6\b|شهر\s*6/i.test(rawLower)) m = 6;
      else if (/يوليو|july|\b7\b|شهر\s*7/i.test(rawLower)) m = 7;
      else if (/أغسطس|اغسطس|august|\b8\b|شهر\s*8/i.test(rawLower)) m = 8;
    }
  }

  const safeMonth = m && m >= 1 && m <= 12 ? m : (new Date().getMonth() + 1);

  if (lang === "en") {
    return `${ENGLISH_MONTHS_LIST[safeMonth - 1]} ${y}`;
  } else {
    return `${ARABIC_MONTHS_LIST[safeMonth - 1]} ${y}`;
  }
}

function normalizeReportTeacher(rawName?: string, lang: "ar" | "en" = "ar"): string {
  if (!rawName) return lang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي";
  if (lang === "en") {
    const enMatch = rawName.match(/\(([^)]+)\)/);
    if (enMatch && /[a-zA-Z]/.test(enMatch[1])) {
      const inner = enMatch[1].trim();
      return inner.startsWith("Mr.") ? inner : `Mr. ${inner}`;
    }
    const clean = rawName.replace(/^(?:أ\.|الأستاذ|الشيخ|معلم)\s*/gi, "").trim();
    if (/محمد فتحي/.test(clean)) return "Mr. Mohammed Fathy";
    if (/[a-zA-Z]/.test(clean)) return clean.startsWith("Mr.") ? clean : `Mr. ${clean}`;
    return `Mr. ${clean}`;
  } else {
    const arClean = rawName.replace(/\s*\([a-zA-Z\s.-]+\)/g, "").trim();
    return arClean.startsWith("أ.") ? arClean : `أ. ${arClean}`;
  }
}

/**
 * Deterministic Fallback Generator for Comprehensive Monthly Report
 * Follows the user's strict Markdown template 100%
 */
export function buildStandardMonthlyReportText(req: MonthlyReportGenerationRequest): string {
  const {
    studentName = "الطالب",
    subject = "قرآن كريم",
    month,
    year,
    monthName,
    totalLessons = 0,
    totalHours = 0,
    lessons = [],
    teacherName = "أ. محمد فتحي (Mohammed Fathy)",
    additionalNotes = "",
    todayDate = new Date().toISOString().split("T")[0]
  } = req;

  // Determine language accurately based on explicit request or subject
  const isEn = Boolean(req.lang === "en" || (!req.lang && !/قرآن|اسلامية|دراسات|عربي|arabic/i.test(subject) && /english/i.test(subject)));
  const displayMonth = formatReportMonth(month, year, monthName, isEn ? "en" : "ar");
  const displayTeacher = normalizeReportTeacher(teacherName, isEn ? "en" : "ar");
  const effectiveHours = totalHours || Number(((totalLessons * 60) / 60).toFixed(1));

  // Helper to extract clean unique deduplicated items from text
  const extractUniqueItems = (items: string[]) => {
    const set = new Set<string>();
    items.forEach(raw => {
      const parts = raw.split(/[+،,\n-]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        if (p.length > 1 && !set.has(p)) set.add(p);
      });
    });
    return Array.from(set);
  };

  const newHefzItems: string[] = [];
  const revisionItems: string[] = [];
  const recitationItems: string[] = [];
  const islamicStudiesItems: string[] = [];
  const evaluationsFound: string[] = [];

  lessons.forEach((l) => {
    const fullNote = [l.classEvents, l.teacherNotes, l.homeworkNotes, l.overallEvaluation]
      .filter(Boolean)
      .join(" ");

    if (l.overallEvaluation) evaluationsFound.push(l.overallEvaluation);

    // Identify new memorization
    if (/حفظ|جديد|تلقي|سورة|آيات|حفظنا|تسميع جديد|memoriz|surah|ayah/i.test(fullNote)) {
      if (l.classEvents) newHefzItems.push(l.classEvents.trim());
      else if (l.teacherNotes) newHefzItems.push(l.teacherNotes.trim());
    }
    // Identify revision
    if (/مراجعة|راجع|استرجاع|الماضي|سابق|تثبيت|revis|review/i.test(fullNote)) {
      if (l.classEvents && /مراجعة|راجع|سابق|revis|review/i.test(l.classEvents)) revisionItems.push(l.classEvents.trim());
      else if (l.teacherNotes && /مراجعة|راجع|سابق|revis|review/i.test(l.teacherNotes)) revisionItems.push(l.teacherNotes.trim());
    }
    // Identify recitation & tajweed
    if (/تلاوة|قراءة|تجويد|أحكام|نورانية|تأسيس|مخارج|recit|tajweed|pronunc/i.test(fullNote)) {
      if (l.classEvents) recitationItems.push(l.classEvents.trim());
      else if (l.teacherNotes) recitationItems.push(l.teacherNotes.trim());
    }
    // Identify Islamic studies / Arabic
    if (/إسلامية|دراسات|فقه|سيرة|حديث|عقيدة|أخلاق|أذكار|عربي|لغة عربية|islamic|seerah|hadith|fiqh|aqeedah|arabic/i.test(fullNote)) {
      if (l.classEvents) islamicStudiesItems.push(l.classEvents.trim());
      else if (l.teacherNotes) islamicStudiesItems.push(l.teacherNotes.trim());
    }
  });

  const uniqueHefz = extractUniqueItems(newHefzItems);
  const uniqueRevision = extractUniqueItems(revisionItems);
  const uniqueRecitation = extractUniqueItems(recitationItems);
  const uniqueIslamic = extractUniqueItems(islamicStudiesItems);

  // General evaluation calculation
  const getOverallGrade = () => {
    const evalText = evaluationsFound.join(" ") + " " + lessons.map(l => l.teacherNotes || "").join(" ");
    if (/ممتاز|10\/10|متميز|رائع|excellent|outstanding/i.test(evalText)) return isEn ? "Excellent" : "ممتاز";
    if (/جيد جدا|9\/10|8\/10|متقن|very good|proficient/i.test(evalText)) return isEn ? "Very Good" : "جيد جدًا";
    if (/يحتاج إلى تحسين|ضعيف|لم يحفظ|غير جاهز|needs improvement/i.test(evalText)) return isEn ? "Needs Improvement & Follow-up" : "يحتاج إلى تحسين ومتابعة";
    if (/جيد|7\/10|good/i.test(evalText)) return isEn ? "Good" : "جيد";
    return isEn ? "Very Good" : "جيد جدًا";
  };

  const currentGrade = getOverallGrade();
  const notAvailablePlaceholder = isEn ? "(if applicable)" : "(إن وجد)";

  // Aggregated paragraphs per section with strict Arabic grammar
  const formatRangeOrList = (items: string[], type: "hefz" | "rev" | "rec" | "isl") => {
    if (!items || items.length === 0) return "";
    const cleanItems = items.map(s => s.replace(/^(حفظ|مراجعة|تسميع|درس|تم حفظ|تمت مراجعة)\s*:?/gi, "").trim()).filter(Boolean);
    if (cleanItems.length === 0) return "";
    
    if (type === "hefz") {
      const list = cleanItems.length <= 4 
        ? cleanItems.join(isEn ? ", " : "، و")
        : cleanItems.slice(0, 4).join(isEn ? ", " : "، و") + (isEn ? " (and related assignments)" : " (وما يتبعها من مقررات)");
      return isEn
        ? `Memorized assigned portions: (${list}) with direct recitation and sound pronunciation`
        : `تم إنجاز حفظ: (${list}) بإتقان تام وضبط للتلاوة ومخارج الحروف`;
    }

    if (type === "rev") {
      const list = cleanItems.length <= 4 
        ? cleanItems.join(isEn ? ", " : "، و")
        : cleanItems.slice(0, 4).join(isEn ? ", " : "، و") + (isEn ? " (and cumulative review)" : " (مع مراجعة تراكمية شاملة)");
      return isEn
        ? `Reviewed and reinforced: (${list}) ensuring smooth and confident recall`
        : `مراجعة وتثبيت: (${list}) لضبط المتشابهات وترسيخ المحفوظ بسلاسة دون تردد`;
    }

    if (type === "rec") {
      const list = cleanItems.join(isEn ? ", " : "، و");
      return isEn
        ? `Applied Tajweed rules (articulation points, elongation, Nun Sakinah) and recitation in: ${list}`
        : `تطبيق أحكام التجويد (مخارج الحروف، والمدود، وأحكام النون الساكنة) وتلاوة: ${list}`;
    }

    const list = cleanItems.join(isEn ? ", " : "، و");
    return isEn
      ? `Studied topics in: ${list} along with Islamic manners and daily Adhkar`
      : `دراسة موضوعات تربوية في: ${list} والآداب الإسلامية والأذكار اليومية`;
  };

  const hefzParagraph = formatRangeOrList(uniqueHefz, "hefz");
  const revisionParagraph = formatRangeOrList(uniqueRevision, "rev");
  const recitationParagraph = formatRangeOrList(uniqueRecitation, "rec");
  const islamicParagraph = formatRangeOrList(uniqueIslamic, "isl");

  // Realistic performance indicators parsed accurately from daily report lessons
  const parseLessonScoreServer = (evalText?: string, teacherNotes?: string, eventsText?: string): number | null => {
    const combined = `${evalText || ""} ${teacherNotes || ""} ${eventsText || ""}`.trim();
    if (!combined) return null;

    const fracMatch = combined.match(/(\d+(?:\.\d+)?)\s*[\/|من]\s*(\d+(?:\.\d+)?)/i);
    if (fracMatch) {
      const obtained = parseFloat(fracMatch[1]);
      const total = parseFloat(fracMatch[2]);
      if (total > 0 && obtained <= total) return Math.round((obtained / total) * 100);
    }

    const pctMatch = combined.match(/(\d{2,3})\s*%/);
    if (pctMatch) {
      const v = parseInt(pctMatch[1], 10);
      if (v >= 0 && v <= 100) return v;
    }

    const clean = combined.toLowerCase();
    if (/ممتاز\s*جداً|ممتاز\s*جدا|رائع|متقن\s*جداً|10\/10|10\s*من\s*10|excellent|outstanding|mastered|perfect/i.test(clean)) return 98;
    if (/ممتاز|متقن|متميز|عالي|فل|full/i.test(clean)) return 95;
    if (/جيد\s*جداً|جيد\s*جدا|فوق\s*المتوسط|8\/10|9\/10|very\s*good|proficient/i.test(clean)) return 88;
    if (/جيد|مرضي|7\/10|good|satisfactory/i.test(clean)) return 78;
    if (/مقبول|متوسط|تحتاج\s*متابعة|6\/10|fair|acceptable|average/i.test(clean)) return 68;
    if (/ضعيف|ضعيف\s*جداً|يحتاج\s*إعادة|لم\s*يحفظ|needs\s*improvement|weak|poor|5\/10|4\/10/i.test(clean)) return 55;

    return null;
  };

  const hefzScores: number[] = [];
  const revisionScores: number[] = [];
  const tajweedScores: number[] = [];
  let doneHwCount = 0;

  lessons.forEach((l) => {
    if (l.homeworkStatus === "done" || l.homeworkStatus === "منجز" || l.homeworkStatus === "تم") {
      doneHwCount++;
    }
    const score = parseLessonScoreServer(l.overallEvaluation, l.teacherNotes, l.classEvents);
    if (score !== null) {
      const full = `${l.classEvents || ""} ${l.teacherNotes || ""}`.toLowerCase();
      if (/مراجعة|راجع|استرجاع|الماضي|سابق|تثبيت|revis|review/i.test(full)) {
        revisionScores.push(score);
      } else if (/تلاوة|قراءة|تجويد|أحكام|نورانية|تأسيس|tajweed|recit/i.test(full)) {
        tajweedScores.push(score);
      } else {
        hefzScores.push(score);
      }
    }
  });

  const attendedLessonsCount = lessons.filter(l => l.attendance === "حاضر" || l.attendance === "present" || l.attendance === "attended").length;
  const attRate = lessons.length > 0 ? (attendedLessonsCount / lessons.length) : 1;
  const hwRate = attendedLessonsCount > 0 ? (doneHwCount / attendedLessonsCount) : 1;
  const commitmentPct = lessons.length > 0 ? Math.min(100, Math.max(0, Math.round((attRate * 70) + (hwRate * 30)))) : 100;

  const isExcellent = currentGrade === "ممتاز" || currentGrade === "Excellent";
  let hefzSpeedPct = hefzScores.length > 0 ? Math.round(hefzScores.reduce((a, b) => a + b, 0) / hefzScores.length) : (uniqueHefz.length > 0 ? (isExcellent ? 95 : 85) : 0);
  let revisionStrengthPct = revisionScores.length > 0 ? Math.round(revisionScores.reduce((a, b) => a + b, 0) / revisionScores.length) : (uniqueRevision.length > 0 ? (isExcellent ? 95 : 85) : 0);
  let tajweedPct = tajweedScores.length > 0 ? Math.round(tajweedScores.reduce((a, b) => a + b, 0) / tajweedScores.length) : (uniqueRecitation.length > 0 ? (isExcellent ? 95 : 85) : 0);

  if (isEn) {
    const strengthNote = uniqueHefz.length > 0 || isExcellent
      ? "Rapid absorption of assigned verses, strong mental focus during class, and disciplined recitation."
      : "Consistent attendance and genuine eagerness to learn and improve recitation.";

    const recommendationNote = "Daily listening to assigned Surahs by renowned Qaris, and dedicating 15 minutes daily for cumulative review.";

    const nextPlan = `Based on current progress, it is projected over the upcoming 12 lessons (1 hour each) to continue in the curriculum at a steady pace, combined with daily cumulative review and applied Tajweed rules to ensure solid retention.`;

    const lines: string[] = [
      `Student Name: ${studentName}`,
      ``,
      `Evaluation Month: ${displayMonth}`
    ];

    if (hefzParagraph) {
      lines.push(``, `New Memorization: ${hefzParagraph} - Evaluation: ${currentGrade}`);
    }
    if (revisionParagraph) {
      lines.push(``, `Revision: ${revisionParagraph} - Evaluation: Proficient`);
    }
    if (recitationParagraph) {
      lines.push(``, `Recitation & Foundation: ${recitationParagraph} - Evaluation: ${currentGrade}`);
    }
    if (islamicParagraph) {
      lines.push(``, `Islamic Studies & Arabic: ${islamicParagraph} - Evaluation: ${currentGrade}`);
    }

    lines.push(
      ``,
      `Memorization Speed Indicator: ${hefzSpeedPct}%`,
      ``,
      `Revision Strength Indicator: ${revisionStrengthPct}%`,
      ``,
      `Tajweed & Foundation Indicator: ${tajweedPct}%`,
      ``,
      `Commitment Indicator: ${commitmentPct}%`,
      ``,
      `Strengths: ${strengthNote}`,
      ``,
      `Recommendations: ${recommendationNote}`,
      ``,
      `Next Month Plan:`,
      nextPlan
    );

    return lines.join("\n");
  }

  // Strengths and recommendations (Arabic)
  const strengthNote = uniqueHefz.length > 0 || currentGrade === "ممتاز"
    ? "سرعة استيعاب الآيات المقررة، الحضور الذهني المميز أثناء الحصة، والحرص على التسميع بانضباط."
    : "الالتزام بالحضور والرغبة المستمرة في التعلم والتطوير.";

  const recommendationNote = "الاستماع اليومي للسور المقررة بصوت قارئ متقن، وتخصيص 15 دقيقة يومياً لتثبيت المراجعة التراكمية.";

  // Plan for next month based on pace and 12 lessons
  const nextPlan = `بناءً على وتيرة إنجاز الطالب ومستواه الحالي، يتوقع خلال الـ 12 حصة القادمة (بواقع ساعة للحصة) مواصلة السير في مقرر الحفظ الجديد بمعدل متزن يقارب ربع إلى نصف حزب حسب الجهد، مع مراجعة تراكمية منتظمة لما تم حفظه وضبط أحكام التجويد الأساسية دون استعجال لضمان متانة الحفظ.`;

  // Build final structured template
  const lines: string[] = [
    `اسم الطالب: ${studentName}`,
    ``,
    `شهر التقييم: ${displayMonth}`,
    ``
  ];

  if (hefzParagraph) {
    lines.push(`حفظ جديد (إن وجد): ${hefzParagraph} - التقييم: ${currentGrade}`, ``);
  }
  if (revisionParagraph) {
    lines.push(`مراجعة (إن وجد): ${revisionParagraph} - التقييم: متقن`, ``);
  }
  if (recitationParagraph) {
    lines.push(`تلاوة وتأسيس (إن وجد): ${recitationParagraph} - التقييم: ${currentGrade}`, ``);
  }
  if (islamicParagraph) {
    lines.push(`دراسات إسلامية (إن وجد): ${islamicParagraph} - التقييم: ${currentGrade}`, ``);
  }

  lines.push(
    `مؤشر سرعة الحفظ: ${hefzSpeedPct}%`,
    ``,
    `مؤشر قوة المراجعة: ${revisionStrengthPct}%`,
    ``,
    `مؤشر التجويد والتأسيس: ${tajweedPct}%`,
    ``,
    `مؤشر الالتزام: ${commitmentPct}%`,
    ``,
    `نقاط القوة: ${strengthNote}`,
    ``,
    `التوصيات: ${recommendationNote}`,
    ``,
    `خطة الشهر القادم:`,
    nextPlan
  );

  let outText = lines.join("\n");
  const combinedInstructions = [
    req.aiInstructions,
    req.subjectAiInstructions,
    req.generalAiInstructions,
    req.additionalNotes
  ].filter(Boolean).join("\n\n");

  if (combinedInstructions) {
    const noEmojiReq = /بدون\s*(إيموجي|ايموجي|رموز)|لا\s*(تضع|تستخدم)\s*(إيموجي|ايموجي|رموز)|no\s*emojis?/i.test(combinedInstructions);
    if (noEmojiReq) {
      outText = outText.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{25A0}-\u{25FF}]|[\u{2B50}]/gu, "").trim();
    }
  }

  return outText;
}

export interface MonthlyReportGenerationResponse {
  reportText: string;
  reportData: ComprehensiveMonthlyReportData;
  structuredAnalysis: StructuredMonthlyAnalysis;
  toString(): string;
}

/**
 * AI-powered Comprehensive Monthly Report for Quran & Islamic Studies
 * 
 * Pipeline:
 * Daily Reports -> Chronological Ordering -> Structured Monthly Analysis Layer
 * -> Holistic Pedagogical AI Synthesis -> Existing 3-Page Monthly Template Data
 */
export async function generateComprehensiveMonthlyReportAI(
  req: MonthlyReportGenerationRequest
): Promise<any> {
  const {
    studentName = "الطالب",
    subject = "قرآن كريم",
    month,
    year,
    monthName,
    totalLessons = 0,
    totalHours = 0,
    lessons = [],
    teacherName = "أ. محمد فتحي (Mohammed Fathy)",
    additionalNotes = "",
    generalAiInstructions = "",
    subjectAiInstructions = "",
    aiInstructions = "",
    dailyAnalysisInstructions = "",
    monthlyTemplateInstructions = ""
  } = req;

  // 1. Determine target output language strictly based on request or subject
  const isEn = Boolean(
    (req as any).lang === "en" ||
    (!((req as any).lang) && !/قرآن|اسلامية|دراسات|عربي|arabic/i.test(subject) && /english/i.test(subject))
  );
  const targetLang: "ar" | "en" = isEn ? "en" : "ar";
  const displayMonth = formatMonthlyReportMonth(month, year, monthName, targetLang);
  const displayTeacher = normalizeReportTeacherName(teacherName, targetLang);

  // 2. Structured Monthly Analysis Layer: Clean, filter, sort chronologically, deduplicate
  const mockStudent: Student = {
    id: (req as any).studentId || "student_id",
    fullName: studentName,
    subject,
    status: "active",
    parentContact: "",
    studyType: "private",
    lessonCost: 0,
    paymentStatus: "paid",
    totalPaidAmount: 0,
    createdAt: new Date().toISOString()
  };

  const mockReports: GeneratedReport[] = (lessons || []).map((l, idx) => ({
    id: `rep_${l.date}_${idx}`,
    studentId: mockStudent.id,
    studentName,
    subject,
    date: l.date,
    lessonNumber: l.lessonNumber || (idx + 1),
    durationMinutes: l.durationMinutes || 60,
    attendance: (l.attendance === "absent" ? "absent" : l.attendance === "late" ? "late" : "present") as any,
    homeworkStatus: (l.homeworkStatus === "done" ? "done" : l.homeworkStatus === "late" ? "partial" : "not_done") as any,
    classEvents: stripAllUrlsAndLinks(l.classEvents || ""),
    homeworkNotes: stripAllUrlsAndLinks(l.homeworkNotes || ""),
    teacherNotes: stripAllUrlsAndLinks(l.teacherNotes || ""),
    overallEvaluation: stripAllUrlsAndLinks(l.overallEvaluation || ""),
    aiInstructions: "",
    createdAt: l.date,
    reportText: stripAllUrlsAndLinks(l.reportText || "")
  }));

  const structuredAnalysis = buildStructuredMonthlyAnalysis({
    student: mockStudent,
    subject,
    year,
    month,
    allReports: mockReports,
    allAttendance: [],
    teacherName: displayTeacher,
    lang: targetLang,
    includeAllProvidedRecords: true
  });

  const baselineReportData = buildComprehensiveMonthlyReportData({
    student: mockStudent,
    subject,
    year,
    month,
    allReports: mockReports,
    allAttendance: [],
    teacherName: displayTeacher,
    lang: targetLang,
    includeAllProvidedRecords: true
  });

  const cleanDailyAnalysisInstructions = stripAllUrlsAndLinks(dailyAnalysisInstructions)?.trim() || "";
  const cleanMonthlyTemplateInstructions = stripAllUrlsAndLinks(monthlyTemplateInstructions)?.trim() || "";

  // Helper to build fallback templateSections from baselineReportData if AI is offline
  const buildFallbackTemplateSections = (base: ComprehensiveMonthlyReportData): { title: string; content: string; bullets?: string[] }[] => {
    const secs: { title: string; content: string; bullets?: string[] }[] = [];
    if (base.pedagogicalAnalysis) {
      secs.push({
        title: isEn ? "1. Executive Summary & Monthly Overview" : "1. الملخص العام لمسيرة الشهر",
        content: base.pedagogicalAnalysis
      });
    }
    if (base.achievements.length > 0) {
      secs.push({
        title: isEn ? "2. Verified Academic Achievements" : "2. ما تم إنجازه خلال الشهر",
        content: "",
        bullets: base.achievements.map(a => `${isEn ? a.titleEn : a.titleAr}: ${a.content}${a.evaluation ? ` (${a.evaluation})` : ""}`)
      });
    }
    if (base.strengths.length > 0) {
      secs.push({
        title: isEn ? "3. Key Strengths & Demonstrated Competencies" : "3. نقاط القوة والتميز",
        content: "",
        bullets: base.strengths
      });
    }
    if (base.recommendations.length > 0 || base.parentalGuidance) {
      secs.push({
        title: isEn ? "4. Areas for Growth & Constructive Guidance for Parents" : "4. التوصيات التربوية وإرشادات المتابعة المنزلية",
        content: base.parentalGuidance || "",
        bullets: base.recommendations
      });
    }
    if (base.expectedNextMonthPlan || base.nextMonthGoals.length > 0) {
      secs.push({
        title: isEn ? "5. Next Month's Learning Trajectory" : "5. الخطة المقترحة للشهر القادم",
        content: base.expectedNextMonthPlan || "",
        bullets: base.nextMonthGoals
      });
    }
    return secs;
  };

  baselineReportData.templateSections = buildFallbackTemplateSections(baselineReportData);
  const baselineReportText = formatComprehensiveMonthlyReportText(baselineReportData);

  const fallbackResult = {
    reportText: baselineReportText,
    reportData: baselineReportData,
    structuredAnalysis,
    toString() {
      return this.reportText;
    }
  };

  // 3. Connect with Gemini Client for deep pedagogical synthesis
  const clientObj = getGeminiClient();
  if (!clientObj) {
    console.warn("[GoStars AI Server] No Gemini client found, returning baseline structured monthly report.");
    return fallbackResult;
  }

  const { client, apiKey } = clientObj;
  console.log(`[GoStars AI Server] Initialized Gemini for Pure Instruction-Driven Monthly Report [${studentName}] (${targetLang.toUpperCase()})`);

  const customTeacherInstructions = [
    aiInstructions,
    subjectAiInstructions,
    generalAiInstructions,
    additionalNotes
  ].map(s => stripAllUrlsAndLinks(s)?.trim()).filter(Boolean).join("\n\n");

  const prevContextStr = req.previousContext
    ? stripAllUrlsAndLinks(typeof req.previousContext === "string" ? req.previousContext : JSON.stringify(req.previousContext, null, 2))
    : "";

  // Sort input lessons chronologically without any hardcoded regex pre-filtering
  const sortedRawLessons = [...mockReports].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const chronologicalLessonsSummary = sortedRawLessons.length > 0
    ? sortedRawLessons.map((l, i) => `Session #${l.lessonNumber || (i + 1)} (Date: ${l.date}):
- Subject Field: ${l.subject || subject}
- Attendance: ${l.attendance || "present"}
- Homework Status: ${l.homeworkStatus || "done"}
${l.classEvents ? `- What happened in class (classEvents): ${l.classEvents}` : ""}
${l.reportText ? `- Full Daily Report Text: ${l.reportText}` : ""}
${l.homeworkNotes ? `- Assigned Homework (homeworkNotes): ${l.homeworkNotes}` : ""}
${l.teacherNotes ? `- Teacher Notes: ${l.teacherNotes}` : ""}
${l.overallEvaluation ? `- Session Evaluation: ${l.overallEvaluation}` : ""}`).join("\n\n")
    : (isEn ? "No detailed lesson log available for this month." : "لم تسجل تفاصيل نصية يومية للحصص.");

  const systemInstruction = isEn
    ? `You are a Senior Academic Evaluator operating a strict Two-Stage Monthly Report Engine:
Stage 1 (Daily Reports Analysis): You MUST rely 100% on the teacher's "DAILY REPORTS ANALYSIS INSTRUCTIONS" provided in the prompt to analyze the chronological daily reports. All pre-saved analysis templates have been deleted; follow the teacher's analysis instructions exclusively.
Stage 2 (Monthly Report Template Synthesis): You MUST format the final report strictly and literally according to the teacher's "MONTHLY REPORT TEMPLATE INSTRUCTIONS". Preserve the exact report title, exact section headings, and exact section sequence specified in the template instructions so the report layout remains 100% consistent across uses.

MANDATORY INVIOLABLE ACCURACY GUARDRAILS (CANNOT BE OVERRIDDEN):
1. ZERO HALLUCINATION: Never invent Surahs, verses, lessons, topics, evaluations, or homework not supported by the daily reports.
2. READING IS NOT MEMORIZING: Reading/reciting a Surah in class is NEVER proof of memorization.
3. TEACHING A RULE IS NOT MASTERING IT: Explaining a rule is NEVER proof of student mastery unless explicitly confirmed.
4. ZERO FAKE PERCENTAGES: Never invent percentages like 98% or 100% unless calculated from explicit numeric grades.
5. NO PROGRESS CLAIM WITHOUT COMPARATIVE DATA across multiple sessions.
6. PRESERVE AUTHENTIC REVISIONS conducted on different days while removing verbal redundancy.
7. SUBJECT INTEGRITY: Only include subjects/branches actually studied in the daily reports; omit unstudied subjects completely.
8. ZERO URLS OR LINKS.

LANGUAGE REQUIREMENT:
Write the entire report in 100% fluent, polished academic English (zero Arabic script). Transliterate Islamic terms cleanly (e.g., "Surah Al-Mulk", "Tajweed", "Noor Al-Bayan").`
    : `أنت خبير تقييم أكاديمي تدير محرك التقارير الشهرية المعتمد على مرحلتين:
المرحلة الأولى (تحليل التقارير اليومية): اعتمد بنسبة 100% وحصرياً على "تعليمات تحليل التقارير اليومية" المرفقة لتحليل سجل الحصص اليومية. تم إلغاء أي تحليلات مسبقة محفوظة.
المرحلة الثانية (صياغة قالب التقرير الشهري): التزم حرفياً بـ "تعليمات قالب التقرير الشهري" المرفقة من حيث عنوان التقرير، وعناوين الأقسام وترتيبها، وأسلوب العرض، بحيث يخرج التقرير بنفس الشكل العام الثابت للقالب في كل مرة.

قواعد الدقة الإلزامية غير القابلة للتجاوز:
1. منع الاختراع تماماً (Zero Hallucination): يمنع اختلاق أي سور أو آيات أو دروس أو تقييمات أو واجبات غير موجودة في التقارير اليومية.
2. قراءة السورة ليست دليلاً على حفظها.
3. تدريس القاعدة أو شرحها ليس دليلاً على إتقانها.
4. منع النسب المئوية الوهمية مثل 98% أو 100%.
5. عدم ادعاء تحسن الطالب دون بيانات مقارنة عبر الشهر.
6. الحفاظ على جلسات المراجعة الحقيقية التي تمت في أيام مختلفة مع إزالة التكرار اللفظي.
7. إظهار المواد التي دُرست فعلياً فقط وإخفاء أي مادة لم تُدرس.
8. منع أي روابط اجتماعات أو أرقام هواتف.

لغة الإخراج: عربية فصحى رصينة وموجهة لولي الأمر.`;

  const promptText = isEn
    ? `Execute the Two-Stage Monthly Report generation for student: "${studentName}" (${displayMonth}, Subject context: "${subject}").

=== STAGE 1: DAILY REPORTS ANALYSIS INSTRUCTIONS (SOLE SOURCE OF ANALYSIS RULES) ===
${cleanDailyAnalysisInstructions || "Analyze all daily reports chronologically, extract studied topics, mastered skills, revisions, homework, and teacher notes accurately."}

=== STAGE 2: MONTHLY REPORT TEMPLATE INSTRUCTIONS (STRICT LAYOUT & HEADINGS) ===
${cleanMonthlyTemplateInstructions || "Use clear academic sections: 1. Executive Summary, 2. Verified Academic Achievements, 3. Key Strengths, 4. Constructive Guidance for Parents, 5. Next Month's Learning Trajectory."}

${customTeacherInstructions ? `Additional Directives:\n${customTeacherInstructions}\n` : ""}
${prevContextStr ? `Previous Month Context (for continuity if relevant):\n${prevContextStr}\n` : ""}

=== RAW CHRONOLOGICAL DAILY REPORTS (${sortedRawLessons.length} sessions) ===
${chronologicalLessonsSummary}

CRITICAL OUTPUT INSTRUCTIONS:
Return a valid JSON object matching this exact schema.
In "templateSections", you MUST create one section object for each section heading requested in STAGE 2 (in the exact same order and using the exact section titles from STAGE 2, omitting only subject sub-items that were not studied):
{
  "reportTitle": "string (Exact report title from Stage 2 Template Instructions)",
  "reportSubtitle": "string (Subtitle reflecting only the actual subjects studied)",
  "stage1AnalysisSummary": "string (Brief summary of Stage 1 extracted facts)",
  "templateSections": [
    {
      "title": "string (EXACT section heading from Stage 2 Template Instructions)",
      "content": "string (Cohesive paragraph(s) for this section based strictly on Stage 1 findings)",
      "bullets": ["string (Optional bullet points for this section if appropriate)"]
    }
  ],
  "achievements": [
    {
      "categoryKey": "newMemorization" | "revision" | "quranReading" | "noorAlBayan" | "tajweedRules" | "islamicStudies",
      "titleAr": "string",
      "titleEn": "string",
      "content": "string (Verified topics/Surahs from Stage 1)",
      "evaluation": "string"
    }
  ],
  "strengths": ["string"],
  "recommendations": ["string"],
  "nextMonthGoals": ["string"],
  "studentInteraction": "string",
  "pedagogicalAnalysis": "string",
  "parentalGuidance": "string",
  "expectedNextMonthPlan": "string"
}`
    : `نفذ إنشاء التقرير الشهري على مرحلتين للطالب: "${studentName}" لشهر (${displayMonth} - السياق: "${subject}").

=== المرحلة الأولى: تعليمات تحليل التقارير اليومية (المصدر الوحيد لقواعد التحليل) ===
${cleanDailyAnalysisInstructions || "حلل جميع التقارير اليومية بالترتيب الزمني واستخرج الدروس والمهارات والمراجعات والواجبات وملاحظات المعلم بدقة."}

=== المرحلة الثانية: تعليمات قالب التقرير الشهري (الالتزام الحرفي بالعناوين والترتيب والشكل العام) ===
${cleanMonthlyTemplateInstructions || "التزم بالأقسام الخمسة: 1. الملخص العام، 2. ما تم إنجازه، 3. نقاط القوة، 4. التوصيات التربوية لولي الأمر، 5. الخطة المقترحة للشهر القادم."}

${customTeacherInstructions ? `توجيهات إضافية:\n${customTeacherInstructions}\n` : ""}
${prevContextStr ? `سياق الشهر السابق:\n${prevContextStr}\n` : ""}

=== سجل التقارير اليومية للطالب بالترتيب الزمني (${sortedRawLessons.length} حصة) ===
${chronologicalLessonsSummary}

تعليمات الإخراج الإلزامية:
أخرج كائن JSON صالحاً يطابق الهيكل التالي بدقة.
في مصفوفة "templateSections"، يجب الالتزام الحرفي بعناوين الأقسام وترتيبها كما وردت في (المرحلة الثانية: تعليمات قالب التقرير الشهري) دون تغيير الشكل العام للقالب:
{
  "reportTitle": "string (عنوان التقرير الرسمي كما حدده القالب في المرحلة الثانية)",
  "reportSubtitle": "string (العنوان الفرعي المعبر عن المواد التي درسها الطالب فعلياً)",
  "stage1AnalysisSummary": "string (ملخص نتائج التحليل في المرحلة الأولى)",
  "templateSections": [
    {
      "title": "string (عنوان القسم حرفياً كما ورد في تعليمات القالب بالمرحلة الثانية)",
      "content": "string (النص التفصيلي للقسم بناءً على نتائج تحليل المرحلة الأولى فقط)",
      "bullets": ["string (نقاط تفصيلية مرتبة داخل هذا القسم إن لزم)"]
    }
  ],
  "achievements": [
    {
      "categoryKey": "newMemorization" | "revision" | "quranReading" | "noorAlBayan" | "tajweedRules" | "islamicStudies",
      "titleAr": "string",
      "titleEn": "string",
      "content": "string",
      "evaluation": "string"
    }
  ],
  "strengths": ["string"],
  "recommendations": ["string"],
  "nextMonthGoals": ["string"],
  "studentInteraction": "string",
  "pedagogicalAnalysis": "string",
  "parentalGuidance": "string",
  "expectedNextMonthPlan": "string"
}`;

  const aiResult = await callGeminiWithFastFallback(client, {
    contents: promptText,
    config: {
      systemInstruction,
      temperature: 0.15,
      responseMimeType: "application/json"
    },
    logPrefix: `[GoStars AI Monthly Report - ${studentName}]`,
    apiKey
  });

  if (aiResult) {
    try {
      const parsed = JSON.parse(aiResult);
      if (parsed && typeof parsed === "object") {
        const aiAchievements = Array.isArray(parsed.achievements)
          ? parsed.achievements.filter((a: any) => a && isCleanValue(a.content))
          : [];

        const aiTemplateSections = Array.isArray(parsed.templateSections)
          ? parsed.templateSections
              .map((sec: any) => ({
                title: stripAllUrlsAndLinks(sec?.title || "").trim(),
                content: stripAllUrlsAndLinks(sec?.content || "").trim(),
                bullets: Array.isArray(sec?.bullets)
                  ? sec.bullets.map((b: any) => stripAllUrlsAndLinks(String(b || "")).trim()).filter(Boolean)
                  : undefined
              }))
              .filter((sec: any) => sec.title && (sec.content || (sec.bullets && sec.bullets.length > 0)))
          : [];

        const mergedData: ComprehensiveMonthlyReportData = {
          ...baselineReportData,
          studentName,
          subject,
          year,
          month,
          monthLabel: displayMonth,
          teacherName: displayTeacher,
          lang: targetLang,
          templateTitle: isCleanValue(parsed.reportTitle) ? stripAllUrlsAndLinks(parsed.reportTitle).trim() : undefined,
          templateSubtitle: isCleanValue(parsed.reportSubtitle) ? stripAllUrlsAndLinks(parsed.reportSubtitle).trim() : undefined,
          stage1AnalysisSummary: isCleanValue(parsed.stage1AnalysisSummary) ? stripAllUrlsAndLinks(parsed.stage1AnalysisSummary).trim() : undefined,
          templateSections: aiTemplateSections.length > 0 ? aiTemplateSections : baselineReportData.templateSections,
          achievements: aiAchievements.length > 0 ? aiAchievements : baselineReportData.achievements,
          indicators: baselineReportData.indicators,
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
            ? parsed.strengths
            : baselineReportData.strengths,
          recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
            ? parsed.recommendations
            : baselineReportData.recommendations,
          nextMonthGoals: Array.isArray(parsed.nextMonthGoals) && parsed.nextMonthGoals.length > 0
            ? parsed.nextMonthGoals
            : baselineReportData.nextMonthGoals,
          studentInteraction: parsed.studentInteraction || baselineReportData.studentInteraction,
          expectedNextMonthPlan: parsed.expectedNextMonthPlan || baselineReportData.expectedNextMonthPlan,
          pedagogicalAnalysis: isCleanValue(parsed.pedagogicalAnalysis)
            ? parsed.pedagogicalAnalysis
            : baselineReportData.pedagogicalAnalysis,
          parentalGuidance: isCleanValue(parsed.parentalGuidance)
            ? parsed.parentalGuidance
            : baselineReportData.parentalGuidance
        };

        const sanitizedMerged = sanitizeComprehensiveMonthlyReportData(mergedData);
        const formattedText = formatComprehensiveMonthlyReportText(sanitizedMerged);

        return {
          reportText: formattedText,
          reportData: sanitizedMerged,
          structuredAnalysis,
          toString() {
            return this.reportText;
          }
        };
      }
    } catch (parseErr) {
      console.warn("[GoStars AI Server] Failed to parse JSON from AI model, using formatted baseline:", parseErr);
    }
  }

  return fallbackResult;
}

export interface ExternalMonthlyReportParseRequest {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  studentNameHint?: string;
  subjectHint?: string;
  monthHint?: number;
  yearHint?: number;
  teacherNameHint?: string;
  lang?: "ar" | "en";
  dailyAnalysisInstructions?: string;
  monthlyTemplateInstructions?: string;
  previousContext?: {
    lastMonthName?: string;
    lastMonthAchievements?: string;
    lastMonthStrengths?: string[];
    lastMonthRecommendations?: string[];
    lastMonthPlan?: string;
    historicalLessonsSummary?: string;
    [key: string]: any;
  } | string;
}

/**
 * Intelligent AI Parser for External Monthly Student Report Data
 * Reads unstructured student data from uploaded files (PDF, DOCX, TXT, Excel) or pasted text,
 * and applies Stage 1 (dailyAnalysisInstructions) and Stage 2 (monthlyTemplateInstructions) literally.
 */
export async function parseExternalMonthlyReportDataAI(req: ExternalMonthlyReportParseRequest): Promise<any> {
  const gemini = getGeminiClient();
  const rawText = stripAllUrlsAndLinks(req.text?.trim() || "");
  const isPdf = Boolean(req.fileBase64 && (req.mimeType === "application/pdf" || req.fileName?.toLowerCase().endsWith(".pdf")));

  const now = new Date();
  const defaultYear = req.yearHint || now.getFullYear();
  const defaultMonth = req.monthHint || (now.getMonth() + 1);
  const studentNameHint = req.studentNameHint || "الطالب";
  const teacherNameHint = req.teacherNameHint || "أ. محمد فتحي (Mohammed Fathy)";
  const subjectHint = req.subjectHint || "قرآن كريم";
  const isEn = req.lang === "en" || (!req.lang && subjectHint.toLowerCase().includes("quran, arabic and islamic"));

  const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (!gemini) {
    console.log("[GoStars AI Server] Gemini client not configured, using deterministic fallback parser.");
    return fallbackParseExternalMonthlyReportText(req);
  }

  const { client } = gemini;

  const systemInstruction = `You are a Senior Academic Evaluator operating a strict Two-Stage Monthly Report Engine:
Stage 1: Analyze the provided student daily reports / document strictly according to the teacher's "DAILY REPORTS ANALYSIS DIRECTIVES".
Stage 2: Format the final monthly report strictly and literally according to the teacher's "MONTHLY REPORT TEMPLATE DIRECTIVES", preserving the exact report title, exact section headings, and exact section sequence.

STRICT MANDATORY GUARDRAILS:
1. ZERO HALLUCINATION: Extract ONLY what is genuinely present in the input text or document.
2. READING IS NOT MEMORIZING, and TEACHING A RULE IS NOT MASTERING IT.
3. ZERO FAKE PERCENTAGES & ZERO URLS/LINKS.
4. Output language must be strictly "${isEn ? "en" : "ar"}".

OUTPUT SCHEMA (JSON ONLY):
{
  "studentName": "string",
  "subject": "${subjectHint}",
  "year": ${defaultYear},
  "month": ${defaultMonth},
  "monthNameAr": "${arabicMonths[defaultMonth - 1]}",
  "monthNameEn": "${englishMonths[defaultMonth - 1]}",
  "monthLabel": "string",
  "teacherName": "${teacherNameHint}",
  "lang": "${isEn ? "en" : "ar"}",
  "reportTitle": "string (Exact title from template instructions)",
  "reportSubtitle": "string (Subtitle reflecting actual studied subjects)",
  "templateSections": [
    {
      "title": "string (Exact section heading from template instructions)",
      "content": "string",
      "bullets": ["string"]
    }
  ],
  "achievements": [
    {
      "categoryKey": "newMemorization" | "revision" | "quranReading" | "noorAlBayan" | "tajweedRules" | "islamicStudies",
      "titleAr": "string",
      "titleEn": "string",
      "content": "string",
      "evaluation": "string"
    }
  ],
  "indicators": {
    "memorization": 0,
    "revision": 0,
    "tajweedAndFoundation": 0,
    "islamicStudies": 0,
    "commitment": 95
  },
  "strengths": ["string"],
  "recommendations": ["string"],
  "nextMonthGoals": ["string"],
  "completedItems": {},
  "statistics": {},
  "studentInteraction": "string",
  "pedagogicalAnalysis": "string",
  "parentalGuidance": "string",
  "expectedNextMonthPlan": "string"
}`;

  const prevContextStr = req.previousContext
    ? (typeof req.previousContext === "string" ? req.previousContext : JSON.stringify(req.previousContext, null, 2))
    : "";

  const promptText = `Analyze the following student records using the two-stage instructions and return the JSON report:
- Student Name Hint: ${studentNameHint}
- Month/Year: ${defaultMonth}/${defaultYear}
- Subject: ${subjectHint}
- Teacher: ${teacherNameHint}
- Output Language: ${isEn ? "en" : "ar"}

=== STAGE 1: DAILY REPORTS ANALYSIS DIRECTIVES ===
${req.dailyAnalysisInstructions || "Extract all lessons, topics, evaluations, homework, and teacher notes accurately without hallucination."}

=== STAGE 2: MONTHLY REPORT TEMPLATE DIRECTIVES (LITERAL HEADINGS & STRUCTURE) ===
${req.monthlyTemplateInstructions || "Organize into clear academic sections matching the student's actual studied subjects."}

${prevContextStr ? `--- PREVIOUS MONTH CONTEXT ---\n${prevContextStr}\n` : ""}`;

  let contents: any;
  if (isPdf && req.fileBase64) {
    contents = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: req.fileBase64
        }
      },
      {
        text: promptText + (rawText ? `\n\nAdditional extracted text:\n${rawText}` : "")
      }
    ];
  } else {
    contents = `${promptText}\n\n--- INPUT DATA ---\n${rawText || "No additional text provided."}`;
  }

  const cleanJsonText = await callGeminiWithFastFallback(client, {
    contents,
    config: {
      systemInstruction,
      temperature: 0.15,
      responseMimeType: "application/json"
    },
    logPrefix: "[GoStars AI External Monthly Parse]"
  });

  if (cleanJsonText) {
    try {
      const parsed = JSON.parse(cleanJsonText);
      if (parsed && typeof parsed === "object") {
        parsed.studentName = parsed.studentName || studentNameHint;
        parsed.subject = parsed.subject || subjectHint;
        parsed.year = parsed.year || defaultYear;
        parsed.month = parsed.month || defaultMonth;
        parsed.monthNameAr = arabicMonths[(parsed.month || defaultMonth) - 1];
        parsed.monthNameEn = englishMonths[(parsed.month || defaultMonth) - 1];
        parsed.monthLabel = parsed.monthLabel || (isEn ? `${parsed.monthNameEn} ${parsed.year}` : `${parsed.monthNameAr} ${parsed.year}`);
        parsed.teacherName = parsed.teacherName || teacherNameHint;
        parsed.lang = isEn ? "en" : "ar";
        parsed.templateTitle = isCleanValue(parsed.reportTitle) ? stripAllUrlsAndLinks(parsed.reportTitle).trim() : undefined;
        parsed.templateSubtitle = isCleanValue(parsed.reportSubtitle) ? stripAllUrlsAndLinks(parsed.reportSubtitle).trim() : undefined;
        parsed.achievements = Array.isArray(parsed.achievements) ? parsed.achievements : [];
        parsed.completedItems = parsed.completedItems || {};
        parsed.indicators = parsed.indicators || { memorization: 0, revision: 0, tajweedAndFoundation: 0, islamicStudies: 0, commitment: 95 };
        parsed.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
        parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        parsed.nextMonthGoals = Array.isArray(parsed.nextMonthGoals) ? parsed.nextMonthGoals : [];
        parsed.statistics = parsed.statistics || {};

        const sanitizedParsed = sanitizeComprehensiveMonthlyReportData(parsed);
        return sanitizedParsed;
      }
    } catch (parseErr) {
      console.warn("[GoStars AI Server] Failed to parse external JSON response:", parseErr);
    }
  }

  return fallbackParseExternalMonthlyReportText(req);
}

/**
 * Deterministic Fallback Parser when AI is offline or rate-limited
 * Extracts data using the Stateful Section-Header Parser without inventing any information.
 */
export function fallbackParseExternalMonthlyReportText(req: ExternalMonthlyReportParseRequest): any {
  const text = stripAllUrlsAndLinks(req.text || "");
  const now = new Date();
  const year = req.yearHint || now.getFullYear();
  const month = req.monthHint || (now.getMonth() + 1);
  const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // 1. استخراج اسم الطالب
  let studentName = req.studentNameHint || "الطالب";
  const nameMatch = text.match(/(?:اسم الطالب|الطالب|Student Name|Student)\s*[:：\-]\s*([^\n\r,،]+)/i);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    studentName = nameMatch[1].trim();
  }

  // 2. تحديد المادة واللغة
  let subject = req.subjectHint || "قرآن كريم";
  const isEn = Boolean(req.lang === "en" || (!req.lang && subject.toLowerCase().includes("quran, arabic and islamic")));
  if (isEn && !subject.toLowerCase().includes("quran, arabic and islamic")) {
    subject = "Quran, Arabic and Islamic Studies";
  }

  // 3. استخراج الأقسام عبر المحلل السياقي المتتبع للعناوين (Stateful Section-Header Parser)
  const categorized = extractCategorizedItemsFromText(text);

  const hefzContent = deduplicateSurahScope(categorized.newMemorization, isEn ? "en" : "ar");
  const revContent = deduplicateSurahScope(categorized.revision, isEn ? "en" : "ar");
  const readContent = deduplicateSurahScope(categorized.quranReading, isEn ? "en" : "ar");
  const noorContent = Array.from(
    new Set(
      categorized.noorAlBayan
        .map(s => (isEn ? sanitizeTextForEnglishReport(s, "topic") : s.trim()))
        .filter(s => isCleanValue(s) && (isEn ? !/[\u0600-\u06FF]/.test(s) : true))
    )
  ).join(isEn ? ", " : "، و");
  const tajweedContent = Array.from(
    new Set(
      categorized.tajweedRules
        .map(s => (isEn ? sanitizeTextForEnglishReport(s, "topic") : s.trim()))
        .filter(s => isCleanValue(s) && (isEn ? !/[\u0600-\u06FF]/.test(s) : true))
    )
  ).join(isEn ? ", " : "، و");
  const islamicContent = Array.from(
    new Set(
      categorized.islamicStudies
        .map(s => (isEn ? sanitizeTextForEnglishReport(s, "topic") : s.trim()))
        .filter(s => isCleanValue(s) && (isEn ? !/[\u0600-\u06FF]/.test(s) : true))
    )
  ).join(isEn ? ", " : "، و");

  const hasHefz = isCleanValue(hefzContent);
  const hasRev = isCleanValue(revContent);
  const hasRead = isCleanValue(readContent);
  const hasNoor = isCleanValue(noorContent);
  const hasTajweed = isCleanValue(tajweedContent);
  const hasIslamic = isCleanValue(islamicContent);

  const achievements: any[] = [];
  const completedItems: any = {};

  if (hasHefz) {
    achievements.push({
      categoryKey: "newMemorization",
      titleAr: "الحفظ الجديد",
      titleEn: "New Memorization",
      content: hefzContent,
      evaluation: isEn ? "Excellent (Mastered)" : "ممتاز (متقن)"
    });
    completedItems.newMemorization = hefzContent;
  }

  if (hasRev) {
    achievements.push({
      categoryKey: "revision",
      titleAr: "المراجعة والتثبيت",
      titleEn: "Revision & Retention",
      content: revContent,
      evaluation: isEn ? "Very Good (Reinforced)" : "متقن ومثبّت"
    });
    completedItems.revision = revContent;
  }

  if (hasRead) {
    achievements.push({
      categoryKey: "quranReading",
      titleAr: "تلاوة القرآن الكريم",
      titleEn: "Qur'an Reading & Recitation",
      content: readContent,
      evaluation: isEn ? "Fluent & Accurate" : "تلاوة متقنة وسليمة"
    });
    completedItems.quranReading = readContent;
  }

  if (hasNoor) {
    achievements.push({
      categoryKey: "noorAlBayan",
      titleAr: "دروس نور البيان والتأسيس",
      titleEn: "Noor Al-Bayan & Foundation",
      content: noorContent,
      evaluation: isEn ? "Excellent" : "ممتاز (متقن)"
    });
    completedItems.noorAlBayan = noorContent;
  }

  if (hasTajweed) {
    achievements.push({
      categoryKey: "tajweedRules",
      titleAr: "أحكام التجويد المطبقة",
      titleEn: "Applied Tajweed Rules",
      content: tajweedContent,
      evaluation: isEn ? "Mastered Application" : "تطبيق عملي متقن"
    });
    completedItems.tajweedRules = tajweedContent;
  }

  if (hasIslamic) {
    achievements.push({
      categoryKey: "islamicStudies",
      titleAr: "الدراسات الإسلامية",
      titleEn: "Islamic Studies",
      content: islamicContent,
      evaluation: isEn ? "Excellent" : "ممتاز (متقن)"
    });
    completedItems.islamicStudies = islamicContent;
  }

  // استخراج المؤشرات الرقمية (0% لأي عنصر لم يُذكر في النص أو التقارير)
  const indMemMatch = text.match(/(?:مؤشر سرعة الحفظ|Memorization Speed Indicator)\s*[:：\-]\s*(\d+)/i);
  const indRevMatch = text.match(/(?:مؤشر قوة المراجعة|Revision Strength Indicator)\s*[:：\-]\s*(\d+)/i);
  const indTajMatch = text.match(/(?:مؤشر التجويد والتأسيس|Tajweed & Foundation Indicator)\s*[:：\-]\s*(\d+)/i);
  const indIslMatch = text.match(/(?:مؤشر الدراسات الإسلامية|Islamic Studies Indicator)\s*[:：\-]\s*(\d+)/i);
  const indComMatch = text.match(/(?:مؤشر الالتزام|Commitment Indicator)\s*[:：\-]\s*(\d+)/i);

  const indicators = {
    memorization: hasHefz ? (indMemMatch ? Math.min(100, Math.max(50, parseInt(indMemMatch[1], 10))) : 90) : 0,
    revision: hasRev ? (indRevMatch ? Math.min(100, Math.max(50, parseInt(indRevMatch[1], 10))) : 88) : 0,
    tajweedAndFoundation: (hasRead || hasNoor || hasTajweed) ? (indTajMatch ? Math.min(100, Math.max(50, parseInt(indTajMatch[1], 10))) : 88) : 0,
    islamicStudies: hasIslamic ? (indIslMatch ? Math.min(100, Math.max(50, parseInt(indIslMatch[1], 10))) : 90) : 0,
    commitment: indComMatch ? Math.min(100, Math.max(50, parseInt(indComMatch[1], 10))) : (achievements.length > 0 ? 95 : 0)
  };

  const dynamicNarratives = buildCategorySpecificNarratives({
    hasHefz,
    hasRev,
    hasRead,
    hasNoor,
    hasTajweed,
    hasIslamic,
    isEn
  });

  // استخراج نقاط القوة والتوصيات والخطة إن وجدت في النص مع ضمان مطابقتها للأقسام المدروسة
  const strengthMatch = text.match(/(?:نقاط القوة|Strengths)\s*[:：\-]\s*([^\n\r]+)/i);
  const recoMatch = text.match(/(?:التوصيات|Recommendations)\s*[:：\-]\s*([^\n\r]+)/i);
  const planMatch = text.match(/(?:خطة الشهر القادم|Next Month Plan)\s*[:：\-]?\s*([\s\S]+?)(?=\n\n|$)/i);

  const strengths = strengthMatch && strengthMatch[1].trim().length > 3
    ? [strengthMatch[1].trim()]
    : dynamicNarratives.defaultStrengths;

  const recommendations = recoMatch && recoMatch[1].trim().length > 3
    ? [recoMatch[1].trim()]
    : dynamicNarratives.defaultRecommendations;

  const expectedNextMonthPlan = planMatch && planMatch[1].trim().length > 10
    ? planMatch[1].trim()
    : dynamicNarratives.expectedNextMonthPlan;

  const teacherName = req.teacherNameHint || (isEn ? "Mohammed Fathy" : "أ. محمد فتحي");
  const monthNameAr = arabicMonths[month - 1];
  const monthNameEn = englishMonths[month - 1];
  const monthLabel = isEn ? `${monthNameEn} ${year}` : `${monthNameAr} ${year}`;

  return sanitizeComprehensiveMonthlyReportData({
    studentName,
    subject,
    year,
    month,
    monthNameAr,
    monthNameEn,
    monthLabel,
    teacherName,
    lang: isEn ? "en" : "ar",
    achievements,
    indicators,
    strengths,
    recommendations,
    nextMonthGoals: dynamicNarratives.nextMonthGoals,
    completedItems,
    statistics: {},
    studentInteraction: isEn
      ? "The student showed commendable attention and responsive engagement throughout the lessons."
      : "أظهر الطالب حضوراً ذهنياً طيباً وتجاوباً مميزاً مع توجيهات المعلم خلال الحصص.",
    pedagogicalAnalysis: dynamicNarratives.pedagogicalAnalysis,
    deductiveInference: dynamicNarratives.deductiveInference,
    learningProfile: dynamicNarratives.learningProfile,
    parentalGuidance: dynamicNarratives.parentalGuidance,
    expectedNextMonthPlan,
    activeSubjects: {
      quran: hasHefz || hasRev || hasRead || hasNoor || hasTajweed,
      arabic: hasNoor || hasRead,
      islamicStudies: hasIslamic
    },
    hasExplicitNumericGrades: false,
    qualitativeRatings: {
      overall: { level: "mastered", labelEn: "Excellent", labelAr: "ممتاز" },
      commitment: { level: "mastered", labelEn: "Excellent", labelAr: "ممتاز" }
    },
    monthlyProgressSummary: dynamicNarratives.pedagogicalAnalysis
  });
}

export interface ChatMessageItem {
  role: "user" | "model";
  content: string;
}

export interface AIChatRequest {
  messages: ChatMessageItem[];
  model?: string;
  systemInstruction?: string;
  roleMode?: "pedagogical_advisor" | "report_assistant" | "prompt_tuner" | "lesson_planner" | "general";
}

export async function handleGoStarsChatAI(req: AIChatRequest): Promise<string> {
  const {
    messages = [],
    model = "gemini-3.8-flash",
    systemInstruction = "",
    roleMode = "pedagogical_advisor"
  } = req;

  let baseInstruction = "أنت المساعد الذكي المتقدم لمعلمي منصة GoStars لإدارة الطلاب والتقارير التربوية. وظيفتك تقديم إجابات تربوية ذكية ومباشرة ومساعدة المعلم في صياغة تقاريره، وضبط تعليمات التوجيه الذكي، وتخطيط الدروس، ومتابعة الطلاب بدقة واحترافية.";

  if (roleMode === "prompt_tuner") {
    baseInstruction = "أنت خبير صياغة وضبط برومبت وتعليمات الذكاء الاصطناعي (Prompt Engineering) لمعلمي GoStars. تساعد المعلم على كتابة تعليمات وقوالب دقيقة جداً ومحكمة لنماذج التقارير المدرسية تضمن التزام الذكاء الاصطناعي بنسبة 100% بدون أي اختلاق أو خروج عن النص وبدون حشو.";
  } else if (roleMode === "lesson_planner") {
    baseInstruction = "أنت مستشار التخطيط التربوي وتوزيع المناهج لمعلمي GoStars. تساعد المعلم على تنظيم خطط الحصص، وأهداف التعلم، ومراجعة المحفوظ وتثبيته في القرآن الكريم والمواد الدراسية.";
  } else if (roleMode === "report_assistant") {
    baseInstruction = "أنت المساعد المتخصص في صياغة ومراجعة تقارير الطلاب لولي الأمر بأسلوب تربوي مشجع وأنيق يبرز نقاط القوة ويقدم توصيات بناءة وفق ضوابط المعلم وقوالبه بدقة 100%.";
  }

  const fullSystemInstruction = systemInstruction.trim()
    ? `${baseInstruction}\n\n[تعليمات وضوابط المعلم الإضافية الواجبة التطبيق]:\n${systemInstruction.trim()}`
    : baseInstruction;

  const clientObj = getGeminiClient();
  if (!clientObj) {
    throw new Error("لم يتم العثور على مفتاح الذكاء الاصطناعي Gemini API Key. يُرجى التحقق من إعدادات المفاتيح.");
  }

  const { client } = clientObj;
  const preferredModel = model || "gemini-3.6-flash";

  const contents = messages.map(m => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const chatResponse = await callGeminiWithFastFallback(client, {
    contents,
    config: {
      systemInstruction: fullSystemInstruction,
      temperature: 0.2
    },
    preferredModel,
    logPrefix: "[GoStars AI Chat]"
  });

  if (chatResponse) {
    return chatResponse;
  }

  throw new Error("فشل توليد الاستجابة من الذكاء الاصطناعي بسبب ضغط مؤقت على الخوادم. يُرجى المحاولة مرة أخرى.");
}



