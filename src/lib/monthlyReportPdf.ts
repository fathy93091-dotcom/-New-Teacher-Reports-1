/**
 * GoStars - Ultra-HD Monthly Report PDF Generator
 * 
 * مولد ملفات PDF فائق الدقة والوضوح (Ultra-HD / 270+ True Print DPI)
 * 
 * حلول المشاكل الجذرية:
 * 1. منع البكسلة وضعف الدقة:
 *    - في السابق، كان المحرك يلتقط العنصر مباشرة من حاوية العرض داخل شاشة المتصفح (والتي قد تكون بعرض 400px على الجوال أو في الإطار الجانبي)، ثم يقوم بتمديدها لتملأ صفحة A4 كاملة، مما تسبب في بكسلة وتشوه هائل.
 *    - الحل: يتم الآن استنساخ كل صفحة داخل حاوية عزل سطح مكتب حقيقية (Offscreen A4 Sandbox) بأبعاد A4 قياسية (794px × 1123px).
 *    - يتم بعد ذلك إجبار محرك SVG و Canvas على تصيير الخطوط والرموز بدقة حقيقية فائقة تبلغ (2223px × 3144px) بنسبة تحويل 2.8x، مما يعطي دقة حقيقية تفوق 270 DPI دون أي ضغط مشوه أو بكسلة.
 * 2. منع تفكك الكلمات وتقطيع الحروف (Anti-Tearing):
 *    - تفعيل skipFonts لمنع توقف المحرك أو سقوطه في خطوط افتراضية بديلة عند قراءة ملفات التنسيق عن بعد.
 *    - انتظار اكتمال تحميل خطوط النظام وتنسيق النصوص (document.fonts.ready).
 *    - ضبط التنسيق على text-rendering: optimizeLegibility و -webkit-font-smoothing: antialiased.
 */

import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

export async function exportMonthlyReportToPdf(params: {
  containerElement: HTMLElement;
  fileName: string;
  onProgress?: (progressText: string) => void;
}): Promise<boolean> {
  const { containerElement, fileName, onProgress } = params;

  // قائمة لمتابعة وإزالة أي حاويات عزل مؤقتة في حال حدوث خطأ
  const tempSandboxes: HTMLElement[] = [];

  try {
    if (onProgress) onProgress("جاري تهيئة الخطوط بدقة فائقة...");

    // 1. التأكد من اكتمال تحميل الخطوط في المتصفح
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    // 2. استخراج صفحات التقرير (.monthly-report-page)
    let pageElements = Array.from(
      containerElement.querySelectorAll<HTMLElement>(".monthly-report-page")
    );

    if (pageElements.length === 0) {
      pageElements = [containerElement];
    }

    // أبعاد صفحة A4 القياسية عند 96 DPI
    const a4BaseWidth = 794;
    const a4BaseHeight = 1123;

    // معامل مضاعفة الدقة للطباعة (2.8x يعطي 2223px × 3144px وهو ما يعادل 270 DPI حقيقي عالي الوضوح)
    const scale = 2.8;
    const targetWidth = Math.round(a4BaseWidth * scale);   // 2223px
    const targetHeight = Math.round(a4BaseHeight * scale); // 3144px

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      if (onProgress) {
        onProgress(`جاري تصيير الصفحة ${i + 1} من ${pageElements.length} بدقة عالية Ultra-HD...`);
      }

      // 3. إنشاء حاوية عزل في الذاكرة (Offscreen Sandbox) بأبعاد A4 قياسية دقيقة (794px × 1123px+)
      const sandbox = document.createElement("div");
      sandbox.setAttribute("data-pdf-sandbox", "true");
      sandbox.style.position = "fixed";
      sandbox.style.left = "-99999px";
      sandbox.style.top = "0";
      sandbox.style.width = `${a4BaseWidth}px`;
      sandbox.style.minWidth = `${a4BaseWidth}px`;
      sandbox.style.maxWidth = `${a4BaseWidth}px`;
      sandbox.style.minHeight = `${a4BaseHeight}px`;
      sandbox.style.height = "auto";
      sandbox.style.maxHeight = "none";
      sandbox.style.background = "#FAF7EE";
      sandbox.style.zIndex = "-99999";
      sandbox.style.opacity = "1";
      sandbox.style.pointerEvents = "none";
      sandbox.style.overflow = "visible";
      sandbox.style.margin = "0";
      sandbox.style.padding = "0";

      // 4. استنساخ عنصر الصفحة بالكامل داخل الحاوية المعزولة بأبعاد A4 قياسية 100%
      const clone = pageEl.cloneNode(true) as HTMLElement;
      clone.style.width = `${a4BaseWidth}px`;
      clone.style.minWidth = `${a4BaseWidth}px`;
      clone.style.maxWidth = `${a4BaseWidth}px`;
      clone.style.minHeight = `${a4BaseHeight}px`;
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.boxSizing = "border-box";
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";

      sandbox.appendChild(clone);
      document.body.appendChild(sandbox);
      tempSandboxes.push(sandbox);

      // انتظار زمني قصير حتى يكتمل حساب التخطيط (Layout Reflow)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // حساب الارتفاع الفعلي للصفحة بالكامل لضمان عدم قص التذييل أو الإطار السفلي نهائياً
      const actualHeight = Math.max(a4BaseHeight, clone.scrollHeight || a4BaseHeight, clone.offsetHeight || a4BaseHeight);
      const captureHeight = Math.round(actualHeight * scale);

      // 5. التقاط الصفحة بدقة فائقة مع الضمان التام لعدم اقتصاص أي جزء من الصفحة
      const dataUrl = await toPng(clone, {
        quality: 1.0,
        pixelRatio: 1,
        width: targetWidth,
        height: captureHeight,
        canvasWidth: targetWidth,
        canvasHeight: captureHeight,
        backgroundColor: "#FAF7EE",
        cacheBust: true,
        skipFonts: true, // يمنع انكسار الخطوط أو فشل استيرادها الخارجي
        style: {
          width: `${a4BaseWidth}px`,
          height: `${actualHeight}px`,
          minWidth: `${a4BaseWidth}px`,
          maxWidth: `${a4BaseWidth}px`,
          minHeight: `${actualHeight}px`,
          maxHeight: `${actualHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          boxSizing: "border-box",
          margin: "0",
          boxShadow: "none",
          borderRadius: "0",
          overflow: "visible"
        }
      });

      // إزالة حاوية العزل فور الانتهاء من التقاط الصفحة
      if (document.body.contains(sandbox)) {
        document.body.removeChild(sandbox);
      }

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      // إضافة الصورة بملء صفحة A4 تماماً (210mm × 297mm) بدون أي حواف بيضاء جانبيّة أو قص
      pdf.addImage(dataUrl, "PNG", 0, 0, a4WidthMm, a4HeightMm, undefined, "SLOW");
    }

    if (onProgress) onProgress("جاري تجهيز وتنزيل ملف PDF...");
    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error("Failed to generate high-resolution PDF:", err);
    // في حال فشل أي مرحلة، نتيح للمستخدم الطباعة المتجهية الفورية
    window.print();
    return false;
  } finally {
    // تنظيف مؤكد لأي حاويات متبقية
    tempSandboxes.forEach((s) => {
      if (document.body.contains(s)) {
        document.body.removeChild(s);
      }
    });
  }
}
