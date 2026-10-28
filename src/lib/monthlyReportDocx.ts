/**
 * GoStars - Monthly Report DOCX Generator
 * 
 * إنشاء وتصدير مستند Word (.docx) احترافي للتقرير الشهري
 * وفق الهوية البصرية الإسلامية والألوان الأكاديمية (أخضر إسلامي، ذهبي، كريمي)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  ShadingType
} from "docx";
import {
  ComprehensiveMonthlyReportData,
  isCleanValue,
  sanitizeComprehensiveMonthlyReportData
} from "./monthlyReportModel";

const COLOR_ISLAMIC_GREEN = "0D4733"; // أخضر إسلامي داكن
const COLOR_GOLD = "C59B27"; // ذهبي ملكي
const COLOR_CREAM = "FAF7EE"; // خلفية كريمية
const COLOR_LIGHT_BORDER = "E2D9C5"; // حد بيج خفيف
const COLOR_DARK_TEXT = "1C2D24"; // نص داكن مقروء
const COLOR_MUTED_TEXT = "52635A"; // نص رمادي مخضر

export async function generateMonthlyReportDocx(rawData: ComprehensiveMonthlyReportData): Promise<Blob> {
  const data = sanitizeComprehensiveMonthlyReportData(rawData);
  const isEn = data.lang === "en";

  if (data.templateSections && data.templateSections.length > 0) {
    const reportTitle =
      data.templateTitle || (isEn ? "MONTHLY LEARNING PROGRESS REPORT" : "تقرير التقدم التعليمي الشهري");
    const subtitle =
      data.templateSubtitle || (isEn ? "MONTHLY STUDENT REPORT" : "التقرير الشهري الشامل لمسيرة الطالب");

    const templateChildren: (Paragraph | Table)[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `✨ ۩ ${reportTitle} ۩ ✨`,
            bold: true,
            size: 32,
            color: COLOR_GOLD,
            font: "Arial"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: subtitle,
            bold: true,
            size: 24,
            color: COLOR_ISLAMIC_GREEN,
            font: "Arial"
          })
        ]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
                  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isEn ? "STUDENT NAME: " : "اسم الطالب: ",
                        bold: true,
                        size: 18,
                        color: COLOR_GOLD
                      }),
                      new TextRun({
                        text: data.studentName,
                        bold: true,
                        size: 20,
                        color: COLOR_ISLAMIC_GREEN
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_GOLD },
                  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isEn ? "EVALUATION MONTH: " : "شهر التقييم: ",
                        bold: true,
                        size: 18,
                        color: COLOR_GOLD
                      }),
                      new TextRun({
                        text: data.monthLabel,
                        bold: true,
                        size: 20,
                        color: COLOR_ISLAMIC_GREEN
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
                  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isEn ? "TEACHER NAME: " : "اسم المعلم: ",
                        bold: true,
                        size: 18,
                        color: COLOR_GOLD
                      }),
                      new TextRun({
                        text: data.teacherName,
                        bold: true,
                        size: 20,
                        color: COLOR_ISLAMIC_GREEN
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { before: 180, after: 100 } })
    ];

    data.templateSections.forEach((sec) => {
      const cellParagraphs: Paragraph[] = [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `✦ ${sec.title}`,
              bold: true,
              size: 22,
              color: COLOR_ISLAMIC_GREEN
            })
          ]
        })
      ];

      if (sec.content && sec.content.trim()) {
        sec.content.split(/\r?\n/).forEach((line) => {
          if (line.trim()) {
            cellParagraphs.push(
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: line.trim(),
                    size: 20,
                    color: COLOR_DARK_TEXT
                  })
                ]
              })
            );
          }
        });
      }

      if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
        sec.bullets.forEach((b) => {
          cellParagraphs.push(
            new Paragraph({
              spacing: { after: 50 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: b,
                  size: 20,
                  color: COLOR_DARK_TEXT
                })
              ]
            })
          );
        });
      }

      templateChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                    left: { style: BorderStyle.SINGLE, size: 10, color: COLOR_GOLD },
                    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                  },
                  margins: { top: 140, bottom: 140, left: 160, right: 160 },
                  children: cellParagraphs
                })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { before: 120, after: 80 } })
      );
    });

    templateChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: "🤲  نسأل الله العظيم أن يجعل القرآن الكريم ربيع قلبه ونور صدره  🤲",
            bold: true,
            size: 22,
            color: COLOR_ISLAMIC_GREEN,
            font: "Traditional Arabic"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: isEn ? `Teacher Name: ${data.teacherName}` : `اسم المعلم: ${data.teacherName}`,
            bold: true,
            size: 16,
            color: COLOR_MUTED_TEXT
          })
        ]
      })
    );

    const customDoc = new Document({
      creator: "Academic Portal",
      title: `${data.studentName} - ${reportTitle}`,
      description: `Monthly Report for ${data.monthLabel}`,
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children: templateChildren
        }
      ]
    });

    return await Packer.toBlob(customDoc);
  }

  const doc = new Document({
    creator: "Academic Portal",
    title: `${data.studentName} - Monthly Quran Report`,
    description: `Comprehensive Monthly Report for ${data.monthLabel}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: [
          // 1. Header with Golden Lanterns representation and Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: isEn ? "✨ ۩ MONTHLY LEARNING PROGRESS REPORT ۩ ✨" : "✨ ۩ تقرير التقدم التعليمي الشهري ۩ ✨",
                bold: true,
                size: 32, // 16pt
                color: COLOR_GOLD,
                font: "Arial"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: isEn ? "MONTHLY STUDENT REPORT" : "التقرير الشهري الشامل لمسيرة الطالب",
                bold: true,
                size: 26, // 13pt
                color: COLOR_ISLAMIC_GREEN,
                font: "Arial"
              })
            ]
          }),

          // Ribbon banner
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: COLOR_ISLAMIC_GREEN, type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_GOLD },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_GOLD },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    margins: { top: 120, bottom: 120, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "✦  QUR'AN & ISLAMIC STUDIES  ✦",
                            bold: true,
                            size: 22,
                            color: "FFFFFF",
                            font: "Arial"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // Ayah Banner: وَقُلْ رَبِّ زِدْنِي عِلْمًا
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GOLD },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GOLD },
                      left: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ISLAMIC_GREEN },
                      right: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ISLAMIC_GREEN }
                    },
                    margins: { top: 140, bottom: 140, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: "﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾",
                            bold: true,
                            size: 28,
                            color: COLOR_ISLAMIC_GREEN,
                            font: "Traditional Arabic"
                          })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `"And say: My Lord, increase me in knowledge" [Surah Taha: 114]`,
                            italics: true,
                            size: 18,
                            color: COLOR_MUTED_TEXT,
                            font: "Calibri"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 140 } }),

          // Student Metadata Table (Name, Month, Teacher - Stacked full-width rows, zero side-by-side boxes)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                    },
                    margins: { top: 100, bottom: 100, left: 140, right: 140 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: isEn ? "STUDENT NAME: " : "اسم الطالب: ",
                            bold: true,
                            size: 18,
                            color: COLOR_GOLD
                          }),
                          new TextRun({
                            text: data.studentName,
                            bold: true,
                            size: 20,
                            color: COLOR_ISLAMIC_GREEN
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_GOLD },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                    },
                    margins: { top: 100, bottom: 100, left: 140, right: 140 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: isEn ? "EVALUATION MONTH: " : "شهر التقييم: ",
                            bold: true,
                            size: 18,
                            color: COLOR_GOLD
                          }),
                          new TextRun({
                            text: data.monthLabel,
                            bold: true,
                            size: 20,
                            color: COLOR_ISLAMIC_GREEN
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                    },
                    margins: { top: 100, bottom: 100, left: 140, right: 140 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: isEn ? "TEACHER NAME: " : "اسم المعلم: ",
                            bold: true,
                            size: 18,
                            color: COLOR_GOLD
                          }),
                          new TextRun({
                            text: data.teacherName,
                            bold: true,
                            size: 20,
                            color: COLOR_ISLAMIC_GREEN
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Section Title: ACHIEVEMENTS THIS MONTH
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 120 },
            children: [
              new TextRun({
                text: isEn ? "✦ ACHIEVEMENTS THIS MONTH" : "✦ إنجازات الشهر (Achievements)",
                bold: true,
                size: 24,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),

          // Full-width cards for each actual achievement
          ...data.achievements.map(ach => {
            return new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                        left: { style: BorderStyle.SINGLE, size: 10, color: COLOR_GOLD },
                        right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                      },
                      margins: { top: 140, bottom: 140, left: 160, right: 160 },
                      children: [
                        new Paragraph({
                          spacing: { after: 60 },
                          children: [
                            new TextRun({
                              text: isEn ? ach.titleEn : ach.titleAr,
                              bold: true,
                              size: 20,
                              color: COLOR_ISLAMIC_GREEN
                            }),
                            ...(ach.evaluation ? [
                              new TextRun({
                                text: `   [${ach.evaluation}]`,
                                bold: true,
                                size: 18,
                                color: COLOR_GOLD
                              })
                            ] : [])
                          ]
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: ach.content,
                              size: 20,
                              color: COLOR_DARK_TEXT
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            });
          }),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // Section Title: PERFORMANCE INDICATORS
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 120 },
            children: [
              new TextRun({
                text: isEn ? "✦ PERFORMANCE INDICATORS & DIRECTIVES" : "✦ مؤشرات الأداء والتوجيهات التربوية",
                bold: true,
                size: 24,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),

          // Indicators Table (Single-column, stacked full-width rows for active indicators only)
          ...(buildIndicatorDocxRows(data, isEn).length > 0 ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: buildIndicatorDocxRows(data, isEn)
            })
          ] : []),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // STRENGTHS
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: isEn ? "✦ STRENGTHS:" : "✦ نقاط القوة (Strengths):",
                bold: true,
                size: 20,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          ...data.strengths.map(s => (
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: s,
                  size: 20,
                  color: COLOR_DARK_TEXT
                })
              ]
            })
          )),

          new Paragraph({ spacing: { before: 140, after: 60 } }),

          // RECOMMENDATIONS
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: isEn ? "✦ RECOMMENDATIONS:" : "✦ التوصيات (Recommendations):",
                bold: true,
                size: 20,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          ...data.recommendations.map(r => (
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: r,
                  size: 20,
                  color: COLOR_DARK_TEXT
                })
              ]
            })
          )),

          new Paragraph({ spacing: { before: 140, after: 60 } }),

          // NEXT MONTH GOALS
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: isEn ? "✦ NEXT MONTH GOALS:" : "✦ أهداف الشهر القادم (Next Month Goals):",
                bold: true,
                size: 20,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          ...data.nextMonthGoals.map(g => (
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: g,
                  size: 20,
                  color: COLOR_DARK_TEXT
                })
              ]
            })
          )),

          // --- PAGE BREAK FOR DETAILED MONTHLY REPORT ---
          new Paragraph({
            children: [new PageBreak()]
          }),

          // PAGE 2: DETAILED MONTHLY REPORT
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: isEn ? "DETAILED MONTHLY REPORT" : "التقرير الأكاديمي المفصل",
                bold: true,
                size: 28,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `~ ${data.studentName} | ${data.monthLabel} ~`,
                bold: true,
                size: 20,
                color: COLOR_GOLD
              })
            ]
          }),

          // MONTHLY PROGRESS SUMMARY
          ...(data.pedagogicalAnalysis ? [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 140, after: 100 },
              children: [
                new TextRun({
                  text: isEn ? "✦ MONTHLY PROGRESS SUMMARY" : "✦ ملخص التقدم الشهري",
                  bold: true,
                  size: 22,
                  color: COLOR_ISLAMIC_GREEN
                })
              ]
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                        left: { style: BorderStyle.SINGLE, size: 10, color: COLOR_ISLAMIC_GREEN },
                        right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                      },
                      margins: { top: 140, bottom: 140, left: 160, right: 160 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: data.pedagogicalAnalysis,
                              size: 20,
                              color: COLOR_DARK_TEXT
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new Paragraph({ spacing: { before: 140, after: 80 } })
          ] : []),

          // WHAT WE COMPLETED THIS MONTH (Only if at least one item was completed and present)
          ...(createDetailedItemsDocx(data.completedItems, isEn).length > 0 ? [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 140, after: 100 },
              children: [
                new TextRun({
                  text: isEn ? "✦ WHAT WE COMPLETED THIS MONTH" : "✦ ما تم إنجازه تفصيلياً خلال الشهر",
                  bold: true,
                  size: 22,
                  color: COLOR_ISLAMIC_GREEN
                })
              ]
            }),
            ...createDetailedItemsDocx(data.completedItems, isEn),
            new Paragraph({ spacing: { before: 200, after: 100 } })
          ] : []),

          // MONTHLY STATISTICS (Only extractable metrics when present, never fake placeholders)
          ...(createStatisticsDocxTable(data.statistics, isEn) ? [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 140, after: 100 },
              children: [
                new TextRun({
                  text: isEn ? "✦ MONTHLY STATISTICS" : "✦ الإحصائيات الشهرية المستخرجة",
                  bold: true,
                  size: 22,
                  color: COLOR_ISLAMIC_GREEN
                })
              ]
            }),
            createStatisticsDocxTable(data.statistics, isEn)!,
            new Paragraph({ spacing: { before: 200, after: 100 } })
          ] : []),

          // STUDENT INTERACTION
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 100 },
            children: [
              new TextRun({
                text: isEn ? "✦ STUDENT INTERACTION & FOCUS" : "✦ تفاعل الطالب وسلوكه التعليمي",
                bold: true,
                size: 22,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      left: { style: BorderStyle.SINGLE, size: 10, color: COLOR_ISLAMIC_GREEN },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                    },
                    margins: { top: 140, bottom: 140, left: 160, right: 160 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: data.studentInteraction,
                            size: 20,
                            color: COLOR_DARK_TEXT
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // EXPECTED PLAN FOR NEXT MONTH (12 lessons / 1 hr each)
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 100 },
            children: [
              new TextRun({
                text: isEn ? "✦ EXPECTED PLAN FOR NEXT MONTH" : "✦ الخطة المتوقعة للشهر القادم",
                bold: true,
                size: 22,
                color: COLOR_ISLAMIC_GREEN
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                      left: { style: BorderStyle.SINGLE, size: 10, color: COLOR_GOLD },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                    },
                    margins: { top: 140, bottom: 140, left: 160, right: 160 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: data.expectedNextMonthPlan,
                            size: 20,
                            color: COLOR_DARK_TEXT
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 260, after: 140 } }),

          // CLOSING DUAA & SMALL TEACHER NAME (Footer)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 100 },
            children: [
              new TextRun({
                text: "🤲  نسأل الله العظيم أن يجعل القرآن الكريم ربيع قلبه ونور صدره، وجلاء حزنه وذهاب همه  🤲",
                bold: true,
                size: 22,
                color: COLOR_ISLAMIC_GREEN,
                font: "Traditional Arabic"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({
                text: isEn ? `Teacher Name: ${data.teacherName}` : `اسم المعلم: ${data.teacherName}`,
                bold: true,
                size: 16, // 8pt small font
                color: COLOR_MUTED_TEXT
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

function buildIndicatorDocxRows(data: ComprehensiveMonthlyReportData, isEn: boolean): TableRow[] {
  const rows: TableRow[] = [];

  const hasHefz = isCleanValue(data.completedItems.newMemorization);
  if (data.indicators.memorization > 0 && hasHefz) {
    rows.push(new TableRow({
      children: [
        createIndicatorDocxCell(
          isEn ? "New Memorization" : "الحفظ الجديد (New Memorization)",
          `${data.indicators.memorization}%`,
          isEn ? "Retention Rate & Mastery" : "معدل الاستيعاب والإتقان"
        )
      ]
    }));
  }

  const hasRev = isCleanValue(data.completedItems.revision);
  if (data.indicators.revision > 0 && hasRev) {
    rows.push(new TableRow({
      children: [
        createIndicatorDocxCell(
          isEn ? "Revision & Recall" : "قوة المراجعة والتثبيت (Revision & Recall)",
          `${data.indicators.revision}%`,
          isEn ? "Recall Strength & Stability" : "جودة الاستحضار والتمكين"
        )
      ]
    }));
  }

  const hasTajweed = isCleanValue(data.completedItems.tajweedRules);
  const hasReading = isCleanValue(data.completedItems.quranReading);
  const hasNoor = isCleanValue(data.completedItems.noorAlBayan);
  if (data.indicators.tajweedAndFoundation > 0 && (hasTajweed || hasReading || hasNoor)) {
    let tajweedLabel = isEn ? "Tajweed & Foundation" : "التجويد والتأسيس (Tajweed & Foundation)";
    if (hasNoor && !hasTajweed && !hasReading) {
      tajweedLabel = isEn ? "Noor Al-Bayan & Foundation" : "نور البيان والتأسيس (Noor Al-Bayan & Foundation)";
    } else if (!hasNoor && (hasTajweed || hasReading)) {
      tajweedLabel = isEn ? "Recitation & Tajweed" : "التلاوة وأحكام التجويد (Recitation & Tajweed)";
    }

    rows.push(new TableRow({
      children: [
        createIndicatorDocxCell(
          tajweedLabel,
          `${data.indicators.tajweedAndFoundation}%`,
          isEn ? "Practical Recitation Rules" : "التطبيق العملي لأحكام التلاوة"
        )
      ]
    }));
  }

  const hasIslamic = isCleanValue(data.completedItems.islamicStudies);
  if ((data.indicators.islamicStudies || 0) > 0 && hasIslamic) {
    rows.push(new TableRow({
      children: [
        createIndicatorDocxCell(
          isEn ? "Islamic Studies" : "الدراسات الإسلامية (Islamic Studies)",
          `${data.indicators.islamicStudies}%`,
          isEn ? "Manners & Core Lessons" : "الآداب والموضوعات التربوية"
        )
      ]
    }));
  }

  if (data.indicators.commitment > 0) {
    rows.push(new TableRow({
      children: [
        createIndicatorDocxCell(
          isEn ? "Commitment & Discipline" : "الالتزام والحضور (Commitment & Discipline)",
          `${data.indicators.commitment}%`,
          isEn ? "Punctuality & Homework" : "الانضباط وحل الواجبات"
        )
      ]
    }));
  }

  return rows;
}

function createIndicatorDocxCell(label: string, value: string, sublabel?: string): TableCell {
  return new TableCell({
    shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
    },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `${label}: `,
            bold: true,
            size: 20,
            color: COLOR_DARK_TEXT
          }),
          new TextRun({
            text: value,
            bold: true,
            size: 22,
            color: COLOR_ISLAMIC_GREEN
          }),
          ...(sublabel ? [
            new TextRun({
              text: `  (${sublabel})`,
              size: 16,
              color: COLOR_MUTED_TEXT
            })
          ] : [])
        ]
      })
    ]
  });
}

function createDetailedItemsDocx(completed: ComprehensiveMonthlyReportData["completedItems"], isEn: boolean): Table[] {
  const tables: Table[] = [];

  const items = [
    { key: "newMemorization", title: isEn ? "New Memorization" : "الحفظ الجديد", val: completed.newMemorization },
    { key: "revision", title: isEn ? "Revision & Retention" : "المراجعة والتثبيت", val: completed.revision },
    { key: "quranReading", title: isEn ? "Qur'an Reading & Recitation" : "تلاوة وقراءة القرآن الكريم", val: completed.quranReading },
    { key: "noorAlBayan", title: isEn ? "Noor Al-Bayan Lessons" : "دروس نور البيان والتأسيس", val: completed.noorAlBayan },
    { key: "tajweedRules", title: isEn ? "Tajweed Rules Applied" : "أحكام التجويد المطبقة", val: completed.tajweedRules },
    { key: "islamicStudies", title: isEn ? "Islamic Studies Lessons" : "دروس الدراسات الإسلامية", val: completed.islamicStudies }
  ];

  items.forEach(item => {
    if (!item.val) return;
    tables.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
                  left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_GOLD },
                  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
                },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: `• ${item.title}`,
                        bold: true,
                        size: 20,
                        color: COLOR_ISLAMIC_GREEN
                      })
                    ]
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: item.val,
                        size: 18,
                        color: COLOR_DARK_TEXT
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  });

  return tables;
}

function createStatisticsDocxTable(stats: ComprehensiveMonthlyReportData["statistics"], isEn: boolean): Table | null {
  const statList: { label: string; val: string }[] = [];

  if (stats.pagesMemorized && stats.pagesMemorized > 0) statList.push({ label: isEn ? "Pages Memorized" : "صفحات تم حفظها", val: String(stats.pagesMemorized) });
  if (stats.pagesRevised && stats.pagesRevised > 0) statList.push({ label: isEn ? "Pages Revised" : "صفحات تم مراجعتها", val: String(stats.pagesRevised) });
  if (stats.pagesRead && stats.pagesRead > 0) statList.push({ label: isEn ? "Pages Read" : "صفحات تمت قراءتها", val: String(stats.pagesRead) });
  if (stats.tajweedRulesLearned && stats.tajweedRulesLearned > 0) statList.push({ label: isEn ? "Tajweed Rules" : "أحكام تجويد مشروحة", val: String(stats.tajweedRulesLearned) });
  if (stats.noorAlBayanLessons && stats.noorAlBayanLessons > 0) statList.push({ label: isEn ? "Noor Al-Bayan Lessons" : "دروس نور البيان", val: String(stats.noorAlBayanLessons) });
  if (stats.islamicStudiesLessons && stats.islamicStudiesLessons > 0) statList.push({ label: isEn ? "Islamic Lessons" : "دروس الدراسات الإسلامية", val: String(stats.islamicStudiesLessons) });

  if (statList.length === 0) {
    return null;
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: statList.map(s => (
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_CREAM, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER },
              left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ISLAMIC_GREEN },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_LIGHT_BORDER }
            },
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${s.label}: `,
                    bold: true,
                    size: 20,
                    color: COLOR_DARK_TEXT
                  }),
                  new TextRun({
                    text: s.val,
                    bold: true,
                    size: 22,
                    color: COLOR_ISLAMIC_GREEN
                  })
                ]
              })
            ]
          })
        ]
      })
    ))
  });
}
