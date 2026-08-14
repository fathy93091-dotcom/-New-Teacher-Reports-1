import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Search,
  Bell,
  Settings,
  HardDriveDownload,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Home,
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  LogOut,
  Globe
} from "lucide-react";
import { AppSettings, Student } from "../types";
import { sanitizeTeacherName } from "../lib/storage";
import { User as FirebaseUser } from "../lib/firebase";

export type NavTab = "home" | "groups" | "students" | "schedule" | "finance";

interface HeaderProps {
  settings: AppSettings;
  students: Student[];
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSettings: () => void;
  onOpenBackupModal: () => void;
  onSearchChange: (query: string) => void;
  activeSearchQuery: string;
  currentUser?: FirebaseUser | null;
  onLogout?: () => void;
  onToggleLanguage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  students,
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenBackupModal,
  onSearchChange,
  activeSearchQuery,
  currentUser,
  onLogout,
  onToggleLanguage
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isArabic = settings.preferredLanguage === "ar";

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigation tabs list
  const navTabs = [
    { id: "home" as NavTab, label: isArabic ? "الرئيسية" : "Home", icon: Home },
    { id: "groups" as NavTab, label: isArabic ? "المجموعات" : "Groups", icon: Users },
    { id: "students" as NavTab, label: isArabic ? "الطلاب" : "Students", icon: GraduationCap },
    { id: "schedule" as NavTab, label: isArabic ? "الجدول" : "Schedule", icon: Calendar },
    { id: "finance" as NavTab, label: isArabic ? "المالية" : "Finance", icon: DollarSign }
  ];

  // Calculate alerts: unpaid students + low balance for package subscriptions (<= 1 lesson left)
  const unpaidStudents = students.filter(s => s.paymentStatus === "unpaid" && s.status === "active");
  const lowBalanceStudents = students.filter(
    s => s.paymentStatus === "paid" && s.subscriptionType === "lessons_count" && s.remainingLessons <= 1 && s.status === "active"
  );
  const alertCount = unpaidStudents.length + lowBalanceStudents.length;

