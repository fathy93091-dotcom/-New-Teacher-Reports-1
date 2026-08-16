import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Calendar,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Edit2,
  PlusCircle,
  FileText,
  Trash2,
  Share2
} from "lucide-react";
import {
  Student,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings
} from "../../types";
import { calculateStudentFinancials } from "../../lib/financeUtils";

interface GroupStudentProfileModalProps {
  student: Student;
  settings: AppSettings;
  attendanceRecords?: AttendanceRecord[];
  examRecords?: ExamRecord[];
  paymentTransactions?: PaymentTransaction[];
  reports?: GeneratedReport[];
  onClose: () => void;
  onEditStudent?: (studentId: string, data: Partial<Student>) => void;
  onOpenPaymentModal?: (student: Student) => void;
  onOpenExamModal?: (student: Student) => void;
  onRemoveFromGroup?: (studentId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
}

export const GroupStudentProfileModal: React.FC<GroupStudentProfileModalProps> = ({
  student,
  settings,
  attendanceRecords = [],
  examRecords = [],
  paymentTransactions = [],
  reports = [],
  onClose,
  onEditStudent,
  onOpenPaymentModal,
  onOpenExamModal,
  onRemoveFromGroup,
  onDeleteStudent
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "finance" | "attendance" | "exams" | "reports">("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const financialSummary = calculateStudentFinancials(student, attendanceRecords);

  const studentAttendance = attendanceRecords.filter(r => r.studentId === student.id);
  const studentExams = examRecords.filter(r => r.studentId === student.id);
  const studentPayments = paymentTransactions.filter(p => p.studentId === student.id);
  const studentReports = reports.filter(r => r.studentId === student.id);

  const cleanParentPhone = (student.parentContact || "").replace(/[^0-9]/g, "");
  const cleanStudentPhone = (student.studentPhone || "").replace(/[^0-9]/g, "");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shadow-2xs">
              {student.fullName ? student.fullName.charAt(0) : "ط"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">{student.fullName}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  {student.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "متوقف" : "Paused")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {student.academicYear || student.subject || (isArabic ? "طالب مسجل" : "Registered Student")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Financial Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 shrink-0">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-500">{isArabic ? "الحصص المنفذة" : "Attended"}</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">
              {financialSummary.totalAttendedLessons} {isArabic ? "حصة" : "lessons"}
            </p>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200/70">
            <p className="text-[10px] font-bold text-blue-700">{isArabic ? "الرصيد المتبقي" : "Remaining"}</p>
            <p className="text-sm font-black text-blue-900 mt-0.5">
              {student.subscriptionType === "lessons_count" ? `${financialSummary.remainingLessons} حصص` : `${financialSummary.remainingBalance} ج.م`}
            </p>
          </div>

          <div className={`p-2.5 rounded-2xl border ${
            financialSummary.amountDue > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"
          }`}>
            <p className={`text-[10px] font-bold ${financialSummary.amountDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {financialSummary.amountDue > 0 ? (isArabic ? "المستحق سداده" : "Due") : (isArabic ? "حالة الدفع" : "Status")}
            </p>
            <p className={`text-sm font-black mt-0.5 ${financialSummary.amountDue > 0 ? "text-rose-900" : "text-emerald-900"}`}>
              {financialSummary.amountDue > 0 ? `${financialSummary.amountDue} ج.م` : (isArabic ? "مسدد بالكامل" : "Paid")}
            </p>
          </div>

          <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-200/70">
            <p className="text-[10px] font-bold text-purple-700">{isArabic ? "تكلفة الحصة" : "Cost/Lesson"}</p>
            <p className="text-sm font-black text-purple-900 mt-0.5">
              {student.lessonCost || 50} {isArabic ? "ج.م" : "EGP"}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-3 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === "overview" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            {isArabic ? "📋 البيانات الأساسية" : "Overview"}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("finance")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === "finance" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            {isArabic ? `💰 المدفوعات (${studentPayments.length})` : `Payments (${studentPayments.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("attendance")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === "attendance" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            {isArabic ? `📅 الحضور (${studentAttendance.length})` : `Attendance (${studentAttendance.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("exams")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === "exams" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            {isArabic ? `📝 الاختبارات (${studentExams.length})` : `Exams (${studentExams.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("reports")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === "reports" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
            }`}
          >
            {isArabic ? `📑 التقارير (${studentReports.length})` : `Reports (${studentReports.length})`}
          </button>
        </div>

        {/* Scrollable Sub-Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
          {activeSubTab === "overview" && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 text-[11.5px] border-b border-slate-200/60 pb-1.5">
                  {isArabic ? "معلومات التواصل" : "Contact Information"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
                    <span className="text-slate-500">{isArabic ? "هاتف الطالب:" : "Student Phone:"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold">{student.studentPhone || "—"}</span>
                      {cleanStudentPhone && (
                        <a
                          href={`https://wa.me/${cleanStudentPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
                    <span className="text-slate-500">{isArabic ? "هاتف ولي الأمر:" : "Parent Phone:"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold">{student.parentContact || "—"}</span>
                      {cleanParentPhone && (
                        <a
                          href={`https://wa.me/${cleanParentPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 text-[11.5px] border-b border-slate-200/60 pb-1.5">
                  {isArabic ? "تفاصيل الاشتراك والدراسة" : "Subscription Details"}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <p><span className="text-slate-500">{isArabic ? "المادة:" : "Subject:"}</span> <strong className="text-blue-700">{student.subject}</strong></p>
                  <p><span className="text-slate-500">{isArabic ? "نظام الدفع:" : "Plan:"}</span> <strong>{student.subscriptionType === "lessons_count" ? (isArabic ? "باقة حصص مسبقة" : "Lessons Pack") : (isArabic ? "حساب بالحصة" : "Pay Per Lesson")}</strong></p>
                  <p><span className="text-slate-500">{isArabic ? "إجمالي المسدد:" : "Total Paid:"}</span> <strong>{student.totalPaidAmount || 0} ج.م</strong></p>
                  <p><span className="text-slate-500">{isArabic ? "تاريخ التسجيل:" : "Joined:"}</span> <strong>{student.createdAt ? new Date(student.createdAt).toLocaleDateString("ar-EG") : "—"}</strong></p>
                </div>
                {student.notes && (
                  <p className="text-[11px] bg-white p-2 rounded-xl border border-slate-200/60 text-slate-600">
                    <strong>{isArabic ? "ملاحظات المعلم:" : "Notes:"}</strong> {student.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "finance" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-bold text-slate-800">{isArabic ? "سجل المدفوعات والشحن" : "Payment Records"}</h4>
                {onOpenPaymentModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPaymentModal(student)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تسجيل دفعة جديدة" : "+ Add Payment"}</span>
                  </button>
                )}
              </div>

              {studentPayments.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">{isArabic ? "لا توجد دفعات مالية مسجلة بعد" : "No payment records found"}</p>
              ) : (
                studentPayments.map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{p.amount} {isArabic ? "ج.م" : "EGP"}</p>
                      <p className="text-[10px] text-slate-400">{new Date(p.date).toLocaleDateString("ar-EG")} • {p.lessonsCount} {isArabic ? "حصص" : "lessons"}</p>
                      {p.notes && <p className="text-[10px] text-slate-500 mt-0.5">{p.notes}</p>}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {isArabic ? "مسدد" : "Paid"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === "attendance" && (
            <div className="space-y-2">
              {studentAttendance.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">{isArabic ? "لا توجد سجلات حضور مسجلة" : "No attendance records"}</p>
              ) : (
                studentAttendance.map(att => (
                  <div key={att.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{att.subject || student.subject}</p>
                      <p className="text-[10px] text-slate-400">{att.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.attendance === "present" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {att.attendance === "present" ? (isArabic ? "حاضر" : "Present") : (isArabic ? "غائب" : "Absent")}
                      </span>
                      {att.homeworkStatus && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {att.homeworkStatus === "done" ? (isArabic ? "تم الواجب" : "HW Done") : (isArabic ? "لم يحل" : "No HW")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === "exams" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-bold text-slate-800">{isArabic ? "سجل درجات الاختبارات" : "Exam Scores"}</h4>
                {onOpenExamModal && (
                  <button
                    type="button"
                    onClick={() => onOpenExamModal(student)}
                    className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{isArabic ? "إضافة اختبار" : "+ Add Exam"}</span>
                  </button>
                )}
              </div>

              {studentExams.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">{isArabic ? "لا توجد نتائج اختبارات مسجلة بعد" : "No exam records"}</p>
              ) : (
                studentExams.map(ex => {
                  const pct = Math.round((ex.score / ex.totalScore) * 100);
                  return (
                    <div key={ex.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{ex.examName}</p>
                        <p className="text-[10px] text-slate-400">{ex.date}</p>
                      </div>
                      <div className="text-left font-bold">
                        <span className="text-purple-700 font-mono text-sm">{ex.score}/{ex.totalScore}</span>
                        <span className={`mr-2 px-1.5 py-0.2 rounded text-[10px] ${pct >= 85 ? "bg-emerald-100 text-emerald-800" : pct >= 50 ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeSubTab === "reports" && (
            <div className="space-y-2">
              {studentReports.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">{isArabic ? "لا توجد تقارير صادرة لهذا الطالب" : "No issued reports"}</p>
              ) : (
                studentReports.map(rep => (
                  <div key={rep.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{rep.subject} - {isArabic ? `الحصة ${rep.lessonNumber}` : `Lesson ${rep.lessonNumber}`}</span>
                      <span className="text-[10px] text-slate-400">{rep.date}</span>
                    </div>
                    <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 leading-relaxed text-[11px]">{rep.reportText}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onRemoveFromGroup && (
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition border border-amber-200"
              >
                {isArabic ? "إلغاء القيد من المجموعة" : "Remove from Group"}
              </button>
            )}
            {onDeleteStudent && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                <span>{isArabic ? "حذف نهائي" : "Delete"}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        {/* Confirmation Modal: Remove Student from Group */}
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <X className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `إلغاء قيد "${student.fullName}"؟` : `Remove "${student.fullName}"?`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isArabic
                    ? "سيتم استبعاد الطالب من هذه المجموعة فقط، وستظل جميع بياناته وسجلاته المالية محفوظة في النظام."
                    : "The student will be removed from this group only. All records remain safely in the system."}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRemoveFromGroup) onRemoveFromGroup(student.id);
                    setShowRemoveConfirm(false);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-md shadow-amber-600/30"
                >
                  {isArabic ? "تأكيد الاستبعاد من المجموعة" : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Delete Student Permanently */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `حذف الطالب "${student.fullName}" نهائياً؟` : `Permanently delete "${student.fullName}"?`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isArabic
                    ? "هل أنت متأكد؟ سيتم مسح هذا الطالب نهائياً من النظام وجميع المجموعات المرتبطة به وسجلاته."
                    : "Are you sure? This will delete the student and their associated records permanently."}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  {isArabic ? "إلغاء التراجع" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteStudent) onDeleteStudent(student.id);
                    setShowDeleteConfirm(false);
                    onClose();
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

      </div>
    </div>
  );
};
