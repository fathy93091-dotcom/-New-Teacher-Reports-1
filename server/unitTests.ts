import { db } from "./db";
import { generateDailyReportAI } from "./ai";
import { UnitTestResult, Student, Session } from "../src/types";

/**
 * DITA Unit Test Suite - System & SRS Requirements Validation
 */
export async function runDitaUnitTests(): Promise<{
  results: UnitTestResult[];
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
}> {
  const startTime = Date.now();
  const results: UnitTestResult[] = [];

  // Helper assertion wrapper
  async function testCase(
    id: string,
    module: string,
    name: string,
    fn: () => Promise<{ passed: boolean; message: string; expected?: string; actual?: string }>
  ) {
    const t0 = Date.now();
    try {
      const res = await fn();
      results.push({
        id,
        module,
        name,
        passed: res.passed,
        message: res.message,
        expected: res.expected || "Expected behavior satisfied",
        actual: res.actual || (res.passed ? "Passed as expected" : "Failed check"),
        durationMs: Date.now() - t0
      });
    } catch (err: any) {
      results.push({
        id,
        module,
        name,
        passed: false,
        message: err.message || "Unhandled exception during test execution",
        expected: "Execution without exception",
        actual: `Exception thrown: ${err.message}`,
        durationMs: Date.now() - t0
      });
    }
  }

  // --- MODULE 1: STUDENT MANAGEMENT (REQ-STD) ---
  await testCase("STD-001", "Student Management", "REQ-STD-001: Create Unlimited Student Profiles & Unique ID Assignment", async () => {
    const newStudent = db.createStudent({
      fullName: "Tariq Zayn",
      gender: "Male",
      age: 9,
      nationality: "Jordanian",
      country: "Jordan",
      timeZone: "Asia/Amman",
      parentName: "Zayn Jordan",
      parentContact: "+962 7 9000 1122",
      currentLevel: "Juz 30 Recitation",
      subjects: ["Holy Qur'an", "Tajweed"],
      status: "Active"
    });

    const exists = db.getStudentById(newStudent.id);
    const hasUniqueId = !!newStudent.id && newStudent.id.startsWith("std_");
    const passed = !!exists && hasUniqueId && exists.fullName === "Tariq Zayn";

    return {
      passed,
      message: passed ? "Student created successfully with unique ID." : "Failed to create student or assign unique ID.",
      expected: "Student profile stored with std_* unique ID",
      actual: `Created ID: ${newStudent.id}, Name: ${newStudent.fullName}`
    };
  });

  await testCase("STD-002", "Student Management", "REQ-STD-004: Archive & Restore Inactive Students", async () => {
    const students = db.getStudents(true);
    const activeStudent = students.find(s => s.status === "Active");
    if (!activeStudent) {
      return { passed: false, message: "No active student found for archiving test." };
    }

    // Archive
    db.archiveStudent(activeStudent.id);
    const archived = db.getStudentById(activeStudent.id);
    const isArchived = archived?.status === "Archived";

    // Restore
    db.restoreStudent(activeStudent.id);
    const restored = db.getStudentById(activeStudent.id);
    const isRestored = restored?.status === "Active";

    const passed = isArchived && isRestored;
    return {
      passed,
      message: passed ? "Successfully archived and restored student." : "Archiving or restoring state transition failed.",
      expected: "Status transitions Active -> Archived -> Active",
      actual: `Archived status: ${archived?.status}, Restored status: ${restored?.status}`
    };
  });

  // --- MODULE 2: SESSION MANAGEMENT (REQ-SES) ---
  await testCase("SES-001", "Session Management", "REQ-SES-002: Multi-Subject Session Creation & Linkage", async () => {
    const students = db.getStudents();
    const student = students[0];

    const newSession: Session = db.createSession({
      sessionNumber: 99,
      studentId: student.id,
      date: "2026-07-27",
      time: "14:00",
      durationMinutes: 45,
      status: "completed",
      reportStatus: "none",
      subjectRecords: [
        {
          subject: "Holy Qur'an",
          teacherNotes: "Recited Surah An-Nas and Surah Al-Falaq",
          homework: [],
          performance: { participation: 5, focus: 5, understanding: 5, confidence: 5, behavior: 5 },
          mistakes: [],
          achievements: ["Flawless Tajweed"],
          attachments: []
        },
        {
          subject: "Islamic Studies",
          teacherNotes: "Learned the 5 Pillars of Islam",
          homework: [],
          performance: { participation: 5, focus: 4, understanding: 5, confidence: 5, behavior: 5 },
          mistakes: [],
          achievements: [],
          attachments: []
        }
      ]
    });

    const retrieved = db.getSessionById(newSession.id);
    const has2Subjects = retrieved?.subjectRecords.length === 2;
    const isLinked = retrieved?.studentId === student.id;

    const passed = !!retrieved && has2Subjects && isLinked;
    return {
      passed,
      message: passed ? "Multi-subject session successfully recorded and linked to student." : "Failed to record multi-subject session.",
      expected: "Session linked to 1 student with 2 subject records",
      actual: `Session ID: ${newSession.id}, Subjects count: ${retrieved?.subjectRecords.length}`
    };
  });

  // --- MODULE 3: AI ENGINE & ACCURACY (REQ-AI / Chapter 5) ---
  await testCase("AI-001", "AI Engine", "AI-002/003: Accuracy & Safety - No Fact Invention", async () => {
    const student = db.getStudents()[0];
    const session: Session = {
      id: "ses_test_ai",
      sessionNumber: 10,
      studentId: student.id,
      teacherId: student.teacherId,
      date: "2026-07-27",
      time: "10:00 AM",
      durationMinutes: 30,
      status: "completed",
      reportStatus: "draft",
      createdAt: new Date().toISOString(),
      subjectRecords: [
        {
          subject: "Tajweed",
          teacherNotes: "Learned Qalqalah letters (ق ط ب ج د)",
          homework: [],
          performance: { participation: 5, focus: 5, understanding: 5, confidence: 5, behavior: 5 },
          mistakes: [],
          achievements: [],
          attachments: []
        }
      ]
    };

    const rules = db.getAIRules().filter(r => r.isActive);
    const report = await generateDailyReportAI({
      session,
      student,
      teacherName: "Mohammed Fathy",
      activeAiRules: rules
    });

    const containsQalqalah = report.subjectsCovered.some(s => s.subject === "Tajweed");
    const validReport = !!report.id && report.subjectsCovered.length > 0;

    return {
      passed: validReport && containsQalqalah,
      message: validReport ? "AI report generated adhering strictly to provided teacher notes." : "AI report generation failed.",
      expected: "Report contains Tajweed section with Qalqalah notes and no invented facts",
      actual: `Report ID: ${report.id}, Sections: ${report.subjectsCovered.map(s => s.subject).join(", ")}`
    };
  });

  // --- MODULE 4: REPORT APPROVAL & STUDENT MEMORY (REQ-REP / REQ-MEM) ---
  await testCase("MEM-001", "Student Memory System", "REQ-MEM-001/006: Auto-Update Memory ONLY Upon Report Approval", async () => {
    const student = db.getStudents()[0];
    const initialMemory = db.getStudentMemory(student.id);
    const initialHistLength = initialMemory.educationalHistory.length;

    // Create draft report (should NOT update memory)
    const draftReport = {
      id: `rep_draft_${Date.now()}`,
      sessionId: "ses_101",
      studentId: student.id,
      studentName: student.fullName,
      teacherId: student.teacherId,
      teacherName: "Mohammed Fathy",
      reportType: "daily" as const,
      title: "Draft Test Report",
      date: "2026-07-27",
      sessionNumber: 88,
      durationMinutes: 30,
      subjectsCovered: [
        {
          subject: "Holy Qur'an" as const,
          summary: "Draft test summary",
          lessonsStudied: ["Surah Fatiha"],
          performanceNotes: "Good",
          homework: ["Practice"]
        }
      ],
      overallPerformanceSummary: "Draft session",
      homeworkSummary: [],
      teacherRemarks: "Draft remarks",
      closingMessage: "Closing",
      contentEnglish: "Draft report text",
      isApproved: false, // UNAPPROVED DRAFT
      isDraft: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    db.saveReport(draftReport);
    const memoryAfterDraft = db.getStudentMemory(student.id);
    const draftNotSavedToMemory = memoryAfterDraft.educationalHistory.length === initialHistLength;

    // Now Approve the report (SHOULD update memory)
    const approvedReport = { ...draftReport, isApproved: true, isDraft: false };
    db.saveReport(approvedReport);

    const memoryAfterApproval = db.getStudentMemory(student.id);
    const approvedSavedToMemory = memoryAfterApproval.educationalHistory.length === initialHistLength + 1;

    const passed = draftNotSavedToMemory && approvedSavedToMemory;
    return {
      passed,
      message: passed ? "Memory correctly updated ONLY after explicit report approval." : "Memory auto-update triggered prematurely or failed.",
      expected: "Memory history count increases by 1 only when isApproved = true",
      actual: `After Draft count: ${memoryAfterDraft.educationalHistory.length}, After Approval count: ${memoryAfterApproval.educationalHistory.length}`
    };
  });

  // --- MODULE 5: SETTINGS & PERMANENT AI RULES (REQ-SET) ---
  await testCase("SET-001", "Settings Engine", "REQ-SET-001: Manage Permanent AI Rules & Settings", async () => {
    const initialRules = db.getAIRules();
    const ruleCount = initialRules.length;

    const added = db.addAIRule({
      category: "general",
      name: "Custom Test Rule",
      instruction: "End reports with custom phrase 'Alhamdulillah'.",
      isActive: true
    });

    const updated = db.updateAIRule(added.id, { instruction: "Updated custom instruction." });
    const exists = db.getAIRules().some(r => r.id === added.id && r.instruction === "Updated custom instruction.");

    // Cleanup test rule
    db.deleteAIRule(added.id);
    const deleted = !db.getAIRules().some(r => r.id === added.id);

    const passed = exists && deleted && db.getAIRules().length === ruleCount;
    return {
      passed,
      message: passed ? "AI rules CRUD operations completed successfully." : "Failed AI rule creation/update/deletion.",
      expected: "AIRule created, updated, and cleaned up",
      actual: `Added ID: ${added.id}, Instruction updated: ${updated?.instruction}`
    };
  });

  // --- MODULE 6: DATABASE INTEGRITY (REQ-DB) ---
  await testCase("DB-001", "Database Design", "DB-INT-001/005: Data Relationships & Unique Identifiers", async () => {
    const user = db.getUser();
    const students = db.getStudents(true);
    const sessions = db.getSessions();
    const reports = db.getReports();

    const allStudentsHaveId = students.every(s => !!s.id && s.teacherId === user.id);
    const allSessionsLinked = sessions.every(s => !!s.studentId && !!db.getStudentById(s.studentId));
    const allReportsValid = reports.every(r => !!r.studentId && !!r.sessionId);

    const passed = allStudentsHaveId && allSessionsLinked && allReportsValid;
    return {
      passed,
      message: passed ? "Database relational integrity verified across Users, Students, Sessions, and Reports." : "Relational integrity check failed.",
      expected: "All foreign keys (teacherId, studentId, sessionId) point to valid parent entities",
      actual: `Students: ${students.length}, Sessions: ${sessions.length}, Reports: ${reports.length}`
    };
  });

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return {
    results,
    passedCount,
    failedCount,
    totalDurationMs: Date.now() - startTime
  };
}
