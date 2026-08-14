import React, { useState } from "react";
import { Sparkles, Shield, Cloud, BookOpen, AlertCircle, ArrowLeft } from "lucide-react";
import { signInWithGoogle } from "../lib/firebase";

interface LoginViewProps {
  isArabic?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ isArabic = true }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setErrorMsg(isArabic ? "تم إغلاق نافذة تسجيل الدخول قبل الإكمال." : "Sign-in popup was closed before completion.");
      } else if (err?.code === "auth/popup-blocked") {
        setErrorMsg(isArabic ? "تم حظر المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح." : "Popup blocked by browser. Please allow popups.");
      } else if (err?.code === "auth/unauthorized-domain") {
        setErrorMsg(
          isArabic
            ? "النطاق (Domain) غير مضاف في Firebase. يرجى إضافة رابط Vercel الخاص بك في Firebase Console > Authentication > Settings > Authorized domains."
            : "Domain not authorized. Please add your Vercel domain to Firebase Console > Authentication > Settings > Authorized domains."
        );
      } else {
        setErrorMsg(
          isArabic
            ? `تعذر تسجيل الدخول (${err?.code || "خطأ غير معروف"}). تأكد من إضافة نطاق Vercel في Firebase Authorized Domains.`
            : `Failed to sign in (${err?.code || "Unknown error"}). Ensure your Vercel domain is in Firebase Authorized Domains.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans dir-rtl">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 ring-1 ring-white/20">
            <Sparkles className="w-9 h-9 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
              {isArabic ? "مساعد GoStars" : "GoStars Assistant"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              {isArabic ? "منصة المعلم لإدارة الطلاب والتقارير الذكية" : "Teacher Pro Management & AI Reports"}
            </p>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl text-center space-y-1.5">
          <p className="text-xs sm:text-sm font-bold text-slate-200">
            {isArabic ? "مساحة عمل خاصة ومنفصلة لكل معلم 🔒" : "Private Isolated Teacher Workspace 🔒"}
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isArabic
              ? "سجّل الدخول بحساب Google للوصول إلى بياناتك وتعليماتك الخاصة فقط. لن يتمكن أي مستخدم آخر من رؤية أو تعديل طلابك أو تقاريرك إطلاقاً."
              : "Sign in with your Google account to access your strictly isolated workspace. No other user can see your students, custom instructions, or reports."}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Login Action Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm sm:text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-white/10 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-700">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
              <span>{isArabic ? "جاري الاتصال بـ Google..." : "Connecting to Google..."}</span>
            </div>
          ) : (
            <>
              {/* Google SVG Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.23v3.15C3.21 21.32 7.32 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.23C.44 8.15 0 9.99 0 12s.44 3.85 1.23 5.42l4.05-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.21 2.68 1.23 6.58l4.05 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isArabic ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}</span>
            </>
          )}
        </button>

        {/* Features List */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <Cloud className="w-4 h-4 text-sky-400 mx-auto" />
            <p className="text-[10px] text-slate-300 font-bold">{isArabic ? "مزامنة سحابية" : "Cloud Sync"}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <Shield className="w-4 h-4 text-emerald-400 mx-auto" />
            <p className="text-[10px] text-slate-300 font-bold">{isArabic ? "حماية وحفظ" : "Secure Auth"}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <Sparkles className="w-4 h-4 text-amber-400 mx-auto" />
            <p className="text-[10px] text-slate-300 font-bold">{isArabic ? "تقارير ذكية" : "AI Reports"}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-6 relative z-10 text-center">
        GoStars © {new Date().getFullYear()} — {isArabic ? "جميع الحقوق محفوظة" : "All rights reserved"}
      </p>
    </div>
  );
};
