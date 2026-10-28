import React, { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Check,
  CheckCircle2,
  Share2,
  Copy,
  Trash2,
  Archive,
  FolderArchive,
  RotateCcw,
  BookOpen,
  Calendar,
  Paperclip,
  FileUp,
  FileSpreadsheet,
  Presentation,
  File,
  X,
  Search,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
  Clock,
  User,
  UserCheck,
  Hash,
  Globe,
  Eye,
  EyeOff
} from "lucide-react";
import {
  AppSettings,
  Student,
  StudentReportPreferences,
  GeneratedReport,
  AttendanceRecord,
  AttendanceStatus,
  HomeworkStatus,
  ReportAttachment,
  findSubjectAiInstruction,
  getSubjectSpecificAiInstruction,
  isDailyPersonalReport,
  isMonthlyComprehensiveReport,
  deduplicateReportsList,
  mergeDirectAndAttendanceReports
} from "../types";
import { StorageEngine } from "../lib/storage";
import { getReportTitle } from "../lib/reportTitleUtils";
import {
  getActiveCycleInfo,
  isReportInActiveCycle,
  groupArchivedReports,
  getReportArchiveGroupName,
  getNextActiveLessonNumber
} from "../lib/reportArchiveEngine";
import { ArchiveCycleModal } from "./ArchiveCycleModal";
import { ArchivedReportsFolderList } from "./ArchivedReportsFolderList";

interface StudentPersonalReportViewProps {
  student: Student;
  settings: AppSettings;
  reports: GeneratedReport[];
  attendanceRecords: AttendanceRecord[];
  isArabic?: boolean;
  onBack: () => void;
  onAddReport: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onArchiveEndedCycle?: (params: {
    studentId: string;
    archiveGroupName: string;
    newCycleStartDate: string;
    newCycleName: string;
    resetLessonBalance: boolean;
  }) => void;
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
}

