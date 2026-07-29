import {
  UserProfile,
  Student,
  Session,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AppSettings
} from "../types";

export const initialUser: UserProfile = {
  id: "teacher_001",
  fullName: "Mohammed Fathy",
  email: "mohammed.fathy@example.com",
  title: "Senior Qur'an & Islamic Studies Teacher",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  createdAt: "2026-01-10T08:00:00Z",
  lastLogin: new Date().toISOString()
};

export const initialStudents: Student[] = [
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
    lastActiveDate: "2026-07-26"
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
    lastActiveDate: "2026-07-27"
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
    lastActiveDate: "2026-07-25"
  }
];

export const initialSessions: Session[] = [
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
        attachments: []
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
          behavior: 5
        },
        mistakes: [],
        achievements: ["Quickly recognized Ghunnah duration"],
        attachments: []
      }
    ]
  }
];

export const initialDailyReports: DailyReport[] = [
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
        lessonsStudied: ["Idgham with Ghunnah", "Idgham without Ghunnah"],
        grammarOrTopics: ["Noon Sakinah Rules"],
        performanceNotes: "Identified all examples quickly and accurately.",
        homework: ["Extract 5 examples of Idgham from Surah Al-Waqi'ah"]
      }
    ],
    overallPerformanceSummary: "Abdullah displayed exemplary dedication today. He grasped the new Tajweed concept effortlessly.",
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
    contentEnglish: "Dear Parent,\n\nHere is the daily learning progress report for Abdullah Ahmed for Session #24 on July 26, 2026.",
    contentArabic: "عزيزي ولي الأمر،\n\nإليك تقرير المتابعة اليومي للطالب عبد الله أحمد للحصة رقم 24 بتاريخ 26 يوليو 2026.\n\nملخص المواد التي تم تدريسها:\n1. القرآن الكريم: تلاوة سورة الملك من الآية 1 إلى 15 بحفظ ممتاز وتطبيق إيماني خاشع.\n2. التجويد: دراسة أحكام النون الساكنة والتنوين.\n\nجزاكم الله خيرا وبارك في الطالب وأهله.",
    isApproved: true,
    isDraft: false,
    createdAt: "2026-07-26T10:50:00Z",
    lastModified: "2026-07-26T10:50:00Z"
  }
];

export const initialMonthlyReports: MonthlyReport[] = [
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
      "Fast memorization retention rate for new Ayahs"
    ],
    areasForImprovement: [
      "Consistent daily review of previously memorized Surahs to lock long-term memory"
    ],
    teacherRecommendations: "Allocate 15 minutes of quiet daily review after Fajr or Maghrib prayer.",
    closingMessage: "BarakAllahu Feekum for supporting Abdullah's Quranic journey at home.",
    contentEnglish: "Dear Parents of Abdullah,\n\nWe are pleased to share Abdullah's monthly report for July 2026.",
    contentArabic: "عزيزي ولي الأمر،\n\nيسرنا مشاركة التقرير الشهري للطالب عبد الله أحمد لشهر يوليو 2026.",
    isApproved: true,
    createdAt: "2026-07-27T08:00:00Z"
  }
];

export const initialMemories: Record<string, StudentMemory> = {
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
      }
    ],
    strengths: [
      "Strong vocal control and clear pronunciation",
      "Highly attentive during Tajweed explanations"
    ],
    areasForImprovement: [
      "Periodic stumbling on Madd Munfasil duration"
    ],
    recurringMistakes: [
      "Occasional confusion between Ghunnah duration"
    ],
    teacherNotes: [
      "Learns very quickly when shown visual examples on screen."
    ],
    progressSummary: "Making steady progress across all Quranic subjects.",
    lastUpdated: "2026-07-26"
  }
};

