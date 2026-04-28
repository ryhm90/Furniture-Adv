import {
  applyArabicTableSupport,
  registerPdfArabicFont,
  renderPdfKeyValueLine,
  sanitizePdfFileName,
  shapePdfText,
} from "./pdfArabic";

const DASH_LABEL = "-";

function toDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return DASH_LABEL;
  }

  return String(value);
}

function formatFilterValueForPdf(label, value) {
  if (label.trim() === "الفترة") {
    return value.replace(/\s+إلى\s+/g, " - ");
  }

  return value;
}

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

  const isSummaryOnly = reportType === "comparative" || columns.length === 0;
  const doc = new jsPDF({
    orientation: !isSummaryOnly && columns.length > 6 ? "landscape" : "portrait",
    format: "a4",
  });

  await registerPdfArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const exportDate = new Date().toLocaleDateString("ar-IQ");
  const arabicTableSupport = applyArabicTableSupport(doc);

  doc.setFontSize(18);
  doc.text(shapePdfText(doc, reportLabel), pageWidth - 14, 18, { align: "right" });

  doc.setFontSize(10);
  let currentY = 28;
  renderPdfKeyValueLine(doc, pageWidth, currentY, "تاريخ التصدير", exportDate);
  currentY += 6;

  filterSummary.forEach((line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex !== -1) {
      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      renderPdfKeyValueLine(
        doc,
        pageWidth,
        currentY,
        label,
        formatFilterValueForPdf(label, value),
      );
    } else {
      doc.text(shapePdfText(doc, line), pageWidth - 14, currentY, { align: "right" });
    }

    currentY += 6;
  });

  if (summaryRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 2,
      head: [["المؤشر", "القيمة"]],
      body: summaryRows.map((row) => [
        toDisplayValue(row.label),
        toDisplayValue(row.value),
      ]),
      theme: "grid",
      margin: { right: 14, left: 14 },
      styles: {
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
      ...arabicTableSupport,
    });

    currentY = (doc.lastAutoTable?.finalY ?? currentY) + 8;
  }

  if (!isSummaryOnly && columns.length > 0) {
    const footRows =
      Object.keys(totalsByField).length > 0
        ? [
            columns.map((col, index) => {
              if (index === 0) {
                return "الإجمالي";
              }

              if (totalsByField[col.field] === undefined) {
                return "";
              }

              return toDisplayValue(totalsByField[col.field]);
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
          return toDisplayValue(displayValue);
        }),
      ),
      foot: footRows,
      showFoot: footRows.length ? "lastPage" : "never",
      theme: "grid",
      margin: { right: 14, left: 14 },
      styles: {
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
      ...arabicTableSupport,
    });
  }

  doc.save(
    `${sanitizePdfFileName(reportLabel)}-${sanitizePdfFileName(new Date().toISOString().slice(0, 10))}.pdf`,
  );
}
