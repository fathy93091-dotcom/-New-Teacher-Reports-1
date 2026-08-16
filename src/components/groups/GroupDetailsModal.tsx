import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Plus,
  Play,
  Edit2,
  Trash2,
  Share2,
  Search,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Phone,
  BookOpen,
  Calendar,
  Award,
  Filter,
  Layers,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import {
  Group,
  Student,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings
} from "../../types";
import { calculateStudentFinancials } from "../../lib/financeUtils";
import { formatTime12h } from "../MixedScheduleEditor";

interface GroupDetailsModalProps {
  group: Group;
  settings: AppSettings;
  students: Student[];
  attendanceRecords?: AttendanceRecord[];
  examRecords?: ExamRecord[];
  paymentTransactions?: PaymentTransaction[];
  reports?: GeneratedReport[];
  onClose: () => void;
  onOpenGroupReport?: (group: Group) => void;
  onLaunchAttendance: (group: Group) => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
  onUpdateGroupStudentIds: (groupId: string, newStudentIds: string[]) => void;
  onOpenStudentProfile: (student: Student) => void;
  onOpenQuickAddStudentModal: (group: Group) => void;
  onOpenPaymentModal: (student: Student) => void;
  onOpenExamModal: (student: Student) => void;
  onOpenEditStudentModal: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  group,
  settings,
  students,
  attendanceRecords = [],
  examRecords = [],
  paymentTransactions = [],
  reports = [],
  onClose,
  onOpenGroupReport,
  onLaunchAttendance,
  onEditGroup,
  onDeleteGroup,
  onUpdateGroupStudentIds,
  onOpenStudentProfile,
  onOpenQuickAddStudentModal,
  onOpenPaymentModal,
  onOpenExamModal,
  onOpenEditStudentModal,
  onDeleteStudent
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [financialFilter, setFinancialFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [showExistingSelector, setShowExistingSelector] = useState(false);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const [existingSearchQuery, setExistingSearchQuery] = useState("");

  // In-app confirmation dialog states
  const [studentToDeleteFromSystem, setStudentToDeleteFromSystem] = useState<Student | null>(null);
  const [studentToRemoveFromGroup, setStudentToRemoveFromGroup] = useState<Student | null>(null);

  // Resolve students currently in this group
  const groupStudentIds = group.studentIds || [];
  const enrolledStudents = students.filter(s => groupStudentIds.includes(s.id));

  // Available students not yet in this group
  const availableStudents = students.filter(s => !groupStudentIds.includes(s.id) && s.status === "active");

  // Filter enrolled students
  const filteredEnrolledStudents = enrolledStudents.filter(st => {
    const matchesSearch =
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.studentPhone && st.studentPhone.includes(searchQuery)) ||
      (st.parentContact && st.parentContact.includes(searchQuery));

    if (!matchesSearch) return false;

    if (financialFilter === "all") return true;
    const fin = calculateStudentFinancials(st, attendanceRecords);
    if (financialFilter === "unpaid") return fin.amountDue > 0;
    if (financialFilter === "paid") return fin.amountDue === 0;
    return true;
  });

  const handleConfirmRemoveFromGroup = () => {
    if (!studentToRemoveFromGroup) return;
    const nextIds = groupStudentIds.filter(id => id !== studentToRemoveFromGroup.id);
    onUpdateGroupStudentIds(group.id, nextIds);
    setStudentToRemoveFromGroup(null);
  };

  const handleAddSelectedExistingToGroup = () => {
    if (selectedExistingIds.length === 0) return;
    const nextIds = Array.from(new Set([...groupStudentIds, ...selectedExistingIds]));
    onUpdateGroupStudentIds(group.id, nextIds);
    setSelectedExistingIds([]);
    setShowExistingSelector(false);
  };

