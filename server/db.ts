import fs from "fs";
import path from "path";
import {
  UserProfile,
  Student,
  Session,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AppSettings,
  AIRule,
  HomeworkItem,
  EducationalMemoryRecord,
  SubjectName
} from "../src/types";

const DB_FILE_PATH = path.join(process.cwd(), "server_db_store.json");

// In-Memory Database Store seeded with realistic DITA records

export interface DBStore {
  user: UserProfile;
  students: Student[];
  sessions: Session[];
  reports: DailyReport[];
  monthlyReports: MonthlyReport[];
  memories: Record<string, StudentMemory>;
  settings: AppSettings;
}

const initialUser: UserProfile = {
  id: "teacher_001",
  fullName: "Mohammed Fathy",
  email: "mohammed.fathy@example.com",
  title: "Senior Qur'an & Islamic Studies Teacher",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  createdAt: "2026-01-10T08:00:00Z",
  lastLogin: new Date().toISOString(),
};

const initialStudents: Student[] = [
  {
    id: "std_001",
    teacherId: "teacher_001",
    fullName: "Abdullah Ahmed",
    preferredName: "Abdullah",
    gender: "Male",
    dateOfBirth: "2015-05-14",
    age: 11,
    nationality: "Egyptian",
    country: "United Arab Emirates",
    timeZone: "Asia/Dubai (GST +04:00)",
    parentName: "Ahmed Ali",
    parentContact: "+971 50 123 4567",
    currentLevel: "Intermediate Tajweed & Juz' 29",
    subjects: ["Holy Qur'an", "Tajweed", "Islamic Studies"],
    status: "Active",
    notes: "Attentive student. Prefers morning sessions. Making great progress in Makharij al-Huruf.",
    createdAt: "2026-02-01T10:00:00Z",
    lastActiveDate: "2026-07-26",
  },
  {
    id: "std_002",
    teacherId: "teacher_001",
    fullName: "Fatima Zahra",
    preferredName: "Fatima",
    gender: "Female",
    dateOfBirth: "2016-09-20",
    age: 10,
    nationality: "Saudi",
    country: "Saudi Arabia",
    timeZone: "Asia/Riyadh (AST +03:00)",
    parentName: "Tariq Zahra",
    parentContact: "+966 55 987 6543",
    currentLevel: "Advanced Qur'an & Arabic Grammar Level 2",
    subjects: ["Holy Qur'an", "Arabic Language", "Tajweed"],
    status: "Active",
    notes: "Memorized Surah Al-Mulk. Diligent in writing exercises.",
    createdAt: "2026-02-15T09:30:00Z",
    lastActiveDate: "2026-07-27",
  },
  {
    id: "std_003",
    teacherId: "teacher_001",
    fullName: "Yusuf Mansoor",
    preferredName: "Yusuf",
    gender: "Male",
    dateOfBirth: "2014-03-10",
    age: 12,
    nationality: "British Muslim",
    country: "United Kingdom",
    timeZone: "Europe/London (BST +01:00)",
    parentName: "Mansoor Khan",
    parentContact: "+44 7700 900077",
    currentLevel: "Qur'an Recitation & English Islamic Studies",
    subjects: ["Holy Qur'an", "Islamic Studies", "English Language"],
    status: "Active",
    notes: "Studying Seerah and English translation of Juz' Amma.",
    createdAt: "2026-03-01T11:00:00Z",
    lastActiveDate: "2026-07-25",
  },
  {
    id: "std_004",
    teacherId: "teacher_001",
    fullName: "Maryam Ibrahim",
    preferredName: "Maryam",
    gender: "Female",
    dateOfBirth: "2017-11-05",
    age: 8,
    nationality: "Egyptian",
    country: "Egypt",
    timeZone: "Africa/Cairo (EET +02:00)",
    parentName: "Ibrahim Hassan",
    parentContact: "+20 100 112 2334",
    currentLevel: "Beginner Qaida Noorania",
    subjects: ["Holy Qur'an", "Arabic Language"],
    status: "Archived",
    notes: "Temporarily paused for school examinations.",
    createdAt: "2026-01-15T14:00:00Z",
    lastActiveDate: "2026-05-10",
  }
];

