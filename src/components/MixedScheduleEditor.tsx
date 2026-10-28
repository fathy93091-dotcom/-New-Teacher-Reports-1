import React, { useState, useEffect } from "react";
import { Clock, Calendar, Plus, Trash2, Check, Sun, Moon } from "lucide-react";
import { ScheduleSlot } from "../types";
import { formatTime12h, parseTimeString } from "../lib/timeUtils";

export { formatTime12h };

interface MixedScheduleEditorProps {
  scheduleSlots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  defaultDuration?: number;
  isArabic?: boolean;
}

const DAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const QUICK_TIME_PRESETS_MORNING = [
  { labelAr: "08:00 ص", labelEn: "08:00 AM", value: "08:00" },
  { labelAr: "09:00 ص", labelEn: "09:00 AM", value: "09:00" },
  { labelAr: "10:00 ص", labelEn: "10:00 AM", value: "10:00" },
  { labelAr: "11:00 ص", labelEn: "11:00 AM", value: "11:00" },
  { labelAr: "12:00 ظ", labelEn: "12:00 PM", value: "12:00" }
];

const QUICK_TIME_PRESETS_EVENING = [
  { labelAr: "01:00 م", labelEn: "01:00 PM", value: "13:00" },
  { labelAr: "03:00 م", labelEn: "03:00 PM", value: "15:00" },
  { labelAr: "04:00 م", labelEn: "04:00 PM", value: "16:00" },
  { labelAr: "05:00 م", labelEn: "05:00 PM", value: "17:00" },
  { labelAr: "06:00 م", labelEn: "06:00 PM", value: "18:00" },
  { labelAr: "07:00 م", labelEn: "07:00 PM", value: "19:00" },
  { labelAr: "08:00 م", labelEn: "08:00 PM", value: "20:00" },
  { labelAr: "09:00 م", labelEn: "09:00 PM", value: "21:00" }
];

export const getScheduleSummaryText = (slots?: ScheduleSlot[], isAr: boolean = true): string => {
  if (!slots || slots.length === 0) return isAr ? "غير محدد" : "Not set";
  return slots.map(s => `${s.day} (${formatTime12h(s.time, isAr)})`).join(" • ");
};

