import React, { useState } from "react";
import {
  Users,
  User,
  Plus,
  Play,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Share2,
  Copy,
  Check,
  X,
  BookOpen,
  Paperclip,
  FileUp,
  FileText
} from "lucide-react";
import {
  Group,
  PrivateLesson,
  Student,
  Lesson,
  AttendanceStatus,
  HomeworkStatus,
  AppSettings,
  ReportAttachment,
  ScheduleSlot
} from "../types";
import { MixedScheduleEditor, formatTime12h } from "./MixedScheduleEditor";

interface GroupsViewProps {
  settings: AppSettings;
  groups: Group[];
  privateLessons: PrivateLesson[];
  students: Student[];
  lessons: Lesson[];
  onAddGroup: (group: Omit<Group, "id" | "createdAt">) => void;
  onAddPrivateLesson: (lesson: Omit<PrivateLesson, "id" | "createdAt">) => void;
  onUpdateGroup: (id: string, group: Partial<Group>) => void;
  onDeleteGroup?: (id: string) => void;
  onUpdatePrivateLesson?: (id: string, lesson: Partial<PrivateLesson>) => void;
  onDeletePrivateLesson?: (id: string) => void;
  onSaveAttendanceAndNotes: (
    lessonId: string,
    attendanceList: { studentId: string; attendance: AttendanceStatus; homeworkStatus: HomeworkStatus }[],
    teacherNotes: string,
    aiInstructions: string,
    generatedReportText?: string
  ) => void;
  onGenerateReportAi: (payload: {
    studentName: string;
    subject: string;
    teacherNotes: string;
    aiInstructions: string;
    attachment?: ReportAttachment;
  }) => Promise<string>;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  settings,
  groups,
  privateLessons,
  students,
  lessons,
  onAddGroup,
  onAddPrivateLesson,
  onUpdateGroup,
  onDeleteGroup,
  onUpdatePrivateLesson,
  onDeletePrivateLesson,
  onSaveAttendanceAndNotes,
  onGenerateReportAi
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [activeTab, setActiveTab] = useState<"groups" | "private">("groups");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"group" | "private">("group");

