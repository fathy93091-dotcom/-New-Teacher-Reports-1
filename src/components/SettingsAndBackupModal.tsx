import React, { useState } from "react";
import {
  Settings,
  HardDriveDownload,
  HardDriveUpload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  BookOpen,
  Plus
} from "lucide-react";
import { AppSettings, GoStarsBackupData, SubjectAiInstruction } from "../types";
import { sanitizeTeacherName } from "../lib/storage";

interface SettingsAndBackupModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  onExportBackup: () => GoStarsBackupData;
  onRestoreBackup: (data: GoStarsBackupData) => boolean;
}

export const SettingsAndBackupModal: React.FC<SettingsAndBackupModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSettings,
  onExportBackup,
  onRestoreBackup
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"general" | "ai" | "backup">("general");
  const [teacherName, setTeacherName] = useState(sanitizeTeacherName(settings.teacherName));
  const [subject, setSubject] = useState(settings.defaultSubject || "");
  const [lang, setLang] = useState<"ar" | "en">(settings.preferredLanguage || "ar");
  const [generalAiInstructions, setGeneralAiInstructions] = useState(
    settings.generalAiInstructions || "اكتب تقريراً احترافياً ومشجعاً لولي الأمر، ابدأ بنقطة إيجابية، ثم وضح ما يحتاج الطالب إلى تحسينه، وأنهِ التقرير بتوصية قصيرة."
  );

  const [subjectDefaults, setSubjectDefaults] = useState<SubjectAiInstruction[]>(
    settings.subjectDefaults || []
  );

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectInstruction, setNewSubjectInstruction] = useState("");

  const [importStatus, setImportStatus] = useState<string | null>(null);

  const isArabic = lang === "ar";

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings({
      ...settings,
      teacherName,
      defaultSubject: subject,
      preferredLanguage: lang,
      generalAiInstructions,
      subjectDefaults
    });
    onClose();
  };

  const handleAddSubjectInstruction = () => {
    if (!newSubjectName.trim() || !newSubjectInstruction.trim()) return;
    const existsIndex = subjectDefaults.findIndex(
      s => s.subject.trim().toLowerCase() === newSubjectName.trim().toLowerCase()
    );
    if (existsIndex >= 0) {
      setSubjectDefaults(prev => {
        const copy = [...prev];
        copy[existsIndex] = { ...copy[existsIndex], instruction: newSubjectInstruction.trim() };
        return copy;
      });
    } else {
      setSubjectDefaults(prev => [
        ...prev,
        { subject: newSubjectName.trim(), instruction: newSubjectInstruction.trim() }
      ]);
    }
    setNewSubjectName("");
    setNewSubjectInstruction("");
  };

  const handleUpdateSubjectInstruction = (index: number, newInstruction: string) => {
    setSubjectDefaults(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], instruction: newInstruction };
      return copy;
    });
  };

  const handleDeleteSubjectInstruction = (index: number) => {
    setSubjectDefaults(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadBackup = () => {
    const data = onExportBackup();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split("T")[0];

    const a = document.createElement("a");
    a.href = url;
    a.download = `GoStars_Backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = onRestoreBackup(json);
        if (success) {
          setImportStatus(isArabic ? "تمت استعادة النسخة الاحتياطية بنجاح!" : "Backup restored successfully!");
        } else {
          setImportStatus(isArabic ? "فشل استعادة النسخة، الملف غير صالح." : "Invalid backup file format.");
        }
      } catch (err) {
        setImportStatus(isArabic ? "خطأ أثناء قراءة الملف." : "Error reading JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {isArabic ? "إعدادات النظام والذكاء الاصطناعي" : "System & AI Settings"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl my-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2 px-2 rounded-xl transition text-center ${
              activeTab === "general" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
            }`}
          >
            ⚙️ {isArabic ? "الإعدادات العامة" : "General"}
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-2 rounded-xl transition text-center ${
              activeTab === "ai" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            🤖 {isArabic ? "تعليمات المادة (AI)" : "AI Prompts"}
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`py-2 px-2 rounded-xl transition text-center ${
              activeTab === "backup" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
            }`}
          >
            💾 {isArabic ? "النسخ الاحتياطي" : "Backup"}
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isArabic ? "اسم المعلم / الأستاذ" : "Teacher Name"}
              </label>
              <input
                type="text"
                placeholder={isArabic ? "أدخل اسم المعلم (اختياري)..." : "Teacher Name (Optional)..."}
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isArabic ? "المادة الأساسية" : "Primary Subject"}
              </label>
              <input
                type="text"
                placeholder={isArabic ? "أدخل المادة الأساسية (اختياري)..." : "Primary Subject (Optional)..."}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isArabic ? "اللغة المفضلة للنظام" : "System Language"}
              </label>
              <select
                value={lang}
                onChange={e => setLang(e.target.value as "ar" | "en")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold"
              >
                <option value="ar">العربية (Arabic)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
              >
                {isArabic ? "حفظ التغييرات" : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: AI Subject Instructions */}
        {activeTab === "ai" && (
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-1">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{isArabic ? "تخصيص تعليمات الذكاء الاصطناعي لكل مادة" : "AI Prompts Per Subject"}</span>
              </div>
              <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                {isArabic
                  ? "قم بكتابة حقل تعليمات مخصص لكل مادة. عند إعداد تقرير حصة لمادة معينة (كالفيزياء أو الرياضيات)، سيعتمد الذكاء الاصطناعي تلقائياً على تعليمات هذه المادة."
                  : "Set custom AI prompts for each subject. When generating a report for a lesson, AI will automatically use the instructions for that subject."}
              </p>
            </div>

            {/* General Fallback Instruction */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>🤖 {isArabic ? "التعليمات العامة (الافتراضية لجميع المواد)" : "General Default AI Instruction"}</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {generalAiInstructions.length} / 8000 {isArabic ? "حرف" : "chars"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isArabic ? "تُستخدم إذا لم تكن هناك تعليمات مخصصة للمادة (تتسع حتى 8000 حرف)." : "Used as fallback if no subject-specific instruction is set (up to 8000 chars)."}
              </p>
              <textarea
                rows={3}
                maxLength={8000}
                value={generalAiInstructions}
                onChange={e => setGeneralAiInstructions(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            {/* Subject Specific Fields */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>📚 {isArabic ? "تعليمات المواد المخصصة (حتى 8000 حرف لكل مادة)" : "Subject-Specific Instructions (up to 8000 chars)"}</span>
                <span className="text-[10px] font-normal text-slate-500">
                  ({subjectDefaults.length} {isArabic ? "مواد معرفة" : "subjects defined"})
                </span>
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {subjectDefaults.map((sub, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center gap-1">
                        📚 {sub.subject}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {sub.instruction.length} / 8000 {isArabic ? "حرف" : "chars"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubjectInstruction(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition"
                          title={isArabic ? "حذف المادة" : "Delete subject"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={4}
                        maxLength={8000}
                        value={sub.instruction}
                        onChange={e => handleUpdateSubjectInstruction(idx, e.target.value)}
                        placeholder={isArabic ? `اكتب تعليمات الذكاء الاصطناعي لمادة ${sub.subject} (حتى 8000 حرف)...` : `Instructions for ${sub.subject} (up to 8000 chars)...`}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Subject Instruction Form */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-200/60 rounded-2xl space-y-2">
              <h4 className="font-bold text-indigo-950 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>{isArabic ? "إضافة تعليمات لمادة جديدة" : "Add Instruction for New Subject"}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {newSubjectInstruction.length} / 8000 {isArabic ? "حرف" : "chars"}
                </span>
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder={isArabic ? "اسم المادة (مثال: الكيمياء)" : "Subject name (e.g. Chemistry)"}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
                />
                <textarea
                  rows={3}
                  maxLength={8000}
                  value={newSubjectInstruction}
                  onChange={e => setNewSubjectInstruction(e.target.value)}
                  placeholder={isArabic ? "تعليمات المادة للذكاء الاصطناعي (تتحمل حتى 8000 حرف)..." : "AI prompt instructions (up to 8000 characters)..."}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed font-sans"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSubjectInstruction}
                  disabled={!newSubjectName.trim() || !newSubjectInstruction.trim()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? "إضافة المادة" : "Add Subject"}</span>
                </button>
              </div>
            </div>

            {/* Save All Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isArabic ? "حفظ تعليمات الذكاء الاصطناعي" : "Save AI Instructions"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Backup & Restore */}
        {activeTab === "backup" && (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-blue-600" />
                <span>{isArabic ? "تصدير نسخة احتياطية من البيانات" : "Export Full Backup JSON"}</span>
              </h3>
              <p className="text-slate-600 text-[11px]">
                {isArabic
                  ? "احفظ جميع الطلاب، المجموعات، سجلات الحضور والمالية في ملف واحد محلي على جهازك."
                  : "Download all students, groups, attendance, and finance data into a single JSON backup file."}
              </p>
              <button
                onClick={handleDownloadBackup}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-2"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>{isArabic ? "تنزيل نسخة احتياطية JSON" : "Download Backup File"}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
              <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                <HardDriveUpload className="w-4 h-4 text-indigo-600" />
                <span>{isArabic ? "استرجاع نسخة احتياطية من ملف" : "Restore From Backup JSON"}</span>
              </h3>
              <p className="text-slate-600 text-[11px]">
                {isArabic
                  ? "قم برفع ملف النسخة الاحتياطية لاستعادة بياناتك في أي وقت."
                  : "Upload a previously exported JSON backup file to restore system state."}
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-slate-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />

              {importStatus && (
                <p className="font-bold text-indigo-700 text-xs mt-2">{importStatus}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