  const handleToggleSelectAllExisting = () => {
    const filteredAvailable = availableStudents.filter(s =>
      s.fullName.toLowerCase().includes(existingSearchQuery.toLowerCase())
    );
    if (selectedExistingIds.length === filteredAvailable.length) {
      setSelectedExistingIds([]);
    } else {
      setSelectedExistingIds(filteredAvailable.map(s => s.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-5xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-2 max-h-[96vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-600/30 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-slate-900">{group.name}</h1>
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-black">
                  {group.subject}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                  group.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  {group.status === "active" ? (isArabic ? "نشطة" : "Active") : (isArabic ? "متوقفة" : "Paused")}
                </span>
              </div>

              {/* Schedule Slots */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10.5px] font-bold text-slate-600">
                <span>{isArabic ? "المواعيد:" : "Schedule:"}</span>
                {group.scheduleSlots && group.scheduleSlots.length > 0 ? (
                  group.scheduleSlots.map((slot, sIdx) => (
                    <span key={sIdx} className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-mono">
                      📅 {slot.day} ⏰ {formatTime12h(slot.time, isArabic)} ({slot.durationMinutes || 90}د)
                    </span>
                  ))
                ) : (
                  <span>{group.days.join("، ")} ({formatTime12h(group.time, isArabic)})</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {onOpenGroupReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGroupReport(group);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition"
              >
                <span>📋</span>
                <span>{isArabic ? "تقرير المجموعة" : "Group Report"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onLaunchAttendance(group)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isArabic ? "بدء الحصة المباشرة" : "Launch Class"}</span>
            </button>

            <button
              type="button"
              onClick={() => onEditGroup(group)}
              title={isArabic ? "تعديل بيانات المجموعة ومواعيدها" : "Edit Group"}
              className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteGroup(group)}
              title={isArabic ? "حذف هذه المجموعة" : "Delete Group"}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbars & Stats Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 my-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-800 shadow-2xs">
              👥 {isArabic ? "إجمالي المقيدين:" : "Enrolled:"}{" "}
              <strong className="text-blue-700 text-sm font-black">{enrolledStudents.length}</strong> {isArabic ? "طالب" : "students"}
            </div>

            {group.whatsappGroupLink && (
              <a
                href={group.whatsappGroupLink.startsWith("http") ? group.whatsappGroupLink : `https://${group.whatsappGroupLink}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold text-xs flex items-center gap-1 transition shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isArabic ? "جروب الواتساب" : "WhatsApp Group"}</span>
              </a>
            )}
          </div>

          {/* Quick Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExistingSelector(!showExistingSelector)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isArabic ? "➕ إضافة من الطلاب المسجلين" : "+ Add Existing Student"}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuickAddStudentModal(group)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isArabic ? "+ إضافة طالب جديد" : "+ Add New Student"}</span>
            </button>
          </div>
        </div>

        {/* Existing Student Multi-Picker Drawer */}
        {showExistingSelector && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 mb-3 shrink-0 animate-in fade-in space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-blue-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{isArabic ? "إضافة طلاب مسجلين بالنظام إلى هذه المجموعة:" : "Enroll existing students:"}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowExistingSelector(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isArabic ? "بحث في الطلاب المسجلين..." : "Search students..."}
                  value={existingSearchQuery}
                  onChange={e => setExistingSearchQuery(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAllExisting}
                className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-800 font-bold text-[11px] whitespace-nowrap"
              >
                {isArabic ? "تحديد / إلغاء الكل" : "Select All"}
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto bg-white rounded-xl border border-blue-200 p-2 space-y-1">
              {availableStudents.length === 0 ? (
                <p className="text-center py-3 text-slate-400 text-xs">
                  {isArabic ? "جميع الطلاب النشطين مسجلون بالفعل في هذه المجموعة" : "All students already enrolled"}
                </p>
              ) : (
                availableStudents
                  .filter(s => s.fullName.toLowerCase().includes(existingSearchQuery.toLowerCase()))
                  .map(st => (
                    <label key={st.id} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExistingIds.includes(st.id)}
                        onChange={() => {
                          if (selectedExistingIds.includes(st.id)) {
                            setSelectedExistingIds(selectedExistingIds.filter(id => id !== st.id));
                          } else {
                            setSelectedExistingIds([...selectedExistingIds, st.id]);
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-800">{st.fullName}</span>
                      <span className="text-[10px] text-slate-400">({st.subject})</span>
                    </label>
                  ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExistingSelector(false)}
                className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={selectedExistingIds.length === 0}
                onClick={handleAddSelectedExistingToGroup}
                className="px-4 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-xs"
              >
                {isArabic ? `إضافة (${selectedExistingIds.length}) للمجموعة` : `Add (${selectedExistingIds.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Search & Financial Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={isArabic ? "بحث باسم الطالب أو رقم الهاتف داخل المجموعة..." : "Search student or phone in group..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFinancialFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                financialFilter === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
              }`}
            >
              {isArabic ? `الكل (${enrolledStudents.length})` : `All (${enrolledStudents.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFinancialFilter("unpaid")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                financialFilter === "unpaid" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
              }`}
            >
              {isArabic ? "مستحق سداد" : "Unpaid"}
            </button>
            <button
              type="button"
              onClick={() => setFinancialFilter("paid")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                financialFilter === "paid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
              }`}
            >
              {isArabic ? "مسدد بالكامل" : "Paid"}
            </button>
          </div>
        </div>

        {/* Scrollable Students Roster Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {filteredEnrolledStudents.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">
                {enrolledStudents.length === 0
                  ? (isArabic ? "لا يوجد طلاب مقيدون في هذه المجموعة بعد" : "No students enrolled yet")
                  : (isArabic ? "لا توجد نتائج تطابق البحث" : "No matching students found")}
              </p>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? "اضغط على زر (استيراد 50+ طالب) أو (طالب جديد) لإضافة الطلاب بسهولة"
                  : "Use Bulk Paste or New Student to add students"}
              </p>
            </div>
          ) : (
            filteredEnrolledStudents.map((student, idx) => {
              const fin = calculateStudentFinancials(student, attendanceRecords);
              const cleanParentPhone = (student.parentContact || "").replace(/[^0-9]/g, "");

              return (
                <div
                  key={student.id}
                  className="p-3 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-slate-400 font-mono text-[11px] shrink-0">{idx + 1}</span>
                    <div
                      onClick={() => onOpenStudentProfile(student)}
                      className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs shrink-0 cursor-pointer hover:bg-blue-200 transition"
                    >
                      {student.fullName ? student.fullName.charAt(0) : "ط"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile(student)}
                          className="font-black text-slate-900 hover:text-blue-700 transition text-left sm:text-right truncate"
                        >
                          {student.fullName}
                        </button>
                        {student.academicYear && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-bold flex items-center gap-0.5">
                            <span>🎓</span>
                            <span>{student.academicYear}</span>
                          </span>
                        )}
                        {student.curriculum && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200/80 font-bold flex items-center gap-0.5">
                            <span>🌍</span>
                            <span>{student.curriculum}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10.5px] text-slate-500 font-medium mt-0.5 flex-wrap">
                        {student.studentPhone && <span>📱 {student.studentPhone}</span>}
                        {student.parentContact && <span>👨‍👩‍👦 {student.parentContact}</span>}
                        {cleanParentPhone && (
                          <a
                            href={`https://wa.me/${cleanParentPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>واتساب</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Status Badges + Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                    
                    {/* Financial Badge */}
                    <div className="text-right">
                      {fin.amountDue > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-black text-[10.5px] whitespace-nowrap">
                          {isArabic ? `مستحق: ${fin.amountDue} ج.م` : `Due: ${fin.amountDue}`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10.5px] whitespace-nowrap">
                          {student.subscriptionType === "lessons_count"
                            ? `${fin.remainingLessons} حصص متبقية`
                            : (isArabic ? "مسدد بالكامل" : "Paid")}
                        </span>
                      )}
                    </div>

                    {/* Actions Toolbar per student */}
                    <div className="flex items-center gap-1">
                      {/* View Profile */}
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile(student)}
                        title={isArabic ? "عرض الملف الشخصي الشامل" : "View Profile"}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 border border-blue-200 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isArabic ? "الملف" : "Profile"}</span>
                      </button>

                      {/* Record Payment */}
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(student)}
                        title={isArabic ? "تسجيل دفعة مالية / شحن رصيد" : "Record Payment"}
                        className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>

                      {/* Add Exam Score */}
                      <button
                        type="button"
                        onClick={() => onOpenExamModal(student)}
                        title={isArabic ? "إضافة درجة اختبار" : "Add Exam Score"}
                        className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Student Info */}
                      <button
                        type="button"
                        onClick={() => onOpenEditStudentModal(student)}
                        title={isArabic ? "تعديل بيانات الطالب" : "Edit Student Info"}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove from Group */}
                      <button
                        type="button"
                        onClick={() => setStudentToRemoveFromGroup(student)}
                        title={isArabic ? "إلغاء قيد الطالب من هذه المجموعة فقط" : "Remove from Group"}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Student completely */}
                      <button
                        type="button"
                        onClick={() => setStudentToDeleteFromSystem(student)}
                        title={isArabic ? "حذف الطالب نهائياً من النظام" : "Delete Student"}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onDeleteGroup(group)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isArabic ? "حذف المجموعة" : "Delete Group"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
          >
            {isArabic ? "إغلاق نافذة المجموعة" : "Close"}
          </button>
        </div>

        {/* Confirmation Modal: Remove Student from Group */}
        {studentToRemoveFromGroup && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <X className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `إلغاء قيد "${studentToRemoveFromGroup.fullName}"؟` : `Remove "${studentToRemoveFromGroup.fullName}"?`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isArabic
                    ? "سيتم استبعاد الطالب من هذه المجموعة فقط، وستظل جميع بياناته وسجلاته المالية محفوظة بأمان في النظام."
                    : "The student will be removed from this group only. All records remain safely in the system."}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudentToRemoveFromGroup(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveFromGroup}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-md shadow-amber-600/30"
                >
                  {isArabic ? "تأكيد الاستبعاد من المجموعة" : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Delete Student Permanently */}
        {studentToDeleteFromSystem && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-900 text-base">
                  {isArabic ? `حذف الطالب "${studentToDeleteFromSystem.fullName}" نهائياً؟` : `Permanently delete "${studentToDeleteFromSystem.fullName}"?`}
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
                  onClick={() => setStudentToDeleteFromSystem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  {isArabic ? "إلغاء التراجع" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteStudent(studentToDeleteFromSystem.id);
                    setStudentToDeleteFromSystem(null);
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
