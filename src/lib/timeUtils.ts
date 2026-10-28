/**
 * GoStars - Time and Reminder Utilities
 * Accurately handles 12h/24h time conversions, AM/PM detection, countdowns, and schedule day normalization
 */

export interface LessonTimeInfo {
  hour24: number;
  minute: number;
  remainingMinutes: number;
  status: "upcoming" | "now" | "past";
  formattedRemainingText: string;
  reminderText: string;
}

/**
 * Standard Day Names in Arabic and English
 */
export const DAYS_OF_WEEK_AR = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة"
];

export const DAYS_OF_WEEK_EN = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday"
];

/**
 * Normalizes day strings across languages and spelling variations
 */
export function normalizeDayName(dayStr: string, isArabic: boolean = true): string {
  if (!dayStr) return isArabic ? "السبت" : "Saturday";
  const clean = dayStr.trim().toLowerCase();

  if (clean.includes("سبت") || clean.includes("sat")) {
    return isArabic ? "السبت" : "Saturday";
  }
  if (clean.includes("أحد") || clean.includes("احد") || clean.includes("sun")) {
    return isArabic ? "الأحد" : "Sunday";
  }
  if (clean.includes("إثنين") || clean.includes("اثنين") || clean.includes("mon")) {
    return isArabic ? "الإثنين" : "Monday";
  }
  if (clean.includes("ثلاثاء") || clean.includes("ثلاث") || clean.includes("tue")) {
    return isArabic ? "الثلاثاء" : "Tuesday";
  }
  if (clean.includes("أربعاء") || clean.includes("اربعاء") || clean.includes("wed")) {
    return isArabic ? "الأربعاء" : "Wednesday";
  }
  if (clean.includes("خميس") || clean.includes("thu")) {
    return isArabic ? "الخميس" : "Thursday";
  }
  if (clean.includes("جمعة") || clean.includes("جمعه") || clean.includes("fri")) {
    return isArabic ? "الجمعة" : "Friday";
  }

  return dayStr.trim();
}

/**
 * Returns today's normalized day name based on current system date
 */
export function getTodayNormalizedDay(isArabic: boolean = true): string {
  const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const enDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return normalizeDayName(enDayNames[jsDay], isArabic);
}

/**
 * Robustly parses time string in ANY format:
 * - 24-hour format: "02:00", "09:30", "14:00", "17:30", "00:00"
 * - 12-hour AM format: "09:00 AM", "9:00 am", "02:00 am", "9:00 ص", "9:00صباحاً", "9 ص", "9am"
 * - 12-hour PM format: "02:00 PM", "2:00 pm", "05:00 pm", "2:00 م", "2:00مساءً", "2 م", "2pm"
 *
 * CRITICAL: If no AM/PM indicator is present, it is strictly parsed as 24-hour time (e.g. 02:00 is 2 AM, 14:00 is 2 PM).
 */
