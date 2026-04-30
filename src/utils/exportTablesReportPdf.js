import {
  applyArabicTableSupport,
  registerPdfArabicFont,
  repairMojibakeText,
  renderPdfKeyValueLine,
  sanitizePdfFileName,
  shapePdfText,
} from "./pdfArabic";

const DASH_LABEL = "-";

function toDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return DASH_LABEL;
  }

  return repairMojibakeText(String(value));
}

function formatFilterValueForPdf(label, value) {
  const safeLabel = repairMojibakeText(label).trim();
  const safeValue = repairMojibakeText(value);

  if (safeLabel === "الفترة") {
    return safeValue.replace(/\s+إلى\s+/g, " - ");
  }

  return safeValue;
}

function normalizeColumns(columns) {
  return columns.map((column) => ({
    ...column,
    header: repairMojibakeText(column.header),
  }));
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

  const normalizedColumns = normalizeColumns(columns);
  const normalizedReportLabel = repairMojibakeText(reportLabel);
  const normalizedSummaryRows = summaryRows.map((row) => ({
    label: toDisplayValue(row.label),
    value: toDisplayValue(row.value),
  }));
  const normalizedFilterSummary = filterSummary.map((line) => repairMojibakeText(line));
  const isSummaryOnly = reportType === "comparative" || normalizedColumns.length === 0;

  const doc = new jsPDF({
    orientation: !isSummaryOnly && normalizedColumns.length > 6 ? "landscape" : "portrait",
    format: "a4",
  });

  await registerPdfArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const exportDate = new Date().toLocaleDateString("ar-IQ");
  const arabicTableSupport = applyArabicTableSupport(doc);

  doc.setFontSize(18);
  doc.text(shapePdfText(doc, normalizedReportLabel), pageWidth - 14, 18, { align: "right" });

  doc.setFontSize(10);
  let currentY = 28;
  renderPdfKeyValueLine(doc, pageWidth, currentY, "تاريخ التصدير", exportDate);
  currentY += 6;

  normalizedFilterSummary.forEach((line) => {
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

  if (normalizedSummaryRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 2,
      head: [["المؤشر", "القيمة"]],
      body: normalizedSummaryRows.map((row) => [row.label, row.value]),
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

  if (!isSummaryOnly && normalizedColumns.length > 0) {
    const footRows =
      Object.keys(totalsByField).length > 0
        ? [
            normalizedColumns.map((column, index) => {
              if (index === 0) {
                return "الإجمالي";
              }

              if (totalsByField[column.field] === undefined) {
                return "";
              }

              return toDisplayValue(totalsByField[column.field]);
            }),
          ]
        : [];

    autoTable(doc, {
      startY: currentY,
      head: [normalizedColumns.map((column) => column.header)],
      body: rows.map((row) =>
        normalizedColumns.map((column) => {
          const rawValue = row?.[column.field];
          const displayValue = column.format ? column.format(rawValue) : rawValue;
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
    `${sanitizePdfFileName(normalizedReportLabel)}-${sanitizePdfFileName(new Date().toISOString().slice(0, 10))}.pdf`,
  );
}