const initialSessions: Session[] = [
  {
    id: "ses_101",
    sessionNumber: 24,
    studentId: "std_001",
    teacherId: "teacher_001",
    date: "2026-07-26",
    time: "10:00 AM",
    durationMinutes: 45,
    status: "completed",
    reportStatus: "approved",
    reportId: "rep_201",
    createdAt: "2026-07-26T10:45:00Z",
    subjectRecords: [
      {
        subject: "Holy Qur'an",
        teacherNotes: "Recited Surah Al-Mulk verses 1-15 with good voice flow. Needs minor revision on verse 8.",
        homework: [
          {
            id: "hw_001",
            subject: "Holy Qur'an",
            task: "Memorize Surah Al-Mulk (verses 16-24)",
            category: "Memorization",
            status: "Completed",
            teacherComment: "Mastered with zero hesitations."
          }
        ],
        performance: {
          participation: 5,
          focus: 5,
          understanding: 4,
          memorization: 5,
          pronunciation: 4,
          confidence: 5,
          behavior: 5,
          writtenObservations: "Excellent concentration during recitation."
        },
        mistakes: ["Missed Ikhfa on verse 8"],
        achievements: ["Flawless recitation of verses 1 to 7"],
        attachments: [
          {
            id: "att_01",
            fileName: "Surah_AlMulk_Tajweed_Guide.pdf",
            fileType: "PDF",
            fileSize: "1.2 MB",
            fileUrl: "#",
            uploadedAt: "2026-07-26T10:00:00Z"
          }
        ]
      },
      {
        subject: "Tajweed",
        teacherNotes: "Studied the rules of Noon Sakinah and Tanween (Idgham with & without Ghunnah). Provided 5 examples from Surah Yasin.",
        homework: [
          {
            id: "hw_002",
            subject: "Tajweed",
            task: "Extract 5 examples of Idgham from Surah Al-Waqi'ah",
            category: "Practice Exercises",
            status: "Completed",
            teacherComment: "Correctly identified all Idgham letters."
          }
        ],
        performance: {
          participation: 5,
          focus: 4,
          understanding: 5,
          confidence: 4,
          behavior: 5,
        },
        mistakes: [],
        achievements: ["Quickly recognized Ghunnah duration"],
        attachments: []
      }
    ]
  },
  {
    id: "ses_102",
    sessionNumber: 25,
    studentId: "std_002",
    teacherId: "teacher_001",
    date: "2026-07-27",
    time: "11:30 AM",
    durationMinutes: 60,
    status: "completed",
    reportStatus: "pending_approval",
    createdAt: "2026-07-27T12:30:00Z",
    subjectRecords: [
      {
        subject: "Holy Qur'an",
        teacherNotes: "Recited Surah An-Naba' verses 1 to 20. Tajweed rules applied very well.",
        homework: [
          {
            id: "hw_003",
            subject: "Holy Qur'an",
            task: "Revise Surah An-Naba' (verses 1-30)",
            category: "Revision",
            status: "Partially Completed",
            teacherComment: "Needs 10 more minutes daily revision."
          }
        ],
        performance: {
          participation: 5,
          focus: 4,
          understanding: 5,
          memorization: 4,
          pronunciation: 5,
          confidence: 4,
          behavior: 5
        },
        mistakes: ["Slight stumble on Madd Munfasil in verse 12"],
        achievements: ["Strong vocal control and clear Makhraj of Ayn and Ha"],
        attachments: []
      },
      {
        subject: "Arabic Language",
        teacherNotes: "Covered Nominal Sentences (الجملة الاسمية) - Al-Mubtada' and Al-Khabar. Practiced parsing 4 sentences.",
        homework: [
          {
            id: "hw_004",
            subject: "Arabic Language",
            task: "Write 3 nominal sentences and mark Mubtada and Khabar",
            category: "Writing",
            status: "Completed"
          }
        ],
        performance: {
          participation: 5,
          focus: 5,
          understanding: 5,
          reading: 5,
          writing: 4,
          confidence: 5,
          behavior: 5
        },
        mistakes: [],
        achievements: ["Understood Dammah ending for Mubtada instantly"],
        attachments: []
      }
    ]
  }
];

