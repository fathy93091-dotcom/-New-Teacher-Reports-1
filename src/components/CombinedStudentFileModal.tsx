import React, { useState } from "react";
import {
  X,
  Layers,
  Users,
  DollarSign,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  MessageSquare,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Share2,
  Clock,
  PlusCircle,
  FileText,
  UserCheck,
  UserX,
  ExternalLink,
  Search,
  Filter,
  Link,
  Globe,
  Smartphone,
  Send,
  FolderTree,
  GitFork,
  Tag,
  UserPlus
} from "lucide-react";
import {
  CombinedStudentGroup,
  SubCombinedGroup,
  Student,
  StudentSubjectPlan,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings,
  ReportAttachment,
  StudentStatus,
  AttendanceStatus,
  HomeworkStatus
} from "../types";
import { calculateStudentFinancials, StudentFinancialSummary } from "../lib/financeUtils";
import { StudentPersonalReportView } from "./StudentPersonalReportView";

const COMMON_CURRICULUMS = [
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

const COMMON_GRADES = [
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

interface CombinedStudentFileModalProps {
  group: CombinedStudentGroup;
  allStudents?: Student[];
  students?: Student[];
  attendanceRecords?: AttendanceRecord[];
  examRecords?: ExamRecord[];
  paymentTransactions?: PaymentTransaction[];
  reports?: GeneratedReport[];
  settings: AppSettings;
  availableUnbundledStudents?: Student[];
  isArabic?: boolean;
  onClose: () => void;
  onUpdateGroup?: (id: string, partial: Partial<CombinedStudentGroup>) => void;
  onDeleteGroup?: (id: string) => void;
  onAddStudentToGroup?: (groupId: string, studentId: string) => void;
  onRemoveStudentFromGroup?: (groupId: string, studentId: string) => void;
  onRecordPayment?: (studentId: string, amount: number, notes?: string, date?: string) => void;
  onEditStudent?: (studentId: string, updated: Partial<Student>) => void;
  onDeleteStudent?: (studentId: string) => void;
  onUpdateStudentStatus?: (studentId: string, status: StudentStatus) => void;
  onAddExamRecord?: (studentId: string, examName: string, score: number, totalScore: number, date: string) => void;
  onAddReport?: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport?: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onGenerateReportAi?: (payload: {
    studentName: string;
    subject: string;
    teacherNotes: string;
    aiInstructions?: string;
    generalAiInstructions?: string;
    subjectAiInstructions?: string;
    attachment?: ReportAttachment;
  }) => Promise<string>;
  onOpenEditStudentModal?: (student: Student) => void;
}

export const CombinedStudentFileModal: React.FC<CombinedStudentFileModalProps> = ({
  group,
  allStudents = [],
  students = [],
  attendanceRecords = [],
  examRecords = [],
  paymentTransactions = [],
  reports = [],
  settings,
  availableUnbundledStudents,
  isArabic: isArabicProp,
  onClose,
  onUpdateGroup = (_id: string, _partial: Partial<CombinedStudentGroup>) => {},
  onDeleteGroup = (_id: string) => {},
  onAddStudentToGroup = (_groupId: string, _studentId: string) => {},
  onRemoveStudentFromGroup = (_groupId: string, _studentId: string) => {},
  onRecordPayment = (_studentId: string, _amount: number, _notes?: string, _date?: string) => {},
  onEditStudent,
  onDeleteStudent,
  onUpdateStudentStatus = (_studentId: string, _status: StudentStatus) => {},
  onAddExamRecord,
  onAddReport = (_report: Omit<GeneratedReport, "id" | "createdAt">) => {},
  onDeleteReport = (_reportId: string) => {},
  onToggleArchiveReport = (_reportId: string) => {},
  onGenerateReportAi,
  onOpenEditStudentModal
}) => {
  const isArabic = isArabicProp !== undefined ? isArabicProp : (settings?.preferredLanguage !== "en");
  const isArabicLang = isArabic;
  const studentList = Array.isArray(allStudents) && allStudents.length > 0 ? allStudents : (Array.isArray(students) ? students : []);
  const targetGroupStudentIds = Array.isArray(group?.studentIds) ? group.studentIds : [];
  const groupStudents = studentList.filter(s => s && targetGroupStudentIds.includes(s.id));
  const unbundledStudents = Array.isArray(availableUnbundledStudents)
    ? availableUnbundledStudents
    : studentList.filter(s => s && !targetGroupStudentIds.includes(s.id));

  // Navigation Tabs inside Combined File: "overview" | "student_profile" | "sub_groups" | "manage"
  const [activeTab, setActiveTab] = useState<"overview" | "student_profile" | "sub_groups" | "manage">("overview");

  // Sub-groups (دمج داخل الدمج) state
  const subGroupsList: SubCombinedGroup[] = Array.isArray(group?.subGroups) ? group.subGroups : [];
  const [showCreateSubGroupModal, setShowCreateSubGroupModal] = useState(false);
  const [editingSubGroupId, setEditingSubGroupId] = useState<string | null>(null);
  const [subGroupNameVal, setSubGroupNameVal] = useState("");
  const [subGroupStudentIdsVal, setSubGroupStudentIdsVal] = useState<string[]>([]);
  const [subGroupNotesVal, setSubGroupNotesVal] = useState("");
  const [subGroupContactVal, setSubGroupContactVal] = useState("");
  const [subGroupLinkVal, setSubGroupLinkVal] = useState("");

  // Sub-group specific payment modal
  const [activeSubGroupForPayment, setActiveSubGroupForPayment] = useState<SubCombinedGroup | null>(null);
  const [subGroupPayAmount, setSubGroupPayAmount] = useState<number>(0);
  const [subGroupPayTarget, setSubGroupPayTarget] = useState<"auto_due" | "equal_split" | string>("auto_due");
  const [subGroupPayNotes, setSubGroupPayNotes] = useState("");
  const [subGroupPayDate, setSubGroupPayDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter in Student Profiles tab by sub-group
  const [profileSubGroupFilter, setProfileSubGroupFilter] = useState<string>("all");

  // Active student selected for internal Profile tab
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return groupStudents[0]?.id || "";
  });

  const activeStudent = groupStudents.find(s => s.id === selectedStudentId) || groupStudents[0];

  // Sub-tabs for the internal student profile
  const [studentProfileSubTab, setStudentProfileSubTab] = useState<"reports" | "finance" | "attendance">("reports");

  // Selected student for full-screen personal report
  const [studentForPersonalReport, setStudentForPersonalReport] = useState<Student | null>(null);

  // Group payment form state
  const [showGroupPaymentForm, setShowGroupPaymentForm] = useState(false);
  const [groupPaymentAmount, setGroupPaymentAmount] = useState<number>(0);
  const [groupPaymentTarget, setGroupPaymentTarget] = useState<"auto_due" | "equal_split" | string>("auto_due");
  const [groupPaymentNotes, setGroupPaymentNotes] = useState("");
  const [groupPaymentDate, setGroupPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");

  // Edit Group Name inline state
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameVal, setEditGroupNameVal] = useState(group.name);
  const [editGroupContactVal, setEditGroupContactVal] = useState(group.sharedParentContact || "");
  const [editGroupLinkVal, setEditGroupLinkVal] = useState(group.sharedGroupLink || "");

  // WhatsApp Statement modal/copy state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [copiedStatement, setCopiedStatement] = useState(false);
  const [copiedGroupLink, setCopiedGroupLink] = useState(false);

  // WhatsApp Multi-App Mode Chooser Modal State
  const [showWhatsAppChooserModal, setShowWhatsAppChooserModal] = useState(false);
  const [pendingWhatsAppText, setPendingWhatsAppText] = useState("");
  const [pendingWhatsAppTitle, setPendingWhatsAppTitle] = useState("");
  const [whatsappSentNotice, setWhatsappSentNotice] = useState("");

  // Add more students search
  const [addStudentSearch, setAddStudentSearch] = useState("");

  // Individual student payment state inside internal profile
  const [singlePayAmount, setSinglePayAmount] = useState<number>(0);
  const [singlePayNotes, setSinglePayNotes] = useState("");
  const [singlePayDate, setSinglePayDate] = useState(new Date().toISOString().split("T")[0]);

  // AI report state inside internal profile
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
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [reportArchiveFilter, setReportArchiveFilter] = useState<"active" | "archived" | "all">("active");

  // Dedicated In-Modal Student Editor State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("");
  const [editCurriculum, setEditCurriculum] = useState("");
  const [editParentContact, setEditParentContact] = useState("+20");
  const [editWhatsappGroupLink, setEditWhatsappGroupLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStudentSubjects, setEditStudentSubjects] = useState<StudentSubjectPlan[]>([]);
  const [editStudentStatus, setEditStudentStatus] = useState<StudentStatus>("active");

  const handleOpenEditStudentDirectly = (st: Student) => {
    setEditingStudent(st);
    setEditFullName(st.fullName || "");
    setEditStudentNumber(st.studentNumber || "");
    setEditStudentPhone(st.studentPhone || "");
    setEditAcademicYear(st.academicYear || "");
    setEditCurriculum(st.curriculum || "");
    setEditParentContact(st.parentContact || "+20");
    setEditWhatsappGroupLink(st.whatsappGroupLink || "");
    setEditNotes(st.notes || "");
    setEditStudentStatus(st.status || "active");

    if (st.subjects && st.subjects.length > 0) {
      setEditStudentSubjects(
        st.subjects.map(s => ({
          ...s,
          rateType: s.rateType || "per_lesson",
          hourlyCost: s.hourlyCost || s.lessonCost || 100,
          defaultDurationMinutes: s.defaultDurationMinutes || 60
        }))
      );
    } else {
      setEditStudentSubjects([
        {
          id: `subj_edit_1`,
          subject: st.subject || "الرياضيات",
          studyType: st.studyType || "private",
          billingType: st.billingType || "monthly",
          rateType: st.rateType || "per_lesson",
          lessonCost: st.lessonCost || 100,
          hourlyCost: st.hourlyCost || st.lessonCost || 100,
          defaultDurationMinutes: st.defaultDurationMinutes || 60,
          monthlyCost: st.monthlyCost || 400,
          lessonsPerMonth: st.lessonsPerMonth || 8
        }
      ]);
    }
  };

  const handleAddEditSubjectField = () => {
    const nextIdx = editStudentSubjects.length + 1;
    const available =
      COMMON_SUBJECT_SUGGESTIONS.find(
        s => !editStudentSubjects.some(sub => sub.subject === s)
      ) || (isArabic ? `مادة ${nextIdx}` : `Subject ${nextIdx}`);
    setEditStudentSubjects(prev => [
      ...prev,
      {
        id: `subj_edit_${Date.now()}_${nextIdx}`,
        subject: available,
        studyType: "private",
        billingType: "monthly",
        rateType: "per_lesson",
        lessonCost: 100,
        hourlyCost: 100,
        defaultDurationMinutes: 60,
        monthlyCost: 400,
        lessonsPerMonth: 8
      }
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

  const handleSaveEditStudentDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editFullName.trim() || editStudentSubjects.length === 0) return;

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
      billingType: primarySub.billingType || "monthly",
      rateType: primarySub.rateType || "per_lesson",
      lessonCost: primarySub.lessonCost || 100,
      hourlyCost: primarySub.hourlyCost || primarySub.lessonCost || 100,
      defaultDurationMinutes: primarySub.defaultDurationMinutes || 60,
      monthlyCost: primarySub.monthlyCost || 400,
      lessonsPerMonth: primarySub.lessonsPerMonth || 8,
      notes: editNotes,
      status: editStudentStatus
    };

    if (onEditStudent) {
      onEditStudent(editingStudent.id, updatedData);
    }
    if (onUpdateStudentStatus && editStudentStatus !== editingStudent.status) {
      onUpdateStudentStatus(editingStudent.id, editStudentStatus);
    }

    setEditingStudent(null);
    setPaymentSuccessMsg(isArabic ? `تم حفظ وتحديث بيانات الطالب (${editFullName}) بنجاح!` : "Student updated successfully!");
    setTimeout(() => setPaymentSuccessMsg(""), 4000);
  };

  // Calculate Combined Financials across all students in group
  const studentsFinancials: { student: Student; summary: StudentFinancialSummary }[] = groupStudents.map(st => ({
    student: st,
    summary: calculateStudentFinancials(st, attendanceRecords)
  }));

  const totalAttendedLessonsAll = studentsFinancials.reduce((sum, item) => sum + item.summary.totalAttendedLessons, 0);
  const totalAccruedCostAll = studentsFinancials.reduce((sum, item) => sum + item.summary.totalAccruedCost, 0);
  const totalPaidAmountAll = studentsFinancials.reduce((sum, item) => sum + item.summary.totalPaidAmount, 0);
  const totalNetBalanceAll = totalPaidAmountAll - totalAccruedCostAll;
  const totalAmountDueAll = totalNetBalanceAll < 0 ? Math.abs(totalNetBalanceAll) : 0;
  const totalCreditRemainingAll = totalNetBalanceAll > 0 ? totalNetBalanceAll : 0;

  // Group Payments History
  const groupPaymentTransactions = (Array.isArray(paymentTransactions) ? paymentTransactions : []).filter(
    p => p && targetGroupStudentIds.includes(p.studentId)
  );

  // Shared Parent Phone
  const effectiveParentContact =
    group?.sharedParentContact ||
    groupStudents.find(s => s?.parentContact)?.parentContact ||
    "";

  // Helper for WhatsApp Phone Formatting
  const formatWhatsAppPhone = (phone?: string): string => {
    if (!phone) return "";
    let digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 11 && digits.startsWith("01")) {
      digits = "20" + digits.substring(1);
    }
    return digits;
  };

  // Handle Save Edited Group Details
  const handleSaveGroupDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupNameVal.trim()) return;
    onUpdateGroup(group.id, {
      name: editGroupNameVal.trim(),
      sharedParentContact: editGroupContactVal.trim() || undefined,
      sharedGroupLink: editGroupLinkVal.trim() || undefined
    });
    setIsEditingGroupName(false);
  };

  // Quick Copy Group Link
  const handleCopyGroupLink = () => {
    if (!group.sharedGroupLink) return;
    try {
      navigator.clipboard.writeText(group.sharedGroupLink);
      setCopiedGroupLink(true);
      setTimeout(() => setCopiedGroupLink(false), 2500);
    } catch (e) {}
  };

  // Handle Group Payment Submission
  const handleRecordGroupPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(groupPaymentAmount);
    if (!amount || amount <= 0) return;

    if (groupPaymentTarget === "auto_due") {
      // Allocate to students who have amountDue first, then remaining split
      let remaining = amount;
      const sortedByDue = [...studentsFinancials].sort((a, b) => b.summary.amountDue - a.summary.amountDue);

      for (const item of sortedByDue) {
        if (remaining <= 0) break;
        if (item.summary.amountDue > 0) {
          const allocate = Math.min(remaining, item.summary.amountDue);
          onRecordPayment(
            item.student.id,
            allocate,
            groupPaymentNotes ? `${groupPaymentNotes} (سداد مجمع)` : "سداد من دفعة الملف المجمع",
            groupPaymentDate
          );
          remaining -= allocate;
        }
      }

      // If still remaining after covering all due balances, allocate to first student or split
      if (remaining > 0 && groupStudents.length > 0) {
        const firstStudent = groupStudents[0];
        onRecordPayment(
          firstStudent.id,
          remaining,
          groupPaymentNotes ? `${groupPaymentNotes} (فائض دفعة مجمعة)` : "رصيد فائض من دفعة الملف المجمع",
          groupPaymentDate
        );
      }
    } else if (groupPaymentTarget === "equal_split") {
      // Split equally across all students
      const perStudent = Math.round((amount / Math.max(1, groupStudents.length)) * 100) / 100;
      groupStudents.forEach(st => {
        onRecordPayment(
          st.id,
          perStudent,
          groupPaymentNotes ? `${groupPaymentNotes} (تقسيم مجمع)` : "دفعة مقسمة من الملف المجمع",
          groupPaymentDate
        );
      });
    } else {
      // Specific student selected
      const targetStudent = groupStudents.find(s => s.id === groupPaymentTarget);
      if (targetStudent) {
        onRecordPayment(
          targetStudent.id,
          amount,
          groupPaymentNotes || `دفعة خاصة عبر الملف المجمع (${group.name})`,
          groupPaymentDate
        );
      }
    }

    setGroupPaymentAmount(0);
    setGroupPaymentNotes("");
    setShowGroupPaymentForm(false);
    setPaymentSuccessMsg(isArabic ? "تم تسجيل وتوزيع الدفعة المالية بنجاح!" : "Payment recorded successfully!");
    setTimeout(() => setPaymentSuccessMsg(""), 4500);
  };

  // Generate Comprehensive WhatsApp Statement text
  const generateStatementText = () => {
    const teacherName = settings.teacherName ? `الأستاذ / ${settings.teacherName}` : "المعلم";
    const dateStr = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

    let lines: string[] = [];
    lines.push(`📊 *كشف حساب مالي ومتابعة شاملة*`);
    lines.push(`📁 *الملف المجمع:* ${group.name}`);
    lines.push(`👨‍🏫 *المعلم:* ${teacherName}`);
    lines.push(`📅 *التاريخ:* ${dateStr}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👥 *بيانات الطلاب في الملف (${groupStudents.length} طلاب):*`);

    studentsFinancials.forEach((item, idx) => {
      const st = item.student;
      const fin = item.summary;
      lines.push(`\n${idx + 1}. *${st.fullName}* ${st.academicYear ? `(${st.academicYear})` : ""}`);
      if (st.subjects && st.subjects.length > 0) {
        lines.push(`   📚 المواد: ${st.subjects.map(s => s.subject).join("، ")}`);
      } else if (st.subject) {
        lines.push(`   📚 المادة: ${st.subject}`);
      }
      lines.push(`   🎯 الحصص المنفذة: ${fin.totalAttendedLessons} حصة`);
      lines.push(`   💵 إجمالي المسدد: ${fin.totalPaidAmount} ج.م`);
      if (fin.amountDue > 0) {
        lines.push(`   ⚠️ المستحق المطلوب سداده: ${fin.amountDue} ج.م`);
      } else if (fin.creditRemaining > 0) {
        lines.push(`   ✅ الرصيد الدائن المتبقي: +${fin.creditRemaining} ج.م`);
      } else {
        lines.push(`   ✅ الحساب مسدد بالكامل`);
      }
    });

    lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📈 *الملخص الإجمالي للملف المجمع:*`);
    lines.push(`• إجمالي عدد الطلاب: ${groupStudents.length} طلاب`);
    lines.push(`• إجمالي الحصص المنفذة للجميع: ${totalAttendedLessonsAll} حصة`);
    lines.push(`• إجمالي المبالغ المسددة: ${totalPaidAmountAll} ج.م`);
    if (totalAmountDueAll > 0) {
      lines.push(`• 🔴 *إجمالي المستحق المطلوب سداده:* ${totalAmountDueAll} ج.م`);
    } else if (totalCreditRemainingAll > 0) {
      lines.push(`• 🟢 *إجمالي الرصيد الدائن المتبقي:* +${totalCreditRemainingAll} ج.م`);
    } else {
      lines.push(`• 🟢 *الحساب مسدد بالكامل ومضبوط.*`);
    }
    if (group.sharedGroupLink) {
      lines.push(`• 🔗 *رابط الجروب المشترك:* ${group.sharedGroupLink}`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✨ نسعد دائماً بمتابعة وتفوق أبنائنا الكرام.`);

    return lines.join("\n");
  };

  // Generate WhatsApp Statement for a specific Sub-Group (دمج فرعي)
  const generateSubGroupStatementText = (sg: SubCombinedGroup) => {
    const teacherName = settings.teacherName ? `الأستاذ / ${settings.teacherName}` : "المعلم";
    const dateStr = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    const subStudents = groupStudents.filter(s => (sg.studentIds || []).includes(s.id));
    const subFin = subStudents.map(st => ({
      student: st,
      summary: calculateStudentFinancials(st, attendanceRecords)
    }));

    const totalAtt = subFin.reduce((sum, item) => sum + item.summary.totalAttendedLessons, 0);
    const totalPaid = subFin.reduce((sum, item) => sum + item.summary.totalPaidAmount, 0);
    const totalCost = subFin.reduce((sum, item) => sum + item.summary.totalAccruedCost, 0);
    const netBal = totalPaid - totalCost;
    const dueAmt = netBal < 0 ? Math.abs(netBal) : 0;
    const creditAmt = netBal > 0 ? netBal : 0;

    let lines: string[] = [];
    lines.push(`📊 *كشف حساب مالي ومتابعة (دمج فرعي)*`);
    lines.push(`🗂️ *الدمج الفرعي:* ${sg.name}`);
    lines.push(`📁 *الملف المجمع الرئيسي:* ${group.name}`);
    lines.push(`👨‍🏫 *المعلم:* ${teacherName}`);
    lines.push(`📅 *التاريخ:* ${dateStr}`);
    if (sg.notes) {
      lines.push(`📝 *ملاحظات:* ${sg.notes}`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👥 *بيانات الطلاب في هذا الدمج الفرعي (${subStudents.length} طلاب):*`);

    subFin.forEach((item, idx) => {
      const st = item.student;
      const f = item.summary;
      lines.push(`\n${idx + 1}. *${st.fullName}* ${st.academicYear ? `(${st.academicYear})` : ""}`);
      if (st.subjects && st.subjects.length > 0) {
        lines.push(`   📚 المواد: ${st.subjects.map(s => s.subject).join("، ")}`);
      } else if (st.subject) {
        lines.push(`   📚 المادة: ${st.subject}`);
      }
      lines.push(`   🎯 الحصص المنفذة: ${f.totalAttendedLessons} حصة`);
      lines.push(`   💵 إجمالي المسدد: ${f.totalPaidAmount} ج.م`);
      if (f.amountDue > 0) {
        lines.push(`   ⚠️ المستحق المطلوب سداده: ${f.amountDue} ج.م`);
      } else if (f.creditRemaining > 0) {
        lines.push(`   ✅ الرصيد الدائن المتبقي: +${f.creditRemaining} ج.م`);
      } else {
        lines.push(`   ✅ الحساب مسدد بالكامل`);
      }
    });

    lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📈 *الملخص الإجمالي للدمج الفرعي:*`);
    lines.push(`• عدد الطلاب: ${subStudents.length} طلاب`);
    lines.push(`• إجمالي الحصص المنفذة للدمج: ${totalAtt} حصة`);
    lines.push(`• إجمالي المبالغ المسددة: ${totalPaid} ج.م`);
    if (dueAmt > 0) {
      lines.push(`• 🔴 *إجمالي المستحق المطلوب سداده:* ${dueAmt} ج.م`);
    } else if (creditAmt > 0) {
      lines.push(`• 🟢 *إجمالي الرصيد الدائن المتبقي:* +${creditAmt} ج.م`);
    } else {
      lines.push(`• 🟢 *الحساب مسدد بالكامل ومضبوط.*`);
    }
    if (sg.sharedGroupLink || group.sharedGroupLink) {
      lines.push(`• 🔗 *رابط الجروب:* ${sg.sharedGroupLink || group.sharedGroupLink}`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✨ نسعد دائماً بمتابعة وتفوق أبنائنا الكرام.`);

    return lines.join("\n");
  };

  // Open Sub-Group Creator
  const handleOpenCreateSubGroup = () => {
    setEditingSubGroupId(null);
    setSubGroupNameVal("");
    setSubGroupStudentIdsVal([]);
    setSubGroupNotesVal("");
    setSubGroupContactVal(effectiveParentContact || "");
    setSubGroupLinkVal(group.sharedGroupLink || "");
    setShowCreateSubGroupModal(true);
  };

  // Open Sub-Group Editor
  const handleOpenEditSubGroup = (sg: SubCombinedGroup) => {
    setEditingSubGroupId(sg.id);
    setSubGroupNameVal(sg.name);
    setSubGroupStudentIdsVal(sg.studentIds || []);
    setSubGroupNotesVal(sg.notes || "");
    setSubGroupContactVal(sg.sharedParentContact || "");
    setSubGroupLinkVal(sg.sharedGroupLink || "");
    setShowCreateSubGroupModal(true);
  };

  // Save Sub-Group
  const handleSaveSubGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subGroupNameVal.trim()) return;
    if (subGroupStudentIdsVal.length === 0) {
      alert(isArabic ? "يرجى تحديد طالب أو أكثر للدمج الفرعي." : "Please select at least one student.");
      return;
    }

    const currentSubs = Array.isArray(group.subGroups) ? group.subGroups : [];
    let nextSubs: SubCombinedGroup[];

    if (editingSubGroupId) {
      nextSubs = currentSubs.map(sg =>
        sg.id === editingSubGroupId
          ? {
              ...sg,
              name: subGroupNameVal.trim(),
              studentIds: subGroupStudentIdsVal,
              notes: subGroupNotesVal.trim() || undefined,
              sharedParentContact: subGroupContactVal.trim() || undefined,
              sharedGroupLink: subGroupLinkVal.trim() || undefined
            }
          : sg
      );
    } else {
      const newSub: SubCombinedGroup = {
        id: `subgrp_${Date.now()}`,
        name: subGroupNameVal.trim(),
        studentIds: subGroupStudentIdsVal,
        notes: subGroupNotesVal.trim() || undefined,
        sharedParentContact: subGroupContactVal.trim() || undefined,
        sharedGroupLink: subGroupLinkVal.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      nextSubs = [...currentSubs, newSub];
    }

    onUpdateGroup(group.id, { subGroups: nextSubs });
    setShowCreateSubGroupModal(false);
    setEditingSubGroupId(null);
    setPaymentSuccessMsg(
      isArabic
        ? (editingSubGroupId ? "تم تحديث بيانات الدمج الفرعي بنجاح!" : "تم إنشاء الدمج الفرعي (دمج داخل الدمج) بنجاح!")
        : "Sub-group saved successfully!"
    );
    setTimeout(() => setPaymentSuccessMsg(""), 4000);
  };

  // Delete Sub-Group
  const handleDeleteSubGroupClick = (subGroupId: string, subName: string) => {
    if (
      confirm(
        isArabic
          ? `هل أنت متأكد من رغبتك في حذف الدمج الفرعي (${subName})؟\n(ملاحظة: سيظل الطلاب مسجلين في هذا الملف المجمع الرئيسي ولا تُحذف أي بيانات لهم).`
          : `Delete sub-group (${subName})? Students will remain in the parent group.`
      )
    ) {
      const currentSubs = Array.isArray(group.subGroups) ? group.subGroups : [];
      const nextSubs = currentSubs.filter(sg => sg.id !== subGroupId);
      onUpdateGroup(group.id, { subGroups: nextSubs });
      setPaymentSuccessMsg(isArabic ? "تم حذف الدمج الفرعي بنجاح." : "Sub-group deleted.");
      setTimeout(() => setPaymentSuccessMsg(""), 3500);
    }
  };

  // Sub-Group Payment Submit
  const handleRecordSubGroupPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubGroupForPayment) return;
    const amount = Number(subGroupPayAmount);
    if (!amount || amount <= 0) return;

    const subStudentObjs = groupStudents.filter(s => activeSubGroupForPayment.studentIds.includes(s.id));
    const subFinancials = subStudentObjs.map(st => ({
      student: st,
      summary: calculateStudentFinancials(st, attendanceRecords)
    }));

    if (subGroupPayTarget === "auto_due") {
      let remaining = amount;
      const sortedByDue = [...subFinancials].sort((a, b) => b.summary.amountDue - a.summary.amountDue);

      for (const item of sortedByDue) {
        if (remaining <= 0) break;
        if (item.summary.amountDue > 0) {
          const allocate = Math.min(remaining, item.summary.amountDue);
          onRecordPayment(
            item.student.id,
            allocate,
            subGroupPayNotes
              ? `${subGroupPayNotes} (سداد دمج فرعي: ${activeSubGroupForPayment.name})`
              : `سداد من دفعة الدمج الفرعي (${activeSubGroupForPayment.name})`,
            subGroupPayDate
          );
          remaining -= allocate;
        }
      }

      if (remaining > 0 && subStudentObjs.length > 0) {
        const firstStudent = subStudentObjs[0];
        onRecordPayment(
          firstStudent.id,
          remaining,
          subGroupPayNotes
            ? `${subGroupPayNotes} (فائض دمج فرعي: ${activeSubGroupForPayment.name})`
            : `رصيد فائض من دفعة الدمج الفرعي (${activeSubGroupForPayment.name})`,
          subGroupPayDate
        );
      }
    } else if (subGroupPayTarget === "equal_split") {
      const perStudent = Math.round((amount / Math.max(1, subStudentObjs.length)) * 100) / 100;
      subStudentObjs.forEach(st => {
        onRecordPayment(
          st.id,
          perStudent,
          subGroupPayNotes
            ? `${subGroupPayNotes} (تقسيم دمج فرعي: ${activeSubGroupForPayment.name})`
            : `دفعة مقسمة من الدمج الفرعي (${activeSubGroupForPayment.name})`,
          subGroupPayDate
        );
      });
    } else {
      const targetStudent = subStudentObjs.find(s => s.id === subGroupPayTarget);
      if (targetStudent) {
        onRecordPayment(
          targetStudent.id,
          amount,
          subGroupPayNotes || `دفعة خاصة للدمج الفرعي (${activeSubGroupForPayment.name})`,
          subGroupPayDate
        );
      }
    }

    setSubGroupPayAmount(0);
    setSubGroupPayNotes("");
    setActiveSubGroupForPayment(null);
    setPaymentSuccessMsg(
      isArabic
        ? `تم تسجيل وتوزيع الدفعة للدمج الفرعي (${activeSubGroupForPayment.name}) بنجاح!`
        : "Sub-group payment recorded successfully!"
    );
    setTimeout(() => setPaymentSuccessMsg(""), 4500);
  };

  const handleCopyStatement = () => {
    const text = generateStatementText();
    navigator.clipboard.writeText(text);
    setCopiedStatement(true);
    setTimeout(() => setCopiedStatement(false), 3000);
  };

  const handleOpenWhatsAppChooser = (text?: string, title?: string) => {
    const t = text || generateStatementText();
    try {
      navigator.clipboard.writeText(t);
    } catch (e) {}
    setPendingWhatsAppText(t);
    setPendingWhatsAppTitle(title || (isArabic ? `كشف حساب ${group.name}` : `Statement: ${group.name}`));
    setShowWhatsAppChooserModal(true);
  };

  const handleSendViaWhatsAppMode = (
    mode: "universal" | "web" | "app_scheme" | "business_scheme" | "intent_android" | "group_link"
  ) => {
    const text = pendingWhatsAppText || generateStatementText();
    const rawLink = group.sharedGroupLink || "";
    const rawPhone = effectiveParentContact || "";
    const cleanPhone = formatWhatsAppPhone(rawPhone);
    const encodedText = encodeURIComponent(text);

    if (mode === "group_link") {
      if (rawLink) {
        try {
          navigator.clipboard.writeText(text);
        } catch (e) {}
        setPaymentSuccessMsg(
          isArabic
            ? "تم نسخ نص كشف الحساب للحافظة وجاري فتح الجروب المشترك..."
            : "Statement copied to clipboard! Opening shared group..."
        );
        window.open(rawLink, "_blank");
        setShowWhatsAppChooserModal(false);
        setShowStatementModal(false);
        return;
      }
    }

    let finalUrl = "";
    if (mode === "web") {
      if (cleanPhone) {
        finalUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else if (rawLink) {
        finalUrl = rawLink;
      } else {
        finalUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
      }
    } else if (mode === "app_scheme") {
      // WhatsApp Messenger Standard Protocol
      if (cleanPhone) {
        finalUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `whatsapp://send?text=${encodedText}`;
      }
    } else if (mode === "business_scheme") {
      // WhatsApp Business Specific Universal Protocol
      if (cleanPhone) {
        finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      } else if (rawLink) {
        finalUrl = rawLink;
      } else {
        finalUrl = `https://wa.me/?text=${encodedText}`;
      }
    } else if (mode === "intent_android") {
      if (navigator.share) {
        navigator
          .share({
            title: pendingWhatsAppTitle || `كشف حساب ${group.name}`,
            text: text
          })
          .then(() => {
            setShowWhatsAppChooserModal(false);
            setShowStatementModal(false);
          })
          .catch(() => {});
        return;
      }
      finalUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://api.whatsapp.com/send?text=${encodedText}`;
    } else {
      // Universal
      finalUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    if (finalUrl) {
      window.open(finalUrl, "_blank");
    }
    setShowWhatsAppChooserModal(false);
    setShowStatementModal(false);
  };

  const handleSendStatementWhatsApp = () => {
    handleOpenWhatsAppChooser(generateStatementText(), isArabic ? `كشف حساب مالي - ${group.name}` : `Statement - ${group.name}`);
  };

  // If user requested full screen Personal Report View for one of the students
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
        onGenerateReportAi={onGenerateReportAi}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir={isArabic ? "rtl" : "ltr"}>
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-auto max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-black shadow-inner shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              {isEditingGroupName ? (
                <form onSubmit={handleSaveGroupDetails} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editGroupNameVal}
                    onChange={e => setEditGroupNameVal(e.target.value)}
                    className="bg-slate-800 border border-indigo-400 text-white text-sm font-black px-2.5 py-1 rounded-xl focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    {isArabic ? "حفظ" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGroupName(false)}
                    className="px-2 py-1 rounded-xl bg-slate-700 text-slate-300 text-xs"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{group.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold">
                      {groupStudents.length} {isArabic ? "طلاب مجمعين" : "students"}
                    </span>
                  </h1>
                  <button
                    onClick={() => setIsEditingGroupName(true)}
                    title={isArabic ? "تعديل اسم الملف" : "Edit group name"}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-indigo-200/80 mt-1 font-medium">
                <span>📁 {isArabic ? "ملف طلاب مجمع" : "Combined Student File"}</span>
                {effectiveParentContact && (
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppChooser()}
                    className="font-mono dir-ltr flex items-center gap-1 text-emerald-300 hover:text-emerald-200 hover:underline transition"
                    title={isArabic ? "إرسال كشف الحساب عبر الواتساب" : "Send WhatsApp statement"}
                  >
                    <span>📱</span>
                    <span>{effectiveParentContact}</span>
                  </button>
                )}
                {group.sharedGroupLink ? (
                  <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-lg text-[10.5px]">
                    <Link className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold">{isArabic ? "جروب مشترك:" : "Group:"}</span>
                    <a
                      href={group.sharedGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-0.5 text-emerald-200"
                    >
                      <span>{isArabic ? "فتح الجروب" : "Open"}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyGroupLink}
                      className="text-emerald-400 hover:text-white p-0.5 rounded transition"
                      title={isArabic ? "نسخ رابط الجروب" : "Copy group link"}
                    >
                      {copiedGroupLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("manage")}
                    className="text-indigo-300/70 hover:text-indigo-200 hover:underline flex items-center gap-1 text-[10.5px]"
                  >
                    <Link className="w-3 h-3" />
                    <span>{isArabic ? "+ إضافة رابط جروب مشترك" : "+ Add Group Link"}</span>
                  </button>
                )}
                <span>📅 {new Date(group.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenWhatsAppChooser()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isArabic ? "إرسال كشف حساب مجمع (واتساب)" : "WhatsApp Statement"}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isArabic ? "📊 الملخص والمالية الشاملة للملف" : "📊 Overview & Combined Finance"}</span>
          </button>

          <button
            onClick={() => setActiveTab("student_profile")}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "student_profile"
                ? "border-indigo-600 text-indigo-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {isArabic
                ? `👤 ملفات الطلاب الشخصية (${groupStudents.length})`
                : `👤 Individual Student Profiles (${groupStudents.length})`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sub_groups")}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "sub_groups"
                ? "border-purple-600 text-purple-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-purple-600" />
            <span>{isArabic ? "🗂️ المجموعات الفرعية (دمج داخل الدمج)" : "🗂️ Sub-Groups (Nested Merge)"}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-black text-[10px]">
              {subGroupsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "manage"
                ? "border-indigo-600 text-indigo-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>{isArabic ? "⚙️ إدارة وتعديل الملف والطلاب" : "⚙️ Manage Group & Members"}</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {paymentSuccessMsg && (
          <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-2 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{paymentSuccessMsg}</span>
            </div>
            <button onClick={() => setPaymentSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & COMBINED FINANCE */}
        {activeTab === "overview" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* 4 Key Combined Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Stat 1: Student Count */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-indigo-700 flex items-center justify-between mb-1">
                  <span>{isArabic ? "عدد الطلاب بالملف" : "Bundled Students"}</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {groupStudents.length} <span className="text-xs font-bold text-indigo-600">{isArabic ? "طلاب" : "students"}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">
                  {groupStudents.map(s => s.fullName.split(" ")[0]).join(" • ")}
                </div>
              </div>

              {/* Stat 2: Total Attended Lessons */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-blue-700 flex items-center justify-between mb-1">
                  <span>{isArabic ? "إجمالي الحصص المنفذة" : "Total Attended"}</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {totalAttendedLessonsAll} <span className="text-xs font-bold text-blue-600">{isArabic ? "حصة مجمعة" : "lessons"}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  {isArabic ? `تكلفة الحصص: ${totalAccruedCostAll} ج.م` : `Accrued: ${totalAccruedCostAll} EGP`}
                </div>
              </div>

              {/* Stat 3: Total Paid Amount */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-between mb-1">
                  <span>{isArabic ? "إجمالي المسدد" : "Total Paid"}</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {totalPaidAmountAll} <span className="text-xs font-bold text-emerald-600 font-sans">{isArabic ? "ج.م" : "EGP"}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {groupPaymentTransactions.length} {isArabic ? "معاملات مسجلة" : "payments"}
                </div>
              </div>

              {/* Stat 4: Combined Financial Balance Status */}
              <div
                className={`p-3.5 rounded-2xl border shadow-2xs ${
                  totalAmountDueAll > 0
                    ? "bg-rose-50/80 border-rose-200"
                    : totalCreditRemainingAll > 0
                    ? "bg-emerald-50/80 border-emerald-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[11px] font-bold flex items-center justify-between mb-1">
                  <span
                    className={
                      totalAmountDueAll > 0
                        ? "text-rose-700"
                        : totalCreditRemainingAll > 0
                        ? "text-emerald-700"
                        : "text-slate-700"
                    }
                  >
                    {isArabic ? "الموقف المالي الإجمالي" : "Net Balance"}
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono ${
                    totalAmountDueAll > 0
                      ? "text-rose-700"
                      : totalCreditRemainingAll > 0
                      ? "text-emerald-700"
                      : "text-slate-800"
                  }`}
                >
                  {totalAmountDueAll > 0
                    ? `${totalAmountDueAll} ج.م`
                    : totalCreditRemainingAll > 0
                    ? `+${totalCreditRemainingAll} ج.م`
                    : (isArabic ? "0 ج.م" : "0 EGP")}
                </div>
                <div className="text-[10.5px] font-bold mt-1">
                  {totalAmountDueAll > 0 ? (
                    <span className="text-rose-600">{isArabic ? "⚠️ مطلوب سداده" : "Due Payment"}</span>
                  ) : totalCreditRemainingAll > 0 ? (
                    <span className="text-emerald-600">{isArabic ? "✅ رصيد دائن متبقي" : "Credit Balance"}</span>
                  ) : (
                    <span className="text-slate-600">{isArabic ? "✅ الحساب مسدد بالكامل" : "Fully Settled"}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Shared WhatsApp Group & Fast Send Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/80 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>{isArabic ? "🔗 الجروب المشترك وخيارات الإرسال عبر الواتساب" : "Shared Group & WhatsApp Dispatch"}</span>
                      {group.sharedGroupLink && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {isArabic ? "جروب مفعل" : "Group active"}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {isArabic
                        ? "إرسال كشوف الحسابات المجمعة والتقارير مباشرة إلى واتساب الأعمال أو الواتساب العادي أو الجروب المشترك"
                        : "Send combined statements & reports directly to WhatsApp Business, Messenger, or the shared group"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowStatementModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isArabic ? "معاينة نص كشف الحساب" : "Preview Statement"}</span>
                </button>
              </div>

              {/* Group Link Status Box */}
              {group.sharedGroupLink ? (
                <div className="p-3 rounded-xl bg-white/90 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden min-w-[200px]">
                    <Link className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-[10.5px] font-bold text-slate-500">{isArabic ? "رابط الجروب المشترك للطلاب:" : "Shared Group URL:"}</div>
                      <a
                        href={group.sharedGroupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-emerald-700 hover:text-emerald-900 hover:underline font-bold truncate block dir-ltr text-right"
                      >
                        {group.sharedGroupLink}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={group.sharedGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{isArabic ? "🚀 فتح الجروب" : "Open Group"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyGroupLink}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      {copiedGroupLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGroupLink ? (isArabic ? "تم النسخ!" : "Copied!") : (isArabic ? "نسخ الرابط" : "Copy Link")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendViaWhatsAppMode("group_link")}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                      title={isArabic ? "نسخ كشف الحساب وفتح الجروب المشترك مباشرة" : "Copy statement & open group"}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isArabic ? "إرسال الكشف للجروب" : "Send to Group"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Link className="w-4 h-4 text-amber-600" />
                    <span>{isArabic ? "لم يتم إضافة رابط جروب مشترك لهذا الملف بعد." : "No shared group link added yet."}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manage")}
                    className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                  >
                    {isArabic ? "+ إضافة رابط جروب الآن" : "+ Add Group Link"}
                  </button>
                </div>
              )}

              {/* Direct Multi-Choice Sending Buttons */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "خيارات إرسال كشف الحساب المالي المجمع:" : "Send Statement Options:"}</span>
                  {effectiveParentContact && (
                    <span className="text-[10px] text-slate-500 font-mono">({effectiveParentContact})</span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Option 1: WhatsApp Business */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                    className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 font-bold text-xs transition flex flex-col items-center text-center gap-1 shadow-2xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black group-hover:scale-105 transition">
                      🏢
                    </div>
                    <span className="text-xs font-black">{isArabic ? "واتساب للأعمال" : "WhatsApp Business"}</span>
                    <span className="text-[9.5px] text-slate-500">{isArabic ? "مباشر Business" : "Direct App"}</span>
                  </button>

                  {/* Option 2: Regular WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("app_scheme")}
                    className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 font-bold text-xs transition flex flex-col items-center text-center gap-1 shadow-2xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black group-hover:scale-105 transition">
                      💬
                    </div>
                    <span className="text-xs font-black">{isArabic ? "واتساب العادي" : "Standard WhatsApp"}</span>
                    <span className="text-[9.5px] text-slate-500">{isArabic ? "تطبيق Messenger" : "Regular App"}</span>
                  </button>

                  {/* Option 3: WhatsApp Web */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("web")}
                    className="p-2.5 rounded-xl bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 font-bold text-xs transition flex flex-col items-center text-center gap-1 shadow-2xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black group-hover:scale-105 transition">
                      🌐
                    </div>
                    <span className="text-xs font-black">{isArabic ? "واتساب ويب" : "WhatsApp Web"}</span>
                    <span className="text-[9.5px] text-slate-500">{isArabic ? "المتصفح / الكمبيوتر" : "Web browser"}</span>
                  </button>

                  {/* Option 4: Mobile Native Chooser */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("intent_android")}
                    className="p-2.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 font-bold text-xs transition flex flex-col items-center text-center gap-1 shadow-2xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black group-hover:scale-105 transition">
                      📱
                    </div>
                    <span className="text-xs font-black">{isArabic ? "مشاركة الهاتف" : "Share Menu"}</span>
                    <span className="text-[9.5px] text-slate-500">{isArabic ? "قائمة التطبيقات" : "System Chooser"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    {isArabic ? "جدول تفصيل الطلاب داخل هذا الملف المجمع" : "Students Breakdown inside Combined File"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowGroupPaymentForm(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{isArabic ? "تسجيل دفعة مالية للملف" : "Record Group Payment"}</span>
                </button>
              </div>

              {/* Group Payment Recording Form Drawer */}
              {showGroupPaymentForm && (
                <div className="p-4 bg-indigo-50/60 border-b border-indigo-100 animate-in slide-in-from-top-2 duration-150">
                  <h4 className="text-xs font-black text-slate-900 mb-2 flex items-center gap-1.5">
                    <span>💰</span>
                    <span>{isArabic ? "تسجيل دفعة وتوزيعها على طلاب الملف المجمع" : "Record & Allocate Group Payment"}</span>
                  </h4>
                  <form onSubmit={handleRecordGroupPaymentSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          {isArabic ? "مبلغ الدفعة (ج.م) *" : "Amount *"}
                        </label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="any"
                          value={groupPaymentAmount || ""}
                          onChange={e => setGroupPaymentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="مثال: 500"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          {isArabic ? "طريقة التوزيع *" : "Allocation Method *"}
                        </label>
                        <select
                          value={groupPaymentTarget}
                          onChange={e => setGroupPaymentTarget(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="auto_due">
                            {isArabic ? "تلقائي: تغطية المبالغ المستحقة أولاً" : "Auto: Cover due balances first"}
                          </option>
                          <option value="equal_split">
                            {isArabic ? "تقسيم بالتساوي على جميع الطلاب" : "Equal split among students"}
                          </option>
                          {groupStudents.map(st => (
                            <option key={st.id} value={st.id}>
                              {isArabic ? `تسجيل بالكامل للطالب: ${st.fullName}` : `For student: ${st.fullName}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          {isArabic ? "التاريخ" : "Date"}
                        </label>
                        <input
                          type="date"
                          value={groupPaymentDate}
                          onChange={e => setGroupPaymentDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          {isArabic ? "ملاحظات الدفعة" : "Notes"}
                        </label>
                        <input
                          type="text"
                          value={groupPaymentNotes}
                          onChange={e => setGroupPaymentNotes(e.target.value)}
                          placeholder={isArabic ? "مثال: فودافون كاش من ولي الأمر..." : "Payment notes..."}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowGroupPaymentForm(false)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                      >
                        {isArabic ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={groupPaymentAmount <= 0}
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                          groupPaymentAmount > 0
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isArabic ? "تأكيد وتسجيل الدفعة" : "Confirm Payment"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table of Students in the Group */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{isArabic ? "اسم الطالب" : "Student Name"}</th>
                      <th className="py-2.5 px-3">{isArabic ? "المرحلة والمنهج" : "Grade & Curriculum"}</th>
                      <th className="py-2.5 px-3">{isArabic ? "المواد المسجل بها" : "Subjects"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الحصص المنفذة" : "Attended"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "المسدد" : "Paid"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الموقف المالي" : "Financial Status"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsFinancials.map((item, idx) => {
                      const st = item.student;
                      const fin = item.summary;
                      const isStopped = st.status === "stopped";

                      return (
                        <tr key={st.id} className="hover:bg-indigo-50/30 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px] font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{st.fullName}</span>
                              {st.studentNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{st.studentNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {st.academicYear && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[9.5px] font-bold">
                                  {st.academicYear}
                                </span>
                              )}
                              {st.curriculum && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-[9.5px] font-bold">
                                  {st.curriculum}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {st.subjects && st.subjects.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {st.subjects.map((sub, sIdx) => (
                                  <span
                                    key={sub.id || sIdx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium"
                                  >
                                    <span className="font-bold">{sub.subject}</span>
                                    <span className="text-blue-600 font-mono text-[9px] mr-1">({sub.lessonCost} ج.م)</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-700 font-bold">{st.subject}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-blue-700">
                              {fin.totalAttendedLessons} {isArabic ? "حصة" : "lss"}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {fin.totalAccruedCost} ج.م
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                            {fin.totalPaidAmount} ج.م
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                fin.amountDue > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : fin.creditRemaining > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {fin.amountDue > 0
                                ? `مستحق ${fin.amountDue} ج.م`
                                : fin.creditRemaining > 0
                                ? `رصيد +${fin.creditRemaining} ج.م`
                                : (isArabic ? "مسدد بالكامل" : "Settled")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudentDirectly(st)}
                                title={isArabic ? "تعديل بيانات ومواد الطالب" : "Edit Student"}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10.5px] border border-indigo-200 hover:border-indigo-300 transition flex items-center gap-1 shadow-2xs"
                              >
                                <Edit2 className="w-3 h-3 text-indigo-600" />
                                <span>{isArabic ? "تعديل البيانات" : "Edit"}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedStudentId(st.id);
                                  setActiveTab("student_profile");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] transition shadow-2xs flex items-center gap-1"
                              >
                                <span>{isArabic ? "فتح صفحة الطالب" : "View Profile"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentForPersonalReport(st)}
                                title={isArabic ? "فتح صفحة التقرير الشخصي" : "Personal Report"}
                                className="p-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
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

            {/* Sub-Groups (Nested Merging / دمج داخل الدمج) Section in Overview */}
            <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-purple-50/80 border border-purple-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-1.5">
                      <span>{isArabic ? "المجموعات الفرعية المدمجة (دمج داخل الدمج)" : "Sub-Groups (Nested Merging)"}</span>
                      <span className="px-2 py-0.2 rounded-full bg-purple-200 text-purple-900 text-[10px] font-extrabold">
                        {subGroupsList.length}
                      </span>
                    </h3>
                    <p className="text-[10.5px] text-purple-700">
                      {isArabic
                        ? "دمج وتقسيم بعض طلاب هذا الملف المجمع في مجموعات فرعية خاصة مع حسابات وكشوفات مستقلة."
                        : "Sub-merge specific students inside this bundle with dedicated statements and balances."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateSubGroup}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "+ دمج فرعي جديد" : "+ New Sub-Group"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("sub_groups")}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition"
                  >
                    <span>{isArabic ? "عرض إدارة المجموعات الفرعية" : "Manage Sub-Groups"}</span>
                  </button>
                </div>
              </div>

              {subGroupsList.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/90 border border-purple-150 text-center space-y-2">
                  <p className="text-xs text-purple-950 font-bold">
                    {isArabic
                      ? "هل ترغب في دمج بعض طلاب هذا الملف معاً في مجموعة فرعية (مثل الأخوين الأكبر، أو طالبين يتشاركان نفس الحصص)؟"
                      : "Would you like to nest-merge some students in this bundle together?"}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xl mx-auto">
                    {isArabic
                      ? "خاصية «الدمج داخل الدمج» تمكنك من إصدار كشف حساب واتساب منفصل لمجموعة فرعية وتسجيل دفعات خاصة بهم مع بقائهم داخل هذا الملف المجمع."
                      : "Nested merging allows you to generate dedicated statements and record payments for a subset of students while keeping them in this group."}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateSubGroup}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "إنشاء أول دمج فرعي الآن" : "Create First Sub-Group"}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {subGroupsList.map(sg => {
                    const sgStudents = groupStudents.filter(s => (sg.studentIds || []).includes(s.id));
                    const sgFinancials = sgStudents.map(st => ({
                      student: st,
                      summary: calculateStudentFinancials(st, attendanceRecords)
                    }));
                    const sgAttended = sgFinancials.reduce((sum, i) => sum + i.summary.totalAttendedLessons, 0);
                    const sgCost = sgFinancials.reduce((sum, i) => sum + i.summary.totalAccruedCost, 0);
                    const sgPaid = sgFinancials.reduce((sum, i) => sum + i.summary.totalPaidAmount, 0);
                    const sgNet = sgPaid - sgCost;
                    const sgDue = sgNet < 0 ? Math.abs(sgNet) : 0;
                    const sgCredit = sgNet > 0 ? sgNet : 0;

                    return (
                      <div
                        key={sg.id}
                        className="bg-white rounded-xl p-3.5 border border-purple-200/80 shadow-2xs space-y-2.5 hover:border-purple-300 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-600" />
                              <h4 className="font-black text-purple-950 text-xs sm:text-sm">{sg.name}</h4>
                              <span className="px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[9.5px] font-bold">
                                {sgStudents.length} {isArabic ? "طلاب" : "students"}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-1 flex flex-wrap gap-1">
                              {sgStudents.map(st => (
                                <span key={st.id} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                                  👦 {st.fullName}
                                </span>
                              ))}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                              sgDue > 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : sgCredit > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {sgDue > 0
                              ? `مستحق ${sgDue} ج.م`
                              : sgCredit > 0
                              ? `رصيد +${sgCredit} ج.م`
                              : (isArabic ? "خالص ومسدد" : "Settled")}
                          </span>
                        </div>

                        {/* Quick Action Buttons for Sub-Group */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5 flex-wrap">
                          <div className="text-[10.5px] text-slate-500 font-mono">
                            {sgAttended} {isArabic ? "حصة" : "lss"} • {sgPaid} {isArabic ? "مسدد" : "paid"}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSubGroupForPayment(sg);
                                setSubGroupPayAmount(sgDue > 0 ? sgDue : 0);
                                setSubGroupPayTarget("auto_due");
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10.5px] transition flex items-center gap-1"
                              title={isArabic ? "تسجيل دفعة خاصة بهذا الدمج الفرعي" : "Record Sub-Group Payment"}
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>{isArabic ? "سداد" : "Pay"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const stText = generateSubGroupStatementText(sg);
                                handleOpenWhatsAppChooser(stText, isArabic ? `كشف حساب دمج فرعي: ${sg.name}` : `Statement: ${sg.name}`);
                              }}
                              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10.5px] transition flex items-center gap-1"
                              title={isArabic ? "إرسال كشف حساب مخصص لهذا الدمج الفرعي عبر الواتساب" : "Send WhatsApp Statement"}
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{isArabic ? "واتساب" : "WhatsApp"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditSubGroup(sg)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title={isArabic ? "تعديل الدمج الفرعي" : "Edit Sub-Group"}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Combined Transactions History */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>{isArabic ? "سجل المدفوعات والمعاملات المالية للملف المجمع" : "Group Payment History"}</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-bold">
                  {groupPaymentTransactions.length} {isArabic ? "معاملة" : "records"}
                </span>
              </div>

              {groupPaymentTransactions.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  {isArabic ? "لا توجد معاملات مالية مسجلة بعد لطلاب هذا الملف." : "No transactions recorded yet."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {groupPaymentTransactions.map(tx => (
                    <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-indigo-700 font-extrabold">{tx.studentName}</span>
                          <span className="text-slate-400 text-[10.5px]">({tx.date})</span>
                        </div>
                        {tx.notes && <div className="text-[10.5px] text-slate-500 mt-0.5">{tx.notes}</div>}
                      </div>
                      <div className="font-mono font-black text-emerald-600 text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        +{tx.amount} ج.م
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INDIVIDUAL STUDENT PROFILES INSIDE COMBINED FILE */}
        {activeTab === "student_profile" && activeStudent && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Top Student Switcher Pill Tabs */}
            <div className="p-3 bg-indigo-950/5 border-b border-indigo-100 shrink-0 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 ml-1">
                {isArabic ? "اختر الطالب لعرض صفحته الكاملة:" : "Select student profile:"}
              </span>
              {groupStudents.map(st => {
                const isSelected = st.id === activeStudent.id;
                const fin = calculateStudentFinancials(st, attendanceRecords);

                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStudentId(st.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 flex items-center gap-2 shadow-2xs border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>👦 {st.fullName}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {fin.amountDue > 0
                        ? `مستحق ${fin.amountDue}`
                        : fin.creditRemaining > 0
                        ? `+${fin.creditRemaining}`
                        : "مسدد"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Student Profile Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              {/* Student Profile Sub-Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base shadow-inner">
                    {activeStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>{activeStudent.fullName}</span>
                      {activeStudent.academicYear && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          {activeStudent.academicYear}
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>📚 {activeStudent.subject}</span>
                      <span className="font-mono dir-ltr">📱 {activeStudent.parentContact}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenEditStudentDirectly(activeStudent)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تعديل بيانات ومواد الطالب" : "Edit Student & Subjects"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentForPersonalReport(activeStudent)}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isArabic ? "تقرير المتابعة والذكاء الاصطناعي" : "Personal Report"}</span>
                  </button>
                </div>
              </div>

              {/* Sub Tabs: Reports | Finance | Attendance */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setStudentProfileSubTab("reports")}
                  className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                    studentProfileSubTab === "reports"
                      ? "border-purple-600 text-purple-700 bg-purple-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isArabic ? "تقارير الطالب بالذكاء الاصطناعي" : "Student Reports & AI"}</span>
                </button>
                <button
                  onClick={() => setStudentProfileSubTab("finance")}
                  className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                    studentProfileSubTab === "finance"
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "المالية والحصص للطالب" : "Student Financials"}</span>
                </button>
                <button
                  onClick={() => setStudentProfileSubTab("attendance")}
                  className={`px-4 py-2 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                    studentProfileSubTab === "attendance"
                      ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isArabic ? "سجل الحضور والغياب" : "Attendance Log"}</span>
                </button>
              </div>

              {/* Sub Tab: Finance */}
              {studentProfileSubTab === "finance" && (
                <div className="space-y-4 text-xs">
                  {(() => {
                    const fin = calculateStudentFinancials(activeStudent, attendanceRecords);
                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <div className="text-slate-400 text-[10px] mb-1">{isArabic ? "الحصص المنفذة" : "Attended"}</div>
                            <div className="text-lg font-black text-blue-600">{fin.totalAttendedLessons}</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <div className="text-slate-400 text-[10px] mb-1">{isArabic ? "إجمالي التكلفة" : "Accrued"}</div>
                            <div className="text-lg font-black text-slate-800 font-mono">{fin.totalAccruedCost} ج.م</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <div className="text-slate-400 text-[10px] mb-1">{isArabic ? "إجمالي المسدد" : "Paid"}</div>
                            <div className="text-lg font-black text-emerald-600 font-mono">{fin.totalPaidAmount} ج.م</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <div className="text-slate-400 text-[10px] mb-1">{isArabic ? "الموقف المالي" : "Status"}</div>
                            <div
                              className={`text-sm font-black ${
                                fin.amountDue > 0 ? "text-rose-600" : fin.creditRemaining > 0 ? "text-emerald-600" : "text-blue-600"
                              }`}
                            >
                              {fin.amountDue > 0
                                ? `مستحق ${fin.amountDue} ج.م`
                                : fin.creditRemaining > 0
                                ? `رصيد +${fin.creditRemaining} ج.م`
                                : (isArabic ? "مسدد بالكامل" : "Settled")}
                            </div>
                          </div>
                        </div>

                        {/* Individual Student Payment Form */}
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={singlePayAmount || ""}
                            onChange={e => setSinglePayAmount(parseFloat(e.target.value) || 0)}
                            placeholder={isArabic ? "تسجيل دفعة لهذا الطالب (ج.م)..." : "Amount to record..."}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 font-mono flex-1 min-w-[150px]"
                          />
                          <input
                            type="text"
                            value={singlePayNotes}
                            onChange={e => setSinglePayNotes(e.target.value)}
                            placeholder={isArabic ? "ملاحظات الدفعة..." : "Payment notes..."}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 flex-1 min-w-[150px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (singlePayAmount > 0) {
                                onRecordPayment(activeStudent.id, singlePayAmount, singlePayNotes, singlePayDate);
                                setSinglePayAmount(0);
                                setSinglePayNotes("");
                                setPaymentSuccessMsg(isArabic ? `تم تسجيل الدفعة للطالب ${activeStudent.fullName} بنجاح!` : "Payment recorded!");
                                setTimeout(() => setPaymentSuccessMsg(""), 3500);
                              }
                            }}
                            disabled={singlePayAmount <= 0}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs"
                          >
                            {isArabic ? "تسجيل الدفعة للطالب" : "Record Payment"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub Tab: Attendance */}
              {studentProfileSubTab === "attendance" && (
                <div className="space-y-3 text-xs">
                  {(() => {
                    const studentAttendance = attendanceRecords.filter(r => r.studentId === activeStudent.id);
                    return studentAttendance.length === 0 ? (
                      <div className="p-5 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                        {isArabic ? "لا توجد سجلات حضور مسجلة لهذا الطالب حتى الآن." : "No attendance records found."}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentAttendance.map(att => (
                          <div
                            key={att.id}
                            className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  att.attendance === "present"
                                    ? "bg-emerald-500"
                                    : att.attendance === "absent"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              <div>
                                <div className="font-bold text-slate-900">
                                  {att.subject || activeStudent.subject} • {att.date}
                                </div>
                                {att.teacherNotes && (
                                  <div className="text-[10.5px] text-slate-500 mt-0.5">{att.teacherNotes}</div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                att.attendance === "present"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : att.attendance === "absent"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {att.attendance === "present"
                                ? (isArabic ? "حاضر" : "Present")
                                : att.attendance === "absent"
                                ? (isArabic ? "غائب" : "Absent")
                                : (isArabic ? "متأخر" : "Late")}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub Tab: Reports & AI */}
              {studentProfileSubTab === "reports" && (
                <div className="space-y-3 text-xs">
                  {(() => {
                    const studentReports = reports.filter(
                      r => r.studentId === activeStudent.id || r.studentName === activeStudent.fullName
                    );

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>{isArabic ? `تقارير الطالب المسجلة (${studentReports.length}):` : `Reports (${studentReports.length}):`}</span>
                          </h4>
                          <button
                            onClick={() => setStudentForPersonalReport(activeStudent)}
                            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{isArabic ? "إنشاء وتوليد تقارير بالذكاء الاصطناعي" : "Generate AI Report"}</span>
                          </button>
                        </div>

                        {studentReports.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                            <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2 opacity-60" />
                            <p>{isArabic ? "لا توجد تقارير منشأة لهذا الطالب بعد." : "No reports created yet."}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {studentReports.map(rep => (
                              <div
                                key={rep.id}
                                className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs hover:border-purple-200 transition"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <span>📚 {rep.subject}</span>
                                    <span className="text-slate-400 text-[10.5px]">({rep.date})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const text = rep.reportText || rep.generatedText || rep.teacherNotes;
                                        handleOpenWhatsAppChooser(text, `تقرير ${activeStudent.fullName} - ${rep.subject}`);
                                      }}
                                      className="p-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10.5px] font-bold flex items-center gap-1 transition"
                                      title={isArabic ? "إرسال التقرير عبر واتساب (أعمال / عادي)" : "Share via WhatsApp"}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{isArabic ? "واتساب" : "WhatsApp"}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const text = rep.reportText || rep.generatedText || rep.teacherNotes;
                                        navigator.clipboard.writeText(text);
                                        setCopiedReportId(rep.id);
                                        setTimeout(() => setCopiedReportId(null), 2000);
                                      }}
                                      className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold flex items-center gap-1"
                                    >
                                      {copiedReportId === rep.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                      <span>{copiedReportId === rep.id ? "تم النسخ" : "نسخ"}</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed whitespace-pre-wrap">
                                  {rep.reportText || rep.generatedText || rep.teacherNotes}
                                </div>
                              </div>
                            ))}
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

        {/* TAB 3: SUB-GROUPS / NESTED MERGE (دمج داخل الدمج) */}
        {activeTab === "sub_groups" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
                    <FolderTree className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black">{isArabic ? "المجموعات الفرعية المدمجة (دمج داخل الدمج)" : "Nested Sub-Groups Management"}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-200 text-[10px] font-bold border border-purple-400/30">
                        {subGroupsList.length} {isArabic ? "مجموعات فرعية" : "sub-groups"}
                      </span>
                    </div>
                    <p className="text-xs text-purple-200/80 mt-0.5 max-w-2xl">
                      {isArabic
                        ? "خاصية مرنة تتيح لك تقسيم أو دمج بعض طلاب هذا الملف المجمع معاً في مجموعات فرعية خاصة، لإصدار كشوفات حساب واتساب مخصصة لهم، ومتابعة ماليتهم وتسجيل دفعاتهم بشكل مستقل دون التأثير على الملف الرئيسي."
                        : "Merge and partition specific students within this group into dedicated sub-groups for custom statements, focused payments, and tailored financial tracking."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateSubGroup}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/30 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isArabic ? "+ إنشاء دمج فرعي جديد" : "+ Create Sub-Group"}</span>
                </button>
              </div>
            </div>

            {/* List of Sub-Groups or Empty State */}
            {subGroupsList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-2xs max-w-2xl mx-auto my-6">
                <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                  <FolderTree className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {isArabic ? "لا توجد مجموعات فرعية مدمجة بعد في هذا الملف" : "No nested sub-groups created yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {isArabic
                      ? "يمكنك الآن دمج طالبين أو أكثر من طلاب هذا الملف (مثلاً الأخوين الكبار أو طلاب نفس المادة) لإرسال كشف حساب مالي مستقل لولي أمرهم أو جروبهم وتسجيل مدفوعات مخصصة لهم."
                      : "You can group two or more students together inside this bundle to dispatch targeted WhatsApp statements and record dedicated payments."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateSubGroup}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isArabic ? "إنشاء أول دمج فرعي الآن" : "Create First Sub-Group"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-purple-600" />
                    <span>{isArabic ? `المجموعات الفرعية الحالية (${subGroupsList.length})` : `Active Sub-Groups (${subGroupsList.length})`}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenCreateSubGroup}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isArabic ? "+ إضافة دمج فرعي" : "+ Add Sub-Group"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {subGroupsList.map(sg => {
                    const sgStudents = groupStudents.filter(s => (sg.studentIds || []).includes(s.id));
                    const sgFinancials = sgStudents.map(st => ({
                      student: st,
                      summary: calculateStudentFinancials(st, attendanceRecords)
                    }));
                    const sgAttended = sgFinancials.reduce((sum, i) => sum + i.summary.totalAttendedLessons, 0);
                    const sgCost = sgFinancials.reduce((sum, i) => sum + i.summary.totalAccruedCost, 0);
                    const sgPaid = sgFinancials.reduce((sum, i) => sum + i.summary.totalPaidAmount, 0);
                    const sgNet = sgPaid - sgCost;
                    const sgDue = sgNet < 0 ? Math.abs(sgNet) : 0;
                    const sgCredit = sgNet > 0 ? sgNet : 0;

                    return (
                      <div
                        key={sg.id}
                        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 hover:border-purple-300 transition flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm shrink-0">
                                🗂️
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                  <span>{sg.name}</span>
                                  <span className="px-2 py-0.2 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                                    {sgStudents.length} {isArabic ? "طلاب" : "students"}
                                  </span>
                                </h4>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                  {sg.sharedParentContact && (
                                    <span className="font-mono text-emerald-700 dir-ltr">
                                      📱 {sg.sharedParentContact}
                                    </span>
                                  )}
                                  {sg.sharedGroupLink && (
                                    <a
                                      href={sg.sharedGroupLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                                    >
                                      <Link className="w-2.5 h-2.5" />
                                      <span>{isArabic ? "رابط الجروب" : "Group Link"}</span>
                                    </a>
                                  )}
                                  {sg.createdAt && (
                                    <span className="text-slate-400">
                                      📅 {new Date(sg.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 ${
                                sgDue > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : sgCredit > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {sgDue > 0
                                ? `مستحق ${sgDue} ج.م`
                                : sgCredit > 0
                                ? `رصيد +${sgCredit} ج.م`
                                : (isArabic ? "مسدد بالكامل" : "Settled")}
                            </span>
                          </div>

                          {/* Notes if present */}
                          {sg.notes && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 text-xs text-slate-700">
                              <span className="font-bold text-slate-500 ml-1">{isArabic ? "ملاحظة:" : "Note:"}</span>
                              {sg.notes}
                            </div>
                          )}

                          {/* Members List inside Sub-Group */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-500 block">
                              {isArabic ? "الطلاب المدمجون في هذه المجموعة الفرعية:" : "Sub-group Members:"}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sgStudents.map(st => {
                                const stFin = calculateStudentFinancials(st, attendanceRecords);
                                return (
                                  <div
                                    key={st.id}
                                    className="p-2 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                      <span className="font-bold text-slate-900 truncate">{st.fullName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div className="text-[10.5px] font-mono mr-1">
                                        {stFin.amountDue > 0 ? (
                                          <span className="text-rose-600 font-bold">-{stFin.amountDue}</span>
                                        ) : stFin.creditRemaining > 0 ? (
                                          <span className="text-emerald-600 font-bold">+{stFin.creditRemaining}</span>
                                        ) : (
                                          <span className="text-slate-400">0</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStudentDirectly(st)}
                                        title={isArabic ? `تعديل بيانات الطالب (${st.fullName})` : `Edit ${st.fullName}`}
                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Financial 3-Metric Summary Bar */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-purple-50/50 border border-purple-100 text-center text-xs">
                            <div>
                              <span className="text-[10px] text-purple-700 font-bold block">{isArabic ? "الحصص" : "Lessons"}</span>
                              <span className="font-black text-purple-950">{sgAttended} {isArabic ? "حصة" : "lss"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-purple-700 font-bold block">{isArabic ? "المسدد" : "Paid"}</span>
                              <span className="font-black text-emerald-700">{sgPaid} ج.م</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-purple-700 font-bold block">{isArabic ? "المطلوب" : "Cost"}</span>
                              <span className="font-black text-slate-800">{sgCost} ج.م</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSubGroupForPayment(sg);
                                setSubGroupPayAmount(sgDue > 0 ? sgDue : 0);
                                setSubGroupPayTarget("auto_due");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{isArabic ? "تسجيل دفعة للدمج" : "Record Payment"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const stText = generateSubGroupStatementText(sg);
                                handleOpenWhatsAppChooser(stText, isArabic ? `كشف حساب دمج فرعي: ${sg.name}` : `Statement: ${sg.name}`);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{isArabic ? "كشف واتساب" : "WhatsApp"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const stText = generateSubGroupStatementText(sg);
                                navigator.clipboard.writeText(stText);
                                setPaymentSuccessMsg(isArabic ? `تم نسخ كشف حساب (${sg.name}) للحافظة بنجاح!` : "Statement copied!");
                                setTimeout(() => setPaymentSuccessMsg(""), 3500);
                              }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title={isArabic ? "نسخ كشف حساب هذا الدمج الفرعي" : "Copy Statement"}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubGroup(sg)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition"
                              title={isArabic ? "تعديل بيانات وأعضاء الدمج الفرعي" : "Edit Sub-Group"}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubGroupClick(sg.id, sg.name)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 transition"
                              title={isArabic ? "حذف هذا الدمج الفرعي (مع بقاء الطلاب في الملف الأساسي)" : "Delete Sub-Group"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MANAGE GROUP MEMBERS & SETTINGS */}
        {activeTab === "manage" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
            {/* Edit Group Info Box */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>{isArabic ? "تعديل بيانات الملف المجمع" : "Edit Group Information"}</span>
              </h3>

              <form onSubmit={handleSaveGroupDetails} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "اسم الملف المجمع *" : "Combined Group Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={editGroupNameVal}
                      onChange={e => setEditGroupNameVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رقم ولي الأمر المشترك (واتساب)" : "Shared Parent WhatsApp"}
                    </label>
                    <input
                      type="text"
                      value={editGroupContactVal}
                      onChange={e => setEditGroupContactVal(e.target.value)}
                      placeholder="+201000000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Link className="w-3 h-3 text-emerald-600" />
                        <span>{isArabic ? "رابط الجروب المشترك (واتساب / تليجرام)" : "Shared Group Link (WhatsApp / Telegram)"}</span>
                      </span>
                      {group.sharedGroupLink && (
                        <a
                          href={group.sharedGroupLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline flex items-center gap-0.5 text-[10.5px]"
                        >
                          <span>{isArabic ? "فتح الرابط الحالي" : "Open Link"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <div className="relative">
                      <Link className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={editGroupLinkVal}
                        onChange={e => setEditGroupLinkVal(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isArabic
                        ? "رابط مجموعة الواتساب أو التليجرام التي تضم أولياء أمور أو طلاب هذا الملف المجمع لمشاركتها وإرسال التقارير إليها مباشرة."
                        : "Link to the shared WhatsApp or Telegram group for direct communication and statement dispatching."}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isArabic ? "حفظ التعديلات" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Current Members with option to remove/separate */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{isArabic ? `الطلاب المنضمون حالياً (${groupStudents.length})` : `Current Members (${groupStudents.length})`}</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {groupStudents.map(st => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span>{st.fullName}</span>
                        {st.academicYear && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9.5px] font-bold border border-amber-200">
                            {st.academicYear}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">📚 {st.subject}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudentDirectly(st)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 transition font-bold text-[10.5px] flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{isArabic ? "تعديل البيانات" : "Edit"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              isArabic
                                ? `هل تريد فك تجميع الطالب (${st.fullName}) وإعادته كملف مستقل في القائمة الرئيسية؟`
                                : `Remove ${st.fullName} from this group?`
                            )
                          ) {
                            onRemoveStudentFromGroup(group.id, st.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition font-bold text-[10.5px] flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{isArabic ? "فك التجميع" : "Unlink"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add More Students to this Group */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-2xs space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>{isArabic ? "إضافة طلاب آخرين لهذا الملف المجمع مستقبلاً" : "Add More Students to this File"}</span>
              </h3>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={addStudentSearch}
                  onChange={e => setAddStudentSearch(e.target.value)}
                  placeholder={isArabic ? "بحث في الطلاب المتاحين للإضافة..." : "Search available students to add..."}
                  className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {unbundledStudents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  {isArabic ? "لا يوجد طلاب متاحون غير مجمعين." : "No unbundled students available."}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl bg-white border border-slate-200">
                  {unbundledStudents
                    .filter(s => {
                      if (!addStudentSearch.trim()) return true;
                      const q = addStudentSearch.toLowerCase();
                      return (
                        s.fullName.toLowerCase().includes(q) ||
                        (s.subject && s.subject.toLowerCase().includes(q)) ||
                        (s.academicYear && s.academicYear.toLowerCase().includes(q))
                      );
                    })
                    .map(st => (
                      <div key={st.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{st.fullName}</div>
                          <div className="text-[10px] text-slate-500">
                            {st.academicYear || st.subject || ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onAddStudentToGroup(group.id, st.id);
                            setAddStudentSearch("");
                          }}
                          className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isArabic ? "ضم إلى الملف" : "Add"}</span>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Disband / Delete Entire Combined Group */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-rose-900">
                  {isArabic ? "فك وفسخ الملف المجمع بالكامل" : "Disband Combined Group"}
                </h4>
                <p className="text-[10.5px] text-rose-700 mt-0.5">
                  {isArabic
                    ? "سيتم فك هذا الملف المجمع وإعادة كافة الطلاب كبطاقات شخصية مستقلة دون حذف أي سجلات أو تقارير أو مدفوعات."
                    : "Disbands this bundle and returns all students as individual profile cards. No data is lost."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      isArabic
                        ? `هل أنت متأكد من فك الملف المجمع (${group.name})؟ سيعود جميع الطلاب كملفات شخصية مستقلة.`
                        : `Are you sure you want to disband ${group.name}?`
                    )
                  ) {
                    onDeleteGroup(group.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? "فك الملف المجمع" : "Disband Group"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal: Create or Edit Sub-Group (دمج داخل الدمج) */}
        {showCreateSubGroupModal && (
          <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      {editingSubGroupId
                        ? (isArabic
                            ? `تعديل الدمج الفرعي (${subGroupsList.find(s => s.id === editingSubGroupId)?.name || ""})`
                            : `Edit Sub-Group (${subGroupsList.find(s => s.id === editingSubGroupId)?.name || ""})`)
                        : (isArabic ? "إنشاء مجموعة فرعية جديدة (دمج داخل الدمج)" : "Create New Sub-Group (Nested Merge)")}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isArabic
                        ? `داخل الملف المجمع: ${group.name}`
                        : `Inside Group: ${group.name}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateSubGroupModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubGroupSubmit} className="space-y-4">
                {/* Sub-Group Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {isArabic ? "اسم المجموعة الفرعية (الدمج الفرعي) *" : "Sub-Group Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={subGroupNameVal}
                    onChange={e => setSubGroupNameVal(e.target.value)}
                    placeholder={isArabic ? "مثال: الأخوين الكبار، طلاب الرياضيات المتقدمة..." : "e.g., Senior Siblings, Advanced Math..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Student Selection (Checkboxes) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700 text-xs">
                      {isArabic ? "اختر الطلاب المطلوب دمجهم معاً *" : "Select Students to Merge *"}
                    </label>
                    <div className="flex items-center gap-2 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setSubGroupStudentIdsVal(groupStudents.map(s => s.id))}
                        className="text-purple-600 font-bold hover:underline"
                      >
                        {isArabic ? "تحديد الكل" : "Select All"}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSubGroupStudentIdsVal([])}
                        className="text-slate-500 font-bold hover:underline"
                      >
                        {isArabic ? "إلغاء التحديد" : "Deselect All"}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                    {groupStudents.map(st => {
                      const isChecked = subGroupStudentIdsVal.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer text-xs ${
                            isChecked
                              ? "bg-purple-50/80 border-purple-300 text-purple-950 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSubGroupStudentIdsVal(prev => [...prev, st.id]);
                                } else {
                                  setSubGroupStudentIdsVal(prev => prev.filter(id => id !== st.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <div className="font-bold">{st.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-normal">📚 {st.subject}</div>
                            </div>
                          </div>

                          {st.academicYear && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9.5px] font-bold border border-amber-200">
                              {st.academicYear}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    {isArabic
                      ? `تم تحديد ${subGroupStudentIdsVal.length} من أصل ${groupStudents.length} طلاب.`
                      : `Selected ${subGroupStudentIdsVal.length} of ${groupStudents.length} students.`}
                  </p>
                </div>

                {/* Optional Contact & WhatsApp Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رقم ولي الأمر الخاص بهذه المجموعة الفرعية" : "Sub-Group Contact (WhatsApp)"}
                    </label>
                    <input
                      type="text"
                      value={subGroupContactVal}
                      onChange={e => setSubGroupContactVal(e.target.value)}
                      placeholder="+201000000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 dir-ltr text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "رابط الجروب الخاص بهذه المجموعة" : "Sub-Group WhatsApp Link"}
                    </label>
                    <input
                      type="url"
                      value={subGroupLinkVal}
                      onChange={e => setSubGroupLinkVal(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 dir-ltr text-right"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "ملاحظات إضافية" : "Sub-Group Notes"}
                    </label>
                    <input
                      type="text"
                      value={subGroupNotesVal}
                      onChange={e => setSubGroupNotesVal(e.target.value)}
                      placeholder={isArabic ? "مثال: محاسبة خاصة شهرياً..." : "Additional notes..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateSubGroupModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isArabic ? "حفظ الدمج الفرعي" : "Save Sub-Group"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Payment for Sub-Group (سداد دفعة للدمج الفرعي) */}
        {activeSubGroupForPayment && (
          <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      {isArabic ? "تسجيل دفعة للدمج الفرعي" : "Record Sub-Group Payment"}
                    </h3>
                    <p className="text-[11px] text-purple-700 font-bold">
                      {activeSubGroupForPayment.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubGroupForPayment(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Summary of Sub-Group Financials */}
              {(() => {
                const sgStudents = groupStudents.filter(s => (activeSubGroupForPayment.studentIds || []).includes(s.id));
                const sgFinancials = sgStudents.map(st => ({
                  student: st,
                  summary: calculateStudentFinancials(st, attendanceRecords)
                }));
                const sgCost = sgFinancials.reduce((sum, i) => sum + i.summary.totalAccruedCost, 0);
                const sgPaid = sgFinancials.reduce((sum, i) => sum + i.summary.totalPaidAmount, 0);
                const sgNet = sgPaid - sgCost;
                const sgDue = sgNet < 0 ? Math.abs(sgNet) : 0;

                return (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-emerald-900">{isArabic ? "إجمالي المستحق على هذا الدمج الفرعي:" : "Total Due for Sub-Group:"}</span>
                      <span className="font-mono font-black text-emerald-800 text-sm">{sgDue} ج.م</span>
                    </div>

                    <div className="text-[10.5px] text-slate-600 flex flex-wrap gap-1 pt-1 border-t border-emerald-200/50">
                      <span className="font-bold text-slate-500">{isArabic ? "الطلاب المشمولون:" : "Included:"}</span>
                      {sgStudents.map(st => (
                        <span key={st.id} className="bg-white px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                          {st.fullName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={handleRecordSubGroupPaymentSubmit} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {isArabic ? "قيمة المبلغ المسدد (ج.م) *" : "Payment Amount (EGP) *"}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={subGroupPayAmount || ""}
                    onChange={e => setSubGroupPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    {isArabic ? "طريقة توزيع الدفعة بين طلاب الدمج الفرعي:" : "Allocation Strategy:"}
                  </label>
                  <select
                    value={subGroupPayTarget}
                    onChange={e => setSubGroupPayTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="auto_due">
                      {isArabic ? "⚡ توزيع ذكي تلقائي (سداد المستحقات أولاً ثم تقسيم الفائض)" : "⚡ Smart Auto-Allocation"}
                    </option>
                    <option value="equal">
                      {isArabic ? "⚖️ تقسيم المبلغ بالتساوي بين طلاب هذا الدمج الفرعي" : "⚖️ Split Equally"}
                    </option>
                    {groupStudents
                      .filter(s => (activeSubGroupForPayment.studentIds || []).includes(s.id))
                      .map(st => (
                        <option key={st.id} value={st.id}>
                          {isArabic ? `👤 تخصيص المبلغ بالكامل لـ (${st.fullName})` : `👤 Allocate to ${st.fullName}`}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "تاريخ السداد" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={subGroupPayDate}
                      onChange={e => setSubGroupPayDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {isArabic ? "ملاحظات الدفعة" : "Notes"}
                    </label>
                    <input
                      type="text"
                      value={subGroupPayNotes}
                      onChange={e => setSubGroupPayNotes(e.target.value)}
                      placeholder={isArabic ? "مثال: تحويل إنستاباي..." : "Payment notes..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveSubGroupForPayment(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={subGroupPayAmount <= 0}
                    className={`px-5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                      subGroupPayAmount > 0
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isArabic ? "تأكيد وتسجيل الدفعة" : "Confirm Payment"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: WhatsApp Statement Preview */}
        {showStatementModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isArabic ? "كشف حساب مالي مجمع للمشاركة عبر واتساب" : "Combined WhatsApp Financial Statement"}
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      {isArabic ? `خاص بـ ${group.name}` : `For ${group.name}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-3 flex-1 overflow-y-auto">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto text-slate-800 select-all">
                  {generateStatementText()}
                </div>
              </div>

              {/* Fast Actions Bar inside Statement Modal */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-3 border-b border-slate-100 text-xs font-bold">
                <button
                  onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                >
                  <span>🏢</span>
                  <span>{isArabic ? "واتساب أعمال" : "WA Business"}</span>
                </button>
                <button
                  onClick={() => handleSendViaWhatsAppMode("app_scheme")}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                >
                  <span>💬</span>
                  <span>{isArabic ? "واتساب عادي" : "WA Messenger"}</span>
                </button>
                {group.sharedGroupLink ? (
                  <button
                    onClick={() => handleSendViaWhatsAppMode("group_link")}
                    className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center gap-1.5 transition col-span-2 sm:col-span-1"
                  >
                    <span>🔗</span>
                    <span>{isArabic ? "الجروب المشترك" : "Group Link"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendViaWhatsAppMode("web")}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center gap-1.5 transition col-span-2 sm:col-span-1"
                  >
                    <span>🌐</span>
                    <span>{isArabic ? "واتساب ويب" : "WA Web"}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 gap-2">
                <button
                  onClick={handleCopyStatement}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                >
                  {copiedStatement ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStatement ? (isArabic ? "تم النسخ!" : "Copied!") : (isArabic ? "نسخ النص" : "Copy")}</span>
                </button>

                <button
                  onClick={() => handleOpenWhatsAppChooser(generateStatementText(), isArabic ? `كشف حساب مالي - ${group.name}` : `Statement - ${group.name}`)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? "جميع خيارات الإرسال..." : "All Options..."}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Option WhatsApp Chooser Modal */}
        {showWhatsAppChooserModal && (
          <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isArabic ? "خيارات الإرسال والمشاركة عبر واتساب" : "WhatsApp Sending Options"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {pendingWhatsAppTitle || group.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWhatsAppChooserModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notice & Recipient info */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">{isArabic ? "الملف المجمع:" : "File:"}</span>
                  <span className="font-bold text-slate-900">{group.name}</span>
                </div>
                {effectiveParentContact && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">{isArabic ? "رقم ولي الأمر:" : "Contact:"}</span>
                    <span className="font-mono font-bold text-emerald-700 dir-ltr">{effectiveParentContact}</span>
                  </div>
                )}
                {group.sharedGroupLink && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">{isArabic ? "الجروب المشترك:" : "Shared Group:"}</span>
                    <a
                      href={group.sharedGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>{isArabic ? "رابط مسجل" : "Registered"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Sending Mode Choices */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-700">
                  {isArabic ? "اختر التطبيق أو الطريقة التي تفضل الإرسال بها:" : "Choose application or sending mode:"}
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1: WhatsApp Business */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                    className="p-3 rounded-2xl bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 text-right transition flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black shrink-0 group-hover:scale-105 transition">
                        🏢
                      </div>
                      <div>
                        <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{isArabic ? "واتساب للأعمال (WhatsApp Business)" : "WhatsApp Business"}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-bold">
                            {isArabic ? "تطبيق الأعمال" : "Business"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {isArabic ? "فتح المحادثة مباشرة في تطبيق واتساب للأعمال" : "Open conversation directly in WhatsApp Business app"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className={`w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition ${isArabic ? "" : "rotate-180"}`} />
                  </button>

                  {/* Option 2: WhatsApp Messenger Standard */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("app_scheme")}
                    className="p-3 rounded-2xl bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 text-right transition flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black shrink-0 group-hover:scale-105 transition">
                        💬
                      </div>
                      <div>
                        <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{isArabic ? "واتساب العادي (WhatsApp Messenger)" : "Standard WhatsApp Messenger"}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold">
                            {isArabic ? "التطبيق العادي" : "Regular"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {isArabic ? "فتح المحادثة مباشرة في تطبيق الواتساب العادي" : "Open conversation in standard WhatsApp app"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className={`w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition ${isArabic ? "" : "rotate-180"}`} />
                  </button>

                  {/* Option 3: Shared Group Link (if available) */}
                  {group.sharedGroupLink && (
                    <button
                      type="button"
                      onClick={() => handleSendViaWhatsAppMode("group_link")}
                      className="p-3 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 text-right transition flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-black shrink-0 group-hover:scale-105 transition">
                          🔗
                        </div>
                        <div>
                          <div className="font-black text-xs text-indigo-950 flex items-center gap-1.5">
                            <span>{isArabic ? "إرسال إلى الجروب المشترك مباشرة" : "Send to Shared Group"}</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 text-[9.5px] font-bold">
                              {isArabic ? "جروب الطلاب" : "Group"}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-indigo-700 mt-0.5">
                            {isArabic ? "نسخ كشف الحساب وفتح رابط الجروب فوراً للصقه" : "Copy statement and open shared group URL"}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-indigo-600" />
                    </button>
                  )}

                  {/* Option 4: WhatsApp Web */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("web")}
                    className="p-3 rounded-2xl bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 text-right transition flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-black shrink-0 group-hover:scale-105 transition">
                        🌐
                      </div>
                      <div>
                        <div className="font-black text-xs text-slate-900">
                          {isArabic ? "واتساب ويب بالمتصفح (WhatsApp Web)" : "WhatsApp Web Browser"}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {isArabic ? "مناسب لأجهزة الكمبيوتر واللابتوب" : "Best for Desktop & Laptop browsers"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 transition ${isArabic ? "" : "rotate-180"}`} />
                  </button>

                  {/* Option 5: Mobile Share Sheet */}
                  <button
                    type="button"
                    onClick={() => handleSendViaWhatsAppMode("intent_android")}
                    className="p-3 rounded-2xl bg-white hover:bg-purple-50/80 border border-slate-200 hover:border-purple-300 text-right transition flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-black shrink-0 group-hover:scale-105 transition">
                        📱
                      </div>
                      <div>
                        <div className="font-black text-xs text-slate-900">
                          {isArabic ? "مشاركة عبر نافذة الهاتف (Share Sheet)" : "Smartphone Share Menu"}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {isArabic ? "تتيح لك اختيار أي تطبيق مثبت على هاتفك" : "Select any installed app on your mobile device"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className={`w-4 h-4 text-slate-400 group-hover:text-purple-600 transition ${isArabic ? "" : "rotate-180"}`} />
                  </button>
                </div>
              </div>

              {/* Bottom Quick Copy Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(pendingWhatsAppText || generateStatementText());
                      setCopiedStatement(true);
                      setTimeout(() => setCopiedStatement(false), 2500);
                    } catch (e) {}
                  }}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  {copiedStatement ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStatement ? (isArabic ? "تم نسخ النص كاملاً للحافظة!" : "Text Copied!") : (isArabic ? "نسخ النص كاملاً للحافظة" : "Copy Full Text")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Direct Edit Merged Student Profile & Subjects (تعديل بيانات الطالب داخل الملف المجمع) */}
        {editingStudent && (
          <div className="fixed inset-0 z-[85] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      {isArabic ? `تعديل بيانات الطالب (${editingStudent.fullName})` : `Edit Student Profile: ${editingStudent.fullName}`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isArabic
                        ? `طالب مدمج داخل الملف المجمع: ${group.name}`
                        : `Merged student inside group: ${group.name}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEditStudentDirectly} className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
                {/* Section 1: Basic Information */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isArabic ? "البيانات الأساسية ومعلومات التواصل" : "Basic Information & Contact"}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "اسم الطالب بالكامل *" : "Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "رقم ولي الأمر (واتساب) *" : "Parent WhatsApp Number *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={editParentContact}
                        onChange={e => setEditParentContact(e.target.value)}
                        placeholder="+201000000000"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "رقم هاتف الطالب (اختياري)" : "Student Phone (Optional)"}
                      </label>
                      <input
                        type="text"
                        value={editStudentPhone}
                        onChange={e => setEditStudentPhone(e.target.value)}
                        placeholder="+201000000000"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "كود / رقم قيد الطالب" : "Student ID / Code"}
                      </label>
                      <input
                        type="text"
                        value={editStudentNumber}
                        onChange={e => setEditStudentNumber(e.target.value)}
                        placeholder="مثال: 1042"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "الصف الدراسي" : "Academic Grade"}
                      </label>
                      <select
                        value={editAcademicYear}
                        onChange={e => setEditAcademicYear(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">{isArabic ? "-- اختر الصف الدراسي --" : "-- Select Grade --"}</option>
                        {COMMON_GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "المنهج الدراسي" : "Curriculum"}
                      </label>
                      <select
                        value={editCurriculum}
                        onChange={e => setEditCurriculum(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">{isArabic ? "-- اختر المنهج الدراسي --" : "-- Select Curriculum --"}</option>
                        {COMMON_CURRICULUMS.map(c => (
                          <option key={c.label} value={c.label}>{c.flag} {c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "حالة الطالب" : "Student Status"}
                      </label>
                      <select
                        value={editStudentStatus}
                        onChange={e => setEditStudentStatus(e.target.value as StudentStatus)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="active">🟢 {isArabic ? "نشط ومستمر" : "Active"}</option>
                        <option value="stopped">🔴 {isArabic ? "متوقف مؤقتاً" : "Stopped / Inactive"}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {isArabic ? "رابط جروب الواتساب الخاص بالطالب" : "Student WhatsApp Group Link"}
                      </label>
                      <input
                        type="url"
                        value={editWhatsappGroupLink}
                        onChange={e => setEditWhatsappGroupLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Subjects & Pricing Plans */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isArabic ? "المواد والاشتراكات وأسعار الحصص" : "Subjects & Tuition Rates"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEditSubjectField}
                      className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition flex items-center gap-1 border border-indigo-200"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isArabic ? "+ إضافة مادة أخرى" : "+ Add Subject"}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editStudentSubjects.map((sub, sIdx) => (
                      <div
                        key={sub.id || sIdx}
                        className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-indigo-950 text-xs flex items-center gap-1">
                            <span>📚 {isArabic ? `المادة ${sIdx + 1}` : `Subject ${sIdx + 1}`}</span>
                          </span>

                          {editStudentSubjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditSubjectField(sIdx)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition"
                              title={isArabic ? "حذف هذه المادة" : "Remove"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Subject Name */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                              {isArabic ? "اسم المادة *" : "Subject Name *"}
                            </label>
                            <input
                              type="text"
                              required
                              value={sub.subject}
                              onChange={e => handleUpdateEditSubjectField(sIdx, { subject: e.target.value })}
                              placeholder={isArabic ? "مثال: الرياضيات" : "e.g., Math"}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                            {/* Suggestions */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {COMMON_SUBJECT_SUGGESTIONS.slice(0, 4).map(sugg => (
                                <button
                                  key={sugg}
                                  type="button"
                                  onClick={() => handleUpdateEditSubjectField(sIdx, { subject: sugg })}
                                  className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-200/80 hover:bg-indigo-100 text-slate-700 transition"
                                >
                                  {sugg}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Study Type */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                              {isArabic ? "نوع الدراسة" : "Study Type"}
                            </label>
                            <select
                              value={sub.studyType}
                              onChange={e => handleUpdateEditSubjectField(sIdx, { studyType: e.target.value as any })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="private">👤 {isArabic ? "درس خاص (فردي)" : "Private (1-on-1)"}</option>
                              <option value="group">👥 {isArabic ? "مجموعة (سنتر / جماعي)" : "Group"}</option>
                            </select>
                          </div>

                          {/* Billing Type */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                              {isArabic ? "نظام المحاسبة" : "Billing Mode"}
                            </label>
                            <select
                              value={sub.billingType || "monthly"}
                              onChange={e => handleUpdateEditSubjectField(sIdx, { billingType: e.target.value as any })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="monthly">📅 {isArabic ? "اشتراك شهري كامل" : "Full Monthly"}</option>
                              <option value="per_lesson">💵 {isArabic ? "محاسبة بالحصة المنفذة" : "Per Lesson"}</option>
                              <option value="monthly_elapsed_lessons">🗓️ {isArabic ? "حصص الشهر المنقضية" : "Elapsed Lessons"}</option>
                              <option value="monthly_fixed_lessons">🎯 {isArabic ? "باقة حصص شهرية محددة" : "Fixed Lessons Package"}</option>
                            </select>
                          </div>
                        </div>

                        {/* Pricing inputs */}
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                                {isArabic ? "سعر الشهر الكامل (ج.م)" : "Monthly Cost"}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={sub.monthlyCost || 0}
                                onChange={e => {
                                  const mCost = parseFloat(e.target.value) || 0;
                                  const count = sub.lessonsPerMonth || 4;
                                  const lCost = Math.max(0, Number((mCost / count).toFixed(2)));
                                  handleUpdateEditSubjectField(sIdx, {
                                    monthlyCost: mCost,
                                    lessonCost: (sub.billingType === "monthly" || sub.billingType === "monthly_fixed_lessons" || !sub.billingType) ? lCost : sub.lessonCost
                                  });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                                {isArabic ? "سعر الحصة (ج.م)" : "Lesson Cost"}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={sub.lessonCost}
                                onChange={e => {
                                  const lCost = parseFloat(e.target.value) || 0;
                                  const count = sub.lessonsPerMonth || 4;
                                  handleUpdateEditSubjectField(sIdx, {
                                    lessonCost: lCost,
                                    monthlyCost: sub.billingType === "monthly_fixed_lessons" ? Number((lCost * count).toFixed(2)) : sub.monthlyCost
                                  });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                                {isArabic ? "الحصص شهرياً" : "Lessons / Month"}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={sub.lessonsPerMonth || 4}
                                onChange={e => {
                                  const count = Math.max(1, Number(e.target.value) || 1);
                                  const mCost = sub.monthlyCost || 0;
                                  const lCost = mCost > 0 ? Math.max(0, Number((mCost / count).toFixed(2))) : sub.lessonCost;
                                  handleUpdateEditSubjectField(sIdx, {
                                    lessonsPerMonth: count,
                                    lessonCost: (sub.billingType === "monthly" || sub.billingType === "monthly_fixed_lessons") && mCost > 0 ? lCost : sub.lessonCost
                                  });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                                {isArabic ? "مدة الحصة (دقيقة)" : "Duration (min)"}
                              </label>
                              <input
                                type="number"
                                min="15"
                                value={sub.defaultDurationMinutes || 60}
                                onChange={e => handleUpdateEditSubjectField(sIdx, { defaultDurationMinutes: Number(e.target.value) || 60 })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {(sub.monthlyCost && sub.monthlyCost > 0 && sub.lessonsPerMonth && sub.lessonsPerMonth > 0) && (
                            <div className="flex items-center justify-between gap-2 bg-indigo-50/70 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs">
                              <span className="font-bold text-indigo-900 text-[11px]">
                                {isArabic ? "➗ ناتج تقسيم سعر الشهر على عدد الحصص:" : "Monthly Split Rate:"}
                              </span>
                              <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-[11px]">
                                = {Number((sub.monthlyCost / sub.lessonsPerMonth).toFixed(2))} {isArabic ? "ج.م / حصة" : "EGP / lesson"} ({sub.monthlyCost} ÷ {sub.lessonsPerMonth})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    {isArabic ? "ملاحظات إضافية عن الطالب" : "Additional Notes"}
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder={isArabic ? "أي ملاحظات خاصة بالطالب أو الاتفاق المالي..." : "Any special instructions or notes..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isArabic ? "حفظ وتحديث بيانات الطالب" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
