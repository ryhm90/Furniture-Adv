import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale"; // For Arabic locale, if needed

// Import the custom font (Amiri-Regular-normal.js should export a valid Base64 string for the font)
import { font } from "../../public/Amiri-Regular-normal.js";

export const generateReport = (data, selectedDate,pageName) => {
  const doc = new jsPDF({ orientation: "landscape", format: "a5" });

  // Add custom Arabic font (Amiri-Regular)
  doc.addFileToVFS("Amiri-Regular.ttf", font); // Add the font file to VFS
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal"); // Register the font in jsPDF
  doc.setFont("Amiri", "normal"); // Set the font to Amiri-Regular

  // First Page: Title and Table
  doc.setFontSize(20);
  doc.text("تقرير التسليم", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text(`التاريخ: ${selectedDate}`, 200, 30, { align: "right" }); // Date aligned to the right

  const groupedData = data.reduce((acc, record) => {
    // Check if the InvoNum already exists in the accumulator
    const existingRecord = acc.find(item => item.InvoNum === record.InvoNum);
    
    if (existingRecord) {
      // If InvoNum exists, combine the materials
      existingRecord.RoomName = `${existingRecord.RoomName}, ${record.RoomName}`;
    } else {
      // If InvoNum doesn't exist, add a new entry
      acc.push({
        ...record,
        materials: record.RoomName,
      });
    }
  
    return acc;
  }, []);
  const formatTimeToAmPm = (time) => {
    if (!time) return "N/A"; // Return a placeholder if time is null or undefined
  
    const [hours, minutes] = time.split(":"); // Extract hours and minutes
    const date = new Date();
    date.setHours(hours, minutes);
  
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  

  // Convert the grouped data into the table data format
  var tableData = groupedData.map((record) => [
    record.FloorCost,
    record.Floor,
    formatTimeToAmPm(record.time),
    record.CarNam,
    record.Driver,
    record.RoomName,
    `${record.CellPhone}, ${record.CellPhone1}`,
    `${record.Provin}, ${record.Provin2}`,
    record.ClName,
      // Use the combined materials field
  ]);



  // Add the main table
  doc.autoTable({
    head: [
      [
        "المبلغ",
        "الطابق",
        "الوقت",
        "النجار",
        "السائق",
        "المواد",
        "الهواتف",
        "العنوان",
        "الاسم",
      ],
    ],
    body: tableData,
    startY: 40,
    styles: {
      font: "Amiri", // استخدام خط يدعم العربية
      fontSize: 10,
      halign: "center", // محاذاة النصوص في الوسط
      cellPadding: 2, // تقليل المسافة داخل الخلايا
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: '#000000', // Set text col
      fillColor: [211, 211, 211], // لون العنوان (اختياري)
    },
    columnStyles: {
      0: { cellWidth: 15 }, // تحديد عرض العمود الأول (التفريغ)
      1: { cellWidth: 15 }, // تحديد عرض العمود الثاني (الطابق)
      2: { cellWidth: 15 }, // تحديد عرض العمود الثالث (الوقت)
      3: { cellWidth: 15 }, // تحديد عرض العمود الرابع (النجار)
      4: { cellWidth: 15 }, // تحديد عرض العمود الخامس (السائق)
      5: { cellWidth: 30 }, // تحديد عرض العمود السادس (المواد)
      6: { cellWidth: 22 }, // تحديد عرض العمود السابع (الهواتف)
      7: { cellWidth: 30 }, // تحديد عرض العمود الثامن (العنوان)
      8: { cellWidth: 30 }, // تحديد عرض العمود التاسع (الاسم)
    },
    tableWidth: "auto", // استخدام العرض الإجمالي المناسب للمحتوى
    rtl: true, // دعم الاتجاه من اليمين لليسار
  });
  

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IQ", {
      style: "currency",
      currency: "IQD",
      maximumFractionDigits: 0, // No decimals for IQD
    }).format(value);
  };
 // Group data by invonum
// Group data by invonum
const groupedDataS = data.reduce((acc, record) => {
  if (!acc[record.InvoNum]) {
    acc[record.InvoNum] = [];
  }
  acc[record.InvoNum].push(record);
  return acc;
}, {});

// Loop through grouped data to create pages
Object.entries(groupedDataS).forEach(([_invoNum, records]) => {
  // Add a new page for each group (skip for the first group)
  if (tableData.length > 0) {
    doc.addPage("a5", "landscape");
  }

  // Header on each page
  doc.setFontSize(20);
doc.text(pageName || "اسم غير محدد", 200, 20, { align: "right" });

  // Use the first record in the group for common details
  const firstRecord = records[0];
  const provide = format(new Date(firstRecord.Provide), "yyyy-MM-dd", { locale: ar });
  const clientName = firstRecord.ClName || ""; // Default to empty string if null
  const address = `${firstRecord.Provin || ""}, ${firstRecord.Provin2 || ""}`;
  const phones = `${firstRecord.CellPhone || ""}, ${firstRecord.CellPhone1 || ""}`;
  const details = firstRecord.details || "";

  doc.setFontSize(12);
  doc.text(`العميل: ${clientName}`, 200, 30, { align: "right" });
  doc.text(`تاريخ التجهيز: ${provide}`, 80, 30, { align: "right" });
  doc.text(`العنوان: ${address}`, 200, 37, { align: "right" });
  doc.text(`الهاتف: ${phones}`, 80, 37, { align: "right" });
  doc.text(`التفاصيل: ${details}`, 200, 44, { align: "right" });

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(10, 49, 200, 49);

  // Prepare table data for this invonum
  const tableDataO = records.map((record) => [
    record.RoomName,
    record.countt,
  ]);

  // Add sub-table for detailed data (RoomName values displayed row by row)
  doc.autoTable({
    head: [["تفاصيل المواد", "العدد"]],
    body: tableDataO,
    startY: 56,
    styles: {
      font: "Amiri", // Ensure Arabic font is applied here too
      fontSize: 12,
      halign: "center",
    },
    headStyles: {
      halign: "center",
      valign: "middle",
      textColor: '#000000', // Set text col
      fillColor: [211, 211, 211], // لون العنوان (اختياري)
    },
    rtl: true, // Enable RTL for Arabic
  });

  // Add additional data side by side under the table
  const startY = doc.lastAutoTable.finalY + 10; // Position under the table
  const driver = firstRecord.Driver || "";
  const technician = firstRecord.CarNam || "";
  const floor = firstRecord.Floor || "";
  const floorCost = firstRecord.FloorCost || 0; // Default to 0 if null
  const moneyRemain = firstRecord.MoneyRemain || 0; // Default to 0 if null

  // First row of data
  doc.text(`السائق: ${driver}`, 200, startY, { align: "right" });
  doc.text(`فني التركيب: ${technician}`, 140, startY, { align: "right" });

  // Second row of data
  doc.text(`الطابق: ${floor}`, 200, startY + 10, { align: "right" });
  doc.text(`${formatCurrency(floorCost)} : تكلفة التفريغ`, 140, startY + 10, { align: "right" });

  // Third row of data
  doc.text(`${formatCurrency(moneyRemain)} : المتبقي`, 200, startY + 20, { align: "right" });
  doc.setFontSize(10);
  //doc.text(`العنوان : العراق - بغداد - الكرخ - الاسكان شارع 14 رمضان مقابل اعدادية الصناعة المهنية`, 200, 135, { align: "right" });
  //doc.text(`رقم الهاتف : 07700773131`, 200, 140, { align: "right" });

});





  
  // Save the generated PDF
  doc.save(`Delivery_Report_${selectedDate}.pdf`);
  
};
