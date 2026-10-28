import type { ParsedTwoPageReportData } from "./reportExportUtils";
import { isCleanValue } from "./monthlyReportModel";

// Top Center Star Crest SVG (Rub el Hizb 8-pointed star with crescent, star & Quran)
export const starEmblemSvg = `
  <svg viewBox="0 0 100 100" style="width: 58px; height: 58px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 8-pointed star (outer gold) -->
    <polygon points="50,2 62,38 98,50 62,62 50,98 38,62 2,50 38,38" fill="url(#goldGrad)" stroke="#B45309" stroke-width="1.5"/>
    <!-- Inner star facets -->
    <polygon points="50,9 60,40 91,50 60,60 50,91 40,60 9,50 40,40" fill="#D97706" opacity="0.35"/>
    <!-- Dark green center disc -->
    <circle cx="50" cy="50" r="27" fill="#064E3B" stroke="#FDE68A" stroke-width="2.5"/>
    <!-- Crescent moon -->
    <path d="M46 33 C 55 36, 55 58, 46 65 C 57 61, 57 37, 46 33 Z" fill="#FDE68A" />
    <!-- Star in crescent -->
    <polygon points="50,38 52,43 57,43 53,46 54,51 50,48 46,51 47,46 43,43 48,43" fill="#FEF08A" />
    <!-- Open Holy Quran on stand -->
    <path d="M38 54 Q 46 50, 50 54 L 50 64 Q 46 60, 38 64 Z" fill="#FFFFFF" opacity="0.95"/>
    <path d="M62 54 Q 54 50, 50 54 L 50 64 Q 54 60, 62 64 Z" fill="#FFFFFF" opacity="0.95"/>
    <line x1="50" y1="52" x2="50" y2="65" stroke="#D97706" stroke-width="1.5"/>
    <!-- Gradient definition -->
    <defs>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FDE68A" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>
  </svg>
`;

// Hanging Brass Lantern (Fanoos) with chain
export const lanternSvg = `
  <svg viewBox="0 0 46 80" style="width: 28px; height: 48px; filter: drop-shadow(0 2px 5px rgba(245,158,11,0.35));" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Chain link hanging from top -->
    <line x1="23" y1="0" x2="23" y2="16" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="2.5 1.5"/>
    <!-- Top dome & crescent finial -->
    <circle cx="23" cy="18" r="2.5" fill="#FEF08A"/>
    <polygon points="23,19 12,28 34,28" fill="#D97706" stroke="#FDE68A" stroke-width="1"/>
    <!-- Glass body -->
    <rect x="14" y="28" width="18" height="24" rx="3" fill="#064E3B" stroke="#F59E0B" stroke-width="1.5"/>
    <!-- Inner warm candlelight glow -->
    <circle cx="23" cy="40" r="5.5" fill="#FEF08A" opacity="0.95"/>
    <circle cx="23" cy="40" r="8" fill="#F59E0B" opacity="0.35"/>
    <!-- Bottom base -->
    <polygon points="14,52 32,52 23,65" fill="#D97706" stroke="#FDE68A" stroke-width="1"/>
    <circle cx="23" cy="69" r="2.5" fill="#F59E0B"/>
  </svg>
`;

// Corner Arabesque Ornament (4 corners)
export const cornerArabesque = (pos: "tl" | "tr" | "bl" | "br") => {
  const rot = pos === "tr" ? "transform: scaleX(-1);" : pos === "bl" ? "transform: scaleY(-1);" : pos === "br" ? "transform: scale(-1, -1);" : "";
  return `
    <div style="position: absolute; ${pos.includes("t") ? "top: 4px" : "bottom: 4px"}; ${pos.includes("l") ? "left: 4px" : "right: 4px"}; width: 44px; height: 44px; pointer-events: none; ${rot} z-index: 2;">
      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <path d="M2 2 L28 2 Q32 2 32 6 Q32 10 26 12 Q14 16 12 26 Q10 32 6 32 Q2 32 2 28 Z" fill="#065F46" opacity="0.85"/>
        <path d="M4 4 L24 4 Q20 12 12 20 L4 24 Z" fill="#F59E0B" opacity="0.75"/>
        <circle cx="8" cy="8" r="3" fill="#FEF08A"/>
        <path d="M2 2 L56 2 C40 4 20 20 4 56 L2 2 Z" stroke="#D97706" stroke-width="1" fill="none"/>
      </svg>
    </div>
  `;
};

