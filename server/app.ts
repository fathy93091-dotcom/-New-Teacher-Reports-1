import express from "express";
import { generateGoStarsReportAI } from "./ai";

export const app = express();

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "GoStars – Teacher Management System",
    timestamp: new Date().toISOString()
  });
});

// AI Report Generation endpoint
app.post("/api/ai/generate-report", async (req, res) => {
  try {
    const reportText = await generateGoStarsReportAI(req.body);
    res.json({ success: true, reportText });
  } catch (err: any) {
    console.error("Error in AI report route:", err);
    res.status(500).json({ error: "Failed to generate report", details: err.message });
  }
});

// Global Express Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err?.message || "Internal Server Error" });
});
