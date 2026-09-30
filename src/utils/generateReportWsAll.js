import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import {
  applyArabicTableSupport,
  registerPdfArabicFont,
  renderPdfKeyValueLine,
  repairMojibakeText,
  sanitizePdfFileName,
  shapePdfText,
} from "./pdfArabic";

const CURRENCY_LABEL = "\u062f.\u0639";
const REPORT_TITLE = "\u062a\u0642\u0631\u064a\u0631 \u0623\u0631\u0635\u062f\u0629 \u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u062c\u0645\u0644\u0629";
const EXPORT_DATE_LABEL = "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0635\u062f\u064a\u0631";
const TOTAL_BALANCES_LABEL = "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u0631\u0635\u062f\u0629";
const CUSTOMERS_COUNT_LABEL = "\u0639\u062f\u062f \u0627\u0644\u0639\u0645\u0644\u0627\u0621";
const CUSTOMER_NAME_LABEL = "\u0627\u0633\u0645 \u0627\u0644\u0632\u0628\u0648\u0646";
const BALANCE_LABEL = "\u0627\u0644\u0631\u0635\u064a\u062f";
const numberFormatter = new Intl.NumberFormat("en-US");

function safeText(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = repairMojibakeText(String(value).trim());
  return normalized || fallback;
}

function safeNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `${numberFormatter.format(safeNumber(value))} ${CURRENCY_LABEL}`;
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
  doc.text(shapePdfText(doc, REPORT_TITLE), pageWidth / 2, 22, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, EXPORT_DATE_LABEL, exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, TOTAL_BALANCES_LABEL, formatCurrency(totalAmount));
  renderPdfKeyValueLine(doc, pageWidth, 64, CUSTOMERS_COUNT_LABEL, numberFormatter.format(rows.length));

  autoTable(doc, {
    startY: 74,
    head: [[CUSTOMER_NAME_LABEL, BALANCE_LABEL]],
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
