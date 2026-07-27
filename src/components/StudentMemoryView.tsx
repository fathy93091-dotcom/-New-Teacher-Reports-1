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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <span>{isArabic ? "نظام ذاكرة الطالب التعليمية" : "Student Memory System"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "استمرارية التعليم طويلة المدى، متابعة التقدم التاريخي، وتوثيق نقاط القوة والتكرارات"
              : "Long-term educational continuity, chronological history, strengths & weakness tracking (SRS Chapter 7)"}
          </p>
        </div>

        {/* Student Selector Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 pl-2">{isArabic ? "الطالب:" : "Student:"}</span>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500"
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
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-5 space-y-2 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{isArabic ? "الملخص المباشر للتقدم التعليمي" : "Educational Continuity Summary"}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Updated: {new Date(memory.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200 leading-relaxed">
              "{memory.progressSummary}"
            </p>
          </div>

          {/* 3-Column Highlights: Strengths, Areas for Improvement, Teacher Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strengths */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{isArabic ? "نقاط القوة" : "Strengths"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">{memory.strengths.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStrength}
                  onChange={e => setNewStrength(e.target.value)}
                  placeholder="e.g. Accurate Makharij"
                  className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                />
                <button
                  onClick={handleAddStrength}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.strengths.map((st, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                    • {st}
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isArabic ? "مجالات التحسين" : "Areas for Focus"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">{memory.areasForImprovement.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArea}
                  onChange={e => setNewArea(e.target.value)}
                  placeholder="e.g. Daily revision routine"
                  className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                />
                <button
                  onClick={handleAddArea}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.areasForImprovement.map((ar, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-medium">
                    • {ar}
                  </div>
                ))}
              </div>
            </div>

            {/* Permanent Teacher Observations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4" />
                  <span>{isArabic ? "ملاحظات المعلم الدائمة" : "Long-Term Teacher Notes"}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">{memory.teacherNotes.length}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. Responds well to visual Quran pages"
                  className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                />
                <button
                  onClick={handleAddTeacherNote}
                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {memory.teacherNotes.map((note, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs italic">
                    "{note}"
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological Educational Timeline (SRS 7.9) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? "التسلسل الزمني للدروس (SRS 7.9)" : "Chronological Memory Timeline"}</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isArabic ? "البحث بالسورة، المادة، أو الكلمة..." : "Search memory by Surah, date, subject..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
                No historical lesson memory entries found matching query.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 my-2">
                {filteredHistory.map(item => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 group-hover:scale-125 transition" />

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-400">
                          {item.date} — Session #{item.sessionNumber}
                        </span>
                        <div className="flex gap-1">
                          {item.subjects.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {item.summary}
                      </p>

                      {item.keyAchievements.length > 0 && (
                        <div className="text-[11px] text-teal-300 font-medium">
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
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          Select a student to view their long-term memory system.
        </div>
      )}
    </div>
  );
};
