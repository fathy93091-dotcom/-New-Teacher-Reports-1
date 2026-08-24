import "dotenv/config";
import express from "express";
import { generateGoStarsReportAI, generateGoStarsGroupReportAI } from "./ai";

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

// Global Express Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});


