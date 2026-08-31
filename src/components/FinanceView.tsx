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
  LayoutGrid,
  List,
  Target,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  PieChart,
  Info,
  Calendar
} from "lucide-react";
import { Student, PaymentTransaction, SubjectPaymentAllocation, AppSettings, AttendanceRecord, Group, PrivateLesson } from "../types";
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

interface FinanceViewProps {
  settings: AppSettings;
  students: Student[];
  groups?: Group[];
  privateLessons?: PrivateLesson[];
  attendanceRecords?: AttendanceRecord[];
  paymentTransactions: PaymentTransaction[];
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
  groups = [],
  privateLessons = [],
  attendanceRecords = [],
  paymentTransactions = [],
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

  // Compute all profiles with schedule & groups/private lessons info
  const allProfiles = useMemo(() => {
    return students
      .filter(s => s.status === "active")
      .map(s => calculateStudentFinancialProfile(s, attendanceRecords, paymentTransactions, groups, privateLessons));
  }, [students, attendanceRecords, paymentTransactions, groups, privateLessons]);

  // Expected Monthly Revenue Summary calculation based on student schedules and billing systems
  const expectedMonthlySummary = useMemo<ExpectedMonthlyRevenueSummary>(() => {
    return calculateTotalExpectedMonthlyRevenue(
      students,
      groups,
      privateLessons,
      paymentTransactions,
      attendanceRecords,
      new Date()
    );
  }, [students, groups, privateLessons, paymentTransactions, attendanceRecords]);

  // Current Month Name
  const currentMonthName = useMemo(() => {
    const now = new Date();
    return now.toLocaleString(isArabic ? "ar-EG" : "en-US", { month: "long", year: "numeric" });
  }, [isArabic]);

