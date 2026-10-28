import React from "react";

interface ProgressRingProps {
  label: string;
  percentage: number;
  color?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  label,
  percentage,
  color = "#C59B27",
  sublabel
}) => {
  const cleanPercentage = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = 38;
  const stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (cleanPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white rounded-2xl border border-[#E2D9C5] shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg height="100%" width="100%" viewBox="0 0 100 100" className="rotate-[-90deg]">
          {/* Background circle */}
          <circle
            stroke="#EFE8D6"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="50"
            cy="50"
          />
          {/* Progress circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="50"
            cy="50"
          />
        </svg>

        {/* Center percentage text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-[#0D4733]">
            {cleanPercentage}%
          </span>
        </div>
      </div>

      {/* Label under ring */}
      <span className="mt-2.5 text-sm sm:text-base font-bold text-[#1C2D24] text-center">
        {label}
      </span>
      {sublabel && (
        <span className="text-[11px] text-[#52635A] text-center mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
};
