import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import {
  applyArabicTableSupport,
  normalizePdfText,
  registerPdfArabicFont,
  renderPdfKeyValueLine,
  sanitizePdfFileName,
  shapePdfText,
} from "./pdfArabic";

const READY_STATUS = "جهزت";
const CANCELLED_STATUS = "ملغى";
const REPORT_TITLE = "تقرير التجهيز";
const UNASSIGNED_LABEL = "غير مسند";
const DASH_LABEL = "-";
const COMPANY_THEMES = [
  {
    primary: [18, 50, 50],
    secondary: [14, 116, 144],
    accent: [30, 41, 59],
    surface: [240, 249, 255],
    border: [186, 230, 253],
  },
  {
    primary: [91, 33, 182],
    secondary: [124, 58, 237],
    accent: [55, 48, 163],
    surface: [245, 243, 255],
    border: [221, 214, 254],
  },
  {
    primary: [22, 101, 52],
    secondary: [21, 128, 61],
    accent: [30, 64, 175],
    surface: [240, 253, 244],
    border: [187, 247, 208],
  },
  {
    primary: [154, 52, 18],
    secondary: [234, 88, 12],
    accent: [146, 64, 14],
    surface: [255, 247, 237],
    border: [254, 215, 170],
  },
  {
    primary: [190, 24, 93],
    secondary: [225, 29, 72],
    accent: [157, 23, 77],
    surface: [253, 242, 248],
    border: [251, 207, 232],
  },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function safeString(value, fallback = DASH_LABEL) {
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

function safeDateLabel(value, fallback = DASH_LABEL) {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return format(parsedDate, "yyyy-MM-dd");
}

function formatTimeToAmPm(timeValue) {
  const normalizedValue = safeString(timeValue, "");

  if (!normalizedValue) {
    return DASH_LABEL;
  }

  const [hours, minutes] = normalizedValue.split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) {
    return normalizedValue;
  }

  const date = new Date();
  date.setHours(parsedHours, parsedMinutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function mergeUniqueText(currentValue, nextValue) {
  const values = [...String(currentValue ?? "").split(","), ...String(nextValue ?? "").split(",")]
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(values)].join("، ");
}

function getCompanyTheme(pageName) {
  const safePageName = safeString(pageName, "default");
  let hash = 0;

  for (const character of safePageName) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return COMPANY_THEMES[Math.abs(hash) % COMPANY_THEMES.length];
}

function normalizeDeliveryOrders(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const invoiceNumber = safeString(row?.InvoNum, "");

    if (!invoiceNumber) {
      return;
    }

    const existing = map.get(invoiceNumber);
    const materialName = safeString(row?.RoomName || row?.RoomNames, "");
    const materialCount = safeString(row?.countt, "0");

    if (!existing) {
      map.set(invoiceNumber, {
        invoiceNumber,
        clientName: safeString(row?.ClName),
        phones:
          [safeString(row?.CellPhone, ""), safeString(row?.CellPhone1, "")]
            .filter(Boolean)
            .join("، ") || DASH_LABEL,
        address:
          [safeString(row?.Provin, ""), safeString(row?.Provin2, "")]
            .filter(Boolean)
            .join(" - ") || DASH_LABEL,
        driver: safeString(row?.Driver, UNASSIGNED_LABEL),
        technician: safeString(row?.CarNam, UNASSIGNED_LABEL),
        time: formatTimeToAmPm(row?.time),
        status: safeString(row?.warehouseS),
        receiptStatus: safeString(row?.Por),
        provideDate: safeDateLabel(row?.Provide),
        floor: safeString(row?.Floor),
        floorCost: safeNumber(row?.FloorCost),
        moneyRemain: safeNumber(row?.MoneyRemain),
        details: safeString(row?.details),
        materials: materialName ? [{ name: materialName, count: materialCount }] : [],
      });
      return;
    }

    if (materialName) {
      existing.materials.push({ name: materialName, count: materialCount });
    }
  });

  return Array.from(map.values()).map((order) => ({
    ...order,
    materialSummary:
      order.materials.length > 0
        ? order.materials
            .map((item) => `${safeString(item.name)} × ${safeString(item.count, "0")}`)
            .reduce((summary, current) => mergeUniqueText(summary, current), "")
        : DASH_LABEL,
  }));
}

