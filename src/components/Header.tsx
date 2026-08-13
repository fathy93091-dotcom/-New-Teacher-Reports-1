import React, { useState } from "react";
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
  const isArabic = settings.preferredLanguage === "ar";

  // Navigation tabs list moved to Header (مقدمة الموقع)
  const navTabs = [
    { id: "home" as NavTab, label: isArabic ? "الرئيسية" : "Home", icon: Home },
    { id: "groups" as NavTab, label: isArabic ? "المجموعات" : "Groups", icon: Users },
    { id: "students" as NavTab, label: isArabic ? "الطلاب" : "Students", icon: GraduationCap },
    { id: "schedule" as NavTab, label: isArabic ? "الجدول" : "Schedule", icon: Calendar },
    { id: "finance" as NavTab, label: isArabic ? "المالية" : "Finance", icon: DollarSign }
  ];

  // Calculate alerts: unpaid students + low balance (< 2 lessons)
  const unpaidStudents = students.filter(s => s.paymentStatus === "unpaid" && s.status === "active");
  const lowBalanceStudents = students.filter(
    s => s.paymentStatus === "paid" && s.remainingLessons <= 1 && s.status === "active"
  );
  const alertCount = unpaidStudents.length + lowBalanceStudents.length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-2">
        {/* TOP MAIN ROW: Brand, Desktop Nav Tabs, Quick Actions */}
        <div className="flex items-center justify-between gap-1 sm:gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
                  GoStars
                </span>
                <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {isArabic ? "منصة المعلم" : "Teacher Pro"}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 hidden sm:block">
                {isArabic ? "نظام إدارة التدريس والمتابعة التعليمية" : "Teacher Management System"}
              </p>
            </div>
          </div>

          {/* DESKTOP CENTER NAVIGATION TABS */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40 scale-[1.02]"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Search Bar */}
          <div className="hidden xl:flex flex-1 max-w-xs mx-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={activeSearchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={isArabic ? "بحث في المنصة..." : "Search..."}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pr-9 pl-7 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
            {activeSearchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Actions: Backup, Notifications, Settings, User Avatar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="xl:hidden p-1.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center justify-center shrink-0"
              title={isArabic ? "بحث" : "Search"}
            >
              <Search className="w-4 h-4 text-slate-300" />
            </button>

            {/* Backup Button */}
            <button
              onClick={onOpenBackupModal}
              title={isArabic ? "النسخ الاحتياطي واسترجاع البيانات" : "Backup & Restore"}
              className="p-1.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <HardDriveDownload className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? "نسخة احتياطية" : "Backup"}</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition relative flex items-center justify-center"
                title={isArabic ? "الإشعارات والتنبيهات" : "Notifications"}
              >
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md border border-slate-900">
                    {alertCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 sm:p-4 text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="font-bold text-xs sm:text-sm">
                        {isArabic ? "التنبيهات والإشعارات" : "Important Alerts"}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {alertCount === 0 ? (
                      <div className="text-center py-5 text-slate-400 text-xs">
                        <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-400" />
                        {isArabic ? "لا توجد تنبيهات معلقة حالياً" : "All clear! No urgent alerts."}
                      </div>
                    ) : (
                      <>
                        {unpaidStudents.map(s => (
                          <div
                            key={s.id}
                            className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2 text-xs"
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
                            className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2 text-xs"
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

            {/* Language Toggle Button */}
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                title={isArabic ? "تغيير اللغة إلى الإنجليزية" : "Switch Language to Arabic"}
                className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
                <span>{isArabic ? "English" : "العربية"}</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              title={isArabic ? "الإعدادات" : "Settings"}
              className="p-1.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center justify-center shrink-0"
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
            </button>

            {/* Teacher Profile & Google User Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2 border-r border-slate-800 shrink-0">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User Avatar"}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full ring-2 ring-blue-500/30 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-500/30 shrink-0">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                </div>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {sanitizeTeacherName(settings.teacherName) || sanitizeTeacherName(currentUser?.displayName || "") || (isArabic ? "معلم المادة" : "Teacher")}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {currentUser?.email || (isArabic ? "المعلم" : "Teacher")}
                </p>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title={isArabic ? "تسجيل الخروج من Google" : "Sign Out"}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition flex items-center justify-center shrink-0 ml-1"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* EXPANDABLE MOBILE SEARCH ROW */}
        {showMobileSearch && (
          <div className="mt-2 pt-2 border-t border-slate-800 xl:hidden">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={activeSearchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={isArabic ? "ابحث عن طالب، مادة، أو مجموعة..." : "Search student, subject, or group..."}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {activeSearchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* MOBILE & TABLET TOP NAVIGATION BAR */}
        <nav className="lg:hidden mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-5 gap-1 w-full">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="text-[10px] mt-1 whitespace-nowrap text-center leading-none truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