export const StudentPersonalReportView: React.FC<StudentPersonalReportViewProps> = ({
  student,
  settings,
  reports = [],
  attendanceRecords = [],
  isArabic = true,
  onBack,
  onAddReport,
  onDeleteReport,
  onToggleArchiveReport,
  onArchiveEndedCycle,
  onGenerateReportAi
}) => {
  // Calculate next lesson number with monthly reset vs package persistence
  const calculateNextLessonNumber = (subj: string): number => {
    if (!student) return 1;
    return getNextActiveLessonNumber(
      student,
      subj,
      Array.isArray(reports) ? reports : [],
      Array.isArray(attendanceRecords) ? attendanceRecords : []
    );
  };

  const initialSubject =
    student.subjects?.[0]?.subject ||
    student.subject ||
    (isArabic ? "الرياضيات" : "Mathematics");

  const initialAiInst = findSubjectAiInstruction(
    settings.subjectDefaults,
    initialSubject,
    settings.generalAiInstructions
  );

  const initialSubjPlan = student.subjects?.find(s => s.subject === initialSubject);

  // Load Smart Memory preferences for this student
  const initialPrefs = StorageEngine.getStudentReportPreferences(student.id, settings.teacherName);

  // Form State
  const [reportSubject, setReportSubject] = useState<string>(initialSubject);
  const [reportLessonNumber, setReportLessonNumber] = useState<number>(() =>
    calculateNextLessonNumber(initialSubject)
  );
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Smart Toggleable Header Fields (Persisted per Student)
  const [includeStudentName, setIncludeStudentName] = useState<boolean>(initialPrefs.includeStudentName !== false);
  const [includeTeacherName, setIncludeTeacherName] = useState<boolean>(initialPrefs.includeTeacherName !== false);
  const [teacherName, setTeacherName] = useState<string>(initialPrefs.teacherName || settings.teacherName || "");
  const [includeLessonNumber, setIncludeLessonNumber] = useState<boolean>(initialPrefs.includeLessonNumber !== false);
  const [includeDuration, setIncludeDuration] = useState<boolean>(initialPrefs.includeDuration === true);
  const [includeLessonDate, setIncludeLessonDate] = useState<boolean>(initialPrefs.includeLessonDate !== false);
  const [reportLanguage, setReportLanguage] = useState<"ar" | "en">(initialPrefs.reportLanguage || (isArabic ? "ar" : "en"));

  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialSubjPlan?.defaultDurationMinutes || student.defaultDurationMinutes || 60
  );
  const [reportAttendance, setReportAttendance] = useState<AttendanceStatus>("present");
  const [reportDeductCost, setReportDeductCost] = useState<boolean>(true);
  const [reportHomeworkStatus, setReportHomeworkStatus] = useState<HomeworkStatus>("done");
  const [absentNotes, setAbsentNotes] = useState<string>("");
  const [classEvents, setClassEvents] = useState<string>("");
  const [homeworkNotes, setHomeworkNotes] = useState<string>("");
  const [overallEvaluation, setOverallEvaluation] = useState<string>("");
  const [newAiInstructions, setNewAiInstructions] = useState<string>(initialAiInst);
  const [newGeneratedReportText, setNewGeneratedReportText] = useState<string>("");
  const [reportAttachment, setReportAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");

  // Helper to persist student preferences automatically
  const updatePreference = <K extends keyof StudentReportPreferences>(key: K, value: StudentReportPreferences[K]) => {
    const updated: StudentReportPreferences = {
      includeStudentName,
      includeTeacherName,
      teacherName,
      includeLessonNumber,
      includeDuration,
      includeLessonDate,
      reportLanguage,
      [key]: value
    };
    if (key === "includeStudentName") setIncludeStudentName(value as boolean);
    if (key === "includeTeacherName") setIncludeTeacherName(value as boolean);
    if (key === "teacherName") setTeacherName(value as string);
    if (key === "includeLessonNumber") setIncludeLessonNumber(value as boolean);
    if (key === "includeDuration") setIncludeDuration(value as boolean);
    if (key === "includeLessonDate") setIncludeLessonDate(value as boolean);
    if (key === "reportLanguage") setReportLanguage(value as "ar" | "en");
    StorageEngine.saveStudentReportPreferences(student.id, updated);
  };

  // UI state
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string>("");
  const [savePresentReportSuccess, setSavePresentReportSuccess] = useState<boolean>(false);
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [reportArchiveFilter, setReportArchiveFilter] = useState<"active" | "archived" | "all">("all");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>("");
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState<string>("all");
  const [showArchiveCycleModal, setShowArchiveCycleModal] = useState<boolean>(false);

  // WhatsApp Multi-App Target Selection Modal State
  const [showWhatsAppChooserModal, setShowWhatsAppChooserModal] = useState(false);
  const [pendingWhatsAppText, setPendingWhatsAppText] = useState("");
  const [reportToDelete, setReportToDelete] = useState<GeneratedReport | null>(null);

  const lastDefaultInstructionRef = useRef<string>(initialAiInst);
  const userManuallyTypedInstructionRef = useRef<boolean>(false);

  // Automatically sync instruction textarea when settings or subject changes, unless user manually typed a custom one-off instruction
  useEffect(() => {
    const currentDefault = findSubjectAiInstruction(
      settings.subjectDefaults,
      reportSubject,
      settings.generalAiInstructions
    );
    if (!userManuallyTypedInstructionRef.current || !newAiInstructions.trim() || newAiInstructions === lastDefaultInstructionRef.current) {
      setNewAiInstructions(currentDefault);
      lastDefaultInstructionRef.current = currentDefault;
    }
  }, [settings.generalAiInstructions, settings.subjectDefaults, reportSubject]);

  useEffect(() => {
    setReportLessonNumber(calculateNextLessonNumber(reportSubject));
  }, [student.currentCycleStartDate, reports.length, attendanceRecords.length]);

  const handleSubjectChange = (newSubj: string) => {
    setReportSubject(newSubj);
    setReportLessonNumber(calculateNextLessonNumber(newSubj));
    const subjInst = findSubjectAiInstruction(
      settings.subjectDefaults,
      newSubj,
      settings.generalAiInstructions
    );
    userManuallyTypedInstructionRef.current = false;
    lastDefaultInstructionRef.current = subjInst;
    setNewAiInstructions(subjInst);
  };

  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentMeta = (attachment: ReportAttachment) => {
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

  const processSelectedFile = (file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert(
        isArabic
          ? "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 20 ميجابايت."
          : "File is too large. Maximum size is 20MB."
      );
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
      processSelectedFile(file);
    }
    // reset target value so the same file can be selected again if needed
    e.target.value = "";
  };

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenWhatsAppChooser = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setPendingWhatsAppText(text);
    setShowWhatsAppChooserModal(true);
  };

  const handleSendViaWhatsAppMode = (
    mode: "universal" | "web" | "app_scheme" | "business_scheme" | "intent_android"
  ) => {
    const text = pendingWhatsAppText;
    const rawLink = student.whatsappGroupLink || student.parentContact || student.studentPhone || "";
    const isUrl = rawLink.startsWith("http");
    const cleanPhone = rawLink.replace(/[^0-9]/g, "");
    const encodedText = encodeURIComponent(text);

    let finalUrl = "";

    if (mode === "web") {
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
      }
    } else if (mode === "app_scheme") {
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `whatsapp://send?text=${encodedText}`;
      }
    } else if (mode === "business_scheme") {
      if (cleanPhone) {
        finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      } else if (isUrl) {
        finalUrl = rawLink;
      } else {
        finalUrl = `https://wa.me/?text=${encodedText}`;
      }
    } else if (mode === "intent_android") {
      if (navigator.share) {
        navigator
          .share({
            title: isArabic ? `تقرير ${student.fullName}` : `Report: ${student.fullName}`,
            text: text
          })
          .then(() => {
            setShowWhatsAppChooserModal(false);
            setNotificationNotice(
              isArabic ? "تم فتح نافذة المشاركة بنجاح!" : "Shared successfully!"
            );
            setTimeout(() => setNotificationNotice(""), 4000);
          })
          .catch(() => {});
        return;
      } else {
        if (cleanPhone) {
          finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        } else {
          finalUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        }
      }
    } else {
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
    setNotificationNotice(
      isArabic
        ? "تم نسخ التقرير وجاري الفتح في تطبيق الواتساب المختار!"
        : "Report copied and opened!"
    );
    setTimeout(() => setNotificationNotice(""), 4500);
  };

  // Helper for building standard report header
  const buildReportHeader = (isAbsent: boolean) => {
    const isEn = reportLanguage === "en";
    const effDuration = durationMinutes || initialSubjPlan?.defaultDurationMinutes || student.defaultDurationMinutes || 60;
    const durStr = `${effDuration} ${isEn ? "mins" : "دقيقة"}`;

    const title = isAbsent
      ? (isEn ? "📌 Student Absence Report" : "📌 تقرير غياب طالب")
      : (isEn ? "📌 Lesson Report" : "📌 تقرير متابعة الحصة");

    const headerLines: string[] = [title];

    // 1. Student Name
    if (includeStudentName && student.fullName) {
      headerLines.push(isEn ? `• Student: ${student.fullName}` : `• الطالب: ${student.fullName}`);
    }

    // 2. Teacher Name
    if (includeTeacherName && teacherName.trim()) {
      headerLines.push(isEn ? `• Teacher: ${teacherName.trim()}` : `• المعلم: ${teacherName.trim()}`);
    }

    // 3. Lesson Number
    if (includeLessonNumber) {
      headerLines.push(isEn ? `• Lesson: #${reportLessonNumber}` : `• رقم الحصة: #${reportLessonNumber}`);
    }

    // 4. Duration
    if (includeDuration) {
      headerLines.push(isEn ? `• Duration: ${durStr}` : `• مدة الحصة: ${durStr}`);
    }

    // 5. Date
    if (includeLessonDate && reportDate) {
      headerLines.push(isEn ? `• Date: ${reportDate}` : `• التاريخ: ${reportDate}`);
    }

    // Subject
    if (reportSubject) {
      headerLines.push(isEn ? `• Subject: ${reportSubject}` : `• المادة: ${reportSubject}`);
    }

    return headerLines.join("\n");
  };

  // Helper for saving absent report
  const handleSaveAbsentReport = () => {
    const isMonthly =
      student.billingType === "monthly" ||
      student.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");
    const isEn = reportLanguage === "en";

    const headerText = buildReportHeader(true);
    const absentReportText = `${headerText}
${isEn ? "• Attendance: Absent" : "• حالة الحضور: غائب"}${
      !isMonthly
        ? isEn
          ? `\n• Billed: ${reportDeductCost ? "Yes (Deducted)" : "No (Excused)"}`
          : `\n• حساب الحصة: ${reportDeductCost ? "تم احتساب الحصة وخصمها من الرصيد" : "لم يتم الخصم (غياب بعذر)"}`
        : ""
    }${absentNotes ? (isEn ? `\n• Reason/Notes: ${absentNotes}` : `\n• سبب/ملاحظات: ${absentNotes}`) : ""}`;

    const effDuration = durationMinutes || initialSubjPlan?.defaultDurationMinutes || student.defaultDurationMinutes || 60;

    onAddReport({
      studentId: student.id,
      studentName: student.fullName,
      teacherName: includeTeacherName ? teacherName : undefined,
      subject: reportSubject,
      lessonNumber: reportLessonNumber,
      date: reportDate,
      attendance: "absent",
      deductCost: isMonthly ? true : reportDeductCost,
      homeworkStatus: "not_done",
      durationMinutes: effDuration,
      lessonDuration: `${effDuration} دقيقة`,
      includeStudentName,
      includeTeacherName,
      includeLessonNumber,
      includeDuration,
      includeLessonDate,
      teacherNotes: absentNotes || (isEn ? "Absent" : "غائب"),
      aiInstructions: "",
      reportText: absentReportText,
      generatedText: absentReportText
    });

    setNotificationNotice(isEn ? "Absence recorded successfully! 💾" : "تم حفظ تسجيل الغياب بنجاح! 💾");
    setTimeout(() => setNotificationNotice(""), 4000);
    // Refresh next lesson number
    setReportLessonNumber(prev => prev + 1);
  };

  // Helper for saving present report
  const handleSavePresentReport = (textToSave?: string) => {
    const effDuration = durationMinutes || initialSubjPlan?.defaultDurationMinutes || student.defaultDurationMinutes || 60;
    const isEn = reportLanguage === "en";

    const headerText = buildReportHeader(false);
    const bodySections: string[] = [];

    if (classEvents.trim()) {
      bodySections.push(isEn ? `Class Content & Performance:\n${classEvents.trim()}` : `ما حدث داخل الحصة:\n${classEvents.trim()}`);
    }

    if (homeworkNotes.trim()) {
      bodySections.push(isEn ? `Homework & Assignments:\n${homeworkNotes.trim()}` : `الواجب والتكليفات:\n${homeworkNotes.trim()}`);
    }

    if (overallEvaluation.trim()) {
      bodySections.push(isEn ? `Overall Evaluation: ${overallEvaluation.trim()}` : `التقييم الإجمالي: ${overallEvaluation.trim()}`);
    }

    const fallbackFullText = `${headerText}\n\n${bodySections.join("\n\n")}`;
    const finalText = textToSave || newGeneratedReportText || fallbackFullText;
    if (!finalText.trim()) return;

    onAddReport({
      studentId: student.id,
      studentName: student.fullName,
      teacherName: includeTeacherName ? teacherName : undefined,
      subject: reportSubject,
      lessonNumber: reportLessonNumber,
      date: reportDate,
      attendance: "present",
      deductCost: true,
      homeworkStatus: reportHomeworkStatus,
      durationMinutes: effDuration,
      lessonDuration: `${effDuration} دقيقة`,
      includeStudentName,
      includeTeacherName,
      includeLessonNumber,
      includeDuration,
      includeLessonDate,
      teacherNotes: bodySections.join("\n\n"),
      classEvents: classEvents.trim(),
      homeworkNotes: homeworkNotes.trim(),
      overallEvaluation: overallEvaluation.trim() || undefined,
      aiInstructions: newAiInstructions,
      reportText: finalText,
      generatedText: finalText
    });

    setSavePresentReportSuccess(true);
    setTimeout(() => setSavePresentReportSuccess(false), 5000);

    setNotificationNotice(isEn ? "Report saved successfully to student file! 💾" : "تم حفظ التقرير بملف الطالب بنجاح! 💾");
    setTimeout(() => setNotificationNotice(""), 5000);
    // Reset filters so the newly saved report is immediately visible in the list below
    setReportArchiveFilter("all");
    setArchiveSubjectFilter("all");
    setArchiveSearchQuery("");
    // Increment lesson number and clear fields
    setReportLessonNumber(prev => prev + 1);
    setClassEvents("");
    setHomeworkNotes("");
    setOverallEvaluation("");
    setNewGeneratedReportText("");
    setReportAttachment(null);
  };

  // 6 months check
  const isReportOlderThan6Months = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const rDate = new Date(dateStr);
    if (isNaN(rDate.getTime())) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return rDate < sixMonthsAgo;
  };

  // Gather all past reports
  const safeReports = Array.isArray(reports) ? reports : [];
  const safeAttendanceRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  const studentIdStr = String(student?.id || "").trim();
  const studentNameNorm = (student?.fullName || "").trim().toLowerCase();

  const rawStudentReports = safeReports.filter(
    r => r && (
      (r.studentId && String(r.studentId).trim() === studentIdStr) ||
      (r.studentName && r.studentName.trim().toLowerCase() === studentNameNorm)
    ) && isDailyPersonalReport(r)
  );
  const studentReports = deduplicateReportsList(rawStudentReports);

  const studentAttendanceReports = safeAttendanceRecords
    .filter(
      ar =>
        ar &&
        ((ar.studentId && String(ar.studentId).trim() === studentIdStr) ||
         (ar.studentName && ar.studentName.trim().toLowerCase() === studentNameNorm)) &&
        (ar.generatedReportText || ar.teacherNotes)
    )
    .map((ar): GeneratedReport => ({
      id: ar.id,
      studentId: ar.studentId,
      studentName: student?.fullName || ar.studentName || "",
      subject: ar.subject || student?.subject || "",
      lessonNumber: ar.lessonNumber,
      attendance: ar.attendance,
      deductCost: ar.deducted,
      durationMinutes: undefined,
      lessonDuration: undefined,
      homeworkStatus: undefined,
      date: ar.date,
      teacherNotes: ar.teacherNotes || "",
      aiInstructions: ar.aiInstructions || "",
      reportText: ar.generatedReportText || ar.teacherNotes || "",
      generatedText: ar.generatedReportText || ar.teacherNotes || "",
      archived: (ar as any).archived === true,
      archivedAt: (ar as any).archivedAt,
      archiveGroup: (ar as any).archiveGroup,
      manuallyUnarchived: (ar as any).manuallyUnarchived === true,
      createdAt: ar.date
    } as GeneratedReport));

  const allMergedReports = mergeDirectAndAttendanceReports(studentReports, studentAttendanceReports)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const activeCycle = getActiveCycleInfo(student);

  const activeReports = allMergedReports.filter(r => {
    return isReportInActiveCycle(r, student, activeCycle);
  });

  const archivedReports = allMergedReports.filter(r => {
    return !isReportInActiveCycle(r, student, activeCycle);
  });

  const filteredArchivedReports = archivedReports.filter(r => {
    if (archiveSubjectFilter !== "all") {
      if ((r.subject || "").trim().toLowerCase() !== archiveSubjectFilter.trim().toLowerCase()) {
        return false;
      }
    }
    if (archiveSearchQuery.trim()) {
      const q = archiveSearchQuery.toLowerCase();
      const matchText = (r.reportText || "").toLowerCase();
      const matchNotes = (r.teacherNotes || "").toLowerCase();
      const matchSubj = (r.subject || "").toLowerCase();
      const matchDate = (r.date || "").toLowerCase();
      return (
        matchText.includes(q) ||
        matchNotes.includes(q) ||
        matchSubj.includes(q) ||
        matchDate.includes(q)
      );
    }
    return true;
  });

  const archivedMonthGroups = groupArchivedReports(filteredArchivedReports, !isArabic);

  const filteredReportsList = (
    reportArchiveFilter === "active"
      ? activeReports
      : reportArchiveFilter === "archived"
      ? archivedReports
      : allMergedReports
  ).filter(r => {
    if (archiveSubjectFilter !== "all") {
      if ((r.subject || "").trim().toLowerCase() !== archiveSubjectFilter.trim().toLowerCase()) {
        return false;
      }
    }
    if (archiveSearchQuery.trim()) {
      const q = archiveSearchQuery.toLowerCase();
      const matchText = (r.reportText || "").toLowerCase();
      const matchNotes = (r.teacherNotes || "").toLowerCase();
      const matchSubj = (r.subject || "").toLowerCase();
      const matchDate = (r.date || "").toLowerCase();
      return (
        matchText.includes(q) ||
        matchNotes.includes(q) ||
        matchSubj.includes(q) ||
        matchDate.includes(q)
      );
    }
    return true;
  });

  const uniqueSubjects = Array.from(
    new Set([
      ...(student.subjects?.map(s => s.subject) || []),
      student.subject,
      ...allMergedReports.map(r => r.subject)
    ].filter(Boolean))
  );

  return (
    <div className="space-y-5 pb-16 animate-in fade-in max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shrink-0 shadow-2xs group"
              title={isArabic ? "رجوع إلى قائمة الطلاب" : "Back to Students"}
            >
              {isArabic ? (
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
              ) : (
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
              )}
            </button>

            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-600/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-slate-900">
                  {isArabic ? `تقرير شخصي: ${student.fullName}` : `Personal Report: ${student.fullName}`}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700">
                  {isArabic ? "صفحة التقرير المستقلة" : "Standalone Report View"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isArabic
                  ? "كتابة وتعديل تقارير الحصص، الصياغة بالذكاء الاصطناعي، وتسجيل الحضور والواجبات."
                  : "Write & edit lesson reports, refine with AI, and track attendance."}
              </p>
            </div>
          </div>

          {/* Quick Return & Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              {isArabic ? (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع للطلاب</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Student Meta Details Chips */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          {student.academicYear && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 font-bold">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>{student.academicYear}</span>
            </span>
          )}

          {student.curriculum && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>{student.curriculum}</span>
            </span>
          )}

          {student.parentContact && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{isArabic ? "ولي الأمر:" : "Parent:"} {student.parentContact}</span>
            </span>
          )}

          {student.studentPhone && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{isArabic ? "هاتف الطالب:" : "Student:"} {student.studentPhone}</span>
            </span>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            {student.subjects && student.subjects.length > 0 ? (
              student.subjects.map((sub, idx) => (
                <span
                  key={sub.id || idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold"
                >
                  <span>{sub.studyType === "group" ? "👥" : "👤"}</span>
                  <span>{sub.subject}</span>
                  <span className="text-purple-500">•</span>
                  <span>
                    {sub.billingType === "monthly"
                      ? `${sub.monthlyCost || 400} ج.م/شهر 📅`
                      : `${sub.lessonCost || 100} ج.م/حصة 🎟️`}
                  </span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold">
                <span>{student.subject}</span>
                <span className="text-purple-500">•</span>
                <span>
                  {student.billingType === "monthly"
                    ? `${student.monthlyCost || 400} ج.م/شهر 📅`
                    : `${student.lessonCost || 100} ج.م/حصة 🎟️`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationNotice}</span>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition shrink-0"
            >
              {isArabic ? "العودة للجدول ⬅️" : "Back to Schedule ⬅️"}
            </button>
          )}
        </div>
      )}

      {/* Main Form: Write / Edit Report */}
      <div className="bg-white border-2 border-purple-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isArabic ? "كتابة وإعداد تقرير الحصة الجديد" : "Write & Prepare Lesson Report"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isArabic ? "حدد بيانات الحصة واكتب الملاحظات أو استخدم الصياغة الذكية" : "Configure lesson details and AI analysis"}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: المادة الدراسية واللغة في شريط مدمج متناسق */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <span className="font-black text-slate-800 text-xs flex items-center gap-1 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>{isArabic ? "المادة:" : "Subject:"}</span>
            </span>

            {(() => {
              const studentSubjectNames =
                student.subjects && student.subjects.length > 0
                  ? student.subjects.map(s => s.subject)
                  : [student.subject];

              return (
                <div className="flex flex-wrap items-center gap-1">
                  {studentSubjectNames.map(subjName => (
                    <button
                      key={subjName}
                      type="button"
                      onClick={() => handleSubjectChange(subjName)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                        reportSubject === subjName
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                      }`}
                    >
                      <span>{subjName}</span>
                    </button>
                  ))}

                  <input
                    type="text"
                    value={reportSubject}
                    onChange={e => handleSubjectChange(e.target.value)}
                    placeholder={isArabic ? "مادة أخرى..." : "Other..."}
                    className="w-24 sm:w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-purple-500 focus:bg-white transition"
                  />
                </div>
              );
            })()}
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => updatePreference("reportLanguage", "ar")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                reportLanguage === "ar"
                  ? "bg-white text-purple-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🇪🇬 عربي
            </button>
            <button
              type="button"
              onClick={() => updatePreference("reportLanguage", "en")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                reportLanguage === "en"
                  ? "bg-white text-purple-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* STEP 2: شريط بيانات وترويسة الحصة (حجم مدمج متناسق واحترافي) */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
            <span className="flex items-center gap-1 text-slate-700">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>{isArabic ? "بيانات ترويسة التقرير (Header):" : "Report Header Fields:"}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {isArabic ? "اضغط على علامة (✓) لتضمين أو استثناء أي حقل" : "Toggle (✓) to include/exclude"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {/* 1. Student Name */}
            <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition ${includeStudentName ? "bg-white border-purple-200 shadow-2xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
              <button
                type="button"
                onClick={() => updatePreference("includeStudentName", !includeStudentName)}
                className={`w-5 h-5 rounded-md text-[10px] font-black transition flex items-center justify-center shrink-0 ${
                  includeStudentName ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
                title={isArabic ? "تفعيل/تعطيل اسم الطالب في التقرير" : "Toggle Student Name"}
              >
                {includeStudentName ? "✓" : "✕"}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-slate-400 block leading-none">{isArabic ? "الطالب" : "Student"}</span>
                <span className="text-xs font-bold text-slate-800 truncate block mt-0.5" title={student.fullName}>
                  {student.fullName}
                </span>
              </div>
            </div>

            {/* 2. Teacher Name */}
            <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition ${includeTeacherName ? "bg-white border-purple-200 shadow-2xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
              <button
                type="button"
                onClick={() => updatePreference("includeTeacherName", !includeTeacherName)}
                className={`w-5 h-5 rounded-md text-[10px] font-black transition flex items-center justify-center shrink-0 ${
                  includeTeacherName ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
                title={isArabic ? "تفعيل/تعطيل اسم المعلم في التقرير" : "Toggle Teacher Name"}
              >
                {includeTeacherName ? "✓" : "✕"}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-slate-400 block leading-none">{isArabic ? "المعلم" : "Teacher"}</span>
                <input
                  type="text"
                  value={teacherName}
                  disabled={!includeTeacherName}
                  onChange={e => updatePreference("teacherName", e.target.value)}
                  placeholder={isArabic ? "أ/ المعلم..." : "Teacher..."}
                  className="w-full bg-transparent border-0 p-0 text-xs text-slate-800 font-bold focus:outline-none focus:ring-0 placeholder:text-slate-300 mt-0.5"
                />
              </div>
            </div>

            {/* 3. Lesson Number */}
            <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition ${includeLessonNumber ? "bg-white border-purple-200 shadow-2xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
              <button
                type="button"
                onClick={() => updatePreference("includeLessonNumber", !includeLessonNumber)}
                className={`w-5 h-5 rounded-md text-[10px] font-black transition flex items-center justify-center shrink-0 ${
                  includeLessonNumber ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
                title={isArabic ? "تفعيل/تعطيل رقم الحصة" : "Toggle Lesson Number"}
              >
                {includeLessonNumber ? "✓" : "✕"}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-slate-400 block leading-none">{isArabic ? "رقم الحصة" : "Lesson #"}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    disabled={!includeLessonNumber}
                    onClick={() => setReportLessonNumber(prev => Math.max(1, prev - 1))}
                    className="w-4 h-4 rounded bg-slate-100 hover:bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center disabled:opacity-30"
                  >-</button>
                  <input
                    type="number"
                    min="1"
                    disabled={!includeLessonNumber}
                    value={reportLessonNumber}
                    onChange={e => setReportLessonNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-7 text-center font-black text-xs text-purple-900 bg-transparent p-0 border-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!includeLessonNumber}
                    onClick={() => setReportLessonNumber(prev => prev + 1)}
                    className="w-4 h-4 rounded bg-slate-100 hover:bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center disabled:opacity-30"
                  >+</button>
                </div>
              </div>
            </div>

            {/* 4. Lesson Duration */}
            <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition ${includeDuration ? "bg-white border-purple-200 shadow-2xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
              <button
                type="button"
                onClick={() => updatePreference("includeDuration", !includeDuration)}
                className={`w-5 h-5 rounded-md text-[10px] font-black transition flex items-center justify-center shrink-0 ${
                  includeDuration ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
                title={isArabic ? "تفعيل/تعطيل إدراج مدة الحصة" : "Toggle Duration"}
              >
                {includeDuration ? "✓" : "✕"}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-slate-400 block leading-none">{isArabic ? "المدة (حرية كاملة)" : "Duration (flexible)"}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    disabled={!includeDuration}
                    value={durationMinutes || ""}
                    placeholder="60"
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setDurationMinutes(isNaN(val) ? 0 : Math.max(1, val));
                    }}
                    className="w-12 bg-purple-50/70 border border-purple-200/90 rounded-md px-1 py-0.5 text-xs font-black text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-400 text-center"
                    title={isArabic ? "اكتب أي عدد دقائق تريده (مثلاً: 10, 15, 20, 25, 30, 45, 60...)" : "Enter any duration in minutes"}
                  />
                  <span className="text-[10px] font-black text-purple-800 shrink-0">{isArabic ? "د" : "m"}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={!includeDuration || durationMinutes <= 1}
                      onClick={() => setDurationMinutes(prev => Math.max(1, (prev || 60) - 5))}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 flex items-center justify-center text-[10px] font-bold transition disabled:opacity-40"
                      title={isArabic ? "إنقاص 5 دقائق" : "-5 mins"}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      disabled={!includeDuration}
                      onClick={() => setDurationMinutes(prev => Math.min(480, (prev || 60) + 5))}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 flex items-center justify-center text-[10px] font-bold transition disabled:opacity-40"
                      title={isArabic ? "زيادة 5 دقائق" : "+5 mins"}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Lesson Date */}
            <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 col-span-2 sm:col-span-1 transition ${includeLessonDate ? "bg-white border-purple-200 shadow-2xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
              <button
                type="button"
                onClick={() => updatePreference("includeLessonDate", !includeLessonDate)}
                className={`w-5 h-5 rounded-md text-[10px] font-black transition flex items-center justify-center shrink-0 ${
                  includeLessonDate ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
                title={isArabic ? "تفعيل/تعطيل تاريخ الحصة" : "Toggle Date"}
              >
                {includeLessonDate ? "✓" : "✕"}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-slate-400 block leading-none">{isArabic ? "التاريخ" : "Date"}</span>
                <input
                  type="date"
                  disabled={!includeLessonDate}
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-0 mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Quick Duration Presets Strip (5m, 10m, 15m, 20m, 25m, 30m, 40m, 45m, 50m, 60m, 75m, 90m, 120m) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 text-[11px] bg-purple-50/60 p-2 rounded-xl border border-purple-100">
            <span className="font-bold text-purple-900 text-[10px] flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-purple-600" />
              {isArabic ? "مدة الحصة (حرية كاملة - أي مدة أقل أو أكثر من 30د):" : "Lesson Duration (Any duration):"}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map(dur => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => {
                    setDurationMinutes(dur);
                    if (!includeDuration) {
                      updatePreference("includeDuration", true);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    includeDuration && durationMinutes === dur
                      ? "bg-purple-600 text-white shadow-2xs font-black"
                      : "bg-white text-purple-900 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  {dur}{isArabic ? "د" : "m"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 3: حالة الحضور والواجب (مدمجة جنباً إلى جنب لاستغلال المساحة) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {/* Attendance Status */}
          <div className="space-y-1.5">
            <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-black">3</span>
              <span>{isArabic ? "حالة الحضور والغياب: *" : "Attendance Status: *"}</span>
            </label>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setReportAttendance("present");
                  setReportDeductCost(true);
                }}
                className={`py-2 px-3 rounded-lg font-black text-xs transition flex items-center justify-center gap-1.5 ${
                  reportAttendance === "present"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>{isArabic ? "🟢 حاضر" : "🟢 Present"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportAttendance("absent");
                  setReportDeductCost(false);
                }}
                className={`py-2 px-3 rounded-lg font-black text-xs transition flex items-center justify-center gap-1.5 ${
                  reportAttendance === "absent"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <X className="w-3.5 h-3.5 text-rose-300" />
                <span>{isArabic ? "🔴 غائب" : "🔴 Absent"}</span>
              </button>
            </div>
          </div>

          {/* Homework Status (when present) */}
          {reportAttendance === "present" ? (
            <div className="space-y-1.5">
              <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">4</span>
                <span>{isArabic ? "حالة الواجب السابق:" : "Homework Status:"}</span>
              </label>
              <select
                value={reportHomeworkStatus}
                onChange={e => setReportHomeworkStatus(e.target.value as HomeworkStatus)}
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-black text-purple-900 focus:outline-none focus:border-purple-500 shadow-2xs"
              >
                <option value="done">{isArabic ? "✅ تم حل الواجب كاملاً ومتقن" : "Done (Complete)"}</option>
                <option value="not_done">{isArabic ? "❌ لم يحل الواجب" : "Not Done"}</option>
                <option value="late">{isArabic ? "⚠️ حل الواجب بتأخير أو جزئياً" : "Late / Partial"}</option>
                <option value="no_homework">{isArabic ? "⚪ لم يكن هناك واجب" : "No Homework Assigned"}</option>
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{isArabic ? "تم تحديد حالة الطالب كغائب عن هذه الحصة" : "Student marked absent"}</span>
            </div>
          )}
        </div>

        {/* CONDITIONAL RENDERING: ABSENT vs PRESENT */}
        {reportAttendance === "absent" ? (
          /* ABSENT WORKFLOW */
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-black text-rose-950 text-xs sm:text-sm">
                  {isArabic ? "تسجيل غياب الطالب عن الحصة" : "Record Student Absence"}
                </h3>
              </div>
            </div>

            {/* Monthly vs Elapsed Lessons Info & Options */}
            {(() => {
              const isMonthly =
                student.billingType === "monthly" ||
                student.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");

              if (isMonthly) {
                return (
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs font-semibold flex items-start gap-2">
                    <span className="text-sm">📅</span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-blue-950">
                        {isArabic ? "نظام المحاسبة: الشهر كامل (اشتراك شهري ثابت)" : "Billing: Full Month Flat"}
                      </p>
                      <p className="text-[11px] text-blue-800">
                        {isArabic
                          ? "يتم احتساب الشهر ثابتاً للطالب، وتسجيل الغياب هنا للمتابعة الأكاديمية وسجل الحضور فقط."
                          : "Absence is logged purely for attendance tracking. No billing deductions apply."}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-700 font-bold">
                    {isArabic
                      ? "نظام حصص التقويم المنقضية (الاحتساب المالي):"
                      : "Elapsed Lessons Billing:"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportDeductCost(true)}
                      className={`p-2.5 rounded-xl border text-right transition flex items-center justify-between ${
                        reportDeductCost
                          ? "bg-rose-600 text-white border-rose-700 shadow-2xs"
                          : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs">
                          {isArabic ? "✅ احتساب الحصة وخصمها" : "Yes - Deduct & Bill"}
                        </p>
                        <p className={`text-[10.5px] ${reportDeductCost ? "text-rose-100" : "text-slate-500"}`}>
                          {isArabic ? "غياب غير معذور" : "Non-excused"}
                        </p>
                      </div>
                      <Check className={`w-4 h-4 ${reportDeductCost ? "text-white" : "text-transparent"}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportDeductCost(false)}
                      className={`p-2.5 rounded-xl border text-right transition flex items-center justify-between ${
                        !reportDeductCost
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs"
                          : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs">
                          {isArabic ? "❌ استثناء الحصة (غياب بعذر)" : "No - Excused (No Charge)"}
                        </p>
                        <p className={`text-[10.5px] ${!reportDeductCost ? "text-emerald-100" : "text-slate-500"}`}>
                          {isArabic ? "لا تحتسب ولا تترتب رسوم" : "No charge"}
                        </p>
                      </div>
                      <Check className={`w-4 h-4 ${!reportDeductCost ? "text-white" : "text-transparent"}`} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Optional Absence Reason */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={absentNotes}
                onChange={e => setAbsentNotes(e.target.value)}
                placeholder={isArabic ? "ملاحظة حول سبب الغياب (اختياري)..." : "Absence reason / notes (optional)..."}
                className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 shadow-2xs"
              />
            </div>

            {/* Actions for Absent */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200/80">
              <button
                type="button"
                disabled={isGeneratingReport}
                onClick={async () => {
                  setIsGeneratingReport(true);
                  setGenerationError("");
                  try {
                    const isEn = reportLanguage === "en";
                    const isMonthly =
                      student.billingType === "monthly" ||
                      student.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");
                    const billedText = isMonthly
                      ? (isEn ? "Full monthly subscription" : "اشتراك شهري كامل ثابت")
                      : reportDeductCost
                      ? (isEn ? "Lesson counted and deducted from balance" : "تم احتساب الحصة وخصمها من الرصيد")
                      : (isEn ? "Excused absence (no deduction)" : "غياب بعذر مقبول (لم يتم الخصم)");

                    const res = await onGenerateReportAi({
                      studentName: student.fullName,
                      subject: reportSubject,
                      date: reportDate,
                      teacherName: includeTeacherName ? teacherName.trim() : undefined,
                      lessonNumber: reportLessonNumber,
                      includeStudentName,
                      includeTeacherName,
                      includeLessonNumber,
                      includeDuration: false,
                      includeLessonDate,
                      preferredLanguage: reportLanguage,
                      attendanceStatus: "غائب",
                      homeworkStatus: "not_done",
                      classEvents: absentNotes.trim()
                        ? (isEn ? `Student absent. Reason: ${absentNotes.trim()}` : `غياب الطالب عن الحصة. السبب: ${absentNotes.trim()}`)
                        : (isEn ? "Student was absent from the scheduled lesson." : "تم تسجيل غياب الطالب عن هذه الحصة المجدولة."),
                      teacherNotes: `${isEn ? "Absence Notification" : "إشعار غياب ومتابعة"}\n${isEn ? "Financial status:" : "الوضع المالي:"} ${billedText}\n${absentNotes ? (isEn ? `Notes: ${absentNotes}` : `ملاحظة: ${absentNotes}`) : ""}`,
                      aiInstructions: newAiInstructions.trim()
                    });
                    if (res) {
                      setNewGeneratedReportText(res);
                      handleOpenWhatsAppChooser(res);
                    }
                  } catch (err: any) {
                    setGenerationError(err?.message || String(err));
                  } finally {
                    setIsGeneratingReport(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isArabic ? "✨ صياغة إشعار غياب بالذكاء الاصطناعي" : "✨ AI Absence Notice"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAbsentReport}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isArabic ? "حفظ تسجيل الغياب" : "Save Absence Record"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* PRESENT WORKFLOW */
          <div className="space-y-3 animate-in fade-in">
            {/* Two Distinct Teacher Input Fields Side-by-Side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Field 1: What happened in class */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 space-y-1.5">
                <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isArabic ? "1️⃣ محتوى الدرس وأداء الطالب في الحصة:" : "1️⃣ Class Content & Performance:"}</span>
                </label>
                <textarea
                  rows={3}
                  value={classEvents}
                  onChange={e => setClassEvents(e.target.value)}
                  placeholder={
                    isArabic
                      ? "تفاصيل ما تم شرحه ونقاط أداء واستيعاب وتفاعل الطالب..."
                      : "Lesson topics explained, student performance..."
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-purple-500 leading-relaxed transition shadow-2xs font-sans placeholder:text-slate-400"
                />
              </div>

              {/* Field 2: Homework & Assignments */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 space-y-1.5">
                <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isArabic ? "2️⃣ الواجب والتكليفات المطلوبة (للقادم):" : "2️⃣ Homework & Required Assignments:"}</span>
                </label>
                <textarea
                  rows={3}
                  value={homeworkNotes}
                  onChange={e => setHomeworkNotes(e.target.value)}
                  placeholder={
                    isArabic
                      ? "التكليفات والواجبات المحددة بدقة والتمارين المطلوبة..."
                      : "Required homework assignments, exercises..."
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed transition shadow-2xs font-sans placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Field 3: Overall Evaluation (Compact Presets + Free Text) */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>{isArabic ? "⭐ التقييم الإجمالي ومستوى الأداء:" : "⭐ Overall Performance Rating:"}</span>
                </label>
                {overallEvaluation && (
                  <button
                    type="button"
                    onClick={() => setOverallEvaluation("")}
                    className="text-[10.5px] text-rose-600 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 transition"
                  >
                    {isArabic ? "مسح" : "Clear"}
                  </button>
                )}
              </div>

              {/* Preset Options Buttons */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: isArabic ? "🌟 ممتاز مرتفع" : "🌟 Excellent+", value: isArabic ? "ممتاز مرتفع (⭐⭐⭐⭐⭐)" : "Excellent+ (5/5)" },
                  { label: isArabic ? "⭐ ممتاز" : "⭐ Excellent", value: isArabic ? "ممتاز (⭐⭐⭐⭐⭐)" : "Excellent (5/5)" },
                  { label: isArabic ? "📈 جيد جداً مرتفع" : "📈 Very Good+", value: isArabic ? "جيد جداً مرتفع (⭐⭐⭐⭐)" : "Very Good+ (4/5)" },
                  { label: isArabic ? "👍 جيد جداً" : "👍 Very Good", value: isArabic ? "جيد جداً (⭐⭐⭐⭐)" : "Very Good (4/5)" },
                  { label: isArabic ? "✨ جيد" : "✨ Good", value: isArabic ? "جيد (⭐⭐⭐)" : "Good (3/5)" },
                  { label: isArabic ? "⚖️ متوسط" : "⚖️ Average", value: isArabic ? "مقبول / متوسط (⭐⭐)" : "Average (2/5)" },
                  { label: isArabic ? "⚠️ يحتاج تطوير" : "⚠️ Needs Imp.", value: isArabic ? "يحتاج إلى متابعة وتطوير مستمر ⚠️" : "Needs continuous improvement ⚠️" },
                  { label: isArabic ? "🚀 متفوق ومبدع" : "🚀 Outstanding", value: isArabic ? "متفوق ومبدع 🚀" : "Outstanding 🚀" },
                  { label: "💯 10/10", value: "10 / 10" },
                  { label: "🎯 9/10", value: "9 / 10" },
                  { label: "📊 8/10", value: "8 / 10" }
                ].map((preset, idx) => {
                  const isSelected = overallEvaluation === preset.value;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setOverallEvaluation(isSelected ? "" : preset.value)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border shadow-2xs ${
                        isSelected
                          ? "bg-amber-500 border-amber-600 text-white shadow-xs"
                          : "bg-white border-amber-200/90 text-slate-700 hover:bg-amber-100/70"
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
                    ? "اختر من الخيارات أعلاه أو اكتب تقييماً أو درجة مخصصة..."
                    : "Select preset above or type custom assessment freely..."
                }
                className="w-full bg-white border border-amber-200/90 rounded-xl px-3 py-1.5 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 transition shadow-2xs font-sans placeholder:text-slate-400"
              />
            </div>

            {/* AI Template & Attachment Row (Proportional compact 2-columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Subject AI Instructions */}
              <div className="space-y-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-700 text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>{isArabic ? `تعليمات وقالب الذكاء الاصطناعي (${reportSubject}):` : "AI Prompt Template:"}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      userManuallyTypedInstructionRef.current = false;
                      const inst = findSubjectAiInstruction(settings.subjectDefaults, reportSubject, settings.generalAiInstructions);
                      setNewAiInstructions(inst);
                      lastDefaultInstructionRef.current = inst;
                    }}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 transition"
                    title={isArabic ? "استعادة التوجيه الافتراضي من الإعدادات" : "Reset to default"}
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>{isArabic ? "استعادة من الإعدادات" : "Reset"}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={newAiInstructions}
                  onChange={e => {
                    userManuallyTypedInstructionRef.current = true;
                    setNewAiInstructions(e.target.value);
                  }}
                  placeholder={isArabic ? "قالب أو أسلوب محدد للذكاء الاصطناعي (يتم جلبه تلقائياً من الإعدادات)..." : "Custom template or rules for AI (auto-synced from settings)..."}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:border-purple-500 font-medium shadow-2xs leading-relaxed"
                />
              </div>

              {/* Universal File Attachment */}
              <div className="space-y-1.5 bg-purple-50/40 border border-purple-200/80 rounded-2xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isArabic ? "إرفاق ملف أو صورة (أي نوع: PDF, PowerPoint, Excel, Word وغيرها):" : "Attach Any File or Image (PDF, PPTX, Excel, Word, etc.):"}</span>
                  </label>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-full">
                    {isArabic ? "اختياري" : "Optional"}
                  </span>
                </div>

                {!reportAttachment ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processSelectedFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition text-center cursor-pointer select-none ${
                      isDraggingFile
                        ? "border-purple-600 bg-purple-100/70 scale-101"
                        : "border-purple-300 hover:border-purple-500 bg-white hover:bg-purple-50/50"
                    }`}
                    onClick={() => {
                      document.getElementById("student-report-universal-file-input")?.click();
                    }}
                  >
                    <input
                      id="student-report-universal-file-input"
                      type="file"
                      accept="*/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center justify-center gap-2 text-purple-800 font-bold text-xs">
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
                    const meta = getAttachmentMeta(reportAttachment);
                    return (
                      <div className="p-2 bg-white border border-purple-200 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {reportAttachment.previewUrl ? (
                            <img
                              src={reportAttachment.previewUrl}
                              alt="Attachment Preview"
                              className="w-10 h-10 object-cover rounded-lg border border-purple-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border relative overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50 border-purple-200">
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
                                  ({formatFileSize(reportAttachment.fileSize)})
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-800 text-xs truncate max-w-[220px] sm:max-w-xs mt-0.5">
                              {reportAttachment.fileName || "ملف مرفق"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            {isArabic ? "✅ جاهز للتحليل بالـ AI" : "✅ Ready for AI"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReportAttachment(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                            title={isArabic ? "إزالة الملف" : "Remove"}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* AI Generation Trigger Button */}
            <button
              type="button"
              disabled={isGeneratingReport}
              onClick={async () => {
                setIsGeneratingReport(true);
                setGenerationError("");
                try {
                  console.log("[GoStars UI] AI Report generation button clicked for student:", student.fullName, "Subject:", reportSubject);
                  const subjSpecificInst = getSubjectSpecificAiInstruction(settings.subjectDefaults, reportSubject);
                  const generalInst = settings.generalAiInstructions || "";
                  const effectiveAiInst = (newAiInstructions || "").trim();

                  const res = await onGenerateReportAi({
                    studentName: student.fullName,
                    subject: reportSubject,
                    date: reportDate,
                    teacherName: includeTeacherName ? teacherName.trim() : undefined,
                    lessonNumber: reportLessonNumber,
                    lessonDuration: `${durationMinutes} ${reportLanguage === "en" ? "mins" : "دقيقة"}`,
                    includeStudentName,
                    includeTeacherName,
                    includeLessonNumber,
                    includeDuration,
                    includeLessonDate,
                    preferredLanguage: reportLanguage,
                    durationMinutes: durationMinutes,
                    attendanceStatus: reportAttendance,
                    homeworkStatus: reportHomeworkStatus,
                    classEvents: classEvents.trim(),
                    homeworkNotes: homeworkNotes.trim(),
                    overallEvaluation: overallEvaluation.trim() || undefined,
                    teacherNotes: `${reportLanguage === "en" ? "Class Content & Performance:" : "ما تم في الحصة:"} ${classEvents.trim() || (reportLanguage === "en" ? "Explained lesson concepts and monitored practical exercises." : "تم شرح الدرس ومتابعة التطبيق العملي.")}\n${reportLanguage === "en" ? "Homework:" : "الواجب المطلوب:"} ${homeworkNotes.trim() || (reportHomeworkStatus === "no_homework" ? (reportLanguage === "en" ? "No homework assigned." : "لم يتم تكليف الطالب بواجب.") : (reportLanguage === "en" ? "As regular" : "حسب المعتاد"))}\n${reportLanguage === "en" ? "Homework Status:" : "حالة الواجب:"} ${
                      reportHomeworkStatus === "no_homework"
                        ? (reportLanguage === "en" ? "No homework assigned (Do not mention homework section in report)" : "لم يكن هناك واجب (لا تذكر أي بند أو سطر أو إشارة عن الواجب في التقرير نهائياً ما لم يحدده المعلم)")
                        : reportHomeworkStatus === "done"
                        ? (reportLanguage === "en" ? "Homework fully done and excellent" : "تم حل الواجب كاملاً ومتقن")
                        : reportHomeworkStatus === "not_done"
                        ? (reportLanguage === "en" ? "Homework not done" : "لم يتم حل الواجب")
                        : (reportLanguage === "en" ? "Homework done late / partially" : "حل الواجب بتأخير أو جزئياً")
                    }${overallEvaluation.trim() ? `\n${reportLanguage === "en" ? "Overall Rating:" : "التقييم الإجمالي ومستوى الأداء:"} ${overallEvaluation.trim()}` : ""}`,
                    aiInstructions: effectiveAiInst,
                    generalAiInstructions: generalInst,
                    subjectAiInstructions: subjSpecificInst,
                    attachment: reportAttachment || undefined
                  });
                  if (res) {
                    console.log("[GoStars UI] AI Report received successfully. Updating editor.");
                    setNewGeneratedReportText(res);
                    setGenerationError("");
                  }
                } catch (err: any) {
                  const errorMsg = err?.message || String(err);
                  console.error("[GoStars UI] Failed to generate AI report:", errorMsg);
                  setGenerationError(errorMsg);
                } finally {
                  setIsGeneratingReport(false);
                }
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-600/25 transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingReport ? "animate-spin" : ""}`} />
              <span>
                {isGeneratingReport
                  ? (isArabic ? "جاري صياغة وتحليل التقرير بالذكاء الاصطناعي..." : "Refining & Generating...")
                  : (isArabic ? "✨ صياغة وتحسين التقرير بالذكاء الاصطناعي" : "✨ Format & Refine with AI")}
              </span>
            </button>

            {/* Error Notification if AI fails */}
            {generationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <div className="font-black text-rose-900 mb-0.5">
                    {isArabic ? "تعذر توليد التقرير بالذكاء الاصطناعي:" : "AI Report Generation Failed:"}
                  </div>
                  <div className="text-rose-700 text-xs font-mono break-words">{generationError}</div>
                </div>
              </div>
            )}

            {/* AI Report Editor & Actions */}
            {newGeneratedReportText ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800 text-xs sm:text-sm">
                    {isArabic ? "التقرير المصاغ بالذكاء الاصطناعي (متاح للتعديل الحر):" : "AI Generated Report (Editable):"}
                  </label>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {isArabic ? "جاهز للحفظ والإرسال" : "Ready"}
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={newGeneratedReportText}
                  onChange={e => setNewGeneratedReportText(e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl p-4 text-xs sm:text-sm font-sans leading-relaxed focus:outline-none focus:border-purple-400 shadow-inner"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSavePresentReport(newGeneratedReportText)}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md ${
                      savePresentReportSuccess
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-300 animate-pulse"
                        : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25"
                    }`}
                  >
                    {savePresentReportSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>{isArabic ? "تم حفظ التقرير في ملف الطالب بنجاح! ✓" : "Saved to Student Profile! ✓"}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{isArabic ? "💾 حفظ التقرير بملف الطالب" : "Save Report"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppChooser(newGeneratedReportText)}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "🟢 إرسال عبر WhatsApp" : "Send via WhatsApp"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newGeneratedReportText);
                      setNotificationNotice(isArabic ? "تم نسخ نص التقرير للحافظة!" : "Report text copied!");
                      setTimeout(() => setNotificationNotice(""), 3000);
                    }}
                    className="py-3 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                    title={isArabic ? "نسخ التقرير" : "Copy"}
                  >
                    <Copy className="w-4 h-4" />
                    <span>{isArabic ? "نسخ" : "Copy"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewGeneratedReportText("");
                      setNotificationNotice(isArabic ? "تم مسح مسودة التقرير" : "Draft cleared");
                      setTimeout(() => setNotificationNotice(""), 2500);
                    }}
                    className="py-3 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                    title={isArabic ? "حذف المسودة والبدء من جديد" : "Discard Draft"}
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>{isArabic ? "حذف المسودة" : "Discard"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Direct Save without AI */
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                {(classEvents.trim() || homeworkNotes.trim() || overallEvaluation.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      const manualText = [
                        `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}`,
                        `التاريخ: ${reportDate}`,
                        includeDuration ? `مدة الحصة: ${durationMinutes} دقيقة` : "",
                        classEvents.trim() ? `ما حدث داخل الحصة:\n${classEvents.trim()}` : "",
                        homeworkNotes.trim() ? `الواجب والتكليفات:\n${homeworkNotes.trim()}` : "",
                        overallEvaluation.trim() ? `التقييم الإجمالي:\n${overallEvaluation.trim()}` : ""
                      ].filter(Boolean).join("\n\n");
                      handleOpenWhatsAppChooser(manualText);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "مشاركة عبر الواتساب" : "Share via WhatsApp"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const manualText = [
                      `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}`,
                      `التاريخ: ${reportDate}`,
                      includeDuration ? `مدة الحصة: ${durationMinutes} دقيقة` : "",
                      `حالة الحضور: حاضر (تم الحضور)`,
                      classEvents.trim() ? `ما حدث داخل الحصة:\n${classEvents.trim()}` : "",
                      homeworkNotes.trim() ? `الواجب والتكليفات:\n${homeworkNotes.trim()}` : "",
                      overallEvaluation.trim() ? `التقييم الإجمالي:\n${overallEvaluation.trim()}` : ""
                    ].filter(Boolean).join("\n\n");
                    handleSavePresentReport(manualText);
                  }}
                  className={`py-2.5 px-5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shadow-sm ${
                    savePresentReportSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-pulse"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {savePresentReportSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{isArabic ? "تم حفظ التقرير بملف الطالب بنجاح! ✓" : "Saved to Student Profile! ✓"}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isArabic ? "حفظ التقرير (تسجيل الحضور)" : "Save Report (Record Attendance)"}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: History & Archive of Past Reports for this Student */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Active Cycle Status & Archive Trigger Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50/40 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-purple-900">
                  {isArabic ? "الفترة/الباقة الحالية النشطة:" : "Current Active Cycle:"}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-200/70 text-purple-950 font-black text-xs">
                  {activeCycle.cycleNameAr}
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-md border border-purple-200">
                  {activeReports.length} {isArabic ? "تقارير حديثة" : "recent reports"}
                </span>
              </div>
              <p className="text-[11px] text-purple-700/90 font-medium mt-0.5">
                {isArabic
                  ? "عند انتهاء الشهر أو الباقة، اضغط زر الأرشفة لترحيل كل التقارير السابقة للأرشيف وبدء شهر جديد بنظافة تامة."
                  : "When the cycle ends, archive previous reports into their month folder and start fresh."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowArchiveCycleModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition shrink-0 active:scale-95"
          >
            <FolderArchive className="w-4 h-4 text-amber-300" />
            <span>{isArabic ? "أرشفة الشهر / الباقة المنتهية" : "Archive Ended Month / Package"}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-600" />
              <span>{isArabic ? `سجل وأرشيف تقارير الطالب (${allMergedReports.length})` : `Reports History & Archive (${allMergedReports.length})`}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isArabic
                ? "جميع تقارير وملاحظات الحصص محفوظة بشكل دائم ومصنفة بمجلدات شهرية منظمة."
                : "All reports and lesson logs are permanently saved and categorized into month folders."}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setReportArchiveFilter("active")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "active"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `النشطة الحالية (${activeReports.length})` : `Active (${activeReports.length})`}
            </button>
            <button
              onClick={() => setReportArchiveFilter("archived")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "archived"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `مجلدات الأرشيف (${archivedReports.length})` : `Archive Folders (${archivedReports.length})`}
            </button>
            <button
              onClick={() => setReportArchiveFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "all"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `الكل (${allMergedReports.length})` : `All (${allMergedReports.length})`}
            </button>
          </div>
        </div>

        {/* Search, Subject Filters & Expand/Collapse All (for active/all lists) */}
        {reportArchiveFilter !== "archived" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={archiveSearchQuery}
                onChange={e => setArchiveSearchQuery(e.target.value)}
                placeholder={isArabic ? "البحث في نص وملاحظات التقارير..." : "Search in reports content..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
              />
            </div>

            <div className="sm:w-44">
              <select
                value={archiveSubjectFilter}
                onChange={e => setArchiveSubjectFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:bg-white"
              >
                <option value="all">{isArabic ? "جميع المواد الدراسية" : "All Subjects"}</option>
                {uniqueSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {filteredReportsList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (expandedReportIds.length === filteredReportsList.length) {
                    setExpandedReportIds([]);
                  } else {
                    setExpandedReportIds(filteredReportsList.map(r => r.id));
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0"
                title={expandedReportIds.length === filteredReportsList.length ? (isArabic ? "طي كل التقارير" : "Collapse all") : (isArabic ? "إظهار كل التقارير" : "Expand all")}
              >
                {expandedReportIds.length === filteredReportsList.length ? (
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
            )}
          </div>
        )}

        {/* Content View: Folders for Archive vs Cards for Active */}
        {reportArchiveFilter === "archived" ? (
          <ArchivedReportsFolderList
            groups={archivedMonthGroups}
            isArabic={isArabic}
            onToggleArchiveReport={onToggleArchiveReport}
            onDeleteReport={(id) => {
              const r = reports.find(rep => rep.id === id);
              if (r) setReportToDelete(r);
            }}
            onPrintReport={() => window.print()}
            onCopyReport={(r) => {
              const text = r.generatedText || r.reportText || r.teacherNotes || "";
              if (text && navigator?.clipboard) {
                navigator.clipboard.writeText(text);
                setNotificationNotice(isArabic ? "تم نسخ نص التقرير للحافظة بنجاح!" : "Report text copied!");
                setTimeout(() => setNotificationNotice(""), 3000);
              }
            }}
            onShareWhatsApp={(r) => {
              const text = r.generatedText || r.reportText || r.teacherNotes || "";
              if (text) handleOpenWhatsAppChooser(text);
            }}
            searchActive={Boolean(archiveSearchQuery.trim())}
          />
        ) : filteredReportsList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs space-y-1">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">
              {reportArchiveFilter === "active"
                ? (isArabic ? "لا توجد تقارير جديدة للشهر/الباقة الحالية بعد." : "No new reports for current cycle yet.")
                : (isArabic ? "لا توجد تقارير مطابقة للمعايير المحددة." : "No reports matching criteria.")}
            </p>
            {reportArchiveFilter === "active" && (
              <p className="text-[11px] text-slate-400">
                {isArabic
                  ? "جميع التقارير السابقة محفوظة داخل (مجلدات الأرشيف) تحت مسمى الشهر الذي انتهى."
                  : "All previous reports are archived under their ended month folders."}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReportsList.map(report => {
              const isExpanded = expandedReportIds.includes(report.id);
              const textContent = report.reportText || report.generatedText || report.teacherNotes || "";
              const isAutoArchived = isReportOlderThan6Months(report.date);
              const reportTitle = getReportTitle(report, isArabic);

              return (
                <div
                  key={report.id}
                  className={`bg-white border rounded-2xl transition shadow-2xs overflow-hidden ${
                    isExpanded ? "border-purple-300 ring-1 ring-purple-100" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Card Header: Shows ONLY Title and metadata by default, click to toggle */}
                  <div
                    onClick={() => toggleReportExpand(report.id)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isExpanded ? "bg-purple-50/40 border-b border-purple-100" : "bg-white hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Report Title */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {report.reportType === "monthly_comprehensive" || report.evaluationMonth ? (
                          <span className="font-black text-xs text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                            📊 {isArabic ? "تقرير شهري شامل" : "Monthly Report"}
                          </span>
                        ) : (
                          <span className="font-black text-xs text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg shrink-0">
                            #{report.lessonNumber || 1}
                          </span>
                        )}
                        <h4 className="font-black text-sm text-slate-900 truncate">
                          {reportTitle}
                        </h4>
                      </div>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          📚 {report.subject}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                          📅 {report.date}
                        </span>
                        {(report.durationMinutes || report.lessonDuration) && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            ⏱️ {report.lessonDuration || `${report.durationMinutes} دقيقة`}
                          </span>
                        )}
                        {report.attendance === "absent" ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                            {isArabic ? "🔴 غائب" : "Absent"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            {isArabic ? "🟢 حاضر" : "Present"}
                          </span>
                        )}
                        {report.homeworkStatus && report.homeworkStatus !== "no_homework" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {report.homeworkStatus === "done"
                              ? (isArabic ? "واجب كامل" : "HW Done")
                              : report.homeworkStatus === "not_done"
                              ? (isArabic ? "لم يحل الواجب" : "HW Missing")
                              : (isArabic ? "واجب جزئي" : "HW Partial")}
                          </span>
                        )}
                        {(report.archived || isAutoArchived) && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                            {isArabic ? "📁 مؤرشف" : "Archived"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons & Show Full Report Toggle */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleReportExpand(report.id)}
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

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppChooser(textContent)}
                        title={isArabic ? "إرسال التقرير عبر الواتساب" : "Send via WhatsApp"}
                        className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition border border-emerald-200"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(textContent);
                          setCopiedReportId(report.id);
                          setTimeout(() => setCopiedReportId(null), 2000);
                        }}
                        title={isArabic ? "نسخ التقرير" : "Copy"}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                      >
                        {copiedReportId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {onToggleArchiveReport && (
                        <button
                          type="button"
                          onClick={() => {
                            const wasArchived = !isReportInActiveCycle(report, student, activeCycle);
                            onToggleArchiveReport(report.id);
                            setNotificationNotice(
                              wasArchived
                                ? (isArabic ? "تم استعادة التقرير إلى قائمة التقارير النشطة بنجاح!" : "Report restored to active reports!")
                                : (isArabic ? "تم نقل التقرير إلى مجلدات الأرشيف بنجاح!" : "Report moved to archive folders!")
                            );
                            setTimeout(() => setNotificationNotice(""), 3500);
                          }}
                          title={
                            !isReportInActiveCycle(report, student, activeCycle)
                              ? (isArabic ? "استعادة إلى التقارير النشطة" : "Restore to Active")
                              : (isArabic ? "نقل التقرير إلى الأرشيف" : "Move to Archive")
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition border border-amber-200 flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline">
                            {!isReportInActiveCycle(report, student, activeCycle)
                              ? (isArabic ? "استعادة" : "Restore")
                              : (isArabic ? "أرشفة" : "Archive")}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setReportToDelete(report)}
                        title={isArabic ? "حذف التقرير" : "Delete"}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Content (Full Report displayed on demand) */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 animate-in fade-in space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200 pb-2">
                        <span>{isArabic ? "نص التقرير الكامل:" : "Full Report Content:"}</span>
                        <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                          {isArabic ? "مكتمل وجاهز للمشاركة" : "Complete"}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm font-sans text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {textContent}
                      </div>

                      {/* Expanded View Quick Action Footer */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppChooser(textContent)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{isArabic ? "إرسال عبر WhatsApp" : "Send via WhatsApp"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(textContent);
                              setCopiedReportId(report.id);
                              setTimeout(() => setCopiedReportId(null), 2000);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1.5"
                          >
                            {copiedReportId === report.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isArabic ? "تم النسخ!" : "Copied!"}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{isArabic ? "نسخ التقرير" : "Copy"}</span>
                              </>
                            )}
                          </button>

                          {onToggleArchiveReport && (
                            <button
                              type="button"
                              onClick={() => {
                                const wasArchived = !isReportInActiveCycle(report, student, activeCycle);
                                onToggleArchiveReport(report.id);
                                setNotificationNotice(
                                  wasArchived
                                    ? (isArabic ? "تم استعادة التقرير إلى قائمة التقارير النشطة بنجاح!" : "Report restored to active reports!")
                                    : (isArabic ? "تم نقل التقرير إلى مجلدات الأرشيف بنجاح!" : "Report moved to archive folders!")
                                );
                                setTimeout(() => setNotificationNotice(""), 3500);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {!isReportInActiveCycle(report, student, activeCycle)
                                  ? (isArabic ? "استعادة للتقارير النشطة" : "Restore to Active")
                                  : (isArabic ? "نقل إلى الأرشيف" : "Move to Archive")}
                              </span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setReportToDelete(report)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>{isArabic ? "حذف هذا التقرير" : "Delete Report"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Confirm Delete Report */}
      {reportToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-slate-900 text-base">
                {isArabic ? "تأكيد حذف التقرير والخصم المالي" : "Confirm Report Deletion & Financial Reversal"}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {isArabic
                  ? `هل أنت متأكد من رغبتك في حذف هذا التقرير نهائياً (${reportToDelete.subject || "التقرير"} - ${reportToDelete.date})؟`
                  : `Are you sure you want to permanently delete this report (${reportToDelete.subject || "Report"} - ${reportToDelete.date})?`}
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
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                {isArabic ? "إلغاء التراجع" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReport(reportToDelete.id);
                  setReportToDelete(null);
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

      {/* WhatsApp Multi-App Target Chooser Modal */}
      {showWhatsAppChooserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isArabic ? "إرسال التقرير عبر الواتساب" : "Send Report via WhatsApp"}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isArabic ? `للطالب: ${student.fullName}` : `For: ${student.fullName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                {isArabic ? "📞 الأرقام المسجلة:" : "Registered contacts:"}
              </p>
              <p>• {isArabic ? "هاتف ولي الأمر:" : "Parent:"} <span className="font-mono font-bold text-slate-900 dir-ltr">{student.parentContact || "غير مسجل"}</span></p>
              {student.studentPhone && (
                <p>• {isArabic ? "هاتف الطالب:" : "Student:"} <span className="font-mono font-bold text-slate-900 dir-ltr">{student.studentPhone}</span></p>
              )}
            </div>

            <div className="space-y-2">
              {/* Option 1: Universal / Direct */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("universal")}
                className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-between transition shadow-md shadow-emerald-600/20"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <Share2 className="w-4 h-4" />
                  <div>
                    <p className="font-black">{isArabic ? "فتح واتساب المباشر (تلقائي)" : "Direct WhatsApp (Auto)"}</p>
                    <p className="text-[10px] text-emerald-100 font-normal">{isArabic ? "يفتح التطبيق المثبت على جهازك أو المتصفح" : "Opens installed app or web"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Option 2: WhatsApp Web */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("web")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">W</div>
                  <div>
                    <p className="font-bold">{isArabic ? "واتساب ويب (WhatsApp Web)" : "WhatsApp Web"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "للفتح في تبويب جديد على أجهزة الكمبيوتر" : "For desktop browser tab"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Option 3: WhatsApp Business */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-4 h-4 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-black text-[9px]">B</div>
                  <div>
                    <p className="font-bold">{isArabic ? "واتساب للأعمال (WhatsApp Business)" : "WhatsApp Business"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "إرسال عبر حساب بيزنس أو رابط wa.me" : "Send via Business account"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Option 4: System Share (Mobile / Tablet) */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("intent_android")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-bold">{isArabic ? "مشاركة عبر نافذة النظام (الهواتف والتابلت)" : "System Share Sheet (Mobile)"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "تتيح لك اختيار أي تطبيق واتساب مثبت يدوياً" : "Choose installed app from system popup"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pendingWhatsAppText);
                  setNotificationNotice(isArabic ? "تم نسخ نص التقرير للحافظة بنجاح!" : "Report text copied!");
                  setShowWhatsAppChooserModal(false);
                  setTimeout(() => setNotificationNotice(""), 3000);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isArabic ? "نسخ نص التقرير فقط" : "Copy Text Only"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Ended Month/Package Modal */}
      <ArchiveCycleModal
        isOpen={showArchiveCycleModal}
        onClose={() => setShowArchiveCycleModal(false)}
        student={student}
        allReports={reports}
        allAttendance={attendanceRecords}
        isArabic={isArabic}
        onConfirmArchive={(params) => {
          if (onArchiveEndedCycle) {
            onArchiveEndedCycle({
              studentId: student.id,
              archiveGroupName: params.archiveGroupName,
              newCycleStartDate: params.newCycleStartDate,
              newCycleName: params.newCycleName,
              resetLessonBalance: params.resetLessonBalance
            });
            setReportLessonNumber(1);
            setNotificationNotice(
              isArabic
                ? `تم ترحيل تقارير الفترة المنتهية إلى الأرشيف بنجاح باسم: (${params.archiveGroupName})، وبدء شهر/باقة جديدة!`
                : `Archived successfully under (${params.archiveGroupName}) and started new cycle!`
            );
            setReportArchiveFilter("active");
            setTimeout(() => setNotificationNotice(""), 4000);
          }
        }}
      />
    </div>
  );
};
