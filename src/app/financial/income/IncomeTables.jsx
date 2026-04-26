"use client";

import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const tableHeaderSx = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
};

const tableCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

const cardSx = {
  width: { xs: "100%", xl: "calc(50% - 8px)" },
  borderRadius: 3,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString("ar-IQ");
}

function FinancialTableCard({
  title,
  emptyLabel,
  amountLabel,
  badgeLabel,
  badgeColor,
  dateLabel = "التاريخ",
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  formatCurrency,
}) {
  return (
    <Card sx={cardSx}>
      <CardContent sx={{ p: 2.5 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          flexDirection={{ xs: "column", sm: "row" }}
          gap={1.5}
          mb={2}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: "Alexandria, sans-serif",
                fontWeight: 600,
                fontSize: "18px",
                direction: "rtl",
                color: "#123232",
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontFamily: "Alexandria, sans-serif",
                fontWeight: 400,
                fontSize: "13px",
                color: "text.secondary",
                direction: "rtl",
              }}
            >
              عدد السجلات: {data.length.toLocaleString("en-US")}
            </Typography>
          </Box>

          <Chip
            label={badgeLabel}
            sx={{
              fontFamily: "Alexandria, sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: badgeColor,
              backgroundColor: `${badgeColor}14`,
            }}
          />
        </Box>

        <Paper
          sx={{
            width: "100%",
            overflow: "hidden",
            borderRadius: 3,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "none",
          }}
        >
          <TableContainer sx={{ maxHeight: 460, overflowX: "auto" }}>
            <Table stickyHeader aria-label={`${title} table`}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={tableHeaderSx}>
                    {dateLabel}
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    التفاصيل
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    {amountLabel}
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    النوع
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    الاسم
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length > 0 ? (
                  data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow
                        hover
                        role="checkbox"
                        tabIndex={-1}
                        key={row.id ?? `${row.details}-${row.entryDate}`}
                        sx={{
                          "&:nth-of-type(even)": {
                            backgroundColor: "rgba(15, 23, 42, 0.02)",
                          },
                        }}
                      >
                        <TableCell style={tableCellStyle} align="center">
                          {formatDate(row.entryDate)}
                        </TableCell>
                        <TableCell style={tableCellStyle} align="center">
                          {row.details || "-"}
                        </TableCell>
                        <TableCell style={tableCellStyle} align="center">
                          {formatCurrency(row.MoneyPaid)}
                        </TableCell>
                        <TableCell style={tableCellStyle} align="center">
                          {row.type || "-"}
                        </TableCell>
                        <TableCell style={tableCellStyle} align="center">
                          {row.name || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <EmptyTableRow colSpan={5} message={emptyLabel} />
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            ActionsComponent={TablePaginationActionsRtl}
            labelRowsPerPage="عدد الصفوف لكل صفحة"
            sx={{
              "& .MuiTablePagination-toolbar, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                },
            }}
          />
        </Paper>
      </CardContent>
    </Card>
  );
}

export default function IncomeTables({
  incomeData,
  spendsData,
  rowsPerPage,
  incomePage,
  spendsPage,
  onIncomePageChange,
  onSpendsPageChange,
  onRowsPerPageChange,
  formatCurrency,
  incomeEmptyLabel = "لا توجد حركات دخل في هذا التاريخ.",
  spendsEmptyLabel = "لا توجد مصروفات مطابقة.",
  spendsDateLabel = "التاريخ",
  spendsBadgeLabel = "الحركات السالبة",
}) {
  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      <FinancialTableCard
        title="الدخل"
        emptyLabel={incomeEmptyLabel}
        amountLabel="المبلغ المستلم"
        badgeLabel="الحركات الموجبة"
        badgeColor="#2e7d32"
        data={incomeData}
        page={incomePage}
        rowsPerPage={rowsPerPage}
        onPageChange={onIncomePageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        formatCurrency={formatCurrency}
      />
      <FinancialTableCard
        title="المصروفات"
        emptyLabel={spendsEmptyLabel}
        amountLabel="المبلغ المصروف"
        badgeLabel={spendsBadgeLabel}
        badgeColor="#c62828"
        dateLabel={spendsDateLabel}
        data={spendsData}
        page={spendsPage}
        rowsPerPage={rowsPerPage}
        onPageChange={onSpendsPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        formatCurrency={formatCurrency}
      />
    </Box>
  );
}
