import React, { useState, useEffect } from "react";
import { Download, Monitor, Smartphone, Check, Share2, X, Laptop } from "lucide-react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose, isArabic }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Handle appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-white relative">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-600/20 via-emerald-600/10 to-transparent pointer-events-none"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 sm:left-auto sm:right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-5 relative z-10">
          {/* Header & Logo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border border-blue-500/40 p-2 shadow-lg flex items-center justify-center shrink-0">
              <img src="/icon-192.svg" alt="GoStars App" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">
                  {isArabic ? "تثبيت تطبيق GoStars" : "Install GoStars App"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isArabic
                  ? "استخدم التطبيق بشكل كامل ومباشر من شاشتك الرئيسية أو سطح المكتب بدون متصفح!"
                  : "Enjoy a dedicated native app experience directly on your mobile home screen or PC desktop."}
              </p>
            </div>
          </div>

          {/* If already installed */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs text-emerald-200 font-semibold">
                {isArabic
                  ? "التطبيق مثبت بالفعل ويعمل كبرنامج مستقل على جهازك بنجاح!"
                  : "GoStars is already installed and running as a standalone app on your device!"}
              </p>
            </div>
          ) : (
            <>
              {/* Native Prompt Trigger if available */}
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5"
                >
                  <Download className="w-5 h-5" />
                  <span>{isArabic ? "تثبيت التطبيق فوراً بنقرة واحدة" : "Install App Now with 1-Click"}</span>
                </button>
              )}

              {/* Step by step installation guides */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  {isArabic ? "طريقة التثبيت حسب جهازك:" : "Installation steps for your device:"}
                </h4>

                {/* 1. Android / Chrome Mobile */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Smartphone className="w-4 h-4" />
                    <span>{isArabic ? "هواتف أندرويد (Google Chrome / Samsung Internet):" : "Android Phones (Chrome):"}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {isArabic
                      ? "اضغط على القائمة (ثلاث نقاط في أعلى المتصفح ⋮) ثم اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق Install App»."
                      : "Tap the menu icon (⋮) at top right, then select 'Add to Home Screen' or 'Install App'."}
                  </p>
                </div>

                {/* 2. iPhone / iPad Safari */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Share2 className="w-4 h-4" />
                    <span>{isArabic ? "هواتف آيفون وآيباد (متصفح Safari):" : "iPhone & iPad (Safari):"}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {isArabic
                      ? "اضغط على زر المشاركة بالأسفل ⎋ ثم مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية Add to Home Screen»."
                      : "Tap the Share button ⎋ at bottom, scroll down and tap 'Add to Home Screen'."}
                  </p>
                </div>

                {/* 3. Windows / Mac Laptop & Desktop */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Laptop className="w-4 h-4" />
                    <span>{isArabic ? "اللابتوب والكمبيوتر (Chrome / Edge):" : "Laptop & Desktop (Chrome/Edge):"}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    {isArabic
                      ? "اضغط على أيقونة التثبيت ⬇️ الموجودة بجانب شريط العنوان أو من قائمة المتصفح اختر «تثبيت GoStars Assistant» ليعمل كبرنامج كامل على سطح المكتب."
                      : "Click the Install icon ⬇️ in the browser address bar or menu, then click 'Install GoStars' to get a dedicated desktop application."}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
