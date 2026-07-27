import React from "react";
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
  Sparkles
} from "lucide-react";
import { UserProfile, AppSettings } from "../types";

export type ActiveTab =
  | "dashboard"
  | "students"
  | "sessions"
  | "reports"
  | "memory"
  | "settings"
  | "apiDocs"
  | "unitTests";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user?: UserProfile;
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
    { id: "settings", labelEn: "AI Rules & Settings", labelAr: "الإعدادات والقواعد", icon: Settings },
    { id: "apiDocs", labelEn: "API Docs", labelAr: "توثيق APIs", icon: Code },
    { id: "unitTests", labelEn: "Unit Tests", labelAr: "اختبارات النظام", icon: CheckCircle2 },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
            <Sparkles className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-emerald-100">DITA</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                SRS v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {isArabic ? "مساعد المعلم الإسلامي اليومي الذكي" : "Daily Islamic Teacher Assistant"}
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <button
            onClick={() => onOpenQuickSearch?.()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm border border-slate-700 transition"
            title={isArabic ? "بحث سريع" : "Quick Search"}
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">{isArabic ? "بحث شامل..." : "Search students, reports..."}</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-slate-900 text-slate-400 rounded border border-slate-700">⌘K</kbd>
          </button>

          {/* Start New Session CTA */}
          <button
            onClick={() => onStartNewSession?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-900/30 transition transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "حصة جديدة" : "New Session"}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageToggle?.(isArabic ? "en" : "ar")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
            title="Toggle Language / تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-teal-400" />
            <span className="font-semibold">{isArabic ? "English" : "العربية"}</span>
          </button>

          {/* Notifications Indicator */}
          <button
            onClick={() => setActiveTab("reports")}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={isArabic ? "التنبيهات" : "Notifications"}
          >
            <Bell className="w-4 h-4" />
            {pendingReportsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>

          {/* Teacher Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <img
              src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
              alt={user?.fullName || "Teacher"}
              className="w-8 h-8 rounded-full border border-emerald-500 object-cover"
            />
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-slate-200">{user?.fullName || "Sheikh Ahmad"}</div>
              <div className="text-[10px] text-emerald-400 truncate max-w-[120px]">{user?.title || "Quran Teacher"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <nav className="bg-slate-950 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-emerald-500 text-emerald-400 bg-slate-900/80 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{isArabic ? item.labelAr : item.labelEn}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
