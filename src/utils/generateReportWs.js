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

function buildAddress(record) {
  return [safeText(record?.Provin, ""), safeText(record?.Provin2, "")]
    .filter(Boolean)
    .join(" - ") || DASH_LABEL;
}

function getTransactionTone(typeLabel) {
  if (typeLabel === "شراء") {
    return {
      fillColor: [220, 252, 231],
      textColor: [22, 101, 52],
      fontStyle: "bold",
    };
  }

  if (typeLabel === "تسديد") {
    return {
      fillColor: [219, 234, 254],
      textColor: [30, 64, 175],
      fontStyle: "bold",
    };
  }

  if (typeLabel === "ملغاة") {
    return {
      fillColor: [254, 226, 226],
      textColor: [185, 28, 28],
      fontStyle: "bold",
    };
  }

  return null;
}

export const generateReportWs = async (data, affiliate) => {
  const rows = Array.isArray(data) ? data : [];
  const customerName = safeText(affiliate, "عميل الجملة");
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

    if (typeLabel === "شراء") {
      purchasesCount += 1;
    } else if (typeLabel === "تسديد") {
      paymentsCount += 1;
    } else if (typeLabel === "ملغاة") {
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
  doc.text(shapePdfText(doc, "كشف حساب عميل الجملة"), pageWidth / 2, 21, { align: "center" });
  doc.setFontSize(14);
  doc.text(shapePdfText(doc, customerName), pageWidth / 2, 31, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  renderPdfKeyValueLine(doc, pageWidth, 48, "تاريخ التصدير", exportDate);
  renderPdfKeyValueLine(doc, pageWidth, 56, "إجمالي الحركة", formatCurrency(totalAmount));

  const summaryCards = [
    { title: "عدد الحركات", value: numberFormatter.format(rows.length), color: [20, 55, 62] },
    { title: "عمليات الشراء", value: numberFormatter.format(purchasesCount), color: [22, 101, 52] },
    { title: "عمليات التسديد", value: numberFormatter.format(paymentsCount), color: [30, 64, 175] },
    { title: "عمليات ملغاة", value: numberFormatter.format(cancelledCount), color: [185, 28, 28] },
    { title: "الرصيد الختامي", value: formatCurrency(cumulativeBalance), color: [91, 33, 182] },
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
      "رقم الفاتورة",
      "التاريخ",
      "نوع الحركة",
      "المواد",
      "العدد",
      "العنوان",
      "السائق",
      "المبلغ",
      "الرصيد التراكمي",
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
