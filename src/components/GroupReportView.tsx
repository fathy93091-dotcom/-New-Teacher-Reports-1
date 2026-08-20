import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  Share2,
  Copy,
  AlertCircle,
  Sparkles,
  RefreshCw,
  BookOpen,
  Calendar,
  User,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Group, Student, AppSettings } from "../types";

export interface StudentReportItem {
  attendance: "present" | "absent";
  homework: "done" | "not_done" | "partial";
  score: string;
  notes: string;
  gender?: "male" | "female";
}

interface GroupReportViewProps {
  group: Group;
  students: Student[];
  settings?: AppSettings;
  isArabic?: boolean;
  onBack: () => void;
  onSaveReport?: (reportData: {
    groupId: string;
    date: string;
    items: Record<string, StudentReportItem>;
    generalNotes: string;
    teacherName: string;
    finalReportText: string;
  }) => void;
}

function isLikelyFemaleName(name: string): boolean {
  if (!name) return false;
  const femaleKeywords = [
    "مريم", "فاطمة", "نور", "سارة", "ساره", "منة", "منه", "هنا", "ملك", "جنى",
    "حبيبة", "حبيبه", "فريدة", "فريده", "ريم", "رنا", "ندى", "آية", "اية", "شهد",
    "روان", "يارا", "مروة", "مروه", "إيمان", "ايمان", "هبة", "هبه", "دنيا", "ياسمين",
    "أميرة", "اميرة", "ندين", "نادين", "سلمى", "جودي", "ليلى", "تسنيم", "خديجة", "عائشة",
    "فرح", "بسملة", "بسمله", "أسماء", "اسماء", "هاجر", "تقى", "رضوى", "وفاء", "زينب"
  ];
  const firstWord = name.trim().split(" ")[0];
  return femaleKeywords.some(f => firstWord.includes(f) || firstWord === f);
}

