import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Play,
  Users,
  User,
  Table,
  Printer,
  Sparkles,
  Smartphone,
  Bell,
  Send,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from "lucide-react";
import { Group, PrivateLesson, Lesson, AppSettings, Student, GeneratedReport, AttendanceRecord } from "../types";
import { StudentLessonReminderModal, ReminderTargetInfo } from "./StudentLessonReminderModal";
import { StudentPersonalReportView } from "./StudentPersonalReportView";
import { calculateLessonTimeInfo, buildWhatsAppUrl, parseTimeString, formatTimeRange, formatTime12h, calculateEndTime, getOverlappedHours, abbreviateSubject, normalizeDayName, getTodayNormalizedDay } from "../lib/timeUtils";

interface ScheduleViewProps {
  settings: AppSettings;
  groups: Group[];
  privateLessons: PrivateLesson[];
  lessons: Lesson[];
  students?: Student[];
  reports?: GeneratedReport[];
  attendanceRecords?: AttendanceRecord[];
  onOpenLesson: (groupObj?: Group, privateObj?: PrivateLesson) => void;
  onAddReport?: (report: Omit<GeneratedReport, "id" | "createdAt">) => void;
  onDeleteReport?: (reportId: string) => void;
  onToggleArchiveReport?: (reportId: string) => void;
  onArchiveEndedCycle?: (params: {
    studentId: string;
    archiveGroupName: string;
    newCycleStartDate: string;
    newCycleName: string;
    resetLessonBalance: boolean;
  }) => void;
  onGenerateReportAi?: (payload: any) => Promise<string>;
}

/**
 * Renders session / student title with automatic text containment (احتواء تلقائي)
 * Preserves whole Arabic words (never breaks letters mid-word)
 * Adapts font size dynamically based on length for optimal legibility
 */
