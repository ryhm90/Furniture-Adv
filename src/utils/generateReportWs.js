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
import { mapWholesaleTransactionType } from "./mapWholesaleTransactionType.js";

const DASH_LABEL = "-";
const CURRENCY_LABEL = "\u062f.\u0639";
const WHOLESALE_CUSTOMER_LABEL = "\u0639\u0645\u064a\u0644 \u0627\u0644\u062c\u0645\u0644\u0629";
const REPORT_TITLE = "\u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0639\u0645\u064a\u0644 \u0627\u0644\u062c\u0645\u0644\u0629";
const EXPORT_DATE_LABEL = "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0635\u062f\u064a\u0631";
const TOTAL_MOVEMENT_LABEL = "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u0631\u0643\u0629";
const INVOICE_NUMBER_LABEL = "\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629";
const DATE_LABEL = "\u0627\u0644\u062a\u0627\u0631\u064a\u062e";
const TRANSACTION_TYPE_LABEL = "\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629";
const ITEMS_LABEL = "\u0627\u0644\u0645\u0648\u0627\u062f";
const COUNT_LABEL = "\u0627\u0644\u0639\u062f\u062f";
const ADDRESS_LABEL = "\u0627\u0644\u0639\u0646\u0648\u0627\u0646";
const DRIVER_LABEL = "\u0627\u0644\u0633\u0627\u0626\u0642";
const AMOUNT_LABEL = "\u0627\u0644\u0645\u0628\u0644\u063a";
const CUMULATIVE_BALANCE_LABEL = "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062a\u0631\u0627\u0643\u0645\u064a";
const TRANSACTIONS_COUNT_LABEL = "\u0639\u062f\u062f \u0627\u0644\u062d\u0631\u0643\u0627\u062a";
const PURCHASES_COUNT_LABEL = "\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621";
const PAYMENTS_COUNT_LABEL = "\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u062a\u0633\u062f\u064a\u062f";
const CANCELLED_COUNT_LABEL = "\u0639\u0645\u0644\u064a\u0627\u062a \u0645\u0644\u063a\u0627\u0629";
const CLOSING_BALANCE_LABEL = "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062e\u062a\u0627\u0645\u064a";
const BUY_LABEL = "\u0634\u0631\u0627\u0621";
const PAYMENT_LABEL = "\u062a\u0633\u062f\u064a\u062f";
const CANCELLED_LABEL = "\u0645\u0644\u063a\u0627\u0629";
const numberFormatter = new Intl.NumberFormat("en-US");

