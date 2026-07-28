import React, { useState } from "react";
import {
  User,
  Sparkles,
  Paperclip,
  CheckCircle,
  BookOpen,
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
  Attachment,
  AppSettings
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

  // Master Unified Teacher Notes Box (Where EVERYTHING is written)
  const [unifiedNotes, setUnifiedNotes] = useState<string>(
    isArabic
      ? "تلاوة سورة الملك من الآية 1 إلى 15 بتطبيق متميز لأحكام التجويد (مخارج الحروف، الإدغام بغنة). أداء الطالب ممتاز مع تركيز عالي أثناء الحصة.\n\nالواجب المطلوب: حفظ السورة من الآية 16 إلى 24 مع مراجعة الوجه الأول من سورة الملك."
      : "Recited Surah Al-Mulk verses 1 to 15 applying Tajweed rules (Idgham with Ghunnah, clear Makharij). Excellent focus and participation.\n\nHomework assigned: Memorize verses 16-24 and revise first page."
  );

  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
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
      alert(isArabic ? "يرجى كتابة ملاحظات التقرير في المربع الموحد" : "Please enter report notes");
      return;
    }

    // Build subject records using the master unified notes for selected subjects
    const subjectRecords: SubjectSessionRecord[] = selectedSubjects.map(subj => {
      return {
        subject: subj,
        teacherNotes: unifiedNotes,
        homework: [],
        performance: {
          participation: 5,
          focus: 5,
          understanding: 5,
          confidence: 5,
          behavior: 5,
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "كتابة تفاصيل التقرير اليومي" : "Daily Report Input Form"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "اكتب كل التفاصيل (الدروس، الأداء، الواجب، الملاحظات) في المربع الموحد أدناه، وسيتكفل الذكاء الاصطناعي بتنظيمها وصياغتها وتطبيق القواعد والقوالب المفعّلة."
              : "Enter all lesson details, homework, and observations in the single text area below. AI will structure, format, and apply active rules & templates."}
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

        {/* Step 2: Subject Tags */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>{isArabic ? "2. المواد المشملولة في التقرير" : "2. Subjects Included in Report"}</span>
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

        {/* Step 3: UNIFIED SINGLE REPORT TEXTBOX (مربع التقرير الموحد الشامل) */}
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? "3. مربع التقرير الموحد (اكتب كل ما تم في الحصة هنا)" : "3. Unified Report Textbox"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic
                  ? "اكتب هنا كل شيء: الدروس المشروحة، تفاصيل التلاوة/الحفظ، مستوى الطالب والتركيز، الواجب المطلوب، والتوصيات."
                  : "Type everything here: lessons covered, recitation details, student focus/performance, assigned homework, and recommendations."}
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
                  ? (isArabic ? "جاري التدقيق..." : "Refining...")
                  : (isArabic ? "تحسين وتدقيق النص" : "Enhance Text AI")}
              </span>
            </button>
          </div>

          <textarea
            rows={10}
            value={unifiedNotes}
            onChange={e => setUnifiedNotes(e.target.value)}
            placeholder={
              isArabic
                ? "مثال:\nتم بفضل الله مراجعة سورة الملك من الآية 1 إلى 15 بتطبيق متميز لأحكام التجويد (مخارج الحروف، الإدغام بغنة).\nمستوى التركيز والمشاركة ممتازان جدًا.\nالواجب المطلوب: حفظ سورة الملك من الآية 16 إلى 24 ومراجعة الوجه الأول."
                : "e.g.\nRecited Surah Al-Mulk verses 1-15 applying Tajweed rules. Excellent focus and engagement.\nHomework: Memorize verses 16-24 and review first page."
            }
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm leading-relaxed focus:border-emerald-500 outline-none resize-none font-sans shadow-inner"
          />

          {/* Optional Attachments */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                <span>{isArabic ? "إرفاق ملفات مساندة (اختياري)" : "Attach Files (Optional)"}</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-500">
                {attachments.length > 0 ? `${attachments.length} ${isArabic ? "ملفات مرفقة" : "files attached"}` : ""}
              </span>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{att.fileName}</span>
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
              ? "سيقوم الذكاء الاصطناعي باستخراج كل التفاصيل والواجب وتطبيق القواعد والقوالب صياغةً وهيكلةً."
              : "AI will extract all sections & homework and apply active rules/templates automatically."}
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