  // KPIs
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // 1. إيرادات الشهر (Payments made in current month)
  const monthRevenue = useMemo(() => {
    return paymentTransactions
      .filter(pt => pt.date && pt.date.startsWith(currentMonthStr))
      .reduce((sum, pt) => sum + pt.amount, 0);
  }, [paymentTransactions, currentMonthStr]);

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

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-600/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-xl font-black text-slate-900">
              {isArabic ? "الحسابات والتحصيل المالي الموحد" : "Unified Financial Ledger & Collections"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {isArabic ? "نظام تحصيل مباشر" : "Direct Balance"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
            {isArabic
              ? "يتم احتساب الحالة المالية تلقائياً بناءً على إجمالي قيمة الحصص المنفذة مقارنة بإجمالي المدفوعات المسددة."
              : "Financial ledger auto-calculates total lesson value vs total payments recorded."}
          </p>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setMainSection("students")}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
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
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              mainSection === "transactions"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>{isArabic ? "سجل المعاملات والمدفوعات" : "Transactions Log"}</span>
          </button>
        </div>
      </div>

      {/* Hero: بطاقة إجمالي الإيرادات المتوقعة لهذا الشهر بناءً على جداول الطلاب ونظام الحصص */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
        {/* Background ambient lighting effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shadow-inner shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {isArabic ? "إجمالي الإيرادات المتوقعة هذا الشهر" : "Expected Monthly Revenue"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    {currentMonthName}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                  {isArabic
                    ? "محسوبة بدقة بناءً على جدول مواعيد الحصص الأسبوعية ونظام محاسبة كل طالب (شهري / بالحصة / باقة حصص)."
                    : "Accurately calculated from weekly schedules and each student's billing configuration."}
                </p>
              </div>
            </div>

            {/* Toggle Breakdown Button */}
            <button
              type="button"
              onClick={() => setShowExpectedRevenueBreakdown(!showExpectedRevenueBreakdown)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <PieChart className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isArabic ? "تفصيل الإيرادات حسب نظام الحصص" : "Breakdown by Billing System"}</span>
              {showExpectedRevenueBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 4 Core Financial Projection Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Metric 1: Expected Revenue */}
            <div className="bg-slate-800/80 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                {isArabic ? "🎯 الإيراد المتوقع للشهر" : "Target Revenue"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 my-1 truncate">
                {expectedMonthlySummary.totalExpectedRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {isArabic ? `لعدد ${expectedMonthlySummary.activeStudentsCount} طالب نشط` : `For ${expectedMonthlySummary.activeStudentsCount} active students`}
              </span>
            </div>

            {/* Metric 2: Actual Collected This Month */}
            <div className="bg-slate-800/80 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                {isArabic ? "💵 المحصل الفعلي حتى الآن" : "Collected This Month"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-white my-1 truncate">
                {expectedMonthlySummary.totalActualCollectedThisMonth.toLocaleString()} <span className="text-xs font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                {isArabic ? `نسبة التحصيل: ${expectedMonthlySummary.overallCollectionPercent}%` : `${expectedMonthlySummary.overallCollectionPercent}% collected`}
              </span>
            </div>

            {/* Metric 3: Remaining to Collect */}
            <div className="bg-slate-800/80 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                {isArabic ? "⏳ المتبقي لتحقيقه" : "Remaining Target"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-300 my-1 truncate">
                {expectedMonthlySummary.totalRemainingToCollect.toLocaleString()} <span className="text-xs font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {isArabic ? "متبقي متوقع تحصيله هذا الشهر" : "Expected to be collected"}
              </span>
            </div>

            {/* Metric 4: Expected Lessons */}
            <div className="bg-slate-800/80 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                {isArabic ? "📅 الحصص المجدولة بالشهر" : "Scheduled Lessons"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-sky-400 my-1 truncate">
                {expectedMonthlySummary.totalExpectedLessons} <span className="text-xs font-normal text-slate-300">{isArabic ? "حصة متوقعة" : "lessons"}</span>
              </div>
              <span className="text-[10px] text-sky-300 font-medium">
                {isArabic ? `نفذ منها: ${expectedMonthlySummary.totalAttendedThisMonth} حصة` : `Attended: ${expectedMonthlySummary.totalAttendedThisMonth}`}
              </span>
            </div>
          </div>

          {/* Target Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>{isArabic ? "نسبة إنجاز الهدف المالي الشهري" : "Monthly Target Progress"}</span>
              <span className="text-emerald-400 font-mono font-black">{expectedMonthlySummary.overallCollectionPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700/80 rounded-full overflow-hidden p-0.5 border border-slate-600/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, expectedMonthlySummary.overallCollectionPercent))}%` }}
              ></div>
            </div>
          </div>

          {/* Expandable Breakdown Drawer by Billing Type */}
          {showExpectedRevenueBreakdown && (
            <div className="mt-4 pt-4 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in">
              {/* 1. Flat Monthly Subscription */}
              <div className="bg-slate-800/90 rounded-2xl p-3 border border-purple-500/30 space-y-1">
                <div className="flex items-center justify-between text-purple-300 font-bold text-xs">
                  <span>📅 {isArabic ? "اشتراك شهري ثابت" : "Monthly Plan"}</span>
                  <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-200">
                    {expectedMonthlySummary.byBillingType.monthly.studentsCount} {isArabic ? "طالب" : "std"}
                  </span>
                </div>
                <div className="text-base font-black text-white">
                  {expectedMonthlySummary.byBillingType.monthly.expectedRevenue.toLocaleString()} <span className="text-[10px] font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isArabic ? `محصل منها: ${expectedMonthlySummary.byBillingType.monthly.collectedThisMonth} ج.م` : `Collected: ${expectedMonthlySummary.byBillingType.monthly.collectedThisMonth}`}
                </p>
              </div>

              {/* 2. Fixed Lesson Packages */}
              <div className="bg-slate-800/90 rounded-2xl p-3 border border-blue-500/30 space-y-1">
                <div className="flex items-center justify-between text-blue-300 font-bold text-xs">
                  <span>🎟️ {isArabic ? "باقة حصص محددة" : "Lesson Package"}</span>
                  <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-200">
                    {expectedMonthlySummary.byBillingType.monthly_fixed_lessons.studentsCount} {isArabic ? "طالب" : "std"}
                  </span>
                </div>
                <div className="text-base font-black text-white">
                  {expectedMonthlySummary.byBillingType.monthly_fixed_lessons.expectedRevenue.toLocaleString()} <span className="text-[10px] font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isArabic ? `إجمالي ${expectedMonthlySummary.byBillingType.monthly_fixed_lessons.totalLessons} حصة باقة` : `${expectedMonthlySummary.byBillingType.monthly_fixed_lessons.totalLessons} package lessons`}
                </p>
              </div>

              {/* 3. Per Lesson by Schedule */}
              <div className="bg-slate-800/90 rounded-2xl p-3 border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-bold text-xs">
                  <span>🗓️ {isArabic ? "بالحصة وفق الجدول" : "Per Lesson Schedule"}</span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200">
                    {expectedMonthlySummary.byBillingType.per_lesson.studentsCount} {isArabic ? "طالب" : "std"}
                  </span>
                </div>
                <div className="text-base font-black text-white">
                  {expectedMonthlySummary.byBillingType.per_lesson.expectedRevenue.toLocaleString()} <span className="text-[10px] font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isArabic ? `إجمالي ${expectedMonthlySummary.byBillingType.per_lesson.totalLessons} حصة مجدولة` : `${expectedMonthlySummary.byBillingType.per_lesson.totalLessons} scheduled lessons`}
                </p>
              </div>

              {/* 4. Elapsed Lessons */}
              <div className="bg-slate-800/90 rounded-2xl p-3 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs">
                  <span>⏱️ {isArabic ? "محاسبة الحصص المنقضية" : "Elapsed Lessons"}</span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
                    {expectedMonthlySummary.byBillingType.monthly_elapsed_lessons.studentsCount} {isArabic ? "طالب" : "std"}
                  </span>
                </div>
                <div className="text-base font-black text-white">
                  {expectedMonthlySummary.byBillingType.monthly_elapsed_lessons.expectedRevenue.toLocaleString()} <span className="text-[10px] font-normal text-slate-300">{isArabic ? "ج.م" : "EGP"}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isArabic ? "وفق أيام الجدول المنقضية" : "Calculated from elapsed calendar"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Financial Summary Cards (Non-repetitive, high-clarity) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1: إجمالي المتوقع هذا الشهر */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-800 truncate">
              {isArabic ? "الإيرادات المتوقعة للشهر" : "Expected Revenue"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 truncate">
            {expectedMonthlySummary.totalExpectedRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>{isArabic ? `${expectedMonthlySummary.activeStudentsCount} طالب نشط` : `${expectedMonthlySummary.activeStudentsCount} active students`}</span>
            <span className="text-emerald-700 font-bold">{expectedMonthlySummary.totalExpectedLessons} {isArabic ? "حصة" : "lessons"}</span>
          </div>
        </div>

        {/* KPI 2: المحصل الفعلي */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600 truncate">
              {isArabic ? "المحصل الفعلي هذا الشهر" : "Collected This Month"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            {monthRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-blue-600">{isArabic ? `نسبة التحصيل:` : "Collection Rate:"} {expectedMonthlySummary.overallCollectionPercent}%</span>
            <span className="text-slate-400">{expectedMonthlySummary.totalAttendedThisMonth} {isArabic ? "حصة منفذة" : "attended"}</span>
          </div>
        </div>

        {/* KPI 3: إجمالي المستحقات المطلوبة */}
        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700 truncate">
              {isArabic ? "إجمالي المستحقات المطلوبة" : "Receivables Due"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 truncate">
            {totalAmountDue.toLocaleString()} <span className="text-xs font-normal text-rose-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">
            {isArabic
              ? `مستحق على ${allProfiles.filter(p => p.amountDue > 0).length} طالب`
              : `Due from ${allProfiles.filter(p => p.amountDue > 0).length} students`}
          </p>
        </div>

        {/* KPI 4: الأرصدة المتبقية الفائضة */}
        <div className="bg-white border border-sky-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-sky-700 truncate">
              {isArabic ? "الأرصدة المتبقية (فائض)" : "Prepaid Credit"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-sky-700 truncate">
            {totalCreditRemaining.toLocaleString()} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-sky-700 font-semibold mt-1">
            {isArabic ? "رصيد فائض مدفوع مقدماً" : "Prepaid credit on account"}
          </p>
        </div>
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
              {/* Status & Billing Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap">
                {/* Billing Type Selector */}
                <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold mr-1">
                  <button
                    type="button"
                    onClick={() => setBillingTypeFilter("all")}
                    className={`px-2 py-1 rounded-lg transition ${
                      billingTypeFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isArabic ? "الكل" : "All Plans"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingTypeFilter("monthly")}
                    className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                      billingTypeFilter === "monthly"
                        ? "bg-white text-purple-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📅</span>
                    <span>{isArabic ? "شهر كامل" : "Full Month"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingTypeFilter("monthly_elapsed_lessons")}
                    className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                      billingTypeFilter === "monthly_elapsed_lessons"
                        ? "bg-white text-indigo-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🗓️</span>
                    <span>{isArabic ? "حصص التقويم" : "Elapsed Month"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingTypeFilter("monthly_fixed_lessons")}
                    className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                      billingTypeFilter === "monthly_fixed_lessons"
                        ? "bg-white text-amber-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎯</span>
                    <span>{isArabic ? "باقة حصص" : "Fixed Pkg"}</span>
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                    statusFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isArabic ? "كل الحالات" : "All Status"} ({allProfiles.length})
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
                  <span>{isArabic ? "🔴 مستحق عليه" : "Due"}</span>
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
                  <span>{isArabic ? "🟢 رصيد متبقي" : "Credit"}</span>
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
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                  <span>{isArabic ? "🟢 مسدد" : "Settled"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.status.type === "settled").length})
                  </span>
                </button>

                {/* ⚪ لا توجد حركة */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("no_activity")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === "no_activity"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                  <span>{isArabic ? "⚪ لا توجد حركة" : "Idle"}</span>
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
                              <span>
                                {profile.hourlyCost} <span className="text-[10px] text-sky-600 font-semibold">{isArabic ? "ج.م/ساعة" : "EGP/hr"}</span>
                              </span>
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
                          {profile.isMonthly ? `${profile.billedMonthsCount} شهر` : `${profile.attendedLessonsCount} حصة`}
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

              <button
                type="button"
                onClick={() => setStatementModalProfile(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {statementModalProfile.isMonthly ? (isArabic ? "الشهور المحتسبة" : "Billed Months") : (isArabic ? "الحصص المنفذة" : "Attended")}
                  </span>
                  <span className="text-sm font-black text-blue-700">
                    {statementModalProfile.isMonthly ? `${statementModalProfile.billedMonthsCount} شهر` : `${statementModalProfile.attendedLessonsCount} حصة`}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block">({statementModalProfile.attendedLessonsCost} ج.م)</span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "الساعات المنفذة" : "Taught Hours"}</span>
                  <span className="text-sm font-black text-sky-700">{statementModalProfile.totalTaughtHours} ساعة</span>
                  <span className="text-[9.5px] text-slate-400 block">
                    {statementModalProfile.rateType === "per_hour" ? `${statementModalProfile.hourlyCost} ج.م/س` : `${statementModalProfile.lessonCost} ج.م/ح`}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "إجمالي المدفوع" : "Paid"}</span>
                  <span className="text-sm font-black text-emerald-600">{statementModalProfile.totalPaidAmount} ج.م</span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {statementModalProfile.amountDue > 0 ? (isArabic ? "المستحق" : "Due") : (isArabic ? "الرصيد" : "Credit")}
                  </span>
                  <span
                    className={`text-sm font-black ${
                      statementModalProfile.amountDue > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {statementModalProfile.amountDue > 0
                      ? `${statementModalProfile.amountDue} ج.م`
                      : `+${statementModalProfile.creditRemaining} ج.م`}
                  </span>
                </div>
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
                      {statementModalProfile.expectedRevenueInfo.expectedRevenue.toLocaleString()} {isArabic ? "ج.م" : "EGP"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {statementModalProfile.expectedRevenueInfo.expectedLessonsCount} {isArabic ? "حصة متوقعة" : "lessons"}
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
                    <span>{isArabic ? "تفصيل الحساب المالي لكل مادة مسجلة:" : "Financial Breakdown by Subject:"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {statementModalProfile.subjectBreakdown.map(sub => (
                      <div
                        key={sub.subjectId || sub.subjectName}
                        className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-black">
                          <span className="text-slate-900">{sub.subjectName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                            {sub.studyTypeLabel}
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

              {/* 2. سجل الحصص المنفذة */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {statementModalProfile.isMonthly
                      ? (isArabic ? "سجل الحضور التربوي والأكاديمي:" : "Attendance History (Educational):")
                      : (isArabic ? "سجل الحصص المنفذة المسجلة بالحضور:" : "Attended Lessons History:")}
                  </span>
                </h4>

                {statementModalProfile.attendanceHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                    {isArabic ? "لا توجد حصص مسجلة بالحضور حتى الآن." : "No attended lessons recorded."}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {statementModalProfile.attendanceHistory.map((ar, aIdx) => (
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
                            {statementModalProfile.isMonthly ? (isArabic ? "حضور" : "Attended") : `-${statementModalProfile.lessonCost} ج.م`}
                          </span>
                          <span className="text-[10px] text-slate-400">{ar.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
              <button
                type="button"
                onClick={() => setStatementModalProfile(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = statementModalProfile;
                  setStatementModalProfile(null);
                  handleOpenPayment(p);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isArabic ? "تسجيل دفعة لهذا الطالب" : "Record Payment"}</span>
              </button>
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
