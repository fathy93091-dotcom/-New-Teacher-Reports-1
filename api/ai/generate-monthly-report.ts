import "dotenv/config";
import { generateComprehensiveMonthlyReportAI } from "../../server/ai";

async function getRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") {
      if (Buffer.isBuffer(req.body)) {
        try {
          return JSON.parse(req.body.toString("utf-8"));
        } catch {
          return {};
        }
      }
      return req.body;
    }
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  if (req.readableEnded || req.complete) {
    return {};
  }

  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    }, 2500);

    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", (e: any) => {
      clearTimeout(timer);
      console.warn("[GoStars Serverless] Error reading monthly request stream:", e?.message);
      resolve({});
    });
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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Gemini-Key, X-Api-Key"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const body = await getRequestBody(req);
    const aiResult = await generateComprehensiveMonthlyReportAI(body);
    const reportText = typeof aiResult === "string" ? aiResult : (aiResult?.reportText || "");
    const reportData = aiResult && typeof aiResult === "object" && aiResult.reportData ? aiResult.reportData : null;
    const structuredAnalysis = aiResult && typeof aiResult === "object" && aiResult.structuredAnalysis ? aiResult.structuredAnalysis : null;

    return sendResponse(res, 200, { success: true, reportText, reportData, structuredAnalysis });
  } catch (err: any) {
    console.error("[GoStars Serverless] Error generating comprehensive monthly report:", err);
    return sendResponse(res, 500, {
      error: "Failed to generate comprehensive monthly report",
      details: err?.message || String(err)
    });
  }
}
