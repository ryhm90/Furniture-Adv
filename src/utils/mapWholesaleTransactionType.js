export const mapWholesaleTransactionType = (value) => {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (!normalizedValue) {
    return "-";
  }

  if (normalizedValue === "buy") {
    return "شراء";
  }

  if (normalizedValue === "canceled" || normalizedValue === "cancelled") {
    return "ملغاة";
  }

  if (normalizedValue === "payment" || normalizedValue === "pay") {
    return "تسديد";
  }

  return String(value);
};
