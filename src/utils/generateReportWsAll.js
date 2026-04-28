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

function safeText(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function safeNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `${numberFormatter.format(safeNumber(value))} د.ع`;
}

export const generateReportWsAll = async (data) => {
  const rows = Array.isArray(data) ? data : [];
  const exportDate = format(new Date(), "yyyy-MM-dd");
  const totalAmount = rows.reduce((sum, record) => sum + safeNumber(record?.MPU), 0);
  const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const arabicTableSupport = applyArabicTableSupport(doc);

  await registerPdfArabicFont(doc);

  doc.setFillColor(20, 55, 62);
  doc.roundedRect(12, 10, pageWidth - 24, 26, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(shapePdfText(doc, "تقرير أرصدة عملاء الجملة"), pageWidth / 2, 22, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, "تاريخ التصدير", exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, "إجمالي الأرصدة", formatCurrency(totalAmount));
  renderPdfKeyValueLine(doc, pageWidth, 64, "عدد العملاء", numberFormatter.format(rows.length));

  autoTable(doc, {
    startY: 74,
    head: [["اسم الزبون", "الرصيد"]],
    body: rows.map((record) => [safeText(record?.affiliate), formatCurrency(record?.MPU)]),
    styles: {
      fontSize: 10,
      halign: "center",
      cellPadding: 2.5,
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
      0: { cellWidth: 110 },
      1: { cellWidth: 60 },
    },
    margin: { left: 18, right: 18, bottom: 16 },
    didParseCell: (hookData) => {
      arabicTableSupport.didParseCell?.(hookData);
    },
  });

  doc.save(`wholesale-customers-summary-${sanitizePdfFileName(exportDate)}.pdf`);
};