const initialDailyReports: DailyReport[] = [
  {
    id: "rep_201",
    sessionId: "ses_101",
    studentId: "std_001",
    studentName: "Abdullah Ahmed",
    teacherId: "teacher_001",
    teacherName: "Mohammed Fathy",
    reportType: "daily",
    title: "Daily Educational Report - Session #24",
    date: "2026-07-26",
    sessionNumber: 24,
    durationMinutes: 45,
    subjectsCovered: [
      {
        subject: "Holy Qur'an",
        summary: "Abdullah completed the recitation of Surah Al-Mulk (verses 1-15). His recitation was fluid with commendable Tajweed application.",
        lessonsStudied: ["Surah Al-Mulk verses 1-15"],
        surahsRecited: ["Surah Al-Mulk"],
        performanceNotes: "Demonstrated strong focus and excellent memorization.",
        homework: ["Memorize Surah Al-Mulk (verses 16-24)"]
      },
      {
        subject: "Tajweed",
        summary: "Focused on the practical rules of Noon Sakinah and Tanween, specifically Idgham with Ghunnah and without Ghunnah.",
        lessonsStudied: ["Idgham with Ghunnah (ي، ن، م، و)", "Idgham without Ghunnah (ل، ر)"],
        grammarOrTopics: ["Noon Sakinah Rules"],
        performanceNotes: "Identified all examples quickly and accurately.",
        homework: ["Extract 5 examples of Idgham from Surah Al-Waqi'ah"]
      }
    ],
    overallPerformanceSummary: "Abdullah displayed exemplary dedication today. He grasped the new Tajweed concept effortlessly and maintained active participation throughout the 45-minute lesson.",
    homeworkSummary: [
      {
        id: "hw_001",
        subject: "Holy Qur'an",
        task: "Memorize Surah Al-Mulk (verses 16-24)",
        category: "Memorization",
        status: "Completed"
      },
      {
        id: "hw_002",
        subject: "Tajweed",
        task: "Extract 5 examples of Idgham from Surah Al-Waqi'ah",
        category: "Practice Exercises",
        status: "Completed"
      }
    ],
    teacherRemarks: "Keep up the wonderful momentum, Abdullah! May Allah bless your efforts.",
    closingMessage: "May Allah grant Abdullah continuous success and bless his family. Ameen.",
    contentEnglish: "Dear Parent,\n\nHere is the daily learning progress report for Abdullah Ahmed for Session #24 on July 26, 2026.\n\nSummary of Subjects Covered:\n1. Holy Qur'an: Recited Surah Al-Mulk (verses 1-15). Recitation was fluent with strong pronunciation.\n2. Tajweed: Mastered Idgham with and without Ghunnah.\n\nHomework Assigned:\n- Memorize Surah Al-Mulk (verses 16-24)\n- Extract 5 Idgham examples from Surah Al-Waqi'ah\n\nOverall Teacher Remarks: Excellent focus and high enthusiasm throughout the lesson.\n\nMay Allah grant Abdullah continuous success. Ameen.",
    contentArabic: "عزيزي ولي الأمر،\n\nإليك تقرير المتابعة اليومي للطالب عبد الله أحمد للحصة رقم 24 بتاريخ 26 يوليو 2026.\n\nملخص المواد التي تم تدريسها:\n1. القرآن الكريم: تلاوة سورة الملك من الآية 1 إلى 15 بحفظ ممتاز وتطبيق إيماني خاشع.\n2. التجويد: دراسة أحكام النون الساكنة والتنوين (الإدغام بغنة وبغير غنة).\n\nالواجب المنزلي:\n- حفظ سورة الملك (الآيات 16-24)\n- استخراج 5 أمثلة للإدغام من سورة الواقعة\n\nتنبيهات واستجابة الطالب: تميز بالتركيز العالي والتفاعل الإيجابي.\n\nجزاكم الله خيرا وبارك في الطالب وأهله.",
    isApproved: true,
    isDraft: false,
    createdAt: "2026-07-26T10:50:00Z",
    lastModified: "2026-07-26T10:50:00Z"
  }
];

