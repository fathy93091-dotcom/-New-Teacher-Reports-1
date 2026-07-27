import React, { useState } from "react";
import {
  Settings,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Globe,
  MessageSquare,
  Shield,
  Save,
  BookOpen
} from "lucide-react";
import { AppSettings, AIRule, SubjectName } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onAddAIRule: (rule: Omit<AIRule, "id">) => void;
  onUpdateAIRule: (id: string, updates: Partial<AIRule>) => void;
  onDeleteAIRule: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onAddAIRule,
  onUpdateAIRule,
  onDeleteAIRule
}) => {
  const isArabic = settings.preferredLanguage === "ar";

  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleInstruction, setNewRuleInstruction] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<AIRule["category"]>("general");
  const [newRuleSubject, setNewRuleSubject] = useState<SubjectName | "">("Holy Qur'an");

  const [closingMessage, setClosingMessage] = useState(settings.defaultClosingMessage);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleInstruction.trim()) return;

    onAddAIRule({
      category: newRuleCategory,
      name: newRuleName.trim(),
      instruction: newRuleInstruction.trim(),
      subject: newRuleCategory === "subject" ? (newRuleSubject as SubjectName) : undefined,
      isActive: true
    });

    setNewRuleName("");
    setNewRuleInstruction("");
  };

  const handleSaveClosingMessage = () => {
    onUpdateSettings({ defaultClosingMessage: closingMessage });
    alert(isArabic ? "تم حفظ الدعاء الختامي الافتراضي بنجاح" : "Default closing message saved.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>{isArabic ? "قواعد الذكاء الاصطناعي وإعدادات النظام" : "Permanent AI Rules & App Settings"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isArabic
            ? "التحكم الكامل في تعليمات الذكاء الاصطناعي الدائمة (SRS Section 5.6)، أسلوب كتابة التقارير، ودعاء الختام"
            : "Define permanent AI rules (SRS 5.6 & 8.10), report formatting tones, and Islamic closing messages"}
        </p>
      </div>

      {/* 1. Permanent AI Rules Engine (SRS 5.6) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {isArabic ? "قواعد الذكاء الاصطناعي الدائمة (AI Rules)" : "Permanent AI Rules Collection (SRS Section 5.6)"}
            </h2>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            {settings.aiRules.filter(r => r.isActive).length} Active Rules
          </span>
        </div>

        {/* Rules Table / Cards */}
        <div className="space-y-3">
          {settings.aiRules.map(rule => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                rule.isActive
                  ? "bg-slate-950 border-emerald-500/30"
                  : "bg-slate-950/50 border-slate-800/80 opacity-60"
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{rule.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-teal-300 border border-slate-700">
                    {rule.category}
                  </span>
                  {rule.subject && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {rule.subject}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{rule.instruction}"
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  onClick={() => onUpdateAIRule(rule.id, { isActive: !rule.isActive })}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 transition hover:bg-slate-800"
                >
                  {rule.isActive ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400">Enabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-slate-500" />
                      <span className="text-slate-500">Disabled</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteAIRule(rule.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Permanent Rule Form */}
        <form onSubmit={handleCreateRule} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
          <span className="font-bold text-slate-200 block">
            {isArabic ? "إضافة قاعدة جديدة للذكاء الاصطناعي" : "+ Add New Permanent AI Rule"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Rule Name</label>
              <input
                type="text"
                required
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                placeholder="e.g. Simple Vocabulary"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={newRuleCategory}
                onChange={e => setNewRuleCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
              >
                <option value="general">General Rule</option>
                <option value="subject">Subject Specific</option>
                <option value="tone">Tone / Style</option>
                <option value="language">Language Requirement</option>
              </select>
            </div>

            {newRuleCategory === "subject" && (
              <div>
                <label className="block text-slate-400 mb-1">Subject</label>
                <select
                  value={newRuleSubject}
                  onChange={e => setNewRuleSubject(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                >
                  <option value="Holy Qur'an">Holy Qur'an</option>
                  <option value="Tajweed">Tajweed</option>
                  <option value="Arabic Language">Arabic Language</option>
                  <option value="Islamic Studies">Islamic Studies</option>
                  <option value="English Language">English Language</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Instruction Text for AI</label>
            <textarea
              rows={2}
              required
              value={newRuleInstruction}
              onChange={e => setNewRuleInstruction(e.target.value)}
              placeholder="Explicit instructions automatically included in all prompt calls..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </form>
      </div>

      {/* 2. Default Islamic Closing Message / Dua (SRS 6.10) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">
            {isArabic ? "الدعاء والرسالة الختامية الافتراضية للتقارير" : "Default Islamic Closing Message (SRS 6.10)"}
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          <label className="block text-slate-300 font-medium">
            {isArabic ? "نص الدعاء الختامي أو رسالة تقدير الوالدين" : "Default Closing Blessing / Dua Text"}
          </label>
          <textarea
            rows={3}
            value={closingMessage}
            onChange={e => setClosingMessage(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 resize-none font-serif leading-relaxed"
          />

          <button
            onClick={handleSaveClosingMessage}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 transition shadow"
          >
            <Save className="w-4 h-4" />
            <span>Save Closing Message</span>
          </button>
        </div>
      </div>

      {/* 3. Formatting & Language Preferences */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg text-xs">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">
            {isArabic ? "تفضيلات التقرير ولغة الواجهة" : "Report Format & UI Language Preferences"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Preferred Language</label>
            <select
              value={settings.preferredLanguage}
              onChange={e => onUpdateSettings({ preferredLanguage: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            >
              <option value="en">English (Default)</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Report Format Style</label>
            <select
              value={settings.reportStyle}
              onChange={e => onUpdateSettings({ reportStyle: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            >
              <option value="detailed">Detailed Sections (SRS Standard)</option>
              <option value="bulleted">Bulleted Bullet Points</option>
              <option value="concise">Concise Paragraph</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