function safeText(value, fallback = DASH_LABEL) {
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

function buildAddress(record) {
  return [safeText(record?.Provin, ""), safeText(record?.Provin2, "")]
    .filter(Boolean)
    .join(" - ") || DASH_LABEL;
}

function getTransactionTone(typeLabel) {
  if (typeLabel === BUY_LABEL) {
    return {
      fillColor: [220, 252, 231],
      textColor: [22, 101, 52],
    };
  }

  if (typeLabel === PAYMENT_LABEL) {
    return {
      fillColor: [219, 234, 254],
      textColor: [30, 64, 175],
    };
  }

  if (typeLabel === CANCELLED_LABEL) {
    return {
      fillColor: [254, 226, 226],
      textColor: [185, 28, 28],
    };
  }

  return null;
}

export const generateReportWs = async (data, affiliate) => {
  const rows = Array.isArray(data) ? data : [];
  const customerName = safeText(affiliate, WHOLESALE_CUSTOMER_LABEL);
  const exportDate = format(new Date(), "yyyy-MM-dd");
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const arabicTableSupport = applyArabicTableSupport(doc);

  await registerPdfArabicFont(doc);

  let cumulativeBalance = 0;
  let purchasesCount = 0;
  let paymentsCount = 0;
  let cancelledCount = 0;

  const tableRows = rows.map((record) => {
    const amount = safeNumber(record?.MPU);
    const typeLabel = safeText(mapWholesaleTransactionType(record?.De));
    cumulativeBalance += amount;

    if (typeLabel === BUY_LABEL) {
      purchasesCount += 1;
    } else if (typeLabel === PAYMENT_LABEL) {
      paymentsCount += 1;
    } else if (typeLabel === CANCELLED_LABEL) {
      cancelledCount += 1;
    }

    return {
      rawType: typeLabel,
      cells: [
        safeText(record?.Invonum),
        formatStatementDate(record?.date),
        typeLabel,
        safeText(record?.RoomNames),
        safeText(record?.countt, "0"),
        buildAddress(record),
        safeText(record?.Driver),
        formatCurrency(amount),
        formatCurrency(cumulativeBalance),
      ],
    };
  });

  const totalAmount = rows.reduce((sum, record) => sum + safeNumber(record?.MPU), 0);

  doc.setFillColor(20, 55, 62);
  doc.roundedRect(12, 10, pageWidth - 24, 28, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(shapePdfText(doc, REPORT_TITLE), pageWidth / 2, 21, { align: "center" });
  doc.setFontSize(14);
  doc.text(shapePdfText(doc, customerName), pageWidth / 2, 31, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, EXPORT_DATE_LABEL, exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, TOTAL_MOVEMENT_LABEL, formatCurrency(totalAmount));

  const summaryCards = [
    { title: TRANSACTIONS_COUNT_LABEL, value: numberFormatter.format(rows.length), color: [20, 55, 62] },
    { title: PURCHASES_COUNT_LABEL, value: numberFormatter.format(purchasesCount), color: [22, 101, 52] },
    { title: PAYMENTS_COUNT_LABEL, value: numberFormatter.format(paymentsCount), color: [30, 64, 175] },
    { title: CANCELLED_COUNT_LABEL, value: numberFormatter.format(cancelledCount), color: [185, 28, 28] },
    { title: CLOSING_BALANCE_LABEL, value: formatCurrency(cumulativeBalance), color: [91, 33, 182] },
  ];

  summaryCards.forEach((card, index) => {
    const x = 16 + index * 55;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 66, 50, 20, 3, 3, "FD");
    doc.setFillColor(...card.color);
    doc.roundedRect(x + 42.5, 69, 3, 14, 1, 1, "F");
    doc.setFontSize(9);
    doc.text(shapePdfText(doc, card.title), x + 40, 74, { align: "right" });
    doc.setFontSize(11);
    doc.text(shapePdfText(doc, card.value), x + 40, 82, { align: "right" });
  });

  autoTable(doc, {
    startY: 96,
    head: [[
      INVOICE_NUMBER_LABEL,
      DATE_LABEL,
      TRANSACTION_TYPE_LABEL,
      ITEMS_LABEL,
      COUNT_LABEL,
      ADDRESS_LABEL,
      DRIVER_LABEL,
      AMOUNT_LABEL,
      CUMULATIVE_BALANCE_LABEL,
    ]],
    body: tableRows.map((row) => row.cells),
    styles: {
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: 2.2,
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
      0: { cellWidth: 24 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 56 },
      4: { cellWidth: 14 },
      5: { cellWidth: 54 },
      6: { cellWidth: 22 },
      7: { cellWidth: 26 },
      8: { cellWidth: 28 },
    },
    margin: { left: 12, right: 12, bottom: 16 },
    didParseCell: (hookData) => {
      arabicTableSupport.didParseCell?.(hookData);

      if (hookData.section === "body" && hookData.column.index === 2) {
        const tone = getTransactionTone(tableRows[hookData.row.index]?.rawType);
        if (tone) {
          Object.assign(hookData.cell.styles, tone);
        }
      }
    },
  });

  doc.save(`wholesale-statement-${sanitizePdfFileName(customerName)}-${exportDate}.pdf`);
};
