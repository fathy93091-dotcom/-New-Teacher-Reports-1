import React, { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Archive,
  RotateCcw,
  BookOpen,
  Edit2,
  Trash2,
  X,
  Check,
  Brain,
  Calendar,
  Globe,
  Phone,
  UserCheck,
  FileText,
  Award,
  Clock,
  Eye,
  Sparkles,
  Pencil,
  CheckCircle2,
  List,
  User as UserIcon,
  MapPin,
  Smile
} from "lucide-react";
import {
  Student,
  SubjectName,
  AppSettings,
  Gender,
  DailyReport,
  MonthlyReport
} from "../types";

interface StudentsViewProps {
  students: Student[];
  settings: AppSettings;
  dailyReports?: DailyReport[];
  monthlyReports?: MonthlyReport[];
  onSelectReport?: (report: DailyReport | MonthlyReport) => void;
  onAddStudent: (student: Omit<Student, "id" | "teacherId" | "createdAt">) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onDeleteStudent?: (id: string) => void;
  onArchiveStudent: (id: string) => void;
  onRestoreStudent: (id: string) => void;
  onStartSessionForStudent: (studentId: string) => void;
  onViewStudentMemory: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  settings,
  dailyReports = [],
  monthlyReports = [],
  onSelectReport,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onArchiveStudent,
  onRestoreStudent,
  onStartSessionForStudent,
  onViewStudentMemory
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Active" | "Archived" | "All">("Active");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<"info" | "daily" | "monthly">("info");

  // Add Student Form State (ALL FIELDS OPTIONAL)
  const [addFormData, setAddFormData] = useState({
    fullName: "",
    preferredName: "",
    gender: "Male" as Gender,
    dateOfBirth: "",
    age: "",
    nationality: "",
    country: "",
    timeZone: "",
    parentName: "",
    parentContact: "",
    currentLevel: "",
    subjects: ["Holy Qur'an"] as SubjectName[],
    notes: ""
  });

