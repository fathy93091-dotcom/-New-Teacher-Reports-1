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
  Search
} from "lucide-react";
import { Student, PaymentTransaction, AppSettings } from "../types";

interface FinanceViewProps {
  settings: AppSettings;
  students: Student[];
  paymentTransactions: PaymentTransaction[];
  onRecordPayment: (studentId: string, amount: number, lessonsCount: number, notes?: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  settings,
  students,
  paymentTransactions,
  onRecordPayment
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid" | "log">("paid");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Payment Modal
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [amount, setAmount] = useState(800);
  const [lessonsCount, setLessonsCount] = useState(8);
  const [paymentNotes, setPaymentNotes] = useState("");

  const handleOpenPaymentModal = (student: Student) => {
    setSelectedStudentForPayment(student);
    const cost = student.lessonCost || 100;
    if (student.subscriptionType === "monthly") {
      setLessonsCount(0);
      setAmount(cost * 8);
    } else {
      const defaultLessons = student.totalPurchasedLessons || 8;
      setLessonsCount(defaultLessons);
      setAmount(defaultLessons * cost);
    }
    setPaymentNotes("");
  };

  // Statistics
  const paidStudents = students.filter(s => s.status === "active" && s.paymentStatus === "paid");
  const unpaidStudents = students.filter(s => s.status === "active" && s.paymentStatus === "unpaid");

  const totalRevenue = paymentTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRemainingBalance = students.reduce((acc, curr) => acc + curr.remainingBalance, 0);
  const totalRemainingLessons = students.reduce((acc, curr) => acc + curr.remainingLessons, 0);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPayment || amount <= 0) return;
    const effectiveLessons = selectedStudentForPayment.subscriptionType === "monthly" ? 0 : lessonsCount;
    onRecordPayment(selectedStudentForPayment.id, amount, effectiveLessons, paymentNotes);
    setSelectedStudentForPayment(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isArabic ? "الإدارة المالية والتحصيل" : "Financial Management"}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            {isArabic
              ? "نظام الحصص المسبقة والدفع بالحصة والخصم التلقائي عند الحضور."
              : "Track tuition payments, lesson balances, and automated deductions."}
          </p>
        </div>
      </div>

