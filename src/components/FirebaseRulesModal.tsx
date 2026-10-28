import React, { useState } from "react";
import { Copy, Check, ExternalLink, ShieldAlert, RefreshCw, X, Database, CheckCircle2 } from "lucide-react";

interface FirebaseRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySync: () => Promise<void> | void;
  isSyncing: boolean;
  isArabic: boolean;
  projectId?: string;
}

export const FIRESTORE_RULES_CONTENT = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // دوال التحقق المساعدة
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && (
        request.auth.token.email == "fathy93091@gmail.com"
      );
    }

    function isOwner(userId) {
      return isSignedIn() && (
        request.auth.uid == userId || isAdmin()
      );
    }

    // وثيقة فحص الاتصال
    match /test/{docId} {
      allow read: if true;
      allow write: if false;
    }

    // مساحة عمل المعلم المستقلة: وصول كامل للبيانات والمجموعات الفرعية لصاحب الحساب فقط
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /{allChildren=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // المجموعات الداعمة
    match /students/{studentId} {
      allow read, write: if isSignedIn();
    }
    match /sessions/{sessionId} {
      allow read, write: if isSignedIn();
    }
    match /dailyReports/{reportId} {
      allow read, write: if isSignedIn();
    }
    match /monthlyReports/{monthlyReportId} {
      allow read, write: if isSignedIn();
    }
    match /studentMemories/{studentMemoryId} {
      allow read, write: if isSignedIn();
    }
    match /settings/{settingsId} {
      allow read, write: if isSignedIn();
    }
  }
}`;

export const FirebaseRulesModal: React.FC<FirebaseRulesModalProps> = ({
  isOpen,
  onClose,
  onRetrySync,
  isSyncing,
  isArabic,
  projectId = "gostars-assistant"
}) => {
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = FIRESTORE_RULES_CONTENT;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTest = async () => {
    setTestStatus("idle");
    try {
      await onRetrySync();
      setTestStatus("success");
    } catch {
      setTestStatus("error");
    }
  };

  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/rules`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isArabic ? "تفعيل قواعد أمان فايربيس (Firestore Rules)" : "Activate Firestore Security Rules"}
              </h2>
              <p className="text-xs text-slate-400">
                {isArabic ? `مشروع فايربيس: ${projectId}` : `Firebase Project: ${projectId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm leading-relaxed space-y-2">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Database className="w-4 h-4 shrink-0" />
              {isArabic
                ? "سبب التنبيه: قواعد الأمان في مشروع فايربيس الخاص بك لم تُنشر بعد"
                : "Notice: Security rules in your Firebase project have not been published yet"}
            </p>
            <p className="text-slate-300 text-xs">
              {isArabic
                ? "رسالة (Missing or insufficient permissions) تعني أن قاعدة بيانات فايربيس ترفض الاتصال لأن قواعد الأمان الافتراضية مغلقة. لحل المشكلة نهائياً، اتبع الخطوات الثلاث البسيطة أدناه:"
                : "The error 'Missing or insufficient permissions' means Firestore is currently locked by default rules. Follow the 3 simple steps below to allow your authenticated account full access:"}
            </p>
          </div>

          {/* 3 Simple Steps */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              {isArabic ? "خطوات الحل السريع (تستغرق دقيقة واحدة):" : "Quick Steps (Takes 1 minute):"}
            </h3>
            <ol className="space-y-2 text-xs sm:text-sm text-slate-300 list-decimal list-inside pr-1">
              <li>
                <span className="font-semibold text-slate-100">
                  {isArabic ? "انسخ القواعد الجاهزة" : "Copy the ready-to-use rules"}
                </span>{" "}
                {isArabic ? "بالضغط على زر 'نسخ القواعد' بالأسفل." : "by clicking the Copy Rules button below."}
              </li>
              <li>
                <span className="font-semibold text-slate-100">
                  {isArabic ? "افتح صفحة القواعد" : "Open the Firebase Rules Console"}
                </span>{" "}
                {isArabic
                  ? "في لوحة تحكم فايربيس بالضغط على زر 'فتح لوحة فايربيس'."
                  : "in your Firebase Console by clicking 'Open Firebase Console'."}
              </li>
              <li>
                <span className="font-semibold text-slate-100">
                  {isArabic ? "الصق القواعد واضغط Publish" : "Paste rules and click Publish"}
                </span>{" "}
                {isArabic
                  ? "استبدل كل ما في المحرر بالقواعد المنسوخة ثم اضغط زر Publish (نشر)."
                  : "replace existing content with the copied rules, then click Publish."}
              </li>
            </ol>
          </div>

          {/* Code Box with Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                {isArabic ? "القواعد الآمنة المجهزة لتطبيقك:" : "Security Rules for your app:"}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (isArabic ? "تم النسخ بنجاح! ✓" : "Copied! ✓") : (isArabic ? "نسخ القواعد" : "Copy Rules")}
              </button>
            </div>
            <div className="relative max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-emerald-400/90 leading-relaxed dir-ltr text-left">
              <pre>{FIRESTORE_RULES_CONTENT}</pre>
            </div>
          </div>

          {/* Direct Link to Firebase Console */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              {isArabic ? "فتح لوحة تحكم قواعد فايربيس ↗" : "Open Firebase Console Rules ↗"}
            </a>
            <button
              type="button"
              onClick={handleTest}
              disabled={isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-sky-400" : ""}`} />
              {isSyncing
                ? (isArabic ? "جاري الاختبار..." : "Testing...")
                : (isArabic ? "إعادة اختبار المزامنة" : "Test & Sync Now")}
            </button>
          </div>

          {/* Test Status feedback */}
          {testStatus === "success" && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                {isArabic
                  ? "تم الاتصال بنجاح ومزامنة البيانات مع السحابة! ☁️"
                  : "Successfully connected and synced data with Firestore! ☁️"}
              </span>
            </div>
          )}
          {testStatus === "error" && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                {isArabic
                  ? "ما زالت القواعد ترفض الاتصال. يرجى التأكد من الضغط على زر Publish في لوحة تحكم فايربيس ثم المحاولة مجدداً."
                  : "Connection still denied. Please ensure you clicked 'Publish' in the Firebase Console and try again."}
              </span>
            </div>
          )}

          {/* Data Safety Assurance */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs leading-relaxed">
            <span className="font-semibold text-slate-300">
              {isArabic ? "💡 اطمئن تماماً:" : "💡 Note:"}
            </span>{" "}
            {isArabic
              ? "جميع الطلاب والبيانات والحصص والتقارير التي تضيفها محفوظة محلياً بنسبة 100% ولن تفقد أي معلومة مهما حدث، وستنتقل إلى السحابة تلقائياً فور تفعيل القواعد."
              : "All your students, lessons, and reports are safely preserved 100% locally and will automatically sync to the cloud once rules are published."}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
