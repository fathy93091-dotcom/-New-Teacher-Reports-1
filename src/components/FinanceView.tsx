import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  Calculator,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  User,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  FileText,
  Filter,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  X,
  History,
  Check,
  Share2,
  CalendarDays,
  Coins,
  LayoutGrid,
  List
} from "lucide-react";
import { Student, PaymentTransaction, AppSettings, AttendanceRecord } from "../types";
import {
  calculateStudentFinancialProfile,
  buildCentralTransactionsLog,
  StudentFinancialProfile,
  FinancialStatusType,
  CentralTransactionItem
} from "../lib/financeEngine";

interface FinanceViewProps {
  settings: AppSettings;
  students: Student[];
  attendanceRecords?: AttendanceRecord[];
  paymentTransactions: PaymentTransaction[];
  onRecordPayment: (studentId: string, amount: number, lessonsCount: number, notes?: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  settings,
  students,
  attendanceRecords = [],
  paymentTransactions,
  onRecordPayment
}) => {
  const isArabic = settings.preferredLanguage === "ar";

  // Navigation Sub-tab: "students" (قائمة الطلاب وبطاقاتهم) | "transactions" (سجل المعاملات المركزي)
  const [mainSection, setMainSection] = useState<"students" | "transactions">("students");
  const [financeLayout, setFinanceLayout] = useState<"grid" | "table">("grid");

  // Filter for Student Financial Status
  const [statusFilter, setStatusFilter] = useState<"all" | FinancialStatusType>("all");
  const [systemFilter, setSystemFilter] = useState<"all" | "monthly" | "lessons_count">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  // 1. Record Payment Modal
  const [paymentModalStudent, setPaymentModalStudent] = useState<StudentFinancialProfile | null>(null);
  const [amount, setAmount] = useState<number>(800);
  const [lessonsCount, setLessonsCount] = useState<number>(8);
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // 2. Student Statement Modal (كشف حساب الطالب)
  const [statementModalProfile, setStatementModalProfile] = useState<StudentFinancialProfile | null>(null);

  // Compute all profiles
  const allProfiles = useMemo(() => {
    return students
      .filter(s => s.status === "active")
      .map(s => calculateStudentFinancialProfile(s, attendanceRecords, paymentTransactions));
  }, [students, attendanceRecords, paymentTransactions]);

  // KPIs for Section 5: الصفحة الرئيسية
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

  // 3. إجمالي الأرصدة المقدمة (Total Prepaid Credit Balances)
  const totalCreditRemaining = useMemo(() => {
    return allProfiles.reduce((sum, p) => sum + p.creditRemaining, 0);
  }, [allProfiles]);

  // 4. عدد الحصص المنفذة (Total Attended Lessons executed)
  const totalAttendedLessonsCount = useMemo(() => {
    return allProfiles.reduce((sum, p) => sum + p.attendedLessonsCount, 0);
  }, [allProfiles]);

  // Central Transactions Log
  const centralTransactions = useMemo(() => {
    return buildCentralTransactionsLog(paymentTransactions, attendanceRecords, students);
  }, [paymentTransactions, attendanceRecords, students]);

  // Filtered Students
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(profile => {
      // Status filter
      if (statusFilter !== "all" && profile.status.type !== statusFilter) {
        return false;
      }
      // System filter
      if (systemFilter !== "all" && profile.subscriptionType !== systemFilter) {
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
  }, [allProfiles, statusFilter, systemFilter, searchQuery]);

  // Handle Opening Payment Modal
  const handleOpenPayment = (profile: StudentFinancialProfile) => {
    setPaymentModalStudent(profile);
    const cost = profile.lessonCost;

    if (profile.subscriptionType === "monthly") {
      setLessonsCount(0);
      if (profile.amountDue > 0) {
        setAmount(profile.amountDue);
      } else {
        setAmount(cost * 8); // Default suggested monthly payment
      }
    } else {
      const defaultPack = profile.student.totalPurchasedLessons || 8;
      setLessonsCount(defaultPack);
      setAmount(defaultPack * cost);
    }
    setPaymentNotes("");
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalStudent || amount <= 0) return;
    const effectiveLessons = paymentModalStudent.subscriptionType === "monthly" ? 0 : lessonsCount;
    onRecordPayment(paymentModalStudent.studentId, amount, effectiveLessons, paymentNotes);
    setPaymentModalStudent(null);
  };

  // Filtered Central Transactions
  const filteredCentralTransactions = useMemo(() => {
    if (!searchQuery.trim()) return centralTransactions;
    const q = searchQuery.toLowerCase().trim();
    return centralTransactions.filter(
      t =>
        t.studentName.toLowerCase().includes(q) ||
        t.subjectName.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }, [centralTransactions, searchQuery]);

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header with Rule Banner & Context */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="w-6 h-6 text-emerald-600" />
              <span>{isArabic ? "قسم المالية والتحصيل الذكي" : "Finance & Collections"}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isArabic ? "مرتبط تلقائياً بالحضور والحصص" : "Auto-Linked to Attendance"}</span>
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
            {isArabic
              ? "يتم احتساب قيمة الحصص وتحديث رصيد الطالب أو المستحق عليه آلياً فور تسجيل الحضور في قسم الحصص (بدون إدخال يدوي لعدد الحصص)."
              : "Financial ledger and dues auto-calculate per lesson attendance (No manual lesson entry required)."}
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
            <span>{isArabic ? "بطاقات الطلاب المالية" : "Student Cards"}</span>
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
            <span>{isArabic ? "سجل المعاملات المركزي" : "Transactions Log"}</span>
          </button>
        </div>
      </div>

      {/* 5. الصفحة الرئيسية: KPIs (إيرادات الشهر + إجمالي المستحقات + إجمالي الأرصدة المقدمة + عدد الحصص المنفذة) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1: إيرادات الشهر */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "إيرادات الشهر الحالي" : "Current Month Revenue"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            {monthRevenue} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">
            {isArabic ? `إجمالي الكل: ${totalRevenue} ج.م` : `All time: ${totalRevenue} EGP`}
          </p>
        </div>

        {/* KPI 2: إجمالي المستحقات */}
        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700 truncate">
              {isArabic ? "إجمالي المستحقات المطلوبة" : "Total Due Receivables"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 truncate">
            {totalAmountDue} <span className="text-xs font-normal text-rose-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">
            {isArabic
              ? `على ${allProfiles.filter(p => p.amountDue > 0).length} طلاب مطلوب تحصيلها`
              : `From ${allProfiles.filter(p => p.amountDue > 0).length} students`}
          </p>
        </div>

        {/* KPI 3: إجمالي الأرصدة المقدمة */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "إجمالي الأرصدة المقدمة" : "Prepaid Credits"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-700 truncate">
            {totalCreditRemaining} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            {isArabic ? "أرصدة مدفوعة مقدماً لدى المعلم" : "Prepaid balances & packages"}
          </p>
        </div>

        {/* KPI 4: عدد الحصص المنفذة */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "عدد الحصص المنفذة" : "Attended Lessons"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-700 truncate">
            {totalAttendedLessonsCount} <span className="text-xs font-normal text-slate-500">{isArabic ? "حصة" : "lss"}</span>
          </div>
          <p className="text-[10px] text-blue-600 font-semibold mt-1">
            {isArabic ? "محسوبة آلياً من سجلات الحضور" : "Auto-aggregated from attendance"}
          </p>
        </div>
      </div>

      {/* Main Section 1: قائمة الطلاب وبطاقاتهم المالية (Section 5, 6) */}
      {mainSection === "students" && (
        <div className="space-y-3">
          {/* Controls: Search + Status Filter Pills (4 Financial Statuses from Rule 4) + View Layout Toggle */}
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
              {/* 4 Financial Status Filters (Rule 4) */}
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

                {/* 🟢 رصيد متاح */}
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
                  <span>{isArabic ? "🟢 متاح" : "Credit"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.status.type === "available_credit").length})
                  </span>
                </button>

                {/* 🟠 رصيد منخفض */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("low_credit")}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === "low_credit"
                      ? "bg-amber-600 text-white shadow-xs shadow-amber-600/20"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/70"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>{isArabic ? "🟠 منخفض" : "Low"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.status.type === "low_credit").length})
                  </span>
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
                  <span>{isArabic ? "🔴 مستحق" : "Due"}</span>
                  <span className="text-[10px] opacity-80">
                    ({allProfiles.filter(p => p.amountDue > 0 || p.status.type === "balance_due").length})
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
                  <span>{isArabic ? "⚪ خامل" : "Idle"}</span>
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
                  title={isArabic ? "عرض الجدول المحاسبي المدمج" : "Spreadsheet Table View"}
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

          {/* 6. بطاقة الطالب (Student Financial Cards Grid OR Spreadsheet Table) */}
          {filteredProfiles.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-slate-700">
                {isArabic ? "لا يوجد طلاب مطابقون للفلتر أو البحث المحدد." : "No matching students found."}
              </p>
            </div>
          ) : financeLayout === "table" ? (
            /* ================= HIGH-DENSITY SPREADSHEET TABLE VIEW ================= */
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{isArabic ? "الطالب" : "Student"}</th>
                      <th className="py-2.5 px-3">{isArabic ? "المادة والنظام" : "Subject & Plan"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "الحالة المالية" : "Status"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "سعر الحصة" : "Cost/Lesson"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "الحصص المنفذة" : "Attended"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "إجمالي التكلفة" : "Total Cost"}</th>
                      <th className="py-2.5 px-2.5 text-center">{isArabic ? "المدفوع" : "Total Paid"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الرصيد / المستحق" : "Balance / Due"}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? "الإجراءات المحاسبية" : "Actions"}</th>
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
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                                {profile.subjectName}
                              </span>
                              <span className="text-slate-400 text-[10px]">•</span>
                              <span className="text-slate-600 text-[10px] font-medium">
                                {isArabic ? profile.systemTypeLabelAr : profile.systemTypeLabelEn}
                              </span>
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
                          <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                            {profile.lessonCost} <span className="text-[10px] text-slate-400">{isArabic ? "ج.م" : "EGP"}</span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-black text-blue-700">
                            {profile.attendedLessonsCount} {isArabic ? "حصة" : "lss"}
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
                                ? `${profile.amountDue} ${isArabic ? "ج.م مطلوب" : "Due"}`
                                : isCredit
                                ? `+${profile.creditRemaining} ${isArabic ? "ج.م متاح" : "Credit"}`
                                : (isArabic ? "خالص 0" : "0")}
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
                                className={`px-2 py-1 rounded-lg text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs ${
                                  isDue
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
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
            /* ================= HIGH-DENSITY RESPONSIVE GRID CARDS VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProfiles.map(profile => {
                const isDue = profile.amountDue > 0;
                const isCredit = profile.creditRemaining > 0;

                return (
                  <div
                    key={profile.studentId}
                    className={`rounded-2xl border transition p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs ${
                      isDue
                        ? "bg-rose-50/30 border-rose-200"
                        : isCredit
                        ? "bg-emerald-50/20 border-emerald-200/80"
                        : "bg-white border-slate-200/90"
                    }`}
                  >
                    {/* Header: اسم الطالب + المادة + نظام الدفع */}
                    <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                            {profile.fullName}
                          </h3>
                          {/* Financial Status Badge (Rule 4) */}
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold border flex items-center gap-1 ${profile.status.badgeBg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${profile.status.dotColor}`}></span>
                            <span>{isArabic ? profile.status.labelAr : profile.status.labelEn}</span>
                          </span>
                        </div>

                        {/* Subject + Plan + System */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-bold flex-wrap">
                          <span className="text-blue-700 flex items-center gap-1 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>{profile.subjectName}</span>
                          </span>
                          <span>•</span>
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 text-[10px]">
                            {isArabic ? profile.systemTypeLabelAr : profile.systemTypeLabelEn}
                          </span>
                        </div>
                      </div>

                      {/* Lesson Cost Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-[9.5px] font-bold text-slate-400 block">
                          {isArabic ? "سعر الحصة" : "Cost"}
                        </span>
                        <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {profile.lessonCost} {isArabic ? "ج.م" : "EGP"}
                        </span>
                      </div>
                    </div>

                    {/* Metrics Grid:
                        - الحصص المستخدمة (Attended)
                        - قيمة الحصص (Total Attended Cost)
                        - إجمالي المدفوع (Total Paid)
                        - الرصيد / المستحق (Credit or Due)
                    */}
                    <div className="grid grid-cols-4 gap-1 bg-white/90 p-2 rounded-xl border border-slate-200/80 text-center">
                      {/* 1. الحصص المستخدمة */}
                      <div className="p-0.5">
                        <span className="text-[9px] font-bold text-slate-400 block truncate">
                          {isArabic ? "المنفذة" : "Used"}
                        </span>
                        <span className="text-xs font-black text-blue-700 block">
                          {profile.attendedLessonsCount}
                        </span>
                      </div>

                      {/* 2. قيمة الحصص */}
                      <div className="p-0.5">
                        <span className="text-[9px] font-bold text-slate-400 block truncate">
                          {isArabic ? "القيمة" : "Cost"}
                        </span>
                        <span className="text-xs font-black text-slate-800 block">
                          {profile.attendedLessonsCost}
                        </span>
                      </div>

                      {/* 3. إجمالي المدفوع */}
                      <div className="p-0.5">
                        <span className="text-[9px] font-bold text-slate-400 block truncate">
                          {isArabic ? "المدفوع" : "Paid"}
                        </span>
                        <span className="text-xs font-black text-emerald-600 block">
                          {profile.totalPaidAmount}
                        </span>
                      </div>

                      {/* 4. الرصيد / المستحق */}
                      <div className="p-0.5">
                        <span className="text-[9px] font-bold text-slate-400 block truncate">
                          {isDue ? (isArabic ? "مستحق" : "Due") : (isArabic ? "رصيد" : "Credit")}
                        </span>
                        <span
                          className={`text-xs font-black block ${
                            isDue ? "text-rose-600" : isCredit ? "text-emerald-700" : "text-slate-600"
                          }`}
                        >
                          {isDue
                            ? `${profile.amountDue}`
                            : isCredit
                            ? `+${profile.creditRemaining}`
                            : "0"}
                        </span>
                      </div>
                    </div>

                    {/* Rule 6 Action Buttons: [ عرض الحساب | تسجيل دفعة ] */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {/* Button 1: عرض الحساب (Opens Student Statement Modal) */}
                      <button
                        type="button"
                        onClick={() => setStatementModalProfile(profile)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-2xs border border-slate-200"
                      >
                        <FileText className="w-3 h-3 text-slate-600" />
                        <span>{isArabic ? "كشف حساب" : "Statement"}</span>
                      </button>

                      {/* Button 2: تسجيل دفعة */}
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(profile)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-white font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-sm ${
                          isDue
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isArabic ? "تسجيل دفعة" : "Pay"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Section 2: سجل المعاملات المركزي (Section 8) */}
      {mainSection === "transactions" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>{isArabic ? "سجل المعاملات المركزي" : "Central Transactions Ledger"}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isArabic
                  ? "سجل موحد يوثق جميع الدفعات المسددة واحتساب الحصص المنفذة والتسويات مع التواريخ وتفاصيل كل معاملة."
                  : "Centralized record of all payments, attended lesson accruals, and account settlements."}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "بحث في المعاملات..." : "Search transactions..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredCentralTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">
                {isArabic ? "لا توجد معاملات مسجلة حتى الآن." : "No transactions logged yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCentralTransactions.map(item => {
                const isPayment = item.type === "payment";
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                      isPayment
                        ? "bg-emerald-50/30 border-emerald-200/80"
                        : "bg-slate-50/70 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isPayment ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isPayment ? <CreditCard className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900">{item.studentName}</p>
                          <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {item.subjectName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">
                          {isArabic ? item.descriptionAr : item.descriptionEn}
                        </p>
                        {item.notes && (
                          <p className="text-[10.5px] text-slate-400 font-medium">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div
                        className={`text-sm font-black ${
                          isPayment ? "text-emerald-700" : "text-blue-700"
                        }`}
                      >
                        {isPayment ? `+${item.amount}` : `${item.amount}`} {isArabic ? "ج.م" : "EGP"}
                      </div>
                      <span className="text-[10.5px] text-slate-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{item.date}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. كشف حساب الطالب (Student Account Statement Modal) */}
      {statementModalProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {isArabic ? `كشف حساب الطالب: ${statementModalProfile.fullName}` : `Statement: ${statementModalProfile.fullName}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {statementModalProfile.subjectName} • {statementModalProfile.student.parentContact}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatementModalProfile(null)}
                className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* 1. ملخص الحساب (Account Summary Box) */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">
                      {isArabic ? "نظام الحساب وطريقة الدفع" : "Plan & Billing Mode"}
                    </span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">
                      {isArabic ? statementModalProfile.systemTypeLabelAr : statementModalProfile.systemTypeLabelEn} • {isArabic ? statementModalProfile.planLabelAr : statementModalProfile.planLabelEn}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${statementModalProfile.status.badgeBg}`}
                  >
                    {isArabic ? statementModalProfile.status.labelAr : statementModalProfile.status.labelEn}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isArabic ? "الحصص المنفذة" : "Attended"}
                    </span>
                    <span className="text-base font-black text-blue-400">
                      {statementModalProfile.attendedLessonsCount} {isArabic ? "حصة" : "lss"}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isArabic ? "قيمة الحصص" : "Lessons Cost"}
                    </span>
                    <span className="text-base font-black text-amber-300">
                      {statementModalProfile.attendedLessonsCost} {isArabic ? "ج.م" : "EGP"}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isArabic ? "إجمالي المدفوع" : "Total Paid"}
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      {statementModalProfile.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {statementModalProfile.amountDue > 0
                        ? (isArabic ? "المستحق عليه" : "Amount Due")
                        : (isArabic ? "الرصيد المتاح" : "Credit Balance")}
                    </span>
                    <span
                      className={`text-base font-black ${
                        statementModalProfile.amountDue > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {statementModalProfile.amountDue > 0
                        ? `${statementModalProfile.amountDue} ج.م`
                        : `+${statementModalProfile.creditRemaining} ج.م`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                  💡 {isArabic ? statementModalProfile.explanationAr : statementModalProfile.explanationEn}
                </p>
              </div>

              {/* 2. سجل الدفعات (All Payments) */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "سجل جميع الدفعات المالية المسددة:" : "All Payment Transactions:"}</span>
                </h4>

                {statementModalProfile.paymentHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                    {isArabic ? "لم يتم تسجيل أي دفعات مالية حتى الآن." : "No payments logged."}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {statementModalProfile.paymentHistory.map((pt, pIdx) => (
                      <div
                        key={pt.id || pIdx}
                        className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              +{pt.amount} {isArabic ? "جنيهاً" : "EGP"}
                            </p>
                            <p className="text-[10.5px] text-slate-500">
                              {pt.notes || (isArabic ? "سداد دفعة نقدية" : "Cash payment")}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-slate-500">
                          {pt.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. سجل الحصص المنفذة (All Lessons Accrued from Attendance) */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isArabic ? "سجل الحصص المنفذة المسجلة بالحضور:" : "All Attended Lessons (Attendance-Driven):"}</span>
                </h4>

                {statementModalProfile.attendanceHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                    {isArabic ? "لا توجد حصص مسجلة بالحضور حتى الآن." : "No attended lessons recorded."}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {statementModalProfile.attendanceHistory.map((ar, aIdx) => (
                      <div
                        key={ar.id || aIdx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-black text-[10.5px]">
                            #{ar.lessonNumber || (aIdx + 1)}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">
                              {ar.subject || statementModalProfile.subjectName}
                            </p>
                            <p className="text-[10.5px] text-slate-500">
                              {ar.teacherNotes || (ar.attendance === "present" ? (isArabic ? "حضور مؤكد" : "Present") : (isArabic ? "غياب مع احتساب الحصة" : "Absent"))}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">
                            -{statementModalProfile.lessonCost} {isArabic ? "ج.م" : "EGP"}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-medium">
                            {ar.date}
                          </span>
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

      {/* Modal: تسجيل دفعة مالية (Payment Record Modal) */}
      {paymentModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `تسجيل دفعة مالية: ${paymentModalStudent.fullName}` : `Record Payment: ${paymentModalStudent.fullName}`}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isArabic ? paymentModalStudent.systemTypeLabelAr : paymentModalStudent.systemTypeLabelEn} • {isArabic ? paymentModalStudent.planLabelAr : paymentModalStudent.planLabelEn}
                </p>
              </div>

              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                {paymentModalStudent.lessonCost} {isArabic ? "ج.م/حصة" : "EGP/ls"}
              </span>
            </div>

            {/* Smart Ledger Summary Box */}
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">{isArabic ? "الحصص المنفذة حتى الآن:" : "Lessons Attended:"}</span>
                <span className="text-blue-800 font-black">
                  {paymentModalStudent.attendedLessonsCount} {isArabic ? "حصة" : "lessons"} ({paymentModalStudent.attendedLessonsCost} ج.م)
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

            <form onSubmit={handleSubmitPayment} className="space-y-3.5 text-xs">
              {/* Package mode: number of lessons */}
              {paymentModalStudent.subscriptionType === "lessons_count" && (
                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    {isArabic ? "عدد حصص الباقة المشحونة:" : "Package Lessons Count:"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={lessonsCount}
                    onChange={e => {
                      const count = Number(e.target.value);
                      setLessonsCount(count);
                      setAmount(count * paymentModalStudent.lessonCost);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block font-black text-slate-700 mb-1">
                  {isArabic ? "المبلغ المدفوع (بالجنيه المصري):" : "Amount Paid (EGP):"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-lg text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Payment Notes */}
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
                  <span>{isArabic ? "حفظ وتأكيد السداد" : "Save & Confirm"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
