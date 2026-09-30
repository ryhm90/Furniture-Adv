import { repairMojibakeText } from "./pdfArabic";

const BUY_LABEL = "\u0634\u0631\u0627\u0621";
const CANCELLED_LABEL = "\u0645\u0644\u063a\u0627\u0629";
const PAYMENT_LABEL = "\u062a\u0633\u062f\u064a\u062f";

export const mapWholesaleTransactionType = (value) => {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (!normalizedValue) {
    return "-";
  }

  if (normalizedValue === "buy") {
    return BUY_LABEL;
  }

  if (normalizedValue === "canceled" || normalizedValue === "cancelled") {
    return CANCELLED_LABEL;
  }

  if (normalizedValue === "payment" || normalizedValue === "pay") {
    return PAYMENT_LABEL;
  }

  return repairMojibakeText(String(value));
};