  // Form State for Add
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("الرياضيات");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 },
    { day: isArabic ? "الأحد" : "Sun", time: "19:00", durationMinutes: 90 }
  ]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");

  // Edit Modal State
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingPrivateLesson, setEditingPrivateLesson] = useState<PrivateLesson | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editScheduleSlots, setEditScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [editWhatsappLink, setEditWhatsappLink] = useState("");

  // Selected Group or Private for Detailed View
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Active Lesson Attendance Session
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessonWhatsappLink, setLessonWhatsappLink] = useState("");
  const [whatsappSentNotice, setWhatsappSentNotice] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { attendance: AttendanceStatus; homeworkStatus: HomeworkStatus }>
  >({});
  const [teacherNotes, setTeacherNotes] = useState("");
  const [aiInstructions, setAiInstructions] = useState(settings.generalAiInstructions || "");
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [lessonAttachment, setLessonAttachment] = useState<ReportAttachment | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLessonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(isArabic ? "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 10 ميجابايت." : "File too large. Max 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const parts = dataUrl.split(";base64,");
      if (parts.length === 2) {
        const mimeType = parts[0].replace("data:", "");
        const base64Data = parts[1];
        setLessonAttachment({
          fileName: file.name,
          mimeType,
          data: base64Data,
          previewUrl: mimeType.startsWith("image/") ? dataUrl : undefined
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStudentSelectToggle = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleEditStudentSelectToggle = (id: string) => {
    if (editStudentIds.includes(id)) {
      setEditStudentIds(editStudentIds.filter(i => i !== id));
    } else {
      setEditStudentIds([...editStudentIds, id]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSlots = scheduleSlots.length > 0 ? scheduleSlots : [{ day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 }];
    const uniqueDays = Array.from(new Set(effectiveSlots.map(s => s.day)));
    const primaryTime = effectiveSlots[0]?.time || "17:00";
    const primaryDuration = effectiveSlots[0]?.durationMinutes || 90;

    if (addType === "group") {
      if (!name.trim()) return;
      onAddGroup({
        name: name.trim(),
        subject: subject.trim() || "عام",
        days: uniqueDays,
        time: primaryTime,
        durationMinutes: primaryDuration,
        scheduleSlots: effectiveSlots,
        studentIds: selectedStudentIds,
        status: "active",
        whatsappGroupLink: whatsappGroupLink.trim() || undefined
      });
    } else {
      const studentObj = students.find(s => s.id === selectedStudentId);
      if (!studentObj) return;
      onAddPrivateLesson({
        studentId: studentObj.id,
        studentName: studentObj.fullName,
        subject: subject.trim() || studentObj.subject || "عام",
        days: uniqueDays,
        time: primaryTime,
        durationMinutes: primaryDuration,
        scheduleSlots: effectiveSlots,
        status: "active",
        whatsappGroupLink: whatsappGroupLink.trim() || studentObj.whatsappGroupLink || undefined
      });
    }
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setSubject("الرياضيات");
    setSelectedStudentId("");
    setScheduleSlots([
      { day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 },
      { day: isArabic ? "الأحد" : "Sun", time: "19:00", durationMinutes: 90 }
    ]);
    setSelectedStudentIds([]);
    setWhatsappGroupLink("");
  };

  // Open Edit Group Modal
  const handleOpenEditGroup = (group: Group) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditSubject(group.subject);
    setEditStudentIds(group.studentIds || []);
    setEditWhatsappLink(group.whatsappGroupLink || "");
    if (group.scheduleSlots && group.scheduleSlots.length > 0) {
      setEditScheduleSlots(group.scheduleSlots);
    } else {
      const slots = (group.days || []).map(d => ({
        day: d,
        time: group.time || "17:00",
        durationMinutes: group.durationMinutes || 90
      }));
      setEditScheduleSlots(slots.length > 0 ? slots : [{ day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 }]);
    }
  };

  const handleSaveEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editName.trim()) return;
    const effectiveSlots = editScheduleSlots.length > 0 ? editScheduleSlots : [{ day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 }];
    const uniqueDays = Array.from(new Set(effectiveSlots.map(s => s.day)));
    const primaryTime = effectiveSlots[0]?.time || "17:00";
    const primaryDuration = effectiveSlots[0]?.durationMinutes || 90;

    onUpdateGroup(editingGroup.id, {
      name: editName.trim(),
      subject: editSubject.trim() || "عام",
      days: uniqueDays,
      time: primaryTime,
      durationMinutes: primaryDuration,
      scheduleSlots: effectiveSlots,
      studentIds: editStudentIds,
      whatsappGroupLink: editWhatsappLink.trim() || undefined
    });
    setEditingGroup(null);
  };

  // Open Edit Private Lesson Modal
  const handleOpenEditPrivateLesson = (prv: PrivateLesson) => {
    setEditingPrivateLesson(prv);
    setEditStudentId(prv.studentId);
    setEditSubject(prv.subject);
    setEditWhatsappLink(prv.whatsappGroupLink || "");
    if (prv.scheduleSlots && prv.scheduleSlots.length > 0) {
      setEditScheduleSlots(prv.scheduleSlots);
    } else {
      const slots = (prv.days || []).map(d => ({
        day: d,
        time: prv.time || "17:00",
        durationMinutes: prv.durationMinutes || 90
      }));
      setEditScheduleSlots(slots.length > 0 ? slots : [{ day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 }]);
    }
  };

  const handleSaveEditPrivateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrivateLesson) return;
    const studentObj = students.find(s => s.id === editStudentId) || { id: editingPrivateLesson.studentId, fullName: editingPrivateLesson.studentName };
    const effectiveSlots = editScheduleSlots.length > 0 ? editScheduleSlots : [{ day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: 90 }];
    const uniqueDays = Array.from(new Set(effectiveSlots.map(s => s.day)));
    const primaryTime = effectiveSlots[0]?.time || "17:00";
    const primaryDuration = effectiveSlots[0]?.durationMinutes || 90;

    if (onUpdatePrivateLesson) {
      onUpdatePrivateLesson(editingPrivateLesson.id, {
        studentId: studentObj.id,
        studentName: studentObj.fullName,
        subject: editSubject.trim() || "عام",
        days: uniqueDays,
        time: primaryTime,
        durationMinutes: primaryDuration,
        scheduleSlots: effectiveSlots,
        whatsappGroupLink: editWhatsappLink.trim() || undefined
      });
    }
    setEditingPrivateLesson(null);
  };

  const handleDeleteGroupClick = (group: Group) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من حذف المجموعة "${group.name}"؟`
      : `Are you sure you want to delete group "${group.name}"?`;
    if (window.confirm(confirmMsg)) {
      if (onDeleteGroup) {
        onDeleteGroup(group.id);
      }
    }
  };

  const handleDeletePrivateLessonClick = (prv: PrivateLesson) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من حذف موعد الدرس الخاص للطالب "${prv.studentName}"؟`
      : `Are you sure you want to delete private lesson for "${prv.studentName}"?`;
    if (window.confirm(confirmMsg)) {
      if (onDeletePrivateLesson) {
        onDeletePrivateLesson(prv.id);
      }
    }
  };

  const getScheduleSummaryText = (item: { days: string[]; time: string; durationMinutes?: number; scheduleSlots?: ScheduleSlot[] }): string => {
    if (item.scheduleSlots && item.scheduleSlots.length > 0) {
      return item.scheduleSlots
        .map(s => `${s.day} ${formatTime12h(s.time, isArabic)}`)
        .join(" • ");
    }
    return `${item.days.join("، ")} (${formatTime12h(item.time, isArabic)})`;
  };

  // Send Report Directly to WhatsApp Group / Chat
  const handleSendToWhatsappGroup = () => {
    const report = generatedReportText || teacherNotes;
    if (!report) return;

    // Copy report text to device clipboard
    navigator.clipboard.writeText(report);
    setCopied(true);
    setWhatsappSentNotice(isArabic ? "تم نسخ التقرير! جارٍ توجيهك إلى الواتساب..." : "Report copied! Opening WhatsApp...");
    setTimeout(() => {
      setCopied(false);
      setWhatsappSentNotice("");
    }, 4500);

    const targetLink = lessonWhatsappLink.trim();
    if (targetLink) {
      let url = targetLink;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        if (url.match(/^[0-9+]+$/)) {
          url = `https://api.whatsapp.com/send?phone=${url.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(report)}`;
        } else {
          url = `https://${url}`;
        }
      } else if (url.includes("wa.me") || url.includes("api.whatsapp.com")) {
        if (!url.includes("text=")) {
          const sep = url.includes("?") ? "&" : "?";
          url = `${url}${sep}text=${encodeURIComponent(report)}`;
        }
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Fallback: Open WhatsApp send dialog with text
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(report)}`, "_blank", "noopener,noreferrer");
    }
  };

  // Launch Active Attendance Lesson
  const handleOpenAttendanceSession = (groupObj?: Group, privateObj?: PrivateLesson) => {
    const todayStr = new Date().toISOString().split("T")[0];
    let newLesson: Lesson;
    let initialWhatsapp = "";

    if (groupObj) {
      initialWhatsapp = groupObj.whatsappGroupLink || "";
      newLesson = {
        id: `les_${Date.now()}`,
        studyType: "group",
        groupId: groupObj.id,
        groupName: groupObj.name,
        subject: groupObj.subject,
        date: todayStr,
        time: groupObj.time,
        durationMinutes: groupObj.durationMinutes,
        status: "starting_soon",
        whatsappGroupLink: initialWhatsapp,
        createdAt: new Date().toISOString()
      };

      // Populate default attendance map
      const initialMap: Record<string, { attendance: AttendanceStatus; homeworkStatus: HomeworkStatus }> = {};
      groupObj.studentIds.forEach(stId => {
        initialMap[stId] = { attendance: "present", homeworkStatus: "done" };
      });
      setAttendanceMap(initialMap);
    } else if (privateObj) {
      const studentObj = students.find(s => s.id === privateObj.studentId);
      initialWhatsapp = privateObj.whatsappGroupLink || studentObj?.whatsappGroupLink || "";
      newLesson = {
        id: `les_${Date.now()}`,
        studyType: "private",
        studentId: privateObj.studentId,
        studentName: privateObj.studentName,
        subject: privateObj.subject,
        date: todayStr,
        time: privateObj.time,
        durationMinutes: privateObj.durationMinutes,
        status: "starting_soon",
        whatsappGroupLink: initialWhatsapp,
        createdAt: new Date().toISOString()
      };

      setAttendanceMap({
        [privateObj.studentId]: { attendance: "present", homeworkStatus: "done" }
      });
    } else {
      return;
    }

    setActiveLesson(newLesson);
    setLessonWhatsappLink(initialWhatsapp);
    setTeacherNotes("");
    setGeneratedReportText("");
    setLessonAttachment(null);

    // Resolve AI instructions based on lesson subject
    const subjName = newLesson.subject || "";
    const cleanSubj = subjName.trim().toLowerCase();
    const match = settings.subjectDefaults?.find(s => {
      const sClean = s.subject.trim().toLowerCase();
      return sClean === cleanSubj || cleanSubj.includes(sClean) || sClean.includes(cleanSubj);
    });

    if (match) {
      setAiInstructions(match.instruction);
    } else {
      setAiInstructions(settings.generalAiInstructions || "");
    }
  };

  const handleGenerateAi = async () => {
    if (!activeLesson) return;
    setIsGeneratingAi(true);

    const targetStudentName =
      activeLesson.studyType === "private"
        ? activeLesson.studentName || "الطالب"
        : activeLesson.groupName || "طلاب المجموعة";

    try {
      const result = await onGenerateReportAi({
        studentName: targetStudentName,
        subject: activeLesson.subject,
        teacherNotes,
        aiInstructions,
        attachment: lessonAttachment || undefined
      });
      setGeneratedReportText(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveAttendance = () => {
    if (!activeLesson) return;

    const attendanceArray = Object.entries(attendanceMap).map(([studentId, dataValue]) => {
      const data = dataValue as { attendance: AttendanceStatus; homeworkStatus: HomeworkStatus };
      return {
        studentId,
        attendance: data.attendance,
        homeworkStatus: data.homeworkStatus
      };
    });

    onSaveAttendanceAndNotes(
      activeLesson.id,
      attendanceArray,
      teacherNotes,
      aiInstructions,
      generatedReportText
    );

    setActiveLesson(null);
  };

  const activeStudentsList = students.filter(s => s.status === "active");

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isArabic ? "المجموعات والدروس الخاصة" : "Lesson & Group Management"}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            {isArabic
              ? "نظام الحصص المباشرة والخصم التلقائي بالحصة بانتظام."
              : "Manage active group classes and 1:1 private sessions."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAddType("group");
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>{isArabic ? "إضافة مجموعة" : "+ New Group"}</span>
          </button>

          <button
            onClick={() => {
              setAddType("private");
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition flex items-center gap-1.5"
          >
            <User className="w-4 h-4" />
            <span>{isArabic ? "درس خاص" : "+ Private Lesson"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("groups")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
            activeTab === "groups"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isArabic ? "المجموعات" : "Groups"}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
            {groups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("private")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
            activeTab === "private"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isArabic ? "الدروس الخاصة" : "Private Lessons"}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
            {privateLessons.length}
          </span>
        </button>
      </div>

      {/* Grid View - Optimized for Mobile (2 Columns) */}
      {activeTab === "groups" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          {groups.map(group => (
            <div
              key={group.id}
              className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-black bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Users className="w-3 h-3 shrink-0" />
                    <span>{isArabic ? "مجموعة" : "Group"}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0 ${
                      group.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {group.status === "active" ? (isArabic ? "نشطة" : "Active") : (isArabic ? "متوقفة" : "Paused")}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{group.name}</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-0.5">{group.subject}</p>

                {/* Mixed Schedule Summary Card */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 text-slate-600">
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{isArabic ? "مواعيد الحصص:" : "Class Schedule:"}</span>
                    </div>
                    {group.scheduleSlots && group.scheduleSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {group.scheduleSlots.map((slot, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-900 font-bold text-[10px]"
                          >
                            <span>📅 {slot.day}</span>
                            <span className="font-mono text-blue-700">⏰ {formatTime12h(slot.time, isArabic)}</span>
                            <span className="text-slate-400 font-normal">({slot.durationMinutes || 90}د)</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-800 leading-tight">
                        {getScheduleSummaryText(group)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-slate-500 font-medium">{isArabic ? "عدد الطلاب:" : "Students:"}</span>
                    <span className="font-black text-slate-800">
                      {group.studentIds.length} {isArabic ? "طلاب" : "st"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => handleOpenAttendanceSession(group)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current shrink-0" />
                  <span>{isArabic ? "بدء الحصة" : "Launch"}</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditGroup(group)}
                  title={isArabic ? "تعديل المجموعة والمواعيد" : "Edit Group & Schedule"}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {group.whatsappGroupLink && (
                  <a
                    href={group.whatsappGroupLink.startsWith("http") ? group.whatsappGroupLink : `https://${group.whatsappGroupLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isArabic ? "فتح جروب الواتساب" : "Open WhatsApp Group"}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition shrink-0 flex items-center justify-center"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={() =>
                    onUpdateGroup(group.id, {
                      status: group.status === "active" ? "paused" : "active"
                    })
                  }
                  title={group.status === "active" ? (isArabic ? "إيقاف المجموعة" : "Pause") : (isArabic ? "تنشيط" : "Resume")}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                >
                  {group.status === "active" ? (
                    <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>

                {/* Delete Button */}
                {onDeleteGroup && (
                  <button
                    onClick={() => handleDeleteGroupClick(group)}
                    title={isArabic ? "حذف المجموعة" : "Delete Group"}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Group Card Placeholder */}
          <div
            onClick={() => {
              setAddType("group");
              setShowAddModal(true);
            }}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-2 shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {isArabic ? "مجموعة جديدة" : "New Group"}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              {isArabic ? "تحديد مواعيد مختلقة وطلاب" : "Add schedule & students"}
            </p>
          </div>
        </div>
      ) : (
        /* Private Lessons Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          {privateLessons.map(prv => (
            <div
              key={prv.id}
              className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-black bg-purple-100 text-purple-800 flex items-center gap-1">
                    <User className="w-3 h-3 shrink-0" />
                    <span>{isArabic ? "درس خاص" : "Private"}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                    {isArabic ? "نشط" : "Active"}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{prv.studentName}</h3>
                <p className="text-[11px] font-bold text-purple-600 mt-0.5">{prv.subject}</p>

                {/* Mixed Schedule Summary Card */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 text-slate-600">
                  <div className="bg-purple-50/60 p-2 rounded-xl border border-purple-200/60 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-purple-900">
                      <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{isArabic ? "المواعيد المخصصة:" : "Schedule Slots:"}</span>
                    </div>
                    {prv.scheduleSlots && prv.scheduleSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {prv.scheduleSlots.map((slot, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100/80 border border-purple-200 text-purple-950 font-bold text-[10px]"
                          >
                            <span>📅 {slot.day}</span>
                            <span className="font-mono text-purple-700">⏰ {formatTime12h(slot.time, isArabic)}</span>
                            <span className="text-slate-400 font-normal">({slot.durationMinutes || 90}د)</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-800 leading-tight">
                        {getScheduleSummaryText(prv)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => handleOpenAttendanceSession(undefined, prv)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current shrink-0" />
                  <span>{isArabic ? "بدء الحصة" : "Launch"}</span>
                </button>

                {/* Edit Private Lesson */}
                <button
                  onClick={() => handleOpenEditPrivateLesson(prv)}
                  title={isArabic ? "تعديل المواعيد والتفاصيل" : "Edit Details & Schedule"}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-purple-200 transition shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {prv.whatsappGroupLink && (
                  <a
                    href={prv.whatsappGroupLink.startsWith("http") ? prv.whatsappGroupLink : `https://${prv.whatsappGroupLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isArabic ? "فتح الواتساب" : "WhatsApp"}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition shrink-0 flex items-center justify-center"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Delete Button */}
                {onDeletePrivateLesson && (
                  <button
                    onClick={() => handleDeletePrivateLessonClick(prv)}
                    title={isArabic ? "حذف الموعد" : "Delete"}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Private Lesson Placeholder */}
          <div
            onClick={() => {
              setAddType("private");
              setShowAddModal(true);
            }}
            className="border-2 border-dashed border-purple-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-2 shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {isArabic ? "درس خاص جديد" : "New Private Lesson"}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              {isArabic ? "تحديد مواعيد مخصصة للطالب" : "Set mixed schedule"}
            </p>
          </div>
        </div>
      )}

      {/* Modal: Create Group or Private Lesson with Mixed Schedule Support */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {addType === "group"
                      ? (isArabic ? "إضافة مجموعة جديدة" : "Add New Group")
                      : (isArabic ? "إضافة درس خاص" : "Add Private Lesson")}
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {isArabic
                      ? "تحديد تفاصيل الحصة والمواعيد المختلطة لكل يوم"
                      : "Configure session details and per-day schedules"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl my-3">
              <button
                type="button"
                onClick={() => setAddType("group")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  addType === "group" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                👥 {isArabic ? "مجموعة طلاب" : "Group"}
              </button>
              <button
                type="button"
                onClick={() => setAddType("private")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  addType === "private" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500"
                }`}
              >
                👤 {isArabic ? "درس خاص (طالب فردي)" : "Private"}
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {addType === "group" ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    {isArabic ? "اسم المجموعة *" : "Group Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={isArabic ? "مثال: مجموعة الرياضيات - الصف الثالث" : "e.g. Math Group - Grade 3"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    {isArabic ? "اختر الطالب *" : "Select Student *"}
                  </label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={e => {
                      setSelectedStudentId(e.target.value);
                      const st = students.find(s => s.id === e.target.value);
                      if (st && st.subject) {
                        setSubject(st.subject);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">{isArabic ? "-- اختر طالباً --" : "-- Select Student --"}</option>
                    {activeStudentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.subject})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "المادة الدراسية *" : "Subject *"}
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mixed Schedule Builder Component */}
              <MixedScheduleEditor
                scheduleSlots={scheduleSlots}
                onChange={setScheduleSlots}
                defaultDuration={90}
                isArabic={isArabic}
              />

              {addType === "group" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    {isArabic ? "إضافة طلاب للمجموعة:" : "Add Students to Group:"}
                  </label>
                  <div className="max-h-36 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                    {activeStudentsList.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-2 text-center">
                        {isArabic ? "لا يوجد طلاب نشطون حالياً" : "No active students"}
                      </p>
                    ) : (
                      activeStudentsList.map(s => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={() => handleStudentSelectToggle(s.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-800">{s.fullName}</span>
                          <span className="text-[10px] text-slate-400">({s.subject})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5 text-[11px]">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "رابط جروب الواتساب (اختياري)" : "WhatsApp Group Link (Optional)"}</span>
                </label>
                <input
                  type="url"
                  value={whatsappGroupLink}
                  onChange={e => setWhatsappGroupLink(e.target.value)}
                  placeholder={isArabic ? "مثال: https://chat.whatsapp.com/..." : "https://chat.whatsapp.com/..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 dir-ltr text-left"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ وإنشاء الموعد" : "Save & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Group */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {isArabic ? "تعديل المجموعة ومواعيدها" : "Edit Group & Schedule"}
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {editingGroup.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="space-y-3.5 text-xs mt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "اسم المجموعة *" : "Group Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "المادة الدراسية *" : "Subject *"}
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mixed Schedule Builder Component */}
              <MixedScheduleEditor
                scheduleSlots={editScheduleSlots}
                onChange={setEditScheduleSlots}
                defaultDuration={editingGroup.durationMinutes || 90}
                isArabic={isArabic}
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "الطلاب المقيدون بالمجموعة:" : "Enrolled Students:"}
                </label>
                <div className="max-h-36 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                  {activeStudentsList.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editStudentIds.includes(s.id)}
                        onChange={() => handleEditStudentSelectToggle(s.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{s.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5 text-[11px]">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "رابط جروب الواتساب" : "WhatsApp Group Link"}</span>
                </label>
                <input
                  type="url"
                  value={editWhatsappLink}
                  onChange={e => setEditWhatsappLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 dir-ltr text-left"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  {isArabic ? "حفظ التعديلات" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Private Lesson */}
      {editingPrivateLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {isArabic ? "تعديل موعد الدرس الخاص" : "Edit Private Lesson"}
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    {editingPrivateLesson.studentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPrivateLesson(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPrivateLesson} className="space-y-3.5 text-xs mt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "الطالب *" : "Student *"}
                </label>
                <select
                  required
                  value={editStudentId}
                  onChange={e => setEditStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-purple-500"
                >
                  {activeStudentsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  {isArabic ? "المادة الدراسية *" : "Subject *"}
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Mixed Schedule Builder Component */}
              <MixedScheduleEditor
                scheduleSlots={editScheduleSlots}
                onChange={setEditScheduleSlots}
                defaultDuration={editingPrivateLesson.durationMinutes || 90}
                isArabic={isArabic}
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5 text-[11px]">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "رابط جروب الواتساب" : "WhatsApp Link"}</span>
                </label>
                <input
                  type="url"
                  value={editWhatsappLink}
                  onChange={e => setEditWhatsappLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-purple-500 dir-ltr text-left"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPrivateLesson(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30"
                >
                  {isArabic ? "حفظ التعديلات" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Active Lesson Attendance & AI Report Session */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {activeLesson.studyType === "group" ? (isArabic ? "حصة مجموعة" : "Group Lesson") : (isArabic ? "حصة خاصة" : "Private Lesson")}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {activeLesson.groupName || activeLesson.studentName} - {activeLesson.subject}
                </h2>
              </div>
              <button
                onClick={() => setActiveLesson(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Roster */}
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-3">
                {isArabic ? "تسجيل الحضور والغياب والواجب" : "Attendance & Homework Roster"}
              </h3>

              <div className="space-y-3">
                {Object.entries(attendanceMap).map(([stId, stDataValue]) => {
                  const stData = stDataValue as { attendance: AttendanceStatus; homeworkStatus: HomeworkStatus };
                  const studentObj = students.find(s => s.id === stId);
                  const stName = studentObj ? studentObj.fullName : "طالب";

                  return (
                    <div
                      key={stId}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{stName}</p>
                        {studentObj && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {isArabic
                              ? `رصيد الحصص المتبقي: ${studentObj.remainingLessons} حصص`
                              : `${studentObj.remainingLessons} lessons remaining`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Attendance buttons */}
                        <div className="flex bg-slate-200/80 p-0.5 rounded-xl">
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap({
                                ...attendanceMap,
                                [stId]: { ...stData, attendance: "present" }
                              })
                            }
                            className={`px-3 py-1 rounded-lg font-bold transition ${
                              stData.attendance === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-600"
                            }`}
                          >
                            {isArabic ? "حاضر" : "Present"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap({
                                ...attendanceMap,
                                [stId]: { ...stData, attendance: "absent" }
                              })
                            }
                            className={`px-3 py-1 rounded-lg font-bold transition ${
                              stData.attendance === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-600"
                            }`}
                          >
                            {isArabic ? "غائب" : "Absent"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap({
                                ...attendanceMap,
                                [stId]: { ...stData, attendance: "late" }
                              })
                            }
                            className={`px-3 py-1 rounded-lg font-bold transition ${
                              stData.attendance === "late"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "text-slate-600"
                            }`}
                          >
                            {isArabic ? "متأخر" : "Late"}
                          </button>
                        </div>

                        {/* Homework status */}
                        <select
                          value={stData.homeworkStatus}
                          onChange={e =>
                            setAttendanceMap({
                              ...attendanceMap,
                              [stId]: {
                                ...stData,
                                homeworkStatus: e.target.value as HomeworkStatus
                              }
                            })
                          }
                          className="bg-white border border-slate-300 rounded-xl px-2 py-1 font-semibold text-slate-700"
                        >
                          <option value="done">{isArabic ? "الواجب: تم" : "HW: Done"}</option>
                          <option value="not_done">{isArabic ? "الواجب: لم يتم" : "HW: Not Done"}</option>
                          <option value="late">{isArabic ? "الواجب: متأخر" : "HW: Late"}</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Field 1: Teacher Notes */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>📝 {isArabic ? "ماذا حدث في الحصة؟" : "What happened in the lesson?"}</span>
              </label>
              <textarea
                rows={3}
                value={teacherNotes}
                onChange={e => setTeacherNotes(e.target.value)}
                placeholder={
                  isArabic
                    ? "اكتب تفاصيل الدرس، ما تم انجازه، والواجبات المطلوبة..."
                    : "Write lesson summary, topics covered, homework assigned..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field 2: AI Instructions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>🤖 {isArabic ? "تعليمات للذكاء الاصطناعي" : "Instructions for AI"}</span>
                </label>
                {activeLesson?.subject && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanSubj = (activeLesson.subject || "").trim().toLowerCase();
                      const match = settings.subjectDefaults?.find(s => {
                        const sClean = s.subject.trim().toLowerCase();
                        return sClean === cleanSubj || cleanSubj.includes(sClean) || sClean.includes(cleanSubj);
                      });
                      setAiInstructions(match ? match.instruction : (settings.generalAiInstructions || ""));
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    {isArabic ? "إعادة تعيين لتعليمات المادة" : "Reset to subject prompt"}
                  </button>
                )}
              </div>

              {/* Subject Prompt Badge */}
              {activeLesson?.subject && (
                (() => {
                  const cleanSubj = activeLesson.subject.trim().toLowerCase();
                  const match = settings.subjectDefaults?.find(s => {
                    const sClean = s.subject.trim().toLowerCase();
                    return sClean === cleanSubj || cleanSubj.includes(sClean) || sClean.includes(cleanSubj);
                  });
                  if (match) {
                    return (
                      <div className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px] font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {isArabic
                            ? `تم جلب تعليمات مادة (${match.subject}) تلقائياً`
                            : `Loaded instructions for subject (${match.subject})`}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-medium">
                      {isArabic
                        ? `ℹ️ تعتمد على التعليمات العامة (يمكنك تخصيص حقل مادة ${activeLesson.subject} من الإعدادات)`
                        : `Using general prompt (you can set custom prompt for ${activeLesson.subject} in settings)`}
                    </div>
                  );
                })()
              )}

              <textarea
                rows={2}
                value={aiInstructions}
                onChange={e => setAiInstructions(e.target.value)}
                placeholder={
                  isArabic
                    ? "مثال: اكتب تقريراً مشجعاً لولي الأمر، ابدأ بنقطة إيجابية..."
                    : "e.g., Write an encouraging report starting with a positive point..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Field 3: Image / Document Attachment */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span>{isArabic ? "إرفاق صورة أو مستند للحصة (اختبار / ورقة عمل / واجب):" : "Attach Image / Document:"}</span>
                </span>
                <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {isArabic ? "اختياري" : "Optional"}
                </span>
              </label>

              {!lessonAttachment ? (
                <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={handleLessonFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <FileUp className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
                    <span>{isArabic ? "اضغط هنا لإرفاق صورة أو ملف الحصة" : "Click to attach image or document"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isArabic
                      ? "يتيح للذكاء الاصطناعي قراءة ورقة الاختبار أو التمارين وإضافتها للتقرير"
                      : "Allows AI to analyze worksheets or exam photos for the report"}
                  </p>
                </label>
              ) : (
                <div className="p-3 bg-white border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {lessonAttachment.previewUrl ? (
                      <img
                        src={lessonAttachment.previewUrl}
                        alt="Attachment Preview"
                        className="w-11 h-11 object-cover rounded-lg border border-indigo-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">{lessonAttachment.fileName || "ملف مرفق"}</p>
                      <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{isArabic ? "سيتم تحليله بالذكاء الاصطناعي" : "Will be analyzed by AI"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLessonAttachment(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                    title={isArabic ? "إزالة المرفق" : "Remove attachment"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Report Generation Action */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={isGeneratingAi}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>
                  {isGeneratingAi
                    ? (isArabic ? "جاري إنشاء التقرير..." : "Generating AI Report...")
                    : (isArabic ? "✨ إنشاء التقرير بالذكاء الاصطناعي" : "✨ Generate AI Report")}
                </span>
              </button>

              {/* WhatsApp Group Link Input */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
                <label className="block font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isArabic ? "رابط جروب الواتساب لإرسال التقرير" : "WhatsApp Group Link for Report"}</span>
                </label>
                <input
                  type="url"
                  value={lessonWhatsappLink}
                  onChange={e => setLessonWhatsappLink(e.target.value)}
                  placeholder={isArabic ? "https://chat.whatsapp.com/..." : "https://chat.whatsapp.com/..."}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 text-left dir-ltr"
                />
              </div>

              {whatsappSentNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{whatsappSentNotice}</span>
                </div>
              )}

              {generatedReportText && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-sky-400">
                      {isArabic ? "التقرير المنشأ بـ GoStars AI" : "Generated AI Report"}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedReportText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-1 rounded-lg border border-slate-700"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? (isArabic ? "تم النسخ" : "Copied") : (isArabic ? "نسخ" : "Copy")}</span>
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={generatedReportText}
                    onChange={e => setGeneratedReportText(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs focus:outline-none leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleSendToWhatsappGroup}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "📱 إرسال التقرير المباشر لجروب الواتساب" : "📱 Send Report to WhatsApp Group"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveLesson(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isArabic ? "حفظ الحضور والخصم التلقائي" : "Save Attendance & Deduct"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