export function parseTimeString(timeStr: string): { hour24: number; minute: number } {
  if (!timeStr) return { hour24: 16, minute: 0 };
  const clean = String(timeStr).trim();
  const lower = clean.toLowerCase();

  // Explicit PM indicators
  const isPM =
    /\bpm\b/i.test(lower) ||
    /p\.m\./i.test(lower) ||
    /\d+pm\b/i.test(lower) ||
    lower.includes("مساءً") ||
    lower.includes("مساء") ||
    lower.includes("ظهراً") ||
    lower.includes("ظهر") ||
    lower.includes("عصراً") ||
    lower.includes("عصر") ||
    lower.includes("ليلاً") ||
    lower.includes("ليل") ||
    /(^|\s)م(\s|$)/.test(clean) ||
    clean.endsWith("م");

  // Explicit AM indicators
  const isAM =
    /\bam\b/i.test(lower) ||
    /a\.m\./i.test(lower) ||
    /\d+am\b/i.test(lower) ||
    lower.includes("صباحاً") ||
    lower.includes("صباح") ||
    lower.includes("فجراً") ||
    lower.includes("فجر") ||
    /(^|\s)ص(\s|$)/.test(clean) ||
    clean.endsWith("ص");

  const match = clean.match(/(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return { hour24: 16, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;

  // Handle explicit 12-hour designations
  if (isPM && !isAM) {
    if (hour < 12) hour += 12;
    else if (hour === 12) hour = 12;
  } else if (isAM && !isPM) {
    if (hour === 12) hour = 0;
    else if (hour > 12) hour = hour % 12;
  }
  // If neither AM nor PM is present, hour is treated strictly as 24-hour input (0..23)

  return {
    hour24: Math.max(0, Math.min(23, hour % 24)),
    minute: Math.max(0, Math.min(59, minute % 60))
  };
}

/**
 * Formats time into 12-hour string (e.g., "09:00 ص" or "02:45 م" or "09:00 AM")
 * Supports either formatTime12h("09:00", true) or formatTime12h(9, 0, true)
 */
export function formatTime12h(
  timeStrOrHour: string | number,
  minuteOrIsAr: number | boolean = true,
  isArabic: boolean = true
): string {
  let hour24 = 0;
  let minute = 0;
  let isAr = true;

  if (typeof timeStrOrHour === "number") {
    hour24 = timeStrOrHour;
    minute = typeof minuteOrIsAr === "number" ? minuteOrIsAr : 0;
    isAr = isArabic;
  } else {
    const parsed = parseTimeString(timeStrOrHour);
    hour24 = parsed.hour24;
    minute = parsed.minute;
    isAr = typeof minuteOrIsAr === "boolean" ? minuteOrIsAr : true;
  }

  const period = hour24 >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  const minStr = String(minute).padStart(2, "0");
  const hStr = String(h12).padStart(2, "0");
  return `${hStr}:${minStr} ${period}`;
}

/**
 * Calculates lesson end time based on start time string and duration in minutes
 * e.g., "09:00 AM" + 60 mins -> "10:00 AM" ("10:00 ص")
 */
export function calculateEndTime(timeStr: string, durationMinutes: number = 60): {
  endHour24: number;
  endMinute: number;
  endTimeFormattedAr: string;
  endTimeFormattedEn: string;
} {
  const { hour24, minute } = parseTimeString(timeStr);
  const totalMin = hour24 * 60 + minute + Math.max(1, durationMinutes);
  const endHour24 = Math.floor(totalMin / 60) % 24;
  const endMinute = totalMin % 60;

  return {
    endHour24,
    endMinute,
    endTimeFormattedAr: formatTime12h(endHour24, endMinute, true),
    endTimeFormattedEn: formatTime12h(endHour24, endMinute, false)
  };
}

/**
 * Formats a full time range (Start Time - End Time) with duration
 * e.g. "09:00 ص - 10:30 ص (90 دقيقة)"
 */
export function formatTimeRange(timeStr: string, durationMinutes: number = 60, isArabic: boolean = true): string {
  if (!timeStr) return isArabic ? "غير محدد" : "Unset";
  const { hour24, minute } = parseTimeString(timeStr);
  const startTime = formatTime12h(hour24, minute, isArabic);
  const { endTimeFormattedAr, endTimeFormattedEn } = calculateEndTime(timeStr, durationMinutes);
  const endTime = isArabic ? endTimeFormattedAr : endTimeFormattedEn;
  const durLabel = isArabic ? `${durationMinutes} دقيقة` : `${durationMinutes} mins`;

  return `${startTime} - ${endTime} (${durLabel})`;
}

/**
 * Calculates remaining minutes for today's session and generates clear reminder format
 */
export function calculateLessonTimeInfo(
  timeStr: string,
  studentName: string,
  subject?: string,
  currentDate: Date = new Date()
): LessonTimeInfo {
  const { hour24, minute } = parseTimeString(timeStr);

  const targetDate = new Date(currentDate);
  targetDate.setHours(hour24, minute, 0, 0);

  const diffMs = targetDate.getTime() - currentDate.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  let status: "upcoming" | "now" | "past" = "upcoming";
  let formattedRemainingText = "";
  let reminderText = "";

  const safeStudentName = studentName?.trim() || "الطالب";
  const formattedStart = formatTime12h(hour24, minute, true);

  if (diffMinutes > 5) {
    status = "upcoming";
    formattedRemainingText = `${diffMinutes} دقيقة`;
    reminderText = `تنبيه بموعد حصة الطالب (${safeStudentName}) الساعة ${formattedStart} (بعد ${diffMinutes} دقيقة)`;
  } else if (diffMinutes >= -15 && diffMinutes <= 5) {
    status = "now";
    formattedRemainingText = `الآن`;
    reminderText = `موعد حصة الطالب (${safeStudentName}) الآن (الساعة ${formattedStart})`;
  } else {
    status = "past";
    const pastMinutes = Math.abs(diffMinutes);
    formattedRemainingText = `بدأت منذ ${pastMinutes} دقيقة`;
    reminderText = `موعد حصة الطالب (${safeStudentName}) كانت الساعة ${formattedStart} (بدأت منذ ${pastMinutes} دقيقة)`;
  }

  return {
    hour24,
    minute,
    remainingMinutes: diffMinutes,
    status,
    formattedRemainingText,
    reminderText
  };
}

/**
 * Generates WhatsApp URL or Group URL with pre-filled message
 */
export function buildWhatsAppUrl(
  phoneOrLink: string | undefined,
  message: string
): { url: string; isDirectLink: boolean } {
  if (!phoneOrLink) {
    return {
      url: `https://wa.me/?text=${encodeURIComponent(message)}`,
      isDirectLink: false
    };
  }

  const clean = phoneOrLink.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return {
      url: clean,
      isDirectLink: true
    };
  }

  let digits = clean.replace(/[^0-9]/g, "");
  if (digits.startsWith("01") && digits.length === 11) {
    digits = "20" + digits.substring(1);
  }

  return {
    url: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
    isDirectLink: false
  };
}

/**
 * Calculates which 24-hour slots (0..23) a session overlaps
 */
export function getOverlappedHours(timeStr: string, durationMinutes: number = 60): number[] {
  const { hour24, minute } = parseTimeString(timeStr);
  const startTotalMin = hour24 * 60 + minute;
  const dur = Math.max(1, durationMinutes);
  const endTotalMin = startTotalMin + dur;

  const overlapped: number[] = [];

  for (let h = 0; h < 24; h++) {
    const slotStart = h * 60;
    const slotEnd = (h + 1) * 60;
    if (startTotalMin < slotEnd && endTotalMin > slotStart) {
      overlapped.push(h);
    }
  }

  if (overlapped.length === 0) {
    overlapped.push(hour24 % 24);
  }

  return overlapped;
}

/**
 * Smart abbreviation for subject names in Arabic & English
 * If the subject name is big (multiple words or long), returns only the first word as requested.
 */
export function abbreviateSubject(subjectStr?: string): string {
  if (!subjectStr) return "";
  const clean = subjectStr.trim();
  if (!clean) return "";

  // Common high-level Arabic subjects that start with "اللغة" or "الدراسات"
  if (clean.includes("اللغة العربية") || clean.includes("اللغه العربيه") || clean === "لغة عربية" || clean === "لغه عربيه") return "عربي";
  if (clean.includes("اللغة الإنجليزية") || clean.includes("اللغة الانجليزية") || clean.includes("اللغه الانجليزيه") || clean === "لغة إنجليزية" || clean === "لغة انجليزية") return "إنجليزي";
  if (clean.includes("اللغة الفرنسية") || clean.includes("اللغه الفرنسيه") || clean === "لغة فرنسية") return "فرنساوي";
  if (clean.includes("اللغة الألمانية") || clean.includes("اللغه الالمانيه") || clean === "لغة ألمانية") return "ألماني";
  if (clean.includes("الدراسات الاجتماعية") || clean.includes("الدراسات الإجتماعية") || clean.includes("دراسات اجتماعية")) return "دراسات";

  const words = clean.split(/\s+/).filter(Boolean);

  // If the subject name is multiple words or long, return only the first word
  if (words.length > 1) {
    if ((words[0] === "اللغة" || words[0] === "اللغه" || words[0] === "لغة" || words[0] === "لغه") && words[1]) {
      return words[1];
    }
    return words[0];
  }

  // If single word and very long (> 12 characters)
  if (clean.length > 12) {
    return clean.slice(0, 11);
  }

  return clean;
}


