import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import {
  applyArabicTableSupport,
  registerPdfArabicFont,
  renderPdfKeyValueLine,
  sanitizePdfFileName,
  shapePdfText,
} from "./pdfArabic";

const numberFormatter = new Intl.NumberFormat("en-US");

function safeNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

export const generateReportinvAll = async (data) => {
  const rows = Array.isArray(data) ? data.filter((record) => safeNumber(record?.Total) > 0) : [];
  const exportDate = format(new Date(), "yyyy-MM-dd");
  const totalAvailable = rows.reduce((sum, record) => sum + safeNumber(record?.RoomCounts), 0);
  const totalPendingDelivery = rows.reduce((sum, record) => sum + safeNumber(record?.DelevCount), 0);
  const totalReserved = rows.reduce((sum, record) => sum + safeNumber(record?.TotalSellCount), 0);

  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();

  await registerPdfArabicFont(doc);

  doc.setFillColor(20, 55, 62);
  doc.roundedRect(12, 10, pageWidth - 24, 26, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(shapePdfText(doc, "تقرير الموجودات المخزنية"), pageWidth / 2, 22, {
    align: "center",
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, "تاريخ التصدير", exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, "عدد المواد", numberFormatter.format(rows.length));
  renderPdfKeyValueLine(doc, pageWidth, 64, "المتوفر", numberFormatter.format(totalAvailable));
  renderPdfKeyValueLine(doc, pageWidth, 72, "غير المجهز", numberFormatter.format(totalPendingDelivery));
  renderPdfKeyValueLine(doc, pageWidth, 80, "المستلم", numberFormatter.format(totalReserved));

  autoTable(doc, {
    startY: 90,
    head: [[
      "الرقم",
      "المادة",
      "المتوفر",
      "غير المجهز",
      "المخزن",
      "المستلم",
    ]],
    body: rows.map((record) => [
      safeText(record?.id),
      safeText(record?.RoomName),
      numberFormatter.format(safeNumber(record?.RoomCounts)),
      numberFormatter.format(safeNumber(record?.DelevCount)),
      numberFormatter.format(safeNumber(record?.Total)),
      numberFormatter.format(safeNumber(record?.TotalSellCount)),
    ]),
    styles: {
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: 2.3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [20, 55, 62],
      textColor: 255,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 96 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 32 },
      5: { cellWidth: 32 },
    },
    margin: { left: 12, right: 12, bottom: 16 },
    ...applyArabicTableSupport(doc),
  });

  doc.save(`inventory-report-${sanitizePdfFileName(exportDate)}.pdf`);
};
