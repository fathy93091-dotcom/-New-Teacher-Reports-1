import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  User
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  ShieldCheck,
  Sparkles,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  BookOpen,
  Award,
  Users,
  Brain,
  Zap,
  LayoutDashboard
} from "lucide-react";

interface AuthLandingGateProps {
  onEnterDemo: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthLandingGate: React.FC<AuthLandingGateProps> = ({
  onEnterDemo,
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: fullName.trim()
          });
        }
        onAuthSuccess(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user);
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      let msg = err.message || "فشلت عملية المصادقة";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول بدلاً من ذلك.";
      } else if (err.code === "auth/weak-password") {
        msg = "كلمة المرور ضعيفة (يجب أن تكون 6 أحرف أو أرقام على الأقل)";
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        msg = "طريقة تسجيل الدخول بالبريد الإلكتروني غير مفعّلة في لوحة Firebase الخاصة بك (Firebase Console > Authentication > Sign-in method). يرجى تفعيل Email/Password أو استخدام الدخول السريع.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onAuthSuccess(result.user);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setError("تسجيل الدخول عبر Google غير مفعّل في لوحة Firebase الخاصة بك (Firebase Console > Authentication > Sign-in method). يرجى تفعيل مزوّد Google أو استخدام الدخول السريع.");
      } else {
        setError("فشل تسجيل الدخول بواسطة Google: " + (err.message || ""));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9f6] text-slate-800 flex flex-col justify-between dir-rtl p-4 sm:p-6 md:p-10 font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* Subtle Background Glow Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl"></div>
      </div>

      {/* Top Header / Branding */}
      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-emerald-100 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 border border-emerald-500">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>مساعد المعلم الإسلامي والقرآني DITA</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                v2.5 AI
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              نظام إدارة حلقات التحفيظ والعلوم الشرعية والتقارير الذكية
            </p>
          </div>
        </div>

        <button
          onClick={onEnterDemo}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs transition shadow-2xs hover:scale-102"
        >
          <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>تجربة سريعة الآن (Demo)</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 py-4">
        {/* Left Side: App Feature Highlights & Clean Slate Promise */}
        <div className="flex-1 space-y-6 text-right max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300 text-xs font-black shadow-2xs">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>خاصية مساحة المعلم النظيفة والمستقلة</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
            مساحة عمل خاصة لكل معلم مع حفظ سحابي آمن
          </h2>



          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-2 hover:border-emerald-300 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">إضافة الطلاب وإدارتهم</h3>
              <p className="text-xs text-slate-500 leading-normal">
                سجل بيانات الطلاب، المراحل، وأرقام أولياء الأمور بسهولة.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-2 hover:border-emerald-300 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Brain className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">تقارير الذكاء الاصطناعي</h3>
              <p className="text-xs text-slate-500 leading-normal">
                توليد تقارير يومية وشهرية ذكية ومخصصة لكل طالب بضغطة زر.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-2 hover:border-emerald-300 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">حفظ سحابي ثلاثي</h3>
              <p className="text-xs text-slate-500 leading-normal">
                بياناتك محفوظة سحابياً ومحلياً.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-2 hover:border-emerald-300 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ذاكرة الطالب والتقدم</h3>
              <p className="text-xs text-slate-500 leading-normal">
                تتبع محفوظات وسلوك وملاحظات الطالب على مدار الأشهر.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Teacher Auth Card & Quick Demo Card */}
        <div className="w-full max-w-md space-y-4">
          {/* Main Auth Form Card */}
          <div className="bg-white border border-emerald-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {mode === "login" ? "تسجيل دخول المعلم" : "إنشاء حساب معلم جديد"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {mode === "login"
                      ? "ادخل بحسابك للوصول لطلابك وبياناتك"
                      : "احصل على مساحة خاصة ونظيفة لطلابك"}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Action: Direct Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-slate-50 text-slate-800 font-extrabold text-sm flex items-center justify-center gap-3 transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول السريع عبر Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-bold">
                أو بالبريد الإلكتروني
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  mode === "signup"
                    ? "bg-emerald-600 text-white shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                إنشاء حساب
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {(error.includes("Firebase") || error.includes("operation-not-allowed") || error.includes("Google")) && (
                  <button
                    type="button"
                    onClick={onEnterDemo}
                    className="w-full mt-1 py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>التجاوز والدخول المباشر للمنصة (بدون تسجيل)</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 text-xs">
              {mode === "signup" && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    اسم المعلم / الشيخ الكريم
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="أستاذ أحمد / الشيخ محمد"
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 mt-2"
              >
                {mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>
                  {loading
                    ? "جاري المعالجة..."
                    : mode === "login"
                    ? "تسجيل الدخول"
                    : "إنشاء حساب"}
                </span>
              </button>
            </form>
          </div>

          {/* Quick Demo Button Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border border-emerald-200 rounded-2xl p-5 text-right shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>دخول سريع لتجربة الموقع (Demo)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                بدون تسجيل
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              تريد تجربة الموقع واستكشاف الذكاء الاصطناعي مع طلاب وتقارير جاهزة أمثلة؟ اضغط للبدء فورا.
            </p>
            <button
              onClick={onEnterDemo}
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition group"
            >
              <span>استكشاف وتصفح الموقع بالبيانات التجريبية</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full text-center py-4 border-t border-slate-200 text-slate-500 text-xs mt-8">
        منصة مساعد المعلم الإسلامي والقرآني © {new Date().getFullYear()} - حفظ وإدارة الحلقات بأحدث تقنيات الذكاء الاصطناعي
      </footer>
    </div>
  );
};