const initialMonthlyReports: MonthlyReport[] = [
  {
    id: "mrep_301",
    studentId: "std_001",
    studentName: "Abdullah Ahmed",
    teacherId: "teacher_001",
    month: "July",
    year: 2026,
    reportType: "monthly",
    title: "Monthly Progress Report - July 2026",
    overallProgress: "Abdullah completed 8 sessions in July with a 100% attendance record. He successfully completed Juz' 29 recitation and mastered Idgham and Ikhfa Tajweed rules.",
    totalSessionsCompleted: 8,
    attendanceDays: 8,
    homeworkCompletionRate: 95,
    learningDevelopment: "Continuous improvement in vocal rhythm, Tajweed precision, and memorization retention.",
    strengths: [
      "High concentration and discipline during recitation",
      "Fast memorization retention rate for new Ayahs",
      "Accurate recognition of Tajweed rules in written text"
    ],
    areasForImprovement: [
      "Consistent daily review of previously memorized Surahs to lock long-term memory",
      "Slight attention needed on Mad-al-Lazim duration"
    ],
    teacherRecommendations: "Allocate 15 minutes of quiet daily review after Fajr or Maghrib prayer.",
    closingMessage: "BarakAllahu Feekum for supporting Abdullah's Quranic journey at home.",
    contentEnglish: "Dear Parents of Abdullah,\n\nWe are pleased to share Abdullah's monthly report for July 2026.\n\nSummary:\n- Total Sessions: 8 / 8 Completed\n- Homework Completion: 95%\n- Primary Subjects: Holy Qur'an, Tajweed, Islamic Studies\n\nKey Achievements:\n- Completed Surah Al-Mulk and Surah Al-Qalam\n- Mastered Noon Sakinah rules in Tajweed\n\nRecommendations: Keep encouraging daily review routines.\n\nMay Allah bless Abdullah and reward your household.",
    isApproved: true,
    createdAt: "2026-07-27T08:00:00Z"
  }
];

const initialMemories: Record<string, StudentMemory> = {
  "std_001": {
    id: "mem_001",
    studentId: "std_001",
    educationalHistory: [
      {
        id: "rec_1",
        date: "2026-07-26",
        sessionId: "ses_101",
        sessionNumber: 24,
        summary: "Recited Surah Al-Mulk (1-15) and studied Idgham in Tajweed.",
        subjects: ["Holy Qur'an", "Tajweed"],
        keyAchievements: ["Flawless recitation of verses 1-7"],
        areasToFocus: ["Ikhfa on verse 8"]
      }
    ],
    homeworkHistory: [
      {
        id: "hw_001",
        subject: "Holy Qur'an",
        task: "Memorize Surah Al-Mulk (verses 16-24)",
        category: "Memorization",
        status: "Completed",
        teacherComment: "Mastered with zero hesitations."
      },
      {
        id: "hw_002",
        subject: "Tajweed",
        task: "Extract 5 examples of Idgham from Surah Al-Waqi'ah",
        category: "Practice Exercises",
        status: "Completed"
      }
    ],
    strengths: [
      "Strong vocal control and clear pronunciation",
      "Highly attentive during Tajweed explanations",
      "Consistent homework completion"
    ],
    areasForImprovement: [
      "Periodic stumbling on Madd Munfasil duration",
      "Needs occasional reminder for Ghunnah duration"
    ],
    recurringMistakes: [
      "Occasional confusion between Ghunnah duration (2 harakats vs 1)"
    ],
    teacherNotes: [
      "Learns very quickly when shown visual examples on screen.",
      "Responds positively to encouraging Islamic praises."
    ],
    progressSummary: "Abdullah is excelling in Juz' 29. His enthusiasm for Tajweed rules has grown significantly.",
    lastUpdated: "2026-07-26T10:50:00Z"
  },
  "std_002": {
    id: "mem_002",
    studentId: "std_002",
    educationalHistory: [
      {
        id: "rec_2",
        date: "2026-07-27",
        sessionId: "ses_102",
        sessionNumber: 25,
        summary: "Recited Surah An-Naba' (1-20) and studied Arabic Nominal Sentences.",
        subjects: ["Holy Qur'an", "Arabic Language"],
        keyAchievements: ["Understood Mubtada and Khabar grammatical parsing"],
        areasToFocus: ["Madd Munfasil verse 12"]
      }
    ],
    homeworkHistory: [
      {
        id: "hw_003",
        subject: "Holy Qur'an",
        task: "Revise Surah An-Naba' (verses 1-30)",
        category: "Revision",
        status: "Partially Completed"
      },
      {
        id: "hw_004",
        subject: "Arabic Language",
        task: "Write 3 nominal sentences with Mubtada and Khabar",
        category: "Writing",
        status: "Completed"
      }
    ],
    strengths: [
      "Excellent Arabic writing speed and legibility",
      "Deep interest in Quranic vocabulary"
    ],
    areasForImprovement: [
      "Daily revision schedule adherence"
    ],
    recurringMistakes: [],
    teacherNotes: [
      "Fatima enjoys parsing sentences and identifying nouns."
    ],
    progressSummary: "Making steady progress in both Quran memorization and Arabic grammar.",
    lastUpdated: "2026-07-27T12:30:00Z"
  }
};

