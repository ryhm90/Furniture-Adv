import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Import the custom font (Amiri-Regular-normal.js should export a valid Base64 string for the font)
import { font } from "../../public/Amiri-Regular-normal.js";
import { mapWholesaleTransactionType } from "./mapWholesaleTransactionType.js";

export const generateReportWs = (data, affiliate) => {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  // Add custom Arabic font (Amiri-Regular)
  doc.addFileToVFS("Amiri-Regular.ttf", font); // Add the font file to VFS
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal"); // Register the font in jsPDF
  doc.setFont("Amiri", "normal"); // Set the font to Amiri-Regular

  // First Page: Title and Table
  doc.setFontSize(20);
  doc.text("تقرير حساب جملة ", 250, 15, { align: "center" });
  doc.setFontSize(14);

  doc.text(`المستفيد :   ${affiliate}`, 250, 25, { align: "center" });

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
  doc.setFontSize(12);
  doc.text(`التاريخ: ${format(new Date(), "yyyy-MM-dd")}`, 30, 25, { align: "left" });
  doc.text(`${formatCurrency(totalMPU)} : المجموع الكلي`, 30, 35, { align: "left" });

 

  // Convert the grouped data into the table data format
  let cumulativeSum = 0;

  const tableData = data.map((record) => {
    cumulativeSum += record.MPU; // Accumulate the sum
    return [
      record.RoomNames, 
      formatCurrency(cumulativeSum), // المبلغ التراكمي (New Column)
      formatCurrency(record.MPU), // المبلغ
      record.Driver,
      `${record.Provin || ''} ${record.Provin2 || ''}`, 
      record.countt,
      format(new Date(record.date), "yyyy-MM-dd"), 
      mapWholesaleTransactionType(record.De),
      record.Invonum,
    ];
  });
  

  // Add the main table
  doc.autoTable({
    head: [
      [
        "المواد","المبلغ التراكمي" ,"المبلغ", "السائق", "العنوان", "العدد", "التاريخ", "التفاصيل","رقم الفاتورة"
      ],
    ],
    body: tableData,
    startY: 45, // Adjusted startY to prevent overlap with the "المجموع الكلي"
    styles: {
      font: "Amiri", // استخدام خط يدعم العربية
      fontSize: 9,
      halign: "center", // محاذاة النصوص في الوسط
      cellPadding: 1, // تقليل المسافة داخل الخلايا
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: '#000000', // Set text color
      fillColor: [211, 211, 211], // لون العنوان (اختياري)
    },

    tableWidth: "auto", // Use appropriate table width based on content
    rtl: true, // Support right-to-left direction for Arabic text
  });

  // Save the generated PDF
  doc.save(`Delivery_Report_${affiliate}.pdf`);
};
