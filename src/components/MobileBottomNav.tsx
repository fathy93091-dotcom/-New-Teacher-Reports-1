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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 text-slate-300 px-2 sm:px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="max-w-md sm:max-w-xl mx-auto grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 sm:py-2 px-1 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium"
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span className="text-[10px] sm:text-xs mt-0.5 whitespace-nowrap text-center leading-tight truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
