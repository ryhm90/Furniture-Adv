import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Import the custom font (Amiri-Regular-normal.js should export a valid Base64 string for the font)
import { font } from "../../public/Amiri-Regular-normal.js";

export const generateReportinvAll = (data) => {
  const doc = new jsPDF({ orientation: "landscape", format: "a5" });

  // Add custom Arabic font (Amiri-Regular)
  doc.addFileToVFS("Amiri-Regular.ttf", font);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri", "normal");

  // First Page: Title and Table
  doc.setFontSize(20);
  doc.text("تقرير الموجودات المخزنية ", 160, 15, { align: "center" });
  doc.setFontSize(14);

  // Add the total to the report
  doc.setFontSize(12);
  const daty = format(new Date(), "yyyy-MM-dd");
  doc.text(`التاريخ: ${daty}`, 30, 25, { align: "left" });

  // Filter data to exclude rows where Total is 0 or less
  const filteredData = data.filter((record) => record.Total > 0);

  // Convert the filtered data into the table data format
  const tableData = filteredData.map((record) => [
    record.DelevCount,
    record.Total,
    record.TotalSellCount,
    record.RoomCounts,
    record.RoomName,
    record.id,
  ]);

  // Add the main table
  doc.autoTable({
    head: [
      ["المستلم", "المخزن", "غير مجهز", "المتاح", "المادة", "No."],
    ],
    body: tableData,
    startY: 35,
    styles: {
      font: "Amiri",
      fontSize: 8,
      halign: "center",
      cellPadding: 2,
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: '#000000',
      fillColor: [211, 211, 211],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 50 },
      5: { cellWidth: 25 },
    },
    tableWidth: "auto",
    rtl: true,
  });

  // Save the generated PDF
  doc.save(`Inventory_Report_${daty}.pdf`);
};

