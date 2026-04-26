import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Import the custom font (Amiri-Regular-normal.js should export a valid Base64 string for the font)
import { font } from "../../public/Amiri-Regular-normal.js";

export const generateReportWsAll = (data) => {
  const doc = new jsPDF({ orientation: "portrait", format: "a5" });

  // Add custom Arabic font (Amiri-Regular)
  doc.addFileToVFS("Amiri-Regular.ttf", font); // Add the font file to VFS
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal"); // Register the font in jsPDF
  doc.setFont("Amiri", "normal"); // Set the font to Amiri-Regular

  // First Page: Title and Table
  doc.setFontSize(20);
  doc.text("تقرير حساب جملة ", 75, 15, { align: "center" });
  doc.setFontSize(14);
  // Calculate the sum of MPU
  const totalMPU = data.reduce((sum, record) => sum + record.MPU, 0);
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IQ", {
      style: "currency",
      currency: "IQD",
      maximumFractionDigits: 0, // No decimals for IQD
    }).format(value);
  };
  // Add the total to the report
  doc.setFontSize(10);
  let daty = format(new Date(), "yyyy-MM-dd")
  doc.text(`التاريخ: ${daty}`, 15, 25, { align: "left" });
  doc.text(`${formatCurrency(totalMPU)} : المجموع الكلي`, 15, 35, { align: "left" });

  // Convert the grouped data into the table data format
  const tableData = data.map((record) => [
    record.affiliate, // القيم المجمعة
    formatCurrency(record.MPU), // Assuming 'MPU' is a number to be formatted as currency
  ]);

  // Add the main table
  doc.autoTable({
    head: [
      [
        "البيج", "المبلغ"
      ],
    ],
    body: tableData,
    startY: 45, // Adjusted startY to prevent overlap with the "المجموع الكلي"
    styles: {
      font: "Amiri", // استخدام خط يدعم العربية
      fontSize: 8,
      halign: "center", // محاذاة النصوص في الوسط
      cellPadding: 2, // تقليل المسافة داخل الخلايا
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: '#000000', // Set text color
      fillColor: [211, 211, 211], // لون العنوان (اختياري)
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60 },
    },
    tableWidth: "auto", // Use appropriate table width based on content
    rtl: true, // Support right-to-left direction for Arabic text
  });

  // Save the generated PDF
  doc.save(`Delivery_Report_${daty}.pdf`);
};
