import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  Share2,
  Copy,
  AlertCircle
} from "lucide-react";
import { Group, Student } from "../types";

interface StudentReportItem {
  attendance: "present" | "absent";
  homework: "done" | "not_done" | "partial";
  score: string;
  notes: string;
}

interface GroupReportViewProps {
  group: Group;
  students: Student[];
  isArabic?: boolean;
  onBack: () => void;
  onSaveReport?: (reportData: {
    groupId: string;
    date: string;
    items: Record<string, StudentReportItem>;
    generalNotes: string;
  }) => void;
}

export const GroupReportView: React.FC<GroupReportViewProps> = ({
  group,
  students,
  isArabic = true,
  onBack,
  onSaveReport
}) => {
  // Filter students who belong to this group
  const groupStudents = students.filter(s =>
    group.studentIds && group.studentIds.includes(s.id)
  );

  const storageKey = `group_report_${group.id}_latest`;

  // Initialize report items state
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
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
      initial[s.id] = {
        attendance: "present",
        homework: "done",
        score: "",
        notes: ""
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

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState("");

  // Ensure all current students have an entry in state
  useEffect(() => {
    setStudentReports(prev => {
      const updated = { ...prev };
      let changed = false;
      groupStudents.forEach(s => {
        if (!updated[s.id]) {
          updated[s.id] = {
            attendance: "present",
            homework: "done",
            score: "",
            notes: ""
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [groupStudents]);

  const updateStudentReport = (
    studentId: string,
    field: keyof StudentReportItem,
    value: string
  ) => {
    setStudentReports(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // 💾 حفظ التقرير
  const handleSaveReport = () => {
    const reportData = {
      groupId: group.id,
      date: reportDate,
      items: studentReports,
      generalNotes: generalNotes.trim(),
      updatedAt: new Date().toISOString()
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

  // Format and build WhatsApp Message
  const buildReportMessage = (): string => {
    let msg = `📋 *تقرير الحصة*\n📅 التاريخ: ${reportDate}\n\n`;

    groupStudents.forEach((student, index) => {
      const rep = studentReports[student.id] || {
        attendance: "present",
        homework: "done",
        score: "",
        notes: ""
      };

      const attendanceText =
        rep.attendance === "present" ? "حاضر ✅" : "غائب ❌";

      let homeworkText = "أنجزه ✅";
      if (rep.homework === "not_done") homeworkText = "لم ينجزه ❌";
      if (rep.homework === "partial") homeworkText = "أنجز بعضه ⚠️";

      msg += `*${index + 1}. الطالب:* ${student.fullName}\n`;
      msg += `• الحضور: ${attendanceText}\n`;
      msg += `• الواجب: ${homeworkText}\n`;

      if (rep.score && rep.score.trim() !== "") {
        msg += `• الدرجة: ${rep.score.trim()}\n`;
      }

      if (rep.notes && rep.notes.trim() !== "") {
        msg += `• ملاحظات المعلم: ${rep.notes.trim()}\n`;
      }

      msg += `\n`;
    });

    if (generalNotes && generalNotes.trim() !== "") {
      msg += `━━━━━━━━━━━━━━━\n`;
      msg += `📝 *ملاحظات عامة للمعلم:*\n${generalNotes.trim()}\n`;
    }

    return msg;
  };

  // 🟢 إرسال عبر WhatsApp
  const handleSendWhatsapp = () => {
    const message = buildReportMessage();

    // Auto resolve WhatsApp number or link from group data
    const rawTarget = (group.parentWhatsapp || group.whatsappGroupLink || "").trim();

    // Copy text to clipboard in all cases as backup
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    if (!rawTarget) {
      // Open generic WhatsApp share with text
      const genericUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(genericUrl, "_blank");
      setWhatsappNotice(isArabic ? "تم تجهيز الرسالة وفتح واتساب" : "WhatsApp opened with message");
      setTimeout(() => setWhatsappNotice(""), 4000);
      return;
    }

    // Check if target is a web URL or WhatsApp group link
    if (rawTarget.startsWith("http://") || rawTarget.startsWith("https://") || rawTarget.includes("chat.whatsapp.com")) {
      // If it is a group link, open group and notify that message is copied
      const groupLink = rawTarget.startsWith("http") ? rawTarget : `https://${rawTarget}`;
      window.open(groupLink, "_blank");
      setWhatsappNotice(isArabic ? "تم نسخ نص التقرير وفتح رابط الجروب" : "Report copied and WhatsApp group opened");
      setTimeout(() => setWhatsappNotice(""), 4000);
    } else {
      // Treat as phone number
      let cleanPhone = rawTarget.replace(/[^\d+]/g, "");
      if (cleanPhone.startsWith("+")) {
        cleanPhone = cleanPhone.substring(1);
      } else if (cleanPhone.startsWith("01")) {
        // Egyptian phone number format default
        cleanPhone = "20" + cleanPhone.substring(1);
      }

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      setWhatsappNotice(isArabic ? "تم فتح محادثة واتساب مع التقرير" : "WhatsApp chat opened with report");
      setTimeout(() => setWhatsappNotice(""), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 space-y-4">
      {/* Top Bar: Back Button & Title */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 font-bold text-xs"
          >
            {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isArabic ? "رجوع" : "Back"}</span>
          </button>
          <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📋</span>
            <span>{isArabic ? "تقرير المجموعة" : "Group Report"}</span>
          </h1>
        </div>

        {/* Optional Date Picker */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Notifications / Feedback */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isArabic ? "تم حفظ التقرير بنجاح! 💾" : "Report saved successfully! 💾"}</span>
        </div>
      )}

      {whatsappNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{whatsappNotice}</span>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {groupStudents.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold">
              {isArabic ? "لا يوجد طلاب مضافون في هذه المجموعة حالياً." : "No students in this group."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th className="py-3 px-3.5 min-w-[140px]">{isArabic ? "الطالب" : "Student"}</th>
                  <th className="py-3 px-3.5 min-w-[160px] text-center">{isArabic ? "الحضور" : "Attendance"}</th>
                  <th className="py-3 px-3.5 min-w-[240px] text-center">{isArabic ? "الواجب" : "Homework"}</th>
                  <th className="py-3 px-3.5 min-w-[100px] text-center">{isArabic ? "الدرجة" : "Score"}</th>
                  <th className="py-3 px-3.5 min-w-[200px]">{isArabic ? "ملاحظات المعلم (اختيارية)" : "Teacher Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupStudents.map((student, index) => {
                  const rep = studentReports[student.id] || {
                    attendance: "present",
                    homework: "done",
                    score: "",
                    notes: ""
                  };

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        rep.attendance === "absent" ? "bg-rose-50/25" : ""
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">
                        {student.fullName}
                      </td>

                      {/* الحضور: حاضر / غائب */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => updateStudentReport(student.id, "attendance", "present")}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                              rep.attendance === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {isArabic ? "حاضر" : "Present"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentReport(student.id, "attendance", "absent")}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                              rep.attendance === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {isArabic ? "غائب" : "Absent"}
                          </button>
                        </div>
                      </td>

                      {/* الواجب: أنجزه / لم ينجزه / أنجز بعضه */}
                      <td className="py-3 px-3.5 text-center">
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
                            {isArabic ? "أنجزه" : "Done"}
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
                            {isArabic ? "أنجز بعضه" : "Partial"}
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
                            {isArabic ? "لم ينجزه" : "Not Done"}
                          </button>
                        </div>
                      </td>

                      {/* الدرجة: خانة رقمية */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rep.score}
                          onChange={e => updateStudentReport(student.id, "score", e.target.value)}
                          placeholder={isArabic ? "درجة" : "Score"}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-center text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </td>

                      {/* ملاحظات المعلم: اختيارية */}
                      <td className="py-3 px-3.5">
                        <input
                          type="text"
                          value={rep.notes}
                          onChange={e => updateStudentReport(student.id, "notes", e.target.value)}
                          placeholder={isArabic ? "ملاحظات حول الطالب (اختياري)..." : "Notes (optional)..."}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. نهاية الصفحة: ملاحظات عامة للمعلم — اختيارية */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
        <label className="block text-xs font-black text-slate-800">
          {isArabic ? "ملاحظات عامة للمعلم (اختيارية):" : "General Teacher Notes (Optional):"}
        </label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          placeholder={
            isArabic
              ? "اكتب هنا أي ملاحظات أو توجيهات عامة حول الحصة أو التقرير..."
              : "Write any general notes or remarks about the session..."
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs resize-y"
        />
      </div>

      {/* 5. زرين: 💾 حفظ التقرير | 🟢 إرسال عبر WhatsApp */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        {/* 💾 حفظ التقرير */}
        <button
          type="button"
          onClick={handleSaveReport}
          className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition shadow-md shadow-slate-900/20 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isArabic ? "💾 حفظ التقرير" : "Save Report"}</span>
        </button>

        {/* 🟢 إرسال عبر WhatsApp */}
        <button
          type="button"
          onClick={handleSendWhatsapp}
          className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>{isArabic ? "🟢 إرسال عبر WhatsApp" : "Send via WhatsApp"}</span>
        </button>
      </div>
    </div>
  );
};
