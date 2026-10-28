import JSZip from "jszip";
import * as XLSX from "xlsx";

export interface ProcessedAttachmentResult {
  hasInlineData: boolean;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  extractedTextDescription?: string;
}

/**
 * Clean base64 string
 */
function extractRawBase64(data: string): string {
  if (data.includes("base64,")) {
    return data.split("base64,")[1];
  }
  return data;
}

/**
 * Extract text from PowerPoint .pptx presentation
 */
async function extractPptxText(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles: { name: string; num: number; file: any }[] = [];

    zip.forEach((relativePath, file) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideFiles.push({
          name: relativePath,
          num: parseInt(match[1], 10),
          file
        });
      }
    });

    slideFiles.sort((a, b) => a.num - b.num);

    if (slideFiles.length === 0) {
      return `ملف عرض تقديمي (${fileName}) - لم يتم العثور على شرائح نصية بداخل العرض.`;
    }

    const slidesContent: string[] = [];

    for (const slide of slideFiles) {
      const xml = await slide.file.async("text");
      // Extract all text inside <a:t>...</a:t>
      const textMatches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
      const texts = textMatches
        .map((m: string) => m.replace(/<[^>]+>/g, "").trim())
        .filter((t: string) => t.length > 0);

      if (texts.length > 0) {
        slidesContent.push(`📍 [الشريحة ${slide.num}]:\n${texts.join("\n")}`);
      } else {
        slidesContent.push(`📍 [الشريحة ${slide.num}]: (شريحة تحتوي على رسومات أو وسائط بدون نصوص)`);
      }
    }

    return `📊 [محتوى عرض تقديمي PowerPoint (${fileName}) - إجمالي ${slideFiles.length} شريحة]:\n\n${slidesContent.join("\n\n")}`;
  } catch (err: any) {
    console.warn(`[AttachmentProcessor] Failed to parse PPTX (${fileName}):`, err?.message);
    return `عرض تقديمي PowerPoint (${fileName}): تعذر فك النصوص البرمجية للشريحة، يرجى الاستناد لعنوان الملف وملاحظات المعلم.`;
  }
}

/**
 * Extract text from Word .docx document
 */
async function extractDocxText(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) {
      return `مستند Word (${fileName}) - لم يتم العثور على ملف المحتوى document.xml.`;
    }

    const xml = await docFile.async("text");
    // Extract paragraphs <w:p>...</w:p>
    const paragraphMatches = xml.match(/<w:p[^>]*>.*?<\/w:p>/g) || [];
    const paragraphs: string[] = [];

    for (const pXml of paragraphMatches) {
      const textMatches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      const pText = textMatches
        .map((m: string) => m.replace(/<[^>]+>/g, ""))
        .join("")
        .trim();
      if (pText.length > 0) {
        paragraphs.push(pText);
      }
    }

    if (paragraphs.length === 0) {
      // Fallback: extract any <w:t>
      const textMatches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      const allText = textMatches
        .map((m: string) => m.replace(/<[^>]+>/g, "").trim())
        .filter(t => t.length > 0)
        .join(" ");
      if (allText) paragraphs.push(allText);
    }

    return `📝 [محتوى مستند Word (${fileName})]:\n\n${paragraphs.join("\n\n")}`;
  } catch (err: any) {
    console.warn(`[AttachmentProcessor] Failed to parse DOCX (${fileName}):`, err?.message);
    return `مستند Word (${fileName}): تعذر قراءة النصوص الداخلية.`;
  }
}

/**
 * Extract tables and content from Excel (.xlsx, .xls, .csv, .ods)
 */
function extractExcelText(buffer: Buffer, fileName: string): string {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetOutputs: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Convert sheet to CSV format for clean structured table representation
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv && csv.trim().length > 0) {
        sheetOutputs.push(`📑 ورقة العمل: [${sheetName}]\n--------------------------------\n${csv.trim()}`);
      }
    }

    if (sheetOutputs.length === 0) {
      return `ملف Excel جدول بيانات (${fileName}): أوراق العمل فارغة أو لا تحتوي على بيانات نصية.`;
    }

    return `📊 [محتوى ملف Excel / جداول البيانات (${fileName})]:\n\n${sheetOutputs.join("\n\n================================\n\n")}`;
  } catch (err: any) {
    console.warn(`[AttachmentProcessor] Failed to parse Excel (${fileName}):`, err?.message);
    return `ملف جدول بيانات Excel (${fileName}): تعذر تحويل الجداول إلى نصوص.`;
  }
}

/**
 * Main attachment processor for GoStars AI Engine
 */
