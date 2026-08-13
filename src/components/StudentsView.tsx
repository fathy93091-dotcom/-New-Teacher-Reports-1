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
  Layers
} from "lucide-react";
import {
  Student,
  AttendanceRecord,
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
  onGenerateReportAi
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "stopped">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Student for Profile View
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<"finance" | "attendance" | "reports">("reports");

  // AI Report State inside Student Profile
  const [showCreateReportForm, setShowCreateReportForm] = useState(false);
  const [newTeacherNotes, setNewTeacherNotes] = useState("");
  const [newAiInstructions, setNewAiInstructions] = useState("");
  const [newGeneratedReportText, setNewGeneratedReportText] = useState("");
  const [reportAttachment, setReportAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [whatsappSentNotice, setWhatsappSentNotice] = useState("");
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);

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

  // Add Student Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [parentContact, setParentContact] = useState("+20");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [studyType, setStudyType] = useState<"group" | "private">("private");
  const [subject, setSubject] = useState("الرياضيات");
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>("monthly");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("beginning_of_month");
  const [initialPurchasedLessons, setInitialPurchasedLessons] = useState(8);
  const [initialLessonCost, setInitialLessonCost] = useState(100);
  const [notes, setNotes] = useState("");

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
  const [editParentContact, setEditParentContact] = useState("+20");
  const [editWhatsappGroupLink, setEditWhatsappGroupLink] = useState("");
  const [editStudyType, setEditStudyType] = useState<"group" | "private">("private");
  const [editSubject, setEditSubject] = useState("الرياضيات");
  const [editSubscriptionType, setEditSubscriptionType] = useState<SubscriptionType>("monthly");
  const [editPaymentPlan, setEditPaymentPlan] = useState<PaymentPlan>("beginning_of_month");
  const [editLessonCost, setEditLessonCost] = useState(100);
  const [editNotes, setEditNotes] = useState("");

  const handleOpenEditStudent = (st: Student) => {
    setEditFullName(st.fullName || "");
    setEditStudentNumber(st.studentNumber || "");
    setEditParentContact(st.parentContact || "+20");
    setEditWhatsappGroupLink(st.whatsappGroupLink || "");
    setEditStudyType(st.studyType || "private");
    setEditSubject(st.subject || "الرياضيات");
    setEditSubscriptionType(st.subscriptionType || "monthly");
    setEditPaymentPlan(st.paymentPlan || "beginning_of_month");
    setEditLessonCost(st.lessonCost || 100);
    setEditNotes(st.notes || "");
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editFullName.trim()) return;

    const updatedData: Partial<Student> = {
      fullName: editFullName.trim(),
      studentNumber: editStudentNumber.trim() || undefined,
      parentContact: editParentContact.trim(),
      whatsappGroupLink: editWhatsappGroupLink.trim() || undefined,
      studyType: editStudyType,
      subject: editSubject,
      subscriptionType: editSubscriptionType,
      paymentPlan: editPaymentPlan,
      lessonCost: editLessonCost,
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        (s.parentContact && s.parentContact.includes(q))
      );
    }
    return true;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const isLessonsCount = subscriptionType === "lessons_count";
    const purchasedLessons = Math.max(1, Number(initialPurchasedLessons) || 8);
    const cost = Math.max(1, Number(initialLessonCost) || 100);
    const initialPaid = (paymentPlan === "beginning_of_month") ? purchasedLessons * cost : 0;
    const isPaidInitially = paymentPlan === "beginning_of_month";

    onAddStudent({
      fullName,
      studentNumber,
      parentContact,
      whatsappGroupLink: whatsappGroupLink.trim() || undefined,
      studyType,
      subject,
      subscriptionType,
      paymentPlan,
      status: "active",
      paymentStatus: isPaidInitially ? "paid" : "unpaid",
      totalPaidAmount: initialPaid,
      totalPurchasedLessons: isLessonsCount ? purchasedLessons : 0,
      lessonCost: cost,
      remainingLessons: isLessonsCount ? purchasedLessons : 0,
      remainingBalance: isLessonsCount ? purchasedLessons * cost : 0,
      notes
    });

    setShowAddStudentModal(false);
    resetAddStudentForm();
  };

  const resetAddStudentForm = () => {
    setFullName("");
    setStudentNumber("");
    setParentContact("+20");
    setWhatsappGroupLink("");
    setStudyType("private");
    setSubject("الرياضيات");
    setSubscriptionType("monthly");
    setPaymentPlan("beginning_of_month");
    setInitialPurchasedLessons(8);
    setInitialLessonCost(100);
    setNotes("");
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
    <div className="space-y-6 pb-20">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isArabic ? "دليل الطلاب والمتابعة" : "Student Directory"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isArabic
              ? "متابعة مستمرة لدرجات الطلاب، الحضور والغياب، وحساب الحصص المتبقية."
              : "Manage and track student progress, attendance, and fees."}
          </p>
        </div>

        <button
          onClick={() => setShowAddStudentModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isArabic ? "إضافة طالب جديد" : "Add Student"}</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
              filterStatus === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {isArabic ? "الكل" : "All"} ({students.length})
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              filterStatus === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isArabic ? "النشطون" : "Active"}</span>
          </button>
          <button
            onClick={() => setFilterStatus("stopped")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              filterStatus === "stopped"
                ? "bg-slate-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{isArabic ? "المتوقفون" : "Stopped"}</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isArabic ? "ابحث باسم الطالب، رقم الموبايل..." : "Search by student name..."}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Student Cards Grid - Optimized for Mobile (2 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-white border border-slate-200/80 rounded-xl">
            <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
            <p className="text-xs font-bold text-slate-600">
              {isArabic ? "لا يوجد طلاب يطابقون خيارات البحث." : "No students found."}
            </p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const isStopped = student.status === "stopped";
            const finSummary = calculateStudentFinancials(student, attendanceRecords);
            const isUnpaid = !finSummary.isFullyPaid || finSummary.amountDue > 0;
            const isLowBalance = student.subscriptionType === "lessons_count" && finSummary.remainingLessons === 1;

            return (
              <div
                key={student.id}
                className={`bg-white border rounded-xl p-2.5 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isStopped ? "border-slate-200 opacity-75 bg-slate-50/60" : "border-slate-200/90 hover:border-blue-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black flex items-center gap-0.5 truncate ${
                        isStopped
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${
                          isStopped ? "bg-slate-500" : "bg-emerald-500"
                        }`}
                      />
                      <span className="truncate">{isStopped ? (isArabic ? "متوقف" : "Stopped") : (isArabic ? "نشط" : "Active")}</span>
                    </span>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black shrink-0 ${
                        finSummary.statusBadge.color === "emerald"
                          ? "bg-emerald-100 text-emerald-800"
                          : finSummary.statusBadge.color === "amber"
                          ? "bg-amber-100 text-amber-800"
                          : finSummary.statusBadge.color === "blue"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isArabic ? finSummary.statusBadge.labelAr : finSummary.statusBadge.labelEn}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-base font-black text-slate-900 truncate leading-tight">
                    {student.fullName}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-blue-600 mt-0.5">
                    <span className="truncate">{student.subject}</span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1 text-slate-600">
                    <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                      <span className="font-medium text-slate-400">{isArabic ? "الاشتراك:" : "Sub:"}</span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                        {getSubscriptionLabel(student.subscriptionType)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                      <span className="font-medium text-slate-400">{isArabic ? "الدفع:" : "Payment:"}</span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                        {getPaymentPlanLabel(student.paymentPlan)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                      <span className="font-medium text-slate-400">{isArabic ? "ولي الأمر:" : "Parent:"}</span>
                      <span className="font-mono font-bold text-slate-800 dir-ltr truncate max-w-[85px] sm:max-w-none">{student.parentContact}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                      <span className="font-medium text-slate-400">{isArabic ? "سعر الحصة:" : "Cost:"}</span>
                      <span className="font-bold text-slate-800">
                        {finSummary.lessonCost} {isArabic ? "ج.م" : "EGP"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                      <span className="font-medium text-slate-400">{isArabic ? "الحصص المنفذة:" : "Attended:"}</span>
                      <span className="font-bold text-blue-700">
                        {finSummary.totalAttendedLessons} {isArabic ? "حصة" : "lss"} ({finSummary.totalAccruedCost} ج.م)
                      </span>
                    </div>
                    {student.subscriptionType === "lessons_count" ? (
                      <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                        <span className="font-medium text-slate-400">{isArabic ? "المتبقي بالباقة:" : "Pack Rem:"}</span>
                        <span className="font-black text-emerald-700">
                          {finSummary.remainingLessons} {isArabic ? "حصة" : "lss"} ({finSummary.remainingBalance} ج.م)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[9.5px] sm:text-[11px]">
                        <span className="font-medium text-slate-400">{isArabic ? "الصافي:" : "Net:"}</span>
                        <span className={`font-black ${finSummary.amountDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                          {finSummary.amountDue > 0
                            ? `مستحق ${finSummary.amountDue} ج.م`
                            : finSummary.creditRemaining > 0
                            ? `رصيد +${finSummary.creditRemaining} ج.م`
                            : (isArabic ? "مسدد بالكامل" : "Settled")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setProfileTab("finance");
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] sm:text-xs transition shadow-2xs text-center truncate"
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
          })
        )}
      </div>

      {/* Modal: Create Student */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {isArabic ? "إضافة طالب جديد" : "Add New Student"}
              </h2>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "اسم الطالب بالكامل" : "Student Full Name"}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={isArabic ? "مثال: نوفا سميث" : "e.g. Nova Smith"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "رقم الطالب (إن وجد)" : "Student ID / Number"}
                  </label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={e => setStudentNumber(e.target.value)}
                    placeholder="STU-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "رقم ولي الأمر (واتساب)" : "Parent WhatsApp Number"}
                  </label>
                  <input
                    type="text"
                    required
                    value={parentContact}
                    onChange={e => setParentContact(e.target.value)}
                    placeholder="+201000000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "رابط جروب الواتساب لولي الأمر/الطالب (اختياري)" : "WhatsApp Group Link (Optional)"}</span>
                </label>
                <input
                  type="url"
                  value={whatsappGroupLink}
                  onChange={e => setWhatsappGroupLink(e.target.value)}
                  placeholder={isArabic ? "مثال: https://chat.whatsapp.com/..." : "e.g., https://chat.whatsapp.com/..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 text-left dir-ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "نوع الدراسة" : "Class Type"}
                  </label>
                  <select
                    value={studyType}
                    onChange={e => setStudyType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="group">👥 {isArabic ? "مجموعة" : "Group"}</option>
                    <option value="private">👤 {isArabic ? "خاص" : "Private"}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "المادة" : "Subject"}
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Subscription & Payment System Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                <div>
                  <label className="block font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{isArabic ? "نظام الاشتراك" : "Subscription System"}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubscriptionType("monthly")}
                      className={`p-2.5 rounded-xl border text-right transition font-bold ${
                        subscriptionType === "monthly"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs">📅 {isArabic ? "بالشهر (شهري)" : "Monthly"}</p>
                      <p className={`text-[10px] mt-0.5 font-normal ${subscriptionType === "monthly" ? "text-blue-100" : "text-slate-500"}`}>
                        {isArabic ? "حساب الحصص يتبين نهاية الشهر بناءً على الحضور الفعلي" : "Lessons calculated at month end"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubscriptionType("lessons_count")}
                      className={`p-2.5 rounded-xl border text-right transition font-bold ${
                        subscriptionType === "lessons_count"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs">🔢 {isArabic ? "بعدد الحصص (باقة)" : "Fixed Lessons Package"}</p>
                      <p className={`text-[10px] mt-0.5 font-normal ${subscriptionType === "lessons_count" ? "text-blue-100" : "text-slate-500"}`}>
                        {isArabic ? "تحديد عدد حصص معينة ينتهي/يجدد عند استهلاكها" : "Specific package of lessons"}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Subscription Fields for Monthly */}
                {subscriptionType === "monthly" && (
                  <div className="pt-1 border-t border-slate-200/70">
                    <label className="block font-bold text-slate-700 mb-1">
                      {isArabic ? "سعر الحصة (ج.م)" : "Lesson Cost (EGP)"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={initialLessonCost}
                      onChange={e => setInitialLessonCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="100"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {isArabic
                        ? "💡 في الاشتراك الشهري: يُحدد سعر الحصة فقط، وتُحسب المستحقات شهرياً حسب عدد الحصص الحقيقية المنفذة."
                        : "💡 Monthly plan: Set lesson cost only. Total is calculated based on completed lessons at month end."}
                    </p>
                  </div>
                )}

                {/* Subscription Fields for Fixed Lessons Package */}
                {subscriptionType === "lessons_count" && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/70">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isArabic ? "عدد حصص الباقة" : "Package Lessons"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={initialPurchasedLessons}
                        onChange={e => setInitialPurchasedLessons(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isArabic ? "سعر الحصة في الباقة (ج.م)" : "Lesson Cost in Package"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={initialLessonCost}
                        onChange={e => setInitialLessonCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/70">
                  <label className="block font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>{isArabic ? "طريقة ونظام الدفع" : "Payment System"}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("beginning_of_month")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        paymentPlan === "beginning_of_month"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🟢 {isArabic ? "أول الشهر" : "Prepaid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${paymentPlan === "beginning_of_month" ? "text-emerald-100" : "text-slate-500"}`}>
                        {isArabic ? "مقدم" : "Advance"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentPlan("end_of_month")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        paymentPlan === "end_of_month"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🟡 {isArabic ? "آخر الشهر" : "Postpaid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${paymentPlan === "end_of_month" ? "text-amber-100" : "text-slate-500"}`}>
                        {isArabic ? "مؤخر" : "End of month"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentPlan("mixed")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        paymentPlan === "mixed"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🔵 {isArabic ? "دفع مختلط" : "Hybrid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${paymentPlan === "mixed" ? "text-indigo-100" : "text-slate-500"}`}>
                        {isArabic ? "دفعات" : "Split"}
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات إضافية" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ الطالب" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Sheet: Student Full Profile View */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-3xl w-full shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{selectedStudent.fullName}</h2>
                  <p className="text-xs font-bold text-blue-600 mt-0.5">
                    {selectedStudent.subject} • {selectedStudent.parentContact}
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
                          <span className="text-[11px] font-bold text-slate-500 block">{isArabic ? "نظام الاشتراك والدفع للطالب:" : "Subscription & Payment Plan:"}</span>
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
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "سعر الحصة" : "Lesson Cost"}</p>
                          <p className="text-sm font-black text-slate-800 mt-1">
                            {finSummary.lessonCost} {isArabic ? "ج.م" : "EGP"}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500">{isArabic ? "الحصص المنفذة" : "Attended"}</p>
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
                      <span>{isArabic ? "سجل التقارير وملاحظات الذكاء الاصطناعي" : "Reports History & AI Logs"}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {isArabic
                        ? `التقارير المكتوبة وتعديلات الذكاء الاصطناعي بحسب تعليمات مادة (${selectedStudent.subject}).`
                        : `Saved reports modified by AI subject instructions.`}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowCreateReportForm(!showCreateReportForm);
                      if (!showCreateReportForm) {
                        const subjInst =
                          settings.subjectDefaults?.find(
                            s => s.subject.trim().toLowerCase() === selectedStudent.subject.trim().toLowerCase()
                          )?.instruction || settings.generalAiInstructions || "";
                        setNewAiInstructions(subjInst);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 shrink-0"
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
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                      <span className="font-black text-purple-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>{isArabic ? `إضافة تقرير جديد لـ ${selectedStudent.fullName}` : "Add New Report"}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold text-[10px]">
                        مادة: {selectedStudent.subject}
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isArabic ? "ملاحظات المعلم (ما كتبته عن الطالب بالحصة):" : "Teacher Notes:"}
                      </label>
                      <textarea
                        rows={3}
                        value={newTeacherNotes}
                        onChange={e => setNewTeacherNotes(e.target.value)}
                        placeholder={
                          isArabic
                            ? "مثال: أتقن حفظ الجزء الأول من السورة، وعنده أخطاء بسيطة في التجويد، الواجب ص 22..."
                            : "Write raw lesson notes here..."
                        }
                        className="w-full bg-white border border-purple-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-purple-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isArabic ? `تعليمات الذكاء الاصطناعي الخاصة بـ (${selectedStudent.subject}):` : "Subject AI Instructions:"}</span>
                      </label>
                      <input
                        type="text"
                        value={newAiInstructions}
                        onChange={e => setNewAiInstructions(e.target.value)}
                        placeholder={isArabic ? "توجيهات صياغة الذكاء الاصطناعي لهذه المادة..." : "AI instructions..."}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none"
                      />
                      <p className="text-[10px] text-purple-700/80 mt-1">
                        * {isArabic ? "تم جلب هذه التعليمات تلقائياً من إعدادات الذكاء الاصطناعي لمادتك." : "Auto-filled from settings."}
                      </p>
                    </div>

                    {/* Image or Document File Attachment Section */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-purple-600" />
                          <span>{isArabic ? "إرفاق صورة أو ملف (ورقة عمل / اختبار / صفحة كتاب / ملاحظات):" : "Attach Image or File:"}</span>
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
                            subject: selectedStudent.subject,
                            teacherNotes: newTeacherNotes,
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

                    {newGeneratedReportText && (
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
                              if (!newTeacherNotes.trim() && !newGeneratedReportText.trim()) return;
                              onAddReport({
                                studentId: selectedStudent.id,
                                studentName: selectedStudent.fullName,
                                subject: selectedStudent.subject,
                                date: new Date().toISOString().split("T")[0],
                                teacherNotes: newTeacherNotes,
                                aiInstructions: newAiInstructions,
                                reportText: newGeneratedReportText || newTeacherNotes,
                                generatedText: newGeneratedReportText || newTeacherNotes
                              });
                              setNewTeacherNotes("");
                              setNewGeneratedReportText("");
                              setReportAttachment(null);
                              setShowCreateReportForm(false);
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
                              navigator.clipboard.writeText(text);
                              setWhatsappSentNotice(isArabic ? "تم نسخ التقرير! توجيه للواتساب..." : "Report copied!");
                              setTimeout(() => setWhatsappSentNotice(""), 4000);

                              const link = selectedStudent.whatsappGroupLink || selectedStudent.parentContact;
                              if (link) {
                                if (link.startsWith("http")) {
                                  window.open(link, "_blank");
                                } else {
                                  const phone = link.replace(/[^0-9]/g, "");
                                  window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, "_blank");
                                }
                              } else {
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>{isArabic ? "إرسال للواتساب" : "WhatsApp"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* List of Past Reports */}
                <div className="space-y-3">
                  {(() => {
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
                        subject: selectedStudent.subject,
                        date: ar.date,
                        teacherNotes: ar.teacherNotes || "",
                        aiInstructions: ar.aiInstructions || "",
                        reportText: ar.generatedReportText || ar.teacherNotes || "",
                        generatedText: ar.generatedReportText || ar.teacherNotes || "",
                        createdAt: ar.date
                      }));

                    // Merge and deduplicate
                    const allPastReports = [...studentReports];
                    studentAttendanceReports.forEach(arRep => {
                      if (!allPastReports.some(r => r.id === arRep.id || (r.date === arRep.date && r.reportText === arRep.reportText))) {
                        allPastReports.push(arRep);
                      }
                    });

                    if (allPastReports.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">
                            {isArabic ? "لا توجد تقارير معتمدة محفوظة لهذا الطالب حتى الآن." : "No accepted reports saved for this student yet."}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {isArabic ? "اضغط على زر (كتابة تقرير جديد) أعلاه لإنشاء تقرير وصياغته بالذكاء الاصطناعي وحفظه." : "Click 'Write Report' above to generate and save one."}
                          </p>
                        </div>
                      );
                    }

                    const totalCount = allPastReports.length;

                    return allPastReports.map((rep, idx) => {
                      const finalReportContent = rep.generatedText || rep.reportText || rep.teacherNotes;
                      const isExpanded = expandedReportIds.includes(rep.id);
                      const lessonNum = totalCount - idx;

                      return (
                        <div
                          key={rep.id}
                          className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                        >
                          {/* Header - Click to toggle expansion */}
                          <div
                            onClick={() => toggleReportExpand(rep.id)}
                            className="p-3.5 bg-white hover:bg-slate-50/80 cursor-pointer transition flex items-center justify-between gap-2 select-none"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-black text-xs shrink-0 shadow-2xs">
                                {isArabic ? `الحصة #${lessonNum}` : `Lesson #${lessonNum}`}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">{rep.date}</span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-bold">
                                {rep.subject || selectedStudent.subject}
                              </span>
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
                              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-1.5 shadow-inner leading-relaxed whitespace-pre-wrap font-sans text-xs">
                                {finalReportContent}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
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
                                      navigator.clipboard.writeText(finalReportContent);
                                      setWhatsappSentNotice(isArabic ? "تم نسخ التقرير! جارٍ التوجيه للواتساب..." : "Report copied! Opening WhatsApp...");
                                      setTimeout(() => setWhatsappSentNotice(""), 4000);

                                      const link = selectedStudent.whatsappGroupLink || selectedStudent.parentContact;
                                      if (link) {
                                        if (link.startsWith("http")) {
                                          window.open(link, "_blank");
                                        } else {
                                          const phone = link.replace(/[^0-9]/g, "");
                                          window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(finalReportContent)}`, "_blank");
                                        }
                                      } else {
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(finalReportContent)}`, "_blank");
                                      }
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>{isArabic ? "إرسال بالواتساب" : "Send WhatsApp"}</span>
                                  </button>
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
                    });
                  })()}
                </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {isArabic ? "تعديل بيانات الطالب ونظام الاشتراك" : "Edit Student & Plan"}
              </h2>
              <button
                onClick={() => setShowEditStudentModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4 my-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "اسم الطالب بالكامل" : "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "رقم الطالب (اختياري)" : "Student Phone"}
                  </label>
                  <input
                    type="tel"
                    value={editStudentNumber}
                    onChange={e => setEditStudentNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "رقم ولي الأمر (للواتساب)" : "Parent Phone"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={editParentContact}
                    onChange={e => setEditParentContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono dir-ltr text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "المادة الدراسية" : "Subject"}
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "نوع الدراسة" : "Study Type"}
                  </label>
                  <select
                    value={editStudyType}
                    onChange={e => setEditStudyType(e.target.value as "group" | "private")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="private">{isArabic ? "خاص (فردي)" : "Private"}</option>
                    <option value="group">{isArabic ? "مجموعة (سنتر)" : "Group"}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editSubscriptionType === "monthly"
                      ? (isArabic ? "سعر الحصة في الشهر (ج.م)" : "Lesson Cost per Month")
                      : (isArabic ? "سعر الحصة في الباقة (ج.م)" : "Lesson Cost in Package")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editLessonCost}
                    onChange={e => setEditLessonCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Subscription & Payment Options */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div>
                  <label className="block font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{isArabic ? "نظام الاشتراك" : "Subscription System"}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSubscriptionType("monthly")}
                      className={`p-2.5 rounded-xl border text-right transition font-bold ${
                        editSubscriptionType === "monthly"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs">📅 {isArabic ? "بالشهر (شهري)" : "Monthly"}</p>
                      <p className={`text-[10px] mt-0.5 font-normal ${editSubscriptionType === "monthly" ? "text-blue-100" : "text-slate-500"}`}>
                        {isArabic ? "حساب الحصص نهاية الشهر" : "End of month calc"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditSubscriptionType("lessons_count")}
                      className={`p-2.5 rounded-xl border text-right transition font-bold ${
                        editSubscriptionType === "lessons_count"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs">🔢 {isArabic ? "بعدد الحصص (باقة)" : "Fixed Package"}</p>
                      <p className={`text-[10px] mt-0.5 font-normal ${editSubscriptionType === "lessons_count" ? "text-blue-100" : "text-slate-500"}`}>
                        {isArabic ? "تحديد باقة حصص تنتهي باستهلاكها" : "Specific package"}
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70">
                  <label className="block font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>{isArabic ? "طريقة ونظام الدفع" : "Payment System"}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentPlan("beginning_of_month")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        editPaymentPlan === "beginning_of_month"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🟢 {isArabic ? "أول الشهر" : "Prepaid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${editPaymentPlan === "beginning_of_month" ? "text-emerald-100" : "text-slate-500"}`}>
                        {isArabic ? "مقدم" : "Advance"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditPaymentPlan("end_of_month")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        editPaymentPlan === "end_of_month"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🟡 {isArabic ? "آخر الشهر" : "Postpaid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${editPaymentPlan === "end_of_month" ? "text-amber-100" : "text-slate-500"}`}>
                        {isArabic ? "مؤخر" : "Postpaid"}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditPaymentPlan("mixed")}
                      className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                        editPaymentPlan === "mixed"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[11px]">🔵 {isArabic ? "دفع مختلط" : "Hybrid"}</p>
                      <p className={`text-[9px] mt-0.5 font-normal ${editPaymentPlan === "mixed" ? "text-indigo-100" : "text-slate-500"}`}>
                        {isArabic ? "دفعات" : "Split"}
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات إضافية" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ التعديلات" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
