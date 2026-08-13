import React, { useState } from "react";
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  CreditCard,
  TrendingUp,
  Receipt,
  Search,
  Calculator,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { Student, PaymentTransaction, AppSettings, AttendanceRecord } from "../types";
import { calculateStudentFinancials, StudentFinancialSummary } from "../lib/financeUtils";

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
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid" | "log">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Payment Modal
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<StudentFinancialSummary | null>(null);
  const [amount, setAmount] = useState(800);
  const [lessonsCount, setLessonsCount] = useState(8);
  const [paymentNotes, setPaymentNotes] = useState("");

  const handleOpenPaymentModal = (student: Student) => {
    const summary = calculateStudentFinancials(student, attendanceRecords);
    setSelectedStudentForPayment(student);
    setSelectedSummary(summary);

    const cost = summary.lessonCost;
    if (student.subscriptionType === "monthly") {
      setLessonsCount(0);
      // If there is an outstanding amount due, suggest that, otherwise default to 8 lessons worth
      if (summary.amountDue > 0) {
        setAmount(summary.amountDue);
      } else {
        setAmount(cost * 8);
      }
    } else {
      const defaultLessons = student.totalPurchasedLessons || 8;
      setLessonsCount(defaultLessons);
      setAmount(defaultLessons * cost);
    }
    setPaymentNotes("");
  };

  // Compute live financials for all students
  const studentSummaries = students.map(s => ({
    student: s,
    summary: calculateStudentFinancials(s, attendanceRecords)
  }));

  const activeStudents = studentSummaries.filter(item => item.student.status === "active");

  const paidStudents = activeStudents.filter(item => item.summary.isFullyPaid);
  const unpaidStudents = activeStudents.filter(item => !item.summary.isFullyPaid || item.summary.amountDue > 0);

  const totalRevenue = paymentTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAccruedCost = activeStudents.reduce((acc, curr) => acc + curr.summary.totalAccruedCost, 0);
  const totalDueReceivables = activeStudents.reduce((acc, curr) => acc + curr.summary.amountDue, 0);
  const totalRemainingBalance = activeStudents.reduce((acc, curr) => acc + curr.summary.creditRemaining, 0);
  const totalAttendedLessonsAll = activeStudents.reduce((acc, curr) => acc + curr.summary.totalAttendedLessons, 0);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPayment || amount <= 0) return;
    const effectiveLessons = selectedStudentForPayment.subscriptionType === "monthly" ? 0 : lessonsCount;
    onRecordPayment(selectedStudentForPayment.id, amount, effectiveLessons, paymentNotes);
    setSelectedStudentForPayment(null);
    setSelectedSummary(null);
  };

  // Filter students
  const filteredStudents = activeStudents.filter(item => {
    if (activeTab === "paid" && (!item.summary.isFullyPaid || item.summary.amountDue > 0)) return false;
    if (activeTab === "unpaid" && (item.summary.isFullyPaid && item.summary.amountDue === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.student.fullName.toLowerCase().includes(q) ||
        item.student.subject.toLowerCase().includes(q) ||
        (item.student.parentContact && item.student.parentContact.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isArabic ? "الإدارة المالية والتحصيل الذكي" : "Smart Financial Management"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
              <Calculator className="w-3 h-3 text-emerald-600" />
              {isArabic ? "حساب تلقائي لكل حصة" : "Auto Lesson Calculation"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            {isArabic
              ? "نظام حساب مستحقات الحصص تلقائياً فور تسجيل الحضور (شهري مقدماً، شهري نهاية الشهر، باقة الحصص، أو دفع مرن)."
              : "Automatic lesson accrual tracking per attendance session (Prepaid, Postpaid Month-end, Package, or Flexible)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "بحث عن طالب..." : "Search student..."}
              className="bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards - High Visual Clarity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Total Collected */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "إجمالي التحصيلات" : "Total Revenue"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            {totalRevenue} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">
            {isArabic ? "تم تحصيلها وتسجيلها في الخزينة" : "Collected & logged"}
          </p>
        </div>

        {/* Total Accrued Cost */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "قيمة الحصص المنفذة" : "Accrued Tuition"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-700 truncate">
            {totalAccruedCost} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-blue-600 font-semibold mt-1">
            {isArabic ? `محسوبة لـ ${totalAttendedLessonsAll} حصة حاضرة` : `Accrued for ${totalAttendedLessonsAll} lessons`}
          </p>
        </div>

        {/* Due Receivables */}
        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700 truncate">
              {isArabic ? "مستحقات مطلوبة" : "Due Receivables"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 truncate">
            {totalDueReceivables} <span className="text-xs font-normal text-rose-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">
            {isArabic ? `على ${unpaidStudents.length} طلاب بحاجة للتحصيل` : `From ${unpaidStudents.length} students`}
          </p>
        </div>

        {/* Remaining Available Balance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 truncate">
              {isArabic ? "الأرصدة المتبقية للطلاب" : "Available Student Balances"}
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-700 truncate">
            {totalRemainingBalance} <span className="text-xs font-normal text-slate-500">{isArabic ? "ج.م" : "EGP"}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1">
            {isArabic ? "رصيد حصص أو مبالغ مدفوعة مقدماً" : "Prepaid credits & package balances"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "all"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "جميع الطلاب 📋" : "All Students"} ({activeStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "paid"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "حسابهم مسدد / رصيد متوفر 🟢" : "Settled / Credit"} ({paidStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("unpaid")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "unpaid"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "مستحق عليهم سداد (متأخرات / نهاية الشهر) 🔴" : "Due / Overdue"} ({unpaidStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("log")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "log"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "سجل التحصيلات السابقة 📜" : "Transactions Log"} ({paymentTransactions.length})
        </button>
      </div>

      {/* Main Table / Student Cards */}
      {(activeTab === "all" || activeTab === "paid" || activeTab === "unpaid") && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {activeTab === "all" && (isArabic ? "كشف حساب الطلاب والحساب التلقائي للحصص" : "Student Financial Statement")}
                {activeTab === "paid" && (isArabic ? "الطلاب المسددون وذوو الأرصدة المتاحة" : "Settled Students")}
                {activeTab === "unpaid" && (isArabic ? "الطلاب المستحق عليهم سداد دفعات الحصص" : "Students with Due Payments")}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {isArabic
                  ? "يتم تحديث عدد الحصص المنفذة والقيمة المستحقة لحظياً بمجرد تسجيل حضور الطالب."
                  : "Accrued lesson counts and financial balances update in real-time per attendance record."}
              </p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold">
                {isArabic ? "لا توجد نتائج مطابقة للبحث أو الفلتر المحدد." : "No matching students found."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredStudents.map(({ student, summary }) => {
                const isMonthly = student.subscriptionType === "monthly";
                const isPackage = student.subscriptionType === "lessons_count";

                return (
                  <div
                    key={student.id}
                    className={`p-4 rounded-2xl border transition hover:shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs ${
                      summary.amountDue > 0
                        ? "bg-rose-50/40 border-rose-200"
                        : summary.creditRemaining > 0
                        ? "bg-emerald-50/30 border-emerald-200/80"
                        : "bg-slate-50/70 border-slate-200/80"
                    }`}
                  >
                    {/* Student Basic & Plan */}
                    <div className="space-y-1.5 lg:max-w-xs xl:max-w-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm">{student.fullName}</h3>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                          {isMonthly ? (isArabic ? "📅 اشتراك شهري" : "Monthly") : (isArabic ? "🔢 باقة حصص" : "Package")}
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-full">
                          {student.paymentPlan === "end_of_month"
                            ? (isArabic ? "🟡 دفع نهاية الشهر" : "Postpaid")
                            : student.paymentPlan === "mixed"
                            ? (isArabic ? "🔵 دفع مرن / مختلط" : "Hybrid")
                            : (isArabic ? "🟢 دفع أول الشهر (مقدماً)" : "Prepaid")}
                        </span>
                      </div>
                      <p className="text-slate-500 font-medium">
                        {student.subject} • {student.parentContact} {student.studentNumber ? `• رقم: ${student.studentNumber}` : ""}
                      </p>
                      <p className="text-[11px] font-bold text-slate-700">
                        {isArabic ? "سعر الحصة المسجل:" : "Lesson Cost:"}{" "}
                        <span className="text-blue-700 font-black">{summary.lessonCost} {isArabic ? "ج.م" : "EGP"}</span>
                      </p>
                    </div>

                    {/* Auto Calculation Ledger Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 text-center flex-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "الحصص المنفذة" : "Attended"}</span>
                        <span className="text-sm font-black text-blue-700">{summary.totalAttendedLessons} {isArabic ? "حصة" : "lss"}</span>
                        <span className="text-[9.5px] text-slate-500 font-medium block">({summary.totalAccruedCost} ج.م)</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</span>
                        <span className="text-sm font-black text-emerald-600">{summary.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}</span>
                        <span className="text-[9.5px] text-slate-500 font-medium block">{isArabic ? "في السجل" : "Logged"}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          {isPackage ? (isArabic ? "الحصص المتبقية" : "Lessons Left") : (isArabic ? "الرصيد المتبقي" : "Credit Left")}
                        </span>
                        {isPackage ? (
                          <>
                            <span className="text-sm font-black text-indigo-700">{summary.remainingLessons} {isArabic ? "حصة" : "lss"}</span>
                            <span className="text-[9.5px] text-slate-500 font-medium block">({summary.remainingBalance} ج.م)</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-black text-indigo-700">{summary.creditRemaining} {isArabic ? "ج.م" : "EGP"}</span>
                            <span className="text-[9.5px] text-slate-500 font-medium block">
                              {summary.creditRemaining > 0 ? (isArabic ? `تغطي ~${summary.remainingLessons} حصص` : `~${summary.remainingLessons} lss`) : "0"}
                            </span>
                          </>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? "المستحق للسداد" : "Due Amount"}</span>
                        <span className={`text-sm font-black ${summary.amountDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {summary.amountDue} {isArabic ? "ج.م" : "EGP"}
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-medium block">
                          {summary.amountDue > 0 ? (isArabic ? "مطلوب تحصيله" : "Overdue") : (isArabic ? "لا يوجد" : "None")}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Action Button */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2.5 shrink-0 min-w-[190px]">
                      <div
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border text-center w-full sm:w-auto lg:w-full ${
                          summary.statusBadge.color === "emerald"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : summary.statusBadge.color === "amber"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : summary.statusBadge.color === "blue"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {isArabic ? summary.statusBadge.labelAr : summary.statusBadge.labelEn}
                      </div>

                      <button
                        onClick={() => handleOpenPaymentModal(student)}
                        className={`w-full sm:w-auto lg:w-full px-4 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition ${
                          summary.amountDue > 0
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isArabic ? "تسجيل دفعة / شحن" : "Record Payment"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log Tab */}
      {activeTab === "log" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm mb-2">
            {isArabic ? "سجل عمليات التحصيل السابقة" : "Transaction Log"}
          </h2>

          <div className="space-y-2">
            {paymentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-semibold">{isArabic ? "لا توجد معاملات مسجلة حتى الآن." : "No transactions logged yet."}</p>
              </div>
            ) : (
              paymentTransactions.map(pt => (
                <div
                  key={pt.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{pt.studentName}</p>
                      <p className="text-[11px] text-slate-500">{pt.notes || pt.date}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-emerald-700 text-sm">+{pt.amount} {isArabic ? "ج.م" : "EGP"}</p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {pt.lessonsCovered > 0
                        ? `${pt.lessonsCovered} ${isArabic ? "حصص" : "lessons"} (${pt.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/ls"})`
                        : (isArabic ? `اشتراك شهري (${pt.lessonCost} ج/حصة)` : `Monthly (${pt.lessonCost} EGP/ls)`)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Quick Record Payment with Real Calculations */}
      {selectedStudentForPayment && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isArabic ? `تسجيل دفعة مالية لـ ${selectedStudentForPayment.fullName}` : "Record Payment"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedStudentForPayment.subscriptionType === "monthly"
                    ? (isArabic ? "نظام اشتراك شهري" : "Monthly Plan")
                    : (isArabic ? "نظام باقة حصص" : "Package Plan")}
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {selectedStudentForPayment.lessonCost || 100} {isArabic ? "ج.م/حصة" : "EGP/ls"}
              </span>
            </div>

            {/* Smart Summary Info Box */}
            <div className="mb-4 p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">{isArabic ? "الحصص المنفذة حتى الآن:" : "Lessons Attended:"}</span>
                <span className="text-blue-800">{selectedSummary.totalAttendedLessons} {isArabic ? "حصة" : "lessons"} ({selectedSummary.totalAccruedCost} ج.م)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">{isArabic ? "إجمالي المسدد سابقاً:" : "Total Paid Previously:"}</span>
                <span className="text-emerald-700">{selectedSummary.totalPaidAmount} {isArabic ? "ج.م" : "EGP"}</span>
              </div>
              {selectedSummary.amountDue > 0 && (
                <div className="flex items-center justify-between font-black text-rose-700 pt-1 border-t border-blue-200/50">
                  <span>{isArabic ? "المستحق المطلوب سداده:" : "Due Amount:"}</span>
                  <span>{selectedSummary.amountDue} {isArabic ? "ج.م" : "EGP"}</span>
                </div>
              )}
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              {selectedStudentForPayment.subscriptionType === "lessons_count" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "عدد الحصص المراد شحنها بالباقة:" : "Number of Package Lessons:"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={lessonsCount}
                    onChange={e => {
                      const count = Number(e.target.value);
                      setLessonsCount(count);
                      setAmount(count * (selectedStudentForPayment.lessonCost || 100));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "المبلغ المدفوع (بالجنيه المصري):" : "Amount Paid (EGP):"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-base text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isArabic ? "ملاحظات الدفعة (اختياري):" : "Payment Notes (Optional):"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={isArabic ? "سداد رسوم الشهر، كاش، تحويل بنكي، فودافون كاش..." : "e.g. Cash, bank transfer..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForPayment(null);
                    setSelectedSummary(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ وتأكيد السداد" : "Save & Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
