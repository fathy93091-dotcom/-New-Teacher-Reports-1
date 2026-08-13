import React from "react";
import { Home, Users, GraduationCap, Calendar, DollarSign } from "lucide-react";

export type NavTab = "home" | "groups" | "students" | "schedule" | "finance";

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isArabic: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  isArabic
}) => {
  const tabs = [
    {
      id: "home" as NavTab,
      label: isArabic ? "الرئيسية" : "Home",
      icon: Home
    },
    {
      id: "groups" as NavTab,
      label: isArabic ? "المجموعات" : "Groups",
      icon: Users
    },
    {
      id: "students" as NavTab,
      label: isArabic ? "الطلاب" : "Students",
      icon: GraduationCap
    },
    {
      id: "schedule" as NavTab,
      label: isArabic ? "الجدول" : "Schedule",
      icon: Calendar
    },
    {
      id: "finance" as NavTab,
      label: isArabic ? "المالية" : "Finance",
      icon: DollarSign
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-300 px-1 sm:px-2 py-1.5 shadow-2xl">
      <div className="max-w-xl mx-auto flex items-center justify-between sm:justify-around gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center px-1 sm:px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "text-white animate-pulse" : ""}`} />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5 truncate max-w-[60px] sm:max-w-none text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
