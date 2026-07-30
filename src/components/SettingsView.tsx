import React, { useState } from "react";
import { User } from "firebase/auth";
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
  BookOpen,
  Edit3,
  X,
  Zap,
  Check,
  RefreshCw,
  Database,
  CloudCheck,
  UserCheck,
  LogIn,
  Download,
  Upload,
  ShieldCheck
} from "lucide-react";
import { AppSettings, AIRule, SubjectName } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onAddAIRule: (rule: Omit<AIRule, "id">) => void;
  onUpdateAIRule: (id: string, updates: Partial<AIRule>) => void;
  onDeleteAIRule: (id: string) => void;
  authUser?: User | null;
  onOpenAuthModal?: () => void;
  onSyncAllToFirebase?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onAddAIRule,
  onUpdateAIRule,
  onDeleteAIRule,
  authUser,
  onOpenAuthModal,
  onSyncAllToFirebase,
  onExportBackup,
  onImportBackup
}) => {
  const isArabic = settings.preferredLanguage === "ar";

  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleInstruction, setNewRuleInstruction] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<AIRule["category"]>("general");
  const [newRuleSubject, setNewRuleSubject] = useState<SubjectName | "">("Holy Qur'an");

  // State for rule currently being edited
  const [editingRule, setEditingRule] = useState<AIRule | null>(null);

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

  const handleSaveEditedRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    onUpdateAIRule(editingRule.id, {
      name: editingRule.name.trim(),
      category: editingRule.category,
      subject: editingRule.category === "subject" ? editingRule.subject : undefined,
      instruction: editingRule.instruction.trim(),
      isActive: editingRule.isActive
    });

    setEditingRule(null);
  };

  const handleAddPresetRule = (preset: Omit<AIRule, "id">) => {
    // Check if rule name already exists
    if (settings.aiRules.some(r => r.name === preset.name)) {
      alert(isArabic ? "هذه القاعدة موجودة بالفعل في القائمة" : "This rule already exists in your list.");
      return;
    }
    onAddAIRule(preset);
  };

  const handleDeleteWithConfirm = (id: string, name: string) => {
    if (confirm(isArabic ? `هل أنت متأكد من حذف قاعدة الذكاء الاصطناعي "${name}"؟` : `Are you sure you want to delete AI rule "${name}"?`)) {
      onDeleteAIRule(id);
    }
  };

  const handleSaveClosingMessage = () => {
    onUpdateSettings({ defaultClosingMessage: closingMessage });
  };

  // Preset rules templates
  const PRESET_RULES: Omit<AIRule, "id">[] = [
    {
      name: isArabic ? "بدء التقرير بالثناء والدعاء" : "Start with Islamic Praise",
      category: "general",
      instruction: isArabic
        ? "ابدأ التقرير دائماً بالحمد لله والثناء على اجتهاد الطالب وحرصه على التعلم الشريف."
        : "Always begin the report with Alhamdulillah and praise the student's Islamic effort and dedication.",
      isActive: true
    },
    {
      name: isArabic ? "دقة آيات ومخارج القرآن" : "Qur'an & Tajweed Precision",
      category: "subject",
      subject: "Holy Qur'an",
      instruction: isArabic
        ? "تحديد أسماء السور ورقم الآيات وأحكام التجويد (كالإخفاء والإدغام والماد) بدقة في النقاط المخصصة."
        : "Specify exact Surah names, verse numbers, and Tajweed rule corrections in clear bullet points.",
      isActive: true
    },
    {
      name: isArabic ? "أسلوب مشجع وإيجابي" : "Encouraging Parental Tone",
      category: "tone",
      instruction: isArabic
        ? "استخدام لغة دافئة ومحفزة للوالدين تبرز نقاط القوة قبل ذكر الجوانب التي تحتاج إلى مراجعة."
        : "Use warm, encouraging tone highlighting strengths before mentioning review areas.",
      isActive: true
    },
    {
      name: isArabic ? "تبسيط المصطلحات للأطفال" : "Simplified Terms for Young Students",
      category: "general",
      instruction: isArabic
        ? "صياغة الملاحظات بألفاظ ميسرة ومباشرة تناسب الفئات العمرية المبكرة."
        : "Use simplified, clear phrasing suitable for young learners and busy parents.",
      isActive: true
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Firebase Cloud Connection Card */}
      <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>{isArabic ? "حالة ربط Firebase وحفظ البيانات" : "Firebase Auth & Firestore Database"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                  <CloudCheck className="w-3 h-3 text-emerald-600" />
                  <span>Firestore Active</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isArabic
                  ? "يتم حفظ وربط بيانات الطلاب والتقارير والحصص تلقائياً على قاعدة بيانات Firebase Firestore"
                  : "Student records, daily reports, and sessions are synced with Firebase Firestore."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSyncAllToFirebase}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isArabic ? "مزامنة سحابية الآن" : "Sync All to Firebase"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
          {authUser ? (
            <div className="flex items-center gap-3">
              <img
                src={authUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-emerald-600 object-cover"
              />
              <div>
                <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{authUser.displayName || (isArabic ? "معلم مُسجّل الدخول" : "Authenticated Teacher")}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">{authUser.email}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600 font-medium">
              {isArabic ? "لم تقم بتسجيل الدخول بعد. يمكنك تسجيل الدخول لربط حسابك بالسحابة." : "Not signed in. Log in to associate records with your teacher account."}
            </div>
          )}

          <button
            onClick={onOpenAuthModal}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>{authUser ? (isArabic ? "إدارة الحساب / الخروج" : "Manage Account") : (isArabic ? "تسجيل الدخول / إنشاء حساب" : "Login / Create Account")}</span>
          </button>
        </div>
      </div>

      {/* Backup & Version Upgrade Data Protection Card */}
      <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {isArabic ? "تأمين الحفظ والبيانات عند تحديث التطبيق" : "Data Protection Across App Updates"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800 text-emerald-200 border border-emerald-700">
                  {isArabic ? "محفوظ ثلاثياً" : "Triple Preserved"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                {isArabic
                  ? "جميع بيانات الطلاب، الحصص، التقارير، القواعد وإعداداتك تتم مزامنتها وحفظها تلقائياً على التخزين المحلي، سيرفر التطبيق، وسحابة Firebase حتى لا تضيع عند تحديث التطبيق لإصدار جديد."
                  : "All student profiles, sessions, daily reports, AI rules, and settings are auto-saved across browser storage, server database, and Firebase Cloud so nothing is lost when updating the app."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onExportBackup && (
              <button
                onClick={onExportBackup}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>{isArabic ? "تصدير نسخة احتياطية (JSON)" : "Export Backup"}</span>
              </button>
            )}

            {onImportBackup && (
              <label className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 font-extrabold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition">
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>{isArabic ? "استعادة نسخة احتياطية" : "Restore Backup"}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportBackup(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Header with AI Sync Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 border border-emerald-700 p-6 rounded-2xl shadow-md text-white">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-300" />
            <span>{isArabic ? "قواعد الذكاء الاصطناعي وإعدادات النظام" : "Permanent AI Rules & App Settings"}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-white text-xs font-bold self-start sm:self-center">
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>{isArabic ? "المزامنة اللحظية مع AI مفعلة" : "Real-time AI Sync Active"}</span>
        </div>
      </div>

      {/* 1. Permanent AI Rules Engine */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {isArabic ? "قواعد وتعليمات الذكاء الاصطناعي الدائمة" : "Permanent AI Instructions & Rules"}
            </h2>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            {settings.aiRules.filter(r => r.isActive).length} / {settings.aiRules.length} {isArabic ? "قاعدة مفعلة" : "Rules Active"}
          </span>
        </div>

        {/* Preset Rule Quick Templates */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
              {isArabic ? "نماذج قواعد جاهزة (اضغط للإضافة السريعة):" : "Quick Preset Rule Templates (Click to Add):"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {PRESET_RULES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddPresetRule(preset)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-left text-xs transition flex items-center justify-between group shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition block">
                    + {preset.name}
                  </span>
                  <p className="text-[10px] text-slate-500 line-clamp-1 font-medium">{preset.instruction}</p>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Existing Rules List */}
        <div className="space-y-3">
          {settings.aiRules.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs font-medium">
              {isArabic ? "لا توجد قواعد مسجلة حالياً. استخدم النموذج أدناه لإضافة أول قاعدة." : "No AI rules registered yet. Add your first rule below."}
            </div>
          ) : (
            settings.aiRules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  rule.isActive
                    ? "bg-slate-50 border-emerald-200"
                    : "bg-slate-100 border-slate-200 opacity-60"
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-teal-50 text-teal-900 border border-teal-200">
                      {rule.category}
                    </span>
                    {rule.subject && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        {rule.subject}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic font-medium">
                    "{rule.instruction}"
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onUpdateAIRule(rule.id, { isActive: !rule.isActive })}
                    className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50"
                    title={rule.isActive ? (isArabic ? "تعطيل القاعدة" : "Disable Rule") : (isArabic ? "تفعيل القاعدة" : "Enable Rule")}
                  >
                    {rule.isActive ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-700">{isArabic ? "مفعلة" : "Active"}</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-400">{isArabic ? "معطلة" : "Disabled"}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setEditingRule(rule)}
                    className="p-1.5 rounded-lg bg-white text-amber-800 border border-slate-200 hover:bg-amber-50 transition flex items-center gap-1 text-xs font-bold px-2"
                    title={isArabic ? "تعديل القاعدة" : "Edit Rule"}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isArabic ? "تعديل" : "Edit"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteWithConfirm(rule.id, rule.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title={isArabic ? "حذف القاعدة" : "Delete Rule"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Permanent Rule Form */}
        <form onSubmit={handleCreateRule} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <span className="font-bold text-slate-900 block text-sm">
            {isArabic ? "+ إضافة قاعدة/تعليمات جديدة للذكاء الاصطناعي" : "+ Add New AI Rule & Instruction"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">{isArabic ? "اسم القاعدة" : "Rule Name"}</label>
              <input
                type="text"
                required
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                placeholder={isArabic ? "مثال: تبسيط المصطلحات" : "e.g. Simple Vocabulary"}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">{isArabic ? "التصنيف" : "Category"}</label>
              <select
                value={newRuleCategory}
                onChange={e => setNewRuleCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none"
              >
                <option value="general">{isArabic ? "قاعدة عامة (General)" : "General Rule"}</option>
                <option value="subject">{isArabic ? "خاصة بمادة معينة (Subject Specific)" : "Subject Specific"}</option>
                <option value="tone">{isArabic ? "أسلوب ونبرة الكتابة (Tone / Style)" : "Tone / Style"}</option>
                <option value="language">{isArabic ? "اشتراطات اللغات (Language Requirement)" : "Language Requirement"}</option>
              </select>
            </div>

            {newRuleCategory === "subject" && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">{isArabic ? "المادة" : "Subject"}</label>
                <select
                  value={newRuleSubject}
                  onChange={e => setNewRuleSubject(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none"
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
            <label className="block text-slate-700 font-bold mb-1">{isArabic ? "نص التعليمات الموجهة للذكاء الاصطناعي" : "Instruction Text for AI"}</label>
            <textarea
              rows={2}
              required
              value={newRuleInstruction}
              onChange={e => setNewRuleInstruction(e.target.value)}
              placeholder={isArabic ? "اكتب التعليمات المباشرة التي سيلتزم بها الذكاء الاصطناعي عند كتابة التقارير..." : "Explicit instructions automatically included in all prompt calls..."}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? "حفظ القاعدة ومزامنتها فوراً" : "Save Rule & Sync Immediately"}</span>
          </button>
        </form>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>{isArabic ? "تعديل قاعدة الذكاء الاصطناعي" : "Edit Permanent AI Rule"}</span>
              </h3>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{isArabic ? "اسم القاعدة" : "Rule Name"}</label>
                <input
                  type="text"
                  required
                  value={editingRule.name}
                  onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{isArabic ? "التصنيف" : "Category"}</label>
                  <select
                    value={editingRule.category}
                    onChange={e => setEditingRule({ ...editingRule, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="subject">Subject</option>
                    <option value="tone">Tone / Style</option>
                    <option value="language">Language</option>
                  </select>
                </div>

                {editingRule.category === "subject" && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{isArabic ? "المادة" : "Subject"}</label>
                    <select
                      value={editingRule.subject || "Holy Qur'an"}
                      onChange={e => setEditingRule({ ...editingRule, subject: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
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
                <label className="block text-slate-700 font-bold mb-1">{isArabic ? "تعليمات القاعدة للذكاء الاصطناعي" : "Instruction Text"}</label>
                <textarea
                  rows={3}
                  required
                  value={editingRule.instruction}
                  onChange={e => setEditingRule({ ...editingRule, instruction: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-emerald-600 resize-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? "حفظ التعديلات" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Default Islamic Closing Message / Dua */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <MessageSquare className="w-5 h-5 text-teal-700" />
          <h2 className="text-base font-bold text-slate-900">
            {isArabic ? "الدعاء والرسالة الختامية الافتراضية للتقارير" : "Default Islamic Closing Message (SRS 6.10)"}
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          <label className="block text-slate-700 font-bold">
            {isArabic ? "نص الدعاء الختامي أو رسالة تقدير الوالدين" : "Default Closing Blessing / Dua Text"}
          </label>
          <textarea
            rows={3}
            value={closingMessage}
            onChange={e => setClosingMessage(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-emerald-600 resize-none font-serif leading-relaxed font-bold"
          />

          <button
            onClick={handleSaveClosingMessage}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 transition shadow"
          >
            <Save className="w-4 h-4" />
            <span>{isArabic ? "حفظ الرسالة الختامية" : "Save Closing Message"}</span>
          </button>
        </div>
      </div>

      {/* 3. Formatting & Language Preferences */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-4 shadow-xs text-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Sliders className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-slate-900">
            {isArabic ? "تفضيلات التقرير ولغة الواجهة" : "Report Format & UI Language Preferences"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1">{isArabic ? "لغة الواجهة والتقارير الافتراضية" : "Preferred Language"}</label>
            <select
              value={settings.preferredLanguage}
              onChange={e => onUpdateSettings({ preferredLanguage: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none"
            >
              <option value="ar">العربية (Arabic - Default)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">{isArabic ? "نمط صيغة التقرير" : "Report Format Style"}</label>
            <select
              value={settings.reportStyle}
              onChange={e => onUpdateSettings({ reportStyle: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none"
            >
              <option value="detailed">{isArabic ? "أقسام مفصلة (Detailed Sections)" : "Detailed Sections"}</option>
              <option value="bulleted">{isArabic ? "نقاط مختصرة (Bulleted List)" : "Bulleted Bullet Points"}</option>
              <option value="concise">{isArabic ? "فقرة مدمجة (Concise Paragraph)" : "Concise Paragraph"}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

