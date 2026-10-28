import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Zap,
  GraduationCap,
  FileText,
  Wand2
} from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export type RoleMode = "pedagogical_advisor" | "report_assistant" | "prompt_tuner" | "lesson_planner";

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic?: boolean;
  defaultCustomInstruction?: string;
}

const STORAGE_KEY = "gostars_ai_chat_history";

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  isArabic = true,
  defaultCustomInstruction = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [
      {
        id: "welcome-1",
        role: "model",
        content: isArabic
          ? "أهلاً بك يا أستاذنا الفاضل! 👋\nأنا مساعدك الذكي في GoStars. كيف يمكنني مساعدتك اليوم؟\n\n💡 يمكنك استشارتي في:\n- صياغة وتدقيق تقارير الطلاب.\n- ضبط وتصميم تعليمات وبرومبت الذكاء الاصطناعي بدقة تامة.\n- تخطيط مقررات الحفظ والمراجعة وتوزيع الدروس.\n- حلول تربوية وتوجيهات للتعامل مع مستويات الطلاب المختلفة."
          : "Welcome! 👋\nI am your GoStars AI Assistant. How can I assist you today?\n\n💡 You can ask me to:\n- Draft and refine student lesson reports.\n- Build precise AI custom instructions & templates.\n- Plan memorization, revision, and curriculum schedules.\n- Provide pedagogical guidance for varied student needs.",
        timestamp: new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [roleMode, setRoleMode] = useState<RoleMode>("pedagogical_advisor");
  const [modelChoice, setModelChoice] = useState<string>("gemini-3.8-flash");
  const [showSettings, setShowSettings] = useState(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState(defaultCustomInstruction);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const quickPrompts = isArabic
    ? [
        {
          label: "🎯 ضبط البرومبت لمنع التكرار",
          prompt: "اكتب لي نص تعليمات دقيق ومحكم أضعه في خانة 'تعليمات الذكاء الاصطناعي' يمنع الذكاء الاصطناعي من تكرار السور في الحفظ والمراجعة، ويمنعه من اختلاق أي تفاصيل لم أكتبها."
        },
        {
          label: "📜 قالب تقرير قرآني نموذجي",
          prompt: "اقترح لي قالباً تربوياً متكاملاً وأنيقاً لتقرير حصة القرآن الكريم (يشمل: الترويسة، ما تم إنجازه، التقييم، الواجب والتوصية) لأعتمده في تقاريري."
        },
        {
          label: "🌟 رسالة تحفيزية لطالب",
          prompt: "صغ لي رسالة تشجيعية دافئة وملهمة لطالب متميز أتم حفظ جزء جديد من القرآن الكريم ببراعة وإتقان."
        },
        {
          label: "📅 خطة تثبيت ومراجعة",
          prompt: "كيف أضع خطة مراجعة تراكمية منتظمة لطالب يحفظ ربع حزب في كل حصة لضمان عدم نسيان المحفوظ السابق؟"
        }
      ]
    : [
        {
          label: "🎯 Anti-Hallucination Prompt",
          prompt: "Write a strict, concise instruction block for AI report generation that prevents inventing facts and strictly enforces my custom template."
        },
        {
          label: "📜 Quran Report Template",
          prompt: "Suggest a well-structured, professional template for Quranic lesson reports including header, new memorization, revision, and recommendations."
        },
        {
          label: "🌟 Student Praise Message",
          prompt: "Draft an encouraging and inspiring praise message to parents for a student who demonstrated exceptional performance in today's class."
        },
        {
          label: "📅 Revision Plan",
          prompt: "How can I set up a cumulative revision schedule for a student who completes 1 page per session to prevent forgetting?"
        }
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-u",
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: modelChoice,
          systemInstruction: customSystemInstruction,
          roleMode: roleMode
        })
      });

      const data = await response.json();
      if (!response.ok || !data || !data.success || !data.text) {
        throw new Error(data?.details || data?.error || "فشل الاتصال بمساعد الذكاء الاصطناعي");
      }

      const modelMsg: ChatMessage = {
        id: "msg-" + Date.now() + "-m",
        role: "model",
        content: data.text,
        timestamp: new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errorText = err?.message || String(err);
      const errorMsg: ChatMessage = {
        id: "msg-err-" + Date.now(),
        role: "model",
        content: isArabic
          ? `⚠️ عذراً، حدث خطأ أثناء معالجة الطلب:\n${errorText}`
          : `⚠️ Sorry, an error occurred while processing your request:\n${errorText}`,
        timestamp: new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = () => {
    const initial: ChatMessage[] = [
      {
        id: "welcome-new",
        role: "model",
        content: isArabic
          ? "تم بدء محادثة جديدة. كيف يمكنني مساعدتك الآن؟ 🌟"
          : "Started a fresh conversation. How may I assist you now? 🌟",
        timestamp: new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
      }
    ];
    setMessages(initial);
    localStorage.removeItem(STORAGE_KEY);
    setShowClearConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      id="gostars-ai-chat-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl h-[92vh] max-h-[820px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  <span>{isArabic ? "المساعد الذكي للمعلم" : "Teacher AI Assistant"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Gemini
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {isArabic ? "استشارات تربوية، ضبط البرومبت، وتوليد التقارير" : "Pedagogical advice, prompt tuning & reports"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ai-chat-toggle-settings"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                showSettings
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
              title={isArabic ? "إعدادات الدور والنموذج" : "Settings & Roles"}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "الإعدادات والدور" : "Roles"}</span>
              {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              id="ai-chat-clear-history"
              onClick={handleClearHistory}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition cursor-pointer"
              title={isArabic ? "مسح سجل المحادثة" : "Clear History"}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              id="ai-chat-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              title={isArabic ? "إغلاق" : "Close"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showClearConfirm && (
          <div className="p-3.5 bg-rose-950/90 border-b border-rose-800 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <p className="font-black">
              {isArabic ? "⚠️ هل أنت متأكد من مسح سجل المحادثة بالكامل؟" : "⚠️ Are you sure you want to clear the conversation history?"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmClearHistory}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer shadow-xs"
              >
                {isArabic ? "نعم، مسح السجل" : "Yes, Clear History"}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Settings Drawer */}
        {showSettings && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 text-xs flex flex-col gap-3.5 shrink-0 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Role Mode */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isArabic ? "🎯 تخصص ودور المساعد:" : "🎯 Assistant Role:"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "pedagogical_advisor", labelAr: "مستشار تربوي", labelEn: "Pedagogy", icon: GraduationCap },
                    { id: "prompt_tuner", labelAr: "خبير البرومبت", labelEn: "Prompt Tuner", icon: Wand2 },
                    { id: "report_assistant", labelAr: "مساعد التقارير", labelEn: "Reports", icon: FileText },
                    { id: "lesson_planner", labelAr: "تخطيط المناهج", labelEn: "Lesson Planner", icon: Zap }
                  ].map(r => {
                    const Icon = r.icon;
                    const isSelected = roleMode === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoleMode(r.id as RoleMode)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-right transition cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-500 text-purple-200 font-bold shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                        <span className="truncate">{isArabic ? r.labelAr : r.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Choice */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {isArabic ? "⚡ نموذج الذكاء الاصطناعي:" : "⚡ AI Model Engine:"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", desc: "الأذكى للأوامر الدقيقة" },
                    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", desc: "سريع ومتزن" },
                    { id: "gemini-3.1-flash-lite", label: "Flash Lite", desc: "فائق السرعة" }
                  ].map(m => {
                    const isSelected = modelChoice === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModelChoice(m.id)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col justify-center items-center ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{m.label}</span>
                        <span className="text-[9px] text-slate-400 line-clamp-1">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Instruction Box */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {isArabic ? "📝 تعليمات وتفضيلات إضافية مخصصة للمساعد:" : "📝 Custom System Directives:"}
              </label>
              <textarea
                value={customSystemInstruction}
                onChange={e => setCustomSystemInstruction(e.target.value)}
                rows={2}
                placeholder={
                  isArabic
                    ? "مثال: تحدث معي بلغة عربية فصحى موجزة، وركز على منهج حلقات تحفيظ القرآن الكريم..."
                    : "e.g., Focus on Quranic tutoring methodologies and concise bulleted steps..."
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/40">
          {messages.map(msg => {
            const isModel = msg.role === "model";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isModel ? (isArabic ? "mr-0 ml-auto" : "ml-0 mr-auto") : isArabic ? "ml-0 mr-auto" : "mr-0 ml-auto"
                } flex-row${isModel ? "" : "-reverse"}`}
              >
                {isModel ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20 mt-1">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                    <GraduationCap className="w-4 h-4 text-slate-200" />
                  </div>
                )}

                <div
                  className={`relative group rounded-2xl p-4 shadow-sm ${
                    isModel
                      ? "bg-slate-800/90 border border-slate-700/70 text-slate-200"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/10"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{msg.content}</div>

                  <div className="flex items-center justify-between gap-3 mt-2.5 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {isModel && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="opacity-80 hover:opacity-100 flex items-center gap-1 text-slate-300 hover:text-white transition cursor-pointer"
                        title={isArabic ? "نسخ النص" : "Copy text"}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{isArabic ? "تم النسخ" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isArabic ? "نسخ" : "Copy"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className={`flex gap-3 max-w-[85%] ${isArabic ? "mr-0 ml-auto" : "ml-0 mr-auto"}`}>
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>{isArabic ? "جاري التفكير وصياغة الرد التربوي الدقيق..." : "Thinking and generating response..."}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 overflow-x-auto shrink-0 flex items-center gap-2 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-bold text-purple-300 shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{isArabic ? "اقتراحات سريعة:" : "Quick Suggestions:"}</span>
          </div>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSendMessage(qp.prompt)}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-full px-3 py-1 shrink-0 transition cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-purple-500/80 transition">
            <textarea
              ref={inputRef}
              id="ai-chat-input-textarea"
              rows={1}
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isArabic
                  ? "اكتب سؤالك أو استفسارك التربوي هنا... (اضغط Enter للإرسال، Shift+Enter لسطر جديد)"
                  : "Type your message or prompt here... (Press Enter to send)"
              }
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 p-2 focus:outline-none resize-none max-h-32 min-h-[38px]"
            />
            <button
              id="ai-chat-send-btn"
              disabled={!inputMessage.trim() || isLoading}
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md shadow-purple-600/30"
              title={isArabic ? "إرسال" : "Send"}
            >
              <Send className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
