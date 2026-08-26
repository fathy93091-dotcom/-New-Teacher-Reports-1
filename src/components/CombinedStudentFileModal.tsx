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
  Send
} from "lucide-react";
import {
  CombinedStudentGroup,
  Student,
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

  // Navigation Tabs inside Combined File: "overview" | "student_profile" | "manage"
  const [activeTab, setActiveTab] = useState<"overview" | "student_profile" | "manage">("overview");

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
                          min="1"
                          value={groupPaymentAmount || ""}
                          onChange={e => setGroupPaymentAmount(Number(e.target.value))}
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
                            <div className="flex items-center justify-center gap-1">
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStudentForPersonalReport(activeStudent)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isArabic ? "صفحة التقرير الشخصي المستقلة" : "Personal Report View"}</span>
                  </button>

                  {onOpenEditStudentModal && (
                    <button
                      onClick={() => onOpenEditStudentModal(activeStudent)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isArabic ? "تعديل البيانات" : "Edit"}</span>
                    </button>
                  )}
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
                            min="1"
                            value={singlePayAmount || ""}
                            onChange={e => setSinglePayAmount(Number(e.target.value))}
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

        {/* TAB 3: MANAGE GROUP MEMBERS & SETTINGS */}
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
                      <span>{isArabic ? "فك التجميع وإخراجه" : "Unlink Student"}</span>
                    </button>
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
      </div>
    </div>
  );
};
