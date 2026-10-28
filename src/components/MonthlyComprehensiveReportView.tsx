/**
 * GoStars - Monthly Student Report View
 * 
 * نظام التقرير الشهري الشامل لمسيرة الطالب في القرآن الكريم والدراسات الإسلامية
 * مخصص حصراً للمادتين:
 * 1. "Quran, Arabic and Islamic Studies"
 * 2. "قرآن كريم"
 * 
 * طرق إدخال وإنشاء التقرير (Choose Data Source):
 * A. From App Data: إنشاء التقرير من سجل الحصص المسجلة داخل التطبيق للشهر المحدد.
 * B. Upload File: رفع ملف خارجي (PDF, DOCX, TXT, Excel/CSV) وتحليله بالذكاء الاصطناعي.
 * C. Paste Text: لصق بيانات الطالب وتقارير الحصص مباشرة دون اشتراط أي تنسيق مسبق.
 * 
 * الضوابط الصارمة:
 * - عدم اختراع أي معلومة (Zero Hallucination).
 * - منع التكرار (Deduplication) بدمج السور والآيات المتكررة في نطاق واحد.
 * - عدم عرض Total Lessons أو Total Hours نهائياً في التقرير.
 * - نفس التصميم الإسلامي والهوية البصرية والكروت وProgress Rings وخطوط واضحة وقراءة مريحة للهاتف.
 * - تصدير PDF و Word (DOCX) متطابق للمعاينة.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Download,
  FileDown,
  Copy,
  Check,
  Share2,
  Save,
  Calendar,
  User,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  Printer,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Upload,
  FileUp,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileCode,
  FileType,
  X,
  HelpCircle,
  History,
  FolderArchive,
  Layers,
  ChevronDown,
  ChevronUp,
  Award
} from "lucide-react";
import { Student, GeneratedReport, AttendanceRecord, AppSettings, getSubjectSpecificAiInstruction, mergeDirectAndAttendanceReports, getEffectiveMonthlyReportSettings } from "../types";
import {
  filterEligibleStudentsForMonthly,
  getEligibleSubjectsForStudent,
  buildComprehensiveMonthlyReportData,
  formatComprehensiveMonthlyReportText,
  sanitizeComprehensiveMonthlyReportData,
  parseTemplateTextToSections,
  ComprehensiveMonthlyReportData,
  ARABIC_MONTHS,
  ENGLISH_MONTHS
} from "../lib/monthlyReportModel";
import { MonthlyReportDocument, MonthlyReportFontScale } from "./monthlyReport/MonthlyReportDocument";
import { exportMonthlyReportToPdf } from "../lib/monthlyReportPdf";
import { generateMonthlyReportDocx } from "../lib/monthlyReportDocx";
import { parseUploadedStudentFile, ParsedFileResult } from "../lib/monthlyReportFileParser";
import { groupArchivedReports, parseYearMonth, formatMonthYearLabel } from "../lib/reportArchiveEngine";
import { SmartStepMemory } from "../lib/smartStepMemory";
import { MonthlyReportSettingsView } from "./MonthlyReportSettingsView";

export type DataSourceMode = "app_data" | "upload_file" | "paste_text";

interface MonthlyComprehensiveReportViewProps {
  students: Student[];
  reports: GeneratedReport[];
  attendanceRecords: AttendanceRecord[];
  settings: AppSettings;
  isArabic: boolean;
  onAddReport: (report: GeneratedReport) => void;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

export const MonthlyComprehensiveReportView: React.FC<MonthlyComprehensiveReportViewProps> = ({
  students,
  reports,
  attendanceRecords,
  settings,
  isArabic,
  onAddReport,
  onSaveSettings
}) => {
  // شاشة إعدادات التقرير الشهري المستقلة
  const [showSettingsView, setShowSettingsView] = useState<boolean>(false);

  // تطهير أي ذاكرة تخزين مؤقت قديمة لتحليل التقارير الشهرية فور فتح الصفحة
  useEffect(() => {
    SmartStepMemory.clearMonthlyReportCache();
  }, []);

  // 0. استرجاع آخر حالة وخطوات قام بها المعلم تلقائياً من الذاكرة الذكية
  const initialMemory = useMemo(() => SmartStepMemory.getMonthlyReportViewState(), []);

  // إعدادات التقرير الشهري الفعالة ومكتبة القوالب المحفوظة
  const effectiveMonthlySettings = useMemo(() => getEffectiveMonthlyReportSettings(settings), [settings]);
  const templates = effectiveMonthlySettings.templates;

  // 1. تصفية الطلاب المؤهلين للمادتين حصراً
  const eligibleStudents = useMemo(() => {
    return filterEligibleStudentsForMonthly(students);
  }, [students]);

  // 2. حالة التاريخ الافتراضي: الشهر الحالي والسنة الحالية
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 - 12

  // 3. طريقة إدخال البيانات (Choose Data Source)
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(initialMemory.dataSourceMode || "app_data");

  // 4. اختيار الطالب والمادة والشهر
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialMemory.selectedStudentId && eligibleStudents.some(s => s.id === initialMemory.selectedStudentId)) {
      return initialMemory.selectedStudentId;
    }
    return eligibleStudents.length > 0 ? eligibleStudents[0].id : "";
  });

  const selectedStudent = useMemo(() => {
    return eligibleStudents.find(s => s.id === selectedStudentId) || eligibleStudents[0] || null;
  }, [eligibleStudents, selectedStudentId]);

  const availableSubjects = useMemo(() => {
    return getEligibleSubjectsForStudent(selectedStudent);
  }, [selectedStudent]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (initialMemory.selectedSubject && availableSubjects.includes(initialMemory.selectedSubject)) {
      return initialMemory.selectedSubject;
    }
    return availableSubjects[0] || "قرآن كريم";
  });

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [selectedStudent, availableSubjects, selectedSubject]);

  const [selectedYear, setSelectedYear] = useState<number>(initialMemory.selectedYear || currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMemory.selectedMonth || currentMonth);
  const [selectedArchiveGroup, setSelectedArchiveGroup] = useState<string>(initialMemory.selectedArchiveGroup || "all_month");
  const [showSourceLessonsInspector, setShowSourceLessonsInspector] = useState<boolean>(false);

  // القالب المختار للتقرير الشهري (مرتبط بالمادة أو باختيار المعلم)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (initialMemory.selectedTemplateId && templates.some(t => t.id === initialMemory.selectedTemplateId)) {
      return initialMemory.selectedTemplateId;
    }
    const matchedForSubj = templates.find(t => t.subject.toLowerCase() === selectedSubject.toLowerCase());
    return matchedForSubj?.id || effectiveMonthlySettings.activeTemplateId || templates[0]?.id || "tpl_comprehensive_en";
  });

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // لغة التقرير
  const [reportLang, setReportLang] = useState<"ar" | "en">(() => {
    if (selectedTemplate?.lang) return selectedTemplate.lang;
    if (initialMemory.reportLang) return initialMemory.reportLang;
    return selectedSubject.toLowerCase().includes("quran, arabic and islamic") ? "en" : "ar";
  });

  // عند تغيير المادة الدراسية، نختار تلقائياً القالب المخصص لهذه المادة (إن وجد) ونضبط لغة التقرير
  useEffect(() => {
    const matched = templates.find(t => t.subject.toLowerCase() === selectedSubject.toLowerCase());
    if (matched) {
      setSelectedTemplateId(matched.id);
      setReportLang(matched.lang);
    } else if (selectedSubject.toLowerCase().includes("quran, arabic and islamic")) {
      setReportLang("en");
    } else {
      setReportLang("ar");
    }
  }, [selectedSubject, templates]);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) {
      setReportLang(tpl.lang);
    }
  };

  // خانة اسم المعلم / المعلمة القابلة للتعديل والكتابة المباشرة
  const [teacherName, setTeacherName] = useState<string>(() => {
    if (initialMemory.teacherName && initialMemory.teacherName.trim()) {
      return initialMemory.teacherName.trim();
    }
    return settings?.teacherName || (reportLang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي");
  });

  useEffect(() => {
    if (settings?.teacherName && !initialMemory.teacherName) {
      setTeacherName(settings.teacherName);
    }
  }, [settings?.teacherName]);

  // استخراج جميع مجلدات الأرشيف والتقارير المؤرشفة الخاصة بالطالب المحدد
  const studentArchiveGroups = useMemo(() => {
    if (!selectedStudent) return [];
    const archivedReports = reports.filter(
      r => (r.studentId === selectedStudent.id || r.studentName?.toLowerCase() === selectedStudent.fullName.toLowerCase()) &&
           r.reportType !== "monthly_comprehensive" &&
           r.archived === true
    );
    const phantomArchivedFromAtt: GeneratedReport[] = attendanceRecords
      .filter(
        ar => (ar.studentId === selectedStudent.id || ar.studentName?.toLowerCase() === selectedStudent.fullName.toLowerCase()) &&
              ar.archived === true
      )
      .map(ar => ({
        id: ar.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        subject: ar.subject || selectedSubject,
        date: ar.date,
        lessonNumber: ar.lessonNumber,
        attendance: ar.attendance,
        homeworkStatus: ar.homeworkStatus,
        classEvents: ar.classEvents,
        homeworkNotes: ar.homeworkNotes,
        teacherNotes: ar.teacherNotes,
        generatedReportText: ar.generatedReportText,
        reportText: ar.generatedReportText,
        aiInstructions: "",
        archived: true,
        archivedAt: ar.archivedAt,
        archiveGroup: ar.archiveGroup,
        createdAt: ar.date
      }));

    const cleanMergedArchived = mergeDirectAndAttendanceReports(archivedReports, phantomArchivedFromAtt);
    return groupArchivedReports(cleanMergedArchived, reportLang === "en");
  }, [selectedStudent, reports, attendanceRecords, selectedSubject, reportLang]);

  // حفظ الخطوات تلقائياً في الذاكرة الذكية عند أي تغيير (دون حفظ نتائج تحليل مسبقة)
  useEffect(() => {
    SmartStepMemory.saveMonthlyReportViewState({
      dataSourceMode,
      selectedStudentId,
      selectedSubject,
      selectedTemplateId,
      selectedYear,
      selectedMonth,
      selectedArchiveGroup,
      reportLang,
      teacherName
    });
  }, [dataSourceMode, selectedStudentId, selectedSubject, selectedTemplateId, selectedYear, selectedMonth, selectedArchiveGroup, reportLang, teacherName]);

  // 4b. الذاكرة التربوية الذكية واسترجاع سياق ما حدث في المرة الماضية
  const previousReportContext = useMemo(() => {
    const studentNameQuery = selectedStudent?.fullName;
    if (!studentNameQuery) return null;

    const pastMonthlyReports = reports
      .filter(r => 
        (r.studentId === selectedStudent?.id || r.studentName?.toLowerCase() === studentNameQuery.toLowerCase()) &&
        (r.reportType === "monthly_comprehensive" || r.id.startsWith("monthly_comprehensive"))
      )
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());

    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

    const prevMonthLessons = reports.filter(r => 
      (r.studentId === selectedStudent?.id || r.studentName?.toLowerCase() === studentNameQuery.toLowerCase()) &&
      r.date?.startsWith(prevMonthPrefix)
    );

    const latestMonthly = pastMonthlyReports[0] || null;

    if (!latestMonthly && prevMonthLessons.length === 0) {
      return null;
    }

    return {
      hasPreviousHistory: true,
      lastReportDate: latestMonthly?.date || prevMonthPrefix,
      lastReportStrengths: latestMonthly?.teacherNotes || "",
      lastReportAchievements: latestMonthly?.classEvents || "",
      lastReportGoals: latestMonthly?.homeworkNotes || "",
      lastEvaluation: latestMonthly?.overallEvaluation || "",
      prevLessonsCount: prevMonthLessons.length,
      prevLessonsSummary: prevMonthLessons
        .map(l => `${l.date}: ${l.classEvents || l.teacherNotes || ""}`)
        .filter(Boolean)
        .slice(0, 8)
        .join(" | "),
      summaryText: latestMonthly 
        ? `تقرير سابق (${latestMonthly.date}): إنجازات: ${latestMonthly.classEvents || "مدونة"} - نقاط القوة السابقة: ${latestMonthly.teacherNotes || "ممتاز"} - أهداف الشهر السابق: ${latestMonthly.homeworkNotes || "مستمرة"}`
        : `سجل حصص الشهر السابق (${prevMonthLessons.length} حصة): ${prevMonthLessons.map(l => l.classEvents || "").filter(Boolean).slice(0, 4).join(" | ")}`
    };
  }, [selectedStudent, selectedMonth, selectedYear, reports]);

  // 5. تجميع الحصص الخام (Source Lessons) فقط لعرض عدد الحصص المقروءة وتمريرها للذكاء الاصطناعي دون فرض أي تحليل مسبق
  const appMonthlyReportData = useMemo<ComprehensiveMonthlyReportData | null>(() => {
    if (!selectedStudent) return null;

    return buildComprehensiveMonthlyReportData({
      student: selectedStudent,
      subject: selectedSubject,
      year: selectedYear,
      month: selectedMonth,
      allReports: reports,
      allAttendance: attendanceRecords,
      teacherName: teacherName.trim() || (reportLang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي"),
      lang: reportLang,
      archiveGroupFilter: selectedArchiveGroup
    });
  }, [selectedStudent, selectedSubject, selectedYear, selectedMonth, reports, attendanceRecords, teacherName, reportLang, selectedArchiveGroup]);

  // 6. حالة التقرير الشهري المنتج وفق تعليمات التحليل والقالب المحدد فقط (لا يعتمد على أي تحليل محفوظ مسبقاً)
  const [customReportData, setCustomReportData] = useState<ComprehensiveMonthlyReportData | null>(null);
  const [editableReportText, setEditableReportText] = useState<string>("");

  // تصفير التقرير الشهري المعروض عند تغيير الطالب أو الشهر أو السنة أو مجلد الأرشيف لضمان عدم بقاء أي تحليل سابق
  useEffect(() => {
    if (dataSourceMode === "app_data") {
      setCustomReportData(null);
      setEditableReportText("");
    }
  }, [selectedStudent?.id, selectedSubject, selectedYear, selectedMonth, selectedArchiveGroup, dataSourceMode]);

  // حقول مصدر الملف (Upload File)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedFileResult, setParsedFileResult] = useState<ParsedFileResult | null>(null);
  const [isFileReading, setIsFileReading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حقول مصدر النص (Paste Text)
  const [pastedText, setPastedText] = useState<string>(initialMemory.pastedText || "");
  const [manualStudentName, setManualStudentName] = useState<string>(initialMemory.manualStudentName || "");

  // البيانات النشطة المعروضة حالياً: تعتمد 100% على التقرير المنتج من تعليمات التحليل والقالب، مع مزامنة أي تعديل نصي في الخطوة 1
  const activeReportData = useMemo<ComprehensiveMonthlyReportData | null>(() => {
    if (!customReportData) return null;

    let synced: ComprehensiveMonthlyReportData = {
      ...customReportData,
      teacherName: teacherName.trim() || customReportData.teacherName,
      lang: reportLang
    };

    if (editableReportText && editableReportText.trim().length > 0) {
      const parsed = parseTemplateTextToSections(editableReportText, customReportData.templateTitle);
      if (parsed.sections.length > 0) {
        synced = {
          ...synced,
          templateTitle: parsed.reportTitle || synced.templateTitle,
          templateSections: parsed.sections,
          rawTemplateText: editableReportText
        };
      }
    }

    return sanitizeComprehensiveMonthlyReportData(synced);
  }, [customReportData, editableReportText, teacherName, reportLang]);

  // حالات العمليات والتصدير
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [fontScale, setFontScale] = useState<MonthlyReportFontScale>(initialMemory.fontScale || "large");

  // Two-step workflow state: Step 1 (Text analysis & raw review) vs Step 2 (Visual design)
  const [reportStep, setReportStep] = useState<1 | 2>(1);

  // مرجع حاوية التقرير لتصدير PDF والمعاينة
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // معالجة اختيار الملف
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsFileReading(true);
    setMessage(null);

    try {
      const parsed = await parseUploadedStudentFile(file);
      setParsedFileResult(parsed);
      setMessage({
        type: "success",
        text: isArabic
          ? `تم قراءة ملف (${file.name}) بنجاح! اضغط الآن على "إنشاء التقرير الشهري" لتحليله وتصميمه.`
          : `File (${file.name}) read successfully! Click "Generate Monthly Report" to analyze and design.`
      });
    } catch (err: any) {
      console.error("Error reading file:", err);
      setMessage({
        type: "error",
        text: isArabic ? "تعذر قراءة محتوى الملف، يرجى التأكد من صلاحية الملف." : "Failed to read file contents."
      });
    } finally {
      setIsFileReading(false);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setParsedFileResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 7. زر "إنشاء التقرير الشهري":
  // يعتمد حصرياً على خانة تعليمات تحليل التقارير اليومية + القالب المختار من مكتبة القوالب
  const handleGenerateMonthlyReport = async () => {
    setIsGenerating(true);
    setMessage(null);
    setSavedSuccess(false);

    const activeTemplateInstructions = selectedTemplate?.instructions || effectiveMonthlySettings.monthlyTemplateInstructions;
    const activeAnalysisInstructions = effectiveMonthlySettings.dailyAnalysisInstructions;

    try {
      if (dataSourceMode === "app_data") {
        // الطريقة الأولى: من بيانات التطبيق والأرشيف
        if (!selectedStudent || !appMonthlyReportData) {
          setMessage({
            type: "error",
            text: isArabic ? "يرجى اختيار طالب أولاً" : "Please select a student first"
          });
          setIsGenerating(false);
          return;
        }

        const subjInstruction = getSubjectSpecificAiInstruction(settings?.subjectDefaults, selectedSubject);
        const generalInstruction = settings?.generalAiInstructions || "";

        const sourceLessonsToAnalyze = (appMonthlyReportData.sourceLessons && appMonthlyReportData.sourceLessons.length > 0)
          ? appMonthlyReportData.sourceLessons
          : reports
              .filter(r => (r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName) && r.reportType !== "monthly_comprehensive")
              .map(r => ({
                date: r.date,
                lessonNumber: r.lessonNumber,
                durationMinutes: r.durationMinutes || 60,
                attendance: (r.attendance || "present") as any,
                homeworkStatus: (r.homeworkStatus || "done") as any,
                classEvents: r.classEvents || "",
                homeworkNotes: r.homeworkNotes || "",
                teacherNotes: r.teacherNotes || "",
                overallEvaluation: r.overallEvaluation || "",
                reportText: r.reportText || r.generatedText || "",
                isArchived: r.archived
              }));

        const payload = {
          studentName: selectedStudent.fullName,
          subject: selectedSubject,
          month: selectedMonth,
          year: selectedYear,
          monthName: appMonthlyReportData.monthLabel,
          teacherName: teacherName.trim() || appMonthlyReportData.teacherName,
          lang: reportLang,
          previousContext: previousReportContext,
          generalAiInstructions: generalInstruction,
          subjectAiInstructions: subjInstruction,
          dailyAnalysisInstructions: activeAnalysisInstructions,
          monthlyTemplateInstructions: activeTemplateInstructions,
          lessons: sourceLessonsToAnalyze.map(l => ({
            date: l.date,
            lessonNumber: l.lessonNumber,
            durationMinutes: l.durationMinutes || 60,
            attendance: l.attendance || "present",
            homeworkStatus: l.homeworkStatus || "done",
            classEvents: l.classEvents || "",
            homeworkNotes: l.homeworkNotes || "",
            teacherNotes: l.teacherNotes || "",
            overallEvaluation: l.overallEvaluation || "",
            reportText: l.reportText || "",
            isArchived: l.isArchived,
            archiveGroup: l.archiveGroup
          }))
        };

        const res = await fetch("/api/ai/generate-monthly-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const result = await res.json();
          if (result && result.reportData) {
            const finalData = sanitizeComprehensiveMonthlyReportData({
              ...result.reportData,
              teacherName: teacherName.trim() || result.reportData.teacherName,
              lang: reportLang,
              activeTemplateId: selectedTemplate?.id,
              activeTemplateName: selectedTemplate?.name,
              sourceLessons: sourceLessonsToAnalyze,
              archivedLessonsCount: sourceLessonsToAnalyze.filter(l => l.isArchived).length,
              activeLessonsCount: sourceLessonsToAnalyze.filter(l => !l.isArchived).length,
              selectedArchiveGroup
            });
            setCustomReportData(finalData);
            setEditableReportText(formatComprehensiveMonthlyReportText(finalData));
          }
          setMessage({
            type: "success",
            text: isArabic
              ? `تم تحليل التقارير اليومية وإنشاء التقرير الشهري بنجاح وفق قالب (${selectedTemplate?.name || "القالب المعتمد"})!`
              : `Monthly Report generated successfully using template (${selectedTemplate?.name || "Active Template"})!`
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || "Failed to generate report");
        }
      } else if (dataSourceMode === "upload_file") {
        // الطريقة الثانية: من رفع ملف
        if (!uploadedFile && !parsedFileResult) {
          setMessage({
            type: "error",
            text: isArabic ? "يرجى رفع ملف أولاً (PDF, DOCX, TXT, Excel/CSV)" : "Please upload a file first"
          });
          setIsGenerating(false);
          return;
        }

        const payload = {
          text: parsedFileResult?.extractedText || "",
          fileBase64: parsedFileResult?.base64Data || undefined,
          mimeType: parsedFileResult?.mimeType || uploadedFile?.type,
          fileName: uploadedFile?.name,
          studentNameHint: manualStudentName.trim() || selectedStudent?.fullName || "الطالب",
          subjectHint: selectedSubject,
          monthHint: selectedMonth,
          yearHint: selectedYear,
          teacherNameHint: teacherName.trim() || (reportLang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي"),
          lang: reportLang,
          previousContext: previousReportContext,
          dailyAnalysisInstructions: activeAnalysisInstructions,
          monthlyTemplateInstructions: activeTemplateInstructions
        };

        const res = await fetch("/api/ai/parse-monthly-report-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error("Failed to parse file data");
        }

        const result = await res.json();
        if (result && result.success && result.reportData) {
          const finalData = sanitizeComprehensiveMonthlyReportData({
            ...result.reportData,
            teacherName: teacherName.trim() || result.reportData.teacherName,
            lang: reportLang,
            activeTemplateId: selectedTemplate?.id,
            activeTemplateName: selectedTemplate?.name
          });
          setCustomReportData(finalData);
          setEditableReportText(formatComprehensiveMonthlyReportText(finalData));
          setMessage({
            type: "success",
            text: isArabic
              ? `تم تحليل محتوى الملف بنجاح وتوليد التقرير وفق قالب (${selectedTemplate?.name || "القالب المعتمد"}) للطالب: ${result.reportData.studentName}!`
              : `File analyzed and report generated using template (${selectedTemplate?.name || "Active Template"}) for: ${result.reportData.studentName}!`
          });
        } else {
          throw new Error("Invalid response format");
        }
      } else if (dataSourceMode === "paste_text") {
        // الطريقة الثالثة: من لصق النص
        if (!pastedText.trim()) {
          setMessage({
            type: "error",
            text: isArabic ? "يرجى لصق بيانات الطالب وتقارير الحصص أولاً في المربع المخصص." : "Please paste student data first."
          });
          setIsGenerating(false);
          return;
        }

        const payload = {
          text: pastedText.trim(),
          studentNameHint: manualStudentName.trim() || selectedStudent?.fullName || "الطالب",
          subjectHint: selectedSubject,
          monthHint: selectedMonth,
          yearHint: selectedYear,
          teacherNameHint: teacherName.trim() || (reportLang === "en" ? "Mr. Mohammed Fathy" : "أ. محمد فتحي"),
          lang: reportLang,
          previousContext: previousReportContext,
          dailyAnalysisInstructions: activeAnalysisInstructions,
          monthlyTemplateInstructions: activeTemplateInstructions
        };

        const res = await fetch("/api/ai/parse-monthly-report-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error("Failed to parse pasted data");
        }

        const result = await res.json();
        if (result && result.success && result.reportData) {
          const finalData = sanitizeComprehensiveMonthlyReportData({
            ...result.reportData,
            teacherName: teacherName.trim() || result.reportData.teacherName,
            lang: reportLang,
            activeTemplateId: selectedTemplate?.id,
            activeTemplateName: selectedTemplate?.name
          });
          setCustomReportData(finalData);
          setEditableReportText(formatComprehensiveMonthlyReportText(finalData));
          setMessage({
            type: "success",
            text: isArabic
              ? `تم تحليل النص المدخل بنجاح وتوليد التقرير وفق قالب (${selectedTemplate?.name || "القالب المعتمد"}) للطالب: ${result.reportData.studentName}!`
              : `Pasted data analyzed and report generated using template (${selectedTemplate?.name || "Active Template"}) for: ${result.reportData.studentName}!`
          });
        } else {
          throw new Error("Invalid response format");
        }
      }

      // الانتقال السلس للمعاينة
      setTimeout(() => {
        reportContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);

    } catch (err: any) {
      console.error("Report generation error:", err);
      setMessage({
        type: "error",
        text: isArabic
          ? "تعذر تحليل البيانات بالكامل، يرجى التأكد من وضوح البيانات المدخلة والمحاولة مجدداً."
          : "Failed to analyze data completely. Please verify the input and try again."
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  // 8. تصدير PDF
  const handleExportPdf = async () => {
    if (!reportContainerRef.current || !activeReportData) return;
    setIsExportingPdf(true);
    setPdfProgressText(isArabic ? "جاري تهيئة الصفحات..." : "Preparing pages...");

    const safeStudentName = activeReportData.studentName.replace(/[\s/\\?%*:|"<>]+/g, "_");
    const monthStr = reportLang === "en" ? activeReportData.monthNameEn : activeReportData.monthNameAr;
    const fileName = `${safeStudentName}_Monthly_Report_${monthStr}_${activeReportData.year || selectedYear}.pdf`;

    try {
      const ok = await exportMonthlyReportToPdf({
        containerElement: reportContainerRef.current,
        fileName,
        onProgress: (text) => setPdfProgressText(text)
      });

      if (ok) {
        setMessage({
          type: "success",
          text: isArabic ? `تم تنزيل ملف PDF بنجاح: ${fileName}` : `PDF downloaded successfully: ${fileName}`
        });
      }
    } catch (err) {
      console.error("PDF Export error:", err);
      setMessage({
        type: "error",
        text: isArabic ? "تعذر إنشاء PDF تلقائياً، يمكنك استخدام خيار الطباعة." : "PDF export failed, please use Print."
      });
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText("");
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 9. تصدير Word (DOCX)
  const handleExportDocx = async () => {
    if (!activeReportData) return;
    setIsExportingDocx(true);

    const safeStudentName = activeReportData.studentName.replace(/[\s/\\?%*:|"<>]+/g, "_");
    const monthStr = reportLang === "en" ? activeReportData.monthNameEn : activeReportData.monthNameAr;
    const fileName = `${safeStudentName}_Monthly_Report_${monthStr}_${activeReportData.year || selectedYear}.docx`;

    try {
      const blob = await generateMonthlyReportDocx(activeReportData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: isArabic ? `تم تنزيل مستند Word بنجاح: ${fileName}` : `Word document downloaded successfully: ${fileName}`
      });
    } catch (err) {
      console.error("DOCX Export error:", err);
      setMessage({
        type: "error",
        text: isArabic ? "حدث خطأ أثناء إنشاء ملف Word." : "Error creating Word document."
      });
    } finally {
      setIsExportingDocx(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 9.1 طباعة مباشرة بدقة المتجهات عبر المتصفح (Vector Print)
  const handleDirectPrint = () => {
    if (!activeReportData) return;
    window.print();
  };

  // 10. نسخ التقرير كنص مرتب
  const handleCopyText = async () => {
    if (!activeReportData) return;
    try {
      const fullText = formatComprehensiveMonthlyReportText(activeReportData);
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // 11. مشاركة عبر واتساب (التزام حرفي بهيكل وعناوين القالب عند توفرها)
  const handleShareWhatsApp = () => {
    if (!activeReportData) return;
    const phone = selectedStudent?.phone ? selectedStudent.phone.replace(/[^0-9+]/g, "") : "";
    const isEn = activeReportData.lang === "en";

    let text = "";
    if (activeReportData.templateSections && activeReportData.templateSections.length > 0) {
      text = formatComprehensiveMonthlyReportText(activeReportData);
    } else {
      const indicatorLines: string[] = [];
      if (activeReportData.indicators.memorization > 0) {
        indicatorLines.push(isEn ? `Memorization: ${activeReportData.indicators.memorization}%` : `معدل الحفظ: ${activeReportData.indicators.memorization}%`);
      }
      if (activeReportData.indicators.revision > 0) {
        indicatorLines.push(isEn ? `Revision: ${activeReportData.indicators.revision}%` : `قوة المراجعة: ${activeReportData.indicators.revision}%`);
      }
      if (activeReportData.indicators.tajweedAndFoundation && activeReportData.indicators.tajweedAndFoundation > 0) {
        indicatorLines.push(isEn ? `Tajweed: ${activeReportData.indicators.tajweedAndFoundation}%` : `التجويد والتأسيس: ${activeReportData.indicators.tajweedAndFoundation}%`);
      }
      if (activeReportData.indicators.islamicStudies && activeReportData.indicators.islamicStudies > 0) {
        indicatorLines.push(isEn ? `Islamic Studies: ${activeReportData.indicators.islamicStudies}%` : `الدراسات الإسلامية: ${activeReportData.indicators.islamicStudies}%`);
      }
      if (activeReportData.indicators.commitment > 0) {
        indicatorLines.push(isEn ? `Commitment: ${activeReportData.indicators.commitment}%` : `الالتزام: ${activeReportData.indicators.commitment}%`);
      }

      const indText = indicatorLines.length > 0 ? `\n\n${indicatorLines.join("\n")}` : "";
      const achText = activeReportData.achievements.length > 0
        ? `\n\n${isEn ? "Key Achievements:" : "أبرز إنجازات الشهر:"}\n${activeReportData.achievements.map(a => `• ${a.titleEn || a.titleAr}: ${a.content}`).join("\n")}`
        : "";

      text = isEn
        ? `As-Salamu Alaykum,\nAttached is the Monthly Qur'an Journey Report for student: ${activeReportData.studentName} (${activeReportData.monthLabel}).${achText}${indText}\n\nTeacher: ${activeReportData.teacherName}\nMay Allah bless the student's efforts!`
        : `السلام عليكم ورحمة الله وبركاته،\nمرفق التقرير الشهري لمسيرة القرآن الكريم للطالب: ${activeReportData.studentName} لشهر ${activeReportData.monthLabel}.${achText}${indText}\n\nاسم المعلم: ${activeReportData.teacherName}\nبارك الله في جهودكم وجهود الطالب!`;
    }

    const encoded = encodeURIComponent(text);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    try {
      navigator.clipboard.writeText(text);
    } catch (_) {}
    window.open(url, "_blank");
  };

  // 12. حفظ التقرير في الأرشيف
  const handleSaveToArchive = () => {
    if (!activeReportData) return;

    const fullFormattedText = formatComprehensiveMonthlyReportText(activeReportData);

    const reportRecord: GeneratedReport = {
      id: `monthly_comprehensive_${selectedStudent?.id || "custom"}_${activeReportData.year || selectedYear}_${activeReportData.month || selectedMonth}_${Date.now()}`,
      studentId: selectedStudent?.id || "custom_entry",
      studentName: activeReportData.studentName,
      subject: activeReportData.subject,
      date: `${activeReportData.year || selectedYear}-${String(activeReportData.month || selectedMonth).padStart(2, "0")}-01`,
      attendance: "present",
      homeworkStatus: "done",
      teacherNotes: activeReportData.strengths.join(" | "),
      classEvents: (activeReportData.templateSections && activeReportData.templateSections.length > 0)
        ? activeReportData.templateSections.map(s => `${s.title}: ${s.content || (s.bullets || []).join("، ")}`).join(" | ")
        : activeReportData.achievements.map(a => `${a.titleAr}: ${a.content}`).join(" | "),
      homeworkNotes: activeReportData.nextMonthGoals.join(" | "),
      overallEvaluation: activeReportData.indicators.memorization > 0 ? `${activeReportData.indicators.memorization}%` : "مكتمل",
      aiInstructions: selectedTemplate?.name || "",
      reportType: "monthly_comprehensive",
      reportText: fullFormattedText,
      createdAt: new Date().toISOString()
    };

    onAddReport(reportRecord);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // تعبئة نموذج تجريبي للنص الملصوق لتسهيل التجربة على المعلم
  const handleLoadSampleText = () => {
    const sample = `تقرير متابعة القرآن الكريم
اسم الطالب: عبد الرحمن خالد
المادة: قرآن كريم
شهر التقييم: مارس 2026

سجل الحصص المنفذة خلال الشهر:
- الأسبوع الأول: حفظ جديد من سورة الملك (الآيات 1 إلى 12) بإتقان تام، مراجعة سورة القلم من 1 إلى 20، التقييم: ممتاز.
- الأسبوع الثاني: إتمام حفظ سورة الملك (الآيات 13 إلى 30)، مراجعة النصف الأول من سورة الملك وسورة القلم كاملة، التقييم: ممتاز.
- الأسبوع الثالث: مراجعة سورة الملك كاملة وتثبيتها، تلاوة صفحتين من سورة البقرة مع تطبيق أحكام النون الساكنة والتنوين (الإظهار والإخفاء).
- الأسبوع الرابع: اختبار شهري في سورتي الملك والقلم وحفظ الآيات كاملة بدرجة 95%، شرح درس في السيرة النبوية (مولد النبي ﷺ ونشأته).

ملاحظات المعلم: الطالب حريص جداً على الحضور، ولديه استيعاب سريع، ويحتاج للاستمرار في الاستماع اليومي للشيخ الحصري لترسيخ التجويد.`;
    setPastedText(sample);
    setManualStudentName("عبد الرحمن خالد");
  };

  if (showSettingsView) {
    return (
      <MonthlyReportSettingsView
        settings={settings}
        onSaveSettings={(newSettings) => {
          if (onSaveSettings) onSaveSettings(newSettings);
        }}
        onBack={() => setShowSettingsView(false)}
        isArabic={isArabic}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 font-sans text-slate-800">
      {/* =========================================================================
          CONTROL PANEL / TOOLBAR (لوحة التحكم واختيار مصدر البيانات)
          ========================================================================= */}
      <section className="bg-white rounded-3xl border border-[#E2D9C5] shadow-md p-5 sm:p-7 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#F0EBE0]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-[#0D4733] text-[#FDF0CD]">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0D4733]">
                {isArabic ? "التقرير الشهري الشامل (Monthly Student Report)" : "Monthly Student Report"}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#52635A]">
              {isArabic
                ? "يعتمد 100% على تعليمات تحليل التقارير اليومية المحفوظة في الإعدادات وقالب التقرير الشهري المحدد دون أي تحليل مسبق."
                : "Relies 100% on your saved Daily Analysis Instructions and the selected Monthly Report Template."}
            </p>
          </div>

          {/* أزرار الإجراءات العليا: إعدادات التقرير وتبديل اللغة */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {/* زر فتح صفحة إعدادات التقرير الشهري */}
            <button
              type="button"
              onClick={() => setShowSettingsView(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0D4733] hover:bg-[#125840] text-[#FDF0CD] text-xs font-bold shadow-sm transition-all border border-[#D4AF37]/50 hover:border-[#D4AF37]"
              title={isArabic ? "إعدادات التقرير الشهري ومكتبة القوالب" : "Monthly Report Settings & Templates"}
            >
              <Sliders className="w-4 h-4 text-[#D4AF37]" />
              <span>{isArabic ? "إعدادات التقرير ومكتبة القوالب" : "Monthly Settings & Templates"}</span>
            </button>

            {/* تبديل لغة التقرير */}
            <div className="flex items-center gap-1.5 bg-[#FAF7EE] p-1 rounded-2xl border border-[#D4AF37]/40">
              <button
                onClick={() => {
                  setReportLang("ar");
                  setCustomReportData(null);
                  setEditableReportText("");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportLang === "ar"
                    ? "bg-[#0D4733] text-[#FDF0CD] shadow-sm"
                    : "text-[#52635A] hover:text-[#0D4733]"
                }`}
              >
                العربية (AR)
              </button>
              <button
                onClick={() => {
                  setReportLang("en");
                  setCustomReportData(null);
                  setEditableReportText("");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportLang === "en"
                    ? "bg-[#0D4733] text-[#FDF0CD] shadow-sm"
                    : "text-[#52635A] hover:text-[#0D4733]"
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CHOOSE DATA SOURCE (اختيار مصدر البيانات - الخيارات الثلاثة بوضوح وسلاسة)
            ========================================================================= */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-[#0D4733] uppercase tracking-wider mb-2">
            {isArabic ? "اختر مصدر بيانات التقرير (Choose Data Source):" : "Choose Data Source:"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* خيار 1: من بيانات التطبيق */}
            <button
              type="button"
              onClick={() => setDataSourceMode("app_data")}
              className={`p-4 rounded-2xl border-2 text-start transition-all flex flex-col justify-between gap-2 ${
                dataSourceMode === "app_data"
                  ? "border-[#0D4733] bg-[#0D4733]/5 shadow-sm ring-2 ring-[#0D4733]/20"
                  : "border-[#E2D9C5] bg-[#FAF7EE] hover:bg-white hover:border-[#C59B27]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-[#0D4733] text-[#FDF0CD]">
                  <Database className="w-4 h-4" />
                </span>
                {dataSourceMode === "app_data" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D4733]" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-[#0D4733] block">
                  {isArabic ? "من بيانات التطبيق" : "From App Data"}
                </span>
                <span className="text-xs text-[#52635A] block mt-0.5">
                  {isArabic ? "اعتماداً على سجل الحصص المحفوظة بالتطبيق" : "From logged lessons inside the app"}
                </span>
              </div>
            </button>

            {/* خيار 2: رفع ملف خارجي */}
            <button
              type="button"
              onClick={() => setDataSourceMode("upload_file")}
              className={`p-4 rounded-2xl border-2 text-start transition-all flex flex-col justify-between gap-2 ${
                dataSourceMode === "upload_file"
                  ? "border-[#C59B27] bg-[#C59B27]/10 shadow-sm ring-2 ring-[#C59B27]/30"
                  : "border-[#E2D9C5] bg-[#FAF7EE] hover:bg-white hover:border-[#C59B27]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-[#C59B27] text-white">
                  <FileUp className="w-4 h-4" />
                </span>
                {dataSourceMode === "upload_file" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C59B27]" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-[#0D4733] block">
                  {isArabic ? "رفع ملف (Upload File)" : "Upload File"}
                </span>
                <span className="text-xs text-[#52635A] block mt-0.5">
                  {isArabic ? "PDF، Word، TXT، أو Excel" : "PDF, Word, TXT, or Excel"}
                </span>
              </div>
            </button>

            {/* خيار 3: لصق نص مباشر */}
            <button
              type="button"
              onClick={() => setDataSourceMode("paste_text")}
              className={`p-4 rounded-2xl border-2 text-start transition-all flex flex-col justify-between gap-2 ${
                dataSourceMode === "paste_text"
                  ? "border-[#15803D] bg-[#15803D]/10 shadow-sm ring-2 ring-[#15803D]/30"
                  : "border-[#E2D9C5] bg-[#FAF7EE] hover:bg-white hover:border-[#C59B27]/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-[#15803D] text-white">
                  <ClipboardList className="w-4 h-4" />
                </span>
                {dataSourceMode === "paste_text" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-[#0D4733] block">
                  {isArabic ? "لصق بيانات (Paste Text)" : "Paste Text"}
                </span>
                <span className="text-xs text-[#52635A] block mt-0.5">
                  {isArabic ? "لصق تقارير ورسائل واتساب بنص حر" : "Paste raw reports or WhatsApp text"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* =========================================================================
            FIELDS BY SOURCE MODE
            ========================================================================= */}

        {/* 1. عند اختيار "من بيانات التطبيق والأرشيف" (App Data) */}
        {dataSourceMode === "app_data" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* اختيار الطالب من الطلاب المؤهلين */}
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1.5">
                  {isArabic ? "1. اختيار الطالب (المؤهلين فقط):" : "1. Select Student (Eligible Only):"}
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setSelectedArchiveGroup("all_month");
                  }}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                >
                  {eligibleStudents.length === 0 ? (
                    <option value="">{isArabic ? "لا يوجد طلاب مؤهلين للمادتين" : "No eligible students"}</option>
                  ) : (
                    eligibleStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.subject || "قرآن كريم"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* المادة */}
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1.5">
                  {isArabic ? "2. المادة الدراسية:" : "2. Subject:"}
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* شهر التقييم */}
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1.5">
                  {isArabic ? "3. شهر التقييم:" : "3. Evaluation Month:"}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setSelectedArchiveGroup("all_month");
                  }}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m} - {reportLang === "en" ? ENGLISH_MONTHS[m - 1] : ARABIC_MONTHS[m - 1]}
                    </option>
                  ))}
                </select>
              </div>

              {/* السنة */}
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1.5">
                  {isArabic ? "4. السنة:" : "4. Year:"}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedArchiveGroup("all_month");
                  }}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                >
                  {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* مجلدات الأرشيف ونطاق الاستخراج المتاحة للطالب */}
            {selectedStudent && (
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#D4AF37]/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-[#C59B27]" />
                    <span className="text-xs font-black text-[#0D4733] uppercase tracking-wider">
                      {isArabic
                        ? "نطاق استخراج التقرير ومجلدات الأرشيف المتاحة للطالب:"
                        : "Report Scope & Student Archive Folders:"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#52635A]">
                    {isArabic
                      ? `يقرأ التقرير الشهري الحصص النشطة والمؤرشفة تلقائياً`
                      : "Reads both active & archived lesson reports automatically"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* الخيار الافتراضي: الشهر المحدد كاملاً */}
                  <button
                    type="button"
                    onClick={() => setSelectedArchiveGroup("all_month")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedArchiveGroup === "all_month"
                        ? "bg-[#0D4733] text-[#FDF0CD] shadow-sm ring-2 ring-[#0D4733]/30"
                        : "bg-white text-slate-700 border border-[#E2D9C5] hover:border-[#0D4733]"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>
                      {isArabic
                        ? `كل حصص ${reportLang === "en" ? ENGLISH_MONTHS[selectedMonth - 1] : ARABIC_MONTHS[selectedMonth - 1]} ${selectedYear} (المؤرشفة + النشطة)`
                        : `All ${ENGLISH_MONTHS[selectedMonth - 1]} ${selectedYear} Lessons (Active & Archived)`}
                    </span>
                  </button>

                  {/* أزرار مجلدات الأرشيف المستخرجة للطالب */}
                  {studentArchiveGroups.map((grp) => {
                    const isSelected = selectedArchiveGroup === grp.groupKey || selectedArchiveGroup === grp.groupNameAr;
                    return (
                      <button
                        key={grp.groupKey}
                        type="button"
                        onClick={() => {
                          setSelectedArchiveGroup(grp.groupKey);
                          if (grp.year) setSelectedYear(grp.year);
                          if (grp.month) setSelectedMonth(grp.month);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#C59B27] text-white shadow-sm ring-2 ring-[#C59B27]/40"
                            : "bg-white text-[#0D4733] border border-[#D4AF37]/50 hover:bg-[#FAF7EE]"
                        }`}
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>{reportLang === "en" ? grp.groupNameEn : grp.groupNameAr}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">
                          {grp.count} {isArabic ? "حصة" : "lessons"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* شريط حالة الحصص المكتشفة مع زر فحص التقارير المقروءة */}
                <div className="mt-3 pt-3 border-t border-[#E2D9C5] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#0D4733] font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {isArabic
                        ? `تم العثور على ${appMonthlyReportData?._internalLessonsCount || 0} حصة مطابقة (منها ${appMonthlyReportData?.archivedLessonsCount || 0} من الأرشيف 📁 و ${appMonthlyReportData?.activeLessonsCount || 0} نشطة 🟢)`
                        : `Found ${appMonthlyReportData?._internalLessonsCount || 0} matching lessons (${appMonthlyReportData?.archivedLessonsCount || 0} archived 📁, ${appMonthlyReportData?.activeLessonsCount || 0} active 🟢)`}
                    </span>
                  </div>

                  {(appMonthlyReportData?.sourceLessons && appMonthlyReportData.sourceLessons.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setShowSourceLessonsInspector(!showSourceLessonsInspector)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#D4AF37]/50 text-[#0D4733] font-bold hover:bg-[#FAF7EE] flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C59B27]" />
                      <span>
                        {showSourceLessonsInspector
                          ? (isArabic ? "إخفاء فحص الحصص المقروءة" : "Hide Included Lessons")
                          : (isArabic ? `فحص ومعاينة التقارير المقروءة (${appMonthlyReportData.sourceLessons.length})` : `Inspect Included Lessons (${appMonthlyReportData.sourceLessons.length})`)}
                      </span>
                      {showSourceLessonsInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* درج فحص الحصص والتقارير المؤرشفة المقروءة */}
                {showSourceLessonsInspector && appMonthlyReportData?.sourceLessons && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-[#D4AF37]/40 space-y-2 max-h-72 overflow-y-auto">
                    <div className="text-[11px] font-bold text-[#52635A] pb-1 border-b border-slate-100 flex items-center justify-between">
                      <span>{isArabic ? "قائمة تقارير الحصص التي يحللها هذا التقرير الشهري:" : "Lessons analyzed for this monthly report:"}</span>
                      <span className="text-emerald-700 font-bold">{appMonthlyReportData.sourceLessons.length} {isArabic ? "تقرير" : "reports"}</span>
                    </div>
                    {appMonthlyReportData.sourceLessons.map((les, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#FAF7EE] border border-[#E2D9C5] text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-black text-[#0D4733]">
                            <span>#{les.lessonNumber || (idx + 1)}</span>
                            <span>• {les.date}</span>
                            <span className="text-[10px] font-semibold text-[#52635A]">({les.durationMinutes} دقيقة)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {les.isArchived ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <FolderArchive className="w-3 h-3" />
                                {les.archiveGroup || (isArabic ? "مؤرشف" : "Archived")}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                {isArabic ? "حصة نشطة" : "Active"}
                              </span>
                            )}
                            {les.overallEvaluation && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0D4733] text-[#FDF0CD]">
                                {les.overallEvaluation}
                              </span>
                            )}
                          </div>
                        </div>
                        {les.classEvents && (
                          <p className="text-[#1C2D24] font-medium leading-relaxed line-clamp-2">
                            <strong className="text-[#0D4733]">{isArabic ? "المحتوى: " : "Content: "}</strong>
                            {les.classEvents}
                          </p>
                        )}
                        {les.homeworkNotes && (
                          <p className="text-[#52635A] text-[11px] line-clamp-1">
                            <strong>{isArabic ? "الواجب: " : "HW: "}</strong>{les.homeworkNotes}
                          </p>
                        )}
                        {les.reportText && !les.classEvents && (
                          <p className="text-[#334155] text-[11px] line-clamp-2 bg-white/70 p-1.5 rounded border border-slate-200">
                            {les.reportText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. عند اختيار "رفع ملف" (Upload File) */}
        {dataSourceMode === "upload_file" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-200">
            {/* منطقة سحب وإفلات أو اختيار الملف */}
            <div className="border-2 border-dashed border-[#C59B27]/60 hover:border-[#0D4733] bg-[#FAF7EE] rounded-3xl p-6 text-center transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="monthly-file-input"
              />

              {!uploadedFile ? (
                <label
                  htmlFor="monthly-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#C59B27]/15 text-[#C59B27] flex items-center justify-center shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#0D4733] block">
                      {isArabic ? "اضغط لاختيار ملف بيانات الطالب أو اسحبه إلى هنا" : "Click to select student data file or drag & drop"}
                    </span>
                    <span className="text-xs text-[#52635A] block mt-1">
                      {isArabic
                        ? "الصيغ المدعومة: PDF, DOCX (Word), TXT, Excel (XLSX/CSV)"
                        : "Supported formats: PDF, DOCX (Word), TXT, Excel (XLSX/CSV)"}
                    </span>
                  </div>
                </label>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2D9C5] text-start">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-xl bg-[#0D4733] text-[#FDF0CD]">
                      {uploadedFile.name.endsWith(".pdf") ? (
                        <FileText className="w-6 h-6" />
                      ) : uploadedFile.name.endsWith(".docx") ? (
                        <FileType className="w-6 h-6" />
                      ) : uploadedFile.name.includes("xls") || uploadedFile.name.endsWith(".csv") ? (
                        <FileSpreadsheet className="w-6 h-6" />
                      ) : (
                        <FileCode className="w-6 h-6" />
                      )}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-[#0D4733] block">
                        {uploadedFile.name}
                      </span>
                      <span className="text-xs text-[#52635A] block mt-0.5">
                        {(uploadedFile.size / 1024).toFixed(1)} KB — {uploadedFile.type || "ملف مستند"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="monthly-file-input"
                      className="cursor-pointer px-3 py-1.5 bg-[#FAF7EE] hover:bg-slate-100 text-xs font-bold text-[#0D4733] rounded-xl border border-[#D4AF37]/40 transition-colors"
                    >
                      {isArabic ? "تغيير الملف" : "Change File"}
                    </label>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title={isArabic ? "إلغاء الملف" : "Remove"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* الحقول المساعدة (تحديد اسم الطالب أو الشهر إن لم تكن واضحة بالملف) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "اسم الطالب (اختياري - في حال عدم ذكره بالملف):" : "Student Name (Optional Hint):"}
                </label>
                <input
                  type="text"
                  value={manualStudentName}
                  onChange={(e) => setManualStudentName(e.target.value)}
                  placeholder={selectedStudent?.fullName || (isArabic ? "اكتب اسم الطالب..." : "Enter student name...")}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "شهر وسنة التقرير (اختياري):" : "Month & Year:"}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-2/3 bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-2 py-2 text-xs font-semibold text-[#1C2D24]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} - {reportLang === "en" ? ENGLISH_MONTHS[m - 1] : ARABIC_MONTHS[m - 1]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-1/3 bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-2 py-2 text-xs font-semibold text-[#1C2D24]"
                  >
                    {[currentYear, currentYear + 1, currentYear - 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "المادة:" : "Subject:"}
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2D24]"
                >
                  <option value="قرآن كريم">قرآن كريم</option>
                  <option value="Quran, Arabic and Islamic Studies">Quran, Arabic and Islamic Studies</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 3. عند اختيار "لصق بيانات" (Paste Text) */}
        {dataSourceMode === "paste_text" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#0D4733] flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-[#C59B27]" />
                <span>{isArabic ? "Paste Student Data (لصق بيانات وتقارير حصص الطالب):" : "Paste Student Data:"}</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSampleText}
                className="text-xs text-[#0D4733] hover:text-[#C59B27] font-semibold underline"
              >
                {isArabic ? "تجربة نموذج بيانات جاهز" : "Load sample data"}
              </button>
            </div>

            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={
                isArabic
                  ? "الصق هنا أي نص يحتوي على بيانات الطالب وتقارير الحصص مباشرة، حتى لو لم يكن مكتوباً بتنسيق محدد...\nمثال:\nاسم الطالب: زيد أحمد\n- حفظ سورة النبأ من 1 إلى 20، مراجعة سورة النازعات.\n- إتمام حفظ سورة النبأ، مراجعة النبأ السابقة، التقييم: ممتاز..."
                  : "Paste any student lesson logs or evaluation notes here...\ne.g. Student: Zayd - Memorized Surah An-Naba 1-20, Reviewed An-Nazi'at..."
              }
              className="w-full bg-[#FAF7EE] border border-[#D4AF37]/60 rounded-2xl p-4 text-sm font-medium text-[#1C2D24] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0D4733] resize-y"
            />

            {/* الحقول المساعدة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "اسم الطالب (اختياري - في حال عدم ذكره بالنص):" : "Student Name (Optional Hint):"}
                </label>
                <input
                  type="text"
                  value={manualStudentName}
                  onChange={(e) => setManualStudentName(e.target.value)}
                  placeholder={selectedStudent?.fullName || (isArabic ? "اكتب اسم الطالب..." : "Enter student name...")}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-[#1C2D24] focus:outline-none focus:ring-2 focus:ring-[#0D4733]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "شهر وسنة التقرير:" : "Month & Year:"}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-2/3 bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-2 py-2 text-xs font-semibold text-[#1C2D24]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} - {reportLang === "en" ? ENGLISH_MONTHS[m - 1] : ARABIC_MONTHS[m - 1]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-1/3 bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-2 py-2 text-xs font-semibold text-[#1C2D24]"
                  >
                    {[currentYear, currentYear + 1, currentYear - 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D4733] mb-1">
                  {isArabic ? "المادة:" : "Subject:"}
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#FAF7EE] border border-[#D4AF37]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#1C2D24]"
                >
                  <option value="قرآن كريم">قرآن كريم</option>
                  <option value="Quran, Arabic and Islamic Studies">Quran, Arabic and Islamic Studies</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MONTHLY REPORT TEMPLATE SELECTOR (اختيار قالب التقرير الشهري من مكتبة القوالب)
            ========================================================================= */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-[#0D4733]/5 via-[#FAF7EE] to-[#C59B27]/10 border-2 border-[#C59B27]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-[#0D4733] text-[#FDF0CD] shadow-inner shrink-0 mt-0.5">
              <Layers className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs sm:text-sm font-black text-[#0D4733]">
                  {isArabic ? "قالب التقرير الشهري المعتمد (Monthly Report Template):" : "Selected Monthly Report Template:"}
                </label>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0D4733] text-[#FDF0CD]">
                  {isArabic ? "التزام حرفي بهيكل وعناوين القالب" : "Strict Template Structure"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#52635A] mt-0.5 leading-relaxed">
                {isArabic
                  ? "يتم إنتاج التقرير بنفس الشكل العام والعناوين المحددة في هذا القالب دون تغيير، ويمكنك اختيار قالب آخر لمادة أخرى أو تخصيصه من الإعدادات."
                  : "Produces the monthly report strictly following this template's exact structure and headings."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full sm:w-80 bg-white border-2 border-[#0D4733]/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#0D4733] focus:outline-none focus:ring-2 focus:ring-[#0D4733] shadow-xs"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} [{tpl.lang === "en" ? "EN" : "AR"}] — ({tpl.subject === "all" ? (isArabic ? "جميع المواد" : "All Subjects") : tpl.subject})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowSettingsView(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#0D4733] text-[#0D4733] hover:text-[#FDF0CD] border border-[#0D4733]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{isArabic ? "إدارة القوالب" : "Manage Templates"}</span>
            </button>
          </div>
        </div>

        {/* خانة اسم المعلم المعتمد في التقرير والتوقيع */}
        <div className="mt-4 p-4 rounded-2xl bg-[#FAF7EE] border border-[#D4AF37]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-[#0D4733] text-[#FDF0CD] shadow-inner">
              <User className="w-4 h-4" />
            </span>
            <div>
              <label className="text-xs font-bold text-[#0D4733] block">
                {isArabic ? "اسم المعلم / المعلمة في التقرير:" : "Teacher Name on Report:"}
              </label>
              <span className="text-[11px] text-[#52635A]">
                {isArabic
                  ? "يظهر مباشرة في الهيدر الرسمي للتقرير وبخط صغير أسفل الصفحة الأخيرة"
                  : "Appears directly in the official report header and in small font at the bottom of the last page"}
              </span>
            </div>
          </div>
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder={isArabic ? "اكتب اسم المعلم هنا..." : "Enter teacher name here..."}
              className="w-full bg-white border border-[#D4AF37]/60 rounded-xl px-3.5 py-2 text-sm font-bold text-[#0D4733] focus:outline-none focus:ring-2 focus:ring-[#0D4733] shadow-xs"
            />
          </div>
        </div>

        {/* بطاقة الذاكرة التربوية الذكية وسياق مسيرة الطالب */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#0D4733]/10 via-[#FAF7EE] to-[#C59B27]/10 border border-[#0D4733]/25 flex items-start gap-3.5 shadow-xs">
          <span className="p-2.5 rounded-xl bg-[#0D4733] text-[#FDF0CD] shrink-0 mt-0.5 shadow-inner">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-xs font-black text-[#0D4733] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#C59B27]" />
                {isArabic ? "الاعتماد الكامل على تعليمات التحليل المحفوظة + قالب التقرير المحدد" : "100% Driven by Saved Analysis Instructions & Selected Template"}
              </span>
              {previousReportContext ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0D4733] text-[#FDF0CD]">
                  {isArabic ? "متصل بالمسيرة السابقة ✓" : "Connected to History ✓"}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  {isArabic ? "تحليل مباشر بدون كاش مسبق" : "Direct Fresh Analysis"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#3D5245] leading-relaxed">
              {isArabic
                ? `تم إيقاف أي تحليل محفوظ مسبقاً، ويقوم النظام عند الضغط على (إنشاء التقرير الشهري) بقراءة التقارير اليومية وتطبيق تعليمات التحليل المحفوظة في الإعدادات حصراً، ثم إخراج التقرير بنفس هيكل وعناوين القالب المختار (${selectedTemplate?.name || ""}).`
                : `Pre-saved monthly analysis caches are disabled. Clicking Generate Monthly Report analyzes daily reports exclusively using your saved Analysis Instructions and formats the output strictly according to (${selectedTemplate?.name || ""}).`}
            </p>
          </div>
        </div>

        {/* =========================================================================
            ACTION BAR (زر إنشاء التقرير وأزرار التصدير)
            ========================================================================= */}
        <div className="mt-6 pt-5 border-t border-[#F0EBE0] flex flex-wrap items-center justify-between gap-3">
          {/* زر إنشاء التقرير الشهري */}
          <button
            onClick={handleGenerateMonthlyReport}
            disabled={
              isGenerating ||
              isFileReading ||
              (dataSourceMode === "upload_file" && !uploadedFile) ||
              (dataSourceMode === "paste_text" && !pastedText.trim()) ||
              (dataSourceMode === "app_data" && !selectedStudent)
            }
            className="px-6 py-3 bg-[#0D4733] hover:bg-[#093526] text-[#FDF0CD] font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-5 h-5 text-[#D4AF37] ${isGenerating ? "animate-spin" : ""}`} />
            <span>
              {isGenerating
                ? (isArabic ? "جاري التحليل وتطبيق القالب..." : "Analyzing & Applying Template...")
                : (isArabic ? "إنشاء التقرير الشهري (Generate Monthly Report)" : "Generate Monthly Report")}
            </span>
          </button>

          {/* أزرار التصدير والإجراءات */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || !activeReportData}
              className="px-4 py-2.5 bg-[#C59B27] hover:bg-[#A9831F] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              title="Download PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>
                {isExportingPdf ? (pdfProgressText || (isArabic ? "جاري التصدير..." : "Exporting...")) : (isArabic ? "تنزيل PDF" : "Download PDF")}
              </span>
            </button>

            {/* Direct Vector Print / Save PDF via Browser */}
            <button
              onClick={handleDirectPrint}
              disabled={!activeReportData}
              className="px-4 py-2.5 bg-[#0D4733] hover:bg-[#072B1E] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-sm border border-[#D4AF37]/50 cursor-pointer"
              title={isArabic ? "طباعة متجهة مباشرة A4 / حفظ كـ PDF بجودة فائقة بدون بكسلة" : "Direct Vector Print / Save as PDF"}
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>{isArabic ? "طباعة متجهة (Vector)" : "Print (Vector)"}</span>
            </button>

            {/* Download Word (DOCX) */}
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx || !activeReportData}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              title="Download Word (DOCX)"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExportingDocx ? (isArabic ? "جاري الإنشاء..." : "Generating...") : (isArabic ? "تنزيل Word" : "Download Word")}
              </span>
            </button>

            {/* Copy Text */}
            <button
              onClick={handleCopyText}
              disabled={!activeReportData}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              title={isArabic ? "نسخ النص" : "Copy Text"}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              disabled={!activeReportData}
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              title={isArabic ? "مشاركة عبر واتساب" : "Share via WhatsApp"}
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Save to Archive */}
            <button
              onClick={handleSaveToArchive}
              disabled={!activeReportData}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              title={isArabic ? "حفظ بالأرشيف" : "Save to Archive"}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* رسائل التنبيه والنتائج */}
        {message && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}
      </section>

      {/* =========================================================================
          TWO-STEP REPORT WORKFLOW (الخطوة 1: التحليل والنص الخام | الخطوة 2: التصميم المرئي)
          ========================================================================= */}
      <section className="bg-white rounded-3xl border border-[#E2D9C5] shadow-md p-5 sm:p-7 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EBE0] mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReportStep(1)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                reportStep === 1
                  ? "bg-[#0D4733] text-[#FDF0CD] shadow-md ring-2 ring-[#0D4733]/30"
                  : "bg-[#FAF7EE] text-[#52635A] hover:bg-[#E2D9C5]/50 border border-[#E2D9C5]"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-[#C59B27] text-white flex items-center justify-center text-xs">1</span>
              <span>{isArabic ? "الخطوة 1: مراجعة وتعديل نص القالب المستخرج" : "Step 1: Review & Edit Template Text"}</span>
            </button>

            <button
              type="button"
              onClick={() => setReportStep(2)}
              disabled={!activeReportData}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
                reportStep === 2
                  ? "bg-[#0D4733] text-[#FDF0CD] shadow-md ring-2 ring-[#0D4733]/30"
                  : "bg-[#FAF7EE] text-[#52635A] hover:bg-[#E2D9C5]/50 border border-[#E2D9C5]"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-[#0D4733] text-[#FDF0CD] flex items-center justify-center text-xs">2</span>
              <span>{isArabic ? "الخطوة 2: المعاينة المرئية للقالب والتصدير" : "Step 2: Visual Template Preview & Export"}</span>
            </button>
          </div>

          <div className="text-xs font-bold text-[#C59B27]">
            {reportStep === 1
              ? (isArabic ? `القالب النشط: ${selectedTemplate?.name || ""}` : `Active Template: ${selectedTemplate?.name || ""}`)
              : (isArabic ? "معاينة مطابقة حرفياً لهيكل وعناوين القالب" : "Literal 1:1 Template Layout Preview")}
          </div>
        </div>

        {reportStep === 1 ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#D4AF37]/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#0D4733]">
                  {isArabic ? "📝 نص التقرير الشهري المستخرج وفق تعليمات التحليل وهيكل القالب" : "📝 Extracted Monthly Report Text (Template Structure)"}
                </h3>
                <p className="text-xs text-[#52635A] mt-0.5">
                  {isArabic
                    ? "أي تعديل تجريه هنا على العناوين أو النقاط ينعكس حرفياً وبشكل فوري في المعاينة المرئية (الخطوة 2) وفي ملفات PDF و Word."
                    : "Any edits you make here to headings or bullets are immediately reflected 1:1 in Step 2 Visual Preview, PDF, and Word."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (customReportData) {
                    setEditableReportText(formatComprehensiveMonthlyReportText(customReportData));
                  }
                }}
                className="px-3 py-1.5 bg-white border border-[#D4AF37]/50 rounded-xl text-xs font-bold text-[#0D4733] hover:bg-[#FAF7EE] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>{isArabic ? "استعادة النص الأصلي" : "Reset Text"}</span>
              </button>
            </div>

            <textarea
              rows={16}
              value={editableReportText}
              onChange={(e) => setEditableReportText(e.target.value)}
              placeholder={isArabic ? "اضغط على زر (إنشاء التقرير الشهري) بالأعلى أولاً لتحليل التقارير اليومية وفق التعليمات وتطبيق القالب المحدد..." : "Click 'Generate Monthly Report' above to analyze daily reports and apply the selected template..."}
              className="w-full bg-[#FAF7EE] border-2 border-[#C59B27]/60 rounded-2xl p-4 font-mono text-xs sm:text-sm text-[#1C2D24] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0D4733] resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[#52635A] font-medium">
                {isArabic
                  ? "✓ التزام تام بتعليمات التحليل المحفوظة وهيكل القالب المختار بدون أي بيانات مسبقة."
                  : "✓ Strictly adheres to your saved Analysis Instructions and Selected Template."}
              </span>

              <button
                type="button"
                onClick={() => setReportStep(2)}
                disabled={!activeReportData}
                className="px-6 py-3 bg-[#0D4733] hover:bg-[#093526] text-[#FDF0CD] font-black text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isArabic ? "الانتقال إلى الخطوة 2: المعاينة المرئية للقالب ➔" : "Proceed to Step 2: Visual Template Preview ➔"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#D4AF37]/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#0D4733]">
                {isArabic ? `🎨 المعاينة المرئية المطابقة للقالب: (${selectedTemplate?.name || ""})` : `🎨 Literal Template Visual Preview: (${selectedTemplate?.name || ""})`}
              </h3>
              <p className="text-xs text-[#52635A] mt-0.5">
                {isArabic
                  ? "يتم عرض التقرير وتصديره إلى PDF و Word بنفس عناوين وترتيب ومحتوى القالب المعتمد حرفياً."
                  : "Rendered and exported to PDF & Word strictly following your template's exact headings and order."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReportStep(1)}
              className="px-4 py-2 bg-white border border-[#0D4733] rounded-xl text-xs font-bold text-[#0D4733] hover:bg-[#FAF7EE] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isArabic ? "⬅ العودة للخطوة 1: تعديل نص التقرير" : "⬅ Back to Step 1: Edit Report Text"}</span>
            </button>
          </div>
        )}
      </section>

      {/* =========================================================================
          LIVE PREVIEW (العرض الحي للتقرير قبل التصدير بنفس الهوية الإسلامية الكاملة)
          ========================================================================= */}
      {reportStep === 2 && (
      <section className="w-full flex flex-col items-center animate-in fade-in duration-200">
        {/* شريط الإشعار العلوي للمعاينة مع أزرار التحكم بحجم الخط */}
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between px-4 py-2.5 mb-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-[#E2D9C5] gap-3 text-xs sm:text-sm text-[#52635A]">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#C59B27]" />
            <span className="font-bold text-[#0D4733]">
              {isArabic ? "معاينة التقرير قبل التصدير والطباعة (Live Preview)" : "Live Report Preview"}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Font Size Selector */}
            <div className="flex items-center gap-1.5 bg-[#FAF7EE] p-1 rounded-xl border border-[#D4AF37]/40 text-xs">
              <span className="text-[11px] font-bold text-[#0D4733] px-1">
                {isArabic ? "حجم الخط:" : "Font Size:"}
              </span>
              <button
                type="button"
                onClick={() => setFontScale("normal")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  fontScale === "normal"
                    ? "bg-[#0D4733] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={isArabic ? "حجم قياسي" : "Standard"}
              >
                A- {isArabic ? "عادي" : "Normal"}
              </button>
              <button
                type="button"
                onClick={() => setFontScale("large")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  fontScale === "large"
                    ? "bg-[#0D4733] text-[#FDF0CD] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={isArabic ? "حجم كبير واضح (افتراضي وموصى به)" : "Large (Recommended)"}
              >
                A+ {isArabic ? "كبير (موصى به)" : "Large"}
              </button>
              <button
                type="button"
                onClick={() => setFontScale("xlarge")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  fontScale === "xlarge"
                    ? "bg-[#0D4733] text-[#FDF0CD] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={isArabic ? "حجم كبير جداً لأقصى وضوح" : "Extra Large"}
              >
                A++ {isArabic ? "كبير جداً" : "Extra Large"}
              </button>
            </div>

            <span className="text-[#C59B27] font-bold">
              {reportLang === "en" ? "A4 Adaptive Multi-Page Layout (High Legibility)" : "تخطيط A4 متكيف متعدد الصفحات عالي الوضوح"}
            </span>
          </div>
        </div>

        {/* حاوية وثيقة التقرير القابلة للتصدير */}
        <div ref={reportContainerRef} className="w-full flex flex-col items-center">
          {activeReportData ? (
            <MonthlyReportDocument data={activeReportData} fontScale={fontScale} />
          ) : (
            <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E2D9C5] p-12 text-center text-[#52635A]">
              <BookOpen className="w-12 h-12 text-[#C59B27] mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-[#0D4733]">
                {isArabic ? "جاهز لإنشاء التقرير الشهري وفق تعليمات التحليل والقالب المحدد" : "Ready to generate Monthly Report using your Analysis Instructions & Selected Template"}
              </h3>
              <p className="text-xs sm:text-sm text-[#52635A] mt-1">
                {isArabic
                  ? "اضغط على زر (إنشاء التقرير الشهري) بالأعلى لتحليل التقارير اليومية وإنتاج التقرير بالقالب المختار."
                  : "Click 'Generate Monthly Report' above to analyze daily reports and format with your selected template."}
              </p>
            </div>
          )}
        </div>
      </section>
      )}
    </div>
  );
};
