import { font } from "../../public/Amiri-Regular-normal.js";

const PDF_FONT_NAME = "Amiri";
const BIDI_CONTROL_REGEX = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const ARABIC_DIGIT_MAP = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const sanitizeFileName = (value) =>
  String(value).trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");

const toDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const normalizePdfText = (value) =>
  toDisplayValue(value)
    .replace(BIDI_CONTROL_REGEX, "")
    .replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit)
    .replace(/\u066C/g, ",")
    .replace(/\u066B/g, ".");

const renderKeyValueLine = (doc, pageWidth, y, label, value) => {
  const safeLabel = normalizePdfText(label);
  const safeValue = normalizePdfText(value);
  const rightX = pageWidth - 14;
  const gap = 6;

  doc.text(safeLabel, rightX, y, { align: "right" });

  const labelWidth = doc.getTextWidth(safeLabel);
  doc.text(safeValue, rightX - labelWidth - gap, y, { align: "right" });
};

const formatFilterValueForPdf = (label, value) => {
  if (label.trim() === "الفترة") {
    return value.replace(/\s+إلى\s+/g, " - ");
  }

  return value;
};

export async function exportTablesReportPdf({
  reportType,
  reportLabel,
  columns,
  rows,
  summaryRows = [],
  totalsByField = {},
  filterSummary = [],
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable =
    autoTableModule.default?.default ??
    autoTableModule.default ??
    autoTableModule.autoTable;
  const isSummaryOnly = reportType === "comparative";
  const doc = new jsPDF({
    orientation: !isSummaryOnly && columns.length > 6 ? "landscape" : "portrait",
    format: "a4",
  });

  doc.addFileToVFS("Amiri-Regular.ttf", font);
  doc.addFont("Amiri-Regular.ttf", PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");
  doc.setLanguage("ar");

  const pageWidth = doc.internal.pageSize.getWidth();
  const exportDate = new Date().toLocaleDateString("ar-IQ");

  doc.setFontSize(18);
  doc.text(normalizePdfText(reportLabel), pageWidth - 14, 18, { align: "right" });

  doc.setFontSize(10);
  let currentY = 28;
  renderKeyValueLine(doc, pageWidth, currentY, "تاريخ التصدير", exportDate);
  currentY += 6;

  filterSummary.forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex !== -1) {
      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      renderKeyValueLine(doc, pageWidth, currentY, label, formatFilterValueForPdf(label, value));
    } else {
      doc.text(normalizePdfText(line), pageWidth - 14, currentY, { align: "right" });
    }
    currentY += 6;
  });

  if (summaryRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 2,
      head: [["المؤشر", "القيمة"]],
      body: summaryRows.map((row) => [normalizePdfText(row.label), normalizePdfText(row.value)]),
      theme: "grid",
      margin: { right: 14, left: 14 },
      styles: {
        font: PDF_FONT_NAME,
        fontStyle: "normal",
        fontSize: 10,
        halign: "center",
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [211, 211, 211],
        textColor: [0, 0, 0],
        halign: "center",
      },
      bodyStyles: { halign: "center" },
      didParseCell: ({ cell }) => {
        cell.text = cell.text.map((text) => normalizePdfText(text));
      },
    });
    currentY = (doc.lastAutoTable?.finalY ?? currentY) + 8;
  }

  if (!isSummaryOnly && columns.length > 0) {
    const footRows =
      Object.keys(totalsByField).length > 0
        ? [
            columns.map((col, index) => {
              if (index === 0) return "الإجمالي";
              if (totalsByField[col.field] === undefined) return "";
              return normalizePdfText(totalsByField[col.field]);
            }),
          ]
        : [];

    autoTable(doc, {
      startY: currentY,
      head: [columns.map((col) => col.header)],
      body: rows.map((row) =>
        columns.map((col) => {
          const rawValue = row?.[col.field];
          const displayValue = col.format ? col.format(rawValue) : rawValue;
          return normalizePdfText(displayValue);
        })
      ),
      foot: footRows,
      showFoot: footRows.length ? "lastPage" : "never",
      theme: "grid",
      margin: { right: 14, left: 14 },
      styles: {
        font: PDF_FONT_NAME,
        fontStyle: "normal",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        cellPadding: 2.25,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [211, 211, 211],
        textColor: [0, 0, 0],
        halign: "center",
      },
      footStyles: {
        fillColor: [246, 249, 249],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { halign: "center" },
      didParseCell: ({ cell }) => {
        cell.text = cell.text.map((text) => normalizePdfText(text));
      },
    });
  }

  doc.save(`${sanitizeFileName(reportLabel)}-${sanitizeFileName(new Date().toISOString().slice(0, 10))}.pdf`);
}
