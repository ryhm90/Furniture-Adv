import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Import the custom font (Amiri-Regular-normal.js should export a valid Base64 string for the font)
import { font } from "../../public/Amiri-Regular-normal.js";

export const generateReportProviders = (data) => {
  const doc = new jsPDF({ orientation: "portrait", format: "a5" });

  // Add custom Arabic font (Amiri-Regular)
  doc.addFileToVFS("Amiri-Regular.ttf", font); // Add the font file to VFS
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal"); // Register the font in jsPDF
  doc.setFont("Amiri", "normal"); // Set the font to Amiri-Regular

  // First Page: Title and Table
  doc.setFontSize(15);
  doc.text("تقرير التعاملات المالية ", 120, 15, { align: "center" });
  doc.setFontSize(14);

  doc.text(`المستفيد :   ${data[0]?.Name}`, 120, 22, { align: "center" });

  // Calculate the sum of Inn and Out, then compute the totalMPU (Inn - Out)
  const totalInn = data.reduce((sum, record) => sum + record.Inn, 0);
  const totalOut = data.reduce((sum, record) => sum + record.Out, 0);
  const totalMPU = totalInn - totalOut;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IQ", {
      style: "currency",
      currency: "IQD",
      maximumFractionDigits: 0, // No decimals for IQD
    }).format(value);
  };

  // Add the total to the report
  doc.setFontSize(12);
  doc.text(`التاريخ: ${format(new Date(), "yyyy-MM-dd")}`, 15, 25, { align: "left" });
  doc.text(`${formatCurrency(totalMPU)} : المجموع الكلي`, 15, 32, { align: "left" });


  // Initialize a variable for the cumulative total
  let cumulativeTotal = 0;

  // Convert the grouped data into the table data format
  const tableData = data.map((record) => {
    // Calculate the cumulative total (previous cumulative total + Out - Inn)
    cumulativeTotal += record.Inn - record.Out;

    return [
      record.Details, // القيم المجمعة
      formatCurrency(cumulativeTotal), // المجموع: previous cumulative total + Out - Inn
      formatCurrency(record.Out), // Assuming 'MPU' is a number to be formatted as currency
        formatCurrency(record.Inn),
      record.status, // Replace null values with an empty string
      format(new Date(record.dateIssued), "yyyy-MM-dd"), // Format the date to 'dd-MM-yyyy'
    ];
  });

  // Add the main table
  doc.autoTable({
    head: [
      [
        "التفاصيل", "المجموع", "مدين", "دائن", "الحالة", "التاريخ"
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
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
    tableWidth: "auto", // Use appropriate table width based on content
    rtl: true, // Support right-to-left direction for Arabic text
  });

  // Save the generated PDF
  doc.save(`Provider_Report_${data[0]?.Name}.pdf`);
};
