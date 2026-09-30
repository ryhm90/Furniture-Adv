export const isBaghdad = (province) =>
  /(^|\s)بغداد($|\s)/u.test(String(province ?? "").replace(/[\u064B-\u065F\u0670\u0640]/gu, "").trim()) ||
  /^baghdad$/i.test(String(province ?? "").trim());

export const canSettle = (row) => row.warehouseS === "جهزت" && Number(row.MoneyRemain) > 0;
export const canPayDriver = (row) => row.warehouseS === "جهزت" && row.Driverflag !== "Paid" && Boolean(String(row.Driver ?? "").trim()) && Boolean(String(row.Provin ?? "").trim());
export const parseAmount = (value) => {
  if (!["number", "string"].includes(typeof value)) return NaN;
  const normalized = String(value).trim()
    .replace(/[٠-٩]/gu, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/gu, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[,٬\s]/gu, "");
  return /^\d+$/u.test(normalized) ? Number(normalized) : NaN;
};
export const validAmount = (value) => Number.isSafeInteger(parseAmount(value)) && parseAmount(value) > 0;
export const driverExclusionReason = (row) => {
  if (row.warehouseS !== "جهزت") return "لم تجهز من المخزن";
  if (row.Driverflag === "Paid") return "أجور السائق مصروفة سابقاً";
  if (!String(row.Driver ?? "").trim()) return "اسم السائق غير محدد";
  if (!String(row.Provin ?? "").trim()) return "المحافظة غير محددة";
  return "";
};
export const driverPaymentError = (rows, baghdadAmount, otherAmount) => {
  const eligible = rows.filter(canPayDriver);
  if (!eligible.length) return "لا توجد وصولات مؤهلة للصرف. راجع أسباب الاستبعاد وحدد السائق للوصولات المجهزة.";
  const missing = [];
  if (eligible.some((row) => isBaghdad(row.Provin)) && !validAmount(baghdadAmount)) missing.push("بغداد");
  if (eligible.some((row) => !isBaghdad(row.Provin)) && !validAmount(otherAmount)) missing.push("خارج بغداد");
  return missing.length ? `أدخل أجرة صحيحة أكبر من صفر لكل وصل في: ${missing.join(" و")}.` : "";
};
export const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