      {/* Summary Cards - 3 Columns on Mobile for Space Efficiency */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "التحصيلات" : "Revenue"}
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xs sm:text-2xl font-black text-slate-900 truncate">{totalRevenue} <span className="text-[9px] sm:text-xs font-normal">{isArabic ? "ج.م" : "EGP"}</span></div>
          <p className="text-[8.5px] sm:text-[10px] text-emerald-600 font-semibold mt-0.5 truncate hidden xs:block">
            {isArabic ? "المحصله" : "Collected"}
          </p>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-2 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-xs font-bold text-rose-700 truncate">
              {isArabic ? "لم يسددوا" : "Unpaid"}
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xs sm:text-2xl font-black text-rose-600">{unpaidStudents.length} <span className="text-[9px] sm:text-xs font-normal">{isArabic ? "طالب" : "pupils"}</span></div>
          <p className="text-[8.5px] sm:text-[10px] text-rose-700 font-semibold mt-0.5 truncate hidden xs:block">
            {isArabic ? "متأخرات" : "Overdue"}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-xs font-bold text-slate-500 truncate">
              {isArabic ? "المتبقي" : "Lessons"}
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-xs sm:text-2xl font-black text-blue-600 truncate">
            {totalRemainingLessons} <span className="text-[9px] sm:text-xs font-normal">{isArabic ? "حصة" : "lss"}</span>
          </div>
          <p className="text-[8.5px] sm:text-[10px] text-slate-500 font-medium mt-0.5 truncate hidden xs:block">
            {totalRemainingBalance} {isArabic ? "ج.م" : "EGP"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "paid"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "الطلاب المدفوع لهم 🟢" : "Paid Students"} ({paidStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("unpaid")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "unpaid"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "لم يدفعوا (متأخرون) 🔴" : "Unpaid Students"} ({unpaidStudents.length})
        </button>

        <button
          onClick={() => setActiveTab("log")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            activeTab === "log"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          {isArabic ? "سجل العمليات المالية 📜" : "Transactions History"}
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "paid" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm mb-2">
            {isArabic ? "قائمة الطلاب المسددين ورصيد الحصص" : "Paid Students Roster"}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold bg-slate-50/50">
                  <th className="p-3">{isArabic ? "اسم الطالب" : "Student Name"}</th>
                  <th className="p-3">{isArabic ? "نظام الاشتراك" : "Plan"}</th>
                  <th className="p-3">{isArabic ? "المادة" : "Subject"}</th>
                  <th className="p-3">{isArabic ? "المبلغ المدفوع" : "Amount Paid"}</th>
                  <th className="p-3">{isArabic ? "عدد الحصص" : "Lessons"}</th>
                  <th className="p-3">{isArabic ? "قيمة الحصة" : "Cost/Lesson"}</th>
                  <th className="p-3">{isArabic ? "المتبقي" : "Remaining"}</th>
                  <th className="p-3 text-center">{isArabic ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paidStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">{student.fullName}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                          {student.subscriptionType === "monthly"
                            ? (isArabic ? "📅 شهري" : "Monthly")
                            : (isArabic ? "🔢 باقة حصص" : "Package")}
                        </span>
                        <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                          {student.paymentPlan === "end_of_month"
                            ? (isArabic ? "🟡 مؤخر" : "Postpaid")
                            : student.paymentPlan === "mixed"
                            ? (isArabic ? "🔵 مختلط" : "Hybrid")
                            : (isArabic ? "🟢 مقدم" : "Prepaid")}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{student.subject}</td>
                    <td className="p-3 font-bold text-slate-800">{student.totalPaidAmount} ج.م</td>
                    <td className="p-3 text-slate-700">
                      {student.subscriptionType === "monthly"
                        ? (isArabic ? "متابعة شهرية" : "Monthly")
                        : `${student.totalPurchasedLessons} ${isArabic ? "حصة" : "lessons"}`}
                    </td>
                    <td className="p-3 text-blue-700 font-bold">{student.lessonCost} ج.م</td>
                    <td className="p-3 font-bold text-emerald-700">
                      {student.subscriptionType === "monthly"
                        ? (isArabic ? `حسب الحضور (${student.lessonCost} ج/حصة)` : `Per session (${student.lessonCost} EGP)`)
                        : `${student.remainingLessons} ${isArabic ? "حصة" : "lss"} (${student.remainingBalance} ${isArabic ? "ج.م" : "EGP"})`}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenPaymentModal(student)}
                        className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[11px]"
                      >
                        + {isArabic ? "تسجيل دفعة" : "Add Payment"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "unpaid" && (
        <div className="bg-white border border-rose-200/80 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-rose-900 text-sm mb-2">
            {isArabic ? "الطلاب الذين لم يدفعوا الرسوم المستحقة" : "Unpaid Students List"}
          </h2>

          {unpaidStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold">
                {isArabic ? "ممتاز! جميع الطلاب النشطين قاموا بالسداد." : "All active students have paid!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unpaidStudents.map(student => (
                <div
                  key={student.id}
                  className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-rose-950 text-sm">{student.fullName}</h3>
                      <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {student.subscriptionType === "monthly" ? (isArabic ? "📅 شهري" : "Monthly") : (isArabic ? "🔢 باقة" : "Package")}
                      </span>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {student.paymentPlan === "end_of_month" ? (isArabic ? "🟡 دفع مؤخر (آخر الشهر)" : "Postpaid") : student.paymentPlan === "mixed" ? (isArabic ? "🔵 دفع مختلط" : "Hybrid") : (isArabic ? "🟢 دفع مقدم (أول الشهر)" : "Prepaid")}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium mt-0.5">{student.subject} • {student.parentContact}</p>
                    <p className="text-rose-700 font-bold text-[11px] mt-1">
                      {student.subscriptionType === "monthly"
                        ? (isArabic ? `📅 نظام شهري • سعر الحصة: ${student.lessonCost} ج.م` : `Monthly • Lesson Cost: ${student.lessonCost} EGP`)
                        : (isArabic ? `⚠️ الرصيد المتبقي: ${student.remainingLessons} حصة (سعر الحصة: ${student.lessonCost} ج.م)` : `Remaining: ${student.remainingLessons} lessons`)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenPaymentModal(student)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 shrink-0"
                  >
                    {isArabic ? "تسجيل السداد" : "Record Payment"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "log" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm mb-2">
            {isArabic ? "سجل عمليات التحصيل السابقة" : "Transaction Log"}
          </h2>

          <div className="space-y-2">
            {paymentTransactions.map(pt => (
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
                  <p className="font-black text-emerald-700 text-sm">+{pt.amount} ج.م</p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {pt.lessonsCovered > 0
                      ? `${pt.lessonsCovered} ${isArabic ? "حصص" : "lessons"} (${pt.lessonCost} ${isArabic ? "ج.م/حصة" : "EGP/ls"})`
                      : (isArabic ? `اشتراك شهري (${pt.lessonCost} ج/حصة)` : `Monthly (${pt.lessonCost} EGP/ls)`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Quick Record Payment */}
      {selectedStudentForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isArabic ? `تسجيل دفعة لـ ${selectedStudentForPayment.fullName}` : "Record Payment"}
              </h3>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {selectedStudentForPayment.subscriptionType === "monthly"
                  ? (isArabic ? "📅 اشتراك شهري" : "Monthly")
                  : (isArabic ? "🔢 باقة حصص" : "Package")}
              </span>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <span className="font-bold text-slate-600">{isArabic ? "سعر الحصة المسجل:" : "Lesson Cost:"}</span>
                <span className="font-black text-blue-800 text-sm">{selectedStudentForPayment.lessonCost || 100} {isArabic ? "ج.م" : "EGP"}</span>
              </div>

              {selectedStudentForPayment.subscriptionType === "lessons_count" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isArabic ? "عدد الحصص المراد شحنها:" : "Number of Lessons:"}
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
                  {isArabic ? "ملاحظات الدفعة (اختياري):" : "Notes (Optional):"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={isArabic ? "سداد الرسوم، دفعة نقدية، فودافون كاش..." : "e.g. Cash, Vodafone Cash..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForPayment(null)}
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