  // Edit Student Form State (ALL FIELDS OPTIONAL)
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    preferredName: "",
    gender: "Male" as Gender,
    dateOfBirth: "",
    age: "",
    nationality: "",
    country: "",
    timeZone: "",
    parentName: "",
    parentContact: "",
    currentLevel: "",
    subjects: [] as SubjectName[],
    notes: "",
    status: "Active" as "Active" | "Archived"
  });

  const availableSubjects: SubjectName[] = [
    "Holy Qur'an",
    "Tajweed",
    "Arabic Language",
    "Islamic Studies",
    "English Language"
  ];

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      (student.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.parentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.currentLevel || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === "All") return matchesSearch;
    return matchesSearch && student.status === filterStatus;
  });

  const handleAddSubjectToggle = (subj: SubjectName) => {
    setAddFormData(prev => {
      const exists = prev.subjects.includes(subj);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== subj) : [...prev.subjects, subj]
      };
    });
  };

  const handleEditSubjectToggle = (subj: SubjectName) => {
    setEditFormData(prev => {
      const exists = prev.subjects.includes(subj);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== subj) : [...prev.subjects, subj]
      };
    });
  };

  // Create Student (NO REQUIRED FIELDS)
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = addFormData.fullName.trim() || (isArabic ? "طالب جديد" : "New Student");
    const finalParent = addFormData.parentName.trim() || (isArabic ? "غير محدد" : "Not specified");
    const parsedAge = addFormData.age ? parseInt(addFormData.age) : 10;

    onAddStudent({
      fullName: finalName,
      preferredName: addFormData.preferredName || "",
      gender: addFormData.gender,
      dateOfBirth: addFormData.dateOfBirth || "2015-01-01",
      age: isNaN(parsedAge) ? 10 : parsedAge,
      nationality: addFormData.nationality || (isArabic ? "غير محدد" : "Unspecified"),
      country: addFormData.country || (isArabic ? "غير محدد" : "Unspecified"),
      timeZone: addFormData.timeZone || "UTC",
      parentName: finalParent,
      parentContact: addFormData.parentContact || "",
      currentLevel: addFormData.currentLevel || (isArabic ? "مستوى مبتدئ" : "Beginner Level"),
      subjects: addFormData.subjects.length > 0 ? addFormData.subjects : ["Holy Qur'an"],
      notes: addFormData.notes || "",
      status: "Active"
    });

    setIsAddModalOpen(false);
    // Reset form
    setAddFormData({
      fullName: "",
      preferredName: "",
      gender: "Male",
      dateOfBirth: "",
      age: "",
      nationality: "",
      country: "",
      timeZone: "",
      parentName: "",
      parentContact: "",
      currentLevel: "",
      subjects: ["Holy Qur'an"],
      notes: ""
    });
  };

  // Open Profile Modal for Student
  const handleOpenProfile = (student: Student) => {
    setSelectedStudentForProfile(student);
    setIsEditingProfile(false);
    setProfileTab("info");
    setEditFormData({
      fullName: student.fullName || "",
      preferredName: student.preferredName || "",
      gender: student.gender || "Male",
      dateOfBirth: student.dateOfBirth || "",
      age: student.age ? String(student.age) : "",
      nationality: student.nationality || "",
      country: student.country || "",
      timeZone: student.timeZone || "",
      parentName: student.parentName || "",
      parentContact: student.parentContact || "",
      currentLevel: student.currentLevel || "",
      subjects: student.subjects || [],
      notes: student.notes || "",
      status: student.status || "Active"
    });
  };

  // Save Edit Student Profile Changes
  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForProfile) return;

    const updatedName = editFormData.fullName.trim() || selectedStudentForProfile.fullName || (isArabic ? "طالب" : "Student");
    const parsedAge = editFormData.age ? parseInt(editFormData.age) : selectedStudentForProfile.age;

    const updates: Partial<Student> = {
      fullName: updatedName,
      preferredName: editFormData.preferredName,
      gender: editFormData.gender,
      dateOfBirth: editFormData.dateOfBirth,
      age: isNaN(parsedAge) ? selectedStudentForProfile.age : parsedAge,
      nationality: editFormData.nationality,
      country: editFormData.country,
      timeZone: editFormData.timeZone,
      parentName: editFormData.parentName,
      parentContact: editFormData.parentContact,
      currentLevel: editFormData.currentLevel,
      subjects: editFormData.subjects,
      notes: editFormData.notes,
      status: editFormData.status
    };

    onUpdateStudent(selectedStudentForProfile.id, updates);

    // Update local state for profile view
    const updatedStudent = { ...selectedStudentForProfile, ...updates };
    setSelectedStudentForProfile(updatedStudent);
    setIsEditingProfile(false);
  };

  // Delete Student Profile
  const handleDeleteProfile = () => {
    if (!selectedStudentForProfile) return;
    const confirmMsg = isArabic
      ? `هل أنت متأكد من حذف ملف الطالب "${selectedStudentForProfile.fullName}" نهائياً من النظام والقاعدة السحابية؟`
      : `Are you sure you want to permanently delete student profile "${selectedStudentForProfile.fullName}"?`;

    if (confirm(confirmMsg)) {
      if (onDeleteStudent) {
        onDeleteStudent(selectedStudentForProfile.id);
      }
      setSelectedStudentForProfile(null);
    }
  };

  // Filter Reports for selected student
  const studentDailyReports = selectedStudentForProfile
    ? dailyReports.filter(r => r.studentId === selectedStudentForProfile.id)
    : [];

  const studentMonthlyReports = selectedStudentForProfile
    ? monthlyReports.filter(r => r.studentId === selectedStudentForProfile.id)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{isArabic ? "سجل إدارة ملفات الطلاب" : "Student Profiles Directory"}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isArabic
              ? "إدارة وتعديل وحذف ملفات الطلاب، مع الاطلاع الفوري على التقارير اليومية والشهرية لكل طالب"
              : "Manage, edit, delete student profiles & inspect individual daily and monthly reports"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>{isArabic ? "إضافة طالب جديد (جميع الحقول اختيارية)" : "Add Student (All Fields Optional)"}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isArabic ? "بحث باسم الطالب أو ولي الأمر..." : "Search student or parent name..."}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 font-medium transition"
          />
        </div>

        {/* Filter Status Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {(["Active", "Archived", "All"] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterStatus === st
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {st === "Active" ? (isArabic ? "النشطون" : "Active") : st === "Archived" ? (isArabic ? "المؤرشفون" : "Archived") : (isArabic ? "الكل" : "All")}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(student => {
          const dCount = dailyReports.filter(r => r.studentId === student.id).length;
          const mCount = monthlyReports.filter(r => r.studentId === student.id).length;

          return (
            <div
              key={student.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 transition hover:shadow-md cursor-pointer ${
                student.status === "Archived" ? "border-slate-200 opacity-75" : "border-emerald-100/90 hover:border-emerald-300 shadow-xs"
              }`}
              onClick={() => handleOpenProfile(student)}
            >
              <div className="space-y-3">
                {/* Header: Avatar, Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm border border-emerald-200 shrink-0">
                      {(student.fullName || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition">
                        {student.fullName || (isArabic ? "طالب بدون اسم" : "Unnamed Student")}
                      </h3>
                      <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <span>{student.currentLevel || (isArabic ? "غير محدد" : "Unspecified")}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      student.status === "Active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300"
                    }`}
                  >
                    {student.status === "Active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "مؤرشف" : "Archived")}
                  </span>
                </div>

                {/* Student Info Summary */}
                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  {student.parentName && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {isArabic ? "ولي الأمر:" : "Parent:"} <strong className="text-slate-800 font-bold">{student.parentName}</strong> {student.parentContact ? `(${student.parentContact})` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {student.country || (isArabic ? "الدولة غير محددة" : "No Country")} • {student.age ? `${student.age} ${isArabic ? "سنة" : "yrs"}` : (isArabic ? "العمر غير محدد" : "No Age")}
                    </span>
                  </div>
                </div>

                {/* Subjects Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(student.subjects || []).map(subj => (
                    <span
                      key={subj}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-200/80"
                    >
                      {subj}
                    </span>
                  ))}
                </div>

                {/* Reports Counter Pill */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {dCount} {isArabic ? "تقارير يومية" : "Daily Reports"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {mCount} {isArabic ? "تقارير شهرية" : "Monthly Reports"}
                  </span>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenProfile(student)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold flex items-center gap-1 transition border border-emerald-200"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isArabic ? "فتح الملف الشخصي" : "Open Profile"}</span>
                  </button>

                  <button
                    onClick={() => onViewStudentMemory(student.id)}
                    className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center transition"
                    title={isArabic ? "سجل الذاكرة" : "Student Memory"}
                  >
                    <Brain className="w-3.5 h-3.5 text-amber-700" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {student.status === "Active" ? (
                    <>
                      <button
                        onClick={() => onStartSessionForStudent(student.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isArabic ? "بدء حصة" : "Session"}</span>
                      </button>

                      <button
                        onClick={() => onArchiveStudent(student.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 transition"
                        title={isArabic ? "أرشفة" : "Archive"}
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      {onDeleteStudent && (
                        <button
                          onClick={() => {
                            if (confirm(isArabic ? `هل أنت متأكد من حذف الطالب "${student.fullName}" نهائياً؟` : `Delete student "${student.fullName}" permanently?`)) {
                              onDeleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title={isArabic ? "حذف نهائي" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => onRestoreStudent(student.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isArabic ? "استعادة" : "Restore"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD STUDENT MODAL (ALL FIELDS OPTIONAL) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-emerald-100 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>{isArabic ? "إضافة طالب جديد" : "Add New Student"}</span>
                </h2>
                <p className="text-xs text-emerald-700 font-medium">
                  {isArabic ? "ملاحظة: جميع الحقول اختيارية، يمكنك إضافة البيانات المتوفرة فقط" : "Note: All fields are optional. Fill only what is available."}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isArabic ? "اسم الطالب (اختياري)" : "Student Full Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.fullName}
                    onChange={e => setAddFormData({ ...addFormData, fullName: e.target.value })}
                    placeholder={isArabic ? "مثال: عبد الله أحمد" : "e.g. Abdullah Ahmed"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isArabic ? "الاسم المفضل (اختياري)" : "Preferred Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.preferredName}
                    onChange={e => setAddFormData({ ...addFormData, preferredName: e.target.value })}
                    placeholder={isArabic ? "مثال: عبودة" : "e.g. Abood"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "الجنس" : "Gender"}</label>
                  <select
                    value={addFormData.gender}
                    onChange={e => setAddFormData({ ...addFormData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  >
                    <option value="Male">Male / ذكر</option>
                    <option value="Female">Female / أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "العمر (اختياري)" : "Age (Optional)"}</label>
                  <input
                    type="number"
                    value={addFormData.age}
                    onChange={e => setAddFormData({ ...addFormData, age: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isArabic ? "اسم ولي الأمر (اختياري)" : "Parent Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.parentName}
                    onChange={e => setAddFormData({ ...addFormData, parentName: e.target.value })}
                    placeholder={isArabic ? "مثال: أحمد علي" : "e.g. Ahmed Ali"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isArabic ? "هاتف ولي الأمر (اختياري)" : "Parent Phone (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.parentContact}
                    onChange={e => setAddFormData({ ...addFormData, parentContact: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "الدولة (اختياري)" : "Country (Optional)"}</label>
                  <input
                    type="text"
                    value={addFormData.country}
                    onChange={e => setAddFormData({ ...addFormData, country: e.target.value })}
                    placeholder={isArabic ? "الإمارات / السعودية / مصر..." : "UAE / KSA / Egypt..."}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "المستوى الحالي (اختياري)" : "Current Level (Optional)"}</label>
                  <input
                    type="text"
                    value={addFormData.currentLevel}
                    onChange={e => setAddFormData({ ...addFormData, currentLevel: e.target.value })}
                    placeholder={isArabic ? "جزء عم / تجويد / مبتدئ..." : "Juz Amma / Tajweed / Beginner..."}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  {isArabic ? "المواد المقررة (اختياري)" : "Teaching Subjects (Optional)"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map(subj => {
                    const isSelected = addFormData.subjects.includes(subj);
                    return (
                      <button
                        type="button"
                        key={subj}
                        onClick={() => handleAddSubjectToggle(subj)}
                        className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">{isArabic ? "ملاحظات المعلم (اختياري)" : "Teacher Notes (Optional)"}</label>
                <textarea
                  rows={2}
                  value={addFormData.notes}
                  onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات سلوكية، أسلوب التعلم، توصيات..." : "Behavioral notes, learning recommendations..."}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-emerald-600 focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/20"
                >
                  {isArabic ? "إضافة الطالب" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED STUDENT PROFILE VIEW MODAL */}
      {selectedStudentForProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-emerald-100 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg border border-emerald-300 shadow-2xs">
                  {(selectedStudentForProfile.fullName || "S").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{selectedStudentForProfile.fullName || (isArabic ? "طالب بدون اسم" : "Unnamed Student")}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedStudentForProfile.status === "Active"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {selectedStudentForProfile.status === "Active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "مؤرشف" : "Archived")}
                    </span>
                  </h2>
                  <p className="text-xs text-emerald-700 font-bold mt-0.5">
                    {selectedStudentForProfile.currentLevel || (isArabic ? "مستوى تعليمي غير محدد" : "Unspecified Level")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                    isEditingProfile
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditingProfile ? (isArabic ? "إلغاء التعديل" : "Cancel Edit") : (isArabic ? "تعديل البيانات" : "Edit Profile")}</span>
                </button>

                <button
                  onClick={() => {
                    const sid = selectedStudentForProfile.id;
                    setSelectedStudentForProfile(null);
                    onStartSessionForStudent(sid);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isArabic ? "بدء حصة جديدة" : "Start Session"}</span>
                </button>

                <button
                  onClick={() => {
                    const sid = selectedStudentForProfile.id;
                    setSelectedStudentForProfile(null);
                    onViewStudentMemory(sid);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center gap-1.5 transition"
                >
                  <Brain className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isArabic ? "الذاكرة والسجل" : "Student Memory"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onDeleteStudent && (
                  <button
                    onClick={handleDeleteProfile}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isArabic ? "حذف الطالب" : "Delete Student"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* EDIT MODE FORM vs DISPLAY MODE WITH TABS */}
            {isEditingProfile ? (
              <form onSubmit={handleSaveEditProfile} className="space-y-4 text-xs p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-emerald-200 pb-2">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  <span>{isArabic ? "تعديل بيانات ملف الطالب (جميع الحقول اختيارية)" : "Edit Student Information (All Fields Optional)"}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "اسم الطالب" : "Full Name"}</label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "الاسم المفضل" : "Preferred Name"}</label>
                    <input
                      type="text"
                      value={editFormData.preferredName}
                      onChange={e => setEditFormData({ ...editFormData, preferredName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "الجنس" : "Gender"}</label>
                    <select
                      value={editFormData.gender}
                      onChange={e => setEditFormData({ ...editFormData, gender: e.target.value as Gender })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    >
                      <option value="Male">Male / ذكر</option>
                      <option value="Female">Female / أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "العمر" : "Age"}</label>
                    <input
                      type="number"
                      value={editFormData.age}
                      onChange={e => setEditFormData({ ...editFormData, age: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "اسم ولي الأمر" : "Parent Name"}</label>
                    <input
                      type="text"
                      value={editFormData.parentName}
                      onChange={e => setEditFormData({ ...editFormData, parentName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "هاتف ولي الأمر" : "Parent Contact"}</label>
                    <input
                      type="text"
                      value={editFormData.parentContact}
                      onChange={e => setEditFormData({ ...editFormData, parentContact: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "الدولة" : "Country"}</label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={e => setEditFormData({ ...editFormData, country: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "المستوى الحالي" : "Current Level"}</label>
                    <input
                      type="text"
                      value={editFormData.currentLevel}
                      onChange={e => setEditFormData({ ...editFormData, currentLevel: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">{isArabic ? "المواد المقررة" : "Teaching Subjects"}</label>
                  <div className="flex flex-wrap gap-2">
                    {availableSubjects.map(subj => {
                      const isSelected = editFormData.subjects.includes(subj);
                      return (
                        <button
                          type="button"
                          key={subj}
                          onClick={() => handleEditSubjectToggle(subj)}
                          className={`px-3 py-1 rounded-xl border font-bold flex items-center gap-1 transition ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{subj}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "ملاحظات المعلم" : "Teacher Notes"}</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md"
                  >
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW MODE: TABS FOR DETAILS, DAILY REPORTS, AND MONTHLY REPORTS */
              <div className="space-y-4">
                {/* Profile Tabs Navigation */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setProfileTab("info")}
                    className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      profileTab === "info"
                        ? "bg-white text-emerald-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-emerald-600" />
                    <span>{isArabic ? "البيانات الشخصية والتعليمية" : "Profile Details"}</span>
                  </button>

                  <button
                    onClick={() => setProfileTab("daily")}
                    className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      profileTab === "daily"
                        ? "bg-white text-emerald-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isArabic ? "التقارير اليومية" : "Daily Reports"} ({studentDailyReports.length})
                    </span>
                  </button>

                  <button
                    onClick={() => setProfileTab("monthly")}
                    className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      profileTab === "monthly"
                        ? "bg-white text-emerald-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isArabic ? "التقارير الشهرية" : "Monthly Reports"} ({studentMonthlyReports.length})
                    </span>
                  </button>
                </div>

                {/* TAB 1: PROFILE DETAILS INFO */}
                {profileTab === "info" && (
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "الاسم المفضل" : "Preferred Name"}</span>
                        <span className="font-bold text-slate-900">{selectedStudentForProfile.preferredName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "الجنس والعمر" : "Gender & Age"}</span>
                        <span className="font-bold text-slate-900">
                          {selectedStudentForProfile.gender === "Male" ? (isArabic ? "ذكر" : "Male") : (isArabic ? "أنثى" : "Female")},{" "}
                          {selectedStudentForProfile.age ? `${selectedStudentForProfile.age} ${isArabic ? "سنة" : "yrs"}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "الدولة" : "Country"}</span>
                        <span className="font-bold text-slate-900">{selectedStudentForProfile.country || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "ولي الأمر" : "Parent Name"}</span>
                        <span className="font-bold text-slate-900">{selectedStudentForProfile.parentName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "هاتف ولي الأمر" : "Parent Contact"}</span>
                        <span className="font-bold text-slate-900">{selectedStudentForProfile.parentContact || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{isArabic ? "تاريخ التسجيل" : "Registered At"}</span>
                        <span className="font-bold text-slate-900">{selectedStudentForProfile.createdAt || "-"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-800 block font-bold mb-1.5">{isArabic ? "المواد الدراسية المقررة" : "Enrolled Subjects"}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedStudentForProfile.subjects || []).map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedStudentForProfile.notes && (
                      <div>
                        <span className="text-slate-800 block font-bold mb-1">{isArabic ? "ملاحظات وتوصيات المعلم" : "Teacher Notes"}</span>
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-slate-800 font-medium leading-relaxed">
                          "{selectedStudentForProfile.notes}"
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DAILY REPORTS FOR THIS STUDENT */}
                {profileTab === "daily" && (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {studentDailyReports.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500 font-bold">
                          {isArabic ? "لا توجد تقارير يومية مسجلة لهذا الطالب حتى الآن" : "No daily reports found for this student yet."}
                        </p>
                      </div>
                    ) : (
                      studentDailyReports.map(report => (
                        <div
                          key={report.id}
                          className="bg-white p-3.5 rounded-xl border border-emerald-100/90 shadow-2xs hover:border-emerald-300 transition flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">{report.title || `Daily Report #${report.sessionNumber}`}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  report.isApproved
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {report.isApproved ? (isArabic ? "معتمد" : "Approved") : (isArabic ? "قيد المراجعة" : "Pending")}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                              {report.overallPerformanceSummary || report.teacherRemarks}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                              <span>📅 {report.date}</span>
                              <span>⏱️ {report.durationMinutes} min</span>
                              <span>📚 {report.subjectsCovered?.map(s => s.subject).join(", ")}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (onSelectReport) onSelectReport(report);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center gap-1 border border-emerald-200 shrink-0 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isArabic ? "اطلاع" : "View"}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: MONTHLY REPORTS FOR THIS STUDENT */}
                {profileTab === "monthly" && (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {studentMonthlyReports.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <Award className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500 font-bold">
                          {isArabic ? "لا توجد تقارير شهرية مسجلة لهذا الطالب حتى الآن" : "No monthly reports found for this student yet."}
                        </p>
                      </div>
                    ) : (
                      studentMonthlyReports.map(mReport => (
                        <div
                          key={mReport.id}
                          className="bg-white p-3.5 rounded-xl border border-emerald-100/90 shadow-2xs hover:border-emerald-300 transition flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">{mReport.title || `Monthly Report - ${mReport.month} ${mReport.year}`}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                {mReport.month} {mReport.year}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                              {mReport.overallProgress}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              if (onSelectReport) onSelectReport(mReport);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold text-xs flex items-center gap-1 border border-teal-200 shrink-0 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isArabic ? "اطلاع" : "View"}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
