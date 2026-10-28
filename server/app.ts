import "dotenv/config";
import express from "express";
import {
  generateGoStarsReportAI,
  generateGoStarsGroupReportAI,
  generateComprehensiveMonthlyReportAI,
  parseExternalMonthlyReportDataAI,
  fallbackParseExternalMonthlyReportText,
  handleGoStarsChatAI
} from "./ai";

export const app = express();

// CORS & Headers
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    appName: "GoStars – Teacher Management System",
    timestamp: new Date().toISOString()
  });
});

// Single Student AI Report Generation endpoint (supports /api/ai/generate-report and /ai/generate-report)
app.post(["/api/ai/generate-report", "/ai/generate-report", "/generate-report"], async (req, res) => {
  try {
    const reportText = await generateGoStarsReportAI(req.body);
    res.json({ success: true, reportText });
  } catch (err: any) {
    console.error("Error in AI report route:", err);
    res.status(500).json({ error: "Failed to generate report", details: err?.message || String(err) });
  }
});

// Group Follow-up AI Report Generation endpoint (supports /api/ai/generate-group-report and /ai/generate-group-report)
app.post(["/api/ai/generate-group-report", "/ai/generate-group-report", "/generate-group-report"], async (req, res) => {
  try {
    const reportText = await generateGoStarsGroupReportAI(req.body);
    res.json({ success: true, reportText });
  } catch (err: any) {
    console.error("Error in AI group report route:", err);
    res.status(500).json({ error: "Failed to generate group report", details: err?.message || String(err) });
  }
});

// Comprehensive Monthly Report AI Generation endpoint (supports /api/ai/generate-monthly-report and /ai/generate-monthly-report)
app.post(["/api/ai/generate-monthly-report", "/ai/generate-monthly-report", "/generate-monthly-report"], async (req, res) => {
  try {
    const aiResult = await generateComprehensiveMonthlyReportAI(req.body);
    const reportText = typeof aiResult === "string" ? aiResult : (aiResult?.reportText || "");
    let reportData: any = aiResult && typeof aiResult === "object" && aiResult.reportData ? aiResult.reportData : null;
    const structuredAnalysis: any = aiResult && typeof aiResult === "object" && aiResult.structuredAnalysis ? aiResult.structuredAnalysis : null;

    if (!reportData) {
      try {
        reportData = fallbackParseExternalMonthlyReportText({
          text: reportText,
          studentNameHint: req.body.studentName,
          subjectHint: req.body.subject,
          monthHint: req.body.month,
          yearHint: req.body.year,
          teacherNameHint: req.body.teacherName,
          lang: req.body.lang,
          previousContext: req.body.previousContext
        });
      } catch (parseErr) {
        console.log("[GoStars AI Server] Non-fatal parsing error for monthly report text:", parseErr);
      }
    }

    res.json({ success: true, reportText, reportData, structuredAnalysis });
  } catch (err: any) {
    console.error("Error in AI monthly report route:", err);
    res.status(500).json({ error: "Failed to generate comprehensive monthly report", details: err?.message || String(err) });
  }
});

// External Monthly Report Parser endpoint (supports file uploads / pasted text)
app.post(["/api/ai/parse-monthly-report-data", "/ai/parse-monthly-report-data", "/parse-monthly-report-data"], async (req, res) => {
  try {
    const reportData = await parseExternalMonthlyReportDataAI(req.body);
    res.json({ success: true, reportData });
  } catch (err: any) {
    console.log("[GoStars AI Server] Route error, using fallback parser:", err?.message || err);
    try {
      const fallbackData = fallbackParseExternalMonthlyReportText(req.body);
      res.json({ success: true, reportData: fallbackData });
    } catch (fallbackErr: any) {
      console.error("Error in fallback parser:", fallbackErr);
      res.status(500).json({ error: "Failed to parse external monthly report data", details: fallbackErr?.message || String(fallbackErr) });
    }
  }
});

// AI Multi-Turn Chatbot endpoint
app.post(["/api/ai/chat", "/ai/chat", "/chat"], async (req, res) => {
  try {
    const text = await handleGoStarsChatAI(req.body);
    res.json({ success: true, text });
  } catch (err: any) {
    console.error("Error in AI chat route:", err);
    res.status(500).json({ error: "Failed to generate chat response", details: err?.message || String(err) });
  }
});

// Global Express Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});


