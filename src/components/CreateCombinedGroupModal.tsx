import React, { useState } from "react";
import {
  X,
  Users,
  Check,
  Search,
  Sparkles,
  Layers,
  GraduationCap,
  Link,
  MessageSquare
} from "lucide-react";
import { Student, AppSettings, CombinedStudentGroup } from "../types";

interface CreateCombinedGroupModalProps {
  availableStudents?: Student[];
  students?: Student[];
  settings?: AppSettings;
  combinedStudentGroups?: CombinedStudentGroup[];
  isArabic?: boolean;
  preSelectedStudentIds?: string[];
  initialSelectedStudentIds?: string[];
  onClose: () => void;
  onCreate?: (name: string, studentIds: string[], notes?: string, sharedParentContact?: string, sharedGroupLink?: string) => void;
  onCreateGroup?: (name: string, studentIds: string[], notes?: string, sharedParentContact?: string, sharedGroupLink?: string) => void;
}

export const CreateCombinedGroupModal: React.FC<CreateCombinedGroupModalProps> = ({
  availableStudents,
  students,
  settings,
  combinedStudentGroups = [],
  isArabic: isArabicProp,
  preSelectedStudentIds,
  initialSelectedStudentIds,
  onClose,
  onCreate,
  onCreateGroup
}) => {
  const isArabic = isArabicProp !== undefined ? isArabicProp : (settings?.preferredLanguage !== "en");
  const allAvailableStudents = (
    Array.isArray(availableStudents) && availableStudents.length > 0
      ? availableStudents
      : (Array.isArray(students) ? students : [])
  ).filter(Boolean);

  const initialIds = (
    Array.isArray(initialSelectedStudentIds) && initialSelectedStudentIds.length > 0
      ? initialSelectedStudentIds
      : (Array.isArray(preSelectedStudentIds) ? preSelectedStudentIds : [])
  ).filter(Boolean);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [groupName, setGroupName] = useState(() => {
    if (initialIds.length > 0) {
      const names = allAvailableStudents
        .filter(s => s && initialIds.includes(s.id))
        .map(s => s?.fullName ? s.fullName.trim().split(" ")[0] : "")
        .filter(Boolean);
      if (names.length > 0) {
        return names.join(" و ");
      }
    }
    return "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [sharedParentContact, setSharedParentContact] = useState(() => {
    if (initialIds.length > 0) {
      const st = allAvailableStudents.find(s => s && initialIds.includes(s.id) && s.parentContact);
      return st ? st.parentContact : "";
    }
    return "";
  });
  const [sharedGroupLink, setSharedGroupLink] = useState(() => {
    if (initialIds.length > 0) {
      const st = allAvailableStudents.find(s => s && initialIds.includes(s.id) && s.whatsappGroupLink);
      return st?.whatsappGroupLink || "";
    }
    return "";
  });

  // Map of student IDs that already belong to another combined group
  const studentExistingGroupMap = new Map<string, string>();
  (combinedStudentGroups || []).forEach(cg => {
    if (cg && Array.isArray(cg.studentIds)) {
      cg.studentIds.forEach(id => {
        studentExistingGroupMap.set(id, cg.name);
      });
    }
  });

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Auto-update group name suggestion if user hasn't typed a custom non-join name
      if (!groupName || groupName.includes(" و ")) {
        const names = allAvailableStudents
          .filter(s => s && next.includes(s.id))
          .map(s => s?.fullName ? s.fullName.trim().split(" ")[0] : "")
          .filter(Boolean);
        if (names.length > 0) {
          setGroupName(names.join(" و "));
        }
      }
      // Auto-suggest shared parent contact if empty
      if (!sharedParentContact) {
        const st = allAvailableStudents.find(s => s && next.includes(s.id) && s.parentContact);
        if (st) setSharedParentContact(st.parentContact);
      }
      // Auto-suggest shared group link if empty
      if (!sharedGroupLink) {
        const stLink = allAvailableStudents.find(s => s && next.includes(s.id) && s.whatsappGroupLink);
        if (stLink?.whatsappGroupLink) setSharedGroupLink(stLink.whatsappGroupLink);
      }
      return next;
    });
  };

  const filteredStudents = allAvailableStudents.filter(s => {
    if (!s) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
      (s.parentContact && s.parentContact.includes(q)) ||
      (s.academicYear && s.academicYear.toLowerCase().includes(q)) ||
      (s.subject && s.subject.toLowerCase().includes(q))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length < 2) {
      alert(isArabic ? "يرجى اختيار طالبين على الأقل لدمجهما في ملف مجمع واحد." : "Please select at least 2 students to merge.");
      return;
    }
    const finalName = groupName.trim() || (isArabic ? `ملف مجمع (${selectedIds.length} طلاب)` : `Combined File (${selectedIds.length} students)`);
    const callback = onCreateGroup || onCreate;
    if (callback) {
      callback(
        finalName,
        selectedIds,
        notes.trim() || undefined,
        sharedParentContact.trim() || undefined,
        sharedGroupLink.trim() || undefined
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir={isArabic ? "rtl" : "ltr"}>
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>{isArabic ? "جمع ملفات طلاب في ملف مجمع" : "Merge Students into Combined File"}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  {selectedIds.length} {isArabic ? "محدد" : "selected"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {isArabic
                  ? "دمج حسابات وإحصائيات الطلاب (مثل الإخوة أو العائلة) في ملف مجمع واحد مع وصف شامل ومالية موحدة"
                  : "Bundle student records together with unified overview and financial tracking"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 py-3 text-xs">
          {/* Group Name & Shared Contact & Group Link */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                {isArabic ? "🏷️ اسم الملف المجمع / المجموعة *" : "🏷️ Combined Group Name *"}
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder={isArabic ? "مثال: أبناء عائلة الشريف، أو أحمد وسارة" : "e.g. Al-Sharif Family / Ahmed & Sara"}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-indigo-700 font-medium">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{isArabic ? "يمكنك تسمية الملف باسم العائلة أو أسماء الطلاب المدمجين وتعديله في أي وقت." : "You can name this by family name or student names."}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-indigo-100/70">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                  📱 {isArabic ? "رقم ولي الأمر المشترك (واتساب)" : "Shared Parent WhatsApp"}
                </label>
                <input
                  type="text"
                  value={sharedParentContact}
                  onChange={e => setSharedParentContact(e.target.value)}
                  placeholder="+201000000000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                  🔗 {isArabic ? "رابط الجروب المشترك (واتساب / تليجرام)" : "Shared Group Link (WhatsApp/Telegram)"}
                </label>
                <input
                  type="text"
                  value={sharedGroupLink}
                  onChange={e => setSharedGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[10.5px]">
                📝 {isArabic ? "ملاحظات إضافية عن الملف" : "Notes"}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isArabic ? "ملاحظات خاصة بالمجموعة أو العائلة..." : "Optional group notes..."}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Student Selector Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isArabic ? "اختر الطلاب المراد ضمهم للملف المجمع (2 على الأقل):" : "Select Students to Merge (Min 2):"}</span>
              </label>
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold"
                  >
                    {isArabic ? "إلغاء التحديد" : "Clear"}
                  </button>
                )}
                <span className="text-[10.5px] text-slate-500 font-medium">
                  {selectedIds.length} / {allAvailableStudents.length} {isArabic ? "طالب" : "students"}
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "بحث في الطلاب بالاسم أو المرحلة أو الهاتف أو المادة..." : "Search students..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Students Checklist List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  {isArabic ? "لا يوجد طلاب متاحون للمطابقة" : "No matching students available"}
                </div>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedIds.includes(student.id);
                  const existingGroupName = studentExistingGroupMap.get(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition select-none ${
                        isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{student.fullName}</span>
                            {student.academicYear && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9.5px] font-bold border border-amber-200/60">
                                {student.academicYear}
                              </span>
                            )}
                            {existingGroupName && !isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200">
                                📁 {isArabic ? `مجمع في: ${existingGroupName}` : `In: ${existingGroupName}`}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {student.subject && (
                              <span className="text-indigo-600 font-medium">📚 {student.subject}</span>
                            )}
                            {student.parentContact && (
                              <span className="font-mono dir-ltr">📱 {student.parentContact}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        {student.studentNumber ? `#${student.studentNumber}` : ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notice */}
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[10.5px] leading-relaxed flex items-start gap-1.5">
            <span className="text-indigo-600 font-bold shrink-0">ℹ️</span>
            <span>
              {isArabic
                ? "عند جمع الطلاب، ستختفي بطاقاتهم الفردية من قائمة الطلاب الرئيسية وتظهر كملف مجمع موحد، وستظل كافة بيانات كل طالب وتقاريره وحصصه محفوظة ومتاحة بالكامل داخل الملف المجمع."
                : "Merged students will appear under this unified group file card in the main list. All personal reports and data remain fully intact inside the file."}
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={selectedIds.length < 2}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-md ${
                selectedIds.length >= 2
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {isArabic
                  ? `إنشاء الملف المجمع (${selectedIds.length} طلاب)`
                  : `Create Combined File (${selectedIds.length})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
