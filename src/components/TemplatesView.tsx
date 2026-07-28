import React, { useState } from "react";
import {
  LayoutTemplate,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Copy,
  Sparkles,
  Zap,
  Save,
  X,
  FileText,
  Tag,
  Sliders,
  Check
} from "lucide-react";
import { ReportTemplate, AppSettings } from "../types";

interface TemplatesViewProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  settings,
  onUpdateSettings,
  showNotification
}) => {
  const isArabic = settings.preferredLanguage === "ar";
  const templates = settings.templates || [];
  const activeTemplateId = settings.selectedTemplateId || templates[0]?.id || "";

  // New Template Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "daily" as ReportTemplate["category"],
    headerFormat: "تقرير متابعة - {studentName} - حصة #{sessionNumber}",
    sectionsOrder: "مقدمة والثناء, القرآن والتجويد, اللغة العربية والدراسات, الواجبات والتوصيات, دعاء الختام",
    promptInstructions: "اكتب التقرير بهيكل منظم ومقسم وفقاً للتعليمات المطلوبة مع توضيح أدق التفاصيل."
  });

  const handleSelectActiveTemplate = (id: string) => {
    onUpdateSettings({ selectedTemplateId: id });
    const selected = templates.find(t => t.id === id);
    showNotification(
      isArabic
        ? `تم تعيين قالب "${selected?.name || id}" كقالب افتراضي معتمد للذكاء الاصطناعي!`
        : `Template "${selected?.name || id}" activated for AI report generation!`,
      "success"
    );
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.promptInstructions.trim()) {
      alert(isArabic ? "يرجى كتابة اسم القالب وتوجيهات الذكاء الاصطناعي" : "Please enter template name and AI instructions");
      return;
    }

    const newTemplate: ReportTemplate = {
      id: `tpl_${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim() || (isArabic ? "قالب مخصص للتقارير" : "Custom report template"),
      category: formData.category,
      structure: {
        headerFormat: formData.headerFormat.trim(),
        sectionsOrder: formData.sectionsOrder.split(",").map(s => s.trim()).filter(Boolean),
        placeholders: ["{studentName}", "{date}", "{sessionNumber}", "{subjects}", "{teacherRemarks}"],
        promptInstructions: formData.promptInstructions.trim()
      },
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    onUpdateSettings({
      templates: updatedTemplates,
      selectedTemplateId: settings.selectedTemplateId || newTemplate.id
    });

    setIsAddModalOpen(false);
    setFormData({
      name: "",
      description: "",
      category: "daily",
      headerFormat: "تقرير متابعة - {studentName} - حصة #{sessionNumber}",
      sectionsOrder: "مقدمة والثناء, القرآن والتجويد, اللغة العربية والدراسات, الواجبات والتوصيات, دعاء الختام",
      promptInstructions: "اكتب التقرير بهيكل منظم ومقسم وفقاً للتعليمات المطلوبة مع توضيح أدق التفاصيل."
    });

    showNotification(
      isArabic ? "تم إضافة قالب التقرير الجديد ومزامنتها مع الذكاء الاصطناعي بنجاح!" : "New report template saved and synced!",
      "success"
    );
  };

  const handleSaveEditedTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const updatedTemplates = templates.map(t =>
      t.id === editingTemplate.id ? editingTemplate : t
    );

    onUpdateSettings({ templates: updatedTemplates });
    setEditingTemplate(null);
    showNotification(
      isArabic ? "تم تحديث بيانات القالب ومزامنتها بنجاح!" : "Report template updated successfully!",
      "success"
    );
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (templates.length <= 1) {
      alert(isArabic ? "يجب الإبقاء على قالب واحد على الأقل في النظام" : "You must keep at least one template in the system.");
      return;
    }

    if (confirm(isArabic ? `هل أنت تأكد من حذف القالب "${name}"؟` : `Are you sure you want to delete template "${name}"?`)) {
      const updatedTemplates = templates.filter(t => t.id !== id);
      const newActiveId = activeTemplateId === id ? updatedTemplates[0].id : activeTemplateId;
      onUpdateSettings({
        templates: updatedTemplates,
        selectedTemplateId: newActiveId
      });
      showNotification(
        isArabic ? `تم حذف القالب "${name}" بنجاح` : `Deleted template "${name}" successfully`,
        "info"
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-emerald-400" />
            <span>{isArabic ? "قوالب التقارير والهياكل البنائية (Report Templates)" : "AI Report Templates & Structural Layouts"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic
              ? "إدارة وقوالب وهياكل كتابة التقارير الكاملة مع إمكانية التعديل والحذف والتفعيل التلقائي للذكاء الاصطناعي"
              : "Create, edit, delete, and set active templates used by AI when generating student reports"}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? "إضافة قالب جديد" : "+ Add New Template"}</span>
          </button>
        </div>
      </div>

      {/* Active Selected Template Notice */}
      <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 text-xs shadow-inner">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
          <div>
            <strong className="text-white block font-bold">
              {isArabic ? "القالب النشط حالياً للذكاء الاصطناعي:" : "Current Active AI Template:"}
            </strong>
            <span className="text-emerald-300">
              {templates.find(t => t.id === activeTemplateId)?.name || (isArabic ? "لم يتم تحديد قالب" : "None")}
            </span>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold rounded-lg text-[11px] shrink-0">
          {isArabic ? "يتم استخدامه آلياً في جميع التقارير" : "Auto-applied in all AI generations"}
        </span>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates.map(tpl => {
          const isActive = tpl.id === activeTemplateId;
          return (
            <div
              key={tpl.id}
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between gap-4 transition shadow-lg relative ${
                isActive
                  ? "border-emerald-500 bg-slate-900/90 ring-1 ring-emerald-500/30"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {isActive && (
                <div className="absolute top-4 left-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{isArabic ? "القالب المعتمد" : "ACTIVE TEMPLATE"}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between pr-2">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-teal-300 border border-slate-700">
                      {tpl.category}
                    </span>
                    <h3 className="font-bold text-base text-white pt-1">{tpl.name}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Structure details */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-medium block">{isArabic ? "صيغة العنوان:" : "Header Format:"}</span>
                    <code className="text-emerald-300 font-mono text-[10px]">{tpl.structure.headerFormat}</code>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">{isArabic ? "ترتيب الأقسام الرئيسية:" : "Sections Order:"}</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tpl.structure.sectionsOrder.map((sec, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[10px]">
                          {idx + 1}. {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">{isArabic ? "توجيهات الهيكل للـ AI:" : "AI Prompt Guide:"}</span>
                    <p className="text-slate-300 italic line-clamp-2 pt-0.5">"{tpl.structure.promptInstructions}"</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                {isActive ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{isArabic ? "نشط ومفعل" : "Currently Active"}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleSelectActiveTemplate(tpl.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold border border-emerald-500/40 transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تفعيل كقالب رئيسي" : "Activate Template"}</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTemplate(tpl)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 hover:bg-amber-950/50 transition flex items-center gap-1 text-xs font-bold"
                    title={isArabic ? "تعديل القالب" : "Edit Template"}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isArabic ? "تعديل" : "Edit"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                    title={isArabic ? "حذف القالب" : "Delete Template"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? "إضافة قالب تقارير جديد" : "Add New Report Template"}</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{isArabic ? "اسم القالب *" : "Template Name *"}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isArabic ? "مثال: قالب متابعة سورة البقرة" : "e.g. Surah Al-Baqarah Intensive"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{isArabic ? "الوصف" : "Description"}</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isArabic ? "توضيح مختصر لاستخدام هذا القالب..." : "Brief description of this template's use..."}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "التصنيف" : "Category"}</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="daily">{isArabic ? "يومي (Daily)" : "Daily"}</option>
                    <option value="monthly">{isArabic ? "شهري (Monthly)" : "Monthly"}</option>
                    <option value="memorization">{isArabic ? "حفظ (Memorization)" : "Memorization"}</option>
                    <option value="tajweed_focus">{isArabic ? "تجويد (Tajweed Focus)" : "Tajweed Focus"}</option>
                    <option value="custom">{isArabic ? "مخصص (Custom)" : "Custom"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "صيغة العنوان" : "Header Format"}</label>
                  <input
                    type="text"
                    value={formData.headerFormat}
                    onChange={e => setFormData({ ...formData, headerFormat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isArabic ? "الأقسام الرئيسية (مفصولة بفواصل)" : "Sections Order (Comma separated)"}
                </label>
                <input
                  type="text"
                  value={formData.sectionsOrder}
                  onChange={e => setFormData({ ...formData, sectionsOrder: e.target.value })}
                  placeholder="مقدمة, القرآن والتجويد, الواجبات, الختام"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isArabic ? "تعليمات الهيكل للذكاء الاصطناعي *" : "AI Structural Prompt Instructions *"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.promptInstructions}
                  onChange={e => setFormData({ ...formData, promptInstructions: e.target.value })}
                  placeholder={isArabic ? "التعليمات الواجب على الذكاء الاصطناعي اتباعها عند صياغة التقرير بناءً على هذا القالب..." : "Exact structural instructions for AI when compiling reports using this template..."}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? "حفظ القالب ومزامنة AI" : "Save Template"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>{isArabic ? "تعديل قالب التقارير" : "Edit Report Template"}</span>
              </h2>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{isArabic ? "اسم القالب" : "Template Name"}</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{isArabic ? "الوصف" : "Description"}</label>
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "التصنيف" : "Category"}</label>
                  <select
                    value={editingTemplate.category}
                    onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="memorization">Memorization</option>
                    <option value="tajweed_focus">Tajweed Focus</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{isArabic ? "صيغة العنوان" : "Header Format"}</label>
                  <input
                    type="text"
                    value={editingTemplate.structure.headerFormat}
                    onChange={e => setEditingTemplate({
                      ...editingTemplate,
                      structure: { ...editingTemplate.structure, headerFormat: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isArabic ? "الأقسام الرئيسية (مفصولة بفواصل)" : "Sections Order"}
                </label>
                <input
                  type="text"
                  value={editingTemplate.structure.sectionsOrder.join(", ")}
                  onChange={e => setEditingTemplate({
                    ...editingTemplate,
                    structure: {
                      ...editingTemplate.structure,
                      sectionsOrder: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isArabic ? "تعليمات الهيكل للذكاء الاصطناعي" : "AI Prompt Instructions"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingTemplate.structure.promptInstructions}
                  onChange={e => setEditingTemplate({
                    ...editingTemplate,
                    structure: { ...editingTemplate.structure, promptInstructions: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? "حفظ التعديلات" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
