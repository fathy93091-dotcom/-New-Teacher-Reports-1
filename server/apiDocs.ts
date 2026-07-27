import { ApiDocEndpoint } from "../src/types";

export const ditaApiDocumentation: {
  info: { title: string; version: string; description: string; author: string };
  endpoints: ApiDocEndpoint[];
} = {
  info: {
    title: "Daily Islamic Teacher Assistant (DITA) API",
    version: "1.0.0",
    description: "REST API specifications for managing student profiles, teaching sessions, AI report generation, student educational memory, AI rules, and unit tests.",
    author: "Mohammed Fathy"
  },
  endpoints: [
    {
      path: "/api/auth/me",
      method: "GET",
      summary: "Get Authenticated Teacher Profile",
      description: "Retrieves the currently authenticated teacher profile and preferences.",
      responseSample: {
        id: "teacher_001",
        fullName: "Mohammed Fathy",
        email: "mohammed.fathy@example.com",
        title: "Senior Qur'an & Islamic Studies Teacher",
        createdAt: "2026-01-10T08:00:00Z"
      }
    },
    {
      path: "/api/students",
      method: "GET",
      summary: "List Students",
      description: "Returns list of student profiles for the teacher. Supports optional `includeArchived=true` query parameter.",
      parameters: [
        { name: "includeArchived", type: "boolean", required: false, description: "Whether to include archived students." }
      ],
      responseSample: [
        {
          id: "std_001",
          fullName: "Abdullah Ahmed",
          gender: "Male",
          age: 11,
          nationality: "Egyptian",
          country: "United Arab Emirates",
          subjects: ["Holy Qur'an", "Tajweed", "Islamic Studies"],
          status: "Active"
        }
      ]
    },
    {
      path: "/api/students",
      method: "POST",
      summary: "Create Student Profile",
      description: "Registers a new student profile in the system.",
      requestBodySample: {
        fullName: "Zainab Ali",
        gender: "Female",
        age: 9,
        nationality: "Saudi",
        country: "Saudi Arabia",
        timeZone: "Asia/Riyadh",
        parentName: "Ali Hassan",
        parentContact: "+966 50 111 2233",
        currentLevel: "Juz 30 Recitation",
        subjects: ["Holy Qur'an", "Arabic Language"]
      },
      responseSample: {
        id: "std_1722000000000",
        fullName: "Zainab Ali",
        status: "Active",
        createdAt: "2026-07-27T10:00:00Z"
      }
    },
    {
      path: "/api/students/:id/archive",
      method: "PUT",
      summary: "Archive Student Profile",
      description: "Archives a student profile without deleting historical records.",
      responseSample: { id: "std_001", status: "Archived" }
    },
    {
      path: "/api/sessions",
      method: "GET",
      summary: "List Teaching Sessions",
      description: "Fetches recorded teaching sessions. Filterable by `studentId`.",
      parameters: [
        { name: "studentId", type: "string", required: false, description: "Filter sessions for specific student ID." }
      ],
      responseSample: [
        {
          id: "ses_101",
          sessionNumber: 24,
          studentId: "std_001",
          date: "2026-07-26",
          durationMinutes: 45,
          subjectRecords: [
            { subject: "Holy Qur'an", teacherNotes: "Recited Surah Al-Mulk verses 1-15" }
          ]
        }
      ]
    },
    {
      path: "/api/sessions",
      method: "POST",
      summary: "Create Teaching Session",
      description: "Records a new teaching session with multi-subject support.",
      requestBodySample: {
        sessionNumber: 25,
        studentId: "std_001",
        date: "2026-07-27",
        time: "10:00 AM",
        durationMinutes: 45,
        subjectRecords: [
          {
            subject: "Holy Qur'an",
            teacherNotes: "Recited Surah Al-Mulk verses 16-30",
            performance: { participation: 5, focus: 5, understanding: 5 },
            homework: [{ task: "Revise Surah Al-Mulk", category: "Revision", status: "Completed" }]
          }
        ]
      },
      responseSample: { id: "ses_102", status: "completed", reportStatus: "none" }
    },
    {
      path: "/api/reports/daily/generate",
      method: "POST",
      summary: "Generate AI Daily Report",
      description: "Calls Gemini AI engine (`gemini-3.6-flash`) using server-side SDK to synthesize structured daily reports adhering to active AI rules.",
      requestBodySample: {
        sessionId: "ses_101",
        studentId: "std_001",
        targetLanguage: "en"
      },
      responseSample: {
        id: "rep_201",
        title: "Daily Educational Report - Session #24",
        subjectsCovered: [
          { subject: "Holy Qur'an", summary: "Recited Surah Al-Mulk 1-15 with excellent Tajweed." }
        ],
        contentEnglish: "Dear Parent...",
        isApproved: false,
        isDraft: true
      }
    },
    {
      path: "/api/reports/daily/save",
      method: "POST",
      summary: "Save or Approve Daily Report",
      description: "Saves a draft report or approves it (`isApproved=true`). Approving automatically updates Student Memory.",
      requestBodySample: {
        id: "rep_201",
        sessionId: "ses_101",
        studentId: "std_001",
        isApproved: true,
        contentEnglish: "Approved final report text"
      },
      responseSample: { id: "rep_201", isApproved: true, lastModified: "2026-07-27T10:05:00Z" }
    },
    {
      path: "/api/reports/monthly/generate",
      method: "POST",
      summary: "Generate AI Monthly Report",
      description: "Synthesizes monthly progress reports exclusively from approved daily reports.",
      requestBodySample: {
        studentId: "std_001",
        month: "July",
        year: 2026
      },
      responseSample: {
        id: "mrep_301",
        month: "July",
        overallProgress: "Completed 8 sessions with 95% homework completion.",
        isApproved: true
      }
    },
    {
      path: "/api/memory/:studentId",
      method: "GET",
      summary: "Get Student Memory Record",
      description: "Retrieves complete educational history, homework logs, strengths, and areas for improvement for a student.",
      responseSample: {
        studentId: "std_001",
        educationalHistory: [{ date: "2026-07-26", summary: "Recited Surah Al-Mulk" }],
        strengths: ["Strong Tajweed pronunciation"],
        areasForImprovement: ["Daily revision consistency"]
      }
    },
    {
      path: "/api/settings",
      method: "GET",
      summary: "Get Application Settings & AI Rules",
      description: "Fetches user preferences and active permanent AI rules.",
      responseSample: {
        preferredLanguage: "en",
        reportStyle: "detailed",
        aiRules: [
          { id: "rule_01", name: "Accuracy Priority", instruction: "Never invent unrecorded facts", isActive: true }
        ]
      }
    },
    {
      path: "/api/tests/run",
      method: "POST",
      summary: "Execute System Unit Tests",
      description: "Triggers execution of the comprehensive backend unit test suite.",
      responseSample: {
        passedCount: 7,
        failedCount: 0,
        totalDurationMs: 45,
        results: [
          { id: "STD-001", module: "Student Management", name: "REQ-STD-001", passed: true }
        ]
      }
    }
  ]
};
