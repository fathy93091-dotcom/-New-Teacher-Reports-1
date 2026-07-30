import React, { useState } from "react";
import {
  Brain,
  Search,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  History,
  CheckSquare
} from "lucide-react";
import { Student, StudentMemory, AppSettings } from "../types";

interface StudentMemoryViewProps {
  students: Student[];
  settings: AppSettings;
  memories: Record<string, StudentMemory>;
  selectedStudentId?: string;
  onUpdateMemory: (studentId: string, updates: Partial<StudentMemory>) => void;
}

export const StudentMemoryView: React.FC<StudentMemoryViewProps> = ({
  students,
  settings,
  memories,
  selectedStudentId: initialSelectedId,
  onUpdateMemory
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialSelectedId || (students[0]?.id || "")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newArea, setNewArea] = useState("");

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const memory = selectedStudentId ? memories[selectedStudentId] || {
    id: `mem_${selectedStudentId}`,
    studentId: selectedStudentId,
    educationalHistory: [],
    homeworkHistory: [],
    strengths: [],
    areasForImprovement: [],
    recurringMistakes: [],
    teacherNotes: [],
    progressSummary: "No memory record initialized yet.",
    lastUpdated: new Date().toISOString()
  } : null;

  const filteredHistory = memory ? memory.educationalHistory.filter(h =>
    h.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
    h.date.includes(searchQuery)
  ) : [];

  const handleAddTeacherNote = () => {
    if (!newNote.trim() || !memory) return;
    onUpdateMemory(memory.studentId, {
      teacherNotes: [newNote.trim(), ...memory.teacherNotes]
    });
    setNewNote("");
  };

  const handleAddStrength = () => {
    if (!newStrength.trim() || !memory) return;
    onUpdateMemory(memory.studentId, {
      strengths: [...memory.strengths, newStrength.trim()]
    });
    setNewStrength("");
  };

  const handleAddArea = () => {
    if (!newArea.trim() || !memory) return;
    onUpdateMemory(memory.studentId, {
      areasForImprovement: [...memory.areasForImprovement, newArea.trim()]
    });
    setNewArea("");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 rounded-2xl shadow-md text-white border border-emerald-700">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-amber-300" />
            <span>{isArabic ? "نظام ذاكرة الطالب التعليمية" : "Student Memory System"}</span>
          </h1>
        </div>

        {/* Student Selector Switcher */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-slate-700 pl-2">{isArabic ? "الطالب:" : "Student:"}</span>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-800 font-bold text-xs outline-none focus:border-emerald-600"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStudent && memory ? (
        <div className="space-y-6">
          {/* Top Progress Overview Box */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 border border-emerald-700 rounded-2xl p-5 space-y-2 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isArabic ? "الملخص المباشر للتقدم التعليمي" : "Educational Continuity Summary"}</span>
              </span>
              <span className="text-[10px] text-emerald-200 font-medium">
                Updated: {new Date(memory.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium text-emerald-50 leading-relaxed">
              "{memory.progressSummary}"
            </p>
          </div>

          {/* 3-Column Highlights: Strengths, Areas for Improvement, Teacher Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strengths */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{isArabic ? "نقاط القوة" : "Strengths"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{memory.strengths.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStrength}
                  onChange={e => setNewStrength(e.target.value)}
                  placeholder="e.g. Accurate Makharij"
                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-emerald-600"
                />
                <button
                  onClick={handleAddStrength}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.strengths.map((st, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                    • {st}
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{isArabic ? "مجالات التحسين" : "Areas for Focus"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{memory.areasForImprovement.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArea}
                  onChange={e => setNewArea(e.target.value)}
                  placeholder="e.g. Daily revision routine"
                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-amber-600"
                />
                <button
                  onClick={handleAddArea}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.areasForImprovement.map((ar, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                    • {ar}
                  </div>
                ))}
              </div>
            </div>

            {/* Permanent Teacher Observations */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-teal-600" />
                  <span>{isArabic ? "ملاحظات المعلم الدائمة" : "Long-Term Teacher Notes"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{memory.teacherNotes.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. Responds well to visual Quran pages"
                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-teal-600"
                />
                <button
                  onClick={handleAddTeacherNote}
                  className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.teacherNotes.map((note, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs italic font-medium">
                    "{note}"
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological Educational Timeline (SRS 7.9) */}
          <div className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span>{isArabic ? "التسلسل الزمني للدروس (SRS 7.9)" : "Chronological Memory Timeline"}</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isArabic ? "البحث بالسورة، المادة، أو الكلمة..." : "Search memory by Surah, date, subject..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                No historical lesson memory entries found matching query.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-emerald-200 space-y-6 my-2">
                {filteredHistory.map(item => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white group-hover:scale-125 transition shadow-2xs" />

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-800">
                          {item.date} — Session #{item.sessionNumber}
                        </span>
                        <div className="flex gap-1">
                          {item.subjects.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 text-[10px] rounded font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {item.summary}
                      </p>

                      {item.keyAchievements.length > 0 && (
                        <div className="text-[11px] text-teal-800 font-bold">
                          Achievements: {item.keyAchievements.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-emerald-100 text-slate-500 font-medium">
          Select a student to view their long-term memory system.
        </div>
      )}
    </div>
  );
};
