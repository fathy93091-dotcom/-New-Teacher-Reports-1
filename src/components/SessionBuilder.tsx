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
  FileText,
  Edit3
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

  // Master Unified Teacher Notes Box
  const [unifiedNotes, setUnifiedNotes] = useState<string>(
    isArabic
      ? "تلاوة سورة الملك من الآية 1 إلى 15 بتطبيق متميز لأحكام التجويد (مخارج الحروف، الإدغام بغنة). إتقان ممتاز واستيعاب عالي مع تركيز أثناء الحصة. الواجب المطلوب: حفظ السورة من الآية 16 إلى 24 مع مراجعة الوجه الأول."
      : "Recited Surah Al-Mulk verses 1 to 15 applying Tajweed rules (Idgham with Ghunnah, clear Makharij). Excellent focus and memorization quality. Homework assigned: Memorize verses 16-24 and revise first page."
  );

  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  // Overall Performance Ratings
  const [overallPerformance, setOverallPerformance] = useState({
    participation: 5,
    focus: 5,
    understanding: 5,
    confidence: 5,
    behavior: 5
  });

  // Homework Tasks
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([
    {
      id: "hw_temp_1",
      subject: "Holy Qur'an",
      task: isArabic ? "حفظ سورة الملك من الآية 16 إلى 24" : "Memorize Surah Al-Mulk verses 16 to 24",
      category: "Memorization",
      status: "Completed"
    }
  ]);

  // Session Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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

  const handleEnhanceUnifiedNotes = async () => {
    if (!unifiedNotes.trim()) return;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/ai/enhance-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: unifiedNotes,
          subject: selectedSubjects.join(" & ")
        })
      });
      const data = await res.json();
      if (data.enhancedNotes) {
        setUnifiedNotes(data.enhancedNotes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAddHomework = () => {
    const newTask: HomeworkItem = {
      id: `hw_${Date.now()}`,
      subject: selectedSubjects[0] || "Holy Qur'an",
      task: "",
      category: "Memorization",
      status: "Completed"
    };
    setHomeworkList(prev => [...prev, newTask]);
  };

  const handleHomeworkChange = (id: string, updates: Partial<HomeworkItem>) => {
    setHomeworkList(prev => prev.map(h => (h.id === id ? { ...h, ...updates } : h)));
  };

  const handleRemoveHomework = (id: string) => {
    setHomeworkList(prev => prev.filter(h => h.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert(isArabic ? "يرجى اختيار طالب" : "Please select a student");
      return;
    }

    if (!unifiedNotes.trim()) {
      alert(isArabic ? "يرجى كتابة ملاحظات التقرير في المربع" : "Please enter report notes");
      return;
    }

    // Build subject records using the master unified notes for selected subjects
    const subjectRecords: SubjectSessionRecord[] = selectedSubjects.map(subj => {
      const subjHomework = homeworkList.filter(h => h.subject === subj || homeworkList.length === 1);
      return {
        subject: subj,
        teacherNotes: unifiedNotes,
        homework: subjHomework,
        performance: {
          ...overallPerformance,
          writtenObservations: unifiedNotes
        },
        mistakes: [],
        achievements: [],
        attachments
      };
    });

    onCreateSessionAndGenerateReport({
      sessionNumber,
      studentId: selectedStudentId,
      date: sessionDate,
      time: sessionTime,
      durationMinutes,
      subjectRecords,
      status: "completed",
      reportStatus: "none"
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "تسجيل ملاحظات وتوليد التقرير اليومي" : "Record Session & Generate Daily Report"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "قم بملء تفاصيل الحصة وملاحظات المعلم في المربع الموحد، وسيقوم الذكاء الاصطناعي بتحليلها وصياغتها طبقاً للقواعد والقوالب المفعّلة"
              : "Fill session details & teacher notes in the unified text area; AI will structure and draft it using active rules & templates."}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold self-start md:self-auto transition"
        >
          {isArabic ? "إلغاء والعودة" : "Cancel & Return"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Student & Session Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{isArabic ? "1. بيانات الطالب والحصة" : "1. Student & Session Details"}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Student Selector */}
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

        {/* Step 2: Subject Tags / Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>{isArabic ? "2. المواد المدروسة في هذه الحصة" : "2. Subjects Covered in Session"}</span>
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

        {/* Step 3: UNIFIED REPORT NOTES BOX (مربع التقرير الموحد) */}
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? "3. مربع ملاحظات التقرير الموحد (ادخل جميع التفاصيل هنا)" : "3. Unified Report Notes Box"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic
                  ? "قم بكتابة ملخص الحصة، الآيات/الأحكام، أداء الطالب، التوصيات، والواجبات في هذا المربع. سيقوم الذكاء الاصطناعي بتنظيمها وصياغتها طبقاً للقواعد والقوالب."
                  : "Write lesson summaries, student performance, and homework here. AI will format and analyze it per active rules & templates."}
              </p>
            </div>

            <button
              type="button"
              disabled={isEnhancing || !unifiedNotes.trim()}
              onClick={handleEnhanceUnifiedNotes}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto shrink-0"
            >
              <Wand2 className="w-4 h-4 text-emerald-200" />
              <span>
                {isEnhancing
                  ? (isArabic ? "جاري التحسين والتدقيق..." : "Refining...")
                  : (isArabic ? "تحسين وتدقيق النص بالذكاء الاصطناعي" : "Enhance Notes AI")}
              </span>
            </button>
          </div>

          <textarea
            rows={7}
            value={unifiedNotes}
            onChange={e => setUnifiedNotes(e.target.value)}
            placeholder={
              isArabic
                ? "اكتب هنا جميع ملاحظات الحصة، الدروس المشروحة، تقييم المعلم، الأخطاء، والواجبات..."
                : "Type all lesson notes, covered topics, student mistakes, achievements, and homework..."
            }
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm leading-relaxed focus:border-emerald-500 outline-none resize-none font-sans shadow-inner"
          />
        </div>

        {/* Step 4: Overall Student Ratings & Homework Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>{isArabic ? "4. التقييم العام والواجبات المنزلية" : "4. Overall Ratings & Homework"}</span>
          </h2>

          {/* Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            {[
              { key: "participation", label: isArabic ? "المشاركة" : "Participation" },
              { key: "focus", label: isArabic ? "التركيز" : "Focus" },
              { key: "understanding", label: isArabic ? "الفهم والانسجام" : "Understanding" },
              { key: "confidence", label: isArabic ? "الثقة والأداء" : "Confidence" }
            ].map(item => (
              <div key={item.key} className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{item.label}</span>
                  <span className="font-bold text-emerald-400">
                    {overallPerformance[item.key as keyof typeof overallPerformance]}/5
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={overallPerformance[item.key as keyof typeof overallPerformance]}
                  onChange={e =>
                    setOverallPerformance(prev => ({
                      ...prev,
                      [item.key]: parseInt(e.target.value) || 5
                    }))
                  }
                  className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Homework Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {isArabic ? "الواجبات المنزلية المكلّفة" : "Assigned Homework Items"}
              </label>
              <button
                type="button"
                onClick={handleAddHomework}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isArabic ? "إضافة واجب جديد" : "Add Homework Task"}</span>
              </button>
            </div>

            {homeworkList.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">
                {isArabic ? "لا توجد واجبات مضافة حالياً." : "No homework assigned."}
              </p>
            ) : (
              <div className="space-y-2">
                {homeworkList.map(hw => (
                  <div key={hw.id} className="flex flex-col sm:flex-row gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 items-start sm:items-center">
                    <input
                      type="text"
                      value={hw.task}
                      onChange={e => handleHomeworkChange(hw.id, { task: e.target.value })}
                      placeholder={isArabic ? "مثال: حفظ سورة الملك الآيات 16-24..." : "e.g. Memorize Surah Al-Mulk..."}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:border-emerald-500 outline-none"
                    />

                    <select
                      value={hw.subject}
                      onChange={e => handleHomeworkChange(hw.id, { subject: e.target.value as SubjectName })}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none"
                    >
                      {selectedSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <select
                      value={hw.category}
                      onChange={e => handleHomeworkChange(hw.id, { category: e.target.value as any })}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none"
                    >
                      <option value="Memorization">حفظ / Memorization</option>
                      <option value="Reading">قراءة / Reading</option>
                      <option value="Writing">كتابة / Writing</option>
                      <option value="Practice Exercises">تمارين / Practice</option>
                      <option value="Revision">مراجعة / Revision</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveHomework(hw.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                <span>{isArabic ? "المرفقات والملفات المساندة (PDF, الصور)" : "Supporting Attachments"}</span>
              </label>

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                <Plus className="w-3.5 h-3.5 text-teal-400" />
                <span>{isArabic ? "رفع ملف" : "Upload File"}</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>{att.fileName} ({att.fileSize})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="sticky bottom-4 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-2xl flex items-center justify-between gap-4 z-20">
          <div className="text-xs text-slate-300 hidden sm:block">
            {isArabic
              ? "سيتم استخدام الملاحظات والقواعد والقوالب المفعّلة لتوليد التقرير بالذكاء الاصطناعي."
              : "Active rules, templates & teacher notes will be processed by AI to build the report."}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/50 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4.5 h-4.5 text-emerald-200" />
              <span>{isArabic ? "توليد وتحليل التقرير بالذكاء الاصطناعي" : "Analyze & Generate AI Report"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
