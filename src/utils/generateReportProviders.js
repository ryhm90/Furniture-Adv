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
const DASH_LABEL = "-";

function safeText(value, fallback = DASH_LABEL) {
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

function formatStatementDate(value) {
  if (!value) {
    return DASH_LABEL;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return DASH_LABEL;
  }

  return format(parsedDate, "yyyy-MM-dd");
}

export const generateReportProviders = async (data) => {
  const rows = Array.isArray(data) ? data : [];
  const providerName = safeText(rows[0]?.Name, "المورد");
  const exportDate = format(new Date(), "yyyy-MM-dd");
  const totalIn = rows.reduce((sum, record) => sum + safeNumber(record?.Inn), 0);
  const totalOut = rows.reduce((sum, record) => sum + safeNumber(record?.Out), 0);
  const netBalance = totalIn - totalOut;

  const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();

  await registerPdfArabicFont(doc);

  doc.setFillColor(20, 55, 62);
  doc.roundedRect(12, 10, pageWidth - 24, 28, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(shapePdfText(doc, "تقرير التعاملات المالية"), pageWidth / 2, 21, {
    align: "center",
  });
  doc.setFontSize(13);
  doc.text(shapePdfText(doc, providerName), pageWidth / 2, 30, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, "تاريخ التصدير", exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, "إجمالي الدائن", formatCurrency(totalIn));
  renderPdfKeyValueLine(doc, pageWidth, 64, "إجمالي المدين", formatCurrency(totalOut));
  renderPdfKeyValueLine(doc, pageWidth, 72, "الرصيد الختامي", formatCurrency(netBalance));

  let runningBalance = 0;
  const arabicTableSupport = applyArabicTableSupport(doc);

  autoTable(doc, {
    startY: 82,
    head: [[
      "التاريخ",
      "الحالة",
      "الدائن",
      "المدين",
      "الرصيد التراكمي",
      "التفاصيل",
    ]],
    body: rows.map((record) => {
      runningBalance += safeNumber(record?.Inn) - safeNumber(record?.Out);

      return [
        formatStatementDate(record?.dateIssued),
        safeText(record?.status),
        formatCurrency(record?.Inn),
        formatCurrency(record?.Out),
        formatCurrency(runningBalance),
        safeText(record?.Details),
      ];
    }),
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
      0: { cellWidth: 26 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 62 },
    },
    margin: { left: 12, right: 12, bottom: 16 },
    didParseCell: (hookData) => {
      arabicTableSupport.didParseCell?.(hookData);
    },
  });

  doc.save(`provider-report-${sanitizePdfFileName(providerName)}-${exportDate}.pdf`);
};
