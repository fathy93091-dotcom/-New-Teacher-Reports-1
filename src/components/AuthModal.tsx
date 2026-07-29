import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  X,
  LogIn,
  UserPlus,
  LogOut,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  CloudCheck,
  AlertCircle
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isArabic: boolean;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isArabic,
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        if (onAuthSuccess) onAuthSuccess(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (onAuthSuccess) onAuthSuccess(userCredential.user);
      }
      onClose();
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      let msg = err.message || "Authentication failed";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        msg = isArabic ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = isArabic ? "البريد الإلكتروني مستخدم بالفعل" : "Email is already registered.";
      } else if (err.code === "auth/weak-password") {
        msg = isArabic ? "كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)" : "Password should be at least 6 characters.";
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
      if (onAuthSuccess) onAuthSuccess(result.user);
      onClose();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut(auth);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-emerald-100 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition p-1 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {currentUser
                ? isArabic
                  ? "حساب معلم الخطة والحفظ"
                  : "Teacher Account Profile"
                : isArabic
                ? "تسجيل الدخول - Firebase Auth"
                : "Sign In / Register - Firebase Auth"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser
                ? isArabic
                  ? "مُسجّل حالياً ببيانات الاعتماد السحابية"
                  : "Authenticated & Synced with Firebase Cloud"
                : isArabic
                ? "سجّل دخولك لحفظ واسترجاع البيانات بأمان من السحابة"
                : "Login to save & sync students and reports securely"}
            </p>
          </div>
        </div>

        {/* Display Current User Info if Logged In */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentUser.photoURL ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                  }
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-emerald-600 object-cover shadow-2xs"
                />
                <div className="overflow-hidden">
                  <div className="font-extrabold text-sm text-slate-900 truncate">
                    {currentUser.displayName || (isArabic ? "معلم إسلامي" : "Islamic Teacher")}
                  </div>
                  <div className="text-xs text-slate-600 truncate font-mono">{currentUser.email}</div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold mt-1 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    <CloudCheck className="w-3 h-3 text-emerald-600" />
                    <span>Firebase Auth Active</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <span>UID:</span>
                <span className="truncate max-w-[200px] font-bold text-slate-700">{currentUser.uid}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>{isArabic ? "تسجيل الخروج" : "Sign Out"}</span>
            </button>
          </div>
        ) : (
          /* Authentication Form */
          <div className="space-y-4">
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
                    ? "bg-white text-emerald-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {isArabic ? "تسجيل الدخول" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  mode === "signup"
                    ? "bg-white text-emerald-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {isArabic ? "حساب جديد" : "Create Account"}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
              {mode === "signup" && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isArabic ? "اسم المعلم الكامل" : "Teacher Full Name"}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder={isArabic ? "أستاذ أحمد / Sheikh Ahmad" : "Sheikh Ahmad"}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isArabic ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isArabic ? "كلمة المرور" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 mt-2"
              >
                {mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>
                  {loading
                    ? isArabic
                      ? "جاري المعالجة..."
                      : "Processing..."
                    : mode === "login"
                    ? isArabic
                      ? "تسجيل الدخول"
                      : "Sign In"
                    : isArabic
                    ? "إنشاء حساب معلم جديد"
                    : "Create Teacher Account"}
                </span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-bold uppercase">
                {isArabic ? "أو عبر" : "OR"}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>{isArabic ? "تسجيل الدخول عبر Google" : "Continue with Google"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
