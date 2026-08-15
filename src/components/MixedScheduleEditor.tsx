import React, { useState, useEffect } from "react";
import { Clock, Calendar, Plus, Trash2, Check, Sliders } from "lucide-react";
import { ScheduleSlot } from "../types";

interface MixedScheduleEditorProps {
  scheduleSlots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  defaultDuration?: number;
  isArabic?: boolean;
}

const DAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const QUICK_TIME_PRESETS = [
  { labelAr: "03:00 م", labelEn: "03:00 PM", value: "15:00" },
  { labelAr: "04:00 م", labelEn: "04:00 PM", value: "16:00" },
  { labelAr: "05:00 م", labelEn: "05:00 PM", value: "17:00" },
  { labelAr: "06:00 م", labelEn: "06:00 PM", value: "18:00" },
  { labelAr: "07:00 م", labelEn: "07:00 PM", value: "19:00" },
  { labelAr: "08:00 م", labelEn: "08:00 PM", value: "20:00" },
  { labelAr: "09:00 م", labelEn: "09:00 PM", value: "21:00" }
];

export const formatTime12h = (timeStr: string, isAr: boolean = true): string => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const isPm = h >= 12;
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = h.toString().padStart(2, "0");
  if (isAr) {
    return `${hStr}:${m} ${isPm ? "م" : "ص"}`;
  }
  return `${hStr}:${m} ${isPm ? "PM" : "AM"}`;
};

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

  const handleRemoveSlot = (index: number) => {
    if (scheduleSlots.length <= 1) return;
    const next = scheduleSlots.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleAddCustomSlot = () => {
    // Pick the first day not yet chosen, or default to the next day
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
                ? "يمكنك تحديد موعد مختلف لكل يوم (مثل السبت 5 م والأحد 7 م)"
                : "Assign different times per day (e.g. Sat at 5 PM, Sun at 7 PM)"}
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
                ? "bg-blue-600 text-white shadow-2xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3 h-3" />
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
                  <span className="text-[10px] bg-blue-700/80 px-1.5 py-0.2 rounded-md font-mono">
                    {formatTime12h(slot.time, isArabic)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uniform Mode Quick Controls */}
      {scheduleMode === "uniform" && (
        <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-2">
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
              <span className="font-mono text-blue-700 font-bold text-xs">
                ({formatTime12h(uniformTime, isArabic)})
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400">
              {isArabic ? "أوقات سريعة:" : "Presets:"}
            </span>
            {QUICK_TIME_PRESETS.map(preset => (
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
      )}

      {/* Mixed Slots List (Per-Day Time Editor) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {isArabic
                ? "قائمة المواعيد المخصصة (اضبط وقت كل يوم بشكل مستقل):"
                : "Custom Schedule Slots (Adjust time for each day):"}
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
          {scheduleSlots.map((slot, index) => (
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
                    <span className="font-mono text-blue-700 font-bold text-[11px] whitespace-nowrap">
                      {formatTime12h(slot.time, isArabic)}
                    </span>
                  </div>

                  {/* Duration input */}
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {isArabic ? "المدة:" : "Dur:"}
                    </span>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={slot.durationMinutes || defaultDuration}
                      onChange={e =>
                        handleUpdateSlot(index, { durationMinutes: Number(e.target.value) || 60 })
                      }
                      className="w-10 bg-transparent font-bold text-slate-800 text-xs focus:outline-none text-center"
                    />
                    <span className="text-[9.5px] font-bold text-slate-400 shrink-0">
                      {isArabic ? "د" : "m"}
                    </span>
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

              {/* Quick Time Presets Strip for this slot */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-1 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-400 shrink-0">
                  {isArabic ? "اختر بسرعة:" : "Quick:"}
                </span>
                {QUICK_TIME_PRESETS.map(preset => (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => handleUpdateSlot(index, { time: preset.value })}
                    className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition shrink-0 ${
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
          ))}
        </div>
      </div>

      {/* Live Schedule Summary Tag Strip */}
      <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center gap-2 flex-wrap text-xs">
        <span className="font-black text-blue-900 text-[11px] shrink-0">
          {isArabic ? "ملخص جدول المواعيد:" : "Schedule Summary:"}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {scheduleSlots.map((slot, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-[10.5px] shadow-2xs"
            >
              <span>📅 {slot.day}</span>
              <span className="font-mono text-blue-700">⏰ {formatTime12h(slot.time, isArabic)}</span>
              <span className="text-slate-400 font-normal">({slot.durationMinutes || defaultDuration}د)</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
