import React, { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Archive,
  RotateCcw,
  BookOpen,
  Edit2,
  X,
  Check,
  Brain,
  Calendar,
  Globe,
  Phone,
  UserCheck
} from "lucide-react";
import { Student, SubjectName, AppSettings, Gender } from "../types";

interface StudentsViewProps {
  students: Student[];
  settings: AppSettings;
  onAddStudent: (student: Omit<Student, "id" | "teacherId" | "createdAt">) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onArchiveStudent: (id: string) => void;
  onRestoreStudent: (id: string) => void;
  onStartSessionForStudent: (studentId: string) => void;
  onViewStudentMemory: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  settings,
  onAddStudent,
  onUpdateStudent,
  onArchiveStudent,
  onRestoreStudent,
  onStartSessionForStudent,
  onViewStudentMemory
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Active" | "Archived" | "All">("Active");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);

  // New Student Form State
  const [formData, setFormData] = useState<{
    fullName: string;
    preferredName: string;
    gender: Gender;
    dateOfBirth: string;
    age: number;
    nationality: string;
    country: string;
    timeZone: string;
    parentName: string;
    parentContact: string;
    currentLevel: string;
    subjects: SubjectName[];
    notes: string;
  }>({
    fullName: "",
    preferredName: "",
    gender: "Male",
    dateOfBirth: "2015-01-01",
    age: 11,
    nationality: "Egyptian",
    country: "United Arab Emirates",
    timeZone: "Asia/Dubai (GST +04:00)",
    parentName: "",
    parentContact: "",
    currentLevel: "Juz 30 Recitation & Tajweed",
    subjects: ["Holy Qur'an", "Tajweed"],
    notes: ""
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
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.currentLevel.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === "All") return matchesSearch;
    return matchesSearch && student.status === filterStatus;
  });

  const handleSubjectToggle = (subj: SubjectName) => {
    setFormData(prev => {
      const exists = prev.subjects.includes(subj);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== subj) : [...prev.subjects, subj]
      };
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.parentName.trim()) {
      alert(isArabic ? "يرجى تعبئة اسم الطالب واسم ولي الأمر" : "Please fill Student Name and Parent Name");
      return;
    }

    onAddStudent({
      ...formData,
      status: "Active"
    });

    setIsAddModalOpen(false);
    // Reset form
    setFormData({
      fullName: "",
      preferredName: "",
      gender: "Male",
      dateOfBirth: "2015-01-01",
      age: 10,
      nationality: "Saudi",
      country: "Saudi Arabia",
      timeZone: "Asia/Riyadh",
      parentName: "",
      parentContact: "",
      currentLevel: "Beginner",
      subjects: ["Holy Qur'an"],
      notes: ""
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "سجل إدارة الطلاب" : "Student Directory"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic ? "إدارة ملفات الطلاب، المواد المقررة، والسجل التعليمي الشامل" : "Manage student profiles, subjects enrolled, and academic records"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{isArabic ? "إضافة طالب جديد" : "Add New Student"}</span>
        </button>
      </div>

      {/* Search & Filter Filter-bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isArabic ? "بحث باسم الطالب أو ولي الأمر..." : "Search student or parent name..."}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {(["Active", "Archived", "All"] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterStatus === st
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "Active" ? (isArabic ? "النشطون" : "Active") : st === "Archived" ? (isArabic ? "المؤرشفون" : "Archived") : (isArabic ? "الكل" : "All")}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(student => (
          <div
            key={student.id}
            className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition hover:shadow-lg ${
              student.status === "Archived" ? "border-slate-800/60 opacity-75" : "border-slate-800 hover:border-emerald-500/50"
            }`}
          >
            <div className="space-y-3">
              {/* Header: Name & Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">{student.fullName}</h3>
                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <span>{student.currentLevel}</span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    student.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {student.status}
                </span>
              </div>

              {/* Student Metadata List */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isArabic ? "ولي الأمر:" : "Parent:"} <strong className="text-slate-200">{student.parentName}</strong> ({student.parentContact})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.country} • {student.age} {isArabic ? "سنة" : "yrs"}</span>
                </div>
              </div>

              {/* Subjects Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {student.subjects.map(subj => (
                  <span
                    key={subj}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-teal-300 text-[11px] font-medium border border-slate-700"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewStudentMemory(student.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800/60 font-medium flex items-center gap-1 transition"
                  title="View Student Memory"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{isArabic ? "الذاكرة" : "Memory"}</span>
                </button>

                <button
                  onClick={() => setSelectedStudentForDetails(student)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium flex items-center gap-1 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isArabic ? "الملف" : "Profile"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {student.status === "Active" ? (
                  <>
                    <button
                      onClick={() => onStartSessionForStudent(student.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isArabic ? "بدء حصة" : "Session"}</span>
                    </button>
                    <button
                      onClick={() => onArchiveStudent(student.id)}
                      className="p-1.5 text-slate-500 hover:text-amber-400 transition"
                      title="Archive Student"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onRestoreStudent(student.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-900 hover:bg-teal-800 text-teal-200 text-xs font-medium flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isArabic ? "استعادة" : "Restore"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? "إضافة طالب جديد" : "Add Student Profile"}</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {isArabic ? "الاسم الكامل *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Abdullah Ahmed"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {isArabic ? "الاسم المفضل" : "Preferred Name"}
                  </label>
                  <input
                    type="text"
                    value={formData.preferredName}
                    onChange={e => setFormData({ ...formData, preferredName: e.target.value })}
                    placeholder="e.g. Abdullah"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "الجنس" : "Gender"}</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="Male">Male / ذكر</option>
                    <option value="Female">Female / أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "العمر" : "Age"}</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {isArabic ? "اسم ولي الأمر *" : "Parent Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="e.g. Ahmed Ali"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {isArabic ? "هاتف/تواصل ولي الأمر" : "Parent Contact Phone"}
                  </label>
                  <input
                    type="text"
                    value={formData.parentContact}
                    onChange={e => setFormData({ ...formData, parentContact: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "الدولة" : "Country"}</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "المستوى الحالي" : "Current Level"}</label>
                  <input
                    type="text"
                    value={formData.currentLevel}
                    onChange={e => setFormData({ ...formData, currentLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  {isArabic ? "المواد الدراسية المقررة" : "Teaching Subjects"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map(subj => {
                    const isSelected = formData.subjects.includes(subj);
                    return (
                      <button
                        type="button"
                        key={subj}
                        onClick={() => handleSubjectToggle(subj)}
                        className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">{isArabic ? "ملاحظات المعلم" : "Teacher Notes"}</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions or student learning behavior..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-900/40"
                >
                  {isArabic ? "حفظ الطالب" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE DETAILS MODAL */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">{selectedStudentForDetails.fullName}</h2>
              <button
                onClick={() => setSelectedStudentForDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Level</span>
                  <span className="font-semibold text-emerald-400">{selectedStudentForDetails.currentLevel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gender & Age</span>
                  <span className="font-semibold text-white">{selectedStudentForDetails.gender}, {selectedStudentForDetails.age} yrs</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Parent</span>
                  <span className="font-semibold text-white">{selectedStudentForDetails.parentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact</span>
                  <span className="font-semibold text-white">{selectedStudentForDetails.parentContact}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium mb-1">Subjects Enrolled</span>
                <div className="flex flex-wrap gap-1">
                  {selectedStudentForDetails.subjects.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selectedStudentForDetails.notes && (
                <div>
                  <span className="text-slate-400 block font-medium mb-1">Teacher Notes</span>
                  <p className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 italic text-slate-300">
                    "{selectedStudentForDetails.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const studentId = selectedStudentForDetails.id;
                  setSelectedStudentForDetails(null);
                  onViewStudentMemory(studentId);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-semibold flex items-center gap-1.5 border border-purple-700/50"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Open Student Memory</span>
              </button>

              <button
                onClick={() => setSelectedStudentForDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
