import React, { useState } from "react";
import {
  GraduationCap,
  Search,
  Plus,
  Phone,
  MessageSquare,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  UserCheck,
  UserX,
  X,
  PlusCircle,
  FileText,
  Percent,
  Sparkles,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileUp,
  FileSpreadsheet,
  Presentation,
  File,
  Calculator,
  Layers,
  BookOpen,
  Smartphone,
  Globe,
  ExternalLink,
  Archive,
  ArchiveRestore,
  FolderArchive,
  Filter,
  History,
  LayoutGrid,
  List,
  RefreshCw,
  Star,
  Users,
  Link2,
  FolderPlus,
  Eye,
  EyeOff,
  HelpCircle,
  Printer
} from "lucide-react";
import {
  Student,
  CombinedStudentGroup,
  PrivateLesson,
  StudentSubjectPlan,
  SubjectPaymentAllocation,
  AttendanceRecord,
  AttendanceStatus,
  HomeworkStatus,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  StudentStatus,
  PaymentStatus,
  BillingType,
  AppSettings,
  ReportAttachment,
  findSubjectAiInstruction,
  getSubjectSpecificAiInstruction,
  isMonthlyComprehensiveReport,
  isDailyPersonalReport,
  deduplicateReportsList,
  mergeDirectAndAttendanceReports
} from "../types";
import {
  calculateStudentFinancials,
  calculateCombinedGroupFinancials,
  formatHoursHuman,
  generateStudentStatementWhatsAppMessage
} from "../lib/financeUtils";
import { sanitizeStudent, matchesStudentRecord } from "../lib/financeEngine";
import { getReportTitle } from "../lib/reportTitleUtils";
import { StudentPersonalReportView } from "./StudentPersonalReportView";
import { CreateCombinedGroupModal } from "./CreateCombinedGroupModal";
import { CombinedStudentFileModal } from "./CombinedStudentFileModal";
import { ComprehensiveMonthlyReportModal } from "./ComprehensiveMonthlyReportModal";
import { isQuranComprehensiveReportEligible } from "../lib/monthlyQuranReport";
import {
  getActiveCycleInfo,
  isReportInActiveCycle,
  groupArchivedReports,
  getReportArchiveGroupName,
  getNextActiveLessonNumber,
  isFixedPackageStudent
} from "../lib/reportArchiveEngine";
import { SmartStepMemory } from "../lib/smartStepMemory";
import { ArchiveCycleModal } from "./ArchiveCycleModal";
import { ArchivedReportsFolderList } from "./ArchivedReportsFolderList";

const COMMON_SUBJECT_SUGGESTIONS = [
  "Quran, Arabic and Islamic Studies",
  "قرآن كريم",
  "القرآن الكريم",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "العلوم",
  "الدراسات",
  "الحاسب الآلي",
  "الفرنساوي"
];

export const COMMON_CURRICULUMS = [
  { label: "Quran, Arabic and Islamic Studies", flag: "🕌" },
  { label: "قرآن كريم", flag: "📖" },
  { label: "منهج مصري (عربي)", flag: "🇪🇬" },
  { label: "منهج مصري (لغات / تجريبي)", flag: "🇪🇬" },
  { label: "منهج سعودي", flag: "🇸🇦" },
  { label: "منهج إماراتي", flag: "🇦🇪" },
  { label: "منهج كويتي", flag: "🇰🇼" },
  { label: "منهج قطري", flag: "🇶🇦" },
  { label: "منهج عماني", flag: "🇴🇲" },
  { label: "منهج أردني", flag: "🇯🇴" },
  { label: "دولي (IGCSE / SAT / American)", flag: "🌐" },
  { label: "أزهري (مصر)", flag: "🕌" },
  { label: "منهج عام / حر", flag: "📚" }
];

export const COMMON_GRADES = [
  "الصف الأول الابتدائي",
  "الصف الثاني الابتدائي",
  "الصف الثالث الابتدائي",
  "الصف الرابع الابتدائي",
  "الصف الخامس الابتدائي",
  "الصف السادس الابتدائي",
  "الصف الأول الإعدادي",
  "الصف الثاني الإعدادي",
  "الصف الثالث الإعدادي",
  "الصف الأول الثانوي",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
  "المرحلة الجامعية"
];

interface StudentsViewProps {
  settings: AppSettings;
  students: Student[];
  combinedStudentGroups?: CombinedStudentGroup[];
  privateLessons?: PrivateLesson[];
  attendanceRecords: AttendanceRecord[];
  examRecords: ExamRecord[];
  paymentTransactions: PaymentTransaction[];
  reports: GeneratedReport[];
  onAddStudent: (student: Omit<Student, "id" | "createdAt">) => void;
  onEditStudent?: (studentId: string, student: Partial<Student>, applyToPrevious?: boolean) => void;
  onDeleteStudent?: (studentId: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus) => void;
  onRecordPayment: (
    studentId: string,
    amount: number,
    notes?: string,
    date?: string,
    subjectAllocations?: SubjectPaymentAllocation[],
    targetSubject?: string
  ) => void;
  onAddExamRecord?: (studentId: string, examName: string, score: number, totalScore: number, date: string) => void;
  onAddReport: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onGenerateReportAi: (payload: {
    studentName: string;
    subject: string;
    date?: string;
    teacherName?: string;
    lessonNumber?: number;
    lessonDuration?: string;
    includeStudentName?: boolean;
    includeTeacherName?: boolean;
    includeLessonNumber?: boolean;
    includeDuration?: boolean;
    includeLessonDate?: boolean;
    preferredLanguage?: "ar" | "en";
    durationMinutes?: number;
    attendanceStatus?: string;
    homeworkStatus?: string;
    teacherNotes?: string;
    classEvents?: string;
    homeworkNotes?: string;
    overallEvaluation?: string;
    aiInstructions?: string;
    generalAiInstructions?: string;
    subjectAiInstructions?: string;
    attachment?: ReportAttachment;
  }) => Promise<string>;
  onAddPrivateLesson?: (privateLesson: Omit<PrivateLesson, "id" | "createdAt">) => void;
  onUpdatePrivateLesson?: (id: string, partial: Partial<PrivateLesson>) => void;
  onDeletePrivateLesson?: (id: string) => void;
  onAddCombinedGroup?: (name: string, studentIds: string[], notes?: string, sharedParentContact?: string, sharedGroupLink?: string) => void;
  onUpdateCombinedGroup?: (id: string, partial: Partial<CombinedStudentGroup>) => void;
  onDeleteCombinedGroup?: (id: string) => void;
  onAddStudentToCombinedGroup?: (groupId: string, studentId: string) => void;
  onRemoveStudentFromCombinedGroup?: (groupId: string, studentId: string) => void;
  onArchiveEndedCycle?: (params: {
    studentId: string;
    archiveGroupName: string;
    newCycleStartDate: string;
    newCycleName: string;
    resetLessonBalance: boolean;
  }) => void;
  onRecoverReports?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  settings,
  students = [],
  combinedStudentGroups = [],
  privateLessons = [],
  attendanceRecords = [],
  examRecords = [],
  paymentTransactions = [],
  reports = [],
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onUpdateStudentStatus,
  onRecordPayment,
  onAddExamRecord,
  onAddReport,
  onDeleteReport,
  onToggleArchiveReport,
  onGenerateReportAi,
  onAddPrivateLesson,
  onUpdatePrivateLesson,
  onDeletePrivateLesson,
  onAddCombinedGroup,
  onUpdateCombinedGroup,
  onDeleteCombinedGroup,
  onAddStudentToCombinedGroup,
  onRemoveStudentFromCombinedGroup,
  onArchiveEndedCycle,
  onRecoverReports
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "stopped">("all");
  const [filterCurriculum, setFilterCurriculum] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");

  // Selected Student for Profile View (resolved against live students array so cycle/archive updates reflect immediately)
  const [selectedStudentState, setSelectedStudent] = useState<Student | null>(null);
  const selectedStudent = selectedStudentState
    ? (students.find(s => s.id === selectedStudentState.id) || selectedStudentState)
    : null;
  const [profileTab, setProfileTab] = useState<"daily_reports" | "monthly_reports" | "finance" | "attendance">("daily_reports");

  // Selected Student for Standalone Full-Page Personal Report View
  const [studentForPersonalReportState, setStudentForPersonalReport] = useState<Student | null>(null);
  const studentForPersonalReport = studentForPersonalReportState
    ? (students.find(s => s.id === studentForPersonalReportState.id) || studentForPersonalReportState)
    : null;

  // Report Archive Filter State (+6 months auto-archiving)
  const [reportArchiveFilter, setReportArchiveFilter] = useState<"active" | "archived" | "all">("all");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState("all");
  const [showArchiveCycleModal, setShowArchiveCycleModal] = useState(false);