export async function processGoStarsAttachment(attachment: {
  fileName?: string;
  mimeType: string;
  data: string;
}): Promise<ProcessedAttachmentResult> {
  const fileName = (attachment.fileName || "ملف_مرفق").trim();
  const lowerName = fileName.toLowerCase();
  const rawMime = (attachment.mimeType || "").toLowerCase().trim();
  const rawBase64 = extractRawBase64(attachment.data);

  // 1. Native Image types (Supported directly by Gemini Vision)
  const isImage =
    rawMime.startsWith("image/") ||
    lowerName.match(/\.(png|jpe?g|webp|gif|heic|heif|bmp|tiff?)$/i);

  if (isImage) {
    // Standardize mime type for Gemini
    let geminiMime = rawMime.startsWith("image/") ? rawMime : "image/jpeg";
    if (lowerName.endsWith(".png")) geminiMime = "image/png";
    else if (lowerName.endsWith(".webp")) geminiMime = "image/webp";
    else if (lowerName.endsWith(".gif")) geminiMime = "image/gif";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) geminiMime = "image/jpeg";

    return {
      hasInlineData: true,
      inlineData: {
        mimeType: geminiMime,
        data: rawBase64
      },
      extractedTextDescription: `📎 [مرفق صورة (${fileName})]: صورة مرفقة مع التقرير، تم تمريرها لمحرك الذكاء الاصطناعي البصري لتحليل محتواها التعليمي ودرجات أو إجابات الطالب أو ورقة العمل بدقة.`
    };
  }

  // 2. PDF Documents (Supported directly by Gemini Document Vision)
  const isPdf =
    rawMime === "application/pdf" ||
    lowerName.endsWith(".pdf");

  if (isPdf) {
    return {
      hasInlineData: true,
      inlineData: {
        mimeType: "application/pdf",
        data: rawBase64
      },
      extractedTextDescription: `📎 [مرفق مستند PDF (${fileName})]: مستند PDF رسمي مرفق بالحصة، تم تمريره لمحرك الذكاء الاصطناعي لفحص محتواه وتضمين نتائجه وتكليفاته في التقرير.`
    };
  }

  // 3. Audio recordings (Supported by Gemini)
  const isAudio =
    rawMime.startsWith("audio/") ||
    lowerName.match(/\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i);

  if (isAudio) {
    let audioMime = rawMime.startsWith("audio/") ? rawMime : "audio/mp3";
    if (lowerName.endsWith(".wav")) audioMime = "audio/wav";
    else if (lowerName.endsWith(".m4a")) audioMime = "audio/m4a";
    else if (lowerName.endsWith(".ogg")) audioMime = "audio/ogg";

    return {
      hasInlineData: true,
      inlineData: {
        mimeType: audioMime,
        data: rawBase64
      },
      extractedTextDescription: `🎙️ [مرفق تسجيل صوتي (${fileName})]: تسجيل صوتي للحصة، تم تمريره لمحرك الذكاء الاصطناعي للاستماع لملاحظات المعلم وتضمينها بالتقرير.`
    };
  }

  // 4. Excel Spreadsheets (.xlsx, .xls, .csv, .tsv, .ods)
  const isExcel =
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".tsv") ||
    lowerName.endsWith(".ods") ||
    rawMime.includes("spreadsheet") ||
    rawMime.includes("excel") ||
    rawMime.includes("csv");

  if (isExcel) {
    const buffer = Buffer.from(rawBase64, "base64");
    const extractedExcel = extractExcelText(buffer, fileName);
    return {
      hasInlineData: false,
      extractedTextDescription: `📎 [مرفق ملف إكسل / جداول بيانات Excel (${fileName})]:\n${extractedExcel}`
    };
  }

  // 5. PowerPoint Presentations (.pptx, .ppt)
  const isPowerPoint =
    lowerName.endsWith(".pptx") ||
    lowerName.endsWith(".ppt") ||
    rawMime.includes("presentation") ||
    rawMime.includes("powerpoint");

  if (isPowerPoint) {
    const buffer = Buffer.from(rawBase64, "base64");
    const extractedPptx = await extractPptxText(buffer, fileName);
    return {
      hasInlineData: false,
      extractedTextDescription: `📎 [مرفق عرض تقديمي PowerPoint (${fileName})]:\n${extractedPptx}`
    };
  }

  // 6. Word Documents (.docx, .doc)
  const isWord =
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    rawMime.includes("wordprocessingml") ||
    rawMime.includes("msword");

  if (isWord) {
    const buffer = Buffer.from(rawBase64, "base64");
    const extractedDocx = await extractDocxText(buffer, fileName);
    return {
      hasInlineData: false,
      extractedTextDescription: `📎 [مرفق مستند Word (${fileName})]:\n${extractedDocx}`
    };
  }

  // 7. Plain text / Markdown / JSON / XML / Code
  const isText =
    rawMime.startsWith("text/") ||
    lowerName.match(/\.(txt|md|markdown|json|xml|html|htm|py|js|ts|css|rtf|log)$/i);

  if (isText) {
    try {
      const buffer = Buffer.from(rawBase64, "base64");
      const textContent = buffer.toString("utf-8");
      return {
        hasInlineData: false,
        extractedTextDescription: `📎 [مرفق ملف نصي (${fileName})]:\n"""\n${textContent}\n"""`
      };
    } catch {
      // Fallback below
    }
  }

  // 8. Any other file type (Generic fallback)
  // Decode as UTF-8 if printable, otherwise provide description
  try {
    const buffer = Buffer.from(rawBase64, "base64");
    // Check if buffer contains largely printable characters
    const sample = buffer.subarray(0, Math.min(buffer.length, 2048));
    let printableCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const code = sample[i];
      if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || code > 127) {
        printableCount++;
      }
    }

    if (sample.length > 0 && printableCount / sample.length > 0.8) {
      const textContent = buffer.toString("utf-8");
      return {
        hasInlineData: false,
        extractedTextDescription: `📎 [مرفق ملف (${fileName}) - نوع: ${rawMime || "ملف"}]:\n"""\n${textContent}\n"""`
      };
    }
  } catch (err) {
    console.warn(`[AttachmentProcessor] Generic text conversion error for ${fileName}:`, err);
  }

  return {
    hasInlineData: false,
    extractedTextDescription: `📎 [مرفق ملف تعليمي (${fileName}) - نوع الملف: ${rawMime || "ملف بيانات"}]: تم إرفاق هذا الملف لدعم تقرير الحصة والواجب.`
  };
}
