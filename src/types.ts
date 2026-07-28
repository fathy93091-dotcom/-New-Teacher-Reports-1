/**
 * Daily Islamic Teacher Assistant (DITA)
 * Type Definitions according to SRS v1.0
 */

export type SubjectName = 
  | "Holy Qur'an"
  | "Tajweed"
  | "Arabic Language"
  | "Islamic Studies"
  | "English Language";

export type Gender = "Male" | "Female";

export type StudentStatus = "Active" | "Archived";

export interface ParentInfo {
  name: string;
  contact: string;
  email?: string;
  preferredLanguage?: "English" | "Arabic";
}

export interface Student {
  id: string;
  teacherId: string;
  fullName: string;
  preferredName?: string;
  gender: Gender;
  dateOfBirth?: string;
  age: number;
  nationality: string;
  country: string;
  timeZone: string;
  parentName: string;
  parentContact: string;
  currentLevel: string;
  subjects: SubjectName[];
  status: StudentStatus;
  notes?: string;
  createdAt: string;
  lastActiveDate?: string;
}

export type HomeworkStatus = "Completed" | "Partially Completed" | "Not Completed";

export interface HomeworkItem {
  id: string;
  subject: SubjectName;
  task: string;
  category: "Memorization" | "Reading" | "Writing" | "Listening" | "Speaking" | "Revision" | "Research" | "Practice Exercises";
  status: HomeworkStatus;
  dueDate?: string;
  teacherComment?: string;
}

export interface StudentPerformance {
  participation: number; // 1-5
  focus: number; // 1-5
  understanding: number; // 1-5
  memorization?: number; // 1-5
  pronunciation?: number; // 1-5
  reading?: number; // 1-5
  writing?: number; // 1-5
  speaking?: number; // 1-5
  confidence: number; // 1-5
  behavior: number; // 1-5
  writtenObservations?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: "PDF" | "DOC" | "DOCX" | "PPT" | "PPTX" | "TXT" | "PNG" | "JPG" | "MP3" | "WAV" | "MP4";
  fileSize: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface SubjectSessionRecord {
  subject: SubjectName;
  teacherNotes: string;
  homework: HomeworkItem[];
  performance: StudentPerformance;
  mistakes: string[];
  achievements: string[];
  attachments: Attachment[];
  customAiInstructions?: string;
}

export interface Session {
  id: string;
  sessionNumber: number;
  studentId: string;
  teacherId: string;
  date: string;
  time: string;
  durationMinutes: number;
  subjectRecords: SubjectSessionRecord[];
  status: "completed" | "in_progress" | "cancelled";
  reportStatus: "none" | "draft" | "pending_approval" | "approved";
  reportId?: string;
  createdAt: string;
}

export interface DailyReportSection {
  subject: SubjectName;
  summary: string;
  lessonsStudied: string[];
  surahsRecited?: string[];
  grammarOrTopics?: string[];
  vocabularyOrRules?: string[];
  performanceNotes: string;
  homework: string[];
}

export interface MemoryUpdateSuggestion {
  id: string;
  type: "strength" | "areaForImprovement" | "recurringMistake" | "teacherNote";
  subject?: SubjectName;
  text: string;
  status: "pending" | "approved" | "edited" | "rejected";
}

export interface DailyReport {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  reportType: "daily";
  title: string;
  date: string;
  sessionNumber: number;
  durationMinutes: number;
  subjectsCovered: DailyReportSection[];
  overallPerformanceSummary: string;
  homeworkSummary: HomeworkItem[];
  teacherRemarks: string;
  closingMessage: string;
  contentEnglish: string;
  contentArabic?: string;
  suggestedMemoryUpdates?: MemoryUpdateSuggestion[];
  isApproved: boolean;
  isDraft: boolean;
  createdAt: string;
  lastModified: string;
}

export interface MonthlyReport {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  month: string;
  year: number;
  reportType: "monthly";
  title: string;
  overallProgress: string;
  totalSessionsCompleted: number;
  attendanceDays: number;
  homeworkCompletionRate: number; // Percentage
  learningDevelopment: string;
  strengths: string[];
  areasForImprovement: string[];
  teacherRecommendations: string;
  closingMessage: string;
  contentEnglish: string;
  contentArabic?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface EducationalMemoryRecord {
  id: string;
  date: string;
  sessionId: string;
  sessionNumber: number;
  summary: string;
  subjects: SubjectName[];
  keyAchievements: string[];
  areasToFocus: string[];
}

export interface StudentMemory {
  id: string;
  studentId: string;
  educationalHistory: EducationalMemoryRecord[];
  homeworkHistory: HomeworkItem[];
  strengths: string[];
  areasForImprovement: string[];
  recurringMistakes: string[];
  teacherNotes: string[];
  progressSummary: string;
  lastUpdated: string;
}

export interface AIRule {
  id: string;
  category: "general" | "subject" | "tone" | "language";
  name: string;
  instruction: string;
  subject?: SubjectName;
  isActive: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "daily" | "monthly" | "memorization" | "tajweed_focus" | "custom";
  structure: {
    headerFormat: string;
    sectionsOrder: string[];
    placeholders: string[];
    promptInstructions: string;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface AppSettings {
  preferredLanguage: "en" | "ar";
  reportStyle: "detailed" | "bulleted" | "concise";
  defaultClosingMessage: string;
  writingTone: "encouraging" | "formal" | "academic";
  aiRules: AIRule[];
  selectedTemplateId?: string;
  templates?: ReportTemplate[];
  notificationPreferences: {
    upcomingSessions: boolean;
    pendingReports: boolean;
    incompleteHomework: boolean;
  };
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  title: string; // e.g. "Ustadh / Qur'an Teacher"
  avatarUrl?: string;
  createdAt: string;
  lastLogin: string;
}

export interface UnitTestResult {
  id: string;
  name: string;
  module: string;
  passed: boolean;
  message: string;
  expected: string;
  actual: string;
  durationMs: number;
}

export interface ApiDocEndpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  summary: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  requestBodySample?: any;
  responseSample: any;
}
