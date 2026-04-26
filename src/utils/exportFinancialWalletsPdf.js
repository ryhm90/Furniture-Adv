import { exportTablesReportPdf } from "@/utils/exportTablesReportPdf";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
  }).format(Number(amount ?? 0));

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
};

export async function exportFinancialWalletsPdf({
  wallets,
  searchTerm,
  balanceFilterLabel,
  sortLabel,
  summaryRows,
}) {
  const rows = wallets.map((wallet) => ({
    walletName: wallet.Name,
    walletBalance: formatCurrency(wallet.Amount),
    walletStatus:
      Number(wallet.Amount) > 0 ? "دائن" : Number(wallet.Amount) < 0 ? "مدين" : "متوازن",
  }));

  await exportTablesReportPdf({
    reportType: "financial-wallets",
    reportLabel: "تقرير المحافظ المالية",
    columns: [
      { field: "walletName", header: "المحفظة" },
      { field: "walletBalance", header: "الرصيد" },
      { field: "walletStatus", header: "الحالة" },
    ],
    rows,
    summaryRows,
    filterSummary: [
      `البحث: ${searchTerm || "الكل"}`,
      `نوع الرصيد: ${balanceFilterLabel}`,
      `الترتيب: ${sortLabel}`,
    ],
  });
}

export async function exportWalletHistoryPdf({
  walletName,
  historyRows,
  currentBalance,
}) {
  const totalIn = historyRows.reduce((sum, row) => {
    const amount = Number(row.amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const totalOut = historyRows.reduce((sum, row) => {
    const amount = Number(row.amount ?? 0);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  const rows = historyRows.map((row) => ({
    createdAt: formatDate(row.Created_at),
    amount: formatCurrency(row.amount),
    state: row.state || "-",
    details: row.details || "-",
  }));

  await exportTablesReportPdf({
    reportType: "wallet-history",
    reportLabel: `كشف حركة المحفظة - ${walletName}`,
    columns: [
      { field: "createdAt", header: "التاريخ" },
      { field: "amount", header: "المبلغ" },
      { field: "state", header: "الحالة" },
      { field: "details", header: "التفاصيل" },
    ],
    rows,
    summaryRows: [
      { label: "المحفظة", value: walletName },
      { label: "الرصيد الحالي", value: formatCurrency(currentBalance) },
      { label: "إجمالي الحركات الدائنة", value: formatCurrency(totalIn) },
      { label: "إجمالي الحركات المدينة", value: formatCurrency(totalOut) },
      { label: "عدد الحركات", value: historyRows.length },
    ],
  });
}