// Mosque Skyline Silhouette SVG for footer
export const mosqueSkylineSvg = `
  <svg viewBox="0 0 1000 65" style="width: 100%; height: 32px; fill: #064E3B; opacity: 0.22;" preserveAspectRatio="none">
    <path d="M0,65 L0,50 Q25,38 50,50 Q75,25 100,50 L100,65 Z M100,65 Q125,32 150,65 Z M150,65 L150,44 Q175,18 200,44 L200,65 Z M200,65 Q225,12 250,65 Z M250,65 L250,44 Q275,18 300,44 L300,65 Z M300,65 Q325,30 350,65 Z M350,65 L350,50 Q375,38 400,50 Q425,25 450,50 L450,65 Z M450,65 Q475,30 500,65 Z M500,65 L500,44 Q525,18 550,44 L550,65 Z M550,65 Q575,12 600,65 Z M600,65 L600,44 Q625,18 650,44 L650,65 Z M650,65 Q675,30 700,65 Z M700,65 L700,50 Q725,38 750,50 Q775,25 800,50 L800,65 Z M800,65 Q825,30 850,65 Z M850,65 L850,50 Q875,38 900,50 Q925,25 950,50 L950,65 Z M950,65 Q975,30 1000,65 Z" />
  </svg>
`;

/**
 * Common Styles matching Image 1 & Image 2 design
 */
