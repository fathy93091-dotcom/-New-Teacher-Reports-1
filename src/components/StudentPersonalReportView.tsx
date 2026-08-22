import React, { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Check,
  CheckCircle2,
  Share2,
  Copy,
  Trash2,
  Archive,
  BookOpen,
  Calendar,
  Paperclip,
  FileUp,
  X,
  Search,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import {
  AppSettings,
  Student,
  GeneratedReport,
  AttendanceRecord,
  AttendanceStatus,
  HomeworkStatus,
  ReportAttachment,
  findSubjectAiInstruction
} from "../types";

interface StudentPersonalReportViewProps {
  student: Student;
  settings: AppSettings;
  reports: GeneratedReport[];
  attendanceRecords: AttendanceRecord[];
  isArabic?: boolean;
  onBack: () => void;
  onAddReport: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onGenerateReportAi: (payload: {
    studentName: string;
    subject: string;
    teacherNotes: string;
    aiInstructions: string;
    attachment?: ReportAttachment;
  }) => Promise<string>;
}

export const StudentPersonalReportView: React.FC<StudentPersonalReportViewProps> = ({
  student,
  settings,
  reports,
  attendanceRecords,
  isArabic = true,
  onBack,
  onAddReport,
  onDeleteReport,
  onToggleArchiveReport,
  onGenerateReportAi
}) => {
  // Calculate next lesson number
  const calculateNextLessonNumber = (subj: string): number => {
    const normSubj = (subj || "").trim().toLowerCase();

    // 1. Existing reports
    const studentReports = reports.filter(
      r => (r.studentId === student.id || r.studentName === student.fullName) &&
           ((r.subject || "").trim().toLowerCase() === normSubj)
    );
    const maxInReports = studentReports.reduce((max, r) => Math.max(max, r.lessonNumber || 0), 0);
    if (maxInReports > 0) {
      return maxInReports + 1;
    }

    // 2. Attendance records
    const studentAttendance = attendanceRecords.filter(
      ar => ar.studentId === student.id &&
           (!ar.subject || (ar.subject || "").trim().toLowerCase() === normSubj)
    );
    const maxInAtt = studentAttendance.reduce((max, ar) => Math.max(max, ar.lessonNumber || 0), 0);
    if (maxInAtt > 0) {
      return maxInAtt + 1;
    }

    const totalCount = Math.max(studentReports.length, studentAttendance.length);
    return Math.max(1, totalCount + 1);
  };

  const initialSubject =
    student.subjects?.[0]?.subject ||
    student.subject ||
    (isArabic ? "الرياضيات" : "Mathematics");

  const initialAiInst = findSubjectAiInstruction(
    settings.subjectDefaults,
    initialSubject,
    settings.generalAiInstructions
  );

  // Form State
  const [reportSubject, setReportSubject] = useState<string>(initialSubject);
  const [reportLessonNumber, setReportLessonNumber] = useState<number>(() =>
    calculateNextLessonNumber(initialSubject)
  );
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [reportAttendance, setReportAttendance] = useState<AttendanceStatus>("present");
  const [reportDeductCost, setReportDeductCost] = useState<boolean>(true);
  const [reportHomeworkStatus, setReportHomeworkStatus] = useState<HomeworkStatus>("done");
  const [absentNotes, setAbsentNotes] = useState<string>("");
  const [newTeacherNotes, setNewTeacherNotes] = useState<string>("");
  const [newAiInstructions, setNewAiInstructions] = useState<string>(initialAiInst);
  const [newGeneratedReportText, setNewGeneratedReportText] = useState<string>("");
  const [reportAttachment, setReportAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // UI state
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string>("");
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [reportArchiveFilter, setReportArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>("");
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState<string>("all");

  // WhatsApp Multi-App Target Selection Modal State
  const [showWhatsAppChooserModal, setShowWhatsAppChooserModal] = useState(false);
  const [pendingWhatsAppText, setPendingWhatsAppText] = useState("");

  const handleSubjectChange = (newSubj: string) => {
    setReportSubject(newSubj);
    setReportLessonNumber(calculateNextLessonNumber(newSubj));
    const subjInst = findSubjectAiInstruction(
      settings.subjectDefaults,
      newSubj,
      settings.generalAiInstructions
    );
    setNewAiInstructions(subjInst);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(
        isArabic
          ? "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 10 ميجابايت."
          : "File too large. Max 10MB."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const parts = dataUrl.split(";base64,");
      if (parts.length === 2) {
        const mimeType = parts[0].replace("data:", "");
        const base64Data = parts[1];
        setReportAttachment({
          fileName: file.name,
          mimeType,
          data: base64Data,
          previewUrl: mimeType.startsWith("image/") ? dataUrl : undefined
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenWhatsAppChooser = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setPendingWhatsAppText(text);
    setShowWhatsAppChooserModal(true);
  };

  const handleSendViaWhatsAppMode = (
    mode: "universal" | "web" | "app_scheme" | "business_scheme" | "intent_android"
  ) => {
    const text = pendingWhatsAppText;
    const rawLink = student.whatsappGroupLink || student.parentContact || student.studentPhone || "";
    const isUrl = rawLink.startsWith("http");
    const cleanPhone = rawLink.replace(/[^0-9]/g, "");
    const encodedText = encodeURIComponent(text);

    let finalUrl = "";

    if (mode === "web") {
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
      }
    } else if (mode === "app_scheme") {
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `whatsapp://send?text=${encodedText}`;
      }
    } else if (mode === "business_scheme") {
      if (cleanPhone) {
        finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      } else if (isUrl) {
        finalUrl = rawLink;
      } else {
        finalUrl = `https://wa.me/?text=${encodedText}`;
      }
    } else if (mode === "intent_android") {
      if (navigator.share) {
        navigator
          .share({
            title: isArabic ? `تقرير ${student.fullName}` : `Report: ${student.fullName}`,
            text: text
          })
          .then(() => {
            setShowWhatsAppChooserModal(false);
            setNotificationNotice(
              isArabic ? "تم فتح نافذة المشاركة بنجاح!" : "Shared successfully!"
            );
            setTimeout(() => setNotificationNotice(""), 4000);
          })
          .catch(() => {});
        return;
      } else {
        if (cleanPhone) {
          finalUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        } else {
          finalUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        }
      }
    } else {
      if (isUrl) {
        finalUrl = rawLink;
      } else if (cleanPhone) {
        finalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      } else {
        finalUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      }
    }

    if (finalUrl) {
      window.open(finalUrl, "_blank");
    }

    setShowWhatsAppChooserModal(false);
    setNotificationNotice(
      isArabic
        ? "تم نسخ التقرير وجاري الفتح في تطبيق الواتساب المختار!"
        : "Report copied and opened!"
    );
    setTimeout(() => setNotificationNotice(""), 4500);
  };

  // Helper for saving absent report
  const handleSaveAbsentReport = () => {
    const isMonthly =
      student.billingType === "monthly" ||
      student.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");

    const absentReportText = isArabic
      ? `📌 تقرير غياب طالب\n• الطالب: ${student.fullName}\n• المادة: ${reportSubject}\n• الحصة رقم: #${reportLessonNumber}\n• التاريخ: ${reportDate}\n• حالة الحضور: غائب${
          !isMonthly
            ? `\n• حساب الحصة: ${reportDeductCost ? "تم احتساب الحصة وخصمها من الرصيد" : "لم يتم الخصم (غياب بعذر)"}`
            : ""
        }${absentNotes ? `\n• سبب/ملاحظات: ${absentNotes}` : ""}`
      : `📌 Student Absence Report\n• Student: ${student.fullName}\n• Subject: ${reportSubject}\n• Lesson #: ${reportLessonNumber}\n• Date: ${reportDate}\n• Attendance: Absent${
          !isMonthly
            ? `\n• Billed: ${reportDeductCost ? "Yes (Deducted)" : "No (Excused)"}`
            : ""
        }${absentNotes ? `\n• Notes: ${absentNotes}` : ""}`;

    onAddReport({
      studentId: student.id,
      studentName: student.fullName,
      subject: reportSubject,
      lessonNumber: reportLessonNumber,
      date: reportDate,
      attendance: "absent",
      deductCost: isMonthly ? true : reportDeductCost,
      homeworkStatus: "not_done",
      teacherNotes: absentNotes || (isArabic ? "غائب" : "Absent"),
      aiInstructions: "",
      reportText: absentReportText,
      generatedText: absentReportText
    });

    setNotificationNotice(isArabic ? "تم حفظ تسجيل الغياب بنجاح! 💾" : "Absence recorded successfully! 💾");
    setTimeout(() => setNotificationNotice(""), 4000);
    // Refresh next lesson number
    setReportLessonNumber(prev => prev + 1);
  };

  // Helper for saving present report
  const handleSavePresentReport = (textToSave?: string) => {
    const finalText = textToSave || newGeneratedReportText || newTeacherNotes;
    if (!finalText.trim()) return;

    onAddReport({
      studentId: student.id,
      studentName: student.fullName,
      subject: reportSubject,
      lessonNumber: reportLessonNumber,
      date: reportDate,
      attendance: "present",
      deductCost: true,
      homeworkStatus: reportHomeworkStatus,
      teacherNotes: newTeacherNotes,
      aiInstructions: newAiInstructions,
      reportText: finalText,
      generatedText: finalText
    });

    setNotificationNotice(isArabic ? "تم حفظ التقرير بملف الطالب بنجاح! 💾" : "Report saved successfully! 💾");
    setTimeout(() => setNotificationNotice(""), 4000);
    // Increment lesson number and clear fields
    setReportLessonNumber(prev => prev + 1);
    setNewTeacherNotes("");
    setNewGeneratedReportText("");
    setReportAttachment(null);
  };

  // 6 months check
  const isReportOlderThan6Months = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const rDate = new Date(dateStr);
    if (isNaN(rDate.getTime())) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return rDate < sixMonthsAgo;
  };

  // Gather all past reports
  const studentReports = reports.filter(
    r => r.studentId === student.id || r.studentName === student.fullName
  );

  const studentAttendanceReports = attendanceRecords
    .filter(
      ar =>
        ar.studentId === student.id &&
        (ar.generatedReportText || ar.teacherNotes)
    )
    .map(ar => ({
      id: ar.id,
      studentId: ar.studentId,
      studentName: student.fullName,
      subject: ar.subject || student.subject,
      lessonNumber: ar.lessonNumber,
      attendance: ar.attendance,
      deductCost: ar.deducted,
      date: ar.date,
      teacherNotes: ar.teacherNotes || "",
      aiInstructions: ar.aiInstructions || "",
      reportText: ar.generatedReportText || ar.teacherNotes || "",
      generatedText: ar.generatedReportText || ar.teacherNotes || "",
      archived: undefined as boolean | undefined,
      createdAt: ar.date
    }));

  const allMergedReports = [
    ...studentReports,
    ...studentAttendanceReports.filter(
      ar => !studentReports.some(sr => sr.date === ar.date && sr.lessonNumber === ar.lessonNumber)
    )
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeReports = allMergedReports.filter(r => {
    return r.archived !== true;
  });

  const archivedReports = allMergedReports.filter(r => {
    return r.archived === true;
  });

  const filteredReportsList = (
    reportArchiveFilter === "active"
      ? activeReports
      : reportArchiveFilter === "archived"
      ? archivedReports
      : allMergedReports
  ).filter(r => {
    if (archiveSubjectFilter !== "all") {
      if ((r.subject || "").trim().toLowerCase() !== archiveSubjectFilter.trim().toLowerCase()) {
        return false;
      }
    }
    if (archiveSearchQuery.trim()) {
      const q = archiveSearchQuery.toLowerCase();
      const matchText = (r.reportText || "").toLowerCase();
      const matchNotes = (r.teacherNotes || "").toLowerCase();
      const matchSubj = (r.subject || "").toLowerCase();
      const matchDate = (r.date || "").toLowerCase();
      return (
        matchText.includes(q) ||
        matchNotes.includes(q) ||
        matchSubj.includes(q) ||
        matchDate.includes(q)
      );
    }
    return true;
  });

  const uniqueSubjects = Array.from(
    new Set([
      ...(student.subjects?.map(s => s.subject) || []),
      student.subject,
      ...allMergedReports.map(r => r.subject)
    ].filter(Boolean))
  );

  return (
    <div className="space-y-5 pb-16 animate-in fade-in max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shrink-0 shadow-2xs group"
              title={isArabic ? "رجوع إلى قائمة الطلاب" : "Back to Students"}
            >
              {isArabic ? (
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
              ) : (
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
              )}
            </button>

            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-600/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-slate-900">
                  {isArabic ? `تقرير شخصي: ${student.fullName}` : `Personal Report: ${student.fullName}`}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700">
                  {isArabic ? "صفحة التقرير المستقلة" : "Standalone Report View"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isArabic
                  ? "كتابة وتعديل تقارير الحصص، الصياغة بالذكاء الاصطناعي، وتسجيل الحضور والواجبات."
                  : "Write & edit lesson reports, refine with AI, and track attendance."}
              </p>
            </div>
          </div>

          {/* Quick Return & Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              {isArabic ? (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع للطلاب</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Student Meta Details Chips */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          {student.academicYear && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 font-bold">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>{student.academicYear}</span>
            </span>
          )}

          {student.curriculum && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>{student.curriculum}</span>
            </span>
          )}

          {student.parentContact && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{isArabic ? "ولي الأمر:" : "Parent:"} {student.parentContact}</span>
            </span>
          )}

          {student.studentPhone && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{isArabic ? "هاتف الطالب:" : "Student:"} {student.studentPhone}</span>
            </span>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            {student.subjects && student.subjects.length > 0 ? (
              student.subjects.map((sub, idx) => (
                <span
                  key={sub.id || idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold"
                >
                  <span>{sub.studyType === "group" ? "👥" : "👤"}</span>
                  <span>{sub.subject}</span>
                  <span className="text-purple-500">•</span>
                  <span>
                    {sub.billingType === "monthly"
                      ? `${sub.monthlyCost || 400} ج.م/شهر 📅`
                      : `${sub.lessonCost || 100} ج.م/حصة 🎟️`}
                  </span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold">
                <span>{student.subject}</span>
                <span className="text-purple-500">•</span>
                <span>
                  {student.billingType === "monthly"
                    ? `${student.monthlyCost || 400} ج.م/شهر 📅`
                    : `${student.lessonCost || 100} ج.م/حصة 🎟️`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationNotice}</span>
        </div>
      )}

      {/* Main Form: Write / Edit Report */}
      <div className="bg-white border-2 border-purple-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isArabic ? "كتابة وإعداد تقرير الحصة الجديد" : "Write & Prepare Lesson Report"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isArabic ? "حدد بيانات الحصة واكتب الملاحظات أو استخدم الصياغة الذكية" : "Configure lesson details and AI analysis"}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: اختيار المادة */}
        <div className="space-y-2">
          <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">1</span>
              <span>{isArabic ? "اختيار المادة الدراسية *" : "Select Subject *"}</span>
            </span>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
              {isArabic ? `المادة المحددة: ${reportSubject}` : `Selected: ${reportSubject}`}
            </span>
          </label>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const studentSubjectNames =
                student.subjects && student.subjects.length > 0
                  ? student.subjects.map(s => s.subject)
                  : [student.subject];

              return (
                <>
                  {studentSubjectNames.map(subjName => (
                    <button
                      key={subjName}
                      type="button"
                      onClick={() => handleSubjectChange(subjName)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                        reportSubject === subjName
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 ring-2 ring-purple-300"
                          : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{subjName}</span>
                    </button>
                  ))}

                  <div className="flex-1 min-w-[160px]">
                    <input
                      type="text"
                      value={reportSubject}
                      onChange={e => handleSubjectChange(e.target.value)}
                      placeholder={isArabic ? "أو كتابة اسم مادة أخرى..." : "Or type another subject..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-purple-500 focus:bg-white transition"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* STEP 2 & 3: رقم الحصة + تاريخ الحصة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 2- رقم الحصة */}
          <div className="space-y-1.5">
            <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">2</span>
                <span>{isArabic ? "رقم الحصة *" : "Lesson Number *"}</span>
              </span>
              <span className="text-[10.5px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                {isArabic ? "تلقائي وقابل للتعديل" : "Auto-filled"}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportLessonNumber(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-purple-100 text-purple-700 font-black text-lg flex items-center justify-center transition border border-slate-200 shrink-0"
              >
                -
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  required
                  value={reportLessonNumber}
                  onChange={e => setReportLessonNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center font-black text-slate-900 text-base focus:outline-none focus:border-purple-500 focus:bg-white"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-600 font-bold pointer-events-none">
                  #{reportLessonNumber}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReportLessonNumber(prev => prev + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-purple-100 text-purple-700 font-black text-lg flex items-center justify-center transition border border-slate-200 shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* 3- تاريخ الحصة */}
          <div className="space-y-1.5">
            <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
                <span>{isArabic ? "تاريخ الحصة *" : "Lesson Date *"}</span>
              </span>
              <span className="text-[10.5px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                {isArabic ? "تلقائي حسب اليوم" : "Today"}
              </span>
            </label>

            <div className="relative">
              <input
                type="date"
                required
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-xs focus:outline-none focus:border-purple-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* STEP 4: حالة الحضور والغياب */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block font-black text-slate-800 text-xs flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">4</span>
            <span>{isArabic ? "حالة الحضور والغياب في الحصة *" : "Attendance Status *"}</span>
          </label>

          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setReportAttendance("present");
                setReportDeductCost(true);
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                reportAttendance === "present"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isArabic ? "🟢 حاضر (حضر الحصة)" : "🟢 Present"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReportAttendance("absent");
                setReportDeductCost(false);
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                reportAttendance === "absent"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <X className="w-4 h-4 text-rose-300" />
              <span>{isArabic ? "🔴 غائب (لم يحضر)" : "🔴 Absent"}</span>
            </button>
          </div>
        </div>

        {/* CONDITIONAL RENDERING: ABSENT vs PRESENT */}
        {reportAttendance === "absent" ? (
          /* ABSENT WORKFLOW */
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-black text-rose-950 text-sm">
                  {isArabic ? "تسجيل غياب الطالب عن الحصة" : "Record Student Absence"}
                </h3>
                <p className="text-xs text-rose-700 font-medium">
                  {isArabic
                    ? "حدد ما إذا كان سيتم احتساب الحصة وخصم سعرها من رصيد الطالب أم لا:"
                    : "Choose whether to deduct and bill this lesson fee:"}
                </p>
              </div>
            </div>

            {/* Monthly vs Elapsed Lessons Info & Options */}
            {(() => {
              const isMonthly =
                student.billingType === "monthly" ||
                student.subjects?.some(s => s.subject === reportSubject && s.billingType === "monthly");

              if (isMonthly) {
                return (
                  <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs font-semibold flex items-start gap-2.5">
                    <span className="text-base">📅</span>
                    <div className="space-y-1">
                      <p className="font-bold text-blue-950">
                        {isArabic ? "نظام المحاسبة: الشهر كامل (اشتراك شهري ثابت)" : "Billing: Full Month Flat Subscription"}
                      </p>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        {isArabic
                          ? "يتم احتساب الشهر ثابتاً للطالب، وتسجيل الغياب هنا يتم لأغراض المتابعة التربوية والأكاديمية وسجل الحضور فقط بدون كتابة أي إشارة للخصم المالي في التقرير."
                          : "Absence is logged purely for academic attendance tracking. No billing deduction notes will be written to the student report."}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <p className="text-xs text-slate-700 font-bold">
                    {isArabic
                      ? "نظام حصص التقويم المنقضية (تحتسب الحصة إذا حضرها الطالب، أو يتم استثناؤها عند الغياب بعذر):"
                      : "Calendar Elapsed Lessons (Charge only if attended or non-excused):"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReportDeductCost(true)}
                      className={`p-3.5 rounded-xl border text-right transition flex items-center justify-between ${
                        reportDeductCost
                          ? "bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20"
                          : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs sm:text-sm">
                          {isArabic ? "✅ احتساب الحصة وخصمها" : "Yes - Deduct & Bill"}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${reportDeductCost ? "text-rose-100" : "text-slate-500"}`}>
                          {isArabic ? "غياب غير معذور (تحتسب الحصة مالياً)" : "Non-excused absence"}
                        </p>
                      </div>
                      <Check className={`w-4 h-4 ${reportDeductCost ? "text-white" : "text-transparent"}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportDeductCost(false)}
                      className={`p-3.5 rounded-xl border text-right transition flex items-center justify-between ${
                        !reportDeductCost
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-md shadow-emerald-700/20"
                          : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100/40"
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs sm:text-sm">
                          {isArabic ? "❌ استثناء الحصة (غياب بعذر)" : "No - Excused (No Charge)"}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${!reportDeductCost ? "text-emerald-100" : "text-slate-500"}`}>
                          {isArabic ? "لا تحتسب الحصة ولا تترتب أي رسوم" : "No charge for excused absence"}
                        </p>
                      </div>
                      <Check className={`w-4 h-4 ${!reportDeductCost ? "text-white" : "text-transparent"}`} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Optional Absence Reason */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                {isArabic ? "ملاحظة حول سبب الغياب (اختياري):" : "Absence Reason / Notes (Optional):"}
              </label>
              <input
                type="text"
                value={absentNotes}
                onChange={e => setAbsentNotes(e.target.value)}
                placeholder={isArabic ? "مثال: اعتذر ولي الأمر لظرف طارئ..." : "e.g., Parent apologized due to illness..."}
                className="w-full bg-white border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500 shadow-2xs"
              />
            </div>

            {/* Actions for Absent */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-200/80">
              <button
                type="button"
                onClick={handleSaveAbsentReport}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-600/30 flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>{isArabic ? "حفظ تسجيل الغياب" : "Save Absence Record"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* PRESENT WORKFLOW */
          <div className="space-y-4 animate-in fade-in">
            {/* Homework Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/60 border border-purple-200/80 rounded-2xl p-3.5">
              <div>
                <label className="font-black text-slate-800 text-xs">
                  {isArabic ? "حالة الواجب المنزلي والتكليفات:" : "Homework & Assignments Status:"}
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isArabic ? "حدد التزام الطالب بحل الواجب السابق" : "Select student homework compliance"}
                </p>
              </div>
              <select
                value={reportHomeworkStatus}
                onChange={e => setReportHomeworkStatus(e.target.value as HomeworkStatus)}
                className="bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-black text-purple-900 focus:outline-none focus:border-purple-500 shadow-2xs"
              >
                <option value="done">{isArabic ? "✅ تم حل الواجب كاملاً ومتقن" : "Done (Complete)"}</option>
                <option value="not_done">{isArabic ? "❌ لم يحل الواجب" : "Not Done"}</option>
                <option value="late">{isArabic ? "⚠️ حل الواجب بتأخير أو جزئياً" : "Late / Partial"}</option>
                <option value="no_homework">{isArabic ? "⚪ لم يكن هناك واجب" : "No Homework Assigned"}</option>
              </select>
            </div>

            {/* Teacher Lesson Notes */}
            <div>
              <label className="block font-black text-slate-800 mb-1.5 text-xs">
                {isArabic ? "ملاحظات المعلم ومحتوى الحصة (ما تم شرحه وأداء الطالب):" : "Teacher Lesson Notes & Student Performance:"}
              </label>
              <textarea
                rows={4}
                value={newTeacherNotes}
                onChange={e => setNewTeacherNotes(e.target.value)}
                placeholder={
                  isArabic
                    ? "مثال: تم شرح درس المعادلات التربيعية، استيعاب الطالب ممتاز، شارك وتفاعل بتركيز عالي، الواجب المنزلي صفحة 45 المسائل من 1 إلى 6..."
                    : "Enter lesson details, student participation, homework assigned..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:bg-white leading-relaxed transition shadow-2xs font-sans"
              />
            </div>

            {/* Subject AI Instructions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-black text-slate-700 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isArabic ? `تعليمات وقالب الذكاء الاصطناعي لمادة (${reportSubject}):` : "Subject AI Prompt & Instructions:"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const inst = findSubjectAiInstruction(settings.subjectDefaults, reportSubject, settings.generalAiInstructions);
                    setNewAiInstructions(inst);
                  }}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition"
                  title={isArabic ? "استعادة التوجيه الافتراضي من الإعدادات" : "Reset to default"}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isArabic ? "استعادة من الإعدادات" : "Reset to default"}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={newAiInstructions}
                onChange={e => setNewAiInstructions(e.target.value)}
                placeholder={isArabic ? "اكتب أي قالب محدد أو شروط أو أسلوب تريد من الذكاء الاصطناعي الالتزام به بنسبة 100%..." : "Custom template, rules, tone, or specific instructions for AI to follow 100%..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 text-xs focus:outline-none focus:border-purple-500 focus:bg-white font-medium shadow-2xs leading-relaxed"
              />
              <p className="text-[10.5px] text-slate-500 font-medium">
                {isArabic
                  ? "💡 يلتزم الذكاء الاصطناعي بهذه التعليمات أو القالب التزاماً حرفياً وتاماً."
                  : "💡 AI will strictly follow these instructions, rules, or template with highest priority."}
              </p>
            </div>

            {/* File Attachment */}
            <div className="space-y-1.5">
              <label className="block font-black text-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-purple-600" />
                  <span>{isArabic ? "إرفاق صورة أو ورقة عمل أو واجب (لتحليلها بالذكاء الاصطناعي):" : "Attach Image / Worksheet:"}</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                  {isArabic ? "اختياري" : "Optional"}
                </span>
              </label>

              {!reportAttachment ? (
                <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/70 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-xs sm:text-sm">
                    <FileUp className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
                    <span>{isArabic ? "اضغط هنا لرفع صورة ورقة العمل أو الواجب لتحليلها بالذكاء الاصطناعي" : "Click to attach image or document"}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isArabic ? "يدعم الصور (PNG, JPG)، ملفات الـ PDF أو كراسة الطالب" : "Supports PNG, JPG, PDF documents"}
                  </p>
                </label>
              ) : (
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {reportAttachment.previewUrl ? (
                      <img
                        src={reportAttachment.previewUrl}
                        alt="Attachment Preview"
                        className="w-12 h-12 object-cover rounded-xl border border-purple-200 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-xs truncate">{reportAttachment.fileName || "ملف مرفق"}</p>
                      <p className="text-[11px] text-purple-700 font-bold flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isArabic ? "جاهز للصياغة والتحليل بالذكاء الاصطناعي" : "Ready for AI analysis"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReportAttachment(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                    title={isArabic ? "إزالة المرفق" : "Remove attachment"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Generation Trigger Button */}
            <button
              type="button"
              disabled={isGeneratingReport}
              onClick={async () => {
                setIsGeneratingReport(true);
                try {
                  const notesToUse = newTeacherNotes.trim() || (isArabic ? "تم شرح الدرس ومتابعة التطبيق العملي للدرس بانتظام وتفاعل الطالب بتركيز." : "Lesson covered thoroughly with practice.");
                  const effectiveAiInst = (newAiInstructions || "").trim() || findSubjectAiInstruction(settings.subjectDefaults, reportSubject, settings.generalAiInstructions);
                  const res = await onGenerateReportAi({
                    studentName: student.fullName,
                    subject: reportSubject,
                    teacherNotes: `الحصة #${reportLessonNumber} (${reportDate}):\n${notesToUse}\nحالة الواجب: ${
                      reportHomeworkStatus === "no_homework"
                        ? "لم يكن هناك واجب (لا تذكر أي بند أو سطر أو إشارة عن الواجب في التقرير نهائياً)"
                        : reportHomeworkStatus === "done"
                        ? "تم حل الواجب كاملاً ومتقن"
                        : reportHomeworkStatus === "not_done"
                        ? "لم يتم حل الواجب"
                        : "حل الواجب بتأخير أو جزئياً"
                    }`,
                    aiInstructions: effectiveAiInst,
                    attachment: reportAttachment || undefined
                  });
                  if (res) {
                    setNewGeneratedReportText(res);
                  }
                } catch (err) {
                  console.error("Failed to generate AI report:", err);
                } finally {
                  setIsGeneratingReport(false);
                }
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-600/25 transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingReport ? "animate-spin" : ""}`} />
              <span>
                {isGeneratingReport
                  ? (isArabic ? "جاري صياغة وتحليل التقرير بالذكاء الاصطناعي..." : "Refining & Generating...")
                  : (isArabic ? "✨ صياغة وتحسين التقرير بالذكاء الاصطناعي" : "✨ Format & Refine with AI")}
              </span>
            </button>

            {/* AI Report Editor & Actions */}
            {newGeneratedReportText ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800 text-xs sm:text-sm">
                    {isArabic ? "التقرير المصاغ بالذكاء الاصطناعي (متاح للتعديل الحر):" : "AI Generated Report (Editable):"}
                  </label>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {isArabic ? "جاهز للحفظ والإرسال" : "Ready"}
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={newGeneratedReportText}
                  onChange={e => setNewGeneratedReportText(e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl p-4 text-xs sm:text-sm font-sans leading-relaxed focus:outline-none focus:border-purple-400 shadow-inner"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSavePresentReport(newGeneratedReportText)}
                    className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isArabic ? "💾 حفظ التقرير بملف الطالب" : "Save Report"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppChooser(newGeneratedReportText)}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "🟢 إرسال عبر WhatsApp" : "Send via WhatsApp"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newGeneratedReportText);
                      setNotificationNotice(isArabic ? "تم نسخ نص التقرير للحافظة!" : "Report text copied!");
                      setTimeout(() => setNotificationNotice(""), 3000);
                    }}
                    className="py-3 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                    title={isArabic ? "نسخ التقرير" : "Copy"}
                  >
                    <Copy className="w-4 h-4" />
                    <span>{isArabic ? "نسخ" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Direct Save without AI */
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                {newTeacherNotes.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\nملاحظات الحصة:\n${newTeacherNotes}`;
                      handleOpenWhatsAppChooser(manualText);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "مشاركة عبر الواتساب" : "Share via WhatsApp"}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!newTeacherNotes.trim()}
                  onClick={() => {
                    const manualText = `تقرير الحصة #${reportLessonNumber} - مادة: ${reportSubject}\nالتاريخ: ${reportDate}\nملاحظات الحصة:\n${newTeacherNotes}`;
                    handleSavePresentReport(manualText);
                  }}
                  className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isArabic ? "حفظ التقرير المباشر" : "Save Direct Report"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: History & Archive of Past Reports for this Student */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-600" />
              <span>{isArabic ? `سجل وأرشيف تقارير الطالب (${allMergedReports.length})` : `Reports History & Archive (${allMergedReports.length})`}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isArabic
                ? "جميع تقارير وملاحظات الحصص محفوظة بشكل دائم ولا يتم مسحها إلا بواسطة المعلم."
                : "All reports and lesson logs are permanently saved and only deleted manually."}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setReportArchiveFilter("active")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "active"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `النشطة (${activeReports.length})` : `Active (${activeReports.length})`}
            </button>
            <button
              onClick={() => setReportArchiveFilter("archived")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "archived"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `الأرشيف (${archivedReports.length})` : `Archive (${archivedReports.length})`}
            </button>
            <button
              onClick={() => setReportArchiveFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportArchiveFilter === "all"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? `الكل (${allMergedReports.length})` : `All (${allMergedReports.length})`}
            </button>
          </div>
        </div>

        {/* Search & Subject Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={archiveSearchQuery}
              onChange={e => setArchiveSearchQuery(e.target.value)}
              placeholder={isArabic ? "البحث في نص وملاحظات التقارير..." : "Search in reports content..."}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={archiveSubjectFilter}
              onChange={e => setArchiveSubjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:bg-white"
            >
              <option value="all">{isArabic ? "جميع المواد الدراسية" : "All Subjects"}</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports List */}
        {filteredReportsList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">
              {isArabic ? "لا توجد تقارير مطابقة للمعايير المحددة." : "No reports matching criteria."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReportsList.map(report => {
              const isExpanded = expandedReportIds.includes(report.id);
              const textContent = report.reportText || report.generatedText || report.teacherNotes || "";
              const isAutoArchived = isReportOlderThan6Months(report.date);

              return (
                <div
                  key={report.id}
                  className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 transition space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                        #{report.lessonNumber || 1}
                      </span>
                      <span className="font-bold text-xs text-slate-800">
                        {report.subject}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {report.date}
                      </span>
                      {report.attendance === "absent" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {isArabic ? "🔴 غائب" : "Absent"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {isArabic ? "🟢 حاضر" : "Present"}
                        </span>
                      )}
                      {report.homeworkStatus && report.homeworkStatus !== "no_homework" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {report.homeworkStatus === "done"
                            ? (isArabic ? "واجب كامل" : "HW Done")
                            : report.homeworkStatus === "not_done"
                            ? (isArabic ? "لم يحل الواجب" : "HW Missing")
                            : (isArabic ? "واجب جزئي" : "HW Partial")}
                        </span>
                      )}
                      {(report.archived || isAutoArchived) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {isArabic ? "📁 مؤرشف" : "Archived"}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleReportExpand(report.id)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{isArabic ? "طي" : "Collapse"}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{isArabic ? "عرض النص" : "Expand"}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenWhatsAppChooser(textContent)}
                        title={isArabic ? "إرسال التقرير عبر الواتساب" : "Send via WhatsApp"}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(textContent);
                          setCopiedReportId(report.id);
                          setTimeout(() => setCopiedReportId(null), 2000);
                        }}
                        title={isArabic ? "نسخ التقرير" : "Copy"}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                      >
                        {copiedReportId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {onToggleArchiveReport && (
                        <button
                          onClick={() => onToggleArchiveReport(report.id)}
                          title={report.archived ? (isArabic ? "إلغاء الأرشفة" : "Unarchive") : (isArabic ? "أرشفة التقرير" : "Archive")}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteReport(report.id)}
                        title={isArabic ? "حذف التقرير" : "Delete"}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Content */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-200/80 animate-in fade-in">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {textContent}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Multi-App Target Chooser Modal */}
      {showWhatsAppChooserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isArabic ? "إرسال التقرير عبر الواتساب" : "Send Report via WhatsApp"}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isArabic ? `للطالب: ${student.fullName}` : `For: ${student.fullName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                {isArabic ? "📞 الأرقام المسجلة:" : "Registered contacts:"}
              </p>
              <p>• {isArabic ? "هاتف ولي الأمر:" : "Parent:"} <span className="font-mono font-bold text-slate-900 dir-ltr">{student.parentContact || "غير مسجل"}</span></p>
              {student.studentPhone && (
                <p>• {isArabic ? "هاتف الطالب:" : "Student:"} <span className="font-mono font-bold text-slate-900 dir-ltr">{student.studentPhone}</span></p>
              )}
            </div>

            <div className="space-y-2">
              {/* Option 1: Universal / Direct */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("universal")}
                className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-between transition shadow-md shadow-emerald-600/20"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <Share2 className="w-4 h-4" />
                  <div>
                    <p className="font-black">{isArabic ? "فتح واتساب المباشر (تلقائي)" : "Direct WhatsApp (Auto)"}</p>
                    <p className="text-[10px] text-emerald-100 font-normal">{isArabic ? "يفتح التطبيق المثبت على جهازك أو المتصفح" : "Opens installed app or web"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Option 2: WhatsApp Web */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("web")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">W</div>
                  <div>
                    <p className="font-bold">{isArabic ? "واتساب ويب (WhatsApp Web)" : "WhatsApp Web"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "للفتح في تبويب جديد على أجهزة الكمبيوتر" : "For desktop browser tab"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Option 3: WhatsApp Business */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("business_scheme")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-4 h-4 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-black text-[9px]">B</div>
                  <div>
                    <p className="font-bold">{isArabic ? "واتساب للأعمال (WhatsApp Business)" : "WhatsApp Business"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "إرسال عبر حساب بيزنس أو رابط wa.me" : "Send via Business account"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Option 4: System Share (Mobile / Tablet) */}
              <button
                type="button"
                onClick={() => handleSendViaWhatsAppMode("intent_android")}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 text-right">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-bold">{isArabic ? "مشاركة عبر نافذة النظام (الهواتف والتابلت)" : "System Share Sheet (Mobile)"}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{isArabic ? "تتيح لك اختيار أي تطبيق واتساب مثبت يدوياً" : "Choose installed app from system popup"}</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pendingWhatsAppText);
                  setNotificationNotice(isArabic ? "تم نسخ نص التقرير للحافظة بنجاح!" : "Report text copied!");
                  setShowWhatsAppChooserModal(false);
                  setTimeout(() => setNotificationNotice(""), 3000);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isArabic ? "نسخ نص التقرير فقط" : "Copy Text Only"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWhatsAppChooserModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
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