function summarizeAssignments(orders, field) {
  const map = new Map();

  orders.forEach((order) => {
    const name = safeString(order?.[field], UNASSIGNED_LABEL);
    const existing = map.get(name) ?? {
      name,
      count: 0,
      ready: 0,
      pending: 0,
      cancelled: 0,
      floorCost: 0,
      remaining: 0,
    };

    existing.count += 1;
    existing.floorCost += safeNumber(order.floorCost);
    existing.remaining += safeNumber(order.moneyRemain);

    if (order.receiptStatus === CANCELLED_STATUS) {
      existing.cancelled += 1;
    } else if (order.status === READY_STATUS) {
      existing.ready += 1;
    } else {
      existing.pending += 1;
    }

    map.set(name, existing);
  });

  return Array.from(map.values()).sort((left, right) => right.count - left.count);
}

function drawHeader(doc, { pageName, theme }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const safePageName = safeString(pageName, "اسم غير محدد");

  doc.setFillColor(...theme.primary);
  doc.roundedRect(12, 10, pageWidth - 24, 34, 4, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(shapePdfText(doc, REPORT_TITLE), pageWidth / 2, 23, { align: "center" });

  doc.setFillColor(...theme.secondary);
  doc.roundedRect(pageWidth - 112, 15, 94, 12, 3, 3, "F");
  doc.setFontSize(16);
  doc.text(shapePdfText(doc, safePageName), pageWidth - 65, 22.6, { align: "center",  });

  doc.setFontSize(10);

  doc.setTextColor(15, 23, 42);
}

function drawMetricCard(doc, { x, y, width, title, value, color }) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 22, 3, 3, "FD");

  doc.setFillColor(...color);
  doc.roundedRect(x + width - 8, y + 3, 4, 16, 1.5, 1.5, "F");

  doc.setFontSize(10);
  doc.text(shapePdfText(doc, title), x + width - 12, y + 8, { align: "right" });
  doc.setFontSize(13);
  doc.text(shapePdfText(doc, value), x + width - 12, y + 16, { align: "right" });
}

function addFooters(doc, selectedDate) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, 202, pageWidth - 12, 202);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(shapePdfText(doc, REPORT_TITLE), pageWidth - 14, 208, { align: "right" });
    doc.text(normalizePdfText(selectedDate, DASH_LABEL), pageWidth / 2, 208, { align: "center" });
    doc.text(`${index} / ${pageCount}`, 14, 208, { align: "left" });
  }
}

function drawDetailRows(doc, rows, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const anchors = [pageWidth - 14, 188, 100];

  rows.forEach((fields, rowIndex) => {
    const currentY = startY + rowIndex * 10;

    fields.forEach((field, fieldIndex) => {
      if (!field) {
        return;
      }

      renderPdfKeyValueLine(doc, pageWidth, currentY, field.label, field.value, {
        rightX: anchors[fieldIndex] ?? pageWidth - 14,
      });
    });
  });
}

