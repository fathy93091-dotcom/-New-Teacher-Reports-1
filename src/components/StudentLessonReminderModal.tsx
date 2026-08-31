import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  Copy,
  Check,
  X,
  Clock,
  User,
  Users,
  Smartphone,
  MessageSquare,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Student } from "../types";
import { calculateLessonTimeInfo, buildWhatsAppUrl, LessonTimeInfo } from "../lib/timeUtils";

export interface ReminderTargetInfo {
  student: Student;
  sessionTime: string;
  subject?: string;
  groupName?: string;
  type: "group" | "private";
  whatsappGroupLink?: string;
}

interface StudentLessonReminderModalProps {
  target: ReminderTargetInfo | null;
  isArabic?: boolean;
  onClose: () => void;
}

export const StudentLessonReminderModal: React.FC<StudentLessonReminderModalProps> = ({
  target,
  isArabic = true,
  onClose
}) => {
  const [timeInfo, setTimeInfo] = useState<LessonTimeInfo | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState("");

  // Re-calculate remaining minutes every 15 seconds while open
  useEffect(() => {
    if (!target) return;

    const compute = () => {
      const info = calculateLessonTimeInfo(
        target.sessionTime,
        target.student.fullName,
        target.subject
      );
      setTimeInfo(info);
      setCustomMessage(info.reminderText);
    };

    compute();
    const interval = setInterval(compute, 15000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target || !timeInfo) return null;

  const { student, sessionTime, subject, groupName, type, whatsappGroupLink } = target;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = (destination: "parent" | "student" | "group") => {
    let targetPhoneOrLink: string | undefined = undefined;

    if (destination === "parent") {
      targetPhoneOrLink = student.parentContact;
    } else if (destination === "student") {
      targetPhoneOrLink = student.studentPhone || student.parentContact;
    } else if (destination === "group") {
      targetPhoneOrLink = whatsappGroupLink || student.whatsappGroupLink;
    }

    const { url, isDirectLink } = buildWhatsAppUrl(targetPhoneOrLink, customMessage);

    // Also copy to clipboard for convenience
    navigator.clipboard.writeText(customMessage);

    window.open(url, "_blank", "noopener,noreferrer");

    setSendSuccessMsg(
      isArabic
        ? "تم فتح واتساب ونسخ نص التذكير تلقائياً!"
        : "WhatsApp opened & reminder copied to clipboard!"
    );
    setTimeout(() => setSendSuccessMsg(""), 3500);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black shrink-0 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isArabic ? "إرسال تذكير بالحصة" : "Send Lesson Reminder"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  {timeInfo.formattedRemainingText}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {isArabic
                  ? "إشعار وتذكير فوري بموعد الحصة عبر واتساب"
                  : "Instant lesson alert & reminder via WhatsApp"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Target Student Information Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shrink-0">
                {type === "group" ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">{student.fullName}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                  {groupName && <span>👥 {groupName}</span>}
                  {subject && <span>📚 {subject}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold">
                {isArabic ? "موعد الحصة" : "Session Time"}
              </div>
              <div className="font-mono font-black text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                {sessionTime}
              </div>
            </div>
          </div>

          {/* Time Countdown Notice */}
          <div
            className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
              timeInfo.status === "now"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : timeInfo.status === "past"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <div className="flex-1 font-bold text-xs">
              {timeInfo.status === "now" ? (
                <span>⚡ {isArabic ? "حان موعد الحصة الآن!" : "Session starting right now!"}</span>
              ) : timeInfo.status === "past" ? (
                <span>⚠️ {isArabic ? `الحصة بدأت منذ ${Math.abs(timeInfo.remainingMinutes)} دقيقة` : `Session started ${Math.abs(timeInfo.remainingMinutes)} mins ago`}</span>
              ) : (
                <span>⏳ {isArabic ? `متبقي على موعد الحصة: ${timeInfo.remainingMinutes} دقيقة` : `Time remaining: ${timeInfo.remainingMinutes} minutes`}</span>
              )}
            </div>
          </div>

          {/* Message Preview & Edit Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>{isArabic ? "نص رسالة التذكير *" : "Reminder Message Text *"}</span>
              </label>
              <button
                type="button"
                onClick={() => setCustomMessage(timeInfo.reminderText)}
                className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 transition"
              >
                {isArabic ? "إعادة تعيين النص الافتراضي" : "Reset text"}
              </button>
            </div>

            <textarea
              rows={3}
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition leading-relaxed"
            />
          </div>

          {/* Feedback message */}
          {sendSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-center text-xs animate-in fade-in">
              {sendSuccessMsg}
            </div>
          )}

          {/* Action Buttons: WhatsApp Destinations & Copy */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 mb-1">
              {isArabic ? "اختر طريقة ووجهة الإرسال:" : "Choose Send Destination:"}
            </div>

            {/* 1. Parent WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsApp("parent")}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>{isArabic ? "إرسال لواتساب ولي الأمر" : "Send to Parent WhatsApp"}</span>
              </div>
              <span className="font-mono text-[11px] opacity-90 dir-ltr">
                {student.parentContact || "رقم المسجل"}
              </span>
            </button>

            {/* 2. Student WhatsApp (if provided and different) */}
            {student.studentPhone && student.studentPhone !== student.parentContact && (
              <button
                type="button"
                onClick={() => handleSendWhatsApp("student")}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-md shadow-teal-600/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>{isArabic ? "إرسال لرقم هاتف الطالب" : "Send to Student Phone"}</span>
                </div>
                <span className="font-mono text-[11px] opacity-90 dir-ltr">
                  {student.studentPhone}
                </span>
              </button>
            )}

            {/* 3. WhatsApp Group Link (if available) */}
            {(whatsappGroupLink || student.whatsappGroupLink) && (
              <button
                type="button"
                onClick={() => handleSendWhatsApp("group")}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{isArabic ? "إرسال في جروب الواتساب الخاص بالطالب / المجموعة" : "Send to WhatsApp Group"}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}

            {/* 4. Copy Message Text */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">{isArabic ? "تم نسخ نص التذكير بنجاح!" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>{isArabic ? "نسخ نص التذكير فقط" : "Copy Reminder Text"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
