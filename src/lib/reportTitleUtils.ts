/**
 * Utility functions for report titles and formatting in Reports Log
 */

export function getReportTitle(
  report: {
    subject?: string;
    lessonNumber?: number;
    studentName?: string;
    attendance?: string;
    date?: string;
    reportText?: string;
    generatedText?: string;
    teacherNotes?: string;
    reportType?: string;
    evaluationMonth?: string;
  },
  isArabic = true
): string {
  if (report.reportType === "monthly_comprehensive" || report.evaluationMonth) {
    const monthPart = report.evaluationMonth ? ` (${report.evaluationMonth})` : "";
    const subjPart = report.subject ? ` - ${report.subject}` : "";
    return isArabic
      ? `📌 التقرير الشهري الشامل${monthPart}${subjPart}`
      : `📌 Comprehensive Monthly Report${monthPart}${subjPart}`;
  }

  const fullText = (report.reportText || report.generatedText || report.teacherNotes || "").trim();

  // If the text starts with a recognized title line
  if (fullText) {
    const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";

    if (
      firstLine.length > 0 &&
      firstLine.length <= 85 &&
      (firstLine.includes("تقرير") ||
        firstLine.toLowerCase().includes("report") ||
        firstLine.startsWith("📌") ||
        firstLine.startsWith("📝") ||
        firstLine.startsWith("📊") ||
        firstLine.startsWith("#"))
    ) {
      return firstLine.replace(/^[#*_\-:\s]+|[#*_\-:\s]+$/g, "").trim();
    }
  }

  const isAbsent = report.attendance === "absent";
  const subjectName = report.subject ? report.subject.trim() : (isArabic ? "المادة الدراسية" : "Subject");
  const lessonPart = report.lessonNumber ? (isArabic ? `الحصة #${report.lessonNumber}` : `Lesson #${report.lessonNumber}`) : "";

  if (isAbsent) {
    return isArabic
      ? `تقرير غياب: ${subjectName}${lessonPart ? ` - ${lessonPart}` : ""}`
      : `Absence Report: ${subjectName}${lessonPart ? ` - ${lessonPart}` : ""}`;
  }

  return isArabic
    ? `تقرير حصة: ${subjectName}${lessonPart ? ` - ${lessonPart}` : ""}`
    : `Lesson Report: ${subjectName}${lessonPart ? ` - ${lessonPart}` : ""}`;
}
