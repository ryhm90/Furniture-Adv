const PDF_FONT_NAME = "AmiriPdf";
const PDF_FONT_FILE_NAME = "Amiri-Regular.ttf";
const PDF_FONT_URL = "/Amiri-Regular.ttf";
const BIDI_CONTROL_REGEX = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const ARABIC_DIGIT_MAP = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

let fontBase64Promise;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function toDisplayValue(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

async function loadFontBase64() {
  if (!fontBase64Promise) {
    fontBase64Promise = fetch(PDF_FONT_URL, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل خط التقرير.");
        }

        return response.arrayBuffer();
      })
      .then((buffer) => arrayBufferToBase64(buffer));
  }

  return fontBase64Promise;
}

export async function registerPdfArabicFont(doc) {
  const fontBase64 = await loadFontBase64();
  doc.addFileToVFS(PDF_FONT_FILE_NAME, fontBase64);
  doc.addFont(PDF_FONT_FILE_NAME, PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");
  doc.setLanguage("ar");
}

export function normalizePdfText(value, fallback = "-") {
  return toDisplayValue(value, fallback)
    .replace(BIDI_CONTROL_REGEX, "")
    .replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit)
    .replace(/\u066C/g, ",")
    .replace(/\u066B/g, ".");
}

export function shapePdfText(doc, value, fallback = "-") {
  const normalized = normalizePdfText(value, fallback);

  if (typeof doc.processArabic === "function") {
    return doc.processArabic(normalized);
  }

  return normalized;
}

export function applyArabicTableSupport(doc) {
  return {
    didParseCell: ({ cell }) => {
      cell.text = cell.text.map((text) => shapePdfText(doc, text));
      cell.styles.font = PDF_FONT_NAME;
    },
  };
}

export function renderPdfKeyValueLine(doc, pageWidth, y, label, value, options = {}) {
  const safeLabel = shapePdfText(doc, label);
  const safeValue = shapePdfText(doc, value);
  const rightX = options.rightX ?? pageWidth - 14;
  const gap = options.gap ?? 6;

  doc.text(safeLabel, rightX, y, { align: "right" });

  const labelWidth = doc.getTextWidth(safeLabel);
  doc.text(safeValue, rightX - labelWidth - gap, y, { align: "right" });
}

export function sanitizePdfFileName(value) {
  return String(value).trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");
}

export { PDF_FONT_NAME };
