/**
 * GoStars - Monthly Report External File Parser
 * 
 * يستخرج البيانات النصية والملفات بصيغ (PDF, DOCX, TXT, XLSX, CSV)
 * لإرسالها لمحرك التحليل الذكي دون المساس بأي بيانات.
 */

import * as XLSX from "xlsx";
import mammoth from "mammoth";

export interface ParsedFileResult {
  fileName: string;
  fileType: "pdf" | "docx" | "xlsx" | "csv" | "txt" | "unknown";
  extractedText: string;
  base64Data?: string;
  mimeType?: string;
}

export async function parseUploadedStudentFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();

  // 1. ملفات TXT
  if (lowerName.endsWith(".txt")) {
    const text = await file.text();
    return {
      fileName,
      fileType: "txt",
      extractedText: text,
      mimeType: "text/plain"
    };
  }

  // 2. ملفات CSV
  if (lowerName.endsWith(".csv")) {
    const text = await file.text();
    return {
      fileName,
      fileType: "csv",
      extractedText: text,
      mimeType: "text/csv"
    };
  }

  // 3. ملفات Excel (.xlsx, .xls)
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const texts: string[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          texts.push(`[ورقة العمل: ${sheetName}]\n${csv}`);
        }
      });

      return {
        fileName,
        fileType: "xlsx",
        extractedText: texts.join("\n\n"),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    } catch (err) {
      console.warn("Error parsing excel file:", err);
      return {
        fileName,
        fileType: "xlsx",
        extractedText: "",
        mimeType: "application/octet-stream"
      };
    }
  }

  // 4. ملفات Word (.docx)
  if (lowerName.endsWith(".docx")) {
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return {
        fileName,
        fileType: "docx",
        extractedText: result.value || "",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      };
    } catch (err) {
      console.warn("Error parsing docx file:", err);
      return {
        fileName,
        fileType: "docx",
        extractedText: "",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      };
    }
  }

  // 5. ملفات PDF
  if (lowerName.endsWith(".pdf")) {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        // Strip data:application/pdf;base64, prefix if present
        const cleanBase64 = res.includes(",") ? res.split(",")[1] : res;
        resolve(cleanBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      fileName,
      fileType: "pdf",
      extractedText: "", // Sent via base64 directly to Gemini multimodal
      base64Data,
      mimeType: "application/pdf"
    };
  }

  // نوع غير معروف: حاول قراءة النص المباشر
  try {
    const rawText = await file.text();
    return {
      fileName,
      fileType: "unknown",
      extractedText: rawText,
      mimeType: file.type || "text/plain"
    };
  } catch {
    return {
      fileName,
      fileType: "unknown",
      extractedText: "",
      mimeType: file.type || "application/octet-stream"
    };
  }
}
