import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import { generateDailyReportAI, generateMonthlyReportAI, enhanceTeacherNotes } from "./server/ai";
import { runDitaUnitTests } from "./server/unitTests";
import { ditaApiDocumentation } from "./server/apiDocs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", appName: "Daily Islamic Teacher Assistant (DITA)", timestamp: new Date().toISOString() });
  });

  // Auth / Teacher Profile
  app.get("/api/auth/me", (_req, res) => {
    res.json(db.getUser());
  });

  app.put("/api/auth/profile", (req, res) => {
    const updated = db.updateUser(req.body);
    res.json(updated);
  });

  // Students
  app.get("/api/students", (req, res) => {
    const includeArchived = req.query.includeArchived === "true";
    res.json(db.getStudents(includeArchived));
  });

  app.get("/api/students/:id", (req, res) => {
    const student = db.getStudentById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  });

  app.post("/api/students", (req, res) => {
    try {
      const student = db.createStudent(req.body);
      res.status(201).json(student);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create student" });
    }
  });

  app.put("/api/students/:id", (req, res) => {
    const updated = db.updateStudent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json(updated);
  });

  app.put("/api/students/:id/archive", (req, res) => {
    const updated = db.archiveStudent(req.params.id);
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json(updated);
  });

  app.put("/api/students/:id/restore", (req, res) => {
    const updated = db.restoreStudent(req.params.id);
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json(updated);
  });

  // Sessions
  app.get("/api/sessions", (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    res.json(db.getSessions(studentId));
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = db.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  });

  app.post("/api/sessions", (req, res) => {
    try {
      const session = db.createSession(req.body);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create session" });
    }
  });

  // Reports
  app.get("/api/reports", (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    res.json(db.getReports(studentId));
  });

  app.get("/api/reports/daily", (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    res.json(db.getReports(studentId));
  });

  app.get("/api/reports/:id", (req, res) => {
    const report = db.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  });

  app.post("/api/reports/daily/generate", async (req, res) => {
    try {
      const { sessionId, targetLanguage } = req.body;
      const session = db.getSessionById(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const student = db.getStudentById(session.studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const user = db.getUser();
      const activeAiRules = db.getAIRules().filter(r => r.isActive);
      const studentMemory = db.getStudentMemory(student.id);

      const generatedReport = await generateDailyReportAI({
        session,
        student,
        teacherName: user.fullName,
        activeAiRules,
        studentMemory,
        targetLanguage
      });

      res.json(generatedReport);
    } catch (err: any) {
      console.error("Error generating daily report:", err);
      res.status(500).json({ error: "Failed to generate report", details: err.message });
    }
  });

  app.post("/api/reports/daily/save", (req, res) => {
    try {
      const savedReport = db.saveReport(req.body);
      res.json(savedReport);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to save report" });
    }
  });

  app.delete("/api/reports/:id", (req, res) => {
    const deleted = db.deleteReport(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true });
  });

  // Monthly Reports
  app.get("/api/reports/monthly", (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    res.json(db.getMonthlyReports(studentId));
  });

  app.post("/api/reports/monthly/generate", async (req, res) => {
    try {
      const { studentId, month, year, targetLanguage } = req.body;
      const student = db.getStudentById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const user = db.getUser();
      const approvedReports = db.getReports(studentId).filter(r => r.isApproved);
      const activeAiRules = db.getAIRules().filter(r => r.isActive);

      const monthlyReport = await generateMonthlyReportAI({
        student,
        teacherName: user.fullName,
        month: month || "July",
        year: year || 2026,
        approvedReports,
        activeAiRules,
        targetLanguage
      });

      db.saveMonthlyReport(monthlyReport);
      res.json(monthlyReport);
    } catch (err: any) {
      console.error("Error generating monthly report:", err);
      res.status(500).json({ error: "Failed to generate monthly report", details: err.message });
    }
  });

  // AI Notes Enhancement
  app.post("/api/ai/enhance-notes", async (req, res) => {
    try {
      const { notes, subject } = req.body;
      const enhanced = await enhanceTeacherNotes(notes || "", subject || "General");
      res.json({ enhancedNotes: enhanced });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to enhance notes", details: err.message });
    }
  });

  // Student Memory
  app.get("/api/memory/:studentId", (req, res) => {
    const memory = db.getStudentMemory(req.params.studentId);
    res.json(memory);
  });

  app.put("/api/memory/:studentId", (req, res) => {
    const updated = db.updateStudentMemory(req.params.studentId, req.body);
    res.json(updated);
  });

  // Settings & AI Rules
  app.get("/api/settings", (_req, res) => {
    res.json(db.getSettings());
  });

  app.put("/api/settings", (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  app.post("/api/settings/ai-rules", (req, res) => {
    const newRule = db.addAIRule(req.body);
    res.status(201).json(newRule);
  });

  app.put("/api/settings/ai-rules/:id", (req, res) => {
    const updated = db.updateAIRule(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "AI Rule not found" });
    res.json(updated);
  });

  app.delete("/api/settings/ai-rules/:id", (req, res) => {
    const success = db.deleteAIRule(req.params.id);
    if (!success) return res.status(404).json({ error: "AI Rule not found" });
    res.json({ success: true });
  });

  // Interactive API Documentation Endpoint
  app.get("/api/docs", (_req, res) => {
    res.json(ditaApiDocumentation);
  });

  // Unit Test Runner Endpoint
  app.all("/api/tests/run", async (_req, res) => {
    try {
      const testSummary = await runDitaUnitTests();
      res.json(testSummary);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to run unit tests", details: err.message });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DITA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