export const GroupReportView: React.FC<GroupReportViewProps> = ({
  group,
  students,
  settings,
  isArabic = true,
  onBack,
  onSaveReport
}) => {
  // Filter students who belong to this group in exact order
  const groupStudents = students.filter(s =>
    group.studentIds && group.studentIds.includes(s.id)
  );

  const storageKey = `group_report_${group.id}_latest`;

  // Report Basic Information
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  const [teacherName, setTeacherName] = useState<string>(() => {
    return settings?.teacherName?.trim() || (isArabic ? "المعلم" : "Teacher");
  });

  const [subjectName, setSubjectName] = useState<string>(() => {
    return group.subject || (isArabic ? "الرياضيات" : "Mathematics");
  });

  // Student items state
  const [studentReports, setStudentReports] = useState<
    Record<string, StudentReportItem>
  >(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.items) {
          return parsed.items;
        }
      }
    } catch {
      // ignore
    }

    const initial: Record<string, StudentReportItem> = {};
    groupStudents.forEach(s => {
      const isFemale = isLikelyFemaleName(s.fullName);
      initial[s.id] = {
        attendance: "present",
        homework: "done",
        score: "10",
        notes: "",
        gender: isFemale ? "female" : "male"
      };
    });
    return initial;
  });

  const [generalNotes, setGeneralNotes] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.generalNotes || "";
      }
    } catch {
      // ignore
    }
    return "";
  });

  // Generated / Live Final Output
  const [finalReportText, setFinalReportText] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState("");
  const [activeViewTab, setActiveViewTab] = useState<"editor" | "preview">("editor");

  // Ensure all current students have an entry in state
  useEffect(() => {
    setStudentReports(prev => {
      const updated = { ...prev };
      let changed = false;
      groupStudents.forEach(s => {
        if (!updated[s.id]) {
          const isFemale = isLikelyFemaleName(s.fullName);
          updated[s.id] = {
            attendance: "present",
            homework: "done",
            score: "10",
            notes: "",
            gender: isFemale ? "female" : "male"
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [groupStudents]);

  // Build standard report following the exact rules
  const buildExactReportText = (
    sub: string = subjectName,
    dt: string = reportDate,
    tName: string = teacherName,
    items: Record<string, StudentReportItem> = studentReports,
    genNote: string = generalNotes
  ): string => {
    let out = `📚 تقرير متابعة (${sub.trim() || "المادة"})\n\n`;
    out += `━━━━━━━━━━━━━━━━━━\n`;
    out += `📅 تاريخ الحصة: ${dt}\n`;
    out += `👨‍🏫 اسم المعلم: ${tName.trim() || "المعلم"}\n`;
    out += `━━━━━━━━━━━━━━━━━━\n\n`;

    groupStudents.forEach((student) => {
      const rep = items[student.id] || {
        attendance: "present",
        homework: "done",
        score: "10",
        notes: "",
        gender: isLikelyFemaleName(student.fullName) ? "female" : "male"
      };

      const icon = rep.gender === "female" ? "👩‍🎓" : "👨‍🎓";
      out += `${icon} ${student.fullName}\n\n`;

      const attendanceText = rep.attendance === "absent" ? "🔴 الحضور: غائب" : "🟢 الحضور: حاضر";
      out += `${attendanceText}\n`;

      let homeworkText = "📝 الواجب: منجز";
      if (rep.homework === "not_done") {
        homeworkText = "⚠️ الواجب: غير منجز";
      } else if (rep.homework === "partial") {
        homeworkText = "⚠️ الواجب: أنجز بعضه";
      }
      out += `${homeworkText}\n`;

      let scoreVal = "10";
      if (rep.score && rep.score.trim() !== "") {
        scoreVal = rep.score.replace(/\/10|\/ 10/, "").trim();
      }
      out += `⭐ التقييم: ${scoreVal} / 10\n\n`;

      if (rep.notes && rep.notes.trim() !== "") {
        out += `📌 ملاحظة المعلم:\n${rep.notes.trim()}\n\n`;
      }

      out += `━━━━━━━━━━━━━━━━━━\n\n`;
    });

    if (genNote && genNote.trim() !== "") {
      out += `🌟 ملاحظة عامة\n${genNote.trim()}\n\n`;
      out += `━━━━━━━━━━━━━━━━━━\n\n`;
    }

    out += `🤲 نسأل الله لهم مزيدًا من التوفيق والتميز. 🤍`;

    return out.trim();
  };

  // Sync finalReportText initially or when changes happen if not customized by AI
  useEffect(() => {
    if (!finalReportText) {
      setFinalReportText(buildExactReportText());
    }
  }, [groupStudents, reportDate, teacherName, subjectName]);

  const updateStudentReport = (
    studentId: string,
    field: keyof StudentReportItem,
    value: any
  ) => {
    setStudentReports(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: value
        }
      };
      // Keep live output synchronized
      setFinalReportText(buildExactReportText(subjectName, reportDate, teacherName, updated, generalNotes));
      return updated;
    });
  };

  // 🤖 صياغة بالذكاء الاصطناعي مع الحفاظ الصارم على القواعد
  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);

    const payloadStudents = groupStudents.map(st => {
      const rep = studentReports[st.id] || {
        attendance: "present",
        homework: "done",
        score: "10",
        notes: "",
        gender: isLikelyFemaleName(st.fullName) ? "female" : "male"
      };

      return {
        name: st.fullName,
        attendance: rep.attendance === "absent" ? "غائب" : "حاضر",
        homework: rep.homework === "not_done" ? "غير منجز" : rep.homework === "partial" ? "أنجز بعضه" : "منجز",
        score: rep.score || "10",
        notes: rep.notes.trim(),
        gender: rep.gender
      };
    });

    try {
      const res = await fetch("/api/ai/generate-group-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName,
          date: reportDate,
          teacherName,
          students: payloadStudents,
          generalNotes: generalNotes.trim()
        })
      });

      const data = await res.json();
      if (data && data.reportText) {
        setFinalReportText(data.reportText);
        setActiveViewTab("preview");
      } else {
        setFinalReportText(buildExactReportText());
      }
    } catch (err) {
      console.error("AI Report generation error:", err);
      // Fallback deterministic text
      setFinalReportText(buildExactReportText());
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 📋 نسخ نص التقرير
  const handleCopyReport = () => {
    const textToCopy = finalReportText || buildExactReportText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      }).catch(() => {});
    }
  };

  // 💾 حفظ التقرير
  const handleSaveReport = () => {
    const text = finalReportText || buildExactReportText();
    const reportData = {
      groupId: group.id,
      date: reportDate,
      items: studentReports,
      generalNotes: generalNotes.trim(),
      teacherName: teacherName.trim(),
      finalReportText: text
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(reportData));
    } catch (e) {
      console.error("Failed to save report to local storage:", e);
    }

    if (onSaveReport) {
      onSaveReport(reportData);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  // 🟢 إرسال عبر WhatsApp
  const handleSendWhatsapp = () => {
    const message = finalReportText || buildExactReportText();

    // Copy text to clipboard in all cases
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    const rawTarget = (group.parentWhatsapp || group.whatsappGroupLink || "").trim();

    if (!rawTarget) {
      const genericUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(genericUrl, "_blank");
      setWhatsappNotice(isArabic ? "تم تجهيز التقرير وفتح واتساب" : "WhatsApp opened with report");
      setTimeout(() => setWhatsappNotice(""), 4000);
      return;
    }

    if (rawTarget.startsWith("http://") || rawTarget.startsWith("https://") || rawTarget.includes("chat.whatsapp.com")) {
      const groupLink = rawTarget.startsWith("http") ? rawTarget : `https://${rawTarget}`;
      window.open(groupLink, "_blank");
      setWhatsappNotice(isArabic ? "تم نسخ نص التقرير وفتح رابط الجروب" : "Report copied and WhatsApp group opened");
      setTimeout(() => setWhatsappNotice(""), 4000);
    } else {
      let cleanPhone = rawTarget.replace(/[^\d+]/g, "");
      if (cleanPhone.startsWith("+")) {
        cleanPhone = cleanPhone.substring(1);
      } else if (cleanPhone.startsWith("01")) {
        cleanPhone = "20" + cleanPhone.substring(1);
      }

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      setWhatsappNotice(isArabic ? "تم فتح محادثة واتساب مع التقرير المنسق" : "WhatsApp chat opened with report");
      setTimeout(() => setWhatsappNotice(""), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 space-y-4 max-w-6xl mx-auto">
      {/* 1. Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 font-bold text-xs"
          >
            {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isArabic ? "رجوع" : "Back"}</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📚</span>
              <span>{isArabic ? `تقرير متابعة الحصة الجماعية — ${group.name}` : `Group Follow-up Report — ${group.name}`}</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {isArabic
                ? "تنسيق موحد واحترافي مناسب للنسخ والإرسال المباشر على WhatsApp."
                : "Unified & clean format optimized for WhatsApp messaging."}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs on mobile/desktop */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveViewTab("editor")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeViewTab === "editor"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isArabic ? "رصد البيانات" : "Data Editor"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFinalReportText(buildExactReportText());
              setActiveViewTab("preview");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeViewTab === "preview"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isArabic ? "معاينة التقرير (WhatsApp)" : "WhatsApp Preview"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isArabic ? "تم حفظ التقرير بنجاح في سجلات المجموعة! 💾" : "Report saved successfully! 💾"}</span>
        </div>
      )}

      {copiedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isArabic ? "تم نسخ نص التقرير بالكامل وهو جاهز للصق في WhatsApp! 📋" : "Report copied to clipboard! 📋"}</span>
        </div>
      )}

      {whatsappNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{whatsappNotice}</span>
        </div>
      )}

      {/* 2. Metadata Editor Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Subject */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>{isArabic ? "اسم المادة:" : "Subject:"}</span>
          </label>
          <input
            type="text"
            value={subjectName}
            onChange={e => {
              setSubjectName(e.target.value);
              setFinalReportText(buildExactReportText(e.target.value, reportDate, teacherName, studentReports, generalNotes));
            }}
            placeholder="الرياضيات"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{isArabic ? "تاريخ الحصة:" : "Lesson Date:"}</span>
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={e => {
              setReportDate(e.target.value);
              setFinalReportText(buildExactReportText(subjectName, e.target.value, teacherName, studentReports, generalNotes));
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Teacher Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>{isArabic ? "اسم المعلم:" : "Teacher Name:"}</span>
          </label>
          <input
            type="text"
            value={teacherName}
            onChange={e => {
              setTeacherName(e.target.value);
              setFinalReportText(buildExactReportText(subjectName, reportDate, e.target.value, studentReports, generalNotes));
            }}
            placeholder="اسم المعلم"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeViewTab === "editor" ? (
        <div className="space-y-4">
          {/* Students List */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>👥</span>
                <span>{isArabic ? `بيانات الطلاب (${groupStudents.length} طلاب)` : `Students (${groupStudents.length})`}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isArabic ? "يتم الحفاظ على الترتيب الأصلي تماماً" : "Original order preserved strictly"}
              </span>
            </div>

            {groupStudents.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">
                  {isArabic ? "لا يوجد طلاب مضافون في هذه المجموعة حالياً." : "No students in this group."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupStudents.map((student, idx) => {
                  const rep = studentReports[student.id] || {
                    attendance: "present",
                    homework: "done",
                    score: "10",
                    notes: "",
                    gender: isLikelyFemaleName(student.fullName) ? "female" : "male"
                  };

                  return (
                    <div
                      key={student.id}
                      className={`p-3.5 sm:p-4 transition-colors ${
                        rep.attendance === "absent" ? "bg-rose-50/30" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Student Name & Avatar */}
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() =>
                              updateStudentReport(
                                student.id,
                                "gender",
                                rep.gender === "female" ? "male" : "female"
                              )
                            }
                            title={isArabic ? "تبديل الرمز (طالب / طالبة)" : "Toggle gender icon"}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-base shrink-0"
                          >
                            {rep.gender === "female" ? "👩‍🎓" : "👨‍🎓"}
                          </button>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                              <span>{student.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {student.academicYear || (isArabic ? "الصف الدراسي" : "Grade")}
                            </div>
                          </div>
                        </div>

                        {/* Controls Grid */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Attendance */}
                          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => updateStudentReport(student.id, "attendance", "present")}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                                rep.attendance === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span>🟢</span>
                              <span>{isArabic ? "حاضر" : "Present"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentReport(student.id, "attendance", "absent")}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                                rep.attendance === "absent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span>🔴</span>
                              <span>{isArabic ? "غائب" : "Absent"}</span>
                            </button>
                          </div>

                          {/* Homework */}
                          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => updateStudentReport(student.id, "homework", "done")}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition whitespace-nowrap ${
                                rep.homework === "done"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span>📝 {isArabic ? "منجز" : "Done"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentReport(student.id, "homework", "partial")}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition whitespace-nowrap ${
                                rep.homework === "partial"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span>⚠️ {isArabic ? "أنجز بعضه" : "Partial"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentReport(student.id, "homework", "not_done")}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition whitespace-nowrap ${
                                rep.homework === "not_done"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span>⚠️ {isArabic ? "غير منجز" : "Not Done"}</span>
                            </button>
                          </div>

                          {/* Score ⭐ التقييم: [X] / 10 */}
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80">
                            <span className="text-xs">⭐</span>
                            <span className="text-[11px] font-bold text-slate-600">{isArabic ? "التقييم:" : "Score:"}</span>
                            <input
                              type="text"
                              value={rep.score}
                              onChange={e => updateStudentReport(student.id, "score", e.target.value)}
                              placeholder="10"
                              className="w-10 bg-white border border-slate-200 rounded-lg py-1 text-center font-black text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-500 font-mono">/ 10</span>
                          </div>
                        </div>
                      </div>

                      {/* Individual Teacher Note for Student */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0 flex items-center gap-1">
                          <span>📌</span>
                          <span>{isArabic ? "ملاحظة المعلم:" : "Teacher Note:"}</span>
                        </span>
                        <input
                          type="text"
                          value={rep.notes}
                          onChange={e => updateStudentReport(student.id, "notes", e.target.value)}
                          placeholder={
                            isArabic
                              ? "اكتب ملاحظة محددة للطالب إن وجدت (مثل: شوية تركيز، ممتاز في الحساب...) - اتركها فارغة إذا لا توجد"
                              : "Optional note (e.g. Needs slight focus) - Leave empty if none"
                          }
                          className="flex-1 bg-slate-50/90 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* General Lesson Note (Optional) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>🌟</span>
                <span>{isArabic ? "ملاحظة عامة للحصة (تظهر فقط إذا تم إدخالها):" : "General Lesson Note (Shown only if filled):"}</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {isArabic ? "اختياري — لا تضاف تلقائياً إذا كانت فارغة" : "Optional"}
              </span>
            </div>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={e => {
                setGeneralNotes(e.target.value);
                setFinalReportText(buildExactReportText(subjectName, reportDate, teacherName, studentReports, e.target.value));
              }}
              placeholder={
                isArabic
                  ? "اكتب هنا ملاحظة عامة أو توجيهاً شاملاً لجميع أولياء الأمور والطلاب..."
                  : "Write any general remark for all parents..."
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 resize-y"
            />
          </div>
        </div>
      ) : (
        /* WhatsApp Preview Tab */
        <div className="space-y-4">
          <div className="bg-[#0b141a] text-slate-100 rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-800 font-sans">
            {/* WhatsApp Bubble Simulation */}
            <div className="max-w-2xl mx-auto bg-[#202c33] text-[#e9edef] rounded-2xl p-4 sm:p-5 shadow-md border border-[#2a3942] relative">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a3942] text-[11px] text-[#8696a0]">
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <span>💬</span>
                  <span>{isArabic ? "معاينة رسالة WhatsApp المنسقة" : "WhatsApp Formatted Message Preview"}</span>
                </span>
                <span className="font-mono">{reportDate}</span>
              </div>

              {/* Formatted Text Output */}
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-100 select-text">
                {finalReportText || buildExactReportText()}
              </div>

              <div className="mt-4 pt-3 border-t border-[#2a3942] flex items-center justify-between text-[10px] text-[#8696a0]">
                <span>{isArabic ? "نظام GoStars — إدارة ومتابعة الطلاب" : "GoStars Student Management"}</span>
                <span>✓✓ {isArabic ? "تم التنسيق" : "Formatted"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Action Buttons Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* AI Polishing Button */}
          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={handleGenerateAiReport}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>
              {isGeneratingAi
                ? (isArabic ? "جاري صياغة التقرير بالذكاء الاصطناعي..." : "Generating AI Report...")
                : (isArabic ? "✨ صياغة التقرير بالذكاء الاصطناعي" : "✨ Generate AI Report")}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* 📋 نسخ التقرير */}
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSuccess ? (isArabic ? "تم النسخ!" : "Copied!") : (isArabic ? "📋 نسخ التقرير" : "Copy Report")}</span>
          </button>

          {/* 💾 حفظ التقرير */}
          <button
            type="button"
            onClick={handleSaveReport}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isArabic ? "💾 حفظ التقرير" : "Save Report"}</span>
          </button>

          {/* 🟢 إرسال عبر WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsapp}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{isArabic ? "🟢 إرسال عبر WhatsApp" : "Send via WhatsApp"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
