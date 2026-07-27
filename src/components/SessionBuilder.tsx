import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  Sparkles,
  Paperclip,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Award,
  Layers,
  Wand2,
  FileText
} from "lucide-react";
import {
  Student,
  SubjectName,
  Session,
  SubjectSessionRecord,
  HomeworkItem,
  Attachment,
  AppSettings,
  HomeworkStatus
} from "../types";

interface SessionBuilderProps {
  students: Student[];
  settings: AppSettings;
  preselectedStudentId?: string;
  onCreateSessionAndGenerateReport: (sessionData: Omit<Session, "id" | "teacherId" | "createdAt">) => void;
  onCancel: () => void;
}

export const SessionBuilder: React.FC<SessionBuilderProps> = ({
  students,
  settings,
  preselectedStudentId,
  onCreateSessionAndGenerateReport,
  onCancel
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const activeStudents = students.filter(s => s.status === "Active");

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || (activeStudents[0]?.id || "")
  );

  const [sessionNumber, setSessionNumber] = useState<number>(26);
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [sessionTime, setSessionTime] = useState<string>("10:00 AM");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  const availableSubjects: SubjectName[] = [
    "Holy Qur'an",
    "Tajweed",
    "Arabic Language",
    "Islamic Studies",
    "English Language"
  ];

  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>(["Holy Qur'an", "Tajweed"]);

  // Per-subject detailed records state
  const [subjectRecords, setSubjectRecords] = useState<Record<SubjectName, SubjectSessionRecord>>({
    "Holy Qur'an": {
      subject: "Holy Qur'an",
      teacherNotes: "Recited Surah Al-Mulk verses 1-15 with commendable Tajweed application.",
      homework: [
        {
          id: "hw_temp_1",
          subject: "Holy Qur'an",
          task: "Memorize Surah Al-Mulk verses 16 to 24",
          category: "Memorization",
          status: "Completed"
        }
      ],
      performance: {
        participation: 5,
        focus: 5,
        understanding: 5,
        memorization: 5,
        pronunciation: 4,
        confidence: 5,
        behavior: 5,
        writtenObservations: "High focus and beautiful voice control."
      },
      mistakes: ["Slight stumble on Madd Munfasil verse 8"],
      achievements: ["Clear Makharij al-Huruf"],
      attachments: []
    },
    "Tajweed": {
      subject: "Tajweed",
      teacherNotes: "Practiced Noon Sakinah rules (Idgham with Ghunnah vs without Ghunnah).",
      homework: [
        {
          id: "hw_temp_2",
          subject: "Tajweed",
          task: "Extract 5 examples of Idgham from Surah Al-Waqi'ah",
          category: "Practice Exercises",
          status: "Completed"
        }
      ],
      performance: {
        participation: 5,
        focus: 4,
        understanding: 5,
        confidence: 4,
        behavior: 5
      },
      mistakes: [],
      achievements: ["Mastered Idgham letter recognition"],
      attachments: []
    },
    "Arabic Language": {
      subject: "Arabic Language",
      teacherNotes: "Learned Nominal Sentences (Mubtada and Khabar).",
      homework: [],
      performance: { participation: 5, focus: 5, understanding: 4, confidence: 4, behavior: 5 },
      mistakes: [],
      achievements: [],
      attachments: []
    },
    "Islamic Studies": {
      subject: "Islamic Studies",
      teacherNotes: "Covered the five pillars of Islam and basic Fiqh of Taharah.",
      homework: [],
      performance: { participation: 5, focus: 5, understanding: 5, confidence: 5, behavior: 5 },
      mistakes: [],
      achievements: [],
      attachments: []
    },
    "English Language": {
      subject: "English Language",
      teacherNotes: "Vocabulary exercise for Islamic terminology in English.",
      homework: [],
      performance: { participation: 5, focus: 4, understanding: 4, confidence: 4, behavior: 5 },
      mistakes: [],
      achievements: [],
      attachments: []
    }
  });

  const [enhancingSubject, setEnhancingSubject] = useState<string | null>(null);

  const handleSubjectToggle = (subj: SubjectName) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length === 1) {
        alert(isArabic ? "يجب اختيار مادة واحدة على الأقل" : "At least one subject must be selected");
        return;
      }
      setSelectedSubjects(selectedSubjects.filter(s => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleNotesChange = (subj: SubjectName, notes: string) => {
    setSubjectRecords(prev => ({
      ...prev,
      [subj]: { ...prev[subj], teacherNotes: notes }
    }));
  };

  const handleEnhanceNotesAI = async (subj: SubjectName) => {
    const rawNotes = subjectRecords[subj].teacherNotes;
    if (!rawNotes.trim()) return;

    setEnhancingSubject(subj);
    try {
      const res = await fetch("/api/ai/enhance-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: rawNotes, subject: subj })
      });
      const data = await res.json();
      if (data.enhancedNotes) {
        setSubjectRecords(prev => ({
          ...prev,
          [subj]: { ...prev[subj], teacherNotes: data.enhancedNotes }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnhancingSubject(null);
    }
  };

  const handleAddHomework = (subj: SubjectName) => {
    const newTask: HomeworkItem = {
      id: `hw_${Date.now()}`,
      subject: subj,
      task: "",
      category: "Memorization",
      status: "Completed"
    };

    setSubjectRecords(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        homework: [...prev[subj].homework, newTask]
      }
    }));
  };

  const handleHomeworkChange = (subj: SubjectName, hwId: string, updates: Partial<HomeworkItem>) => {
    setSubjectRecords(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        homework: prev[subj].homework.map(h => (h.id === hwId ? { ...h, ...updates } : h))
      }
    }));
  };

  const handleRemoveHomework = (subj: SubjectName, hwId: string) => {
    setSubjectRecords(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        homework: prev[subj].homework.filter(h => h.id !== hwId)
      }
    }));
  };

  const handlePerformanceRating = (subj: SubjectName, key: keyof SubjectSessionRecord["performance"], val: number) => {
    setSubjectRecords(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        performance: { ...prev[subj].performance, [key]: val }
      }
    }));
  };

  const handleFileUpload = (subj: SubjectName, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map((file: File, idx) => ({
      id: `att_${Date.now()}_${idx}`,
      fileName: file.name,
      fileType: "PDF",
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileUrl: "#",
      uploadedAt: new Date().toISOString()
    }));

    setSubjectRecords(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        attachments: [...prev[subj].attachments, ...newAttachments]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert(isArabic ? "يرجى اختيار طالب" : "Please select a student");
      return;
    }

    const recordsToSave: SubjectSessionRecord[] = selectedSubjects.map(s => subjectRecords[s]);

    onCreateSessionAndGenerateReport({
      sessionNumber,
      studentId: selectedStudentId,
      date: sessionDate,
      time: sessionTime,
      durationMinutes,
      subjectRecords: recordsToSave,
      status: "completed",
      reportStatus: "none"
    });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "تسجيل حصة تعليمية جديدة" : "Record Teaching Session"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "تسجيل ملاحظات المعلم، تقييم الأداء، والواجبات المنزلية لعدة مواد في حصة واحدة"
              : "Record teacher notes, performance evaluations, and homework across multiple subjects"}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold self-start md:self-auto"
        >
          {isArabic ? "إلغاء والعودة" : "Cancel & Return"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Session Metadata & Student Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{isArabic ? "1. بيانات الطالب والحصة" : "1. Student & Session Information"}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Student Picker */}
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">{isArabic ? "اختيار الطالب *" : "Select Student *"}</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:border-emerald-500 outline-none"
              >
                {activeStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.currentLevel})
                  </option>
                ))}
              </select>
            </div>

            {/* Session Number */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">{isArabic ? "رقم الحصة" : "Session Number"}</label>
              <input
                type="number"
                value={sessionNumber}
                onChange={e => setSessionNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Session Duration */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">{isArabic ? "المدة (دقائق)" : "Duration (Minutes)"}</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value) || 45)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">{isArabic ? "تاريخ الحصة" : "Session Date"}</label>
              <input
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">{isArabic ? "وقت الحصة" : "Session Time"}</label>
              <input
                type="text"
                value={sessionTime}
                onChange={e => setSessionTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Multi-Subject Selector (SRS 4.3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>{isArabic ? "2. اختيار المواد المدروسة بالحصة" : "2. Select Subjects Included in Session"}</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {availableSubjects.map(subj => {
              const isSelected = selectedSubjects.includes(subj);
              return (
                <button
                  type="button"
                  key={subj}
                  onClick={() => handleSubjectToggle(subj)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition ${
                    isSelected
                      ? "bg-teal-500/20 text-teal-200 border-teal-500 shadow-md"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  <CheckCircle className={`w-4 h-4 ${isSelected ? "text-teal-400" : "text-slate-600"}`} />
                  <span>{subj}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Detailed Per-Subject Blocks (SRS 4.4 - 4.8) */}
        <div className="space-y-6">
          {selectedSubjects.map(subj => {
            const rec = subjectRecords[subj];
            return (
              <div key={subj} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>{subj}</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    SRS Section 4.4
                  </span>
                </div>

                {/* Teacher Notes Field + AI Enhance Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {isArabic ? "ملاحظات المعلم اليومية (المصدر الأساسي) *" : "Teacher Notes (Primary Source) *"}
                    </label>
                    <button
                      type="button"
                      disabled={enhancingSubject === subj || !rec.teacherNotes.trim()}
                      onClick={() => handleEnhanceNotesAI(subj)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[11px] font-semibold border border-emerald-800 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{enhancingSubject === subj ? (isArabic ? "جاري التدقيق..." : "Refining...") : (isArabic ? "تحسين الملاحظات بالذكاء الاصطناعي" : "Enhance Notes AI")}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={rec.teacherNotes}
                    onChange={e => handleNotesChange(subj, e.target.value)}
                    placeholder={
                      subj === "Holy Qur'an"
                        ? "Recited Surah Al-Mulk verses 1-15..."
                        : "Enter lesson topics and student activities..."
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs leading-relaxed focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                {/* Performance Evaluation Sliders (Participation, Focus, Understanding, Confidence, Behavior) */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {isArabic ? "تقييم أداء الطالب في هذه المادة" : "Student Performance Evaluation"}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {[
                      { key: "participation", label: "Participation" },
                      { key: "focus", label: "Focus" },
                      { key: "understanding", label: "Understanding" },
                      { key: "confidence", label: "Confidence" }
                    ].map(item => (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{item.label}</span>
                          <span className="font-bold text-emerald-400">
                            {rec.performance[item.key as keyof typeof rec.performance] || 5}/5
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={(rec.performance[item.key as keyof typeof rec.performance] as number) || 5}
                          onChange={e => handlePerformanceRating(subj, item.key as any, parseInt(e.target.value))}
                          className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Homework Builder Section (SRS 4.7) */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {isArabic ? "الواجبات المنزلية المكلّفة" : "Assigned Homework"}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddHomework(subj)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-700"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{isArabic ? "إضافة واجب" : "Add Task"}</span>
                    </button>
                  </div>

                  {rec.homework.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic italic px-2">No homework assigned for {subj}.</p>
                  ) : (
                    <div className="space-y-2">
                      {rec.homework.map(hw => (
                        <div key={hw.id} className="flex flex-col sm:flex-row gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-start sm:items-center">
                          <input
                            type="text"
                            value={hw.task}
                            onChange={e => handleHomeworkChange(subj, hw.id, { task: e.target.value })}
                            placeholder="e.g. Memorize verses 16-24..."
                            className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:border-emerald-500 outline-none"
                          />

                          <select
                            value={hw.category}
                            onChange={e => handleHomeworkChange(subj, hw.id, { category: e.target.value as any })}
                            className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none"
                          >
                            <option value="Memorization">Memorization / حفظ</option>
                            <option value="Reading">Reading / قراءة</option>
                            <option value="Writing">Writing / كتابة</option>
                            <option value="Practice Exercises">Practice / تمارين</option>
                            <option value="Revision">Revision / مراجعة</option>
                          </select>

                          <select
                            value={hw.status}
                            onChange={e => handleHomeworkChange(subj, hw.id, { status: e.target.value as HomeworkStatus })}
                            className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none font-semibold text-emerald-400"
                          >
                            <option value="Completed">Completed / مكتمل</option>
                            <option value="Partially Completed">Partially / جزئي</option>
                            <option value="Not Completed">Not Done / لم يكتمل</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveHomework(subj, hw.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attachments Section (SRS 4.6) */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                      <span>{isArabic ? "المرفقات المساندة (PDF, DOCX, PNG)" : "Supporting Attachments"}</span>
                    </label>

                    <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 cursor-pointer flex items-center gap-1">
                      <Plus className="w-3 h-3 text-teal-400" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        multiple
                        onChange={e => handleFileUpload(subj, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {rec.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.attachments.map(att => (
                        <div key={att.id} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{att.fileName} ({att.fileSize})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Bar */}
        <div className="sticky bottom-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-between gap-4 z-20">
          <div className="text-xs text-slate-300 hidden sm:block">
            {isArabic
              ? "عند الحفظ، سيتم توليد تقرير الذكاء الاصطناعي تلقائياً للتحقق والاعتماد"
              : "Submitting will generate structured AI Daily Report for teacher approval."}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/50 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{isArabic ? "توليد تقرير الذكاء الاصطناعي" : "Generate AI Report"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