export function buildTwoPageReportStyles(dir: "rtl" | "ltr" = "ltr", isAr: boolean = false): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;600;700;800;900&family=Cinzel:wght@700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #0F172A;
      font-family: 'Cairo', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      direction: ${dir};
      text-align: ${isAr ? "right" : "left"};
    }

    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #1e293b;
      color: #FFFFFF;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      font-family: 'Cairo', sans-serif;
      border-bottom: 1px solid #334155;
    }

    .toolbar-title {
      font-weight: 900;
      font-size: 14px;
      color: #FDE68A;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-action {
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.1s, opacity 0.1s;
      font-family: inherit;
    }
    .btn-action:hover { opacity: 0.92; }
    .btn-action:active { transform: scale(0.97); }
    .btn-pdf {
      background: #059669;
      color: white;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.4);
    }
    .btn-close {
      background: #475569;
      color: white;
    }

    .preview-wrapper {
      padding: 24px 0 48px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      background: #0f172a;
    }

    /* EXACT A4 PAGE CONTAINERS */
    .report-page {
      width: 210mm;
      min-height: 297mm;
      height: auto;
      margin: 0 auto;
      padding: 5mm 7mm;
      background-color: #FDFBF7;
      background-image: radial-gradient(#059669 0.4px, transparent 0.4px), radial-gradient(#F59E0B 0.4px, #FDFBF7 0.4px);
      background-size: 18px 18px;
      background-position: 0 0, 9px 9px;
      position: relative;
      box-sizing: border-box;
      page-break-after: always;
      page-break-inside: avoid;
      overflow: visible;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
    }

    .report-page.page-2 {
      page-break-after: avoid;
    }

    /* DOUBLE BORDER INNER FRAME */
    .frame-inner {
      width: 100%;
      min-height: calc(297mm - 10mm);
      height: auto;
      border: 3px solid #064E3B;
      outline: 1.5px solid #D97706;
      outline-offset: -5px;
      border-radius: 12px;
      padding: 6px 10px 4px 10px;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 0;
      flex: 1;
    }

    .page1-content-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 7px;
      min-height: 0;
    }

    .page2-content-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
      min-height: 0;
    }

    /* HEADER ROW & LANTERNS */
    .page1-header {
      position: relative;
      text-align: center;
      padding-top: 2px;
      margin-bottom: 2px;
      flex-shrink: 0;
    }

    .header-lanterns-row {
      position: absolute;
      top: -2px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }

    .gold-star-crest-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 2px;
      flex-shrink: 0;
    }

    .header-top-brand {
      font-family: 'Cinzel', 'Cairo', serif;
      font-size: 17px;
      font-weight: 900;
      color: #B45309;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(180, 83, 9, 0.2);
    }

    .header-main-title {
      font-family: 'Cinzel', 'Cairo', serif;
      font-size: 23px;
      font-weight: 900;
      color: #D97706;
      letter-spacing: 3px;
      margin: 0;
      text-transform: uppercase;
      line-height: 1.1;
      text-shadow: 0 1px 3px rgba(217, 119, 6, 0.3);
    }

    .green-subject-ribbon {
      display: inline-block;
      background: #064E3B;
      color: #FEF08A;
      padding: 2.5px 18px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border: 1px solid #F59E0B;
      margin-top: 2px;
      box-shadow: 0 2px 6px rgba(6,78,59,0.25);
    }

    .quran-ayah-wrap {
      display: inline-block;
      background: #FEF3C7;
      border: 1.5px solid #F59E0B;
      border-radius: 8px;
      padding: 3px 14px;
      margin-top: 4px;
      max-width: 90%;
    }

    .quran-ayah-arabic {
      font-family: 'Amiri', serif;
      font-size: 14px;
      font-weight: 700;
      color: #064E3B;
      margin: 0;
      direction: rtl;
    }

    .quran-ayah-english {
      font-size: 8.5px;
      color: #92400E;
      font-style: italic;
      margin: 1px 0 0 0;
    }

    /* STUDENT PROFILE CARD */
    .student-profile-card {
      background: #FFFFFF;
      border: 1.8px solid #FDE68A;
      border-radius: 10px;
      padding: 6px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      flex-shrink: 0;
    }

    .student-profile-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .student-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #064E3B, #047857);
      border: 2px solid #F59E0B;
      color: #FEF08A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .student-meta-columns {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .student-meta-col {
      display: flex;
      flex-direction: column;
    }

    .student-meta-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .student-meta-value {
      font-size: 12px;
      font-weight: 900;
      color: #064E3B;
      margin: 1px 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .student-stats-pill {
      margin-top: 4px;
      padding: 3px 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 9.5px;
      font-weight: 800;
      color: #0F172A;
    }

    /* SECTION RIBBONS */
    .section-ribbon {
      background: linear-gradient(90deg, #064E3B 0%, #047857 50%, #064E3B 100%);
      color: #FFFFFF;
      text-align: center;
      padding: 3px 0;
      border-radius: 6px;
      border: 1px solid #F59E0B;
      margin: 0;
      box-shadow: 0 2px 5px rgba(6,78,59,0.25);
      flex-shrink: 0;
    }

    .section-ribbon-text {
      font-family: 'Cinzel', 'Cairo', serif;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #FEF08A;
      text-transform: uppercase;
    }

    /* 5 COLUMNS ACHIEVEMENT CARDS (Auto-expanding) */
    .achievements-grid-5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      flex: 1.25;
      min-height: 0;
    }

    .ach-col-card {
      background: #FFFFFF;
      border-radius: 8px;
      padding: 6px 5px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 0;
      height: 100%;
      border: 1.5px solid #E2E8F0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      position: relative;
    }

    .ach-col-card.green { border-top: 3.5px solid #059669; }
    .ach-col-card.blue { border-top: 3.5px solid #2563EB; }
    .ach-col-card.purple { border-top: 3.5px solid #7C3AED; }
    .ach-col-card.gold { border-top: 3.5px solid #D97706; }
    .ach-col-card.teal { border-top: 3.5px solid #0D9488; }

    .ach-icon-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin: 0 auto 2px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }

    .ach-icon-circle.green { background: #DCFCE7; color: #059669; }
    .ach-icon-circle.blue { background: #DBEAFE; color: #2563EB; }
    .ach-icon-circle.purple { background: #F3E8FF; color: #7C3AED; }
    .ach-icon-circle.gold { background: #FEF3C7; color: #D97706; }
    .ach-icon-circle.teal { background: #CCFBF1; color: #0D9488; }

    .ach-card-title {
      font-size: 10.5px;
      font-weight: 900;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.2;
      flex-shrink: 0;
    }

    .ach-card-title.green { color: #065F46; }
    .ach-card-title.blue { color: #1E40AF; }
    .ach-card-title.purple { color: #5B21B6; }
    .ach-card-title.gold { color: #92400E; }
    .ach-card-title.teal { color: #115E59; }

    .ach-card-body {
      font-size: 8.5px;
      font-weight: 600;
      line-height: 1.35;
      color: #1E293B;
      margin: 2px 0 3px 0;
      text-align: center;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .ach-card-stars {
      color: #F59E0B;
      font-size: 10.5px;
      letter-spacing: 1px;
      margin-bottom: 2px;
      flex-shrink: 0;
    }

    .ach-grade-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .ach-grade-pill.green { background: #DCFCE7; color: #065F46; border: 1px solid #86EFAC; }
    .ach-grade-pill.blue { background: #DBEAFE; color: #1E40AF; border: 1px solid #93C5FD; }
    .ach-grade-pill.purple { background: #F3E8FF; color: #5B21B6; border: 1px solid #D8B4FE; }
    .ach-grade-pill.gold { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .ach-grade-pill.teal { background: #CCFBF1; color: #115E59; border: 1px solid #99F6E4; }

    /* 4 INDICATORS CIRCLES ROW (Auto-expanding) */
    .indicators-row-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 7px;
      flex: 0.95;
      min-height: 0;
    }

    .indicator-box {
      background: #FFFFFF;
      border: 1.5px solid #FDE68A;
      border-radius: 8px;
      padding: 5px 4px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-height: 0;
    }

    .ring-wrap {
      width: 44px;
      height: 44px;
      margin: 0 auto 2px auto;
      position: relative;
      flex-shrink: 0;
    }

    .ring-pct-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10.5px;
      font-weight: 900;
      color: #064E3B;
    }

    .indicator-title {
      font-size: 8px;
      font-weight: 900;
      color: #0F172A;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }

    .indicator-sub {
      font-size: 7.5px;
      color: #64748B;
      margin: 1px 0 0 0;
      line-height: 1.2;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* FOOTER BAR */
    .page-bottom-skyline {
      margin-top: auto;
      position: relative;
      flex-shrink: 0;
    }

    .page-footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #D1D5DB;
      padding-top: 4px;
      font-size: 8.5px;
      color: #475569;
      font-weight: 700;
    }

    .page-footer-stamp {
      font-style: italic;
    }

    .page-number-pill {
      background: #ECFDF5;
      color: #064E3B;
      border: 1px solid #A7F3D0;
      padding: 1.5px 8px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 8.5px;
    }

    /* ========================================================= */
    /* PAGE 2 STYLES (AUTO-EXPANDING CARDS - ZERO DEAD SPACE)   */
    /* ========================================================= */
    .page2-header {
      text-align: center;
      padding-top: 2px;
      margin-bottom: 4px;
      flex-shrink: 0;
    }

    .page2-section-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 0;
    }

    .page2-card-container {
      background: #FFFFFF;
      border: 1.8px solid #F59E0B;
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.04);
      flex: 1;
      min-height: 0;
    }

    .page2-card-badge {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: radial-gradient(circle, #064E3B 60%, #047857 100%);
      border: 2px solid #F59E0B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 3px 8px rgba(6,78,59,0.3);
    }

    .page2-card-divider {
      width: 2px;
      height: 80%;
      background: linear-gradient(180deg, transparent, #D97706 30%, #D97706 70%, transparent);
      flex-shrink: 0;
      position: relative;
    }

    .page2-card-divider::after {
      content: "◆";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #D97706;
      font-size: 9px;
      background: #FFFFFF;
      padding: 1px 0;
    }

    .page2-card-text {
      font-size: 13px;
      line-height: 1.75;
      color: #0F172A;
      margin: 0;
      text-align: justify;
      flex: 1;
      font-weight: 600;
      overflow: auto;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      .screen-toolbar { display: none !important; }
      .preview-wrapper {
        padding: 0 !important;
        gap: 0 !important;
        background: #FDFBF7 !important;
      }
      body { background: #FDFBF7 !important; margin: 0 !important; padding: 0 !important; }
      .report-page {
        box-shadow: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
        width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        box-sizing: border-box !important;
      }
      .report-page.page-2 {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }

    @media screen {
      .preview-wrapper {
        padding: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .report-page-container {
        display: flex;
        justify-content: center;
        width: 100%;
      }
      .report-page {
        max-width: 100%;
        height: auto;
        min-height: 297mm;
      }
    }
  `;
}

/**
 * Builds Page 1 HTML (Overview, 5 Columns Achievements, 4 Circular Gauge Rings)
 */
export function buildPage1InnerHtml(data: ParsedTwoPageReportData, lang: "ar" | "en" = "en"): string {
  const isAr = lang === "ar";
  const studentInitial = (data.studentName || "S").trim().charAt(0).toUpperCase();

  const rawCards = [
    { key: "hefz", title: isAr ? "الحفظ الجديد" : "NEW MEMORIZATION", text: data.hefzText, color: "green", icon: "📖", grade: isAr ? "ممتاز" : "EXCELLENT", stars: "★★★★★" },
    { key: "rev", title: isAr ? "المراجعة والتثبيت" : "REVIEW", text: data.revisionText, color: "blue", icon: "🔄", grade: isAr ? "ممتاز" : "EXCELLENT", stars: "★★★★★" },
    { key: "rec", title: isAr ? "التلاوة والتأسيس" : "RECITATION & FOUNDATION", text: data.recitationText, color: "purple", icon: "🎙️", grade: isAr ? "ممتاز" : "EXCELLENT", stars: "★★★★★" },
    { key: "isl", title: isAr ? "الدراسات الإسلامية" : "ISLAMIC STUDIES", text: data.islamicStudiesText, color: "gold", icon: "🕌", grade: isAr ? "جيد جداً" : "VERY GOOD", stars: "★★★★☆" },
    { key: "read", title: isAr ? "تلاوة المصحف" : "QUR'AN READING", text: data.quranReadingText, color: "teal", icon: "📖", grade: isAr ? "ممتاز" : "EXCELLENT", stars: "★★★★★" }
  ];

  const validCards = rawCards.filter(c => isCleanValue(c.text));
  const colCount = validCards.length > 0 ? validCards.length : 1;

  const cardsHtml = validCards.length > 0 ? `
    <div class="achievements-grid-5" style="grid-template-columns: repeat(${colCount}, 1fr);">
      ${validCards.map(c => `
        <div class="ach-col-card ${c.color}">
          <div>
            <div class="ach-icon-circle ${c.color}">${c.icon}</div>
            <p class="ach-card-title ${c.color}">${c.title}</p>
          </div>
          <p class="ach-card-body">${c.text}</p>
          <div>
            <div class="ach-card-stars">${c.stars}</div>
            <span class="ach-grade-pill ${c.color}">${c.grade}</span>
          </div>
        </div>
      `).join("")}
    </div>
  ` : `
    <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; color: #64748B; font-weight: 700; font-size: 11px;">
      ${isAr ? "لم تسجل بيانات إنجاز محددة في حصص هذا الشهر." : "No specific achievement items recorded for this month."}
    </div>
  `;

  // Dynamic performance indicator rings (Strictly omitting unmentioned categories)
  interface IndicatorRing {
    pct: number;
    color: string;
    title: string;
    sub: string;
  }
  const rings: IndicatorRing[] = [];

  const hasHefz = isCleanValue(data.hefzText);
  if (data.hefzSpeedPct > 0 && hasHefz) {
    rings.push({
      pct: data.hefzSpeedPct,
      color: "#059669",
      title: isAr ? "سرعة الحفظ" : "MEMORY SPEED",
      sub: isAr ? "تقدم متميز في سرعة واستيعاب الحفظ." : "Excellent progress in memorization speed."
    });
  }

  const hasRev = isCleanValue(data.revisionText);
  if (data.revisionStrengthPct > 0 && hasRev) {
    rings.push({
      pct: data.revisionStrengthPct,
      color: "#2563EB",
      title: isAr ? "قوة المراجعة" : "REVIEW STRENGTH",
      sub: isAr ? "ثبات ممتاز واستحضار قوي للمراجعة." : "Excellent consistency in reviewing."
    });
  }

  const hasRec = isCleanValue(data.recitationText) || isCleanValue(data.quranReadingText);
  if (data.tajweedPct > 0 && hasRec) {
    rings.push({
      pct: data.tajweedPct,
      color: "#7C3AED",
      title: isAr ? "التجويد والتأسيس" : "TAJWEED & FOUNDATION",
      sub: isAr ? "تطبيق متقن ومستمر لأحكام التجويد." : "Outstanding application with continuous improvement."
    });
  }

  if (data.commitmentPct > 0 && (typeof data.totalLessons === "number" ? data.totalLessons > 0 : true)) {
    rings.push({
      pct: data.commitmentPct,
      color: "#0D9488",
      title: isAr ? "الالتزام بالحضور" : "COMMITMENT",
      sub: isAr ? "انضباط والتزام تام بمواعيد الحصص." : "Excellent commitment and regular attendance."
    });
  }

  const indicatorsSectionHtml = rings.length > 0 ? `
    <!-- PERFORMANCE INDICATORS RIBBON -->
    <div class="section-ribbon">
      <span class="section-ribbon-text">
        🎯 ${isAr ? "مؤشرات الأداء المئوية" : "PERFORMANCE INDICATORS"}
      </span>
    </div>

    <!-- CIRCULAR GAUGE PROGRESS RINGS -->
    <div class="indicators-row-4" style="grid-template-columns: repeat(${rings.length}, 1fr);">
      ${rings.map(r => `
        <div class="indicator-box">
          <div class="ring-wrap">
            <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
              <path stroke="#E2E8F0" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path stroke="${r.color}" stroke-dasharray="${r.pct}, 100" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div class="ring-pct-text">${r.pct}%</div>
          </div>
          <p class="indicator-title">${r.title}</p>
          <p class="indicator-sub">${r.sub}</p>
        </div>
      `).join("")}
    </div>
  ` : "";

  return `
    <div class="report-page page-1">
      <div class="frame-inner">
        ${cornerArabesque("tl")}
        ${cornerArabesque("tr")}
        ${cornerArabesque("bl")}
        ${cornerArabesque("br")}

        <div class="page1-content-body">
          <!-- HEADER ROW -->
          <div class="page1-header">
            <div class="header-lanterns-row">
              <div>${lanternSvg}</div>
              <div>${lanternSvg}</div>
            </div>

            <div class="gold-star-crest-wrap">
              ${starEmblemSvg}
            </div>

            <h2 class="header-top-brand">${isAr ? "تقرير التقدم التعليمي الشهري" : "MONTHLY LEARNING PROGRESS REPORT"}</h2>
            <h1 class="header-main-title">${isAr ? "التقرير الشهري الشامل" : "COMPREHENSIVE PROGRESS REPORT"}</h1>

            <div>
              <span class="green-subject-ribbon">
                ${isAr ? "القرآن الكريم والدراسات الإسلامية" : "QUR'AN & ISLAMIC STUDIES"}
              </span>
            </div>

            <div class="quran-ayah-wrap">
              <p class="quran-ayah-arabic">﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾</p>
              <p class="quran-ayah-english">And say, "My Lord, increase me in knowledge." (Qur'an 20:114)</p>
            </div>
          </div>

          <!-- STUDENT PROFILE CARD -->
          <div class="student-profile-card">
            <div class="student-profile-top">
              <div class="student-avatar">${studentInitial}</div>
              <div class="student-meta-columns">
                <div class="student-meta-col">
                  <p class="student-meta-label">👤 ${isAr ? "اسم الطالب" : "Student Name"}</p>
                  <p class="student-meta-value">${data.studentName}</p>
                </div>
                <div class="student-meta-col">
                  <p class="student-meta-label">📅 ${isAr ? "شهر التقييم" : "Month"}</p>
                  <p class="student-meta-value">${data.monthName}</p>
                </div>
                <div class="student-meta-col">
                  <p class="student-meta-label">👨‍🏫 ${isAr ? "اسم المعلم" : "Teacher Name"}</p>
                  <p class="student-meta-value">${data.teacherName}</p>
                </div>
              </div>
            </div>
            <div class="student-stats-pill">
              <span>📖 <strong>${isAr ? "إجمالي الحصص:" : "Total Lessons:"}</strong> ${data.totalLessons} ${isAr ? "حصص" : "Lessons"}</span>
              <span>|</span>
              <span>🕒 <strong>${isAr ? "إجمالي الساعات:" : "Total Hours:"}</strong> ${data.totalHours} ${isAr ? "ساعة" : "Hours"}</span>
            </div>
          </div>

          <!-- ACHIEVEMENTS THIS MONTH RIBBON -->
          <div class="section-ribbon">
            <span class="section-ribbon-text">
              ✨ ${isAr ? "إنجازات الطالب خلال الشهر" : "ACHIEVEMENTS THIS MONTH"}
            </span>
          </div>

          <!-- DYNAMIC ACHIEVEMENT COLUMNS -->
          ${cardsHtml}

          <!-- DYNAMIC PERFORMANCE INDICATORS -->
          ${indicatorsSectionHtml}
        </div>

        <!-- FOOTER WITH MOSQUE SKYLINE -->
        <div class="page-bottom-skyline">
          <div>${mosqueSkylineSvg}</div>
          <div class="page-footer-bar">
            <div class="page-footer-stamp">${isAr ? "منظومة التقييم والمتابعة" : "Academic Evaluation Portal"}</div>
            <div class="page-number-pill">${isAr ? "صفحة 1 من 2 (نظرة عامة)" : "Page 1 of 2 (Overview)"}</div>
            <div class="page-footer-stamp">${isAr ? "اسم المعلم: " + data.teacherName : "Teacher Name: " + data.teacherName}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds Page 2 HTML (Strengths, Recommendations & Next Month Plan - Matching Image 2)
 */
export function buildPage2InnerHtml(data: ParsedTwoPageReportData, lang: "ar" | "en" = "en"): string {
  const isAr = lang === "ar";

  return `
    <div class="report-page page-2">
      <div class="frame-inner">
        ${cornerArabesque("tl")}
        ${cornerArabesque("tr")}
        ${cornerArabesque("bl")}
        ${cornerArabesque("br")}

        <div class="page2-content-body">
          <!-- TOP CREST & TITLE -->
          <div class="page2-header">
            <div class="gold-star-crest-wrap">
              ${starEmblemSvg}
            </div>
            <h2 style="font-family: 'Cinzel', 'Cairo', serif; font-size: 15px; font-weight: 900; color: #064E3B; margin: 1px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">
              ${isAr ? "التقرير الأكاديمي والتربوي المفصل" : "DETAILED ACADEMIC & PEDAGOGICAL REPORT"}
            </h2>
            <p style="font-size: 8.5px; font-weight: 700; color: #D97706; margin: 1px 0 0 0;">
              ${data.studentName} • ${data.monthName}
            </p>
          </div>

          <!-- 1. STRENGTHS SECTION -->
          ${isCleanValue(data.strengthsText) ? `
          <div class="page2-section-block">
            <div class="section-ribbon">
              <span class="section-ribbon-text">
                🌟 ${isAr ? "نقاط القوة والإنجاز" : "STRENGTHS"}
              </span>
            </div>

            <div class="page2-card-container">
              <div class="page2-card-badge">
                <svg viewBox="0 0 48 48" style="width: 38px; height: 38px;" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="9" r="1.5" fill="#FEF08A"/>
                  <circle cx="20" cy="7" r="1.5" fill="#FEF08A"/>
                  <circle cx="24" cy="6" r="2" fill="#FEF08A"/>
                  <circle cx="28" cy="7" r="1.5" fill="#FEF08A"/>
                  <circle cx="32" cy="9" r="1.5" fill="#FEF08A"/>
                  <path d="M17 14 L31 14 L30 25 C30 29 27 32 24 32 C21 32 18 29 18 25 Z" fill="#F59E0B" stroke="#FEF08A" stroke-width="1.2"/>
                  <polygon points="24,19 25,22 28,22 25.5,24 26.5,27 24,25 21.5,27 22.5,24 20,22 23,22" fill="#FEF08A"/>
                  <path d="M17 16 C13 16 13 23 17 23" stroke="#FDE68A" stroke-width="1.5" fill="none"/>
                  <path d="M31 16 C35 16 35 23 31 23" stroke="#FDE68A" stroke-width="1.5" fill="none"/>
                  <rect x="22.5" y="32" width="3" height="5" fill="#F59E0B"/>
                  <rect x="18" y="37" width="12" height="3" rx="1" fill="#F59E0B" stroke="#FEF08A" stroke-width="1"/>
                </svg>
              </div>
              <div class="page2-card-divider"></div>
              <p class="page2-card-text">${data.strengthsText}</p>
            </div>
          </div>
          ` : ""}

          <!-- 2. RECOMMENDATIONS SECTION -->
          ${isCleanValue(data.recommendationsText) ? `
          <div class="page2-section-block">
            <div class="section-ribbon">
              <span class="section-ribbon-text">
                💡 ${isAr ? "التوصيات والتوجيهات" : "RECOMMENDATIONS"}
              </span>
            </div>

            <div class="page2-card-container">
              <div class="page2-card-badge">
                <svg viewBox="0 0 48 48" style="width: 38px; height: 38px;" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="14" y="11" width="20" height="28" rx="3" fill="#F59E0B" stroke="#FEF08A" stroke-width="1.2"/>
                  <rect x="19" y="8" width="10" height="5" rx="1.5" fill="#D97706" stroke="#FEF08A" stroke-width="1"/>
                  <rect x="16.5" y="14" width="15" height="22" rx="1.5" fill="#FFFFFF"/>
                  <path d="M19 19 L21 21 L25 17" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <line x1="27" y1="19" x2="30" y2="19" stroke="#94A3B8" stroke-width="1.2"/>
                  <path d="M19 25 L21 27 L25 23" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <line x1="27" y1="25" x2="30" y2="25" stroke="#94A3B8" stroke-width="1.2"/>
                  <path d="M19 31 L21 33 L25 29" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <line x1="27" y1="31" x2="30" y2="31" stroke="#94A3B8" stroke-width="1.2"/>
                </svg>
              </div>
              <div class="page2-card-divider"></div>
              <p class="page2-card-text">${data.recommendationsText}</p>
            </div>
          </div>
          ` : ""}

          <!-- 3. NEXT MONTH PLAN SECTION -->
          ${isCleanValue(data.nextMonthGoals) ? `
          <div class="page2-section-block">
            <div class="section-ribbon">
              <span class="section-ribbon-text">
                🎯 ${isAr ? "خطة الشهر القادم" : "NEXT MONTH PLAN"}
              </span>
            </div>

            <div class="page2-card-container">
              <div class="page2-card-badge">
                <svg viewBox="0 0 48 48" style="width: 38px; height: 38px;" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="12" width="24" height="26" rx="3" fill="#FFFFFF" stroke="#F59E0B" stroke-width="1.5"/>
                  <path d="M12 15 C12 13 13 12 15 12 L33 12 C35 12 36 13 36 15 L36 18 L12 18 Z" fill="#D97706"/>
                  <circle cx="17" cy="11" r="1.5" fill="#FEF08A"/>
                  <circle cx="24" cy="11" r="1.5" fill="#FEF08A"/>
                  <circle cx="31" cy="11" r="1.5" fill="#FEF08A"/>
                  <rect x="15" y="22" width="3" height="3" rx="0.5" fill="#059669"/>
                  <rect x="20" y="22" width="3" height="3" rx="0.5" fill="#059669"/>
                  <rect x="25" y="22" width="3" height="3" rx="0.5" fill="#059669"/>
                  <rect x="30" y="22" width="3" height="3" rx="0.5" fill="#CBD5E1"/>
                  <rect x="15" y="27" width="3" height="3" rx="0.5" fill="#059669"/>
                  <rect x="20" y="27" width="3" height="3" rx="0.5" fill="#F59E0B"/>
                  <rect x="25" y="27" width="3" height="3" rx="0.5" fill="#CBD5E1"/>
                  <rect x="30" y="27" width="3" height="3" rx="0.5" fill="#CBD5E1"/>
                  <rect x="15" y="32" width="3" height="3" rx="0.5" fill="#CBD5E1"/>
                  <rect x="20" y="32" width="3" height="3" rx="0.5" fill="#CBD5E1"/>
                </svg>
              </div>
              <div class="page2-card-divider"></div>
              <p class="page2-card-text">${data.nextMonthGoals}</p>
            </div>
          </div>
          ` : ""}
        </div>

        <!-- FOOTER WITH MOSQUE SKYLINE -->
        <div class="page-bottom-skyline">
          <div>${mosqueSkylineSvg}</div>
          <div class="page-footer-bar">
            <div class="page-footer-stamp">${isAr ? "منظومة التقييم والمتابعة" : "Academic Evaluation Portal"}</div>
            <div class="page-number-pill">${isAr ? "صفحة 2 من 2 (الخطة والتوصيات)" : "Page 2 of 2 (Plan & Recommendations)"}</div>
            <div class="page-footer-stamp">${isAr ? "اسم المعلم: " + data.teacherName : "Teacher Name: " + data.teacherName}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds the standalone 2-Page HTML document matching exact A4 dimensions and GoStars styling.
 */
export function buildTwoPageReportHtml(data: ParsedTwoPageReportData, lang: "ar" | "en" = "en"): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const styles = buildTwoPageReportStyles(dir, isAr);
  const page1 = buildPage1InnerHtml(data, lang);
  const page2 = buildPage2InnerHtml(data, lang);

  return `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <title>${data.studentName}_Monthly_Report_${data.monthName.replace(/\s+/g, "_")}</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>

      <!-- SCREEN TOOLBAR (PRINT/PDF DIALOG TRIGGER) -->
      <div class="screen-toolbar no-print">
        <div class="toolbar-title">
          <span>✨</span>
          <span>${data.studentName} — ${data.monthName} (${isAr ? "التقرير الشهري الشامل — صفحتان A4 مطابقة للنموذج" : "Comprehensive Monthly Report — 2 A4 Pages"})</span>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn-action btn-pdf" onclick="window.print()">
            🖨️ ${isAr ? "حفظ كـ PDF / طباعة التقرير (صفحتين A4)" : "Save as PDF / Print (2 Pages A4)"}
          </button>
          <button type="button" class="btn-action btn-close" onclick="window.close()">
            ❌ ${isAr ? "إغلاق النافذة" : "Close"}
          </button>
        </div>
      </div>

      <div class="preview-wrapper">
        ${page1}
        ${page2}
      </div>

      <script>
        window.addEventListener('load', function() {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            });
          } else {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 600);
          }
        });
      </script>
    </body>
    </html>
  `;
}