export const MixedScheduleEditor: React.FC<MixedScheduleEditorProps> = ({
  scheduleSlots,
  onChange,
  defaultDuration = 90,
  isArabic = true
}) => {
  const daysList = isArabic ? DAYS_AR : DAYS_EN;
  const [scheduleMode, setScheduleMode] = useState<"mixed" | "uniform">("mixed");
  const [uniformTime, setUniformTime] = useState(scheduleSlots[0]?.time || "17:00");
  const [uniformDuration, setUniformDuration] = useState(defaultDuration);

  // Initialize with at least 1 slot if empty
  useEffect(() => {
    if (scheduleSlots.length === 0) {
      onChange([
        { day: isArabic ? "السبت" : "Sat", time: "17:00", durationMinutes: defaultDuration },
        { day: isArabic ? "الأحد" : "Sun", time: "19:00", durationMinutes: defaultDuration }
      ]);
    }
  }, []);

  const handleToggleDay = (day: string) => {
    const existingIndex = scheduleSlots.findIndex(s => s.day === day);
    if (existingIndex >= 0) {
      if (scheduleSlots.length > 1) {
        const next = scheduleSlots.filter(s => s.day !== day);
        onChange(next);
      }
    } else {
      const defaultTime = scheduleMode === "uniform" ? uniformTime : (scheduleSlots[0]?.time || "17:00");
      const next = [
        ...scheduleSlots,
        {
          day,
          time: defaultTime,
          durationMinutes: scheduleMode === "uniform" ? uniformDuration : defaultDuration
        }
      ];
      onChange(next);
    }
  };

  const handleUpdateSlot = (index: number, partial: Partial<ScheduleSlot>) => {
    const next = [...scheduleSlots];
    next[index] = { ...next[index], ...partial };
    onChange(next);
  };

  // Toggle AM / PM for a specific slot
  const handleToggleSlotAmPm = (index: number) => {
    const slot = scheduleSlots[index];
    if (!slot || !slot.time) return;
    const { hour24, minute } = parseTimeString(slot.time);
    const newHour24 = (hour24 + 12) % 24;
    const newTimeStr = `${String(newHour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    handleUpdateSlot(index, { time: newTimeStr });
  };

  // Toggle AM / PM for uniform time
  const handleToggleUniformAmPm = () => {
    const { hour24, minute } = parseTimeString(uniformTime);
    const newHour24 = (hour24 + 12) % 24;
    const newTimeStr = `${String(newHour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    handleApplyUniformTime(newTimeStr);
  };

  const handleRemoveSlot = (index: number) => {
    if (scheduleSlots.length <= 1) return;
    const next = scheduleSlots.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleAddCustomSlot = () => {
    const chosenDays = new Set(scheduleSlots.map(s => s.day));
    const availableDay = daysList.find(d => !chosenDays.has(d)) || daysList[0];
    const defaultTime = scheduleMode === "uniform" ? uniformTime : "18:00";
    onChange([
      ...scheduleSlots,
      { day: availableDay, time: defaultTime, durationMinutes: defaultDuration }
    ]);
  };

  const handleApplyUniformTime = (newTime: string) => {
    setUniformTime(newTime);
    const next = scheduleSlots.map(s => ({ ...s, time: newTime }));
    onChange(next);
  };

  const uniformParsed = parseTimeString(uniformTime);
  const isUniformPM = uniformParsed.hour24 >= 12;

  return (
    <div className="space-y-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-xs shadow-2xs">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-black text-slate-900 text-xs sm:text-sm">
              {isArabic ? "جدول المواعيد وأيام الحصص" : "Schedule & Study Days"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              {isArabic
                ? "يمكنك تحديد موعد صباحي (AM) أو مسائي (PM) بدقة لكل يوم"
                : "Assign exact AM/PM times per day"}
            </span>
          </div>
        </div>

        {/* Segmented Mode Control */}
        <div className="inline-flex p-0.5 rounded-xl bg-slate-200/90 text-[10.5px] font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScheduleMode("mixed")}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
              scheduleMode === "mixed"
                ? "bg-white text-blue-700 shadow-2xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{isArabic ? "مختلط ومخصص لكل يوم" : "Mixed per day"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScheduleMode("uniform");
              handleApplyUniformTime(uniformTime);
            }}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
              scheduleMode === "uniform"
                ? "bg-blue-600 text-white shadow-2xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{isArabic ? "موعد موحد لجميع الأيام" : "Uniform time"}</span>
          </button>
        </div>
      </div>

      {/* Days Selection Chips */}
      <div>
        <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
          {isArabic ? "اختر أيام الحصص:" : "Select Days:"}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {daysList.map(day => {
            const isSelected = scheduleSlots.some(s => s.day === day);
            const slot = scheduleSlots.find(s => s.day === day);
            const isPM = slot ? parseTimeString(slot.time).hour24 >= 12 : false;
            return (
              <button
                type="button"
                key={day}
                onClick={() => handleToggleDay(day)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{day}</span>
                {isSelected && slot?.time && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono flex items-center gap-0.5 ${
                    isPM ? "bg-indigo-900/60 text-indigo-100" : "bg-amber-800/60 text-amber-100"
                  }`}>
                    {isPM ? "🌙" : "☀️"} {formatTime12h(slot.time, isArabic)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uniform Mode Quick Controls */}
      {scheduleMode === "uniform" && (
        <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-slate-800 text-[11px]">
              {isArabic ? "الوقت الموحد لكافة الأيام المختارة:" : "Uniform Time for all days:"}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={uniformTime}
                onChange={e => handleApplyUniformTime(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              />
              
              {/* AM/PM Instant Switcher */}
              <button
                type="button"
                onClick={handleToggleUniformAmPm}
                className={`px-2 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 border ${
                  isUniformPM
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                }`}
                title={isArabic ? "اضغط للتبديل بين صباحاً ومساءً" : "Click to toggle AM/PM"}
              >
                {isUniformPM ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                <span>{isUniformPM ? (isArabic ? "مساءً (PM)" : "PM") : (isArabic ? "صباحاً (AM)" : "AM")}</span>
              </button>

              <span className="font-mono text-blue-700 font-bold text-xs">
                ({formatTime12h(uniformTime, isArabic)})
              </span>
            </div>
          </div>

          {/* Morning & Evening Presets */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                <Sun className="w-3 h-3" /> {isArabic ? "صباحاً:" : "Morning:"}
              </span>
              {QUICK_TIME_PRESETS_MORNING.map(preset => (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => handleApplyUniformTime(preset.value)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    uniformTime === preset.value
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-amber-50/80 text-amber-900 hover:bg-amber-100 border border-amber-200/60"
                  }`}
                >
                  {isArabic ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-0.5">
                <Moon className="w-3 h-3" /> {isArabic ? "مساءً:" : "Evening:"}
              </span>
              {QUICK_TIME_PRESETS_EVENING.map(preset => (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => handleApplyUniformTime(preset.value)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    uniformTime === preset.value
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isArabic ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Uniform Duration Row (100% Freedom - Any duration) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div>
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {isArabic ? "مدة الحصة الموحدة (حرية اختيار كاملة):" : "Uniform Duration (Full Freedom):"}
              </span>
              <span className="text-[9.5px] text-slate-500 block">
                {isArabic ? "اختر أي مدة تناسبك، حتى لو أقل من 30 دقيقة (5، 10، 15، 20...)" : "Any duration allowed (5, 10, 15, 20...)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextDur = Math.max(1, (uniformDuration || 60) - 5);
                    setUniformDuration(nextDur);
                    onChange(scheduleSlots.map(s => ({ ...s, durationMinutes: nextDur })));
                  }}
                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition"
                  title="-5 min"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={uniformDuration || ""}
                  placeholder="60"
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    const dur = isNaN(val) ? 0 : Math.max(1, val);
                    setUniformDuration(dur);
                    if (dur > 0) {
                      onChange(scheduleSlots.map(s => ({ ...s, durationMinutes: dur })));
                    }
                  }}
                  className="w-12 bg-transparent font-black text-slate-900 text-xs focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextDur = Math.min(480, (uniformDuration || 60) + 5);
                    setUniformDuration(nextDur);
                    onChange(scheduleSlots.map(s => ({ ...s, durationMinutes: nextDur })));
                  }}
                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition"
                  title="+5 min"
                >
                  +
                </button>
                <span className="text-[10px] font-bold text-slate-500">{isArabic ? "دقيقة" : "min"}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {[5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map(dur => (
                  <button
                    type="button"
                    key={dur}
                    onClick={() => {
                      setUniformDuration(dur);
                      onChange(scheduleSlots.map(s => ({ ...s, durationMinutes: dur })));
                    }}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition ${
                      uniformDuration === dur
                        ? "bg-blue-600 text-white shadow-2xs font-black"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {dur}{isArabic ? "د" : "m"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mixed Slots List (Per-Day Time Editor) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {isArabic
                ? "قائمة المواعيد المخصصة (اضبط وقت كل يوم صباحاً أو مساءً):"
                : "Custom Schedule Slots (Adjust AM/PM for each day):"}
            </span>
          </label>

          <button
            type="button"
            onClick={handleAddCustomSlot}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] border border-blue-200 transition"
          >
            <Plus className="w-3 h-3" />
            <span>{isArabic ? "+ إضافة موعد آخر" : "+ Add Slot"}</span>
          </button>
        </div>

        <div className="space-y-2">
          {scheduleSlots.map((slot, index) => {
            const parsed = parseTimeString(slot.time);
            const isPM = parsed.hour24 >= 12;

            return (
              <div
                key={`${slot.day}-${index}`}
                className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Day Selector */}
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <select
                      value={slot.day}
                      onChange={e => handleUpdateSlot(index, { day: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {daysList.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time & Duration Controls */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Time input */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <input
                        type="time"
                        required
                        value={slot.time}
                        onChange={e => handleUpdateSlot(index, { time: e.target.value })}
                        className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none"
                      />
                    </div>

                    {/* Instant 1-Click AM / PM Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleSlotAmPm(index)}
                      className={`px-2 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 border shrink-0 ${
                        isPM
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                          : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                      }`}
                      title={isArabic ? "اضغط للتبديل بين صباحاً ومساءً لهذا اليوم" : "Toggle AM/PM"}
                    >
                      {isPM ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      <span>{isPM ? (isArabic ? "م (PM)" : "PM") : (isArabic ? "ص (AM)" : "AM")}</span>
                    </button>

                    {/* Formatted Badge */}
                    <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold shrink-0 ${
                      isPM ? "bg-slate-100 text-indigo-900" : "bg-amber-50 text-amber-900 border border-amber-200/60"
                    }`}>
                      {formatTime12h(slot.time, isArabic)}
                    </span>

                    {/* Duration input */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {isArabic ? "المدة:" : "Dur:"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = slot.durationMinutes || 60;
                          handleUpdateSlot(index, { durationMinutes: Math.max(1, cur - 5) });
                        }}
                        className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] flex items-center justify-center transition"
                        title="-5 min"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="480"
                        step="1"
                        value={slot.durationMinutes || ""}
                        placeholder="60"
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateSlot(index, { durationMinutes: isNaN(val) ? 0 : Math.max(1, val) });
                        }}
                        className="w-10 bg-transparent font-black text-slate-800 text-xs focus:outline-none text-center"
                        title={isArabic ? "مدة الحصة بالدقائق (حرية اختيار كاملة، مثلاً: 15، 20، 30، 45، 60...)" : "Duration in minutes"}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = slot.durationMinutes || 60;
                          handleUpdateSlot(index, { durationMinutes: Math.min(480, cur + 5) });
                        }}
                        className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] flex items-center justify-center transition"
                        title="+5 min"
                      >
                        +
                      </button>
                      <span className="text-[9.5px] font-bold text-slate-400 shrink-0">
                        {isArabic ? "د" : "m"}
                      </span>
                    </div>

                    {/* Quick duration presets for this specific slot */}
                    <div className="hidden sm:flex items-center gap-1">
                      {[15, 20, 25, 30, 45, 60].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleUpdateSlot(index, { durationMinutes: d })}
                          className={`px-1 py-0.5 rounded text-[9px] font-bold transition ${
                            slot.durationMinutes === d
                              ? "bg-blue-600 text-white font-black"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {d}{isArabic ? "د" : "m"}
                        </button>
                      ))}
                    </div>

                    {/* Delete Slot Button */}
                    {scheduleSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        title={isArabic ? "حذف هذا الموعد" : "Remove Slot"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Presets Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-slate-100">
                  <span className="text-[9.5px] font-bold text-amber-700 flex items-center gap-0.5 shrink-0">
                    <Sun className="w-2.5 h-2.5" /> {isArabic ? "صباح:" : "AM:"}
                  </span>
                  {QUICK_TIME_PRESETS_MORNING.map(preset => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => handleUpdateSlot(index, { time: preset.value })}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition shrink-0 ${
                        slot.time === preset.value
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50"
                      }`}
                    >
                      {isArabic ? preset.labelAr : preset.labelEn}
                    </button>
                  ))}

                  <span className="text-[9.5px] font-bold text-indigo-700 flex items-center gap-0.5 shrink-0 ml-1">
                    <Moon className="w-2.5 h-2.5" /> {isArabic ? "مساء:" : "PM:"}
                  </span>
                  {QUICK_TIME_PRESETS_EVENING.map(preset => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => handleUpdateSlot(index, { time: preset.value })}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition shrink-0 ${
                        slot.time === preset.value
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isArabic ? preset.labelAr : preset.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Schedule Summary Tag Strip */}
      <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center gap-2 flex-wrap text-xs">
        <span className="font-black text-blue-900 text-[11px] shrink-0">
          {isArabic ? "ملخص جدول المواعيد:" : "Schedule Summary:"}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {scheduleSlots.map((slot, i) => {
            const isPM = parseTimeString(slot.time).hour24 >= 12;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[10.5px] shadow-2xs"
              >
                <span>📅 {slot.day}</span>
                <span className={`font-mono ${isPM ? "text-indigo-700" : "text-amber-700 font-black"}`}>
                  {isPM ? "🌙" : "☀️"} {formatTime12h(slot.time, isArabic)}
                </span>
                <span className="text-slate-400 font-normal">({slot.durationMinutes || defaultDuration}د)</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
