import "dotenv/config";
import { generateGoStarsReportAI } from "../../server/ai";

async function getRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (typeof req.body === "object") {
      return req.body;
    }
  }

  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendResponse(res: any, status: number, payload: any) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(payload);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendResponse(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    console.log("[GoStars Serverless] /api/ai/generate-report request received. Method:", req.method);
    const body = await getRequestBody(req);
    console.log("[GoStars Serverless] Parsed body for single report:", {
      studentName: body?.studentName,
      subject: body?.subject,
      hasTeacherNotes: !!body?.teacherNotes,
      hasAttachment: !!body?.attachment
    });
    const reportText = await generateGoStarsReportAI(body);
    console.log("[GoStars Serverless] Report generated successfully. Returning 200 OK. Text length:", reportText.length);
    sendResponse(res, 200, { success: true, reportText });
  } catch (err: any) {
    const errorDetails = err?.message || String(err);
    console.error("[GoStars Serverless] Error in single AI report handler:", errorDetails);
    sendResponse(res, 500, {
      error: "فشل إنشاء التقرير بواسطة الذكاء الاصطناعي",
      details: errorDetails
    });
  }
}
