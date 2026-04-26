import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { font } from "../../public/Amiri-Regular-normal.js";

function safeString(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function safeDateLabel(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return format(parsedDate, "yyyy-MM-dd", { locale: ar });
}

function formatTimeToAmPm(timeValue) {
  const normalizedValue = safeString(timeValue);
  if (!normalizedValue) {
    return "N/A";
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IQ", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0) || 0);
}

function groupRowsByInvoice(rows) {
  return rows.reduce((accumulator, record) => {
    const invoiceNumber = safeString(record?.InvoNum, "");

    if (!invoiceNumber) {
      return accumulator;
    }

    if (!accumulator[invoiceNumber]) {
      accumulator[invoiceNumber] = [];
    }

    accumulator[invoiceNumber].push(record);
    return accumulator;
  }, {});
}

export const generateReport = (data, selectedDate, pageName) => {
  const rows = Array.isArray(data) ? data : [];
  const doc = new jsPDF({ orientation: "landscape", format: "a5" });

  doc.addFileToVFS("Amiri-Regular.ttf", font);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri", "normal");

  doc.setFontSize(20);
  doc.text("تقرير التسليم", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text(`التاريخ: ${safeString(selectedDate, "-")}`, 200, 30, { align: "right" });

  const groupedSummaryRows = rows.reduce((accumulator, record) => {
    const invoiceNumber = safeString(record?.InvoNum, "");
    if (!invoiceNumber) {
      return accumulator;
    }

    const existingRecord = accumulator.find((item) => item.InvoNum === invoiceNumber);
    if (existingRecord) {
      existingRecord.RoomName = `${existingRecord.RoomName}, ${safeString(record?.RoomName, "")}`.replace(
        /^,\s*|,\s*$/g,
        "",
      );
    } else {
      accumulator.push({
        ...record,
        RoomName: safeString(record?.RoomName, "-"),
      });
    }

    return accumulator;
  }, []);

  const summaryTableRows = groupedSummaryRows.map((record) => [
    safeString(record?.FloorCost, "0"),
    safeString(record?.Floor, "-"),
    formatTimeToAmPm(record?.time),
    safeString(record?.CarNam, "-"),
    safeString(record?.Driver, "-"),
    safeString(record?.RoomName, "-"),
    [safeString(record?.CellPhone, ""), safeString(record?.CellPhone1, "")]
      .filter(Boolean)
      .join(", ") || "-",
    [safeString(record?.Provin, ""), safeString(record?.Provin2, "")]
      .filter(Boolean)
      .join(", ") || "-",
    safeString(record?.ClName, "-"),
  ]);

  autoTable(doc, {
    head: [[
      "المبلغ",
      "الطابق",
      "الوقت",
      "النجار",
      "السائق",
      "المواد",
      "الهواتف",
      "العنوان",
      "الاسم",
    ]],
    body: summaryTableRows,
    startY: 40,
    styles: {
      font: "Amiri",
      fontSize: 10,
      halign: "center",
      cellPadding: 2,
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: "#000000",
      fillColor: [211, 211, 211],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 15 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 30 },
      6: { cellWidth: 22 },
      7: { cellWidth: 30 },
      8: { cellWidth: 30 },
    },
    tableWidth: "auto",
  });

  const groupedRows = Object.entries(groupRowsByInvoice(rows));

  groupedRows.forEach(([invoiceNumber, records], index) => {
    if (index === 0) {
      doc.addPage("a5", "landscape");
    } else {
      doc.addPage("a5", "landscape");
    }

    const firstRecord = records[0] ?? {};
    const provideDate = safeDateLabel(firstRecord.Provide);
    const clientName = safeString(firstRecord.ClName, "-");
    const address =
      [safeString(firstRecord.Provin, ""), safeString(firstRecord.Provin2, "")]
        .filter(Boolean)
        .join(", ") || "-";
    const phones =
      [safeString(firstRecord.CellPhone, ""), safeString(firstRecord.CellPhone1, "")]
        .filter(Boolean)
        .join(", ") || "-";
    const details = safeString(firstRecord.details, "-");

    doc.setFontSize(20);
    doc.text(safeString(pageName, "اسم غير محدد"), 200, 20, { align: "right" });

    doc.setFontSize(12);
    doc.text(`العميل: ${clientName}`, 200, 30, { align: "right" });
    doc.text(`تاريخ التجهيز: ${provideDate}`, 80, 30, { align: "right" });
    doc.text(`العنوان: ${address}`, 200, 37, { align: "right" });
    doc.text(`الهاتف: ${phones}`, 80, 37, { align: "right" });
    doc.text(`التفاصيل: ${details}`, 200, 44, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(10, 49, 200, 49);

    const detailsTableRows = records.map((record) => [
      safeString(record?.RoomName, "-"),
      safeString(record?.countt, "0"),
    ]);

    autoTable(doc, {
      head: [["تفاصيل المواد", "العدد"]],
      body: detailsTableRows,
      startY: 56,
      styles: {
        font: "Amiri",
        fontSize: 12,
        halign: "center",
      },
      headStyles: {
        halign: "center",
        valign: "middle",
        textColor: "#000000",
        fillColor: [211, 211, 211],
      },
    });

    const startY = (doc.lastAutoTable?.finalY ?? 70) + 10;
    const driver = safeString(firstRecord.Driver, "-");
    const technician = safeString(firstRecord.CarNam, "-");
    const floor = safeString(firstRecord.Floor, "-");
    const floorCost = Number(firstRecord.FloorCost ?? 0) || 0;
    const moneyRemain = Number(firstRecord.MoneyRemain ?? 0) || 0;

    doc.text(`رقم الوصل: ${invoiceNumber}`, 200, startY, { align: "right" });
    doc.text(`السائق: ${driver}`, 140, startY, { align: "right" });
    doc.text(`فني التركيب: ${technician}`, 200, startY + 10, { align: "right" });
    doc.text(`الطابق: ${floor}`, 140, startY + 10, { align: "right" });
    doc.text(`تكلفة التفريغ: ${formatCurrency(floorCost)}`, 200, startY + 20, { align: "right" });
    doc.text(`المتبقي: ${formatCurrency(moneyRemain)}`, 140, startY + 20, { align: "right" });
  });

  doc.save(`Delivery_Report_${safeString(selectedDate, "بدون-تاريخ")}.pdf`);
};
