/**
 * GoStars - Time and Reminder Utilities
 * Calculates remaining minutes until sessions and formats lesson reminders
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
 * Parses time string (e.g. "04:00 PM", "4:30 م", "16:00", "5 pm", "10:30 ص")
 */
export function parseTimeString(timeStr: string): { hour24: number; minute: number } {
  if (!timeStr) return { hour24: 16, minute: 0 };
  const clean = timeStr.trim().toLowerCase();

  const isPM = clean.includes("pm") || clean.includes("م") || clean.includes("مساءً") || clean.includes("مساء");
  const isAM = clean.includes("am") || clean.includes("ص") || clean.includes("صباحاً") || clean.includes("صباح");

  const match = clean.match(/(\d+)(?::(\d+))?/);
  if (!match) return { hour24: 16, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  if (!isPM && !isAM) {
    if (hour >= 1 && hour <= 7) hour += 12;
  }

  return { hour24: hour % 24, minute: minute % 60 };
}

/**
 * Calculates remaining minutes for today's session and generates the user's requested reminder format:
 * "موعد حصة الطالب (اسم الطالب حسب المسجل في الملف الشخصي) بعد [عدد] دقيقة"
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

  if (diffMinutes > 5) {
    status = "upcoming";
    formattedRemainingText = `${diffMinutes} دقيقة`;
    reminderText = `موعد حصة الطالب (${safeStudentName}) بعد ${diffMinutes} دقيقة`;
  } else if (diffMinutes >= -15 && diffMinutes <= 5) {
    status = "now";
    formattedRemainingText = `الآن`;
    reminderText = `موعد حصة الطالب (${safeStudentName}) الآن`;
  } else {
    status = "past";
    const pastMinutes = Math.abs(diffMinutes);
    formattedRemainingText = `بدأت منذ ${pastMinutes} دقيقة`;
    reminderText = `موعد حصة الطالب (${safeStudentName}) بدأ منذ ${pastMinutes} دقيقة`;
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