function AutoFitSessionTitle({ 
  title, 
  className = "",
  size = "normal",
  isFitMode = false
}: { 
  title: string; 
  className?: string; 
  size?: "normal" | "large";
  isFitMode?: boolean;
}) {
  const cleanTitle = (title || "").trim();
  const len = cleanTitle.length;

  // Calculate dynamic font-size classes for auto-containment
  let fontClass = "text-[8.5px] sm:text-xs";
  if (size === "large") {
    fontClass = len > 26 ? "text-xs sm:text-sm" : len > 16 ? "text-sm sm:text-base" : "text-sm sm:text-base";
  } else {
    if (isFitMode) {
      if (len > 24) {
        fontClass = "text-[6px] sm:text-[8.5px]";
      } else if (len > 15) {
        fontClass = "text-[6.5px] sm:text-[9.5px]";
      } else {
        fontClass = "text-[7.5px] sm:text-xs";
      }
    } else {
      if (len > 24) {
        fontClass = "text-[7px] sm:text-[9.5px]";
      } else if (len > 15) {
        fontClass = "text-[7.5px] sm:text-[10.5px]";
      } else {
        fontClass = "text-[8.5px] sm:text-xs";
      }
    }
  }

  return (
    <div
      className={`font-black leading-snug break-normal px-0.5 ${fontClass} ${className}`}
      style={{
        wordBreak: "keep-all",
        overflowWrap: "normal",
        hyphens: "none",
      }}
      title={cleanTitle}
    >
      {cleanTitle}
    </div>
  );
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  settings,
  groups = [],
  privateLessons = [],
  lessons = [],
  students = [],
  reports = [],
  attendanceRecords = [],
  onOpenLesson,
  onAddReport,
  onDeleteReport,
  onToggleArchiveReport,
  onArchiveEndedCycle,
  onGenerateReportAi
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const [activeReminderTarget, setActiveReminderTarget] = useState<ReminderTargetInfo | null>(null);
  const [quickCopiedStudentId, setQuickCopiedStudentId] = useState<string | null>(null);
  const [expandedGroupStudentCards, setExpandedGroupStudentCards] = useState<Record<string, boolean>>({});

  // Report creation modals state
  const [reportStudentModal, setReportStudentModal] = useState<Student | null>(null);
  const [reportGroupPickerModal, setReportGroupPickerModal] = useState<{ group: Group; subject?: string } | null>(null);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupStudentCards(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleQuickCopyReminder = (student: Student, sessionTime: string, subject?: string) => {
    const info = calculateLessonTimeInfo(sessionTime, student.fullName, subject);
    navigator.clipboard.writeText(info.reminderText);
    setQuickCopiedStudentId(student.id);
    setTimeout(() => setQuickCopiedStudentId(null), 2000);
  };

  const handleQuickSendWhatsApp = (
    student: Student,
    sessionTime: string,
    subject?: string,
    groupLink?: string
  ) => {
    const info = calculateLessonTimeInfo(sessionTime, student.fullName, subject);
    const targetContact = groupLink || student.whatsappGroupLink || student.parentContact;
    const { url } = buildWhatsAppUrl(targetContact, info.reminderText);
    navigator.clipboard.writeText(info.reminderText);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Days list matching Word table order (Saturday to Friday)
  const daysList = isArabic
    ? ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
    : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Mapping for day matching (normalizing strings)
  const normalizeDay = (dayStr: string): string => {
    return normalizeDayName(dayStr, isArabic);
  };

  const todayNormalized = getTodayNormalizedDay(isArabic);
  const todayDateStr = new Date().toISOString().split("T")[0];

  // Helper to determine whether a student has a recorded attendance (present/absent) for a specific date
  const getStudentDayAttendance = (
    studentId?: string,
    studentName?: string,
    subject?: string,
    targetDate?: string
  ): "absent" | "present" | null => {
    if (!studentId && !studentName) return null;
    const checkDate = targetDate || todayDateStr;

    // 1. Look in reports (primary source of truth)
    const rep = (reports || []).find(r =>
      (r.studentId === studentId || (studentName && r.studentName && r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (r.date === checkDate || r.createdAt?.startsWith(checkDate)) &&
      (!subject || !r.subject || r.subject.trim().toLowerCase() === subject.trim().toLowerCase())
    );
    if (rep) {
      return rep.attendance === "absent" ? "absent" : "present";
    }

    // 2. Look in attendanceRecords
    const att = (attendanceRecords || []).find(a =>
      (a.studentId === studentId || (studentName && a.studentName && a.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (a.date === checkDate) &&
      (!subject || !a.subject || a.subject.trim().toLowerCase() === subject.trim().toLowerCase())
    );
    if (att) {
      return att.attendance === "absent" ? "absent" : "present";
    }

    // 3. Fallback without subject restriction (in case subject naming had slight variation)
    const repFb = (reports || []).find(r =>
      (r.studentId === studentId || (studentName && r.studentName && r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (r.date === checkDate || r.createdAt?.startsWith(checkDate))
    );
    if (repFb) {
      return repFb.attendance === "absent" ? "absent" : "present";
    }

    const attFb = (attendanceRecords || []).find(a =>
      (a.studentId === studentId || (studentName && a.studentName && a.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())) &&
      (a.date === checkDate)
    );
    if (attFb) {
      return attFb.attendance === "absent" ? "absent" : "present";
    }

    return null;
  };

  const [activeTab, setActiveTab] = useState<"today" | "weekly">("today");
  const [filterType, setFilterType] = useState<"all" | "group" | "private">("all");
  const [showFull24Hours, setShowFull24Hours] = useState<boolean>(true);
  const [mobileViewStyle, setMobileViewStyle] = useState<"grid" | "vertical">("grid");
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>("all");
  const [tableDirection, setTableDirection] = useState<"ltr" | "rtl">("ltr");
  const [tableZoom, setTableZoom] = useState<number>(100);
  const [fitToScreen, setFitToScreen] = useState<boolean>(true);

  // Definition of hour slots (1 am to 12 pm / 1 am to 12 pm next day, total 24 hours like Word doc)
  const hourSlots = [
    { hour24: 1, labelAr: "1 am (1 ص)", labelEn: "1 am" },
    { hour24: 2, labelAr: "2 am (2 ص)", labelEn: "2 am" },
    { hour24: 3, labelAr: "3 am (3 ص)", labelEn: "3 am" },
    { hour24: 4, labelAr: "4 am (4 ص)", labelEn: "4 am" },
    { hour24: 5, labelAr: "5 am (5 ص)", labelEn: "5 am" },
    { hour24: 6, labelAr: "6 am (6 ص)", labelEn: "6 am" },
    { hour24: 7, labelAr: "7 am (7 ص)", labelEn: "7 am" },
    { hour24: 8, labelAr: "8 am (8 ص)", labelEn: "8 am" },
    { hour24: 9, labelAr: "9 am (9 ص)", labelEn: "9 am" },
    { hour24: 10, labelAr: "10 am (10 ص)", labelEn: "10 am" },
    { hour24: 11, labelAr: "11 am (11 ص)", labelEn: "11 am" },
    { hour24: 12, labelAr: "12 pm (12 ظ)", labelEn: "12 pm" },
    { hour24: 13, labelAr: "1 pm (1 م)", labelEn: "1 pm" },
    { hour24: 14, labelAr: "2 pm (2 م)", labelEn: "2 pm" },
    { hour24: 15, labelAr: "3 pm (3 م)", labelEn: "3 pm" },
    { hour24: 16, labelAr: "4 pm (4 م)", labelEn: "4 pm" },
    { hour24: 17, labelAr: "5 pm (5 م)", labelEn: "5 pm" },
    { hour24: 18, labelAr: "6 pm (6 م)", labelEn: "6 pm" },
    { hour24: 19, labelAr: "7 pm (7 م)", labelEn: "7 pm" },
    { hour24: 20, labelAr: "8 pm (8 م)", labelEn: "8 pm" },
    { hour24: 21, labelAr: "9 pm (9 م)", labelEn: "9 pm" },
    { hour24: 22, labelAr: "10 pm (10 م)", labelEn: "10 pm" },
    { hour24: 23, labelAr: "11 pm (11 م)", labelEn: "11 pm" },
    { hour24: 0, labelAr: "12 am (12 ص)", labelEn: "12 am" },
  ];

  // Helper to map time string (e.g., "04:00 PM", "4 pm", "16:00", "04:00 م") to 24-hour integer (0..23)
  const getHourFromTimeString = (timeStr: string): number => {
    return parseTimeString(timeStr).hour24;
  };

  // Handler for opening report modal when user clicks "Create Report"
  const handleOpenReportForSession = (sess: { groupObj?: Group; privateObj?: PrivateLesson; title?: string; subject?: string }) => {
    if (sess.privateObj) {
      const matched = students.find(st => st.id === sess.privateObj?.studentId || st.fullName === sess.privateObj?.studentName);
      if (matched) {
        setReportStudentModal(matched);
      } else {
        const prvAny = sess.privateObj as any;
        setReportStudentModal({
          id: prvAny.id || "priv-" + Math.random().toString(),
          fullName: prvAny.studentName || sess.title || "طالب",
          parentContact: prvAny.parentContact || prvAny.phone || "",
          studentPhone: prvAny.studentPhone || prvAny.phone || "",
          subject: sess.subject || prvAny.subject || "",
          studyType: "private",
          status: "active",
          paymentStatus: "unpaid",
          lessonCost: prvAny.lessonCost || 0
        } as Student);
      }
    } else if (sess.groupObj) {
      const grp = sess.groupObj;
      const enrolled = students.filter(st =>
        grp.studentIds?.includes(st.id) ||
        st.groupId === grp.id ||
        (grp.name && st.groupName === grp.name)
      );

      if (enrolled.length === 1) {
        setReportStudentModal(enrolled[0]);
      } else if (enrolled.length > 1) {
        setReportGroupPickerModal({ group: grp, subject: sess.subject });
      } else {
        alert(isArabic ? "لا يوجد طلاب مضافون لهذه المجموعة بعد لإنشاء تقرير لهم." : "No students in this group to generate report.");
      }
    }
  };

  // Build matrix data: cellData[hour24][dayName] = Array of sessions (including starting and continuing slots)
  const tableMatrix = useMemo(() => {
    const matrix: Record<number, Record<string, Array<{
      id: string;
      baseId: string;
      type: "group" | "private";
      time: string;
      title: string;
      subject: string;
      subtext: string;
      groupObj?: Group;
      privateObj?: PrivateLesson;
      durationMinutes: number;
      isStartHour: boolean;
      isContinuing: boolean;
      startHour24: number;
      startMinute: number;
      endHour24: number;
      endMinute: number;
      startTimeFormatted: string;
      endTimeFormatted: string;
      timeRangeFormatted: string;
    }>>> = {};

    hourSlots.forEach(slot => {
      matrix[slot.hour24] = {};
      daysList.forEach(day => {
        matrix[slot.hour24][day] = [];
      });
    });

    if (filterType !== "private") {
      groups.forEach(grp => {
        const grpDuration = (grp as any).durationMinutes || (grp as any).defaultDurationMinutes || 60;
        if (grp.scheduleSlots && grp.scheduleSlots.length > 0) {
          grp.scheduleSlots.forEach((slot, sIdx) => {
            const timeStr = slot.time || grp.time || "17:00";
            const dur = slot.durationMinutes || grpDuration;
            const { hour24: startH, minute: startM } = parseTimeString(timeStr);
            const { endHour24, endMinute, endTimeFormattedAr, endTimeFormattedEn } = calculateEndTime(timeStr, dur);
            const startTimeFormatted = formatTime12h(startH, startM, isArabic);
            const endTimeFormatted = isArabic ? endTimeFormattedAr : endTimeFormattedEn;
            const timeRangeFormatted = formatTimeRange(timeStr, dur, isArabic);
            const overlapped = getOverlappedHours(timeStr, dur);
            const dayName = normalizeDay(slot.day);

            overlapped.forEach(h => {
              if (matrix[h] && matrix[h][dayName]) {
                const isStartHour = (h === startH);
                matrix[h][dayName].push({
                  id: `grp-${grp.id}-${dayName}-${sIdx}-h${h}`,
                  baseId: `grp-${grp.id}-${dayName}-${sIdx}`,
                  type: "group",
                  time: timeStr,
                  title: grp.name,
                  subject: grp.subject,
                  subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                  groupObj: grp,
                  durationMinutes: dur,
                  isStartHour,
                  isContinuing: !isStartHour,
                  startHour24: startH,
                  startMinute: startM,
                  endHour24,
                  endMinute,
                  startTimeFormatted,
                  endTimeFormatted,
                  timeRangeFormatted
                });
              }
            });
          });
        } else {
          const timeStr = grp.time || "17:00";
          const dur = grpDuration;
          const { hour24: startH, minute: startM } = parseTimeString(timeStr);
          const { endHour24, endMinute, endTimeFormattedAr, endTimeFormattedEn } = calculateEndTime(timeStr, dur);
          const startTimeFormatted = formatTime12h(startH, startM, isArabic);
          const endTimeFormatted = isArabic ? endTimeFormattedAr : endTimeFormattedEn;
          const timeRangeFormatted = formatTimeRange(timeStr, dur, isArabic);
          const overlapped = getOverlappedHours(timeStr, dur);

          grp.days.forEach((dayRaw, dIdx) => {
            const dayName = normalizeDay(dayRaw);
            overlapped.forEach(h => {
              if (matrix[h] && matrix[h][dayName]) {
                const isStartHour = (h === startH);
                matrix[h][dayName].push({
                  id: `grp-${grp.id}-${dayName}-${dIdx}-h${h}`,
                  baseId: `grp-${grp.id}-${dayName}-${dIdx}`,
                  type: "group",
                  time: timeStr,
                  title: grp.name,
                  subject: grp.subject,
                  subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                  groupObj: grp,
                  durationMinutes: dur,
                  isStartHour,
                  isContinuing: !isStartHour,
                  startHour24: startH,
                  startMinute: startM,
                  endHour24,
                  endMinute,
                  startTimeFormatted,
                  endTimeFormatted,
                  timeRangeFormatted
                });
              }
            });
          });
        }
      });
    }

    if (filterType !== "group") {
      privateLessons.forEach(prv => {
        const fullStudentName = students.find(s => s.id === prv.studentId || (prv.studentName && s.fullName && s.fullName.trim().toLowerCase() === prv.studentName.trim().toLowerCase()))?.fullName || prv.studentName;
        const prvDuration = (prv as any).durationMinutes || (prv as any).defaultDurationMinutes || 60;
        if (prv.scheduleSlots && prv.scheduleSlots.length > 0) {
          prv.scheduleSlots.forEach((slot, sIdx) => {
            const timeStr = slot.time || prv.time || "17:00";
            const dur = slot.durationMinutes || prvDuration;
            const { hour24: startH, minute: startM } = parseTimeString(timeStr);
            const { endHour24, endMinute, endTimeFormattedAr, endTimeFormattedEn } = calculateEndTime(timeStr, dur);
            const startTimeFormatted = formatTime12h(startH, startM, isArabic);
            const endTimeFormatted = isArabic ? endTimeFormattedAr : endTimeFormattedEn;
            const timeRangeFormatted = formatTimeRange(timeStr, dur, isArabic);
            const overlapped = getOverlappedHours(timeStr, dur);
            const dayName = normalizeDay(slot.day);

            overlapped.forEach(h => {
              if (matrix[h] && matrix[h][dayName]) {
                const isStartHour = (h === startH);
                matrix[h][dayName].push({
                  id: `prv-${prv.id}-${dayName}-${sIdx}-h${h}`,
                  baseId: `prv-${prv.id}-${dayName}-${sIdx}`,
                  type: "private",
                  time: timeStr,
                  title: fullStudentName,
                  subject: prv.subject,
                  subtext: isArabic ? "درس خاص" : "Private",
                  privateObj: prv,
                  durationMinutes: dur,
                  isStartHour,
                  isContinuing: !isStartHour,
                  startHour24: startH,
                  startMinute: startM,
                  endHour24,
                  endMinute,
                  startTimeFormatted,
                  endTimeFormatted,
                  timeRangeFormatted
                });
              }
            });
          });
        } else {
          const timeStr = prv.time || "17:00";
          const dur = prvDuration;
          const { hour24: startH, minute: startM } = parseTimeString(timeStr);
          const { endHour24, endMinute, endTimeFormattedAr, endTimeFormattedEn } = calculateEndTime(timeStr, dur);
          const startTimeFormatted = formatTime12h(startH, startM, isArabic);
          const endTimeFormatted = isArabic ? endTimeFormattedAr : endTimeFormattedEn;
          const timeRangeFormatted = formatTimeRange(timeStr, dur, isArabic);
          const overlapped = getOverlappedHours(timeStr, dur);

          prv.days.forEach((dayRaw, dIdx) => {
            const dayName = normalizeDay(dayRaw);
            overlapped.forEach(h => {
              if (matrix[h] && matrix[h][dayName]) {
                const isStartHour = (h === startH);
                matrix[h][dayName].push({
                  id: `prv-${prv.id}-${dayName}-${dIdx}-h${h}`,
                  baseId: `prv-${prv.id}-${dayName}-${dIdx}`,
                  type: "private",
                  time: timeStr,
                  title: fullStudentName,
                  subject: prv.subject,
                  subtext: isArabic ? "درس خاص" : "Private",
                  privateObj: prv,
                  durationMinutes: dur,
                  isStartHour,
                  isContinuing: !isStartHour,
                  startHour24: startH,
                  startMinute: startM,
                  endHour24,
                  endMinute,
                  startTimeFormatted,
                  endTimeFormatted,
                  timeRangeFormatted
                });
              }
            });
          });
        }
      });
    }

    return matrix;
  }, [groups, privateLessons, daysList, filterType, isArabic, students]);

  // Determine active hours
  const activeHoursSet = useMemo(() => {
    const set = new Set<number>();
    hourSlots.forEach(slot => {
      daysList.forEach(day => {
        if (tableMatrix[slot.hour24]?.[day]?.length > 0) {
          set.add(slot.hour24);
        }
      });
    });
    return set;
  }, [tableMatrix, daysList, hourSlots]);

  // Filter slots to show
  const displayedHourSlots = useMemo(() => {
    if (showFull24Hours) return hourSlots;
    if (activeHoursSet.size === 0) {
      return hourSlots.filter(s => s.hour24 >= 8 && s.hour24 <= 22);
    }
    return hourSlots.filter(s => activeHoursSet.has(s.hour24));
  }, [showFull24Hours, activeHoursSet, hourSlots]);

  const totalWeeklySessions = useMemo(() => {
    const uniqueSessionIds = new Set<string>();
    hourSlots.forEach(slot => {
      daysList.forEach(day => {
        const list = tableMatrix[slot.hour24]?.[day] || [];
        list.forEach(sess => uniqueSessionIds.add(sess.baseId));
      });
    });
    return uniqueSessionIds.size;
  }, [tableMatrix, daysList, hourSlots]);

  // Today's sessions list without duplicates, sorted chronologically
  const todaySessions = useMemo(() => {
    if (!todayNormalized) return [];
    const list: Array<{
      id: string;
      type: "group" | "private";
      time: string;
      title: string;
      subject: string;
      subtext: string;
      groupObj?: Group;
      privateObj?: PrivateLesson;
      durationMinutes?: number;
    }> = [];

    if (filterType !== "private") {
      groups.forEach(grp => {
        const grpDuration = (grp as any).durationMinutes || (grp as any).defaultDurationMinutes || 60;
        if (grp.scheduleSlots && grp.scheduleSlots.length > 0) {
          grp.scheduleSlots.forEach((slot, sIdx) => {
            if (normalizeDay(slot.day) === todayNormalized) {
              list.push({
                id: `today-grp-${grp.id}-${sIdx}`,
                type: "group",
                time: slot.time || grp.time || "17:00",
                title: grp.name,
                subject: grp.subject,
                subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                groupObj: grp,
                durationMinutes: slot.durationMinutes || grpDuration
              });
            }
          });
        } else {
          grp.days.forEach(d => {
            if (normalizeDay(d) === todayNormalized) {
              list.push({
                id: `today-grp-${grp.id}`,
                type: "group",
                time: grp.time || "17:00",
                title: grp.name,
                subject: grp.subject,
                subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                groupObj: grp,
                durationMinutes: grpDuration
              });
            }
          });
        }
      });
    }

    if (filterType !== "group") {
      privateLessons.forEach(prv => {
        const fullStudentName = students.find(s => s.id === prv.studentId || (prv.studentName && s.fullName && s.fullName.trim().toLowerCase() === prv.studentName.trim().toLowerCase()))?.fullName || prv.studentName;
        const prvDuration = (prv as any).durationMinutes || (prv as any).defaultDurationMinutes || 60;
        if (prv.scheduleSlots && prv.scheduleSlots.length > 0) {
          prv.scheduleSlots.forEach((slot, sIdx) => {
            if (normalizeDay(slot.day) === todayNormalized) {
              list.push({
                id: `today-prv-${prv.id}-${sIdx}`,
                type: "private",
                time: slot.time || prv.time || "17:00",
                title: fullStudentName,
                subject: prv.subject,
                subtext: isArabic ? "درس خاص" : "Private",
                privateObj: prv,
                durationMinutes: slot.durationMinutes || prvDuration
              });
            }
          });
        } else {
          prv.days.forEach(d => {
            if (normalizeDay(d) === todayNormalized) {
              list.push({
                id: `today-prv-${prv.id}`,
                type: "private",
                time: prv.time || "17:00",
                title: fullStudentName,
                subject: prv.subject,
                subtext: isArabic ? "درس خاص" : "Private",
                privateObj: prv,
                durationMinutes: prvDuration
              });
            }
          });
        }
      });
    }

    // Sort chronologically by start time (hour24 * 60 + minute)
    return list.sort((a, b) => {
      const ta = parseTimeString(a.time);
      const tb = parseTimeString(b.time);
      return (ta.hour24 * 60 + ta.minute) - (tb.hour24 * 60 + tb.minute);
    });
  }, [groups, privateLessons, todayNormalized, filterType, isArabic, students]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3.5 pb-16 print:p-0 print:m-0">
      {/* Header Controls Card (Hidden during print) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" />
              {isArabic ? "قسم المواعيد والجدول" : "Timetable View"}
            </span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalWeeklySessions} {isArabic ? "حصص مسجلة" : "sessions"}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {isArabic ? "جدول الحصص والمجموعات" : "Weekly Schedule Table"}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {isArabic
              ? "اختر بين عرض جدول حصص اليوم أو عرض جدول الأسبوع كامل بصيغة Word."
              : "Switch between Today's schedule and the full Weekly Word table."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === "all" ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? "الكل" : "All"}
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                filterType === "group" ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{isArabic ? "مجموعات" : "Groups"}</span>
            </button>
            <button
              onClick={() => setFilterType("private")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                filterType === "private" ? "bg-white text-purple-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3 h-3" />
              <span>{isArabic ? "خاص" : "Private"}</span>
            </button>
          </div>

          {/* 24-Hours Toggle (Visible mainly when viewing weekly table) */}
          {activeTab === "weekly" && (
            <button
              onClick={() => setShowFull24Hours(!showFull24Hours)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                showFull24Hours
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {showFull24Hours
                  ? (isArabic ? "إخفاء الساعات الفارغة" : "Hide Empty Hours")
                  : (isArabic ? "عرض 24 ساعة (Word)" : "Show All 24 Hours")}
              </span>
            </button>
          )}

          {/* Print Schedule */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isArabic ? "طباعة / حفظ PDF" : "Print Schedule"}</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="grid grid-cols-2 bg-slate-200/80 p-1 rounded-xl gap-1.5 print:hidden shadow-inner">
        <button
          onClick={() => setActiveTab("today")}
          className={`py-2 px-3 rounded-lg font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
            activeTab === "today"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
              : "text-slate-700 hover:bg-slate-300/60"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isArabic ? "حصص اليوم" : "Today's Schedule"}</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === "today" ? "bg-blue-800 text-blue-100" : "bg-slate-300 text-slate-800"
            }`}
          >
            {todaySessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("weekly")}
          className={`py-2 px-3 rounded-lg font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
            activeTab === "weekly"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
              : "text-slate-700 hover:bg-slate-300/60"
          }`}
        >
          <Table className="w-4 h-4" />
          <span>{isArabic ? "الجدول الأسبوعي" : "Weekly Schedule"}</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === "weekly" ? "bg-blue-800 text-blue-100" : "bg-slate-300 text-slate-800"
            }`}
          >
            {totalWeeklySessions}
          </span>
        </button>
      </div>

      {/* TAB 1: TODAY'S SESSIONS (الخانة الأولى: حصص اليوم) */}
      {activeTab === "today" && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-lg space-y-4 print:hidden border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300 shadow-inner">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {isArabic ? "📅 جدول حصص ومواعيد اليوم" : "Today's Schedule"}
                  </h2>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-blue-500 text-white shadow-sm">
                    {todayNormalized || (isArabic ? "اليوم" : "Today")}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 font-medium mt-1">
                  {isArabic
                    ? `استعراض المواعيد والمجموعات المجدولة لليوم الحالي (${todayNormalized})`
                    : `Sessions scheduled for today (${todayNormalized})`}
                </p>
              </div>
            </div>

            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-blue-100 self-start sm:self-auto">
              {todaySessions.length} {isArabic ? "حصص مقررة اليوم" : "sessions today"}
            </div>
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-14 bg-white/5 rounded-2xl border border-white/10">
              <Clock className="w-12 h-12 mx-auto mb-3 text-blue-300/50" />
              <p className="text-base font-bold text-blue-100">
                {isArabic ? "لا توجد حصص مجدولة لهذا اليوم 🎉" : "No classes scheduled for today 🎉"}
              </p>
              <p className="text-xs text-blue-300/70 mt-1 max-w-md mx-auto">
                {isArabic
                  ? "أنت في (حصص اليوم). يمكنك الانتقال إلى (الجدول الأسبوعي) للاطلاع على مواعيد بقية الأيام."
                  : "You are viewing Today's tab. Switch to the Weekly Schedule tab to see other days."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {todaySessions.map(sess => {
                const isGroup = sess.type === "group";
                const sessTimeInfo = calculateLessonTimeInfo(
                  sess.time,
                  sess.title,
                  sess.subject
                );

                // Find enrolled students
                let enrolledStudents: Student[] = [];
                let privateStudent: Student | null = null;

                if (isGroup && sess.groupObj) {
                  const grp = sess.groupObj;
                  enrolledStudents = students.filter(
                    st =>
                      grp.studentIds?.includes(st.id) ||
                      st.groupId === grp.id ||
                      (grp.name && st.groupName === grp.name)
                  );
                } else if (!isGroup && sess.privateObj) {
                  const prv = sess.privateObj;
                  const matched = students.find(
                    st => st.id === prv.studentId || st.fullName === prv.studentName
                  );
                  privateStudent = matched || ({
                    id: prv.id || "priv-" + Math.random().toString(),
                    fullName: prv.studentName || sess.title,
                    parentContact: prv.parentContact || "",
                    studentPhone: prv.studentPhone || "",
                    whatsappGroupLink: prv.whatsappGroupLink || "",
                    subject: sess.subject,
                    studyType: "private",
                    status: "active",
                    paymentStatus: "unpaid",
                    lessonCost: prv.lessonCost || 0,
                    totalPaidAmount: 0,
                    createdAt: new Date().toISOString()
                  } as Student);
                }

                const isGroupExpanded = expandedGroupStudentCards[sess.id] ?? true;

                return (
                  <div
                    key={sess.id}
                    className="bg-white/10 backdrop-blur-md border border-white/20 hover:border-blue-400/60 transition-all rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl hover:bg-white/15"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 ${
                            isGroup
                              ? "bg-blue-400/25 text-blue-100 border border-blue-400/40"
                              : "bg-purple-400/25 text-purple-100 border border-purple-400/40"
                          }`}
                        >
                          {isGroup ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          <span>{isGroup ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "درس خاص" : "Private")}</span>
                        </span>

                        {/* Remaining Time & Scheduled Hour Badges */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                              sessTimeInfo.status === "now"
                                ? "bg-amber-500 text-slate-950 border-amber-300 animate-pulse"
                                : sessTimeInfo.status === "past"
                                ? "bg-rose-500/30 text-rose-200 border-rose-400/40"
                                : "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {sessTimeInfo.status === "now"
                                ? (isArabic ? "الآن" : "Now")
                                : sessTimeInfo.status === "past"
                                ? (isArabic ? `بدأت منذ ${Math.abs(sessTimeInfo.remainingMinutes)} د` : `${Math.abs(sessTimeInfo.remainingMinutes)}m ago`)
                                : (isArabic ? `بعد ${sessTimeInfo.remainingMinutes} دقيقة` : `In ${sessTimeInfo.remainingMinutes}m`)}
                            </span>
                          </span>

                          <span className="font-mono font-bold text-xs bg-black/50 text-amber-300 px-2.5 py-0.5 rounded-lg border border-white/10 shadow-inner">
                            {formatTimeRange(sess.time, sess.durationMinutes || (sess.groupObj as any)?.durationMinutes || (sess.groupObj as any)?.defaultDurationMinutes || (sess.privateObj as any)?.durationMinutes || (sess.privateObj as any)?.defaultDurationMinutes || 60, isArabic)}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-black text-white text-base leading-snug">{sess.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/20">
                          {sess.subject}
                        </span>
                        {sess.subtext && (
                          <span className="text-[11px] text-blue-200/80">{sess.subtext}</span>
                        )}
                      </div>
                    </div>

                    {/* Students & Reminder Section */}
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-3 space-y-2.5">
                      {/* Section Title */}
                      <div className="flex items-center justify-between text-xs font-black text-blue-100 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {isArabic ? "تذكير الحصة للطلاب" : "Student Lesson Reminders"}
                          </span>
                        </div>

                        {isGroup && enrolledStudents.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-300 bg-white/10 px-2 py-0.5 rounded-full">
                            {enrolledStudents.length} {isArabic ? "طلاب" : "students"}
                          </span>
                        )}
                      </div>

                      {/* PRIVATE LESSON STUDENT REMINDER */}
                      {!isGroup && privateStudent && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center justify-center font-black text-xs shrink-0">
                                {privateStudent.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-black text-white text-xs">{privateStudent.fullName}</h4>
                                  {(() => {
                                    const attStatus = getStudentDayAttendance(privateStudent.id, privateStudent.fullName, sess.subject);
                                    if (attStatus === "absent") {
                                      return (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-300 flex items-center gap-1 shadow-xs">
                                          <span>🔴</span>
                                          <span>{isArabic ? "غائب (لم يحضر)" : "Absent"}</span>
                                        </span>
                                      );
                                    } else if (attStatus === "present") {
                                      return (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white border border-emerald-300 flex items-center gap-1 shadow-xs">
                                          <span>🟢</span>
                                          <span>{isArabic ? "حاضر (تم الحضور)" : "Present"}</span>
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <p className="text-[10px] text-slate-300 font-mono dir-ltr truncate">
                                  {privateStudent.parentContact || privateStudent.studentPhone || (isArabic ? "لا يوجد هاتف" : "No phone")}
                                </p>
                              </div>
                            </div>

                            {/* Quick Reminder Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title={isArabic ? "نسخ نص التذكير" : "Copy Reminder Text"}
                                onClick={() => handleQuickCopyReminder(privateStudent!, sess.time, sess.subject)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white transition text-xs flex items-center justify-center"
                              >
                                {quickCopiedStudentId === privateStudent.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                title={isArabic ? "إرسال سريع عبر واتساب" : "Quick Send WhatsApp"}
                                onClick={() =>
                                  handleQuickSendWhatsApp(
                                    privateStudent!,
                                    sess.time,
                                    sess.subject,
                                    sess.privateObj?.whatsappGroupLink
                                  )
                                }
                                className="p-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition text-xs flex items-center justify-center"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Explicit "إرسال تذكير بالحصة" Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReminderTarget({
                                student: privateStudent!,
                                sessionTime: sess.time,
                                subject: sess.subject,
                                groupName: sess.title,
                                type: "private",
                                whatsappGroupLink: sess.privateObj?.whatsappGroupLink
                              })
                            }
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-400/40 text-amber-200 hover:text-white font-black text-xs transition flex items-center justify-between gap-2 shadow-xs group"
                          >
                            <div className="flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                              <span>{isArabic ? "إرسال تذكير بالحصة" : "Send Lesson Reminder"}</span>
                            </div>
                            <span className="text-[10px] font-bold opacity-80 underline underline-offset-2">
                              {isArabic ? "فتح الخيارات" : "Options"}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* GROUP STUDENTS REMINDER LIST */}
                      {isGroup && (
                        <div className="space-y-2">
                          {enrolledStudents.length === 0 ? (
                            <div className="text-center py-2 text-blue-200/70 text-xs">
                              {isArabic
                                ? "لا يوجد طلاب مضافون لهذه المجموعة بعد."
                                : "No students enrolled in this group yet."}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {enrolledStudents.map(st => (
                                <div
                                  key={st.id}
                                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition flex flex-col gap-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center justify-center font-black text-[11px] shrink-0">
                                        {st.fullName.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 
                                            className="font-bold text-white text-xs break-normal"
                                            style={{
                                              wordBreak: "keep-all",
                                              overflowWrap: "normal",
                                            }}
                                          >
                                            {st.fullName}
                                          </h4>
                                          {(() => {
                                            const attStatus = getStudentDayAttendance(st.id, st.fullName, sess.subject);
                                            if (attStatus === "absent") {
                                              return (
                                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white border border-rose-300 flex items-center gap-0.5 shadow-2xs">
                                                  <span>🔴</span>
                                                  <span>{isArabic ? "غائب" : "Absent"}</span>
                                                </span>
                                              );
                                            } else if (attStatus === "present") {
                                              return (
                                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white border border-emerald-300 flex items-center gap-0.5 shadow-2xs">
                                                  <span>🟢</span>
                                                  <span>{isArabic ? "حاضر" : "Present"}</span>
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                        <p className="text-[9.5px] text-slate-300 font-mono dir-ltr truncate">
                                          {st.parentContact || st.studentPhone || (isArabic ? "بدون هاتف" : "No phone")}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Buttons for this Student */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        title={isArabic ? "فتح التقرير الشخصي وتسجيل الحضور" : "Report & Attendance"}
                                        onClick={() => setReportStudentModal(st)}
                                        className="p-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white transition text-xs flex items-center gap-1 px-1.5"
                                      >
                                        <FileText className="w-3 h-3 text-amber-300" />
                                        <span className="text-[9px] font-bold">{isArabic ? "التقرير" : "Report"}</span>
                                      </button>

                                      <button
                                        type="button"
                                        title={isArabic ? "نسخ نص التذكير" : "Copy Reminder"}
                                        onClick={() => handleQuickCopyReminder(st, sess.time, sess.subject)}
                                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white transition text-xs"
                                      >
                                        {quickCopiedStudentId === st.id ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        title={isArabic ? "إرسال عبر واتساب" : "Send WhatsApp"}
                                        onClick={() =>
                                          handleQuickSendWhatsApp(
                                            st,
                                            sess.time,
                                            sess.subject,
                                            sess.groupObj?.whatsappGroupLink
                                          )
                                        }
                                        className="p-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition text-xs"
                                      >
                                        <Send className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Explicit "إرسال تذكير بالحصة" Button next to each student */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveReminderTarget({
                                        student: st,
                                        sessionTime: sess.time,
                                        subject: sess.subject,
                                        groupName: sess.title,
                                        type: "group",
                                        whatsappGroupLink: sess.groupObj?.whatsappGroupLink
                                      })
                                    }
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 hover:text-white font-bold text-[10.5px] transition flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Bell className="w-3 h-3 text-amber-300 shrink-0" />
                                      <span>{isArabic ? "إرسال تذكير بالحصة" : "Send Reminder"}</span>
                                    </div>
                                    <span className="text-[9.5px] text-amber-300 font-mono font-black">
                                      {sessTimeInfo.remainingMinutes > 0
                                        ? `${sessTimeInfo.remainingMinutes} د`
                                        : (isArabic ? "الآن" : "Now")}
                                    </span>
                                  </button>
                                </div>
                              ))}

                              {/* Send to Entire WhatsApp Group Button (if group has WhatsApp link) */}
                              {sess.groupObj?.whatsappGroupLink && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const info = calculateLessonTimeInfo(
                                      sess.time,
                                      sess.title,
                                      sess.subject
                                    );
                                    const groupMsg = isArabic
                                      ? `تنبيه بموعد حصة (${sess.title}) بعد ${sessTimeInfo.remainingMinutes > 0 ? sessTimeInfo.remainingMinutes + ' دقيقة' : 'الآن'}. يرجى التواجد بالموعد.`
                                      : `Reminder: Session (${sess.title}) starts in ${sessTimeInfo.remainingMinutes} mins.`;
                                    navigator.clipboard.writeText(groupMsg);
                                    window.open(sess.groupObj?.whatsappGroupLink, "_blank", "noopener,noreferrer");
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[10.5px] transition flex items-center justify-center gap-1.5 border border-indigo-400/30 shadow-xs"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{isArabic ? "إرسال تذكير لجروب الواتساب بالكامل" : "Send to WhatsApp Group"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Create Report Action */}
                    {(() => {
                      const attStatus = !isGroup && privateStudent ? getStudentDayAttendance(privateStudent.id, privateStudent.fullName, sess.subject) : null;
                      return (
                        <button
                          onClick={() => handleOpenReportForSession(sess)}
                          className={`w-full py-2.5 rounded-2xl font-black text-xs transition shadow-lg flex items-center justify-center gap-2 text-white ${
                            attStatus === "absent"
                              ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border border-rose-400/40"
                              : attStatus === "present"
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>
                            {attStatus === "absent"
                              ? (isArabic ? "🔴 مسجل غائب (تعديل التقرير)" : "🔴 Recorded Absent (Edit)")
                              : attStatus === "present"
                              ? (isArabic ? "🟢 مسجل حاضر وحفظ التقرير (تعديل)" : "🟢 Recorded Present (Edit)")
                              : (isArabic ? "إنشاء التقرير" : "Create Report")}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FULL WEEKLY WORD STYLE TABLES (جدول الأسبوع الكامل بصيغة وورد) */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          {/* Top View Mode Switcher Header */}
          <div className="bg-white border-2 border-slate-300 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-800 text-white rounded-2xl border border-slate-700 shrink-0">
                <Table className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>{isArabic ? "جدول الأسبوع الكامل (مثل مستندات Word)" : "Full Weekly Timetable (Word Document Grid)"}</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isArabic
                    ? "يتضمن 7 أيام و24 ساعة كاملة مصممة بأسلوب جداول Microsoft Word وتناسب شاشة الهاتف بدون تحرك أفقياً"
                    : "Complete 7 days and 24 hours designed as MS Word tables optimized for mobile."}
                </p>
              </div>
            </div>

            {/* Word Table View Mode Selector & Direction Toggle */}
            <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 text-xs font-bold">
                <button
                  onClick={() => setMobileViewStyle("vertical")}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    mobileViewStyle === "vertical"
                      ? "bg-slate-900 text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isArabic ? "جداول وورد اليومية (للهاتف)" : "Word Daily Tables"}</span>
                </button>

                <button
                  onClick={() => setMobileViewStyle("grid")}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    mobileViewStyle === "grid"
                      ? "bg-slate-900 text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{isArabic ? "جدول وورد الشبكي (7x24)" : "Word Grid (7x24)"}</span>
                </button>
              </div>

              {/* Table Direction Toggle (LTR by default as requested: من اليسار إلى اليمين) */}
              <button
                onClick={() => setTableDirection(prev => prev === "ltr" ? "rtl" : "ltr")}
                className={`px-3 py-2 rounded-2xl transition flex items-center gap-1.5 text-xs font-black border shadow-2xs ${
                  tableDirection === "ltr"
                    ? "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-400/20"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
                title={isArabic ? "تغيير اتجاه الجدول (يسار إلى يمين / يمين إلى يسار)" : "Change table direction"}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  {tableDirection === "ltr"
                    ? (isArabic ? "من اليسار لليمين (LTR) ✓" : "Left to Right (LTR) ✓")
                    : (isArabic ? "من اليمين لليسار (RTL)" : "Right to Left (RTL)")}
                </span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: DAILY WORD TABLES (جداول وورد يومية متتالية تناسب الهاتف 100% بدون سكرول أفقي) */}
          {mobileViewStyle === "vertical" && (
            <div className="space-y-4 print:hidden">
              {/* Day Quick Filter Selector */}
              <div className="bg-slate-900 text-white p-2.5 rounded-2xl shadow-md border-2 border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedMobileDay("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap shrink-0 ${
                      selectedMobileDay === "all"
                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300/40"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {isArabic ? "جميع جداول الأسبوع (7 أيام)" : "All 7 Days"}
                  </button>

                  {daysList.map(day => {
                    const isToday = day === todayNormalized;
                    const isSelected = selectedMobileDay === day;

                    let daySessionsCount = 0;
                    hourSlots.forEach(slot => {
                      daySessionsCount += tableMatrix[slot.hour24]?.[day]?.length || 0;
                    });

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedMobileDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300/40 font-black"
                            : isToday
                            ? "bg-blue-950 text-blue-300 border border-blue-800"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <span>{day}</span>
                        {daySessionsCount > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                              isSelected ? "bg-white text-blue-700" : "bg-blue-500/30 text-blue-200"
                            }`}
                          >
                            {daySessionsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stacked Word Tables per Day */}
              <div className="space-y-6">
                {daysList
                  .filter(day => selectedMobileDay === "all" || selectedMobileDay === day)
                  .map(day => {
                    const isToday = day === todayNormalized;

                    const daySessions: Array<{
                      slotLabel: string;
                      hour24: number;
                      sessions: any[];
                    }> = [];

                    displayedHourSlots.forEach(slot => {
                      const sessList = tableMatrix[slot.hour24]?.[day] || [];
                      if (showFull24Hours || sessList.length > 0) {
                        daySessions.push({
                          slotLabel: isArabic ? slot.labelAr : slot.labelEn,
                          hour24: slot.hour24,
                          sessions: sessList
                        });
                      }
                    });

                    const uniqueDaySessionIds = new Set<string>();
                    daySessions.forEach(ds => ds.sessions.forEach(s => uniqueDaySessionIds.add(s.baseId)));
                    const activeCountOnDay = uniqueDaySessionIds.size;

                    return (
                      <div
                        key={day}
                        className={`bg-white border-2 rounded-2xl shadow-md overflow-hidden transition-all ${
                          isToday ? "border-blue-600 ring-2 ring-blue-500/30" : "border-slate-800"
                        }`}
                      >
                        {/* Word Table Document Header */}
                        <div
                          className={`p-3 border-b-2 flex items-center justify-between ${
                            isToday ? "bg-blue-900 text-white border-blue-950" : "bg-slate-800 text-white border-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                            <h3 className="font-black text-sm sm:text-base">
                              {isArabic ? `جدول يوم ${day}` : `${day} Schedule Table`}
                            </h3>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white border border-blue-300">
                                {isArabic ? "اليوم" : "Today"}
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded text-slate-200">
                            {activeCountOnDay} {isArabic ? "حصص" : "classes"}
                          </span>
                        </div>

                        {/* Word Style Table */}
                        <div className="w-full overflow-hidden" dir={tableDirection}>
                          <table className="w-full border-collapse text-slate-900 text-xs table-fixed" dir={tableDirection}>
                            <thead>
                              <tr className="bg-slate-200 text-slate-900 font-black border-b-2 border-slate-800 text-center">
                                <th className="p-2 border-r-2 border-slate-400 w-24 sm:w-32 bg-slate-300/80">
                                  {isArabic ? "الساعة / الوقت" : "Time"}
                                </th>
                                <th className="p-2 border-r-2 border-slate-400">
                                  {isArabic ? "الحصة والطلاب" : "Session & Students"}
                                </th>
                                <th className="p-2 w-20 sm:w-24 text-center">
                                  {isArabic ? "الإجراء" : "Action"}
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {daySessions.map(({ slotLabel, hour24, sessions }, rowIndex) => {
                                const hasSessions = sessions.length > 0;
                                const isEvenRow = rowIndex % 2 === 0;

                                return (
                                  <tr
                                    key={hour24}
                                    className={`border-b border-slate-300 ${
                                      hasSessions
                                        ? "bg-blue-50/40"
                                        : isEvenRow
                                        ? "bg-white"
                                        : "bg-slate-50/70"
                                    }`}
                                  >
                                    {/* Hour Slot Column */}
                                    <td className="p-2 font-mono font-bold text-[11px] text-center border-r-2 border-slate-400 bg-slate-100 text-slate-800 align-middle">
                                      {slotLabel}
                                    </td>

                                    {/* Content Column */}
                                    <td className="p-2 border-r-2 border-slate-400 align-middle">
                                      {!hasSessions ? (
                                        <span className="text-slate-400 text-xs italic select-none">
                                          {isArabic ? "— وقت شاغر" : "— Available"}
                                        </span>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {sessions.map((sess: any) => (
                                            <div
                                              key={sess.id}
                                              className={`p-2 rounded-lg border text-right transition ${
                                                sess.isContinuing
                                                  ? sess.type === "group"
                                                    ? "bg-blue-50/90 border-blue-400 border-dashed text-blue-950"
                                                    : "bg-purple-50/90 border-purple-400 border-dashed text-purple-950"
                                                  : sess.type === "group"
                                                  ? "bg-blue-100/90 border-blue-400 text-blue-950"
                                                  : "bg-purple-100/90 border-purple-400 text-purple-950"
                                              }`}
                                            >
                                              <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                {sess.isContinuing ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-500 text-slate-950 flex items-center gap-1 shadow-2xs">
                                                    <span>⏳</span>
                                                    <span>{isArabic ? `مستمر حتى ${sess.endTimeFormatted}` : `Continuing to ${sess.endTimeFormatted}`}</span>
                                                  </span>
                                                ) : (
                                                  <span
                                                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                                      sess.type === "group"
                                                        ? "bg-blue-700 text-white"
                                                        : "bg-purple-700 text-white"
                                                    }`}
                                                  >
                                                    {sess.type === "group"
                                                      ? (isArabic ? "مجموعة" : "Group")
                                                      : (isArabic ? "درس خاص" : "Private")}
                                                  </span>
                                                )}
                                                <span className="font-bold text-xs text-slate-800">
                                                  {abbreviateSubject(sess.subject)}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                                <AutoFitSessionTitle title={sess.title} size="large" className="text-slate-900" />
                                                {(() => {
                                                  if (sess.type === "private") {
                                                    const sId = sess.privateObj?.studentId || sess.id;
                                                    const sName = sess.privateObj?.studentName || sess.title;
                                                    const status = getStudentDayAttendance(sId, sName, sess.subject);
                                                    if (status === "absent") {
                                                      return (
                                                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-600 text-white border border-rose-300 flex items-center gap-1 shadow-2xs">
                                                          <span>🔴</span>
                                                          <span>{isArabic ? "غائب (لم يحضر)" : "Absent"}</span>
                                                        </span>
                                                      );
                                                    } else if (status === "present") {
                                                      return (
                                                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-600 text-white border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                                          <span>🟢</span>
                                                          <span>{isArabic ? "حاضر (تم الحضور)" : "Present"}</span>
                                                        </span>
                                                      );
                                                    }
                                                  }
                                                  return null;
                                                })()}
                                              </div>
                                              <div className="text-[10px] font-bold text-amber-900 font-mono mt-0.5 flex items-center gap-1">
                                                <span>⏰</span>
                                                <span>{sess.timeRangeFormatted || formatTimeRange(sess.time, sess.durationMinutes || 60, isArabic)}</span>
                                              </div>
                                              <p className="text-[11px] text-slate-600 mt-0.5">{sess.subtext}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </td>

                                    {/* Action Column */}
                                    <td className="p-1.5 text-center align-middle">
                                      {hasSessions ? (
                                        <div className="flex flex-col gap-1 items-center justify-center">
                                          {sessions.map((sess: any) => {
                                            const status = sess.type === "private"
                                              ? getStudentDayAttendance(sess.privateObj?.studentId || sess.id, sess.privateObj?.studentName || sess.title, sess.subject)
                                              : null;
                                            return (
                                              <button
                                                key={sess.id}
                                                onClick={() => handleOpenReportForSession(sess)}
                                                className={`w-full py-1.5 px-2 rounded-lg text-white font-bold text-[10px] sm:text-xs transition shadow-xs flex items-center justify-center gap-1 ${
                                                  status === "absent"
                                                    ? "bg-rose-600 hover:bg-rose-700"
                                                    : status === "present"
                                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                                    : "bg-blue-600 hover:bg-blue-700"
                                                }`}
                                              >
                                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  {status === "absent"
                                                    ? (isArabic ? "🔴 غائب (تعديل)" : "🔴 Absent (Edit)")
                                                    : status === "present"
                                                    ? (isArabic ? "🟢 حاضر (تعديل)" : "🟢 Present (Edit)")
                                                    : (isArabic ? "إنشاء التقرير" : "Create Report")}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: THE FULL MASTER WORD TABLE GRID (جدول ورد مجمع بالكامل 7 أيام x 24 ساعة بدون انزلاق أفقي) */}
          <div className={`bg-white border-2 border-slate-800 rounded-2xl p-2 sm:p-5 shadow-lg max-w-full overflow-hidden print:border-none print:shadow-none print:p-0 ${mobileViewStyle === "vertical" ? "hidden" : "block"}`}>
            {/* Document Header Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-800 print:hidden flex-wrap gap-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <h2 className="font-black text-slate-900 text-xs sm:text-base">
                  {isArabic ? "جدول الحصص الأسبوعي الكامل (Word Document Grid Table)" : "Weekly Timetable (Word Document Grid)"}
                </h2>
              </div>

              {/* Zoom & Table Controls Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Fit to Screen (احتواء الشاشة بدون سحب) */}
                <button
                  onClick={() => {
                    setFitToScreen(!fitToScreen);
                    if (!fitToScreen) setTableZoom(100);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10.5px] sm:text-xs font-black border transition flex items-center gap-1.5 shadow-2xs ${
                    fitToScreen && tableZoom <= 100
                      ? "bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400/30"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  title={isArabic ? "عرض جميع الأيام والمواعيد في الشاشة دون الحاجة إلى السحب" : "Fit all days on screen without scrolling"}
                >
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isArabic ? "احتواء الشاشة (بدون سحب)" : "Fit Screen"}</span>
                  {fitToScreen && tableZoom <= 100 && <Check className="w-3 h-3 text-emerald-200" />}
                </button>

                {/* Zoom Controller */}
                <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-300 shadow-2xs">
                  <button
                    onClick={() => {
                      setTableZoom(prev => Math.max(50, prev - 10));
                    }}
                    className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition disabled:opacity-30 cursor-pointer"
                    title={isArabic ? "تصغير الجدول (-10%)" : "Zoom Out (-10%)"}
                    disabled={tableZoom <= 50}
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <div className="flex items-center gap-0.5 px-0.5 sm:px-1">
                    {[60, 80, 100, 120].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => {
                          setTableZoom(lvl);
                          if (lvl > 100) setFitToScreen(false);
                        }}
                        className={`px-1 sm:px-1.5 py-0.5 text-[9.5px] sm:text-[11px] font-mono font-black rounded transition ${
                          tableZoom === lvl
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {lvl}%
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setTableZoom(prev => {
                        const next = Math.min(160, prev + 10);
                        if (next > 100) setFitToScreen(false);
                        return next;
                      });
                    }}
                    className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition disabled:opacity-30 cursor-pointer"
                    title={isArabic ? "تكبير الجدول (+10%)" : "Zoom In (+10%)"}
                    disabled={tableZoom >= 160}
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {tableZoom !== 100 && (
                    <button
                      onClick={() => {
                        setTableZoom(100);
                        setFitToScreen(true);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-amber-600 transition"
                      title={isArabic ? "إعادة الضبط إلى 100%" : "Reset to 100%"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Table Direction Toggle */}
                <button
                  onClick={() => setTableDirection(prev => prev === "ltr" ? "rtl" : "ltr")}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black border transition flex items-center gap-1 shadow-2xs ${
                    tableDirection === "ltr"
                      ? "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-400/20"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                  }`}
                  title={isArabic ? "تغيير اتجاه الجدول (يسار إلى يمين / يمين إلى يسار)" : "Change table direction"}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {tableDirection === "ltr"
                      ? (isArabic ? "LTR ✓" : "LTR ✓")
                      : (isArabic ? "RTL" : "RTL")}
                  </span>
                </button>

                {/* Status Badge */}
                {fitToScreen && tableZoom <= 100 ? (
                  <span className="text-[9.5px] sm:text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg font-black flex items-center gap-1">
                    <span>👁️</span>
                    <span>{isArabic ? "رؤية الكل بدون سحب" : "No Scroll"}</span>
                  </span>
                ) : (
                  <span className="text-[9.5px] sm:text-xs text-blue-800 bg-blue-100/90 border border-blue-300 px-2 py-1 rounded-lg font-black flex items-center gap-1">
                    <span>↔</span>
                    <span>{isArabic ? "اسحب للتمرير" : "Scrollable"}</span>
                  </span>
                )}

                <span className="hidden sm:inline-block text-[10px] sm:text-xs text-slate-700 font-black bg-slate-200 border border-slate-400 px-2.5 py-1 rounded">
                  {isArabic ? "7 أيام × 24 ساعة" : "7 Days x 24 Hours"}
                </span>
              </div>
            </div>

            {/* THE WORD TABLE GRID (Fits 100% Mobile Width) */}
            <div 
              className={`w-full rounded border-2 border-slate-800 bg-white shadow-xs transition-all ${
                fitToScreen && tableZoom <= 100 ? "overflow-x-auto sm:overflow-x-hidden" : "overflow-x-auto scrollbar-thin"
              }`} 
              dir={tableDirection}
            >
              <div 
                className="w-full transition-all origin-top"
                style={tableZoom !== 100 ? { zoom: `${tableZoom}%` } : undefined}
              >
                <table 
                  className={`w-full border-collapse text-slate-900 text-xs text-center table-fixed print:min-w-0 ${
                    fitToScreen && tableZoom <= 100 ? "min-w-0" : "min-w-[700px] sm:min-w-[800px]"
                  }`} 
                  dir={tableDirection}
                >
                  {/* Header Row: Hours | Days | Saturday ... Friday */}
                  <thead>
                    <tr className="bg-slate-300 text-slate-900 font-black border-b-2 border-slate-800">
                      <th className={`border-r-2 border-b-2 border-slate-800 p-0.5 sm:p-1.5 ${
                        fitToScreen && tableZoom <= 100 ? "w-[11%] sm:w-16 min-w-0" : "w-16 sm:w-20 min-w-[65px] sm:min-w-[80px]"
                      } bg-slate-400/80 text-center text-[7px] sm:text-xs font-black`}>
                        {isArabic ? (
                          <>
                            <span className="sm:hidden">س/ي</span>
                            <span className="hidden sm:inline">الساعة / اليوم</span>
                          </>
                        ) : (
                          <>
                            <span className="sm:hidden">H/D</span>
                            <span className="hidden sm:inline">Hours / Days</span>
                          </>
                        )}
                      </th>
                      {daysList.map(day => {
                        const isToday = day === todayNormalized;

                        return (
                          <th
                            key={day}
                            className={`border-r border-b-2 border-slate-800 p-0.5 sm:p-1.5 text-center text-[7.5px] sm:text-xs font-black transition ${
                              fitToScreen && tableZoom <= 100 ? "w-[12.7%] min-w-0" : "min-w-[85px] sm:min-w-[98px]"
                            } ${
                              isToday ? "bg-blue-700 text-white" : "bg-slate-300/90 text-slate-900"
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                              <span>{day}</span>
                              {isToday && (
                                <span className="text-[6px] sm:text-[9px] px-1 py-0 bg-white text-blue-900 font-black rounded shadow-2xs mt-0.5">
                                  {isArabic ? "اليوم" : "Today"}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {displayedHourSlots.map((slot, rowIndex) => {
                      const isEvenRow = rowIndex % 2 === 0;

                      const mobileHourLabel = isArabic 
                        ? slot.labelAr.replace(":00", "").replace("مساءً", "م").replace("صباحاً", "ص").replace(" - ", "-")
                        : slot.labelEn.replace(":00", "").replace(" PM", "p").replace(" AM", "a").replace(" - ", "-");

                      return (
                        <tr
                          key={slot.hour24}
                          className={`border-b border-slate-400 hover:bg-blue-50/50 transition ${
                            isEvenRow ? "bg-white" : "bg-slate-100/60"
                          }`}
                        >
                          {/* Hour Column (Left Header) */}
                          <td className="border-r-2 border-slate-800 p-0.5 sm:p-1 font-mono font-black text-[7px] sm:text-xs bg-slate-200 text-slate-900 text-center leading-tight">
                            <span className="sm:hidden block">{mobileHourLabel}</span>
                            <span className="hidden sm:block whitespace-nowrap">{isArabic ? slot.labelAr : slot.labelEn}</span>
                          </td>

                          {/* Days Cells */}
                          {daysList.map(day => {
                            const sessions = tableMatrix[slot.hour24]?.[day] || [];
                            const isToday = day === todayNormalized;

                            return (
                              <td
                                key={day}
                                className={`border-r border-slate-400 p-0.5 sm:p-1 text-center align-middle relative min-h-[28px] ${
                                  fitToScreen && tableZoom <= 100 ? "min-w-0" : "min-w-[85px] sm:min-w-[98px]"
                                } ${
                                  isToday ? "bg-blue-50/30" : ""
                                }`}
                              >
                                {sessions.length === 0 ? (
                                  <span className="text-slate-300 text-[6px] sm:text-[9px] select-none">—</span>
                                ) : (
                                  <div className="space-y-0.5 sm:space-y-1">
                                    {sessions.map(sess => {
                                      const fullTimeText = sess.timeRangeFormatted || formatTimeRange(sess.time, sess.durationMinutes || 60, isArabic);
                                      return (
                                        <div
                                          key={sess.id}
                                          onClick={() => handleOpenReportForSession(sess)}
                                          className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg border-2 text-center transition cursor-pointer hover:scale-[1.02] shadow-2xs group ${
                                            sess.isContinuing
                                              ? sess.type === "group"
                                                ? "bg-blue-50/90 border-blue-400 border-dashed text-blue-950 hover:bg-blue-100"
                                                : "bg-purple-50/90 border-purple-400 border-dashed text-purple-950 hover:bg-purple-100"
                                              : sess.type === "group"
                                              ? "bg-blue-100 border-blue-500 text-blue-950 hover:bg-blue-200"
                                              : "bg-purple-100 border-purple-500 text-purple-950 hover:bg-purple-200"
                                          }`}
                                          title={`${sess.title} | ${sess.subject} (${fullTimeText})${sess.isContinuing ? (isArabic ? " - مستمر من الساعة السابقة" : " - Continuing") : ""}`}
                                        >
                                          {/* Time status badge */}
                                          {sess.isContinuing ? (
                                            <div className="flex items-center justify-center mb-0.5">
                                              <span className="text-[6px] sm:text-[8px] font-black bg-amber-500 text-slate-950 px-1 py-0 rounded leading-none shadow-2xs whitespace-nowrap">
                                                ⏳ {isArabic ? `حتى ${sess.endTimeFormatted}` : `to ${sess.endTimeFormatted}`}
                                              </span>
                                            </div>
                                          ) : sess.startMinute !== 0 ? (
                                            <div className="flex items-center justify-center mb-0.5">
                                              <span className="text-[6px] sm:text-[8px] font-black bg-slate-900 text-amber-300 px-1 py-0 rounded leading-none font-mono whitespace-nowrap shadow-2xs">
                                                {sess.startTimeFormatted}
                                              </span>
                                            </div>
                                          ) : null}

                                          {/* Student / Group Name - Auto-fit containment without cutting words */}
                                          <AutoFitSessionTitle title={sess.title} isFitMode={fitToScreen && tableZoom <= 100} />

                                          {/* Abbreviated Subject - First word if big */}
                                          <div
                                            className={`text-[7px] sm:text-[9.5px] font-bold leading-tight mt-0.5 px-0.5 break-normal ${
                                              sess.type === "group" ? "text-blue-800" : "text-purple-800"
                                            }`}
                                            style={{
                                              wordBreak: "keep-all",
                                              overflowWrap: "normal",
                                            }}
                                          >
                                            {abbreviateSubject(sess.subject)}
                                          </div>

                                          {/* Attendance Indicator Tag if recorded */}
                                          {(() => {
                                            if (sess.type === "private" && isToday) {
                                              const sId = sess.privateObj?.studentId || sess.id;
                                              const sName = sess.privateObj?.studentName || sess.title;
                                              const status = getStudentDayAttendance(sId, sName, sess.subject);
                                              if (status === "absent") {
                                                return (
                                                  <div className="mt-0.5">
                                                    <span className="text-[6.5px] sm:text-[8.5px] font-black bg-rose-600 text-white px-1 py-0 rounded leading-none whitespace-nowrap shadow-2xs inline-block">
                                                      🔴 {isArabic ? "غائب" : "Absent"}
                                                    </span>
                                                  </div>
                                                );
                                              } else if (status === "present") {
                                                return (
                                                  <div className="mt-0.5">
                                                    <span className="text-[6.5px] sm:text-[8.5px] font-black bg-emerald-600 text-white px-1 py-0 rounded leading-none whitespace-nowrap shadow-2xs inline-block">
                                                      🟢 {isArabic ? "حاضر" : "Present"}
                                                    </span>
                                                  </div>
                                                );
                                              }
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Lesson Reminder Modal */}
      {activeReminderTarget && (
        <StudentLessonReminderModal
          target={activeReminderTarget}
          isArabic={isArabic}
          onClose={() => setActiveReminderTarget(null)}
        />
      )}

      {/* Group Student Selector Modal for Report Generation */}
      {reportGroupPickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  {isArabic ? "اختر الطالب لإنشاء التقرير" : "Select Student for Report"}
                </h3>
              </div>
              <button
                onClick={() => setReportGroupPickerModal(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-600">
              {isArabic
                ? `مجموعة: ${reportGroupPickerModal.group.name} (${reportGroupPickerModal.subject || reportGroupPickerModal.group.subject})`
                : `Group: ${reportGroupPickerModal.group.name}`}
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {students
                .filter(
                  st =>
                    reportGroupPickerModal.group.studentIds?.includes(st.id) ||
                    st.groupId === reportGroupPickerModal.group.id ||
                    st.groupName === reportGroupPickerModal.group.name
                )
                .map(st => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setReportStudentModal(st);
                      setReportGroupPickerModal(null);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex items-center justify-between transition group text-right"
                  >
                    <div>
                      <div className="font-black text-xs text-slate-900 group-hover:text-blue-700">
                        {st.fullName}
                      </div>
                      {st.studentPhone && (
                        <div className="text-[10px] text-slate-500">{st.studentPhone}</div>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-bold text-[10px] shrink-0">
                      {isArabic ? "إنشاء التقرير" : "Create"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Report Generator View Modal */}
      {reportStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="bg-slate-900 text-white p-3 px-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="font-black text-sm">
                  {isArabic ? `تقرير الطالب: ${reportStudentModal.fullName}` : `Student Report: ${reportStudentModal.fullName}`}
                </span>
              </div>
              <button
                onClick={() => setReportStudentModal(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-5 overflow-y-auto flex-1">
              <StudentPersonalReportView
                student={students.find(s => s.id === reportStudentModal.id) || reportStudentModal}
                settings={settings}
                reports={reports}
                attendanceRecords={attendanceRecords}
                isArabic={isArabic}
                onBack={() => setReportStudentModal(null)}
                onAddReport={onAddReport}
                onDeleteReport={onDeleteReport}
                onToggleArchiveReport={onToggleArchiveReport}
                onArchiveEndedCycle={onArchiveEndedCycle}
                onGenerateReportAi={onGenerateReportAi}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