export const generateReport = async (data, selectedDateOrOptions, pageNameArg) => {
  const options =
    typeof selectedDateOrOptions === "object" && selectedDateOrOptions !== null
      ? selectedDateOrOptions
      : {
          selectedDate: selectedDateOrOptions,
          pageName: pageNameArg,
        };

  const {
    selectedDate = "",
    pageName = "اسم غير محدد",
  } = options;

  const rows = Array.isArray(data) ? data : [];
  const orders = normalizeDeliveryOrders(rows);
  const driversSummary = summarizeAssignments(orders, "driver");
  const techniciansSummary = summarizeAssignments(orders, "technician");
  const pageWidth = 297;

  const readyCount = orders.filter((order) => order.status === READY_STATUS).length;
  const cancelledCount = orders.filter((order) => order.receiptStatus === CANCELLED_STATUS).length;
  const pendingCount = orders.length - readyCount - cancelledCount;
  const totalFloorCost = orders.reduce((sum, order) => sum + safeNumber(order.floorCost), 0);
  const totalRemaining = orders.reduce((sum, order) => sum + safeNumber(order.moneyRemain), 0);
  const unassignedDrivers = orders.filter((order) => order.driver === UNASSIGNED_LABEL).length;
  const unassignedTechnicians = orders.filter((order) => order.technician === UNASSIGNED_LABEL).length;
  const theme = getCompanyTheme(pageName);

  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  await registerPdfArabicFont(doc);

  drawHeader(doc, { pageName, theme });

  [
    {
      title: "إجمالي الوصولات",
      value: numberFormatter.format(orders.length),
      color: theme.primary,
    },
    {
      title: "الوصولات الجاهزة",
      value: numberFormatter.format(readyCount),
      color: [22, 101, 52],
    },
    {
      title: "الوصولات المعلقة",
      value: numberFormatter.format(pendingCount),
      color: [180, 83, 9],
    },
    {
      title: "الوصولات الملغاة",
      value: numberFormatter.format(cancelledCount),
      color: [185, 28, 28],
    },
    {
      title: "إجمالي التفريغ",
      value: formatCurrency(totalFloorCost),
      color: [29, 78, 216],
    },
    {
      title: "إجمالي المتبقي",
      value: formatCurrency(totalRemaining),
      color: theme.secondary,
    },
  ].forEach((metric, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    drawMetricCard(doc, {
      x: 18 + column * 88,
      y: 46 + row * 28,
      width: 82,
      ...metric,
    });
  });

  drawDetailRows(
    doc,
    [
      [
        { label: "وصولات غير مسندة لسائق", value: numberFormatter.format(unassignedDrivers) },
        {
          label: "وصولات غير مسندة لفني تركيب",
          value: numberFormatter.format(unassignedTechnicians),
        },
      ],
    ],
    110,
  );

  doc.setFontSize(14);
  doc.text(shapePdfText(doc, "ملخص التوزيع حسب السائق"), pageWidth - 14, 130, {
    align: "right",
  });

  autoTable(doc, {
    startY: 134,
    head: [[
      "السائق",
      "الوصولات",
      "جاهز",
      "معلق",
      "ملغى",
      "تكلفة التفريغ",
      "المتبقي",
    ]],
    body: driversSummary.map((item) => [
      item.name,
      numberFormatter.format(item.count),
      numberFormatter.format(item.ready),
      numberFormatter.format(item.pending),
      numberFormatter.format(item.cancelled),
      formatCurrency(item.floorCost),
      formatCurrency(item.remaining),
    ]),
    styles: {
      fontSize: 11,
      halign: "center",
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: theme.primary,
      textColor: 255,
      halign: "center",
    },
    margin: { left: 12, right: 12 },
    ...applyArabicTableSupport(doc),
  });

  doc.addPage("a4", "landscape");
  drawHeader(doc, { pageName, theme });

  doc.setFontSize(14);
  doc.text(shapePdfText(doc, "ملخص التوزيع حسب فني التركيب"), pageWidth - 14, 39, {
    align: "right",
  });

  autoTable(doc, {
    startY: 48,
    head: [[
      "فني التركيب",
      "الوصولات",
      "جاهز",
      "معلق",
      "ملغى",
      "المتبقي",
    ]],
    body: techniciansSummary.map((item) => [
      item.name,
      numberFormatter.format(item.count),
      numberFormatter.format(item.ready),
      numberFormatter.format(item.pending),
      numberFormatter.format(item.cancelled),
      formatCurrency(item.remaining),
    ]),
    styles: {
      fontSize: 11,
      halign: "center",
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: theme.secondary,
      textColor: 255,
      halign: "center",
    },
    margin: { left: 12, right: 12 },
    ...applyArabicTableSupport(doc),
  });

  const summaryStartY = (doc.lastAutoTable?.finalY ?? 48) + 10;
  doc.setFontSize(14);
  doc.text(shapePdfText(doc, "الملخص التنفيذي للوصولات"), pageWidth - 14, summaryStartY, {
    align: "right",
  });

  const executiveArabicSupport = applyArabicTableSupport(doc);

  autoTable(doc, {
    startY: summaryStartY + 4,
    head: [[
      "الزبون",
      "أرقام الهاتف",
      "العنوان",
        "المواد",
      "السائق",
      "فني التركيب",
      "التفريغ",
      "المتبقي",
    ]],
    body: orders.map((order) => [
      order.clientName,
      order.phones,
      order.address,
            order.materialSummary,
      order.driver,
      order.technician,
      formatCurrency(order.floorCost),
      formatCurrency(order.moneyRemain),
    ]),
    styles: {
      fontSize: 10,
      halign: "center",
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: theme.accent,
      textColor: 255,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 38 },
      5: { cellWidth: 26 },
      6: { cellWidth: 28 },
      7: { cellWidth: 22 },
    },
    margin: { left: 12, right: 12, bottom: 16 },
    didParseCell: (hookData) => {
      executiveArabicSupport.didParseCell?.(hookData);
    },
  });

  orders.forEach((order) => {
    doc.addPage("a4", "landscape");
    drawHeader(doc, { pageName, theme });

    doc.setFillColor(...theme.surface);
    doc.setDrawColor(...theme.border);
    doc.roundedRect(12, 47, pageWidth - 24, 48, 4, 4, "FD");

    doc.setFontSize(14);
    renderPdfKeyValueLine(doc, pageWidth, 56, "تفاصيل الوصل رقم", order.invoiceNumber, {
      rightX: pageWidth - 14,
    });

    drawDetailRows(
      doc,
      [
        [
          { label: "الزبون", value: order.clientName },
          { label: "تاريخ التجهيز", value: order.provideDate },
          { label: "الهاتف", value: order.phones },
        ],
        [
          { label: "العنوان", value: order.address },
          { label: "السائق", value: order.driver },
          { label: "فني التركيب", value: order.technician },
        ],
        [
          { label: "الطابق", value: order.floor },
          { label: "حالة التجهيز", value: order.status },
        ],
      ],
      64,
    );

    autoTable(doc, {
      startY: 98,
      head: [["المادة", "العدد"]],
      body:
        order.materials.length > 0
          ? order.materials.map((item) => [item.name, item.count])
          : [[DASH_LABEL, DASH_LABEL]],
      styles: {
        fontSize: 12,
        halign: "center",
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: theme.primary,
        textColor: 255,
        halign: "center",
      },
      margin: { left: 12, right: 12 },
      ...applyArabicTableSupport(doc),
    });

    const financialStartY = (doc.lastAutoTable?.finalY ?? 98) + 10;

    drawDetailRows(
      doc,
      [
        [
          { label: "تكلفة التفريغ", value: formatCurrency(order.floorCost) },
          { label: "المبلغ المتبقي", value: formatCurrency(order.moneyRemain) },
        ],
      ],
      financialStartY,
    );

    const detailsLabel = shapePdfText(doc, "التفاصيل");
    const detailsValue = shapePdfText(doc, order.details);
    const detailsText = doc.splitTextToSize(`${detailsLabel}: ${detailsValue}`, pageWidth - 28);
    doc.text(detailsText, pageWidth - 14, financialStartY + 12, { align: "right" });
  });

  addFooters(doc, selectedDate);
  doc.save(`delivery-report-${sanitizePdfFileName(selectedDate || "no-date")}.pdf`);
};
