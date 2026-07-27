import React from "react";
import {
  BookOpen,
  Users,
  PlusCircle,
  FileText,
  Brain,
  Settings,
} from "lucide-react";
import { ActiveTab } from "./Header";
import { AppSettings } from "../types";

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings?: AppSettings;
  pendingReportsCount?: number;
  onStartNewSession: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  settings,
  pendingReportsCount = 0,
  onStartNewSession,
}) => {
  const isArabic = settings?.preferredLanguage === "ar";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "dashboard"
              ? "text-emerald-400 bg-slate-800/80 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isArabic ? "الرئيسية" : "Home"}</span>
        </button>

        {/* Students */}
        <button
          onClick={() => setActiveTab("students")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "students"
              ? "text-emerald-400 bg-slate-800/80 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isArabic ? "الطلاب" : "Students"}</span>
        </button>

        {/* Floating Quick CTA for New Session */}
        <button
          onClick={onStartNewSession}
          className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white p-3 rounded-full shadow-lg shadow-emerald-950/80 border-2 border-slate-900 transition transform active:scale-90"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Reports */}
        <button
          onClick={() => setActiveTab("reports")}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "reports"
              ? "text-emerald-400 bg-slate-800/80 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isArabic ? "التقارير" : "Reports"}</span>
          {pendingReportsCount > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
              {pendingReportsCount}
            </span>
          )}
        </button>

        {/* Memory or Settings */}
        <button
          onClick={() => setActiveTab("memory")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "memory"
              ? "text-emerald-400 bg-slate-800/80 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Brain className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isArabic ? "الذاكرة" : "Memory"}</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "settings"
              ? "text-emerald-400 bg-slate-800/80 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isArabic ? "الإعدادات" : "Settings"}</span>
        </button>
      </div>
    </nav>
  );
};