  const teacherDisplayName =
    sanitizeTeacherName(settings.teacherName) ||
    sanitizeTeacherName(currentUser?.displayName || "") ||
    (isArabic ? "معلم المادة" : "Teacher");

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-2">
        {/* TOP MAIN ROW: Brand, Desktop Nav Tabs, Quick Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* 1. Brand Logo & Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base lg:text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent whitespace-nowrap">
                  {isArabic ? "مساعد GoStars" : "GoStars Assistant"}
                </span>
                <span className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 whitespace-nowrap">
                  {isArabic ? "منصة المعلم" : "Teacher Pro"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden 2xl:block leading-none mt-0.5">
                {isArabic ? "نظام إدارة التدريس والتقارير الذكية" : "Teacher Management & AI Reports"}
              </p>
            </div>
          </div>

          {/* 2. DESKTOP & LARGE SCREEN NAVIGATION TABS (Visible on Screens >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shrink-0">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-400/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. DESKTOP SEARCH (Visible on Wide Desktop >= 1280px) */}
          <div className="hidden xl:flex flex-1 max-w-[200px] 2xl:max-w-xs mx-1 relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={activeSearchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={isArabic ? "بحث في المنصة..." : "Search..."}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg pr-8 pl-7 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
            {activeSearchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 4. Action Buttons (Responsive & Clean) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Search Icon Button for screens < 1280px */}
            <button
              type="button"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="xl:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center justify-center shrink-0"
              title={isArabic ? "بحث" : "Search"}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Backup Modal Button - Visible on xl+ */}
            <button
              type="button"
              onClick={onOpenBackupModal}
              title={isArabic ? "النسخ الاحتياطي واسترجاع البيانات" : "Backup & Restore"}
              className="hidden xl:flex h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <HardDriveDownload className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="hidden 2xl:inline">{isArabic ? "نسخة احتياطية" : "Backup"}</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative shrink-0" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition relative flex items-center justify-center shrink-0"
                title={isArabic ? "الإشعارات والتنبيهات" : "Notifications"}
              >
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md border border-slate-900">
                    {alertCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {showNotifications && (
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 sm:p-4 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="font-bold text-xs sm:text-sm">
                        {isArabic ? "التنبيهات والإشعارات" : "Important Alerts"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {alertCount === 0 ? (
                      <div className="text-center py-5 text-slate-400 text-xs">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />
                        {isArabic ? "لا توجد تنبيهات معلقة حالياً" : "All clear! No urgent alerts."}
                      </div>
                    ) : (
                      <>
                        {unpaidStudents.map(s => (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-start gap-2 text-xs"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-rose-200">{s.fullName}</p>
                              <p className="text-slate-300 text-[10px] sm:text-[11px]">
                                {isArabic ? "طالب نشط لم يقم بسداد الرسوم المستحقة" : "Active student with unpaid tuition fees"}
                              </p>
                            </div>
                          </div>
                        ))}

                        {lowBalanceStudents.map(s => (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start gap-2 text-xs"
                          >
                            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-200">{s.fullName}</p>
                              <p className="text-slate-300 text-[10px] sm:text-[11px]">
                                {isArabic
                                  ? `رصيد الحصص المتبقية: ${s.remainingLessons} حصة فقط`
                                  : `Low balance: only ${s.remainingLessons} lesson remaining`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Toggle Button - Visible on xl+ */}
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                title={isArabic ? "تغيير اللغة إلى الإنجليزية" : "Switch Language to Arabic"}
                className="hidden xl:flex h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px]">{isArabic ? "EN" : "عربي"}</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              title={isArabic ? "الإعدادات" : "Settings"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center justify-center shrink-0"
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
            </button>

            {/* Teacher Profile & User Menu */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <div className="flex items-center gap-1.5 ltr:pl-1 rtl:pr-1 sm:ltr:pl-2 sm:rtl:pr-2 border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 focus:outline-none p-0.5 rounded-full hover:ring-2 hover:ring-blue-500/40 transition"
                  title={teacherDisplayName}
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "User Avatar"}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-blue-500/40 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-500/40 shrink-0">
                      <User className="w-3.5 h-3.5 text-white shrink-0" />
                    </div>
                  )}

                  {/* Name only visible on large desktop */}
                  <div className="hidden 2xl:block text-right">
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[100px] leading-tight">
                      {teacherDisplayName}
                    </p>
                  </div>
                </button>

                {/* Direct Logout Button - Visible on xl+ */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title={isArabic ? "تسجيل الخروج" : "Sign Out"}
                    className="hidden xl:flex w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition items-center justify-center shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* User Details Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full ring-2 ring-blue-500/40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-200 truncate">{teacherDisplayName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || (isArabic ? "حساب المعلم" : "Teacher Account")}</p>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition text-right rtl:text-right ltr:text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{isArabic ? "إعدادات الحساب والنظام" : "Settings & Preferences"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenBackupModal();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition text-right rtl:text-right ltr:text-left"
                    >
                      <HardDriveDownload className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{isArabic ? "النسخ الاحتياطي واسترجاع البيانات" : "Backup & Export"}</span>
                    </button>

                    {onToggleLanguage && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onToggleLanguage();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition text-right rtl:text-right ltr:text-left"
                      >
                        <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{isArabic ? "تغيير اللغة (English)" : "Switch Language (العربية)"}</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-950/60 transition text-right rtl:text-right ltr:text-left border-t border-slate-800/80 mt-1 pt-2"
                      >
                        <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{isArabic ? "تسجيل الخروج من الحساب" : "Sign Out"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EXPANDABLE MOBILE SEARCH ROW */}
        {showMobileSearch && (
          <div className="mt-2 pt-2 border-t border-slate-800 xl:hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={activeSearchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={isArabic ? "ابحث عن طالب، مادة، أو مجموعة..." : "Search student, subject, or group..."}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-8 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {activeSearchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

