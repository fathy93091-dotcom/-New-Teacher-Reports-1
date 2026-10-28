import React, { useState, useEffect } from "react";
import { FolderArchive, Sparkles, Calendar, CheckCircle2, X } from "lucide-react";
import { Student, GeneratedReport, AttendanceRecord, isDailyPersonalReport, areReportsDuplicate } from "../types";
import {
  getActiveCycleInfo,
  formatMonthYearLabel,
  parseYearMonth,
  isReportInActiveCycle,
  isFixedPackageStudent,
  getPackageLessonsLimit
} from "../lib/reportArchiveEngine";

interface ArchiveCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  allReports: GeneratedReport[];
  allAttendance?: AttendanceRecord[];
  isArabic?: boolean;
  onConfirmArchive: (params: {
    archiveGroupName: string;
    newCycleStartDate: string;
    newCycleName: string;
    resetLessonBalance: boolean;
  }) => void;
}

export const ArchiveCycleModal: React.FC<ArchiveCycleModalProps> = ({
  isOpen,
  onClose,
  student,
  allReports = [],
  allAttendance = [],
  isArabic = true,
  onConfirmArchive
}) => {
  const now = new Date();
  const activeCycle = getActiveCycleInfo(student);
  const cycleParsed = parseYearMonth(activeCycle.startDate !== "2000-01-01" ? activeCycle.startDate : now.toISOString().slice(0, 10));
  const cycleLabel = formatMonthYearLabel(cycleParsed.year, cycleParsed.month);
  const isFixedPkg = isFixedPackageStudent(student);
  const pkgLimit = getPackageLessonsLimit(student);

  // Default archive name for the cycle ending
  const defaultArchiveName = isFixedPkg
    ? (isArabic
        ? `باقة ${cycleLabel.ar} (${pkgLimit} حصص)`
        : `${cycleLabel.en} Package (${pkgLimit} lessons)`)
    : (isArabic ? `أرشيف ${cycleLabel.ar}` : `${cycleLabel.en} Archive`);

  // Default new cycle info (e.g. today or next month)
  const currentMonthLabel = formatMonthYearLabel(now.getFullYear(), now.getMonth() + 1);
  const defaultNewCycleName = isFixedPkg
    ? (isArabic ? `باقة ${currentMonthLabel.ar} (${pkgLimit} حصص)` : `${currentMonthLabel.en} Package (${pkgLimit} lessons)`)
    : (isArabic ? currentMonthLabel.ar : currentMonthLabel.en);
  const defaultNewStartDate = now.toISOString().slice(0, 10);

  const [archiveGroupName, setArchiveGroupName] = useState(defaultArchiveName);
  const [newCycleStartDate, setNewCycleStartDate] = useState(defaultNewStartDate);
  const [newCycleName, setNewCycleName] = useState(defaultNewCycleName);
  const [resetLessonBalance, setResetLessonBalance] = useState(Boolean(isFixedPkg || student?.lessonsPerMonth));

  // Sync defaults whenever the modal opens or student changes
  useEffect(() => {
    if (isOpen && student) {
      setArchiveGroupName(defaultArchiveName);
      setNewCycleStartDate(defaultNewStartDate);
      setNewCycleName(defaultNewCycleName);
      setResetLessonBalance(Boolean(isFixedPkg || student.lessonsPerMonth));
    }
  }, [isOpen, student?.id, student?.currentCycleStartDate]);

  if (!isOpen || !student) return null;

  const studentIdStr = String(student.id || "").trim();
  const studentNameNorm = (student.fullName || "").trim().toLowerCase();

  // Count reports that will be archived (both direct reports and attendance-backed daily reports)
  const activeDirectReports = allReports.filter(
    (r) =>
      r &&
      ((r.studentId && String(r.studentId).trim() === studentIdStr) ||
        (r.studentName && r.studentName.trim().toLowerCase() === studentNameNorm)) &&
      isDailyPersonalReport(r) &&
      (isReportInActiveCycle(r, student, activeCycle) || r.archived !== true)
  );

  const activeAttOnlyReports = allAttendance.filter((ar) => {
    if (!ar || ar.archived === true || !(ar.generatedReportText || ar.teacherNotes)) return false;
    const matchesStudent =
      (ar.studentId && String(ar.studentId).trim() === studentIdStr) ||
      (ar.studentName && ar.studentName.trim().toLowerCase() === studentNameNorm);
    if (!matchesStudent) return false;
    const arPhantom: Partial<GeneratedReport> = {
      id: ar.id,
      studentId: student.id,
      studentName: student.fullName || ar.studentName || "",
      subject: ar.subject || student.subject || "",
      date: ar.date,
      lessonNumber: ar.lessonNumber,
      reportText: ar.generatedReportText || ar.teacherNotes || "",
      reportType: "daily_personal"
    };
    return !activeDirectReports.some((sr) => areReportsDuplicate(sr, arPhantom));
  });

  const activeReportsCount = activeDirectReports.length + activeAttOnlyReports.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmArchive({
      archiveGroupName: archiveGroupName.trim() || defaultArchiveName,
      newCycleStartDate: newCycleStartDate || defaultNewStartDate,
      newCycleName: newCycleName.trim() || defaultNewCycleName,
      resetLessonBalance
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">
                {isArabic ? "أرشفة الشهر / الباقة المنتهية" : "Archive Ended Month / Package"}
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {isArabic
                  ? `ترحيل تقارير الطالب (${student.fullName}) إلى الأرشيف`
                  : `Archive reports for ${student.fullName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 space-y-1">
              <p className="font-bold">
                {isArabic
                  ? `سيتم نقل (${activeReportsCount}) تقرير نشط إلى الأرشيف تحت اسم هذا الشهر/الباقة.`
                  : `(${activeReportsCount}) active reports will be archived under this month/package.`}
              </p>
              <p className="text-purple-700 font-medium">
                {isArabic
                  ? "سيبقى في قسم (التقارير الحالية) فقط التقارير الجديدة التي ستنشئها للشهر أو الباقة الجديدة."
                  : "Only newly created reports for the upcoming month/package will remain in Active Reports."}
              </p>
            </div>
          </div>

          {/* 1. Archive Group Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span>{isArabic ? "مسمى مجلد الأرشيف للشهر المنتهي:" : "Archive Folder Name:"}</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {isArabic ? "(سيظهر في قسم التقارير المؤرشفة)" : "(Shown in Archive)"}
              </span>
            </label>
            <input
              type="text"
              required
              value={archiveGroupName}
              onChange={(e) => setArchiveGroupName(e.target.value)}
              placeholder={defaultArchiveName}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isArabic ? "بيانات الدورة / الباقة الجديدة:" : "New Month / Package Setup:"}</span>
            </h4>

            {/* 2. New Cycle Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">
                  {isArabic ? "تاريخ بدء الدورة الجديدة:" : "New Cycle Start Date:"}
                </label>
                <input
                  type="date"
                  required
                  value={newCycleStartDate}
                  onChange={(e) => setNewCycleStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* 3. New Cycle Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">
                  {isArabic ? "مسمى الدورة الجديدة:" : "New Cycle Name:"}
                </label>
                <input
                  type="text"
                  required
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder={defaultNewCycleName}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Optional: Reset Package Lessons Balance */}
          {Boolean(student.lessonsPerMonth) && (
            <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition">
              <input
                type="checkbox"
                checked={resetLessonBalance}
                onChange={(e) => setResetLessonBalance(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-bold text-slate-700">
                {isArabic
                  ? `تجديد رصيد الحصص للباقة الجديدة (${student.lessonsPerMonth} حصص)`
                  : `Reset lesson balance for the new package (${student.lessonsPerMonth} lessons)`}
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isArabic ? "تأكيد الأرشفة وبدء الدورة الجديدة" : "Confirm Archive & Start New"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