const initialSettings: AppSettings = {
  preferredLanguage: "en",
  reportStyle: "detailed",
  defaultClosingMessage: "May Allah grant the student continuous wisdom and success in this life and the hereafter. Ameen.",
  writingTone: "encouraging",
  aiRules: [
    {
      id: "rule_01",
      category: "general",
      name: "Accuracy Priority",
      instruction: "Never invent or extrapolate unrecorded student activities, Quranic verses, Hadith, or Fatwas. Only organize verified teacher notes.",
      isActive: true
    },
    {
      id: "rule_02",
      category: "general",
      name: "Parent Friendly Tone",
      instruction: "Use polite, encouraging, professional English suitable for parents, emphasizing constructive progress.",
      isActive: true
    },
    {
      id: "rule_03",
      category: "subject",
      name: "Holy Qur'an Guidance",
      instruction: "Always specify Surah names and exact verse ranges recited or memorized. Do not interpret verses unless teacher notes provide explicit Tafsir.",
      subject: "Holy Qur'an",
      isActive: true
    },
    {
      id: "rule_04",
      category: "subject",
      name: "Tajweed Terms",
      instruction: "Use standard transliterated Tajweed terms (e.g. Idgham, Ikhfa, Qalqalah, Ghunnah) accompanied by simple explanations.",
      subject: "Tajweed",
      isActive: true
    },
    {
      id: "rule_05",
      category: "general",
      name: "Closing Islamic Dua",
      instruction: "Always conclude reports with a respectful Islamic prayer/dua for the student's success.",
      isActive: true
    }
  ],
  notificationPreferences: {
    upcomingSessions: true,
    pendingReports: true,
    incompleteHomework: true
  }
};

export class DatabaseService {
  private store: DBStore;

  constructor() {
    this.store = this.loadStore();
  }

