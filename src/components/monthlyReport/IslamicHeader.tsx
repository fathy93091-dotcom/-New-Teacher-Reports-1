import React from "react";

interface IslamicHeaderProps {
  studentName: string;
  monthLabel: string;
  teacherName: string;
  isEn?: boolean;
  reportTitle?: string;
  subtitle?: string;
}

export const IslamicHeader: React.FC<IslamicHeaderProps> = ({
  studentName,
  monthLabel,
  teacherName,
  isEn = false,
  reportTitle,
  subtitle
}) => {
  return (
    <header className="w-full relative overflow-hidden bg-[#0A3826] text-white rounded-3xl border-2 border-[#C59B27] shadow-xl p-5 sm:p-6 md:p-7 mb-3.5">
      {/* Subtle Islamic Geometric Watermark Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#C59B27 1.5px, transparent 1.5px), radial-gradient(#C59B27 1.5px, #0A3826 1.5px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px"
        }}
      />

      {/* Top Row: Left Lantern, Center Emblem & Title, Right Lantern */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Left Golden Vector Lantern */}
        <div className="hidden sm:flex flex-col items-center flex-shrink-0">
          <svg width="38" height="62" viewBox="0 0 50 85" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
            <line x1="25" y1="0" x2="25" y2="18" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="25" cy="18" r="4" fill="#D4AF37" />
            <path d="M12 25 H38 L43 36 H7 L12 25 Z" fill="#C59B27" stroke="#FCE183" strokeWidth="1.5" />
            <rect x="10" y="36" width="30" height="30" rx="3" fill="#FFE899" fillOpacity="0.9" stroke="#C59B27" strokeWidth="2" />
            <circle cx="25" cy="51" r="7" fill="#FFF9DF" />
            <path d="M10 66 L18 80 H32 L40 66 Z" fill="#B48C1A" stroke="#D4AF37" strokeWidth="1.5" />
            <circle cx="25" cy="83" r="2.5" fill="#D4AF37" />
          </svg>
        </div>

        {/* Center: Star Emblem, Title & Quranic Ayah */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-3.5 mb-2">
            <svg width="46" height="46" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" className="drop-shadow-md flex-shrink-0">
              <path
                d="M50 0 L64 21 L85 15 L79 36 L100 50 L79 64 L85 85 L64 79 L50 100 L36 79 L15 85 L21 64 L0 50 L21 36 L15 15 L36 21 Z"
                fill="#C59B27"
                stroke="#FDF3B8"
                strokeWidth="2"
              />
              <circle cx="50" cy="50" r="33" fill="#064E3B" stroke="#D4AF37" strokeWidth="2.5" />
              <path d="M45 28 A 20 20 0 1 0 68 53 A 24 24 0 1 1 45 28 Z" fill="#FEE799" />
              <path d="M34 56 C42 53 48 57 50 63 C52 57 58 53 66 56 V67 C58 64 52 68 50 72 C48 68 42 64 34 67 Z" fill="#FFFFFF" stroke="#C59B27" strokeWidth="1.5" />
            </svg>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#FDF0CD] tracking-normal leading-tight">
                {reportTitle || (isEn ? "MONTHLY LEARNING PROGRESS REPORT" : "تقرير التقدم التعليمي الشهري")}
              </h1>
              <p className="text-sm sm:text-base md:text-lg font-extrabold text-[#E8D08D] tracking-normal mt-0.5">
                {subtitle || (isEn ? "Comprehensive Student Evaluation & Learning Progress" : "تقييم أداء الطالب ومتابعة التقدم التعليمي")}
              </p>
            </div>
          </div>

          {/* Integrated Quranic Ayah Banner */}
          <div className="mt-1.5 px-5 py-1.5 bg-[#042418]/85 border border-[#D4AF37]/50 rounded-full inline-flex items-center gap-2.5 shadow-xs">
            <span className="text-xs sm:text-sm text-[#D4AF37]">✦</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-[#FEE799] font-serif" dir="rtl" style={{ unicodeBidi: "isolate" }}>
              ﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾
            </span>
            <span className="text-xs sm:text-sm text-[#D7E3DA] font-bold">
              {isEn ? "[Surah Taha: 114]" : "[طه: ١١٤]"}
            </span>
            <span className="text-xs sm:text-sm text-[#D4AF37]">✦</span>
          </div>
        </div>

        {/* Right Golden Vector Lantern */}
        <div className="hidden sm:flex flex-col items-center flex-shrink-0">
          <svg width="38" height="62" viewBox="0 0 50 85" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision">
            <line x1="25" y1="0" x2="25" y2="18" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="25" cy="18" r="4" fill="#D4AF37" />
            <path d="M12 25 H38 L43 36 H7 L12 25 Z" fill="#C59B27" stroke="#FCE183" strokeWidth="1.5" />
            <rect x="10" y="36" width="30" height="30" rx="3" fill="#FFE899" fillOpacity="0.9" stroke="#C59B27" strokeWidth="2" />
            <circle cx="25" cy="51" r="7" fill="#FFF9DF" />
            <path d="M10 66 L18 80 H32 L40 66 Z" fill="#B48C1A" stroke="#D4AF37" strokeWidth="1.5" />
            <circle cx="25" cy="83" r="2.5" fill="#D4AF37" />
          </svg>
        </div>
      </div>

      {/* Official Student Metadata Bar (Horizontal 3-column pill layout) */}
      <div className="relative z-10 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/10 backdrop-blur-md border border-[#D4AF37]/35 rounded-2xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between sm:justify-center sm:flex-col px-3 py-1 sm:border-e sm:border-[#D4AF37]/30 text-center gap-0.5">
          <span className="text-xs sm:text-sm uppercase text-[#E8D08D] font-bold">
            {isEn ? "Student Name" : "اسم الطالب"}
          </span>
          <span className="text-base sm:text-lg md:text-xl font-black text-white break-words leading-snug" style={{ unicodeBidi: "isolate" }}>
            {studentName}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-center sm:flex-col px-3 py-1 sm:border-e sm:border-[#D4AF37]/30 text-center gap-0.5">
          <span className="text-xs sm:text-sm uppercase text-[#E8D08D] font-bold">
            {isEn ? "Evaluation Period" : "فترة التقييم"}
          </span>
          <span className="text-base sm:text-lg md:text-xl font-black text-[#FEE799] break-words leading-snug" style={{ unicodeBidi: "isolate" }}>
            {monthLabel}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-center sm:flex-col px-3 py-1 text-center gap-0.5">
          <span className="text-xs sm:text-sm uppercase text-[#E8D08D] font-bold">
            {isEn ? "Teacher Name" : "اسم المعلم"}
          </span>
          <span className="text-base sm:text-lg md:text-xl font-black text-white break-words leading-snug" style={{ unicodeBidi: "isolate" }}>
            {teacherName}
          </span>
        </div>
      </div>
    </header>
  );
};
