import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  Layers,
  Sparkles,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  FileText,
  CreditCard,
  X,
  History,
  Check,
  Share2,
  Copy,
  LayoutGrid,
  List,
  Target,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  PieChart,
  Info,
  Calendar,
  Printer
} from "lucide-react";
import { Student, PaymentTransaction, SubjectPaymentAllocation, AppSettings, AttendanceRecord, GeneratedReport, Group, PrivateLesson, CombinedStudentGroup } from "../types";
import {
  calculateStudentFinancialProfile,
  calculateTotalExpectedMonthlyRevenue,
  buildCentralTransactionsLog,
  StudentFinancialProfile,
  FinancialStatusType,
  CentralTransactionItem,
  ExpectedMonthlyRevenueSummary,
  SubjectFinancialItem
} from "../lib/financeEngine";
import { formatHoursHuman, generateStudentStatementWhatsAppMessage, calculateCombinedGroupFinancials, CombinedGroupFinancialSummary } from "../lib/financeUtils";

interface FinanceViewProps {
  settings: AppSettings;
  students: Student[];
  combinedStudentGroups?: CombinedStudentGroup[];
  groups?: Group[];
  privateLessons?: PrivateLesson[];
  attendanceRecords?: AttendanceRecord[];
  paymentTransactions: PaymentTransaction[];
  reports?: GeneratedReport[];
  onRecordPayment: (
    studentId: string,
    amount: number,
    notes?: string,
    date?: string,
    subjectAllocations?: SubjectPaymentAllocation[],
    targetSubject?: string
  ) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  settings,
  students = [],
  combinedStudentGroups = [],
  groups = [],
  privateLessons = [],
  attendanceRecords = [],
  paymentTransactions = [],
  reports = [],
  onRecordPayment
}) => {
  const isArabic = settings.preferredLanguage === "ar";

  // Navigation Sub-tab: "students" (قائمة الطلاب وبطاقاتهم) | "transactions" (سجل المعاملات المركزي)
  const [mainSection, setMainSection] = useState<"students" | "transactions">("students");
  const [financeLayout, setFinanceLayout] = useState<"grid" | "table">("grid");
  const [showExpectedRevenueBreakdown, setShowExpectedRevenueBreakdown] = useState<boolean>(false);

  // Filter for Student Financial Status
  const [statusFilter, setStatusFilter] = useState<"all" | FinancialStatusType>("all");
  const [billingTypeFilter, setBillingTypeFilter] = useState<"all" | "per_lesson" | "monthly" | "monthly_elapsed_lessons" | "monthly_fixed_lessons">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Month Selection State
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(now.getMonth());
  const [showAccountingGuide, setShowAccountingGuide] = useState<boolean>(false);

  // Modals
  // 1. Record Payment Modal
  const [paymentModalStudent, setPaymentModalStudent] = useState<StudentFinancialProfile | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [allocationMode, setAllocationMode] = useState<"per_subject" | "single_subject" | "general">("per_subject");
  const [subjectAllocationsMap, setSubjectAllocationsMap] = useState<Record<string, number>>({});
  const [selectedSingleSubject, setSelectedSingleSubject] = useState<string>("");

  // 2. Student Statement Modal (كشف حساب الطالب)
  const [statementModalProfile, setStatementModalProfile] = useState<StudentFinancialProfile | null>(null);
  const [copiedStatementId, setCopiedStatementId] = useState<string | null>(null);

  // Compute target Date for month filter
  const selectedTargetDate = useMemo(() => {
    return new Date(selectedYear, selectedMonthIndex, 1);
  }, [selectedYear, selectedMonthIndex]);

  const selectedMonthStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;
  }, [selectedYear, selectedMonthIndex]);

  // Compute all profiles with schedule & groups/private lessons info
  const allProfiles = useMemo(() => {
    return students
      .filter(s => s.status === "active")
      .map(s => calculateStudentFinancialProfile(s, attendanceRecords, paymentTransactions, groups, privateLessons, reports));
  }, [students, attendanceRecords, paymentTransactions, groups, privateLessons, reports]);

  // Expected Monthly Revenue Summary calculation based on student schedules and billing systems for selected month
  const expectedMonthlySummary = useMemo<ExpectedMonthlyRevenueSummary>(() => {
    return calculateTotalExpectedMonthlyRevenue(
      students,
      groups,
      privateLessons,
      paymentTransactions,
      attendanceRecords,
      selectedTargetDate
    );
  }, [students, groups, privateLessons, paymentTransactions, attendanceRecords, selectedTargetDate]);

  // 1. إيرادات الشهر المحدد (Cash Payments recorded in selected month)
  const monthRevenue = useMemo(() => {
    return paymentTransactions
      .filter(pt => pt.date && pt.date.startsWith(selectedMonthStr))
      .reduce((sum, pt) => sum + pt.amount, 0);
  }, [paymentTransactions, selectedMonthStr]);

  // Total All-Time Revenue
  const totalRevenue = useMemo(() => {
    return paymentTransactions.reduce((sum, pt) => sum + pt.amount, 0);
  }, [paymentTransactions]);

  // 2. إجمالي المستحقات (Total Amount Due across all students)
  const totalAmountDue = useMemo(() => {
    return allProfiles.reduce((sum, p) => sum + p.amountDue, 0);
  }, [allProfiles]);

  // 3. إجمالي الأرصدة المتبقية (Total Credit Balances)
  const totalCreditRemaining = useMemo(() => {
    return allProfiles.reduce((sum, p) => sum + p.creditRemaining, 0);
  }, [allProfiles]);

  // 4. عدد الحصص المنفذة (Total Attended Lessons executed)
  const totalAttendedLessonsCount = useMemo(() => {
    return allProfiles.reduce((sum, p) => sum + p.attendedLessonsCount, 0);
  }, [allProfiles]);

  // 5. إجمالي الساعات المنفذة (Total Taught Hours)
  const totalTaughtHours = useMemo(() => {
    return Number(allProfiles.reduce((sum, p) => sum + (p.totalTaughtHours || 0), 0).toFixed(1));
  }, [allProfiles]);

  // Monthly vs Per Lesson count
  const monthlyStudentsCount = useMemo(() => {
    return allProfiles.filter(p => p.isMonthly).length;
  }, [allProfiles]);

  // Central Transactions Log
  const centralTransactions = useMemo(() => {
    return buildCentralTransactionsLog(paymentTransactions, attendanceRecords, students);
  }, [paymentTransactions, attendanceRecords, students]);

  // Filtered Students
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(profile => {
      // Billing Type filter
      if (billingTypeFilter !== "all") {
        if (billingTypeFilter === "monthly" && profile.billingType !== "monthly") return false;
        if (billingTypeFilter === "per_lesson" && profile.billingType !== "per_lesson") return false;
        if (billingTypeFilter === "monthly_elapsed_lessons" && profile.billingType !== "monthly_elapsed_lessons") return false;
        if (billingTypeFilter === "monthly_fixed_lessons" && profile.billingType !== "monthly_fixed_lessons") return false;
      }
      // Status filter
      if (statusFilter !== "all" && profile.status.type !== statusFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = profile.fullName.toLowerCase().includes(q);
        const matchesSubject = profile.subjectName.toLowerCase().includes(q);
        const matchesPhone = profile.student.parentContact?.toLowerCase().includes(q);
        if (!matchesName && !matchesSubject && !matchesPhone) return false;
      }
      return true;
    });
  }, [allProfiles, statusFilter, billingTypeFilter, searchQuery]);

  // Handle Opening Payment Modal
  const handleOpenPayment = (profile: StudentFinancialProfile) => {
    setPaymentModalStudent(profile);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");

    const hasMultiSubjects = profile.subjectBreakdown && profile.subjectBreakdown.length > 1;
    if (hasMultiSubjects) {
      setAllocationMode("per_subject");
      const initMap: Record<string, number> = {};
      let total = 0;
      profile.subjectBreakdown!.forEach(sub => {
        const subDue = Math.max(0, sub.amountDue);
        initMap[sub.subjectId || sub.subjectName] = subDue;
        total += subDue;
      });
      if (total === 0) {
        profile.subjectBreakdown!.forEach(sub => {
          const defaultVal = sub.isMonthly ? sub.monthlyCost : sub.lessonCost;
          initMap[sub.subjectId || sub.subjectName] = defaultVal;
          total += defaultVal;
        });
      }
      setSubjectAllocationsMap(initMap);
      setAmount(total);
      setSelectedSingleSubject(profile.subjectBreakdown![0].subjectId || profile.subjectBreakdown![0].subjectName);
    } else {
      setAllocationMode("general");
      setSubjectAllocationsMap({});
      if (profile.amountDue > 0) {
        setAmount(profile.amountDue);
      } else {
        setAmount(profile.isMonthly ? (profile.monthlyCost || 400) : (profile.lessonCost || 100));
      }
      setSelectedSingleSubject("");
    }
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalStudent) return;

    const hasMultiSubjects = paymentModalStudent.subjectBreakdown && paymentModalStudent.subjectBreakdown.length > 1;

    if (hasMultiSubjects && allocationMode === "per_subject") {
      const allocations: SubjectPaymentAllocation[] = [];
      let calculatedTotal = 0;

      paymentModalStudent.subjectBreakdown!.forEach(sub => {
        const key = sub.subjectId || sub.subjectName;
        const subAmt = Number(subjectAllocationsMap[key]) || 0;
        if (subAmt > 0) {
          allocations.push({
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            amount: subAmt
          });
          calculatedTotal += subAmt;
        }
      });

      if (calculatedTotal <= 0) return;

      onRecordPayment(
        paymentModalStudent.studentId,
        calculatedTotal,
        paymentNotes.trim() ? paymentNotes.trim() : undefined,
        paymentDate,
        allocations
      );
    } else if (hasMultiSubjects && allocationMode === "single_subject") {
      if (amount <= 0) return;
      const targetSub = paymentModalStudent.subjectBreakdown?.find(
        s => s.subjectId === selectedSingleSubject || s.subjectName === selectedSingleSubject
      );
      const subName = targetSub ? targetSub.subjectName : selectedSingleSubject;
      const allocations: SubjectPaymentAllocation[] = [
        {
          subjectId: targetSub?.subjectId,
          subjectName: subName,
          amount: amount
        }
      ];

      onRecordPayment(
        paymentModalStudent.studentId,
        amount,
        paymentNotes.trim() ? paymentNotes.trim() : undefined,
        paymentDate,
        allocations,
        subName
      );
    } else {
      if (amount <= 0) return;
      onRecordPayment(
        paymentModalStudent.studentId,
        amount,
        paymentNotes.trim() ? paymentNotes.trim() : undefined,
        paymentDate
      );
    }

    setPaymentModalStudent(null);
  };

  const handleCopyStatement = (profile: StudentFinancialProfile) => {
    const text = generateStudentStatementWhatsAppMessage({
      studentName: profile.fullName,
      subjectName: profile.subjectName,
      studyTypeLabel: profile.studyTypeLabel,
      totalTaughtHours: profile.totalTaughtHours,
      totalAttendedLessons: profile.attendedLessonsCount,
      totalAccruedCost: profile.attendedLessonsCost,
      totalPaidAmount: profile.totalPaidAmount,
      amountDue: profile.amountDue,
      creditRemaining: profile.creditRemaining,
      isMonthly: profile.isMonthly,
      billedMonthsCount: profile.billedMonthsCount,
      monthlyCost: profile.monthlyCost,
      subjectsBreakdown: profile.subjectBreakdown?.map(s => ({
        subjectName: s.subjectName,
        totalTaughtHours: s.totalTaughtHours,
        attendedCount: s.attendedCount,
        accruedCost: s.accruedCost,
        paidAmount: s.paidAmount,
        amountDue: s.amountDue
      })),
      recentAttendance: profile.attendanceHistory.slice(0, 10).map(ar => ({
        lessonNumber: ar.lessonNumber,
        date: ar.date,
        durationMinutes: ar.durationMinutes,
        subject: ar.subject
      }))
    }, isArabic);

    navigator.clipboard.writeText(text);
    setCopiedStatementId(profile.studentId);
    setTimeout(() => setCopiedStatementId(null), 2500);
  };

  const handleShareStatementWhatsApp = (profile: StudentFinancialProfile) => {
    const text = generateStudentStatementWhatsAppMessage({
      studentName: profile.fullName,
      subjectName: profile.subjectName,
      studyTypeLabel: profile.studyTypeLabel,
      totalTaughtHours: profile.totalTaughtHours,
      totalAttendedLessons: profile.attendedLessonsCount,
      totalAccruedCost: profile.attendedLessonsCost,
      totalPaidAmount: profile.totalPaidAmount,
      amountDue: profile.amountDue,
      creditRemaining: profile.creditRemaining,
      isMonthly: profile.isMonthly,
      billedMonthsCount: profile.billedMonthsCount,
      monthlyCost: profile.monthlyCost,
      subjectsBreakdown: profile.subjectBreakdown?.map(s => ({
        subjectName: s.subjectName,
        totalTaughtHours: s.totalTaughtHours,
        attendedCount: s.attendedCount,
        accruedCost: s.accruedCost,
        paidAmount: s.paidAmount,
        amountDue: s.amountDue
      })),
      recentAttendance: profile.attendanceHistory.slice(0, 10).map(ar => ({
        lessonNumber: ar.lessonNumber,
        date: ar.date,
        durationMinutes: ar.durationMinutes,
        subject: ar.subject
      }))
    }, isArabic);

    const rawContact = profile.student?.parentContact || "";
    const cleanPhone = rawContact.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner & Month Picker */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-600/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-xl font-black text-slate-900">
              {isArabic ? "الحسابات والتحصيل المالي الموحد" : "Unified Financial Ledger & Collections"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {isArabic ? "معايير IFRS المحاسبية" : "IFRS Compliant"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
            {isArabic
              ? "متابعة دقيقة للتحصيل النقدي الفعلي، الإيراد المحقق بالحصة، والاشتراكات الشهرية دون تكرار أو افتراضات غير دقيقة."
              : "Accurate tracking of cash collections, recognized revenue per lesson, and flat subscriptions."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Month & Year Filter Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                setSelectedMonthIndex(now.getMonth());
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                selectedYear === now.getFullYear() && selectedMonthIndex === now.getMonth()
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {isArabic ? "الشهر الحالي" : "Current Month"}
            </button>

            <select
              value={selectedMonthIndex}
              onChange={e => setSelectedMonthIndex(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              {[
                "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
              ].map((mName, idx) => (
                <option key={idx} value={idx}>
                  {isArabic ? mName : new Date(2026, idx, 1).toLocaleString("en-US", { month: "short" })}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Section Tabs Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setMainSection("students")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                mainSection === "students"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isArabic ? "حسابات الطلاب" : "Student Balances"}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection("transactions")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                mainSection === "transactions"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>{isArabic ? "سجل المعاملات" : "Transactions Log"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Financial Summary Cards (5 Professional KPIs aligned with Accounting Standards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* KPI 1: إجمالي المتوقع لهذا الشهر */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-800 truncate">
              {isArabic ? "الإيراد المتوقع للشهر" : "Target Expected Revenue"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-600 truncate">
            {(expectedMonthlySummary?.totalExpectedRevenue ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>{expectedMonthlySummary?.activeStudentsCount ?? 0} {isArabic ? "طالب نشط" : "students"}</span>
            <span className="text-emerald-700 font-bold">{expectedMonthlySummary?.totalExpectedLessons ?? 0} {isArabic ? "حصة متوقعة" : "lessons"}</span>
          </div>
        </div>

        {/* KPI 2: التحصيل الفعلي النقدي هذا الشهر */}
        <div className="bg-white border border-blue-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-800 truncate">
              {isArabic ? "التحصيل الفعلي النقدي" : "Cash Collected"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-blue-600 truncate">
            {(monthRevenue ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-blue-700">{isArabic ? "مقبوضات نقية هذا الشهر" : "Net Cash Collected"}</span>
            <span className="text-blue-600 font-bold">{expectedMonthlySummary?.overallCollectionPercent ?? 0}% {isArabic ? "تحصيل" : "rate"}</span>
          </div>
        </div>

        {/* KPI 3: الإيراد المحقق الفعلي (Accrued Earned Revenue) */}
        <div className="bg-white border border-indigo-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-800 truncate">
              {isArabic ? "الإيراد المحقق (المنفذ)" : "Recognized Revenue"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-indigo-600 truncate">
            {(expectedMonthlySummary?.totalEarnedRevenueThisMonth ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>{isArabic ? "قيمة الحصص المنفذة" : "Delivered Services"}</span>
            <span className="text-indigo-700 font-bold">{expectedMonthlySummary?.totalAttendedThisMonth ?? 0} {isArabic ? "حصة حضور" : "attended"}</span>
          </div>
        </div>

        {/* KPI 4: إجمالي المستحقات المطلوبة (Receivables Due) */}
        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700 truncate">
              {isArabic ? "إجمالي المستحقات المطلوبة" : "Receivables Due"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-rose-600 truncate">
            {(totalAmountDue ?? 0).toLocaleString()} <span className="text-xs font-normal text-rose-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">
            {isArabic
              ? `مستحق على ${allProfiles.filter(p => p.amountDue > 0).length} طالب`
              : `Due from ${allProfiles.filter(p => p.amountDue > 0).length} students`}
          </p>
        </div>

        {/* KPI 5: الأرصدة المتبقية الفائضة (Prepaid Credit) */}
        <div className="bg-white border border-sky-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-sky-700 truncate">
              {isArabic ? "الأرصدة المدفوعة مقدماً" : "Prepaid Credit"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-sky-700 truncate">
            {(totalCreditRemaining ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-sky-700 font-semibold mt-1">
            {isArabic ? "رصيد دائن مدفوع مقدماً" : "Prepaid credit on account"}
          </p>
        </div>
      </div>

      {/* Accounting Standard Banner Toggle */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {isArabic ? "دليل المعايير المحاسبية المعتمدة في النظام (IFRS 15)" : "Educational Platform Accounting Standard (IFRS 15)"}
              </h4>
              <p className="text-[10px] text-slate-400">
                {isArabic ? "كيف يتم حساب مستحقات وإيرادات الطلاب بالحصة وبالاشتراك الشهري؟" : "How student balances and revenues are recognized accurately"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAccountingGuide(!showAccountingGuide)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
          >
            <span>{showAccountingGuide ? (isArabic ? "إخفاء التفاصيل" : "Hide Details") : (isArabic ? "عرض المعايير" : "View Rules")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAccountingGuide ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showAccountingGuide && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <h5 className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                <span>🎯</span>
                <span>{isArabic ? "نظام الحصة / الباقات (Accrual Basis)" : "Per Lesson / Packages"}</span>
              </h5>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isArabic
                  ? "يتم الاعتراف بالالتزام أو الإيراد بناءً على الحصص المنفذة فعلياً فقط. انقضاء الأشهر التقويمية لا يُنشئ أي ديون أو تكرارات وهمية على الطلاب بالحصة."
                  : "Revenue and debt are accrued strictly upon actual lesson delivery. Calendar months never generate false recurring charges."}
              </p>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <h5 className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                <span>📅</span>
                <span>{isArabic ? "الاشتراك الشهري (Subscription Basis)" : "Monthly Subscription"}</span>
              </h5>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isArabic
                  ? "للطلاب على نظام الاشتراك الشهري الثابت، يحسب الاشتراك عن كل شهر تقويمي مقيد فيه الطالب كقيمة محددة مسبقاً."
                  : "For flat monthly subscription students, fixed monthly fee is billed per enrolled calendar month."}
              </p>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <h5 className="font-bold text-purple-400 mb-1 flex items-center gap-1">
                <span>💵</span>
                <span>{isArabic ? "التحصيل الفعلي النقدي (Cash Flow)" : "Actual Cash Flow"}</span>
              </h5>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isArabic
                  ? "خانه التحصيل الفعلي تحسب المبالغ النقدية التي تم قبضها وإدخالها للخزينة خلال الشهر المحدد دون خلط مع الإيرادات المتوقعة."
                  : "Actual collection displays net payments received in the register during the chosen month."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Section 1: قائمة الطلاب وبطاقاتهم المالية */}
      {mainSection === "students" && (
        <div className="space-y-3">
          {/* Controls: Search + Status Filter Pills + View Layout Toggle */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "بحث باسم الطالب أو المادة أو الهاتف..." : "Search by student, subject..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                    statusFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isArabic ? "الكل" : "All"} ({allProfiles.length})
                </button>

                {/* 🔴 مستحق عليه */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("balance_due")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === "balance_due"
                      ? "bg-rose-600 text-white shadow-xs shadow-rose-600/20"
                      : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100/70"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>{isArabic ? "مستحق" : "Due"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.amountDue > 0).length})
                  </span>
                </button>

                {/* 🟢 رصيد متبقي */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("available_credit")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === "available_credit"
                      ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>{isArabic ? "رصيد فائض" : "Credit"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.creditRemaining > 0).length})
                  </span>
                </button>

                {/* 🟢 مسدد بالكامل */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("settled")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === "settled"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{isArabic ? "مسدد" : "Settled"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.status.type === "settled").length})
                  </span>
                </button>
              </div>

              {/* View Layout Toggle: Grid / Table */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setFinanceLayout("grid")}
                  title={isArabic ? "عرض البطاقات الشبكية" : "Grid Cards View"}
                  className={`p-1.5 rounded-lg transition ${
                    financeLayout === "grid"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceLayout("table")}
                  title={isArabic ? "عرض الجدول المحاسبي" : "Table View"}
                  className={`p-1.5 rounded-lg transition ${
                    financeLayout === "table"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Student Cards Grid OR Table */}
          {filteredProfiles.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-slate-700">
                {isArabic ? "لا يوجد طلاب مطابقون للبحث أو الفلتر المحدد." : "No matching students found."}
              </p>
            </div>
          ) : financeLayout === "table" ? (
            /* Table View */
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{isArabic ? "الطالب" : "Student"}</th>
                      <th className="py-2.5 px-3">{isArabic ? "المادة" : "Subject"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "الحالة المالية" : "Status"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "المتوقع هذا الشهر" : "Expected / Mo"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "سعر الحصة / الساعة" : "Rate"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "الحصص والساعات" : "Lessons & Hours"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "إجمالي القيمة" : "Total Cost"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "المستحق / الرصيد" : "Due / Credit"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfiles.map((profile, idx) => {
                      const isDue = profile.amountDue > 0;
                      const isCredit = profile.creditRemaining > 0;

                      return (
                        <tr
                          key={profile.studentId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDue ? "bg-rose-50/20" : isCredit ? "bg-emerald-50/15" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-black text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{profile.fullName}</span>
                              {profile.student.parentContact && (
                                <a
                                  href={`https://wa.me/${profile.student.parentContact.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={isArabic ? "مراسلة واتساب" : "WhatsApp"}
                                  className="text-emerald-600 hover:text-emerald-700 inline-flex"
                                >
                                  <Share2 className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10.5px]">
                                {profile.subjectName}
                              </span>
                              {profile.isMonthly ? (
                                <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded text-[9.5px]">
                                  📅 {isArabic ? "شهري" : "Monthly"}
                                </span>
                              ) : profile.rateType === "per_hour" ? (
                                <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded text-[9.5px]">
                                  ⏱️ {isArabic ? "بالساعة" : "Per Hour"}
                                </span>
                              ) : (
                                <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[9.5px]">
                                  🎟️ {isArabic ? "بالحصة" : "Per Lesson"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${profile.status.badgeBg}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${profile.status.dotColor}`}></span>
                              <span>{isArabic ? profile.status.labelAr : profile.status.labelEn}</span>
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center bg-emerald-50/30">
                            <div className="leading-tight">
                              <span className="font-black text-emerald-700 text-xs">
                                {profile.expectedRevenueInfo?.expectedRevenue || (profile.isMonthly ? profile.monthlyCost : profile.lessonCost * 4)} <span className="text-[10px] font-normal">{isArabic ? "ج.م" : "EGP"}</span>
                              </span>
                              <span className="text-[9.5px] text-slate-500 block">
                                {profile.expectedRevenueInfo?.expectedLessonsCount || 4} {isArabic ? "حصة متوقعة" : "lessons"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                            {profile.isMonthly ? (
                              <span>
                                {profile.monthlyCost} <span className="text-[10px] text-purple-600">{isArabic ? "ج.م/شهر" : "EGP/mo"}</span>
                              </span>
                            ) : profile.rateType === "per_hour" ? (
                              <div className="leading-tight">
                                <span className="font-bold text-slate-800">
                                  {profile.hourlyCost} <span className="text-[10px] text-sky-600 font-semibold">{isArabic ? "ج.م/س" : "EGP/hr"}</span>
                                </span>
                                <span className="text-[9.5px] text-slate-400 block font-normal">
                                  ({profile.lessonCost} {isArabic ? "ج.م/ح" : "EGP/lss"})
                                </span>
                              </div>
                            ) : (
                              <span>
                                {profile.lessonCost} <span className="text-[10px] text-slate-400">{isArabic ? "ج.م/حصة" : "EGP/lss"}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {profile.isMonthly ? (
                              <div className="leading-tight">
                                <span className="font-black text-purple-700">{profile.billedMonthsCount} {isArabic ? "شهر" : "mo"}</span>
                                <span className="text-[9.5px] text-slate-400 block font-normal">
                                  ({profile.attendedLessonsCount} {isArabic ? "حصة" : "lss"} • {profile.totalTaughtHours} {isArabic ? "س" : "hrs"})
                                </span>
                              </div>
                            ) : (
                              <div className="leading-tight">
                                <span className="font-black text-blue-700">
                                  {profile.attendedLessonsCount} {isArabic ? "حصة" : "lss"}
                                </span>
                                <span className="text-[10px] text-sky-700 block font-semibold">
                                  {profile.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-700">
                            {profile.attendedLessonsCost} <span className="text-[10px] text-slate-400">{isArabic ? "ج.م" : "EGP"}</span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-700">
                            {profile.totalPaidAmount} <span className="text-[10px] text-slate-400">{isArabic ? "ج.م" : "EGP"}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md inline-block ${
                                isDue
                                  ? "bg-rose-100 text-rose-800"
                                  : isCredit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isDue
                                ? `${profile.amountDue} ${isArabic ? "ج.م مستحق" : "Due"}`
                                : isCredit
                                ? `+${profile.creditRemaining} ${isArabic ? "ج.م رصيد" : "Credit"}`
                                : (isArabic ? "مسدد بالكامل" : "Settled")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setStatementModalProfile(profile)}
                                title={isArabic ? "كشف حساب مفصل" : "Account Statement"}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(profile)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isArabic ? "تسجيل دفعة" : "Pay"}</span>
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
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProfiles.map(profile => {
                const isDue = profile.amountDue > 0;
                const isCredit = profile.creditRemaining > 0;

                return (
                  <div
                    key={profile.studentId}
                    className={`rounded-2xl border transition p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs ${
                      isDue
                        ? "bg-rose-50/30 border-rose-200"
                        : isCredit
                        ? "bg-emerald-50/20 border-emerald-200/80"
                        : "bg-white border-slate-200/90"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                            {profile.fullName}
                          </h3>
                          {profile.student.parentContact && (
                            <a
                              href={`https://wa.me/${profile.student.parentContact.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={isArabic ? "مراسلة ولي الأمر على واتساب" : "WhatsApp Parent"}
                              className="text-emerald-600 hover:text-emerald-700 inline-flex"
                            >
                              <Share2 className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10.5px] flex-wrap">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {profile.subjectName}
                          </span>
                          {profile.isMonthly ? (
                            <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                              📅 {isArabic ? "اشتراك شهري" : "Monthly Plan"}
                            </span>
                          ) : profile.rateType === "per_hour" ? (
                            <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                              ⏱️ {isArabic ? "سعر الساعة" : "Per Hour"}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              🎟️ {isArabic ? "سعر الحصة" : "Per Lesson"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${profile.status.badgeBg} shrink-0`}
                      >
                        <span className={`w-1 h-1 rounded-full ${profile.status.dotColor}`}></span>
                        <span>{isArabic ? profile.status.labelAr : profile.status.labelEn}</span>
                      </span>
                    </div>

                    {/* Financial Metrics Grid - Crisp & Clean */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 block">
                          {profile.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                        </span>
                        <span className="text-xs font-black text-blue-700 block">
                          {profile.isMonthly ? `${profile.billedMonthsCount} شهر` : `${profile.attendedLessonsCount} حصة • ${profile.totalTaughtHours} س`}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">
                          {profile.attendedLessonsCost} ج.م
                        </span>
                      </div>

                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 block">
                          {isArabic ? "إجمالي المسدد" : "Paid"}
                        </span>
                        <span className="text-xs font-black text-emerald-600 block">
                          {profile.totalPaidAmount} <span className="text-[9px] font-normal">{isArabic ? "ج.م" : "EGP"}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {profile.isMonthly ? (isArabic ? "شهري" : "Monthly") : `${profile.lessonCost} ج.م/ح`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 block">
                          {isDue ? (isArabic ? "المستحق" : "Due") : (isArabic ? "الرصيد الفائض" : "Credit")}
                        </span>
                        <span className={`text-xs font-black block ${isDue ? "text-rose-600" : isCredit ? "text-emerald-700" : "text-slate-700"}`}>
                          {isDue ? `${profile.amountDue} ج.م` : isCredit ? `+${profile.creditRemaining} ج.م` : (isArabic ? "مسدد" : "Settled")}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStatementModalProfile(profile)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isArabic ? "كشف حساب" : "Statement"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPayment(profile)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs text-white shadow-xs transition flex items-center gap-1 ${
                          isDue
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isArabic ? "تسجيل دفعة" : "Record Payment"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Section 2: سجل المعاملات المركزي */}
      {mainSection === "transactions" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>{isArabic ? "سجل المعاملات والمدفوعات المركزي" : "Central Transactions Ledger"}</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {isArabic
                  ? "سجل محاسبي موحد يعرض كافة عمليات التحصيل المسددة وتفاصيل الحصص المنفذة المسجلة بالحضور."
                  : "Complete chronological log of all payments collected and lessons attended."}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
              {centralTransactions.length} {isArabic ? "معاملة" : "entries"}
            </span>
          </div>

          {centralTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-600">
                {isArabic ? "لا توجد حركات مالية أو حصص حضور مسجلة حتى الآن." : "No transactions recorded yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {centralTransactions.map(item => {
                const isPayment = item.type === "payment";

                return (
                  <div
                    key={item.id}
                    className={`py-3 px-2 sm:px-3 flex items-center justify-between gap-3 text-xs transition hover:bg-slate-50/80 rounded-xl ${
                      isPayment ? "bg-emerald-50/15" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isPayment ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isPayment ? <DollarSign className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 truncate">{item.studentName}</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                            {item.subjectName}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium mt-0.5 truncate">
                          {isArabic ? item.descriptionAr : item.descriptionEn}
                          {item.notes && <span className="text-slate-400"> • {item.notes}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span
                        className={`font-black text-xs sm:text-sm block ${
                          isPayment ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {isPayment ? `+${item.amount}` : `${item.amount}`} {isArabic ? "ج.م" : "EGP"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: كشف حساب الطالب المفصل (Statement Modal) */}
      {statementModalProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl animate-in fade-in my-6 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shadow-2xs">
                  {statementModalProfile.fullName ? statementModalProfile.fullName.charAt(0) : "ط"}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    {isArabic ? `كشف حساب: ${statementModalProfile.fullName}` : `Statement: ${statementModalProfile.fullName}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {statementModalProfile.subjectName} • {statementModalProfile.studyTypeLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyStatement(statementModalProfile)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                  title={isArabic ? "نسخ كشف الحساب" : "Copy Statement"}
                >
                  {copiedStatementId === statementModalProfile.studentId ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="hidden sm:inline">{copiedStatementId === statementModalProfile.studentId ? (isArabic ? "تم النسخ" : "Copied") : (isArabic ? "نسخ" : "Copy")}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                  title={isArabic ? "طباعة كشف الحساب / حفظ PDF" : "Print Statement / Save PDF"}
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">{isArabic ? "طباعة" : "Print"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareStatementWhatsApp(statementModalProfile)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                  title={isArabic ? "إرسال كشف الحساب لواتساب ولي الأمر" : "Share Statement via WhatsApp"}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{isArabic ? "واتساب" : "WhatsApp"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatementModalProfile(null)}
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
                    {statementModalProfile.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                  </span>
                  <span className="text-sm font-black text-blue-700 my-0.5">
                    {statementModalProfile.isMonthly ? `${statementModalProfile.billedMonthsCount} شهر` : `${statementModalProfile.attendedLessonsCount} حصة`}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block">({statementModalProfile.attendedLessonsCost} ج.م)</span>
                </div>

                {/* FEATURE: عدد الساعات التي درسها */}
                <div className="bg-gradient-to-b from-sky-50/60 to-white p-2.5 rounded-xl border border-sky-200/80 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] font-black text-sky-800 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-sky-600" />
                    <span>{isArabic ? "عدد الساعات التي درسها" : "Hours Studied"}</span>
                  </span>
                  <span className="text-sm font-black text-sky-700 my-0.5">
                    {statementModalProfile.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 block truncate" title={formatHoursHuman(statementModalProfile.totalTaughtHours, isArabic)}>
                    {formatHoursHuman(statementModalProfile.totalTaughtHours, isArabic)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "إجمالي المدفوع" : "Paid"}</span>
                  <span className="text-sm font-black text-emerald-600 my-0.5">{statementModalProfile.totalPaidAmount} ج.م</span>
                  <span className="text-[9.5px] text-slate-400 block">{statementModalProfile.paymentHistory.length} {isArabic ? "دفعات" : "payments"}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {statementModalProfile.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due") : (isArabic ? "الرصيد المتبقي" : "Credit")}
                  </span>
                  <span
                    className={`text-sm font-black my-0.5 ${
                      statementModalProfile.amountDue > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {statementModalProfile.amountDue > 0
                      ? `${statementModalProfile.amountDue} ج.م`
                      : `+${statementModalProfile.creditRemaining} ج.م`}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block">
                    {statementModalProfile.amountDue > 0 ? (isArabic ? "مطلوب سداده" : "Due balance") : (isArabic ? "رصيد دائن" : "Surplus")}
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
                        ⏱️ {statementModalProfile.totalTaughtHours} {isArabic ? "ساعة درسها" : "hours studied"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {isArabic
                        ? `درس الطالب ما مجموعه (${formatHoursHuman(statementModalProfile.totalTaughtHours, true)}) بما يعادل ${Math.round((statementModalProfile.totalTaughtHours || 0) * 60)} دقيقة موزعة على ${statementModalProfile.attendedLessonsCount} حصة حضور فعلية.`
                        : `The student completed (${formatHoursHuman(statementModalProfile.totalTaughtHours, false)}) totaling ${Math.round((statementModalProfile.totalTaughtHours || 0) * 60)} minutes across ${statementModalProfile.attendedLessonsCount} attended lessons.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleShareStatementWhatsApp(statementModalProfile)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1.5 self-end sm:self-auto shrink-0 transition"
                  title={isArabic ? "إرسال كشف الحساب وتفاصيل الساعات عبر واتساب" : "Share via WhatsApp"}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? "إرسال بالواتساب" : "Send WhatsApp"}</span>
                </button>
              </div>

              {/* Expected Monthly Revenue Box */}
              {statementModalProfile.expectedRevenueInfo && (
                <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 block">
                        {isArabic ? "الإيراد المتوقع لهذا الشهر من هذا الطالب:" : "Expected Revenue This Month:"}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {statementModalProfile.expectedRevenueInfo.scheduleDescription}
                      </span>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-sm font-black text-emerald-700 block">
                      {(statementModalProfile.expectedRevenueInfo.expectedRevenue ?? 0).toLocaleString()} {isArabic ? "ج.م" : "EGP"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {statementModalProfile.expectedRevenueInfo.expectedLessonsCount ?? 0} {isArabic ? "حصة متوقعة" : "lessons"}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Explanation */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800 text-xs font-semibold">
                {isArabic ? statementModalProfile.explanationAr : statementModalProfile.explanationEn}
              </div>

            {/* Billing Plan Info Notice if monthly */}
              {statementModalProfile.isMonthly && (
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-medium flex items-start gap-2">
                  <span className="text-sm shrink-0">📅</span>
                  <div>
                    <span className="font-bold block">نظام الاشتراك الشهري الكامل:</span>
                    <span>قيمة الاشتراك الثابتة هي {statementModalProfile.monthlyCost} ج.م لكل شهر، ويتم احتساب الشهر كاملاً سواء حضر الطالب جميع الحصص أو بعضها. يتم تسجيل الحضور للتقييم الأكاديمي والتربوي.</span>
                  </div>
                </div>
              )}

              {/* Subject Breakdown if student is enrolled in multiple subjects */}
              {statementModalProfile.subjectBreakdown && statementModalProfile.subjectBreakdown.length > 1 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isArabic ? "تفصيل الحساب المالي وساعات الدراسة لكل مادة:" : "Financial & Hours Breakdown by Subject:"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {statementModalProfile.subjectBreakdown.map(sub => (
                      <div
                        key={sub.subjectId || sub.subjectName}
                        className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-black">
                          <span className="text-slate-900">{sub.subjectName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                            {sub.studyTypeLabel}
                          </span>
                        </div>

                        {/* ساعات دراسة المادة */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 bg-sky-50/80 px-2 py-1 rounded-lg border border-sky-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-600" />
                            <span>{isArabic ? "عدد الساعات التي درسها:" : "Hours Studied:"}</span>
                          </span>
                          <span className="font-black text-sky-900">
                            {sub.totalTaughtHours} {isArabic ? "ساعة" : "hrs"} ({sub.attendedCount} {isArabic ? "حصة" : "lss"})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{isArabic ? "المحسوب:" : "Accrued:"} {sub.attendedCost} ج.م</span>
                          <span>{isArabic ? "المسدد:" : "Paid:"} {sub.paidAmount} ج.م</span>
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

                {statementModalProfile.paymentHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                    {isArabic ? "لم تسجل أي دفعات بعد." : "No payments recorded."}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {statementModalProfile.paymentHistory.map(pt => (
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
                      {statementModalProfile.isMonthly
                        ? (isArabic ? "سجل الحضور التربوي والأكاديمي:" : "Attendance History (Educational):")
                        : (isArabic ? "سجل الحصص المنفذة وساعات التدريس:" : "Attended Lessons & Hours History:")}
                    </span>
                  </h4>
                  <span className="text-[10px] font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/70">
                    ⏱️ {statementModalProfile.totalTaughtHours} {isArabic ? "ساعة درسها" : "hours studied"}
                  </span>
                </div>

                {statementModalProfile.attendanceHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                    {isArabic ? "لا توجد حصص مسجلة بالحضور حتى الآن." : "No attended lessons recorded."}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {statementModalProfile.attendanceHistory.map((ar, aIdx) => {
                      let arDur = ar.durationMinutes;
                      if (!arDur && ar.lessonDuration) {
                        const m = ar.lessonDuration.match(/(\d+)/);
                        if (m) arDur = parseInt(m[1], 10);
                      }
                      if (!arDur) arDur = statementModalProfile.defaultDurationMinutes || 60;

                      const itemDeduction = statementModalProfile.rateType === "per_hour"
                        ? Number(((statementModalProfile.hourlyCost * arDur) / 60).toFixed(2))
                        : statementModalProfile.lessonCost;

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
                              <p className="font-bold text-slate-800">{ar.subject || statementModalProfile.subjectName}</p>
                              <p className="text-[10px] text-slate-400">{ar.teacherNotes || (ar.attendance === "present" ? "حضور مؤكد" : "غياب مع احتساب الحصة")}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-slate-900 block">
                              {statementModalProfile.isMonthly ? (isArabic ? "حضور" : "Attended") : `-${itemDeduction} ج.م`}
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
                  onClick={() => setStatementModalProfile(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition"
                >
                  {isArabic ? "إغلاق" : "Close"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyStatement(statementModalProfile)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedStatementId === statementModalProfile.studentId ? (
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
                  onClick={handlePrintStatement}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                  title={isArabic ? "طباعة كشف الحساب / حفظ PDF" : "Print Statement / Save PDF"}
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isArabic ? "طباعة الكشف" : "Print"}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShareStatementWhatsApp(statementModalProfile)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? "مشاركة عبر واتساب" : "Share via WhatsApp"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = statementModalProfile;
                    setStatementModalProfile(null);
                    handleOpenPayment(p);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? "تسجيل دفعة" : "Pay"}</span>
                </button>
              </div>
            </div>

            {/* Official Printable Statement Voucher for @media print */}
            <div id="student-statement-printable" className="hidden print:block text-slate-900 bg-white font-sans text-xs" dir={isArabic ? "rtl" : "ltr"}>
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
                  <span className="font-black text-sm text-slate-900">{statementModalProfile.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">{isArabic ? "المادة الدراسية:" : "Subject:"}</span>
                  <span className="font-bold text-slate-800">{statementModalProfile.subjectName} ({statementModalProfile.studyTypeLabel})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">{isArabic ? "حالة الحساب:" : "Account Status:"}</span>
                  <span className={`font-black ${statementModalProfile.amountDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {isArabic ? statementModalProfile.status.labelAr : statementModalProfile.status.labelEn}
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
                      ? `أتم الطالب ما مجموعه (${formatHoursHuman(statementModalProfile.totalTaughtHours, true)}) بما يعادل ${Math.round((statementModalProfile.totalTaughtHours || 0) * 60)} دقيقة تدريس فعلي موزعة على ${statementModalProfile.attendedLessonsCount} حصة حضور مسجلة.`
                      : `The student completed (${formatHoursHuman(statementModalProfile.totalTaughtHours, false)}) totaling ${Math.round((statementModalProfile.totalTaughtHours || 0) * 60)} minutes across ${statementModalProfile.attendedLessonsCount} attended lessons.`}
                  </p>
                </div>
                <div className="text-left font-black text-xl text-sky-900 bg-white px-3 py-1.5 rounded-lg border border-sky-300 shrink-0">
                  {statementModalProfile.totalTaughtHours} {isArabic ? "ساعة" : "hrs"}
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-4 gap-2 mb-3.5 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {statementModalProfile.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                  </span>
                  <span className="text-sm font-black text-blue-900 block mt-0.5">
                    {statementModalProfile.isMonthly ? `${statementModalProfile.billedMonthsCount} شهر` : `${statementModalProfile.attendedLessonsCount} حصة`}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block">{isArabic ? "إجمالي التكلفة" : "Accrued Cost"}</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">{statementModalProfile.attendedLessonsCost} ج.م</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block">{isArabic ? "إجمالي المسدد" : "Total Paid"}</span>
                  <span className="text-sm font-black text-emerald-800 block mt-0.5">{statementModalProfile.totalPaidAmount} ج.م</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {statementModalProfile.amountDue > 0 ? (isArabic ? "المستحق للسداد" : "Due Balance") : (isArabic ? "الرصيد الفائض" : "Credit Balance")}
                  </span>
                  <span className={`text-sm font-black block mt-0.5 ${statementModalProfile.amountDue > 0 ? "text-rose-700" : "text-emerald-800"}`}>
                    {statementModalProfile.amountDue > 0 ? `${statementModalProfile.amountDue} ج.م` : `+${statementModalProfile.creditRemaining} ج.م`}
                  </span>
                </div>
              </div>

              {/* Multi-Subject Breakdown Table if exists */}
              {statementModalProfile.subjectBreakdown && statementModalProfile.subjectBreakdown.length > 1 && (
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
                      {statementModalProfile.subjectBreakdown.map((s, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="p-1.5 border-r border-slate-300 font-bold">{s.subjectName} ({s.studyTypeLabel})</td>
                          <td className="p-1.5 border-r border-slate-300 text-center font-black text-sky-900">⏱️ {s.totalTaughtHours} ساعة</td>
                          <td className="p-1.5 border-r border-slate-300 text-center">{s.attendedCount} حصة</td>
                          <td className="p-1.5 border-r border-slate-300 text-center font-mono">{s.accruedCost} ج.م</td>
                          <td className="p-1.5 border-r border-slate-300 text-center font-mono text-emerald-800">{s.paidAmount} ج.م</td>
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
                  {isArabic ? `سجل الحصص المنفذة وساعات التدريس الفعلي (${statementModalProfile.attendedLessonsCount} حصة • ${statementModalProfile.totalTaughtHours} ساعة):` : `Attended Lessons & Hours Log:`}
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
                    {statementModalProfile.attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-slate-400">لا توجد حصص مسجلة بالحضور بعد.</td>
                      </tr>
                    ) : (
                      statementModalProfile.attendanceHistory.map((ar, idx) => {
                        let dur = ar.durationMinutes;
                        if (!dur && ar.lessonDuration) {
                          const m = ar.lessonDuration.match(/(\d+)/);
                          if (m) dur = parseInt(m[1], 10);
                        }
                        if (!dur) dur = statementModalProfile.defaultDurationMinutes || 60;

                        const itemDeduction = statementModalProfile.rateType === "per_hour"
                          ? Number(((statementModalProfile.hourlyCost * dur) / 60).toFixed(2))
                          : statementModalProfile.lessonCost;

                        return (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold">{ar.lessonNumber || (idx + 1)}</td>
                            <td className="p-1.5 border-r border-slate-300 font-mono">{ar.date}</td>
                            <td className="p-1.5 border-r border-slate-300 font-bold">{ar.subject || statementModalProfile.subjectName}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-black text-sky-900">
                              ⏱️ {dur} دقيقة ({formatHoursHuman(dur / 60, isArabic)})
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                              {statementModalProfile.isMonthly ? "حضور" : `${itemDeduction} ج.م`}
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
                    {statementModalProfile.paymentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-slate-400">لم تسجل دفعات بعد.</td>
                      </tr>
                    ) : (
                      statementModalProfile.paymentHistory.map((pt, idx) => (
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
      )}

      {/* Modal: تسجيل دفعة مالية (Unified Payment Record Modal) */}
      {paymentModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `تسجيل دفعة: ${paymentModalStudent.fullName}` : `Record Payment: ${paymentModalStudent.fullName}`}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {paymentModalStudent.subjectName} • {paymentModalStudent.studyTypeLabel}
                </p>
              </div>

              {paymentModalStudent.isMonthly ? (
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
                  {paymentModalStudent.monthlyCost} {isArabic ? "ج.م/شهر" : "EGP/mo"}
                </span>
              ) : (
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                  {paymentModalStudent.lessonCost} {isArabic ? "ج.م/حصة" : "EGP/ls"}
                </span>
              )}
            </div>

            {/* Quick Status Box */}
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">
                  {paymentModalStudent.isMonthly
                    ? (isArabic ? "الشهور المحتسبة حتى الآن:" : "Billed Months:")
                    : (isArabic ? "الحصص المنفذة حتى الآن:" : "Lessons Attended:")}
                </span>
                <span className="text-blue-800 font-black">
                  {paymentModalStudent.isMonthly
                    ? `${paymentModalStudent.billedMonthsCount} شهر (${paymentModalStudent.attendedLessonsCost} ج.م)`
                    : `${paymentModalStudent.attendedLessonsCount} حصة (${paymentModalStudent.attendedLessonsCost} ج.م)`}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">{isArabic ? "إجمالي المسدد سابقاً:" : "Total Paid Previously:"}</span>
                <span className="text-emerald-700 font-black">{paymentModalStudent.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}</span>
              </div>
              {paymentModalStudent.amountDue > 0 && (
                <div className="flex items-center justify-between font-black text-rose-700 pt-1.5 border-t border-blue-200/60">
                  <span>{isArabic ? "المستحق المطلوب سداده:" : "Due Amount:"}</span>
                  <span className="text-sm">{paymentModalStudent.amountDue} {isArabic ? "ج.م" : "EGP"}</span>
                </div>
              )}
            </div>

            {/* Multi-subject allocation mode toggle */}
            {paymentModalStudent.subjectBreakdown && paymentModalStudent.subjectBreakdown.length > 1 && (
              <div className="mb-3 space-y-2">
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode("per_subject");
                      let sum = 0;
                      paymentModalStudent.subjectBreakdown!.forEach(sub => {
                        sum += Number(subjectAllocationsMap[sub.subjectId || sub.subjectName]) || 0;
                      });
                      setAmount(sum);
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition text-center ${
                      allocationMode === "per_subject"
                        ? "bg-white text-emerald-700 font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isArabic ? "🔀 توزيع للمواد" : "Per Subject"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode("single_subject")}
                    className={`flex-1 py-1.5 rounded-lg transition text-center ${
                      allocationMode === "single_subject"
                        ? "bg-white text-blue-700 font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isArabic ? "🎯 مادة واحدة" : "Single Subject"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode("general")}
                    className={`flex-1 py-1.5 rounded-lg transition text-center ${
                      allocationMode === "general"
                        ? "bg-white text-slate-900 font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isArabic ? "⚡ سداد عام" : "General"}
                  </button>
                </div>

                {paymentModalStudent.amountDue > 0 && allocationMode === "per_subject" && (
                  <button
                    type="button"
                    onClick={() => {
                      const newMap: Record<string, number> = {};
                      paymentModalStudent.subjectBreakdown!.forEach(sub => {
                        newMap[sub.subjectId || sub.subjectName] = Math.max(0, sub.amountDue);
                      });
                      setSubjectAllocationsMap(newMap);
                      setAmount(paymentModalStudent.amountDue);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition flex items-center justify-between"
                  >
                    <span>{isArabic ? "⚡ تعبئة كامل المستحق تلقائياً لكل مادة:" : "Fill all dues:"}</span>
                    <span className="font-black bg-emerald-200/80 px-2 py-0.5 rounded-lg text-emerald-900">
                      {paymentModalStudent.amountDue} {isArabic ? "ج.م" : "EGP"}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Unified Form: Amount + Date + Optional Notes */}
            <form onSubmit={handleSubmitPayment} className="space-y-3.5 text-xs">
              {/* Conditional Amount Fields depending on allocationMode */}
              {paymentModalStudent.subjectBreakdown && paymentModalStudent.subjectBreakdown.length > 1 && allocationMode === "per_subject" ? (
                <div className="space-y-2">
                  <label className="block font-black text-slate-700">
                    {isArabic ? "حدد المبلغ المسدد لكل مادة:" : "Amount for each subject:"}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {paymentModalStudent.subjectBreakdown.map(sub => {
                      const key = sub.subjectId || sub.subjectName;
                      const curVal = subjectAllocationsMap[key] ?? 0;
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900">{sub.subjectName}</span>
                              <span className="text-[10px] text-slate-500 font-medium">({sub.studyTypeLabel})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {sub.amountDue > 0 ? (
                                <span className="text-rose-700 font-black">
                                  {isArabic ? `مستحق: ${sub.amountDue} ج.م` : `Due: ${sub.amountDue} EGP`}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  {isArabic ? "مسدد" : "Paid"}
                                </span>
                              )}
                              {sub.amountDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubjectAllocationsMap(prev => {
                                      const next = { ...prev, [key]: sub.amountDue };
                                      let sum = 0;
                                      paymentModalStudent.subjectBreakdown!.forEach(s => {
                                        const k = s.subjectId || s.subjectName;
                                        sum += k === key ? sub.amountDue : (Number(next[k]) || 0);
                                      });
                                      setAmount(sum);
                                      return next;
                                    });
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black hover:bg-emerald-200 text-[10px]"
                                >
                                  {isArabic ? "سداد المستحق" : "Pay Due"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={curVal === 0 ? "" : curVal}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setSubjectAllocationsMap(prev => {
                                  const next = { ...prev, [key]: val };
                                  let sum = 0;
                                  paymentModalStudent.subjectBreakdown!.forEach(s => {
                                    const k = s.subjectId || s.subjectName;
                                    sum += Number(next[k]) || 0;
                                  });
                                  setAmount(sum);
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
                    <span className="text-sm text-emerald-700">{amount} {isArabic ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
              ) : paymentModalStudent.subjectBreakdown && paymentModalStudent.subjectBreakdown.length > 1 && allocationMode === "single_subject" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isArabic ? "اختر المادة المراد تسجيل السداد لها:" : "Select Subject:"}
                    </label>
                    <select
                      value={selectedSingleSubject}
                      onChange={e => {
                        const sel = e.target.value;
                        setSelectedSingleSubject(sel);
                        const matched = paymentModalStudent.subjectBreakdown?.find(
                          s => s.subjectId === sel || s.subjectName === sel
                        );
                        if (matched) {
                          setAmount(matched.amountDue > 0 ? matched.amountDue : (matched.isMonthly ? matched.monthlyCost : matched.lessonCost));
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:outline-none focus:border-blue-500"
                    >
                      {paymentModalStudent.subjectBreakdown.map(sub => (
                        <option key={sub.subjectId || sub.subjectName} value={sub.subjectId || sub.subjectName}>
                          {sub.subjectName} ({sub.studyTypeLabel}) - {sub.amountDue > 0 ? (isArabic ? `مستحق ${sub.amountDue} ج.م` : `Due ${sub.amountDue}`) : (isArabic ? "مسدد" : "Paid")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      {isArabic ? "المبلغ المدفوع لهذه المادة (ج.م):" : "Amount Paid for this subject (EGP):"}
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={amount}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-lg text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                      placeholder="100"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    {isArabic ? "المبلغ المدفوع (بالجنيه المصري):" : "Amount Paid (EGP):"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-lg text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="100"
                  />
                </div>
              )}

              {/* 2. التاريخ */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "تاريخ الدفعة:" : "Payment Date:"}
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* 3. ملاحظات اختيارية */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات الدفعة (اختياري):" : "Payment Notes (Optional):"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={isArabic ? "كاش، فودافون كاش، إنستاباي، تحويل بنكي..." : "e.g. Cash, bank transfer..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isArabic ? "حفظ وتأكيد السداد" : "Save Payment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
