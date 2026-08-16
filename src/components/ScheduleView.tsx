import React, { useState, useMemo } from "react";
import { Calendar, Clock, Play, Users, User, Table, Printer, Sparkles, Smartphone } from "lucide-react";
import { Group, PrivateLesson, Lesson, AppSettings } from "../types";

interface ScheduleViewProps {
  settings: AppSettings;
  groups: Group[];
  privateLessons: PrivateLesson[];
  lessons: Lesson[];
  onOpenLesson: (groupObj?: Group, privateObj?: PrivateLesson) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  settings,
  groups,
  privateLessons,
  lessons,
  onOpenLesson
}) => {
  const isArabic = settings.preferredLanguage === "ar";

  // Days list matching Word table order (Saturday to Friday)
  const daysList = isArabic
    ? ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
    : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Mapping for day matching (normalizing strings)
  const normalizeDay = (dayStr: string): string => {
    if (!dayStr) return "";
    const clean = dayStr.trim();
    if (clean.includes("سبت") || clean.toLowerCase().includes("sat")) return isArabic ? "السبت" : "Saturday";
    if (clean.includes("أحد") || clean.includes("احد") || clean.toLowerCase().includes("sun")) return isArabic ? "الأحد" : "Sunday";
    if (clean.includes("إثنين") || clean.includes("اثنين") || clean.toLowerCase().includes("mon")) return isArabic ? "الإثنين" : "Monday";
    if (clean.includes("ثلاثاء") || clean.toLowerCase().includes("tue")) return isArabic ? "الثلاثاء" : "Tuesday";
    if (clean.includes("أربعاء") || clean.includes("اربعاء") || clean.toLowerCase().includes("wed")) return isArabic ? "الأربعاء" : "Wednesday";
    if (clean.includes("خميس") || clean.toLowerCase().includes("thu")) return isArabic ? "الخميس" : "Thursday";
    if (clean.includes("جمعة") || clean.toLowerCase().includes("fri")) return isArabic ? "الجمعة" : "Friday";
    return clean;
  };

  // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  const todayIndex = new Date().getDay();
  const todayNormalized = daysList.find(d => normalizeDay(d) === normalizeDay(
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIndex]
  ));

  const [activeTab, setActiveTab] = useState<"today" | "weekly">("today");
  const [filterType, setFilterType] = useState<"all" | "group" | "private">("all");
  const [showFull24Hours, setShowFull24Hours] = useState<boolean>(true);
  const [mobileViewStyle, setMobileViewStyle] = useState<"grid" | "vertical">("grid");
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>("all");

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
    if (!timeStr) return 16;
    const clean = timeStr.trim().toLowerCase();

    let isPM = clean.includes("pm") || clean.includes("م") || clean.includes("مساءً");
    let isAM = clean.includes("am") || clean.includes("ص") || clean.includes("صباحاً");

    const digitsMatch = clean.match(/\d+/);
    if (!digitsMatch) return 16;

    let h = parseInt(digitsMatch[0], 10);

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    if (!isPM && !isAM) {
      if (h >= 1 && h <= 7) h += 12;
    }

    return h % 24;
  };

  // Build matrix data: cellData[hour24][dayName] = Array of sessions
  const tableMatrix = useMemo(() => {
    const matrix: Record<number, Record<string, Array<{
      id: string;
      type: "group" | "private";
      time: string;
      title: string;
      subject: string;
      subtext: string;
      groupObj?: Group;
      privateObj?: PrivateLesson;
    }>>> = {};

    hourSlots.forEach(slot => {
      matrix[slot.hour24] = {};
      daysList.forEach(day => {
        matrix[slot.hour24][day] = [];
      });
    });

    if (filterType !== "private") {
      groups.forEach(grp => {
        if (grp.scheduleSlots && grp.scheduleSlots.length > 0) {
          grp.scheduleSlots.forEach((slot, sIdx) => {
            const h = getHourFromTimeString(slot.time || grp.time || "");
            const dayName = normalizeDay(slot.day);
            if (matrix[h] && matrix[h][dayName]) {
              matrix[h][dayName].push({
                id: `grp-${grp.id}-${dayName}-${sIdx}`,
                type: "group",
                time: slot.time || grp.time || "",
                title: grp.name,
                subject: grp.subject,
                subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                groupObj: grp
              });
            }
          });
        } else {
          const h = getHourFromTimeString(grp.time || "");
          grp.days.forEach(dayRaw => {
            const dayName = normalizeDay(dayRaw);
            if (matrix[h] && matrix[h][dayName]) {
              matrix[h][dayName].push({
                id: `grp-${grp.id}-${dayName}`,
                type: "group",
                time: grp.time || "",
                title: grp.name,
                subject: grp.subject,
                subtext: `${grp.studentIds?.length || 0} ${isArabic ? "طلاب" : "students"}`,
                groupObj: grp
              });
            }
          });
        }
      });
    }

    if (filterType !== "group") {
      privateLessons.forEach(prv => {
        if (prv.scheduleSlots && prv.scheduleSlots.length > 0) {
          prv.scheduleSlots.forEach((slot, sIdx) => {
            const h = getHourFromTimeString(slot.time || prv.time || "");
            const dayName = normalizeDay(slot.day);
            if (matrix[h] && matrix[h][dayName]) {
              matrix[h][dayName].push({
                id: `prv-${prv.id}-${dayName}-${sIdx}`,
                type: "private",
                time: slot.time || prv.time || "",
                title: prv.studentName,
                subject: prv.subject,
                subtext: isArabic ? "درس خاص" : "Private",
                privateObj: prv
              });
            }
          });
        } else {
          const h = getHourFromTimeString(prv.time || "");
          prv.days.forEach(dayRaw => {
            const dayName = normalizeDay(dayRaw);
            if (matrix[h] && matrix[h][dayName]) {
              matrix[h][dayName].push({
                id: `prv-${prv.id}-${dayName}`,
                type: "private",
                time: prv.time || "",
                title: prv.studentName,
                subject: prv.subject,
                subtext: isArabic ? "درس خاص" : "Private",
                privateObj: prv
              });
            }
          });
        }
      });
    }

    return matrix;
  }, [groups, privateLessons, daysList, filterType, isArabic]);

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
  }, [tableMatrix, daysList]);

  // Filter slots to show
  const displayedHourSlots = useMemo(() => {
    if (showFull24Hours) return hourSlots;
    if (activeHoursSet.size === 0) {
      return hourSlots.filter(s => s.hour24 >= 12 || s.hour24 === 0);
    }
    return hourSlots.filter(s => activeHoursSet.has(s.hour24));
  }, [showFull24Hours, activeHoursSet]);

  const totalWeeklySessions = useMemo(() => {
    let count = 0;
    hourSlots.forEach(slot => {
      daysList.forEach(day => {
        count += tableMatrix[slot.hour24]?.[day]?.length || 0;
      });
    });
    return count;
  }, [tableMatrix, daysList]);

  // Today's sessions list
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
    }> = [];

    hourSlots.forEach(slot => {
      const items = tableMatrix[slot.hour24]?.[todayNormalized] || [];
      items.forEach(item => list.push(item));
    });

    return list;
  }, [tableMatrix, todayNormalized, hourSlots]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:m-0">
      {/* Header Controls Card (Hidden during print) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" />
              {isArabic ? "قسم المواعيد والجدول" : "Timetable View"}
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {totalWeeklySessions} {isArabic ? "حصص مسجلة" : "sessions"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isArabic ? "جدول الحصص والمجموعات" : "Weekly Schedule Table"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isArabic
              ? "اختر بين عرض جدول حصص اليوم أو عرض جدول الأسبوع كامل بصيغة Word."
              : "Switch between Today's schedule and the full Weekly Word table."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold border border-slate-200/60">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterType === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isArabic ? "الكل" : "All"}
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                filterType === "group" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{isArabic ? "مجموعات" : "Groups"}</span>
            </button>
            <button
              onClick={() => setFilterType("private")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                filterType === "private" ? "bg-white text-purple-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
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
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
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
            className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{isArabic ? "طباعة / حفظ PDF" : "Print Schedule"}</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="grid grid-cols-2 bg-slate-200/90 p-1.5 rounded-2xl gap-2 print:hidden shadow-inner">
        <button
          onClick={() => setActiveTab("today")}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
            activeTab === "today"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50"
              : "text-slate-700 hover:bg-slate-300/70"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isArabic ? "حصص اليوم" : "Today's Schedule"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "today" ? "bg-blue-800 text-blue-100" : "bg-slate-300 text-slate-800"
            }`}
          >
            {todaySessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("weekly")}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
            activeTab === "weekly"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50"
              : "text-slate-700 hover:bg-slate-300/70"
          }`}
        >
          <Table className="w-4 h-4" />
          <span>{isArabic ? "الجدول الأسبوعي" : "Weekly Schedule"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "weekly" ? "bg-blue-800 text-blue-100" : "bg-slate-300 text-slate-800"
            }`}
          >
            {totalWeeklySessions}
          </span>
        </button>
      </div>

      {/* TAB 1: TODAY'S SESSIONS (الخانة الأولى: حصص اليوم) */}
      {activeTab === "today" && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-5 print:hidden border border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300 shadow-inner">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3">
              {todaySessions.map(sess => (
                <div
                  key={sess.id}
                  className="bg-white/10 backdrop-blur-md border border-white/15 hover:border-blue-400/60 transition-all rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between space-y-3 shadow-lg hover:bg-white/15"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-black flex items-center gap-1 ${
                          sess.type === "group"
                            ? "bg-blue-400/20 text-blue-200 border border-blue-400/30"
                            : "bg-purple-400/20 text-purple-200 border border-purple-400/30"
                        }`}
                      >
                        {sess.type === "group" ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>{sess.type === "group" ? (isArabic ? "مجموعة" : "Group") : (isArabic ? "درس خاص" : "Private")}</span>
                      </span>

                      <span className="font-mono font-bold text-[11px] bg-black/40 text-amber-300 px-2 py-0.5 rounded-lg border border-white/10 shadow-inner">
                        {sess.time || "غير محدد"}
                      </span>
                    </div>

                    <h3 className="font-black text-white text-sm line-clamp-1">{sess.title}</h3>
                    <p className="text-xs font-bold text-blue-300 mt-0.5">{sess.subject}</p>
                    <p className="text-[10.5px] text-blue-200/70 mt-0.5">{sess.subtext}</p>
                  </div>

                  <button
                    onClick={() => onOpenLesson(sess.groupObj, sess.privateObj)}
                    className="w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isArabic ? "بدء الحصة" : "Start Session"}</span>
                  </button>
                </div>
              ))}
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

            {/* Word Table View Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 text-xs font-bold self-start sm:self-auto shrink-0">
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

                    const activeCountOnDay = daySessions.reduce((acc, curr) => acc + curr.sessions.length, 0);

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
                        <div className="w-full overflow-hidden">
                          <table className="w-full border-collapse text-slate-900 text-xs table-fixed">
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
                                                sess.type === "group"
                                                  ? "bg-blue-100/90 border-blue-400 text-blue-950"
                                                  : "bg-purple-100/90 border-purple-400 text-purple-950"
                                              }`}
                                            >
                                              <div className="flex items-center gap-1.5 mb-1">
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
                                                <span className="font-bold text-xs text-slate-800">
                                                  {sess.subject}
                                                </span>
                                              </div>
                                              <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                                                {sess.title}
                                              </h4>
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
                                          {sessions.map((sess: any) => (
                                            <button
                                              key={sess.id}
                                              onClick={() => onOpenLesson(sess.groupObj, sess.privateObj)}
                                              className="w-full py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] sm:text-xs transition shadow-xs flex items-center justify-center gap-1"
                                            >
                                              <Play className="w-3 h-3 fill-current shrink-0" />
                                              <span>{isArabic ? "فتح" : "Open"}</span>
                                            </button>
                                          ))}
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
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <h2 className="font-black text-slate-900 text-xs sm:text-base">
                  {isArabic ? "جدول الحصص الأسبوعي الكامل (Word Document Grid Table)" : "Weekly Timetable (Word Document Grid)"}
                </h2>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-700 font-black bg-slate-200 border border-slate-400 px-2.5 py-1 rounded">
                {isArabic ? "7 أيام × 24 ساعة" : "7 Days x 24 Hours"}
              </span>
            </div>

            {/* THE WORD TABLE GRID (Fits 100% Mobile Width) */}
            <div className="w-full overflow-hidden rounded border-2 border-slate-800 bg-white shadow-xs">
              <table className="w-full border-collapse text-slate-900 text-xs text-center table-fixed">
                {/* Header Row: Hours | Days | Saturday ... Friday */}
                <thead>
                  <tr className="bg-slate-300 text-slate-900 font-black border-b-2 border-slate-800">
                    <th className="border-r-2 border-b-2 border-slate-800 p-0.5 sm:p-1.5 w-[13%] sm:w-20 bg-slate-400/80 text-center text-[7px] sm:text-xs font-black">
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
                      const mobileDayName = day.replace("ال", "");

                      return (
                        <th
                          key={day}
                          className={`border-r border-b-2 border-slate-800 p-0.5 sm:p-1.5 text-center text-[7px] sm:text-xs font-black transition w-[12.4%] sm:w-auto ${
                            isToday ? "bg-blue-700 text-white" : "bg-slate-300/90 text-slate-900"
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span className="sm:hidden text-[7px] truncate max-w-full font-black">{mobileDayName}</span>
                            <span className="hidden sm:inline">{day}</span>
                            {isToday && (
                              <span className="text-[6px] sm:text-[9px] px-0.5 sm:px-1.5 py-0 bg-white text-blue-900 font-black rounded shadow-2xs">
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
                        <td className="border-r-2 border-slate-800 p-0.5 sm:p-1 font-mono font-black text-[6.5px] sm:text-xs bg-slate-200 text-slate-900 text-center leading-tight">
                          <span className="sm:hidden block truncate">{mobileHourLabel}</span>
                          <span className="hidden sm:block whitespace-nowrap">{isArabic ? slot.labelAr : slot.labelEn}</span>
                        </td>

                        {/* Days Cells */}
                        {daysList.map(day => {
                          const sessions = tableMatrix[slot.hour24]?.[day] || [];
                          const isToday = day === todayNormalized;

                          return (
                            <td
                              key={day}
                              className={`border-r border-slate-400 p-0.5 sm:p-1 text-center align-middle relative min-h-[26px] ${
                                isToday ? "bg-blue-50/30" : ""
                              }`}
                            >
                              {sessions.length === 0 ? (
                                <span className="text-slate-300 text-[6px] sm:text-[9px] select-none">—</span>
                              ) : (
                                <div className="space-y-0.5 sm:space-y-1">
                                  {sessions.map(sess => (
                                    <div
                                      key={sess.id}
                                      onClick={() => onOpenLesson(sess.groupObj, sess.privateObj)}
                                      className={`p-0.5 sm:p-1.5 rounded sm:rounded-lg border-2 text-center transition cursor-pointer hover:scale-[1.02] shadow-2xs group ${
                                        sess.type === "group"
                                          ? "bg-blue-100 border-blue-600 text-blue-950 hover:bg-blue-200"
                                          : "bg-purple-100 border-purple-600 text-purple-950 hover:bg-purple-200"
                                      }`}
                                      title={isArabic ? "انقر لبدء الحصة" : "Click to open session"}
                                    >
                                      {/* Title */}
                                      <div className="font-black text-[6.5px] sm:text-xs leading-tight text-slate-900 group-hover:text-blue-800 truncate">
                                        {sess.title}
                                      </div>

                                      {/* Subject */}
                                      <div
                                        className={`text-[6px] sm:text-[10px] font-bold leading-tight mt-0.5 truncate ${
                                          sess.type === "group" ? "text-blue-800" : "text-purple-800"
                                        }`}
                                      >
                                        {sess.subject}
                                      </div>

                                      {/* Type subtext */}
                                      <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-0.5 text-[6px] sm:text-[9px] font-medium text-slate-600">
                                        <span
                                          className={`px-0.5 sm:px-1 py-0 rounded text-[5.5px] sm:text-[8px] font-black ${
                                            sess.type === "group"
                                              ? "bg-blue-600 text-white"
                                              : "bg-purple-600 text-white"
                                          }`}
                                        >
                                          {sess.type === "group" ? (
                                            <>
                                              <span className="sm:hidden">م</span>
                                              <span className="hidden sm:inline">{isArabic ? "مجموعة" : "Group"}</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="sm:hidden">خ</span>
                                              <span className="hidden sm:inline">{isArabic ? "خاص" : "Private"}</span>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
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
      )}
    </div>
  );
};
