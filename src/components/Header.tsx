import React from "react";
import { User } from "firebase/auth";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  Brain,
  Settings,
  Code,
  CheckCircle2,
  Globe,
  Bell,
  Search,
  PlusCircle,
  Sparkles,
  LayoutTemplate,
  LogIn,
  ShieldCheck,
  CloudCheck
} from "lucide-react";
import { UserProfile, AppSettings } from "../types";

export type ActiveTab =
  | "dashboard"
  | "students"
  | "sessions"
  | "reports"
  | "memory"
  | "templates"
  | "settings"
  | "apiDocs"
  | "unitTests";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user?: UserProfile;
  authUser?: User | null;
  isDemoMode?: boolean;
  onOpenAuthModal?: () => void;
  onSwitchToAuthLanding?: () => void;
  settings?: AppSettings;
  onLanguageToggle?: (lang: "en" | "ar") => void;
  onOpenQuickSearch?: () => void;
  onStartNewSession?: () => void;
  pendingReportsCount?: number;
}

const defaultUser: UserProfile = {
  id: "u1",
  fullName: "أستاذ أحمد / Sheikh Ahmad",
  email: "teacher@dita.edu",
  title: "Qur'an & Tajweed Instructor",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  createdAt: "2026-01-01",
  lastLogin: new Date().toISOString()
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user = defaultUser,
  authUser,
  isDemoMode,
  onOpenAuthModal,
  onSwitchToAuthLanding,
  settings,
  onLanguageToggle,
  onOpenQuickSearch,
  onStartNewSession,
  pendingReportsCount = 0
}) => {
  const isArabic = settings?.preferredLanguage === "ar";

  const navItems = [
    { id: "dashboard", labelEn: "Dashboard", labelAr: "الرئيسية", icon: BookOpen },
    { id: "students", labelEn: "Students", labelAr: "الطلاب", icon: Users },
    { id: "sessions", labelEn: "Sessions", labelAr: "الحصص", icon: Calendar },
    { id: "reports", labelEn: "Reports", labelAr: "التقارير", icon: FileText, badge: pendingReportsCount },
    { id: "memory", labelEn: "Student Memory", labelAr: "ذاكرة الطالب", icon: Brain },
    { id: "templates", labelEn: "Templates", labelAr: "القوالب", icon: LayoutTemplate },
    { id: "settings", labelEn: "AI Rules & Settings", labelAr: "الإعدادات والقواعد", icon: Settings },
    { id: "apiDocs", labelEn: "API Docs", labelAr: "توثيق APIs", icon: Code },
    { id: "unitTests", labelEn: "Unit Tests", labelAr: "اختبارات النظام", icon: CheckCircle2 },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-emerald-100 sticky top-0 z-30 shadow-xs">
      {/* Top Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-600/20 border border-emerald-400/30">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-emerald-950">DITA</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                SRS v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <button
            onClick={() => onOpenQuickSearch?.()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/60 text-emerald-950 text-xs sm:text-sm border border-emerald-200/80 transition"
            title={isArabic ? "بحث سريع" : "Quick Search"}
          >
            <Search className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline font-medium">{isArabic ? "بحث شامل..." : "Search students, reports..."}</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-white text-emerald-800 font-bold rounded border border-emerald-200">⌘K</kbd>
          </button>

          {/* Start New Session CTA */}
          <button
            onClick={() => onStartNewSession?.()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">{isArabic ? "حصة جديدة" : "New Session"}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageToggle?.(isArabic ? "en" : "ar")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 text-xs border border-emerald-200 transition font-bold shadow-2xs"
            title="Toggle Language / تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-teal-600" />
            <span>{isArabic ? "English" : "العربية"}</span>
          </button>

          {/* Notifications Indicator */}
          <button
            onClick={() => setActiveTab("reports")}
            className="relative p-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-200 transition shadow-2xs"
            title={isArabic ? "التنبيهات" : "Notifications"}
          >
            <Bell className="w-4 h-4 text-emerald-700" />
            {pendingReportsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-amber-500 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {pendingReportsCount}
              </span>
            )}
          </button>

          {/* Firebase Authentication Button / User Profile / Demo Indicator */}
          {authUser ? (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-slate-900 border border-emerald-200 transition shadow-2xs text-xs font-bold"
              title={isArabic ? "إدارة حساب المعلم والنسخ السحابي" : "Manage Teacher Account"}
            >
              <div className="relative">
                <img
                  src={authUser.photoURL || user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                  alt={authUser.displayName || "User"}
                  className="w-7 h-7 rounded-full border-2 border-emerald-600 object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-extrabold text-slate-900 truncate max-w-[110px]">
                  {authUser.displayName || authUser.email?.split("@")[0] || "المعلم"}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <CloudCheck className="w-3 h-3 text-emerald-600 inline" />
                  <span>{isArabic ? "مساحة مسجلة" : "Teacher Cloud"}</span>
                </div>
              </div>
            </button>
          ) : isDemoMode ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{isArabic ? "وضع تجريبي" : "Demo Mode"}</span>
              </span>
              <button
                onClick={onSwitchToAuthLanding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isArabic ? "تسجيل دخول معلم" : "Teacher Login"}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onSwitchToAuthLanding || onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>{isArabic ? "تسجيل الدخول" : "Sign In"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <nav className="bg-emerald-50/40 border-t border-emerald-100/80 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-emerald-600 text-emerald-950 bg-white font-bold shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-emerald-900 hover:bg-emerald-100/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-500"}`} />
                <span>{isArabic ? item.labelAr : item.labelEn}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
