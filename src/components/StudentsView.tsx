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
  List
} from "lucide-react";
import {
  Student,
  StudentSubjectPlan,
  AttendanceRecord,
  AttendanceStatus,
  HomeworkStatus,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  StudentStatus,
  PaymentStatus,
  AppSettings,
  ReportAttachment,
  SubscriptionType,
  PaymentPlan
} from "../types";
import { calculateStudentFinancials } from "../lib/financeUtils";

const COMMON_SUBJECT_SUGGESTIONS = [
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "العلوم",
  "الدراسات",
  "الحاسب الآلي",
  "القرآن الكريم",
  "الفرنساوي"
];

export const COMMON_CURRICULUMS = [
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
  attendanceRecords: AttendanceRecord[];
  examRecords: ExamRecord[];
  paymentTransactions: PaymentTransaction[];
  reports: GeneratedReport[];
  onAddStudent: (student: Omit<Student, "id" | "createdAt">) => void;
  onEditStudent?: (studentId: string, student: Partial<Student>) => void;
  onDeleteStudent?: (studentId: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus) => void;
  onRecordPayment: (studentId: string, amount: number, lessonsCount: number, notes?: string) => void;
  onAddExamRecord?: (studentId: string, examName: string, score: number, totalScore: number, date: string) => void;
  onAddReport: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onGenerateReportAi: (payload: {
    studentName: string;
    subject: string;
    teacherNotes: string;
    aiInstructions: string;
    attachment?: ReportAttachment;
  }) => Promise<string>;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  settings,
  students,
  attendanceRecords,
  examRecords,
  paymentTransactions,
  reports,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onUpdateStudentStatus,
  onRecordPayment,
  onAddExamRecord,
  onAddReport,
  onDeleteReport,
  onToggleArchiveReport,
  onGenerateReportAi
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "stopped">("all");
  const [filterCurriculum, setFilterCurriculum] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");

  // Selected Student for Profile View
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<"finance" | "attendance" | "reports">("reports");

  // Report Archive Filter State (+6 months auto-archiving)
  const [reportArchiveFilter, setReportArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState("all");

  // AI Report State inside Student Profile
  const [showCreateReportForm, setShowCreateReportForm] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportLessonNumber, setReportLessonNumber] = useState<number>(1);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reportAttendance, setReportAttendance] = useState<AttendanceStatus>("present");
  const [reportDeductCost, setReportDeductCost] = useState<boolean>(true);
  const [reportHomeworkStatus, setReportHomeworkStatus] = useState<HomeworkStatus>("done");
  const [absentNotes, setAbsentNotes] = useState("");
  const [newTeacherNotes, setNewTeacherNotes] = useState("");
  const [newAiInstructions, setNewAiInstructions] = useState("");
  const [newGeneratedReportText, setNewGeneratedReportText] = useState("");
  const [reportAttachment, setReportAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [whatsappSentNotice, setWhatsappSentNotice] = useState("");
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);

  // WhatsApp Multi-App Target Selection Modal State
  const [showWhatsAppChooserModal, setShowWhatsAppChooserModal] = useState(false);
  const [pendingWhatsAppText, setPendingWhatsAppText] = useState("");
  const [pendingWhatsAppTargetStudent, setPendingWhatsAppTargetStudent] = useState<Student | null>(null);

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

  // Automatically calculate the next lesson number for a student and subject
  const calculateNextLessonNumber = (st: Student | null, subj: string): number => {
    if (!st) return 1;
    const normSubj = (subj || "").trim().toLowerCase();

    // 1. Check existing reports for this student and subject
    const studentReports = reports.filter(
      r => (r.studentId === st.id || r.studentName === st.fullName) &&
           ((r.subject || "").trim().toLowerCase() === normSubj)
    );

    const maxInReports = studentReports.reduce((max, r) => Math.max(max, r.lessonNumber || 0), 0);
    if (maxInReports > 0) {
      return maxInReports + 1;
    }

    // 2. Check attendance records for this student and subject
    const studentAttendance = attendanceRecords.filter(
      ar => ar.studentId === st.id &&
           (!ar.subject || (ar.subject || "").trim().toLowerCase() === normSubj)
    );

    const maxInAtt = studentAttendance.reduce((max, ar) => Math.max(max, ar.lessonNumber || 0), 0);
    if (maxInAtt > 0) {
      return maxInAtt + 1;
    }

    // 3. Fallback: total records count + 1
    const totalCount = Math.max(studentReports.length, studentAttendance.length);
    return totalCount + 1;
  };

  const handleReportSubjectChange = (newSubj: string) => {
    setReportSubject(newSubj);
    if (selectedStudent) {
      setReportLessonNumber(calculateNextLessonNumber(selectedStudent, newSubj));
    }
    const subjInst =
      settings.subjectDefaults?.find(
        s => s.subject.trim().toLowerCase() === newSubj.trim().toLowerCase()
      )?.instruction || settings.generalAiInstructions || "";
    setNewAiInstructions(subjInst);
  };

  const openNewReportModal = () => {
    if (!selectedStudent) return;
    const initialSubj = selectedStudent.subjects?.[0]?.subject || selectedStudent.subject || (isArabic ? "الرياضيات" : "Mathematics");
    setReportSubject(initialSubj);
    setReportDate(new Date().toISOString().split("T")[0]);
    setReportLessonNumber(calculateNextLessonNumber(selectedStudent, initialSubj));
    setReportAttendance("present");
    setReportDeductCost(true);
    setReportHomeworkStatus("done");
    setAbsentNotes("");
    setNewTeacherNotes("");
    setNewGeneratedReportText("");
    setReportAttachment(null);

    const subjInst =
      settings.subjectDefaults?.find(
        s => s.subject.trim().toLowerCase() === initialSubj.trim().toLowerCase()
      )?.instruction || settings.generalAiInstructions || "";
    setNewAiInstructions(subjInst);
    setShowCreateReportForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(isArabic ? "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 10 ميجابايت." : "File too large. Max 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const parts = dataUrl.split(";base64,");
      if (parts.length === 2) {
        const mimeType = parts[0].replace("data:", "");
        const base64Data = parts[1];
        setReportAttachment({
          fileName: file.name,
          mimeType,
          data: base64Data,
          previewUrl: mimeType.startsWith("image/") ? dataUrl : undefined
        });
      }
    };
    reader.readAsDataURL(file);
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
    subscriptionType: "monthly",
    paymentPlan: "beginning_of_month",
    lessonCost: 100,
    totalPurchasedLessons: 8
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

  // Helper functions for Subscription & Payment labels
  const getSubscriptionLabel = (type?: SubscriptionType) => {
    if (type === "monthly") return isArabic ? "📅 بالشهر (شهري)" : "📅 Monthly";
    if (type === "lessons_count") return isArabic ? "🔢 بعدد الحصص" : "🔢 Package";
    return isArabic ? "📅 بالشهر (شهري)" : "📅 Monthly";
  };

  const getPaymentPlanLabel = (plan?: PaymentPlan) => {
    if (plan === "beginning_of_month") return isArabic ? "🟢 أول الشهر (مقدم)" : "🟢 Prepaid";
    if (plan === "end_of_month") return isArabic ? "🟡 آخر الشهر (مؤخر)" : "🟡 Postpaid";
    if (plan === "mixed") return isArabic ? "🔵 دفع مختلط" : "🔵 Hybrid";
    return isArabic ? "🟢 أول الشهر" : "🟢 Prepaid";
  };

  // Add Payment Modal inside Profile
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(800);
  const [paymentLessonsCount, setPaymentLessonsCount] = useState(8);
  const [paymentNotes, setPaymentNotes] = useState("");

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

  const handleOpenEditStudent = (st: Student) => {
    setEditFullName(st.fullName || "");
    setEditStudentNumber(st.studentNumber || "");
    setEditStudentPhone(st.studentPhone || "");
    setEditAcademicYear(st.academicYear || "");
    setEditCurriculum(st.curriculum || "");
    setEditParentContact(st.parentContact || "+20");
    setEditWhatsappGroupLink(st.whatsappGroupLink || "");
    setEditNotes(st.notes || "");

    if (st.subjects && st.subjects.length > 0) {
      setEditStudentSubjects(JSON.parse(JSON.stringify(st.subjects)));
    } else {
      setEditStudentSubjects([
        {
          id: `subj_edit_1`,
          subject: st.subject || "الرياضيات",
          studyType: st.studyType || "private",
          subscriptionType: st.subscriptionType || "monthly",
          paymentPlan: st.paymentPlan || "beginning_of_month",
          lessonCost: st.lessonCost || 100,
          totalPurchasedLessons: st.totalPurchasedLessons || 8
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

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editFullName.trim() || editStudentSubjects.length === 0) return;

    const subjectsSummary = editStudentSubjects.map(s => s.subject.trim()).filter(Boolean).join(" + ") || "عام";
    const primaryStudyType = editStudentSubjects.some(s => s.studyType === "group") ? "group" : "private";
    const primarySub = editStudentSubjects[0];

    const updatedData: Partial<Student> = {
      fullName: editFullName.trim(),
      studentNumber: editStudentNumber.trim() || undefined,
      studentPhone: editStudentPhone.trim() || undefined,
      academicYear: editAcademicYear.trim() || undefined,
      curriculum: editCurriculum.trim() || undefined,
      parentContact: editParentContact.trim(),
      whatsappGroupLink: editWhatsappGroupLink.trim() || undefined,
      studyType: primaryStudyType,
      subject: subjectsSummary,
      subjects: editStudentSubjects,
      subscriptionType: primarySub.subscriptionType,
      paymentPlan: primarySub.paymentPlan,
      lessonCost: primarySub.lessonCost,
      notes: editNotes
    };

    if (onEditStudent) {
      onEditStudent(selectedStudent.id, updatedData);
    }
    setSelectedStudent({ ...selectedStudent, ...updatedData });
    setShowEditStudentModal(false);
  };

  const handleDeleteStudentClick = (st: Student) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من رغبتك في حذف الطالب "${st.fullName}" نهائياً من النظام؟`
      : `Are you sure you want to permanently delete student "${st.fullName}"?`;
    if (window.confirm(confirmMsg)) {
      if (onDeleteStudent) {
        onDeleteStudent(st.id);
      }
      setSelectedStudent(null);
    }
  };

  // Filter Logic
  const filteredStudents = students.filter(s => {
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

    // Compute aggregate initial numbers
    let totalInitialPaid = 0;
    let totalPurchased = 0;
    let totalRemainingLessons = 0;
    let totalRemainingBalance = 0;

    studentSubjects.forEach(s => {
      const cost = Math.max(1, Number(s.lessonCost) || 100);
      const isPackage = s.subscriptionType === "lessons_count";
      const lessons = isPackage ? Math.max(1, Number(s.totalPurchasedLessons) || 8) : 0;
      
      if (isPackage) {
        totalPurchased += lessons;
        totalRemainingLessons += lessons;
        totalRemainingBalance += lessons * cost;
      }

      if (s.paymentPlan === "beginning_of_month") {
        totalInitialPaid += (isPackage ? lessons : 4) * cost;
      }
    });

    const isPaidInitially = studentSubjects.some(s => s.paymentPlan === "beginning_of_month");

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
      subscriptionType: primarySub.subscriptionType,
      paymentPlan: primarySub.paymentPlan,
      status: "active",
      paymentStatus: isPaidInitially ? "paid" : "unpaid",
      totalPaidAmount: totalInitialPaid,
      totalPurchasedLessons: totalPurchased,
      lessonCost: primarySub.lessonCost || 100,
      remainingLessons: totalRemainingLessons,
      remainingBalance: totalRemainingBalance,
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

    const isMonthly = selectedStudent.subscriptionType === "monthly";
    const effectiveLessons = isMonthly ? 0 : Math.max(1, paymentLessonsCount || 1);
    const updatedCost = selectedStudent.lessonCost || (effectiveLessons > 0 ? paymentAmount / effectiveLessons : 100);

    onRecordPayment(selectedStudent.id, paymentAmount, effectiveLessons, paymentNotes);
    setShowPaymentModal(false);
    
    // Update local copy of selectedStudent for UI refresh
    const updatedLessons = isMonthly ? 0 : (selectedStudent.remainingLessons + effectiveLessons);
    setSelectedStudent({
      ...selectedStudent,
      paymentStatus: "paid",
      totalPaidAmount: (selectedStudent.totalPaidAmount || 0) + paymentAmount,
      totalPurchasedLessons: isMonthly ? (selectedStudent.totalPurchasedLessons || 0) : (selectedStudent.totalPurchasedLessons + effectiveLessons),
      lessonCost: updatedCost,
      remainingLessons: updatedLessons,
      remainingBalance: updatedLessons * updatedCost
    });
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
      {filteredStudents.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200/80 rounded-2xl">
          <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs font-bold text-slate-600">
            {isArabic ? "لا يوجد طلاب يطابقون خيارات البحث." : "No students found."}
          </p>
        </div>
      ) : viewLayout === "grid" ? (
        /* Student Cards Grid - High Density Multi-Col Responsive Bento */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5">
          {filteredStudents.map(student => {
            const isStopped = student.status === "stopped";
            const finSummary = calculateStudentFinancials(student, attendanceRecords);

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
                      <span className="text-slate-400">{isArabic ? "الحصص المنفذة:" : "Attended:"}</span>
                      <span className="font-bold text-blue-700">
                        {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lss"} ({finSummary.totalAccruedCost} ج.م)
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
                    onClick={() => openWhatsApp(student.parentContact)}
                    title={isArabic ? "تواصل عبر واتساب" : "WhatsApp"}
                    className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
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
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الحصص المنفذة" : "Attended"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الموقف المالي" : "Financial Status"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 px-3 text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const isStopped = student.status === "stopped";
                  const finSummary = calculateStudentFinancials(student, attendanceRecords);

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
                            onClick={() => openWhatsApp(student.parentContact)}
                            title={isArabic ? "واتساب" : "WhatsApp"}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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
                            placeholder={isArabic ? "اسم المادة (مثال: الرياضيات)" : "Subject"}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 flex-1 min-w-[120px]"
                          />
                          {/* Quick Chips */}
                          <div className="hidden lg:flex items-center gap-1 overflow-hidden">
                            {COMMON_SUBJECT_SUGGESTIONS.slice(0, 4).map(sugg => (
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

                      {/* Row 2: Price + Subscription Mode + Payment Plan in a sleek unified row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-slate-200/60 items-center">
                        {/* 1. Price */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {isArabic ? "سعر الحصة:" : "Cost:"}
                          </span>
                          <input
                            type="number"
                            min="1"
                            required
                            value={sub.lessonCost}
                            onChange={e => handleUpdateSubjectField(idx, { lessonCost: Number(e.target.value) })}
                            className="w-full font-black text-slate-800 text-xs focus:outline-none"
                            placeholder="100"
                          />
                          <span className="text-[9.5px] font-bold text-slate-400 shrink-0">ج.م</span>
                        </div>

                        {/* 2. Subscription Type (Monthly vs Package) */}
                        <div className="flex items-center gap-1">
                          <div className="inline-flex w-full p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleUpdateSubjectField(idx, { subscriptionType: "monthly" })}
                              className={`flex-1 py-1 rounded-md transition text-center ${
                                sub.subscriptionType === "monthly"
                                  ? "bg-blue-600 text-white shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              📅 {isArabic ? "شهري" : "Monthly"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSubjectField(idx, { subscriptionType: "lessons_count" })}
                              className={`flex-1 py-1 rounded-md transition text-center ${
                                sub.subscriptionType === "lessons_count"
                                  ? "bg-blue-600 text-white shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              🔢 {isArabic ? "باقة" : "Pack"}
                            </button>
                          </div>

                          {sub.subscriptionType === "lessons_count" && (
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-blue-200 w-24 shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={sub.totalPurchasedLessons || 8}
                                onChange={e => handleUpdateSubjectField(idx, { totalPurchasedLessons: Number(e.target.value) })}
                                className="w-full font-bold text-blue-700 text-xs focus:outline-none"
                                title={isArabic ? "عدد حصص الباقة" : "Lessons Count"}
                              />
                              <span className="text-[9px] font-bold text-blue-500 shrink-0">حصة</span>
                            </div>
                          )}
                        </div>

                        {/* 3. Payment Timing (Prepaid / Postpaid / Split) */}
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { paymentPlan: "beginning_of_month" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "beginning_of_month"
                                ? "bg-emerald-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع أول الشهر (مقدماً)" : "Prepaid"}
                          >
                            🟢 {isArabic ? "مقدم" : "Prepaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { paymentPlan: "end_of_month" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "end_of_month"
                                ? "bg-amber-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع آخر الشهر (مؤخر)" : "Postpaid"}
                          >
                            🟡 {isArabic ? "مؤخر" : "Postpaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSubjectField(idx, { paymentPlan: "mixed" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "mixed"
                                ? "bg-indigo-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع مختلط (دفعات)" : "Split"}
                          >
                            🔵 {isArabic ? "دفعات" : "Split"}
                          </button>
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
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setProfileTab("reports")}
                className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  profileTab === "reports"
                    ? "border-purple-600 text-purple-700 bg-purple-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{isArabic ? "التقارير السابقة والذكاء الاصطناعي" : "Previous Reports & AI"}</span>
              </button>
              <button
                onClick={() => setProfileTab("finance")}
                className={`px-4 py-2 font-bold text-xs border-b-2 transition ${
                  profileTab === "finance"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                💰 {isArabic ? "الحساب المالي والحصص" : "Financial Balance"}
              </button>
              <button
                onClick={() => setProfileTab("attendance")}
                className={`px-4 py-2 font-bold text-xs border-b-2 transition ${
                  profileTab === "attendance"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                📅 {isArabic ? "سجل الحضور والخصم" : "Attendance History"}
              </button>
            </div>

            {/* Tab 1: Financial Balance & Payments */}
            {profileTab === "finance" && (
              <div className="space-y-4">
                {/* Subscription & Payment Plan Summary Card */}
                {(() => {
                  const finSummary = calculateStudentFinancials(selectedStudent, attendanceRecords);
                  return (
                    <>
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 block">{isArabic ? "نظام الاشتراك والدفع الإجمالي للطالب:" : "Student Overall Subscription & Plan:"}</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs">
                              {getSubscriptionLabel(selectedStudent.subscriptionType)}
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                              {getPaymentPlanLabel(selectedStudent.paymentPlan)}
                            </span>
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

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "متوسط سعر الحصة" : "Avg Lesson Cost"}</p>
                          <p className="text-sm font-black text-slate-800 mt-1">
                            {finSummary.lessonCost} {isArabic ? "ج.م" : "EGP"}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "إجمالي الحصص المنفذة" : "Total Attended"}</p>
                          <p className="text-sm font-black text-blue-700 mt-1">
                            {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lessons"}
                          </p>
                          <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                            ({finSummary.totalAccruedCost} ج.م)
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</p>
                          <p className="text-sm font-black text-emerald-600 mt-1">
                            {finSummary.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">
                            {selectedStudent.subscriptionType === "lessons_count"
                              ? (isArabic ? "الحصص المتبقية" : "Lessons Left")
                              : (finSummary.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due Amount") : (isArabic ? "الرصيد المتبقي" : "Credit Left"))}
                          </p>
                          <p className={`text-sm font-black mt-1 ${finSummary.amountDue > 0 ? "text-rose-600" : "text-indigo-600"}`}>
                            {selectedStudent.subscriptionType === "lessons_count"
                              ? `${finSummary.remainingLessons} ${isArabic ? "حصة" : "lss"}`
                              : (finSummary.amountDue > 0 ? `${finSummary.amountDue} ج.م` : `${finSummary.creditRemaining} ج.م`)}
                          </p>
                          {selectedStudent.subscriptionType === "lessons_count" && (
                            <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                              ({finSummary.remainingBalance} ج.م)
                            </p>
                          )}
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
                                  <div className="flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px]">
                                      {getSubscriptionLabel(subDet.subscriptionType)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px]">
                                      {getPaymentPlanLabel(subDet.paymentPlan)}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-slate-600 text-[10px]">
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "سعر الحصة" : "Cost"}</p>
                                    <p className="font-bold text-slate-800 text-xs mt-0.5">{subDet.lessonCost} ج.م</p>
                                  </div>
                                  <div className="bg-slate-50 p-1.5 rounded-lg">
                                    <p className="text-slate-400 font-medium">{isArabic ? "الحضور" : "Attended"}</p>
                                    <p className="font-bold text-blue-700 text-xs mt-0.5">{subDet.totalAttendedLessons} ح</p>
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
                    onClick={() => setShowPaymentModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تسجيل دفعة مالية" : "Record Payment"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {paymentTransactions
                    .filter(pt => pt.studentId === selectedStudent.id)
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

                {attendanceRecords.filter(ar => ar.studentId === selectedStudent.id).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {isArabic ? "لا توجد سجلات حضور سابقة لهذا الطالب." : "No attendance records found."}
                  </p>
                ) : (
                  attendanceRecords
                    .filter(ar => ar.studentId === selectedStudent.id)
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

            {/* Tab 3: Previous Reports & AI Refinement */}
            {profileTab === "reports" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>{isArabic ? "سجل التقارير وملاحظات الحصص" : "Reports History & Lesson Logs"}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {isArabic
                        ? `التقارير اليومية وسجل الحضور والغياب مع الصياغة بالذكاء الاصطناعي لـ (${selectedStudent.fullName}).`
                        : `Lesson reports, attendance, and AI refinement for (${selectedStudent.fullName}).`}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (showCreateReportForm) {
                        setShowCreateReportForm(false);
                      } else {
                        openNewReportModal();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "كتابة تقرير جديد" : "Write Report"}</span>
                  </button>
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
                    <div className="flex items-center justify-between pb-3 border-b border-purple-200/70">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-purple-950 text-sm">
                            {isArabic ? `إضافة تقرير جديد لـ ${selectedStudent.fullName}` : `Add New Report: ${selectedStudent.fullName}`}
                          </h4>
                          <p className="text-[10px] text-purple-700 font-medium">
                            {isArabic ? "اختر المادة، حدد رقم وتاريخ الحصة، وحالة الحضور" : "Select subject, lesson number & date, and attendance"}
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

                    {/* FIELDS 2 & 3: رقم الحصة + تاريخ الحصة */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* FIELD 2: 2- رقم الحصة */}
                      <div className="space-y-1.5">
                        <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">2</span>
                            <span>{isArabic ? "رقم الحصة *" : "Lesson Number *"}</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                            {isArabic ? "تلقائي وقابل للتعديل" : "Auto-filled & editable"}
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
                            {isArabic ? "تلقائي حسب اليوم (قابل للتعديل)" : "Today (editable)"}
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

                        {/* DEDUCTION OPTION */}
                        <div className="space-y-1.5">
                          <label className="block font-black text-slate-800 text-xs">
                            {isArabic ? "هل يتم حساب الحصة وخصم سعرها؟ *" : "Deduct & Charge Lesson Fee? *"}
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
                                  {isArabic ? "✅ نعم - يتم الخصم واحتساب الحصة" : "Yes - Deduct & Bill"}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${reportDeductCost ? "text-rose-100" : "text-slate-500"}`}>
                                  {isArabic ? "يتم خصم حصة واحدة من رصيد الطالب" : "Deducts 1 lesson from balance"}
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
                                  {isArabic ? "❌ لا - لا يتم الخصم (غياب بعذر)" : "No - Excused (No Fee)"}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${!reportDeductCost ? "text-emerald-100" : "text-slate-500"}`}>
                                  {isArabic ? "لا يخصم من الرصيد ولا تترتب رسوم" : "No balance deducted"}
                                </p>
                              </div>
                              <Check className={`w-4 h-4 ${!reportDeductCost ? "text-white" : "text-transparent"}`} />
                            </button>
                          </div>
                        </div>

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
                              const absentReportText = isArabic
                                ? `📌 تقرير غياب طالب\n• الطالب: ${selectedStudent.fullName}\n• المادة: ${reportSubject}\n• الحصة رقم: #${reportLessonNumber}\n• التاريخ: ${reportDate}\n• حالة الحضور: غائب\n• حساب الحصة: ${reportDeductCost ? "تم احتساب الحصة وخصمها من الرصيد" : "لم يتم الخصم (غياب بعذر)"}${absentNotes ? `\n• سبب/ملاحظات: ${absentNotes}` : ""}`
                                : `📌 Student Absence Report\n• Student: ${selectedStudent.fullName}\n• Subject: ${reportSubject}\n• Lesson #: ${reportLessonNumber}\n• Date: ${reportDate}\n• Attendance: Absent\n• Billed: ${reportDeductCost ? "Yes (Deducted)" : "No (Excused)"}${absentNotes ? `\n• Notes: ${absentNotes}` : ""}`;

                              onAddReport({
                                studentId: selectedStudent.id,
                                studentName: selectedStudent.fullName,
                                subject: reportSubject,
                                lessonNumber: reportLessonNumber,
                                date: reportDate,
                                attendance: "absent",
                                deductCost: reportDeductCost,
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
                          </select>
                        </div>

                        {/* Teacher Notes */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-xs">
                            {isArabic ? "ملاحظات المعلم (ما كتبته عن الطالب بالحصة والواجب):" : "Teacher Notes:"}
                          </label>
                          <textarea
                            rows={3}
                            value={newTeacherNotes}
                            onChange={e => setNewTeacherNotes(e.target.value)}
                            placeholder={
                              isArabic
                                ? "مثال: أتقن شرح الدرس، وأجاب على التمارين بامتياز، الواجب صفحة 35 المسائل من 1 إلى 5..."
                                : "Write lesson notes here..."
                            }
                            className="w-full bg-white border border-purple-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                          />
                        </div>

                        {/* Subject AI Instructions */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1 text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isArabic ? `تعليمات الذكاء الاصطناعي الخاصة بمادة (${reportSubject}):` : "Subject AI Instructions:"}</span>
                          </label>
                          <input
                            type="text"
                            value={newAiInstructions}
                            onChange={e => setNewAiInstructions(e.target.value)}
                            placeholder={isArabic ? "توجيهات صياغة الذكاء الاصطناعي لهذه المادة..." : "AI instructions..."}
                            className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* File Attachment */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700 text-xs flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Paperclip className="w-4 h-4 text-purple-600" />
                              <span>{isArabic ? "إرفاق صورة أو ملف (ورقة عمل / اختبار / صفحة كتاب):" : "Attach Image or File:"}</span>
                            </span>
                            <span className="text-[10px] font-medium text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                              {isArabic ? "اختياري" : "Optional"}
                            </span>
                          </label>

                          {!reportAttachment ? (
                            <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                              <input
                                type="file"
                                accept="image/*,.pdf,.txt,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                                <FileUp className="w-4 h-4 text-purple-600 group-hover:scale-110 transition" />
                                <span>{isArabic ? "اضغط هنا لإرفاق صورة أو مستند لتحليله بالذكاء الاصطناعي" : "Click to attach image or document"}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {isArabic
                                  ? "يدعم الصور (PNG, JPG)، ملفات الـ PDF أو أوراق العمل والملاحظات اليدوية"
                                  : "Supports images, PDFs, worksheets, or handwritten notes"}
                              </p>
                            </label>
                          ) : (
                            <div className="p-3 bg-white border border-purple-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-center gap-3 overflow-hidden">
                                {reportAttachment.previewUrl ? (
                                  <img
                                    src={reportAttachment.previewUrl}
                                    alt="Attachment Preview"
                                    className="w-11 h-11 object-cover rounded-lg border border-purple-100 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 text-xs truncate">{reportAttachment.fileName || "ملف مرفق"}</p>
                                  <p className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 mt-0.5">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span>{isArabic ? "جاهز لتحليل الذكاء الاصطناعي" : "Ready for AI context"}</span>
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
                          )}
                        </div>

                        {/* AI Generation Trigger */}
                        <button
                          type="button"
                          disabled={isGeneratingReport || (!newTeacherNotes.trim() && !reportAttachment)}
                          onClick={async () => {
                            if (!newTeacherNotes.trim() && !reportAttachment) return;
                            setIsGeneratingReport(true);
                            try {
                              const res = await onGenerateReportAi({
                                studentName: selectedStudent.fullName,
                                subject: reportSubject,
                                teacherNotes: `الحصة #${reportLessonNumber} (${reportDate}):\n${newTeacherNotes}\nحالة الواجب: ${reportHomeworkStatus === "done" ? "تم حل الواجب" : reportHomeworkStatus === "not_done" ? "لم يتم حل الواجب" : "متأخر"}`,
                                aiInstructions: newAiInstructions || settings.generalAiInstructions,
                                attachment: reportAttachment || undefined
                              });
                              setNewGeneratedReportText(res);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setIsGeneratingReport(false);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>
                            {isGeneratingReport
                              ? (isArabic ? "جاري صياغة وتحليل التقرير والمرفقات بالذكاء الاصطناعي..." : "Analyzing & Generating...")
                              : (isArabic ? "✨ صياغة وتحليل التقرير بالذكاء الاصطناعي" : "Format & Analyze with AI")}
                          </span>
                        </button>

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
                                  const finalReport = newGeneratedReportText || newTeacherNotes;
                                  if (!finalReport.trim()) return;

                                  onAddReport({
                                    studentId: selectedStudent.id,
                                    studentName: selectedStudent.fullName,
                                    subject: reportSubject,
                                    lessonNumber: reportLessonNumber,
                                    date: reportDate,
                                    attendance: "present",
                                    deductCost: true,
                                    homeworkStatus: reportHomeworkStatus,
                                    teacherNotes: newTeacherNotes,
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
                                  const text = newGeneratedReportText || newTeacherNotes;
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
                            {newTeacherNotes.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\nملاحظات الحصة:\n${newTeacherNotes}`;
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
                              disabled={!newTeacherNotes.trim()}
                              onClick={() => {
                                if (!newTeacherNotes.trim()) return;
                                const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\nملاحظات الحصة:\n${newTeacherNotes}`;

                                onAddReport({
                                  studentId: selectedStudent.id,
                                  studentName: selectedStudent.fullName,
                                  subject: reportSubject,
                                  lessonNumber: reportLessonNumber,
                                  date: reportDate,
                                  attendance: "present",
                                  deductCost: true,
                                  homeworkStatus: reportHomeworkStatus,
                                  teacherNotes: newTeacherNotes,
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

                  const studentReports = reports.filter(
                    r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName
                  );

                  // Also gather attendance records with reports
                  const studentAttendanceReports = attendanceRecords
                    .filter(ar => ar.studentId === selectedStudent.id && (ar.generatedReportText || ar.teacherNotes))
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
                      archived: undefined as boolean | undefined,
                      createdAt: ar.date
                    }));

                  // Merge and deduplicate
                  const allPastReports = [...studentReports];
                  studentAttendanceReports.forEach(arRep => {
                    if (!allPastReports.some(r => r.id === arRep.id || (r.date === arRep.date && r.reportText === arRep.reportText))) {
                      allPastReports.push(arRep);
                    }
                  });

                  // Classify reports as Active or Archived
                  const classifiedReports = allPastReports.map(rep => {
                    const isOld = isReportOlderThan6Months(rep.date || rep.createdAt);
                    const isArchived = rep.archived === true || (rep.archived !== false && isOld);
                    const archiveReason: "auto_6_months" | "manual" | null = isArchived
                      ? isOld
                        ? "auto_6_months"
                        : "manual"
                      : null;

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
                              {/* Tab 1: Active Reports (< 6 months) */}
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
                                <span>{isArabic ? "التقارير النشطة" : "Active"}</span>
                                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                  reportArchiveFilter === "active"
                                    ? "bg-purple-800 text-purple-100"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {activeCount}
                                </span>
                              </button>

                              {/* Tab 2: Archived Reports (> 6 months) */}
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
                                <span>{isArabic ? "أرشيف التقارير (+6 أشهر)" : "Archive (+6m)"}</span>
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

                            {/* Auto-archive optimization badge */}
                            <span className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1 px-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{isArabic ? "الأرشفة التلقائية بعد 6 أشهر مفعلة ⚡" : "Auto-archive (>6m) active ⚡"}</span>
                            </span>
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

                      {/* Active Reports List or Archive List */}
                      {totalCount === 0 ? (
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
                            {reportArchiveFilter === "archived"
                              ? isArabic ? "لا توجد تقارير مؤرشفة تطابق معايير البحث." : "No archived reports match your search."
                              : isArabic ? "لا توجد تقارير نشطة حالياً (جميع التقارير أقدم من 6 أشهر وموجودة في الأرشيف)." : "No active reports currently (all older reports are in Archive)."}
                          </p>
                          {reportArchiveFilter === "active" && archivedCount > 0 && (
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
                          {filteredDisplayReports.map((rep, idx) => {
                            const finalReportContent = rep.generatedText || rep.reportText || rep.teacherNotes;
                            const isExpanded = expandedReportIds.includes(rep.id);
                            const lessonNum = rep.lessonNumber || (totalCount - idx);
                            const isAbsent = rep.attendance === "absent";

                            return (
                              <div
                                key={rep.id}
                                className={`rounded-2xl border overflow-hidden bg-white shadow-2xs transition ${
                                  rep.isArchived
                                    ? "border-slate-200/90 bg-slate-50/50 opacity-95"
                                    : isAbsent
                                    ? "border-rose-200/80"
                                    : "border-slate-200"
                                }`}
                              >
                                {/* Header - Click to toggle expansion */}
                                <div
                                  onClick={() => toggleReportExpand(rep.id)}
                                  className={`p-3.5 cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                                    rep.isArchived ? "bg-slate-50/70 hover:bg-slate-100/70" : "bg-white hover:bg-slate-50/80"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2.5 py-1 rounded-xl text-white font-black text-xs shrink-0 shadow-2xs ${
                                      rep.isArchived
                                        ? "bg-slate-700"
                                        : isAbsent
                                        ? "bg-rose-600"
                                        : "bg-purple-600"
                                    }`}>
                                      {isArabic ? `الحصة #${lessonNum}` : `Lesson #${lessonNum}`}
                                    </span>

                                    <span className="font-bold text-slate-800 text-xs">{rep.date}</span>

                                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-bold">
                                      {rep.subject || selectedStudent.subject}
                                    </span>

                                    {/* Attendance Status Badge */}
                                    {isAbsent ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                        <span>🔴 {isArabic ? "غائب" : "Absent"}</span>
                                        <span>({rep.deductCost ? (isArabic ? "تم الخصم" : "Deducted") : (isArabic ? "بدون خصم" : "Excused")})</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                        <span>🟢 {isArabic ? "حاضر" : "Present"}</span>
                                      </span>
                                    )}

                                    {/* Archive Badge */}
                                    {rep.isArchived && (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1">
                                        <Archive className="w-3 h-3 text-slate-500" />
                                        <span>
                                          {rep.archiveReason === "auto_6_months"
                                            ? isArabic ? "مؤرشف تلقائياً (+6 أشهر)" : "Auto-Archived (+6m)"
                                            : isArabic ? "مؤرشف" : "Archived"}
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-bold text-purple-600 hidden sm:inline">
                                      {isExpanded ? (isArabic ? "إخفاء التفاصيل" : "Collapse") : (isArabic ? "عرض التقرير" : "Expand")}
                                    </span>
                                    <div className="p-1 rounded-lg bg-slate-100 text-slate-600 transition">
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                  </div>
                                </div>

                                {/* Collapsible Content */}
                                {isExpanded && (
                                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3 text-xs animate-in fade-in">
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
                                        {onToggleArchiveReport && rep.id.startsWith("rep_") && (
                                          <button
                                            type="button"
                                            onClick={() => onToggleArchiveReport(rep.id)}
                                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 shadow-2xs border ${
                                              rep.isArchived
                                                ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                                            }`}
                                          >
                                            {rep.isArchived ? (
                                              <>
                                                <ArchiveRestore className="w-3.5 h-3.5 text-purple-600" />
                                                <span>{isArabic ? "استعادة للنشط" : "Restore"}</span>
                                              </>
                                            ) : (
                                              <>
                                                <Archive className="w-3.5 h-3.5 text-slate-500" />
                                                <span>{isArabic ? "أرشفة التقرير" : "Archive"}</span>
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>

                                      {/* Delete Report Button */}
                                      {rep.id.startsWith("rep_") && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteReport(rep.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                          title={isArabic ? "حذف التقرير" : "Delete"}
                                        >
                                          <Trash2 className="w-4 h-4" />
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
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {selectedStudent.subscriptionType === "monthly"
                  ? (isArabic ? "📅 اشتراك شهري" : "Monthly")
                  : (isArabic ? "🔢 باقة حصص" : "Package")}
              </span>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <span className="font-bold text-slate-600">{isArabic ? "سعر الحصة المسجل:" : "Lesson Cost:"}</span>
                <span className="font-black text-blue-800 text-sm">{selectedStudent.lessonCost || 100} {isArabic ? "ج.م" : "EGP"}</span>
              </div>

              {selectedStudent.subscriptionType === "lessons_count" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "عدد الحصص التي يغطيها المبلغ" : "Number of Covered Lessons"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentLessonsCount}
                    onChange={e => {
                      const count = Number(e.target.value);
                      setPaymentLessonsCount(count);
                      setPaymentAmount(count * (selectedStudent.lessonCost || 100));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "المبلغ المدفوع (بالجنيه)" : "Amount Paid (EGP)"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-base text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {selectedStudent.subscriptionType === "lessons_count" && paymentAmount > 0 && paymentLessonsCount > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  {isArabic ? "قيمة الحصة المحسوبة:" : "Lesson Cost:"}{" "}
                  <span className="font-black text-blue-700">
                    {Math.round(paymentAmount / paymentLessonsCount)} {isArabic ? "ج.م/حصة" : "EGP/lesson"}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات الدفع (اختياري)" : "Payment Notes (Optional)"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={isArabic ? "سداد رسوم الشهر الحالي، كاش، تحويل بنكي..." : "Payment notes..."}
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
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
                    required
                    value={score}
                    onChange={e => setScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "الدرجة الكلية" : "Total Score"}
                  </label>
                  <input
                    type="number"
                    required
                    value={totalScore}
                    onChange={e => setTotalScore(Number(e.target.value))}
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
                      {isArabic ? "رقم ولي الأمر (واتساب) *" : "Parent Phone (WhatsApp) *"}
                    </label>
                    <input
                      type="tel"
                      required
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
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 flex-1 min-w-[120px]"
                          />
                          {/* Quick Chips */}
                          <div className="hidden lg:flex items-center gap-1 overflow-hidden">
                            {COMMON_SUBJECT_SUGGESTIONS.slice(0, 4).map(sugg => (
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

                      {/* Row 2: Price + Subscription Mode + Payment Plan in a sleek unified row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-slate-200/60 items-center">
                        {/* 1. Price */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {isArabic ? "سعر الحصة:" : "Cost:"}
                          </span>
                          <input
                            type="number"
                            min="1"
                            required
                            value={sub.lessonCost}
                            onChange={e => handleUpdateEditSubjectField(idx, { lessonCost: Number(e.target.value) })}
                            className="w-full font-black text-slate-800 text-xs focus:outline-none"
                          />
                          <span className="text-[9.5px] font-bold text-slate-400 shrink-0">ج.م</span>
                        </div>

                        {/* 2. Subscription Type (Monthly vs Package) */}
                        <div className="flex items-center gap-1">
                          <div className="inline-flex w-full p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleUpdateEditSubjectField(idx, { subscriptionType: "monthly" })}
                              className={`flex-1 py-1 rounded-md transition text-center ${
                                sub.subscriptionType === "monthly"
                                  ? "bg-blue-600 text-white shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              📅 {isArabic ? "شهري" : "Monthly"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateEditSubjectField(idx, { subscriptionType: "lessons_count" })}
                              className={`flex-1 py-1 rounded-md transition text-center ${
                                sub.subscriptionType === "lessons_count"
                                  ? "bg-blue-600 text-white shadow-2xs font-black"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              🔢 {isArabic ? "باقة" : "Pack"}
                            </button>
                          </div>

                          {sub.subscriptionType === "lessons_count" && (
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-blue-200 w-24 shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={sub.totalPurchasedLessons || 8}
                                onChange={e => handleUpdateEditSubjectField(idx, { totalPurchasedLessons: Number(e.target.value) })}
                                className="w-full font-bold text-blue-700 text-xs focus:outline-none"
                                title={isArabic ? "عدد حصص الباقة" : "Lessons Count"}
                              />
                              <span className="text-[9px] font-bold text-blue-500 shrink-0">حصة</span>
                            </div>
                          )}
                        </div>

                        {/* 3. Payment Timing (Prepaid / Postpaid / Split) */}
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { paymentPlan: "beginning_of_month" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "beginning_of_month"
                                ? "bg-emerald-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع أول الشهر (مقدماً)" : "Prepaid"}
                          >
                            🟢 {isArabic ? "مقدم" : "Prepaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { paymentPlan: "end_of_month" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "end_of_month"
                                ? "bg-amber-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع آخر الشهر (مؤخر)" : "Postpaid"}
                          >
                            🟡 {isArabic ? "مؤخر" : "Postpaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateEditSubjectField(idx, { paymentPlan: "mixed" })}
                            className={`flex-1 py-1 rounded-md transition text-center ${
                              sub.paymentPlan === "mixed"
                                ? "bg-indigo-600 text-white shadow-2xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={isArabic ? "دفع مختلط (دفعات)" : "Split"}
                          >
                            🔵 {isArabic ? "دفعات" : "Split"}
                          </button>
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

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ التعديلات والمواد" : "Save Changes & Subjects"}
                </button>
              </div>
            </form>
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
    </div>
  );
};