  private loadStore(): DBStore {
    const fallback: DBStore = {
      user: initialUser,
      students: initialStudents,
      sessions: initialSessions,
      reports: initialDailyReports,
      monthlyReports: initialMonthlyReports,
      memories: initialMemories,
      settings: initialSettings
    };

    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            return {
              user: parsed.user || initialUser,
              students: Array.isArray(parsed.students) ? parsed.students : initialStudents,
              sessions: Array.isArray(parsed.sessions) ? parsed.sessions : initialSessions,
              reports: Array.isArray(parsed.reports) ? parsed.reports : initialDailyReports,
              monthlyReports: Array.isArray(parsed.monthlyReports) ? parsed.monthlyReports : initialMonthlyReports,
              memories: parsed.memories && typeof parsed.memories === "object" ? parsed.memories : initialMemories,
              settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : initialSettings
            };
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load server_db_store.json:", err);
    }
    return fallback;
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.store, null, 2), "utf-8");
    } catch (err) {
      console.warn("Failed to persist server_db_store.json:", err);
    }
  }

  // User
  getUser(): UserProfile {
    return this.store.user;
  }

  updateUser(updates: Partial<UserProfile>): UserProfile {
    this.store.user = { ...this.store.user, ...updates };
    this.persist();
    return this.store.user;
  }

  // Students
  getStudents(includeArchived = false): Student[] {
    if (includeArchived) return this.store.students;
    return this.store.students.filter(s => s.status === "Active");
  }

  getStudentById(id: string): Student | undefined {
    return this.store.students.find(s => s.id === id);
  }

  createStudent(studentData: Omit<Student, "id" | "teacherId" | "createdAt">): Student {
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}`,
      teacherId: this.store.user.id,
      createdAt: new Date().toISOString(),
      lastActiveDate: new Date().toISOString().split("T")[0]
    };
    this.store.students.unshift(newStudent);

    // Initialize empty memory
    this.store.memories[newStudent.id] = {
      id: `mem_${newStudent.id}`,
      studentId: newStudent.id,
      educationalHistory: [],
      homeworkHistory: [],
      strengths: [],
      areasForImprovement: [],
      recurringMistakes: [],
      teacherNotes: [],
      progressSummary: `New student profile created on ${new Date().toISOString().split("T")[0]}.`,
      lastUpdated: new Date().toISOString()
    };

    this.persist();
    return newStudent;
  }

  updateStudent(id: string, updates: Partial<Student>): Student | undefined {
    const idx = this.store.students.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.store.students[idx] = { ...this.store.students[idx], ...updates };
    this.persist();
    return this.store.students[idx];
  }

  deleteStudent(id: string): boolean {
    const idx = this.store.students.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.store.students.splice(idx, 1);
    delete this.store.memories[id];
    this.persist();
    return true;
  }

  archiveStudent(id: string): Student | undefined {
    return this.updateStudent(id, { status: "Archived" });
  }

  restoreStudent(id: string): Student | undefined {
    return this.updateStudent(id, { status: "Active" });
  }

  // Sessions
  getSessions(studentId?: string): Session[] {
    if (studentId) {
      return this.store.sessions.filter(s => s.studentId === studentId);
    }
    return this.store.sessions;
  }

  getSessionById(id: string): Session | undefined {
    return this.store.sessions.find(s => s.id === id);
  }

  createSession(sessionData: Omit<Session, "id" | "teacherId" | "createdAt">): Session {
    const newSession: Session = {
      ...sessionData,
      id: `ses_${Date.now()}`,
      teacherId: this.store.user.id,
      createdAt: new Date().toISOString()
    };
    this.store.sessions.unshift(newSession);

    // Update student last active date
    this.updateStudent(newSession.studentId, {
      lastActiveDate: newSession.date
    });

    this.persist();
    return newSession;
  }

  updateSession(id: string, updates: Partial<Session>): Session | undefined {
    const idx = this.store.sessions.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.store.sessions[idx] = { ...this.store.sessions[idx], ...updates };
    this.persist();
    return this.store.sessions[idx];
  }

  // Daily Reports
  getReports(studentId?: string): DailyReport[] {
    if (studentId) {
      return this.store.reports.filter(r => r.studentId === studentId);
    }
    return this.store.reports;
  }

  getReportById(id: string): DailyReport | undefined {
    return this.store.reports.find(r => r.id === id);
  }

  saveReport(reportData: DailyReport): DailyReport {
    const existingIdx = this.store.reports.findIndex(r => r.id === reportData.id);
    if (existingIdx !== -1) {
      this.store.reports[existingIdx] = {
        ...reportData,
        lastModified: new Date().toISOString()
      };
    } else {
      this.store.reports.unshift(reportData);
    }

    // Update Session reportStatus
    this.updateSession(reportData.sessionId, {
      reportStatus: reportData.isApproved ? "approved" : "draft",
      reportId: reportData.id
    });

    // Auto update Student Memory if approved (SRS REQ-MEM-001/006 / 7.5)
    if (reportData.isApproved) {
      this.updateStudentMemoryFromApprovedReport(reportData);
    }

    this.persist();
    return reportData;
  }

  deleteReport(id: string): boolean {
    const idx = this.store.reports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const rep = this.store.reports[idx];
    this.store.reports.splice(idx, 1);
    
    // Reset session report status if linked
    if (rep.sessionId) {
      this.updateSession(rep.sessionId, { reportStatus: "none", reportId: undefined });
    }
    this.persist();
    return true;
  }

  // Monthly Reports
  getMonthlyReports(studentId?: string): MonthlyReport[] {
    if (studentId) {
      return this.store.monthlyReports.filter(m => m.studentId === studentId);
    }
    return this.store.monthlyReports;
  }

  saveMonthlyReport(monthlyData: MonthlyReport): MonthlyReport {
    const idx = this.store.monthlyReports.findIndex(m => m.id === monthlyData.id);
    if (idx !== -1) {
      this.store.monthlyReports[idx] = monthlyData;
    } else {
      this.store.monthlyReports.unshift(monthlyData);
    }
    this.persist();
    return monthlyData;
  }

  // Student Memory System
  getStudentMemory(studentId: string): StudentMemory {
    if (!this.store.memories[studentId]) {
      this.store.memories[studentId] = {
        id: `mem_${studentId}`,
        studentId,
        educationalHistory: [],
        homeworkHistory: [],
        strengths: [],
        areasForImprovement: [],
        recurringMistakes: [],
        teacherNotes: [],
        progressSummary: "No memory history recorded yet.",
        lastUpdated: new Date().toISOString()
      };
      this.persist();
    }
    return this.store.memories[studentId];
  }

  updateStudentMemory(studentId: string, updates: Partial<StudentMemory>): StudentMemory {
    const current = this.getStudentMemory(studentId);
    const updated: StudentMemory = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    this.store.memories[studentId] = updated;
    this.persist();
    return updated;
  }

  // SRS 7.5: Automatic update of memory after report approval
  private updateStudentMemoryFromApprovedReport(report: DailyReport) {
    const memory = this.getStudentMemory(report.studentId);

    // Create educational history entry
    const newRecord: EducationalMemoryRecord = {
      id: `rec_${Date.now()}`,
      date: report.date,
      sessionId: report.sessionId,
      sessionNumber: report.sessionNumber,
      summary: report.overallPerformanceSummary || "Completed session",
      subjects: report.subjectsCovered.map(s => s.subject),
      keyAchievements: report.subjectsCovered.flatMap(s => s.surahsRecited || []),
      areasToFocus: report.homeworkSummary.map(h => h.task)
    };

    // Avoid duplicated records for same session
    const filteredHistory = memory.educationalHistory.filter(h => h.sessionId !== report.sessionId);
    filteredHistory.unshift(newRecord);

    // Combine homework history
    const combinedHomework = [...report.homeworkSummary, ...memory.homeworkHistory];
    // Deduplicate by task ID/name
    const uniqueHomeworkMap = new Map<string, HomeworkItem>();
    combinedHomework.forEach(hw => uniqueHomeworkMap.set(hw.id || hw.task, hw));
    const updatedHomeworkList = Array.from(uniqueHomeworkMap.values());

    const updatedMemory: StudentMemory = {
      ...memory,
      educationalHistory: filteredHistory,
      homeworkHistory: updatedHomeworkList,
      progressSummary: `Updated on ${report.date} after Session #${report.sessionNumber} approval.`,
      lastUpdated: new Date().toISOString()
    };

    this.store.memories[report.studentId] = updatedMemory;
    this.persist();
  }

  // Settings & AI Rules
  getSettings(): AppSettings {
    return this.store.settings;
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.store.settings = { ...this.store.settings, ...updates };
    this.persist();
    return this.store.settings;
  }

  getAIRules(): AIRule[] {
    return this.store.settings.aiRules;
  }

  addAIRule(rule: Omit<AIRule, "id">): AIRule {
    const newRule: AIRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };
    this.store.settings.aiRules.push(newRule);
    this.persist();
    return newRule;
  }

  updateAIRule(id: string, updates: Partial<AIRule>): AIRule | undefined {
    const idx = this.store.settings.aiRules.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.store.settings.aiRules[idx] = { ...this.store.settings.aiRules[idx], ...updates };
    this.persist();
    return this.store.settings.aiRules[idx];
  }

  deleteAIRule(id: string): boolean {
    const idx = this.store.settings.aiRules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.store.settings.aiRules.splice(idx, 1);
    this.persist();
    return true;
  }
}

export const db = new DatabaseService();
