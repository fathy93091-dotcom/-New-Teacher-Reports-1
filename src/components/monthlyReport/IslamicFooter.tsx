import React from "react";

interface IslamicFooterProps {
  teacherName: string;
  isEn?: boolean;
}

export const IslamicFooter: React.FC<IslamicFooterProps> = ({
  teacherName,
  isEn = false
}) => {
  return (
    <footer className="w-full mt-4 pt-3 border-t border-[#D4AF37]/30 relative" dir={isEn ? "ltr" : "rtl"}>
      {/* Closing Duaa Box - Properly Isolated Bidirectionally */}
      <div className="bg-[#0A3826] text-[#FDF0CD] rounded-2xl p-3 sm:p-4 text-center border-2 border-[#C59B27] shadow-sm mb-3">
        <p className="text-sm sm:text-base md:text-lg font-black font-serif leading-relaxed text-center" dir="rtl" style={{ unicodeBidi: "isolate" }}>
          🤲 نسأل الله العظيم أن يجعل القرآن العظيم ربيع قلوبهم ونور صدورهم، وأن يجعله حجة لهم لا عليهم، وينفع به الطالب وأهله في الدارين 🤲
        </p>
        <p className="text-xs sm:text-sm text-[#D7E3DA] mt-1 font-medium italic text-center" dir={isEn ? "ltr" : "rtl"} style={{ unicodeBidi: "isolate" }}>
          {isEn
            ? '"May Allah make the Noble Qur\'an the spring of their hearts, the light of their chests, and an enduring source of elevation in this life and the hereafter."'
            : '«اللهم اجعل القرآن الكريم أنيساً وشفيعاً ونوراً يهتدي به في كل خطوة»'}
        </p>
      </div>

      {/* Teacher Name in Small Font at the Bottom */}
      {teacherName && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 mb-2 text-center">
          <span className="text-[11px] sm:text-xs text-[#52635A] font-semibold">
            {isEn ? "Teacher Name:" : "اسم المعلم:"}
          </span>
          <span className="text-xs sm:text-sm font-black text-[#0D4733] font-serif" style={{ unicodeBidi: "isolate" }}>
            {teacherName}
          </span>
        </div>
      )}

      {/* Islamic Skyline Minarets Silhouette Vector Decoration (100% Vector SVG) */}
      <div className="w-full flex justify-center opacity-30 overflow-hidden pointer-events-none mt-0.5">
        <svg width="100%" height="24" viewBox="0 0 1000 60" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
          <path
            d="M0 60 H1000 V50 Q980 50 970 40 Q960 20 950 40 Q940 50 920 50 V60 H850 V30 Q840 25 830 30 V60 H750 V45 Q700 15 650 45 V60 H550 V20 Q545 10 540 20 V60 H450 V45 Q400 15 350 45 V60 H250 V30 Q240 25 230 30 V60 H150 V50 Q130 50 120 40 Q110 20 100 40 Q90 50 70 50 V60 Z"
            fill="#0D4733"
          />
          <circle cx="500" cy="8" r="3.5" fill="#C59B27" />
        </svg>
      </div>
    </footer>
  );
};
