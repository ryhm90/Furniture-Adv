import { font as embeddedAmiriFont } from "../../public/Amiri-Regular-normal.js";

const PDF_FONT_NAME = "AmiriPdf";
const PDF_FONT_FILE_NAME = "Amiri-Regular.ttf";
const BIDI_CONTROL_REGEX = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const MOJIBAKE_UTF8_HINT_REGEX = /[ØÙÛÃ]/;
const MOJIBAKE_UTF16_HINT_REGEX = /þ/;
const ARABIC_TEXT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
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
const CP1252_OVERRIDES = new Map([
  ["€", 0x80],
  ["‚", 0x82],
  ["ƒ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["ˆ", 0x88],
  ["‰", 0x89],
  ["Š", 0x8a],
  ["‹", 0x8b],
  ["Œ", 0x8c],
  ["Ž", 0x8e],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["˜", 0x98],
  ["™", 0x99],
  ["š", 0x9a],
  ["›", 0x9b],
  ["œ", 0x9c],
  ["ž", 0x9e],
  ["Ÿ", 0x9f],
]);

function toDisplayValue(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function encodeCp1252Bytes(value) {
  const bytes = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (typeof codePoint !== "number") {
      return null;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mappedByte = CP1252_OVERRIDES.get(character);

    if (typeof mappedByte !== "number") {
      return null;
    }

    bytes.push(mappedByte);
  }

  return new Uint8Array(bytes);
}

function decodeCandidate(value, encoding) {
  if (typeof TextDecoder === "undefined") {
    return null;
  }

  const bytes = encodeCp1252Bytes(value);

  if (!bytes || bytes.length === 0) {
    return null;
  }

  if (encoding === "utf-16be" && bytes.length % 2 !== 0) {
    return null;
  }

  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function pickBestDecodedValue(originalValue, candidates) {
  const validCandidates = candidates.filter(
    (candidate) =>
      candidate &&
      !candidate.includes("�") &&
      candidate !== originalValue &&
      ARABIC_TEXT_REGEX.test(candidate),
  );

  if (validCandidates.length === 0) {
    return originalValue;
  }

  return validCandidates.sort((left, right) => right.length - left.length)[0];
}

export function repairMojibakeText(value) {
  const text = String(value ?? "");

  if (
    ARABIC_TEXT_REGEX.test(text) &&
    !MOJIBAKE_UTF8_HINT_REGEX.test(text) &&
    !MOJIBAKE_UTF16_HINT_REGEX.test(text)
  ) {
    return text;
  }

  const candidates = [];

  if (MOJIBAKE_UTF8_HINT_REGEX.test(text)) {
    const utf8Decoded = decodeCandidate(text, "utf-8");
    if (utf8Decoded) {
      candidates.push(utf8Decoded);
    }
  }

  if (MOJIBAKE_UTF16_HINT_REGEX.test(text)) {
    const utf16BeDecoded = decodeCandidate(text, "utf-16be");
    if (utf16BeDecoded) {
      candidates.push(utf16BeDecoded);
    }
  }

  return pickBestDecodedValue(text, candidates);
}

export async function registerPdfArabicFont(doc) {
  doc.addFileToVFS(PDF_FONT_FILE_NAME, embeddedAmiriFont);
  doc.addFont(PDF_FONT_FILE_NAME, PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");
  doc.setLanguage("ar");
}

export function normalizePdfText(value, fallback = "-") {
  return repairMojibakeText(toDisplayValue(value, fallback))
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
      cell.styles.fontStyle = "normal";
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