export const initialSettings: AppSettings = {
  preferredLanguage: "ar",
  reportStyle: "detailed",
  defaultClosingMessage: "جزاكم الله خيراً ونفع بدراستكم وحفظكم للقرآن الكريم.",
  writingTone: "encouraging",
  lastUpdated: "2026-01-01T00:00:00.000Z",
  aiRules: [
    {
      id: "rule_01",
      category: "general",
      name: "Always Start with Praise",
      instruction: "Begin every report with 'Alhamdulillah' and praise the student's Islamic effort and intention.",
      isActive: true
    },
    {
      id: "rule_02",
      category: "subject",
      name: "Qur'an Precision Rule",
      subject: "Holy Qur'an",
      instruction: "Specify exact Surah names, verse numbers, and Makhraj/Tajweed rule corrections in clear bullet points.",
      isActive: true
    }
  ],
  selectedTemplateId: "tpl_standard_daily",
  templates: [
    {
      id: "tpl_standard_daily",
      name: "القالب اليومي الشامل (Standard Daily Report)",
      description: "الهيكل القياسي المعتمد لجميع المواد الإسلامية مع تفصيل الآيات والأحكام والواجبات",
      category: "daily",
      structure: {
        headerFormat: "تقرير المتابعة اليومي - حصة #{sessionNumber}",
        sectionsOrder: ["مقدمة والثناء", "القرآن والتجويد", "اللغة العربية والدراسات", "التقييم والواجبات", "دعاء الختام"],
        placeholders: ["{studentName}", "{date}", "{sessionNumber}", "{subjects}", "{teacherRemarks}"],
        promptInstructions: "اكتب التقرير في صورة أقسام منظمة تشمل: الحمد والثناء على الطالب، تفاصيل الآيات والسور التي تم تلاوتها أو حفظها، أحكام التجويد المطبقة، الواجب المنزلي، وملخص التقييم والدعاء الختامي."
      },
      isDefault: true,
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "tpl_quran_focus",
      name: "قالب تركيز حفظ ومراجعة القرآن الكريم (Qur'an & Memorization)",
      description: "هيكل مخصص للتركيز العالي على مراجعة الماضي، الحفظ الجديد، ومخارج الحروف",
      category: "memorization",
      structure: {
        headerFormat: "تقرير متابعة حفظ القرآن الكريم - {studentName}",
        sectionsOrder: ["مراجعة الماضي", "الحفظ الجديد", "تصحيح المخارج", "ملاحظات وتوجيهات الحفظ", "دعاء البركة"],
        placeholders: ["{studentName}", "{date}", "{surahsRecited}", "{teacherRemarks}"],
        promptInstructions: "ركز التقرير بشكل أساسي على: مقدار المراجعة السابقة، مقدار الحفظ الجديد بدقة بالآيات والسور، جودة الترتيل والتمكين، وأي أخطاء تكررت في المخارج والصفات."
      },
      isDefault: false,
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "tpl_tajweed_arabic",
      name: "قالب التجويد واللغة العربية (Tajweed & Arabic Focus)",
      description: "هيكل تعليمي مخصص لقواعد النون الساكنة والمود والنحو العربي مع الأمثلة",
      category: "tajweed_focus",
      structure: {
        headerFormat: "تقرير تطبيق قواعد التجويد واللغة - {studentName}",
        sectionsOrder: ["القواعد المدروسة", "تطبيقات وأمثلة من المصحف", "المفردات والنحو", "التكليفات والواجبات"],
        placeholders: ["{studentName}", "{date}", "{subjects}", "{teacherRemarks}"],
        promptInstructions: "ركز التقرير على القواعد النظرية والتطبيقية التي تم تدريسها، مع ذكر أمثلة استخراجها من آيات القرآن الكريم، وتكليف الطالب بأمثلة مشابهة."
      },
      isDefault: false,
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "tpl_concise_parent",
      name: "قالب المتابعة السريعة لولي الأمر (Concise Parent Note)",
      description: "فقرة موجزة ومركزة مخصصة للإرسال المباشر لولي الأمر عبر واتساب أو البريد",
      category: "custom",
      structure: {
        headerFormat: "رسالة متابعة سريعة - {studentName}",
        sectionsOrder: ["تحية وإنجاز الحصة", "أبرز التوصيات", "دعاء ختامي"],
        placeholders: ["{studentName}", "{date}", "{teacherRemarks}"],
        promptInstructions: "اكتب التقرير في فقرة واحدة دافئة وموجزة جدا تناسب القراءة السريعة لولي الأمر، تسلط الضوء على الإنجاز الرئيسي والواجب القادم فقط."
      },
      isDefault: false,
      createdAt: "2026-01-01T00:00:00Z"
    }
  ],
  notificationPreferences: {
    upcomingSessions: true,
    pendingReports: true,
    incompleteHomework: true
  }
};