  // AI Report State inside Student Profile
  const [showCreateReportForm, setShowCreateReportForm] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportLessonNumber, setReportLessonNumber] = useState<number>(1);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reportDurationMinutes, setReportDurationMinutes] = useState<number>(60);
  const [reportAttendance, setReportAttendance] = useState<AttendanceStatus>("present");
  const [reportDeductCost, setReportDeductCost] = useState<boolean>(true);
  const [reportHomeworkStatus, setReportHomeworkStatus] = useState<HomeworkStatus>("done");
  const [absentNotes, setAbsentNotes] = useState("");
  const [classEvents, setClassEvents] = useState("");
  const [homeworkNotes, setHomeworkNotes] = useState("");
  const [overallEvaluation, setOverallEvaluation] = useState("");
  const [newAiInstructions, setNewAiInstructions] = useState("");
  const [newGeneratedReportText, setNewGeneratedReportText] = useState("");
  const [reportAttachment, setReportAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState("");
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [whatsappSentNotice, setWhatsappSentNotice] = useState("");
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);

  // WhatsApp Multi-App Target Selection Modal State
  const [showWhatsAppChooserModal, setShowWhatsAppChooserModal] = useState(false);
  const [pendingWhatsAppText, setPendingWhatsAppText] = useState("");
  const [pendingWhatsAppTargetStudent, setPendingWhatsAppTargetStudent] = useState<Student | null>(null);

  // Combined Student Group State
  const [selectedCombinedGroup, setSelectedCombinedGroup] = useState<CombinedStudentGroup | null>(null);
  const [showCreateCombinedGroupModal, setShowCreateCombinedGroupModal] = useState(false);
  const [initialMergeStudentIds, setInitialMergeStudentIds] = useState<string[]>([]);

  // Comprehensive Monthly Report Modal State (Exclusive to "قرآن كريم" and "Quran, Arabic and Islamic Studies")
  const [monthlyReportModalTarget, setMonthlyReportModalTarget] = useState<{ student: Student; subject: string } | null>(null);

  // Student Statement Modal State (كشف الحساب المالي وساعات الدراسة)
  const [statementModalStudent, setStatementModalStudent] = useState<Student | null>(null);
  const [copiedStatementStudentId, setCopiedStatementStudentId] = useState<string | null>(null);

  // In-App Confirm Report Deletion State
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);

  // Function to open WhatsApp chooser modal
  const handleOpenWhatsAppChooser = (text: string, st: Student | null = selectedStudent) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setPendingWhatsAppText(text);
    setPendingWhatsAppTargetStudent(st);
    setShowWhatsAppChooserModal(true);
  };

  // Function to send via chosen WhatsApp target/app
  const handleSendViaWhatsAppMode = (
    mode: "universal" | "web" | "app_scheme" | "business_scheme" | "intent_android"
  ) => {
    const text = pendingWhatsAppText;
    const st = pendingWhatsAppTargetStudent;
    const rawLink = st?.whatsappGroupLink || st?.parentContact || "";
    const isUrl = rawLink.startsWith("http");
    const cleanPhone = rawLink.replace(/[^0-9]/g, "");

    const encodedText = encodeURIComponent(text);

    let finalUrl = "";

    if (mode === "web") {
      // WhatsApp Web directly
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
      }
    } else if (mode === "app_scheme") {
      // whatsapp:// protocol (standard app directly)
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `whatsapp://send?text=${encodedText}`;
      }
    } else if (mode === "business_scheme") {
      // WhatsApp Business specific attempt / wa.me universal
      if (cleanPhone) {
        finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      } else if (isUrl) {
        finalUrl = rawLink;
      } else {
        finalUrl = `https://wa.me/?text=${encodedText}`;
      }
    } else if (mode === "intent_android") {
      // Native Share API if supported on mobile/tablet to let OS show WhatsApp/WhatsApp Business chooser
      if (navigator.share) {
        navigator
          .share({
            title: isArabic ? `تقرير ${st?.fullName || "الطالب"}` : `Report: ${st?.fullName || "Student"}`,
            text: text
          })
          .then(() => {
            setShowWhatsAppChooserModal(false);
            setWhatsappSentNotice(isArabic ? "تم فتح نافذة المشاركة بنجاح!" : "Shared successfully!");
            setTimeout(() => setWhatsappSentNotice(""), 4000);
          })
          .catch(() => {
            // fallback if user cancels or fails
          });
        return;
      } else {
        // Fallback to wa.me universal link
        if (cleanPhone) {
          finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        } else {
          finalUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        }
      }
    } else {
      // Universal (wa.me / api.whatsapp.com - prompts device to choose installed WhatsApp)
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      }
    }

    if (finalUrl) {
      window.open(finalUrl, "_blank");
    }

    setShowWhatsAppChooserModal(false);
    setWhatsappSentNotice(isArabic ? "تم نسخ التقرير وجاري الفتح في تطبيق الواتساب المختار!" : "Report copied and opened!");
    setTimeout(() => setWhatsappSentNotice(""), 4500);
  };

  const handleCopyStudentStatement = (st: Student) => {
    const finSummary = calculateStudentFinancials(st, attendanceRecords, paymentTransactions);
    const text = generateStudentStatementWhatsAppMessage({
      studentName: st.fullName,
      subjectName: st.subject,
      studyTypeLabel: st.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private"),
      totalTaughtHours: finSummary.totalTaughtHours,
      totalAttendedLessons: finSummary.totalAttendedLessons,
      totalAccruedCost: finSummary.totalAccruedCost,
      totalPaidAmount: finSummary.totalPaidAmount,
      amountDue: finSummary.amountDue,
      creditRemaining: finSummary.creditRemaining,
      isMonthly: finSummary.isMonthly,
      billedMonthsCount: finSummary.billedMonthsCount,
      monthlyCost: finSummary.monthlyCost,
      subjectsBreakdown: finSummary.subjectsDetails?.map(s => ({
        subjectName: s.subject,
        totalTaughtHours: s.totalTaughtHours,
        attendedCount: s.totalAttendedLessons,
        accruedCost: s.totalAccruedCost,
        paidAmount: s.totalPaidAmount,
        amountDue: s.amountDue
      })),
      recentAttendance: attendanceRecords
        .filter(ar => ar.studentId === st.id && (ar.attendance === "present" || ar.deducted))
        .slice(0, 10)
        .map(ar => ({
          lessonNumber: ar.lessonNumber,
          date: ar.date,
          durationMinutes: ar.durationMinutes,
          subject: ar.subject
        }))
    }, isArabic);

    navigator.clipboard.writeText(text);
    setCopiedStatementStudentId(st.id);
    setTimeout(() => setCopiedStatementStudentId(null), 2500);
  };

  const handleShareStudentStatementWhatsApp = (st: Student) => {
    const finSummary = calculateStudentFinancials(st, attendanceRecords, paymentTransactions);
    const text = generateStudentStatementWhatsAppMessage({
      studentName: st.fullName,
      subjectName: st.subject,
      studyTypeLabel: st.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private"),
      totalTaughtHours: finSummary.totalTaughtHours,
      totalAttendedLessons: finSummary.totalAttendedLessons,
      totalAccruedCost: finSummary.totalAccruedCost,
      totalPaidAmount: finSummary.totalPaidAmount,
      amountDue: finSummary.amountDue,
      creditRemaining: finSummary.creditRemaining,
      isMonthly: finSummary.isMonthly,
      billedMonthsCount: finSummary.billedMonthsCount,
      monthlyCost: finSummary.monthlyCost,
      subjectsBreakdown: finSummary.subjectsDetails?.map(s => ({
        subjectName: s.subject,
        totalTaughtHours: s.totalTaughtHours,
        attendedCount: s.totalAttendedLessons,
        accruedCost: s.totalAccruedCost,
        paidAmount: s.totalPaidAmount,
        amountDue: s.amountDue
      })),
      recentAttendance: attendanceRecords
        .filter(ar => ar.studentId === st.id && (ar.attendance === "present" || ar.deducted))
        .slice(0, 10)
        .map(ar => ({
          lessonNumber: ar.lessonNumber,
          date: ar.date,
          durationMinutes: ar.durationMinutes,
          subject: ar.subject
        }))
    }, isArabic);

    handleOpenWhatsAppChooser(text, st);
  };

  // Automatically calculate the next lesson number for a student and subject
  // Uses smart monthly vs fixed package rules:
  // - Monthly students start at lesson 1 on every new active monthly cycle
  // - Fixed package students increment until package count or manual archive
  const calculateNextLessonNumber = (st: Student | null, subj: string): number => {
    if (!st) return 1;
    return getNextActiveLessonNumber(
      st,
      subj,
      Array.isArray(reports) ? reports : [],
      Array.isArray(attendanceRecords) ? attendanceRecords : []
    );
  };

  const handleReportSubjectChange = (newSubj: string) => {
    setReportSubject(newSubj);
    if (selectedStudent) {
      setReportLessonNumber(calculateNextLessonNumber(selectedStudent, newSubj));
      const matchSub = selectedStudent.subjects?.find(s => s.subject === newSubj);
      if (matchSub?.defaultDurationMinutes) {
        setReportDurationMinutes(matchSub.defaultDurationMinutes);
      }
    }
    const subjInst = findSubjectAiInstruction(
      settings.subjectDefaults,
      newSubj,
      settings.generalAiInstructions
    );
    setNewAiInstructions(subjInst);
  };

  const openNewReportModal = () => {
    if (!selectedStudent) return;
    const initialSubj = selectedStudent.subjects?.[0]?.subject || selectedStudent.subject || (isArabic ? "الرياضيات" : "Mathematics");
    const initialDur = selectedStudent.subjects?.find(s => s.subject === initialSubj)?.defaultDurationMinutes || selectedStudent.defaultDurationMinutes || 60;
    setReportSubject(initialSubj);
    setReportDate(new Date().toISOString().split("T")[0]);
    setReportDurationMinutes(initialDur);
    setReportLessonNumber(calculateNextLessonNumber(selectedStudent, initialSubj));
    setReportAttendance("present");
    setReportDeductCost(true);
    setReportHomeworkStatus("done");
    setAbsentNotes("");
    setClassEvents("");
    setHomeworkNotes("");
    setOverallEvaluation("");
    setNewGeneratedReportText("");
    setReportAttachment(null);

    const subjInst = findSubjectAiInstruction(
      settings.subjectDefaults,
      initialSubj,
      settings.generalAiInstructions
    );
    setNewAiInstructions(subjInst);
    setShowCreateReportForm(true);
  };

  const [isDraggingFileInProfile, setIsDraggingFileInProfile] = useState<boolean>(false);

  const formatFileSizeProfile = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProfileAttachmentMeta = (attachment: ReportAttachment) => {
    const ext = (attachment.fileExtension || attachment.fileName?.split(".").pop() || "").toLowerCase();
    const mime = (attachment.mimeType || "").toLowerCase();

    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "heic", "svg"].includes(ext)) {
      return {
        type: "image",
        label: isArabic ? "صورة" : "Image",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badgeColor: "bg-emerald-600 text-white",
        tag: "IMG"
      };
    }
    if (mime === "application/pdf" || ext === "pdf") {
      return {
        type: "pdf",
        label: isArabic ? "مستند PDF" : "PDF Document",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        badgeColor: "bg-rose-600 text-white",
        tag: "PDF"
      };
    }
    if (["pptx", "ppt"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint")) {
      return {
        type: "presentation",
        label: isArabic ? "عرض PowerPoint" : "PowerPoint",
        color: "bg-amber-50 text-amber-800 border-amber-200",
        badgeColor: "bg-amber-600 text-white",
        tag: "PPTX"
      };
    }
    if (["xlsx", "xls", "csv", "tsv", "ods"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) {
      return {
        type: "spreadsheet",
        label: isArabic ? "جدول Excel" : "Excel Sheet",
        color: "bg-teal-50 text-teal-800 border-teal-200",
        badgeColor: "bg-teal-700 text-white",
        tag: "XLSX"
      };
    }
    if (["docx", "doc"].includes(ext) || mime.includes("word") || mime.includes("wordprocessingml")) {
      return {
        type: "document",
        label: isArabic ? "مستند Word" : "Word Document",
        color: "bg-blue-50 text-blue-800 border-blue-200",
        badgeColor: "bg-blue-600 text-white",
        tag: "DOCX"
      };
    }
    if (["txt", "md", "json", "xml", "html", "rtf", "log"].includes(ext) || mime.startsWith("text/")) {
      return {
        type: "text",
        label: isArabic ? "ملف نصي" : "Text File",
        color: "bg-slate-50 text-slate-800 border-slate-200",
        badgeColor: "bg-slate-700 text-white",
        tag: ext.toUpperCase() || "TXT"
      };
    }
    return {
      type: "generic",
      label: isArabic ? "ملف مرفق" : "File Attachment",
      color: "bg-purple-50 text-purple-800 border-purple-200",
      badgeColor: "bg-purple-600 text-white",
      tag: ext ? ext.toUpperCase() : "FILE"
    };
  };

  const processSelectedFileInProfile = (file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert(isArabic ? "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 20 ميجابايت." : "File is too large. Max 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const parts = dataUrl.split(";base64,");
      if (parts.length === 2) {
        const mimeType = parts[0].replace("data:", "") || file.type || "application/octet-stream";
        const base64Data = parts[1];
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        setReportAttachment({
          fileName: file.name,
          mimeType,
          data: base64Data,
          fileSize: file.size,
          fileExtension: ext,
          previewUrl: mimeType.startsWith("image/") ? dataUrl : undefined
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFileInProfile(file);
    }
    e.target.value = "";
  };

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [curriculum, setCurriculum] = useState("منهج مصري (عربي)");
  const [parentContact, setParentContact] = useState("+20");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [notes, setNotes] = useState("");

  const createInitialSubject = (id: string, name: string = "الرياضيات"): StudentSubjectPlan => ({
    id,
    subject: name,
    studyType: "private",
    billingType: "monthly_elapsed_lessons",
    rateType: "per_lesson",
    lessonCost: 100,
    hourlyCost: 100,
    defaultDurationMinutes: 60,
    monthlyCost: 0,
    lessonsPerMonth: 8
  });

  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectPlan[]>([
    createInitialSubject("subj_1", "الرياضيات")
  ]);

  const handleAddSubjectField = () => {
    const nextIdx = studentSubjects.length + 1;
    const available = COMMON_SUBJECT_SUGGESTIONS.find(
      s => !studentSubjects.some(sub => sub.subject === s)
    ) || (isArabic ? `مادة ${nextIdx}` : `Subject ${nextIdx}`);
    setStudentSubjects(prev => [
      ...prev,
      createInitialSubject(`subj_${Date.now()}_${nextIdx}`, available)
    ]);
  };

  const handleRemoveSubjectField = (indexToRemove: number) => {
    if (studentSubjects.length <= 1) return;
    setStudentSubjects(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateSubjectField = (index: number, patch: Partial<StudentSubjectPlan>) => {
    setStudentSubjects(prev =>
      prev.map((sub, idx) => (idx === index ? { ...sub, ...patch } : sub))
    );
  };

  // Add Payment Modal inside Profile
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(100);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [studentPaymentAllocMode, setStudentPaymentAllocMode] = useState<"per_subject" | "single_subject" | "general">("general");
  const [studentPaymentAllocMap, setStudentPaymentAllocMap] = useState<Record<string, number>>({});
  const [studentPaymentSingleSubject, setStudentPaymentSingleSubject] = useState<string>("");

  const handleOpenStudentPaymentModal = (st: Student) => {
    const fin = calculateStudentFinancials(st, attendanceRecords, paymentTransactions);
    if (st.subjects && st.subjects.length > 1) {
      setStudentPaymentAllocMode("per_subject");
      const initMap: Record<string, number> = {};
      let sum = 0;
      st.subjects.forEach(sub => {
        const subDet = fin.subjectsDetails?.find(d => d.id === sub.id || d.subject === sub.subject);
        const due = subDet ? Math.max(0, subDet.amountDue) : 0;
        const defaultAmt = due > 0 ? due : (sub.billingType === "monthly" ? (sub.monthlyCost || 400) : (sub.lessonCost || 100));
        initMap[sub.id || sub.subject] = defaultAmt;
        sum += defaultAmt;
      });
      setStudentPaymentAllocMap(initMap);
      setPaymentAmount(sum);
      setStudentPaymentSingleSubject(st.subjects[0].id || st.subjects[0].subject);
    } else {
      setStudentPaymentAllocMode("general");
      const defaultAmt = fin.netBalance < 0 ? Math.abs(fin.netBalance) : (st.billingType === "monthly" ? (st.monthlyCost || 400) : (st.lessonCost || 100));
      setPaymentAmount(defaultAmt);
    }
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  // Add Exam Modal inside Profile
  const [showExamModal, setShowExamModal] = useState(false);
  const [examName, setExamName] = useState("اختبار شهر أسبوعي");
  const [score, setScore] = useState(45);
  const [totalScore, setTotalScore] = useState(50);
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);

  // Edit Student Modal inside Profile
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("");
  const [editCurriculum, setEditCurriculum] = useState("");
  const [editParentContact, setEditParentContact] = useState("+20");
  const [editWhatsappGroupLink, setEditWhatsappGroupLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStudentSubjects, setEditStudentSubjects] = useState<StudentSubjectPlan[]>([]);
  const [editApplyToPrevious, setEditApplyToPrevious] = useState<boolean>(true);
  const [showApplyConfirmDialog, setShowApplyConfirmDialog] = useState<boolean>(false);
  const [pendingStudentToSave, setPendingStudentToSave] = useState<Student | null>(null);

  const handleOpenEditStudent = (st: Student) => {
    const sanitized = sanitizeStudent(st);
    setSelectedStudent(sanitized);
    setEditFullName(sanitized.fullName || "");
    setEditStudentNumber(sanitized.studentNumber || "");
    setEditStudentPhone(sanitized.studentPhone || "");
    setEditAcademicYear(sanitized.academicYear || "");
    setEditCurriculum(sanitized.curriculum || "");
    setEditParentContact(sanitized.parentContact || "+20");
    setEditWhatsappGroupLink(sanitized.whatsappGroupLink || "");
    setEditNotes(sanitized.notes || "");
    setEditApplyToPrevious(true);
    setShowApplyConfirmDialog(false);
    setPendingStudentToSave(null);

    const effectiveBillingType: BillingType = sanitized.billingType || (sanitized.subjects && sanitized.subjects[0]?.billingType) || "monthly_elapsed_lessons";

    if (sanitized.subjects && sanitized.subjects.length > 0) {
      setEditStudentSubjects(
        sanitized.subjects.map(sub => ({
          ...sub,
          billingType: sub.billingType || effectiveBillingType,
          rateType: sub.rateType || sanitized.rateType || "per_lesson",
          lessonCost: sub.lessonCost !== undefined ? Number(sub.lessonCost) : (sanitized.lessonCost || 100),
          hourlyCost: sub.hourlyCost !== undefined ? Number(sub.hourlyCost) : (sanitized.hourlyCost || sub.lessonCost || 100),
          defaultDurationMinutes: sub.defaultDurationMinutes || sanitized.defaultDurationMinutes || 60,
          monthlyCost: sub.monthlyCost !== undefined ? Number(sub.monthlyCost) : (sub.billingType === "monthly" ? 400 : 0),
          lessonsPerMonth: sub.lessonsPerMonth || sanitized.lessonsPerMonth || 8
        }))
      );
    } else {
      setEditStudentSubjects([
        {
          id: `subj_edit_1`,
          subject: sanitized.subject || "الرياضيات",
          studyType: sanitized.studyType || "private",
          billingType: effectiveBillingType,
          rateType: sanitized.rateType || "per_lesson",
          lessonCost: sanitized.lessonCost || 100,
          hourlyCost: sanitized.hourlyCost || sanitized.lessonCost || 100,
          defaultDurationMinutes: sanitized.defaultDurationMinutes || 60,
          monthlyCost: sanitized.monthlyCost !== undefined ? Number(sanitized.monthlyCost) : (effectiveBillingType === "monthly" ? 400 : 0),
          lessonsPerMonth: sanitized.lessonsPerMonth || 8
        }
      ]);
    }

    setShowEditStudentModal(true);
  };

  const handleAddEditSubjectField = () => {
    const nextIdx = editStudentSubjects.length + 1;
    const available = COMMON_SUBJECT_SUGGESTIONS.find(
      s => !editStudentSubjects.some(sub => sub.subject === s)
    ) || (isArabic ? `مادة ${nextIdx}` : `Subject ${nextIdx}`);
    setEditStudentSubjects(prev => [
      ...prev,
      createInitialSubject(`subj_edit_${Date.now()}_${nextIdx}`, available)
    ]);
  };

  const handleRemoveEditSubjectField = (indexToRemove: number) => {
    if (editStudentSubjects.length <= 1) return;
    setEditStudentSubjects(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateEditSubjectField = (index: number, patch: Partial<StudentSubjectPlan>) => {
    setEditStudentSubjects(prev =>
      prev.map((sub, idx) => (idx === index ? { ...sub, ...patch } : sub))
    );
  };

  const handleSaveEditStudent = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudent) {
      alert(isArabic ? "لم يتم تحديد طالب للتعديل" : "No student selected for editing");
      return;
    }
    if (!editFullName.trim()) {
      alert(isArabic ? "يرجى كتابة اسم الطالب بالكامل" : "Please enter student full name");
      return;
    }

    const effectiveSubjects = editStudentSubjects.length > 0
      ? editStudentSubjects
      : [createInitialSubject(`subj_edit_${Date.now()}`, "عام")];

    const subjectsSummary = effectiveSubjects.map(s => s.subject.trim()).filter(Boolean).join(" + ") || "عام";
    const primaryStudyType = effectiveSubjects.some(s => s.studyType === "group") ? "group" : "private";
    const primarySub = effectiveSubjects[0];

    const rawUpdated: Student = {
      ...selectedStudent,
      fullName: editFullName.trim(),
      studentNumber: editStudentNumber.trim() || undefined,
      studentPhone: editStudentPhone.trim() || undefined,
      academicYear: editAcademicYear.trim() || undefined,
      curriculum: editCurriculum.trim() || undefined,
      parentContact: editParentContact.trim(),
      whatsappGroupLink: editWhatsappGroupLink.trim() || undefined,
      studyType: primaryStudyType,
      subject: subjectsSummary,
      subjects: effectiveSubjects,
      billingType: primarySub.billingType || selectedStudent.billingType || "monthly_elapsed_lessons",
      rateType: primarySub.rateType || "per_lesson",
      lessonCost: primarySub.lessonCost !== undefined ? Number(primarySub.lessonCost) : 100,
      hourlyCost: primarySub.hourlyCost !== undefined ? Number(primarySub.hourlyCost) : (primarySub.lessonCost || 100),
      defaultDurationMinutes: primarySub.defaultDurationMinutes || 60,
      monthlyCost: primarySub.monthlyCost !== undefined ? Number(primarySub.monthlyCost) : 0,
      lessonsPerMonth: primarySub.lessonsPerMonth || 8,
      notes: editNotes
    };

    const sanitizedUpdated = sanitizeStudent(rawUpdated);
    
    if (onEditStudent) {
      onEditStudent(selectedStudent.id, sanitizedUpdated, editApplyToPrevious);
    }
    setSelectedStudent(sanitizedUpdated);
    setShowEditStudentModal(false);
    setShowApplyConfirmDialog(false);
    setPendingStudentToSave(null);
  };

  const confirmExecuteSaveStudent = (applyToPrevious: boolean) => {
    if (!pendingStudentToSave || !selectedStudent) return;
    if (onEditStudent) {
      onEditStudent(selectedStudent.id, pendingStudentToSave, applyToPrevious);
    }
    setSelectedStudent(pendingStudentToSave);
    setShowApplyConfirmDialog(false);
    setShowEditStudentModal(false);
    setPendingStudentToSave(null);
  };

  // Delete Student Confirmation Dialog State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const handleDeleteStudentClick = (st: Student) => {
    setStudentToDelete(st);
  };

  // Set of student IDs that belong to any combined group
  const bundledStudentIdSet = new Set<string>();
  (combinedStudentGroups || []).forEach(cg => {
    (cg?.studentIds || []).forEach(id => bundledStudentIdSet.add(id));
  });

  // Filter combined groups according to search & filters
  const filteredCombinedGroups = (combinedStudentGroups || []).filter(cg => {
    const groupStudents = (students || []).filter(s => s && (cg?.studentIds || []).includes(s.id));
    if (groupStudents.length === 0) return false;

    if (filterStatus === "active" && !groupStudents.some(s => s.status === "active")) return false;
    if (filterStatus === "stopped" && !groupStudents.some(s => s.status === "stopped")) return false;
    if (filterCurriculum !== "all" && !groupStudents.some(s => s.curriculum === filterCurriculum)) return false;
    if (filterGrade !== "all" && !groupStudents.some(s => s.academicYear === filterGrade)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cg.name.toLowerCase().includes(q);
      const matchNotes = cg.notes ? cg.notes.toLowerCase().includes(q) : false;
      const matchContact = cg.sharedParentContact ? cg.sharedParentContact.includes(q) : false;
      const matchStudent = groupStudents.some(
        s =>
          s.fullName.toLowerCase().includes(q) ||
          s.subject.toLowerCase().includes(q) ||
          (s.academicYear && s.academicYear.toLowerCase().includes(q)) ||
          (s.curriculum && s.curriculum.toLowerCase().includes(q)) ||
          (s.studentPhone && s.studentPhone.includes(q)) ||
          (s.parentContact && s.parentContact.includes(q))
      );
      return matchName || matchNotes || matchContact || matchStudent;
    }
    return true;
  });

  // Filter standalone unbundled students (students that are NOT in a combined group)
  const filteredStudents = students.filter(s => {
    if (bundledStudentIdSet.has(s.id)) return false; // Hidden from standalone list as requested!
    if (filterStatus === "active" && s.status !== "active") return false;
    if (filterStatus === "stopped" && s.status !== "stopped") return false;
    if (filterCurriculum !== "all" && s.curriculum !== filterCurriculum) return false;
    if (filterGrade !== "all" && s.academicYear !== filterGrade) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        (s.academicYear && s.academicYear.toLowerCase().includes(q)) ||
        (s.curriculum && s.curriculum.toLowerCase().includes(q)) ||
        (s.studentPhone && s.studentPhone.includes(q)) ||
        (s.parentContact && s.parentContact.includes(q))
      );
    }
    return true;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || studentSubjects.length === 0) return;

    const subjectsSummary = studentSubjects.map(s => s.subject.trim()).filter(Boolean).join(" + ") || "عام";
    const primaryStudyType = studentSubjects.some(s => s.studyType === "group") ? "group" : "private";
    const primarySub = studentSubjects[0];

    onAddStudent({
      fullName: fullName.trim(),
      studentNumber: studentNumber.trim() || undefined,
      studentPhone: studentPhone.trim() || undefined,
      academicYear: academicYear.trim() || undefined,
      curriculum: curriculum.trim() || undefined,
      parentContact: parentContact.trim(),
      whatsappGroupLink: whatsappGroupLink.trim() || undefined,
      studyType: primaryStudyType,
      subject: subjectsSummary,
      subjects: studentSubjects,
      status: "active",
      paymentStatus: "unpaid",
      totalPaidAmount: 0,
      billingType: primarySub.billingType || "monthly_elapsed_lessons",
      rateType: primarySub.rateType || "per_lesson",
      lessonCost: primarySub.lessonCost !== undefined ? Number(primarySub.lessonCost) : 100,
      hourlyCost: primarySub.hourlyCost !== undefined ? Number(primarySub.hourlyCost) : (primarySub.lessonCost || 100),
      defaultDurationMinutes: primarySub.defaultDurationMinutes || 60,
      monthlyCost: primarySub.monthlyCost !== undefined ? Number(primarySub.monthlyCost) : (primarySub.billingType === "monthly" ? 400 : 0),
      lessonsPerMonth: primarySub.lessonsPerMonth || 8,
      remainingLessons: 0,
      remainingBalance: 0,
      notes
    });

    setShowAddStudentModal(false);
    resetAddStudentForm();
  };

  const resetAddStudentForm = () => {
    setFullName("");
    setStudentNumber("");
    setStudentPhone("");
    setAcademicYear("");
    setCurriculum("منهج مصري (عربي)");
    setParentContact("+20");
    setWhatsappGroupLink("");
    setNotes("");
    setStudentSubjects([createInitialSubject("subj_1", "الرياضيات")]);
  };

  // Helper for WhatsApp Phone Formatting (Supports Egypt 01X and International formats)
  const formatWhatsAppPhone = (phone?: string): string => {
    if (!phone) return "";
    let digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 11 && digits.startsWith("01")) {
      digits = "20" + digits.substring(1);
    }
    return digits;
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || paymentAmount <= 0) return;

    if (selectedStudent.subjects && selectedStudent.subjects.length > 1 && studentPaymentAllocMode === "per_subject") {
      const allocations: SubjectPaymentAllocation[] = Object.entries(studentPaymentAllocMap)
        .filter(([_, val]) => Number(val) > 0)
        .map(([idOrName, val]) => {
          const sub = selectedStudent.subjects?.find(s => s.id === idOrName || s.subject === idOrName);
          return {
            subjectId: sub?.id,
            subjectName: sub?.subject || idOrName,
            amount: Number(val)
          };
        });
      onRecordPayment(selectedStudent.id, paymentAmount, paymentNotes, paymentDate, allocations);
    } else if (selectedStudent.subjects && selectedStudent.subjects.length > 1 && studentPaymentAllocMode === "single_subject") {
      onRecordPayment(selectedStudent.id, paymentAmount, paymentNotes, paymentDate, undefined, studentPaymentSingleSubject);
    } else {
      onRecordPayment(selectedStudent.id, paymentAmount, paymentNotes, paymentDate);
    }

    setShowPaymentModal(false);
    
    // Update local copy of selectedStudent for UI refresh
    const newTotalPaid = (selectedStudent.totalPaidAmount || 0) + paymentAmount;
    setSelectedStudent({
      ...selectedStudent,
      totalPaidAmount: newTotalPaid
    });
    setPaymentNotes("");
  };

  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !examName.trim()) return;
    if (onAddExamRecord) {
      onAddExamRecord(selectedStudent.id, examName, score, totalScore, examDate);
    }
    setShowExamModal(false);
  };

  // WhatsApp helper
  const openWhatsApp = (phone: string) => {
    const cleanPhone = formatWhatsAppPhone(phone);
    if (!cleanPhone) return;
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  // Standalone Full-Page Student Personal Report View
  if (studentForPersonalReport) {
    return (
      <StudentPersonalReportView
        student={studentForPersonalReport}
        settings={settings}
        reports={reports}
        attendanceRecords={attendanceRecords}
        isArabic={isArabic}
        onBack={() => setStudentForPersonalReport(null)}
        onAddReport={onAddReport}
        onDeleteReport={onDeleteReport}
        onToggleArchiveReport={onToggleArchiveReport}
        onArchiveEndedCycle={onArchiveEndedCycle}
        onGenerateReportAi={onGenerateReportAi}
      />
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {isArabic ? "دليل الطلاب والمتابعة" : "Student Directory"}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                {filteredStudents.length} / {students.length} {isArabic ? "طالب" : "students"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {isArabic
                ? "متابعة شاملة لبيانات الطلاب، الحضور والغياب، المناهج، والوضع المالي."
                : "Manage student records, attendance, curriculum, and financial balances."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewLayout("grid")}
              title={isArabic ? "عرض البطاقات الشبكية" : "Grid View"}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewLayout === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{isArabic ? "بطاقات" : "Grid"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("table")}
              title={isArabic ? "عرض الجدول التفصيلي" : "Table View"}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewLayout === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{isArabic ? "جدول" : "Table"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setInitialMergeStudentIds([]);
              setShowCreateCombinedGroupModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition flex items-center gap-1.5"
            title={isArabic ? "دمج أكثر من ملف طالب في ملف مجمع موحد وشامل" : "Combine Student Files"}
          >
            <Users className="w-4 h-4" />
            <span>{isArabic ? "دمج ملفات طلاب" : "Combine Files"}</span>
            {combinedStudentGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-800 text-[10px]">
                {combinedStudentGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowAddStudentModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? "إضافة طالب" : "Add Student"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-2.5 py-1 rounded-xl font-bold text-xs transition ${
              filterStatus === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {isArabic ? "الكل" : "All"} ({students.length})
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              filterStatus === "active"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isArabic ? "النشطون" : "Active"}</span>
          </button>
          <button
            onClick={() => setFilterStatus("stopped")}
            className={`px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              filterStatus === "stopped"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{isArabic ? "المتوقفون" : "Stopped"}</span>
          </button>

          {/* Curriculum Filter */}
          <select
            value={filterCurriculum}
            onChange={e => setFilterCurriculum(e.target.value)}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">{isArabic ? "🌍 كل المناهج" : "All Curricula"}</option>
            {COMMON_CURRICULUMS.map(c => (
              <option key={c.label} value={c.label}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value)}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">{isArabic ? "🎓 كل الصفوف" : "All Grades"}</option>
            {COMMON_GRADES.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isArabic ? "بحث بالاسم، المنهج، الصف، الهاتف..." : "Search student, curriculum, grade, phone..."}
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* View Rendering: Grid vs Table */}
      {filteredStudents.length === 0 && filteredCombinedGroups.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200/80 rounded-2xl">
          <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs font-bold text-slate-600">
            {isArabic ? "لا يوجد طلاب أو ملفات مجمعة تطابق خيارات البحث." : "No students or combined files found."}
          </p>
        </div>
      ) : viewLayout === "grid" ? (
        /* Student Cards Grid - High Density Multi-Col Responsive Bento */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5">
          {/* 1. Combined Student Groups */}
          {filteredCombinedGroups.map(cg => {
            const groupStudents = students.filter(s => (cg.studentIds || []).includes(s.id));
            const groupFinancials = calculateCombinedGroupFinancials(groupStudents, attendanceRecords, paymentTransactions, reports);

            return (
              <div
                key={cg.id}
                onClick={() => setSelectedCombinedGroup(cg)}
                className="bg-gradient-to-b from-purple-50/60 via-white to-white border-2 border-purple-200/90 hover:border-purple-400 rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      <span>{isArabic ? "ملف مجمع" : "Combined"}</span>
                      <span className="bg-purple-200 text-purple-900 px-1 rounded-full text-[7.5px] font-mono">{groupStudents.length}</span>
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black shrink-0 ${
                        groupFinancials.netBalance >= 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {groupFinancials.netBalance >= 0
                        ? (isArabic ? "خالص / فائض" : "Paid")
                        : (isArabic ? `متبقي ${Math.abs(groupFinancials.netBalance)} ج.م` : `Due ${Math.abs(groupFinancials.netBalance)}`)}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-purple-700 transition line-clamp-1 flex items-center gap-1">
                    <span>📁</span>
                    <span>{cg.name}</span>
                  </h3>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {groupStudents.map(st => (
                      <span
                        key={st.id}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-50/90 border border-purple-100 text-purple-900 text-[8.5px] font-bold"
                      >
                        <span>👤</span>
                        <span className="truncate max-w-[80px]">{st.fullName.split(" ")[0]}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-purple-100/70 grid grid-cols-2 gap-1 text-[9.5px]">
                    <div className="bg-slate-50 p-1 rounded-lg">
                      <div className="text-[8px] text-slate-400 font-bold">{isArabic ? "الحصص والساعات" : "Lessons & Hours"}</div>
                      <div className="font-black text-slate-800 font-mono text-[9px]">{groupFinancials.totalAttendedLessons} {isArabic ? "حصة" : "lss"} • {groupFinancials.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}</div>
                    </div>
                    <div className="bg-slate-50 p-1 rounded-lg">
                      <div className="text-[8px] text-slate-400 font-bold">{isArabic ? "المدفوع الكلي" : "Total Paid"}</div>
                      <div className="font-black text-emerald-700 font-mono">{groupFinancials.totalPaidAmount} ج.م</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCombinedGroup(cg);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>{isArabic ? "عرض الملف المجمع" : "Open File"}</span>
                  </button>

                  {cg.sharedParentContact && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsApp(cg.sharedParentContact!);
                      }}
                      title={isArabic ? "مراسلة ولي الأمر بالواتساب" : "WhatsApp Parent"}
                      className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* 2. Standalone Students */}
          {filteredStudents.map(student => {
            const isStopped = student.status === "stopped";
            const finSummary = calculateStudentFinancials(student, attendanceRecords, paymentTransactions, reports);

            return (
              <div
                key={student.id}
                className={`bg-white border rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isStopped ? "border-slate-200 opacity-75 bg-slate-50/60" : "border-slate-200/90 hover:border-blue-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black flex items-center gap-1 truncate ${
                        isStopped
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isStopped ? "bg-slate-400" : "bg-emerald-500"
                        }`}
                      />
                      <span className="truncate">{isStopped ? (isArabic ? "متوقف" : "Stopped") : (isArabic ? "نشط" : "Active")}</span>
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black shrink-0 ${
                        finSummary.statusBadge.color === "emerald"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : finSummary.statusBadge.color === "amber"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : finSummary.statusBadge.color === "blue"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isArabic ? finSummary.statusBadge.labelAr : finSummary.statusBadge.labelEn}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-snug">
                    {student.fullName}
                  </h3>

                  {/* Academic Year & Curriculum Badges */}
                  {(student.academicYear || student.curriculum) && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {student.academicYear && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-900 text-[8.5px] font-bold">
                          <span>🎓</span>
                          <span className="truncate max-w-[95px]">{student.academicYear}</span>
                        </span>
                      )}
                      {student.curriculum && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[8.5px] font-bold">
                          <span>📖</span>
                          <span className="truncate max-w-[80px]">{student.curriculum}</span>
                        </span>
                      )}
                    </div>
                  )}
                  
                  {student.subjects && student.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.subjects.map((sub, sIdx) => (
                        <span
                          key={sub.id || sIdx}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50/80 border border-blue-200/60 text-blue-800 text-[8.5px] font-bold"
                        >
                          <span>{sub.studyType === "group" ? "👥" : "👤"}</span>
                          <span className="truncate max-w-[65px]">{sub.subject}</span>
                          <span className="text-blue-500 font-mono text-[7.5px]">({sub.lessonCost})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-blue-600 mt-0.5 truncate">
                      {student.subject}
                    </div>
                  )}

                  <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1 text-slate-600 text-[9.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isArabic ? "ولي الأمر:" : "Parent:"}</span>
                      <span className="font-mono font-bold text-slate-800 dir-ltr truncate max-w-[85px]">{student.parentContact}</span>
                    </div>

                    {student.studentPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isArabic ? "هاتف الطالب:" : "Student:"}</span>
                        <span className="font-mono font-bold text-slate-700 dir-ltr truncate max-w-[85px]">{student.studentPhone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isArabic ? "الحصص والساعات:" : "Lessons & Hours:"}</span>
                      <span className="font-bold text-blue-700">
                        {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lss"} • {finSummary.totalTaughtHours ?? Number(((finSummary.totalAttendedLessons * 60) / 60).toFixed(1))} {isArabic ? "ساعة" : "hrs"} ({finSummary.totalAccruedCost} ج.م)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{isArabic ? "الحساب:" : "Net:"}</span>
                      <span className={`font-black ${finSummary.amountDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                        {finSummary.amountDue > 0
                          ? `مستحق ${finSummary.amountDue} ج.م`
                          : finSummary.creditRemaining > 0
                          ? `رصيد +${finSummary.creditRemaining} ج.م`
                          : (isArabic ? "مسدد" : "Settled")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setProfileTab("finance");
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition shadow-2xs text-center truncate"
                  >
                    {isArabic ? "ملف الطالب" : "Profile"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInitialMergeStudentIds([student.id]);
                      setShowCreateCombinedGroupModal(true);
                    }}
                    title={isArabic ? "دمج هذا الطالب في ملف مجمع مع طلاب آخرين" : "Merge Student"}
                    className="p-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shrink-0"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentForPersonalReport(student)}
                    title={isArabic ? "فتح صفحة التقرير الشخصي المستقلة" : "Personal Report"}
                    className="py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition shadow-2xs text-center flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{isArabic ? "تقرير شخصي" : "Report"}</span>
                  </button>

                  <button
                    onClick={() => openWhatsApp(student.parentContact)}
                    title={isArabic ? "تواصل عبر واتساب" : "WhatsApp"}
                    className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentToDelete(student);
                    }}
                    title={isArabic ? "حذف الطالب نهائياً" : "Delete Student"}
                    className="p-1 rounded-lg bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full-Width Spreadsheet Table View */
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">{isArabic ? "اسم الطالب" : "Student Name"}</th>
                  <th className="py-2.5 px-3">{isArabic ? "الصف والمنهج" : "Grade & Curriculum"}</th>
                  <th className="py-2.5 px-3">{isArabic ? "المواد والنوع" : "Subjects"}</th>
                  <th className="py-2.5 px-3">{isArabic ? "الهواتف والاتصال" : "Contact Numbers"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الحصص والساعات" : "Lessons & Hours"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الموقف المالي" : "Financial Status"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Combined Student Groups Rows */}
                {filteredCombinedGroups.map((cg) => {
                  const groupStudents = students.filter(s => (cg.studentIds || []).includes(s.id));
                  const groupFinancials = calculateCombinedGroupFinancials(groupStudents, attendanceRecords, paymentTransactions);

                  return (
                    <tr
                      key={cg.id}
                      onClick={() => setSelectedCombinedGroup(cg)}
                      className="bg-purple-50/40 hover:bg-purple-100/60 border-y-2 border-purple-100 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-purple-600 font-black">
                        📁
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-purple-950 text-xs">{cg.name}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-200/80 text-purple-900 font-bold text-[9px]">
                            {isArabic ? `${groupStudents.length} طلاب` : `${groupStudents.length} students`}
                          </span>
                        </div>
                        <div className="text-[10px] text-purple-700 flex flex-wrap gap-1 mt-0.5">
                          {groupStudents.map(s => s.fullName).join(" • ")}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-900 text-[10px] font-bold">
                          <span>👥</span>
                          <span>{isArabic ? "ملف طلاب مجمع" : "Combined File"}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {groupStudents.map(s => (
                            <span key={s.id} className="px-1.5 py-0.5 rounded bg-white text-slate-700 text-[9.5px] border border-purple-200">
                              {s.subject}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {cg.sharedParentContact ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-sans">{isArabic ? "ولي الأمر:" : "Parent:"}</span>
                            <span className="font-bold text-slate-800 dir-ltr">{cg.sharedParentContact}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-purple-900">
                        <div>{groupFinancials.totalAttendedLessons} {isArabic ? "حصة" : "lss"}</div>
                        <div className="text-[10px] text-indigo-700 font-bold">⏱️ {groupFinancials.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          groupFinancials.netBalance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {groupFinancials.netBalance >= 0
                            ? (isArabic ? "خالص / فائض" : "Paid")
                            : (isArabic ? `متبقي ${Math.abs(groupFinancials.netBalance)} ج.م` : `Due ${Math.abs(groupFinancials.netBalance)}`)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[9.5px]">
                          {isArabic ? "مجمع" : "Combined"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCombinedGroup(cg)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] transition shadow-2xs flex items-center gap-1"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>{isArabic ? "الملف المجمع" : "Open Group"}</span>
                          </button>

                          {cg.sharedParentContact && (
                            <button
                              onClick={() => openWhatsApp(cg.sharedParentContact!)}
                              title={isArabic ? "واتساب" : "WhatsApp"}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* 2. Standalone Students Rows */}
                {filteredStudents.map((student, idx) => {
                  const isStopped = student.status === "stopped";
                  const finSummary = calculateStudentFinancials(student, attendanceRecords, paymentTransactions);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-blue-50/40 transition ${
                        isStopped ? "bg-slate-50/50 text-slate-500" : ""
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {student.fullName}
                        </div>
                        {student.studentNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            #{student.studentNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {student.academicYear ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70 text-[9.5px] font-bold">
                              <span>🎓</span>
                              <span>{student.academicYear}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                          {student.curriculum && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200/70 text-[9.5px] font-bold">
                              <span>📖</span>
                              <span>{student.curriculum}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        {student.subjects && student.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.subjects.map((sub, sIdx) => (
                              <span
                                key={sub.id || sIdx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium"
                              >
                                <span>{sub.studyType === "group" ? "👥" : "👤"}</span>
                                <span className="font-bold">{sub.subject}</span>
                                <span className="text-blue-600 font-mono text-[9px]">({sub.lessonCost} ج.م)</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-700 font-bold">{student.subject}</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-sans">{isArabic ? "ولي الأمر:" : "Parent:"}</span>
                          <span className="font-bold text-slate-800 dir-ltr">{student.parentContact}</span>
                        </div>
                        {student.studentPhone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-[10px] text-slate-400 font-sans">{isArabic ? "الطالب:" : "Student:"}</span>
                            <span className="dir-ltr">{student.studentPhone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className="font-bold text-blue-700">
                          {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lss"}
                        </span>
                        <div className="text-[10px] text-indigo-700 font-bold">
                          ⏱️ {finSummary.totalTaughtHours ?? Number(((finSummary.totalAttendedLessons * 60) / 60).toFixed(1))} {isArabic ? "ساعة" : "hrs"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {finSummary.totalAccruedCost} ج.م
                        </div>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            finSummary.amountDue > 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : finSummary.creditRemaining > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {finSummary.amountDue > 0
                            ? `مستحق ${finSummary.amountDue} ج.م`
                            : finSummary.creditRemaining > 0
                            ? `رصيد +${finSummary.creditRemaining} ج.م`
                            : (isArabic ? "مسدد بالكامل" : "Settled")}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isStopped
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isStopped ? "bg-slate-400" : "bg-emerald-500"}`} />
                          <span>{isStopped ? (isArabic ? "متوقف" : "Stopped") : (isArabic ? "نشط" : "Active")}</span>
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setProfileTab("finance");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10.5px] transition shadow-2xs"
                          >
                            {isArabic ? "الملف" : "Profile"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInitialMergeStudentIds([student.id]);
                              setShowCreateCombinedGroupModal(true);
                            }}
                            title={isArabic ? "دمج هذا الطالب في ملف مجمع" : "Merge Student"}
                            className="p-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentForPersonalReport(student)}
                            title={isArabic ? "فتح صفحة التقرير الشخصي المستقلة" : "Personal Report"}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] transition shadow-2xs flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{isArabic ? "تقرير شخصي" : "Report"}</span>
                          </button>
                          <button
                            onClick={() => openWhatsApp(student.parentContact)}
                            title={isArabic ? "واتساب" : "WhatsApp"}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToDelete(student);
                            }}
                            title={isArabic ? "حذف الطالب" : "Delete Student"}
                            className="p-1 rounded-lg bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Student - Ultra Space Optimized Bento Layout */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {isArabic ? "إضافة طالب جديد" : "Add New Student"}
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {isArabic ? "تسجيل بيانات الطالب والمواد الدراسية ونظام الدفع" : "Register student info and multi-subject payment plans"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs mt-3">
              {/* Top Compact Student Info Grid */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "اسم الطالب بالكامل *" : "Student Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder={isArabic ? "مثال: أحمد محمد علي" : "e.g. Ahmed Mohamed"}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رقم ولي الأمر (واتساب) *" : "Parent WhatsApp Number *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={parentContact}
                      onChange={e => setParentContact(e.target.value)}
                      placeholder="+201000000000"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500 dir-ltr text-right"
                    />
                  </div>
                </div>

                {/* Grade & Curriculum Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      🎓 {isArabic ? "الصف الدراسي / المرحلة" : "Academic Grade / Year"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={COMMON_GRADES.includes(academicYear) ? academicYear : (academicYear ? "other" : "")}
                        onChange={e => {
                          if (e.target.value === "other") {
                            setAcademicYear("");
                          } else {
                            setAcademicYear(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="">{isArabic ? "-- اختر الصف الدراسي --" : "-- Select Grade --"}</option>
                        {COMMON_GRADES.map(g => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                        <option value="other">{isArabic ? "✏️ كتابة صف آخر يدوياً..." : "✏️ Custom Grade..."}</option>
                      </select>

                      {(!COMMON_GRADES.includes(academicYear) || academicYear === "") && (
                        <input
                          type="text"
                          value={academicYear}
                          onChange={e => setAcademicYear(e.target.value)}
                          placeholder={isArabic ? "أو اكتب الصف (مثال: الصف الثاني الثانوي - علمي)" : "Or type custom grade..."}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      🌍 {isArabic ? "المنهج الدراسي (مصري، سعودي...)" : "Curriculum System"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={COMMON_CURRICULUMS.some(c => c.label === curriculum) ? curriculum : (curriculum ? "other" : "")}
                        onChange={e => {
                          if (e.target.value === "other") {
                            setCurriculum("");
                          } else {
                            setCurriculum(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="">{isArabic ? "-- اختر المنهج --" : "-- Select Curriculum --"}</option>
                        {COMMON_CURRICULUMS.map(c => (
                          <option key={c.label} value={c.label}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                        <option value="other">{isArabic ? "✏️ كتابة منهج آخر يدوياً..." : "✏️ Custom Curriculum..."}</option>
                      </select>

                      {(!COMMON_CURRICULUMS.some(c => c.label === curriculum) || curriculum === "") && (
                        <input
                          type="text"
                          value={curriculum}
                          onChange={e => setCurriculum(e.target.value)}
                          placeholder={isArabic ? "اكتب اسم المنهج (مثال: منهج سعودي - مقررات)" : "Or type custom curriculum..."}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      📱 {isArabic ? "هاتف الطالب (اختياري)" : "Student Phone"}
                    </label>
                    <input
                      type="text"
                      value={studentPhone}
                      onChange={e => setStudentPhone(e.target.value)}
                      placeholder="+201..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500 dir-ltr text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "كود الطالب (اختياري)" : "Student ID (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={studentNumber}
                      onChange={e => setStudentNumber(e.target.value)}
                      placeholder="STU-001"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رابط جروب الواتساب (اختياري)" : "WhatsApp Group Link"}
                    </label>
                    <input
                      type="url"
                      value={whatsappGroupLink}
                      onChange={e => setWhatsappGroupLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 text-left dir-ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Subject Builder Section - Space Efficient Bento Rows */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isArabic ? "المواد الدراسية ونظام الدفع لكل مادة" : "Subjects & Payment Plans"}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[9.5px] font-bold">
                      {studentSubjects.length}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddSubjectField}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isArabic ? "+ مادة أخرى" : "+ Subject"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {studentSubjects.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 relative transition-all"
                    >
                      {/* Row 1: Subject Name + Suggestions + Study Type + Delete */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={sub.subject}
                            onChange={e => handleUpdateSubjectField(idx, { subject: e.target.value })}
                            placeholder={isArabic ? "اكتب اسم المادة (مثال: فيزياء، لغة عربية، كيمياء...)" : "Subject name (e.g. Physics, Arabic, Math...)"}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
                          />
                          {/* Quick Subject Suggestion Chips */}
                          <div className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5 max-w-xs">
                            {COMMON_SUBJECT_SUGGESTIONS.slice(0, 5).map(sugg => (
                              <button
                                key={sugg}
                                type="button"
                                onClick={() => handleUpdateSubjectField(idx, { subject: sugg })}
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition shrink-0 ${
                                  sub.subject === sugg
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {sugg}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Controls: Study Type & Delete */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {/* Study Type Segmented Control */}
                          <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleUpdateSubjectField(idx, { studyType: "private" })}
                              className={`px-2 py-0.5 rounded-md transition ${
                                sub.studyType === "private"
                                  ? "bg-white text-blue-700 shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              👤 {isArabic ? "خاص" : "Private"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSubjectField(idx, { studyType: "group" })}
                              className={`px-2 py-0.5 rounded-md transition ${
                                sub.studyType === "group"
                                  ? "bg-white text-blue-700 shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              👥 {isArabic ? "مجموعة" : "Group"}
                            </button>
                          </div>

                          {studentSubjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectField(idx)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                              title={isArabic ? "حذف المادة" : "Remove"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Billing Type Selection */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-600" />
                          <span>{isArabic ? "طريقة الدفع والمحاسبة للمادة:" : "Billing Method for Subject:"}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { billingType: "monthly_elapsed_lessons" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              (sub.billingType || "monthly_elapsed_lessons") === "monthly_elapsed_lessons"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>🗓️ {isArabic ? "حساب آخر الشهر (حصص منقضية)" : "Elapsed Month Lessons"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "حسب الحصص والساعات الفعلية" : "Based on actual lessons & hours"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { billingType: "monthly" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              sub.billingType === "monthly"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>📅 {isArabic ? "الشهر كامل" : "Full Month"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "اشتراك شهري ثابت (سعر محدد)" : "Flat Monthly Subscription"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { billingType: "monthly_fixed_lessons" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              sub.billingType === "monthly_fixed_lessons"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>🎯 {isArabic ? "باقة حصص محددة" : "Fixed Lessons / Mo"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "عدد حصص ثابت شهرياً" : "Set Lessons Count"}</span>
                          </button>
                        </div>

                        {/* Cost Inputs matching selected billing mode */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Case 1: Full Month - Monthly Cost with Division Option */}
                          {sub.billingType === "monthly" && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-blue-200/80 shadow-2xs">
                                  <span className="text-xs font-bold text-slate-700 shrink-0">
                                    {isArabic ? "سعر الاشتراك للشهر الكامل:" : "Full Month Cost:"}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    required
                                    value={sub.monthlyCost || 400}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const lessonsCount = sub.lessonsPerMonth || 4;
                                      handleUpdateSubjectField(idx, {
                                        monthlyCost: val,
                                        lessonCost: Math.max(0, Number((val / lessonsCount).toFixed(2)))
                                      });
                                    }}
                                    className="w-full font-black text-blue-900 text-sm focus:outline-none"
                                    placeholder="400"
                                  />
                                  <span className="text-xs font-bold text-blue-600 shrink-0">{isArabic ? "ج.م / شهر" : "EGP / month"}</span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "عدد الحصص المقسم عليها:" : "Expected Lessons:"}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={sub.lessonsPerMonth || 4}
                                    onChange={e => {
                                      const count = Math.max(1, Number(e.target.value) || 1);
                                      const mCost = sub.monthlyCost || 400;
                                      handleUpdateSubjectField(idx, {
                                        lessonsPerMonth: count,
                                        lessonCost: Math.max(0, Number((mCost / count).toFixed(2)))
                                      });
                                    }}
                                    className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                    placeholder="4"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "حصة" : "lessons"}</span>
                                </div>
                              </div>

                              {/* Duration open input for monthly */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 15, 20, 25, 30, 45, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => handleUpdateSubjectField(idx, { defaultDurationMinutes: dur })}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                                <span className="font-bold text-slate-700 text-[11px]">
                                  {isArabic ? "➗ قيمة الحصة المحسوبة بالتقسيم:" : "Calculated Lesson Rate:"}
                                </span>
                                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs text-[11px]">
                                  = {sub.lessonCost} {isArabic ? "ج.م / حصة" : "EGP / lesson"} ({sub.monthlyCost || 400} ÷ {sub.lessonsPerMonth || 4}) | {sub.defaultDurationMinutes || 60} {isArabic ? "دقيقة" : "min"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Case 2: Calendar Elapsed Lessons - Lesson / Hourly Cost */}
                          {(sub.billingType === "monthly_elapsed_lessons" || (!sub.billingType && sub.billingType !== "monthly_fixed_lessons")) && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "طريقة التسعير:" : "Pricing Basis:"}
                                  </span>
                                  <select
                                    value={sub.rateType || "per_lesson"}
                                    onChange={e => {
                                      const newRateType = e.target.value as "per_lesson" | "per_hour";
                                      const currentHourly = sub.hourlyCost || sub.lessonCost || 100;
                                      const dur = sub.defaultDurationMinutes || 60;
                                      const calculatedLessonCost = newRateType === "per_hour" ? Math.max(0, Number(((currentHourly * dur) / 60).toFixed(2))) : sub.lessonCost;
                                      handleUpdateSubjectField(idx, {
                                        rateType: newRateType,
                                        hourlyCost: currentHourly,
                                        defaultDurationMinutes: dur,
                                        lessonCost: calculatedLessonCost
                                      });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="per_lesson">{isArabic ? "💵 سعر الحصة" : "💵 Price per Lesson"}</option>
                                    <option value="per_hour">{isArabic ? "⏱️ سعر الساعة" : "⏱️ Price per Hour"}</option>
                                  </select>
                                </div>

                                {sub.rateType === "per_hour" ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الساعة:" : "Hourly Rate:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.hourlyCost || sub.lessonCost || 100}
                                      onChange={e => {
                                        const hCost = parseFloat(e.target.value) || 0;
                                        const dur = sub.defaultDurationMinutes || 60;
                                        const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                        handleUpdateSubjectField(idx, {
                                          hourlyCost: hCost,
                                          lessonCost: lCost
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/ساعة" : "EGP/h"}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الحصة:" : "Lesson Cost:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.lessonCost}
                                      onChange={e => {
                                        const cost = parseFloat(e.target.value) || 0;
                                        handleUpdateSubjectField(idx, {
                                          lessonCost: cost,
                                          hourlyCost: cost
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/حصة" : "EGP"}</span>
                                  </div>
                                )}
                              </div>

                              {/* Duration open input for elapsed lessons */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 15, 20, 25, 30, 45, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => {
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                                <span className="font-bold text-slate-700 text-[11px]">
                                  {sub.rateType === "per_hour" ? (isArabic ? "⏱️ سعر الحصة المحسوب بالساعة:" : "Calculated Lesson Price:") : (isArabic ? "💵 تفاصيل سعر الحصة:" : "Lesson Price Breakdown:")}
                                </span>
                                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs text-[11px]">
                                  {sub.rateType === "per_hour"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م لكل حصة" : "EGP / lesson"} (${sub.hourlyCost || 100} ج.م/س × ${sub.defaultDurationMinutes || 60} دقيقة)`
                                    : `= ${sub.lessonCost} ${isArabic ? "ج.م لكل حصة" : "EGP / lesson"} (المدة: ${sub.defaultDurationMinutes || 60} دقيقة | مكافئ: ${Number((((sub.lessonCost || 100) / (sub.defaultDurationMinutes || 60)) * 60).toFixed(1))} ج.م/س)`}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Case 3: Fixed Lessons Package - Lesson / Hourly Cost / Full Month Package */}
                          {sub.billingType === "monthly_fixed_lessons" && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "طريقة التسعير:" : "Pricing:"}
                                  </span>
                                  <select
                                    value={sub.rateType || "per_month"}
                                    onChange={e => {
                                      const newRateType = e.target.value as "per_month" | "per_lesson" | "per_hour";
                                      const currentMonthly = sub.monthlyCost || 800;
                                      const currentLesson = sub.lessonCost || 100;
                                      const currentHourly = sub.hourlyCost || sub.lessonCost || 100;
                                      const dur = sub.defaultDurationMinutes || 60;
                                      const lessonsCount = sub.lessonsPerMonth || 8;

                                      let calculatedLessonCost = currentLesson;
                                      let calculatedMonthlyCost = currentMonthly;

                                      if (newRateType === "per_month") {
                                        calculatedLessonCost = Math.max(0, Number((currentMonthly / lessonsCount).toFixed(2)));
                                        calculatedMonthlyCost = currentMonthly;
                                      } else if (newRateType === "per_hour") {
                                        calculatedLessonCost = Math.max(0, Number(((currentHourly * dur) / 60).toFixed(2)));
                                        calculatedMonthlyCost = Number((calculatedLessonCost * lessonsCount).toFixed(2));
                                      } else {
                                        // per_lesson
                                        calculatedMonthlyCost = Number((currentLesson * lessonsCount).toFixed(2));
                                      }

                                      handleUpdateSubjectField(idx, {
                                        rateType: newRateType,
                                        hourlyCost: currentHourly,
                                        defaultDurationMinutes: dur,
                                        lessonCost: calculatedLessonCost,
                                        monthlyCost: calculatedMonthlyCost
                                      });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="per_month">{isArabic ? "📦 سعر الشهر (تقسيم على الحصص)" : "📦 Total Month (Split)"}</option>
                                    <option value="per_lesson">{isArabic ? "💵 سعر الحصة الواحدة" : "💵 Price/Lesson"}</option>
                                    <option value="per_hour">{isArabic ? "⏱️ سعر الساعة" : "⏱️ Price/Hour"}</option>
                                  </select>
                                </div>

                                {sub.rateType === "per_hour" ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الساعة:" : "Hourly:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.hourlyCost || sub.lessonCost || 100}
                                      onChange={e => {
                                        const hCost = parseFloat(e.target.value) || 0;
                                        const dur = sub.defaultDurationMinutes || 60;
                                        const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                        const count = sub.lessonsPerMonth || 8;
                                        handleUpdateSubjectField(idx, {
                                          hourlyCost: hCost,
                                          lessonCost: lCost,
                                          monthlyCost: Number((lCost * count).toFixed(2))
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/س" : "EGP/h"}</span>
                                  </div>
                                ) : (sub.rateType === "per_lesson") ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الحصة:" : "Cost:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.lessonCost}
                                      onChange={e => {
                                        const cost = parseFloat(e.target.value) || 0;
                                        const count = sub.lessonsPerMonth || 8;
                                        handleUpdateSubjectField(idx, {
                                          lessonCost: cost,
                                          hourlyCost: cost,
                                          monthlyCost: Number((cost * count).toFixed(2))
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">ج.م</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الشهر بالكامل:" : "Total Month:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.monthlyCost || 800}
                                      onChange={e => {
                                        const mCost = parseFloat(e.target.value) || 0;
                                        const count = sub.lessonsPerMonth || 8;
                                        const lCost = Math.max(0, Number((mCost / count).toFixed(2)));
                                        handleUpdateSubjectField(idx, {
                                          monthlyCost: mCost,
                                          lessonCost: lCost
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="800"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/شهر" : "EGP/mo"}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "الحصص شهرياً:" : "Lessons/Mo:"}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={sub.lessonsPerMonth || 8}
                                    onChange={e => {
                                      const count = Math.max(1, Number(e.target.value) || 1);
                                      if (sub.rateType === "per_lesson") {
                                        const lCost = sub.lessonCost || 100;
                                        handleUpdateSubjectField(idx, {
                                          lessonsPerMonth: count,
                                          monthlyCost: Number((lCost * count).toFixed(2))
                                        });
                                      } else if (sub.rateType === "per_hour") {
                                        const lCost = sub.lessonCost || 100;
                                        handleUpdateSubjectField(idx, {
                                          lessonsPerMonth: count,
                                          monthlyCost: Number((lCost * count).toFixed(2))
                                        });
                                      } else {
                                        // per_month mode (split)
                                        const mCost = sub.monthlyCost || 800;
                                        const lCost = Math.max(0, Number((mCost / count).toFixed(2)));
                                        handleUpdateSubjectField(idx, {
                                          lessonsPerMonth: count,
                                          lessonCost: lCost
                                        });
                                      }
                                    }}
                                    className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                    placeholder="8"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "حصة" : "lessons"}</span>
                                </div>
                              </div>

                              {/* Duration open input for fixed lessons */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = sub.defaultDurationMinutes || 60;
                                        const dur = Math.max(1, current - 5);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-100 flex items-center justify-center transition shrink-0"
                                      title="-5 min"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-14 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = sub.defaultDurationMinutes || 60;
                                        const dur = Math.min(360, current + 5);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-100 flex items-center justify-center transition shrink-0"
                                      title="+5 min"
                                    >
                                      +
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => {
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-700 text-[11px]">
                                    {isArabic ? "🎯 تفاصيل الباقة:" : "🎯 Package Breakdown:"}
                                  </span>
                                </div>
                                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs text-[11px]">
                                  {sub.rateType === "per_hour"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${sub.hourlyCost || 100} ج.م/س × ${sub.defaultDurationMinutes || 60} د) | ${isArabic ? "الشهر:" : "Month:"} ${sub.monthlyCost || (sub.lessonCost * (sub.lessonsPerMonth || 8))} ج.م`
                                    : sub.rateType === "per_lesson"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${isArabic ? "إجمالي الشهر:" : "Total:"} ${sub.monthlyCost || (sub.lessonCost * (sub.lessonsPerMonth || 8))} ${isArabic ? "ج.م/شهر" : "EGP/mo"}) | ${sub.defaultDurationMinutes || 60} د`
                                    : `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${isArabic ? "من تقسيم" : "from"} ${sub.monthlyCost || 800} ÷ ${sub.lessonsPerMonth || 8} ${isArabic ? "حصة" : "lessons"}) | ${sub.defaultDurationMinutes || 60} د`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSubjectField}
                  className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isArabic ? "+ إضافة مادة دراسية أخرى لهذا الطالب" : "+ Add Another Subject"}</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "ملاحظات إضافية (اختياري)" : "Notes (Optional)"}
                </label>
                <textarea
                  rows={1}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={isArabic ? "أي ملاحظات عامة حول الطالب..." : "Any notes..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ الطالب والمواد" : "Save Student & Subjects"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Sheet: Student Full Profile View */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 max-w-4xl lg:max-w-5xl w-full shadow-2xl my-4 sm:my-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900">{selectedStudent.fullName}</h2>
                    {selectedStudent.academicYear && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                        🎓 {selectedStudent.academicYear}
                      </span>
                    )}
                    {selectedStudent.curriculum && (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold">
                        🌍 {selectedStudent.curriculum}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-blue-600 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{selectedStudent.subject}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-700 dir-ltr">{selectedStudent.parentContact}</span>
                    {selectedStudent.studentPhone && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 font-normal">
                          {isArabic ? "هاتف الطالب:" : "Student:"} <span className="font-mono font-bold text-slate-700 dir-ltr">{selectedStudent.studentPhone}</span>
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Merge Student into Combined File */}
                <button
                  onClick={() => {
                    const stId = selectedStudent.id;
                    setSelectedStudent(null);
                    setInitialMergeStudentIds([stId]);
                    setShowCreateCombinedGroupModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1.5"
                  title={isArabic ? "دمج هذا الطالب مع طلاب آخرين في ملف مجمع موحد" : "Merge into Combined File"}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isArabic ? "دمج في ملف مجمع" : "Merge into Group"}</span>
                </button>

                {/* Personal Report Standalone Button */}
                <button
                  onClick={() => {
                    const st = selectedStudent;
                    setSelectedStudent(null);
                    setStudentForPersonalReport(st);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition flex items-center gap-1.5"
                  title={isArabic ? "فتح صفحة التقرير الشخصي المستقلة" : "Open Standalone Personal Report"}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isArabic ? "تقرير شخصي" : "Personal Report"}</span>
                </button>

                {/* Edit Student Button */}
                <button
                  onClick={() => handleOpenEditStudent(selectedStudent)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1"
                  title={isArabic ? "تعديل بيانات واشتراك الطالب" : "Edit Student Details"}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? "تعديل البيانات" : "Edit"}</span>
                </button>

                {/* Status Switcher Toggle */}
                <button
                  onClick={() => {
                    const newStatus: StudentStatus =
                      selectedStudent.status === "active" ? "stopped" : "active";
                    onUpdateStudentStatus(selectedStudent.id, newStatus);
                    setSelectedStudent({ ...selectedStudent, status: newStatus });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedStudent.status === "active"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedStudent.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {selectedStudent.status === "active"
                      ? (isArabic ? "🟢 نشط (درس قادم)" : "Active")
                      : (isArabic ? "⚪ متوقف (محفوظ)" : "Stopped")}
                  </span>
                </button>

                {/* Delete Student Button */}
                <button
                  onClick={() => handleDeleteStudentClick(selectedStudent)}
                  className="p-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition"
                  title={isArabic ? "حذف الطالب نهائياً" : "Delete Student"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Profile Tabs */}
            {(() => {
              const selId = String(selectedStudent.id || "").trim();
              const selName = (selectedStudent.fullName || "").trim().toLowerCase();
              const rawStudentAllReps = reports.filter(r => r && (
                (r.studentId && String(r.studentId).trim() === selId) ||
                (r.studentName && r.studentName.trim().toLowerCase() === selName)
              ));
              const studentAllReps = deduplicateReportsList(rawStudentAllReps);
              const dailyCount = studentAllReps.filter(isDailyPersonalReport).length;
              const monthlyCount = studentAllReps.filter(isMonthlyComprehensiveReport).length;

              return (
                <div className="flex border-b border-slate-200 overflow-x-auto">
                  {/* Tab: Daily Personal Reports */}
                  <button
                    type="button"
                    onClick={() => setProfileTab("daily_reports")}
                    className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                      profileTab === "daily_reports"
                        ? "border-purple-600 text-purple-700 bg-purple-50/50"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isArabic ? "التقارير الشخصية اليومية" : "Personal Daily Reports"}</span>
                    {dailyCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        profileTab === "daily_reports" ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"
                      }`}>
                        {dailyCount}
                      </span>
                    )}
                  </button>

                  {/* Tab: Comprehensive Monthly Reports */}
                  <button
                    type="button"
                    onClick={() => setProfileTab("monthly_reports")}
                    className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                      profileTab === "monthly_reports"
                        ? "border-teal-600 text-teal-700 bg-teal-50/50"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isArabic ? "التقارير الشهرية الشاملة" : "Comprehensive Monthly Reports"}</span>
                    {monthlyCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        profileTab === "monthly_reports" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"
                      }`}>
                        {monthlyCount}
                      </span>
                    )}
                  </button>

                  {/* Tab: Financial Balance */}
                  <button
                    type="button"
                    onClick={() => setProfileTab("finance")}
                    className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                      profileTab === "finance"
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>💰 {isArabic ? "الحساب المالي والحصص" : "Financial Balance"}</span>
                  </button>

                  {/* Tab: Attendance History */}
                  <button
                    type="button"
                    onClick={() => setProfileTab("attendance")}
                    className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                      profileTab === "attendance"
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📅 {isArabic ? "سجل الحضور والخصم" : "Attendance History"}</span>
                  </button>
                </div>
              );
            })()}

            {/* Tab 1: Financial Balance & Payments */}
            {profileTab === "finance" && (
              <div className="space-y-4">
                {/* Unified Financial Summary Card */}
                {(() => {
                  const finSummary = calculateStudentFinancials(selectedStudent, attendanceRecords, paymentTransactions, reports);
                  return (
                    <>
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 block">{isArabic ? "الحالة المالية للطالب:" : "Student Financial Status:"}</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-xl font-bold text-xs shadow-2xs ${
                              finSummary.statusBadge.color === "emerald"
                                ? "bg-emerald-100 text-emerald-800"
                                : finSummary.statusBadge.color === "amber"
                                ? "bg-amber-100 text-amber-800"
                                : finSummary.statusBadge.color === "blue"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {isArabic ? finSummary.statusBadge.labelAr : finSummary.statusBadge.labelEn}
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-700 text-[11px] font-semibold max-w-md bg-white/80 p-2.5 rounded-xl border border-blue-100">
                          {isArabic ? finSummary.detailsExplanationAr : finSummary.detailsExplanationEn}
                        </div>
                      </div>

                      {/* DEDICATED STUDENT FINANCIAL STATEMENT BANNER WITH HOURS STUDIED */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/80 to-indigo-50/60 border border-sky-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                                {isArabic ? "كشف الحساب المالي وساعات الدراسة:" : "Student Statement & Study Hours:"}
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-lg bg-sky-600 text-white font-black text-xs shadow-2xs">
                                ⏱️ {finSummary.totalTaughtHours} {isArabic ? "ساعة درسها" : "hours studied"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {isArabic
                                ? `درس الطالب ما مجموعه (${formatHoursHuman(finSummary.totalTaughtHours, true)}) بما يعادل ${Math.round((finSummary.totalTaughtHours || 0) * 60)} دقيقة موزعة على ${finSummary.totalAttendedLessons} حصة حضور فعلية.`
                                : `The student completed (${formatHoursHuman(finSummary.totalTaughtHours, false)}) totaling ${Math.round((finSummary.totalTaughtHours || 0) * 60)} minutes across ${finSummary.totalAttendedLessons} attended lessons.`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopyStudentStatement(selectedStudent)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            title={isArabic ? "نسخ كشف الحساب المالي متضمناً عدد الساعات" : "Copy Statement"}
                          >
                            {copiedStatementStudentId === selectedStudent.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">{isArabic ? "تم النسخ" : "Copied"}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>{isArabic ? "نسخ الكشف" : "Copy"}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareStudentStatementWhatsApp(selectedStudent)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            title={isArabic ? "إرسال كشف الحساب مع ساعات الدراسة لواتساب ولي الأمر" : "Share via WhatsApp"}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{isArabic ? "إرسال واتساب" : "WhatsApp"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatementModalStudent(selectedStudent)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            title={isArabic ? "فتح كشف الحساب المالي الشامل" : "Open Full Statement"}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isArabic ? "عرض كشف الحساب" : "Statement"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Active Billing Plan Banner in Student Profile */}
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base shrink-0 border border-blue-100">
                            {finSummary.billingType === "monthly" ? "📅" : finSummary.billingType === "monthly_fixed_lessons" ? "🎯" : "🗓️"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs">
                                {finSummary.billingType === "monthly"
                                  ? (isArabic ? "نظام المحاسبة: اشتراك شهري ثابت (الشهر كامل)" : "Billing: Flat Monthly Subscription")
                                  : finSummary.billingType === "monthly_fixed_lessons"
                                  ? (isArabic ? "نظام المحاسبة: باقة حصص محددة شهرياً" : "Billing: Fixed Monthly Package")
                                  : (isArabic ? "نظام المحاسبة: حصص التقويم المنقضية (حساب آخر الشهر)" : "Billing: Elapsed Lessons (Month-End)")}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {finSummary.billingType === "monthly"
                                  ? (isArabic ? "مبلغ شهري محدد" : "Flat Month")
                                  : finSummary.billingType === "monthly_fixed_lessons"
                                  ? (isArabic ? "باقة حصص" : "Package")
                                  : (isArabic ? "حسب الحصص والساعات الفعلية" : "Actual Elapsed")}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {finSummary.billingType === "monthly"
                                ? (isArabic ? `سعر الشهر الكامل: ${selectedStudent.monthlyCost || 400} ج.م مقسم على ${selectedStudent.lessonsPerMonth || 4} حصص (${finSummary.lessonCost} ج.م / حصة)` : `Full Month: ${selectedStudent.monthlyCost || 400} EGP`)
                                : finSummary.billingType === "monthly_fixed_lessons"
                                ? (isArabic ? `باقة ${selectedStudent.lessonsPerMonth || 8} حصص شهرياً بمعدل ${finSummary.lessonCost} ج.م للحصة` : `Package of ${selectedStudent.lessonsPerMonth || 8} lessons`)
                                : (isArabic ? `تُحسب التكلفة بنهاية الشهر وفقاً لعدد الساعات والحصص المنفذة فعلياً (${finSummary.lessonCost} ج.م للحصة${finSummary.hourlyCost && finSummary.hourlyCost !== finSummary.lessonCost ? ` / ${finSummary.hourlyCost} ج.م للساعة` : ""}) دون فرض سعر شهر ثابت مسبقاً.` : `Calculated at month-end based on actual attended lessons and hours.`)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "سعر الحصة / الساعة" : "Lesson / Hourly Rate"}</p>
                          <p className="text-sm font-black text-slate-800 mt-1">
                            {finSummary.lessonCost} {isArabic ? "ج.م" : "EGP"}
                          </p>
                          {finSummary.hourlyCost && finSummary.hourlyCost !== finSummary.lessonCost && (
                            <p className="text-[9px] font-bold text-blue-600 mt-0.5">
                              ({finSummary.hourlyCost} ج.م / س)
                            </p>
                          )}
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "الحصص المنفذة" : "Attended Lessons"}</p>
                          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                            <span className="text-sm font-black text-blue-700">
                              {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lessons"}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              ⏱️ {finSummary.totalTaughtHours ?? Number(((finSummary.totalAttendedLessons * 60) / 60).toFixed(1))} {isArabic ? "ساعة" : "hrs"}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                            ({finSummary.totalAccruedCost} ج.م)
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "إجمالي الساعات" : "Total Hours"}</p>
                          <p className="text-sm font-black text-indigo-700 mt-1">
                            {finSummary.totalTaughtHours ?? Number(((finSummary.totalAttendedLessons * 60) / 60).toFixed(1))} {isArabic ? "ساعة" : "hrs"}
                          </p>
                          <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                            {isArabic ? "تدريس فعلي" : "Taught"}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</p>
                          <p className="text-sm font-black text-emerald-600 mt-1">
                            {finSummary.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                          <p className="text-[11px] font-bold text-slate-500">
                            {finSummary.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due Amount") : (isArabic ? "الرصيد المتبقي" : "Credit Left")}
                          </p>
                          <p className={`text-sm font-black mt-1 ${finSummary.amountDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                            {finSummary.amountDue > 0 ? `${finSummary.amountDue} ج.م` : `${finSummary.creditRemaining} ج.م`}
                          </p>
                        </div>
                      </div>

                      {/* Multi-Subject Breakdown if available */}
                      {finSummary.subjectsDetails && finSummary.subjectsDetails.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isArabic ? "تفصيل الحساب المالي لكل مادة دراسية:" : "Subject-by-Subject Financial Breakdown:"}</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {finSummary.subjectsDetails.map((subDet, sIdx) => (
                              <div
                                key={subDet.id || sIdx}
                                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
                              >
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{subDet.studyType === "group" ? "👥" : "👤"}</span>
                                    <span className="font-bold text-slate-900 text-xs">{subDet.subject}</span>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-lg">
                                    {subDet.rateType === "per_hour" ? (isArabic ? "⏱️ بالساعة" : "Hourly") : (isArabic ? "💵 بالحصة" : "Per Lesson")}
                                  </span>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5 text-center text-slate-600 text-[10px]">
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "السعر" : "Rate"}</p>
                                    <p className="font-bold text-slate-800 text-xs mt-0.5">{subDet.lessonCost} ج.م</p>
                                  </div>
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "الحصص" : "Lessons"}</p>
                                    <p className="font-bold text-blue-700 text-xs mt-0.5">{subDet.totalAttendedLessons} ح</p>
                                  </div>
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "الساعات" : "Hours"}</p>
                                    <p className="font-bold text-indigo-700 text-xs mt-0.5">{subDet.totalTaughtHours ?? Number(((subDet.totalAttendedLessons * 60) / 60).toFixed(1))} س</p>
                                  </div>
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "المستحق/الرصيد" : "Net"}</p>
                                    <p className={`font-bold text-xs mt-0.5 ${subDet.amountDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                      {subDet.amountDue > 0 ? `${subDet.amountDue} ج.م` : `+${subDet.creditRemaining} ج.م`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">
                    {isArabic ? "سجل الدفعات والتحصيلات" : "Payment Transactions Log"}
                  </h3>
                  <button
                    onClick={() => handleOpenStudentPaymentModal(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تسجيل دفعة مالية" : "Record Payment"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {paymentTransactions
                    .filter(pt => matchesStudentRecord(pt, selectedStudent))
                    .map(pt => (
                      <div
                        key={pt.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {pt.amount} {isArabic ? "جنيهاً" : "EGP"} ({pt.lessonsCovered} {isArabic ? "حصص" : "lessons"})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{pt.notes || pt.date}</p>
                        </div>
                        <span className="font-semibold text-slate-500">{pt.date}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Tab 2: Attendance Log */}
            {profileTab === "attendance" && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-xs">
                  {isArabic ? "سجل الحضور وتاريخ الخصم التلقائي" : "Attendance & Deductions History"}
                </h3>

                {attendanceRecords.filter(ar => matchesStudentRecord(ar, selectedStudent)).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {isArabic ? "لا توجد سجلات حضور سابقة لهذا الطالب." : "No attendance records found."}
                  </p>
                ) : (
                  attendanceRecords
                    .filter(ar => matchesStudentRecord(ar, selectedStudent))
                    .map(ar => (
                      <div
                        key={ar.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ar.attendance === "present"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ar.attendance === "absent"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {ar.attendance === "present"
                                ? (isArabic ? "حاضر" : "Present")
                                : ar.attendance === "absent"
                                ? (isArabic ? "غائب" : "Absent")
                                : (isArabic ? "متأخر" : "Late")}
                            </span>
                            <span className="font-bold text-slate-800">{ar.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isArabic ? `الواجب: ${ar.homeworkStatus}` : `Homework: ${ar.homeworkStatus}`}
                          </p>
                        </div>

                        <div className="text-right">
                          {ar.deducted ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              {isArabic ? "تم خصم حصة واحدة (-1)" : "1 Lesson Deducted (-1)"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {isArabic ? "لم يخصم (غائب)" : "No deduction"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Tab: Daily Personal Reports */}
            {profileTab === "daily_reports" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>{isArabic ? "سجل التقارير الشخصية اليومية وملاحظات الحصص" : "Personal Daily Reports & Lesson Logs"}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {isArabic
                        ? `التقارير اليومية لكل حصة وسجل الحضور والواجبات وصياغة الذكاء الاصطناعي لـ (${selectedStudent.fullName}).`
                        : `Daily lesson reports, attendance, and AI refinement for (${selectedStudent.fullName}).`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* زر إنشاء تقرير شهري شامل: مفعّل فقط إذا كان الطالب في "قرآن كريم" أو "Quran, Arabic and Islamic Studies" */}
                    {(() => {
                      const isEligible =
                        isQuranComprehensiveReportEligible(reportSubject) ||
                        (selectedStudent.subjects && selectedStudent.subjects.some(s => isQuranComprehensiveReportEligible(s.subject))) ||
                        isQuranComprehensiveReportEligible(selectedStudent.subject);

                      if (!isEligible) return null;

                      const targetSubj = isQuranComprehensiveReportEligible(reportSubject)
                        ? reportSubject
                        : (selectedStudent.subjects?.find(s => isQuranComprehensiveReportEligible(s.subject))?.subject || selectedStudent.subject || "قرآن كريم");

                      return (
                        <button
                          type="button"
                          id="btn-open-monthly-quran-report-profile"
                          onClick={() => setMonthlyReportModalTarget({ student: selectedStudent, subject: targetSubj })}
                          className="px-3.5 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 animate-in fade-in"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                          <span>{isArabic ? "إنشاء تقرير شهري شامل" : "Create Comprehensive Monthly Report"}</span>
                        </button>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={openNewReportModal}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs shadow-2xs flex items-center gap-1.5 shrink-0 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isArabic ? "كتابة تقرير هنا" : "Write Report Here"}</span>
                    </button>

                    <button
                      onClick={() => {
                        const st = selectedStudent;
                        setSelectedStudent(null);
                        setStudentForPersonalReport(st);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isArabic ? "فتح صفحة التقرير الشخصي" : "Open Personal Report"}</span>
                    </button>
                  </div>
                </div>

                {whatsappSentNotice && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{whatsappSentNotice}</span>
                  </div>
                )}

                {/* Form to Write New Report for Student */}
                {showCreateReportForm && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-purple-50/90 to-indigo-50/80 border-2 border-purple-200/90 shadow-md space-y-4 text-xs animate-in fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-purple-200/70 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-purple-950 text-sm">
                            {isArabic ? `إضافة تقرير جديد لـ ${selectedStudent.fullName}` : `Add New Report: ${selectedStudent.fullName}`}
                          </h4>
                          <p className="text-[10px] text-purple-700 font-medium">
                            {isArabic ? "اختر المادة، حدد رقم وتاريخ الحصة، مدة الحصة بحرية، وحالة الحضور" : "Select subject, lesson number, date, duration, and attendance"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCreateReportForm(false)}
                        className="p-1.5 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* FIELD 1: 1- اختيار المادة */}
                    <div className="space-y-1.5">
                      <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">1</span>
                          <span>{isArabic ? "اختيار المادة الدراسية *" : "Select Subject *"}</span>
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                          {isArabic ? `المادة الحالية: ${reportSubject}` : `Selected: ${reportSubject}`}
                        </span>
                      </label>
                      
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(() => {
                          const studentSubjectNames = selectedStudent.subjects && selectedStudent.subjects.length > 0
                            ? selectedStudent.subjects.map(s => s.subject)
                            : [selectedStudent.subject];
                          
                          return (
                            <>
                              {studentSubjectNames.map(subjName => (
                                <button
                                  key={subjName}
                                  type="button"
                                  onClick={() => handleReportSubjectChange(subjName)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                                    reportSubject === subjName
                                      ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                                      : "bg-white text-slate-700 border border-purple-200 hover:bg-purple-100/60"
                                  }`}
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>{subjName}</span>
                                </button>
                              ))}

                              <div className="flex-1 min-w-[140px]">
                                <input
                                  type="text"
                                  value={reportSubject}
                                  onChange={e => handleReportSubjectChange(e.target.value)}
                                  placeholder={isArabic ? "أو اكتب اسم مادة أخرى..." : "Or type another subject..."}
                                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-purple-500 shadow-2xs"
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* FIELDS 2 & 3 & Duration: رقم الحصة + تاريخ الحصة + مدة الحصة */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* FIELD 2: 2- رقم الحصة */}
                      <div className="space-y-1.5">
                        <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">2</span>
                            <span>{isArabic ? "رقم الحصة *" : "Lesson Number *"}</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                            {isArabic ? "تلقائي" : "Auto"}
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReportLessonNumber(prev => Math.max(1, prev - 1))}
                            className="w-9 h-9 rounded-xl bg-white border border-purple-200 text-purple-700 font-black text-base hover:bg-purple-100 flex items-center justify-center transition shadow-2xs shrink-0"
                          >
                            -
                          </button>

                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="1"
                              required
                              value={reportLessonNumber}
                              onChange={e => setReportLessonNumber(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-center font-black text-slate-900 text-sm focus:outline-none focus:border-purple-500 shadow-2xs"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-purple-600 font-bold pointer-events-none">
                              #{reportLessonNumber}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setReportLessonNumber(prev => prev + 1)}
                            className="w-9 h-9 rounded-xl bg-white border border-purple-200 text-purple-700 font-black text-base hover:bg-purple-100 flex items-center justify-center transition shadow-2xs shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* FIELD 3: 3- تاريخ الحصة */}
                      <div className="space-y-1.5">
                        <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
                            <span>{isArabic ? "تاريخ الحصة *" : "Lesson Date *"}</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                            {isArabic ? "اليوم" : "Today"}
                          </span>
                        </label>

                        <div className="relative">
                          <input
                            type="date"
                            required
                            value={reportDate}
                            onChange={e => setReportDate(e.target.value)}
                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:outline-none focus:border-purple-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* FIELD: مدة الحصة (حرية كاملة - أي مدة أقل أو أكثر من 30د) */}
                      <div className="space-y-1.5">
                        <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span>{isArabic ? "مدة الحصة (حرية كاملة) *" : "Duration (Flexible) *"}</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                            {reportDurationMinutes} {isArabic ? "دقيقة" : "min"}
                          </span>
                        </label>

                        <div className="flex items-center gap-1 bg-white border border-purple-200 rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setReportDurationMinutes(prev => Math.max(1, (prev || 60) - 5))}
                            className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center transition"
                            title="-5 min"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={reportDurationMinutes || ""}
                            placeholder="60"
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setReportDurationMinutes(isNaN(val) ? 0 : Math.max(1, val));
                            }}
                            className="flex-1 bg-transparent text-center font-black text-slate-900 text-xs focus:outline-none"
                            title={isArabic ? "اكتب أي عدد دقائق تريده (مثلاً: 10, 15, 20, 25, 30, 45, 60...)" : "Duration in minutes"}
                          />
                          <button
                            type="button"
                            onClick={() => setReportDurationMinutes(prev => Math.min(480, (prev || 60) + 5))}
                            className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center transition"
                            title="+5 min"
                          >
                            +
                          </button>
                          <span className="text-[10px] font-bold text-slate-500 pr-1 shrink-0">{isArabic ? "د" : "m"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Duration Buttons Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap bg-white/70 p-1.5 rounded-xl border border-purple-100">
                      <span className="text-[10px] font-bold text-purple-800 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-purple-600" />
                        {isArabic ? "اختيارات سريعة للمدة:" : "Quick Durations:"}
                      </span>
                      {[10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map(dur => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setReportDurationMinutes(dur)}
                          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
                            reportDurationMinutes === dur
                              ? "bg-purple-600 text-white shadow-2xs font-black"
                              : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200/50"
                          }`}
                        >
                          {dur}{isArabic ? "د" : "m"}
                        </button>
                      ))}
                    </div>

                    {/* FIELD 4: 4- خانة بها حاضر وغائب */}
                    <div className="space-y-2 pt-1 border-t border-purple-200/70">
                      <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">4</span>
                        <span>{isArabic ? "حالة الحضور والغياب *" : "Attendance Status *"}</span>
                      </label>

                      <div className="grid grid-cols-2 gap-2 p-1 bg-white/90 border border-purple-200 rounded-2xl shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setReportAttendance("present");
                            setReportDeductCost(true);
                          }}
                          className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                            reportAttendance === "present"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>{isArabic ? "🟢 حاضر (حضر الحصة)" : "🟢 Present"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReportAttendance("absent");
                            setReportDeductCost(false);
                          }}
                          className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                            reportAttendance === "absent"
                              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <X className="w-4 h-4 text-rose-300" />
                          <span>{isArabic ? "🔴 غائب (لم يحضر)" : "🔴 Absent"}</span>
                        </button>
                      </div>
                    </div>

                    {/* CONDITIONAL RENDERING: */}

                    {/* CASE A: IF ABSENT (غائب) - HIDE REST OF FIELDS, ONLY SHOW DEDUCTION TOGGLE AND SAVE */}
                    {reportAttendance === "absent" && (
                      <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-3.5 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <div>
                            <h5 className="font-black text-rose-950 text-xs">
                              {isArabic ? "تسجيل غياب الطالب عن الحصة" : "Record Student Absence"}
                            </h5>
                            <p className="text-[10.5px] text-rose-700 font-medium">
                              {isArabic ? "حدد ما إذا كان سيتم حساب الحصة وخصم سعرها من رصيد الطالب أم لا:" : "Choose whether to bill/deduct this lesson fee:"}
                            </p>
                          </div>
                        </div>

                        {/* Monthly vs Elapsed Lessons Info & Options */}
                        {(() => {
                          const isMonthly =
                            selectedStudent.billingType === "monthly" ||
                            selectedStudent.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");

                          if (isMonthly) {
                            return (
                              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-start gap-2">
                                <span className="text-sm">📅</span>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-blue-950">
                                    {isArabic ? "نظام المحاسبة: الشهر كامل (اشتراك شهري ثابت)" : "Billing: Full Month Subscription"}
                                  </p>
                                  <p className="text-[10.5px] text-blue-800 leading-relaxed">
                                    {isArabic
                                      ? "يتم احتساب الشهر ثابتاً، وتسجيل الغياب هنا للمتابعة الأكاديمية فقط بدون كتابة أي إشارة للخصم المالي في التقرير."
                                      : "Logged purely for academic tracking. No billing deduction text will appear in the report."}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1.5">
                              <label className="block font-black text-slate-800 text-xs">
                                {isArabic
                                  ? "نظام حصص التقويم المنقضية (تحتسب الحصة إذا حضرها، أو تستثنى لغياب بعذر):"
                                  : "Calendar Elapsed Lessons (Charge if attended or non-excused):"}
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReportDeductCost(true)}
                                  className={`p-3 rounded-xl border text-right transition flex items-center justify-between ${
                                    reportDeductCost
                                      ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                                      : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                                  }`}
                                >
                                  <div>
                                    <p className="font-bold text-xs">
                                      {isArabic ? "✅ احتساب الحصة وخصمها" : "Yes - Deduct & Bill"}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 ${reportDeductCost ? "text-rose-100" : "text-slate-500"}`}>
                                      {isArabic ? "غياب غير معذور (تحتسب الحصة مالياً)" : "Non-excused absence"}
                                    </p>
                                  </div>
                                  <Check className={`w-4 h-4 ${reportDeductCost ? "text-white" : "text-transparent"}`} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setReportDeductCost(false)}
                                  className={`p-3 rounded-xl border text-right transition flex items-center justify-between ${
                                    !reportDeductCost
                                      ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
                                      : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                                  }`}
                                >
                                  <div>
                                    <p className="font-bold text-xs">
                                      {isArabic ? "❌ استثناء الحصة (غياب بعذر)" : "No - Excused (No Fee)"}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 ${!reportDeductCost ? "text-emerald-100" : "text-slate-500"}`}>
                                      {isArabic ? "لا تحتسب الحصة ولا تترتب رسوم" : "No balance deducted"}
                                    </p>
                                  </div>
                                  <Check className={`w-4 h-4 ${!reportDeductCost ? "text-white" : "text-transparent"}`} />
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Optional Absent Note */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                            {isArabic ? "ملاحظة حول سبب الغياب (اختياري):" : "Absence reason/note (Optional):"}
                          </label>
                          <input
                            type="text"
                            value={absentNotes}
                            onChange={e => setAbsentNotes(e.target.value)}
                            placeholder={isArabic ? "مثال: اعتذر ولي الأمر لظرف طارئ..." : "e.g., Parent apologized due to emergency..."}
                            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {/* SAVE ABSENT REPORT BUTTON */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-200/80">
                          <button
                            type="button"
                            onClick={() => setShowCreateReportForm(false)}
                            className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-slate-700 font-bold text-xs hover:bg-rose-100/50"
                          >
                            {isArabic ? "إلغاء" : "Cancel"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const isMonthly =
                                selectedStudent.billingType === "monthly" ||
                                selectedStudent.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");

                              const absentReportText = isArabic
                                ? `📌 تقرير غياب طالب\n• الطالب: ${selectedStudent.fullName}\n• المادة: ${reportSubject}\n• الحصة رقم: #${reportLessonNumber}\n• التاريخ: ${reportDate}\n• حالة الحضور: غائب${
                                    !isMonthly
                                      ? `\n• حساب الحصة: ${reportDeductCost ? "تم احتساب الحصة وخصمها من الرصيد" : "لم يتم الخصم (غياب بعذر)"}`
                                      : ""
                                  }${absentNotes ? `\n• سبب/ملاحظات: ${absentNotes}` : ""}`
                                : `📌 Student Absence Report\n• Student: ${selectedStudent.fullName}\n• Subject: ${reportSubject}\n• Lesson #: ${reportLessonNumber}\n• Date: ${reportDate}\n• Attendance: Absent${
                                    !isMonthly
                                      ? `\n• Billed: ${reportDeductCost ? "Yes (Deducted)" : "No (Excused)"}`
                                      : ""
                                  }${absentNotes ? `\n• Notes: ${absentNotes}` : ""}`;

                              onAddReport({
                                studentId: selectedStudent.id,
                                studentName: selectedStudent.fullName,
                                subject: reportSubject,
                                lessonNumber: reportLessonNumber,
                                date: reportDate,
                                attendance: "absent",
                                deductCost: isMonthly ? true : reportDeductCost,
                                homeworkStatus: "not_done",
                                teacherNotes: absentNotes || (isArabic ? "غائب" : "Absent"),
                                aiInstructions: "",
                                reportText: absentReportText,
                                generatedText: absentReportText
                              });

                              setShowCreateReportForm(false);
                              setWhatsappSentNotice(isArabic ? "تم حفظ تسجيل الغياب بنجاح!" : "Absence recorded successfully!");
                              setTimeout(() => setWhatsappSentNotice(""), 4000);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition"
                          >
                            <Check className="w-4 h-4" />
                            <span>{isArabic ? "حفظ تسجيل الغياب" : "Save Absence"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CASE B: IF PRESENT (حاضر) - SHOW FULL RICH REPORT FIELDS */}
                    {reportAttendance === "present" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        {/* Homework status */}
                        <div className="flex items-center justify-between bg-white border border-purple-200 rounded-xl px-3 py-2">
                          <label className="font-bold text-slate-700 text-xs">
                            {isArabic ? "حالة الواجب المنزلي:" : "Homework Status:"}
                          </label>
                          <select
                            value={reportHomeworkStatus}
                            onChange={e => setReportHomeworkStatus(e.target.value as HomeworkStatus)}
                            className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-900 focus:outline-none"
                          >
                            <option value="done">{isArabic ? "✅ تم حل الواجب كاملاً" : "Done"}</option>
                            <option value="not_done">{isArabic ? "❌ لم يحل الواجب" : "Not Done"}</option>
                            <option value="late">{isArabic ? "⚠️ تم حل الواجب بتأخير أو جزئياً" : "Late / Partial"}</option>
                            <option value="no_homework">{isArabic ? "⚪ لم يكن هناك واجب" : "No Homework Assigned"}</option>
                          </select>
                        </div>

                        {/* Split Teacher Inputs: What happened in class & Homework */}
                        <div className="space-y-3">
                          <div>
                            <label className="block font-bold text-slate-700 text-xs mb-1">
                              {isArabic ? "ما حدث داخل الحصة (الشرح والتفاعل والملاحظات):" : "What happened in class:"}
                            </label>
                            <textarea
                              rows={3}
                              value={classEvents}
                              onChange={e => setClassEvents(e.target.value)}
                              placeholder={
                                isArabic
                                  ? "مثال: تم شرح درس التفاعلات الكيميائية، وتجاوب الطالب بشكل رائع وأتقن حل المسائل..."
                                  : "Describe what happened in class, understanding, and practice..."
                              }
                              className="w-full bg-white border border-purple-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 text-xs mb-1">
                              {isArabic ? "الواجب المنزلي والتكليفات القادمة:" : "Homework & Assignments:"}
                            </label>
                            <textarea
                              rows={2}
                              value={homeworkNotes}
                              onChange={e => setHomeworkNotes(e.target.value)}
                              placeholder={
                                isArabic
                                  ? "مثال: حل التمارين من ص 45 إلى 48، وتجهيز أسئلة المراجعة للاختبار القادم..."
                                  : "Write homework details and assignments..."
                              }
                              className="w-full bg-white border border-purple-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                            />
                          </div>

                          {/* Field 3: Overall Evaluation (Presets + Free Text) */}
                          <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                                <span>{isArabic ? "⭐ التقييم الإجمالي ومستوى الأداء (خيارات سريعة + كتابة حرة):" : "⭐ Overall Evaluation & Rating:"}</span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                {overallEvaluation && (
                                  <button
                                    type="button"
                                    onClick={() => setOverallEvaluation("")}
                                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-0.5 rounded-md hover:bg-rose-50 transition"
                                  >
                                    {isArabic ? "مسح التقييم" : "Clear"}
                                  </button>
                                )}
                                <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                                  {isArabic ? "التقييم الإجمالي" : "Overall Rating"}
                                </span>
                              </div>
                            </div>

                            {/* Preset Options Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: isArabic ? "🌟 ممتاز مرتفع" : "🌟 Excellent+", value: isArabic ? "ممتاز مرتفع (⭐⭐⭐⭐⭐)" : "Excellent+ (5/5)" },
                                { label: isArabic ? "⭐ ممتاز" : "⭐ Excellent", value: isArabic ? "ممتاز (⭐⭐⭐⭐⭐)" : "Excellent (5/5)" },
                                { label: isArabic ? "📈 جيد جداً مرتفع" : "📈 Very Good+", value: isArabic ? "جيد جداً مرتفع (⭐⭐⭐⭐)" : "Very Good+ (4/5)" },
                                { label: isArabic ? "👍 جيد جداً" : "👍 Very Good", value: isArabic ? "جيد جداً (⭐⭐⭐⭐)" : "Very Good (4/5)" },
                                { label: isArabic ? "✨ جيد" : "✨ Good", value: isArabic ? "جيد (⭐⭐⭐)" : "Good (3/5)" },
                                { label: isArabic ? "⚖️ مقبول / متوسط" : "⚖️ Average", value: isArabic ? "مقبول / متوسط (⭐⭐)" : "Average (2/5)" },
                                { label: isArabic ? "⚠️ يحتاج متابعة وتطوير" : "⚠️ Needs Improvement", value: isArabic ? "يحتاج إلى متابعة وتطوير مستمر ⚠️" : "Needs continuous improvement ⚠️" },
                                { label: isArabic ? "🚀 متفوق ومبدع" : "🚀 Outstanding", value: isArabic ? "متفوق ومبدع 🚀" : "Outstanding 🚀" },
                                { label: "💯 10 / 10", value: "10 / 10" },
                                { label: "🎯 9 / 10", value: "9 / 10" },
                                { label: "📊 8 / 10", value: "8 / 10" }
                              ].map((preset, idx) => {
                                const isSelected = overallEvaluation === preset.value;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setOverallEvaluation(isSelected ? "" : preset.value)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 border shadow-2xs ${
                                      isSelected
                                        ? "bg-amber-500 border-amber-600 text-white shadow-sm scale-102"
                                        : "bg-white border-amber-200 text-slate-700 hover:bg-amber-100/70 hover:border-amber-300"
                                    }`}
                                  >
                                    <span>{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Free Text Writing Input */}
                            <input
                              type="text"
                              value={overallEvaluation}
                              onChange={e => setOverallEvaluation(e.target.value)}
                              placeholder={
                                isArabic
                                  ? "اختر من الخيارات أعلاه أو اكتب تقييماً أو درجة أو ملاحظة مخصصة بحرية..."
                                  : "Select preset above or type custom assessment freely..."
                              }
                              className="w-full bg-white border border-amber-200/90 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-amber-500 leading-relaxed transition shadow-2xs font-sans placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Subject AI Instructions */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block font-bold text-slate-700 flex items-center gap-1 text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>{isArabic ? `تعليمات وقالب الذكاء الاصطناعي لمادة (${reportSubject}):` : "Subject AI Instructions:"}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const inst = findSubjectAiInstruction(settings.subjectDefaults, reportSubject, settings.generalAiInstructions);
                                setNewAiInstructions(inst);
                              }}
                              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition"
                              title={isArabic ? "استعادة التوجيه الافتراضي من الإعدادات" : "Reset to default"}
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{isArabic ? "استعادة من الإعدادات" : "Reset"}</span>
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={newAiInstructions}
                            onChange={e => setNewAiInstructions(e.target.value)}
                            placeholder={isArabic ? "اكتب أي قالب محدد أو شروط أو أسلوب تريد من الذكاء الاصطناعي الالتزام به بنسبة 100%..." : "Custom template, rules, tone, or specific instructions for AI to follow 100%..."}
                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                          />
                        </div>

                        {/* Universal File Attachment */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                              <Paperclip className="w-4 h-4 text-purple-600" />
                              <span>{isArabic ? "إرفاق ملف أو صورة (أي نوع: PDF, PowerPoint, Excel, Word وغيرها):" : "Attach File or Image (PDF, PPTX, Excel, Word, etc.):"}</span>
                            </label>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                              {isArabic ? "اختياري" : "Optional"}
                            </span>
                          </div>

                          {!reportAttachment ? (
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingFileInProfile(true);
                              }}
                              onDragLeave={() => setIsDraggingFileInProfile(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingFileInProfile(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) processSelectedFileInProfile(file);
                              }}
                              className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer select-none ${
                                isDraggingFileInProfile
                                  ? "border-purple-600 bg-purple-100/70 scale-101"
                                  : "border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/50"
                              }`}
                              onClick={() => {
                                document.getElementById("profile-universal-file-input")?.click();
                              }}
                            >
                              <input
                                id="profile-universal-file-input"
                                type="file"
                                accept="*/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                                <FileUp className="w-4 h-4 text-purple-600 animate-bounce" />
                                <span>{isArabic ? "اضغط لاختيار ملف أو اسحبه إلى هنا (يدعم كافة أنواع الملفات)" : "Click or drag & drop any file (All types supported)"}</span>
                              </div>
                              <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px] font-bold text-slate-500 mt-1">
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">PDF</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">PowerPoint</span>
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">Excel</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Word</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">صور JPG/PNG</span>
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">وأي ملف آخر</span>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const meta = getProfileAttachmentMeta(reportAttachment);
                              return (
                                <div className="p-2.5 bg-white border border-purple-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    {reportAttachment.previewUrl ? (
                                      <img
                                        src={reportAttachment.previewUrl}
                                        alt="Attachment Preview"
                                        className="w-11 h-11 object-cover rounded-lg border border-purple-100 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border relative overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50 border-purple-200">
                                        {meta.type === "presentation" ? (
                                          <Presentation className="w-5 h-5 text-amber-600" />
                                        ) : meta.type === "spreadsheet" ? (
                                          <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                                        ) : meta.type === "pdf" ? (
                                          <FileText className="w-5 h-5 text-rose-600" />
                                        ) : (
                                          <File className="w-5 h-5 text-purple-600" />
                                        )}
                                        <span className={`text-[8px] font-black uppercase px-1 rounded-t-sm absolute bottom-0 inset-x-0 text-center ${meta.badgeColor}`}>
                                          {meta.tag}
                                        </span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${meta.color}`}>
                                          {meta.label}
                                        </span>
                                        {reportAttachment.fileSize && (
                                          <span className="text-[10px] text-slate-400 font-bold">
                                            ({formatFileSizeProfile(reportAttachment.fileSize)})
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-bold text-slate-800 text-xs truncate max-w-[240px] sm:max-w-xs mt-0.5">
                                        {reportAttachment.fileName || "ملف مرفق"}
                                      </p>
                                      <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        <span>{isArabic ? "جاهز للتحليل بالذكاء الاصطناعي" : "Ready for AI analysis"}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setReportAttachment(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                                    title={isArabic ? "إزالة المرفق" : "Remove attachment"}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })()
                          )}
                        </div>

                        {/* AI Generation Trigger */}
                        <button
                          type="button"
                          disabled={isGeneratingReport}
                          onClick={async () => {
                            setIsGeneratingReport(true);
                            setReportGenerationError("");
                            try {
                              const subjSpecificInst = getSubjectSpecificAiInstruction(settings.subjectDefaults, reportSubject);
                              const generalInst = settings.generalAiInstructions || "";
                              const effectiveAiInst = (newAiInstructions || "").trim();

                              const res = await onGenerateReportAi({
                                studentName: selectedStudent.fullName,
                                subject: reportSubject,
                                date: reportDate,
                                teacherName: settings.teacherName || undefined,
                                lessonNumber: reportLessonNumber,
                                lessonDuration: `${reportDurationMinutes} دقيقة`,
                                includeStudentName: true,
                                includeTeacherName: Boolean(settings.teacherName),
                                includeLessonNumber: true,
                                includeDuration: true,
                                includeLessonDate: true,
                                durationMinutes: reportDurationMinutes,
                                attendanceStatus: "حاضر",
                                homeworkStatus: reportHomeworkStatus,
                                classEvents: classEvents.trim() || undefined,
                                homeworkNotes: homeworkNotes.trim() || undefined,
                                overallEvaluation: overallEvaluation.trim() || undefined,
                                teacherNotes: `الحصة #${reportLessonNumber} (${reportDate}) - مدة الحصة: ${reportDurationMinutes} دقيقة\nما تم في الحصة: ${classEvents.trim() || "تم شرح الدرس ومتابعة التطبيق العملي."}\nالواجب: ${homeworkNotes.trim() || (reportHomeworkStatus === "no_homework" ? "لم يكن هناك واجب" : "حسب المعتاد")}\nحالة الواجب: ${
                                  reportHomeworkStatus === "no_homework"
                                    ? "لم يكن هناك واجب (لا تذكر أي بند أو سطر أو إشارة عن الواجب في التقرير نهائياً)"
                                    : reportHomeworkStatus === "done"
                                    ? "تم حل الواجب كاملاً ومتقن"
                                    : reportHomeworkStatus === "not_done"
                                    ? "لم يتم حل الواجب"
                                    : "تم حل الواجب بتأخير أو جزئياً"
                                }${overallEvaluation.trim() ? `\nالتقييم الإجمالي ومستوى الأداء: ${overallEvaluation.trim()}` : ""}`,
                                aiInstructions: effectiveAiInst,
                                generalAiInstructions: generalInst,
                                subjectAiInstructions: subjSpecificInst,
                                attachment: reportAttachment || undefined
                              });
                              if (res) {
                                setNewGeneratedReportText(res);
                                setReportGenerationError("");
                              }
                            } catch (err: any) {
                              const errorMsg = err?.message || String(err);
                              console.error("Failed to generate report:", errorMsg);
                              setReportGenerationError(errorMsg);
                            } finally {
                              setIsGeneratingReport(false);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingReport ? "animate-spin" : ""}`} />
                          <span>
                            {isGeneratingReport
                              ? (isArabic ? "جاري صياغة وتحليل التقرير والمرفقات بالذكاء الاصطناعي..." : "Analyzing & Generating...")
                              : (isArabic ? "✨ صياغة وتحليل التقرير بالذكاء الاصطناعي" : "Format & Analyze with AI")}
                          </span>
                        </button>

                        {/* Error Alert if AI fails */}
                        {reportGenerationError && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                            <span className="text-sm">⚠️</span>
                            <div>
                              <div className="font-bold">{isArabic ? "تعذر إنشاء التقرير بالذكاء الاصطناعي:" : "AI generation failed:"}</div>
                              <div className="text-[11px] text-rose-700 font-mono mt-0.5">{reportGenerationError}</div>
                            </div>
                          </div>
                        )}

                        {/* AI Report Editor & Save / Share Actions */}
                        {newGeneratedReportText ? (
                          <div className="space-y-2 pt-2">
                            <label className="block font-bold text-slate-800 text-xs">
                              {isArabic ? "التقرير المصاغ بالذكاء الاصطناعي (قابل للتعديل قبل الحفظ):" : "AI Generated Report:"}
                            </label>
                            <textarea
                              rows={4}
                              value={newGeneratedReportText}
                              onChange={e => setNewGeneratedReportText(e.target.value)}
                              className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-xl p-3 text-xs font-sans leading-relaxed focus:outline-none"
                            />

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const combinedNotes = [
                                    classEvents ? `ما حدث بالحصة: ${classEvents}` : "",
                                    homeworkNotes ? `الواجب: ${homeworkNotes}` : "",
                                    overallEvaluation ? `التقييم الإجمالي: ${overallEvaluation}` : ""
                                  ].filter(Boolean).join("\n");
                                  const finalReport = newGeneratedReportText || combinedNotes;
                                  if (!finalReport.trim()) return;

                                  onAddReport({
                                    studentId: selectedStudent.id,
                                    studentName: selectedStudent.fullName,
                                    subject: reportSubject.trim() || selectedStudent.subject || selectedStudent.subjects?.[0]?.subject || "عام",
                                    lessonNumber: reportLessonNumber,
                                    date: reportDate,
                                    durationMinutes: reportDurationMinutes,
                                    lessonDuration: reportDurationMinutes ? `${reportDurationMinutes} دقيقة` : undefined,
                                    attendance: "present",
                                    deductCost: true,
                                    homeworkStatus: reportHomeworkStatus,
                                    classEvents: classEvents,
                                    homeworkNotes: homeworkNotes,
                                    overallEvaluation: overallEvaluation || undefined,
                                    teacherNotes: combinedNotes,
                                    aiInstructions: newAiInstructions,
                                    reportText: finalReport,
                                    generatedText: finalReport
                                  });

                                  setShowCreateReportForm(false);
                                  setWhatsappSentNotice(isArabic ? "تم حفظ التقرير بملف الطالب بنجاح!" : "Report saved successfully!");
                                  setTimeout(() => setWhatsappSentNotice(""), 4000);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Check className="w-4 h-4" />
                                <span>{isArabic ? "حفظ التقرير بملف الطالب" : "Save to Student Profile"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const combinedNotes = [
                                    classEvents ? `ما حدث بالحصة: ${classEvents}` : "",
                                    homeworkNotes ? `الواجب: ${homeworkNotes}` : "",
                                    overallEvaluation ? `التقييم الإجمالي: ${overallEvaluation}` : ""
                                  ].filter(Boolean).join("\n");
                                  const text = newGeneratedReportText || combinedNotes;
                                  handleOpenWhatsAppChooser(text, selectedStudent);
                                }}
                                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                              >
                                <Share2 className="w-4 h-4" />
                                <span>{isArabic ? "إرسال للواتساب" : "WhatsApp"}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 flex justify-end gap-2">
                            {(classEvents.trim() || homeworkNotes.trim() || overallEvaluation.trim()) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const combinedNotes = [
                                    classEvents ? `ما حدث بالحصة:\n${classEvents}` : "",
                                    homeworkNotes ? `الواجب:\n${homeworkNotes}` : "",
                                    overallEvaluation ? `التقييم الإجمالي:\n${overallEvaluation}` : ""
                                  ].filter(Boolean).join("\n\n");
                                  const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\n${combinedNotes}`;
                                  handleOpenWhatsAppChooser(manualText, selectedStudent);
                                }}
                                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Share2 className="w-4 h-4" />
                                <span>{isArabic ? "مشاركة عبر الواتساب" : "WhatsApp"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!classEvents.trim() && !homeworkNotes.trim() && !overallEvaluation.trim()}
                              onClick={() => {
                                if (!classEvents.trim() && !homeworkNotes.trim() && !overallEvaluation.trim()) return;
                                const combinedNotes = [
                                  classEvents ? `ما حدث بالحصة:\n${classEvents}` : "",
                                  homeworkNotes ? `الواجب:\n${homeworkNotes}` : "",
                                  overallEvaluation ? `التقييم الإجمالي:\n${overallEvaluation}` : ""
                                ].filter(Boolean).join("\n\n");
                                const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\n${combinedNotes}`;

                                onAddReport({
                                  studentId: selectedStudent.id,
                                  studentName: selectedStudent.fullName,
                                  subject: reportSubject.trim() || selectedStudent.subject || selectedStudent.subjects?.[0]?.subject || "عام",
                                  lessonNumber: reportLessonNumber,
                                  date: reportDate,
                                  durationMinutes: reportDurationMinutes,
                                  lessonDuration: reportDurationMinutes ? `${reportDurationMinutes} دقيقة` : undefined,
                                  attendance: "present",
                                  deductCost: true,
                                  homeworkStatus: reportHomeworkStatus,
                                  classEvents: classEvents,
                                  homeworkNotes: homeworkNotes,
                                  overallEvaluation: overallEvaluation || undefined,
                                  teacherNotes: combinedNotes,
                                  aiInstructions: newAiInstructions,
                                  reportText: manualText,
                                  generatedText: manualText
                                });

                                setShowCreateReportForm(false);
                                setWhatsappSentNotice(isArabic ? "تم حفظ التقرير بملف الطالب بنجاح!" : "Report saved successfully!");
                                setTimeout(() => setWhatsappSentNotice(""), 4000);
                              }}
                              className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>{isArabic ? "حفظ التقرير المباشر" : "Save Direct Report"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Reports Header & Archive Filter Tabs (+6 Months Auto-Archiving) */}
                {(() => {
                  // Helper function to detect reports older than 6 months
                  const isReportOlderThan6Months = (dateStr: string): boolean => {
                    if (!dateStr) return false;
                    const rDate = new Date(dateStr);
                    if (isNaN(rDate.getTime())) return false;
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    return rDate < sixMonthsAgo;
                  };

                  const selIdStr = String(selectedStudent.id || "").trim();
                  const selNameNorm = (selectedStudent.fullName || "").trim().toLowerCase();

                  const rawStudentReports = reports.filter(
                    r => r && (
                      (r.studentId && String(r.studentId).trim() === selIdStr) ||
                      (r.studentName && r.studentName.trim().toLowerCase() === selNameNorm)
                    )
                  );
                  const studentReports = deduplicateReportsList(rawStudentReports);

                  // Also gather attendance records with reports
                  const studentAttendanceReports = attendanceRecords
                    .filter(ar => ar && (
                      (ar.studentId && String(ar.studentId).trim() === selIdStr) ||
                      (ar.studentName && ar.studentName.trim().toLowerCase() === selNameNorm)
                    ) && (ar.generatedReportText || ar.teacherNotes))
                    .map(ar => ({
                      id: ar.id,
                      studentId: ar.studentId,
                      studentName: selectedStudent.fullName,
                      subject: ar.subject || selectedStudent.subject,
                      lessonNumber: ar.lessonNumber,
                      attendance: ar.attendance,
                      deductCost: ar.deducted,
                      date: ar.date,
                      teacherNotes: ar.teacherNotes || "",
                      aiInstructions: ar.aiInstructions || "",
                      reportText: ar.generatedReportText || ar.teacherNotes || "",
                      generatedText: ar.generatedReportText || ar.teacherNotes || "",
                      archived: (ar as any).archived === true,
                      archiveGroup: (ar as any).archiveGroup,
                      archivedAt: (ar as any).archivedAt,
                      manuallyUnarchived: (ar as any).manuallyUnarchived === true,
                      createdAt: ar.date
                    }));

                  // Merge and deduplicate (strictly daily personal reports)
                  const allPastReports = mergeDirectAndAttendanceReports(
                    studentReports.filter(isDailyPersonalReport),
                    studentAttendanceReports
                  );

                  const activeCycle = getActiveCycleInfo(selectedStudent);

                  // Classify reports as Active or Archived (New month/package reports remain in active, archived stay in archive)
                  const classifiedReports = allPastReports.map(rep => {
                    const isArchived = rep.archived === true || !isReportInActiveCycle(rep, selectedStudent, activeCycle);
                    const archiveReason: "manual" | "auto_6_months" | null = isArchived ? "manual" : null;

                    return {
                      ...rep,
                      isArchived,
                      archiveReason
                    };
                  });

                  const activeCount = classifiedReports.filter(r => !r.isArchived).length;
                  const archivedCount = classifiedReports.filter(r => r.isArchived).length;
                  const totalCount = classifiedReports.length;

                  // Get list of unique subjects for filter
                  const availableSubjects = Array.from(
                    new Set(classifiedReports.map(r => r.subject || selectedStudent.subject).filter(Boolean))
                  );

                  // Filter for rendering based on active tab and search query
                  const filteredDisplayReports = classifiedReports.filter(rep => {
                    if (reportArchiveFilter === "active" && rep.isArchived) return false;
                    if (reportArchiveFilter === "archived" && !rep.isArchived) return false;

                    if (reportArchiveFilter === "archived") {
                      if (archiveSubjectFilter !== "all" && (rep.subject || selectedStudent.subject) !== archiveSubjectFilter) {
                        return false;
                      }
                      if (archiveSearchQuery.trim()) {
                        const q = archiveSearchQuery.toLowerCase();
                        const content = (rep.generatedText || rep.reportText || rep.teacherNotes || "").toLowerCase();
                        const subj = (rep.subject || "").toLowerCase();
                        const d = (rep.date || "").toLowerCase();
                        if (!content.includes(q) && !subj.includes(q) && !d.includes(q)) {
                          return false;
                        }
                      }
                    }

                    return true;
                  });

                  return (
                    <div className="space-y-3">
                      {/* Archive / Active Tabs Bar */}
                      {totalCount > 0 && (
                        <div className="p-2 rounded-2xl bg-slate-100/90 border border-slate-200/80 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                              {/* Tab 1: Active Reports */}
                              <button
                                type="button"
                                onClick={() => setReportArchiveFilter("active")}
                                className={`px-3 py-1.5 rounded-lg font-black text-xs transition flex items-center gap-1.5 ${
                                  reportArchiveFilter === "active"
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-purple-600 hover:bg-slate-50"
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{isArabic ? "سجل التقارير الحالية" : "Active Reports"}</span>
                                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                  reportArchiveFilter === "active"
                                    ? "bg-purple-800 text-purple-100"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {activeCount}
                                </span>
                              </button>

                              {/* Tab 2: Archived Reports */}
                              <button
                                type="button"
                                onClick={() => setReportArchiveFilter("archived")}
                                className={`px-3 py-1.5 rounded-lg font-black text-xs transition flex items-center gap-1.5 ${
                                  reportArchiveFilter === "archived"
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isArabic ? "التقارير المؤرشفة" : "Archived Reports"}</span>
                                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                  reportArchiveFilter === "archived"
                                    ? "bg-slate-950 text-amber-300"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {archivedCount}
                                </span>
                              </button>

                              {/* Tab 3: All Reports */}
                              <button
                                type="button"
                                onClick={() => setReportArchiveFilter("all")}
                                className={`px-2.5 py-1.5 rounded-lg font-black text-xs transition flex items-center gap-1.5 ${
                                  reportArchiveFilter === "all"
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                                }`}
                              >
                                <span>{isArabic ? "جميع التقارير" : "All"}</span>
                                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                  reportArchiveFilter === "all"
                                    ? "bg-indigo-800 text-indigo-100"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {totalCount}
                                </span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Action to Archive current cycle */}
                              <button
                                type="button"
                                onClick={() => setShowArchiveCycleModal(true)}
                                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                              >
                                <FolderArchive className="w-3.5 h-3.5 text-amber-300" />
                                <span>{isArabic ? "أرشفة الشهر / الباقة المنتهية" : "Archive Ended Cycle"}</span>
                              </button>

                              {onRecoverReports && (
                                <button
                                  type="button"
                                  onClick={onRecoverReports}
                                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                                  title={isArabic ? "استعادة التقارير المفقودة" : "Restore Missing Reports"}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                  <span>{isArabic ? "استعادة التقارير المفقودة" : "Restore Reports"}</span>
                                </button>
                              )}

                              {/* Data permanence badge */}
                              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isArabic ? "الحفظ الدائم مفعل" : "Permanent storage active"}</span>
                              </span>
                            </div>
                          </div>

                          {/* Sub-tools for Archived Tab (Search & Subject Filter) */}
                          {reportArchiveFilter === "archived" && (
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs animate-in fade-in">
                              <div className="relative flex-1 w-full">
                                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={archiveSearchQuery}
                                  onChange={e => setArchiveSearchQuery(e.target.value)}
                                  placeholder={isArabic ? "البحث في التقارير المؤرشفة (بالنص أو التاريخ)..." : "Search archived reports..."}
                                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              {availableSubjects.length > 1 && (
                                <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                                  <select
                                    value={archiveSubjectFilter}
                                    onChange={e => setArchiveSubjectFilter(e.target.value)}
                                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                                  >
                                    <option value="all">{isArabic ? "جميع المواد" : "All Subjects"}</option>
                                    {availableSubjects.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content: Folders for Archive vs Cards for Active */}
                      {reportArchiveFilter === "archived" ? (
                        <ArchivedReportsFolderList
                          groups={groupArchivedReports(classifiedReports.filter(r => r.isArchived), !isArabic)}
                          isArabic={isArabic}
                          onToggleArchiveReport={onToggleArchiveReport ? (repId) => {
                            onToggleArchiveReport(repId);
                            setWhatsappSentNotice(isArabic ? "تم استعادة التقرير إلى قائمة التقارير الحالية النشطة!" : "Report restored to active reports!");
                            setTimeout(() => setWhatsappSentNotice(""), 3000);
                          } : undefined}
                          onDeleteReport={(id) => onDeleteReport(id)}
                          onCopyReport={(r) => {
                            const text = r.generatedText || r.reportText || r.teacherNotes || "";
                            if (text && navigator?.clipboard) {
                              navigator.clipboard.writeText(text);
                            }
                          }}
                          onShareWhatsApp={(r) => {
                            const text = r.generatedText || r.reportText || r.teacherNotes || "";
                            if (text) {
                              handleOpenWhatsAppChooser(text, selectedStudent);
                            }
                          }}
                          searchActive={Boolean(archiveSearchQuery.trim())}
                        />
                      ) : totalCount === 0 ? (
                        <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">
                            {isArabic ? "لا توجد تقارير معتمدة محفوظة لهذا الطالب حتى الآن." : "No accepted reports saved for this student yet."}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {isArabic ? "اضغط على زر (كتابة تقرير جديد) أعلاه لإنشاء تقرير وصياغته بالذكاء الاصطناعي وحفظه." : "Click 'Write Report' above to generate and save one."}
                          </p>
                        </div>
                      ) : filteredDisplayReports.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
                          <FolderArchive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">
                            {isArabic ? "لا توجد تقارير نشطة حالياً للشهر أو الباقة الحالية." : "No active reports currently for this cycle."}
                          </p>
                          {archivedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setReportArchiveFilter("archived")}
                              className="mt-3 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition"
                            >
                              <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                              <span>{isArabic ? `عرض قسم الأرشيف (${archivedCount} تقارير)` : `View Archive (${archivedCount} reports)`}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredDisplayReports.length > 0 && (
                            <div className="flex items-center justify-between pb-1 px-1">
                              <span className="text-xs font-bold text-slate-500">
                                {isArabic ? `إجمالي التقارير المعروضة: (${filteredDisplayReports.length})` : `Reports shown: (${filteredDisplayReports.length})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (expandedReportIds.length === filteredDisplayReports.length) {
                                    setExpandedReportIds([]);
                                  } else {
                                    setExpandedReportIds(filteredDisplayReports.map(r => r.id));
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                              >
                                {expandedReportIds.length === filteredDisplayReports.length ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                                    <span>{isArabic ? "طي كل التقارير" : "Collapse All"}</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                                    <span>{isArabic ? "إظهار كل التقارير" : "Expand All"}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {filteredDisplayReports.map((rep, idx) => {
                            const finalReportContent = rep.generatedText || rep.reportText || rep.teacherNotes;
                            const isExpanded = expandedReportIds.includes(rep.id);
                            const lessonNum = rep.lessonNumber || (totalCount - idx);
                            const isAbsent = rep.attendance === "absent";
                            const repTitle = getReportTitle(rep, isArabic);

                            return (
                              <div
                                key={rep.id}
                                className={`rounded-2xl border overflow-hidden bg-white shadow-2xs transition ${
                                  rep.isArchived
                                    ? "border-slate-200/90 bg-slate-50/50 opacity-95"
                                    : isExpanded
                                    ? "border-purple-300 ring-1 ring-purple-100"
                                    : isAbsent
                                    ? "border-rose-200/80 hover:border-rose-300"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {/* Header - Shows ONLY Title and summary badges by default; click to toggle */}
                                <div
                                  onClick={() => toggleReportExpand(rep.id)}
                                  className={`p-3.5 cursor-pointer transition select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    isExpanded
                                      ? "bg-purple-50/40 border-b border-purple-100"
                                      : rep.isArchived
                                      ? "bg-slate-50/70 hover:bg-slate-100/70"
                                      : "bg-white hover:bg-slate-50/80"
                                  }`}
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    {/* Report Title */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2.5 py-0.5 rounded-lg text-white font-black text-xs shrink-0 shadow-2xs ${
                                        rep.reportType === "monthly_comprehensive" || rep.evaluationMonth
                                          ? "bg-indigo-600"
                                          : rep.isArchived
                                          ? "bg-slate-700"
                                          : isAbsent
                                          ? "bg-rose-600"
                                          : "bg-purple-600"
                                      }`}>
                                        {rep.reportType === "monthly_comprehensive" || rep.evaluationMonth
                                          ? (isArabic ? "📊 تقرير شهري شامل" : "📊 Monthly Report")
                                          : (isArabic ? `الحصة #${lessonNum}` : `Lesson #${lessonNum}`)}
                                      </span>

                                      <h4 className="font-black text-sm text-slate-900 truncate">
                                        {repTitle}
                                      </h4>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                        📚 {rep.subject || selectedStudent.subject}
                                      </span>

                                      <span className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                                        📅 {rep.date}
                                      </span>

                                      {/* Attendance Status Badge */}
                                      {isAbsent ? (
                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                          <span>🔴 {isArabic ? "غائب" : "Absent"}</span>
                                          <span>({rep.deductCost ? (isArabic ? "تم الخصم" : "Deducted") : (isArabic ? "بدون خصم" : "Excused")})</span>
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                          <span>🟢 {isArabic ? "حاضر" : "Present"}</span>
                                        </span>
                                      )}

                                      {/* Archive Badge */}
                                      {rep.isArchived && (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1">
                                          <Archive className="w-3 h-3 text-slate-500" />
                                          <span>
                                            {(rep.archiveReason as string) === "auto_6_months"
                                              ? isArabic ? "مؤرشف تلقائياً (+6 أشهر)" : "Auto-Archived (+6m)"
                                              : isArabic ? "مؤرشف" : "Archived"}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Toggle Button for Full Report & Actions */}
                                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleReportExpand(rep.id);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-2xs ${
                                        isExpanded
                                          ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                                      }`}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <EyeOff className="w-3.5 h-3.5" />
                                          <span>{isArabic ? "إخفاء التقرير" : "Hide Report"}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                                          <span>{isArabic ? "إظهار التقرير كامل" : "Show Full Report"}</span>
                                        </>
                                      )}
                                    </button>

                                    {onToggleArchiveReport && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleArchiveReport(rep.id);
                                          setWhatsappSentNotice(
                                            rep.isArchived
                                              ? (isArabic ? "تم استعادة التقرير إلى قائمة التقارير الحالية النشطة!" : "Report restored to active!")
                                              : (isArabic ? "تم نقل التقرير إلى قسم الأرشيف بنجاح!" : "Report archived!")
                                          );
                                          setTimeout(() => setWhatsappSentNotice(""), 3000);
                                        }}
                                        className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 border shadow-2xs ${
                                          rep.isArchived
                                            ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                                            : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                                        }`}
                                        title={rep.isArchived ? (isArabic ? "استعادة للتقارير الحالية النشطة" : "Restore to Active") : (isArabic ? "نقل التقرير للأرشيف يدوياً" : "Archive Report")}
                                      >
                                        {rep.isArchived ? (
                                          <>
                                            <ArchiveRestore className="w-3.5 h-3.5 text-purple-600" />
                                            <span>{isArabic ? "استعادة" : "Restore"}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Archive className="w-3.5 h-3.5 text-amber-600" />
                                            <span>{isArabic ? "أرشفة" : "Archive"}</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {onDeleteReport && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReportToDeleteId(rep.id);
                                        }}
                                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                                        title={isArabic ? "حذف التقرير" : "Delete Report"}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Collapsible Content */}
                                {isExpanded && (
                                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3 text-xs animate-in fade-in">
                                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200/80 pb-2">
                                      <span>{isArabic ? "نص التقرير الكامل:" : "Full Report Content:"}</span>
                                      <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                        {isArabic ? "مكتمل ومسجل بالنظام" : "Recorded"}
                                      </span>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border space-y-1.5 shadow-inner leading-relaxed whitespace-pre-wrap font-sans text-xs ${
                                      isAbsent
                                        ? "bg-rose-950 text-rose-50 border-rose-900"
                                        : "bg-slate-900 text-slate-100 border-slate-800"
                                    }`}>
                                      {finalReportContent}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Copy Button */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(finalReportContent);
                                            setCopiedReportId(rep.id);
                                            setTimeout(() => setCopiedReportId(null), 2000);
                                          }}
                                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                        >
                                          {copiedReportId === rep.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                                              <span className="text-emerald-700">{isArabic ? "تم النسخ" : "Copied"}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span>{isArabic ? "نسخ التقرير" : "Copy"}</span>
                                            </>
                                          )}
                                        </button>

                                        {/* WhatsApp Send Button */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleOpenWhatsAppChooser(finalReportContent, selectedStudent);
                                          }}
                                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                        >
                                          <Share2 className="w-3.5 h-3.5" />
                                          <span>{isArabic ? "إرسال بالواتساب" : "Send WhatsApp"}</span>
                                        </button>

                                        {/* Toggle Archive / Unarchive Button */}
                                        {onToggleArchiveReport && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onToggleArchiveReport(rep.id);
                                              setWhatsappSentNotice(
                                                rep.isArchived
                                                  ? (isArabic ? "تم استعادة التقرير إلى قائمة التقارير الحالية النشطة!" : "Report restored to active!")
                                                  : (isArabic ? "تم نقل التقرير إلى قسم الأرشيف بنجاح!" : "Report archived!")
                                              );
                                              setTimeout(() => setWhatsappSentNotice(""), 3000);
                                            }}
                                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 shadow-2xs border ${
                                              rep.isArchived
                                                ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                                : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
                                            }`}
                                          >
                                            {rep.isArchived ? (
                                              <>
                                                <ArchiveRestore className="w-3.5 h-3.5 text-purple-600" />
                                                <span>{isArabic ? "استعادة للنشط" : "Restore"}</span>
                                              </>
                                            ) : (
                                              <>
                                                <Archive className="w-3.5 h-3.5 text-amber-600" />
                                                <span>{isArabic ? "أرشفة التقرير" : "Archive"}</span>
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>

                                      {/* Delete Report Button */}
                                      {onDeleteReport && (
                                        <button
                                          type="button"
                                          onClick={() => setReportToDeleteId(rep.id)}
                                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition flex items-center gap-1"
                                          title={isArabic ? "حذف التقرير" : "Delete"}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                          <span>{isArabic ? "حذف التقرير" : "Delete"}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Quick Jump Banner in Active Tab if Archived reports exist */}
                          {reportArchiveFilter === "active" && archivedCount > 0 && (
                            <div className="p-3.5 bg-gradient-to-r from-slate-100 to-indigo-50/50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-700 shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                                  <FolderArchive className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {isArabic
                                      ? `يوجد ${archivedCount} تقرير قديم في الأرشيف (مر عليها أكثر من 6 أشهر)`
                                      : `${archivedCount} archived reports (+6 months)`}
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 font-medium">
                                    {isArabic
                                      ? "تم نقلها تلقائياً للأرشيف لتحسين أداء وتحميل الصفحة بسرعة فائقة."
                                      : "Moved to archive to maximize student profile loading speed."}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setReportArchiveFilter("archived")}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition shrink-0"
                              >
                                <Archive className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isArabic ? "فتح قسم الأرشيف" : "View Archive"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab: Comprehensive Monthly Reports (معزولة تماماً في خانة وتبويب مستقل) */}
            {profileTab === "monthly_reports" && (
              <div className="space-y-4 animate-in fade-in">
                {/* Header Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-cyan-50/80 border border-teal-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>{isArabic ? "تقارير الأداء الشهرية الشاملة" : "Comprehensive Monthly Reports"}</span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      {isArabic
                        ? `سجل التقييمات الشهرية الرسمية الشاملة لـ (${selectedStudent.fullName}) مع إحصائيات الحصص وساعات الحضور ومؤشرات الإتقان.`
                        : `Official monthly evaluation reports for (${selectedStudent.fullName}) including attendance, hours, and mastery metrics.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-create-monthly-report-profile"
                    onClick={() => {
                      const targetSubj = selectedStudent.subjects && selectedStudent.subjects.length > 0
                        ? selectedStudent.subjects[0].subject
                        : (selectedStudent.subject || "قرآن كريم");
                      setMonthlyReportModalTarget({ student: selectedStudent, subject: targetSubj });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-2 transition active:scale-95 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isArabic ? "✨ إنشاء تقرير شهري شامل" : "✨ Create Monthly Report"}</span>
                  </button>
                </div>

                {/* List of Saved Monthly Reports */}
                {(() => {
                  const selId = String(selectedStudent.id || "").trim();
                  const selName = (selectedStudent.fullName || "").trim().toLowerCase();
                  const monthlyReports = deduplicateReportsList(
                    reports.filter(
                      r =>
                        r &&
                        ((r.studentId && String(r.studentId).trim() === selId) ||
                         (r.studentName && r.studentName.trim().toLowerCase() === selName)) &&
                        isMonthlyComprehensiveReport(r)
                    )
                  ).sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

                  if (monthlyReports.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-500 text-xs space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-2xs">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">
                            {isArabic ? "لا توجد تقارير شهرية شاملة محفوظة لهذا الطالب بعد" : "No monthly reports saved yet for this student"}
                          </p>
                          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                            {isArabic
                              ? "التقارير الشهرية الشاملة معزولة تماماً في هذا التبويب، وتجمع إحصائيات الشهر وساعات الحضور ومؤشرات الإتقان في وثيقة رسمية متكاملة."
                              : "Comprehensive monthly reports are completely isolated in this tab, aggregating hours, lessons, and performance into a formal evaluation."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const targetSubj = selectedStudent.subjects && selectedStudent.subjects.length > 0
                              ? selectedStudent.subjects[0].subject
                              : (selectedStudent.subject || "قرآن كريم");
                            setMonthlyReportModalTarget({ student: selectedStudent, subject: targetSubj });
                          }}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-xs inline-flex items-center gap-2 transition active:scale-95"
                        >
                          <Sparkles className="w-4 h-4 text-teal-200" />
                          <span>{isArabic ? "إنشاء التقرير الشهري الأول للطالب" : "Create First Monthly Report"}</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
                        <span>
                          {isArabic ? `التقارير الشهرية الشاملة المحفوظة (${monthlyReports.length})` : `Saved Monthly Reports (${monthlyReports.length})`}
                        </span>
                      </div>

                      {monthlyReports.map((rep) => {
                        const content = rep.reportText || rep.generatedText || rep.teacherNotes || "";
                        const isExpanded = expandedReportIds.includes(rep.id);

                        return (
                          <div
                            key={rep.id}
                            className="p-4 rounded-2xl bg-white border border-teal-200/80 hover:border-teal-300 shadow-2xs space-y-3 transition"
                          >
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-black text-xs flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                  <span>{rep.evaluationMonth || (isArabic ? "تقرير شهري شامل" : "Monthly Report")}</span>
                                </span>

                                <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{rep.subject || selectedStudent.subject}</span>
                                </span>

                                {rep.date && (
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {rep.date}
                                  </span>
                                )}
                              </div>

                              {/* Stats pills */}
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                {rep.lessonNumber !== undefined && rep.lessonNumber > 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                    {rep.lessonNumber} {isArabic ? "حصة" : "lessons"}
                                  </span>
                                )}
                                {rep.durationMinutes !== undefined && rep.durationMinutes > 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70">
                                    {Math.round((rep.durationMinutes / 60) * 10) / 10} {isArabic ? "ساعة" : "hrs"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Content preview or full */}
                            <div className={`text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap rounded-xl p-3.5 border ${
                              isExpanded ? "bg-slate-50/80 border-slate-200" : "bg-slate-50/50 border-slate-100 max-h-36 overflow-hidden relative"
                            }`}>
                              {content}
                              {!isExpanded && (
                                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-50 to-transparent flex items-end justify-center pb-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedReportIds(prev => [...prev, rep.id])}
                                    className="px-3 py-1 rounded-lg bg-white/90 border border-slate-200 text-teal-700 font-bold text-[11px] shadow-2xs hover:bg-white transition flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3 text-teal-600" />
                                    <span>{isArabic ? "عرض التقرير كاملاً" : "Read More"}</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Actions toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Toggle Expand/Collapse */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedReportIds(prev =>
                                      prev.includes(rep.id) ? prev.filter(id => id !== rep.id) : [...prev, rep.id]
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{isArabic ? "طي التقرير" : "Collapse"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                                      <span>{isArabic ? "عرض كامل" : "Expand"}</span>
                                    </>
                                  )}
                                </button>

                                {/* Copy Report */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(content);
                                    setCopiedReportId(rep.id);
                                    setTimeout(() => setCopiedReportId(null), 2000);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                >
                                  {copiedReportId === rep.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">{isArabic ? "تم النسخ" : "Copied"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>{isArabic ? "نسخ النص" : "Copy"}</span>
                                    </>
                                  )}
                                </button>

                                {/* WhatsApp Share */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsAppChooser(content, selectedStudent)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>{isArabic ? "مشاركة عبر واتساب" : "WhatsApp"}</span>
                                </button>
                              </div>

                              {/* Delete Report */}
                              {onDeleteReport && (
                                <button
                                  type="button"
                                  onClick={() => setReportToDeleteId(rep.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition flex items-center gap-1"
                                  title={isArabic ? "حذف التقرير الشهري" : "Delete Monthly Report"}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>{isArabic ? "حذف" : "Delete"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isArabic ? `تسجيل دفعة مالية لـ ${selectedStudent.fullName}` : "Record Payment"}
              </h3>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              {/* Multi-subject allocation mode toggle */}
              {selectedStudent.subjects && selectedStudent.subjects.length > 1 && (
                <div className="mb-2 space-y-2">
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentPaymentAllocMode("per_subject");
                        let sum = 0;
                        selectedStudent.subjects!.forEach(sub => {
                          sum += Number(studentPaymentAllocMap[sub.id || sub.subject]) || 0;
                        });
                        setPaymentAmount(sum);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition text-center ${
                        studentPaymentAllocMode === "per_subject"
                          ? "bg-white text-emerald-700 font-black shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isArabic ? "🔀 توزيع للمواد" : "Per Subject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentPaymentAllocMode("single_subject")}
                      className={`flex-1 py-1.5 rounded-lg transition text-center ${
                        studentPaymentAllocMode === "single_subject"
                          ? "bg-white text-blue-700 font-black shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isArabic ? "🎯 مادة واحدة" : "Single Subject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentPaymentAllocMode("general")}
                      className={`flex-1 py-1.5 rounded-lg transition text-center ${
                        studentPaymentAllocMode === "general"
                          ? "bg-white text-slate-900 font-black shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isArabic ? "⚡ سداد عام" : "General"}
                    </button>
                  </div>
                </div>
              )}

              {/* Conditional Amount Fields */}
              {selectedStudent.subjects && selectedStudent.subjects.length > 1 && studentPaymentAllocMode === "per_subject" ? (
                <div className="space-y-2">
                  <label className="block font-black text-slate-700">
                    {isArabic ? "المبلغ المخصص لكل مادة:" : "Amount for each subject:"}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedStudent.subjects.map(sub => {
                      const key = sub.id || sub.subject;
                      const curVal = studentPaymentAllocMap[key] ?? 0;
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-900">{sub.subject}</span>
                            <span className="text-[10px] text-slate-500">
                              {sub.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")}
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={curVal === 0 ? "" : curVal}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setStudentPaymentAllocMap(prev => {
                                  const next = { ...prev, [key]: val };
                                  let sum = 0;
                                  selectedStudent.subjects!.forEach(s => {
                                    const k = s.id || s.subject;
                                    sum += Number(next[k]) || 0;
                                  });
                                  setPaymentAmount(sum);
                                  return next;
                                });
                              }}
                              placeholder="0"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-slate-800 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              {isArabic ? "ج.م" : "EGP"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-black">
                    <span className="text-emerald-800">{isArabic ? "إجمالي المبلغ المحسوب:" : "Total Allocated:"}</span>
                    <span className="text-sm text-emerald-700">{paymentAmount} {isArabic ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
              ) : selectedStudent.subjects && selectedStudent.subjects.length > 1 && studentPaymentAllocMode === "single_subject" ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isArabic ? "اختر المادة المراد سدادها:" : "Select Subject:"}
                    </label>
                    <select
                      value={studentPaymentSingleSubject}
                      onChange={e => setStudentPaymentSingleSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:outline-none focus:border-blue-500"
                    >
                      {selectedStudent.subjects.map(sub => (
                        <option key={sub.id || sub.subject} value={sub.id || sub.subject}>
                          {sub.subject} ({sub.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isArabic ? "المبلغ المدفوع (بالجنيه) *" : "Amount Paid (EGP) *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-base text-emerald-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "المبلغ المدفوع (بالجنيه) *" : "Amount Paid (EGP) *"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-base text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "تاريخ التحصيل" : "Payment Date"}
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات الدفع (اختياري)" : "Payment Notes (Optional)"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={isArabic ? "سداد نقدي، تحويل فودافون كاش، إنستاباي..." : "Payment notes..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30"
                >
                  {isArabic ? "حفظ الدفعة" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Exam Score */}
      {showExamModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-base mb-3">
              {isArabic ? "إضافة درجة اختبار جديدة" : "Add Exam Score"}
            </h3>

            <form onSubmit={handleExamSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "اسم الاختبار" : "Exam Name"}
                </label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "الدرجة التي حصل عليها" : "Score Obtained"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={score}
                    onChange={e => setScore(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "الدرجة الكلية" : "Total Score"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={totalScore}
                    onChange={e => setTotalScore(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30"
                >
                  {isArabic ? "حفظ النتيجة" : "Save Score"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Student */}
      {showEditStudentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl my-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {isArabic ? "تعديل بيانات الطالب والمواد" : "Edit Student & Subjects"}
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {isArabic ? "تعديل المواد وأنظمة الدفع والاشتراك المخصصة" : "Update subjects, payment plans and subscriptions"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStudentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-3 my-3 text-xs">
              {/* Top Compact Student Info Grid */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "اسم الطالب بالكامل *" : "Student Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={e => setEditFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رقم ولي الأمر (واتساب)" : "Parent Phone (WhatsApp)"}
                    </label>
                    <input
                      type="tel"
                      value={editParentContact}
                      onChange={e => setEditParentContact(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold dir-ltr text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Grade & Curriculum Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      🎓 {isArabic ? "الصف الدراسي / المرحلة" : "Academic Grade / Year"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={COMMON_GRADES.includes(editAcademicYear) ? editAcademicYear : (editAcademicYear ? "other" : "")}
                        onChange={e => {
                          if (e.target.value === "other") {
                            setEditAcademicYear("");
                          } else {
                            setEditAcademicYear(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="">{isArabic ? "-- اختر الصف الدراسي --" : "-- Select Grade --"}</option>
                        {COMMON_GRADES.map(g => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                        <option value="other">{isArabic ? "✏️ كتابة صف آخر يدوياً..." : "✏️ Custom Grade..."}</option>
                      </select>

                      {(!COMMON_GRADES.includes(editAcademicYear) || editAcademicYear === "") && (
                        <input
                          type="text"
                          value={editAcademicYear}
                          onChange={e => setEditAcademicYear(e.target.value)}
                          placeholder={isArabic ? "أو اكتب الصف (مثال: الصف الثاني الثانوي - علمي)" : "Or type custom grade..."}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      🌍 {isArabic ? "المنهج الدراسي (مصري، سعودي...)" : "Curriculum System"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={COMMON_CURRICULUMS.some(c => c.label === editCurriculum) ? editCurriculum : (editCurriculum ? "other" : "")}
                        onChange={e => {
                          if (e.target.value === "other") {
                            setEditCurriculum("");
                          } else {
                            setEditCurriculum(e.target.value);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="">{isArabic ? "-- اختر المنهج --" : "-- Select Curriculum --"}</option>
                        {COMMON_CURRICULUMS.map(c => (
                          <option key={c.label} value={c.label}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                        <option value="other">{isArabic ? "✏️ كتابة منهج آخر يدوياً..." : "✏️ Custom Curriculum..."}</option>
                      </select>

                      {(!COMMON_CURRICULUMS.some(c => c.label === editCurriculum) || editCurriculum === "") && (
                        <input
                          type="text"
                          value={editCurriculum}
                          onChange={e => setEditCurriculum(e.target.value)}
                          placeholder={isArabic ? "اكتب اسم المنهج (مثال: منهج سعودي - مقررات)" : "Or type custom curriculum..."}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      📱 {isArabic ? "هاتف الطالب (اختياري)" : "Student Phone"}
                    </label>
                    <input
                      type="text"
                      value={editStudentPhone}
                      onChange={e => setEditStudentPhone(e.target.value)}
                      placeholder="+201..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500 dir-ltr text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رقم/كود الطالب (اختياري)" : "Student ID (Optional)"}
                    </label>
                    <input
                      type="tel"
                      value={editStudentNumber}
                      onChange={e => setEditStudentNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dir-ltr text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رابط جروب الواتساب" : "WhatsApp Group Link"}
                    </label>
                    <input
                      type="url"
                      value={editWhatsappGroupLink}
                      onChange={e => setEditWhatsappGroupLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 text-left dir-ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Subject Editor - Space Efficient Bento Rows */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isArabic ? "المواد الدراسية ونظام الدفع لكل مادة" : "Subjects & Payment Plans"}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[9.5px] font-bold">
                      {editStudentSubjects.length}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddEditSubjectField}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isArabic ? "+ مادة أخرى" : "+ Subject"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editStudentSubjects.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 relative transition-all"
                    >
                      {/* Row 1: Subject Name + Suggestions + Study Type + Delete */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={sub.subject}
                            onChange={e => handleUpdateEditSubjectField(idx, { subject: e.target.value })}
                            placeholder={isArabic ? "اكتب اسم المادة (مثال: فيزياء، لغة عربية، كيمياء...)" : "Subject name (e.g. Physics, Arabic, Math...)"}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
                          />
                          {/* Quick Subject Suggestion Chips */}
                          <div className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5 max-w-xs">
                            {COMMON_SUBJECT_SUGGESTIONS.slice(0, 5).map(sugg => (
                              <button
                                key={sugg}
                                type="button"
                                onClick={() => handleUpdateEditSubjectField(idx, { subject: sugg })}
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition shrink-0 ${
                                  sub.subject === sugg
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {sugg}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Controls: Study Type & Delete */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {/* Study Type Segmented Control */}
                          <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleUpdateEditSubjectField(idx, { studyType: "private" })}
                              className={`px-2 py-0.5 rounded-md transition ${
                                sub.studyType === "private"
                                  ? "bg-white text-blue-700 shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              👤 {isArabic ? "خاص" : "Private"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateEditSubjectField(idx, { studyType: "group" })}
                              className={`px-2 py-0.5 rounded-md transition ${
                                sub.studyType === "group"
                                  ? "bg-white text-blue-700 shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              👥 {isArabic ? "مجموعة" : "Group"}
                            </button>
                          </div>

                          {editStudentSubjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditSubjectField(idx)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                              title={isArabic ? "حذف المادة" : "Remove"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Billing Type Selection */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-600" />
                          <span>{isArabic ? "طريقة الدفع والمحاسبة للمادة:" : "Billing Method for Subject:"}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { billingType: "monthly_elapsed_lessons" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              (sub.billingType || "monthly_elapsed_lessons") === "monthly_elapsed_lessons"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>🗓️ {isArabic ? "حساب آخر الشهر (حصص منقضية)" : "Elapsed Month Lessons"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "حسب الحصص والساعات الفعلية" : "Based on actual lessons & hours"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { billingType: "monthly" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              sub.billingType === "monthly"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>📅 {isArabic ? "الشهر كامل" : "Full Month"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "اشتراك شهري ثابت (سعر محدد)" : "Flat Monthly Subscription"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { billingType: "monthly_fixed_lessons" })}
                            className={`p-2 rounded-xl border text-[10.5px] font-bold text-center transition flex flex-col items-center justify-center gap-0.5 ${
                              sub.billingType === "monthly_fixed_lessons"
                                ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>🎯 {isArabic ? "باقة حصص محددة" : "Fixed Lessons / Mo"}</span>
                            <span className="text-[9px] opacity-75 font-medium">{isArabic ? "عدد حصص ثابت شهرياً" : "Set Lessons Count"}</span>
                          </button>
                        </div>

                        {/* Cost Inputs matching selected billing mode */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Case 1: Full Month - Monthly Cost with Division on Lessons Tool */}
                          {sub.billingType === "monthly" && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-purple-200/80 shadow-2xs">
                                <span className="text-xs font-bold text-slate-700 shrink-0">
                                  {isArabic ? "سعر الاشتراك للشهر الكامل:" : "Full Month Cost:"}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  required
                                  value={sub.monthlyCost !== undefined ? sub.monthlyCost : 400}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const lessonsCount = sub.lessonsPerMonth || 4;
                                    handleUpdateEditSubjectField(idx, {
                                      monthlyCost: val,
                                      lessonCost: Math.max(0, Number((val / lessonsCount).toFixed(2)))
                                    });
                                  }}
                                  className="w-full font-black text-purple-900 text-sm focus:outline-none"
                                  placeholder="400"
                                />
                                <span className="text-xs font-bold text-purple-600 shrink-0">{isArabic ? "ج.م / شهر" : "EGP / month"}</span>
                              </div>

                              {/* Duration open input for monthly */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur });
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 15, 20, 25, 30, 45, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur })}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-purple-900">
                                    {isArabic ? "➗ تقسيم الشهر على عدد الحصص:" : "Divide month by lessons:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[4, 8, 12].map(num => (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => {
                                          const mCost = sub.monthlyCost || 400;
                                          handleUpdateEditSubjectField(idx, {
                                            lessonsPerMonth: num,
                                            lessonCost: Math.max(0, Number((mCost / num).toFixed(2)))
                                          });
                                        }}
                                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
                                          (sub.lessonsPerMonth || 4) === num
                                            ? "bg-purple-600 text-white shadow-2xs"
                                            : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-100"
                                        }`}
                                      >
                                        {num} {isArabic ? "حصص" : "lss"}
                                      </button>
                                    ))}
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      placeholder={isArabic ? "مخصص" : "Custom"}
                                      value={sub.lessonsPerMonth || 4}
                                      onChange={e => {
                                        const num = Math.max(1, parseInt(e.target.value) || 1);
                                        const mCost = sub.monthlyCost || 400;
                                        handleUpdateEditSubjectField(idx, {
                                          lessonsPerMonth: num,
                                          lessonCost: Math.max(0, Number((mCost / num).toFixed(2)))
                                        });
                                      }}
                                      className="w-14 bg-white border border-purple-200 rounded-lg px-1.5 py-0.5 text-center font-bold text-slate-800 text-[11px] focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="text-[11px] font-black text-purple-800 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                                  {isArabic ? "سعر الحصة =" : "Rate/Lesson ="} {sub.lessonCost || Number(((sub.monthlyCost || 400) / (sub.lessonsPerMonth || 4)).toFixed(2))} {isArabic ? "ج.م" : "EGP"}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Case 2: Calendar Elapsed Lessons - Lesson / Hourly Cost */}
                          {(sub.billingType === "monthly_elapsed_lessons" || (!sub.billingType && sub.billingType !== "monthly_fixed_lessons")) && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "طريقة التسعير:" : "Pricing Basis:"}
                                  </span>
                                  <select
                                    value={sub.rateType || "per_lesson"}
                                    onChange={e => {
                                      const newRateType = e.target.value as "per_lesson" | "per_hour";
                                      const currentHourly = sub.hourlyCost || sub.lessonCost || 100;
                                      const dur = sub.defaultDurationMinutes || 60;
                                      const calculatedLessonCost = newRateType === "per_hour" ? Math.max(0, Number(((currentHourly * dur) / 60).toFixed(2))) : sub.lessonCost;
                                      handleUpdateEditSubjectField(idx, {
                                        rateType: newRateType,
                                        hourlyCost: currentHourly,
                                        defaultDurationMinutes: dur,
                                        lessonCost: calculatedLessonCost
                                      });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="per_lesson">{isArabic ? "💵 سعر الحصة" : "💵 Price per Lesson"}</option>
                                    <option value="per_hour">{isArabic ? "⏱️ سعر الساعة" : "⏱️ Price per Hour"}</option>
                                  </select>
                                </div>

                                {sub.rateType === "per_hour" ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الساعة:" : "Hourly Rate:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.hourlyCost || sub.lessonCost || 100}
                                      onChange={e => {
                                        const hCost = parseFloat(e.target.value) || 0;
                                        const dur = sub.defaultDurationMinutes || 60;
                                        const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                        handleUpdateEditSubjectField(idx, {
                                          hourlyCost: hCost,
                                          lessonCost: lCost
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/ساعة" : "EGP/h"}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الحصة:" : "Lesson Cost:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.lessonCost}
                                      onChange={e => {
                                        const cost = parseFloat(e.target.value) || 0;
                                        handleUpdateEditSubjectField(idx, {
                                          lessonCost: cost,
                                          hourlyCost: cost
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/حصة" : "EGP"}</span>
                                  </div>
                                )}
                              </div>

                              {/* Duration open input for elapsed lessons */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          handleUpdateEditSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost
                                          });
                                        } else {
                                          handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 15, 20, 25, 30, 45, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => {
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          handleUpdateEditSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost
                                          });
                                        } else {
                                          handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                                <span className="font-bold text-slate-700 text-[11px]">
                                  {sub.rateType === "per_hour" ? (isArabic ? "⏱️ سعر الحصة المحسوب بالساعة:" : "Calculated Lesson Price:") : (isArabic ? "💵 تفاصيل سعر الحصة:" : "Lesson Price Breakdown:")}
                                </span>
                                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs text-[11px]">
                                  {sub.rateType === "per_hour"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م لكل حصة" : "EGP / lesson"} (${sub.hourlyCost || 100} ج.م/س × ${sub.defaultDurationMinutes || 60} دقيقة)`
                                    : `= ${sub.lessonCost} ${isArabic ? "ج.م لكل حصة" : "EGP / lesson"} (المدة: ${sub.defaultDurationMinutes || 60} دقيقة | مكافئ: ${Number((((sub.lessonCost || 100) / (sub.defaultDurationMinutes || 60)) * 60).toFixed(1))} ج.م/س)`}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Case 3: Fixed Lessons Package - Lesson / Hourly Cost + Lessons Per Month */}
                          {sub.billingType === "monthly_fixed_lessons" && (
                            <div className="sm:col-span-2 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "التسعير:" : "Pricing:"}
                                  </span>
                                  <select
                                    value={sub.rateType || "per_lesson"}
                                    onChange={e => {
                                      const newRateType = e.target.value as "per_lesson" | "per_hour";
                                      const currentHourly = sub.hourlyCost || sub.lessonCost || 100;
                                      const dur = sub.defaultDurationMinutes || 60;
                                      const calculatedLessonCost = newRateType === "per_hour" ? Math.max(0, Number(((currentHourly * dur) / 60).toFixed(2))) : sub.lessonCost;
                                      handleUpdateEditSubjectField(idx, {
                                        rateType: newRateType,
                                        hourlyCost: currentHourly,
                                        defaultDurationMinutes: dur,
                                        lessonCost: calculatedLessonCost,
                                        monthlyCost: Number((calculatedLessonCost * (sub.lessonsPerMonth || 8)).toFixed(2))
                                      });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="per_lesson">{isArabic ? "💵 سعر الحصة" : "💵 Price/Lesson"}</option>
                                    <option value="per_hour">{isArabic ? "⏱️ سعر الساعة" : "⏱️ Price/Hour"}</option>
                                  </select>
                                </div>

                                {sub.rateType === "per_hour" ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الساعة:" : "Hourly:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.hourlyCost || sub.lessonCost || 100}
                                      onChange={e => {
                                        const hCost = parseFloat(e.target.value) || 0;
                                        const dur = sub.defaultDurationMinutes || 60;
                                        const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                        handleUpdateEditSubjectField(idx, {
                                          hourlyCost: hCost,
                                          lessonCost: lCost,
                                          monthlyCost: Number((lCost * (sub.lessonsPerMonth || 8)).toFixed(2))
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "ج.م/س" : "EGP/h"}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                      {isArabic ? "سعر الحصة:" : "Cost:"}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      required
                                      value={sub.lessonCost}
                                      onChange={e => {
                                        const cost = parseFloat(e.target.value) || 0;
                                        handleUpdateEditSubjectField(idx, {
                                          lessonCost: cost,
                                          hourlyCost: cost,
                                          monthlyCost: Number((cost * (sub.lessonsPerMonth || 8)).toFixed(2))
                                        });
                                      }}
                                      className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                      placeholder="100"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">ج.م</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                                    {isArabic ? "الحصص شهرياً:" : "Lessons/Mo:"}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={sub.lessonsPerMonth || 8}
                                    onChange={e => {
                                      const count = Number(e.target.value);
                                      handleUpdateEditSubjectField(idx, {
                                        lessonsPerMonth: count,
                                        monthlyCost: count * (sub.lessonCost || 100)
                                      });
                                    }}
                                    className="w-full font-black text-slate-800 text-xs focus:outline-none"
                                    placeholder="8"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{isArabic ? "حصة" : "lessons"}</span>
                                </div>
                              </div>

                              {/* Duration open input for fixed lessons */}
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {isArabic ? "مدة الحصة الافتراضية:" : "Default Duration:"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="360"
                                      value={sub.defaultDurationMinutes || ""}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const dur = isNaN(val) ? 0 : Math.max(1, val);
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateEditSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 text-center"
                                      placeholder="60"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 15, 20, 25, 30, 45, 60, 75, 90, 120].map(dur => (
                                    <button
                                      type="button"
                                      key={dur}
                                      onClick={() => {
                                        if (sub.rateType === "per_hour") {
                                          const hCost = sub.hourlyCost || sub.lessonCost || 100;
                                          const lCost = Math.max(0, Number(((hCost * dur) / 60).toFixed(2)));
                                          const count = sub.lessonsPerMonth || 8;
                                          handleUpdateEditSubjectField(idx, {
                                            defaultDurationMinutes: dur,
                                            lessonCost: lCost,
                                            monthlyCost: Number((lCost * count).toFixed(2))
                                          });
                                        } else {
                                          handleUpdateEditSubjectField(idx, { defaultDurationMinutes: dur });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                        (sub.defaultDurationMinutes || 60) === dur
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {dur === 60 ? (isArabic ? "60د (ساعة)" : "60m (1h)") : dur === 90 ? (isArabic ? "90د (1.5س)" : "90m (1.5h)") : dur === 120 ? (isArabic ? "120د (2س)" : "120m (2h)") : `${dur}${isArabic ? "د" : "m"}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-700 text-[11px]">
                                    {isArabic ? "🎯 تفاصيل الباقة:" : "🎯 Package Breakdown:"}
                                  </span>
                                </div>
                                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs text-[11px]">
                                  {sub.rateType === "per_hour"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${sub.hourlyCost || 100} ج.م/س × ${sub.defaultDurationMinutes || 60} د) | ${isArabic ? "الشهر:" : "Month:"} ${sub.monthlyCost || (sub.lessonCost * (sub.lessonsPerMonth || 8))} ج.م`
                                    : sub.rateType === "per_lesson"
                                    ? `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${isArabic ? "إجمالي الشهر:" : "Total:"} ${sub.monthlyCost || (sub.lessonCost * (sub.lessonsPerMonth || 8))} ${isArabic ? "ج.م/شهر" : "EGP/mo"}) | ${sub.defaultDurationMinutes || 60} د`
                                    : `= ${sub.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/lesson"} (${isArabic ? "من تقسيم" : "from"} ${sub.monthlyCost || 800} ÷ ${sub.lessonsPerMonth || 8} ${isArabic ? "حصة" : "lessons"}) | ${sub.defaultDurationMinutes || 60} د`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddEditSubjectField}
                  className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isArabic ? "+ إضافة مادة دراسية أخرى لهذا الطالب" : "+ Add Another Subject"}</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "ملاحظات إضافية" : "Notes"}
                </label>
                <textarea
                  rows={1}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Scope of Changes: Apply to Previous vs Future Lessons Only */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isArabic ? "نطاق تطبيق التعديلات (تطبيقه على السابق أم لا):" : "Scope of Changes (Past vs Future Lessons):"}</span>
                </div>
                <p className="text-[11px] text-amber-800 font-medium">
                  {isArabic
                    ? "اختر هل ترغب في تطبيق هذه التعديلات والأسعار على الحصص السابقة بأثر رجعي، أم قصرها على الحصص القادمة فقط:"
                    : "Choose whether changes apply retroactively to past lessons, or start fresh for future lessons only:"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 select-none ${
                      editApplyToPrevious
                        ? "border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editApplyToPreviousRadio"
                      checked={editApplyToPrevious}
                      onChange={() => setEditApplyToPrevious(true)}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div className="text-right">
                      <p className="text-xs font-black">{isArabic ? "نعم، تطبيق على السابق والقادم" : "Yes, apply to past & future"}</p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                        {isArabic ? "تحديث أسعار وحسابات الحصص السابقة وسجلات الحضور والاسم لتطابق التعديل الجديد بأثر رجعي." : "Updates past lessons and attendance records with new rates."}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 select-none ${
                      !editApplyToPrevious
                        ? "border-blue-500 bg-blue-50/90 text-blue-950 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editApplyToPreviousRadio"
                      checked={!editApplyToPrevious}
                      onChange={() => setEditApplyToPrevious(false)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div className="text-right">
                      <p className="text-xs font-black">{isArabic ? "لا، التطبيق على القادم فقط" : "No, future lessons only"}</p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                        {isArabic ? "تثبيت وتجميد أسعار وحسابات الحصص السابقة كما هي دون المساس بها، وبدء التسعير الجديد للحصص القادمة." : "Locks and preserves past lesson calculations as they were."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudent) {
                      setStudentToDelete(selectedStudent);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1 border border-rose-200 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? "حذف الطالب" : "Delete Student"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditStudentModal(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    onClick={e => {
                      e.preventDefault();
                      handleSaveEditStudent();
                    }}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {isArabic ? "حفظ التعديلات والمواد" : "Save Changes & Subjects"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Apply Changes to Previous or Not? */}
      {showApplyConfirmDialog && pendingStudentToSave && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {isArabic ? "تأكيد نطاق تطبيق التعديلات" : "Confirm Changes Scope"}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isArabic
                    ? `هل ترغب في تطبيق تعديلات (${pendingStudentToSave.fullName}) على الحصص والسجلات السابقة؟`
                    : `Apply changes for (${pendingStudentToSave.fullName}) to previous records?`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {isArabic
                ? "يمكنك اختيار تحديث الحصص والماليات السابقة بأثر رجعي، أو تجميد السجلات السابقة وتطبيق التعديل على الحصص القادمة فقط."
                : "Choose whether to update past lessons retroactively or lock past records and apply new rates only to future lessons."}
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => confirmExecuteSaveStudent(true)}
                className="w-full text-right p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100 transition flex items-start gap-3 group"
              >
                <span className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center mt-0.5 shrink-0 bg-white group-hover:scale-105 transition-transform">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                </span>
                <div>
                  <p className="text-xs font-black text-emerald-950">
                    {isArabic ? "نعم، تطبيق على السابق والقادم (أثر رجعي)" : "Yes, apply to past & future"}
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    {isArabic
                      ? "تحديث أسعار وحسابات الحصص السابقة وسجلات الحضور والاسم لتطابق التعديل الجديد بأثر رجعي."
                      : "Recalculates past lessons with new rates and updates historical records."}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => confirmExecuteSaveStudent(false)}
                className="w-full text-right p-3.5 rounded-2xl border-2 border-blue-400 bg-blue-50/70 hover:bg-blue-100 transition flex items-start gap-3 group"
              >
                <span className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center mt-0.5 shrink-0 bg-white group-hover:scale-105 transition-transform">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                </span>
                <div>
                  <p className="text-xs font-black text-blue-950">
                    {isArabic ? "لا، التطبيق على القادم فقط (تجميد السابق)" : "No, future lessons only"}
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    {isArabic
                      ? "الاحتفاظ بحسابات وأسعار الحصص السابقة كما هي دون تعديل، والبدء بالحسابات الجديدة للحصص المستقبلية."
                      : "Preserves past lesson rates and calculations as they were, applying new rates to future lessons."}
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowApplyConfirmDialog(false);
                  setPendingStudentToSave(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                {isArabic ? "الرجوع للتعديل" : "Back to Edit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: WhatsApp Multi-App Target Chooser */}
      {showWhatsAppChooserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-in fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {isArabic ? "إرسال التقرير عبر الواتساب" : "Send Report via WhatsApp"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isArabic ? "اختر تطبيق الواتساب أو الطريقة المفضلة لديك للإرسال" : "Choose which WhatsApp app or method to open"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Information */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10.5px] font-bold text-emerald-800 block">
                  {isArabic ? "الطالب المستلم:" : "Recipient Student:"}
                </span>
                <span className="font-black text-slate-900 text-xs">
                  {pendingWhatsAppTargetStudent?.fullName || selectedStudent?.fullName || "الطالب"}
                </span>
              </div>

              <div className="text-left font-mono text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                {pendingWhatsAppTargetStudent?.whatsappGroupLink ||
                 pendingWhatsAppTargetStudent?.parentContact ||
                 (isArabic ? "مشاركة عامة" : "Direct share")}
              </div>
            </div>

            {/* Application Options */}
            <div className="space-y-2">
              <label className="block font-black text-slate-700 text-xs">
                {isArabic ? "اختر نوع الواتساب / وسيلة الإرسال:" : "Select WhatsApp Version / Mode:"}
              </label>

              {/* 1. System Chooser / Native Dialog (Android/iOS/App Chooser) */}
              {"share" in navigator && (
                <button
                  type="button"
                  onClick={() => handleSendViaWhatsAppMode("intent_android")}
                  className="w-full p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition flex items-center justify-between shadow-md shadow-emerald-500/20 group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-black text-xs flex items-center gap-1.5">
                        <span>{isArabic ? "📱 اختيار التطبيق عبر الهاتف (نافذة النظام)" : "📱 System App Chooser"}</span>
                        <span className="text-[9px] bg-white text-emerald-800 px-1.5 py-0.2 rounded-full font-black">
                          {isArabic ? "موصى به" : "Recommended"}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-100 font-normal mt-0.5">
                        {isArabic ? "يظهر لك كل تطبيقات الواتساب المثبتة (العادي، الأعمال، المنسوخ)" : "Shows all installed WhatsApp apps on device"}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition" />
                </button>
              )}

              {/* 2. WhatsApp Business App */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-800 font-bold text-xs transition flex items-center justify-between shadow-2xs group text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                    B
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {isArabic ? "واتساب الأعمال (WhatsApp Business)" : "WhatsApp Business"}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isArabic ? "فتح المحادثة مباشرة في واتساب الأعمال (wa.me)" : "Direct launch for WhatsApp Business"}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </button>

              {/* 3. Standard WhatsApp Mobile App */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("app_scheme")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-800 font-bold text-xs transition flex items-center justify-between shadow-2xs group text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {isArabic ? "واتساب العادي (WhatsApp Messenger)" : "WhatsApp Messenger"}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isArabic ? "فتح تطبيق الواتساب الأساسي مباشرة (whatsapp://)" : "Open official WhatsApp application"}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </button>

              {/* 4. WhatsApp Web (Desktop / Browser) */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("web")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-800 font-bold text-xs transition flex items-center justify-between shadow-2xs group text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {isArabic ? "واتساب ويب بالمتصفح (WhatsApp Web)" : "WhatsApp Web (Browser)"}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isArabic ? "مخصص للكمبيوتر والمتصفح (web.whatsapp.com)" : "Opens in browser web.whatsapp.com"}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </button>

              {/* 5. Universal Link */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("universal")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-800 font-bold text-xs transition flex items-center justify-between shadow-2xs group text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {isArabic ? "الرابط العام التلقائي (Universal Link)" : "Universal WhatsApp Link"}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isArabic ? "توجيه المتصفح لاختيار التطبيق المتوفر (api.whatsapp.com)" : "Let browser route automatically"}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </button>
            </div>

            {/* Quick Copy Report Fallback */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingWhatsAppText) {
                    navigator.clipboard.writeText(pendingWhatsAppText);
                    setWhatsappSentNotice(isArabic ? "تم نسخ نص التقرير للحافظة بنجاح!" : "Report text copied to clipboard!");
                    setTimeout(() => setWhatsappSentNotice(""), 3500);
                  }
                }}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isArabic ? "نسخ نص التقرير فقط" : "Copy Text Only"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: In-App Confirmation Dialog for Permanently Deleting Student */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-slate-900 text-base">
                {isArabic ? `حذف الطالب: "${studentToDelete.fullName}"؟` : `Delete Student "${studentToDelete.fullName}"?`}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {isArabic
                  ? "هل أنت متأكد من رغبتك في حذف هذا الطالب نهائياً من النظام؟ سيتم مسح بياناته من جميع المجموعات وحذف سجلات الحضور والاختبارات المرتبطة به."
                  : "Are you sure you want to permanently delete this student? All group enrollments, attendance, and exam history will be removed."}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                {isArabic ? "إلغاء التراجع" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteStudent) {
                    onDeleteStudent(studentToDelete.id);
                  }
                  if (selectedStudent && selectedStudent.id === studentToDelete.id) {
                    setSelectedStudent(null);
                    setShowEditStudentModal(false);
                  }
                  setStudentToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? "تأكيد الحذف النهائي" : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: In-App Confirmation Dialog for Permanently Deleting Report */}
      {reportToDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-slate-900 text-base">
                {isArabic ? "تأكيد حذف التقرير والخصم المالي" : "Confirm Delete Report & Reversal"}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {isArabic
                  ? "هل أنت متأكد من رغبتك في حذف هذا التقرير نهائياً؟"
                  : "Are you sure you want to permanently delete this report?"}
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 text-right leading-relaxed flex items-center gap-2">
                <span className="shrink-0 text-base">ℹ️</span>
                <span>
                  {isArabic
                    ? "عند الحذف، سيتم إلغاء احتساب هذه الحصة تلقائياً وخصم سعرها ووقتها من الحساب المالي وسجل ساعات الطالب."
                    : "Upon deletion, this lesson will no longer be counted, and its cost and time will be deducted from the student's financial balance and hours."}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setReportToDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                {isArabic ? "إلغاء التراجع" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteReport) {
                    onDeleteReport(reportToDeleteId);
                  }
                  setReportToDeleteId(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? "تأكيد الحذف النهائي" : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Create Combined Student Group */}
      {showCreateCombinedGroupModal && (
        <CreateCombinedGroupModal
          settings={settings}
          students={students}
          combinedStudentGroups={combinedStudentGroups}
          initialSelectedStudentIds={initialMergeStudentIds}
          isArabic={isArabic}
          onClose={() => {
            setShowCreateCombinedGroupModal(false);
            setInitialMergeStudentIds([]);
          }}
          onCreateGroup={(name, studentIds, notes, sharedParentContact, sharedGroupLink) => {
            if (onAddCombinedGroup) {
              onAddCombinedGroup(name, studentIds, notes, sharedParentContact, sharedGroupLink);
            }
            setShowCreateCombinedGroupModal(false);
            setInitialMergeStudentIds([]);
          }}
        />
      )}

      {/* Modal: Combined Student File Comprehensive View */}
      {selectedCombinedGroup && (
        <CombinedStudentFileModal
          group={selectedCombinedGroup}
          settings={settings}
          allStudents={students}
          attendanceRecords={attendanceRecords}
          examRecords={examRecords}
          paymentTransactions={paymentTransactions}
          reports={reports}
          isArabic={isArabic}
          onClose={() => setSelectedCombinedGroup(null)}
          onUpdateGroup={(id, partial) => {
            if (onUpdateCombinedGroup) {
              onUpdateCombinedGroup(id, partial);
            }
            setSelectedCombinedGroup(prev => (prev && prev.id === id ? { ...prev, ...partial } : prev));
          }}
          onDeleteGroup={(id) => {
            if (onDeleteCombinedGroup) {
              onDeleteCombinedGroup(id);
            }
            setSelectedCombinedGroup(null);
          }}
          onAddStudentToGroup={(groupId, studentId) => {
            if (onAddStudentToCombinedGroup) {
              onAddStudentToCombinedGroup(groupId, studentId);
            }
            setSelectedCombinedGroup(prev => {
              if (prev && prev.id === groupId && !prev.studentIds.includes(studentId)) {
                return { ...prev, studentIds: [...prev.studentIds, studentId] };
              }
              return prev;
            });
          }}
          onRemoveStudentFromGroup={(groupId, studentId) => {
            if (onRemoveStudentFromCombinedGroup) {
              onRemoveStudentFromCombinedGroup(groupId, studentId);
            }
            setSelectedCombinedGroup(prev => {
              if (prev && prev.id === groupId) {
                const nextIds = prev.studentIds.filter(id => id !== studentId);
                return { ...prev, studentIds: nextIds };
              }
              return prev;
            });
          }}
          onEditStudent={onEditStudent}
          onOpenEditStudentModal={handleOpenEditStudent}
          onDeleteStudent={onDeleteStudent}
          onUpdateStudentStatus={onUpdateStudentStatus}
          onRecordPayment={onRecordPayment}
          onAddExamRecord={onAddExamRecord}
          onAddReport={onAddReport}
          onDeleteReport={onDeleteReport}
          onToggleArchiveReport={onToggleArchiveReport}
          onArchiveEndedCycle={onArchiveEndedCycle}
          onGenerateReportAi={onGenerateReportAi}
          onOpenMonthlyQuranReport={(student, subject) => setMonthlyReportModalTarget({ student, subject })}
          availableUnbundledStudents={students.filter(s => !bundledStudentIdSet.has(s.id))}
        />
      )}

      {/* نافذة نظام التقارير الشهري الشامل (متاحة حصرياً للقرآن الكريم والدراسات الإسلامية) */}
      {monthlyReportModalTarget && (
        <ComprehensiveMonthlyReportModal
          isOpen={Boolean(monthlyReportModalTarget)}
          onClose={() => setMonthlyReportModalTarget(null)}
          student={monthlyReportModalTarget.student}
          subject={monthlyReportModalTarget.subject}
          settings={settings}
          attendanceRecords={attendanceRecords}
          reports={reports}
          onSaveReport={async (reportData) => {
            onAddReport({
              studentId: monthlyReportModalTarget.student.id,
              studentName: monthlyReportModalTarget.student.fullName,
              teacherName: reportData.teacherName || settings.teacherName,
              subject: monthlyReportModalTarget.subject,
              reportType: "monthly_comprehensive",
              evaluationMonth: reportData.evaluationMonth,
              date: reportData.date || new Date().toISOString().split("T")[0],
              attendance: "present",
              deductCost: false,
              teacherNotes: reportData.teacherNotes || `تقرير الأداء الشهري للقرآن الكريم والدراسات الإسلامية`,
              reportText: reportData.reportText,
              generatedText: reportData.generatedText,
              aiInstructions: ""
            });
            setWhatsappSentNotice(isArabic ? "تم حفظ التقرير الشهري الشامل في سجل تقارير الطالب بنجاح!" : "Monthly report saved successfully!");
            setTimeout(() => setWhatsappSentNotice(""), 4000);
          }}
          onOpenWhatsAppChooser={(text) => {
            handleOpenWhatsAppChooser(text, monthlyReportModalTarget.student);
          }}
        />
      )}

      {/* Modal: أرشفة الشهر أو الباقة المنتهية للطالب */}
      {showArchiveCycleModal && selectedStudent && (
        <ArchiveCycleModal
          isOpen={showArchiveCycleModal}
          onClose={() => setShowArchiveCycleModal(false)}
          student={selectedStudent}
          allReports={reports}
          allAttendance={attendanceRecords}
          isArabic={isArabic}
          onConfirmArchive={(params) => {
            if (onArchiveEndedCycle) {
              onArchiveEndedCycle({
                studentId: selectedStudent.id,
                archiveGroupName: params.archiveGroupName,
                newCycleStartDate: params.newCycleStartDate,
                newCycleName: params.newCycleName,
                resetLessonBalance: params.resetLessonBalance
              });
              setReportArchiveFilter("active");
              setReportLessonNumber(1);
              setWhatsappSentNotice(
                isArabic
                  ? `تم أرشفة تقارير الدورة المنتهية في (${params.archiveGroupName}) وبدء الدورة الجديدة من الحصة رقم 1 بنجاح!`
                  : `Archived ended cycle into (${params.archiveGroupName}) and started new cycle!`
              );
              setTimeout(() => setWhatsappSentNotice(""), 4500);
            }
          }}
        />
      )}

      {/* Modal: كشف الحساب المالي وساعات الدراسة للطالب */}
      {statementModalStudent && (() => {
        const fin = calculateStudentFinancials(statementModalStudent, attendanceRecords, paymentTransactions);
        const studentAttendance = attendanceRecords.filter(
          ar => ar.studentId === statementModalStudent.id && (ar.attendance === "present" || ar.deducted)
        );
        const studentPayments = paymentTransactions.filter(
          pt => pt.studentId === statementModalStudent.id
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl animate-in fade-in my-6 overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shadow-2xs">
                    {statementModalStudent.fullName ? statementModalStudent.fullName.charAt(0) : "ط"}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      {isArabic ? `كشف حساب: ${statementModalStudent.fullName}` : `Statement: ${statementModalStudent.fullName}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {statementModalStudent.subject} • {statementModalStudent.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyStudentStatement(statementModalStudent)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                    title={isArabic ? "نسخ كشف الحساب" : "Copy Statement"}
                  >
                    {copiedStatementStudentId === statementModalStudent.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedStatementStudentId === statementModalStudent.id ? (isArabic ? "تم النسخ" : "Copied") : (isArabic ? "نسخ" : "Copy")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                    title={isArabic ? "طباعة كشف الحساب / حفظ PDF" : "Print Statement"}
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">{isArabic ? "طباعة" : "Print"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareStudentStatementWhatsApp(statementModalStudent)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                    title={isArabic ? "إرسال كشف الحساب لواتساب ولي الأمر" : "Share Statement via WhatsApp"}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{isArabic ? "واتساب" : "WhatsApp"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatementModalStudent(null)}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Summary Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {fin.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                    </span>
                    <span className="text-sm font-black text-blue-700 my-0.5">
                      {fin.isMonthly ? `${fin.billedMonthsCount} شهر` : `${fin.totalAttendedLessons} حصة`}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">({fin.totalAccruedCost} ج.م)</span>
                  </div>

                  {/* FEATURE: عدد الساعات التي درسها */}
                  <div className="bg-gradient-to-b from-sky-50/60 to-white p-2.5 rounded-xl border border-sky-200/80 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-black text-sky-800 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" />
                      <span>{isArabic ? "عدد الساعات التي درسها" : "Hours Studied"}</span>
                    </span>
                    <span className="text-sm font-black text-sky-700 my-0.5">
                      {fin.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 block truncate" title={formatHoursHuman(fin.totalTaughtHours, isArabic)}>
                      {formatHoursHuman(fin.totalTaughtHours, isArabic)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "إجمالي المدفوع" : "Paid"}</span>
                    <span className="text-sm font-black text-emerald-600 my-0.5">{fin.totalPaidAmount} ج.م</span>
                    <span className="text-[9.5px] text-slate-400 block">{studentPayments.length} {isArabic ? "دفعات" : "payments"}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {fin.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due") : (isArabic ? "الرصيد المتبقي" : "Credit")}
                    </span>
                    <span
                      className={`text-sm font-black my-0.5 ${
                        fin.amountDue > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {fin.amountDue > 0 ? `${fin.amountDue} ج.م` : `+${fin.creditRemaining} ج.م`}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {fin.amountDue > 0 ? (isArabic ? "مطلوب سداده" : "Due balance") : (isArabic ? "رصيد دائن" : "Surplus")}
                    </span>
                  </div>
                </div>

                {/* DEDICATED STUDY HOURS SUMMARY BANNER */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/50 border border-sky-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-xs">
                          {isArabic ? "ساعات التدريس الفعلي للطالب:" : "Actual Study Hours Completed:"}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-sky-600 text-white font-black text-xs shadow-2xs">
                          ⏱️ {fin.totalTaughtHours} {isArabic ? "ساعة درسها" : "hours studied"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {isArabic
                          ? `درس الطالب ما مجموعه (${formatHoursHuman(fin.totalTaughtHours, true)}) بما يعادل ${Math.round((fin.totalTaughtHours || 0) * 60)} دقيقة موزعة على ${fin.totalAttendedLessons} حصة حضور فعلية.`
                          : `The student completed (${formatHoursHuman(fin.totalTaughtHours, false)}) totaling ${Math.round((fin.totalTaughtHours || 0) * 60)} minutes across ${fin.totalAttendedLessons} attended lessons.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShareStudentStatementWhatsApp(statementModalStudent)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1.5 self-end sm:self-auto shrink-0 transition"
                    title={isArabic ? "إرسال كشف الحساب وتفاصيل الساعات عبر واتساب" : "Share via WhatsApp"}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isArabic ? "إرسال بالواتساب" : "Send WhatsApp"}</span>
                  </button>
                </div>

                {/* Status Explanation */}
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800 text-xs font-semibold">
                  {isArabic ? fin.detailsExplanationAr : fin.detailsExplanationEn}
                </div>

                {/* Subject Breakdown if student is enrolled in multiple subjects */}
                {fin.subjectsDetails && fin.subjectsDetails.length > 1 && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isArabic ? "تفصيل الحساب المالي وساعات الدراسة لكل مادة:" : "Financial & Hours Breakdown by Subject:"}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fin.subjectsDetails.map((sub, sIdx) => (
                        <div
                          key={sub.id || sIdx}
                          className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-black">
                            <span className="text-slate-900">{sub.subject}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                              {sub.studyType === "group" ? "مجموعة" : "خاص"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 bg-sky-50/80 px-2 py-1 rounded-lg border border-sky-100">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>{isArabic ? "عدد الساعات التي درسها:" : "Hours Studied:"}</span>
                            </span>
                            <span className="font-black text-sky-900">
                              {sub.totalTaughtHours} {isArabic ? "ساعة" : "hrs"} ({sub.totalAttendedLessons} {isArabic ? "حصة" : "lss"})
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{isArabic ? "المحسوب:" : "Accrued:"} {sub.totalAccruedCost} ج.م</span>
                            <span>{isArabic ? "المسدد:" : "Paid:"} {sub.totalPaidAmount} ج.م</span>
                          </div>
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between font-bold text-[11px]">
                            <span className="text-slate-600">{isArabic ? "الحالة:" : "Status:"}</span>
                            <span className={sub.amountDue > 0 ? "text-rose-600 font-black" : "text-emerald-600 font-black"}>
                              {sub.amountDue > 0 ? `${sub.amountDue} ج.م مستحق` : (isArabic ? "مسدد بالكامل" : "Paid")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. سجل المدفوعات */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isArabic ? "سجل الدفعات المسددة:" : "Payment History:"}</span>
                  </h4>

                  {studentPayments.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                      {isArabic ? "لم تسجل أي دفعات بعد." : "No payments recorded."}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {studentPayments.map(pt => (
                        <div
                          key={pt.id}
                          className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-black text-emerald-700">+{pt.amount} {isArabic ? "ج.م" : "EGP"}</span>
                            {pt.notes && <p className="text-[10px] text-slate-500">{pt.notes}</p>}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{pt.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. سجل الحصص المنفذة وساعات التدريس */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {fin.isMonthly
                          ? (isArabic ? "سجل الحضور التربوي والأكاديمي:" : "Attendance History (Educational):")
                          : (isArabic ? "سجل الحصص المنفذة وساعات التدريس:" : "Attended Lessons & Hours History:")}
                      </span>
                    </h4>
                    <span className="text-[10px] font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/70">
                      ⏱️ {fin.totalTaughtHours} {isArabic ? "ساعة درسها" : "hours studied"}
                    </span>
                  </div>

                  {studentAttendance.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                      {isArabic ? "لا توجد حصص مسجلة بالحضور حتى الآن." : "No attended lessons recorded."}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {studentAttendance.map((ar, aIdx) => {
                        let arDur = ar.durationMinutes;
                        if (!arDur && ar.lessonDuration) {
                          const m = ar.lessonDuration.match(/(\d+)/);
                          if (m) arDur = parseInt(m[1], 10);
                        }
                        if (!arDur) arDur = fin.defaultDurationMinutes || 60;

                        return (
                          <div
                            key={ar.id || aIdx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-black text-[10px]">
                                #{ar.lessonNumber || (aIdx + 1)}
                              </span>
                              <div>
                                <p className="font-bold text-slate-800">{ar.subject || statementModalStudent.subject}</p>
                                <p className="text-[10px] text-slate-400">{ar.teacherNotes || (ar.attendance === "present" ? "حضور مؤكد" : "غياب مع احتساب الحصة")}</p>
                              </div>
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-slate-900 block">
                                {fin.isMonthly ? (isArabic ? "حضور" : "Attended") : `${fin.lessonCost} ج.م`}
                              </span>
                              <span className="text-[10px] text-sky-700 font-bold block">
                                ⏱️ {arDur} دقيقة ({formatHoursHuman(arDur / 60, isArabic)})
                              </span>
                              <span className="text-[9.5px] text-slate-400 block">{ar.date}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatementModalStudent(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition"
                  >
                    {isArabic ? "إغلاق" : "Close"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyStudentStatement(statementModalStudent)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                  >
                    {copiedStatementStudentId === statementModalStudent.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">{isArabic ? "تم النسخ" : "Copied"}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isArabic ? "نسخ الكشف" : "Copy"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                    title={isArabic ? "طباعة كشف الحساب / حفظ PDF" : "Print Statement"}
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isArabic ? "طباعة الكشف" : "Print"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShareStudentStatementWhatsApp(statementModalStudent)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isArabic ? "مشاركة عبر واتساب" : "Share via WhatsApp"}</span>
                  </button>
                </div>
              </div>

              {/* Official Printable Statement Voucher for @media print */}
              <div id="student-statement-printable" className="hidden print:block text-slate-900 bg-white font-sans text-xs p-6" dir={isArabic ? "rtl" : "ltr"}>
                {/* Printable Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      {settings.teacherName || (isArabic ? "المنصة التعليمية اليومية" : "Educational Platform")}
                    </h1>
                    <h2 className="text-sm font-bold text-slate-700 mt-0.5">
                      {isArabic ? "كشف الحساب المالي وساعات الدراسة المعتمد للطالب" : "Official Student Financial Statement & Hours"}
                    </h2>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-500">
                    <p>{isArabic ? "تاريخ الإصدار:" : "Issue Date:"} {new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                    <p className="font-bold text-slate-700 mt-0.5">IFRS Accounting Standard</p>
                  </div>
                </div>

                {/* Student Details Card */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-300 rounded-xl mb-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">{isArabic ? "اسم الطالب:" : "Student Name:"}</span>
                    <span className="font-black text-sm text-slate-900">{statementModalStudent.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">{isArabic ? "المادة الدراسية:" : "Subject:"}</span>
                    <span className="font-bold text-slate-800">{statementModalStudent.subject} ({statementModalStudent.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">{isArabic ? "حالة الحساب:" : "Account Status:"}</span>
                    <span className={`font-black ${fin.amountDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {fin.amountDue > 0 ? `${fin.amountDue} ج.م مستحق` : (isArabic ? "مسدد بالكامل" : "Paid")}
                    </span>
                  </div>
                </div>

                {/* STUDY HOURS HIGHLIGHT BANNER */}
                <div className="p-3.5 rounded-xl bg-sky-50 border-2 border-sky-600 mb-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-sky-950 block">
                      {isArabic ? "⏱️ إجمالي عدد الساعات التي درسها الطالب:" : "⏱️ Actual Study Hours Completed:"}
                    </span>
                    <p className="text-[10.5px] text-slate-700 font-medium mt-0.5">
                      {isArabic
                        ? `أتم الطالب ما مجموعه (${formatHoursHuman(fin.totalTaughtHours, true)}) بما يعادل ${Math.round((fin.totalTaughtHours || 0) * 60)} دقيقة تدريس فعلي موزعة على ${fin.totalAttendedLessons} حصة حضور مسجلة.`
                        : `The student completed (${formatHoursHuman(fin.totalTaughtHours, false)}) totaling ${Math.round((fin.totalTaughtHours || 0) * 60)} minutes across ${fin.totalAttendedLessons} attended lessons.`}
                    </p>
                  </div>
                  <div className="text-left font-black text-xl text-sky-900 bg-white px-3 py-1.5 rounded-lg border border-sky-300 shrink-0">
                    {fin.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}
                  </div>
                </div>

                {/* Summary Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-3.5 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {fin.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                    </span>
                    <span className="text-sm font-black text-blue-900 block mt-0.5">
                      {fin.isMonthly ? `${fin.billedMonthsCount} شهر` : `${fin.totalAttendedLessons} حصة`}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">{isArabic ? "إجمالي التكلفة" : "Accrued Cost"}</span>
                    <span className="text-sm font-black text-slate-900 block mt-0.5">{fin.totalAccruedCost} ج.م</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">{isArabic ? "إجمالي المسدد" : "Total Paid"}</span>
                    <span className="text-sm font-black text-emerald-800 block mt-0.5">{fin.totalPaidAmount} ج.م</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {fin.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due Balance") : (isArabic ? "الرصيد الفائض" : "Credit Balance")}
                    </span>
                    <span className={`text-sm font-black block mt-0.5 ${fin.amountDue > 0 ? "text-rose-700" : "text-emerald-800"}`}>
                      {fin.amountDue > 0 ? `${fin.amountDue} ج.م` : `+${fin.creditRemaining} ج.م`}
                    </span>
                  </div>
                </div>

                {/* Multi-Subject Breakdown Table if exists */}
                {fin.subjectsDetails && fin.subjectsDetails.length > 1 && (
                  <div className="mb-3.5">
                    <h3 className="font-black text-xs text-slate-900 mb-1.5">{isArabic ? "تفصيل الساعات والحساب لكل مادة دراسية:" : "Subject Breakdown:"}</h3>
                    <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                          <th className="p-1.5 border-r border-slate-300">المادة الدراسية</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">ساعات الدراسة</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">عدد الحصص</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">المحسوب</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">المسدد</th>
                          <th className="p-1.5 text-center">الموقف المالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fin.subjectsDetails.map((s, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-1.5 border-r border-slate-300 font-bold">{s.subject} ({s.studyType === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "خاص" : "Private")})</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-black text-sky-900">⏱️ {s.totalTaughtHours} ساعة</td>
                            <td className="p-1.5 border-r border-slate-300 text-center">{s.totalAttendedLessons} حصة</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono">{s.totalAccruedCost} ج.م</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono text-emerald-800">{s.totalPaidAmount} ج.م</td>
                            <td className="p-1.5 text-center font-bold">
                              {s.amountDue > 0 ? <span className="text-rose-700 font-black">{s.amountDue} ج.م مستحق</span> : <span className="text-emerald-700">مسدد بالكامل</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Attended Lessons History Table */}
                <div className="mb-3.5">
                  <h3 className="font-black text-xs text-slate-900 mb-1.5">
                    {isArabic ? `سجل الحصص المنفذة وساعات التدريس الفعلي (${fin.totalAttendedLessons} حصة • ${fin.totalTaughtHours} ساعة):` : `Attended Lessons & Hours Log:`}
                  </h3>
                  <table className="w-full text-right border-collapse border border-slate-300 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                        <th className="p-1.5 border-r border-slate-300">التاريخ</th>
                        <th className="p-1.5 border-r border-slate-300">المادة</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">مدة الحصة والساعات</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">التكلفة</th>
                        <th className="p-1.5">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-2 text-center text-slate-400">لا توجد حصص مسجلة بالحضور بعد.</td>
                        </tr>
                      ) : (
                        studentAttendance.map((ar, idx) => {
                          let dur = ar.durationMinutes;
                          if (!dur && ar.lessonDuration) {
                            const m = ar.lessonDuration.match(/(\d+)/);
                            if (m) dur = parseInt(m[1], 10);
                          }
                          if (!dur) dur = fin.defaultDurationMinutes || 60;

                          const itemDeduction = fin.rateType === "per_hour"
                            ? Number(((fin.hourlyCost * dur) / 60).toFixed(2))
                            : fin.lessonCost;

                          return (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className="p-1.5 border-r border-slate-300 text-center font-bold">{ar.lessonNumber || (idx + 1)}</td>
                              <td className="p-1.5 border-r border-slate-300 font-mono">{ar.date}</td>
                              <td className="p-1.5 border-r border-slate-300 font-bold">{ar.subject || statementModalStudent.subject}</td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-sky-900">
                                ⏱️ {dur} دقيقة ({formatHoursHuman(dur / 60, isArabic)})
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                                {fin.isMonthly ? "حضور" : `${itemDeduction} ج.م`}
                              </td>
                              <td className="p-1.5 text-slate-600">{ar.teacherNotes || (ar.attendance === "present" ? "حضور مؤكد" : "غياب مع الاحتساب")}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payment History Table */}
                <div className="mb-4">
                  <h3 className="font-black text-xs text-slate-900 mb-1.5">{isArabic ? "سجل الدفعات المسددة:" : "Payment History:"}</h3>
                  <table className="w-full text-right border-collapse border border-slate-300 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                        <th className="p-1.5 border-r border-slate-300">التاريخ</th>
                        <th className="p-1.5 border-r border-slate-300 text-center">المبلغ المسدد</th>
                        <th className="p-1.5">ملاحظات التحصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-2 text-center text-slate-400">لم تسجل دفعات بعد.</td>
                        </tr>
                      ) : (
                        studentPayments.map((pt, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                            <td className="p-1.5 border-r border-slate-300 font-mono">{pt.date}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-black text-emerald-800 font-mono">+{pt.amount} ج.م</td>
                            <td className="p-1.5 text-slate-600">{pt.notes || "سداد نقدي معتمد"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Printable Footer & Signature */}
                <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div>
                    <p>تم استخراج هذا الكشف وتدقيقه محاسبياً وأكاديمياً.</p>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">صادر عن منظومة إدارة المعلم الإسلامي والتعليمي اليومية</p>
                  </div>
                  <div className="text-center min-w-[150px]">
                    <p className="border-b border-slate-400 pb-4 mb-1">توقيع المعلم / الإدارة</p>
                    <span className="text-[10px] text-slate-500">معتمد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
