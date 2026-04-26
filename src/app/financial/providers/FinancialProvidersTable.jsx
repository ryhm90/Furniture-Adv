"use client";

import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const headerCellSx = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("ar-IQ");
}

function getBalanceChip(balance) {
  const numericBalance = Number(balance || 0);

  if (numericBalance > 0) {
    return {
      label: "مدين",
      backgroundColor: "#d32f2f",
      color: "#ffffff",
    };
  }

  if (numericBalance < 0) {
    return {
      label: "دائن",
      backgroundColor: "#2e7d32",
      color: "#ffffff",
    };
  }

  return {
    label: "متوازن",
    backgroundColor: "#90a4ae",
    color: "#ffffff",
  };
}

export default function FinancialProvidersTable({
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onPayment,
  onReport,
  onQuickPrint,
}) {
  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
      }}
    >
      <TableContainer sx={{ maxHeight: 560, overflowX: "auto" }}>
        <Table stickyHeader aria-label="financial providers table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellSx}>
                الاسم
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                نوع الخدمة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                إجمالي الدين
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                إجمالي المسدد
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الرصيد الحالي
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الحالة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                آخر حركة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => {
                  const balanceChip = getBalanceChip(row.Balance);
                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      tabIndex={-1}
                      key={`${row.Name_ID}-${row.type}`}
                      sx={{
                        "&:nth-of-type(even)": {
                          backgroundColor: "rgba(15, 23, 42, 0.02)",
                        },
                      }}
                    >
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.Name}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.type || "-"}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {usdFormatter.format(Number(row.TotalIn ?? 0))}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {usdFormatter.format(Number(row.TotalOut ?? 0))}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          ...bodyCellSx,
                          fontWeight: 500,
                          color: Number(row.Balance ?? 0) > 0 ? "#c62828" : "#2e7d32",
                        }}
                      >
                        {usdFormatter.format(Number(row.Balance ?? 0))}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        <Chip
                          label={balanceChip.label}
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            fontWeight: 500,
                            fontSize: "12px",
                            backgroundColor: balanceChip.backgroundColor,
                            color: balanceChip.color,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {formatDate(row.lastMovementDate)}
                      </TableCell>
                      <TableCell align="center" sx={{ ...bodyCellSx, minWidth: 140 }}>
                        <Tooltip title="تسجيل دفعة">
                          <IconButton color="primary" onClick={() => onPayment(row)}>
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="طباعة كشف مفصل">
                          <IconButton color="secondary" onClick={() => onReport(row)}>
                            <SummarizeOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="طباعة مختصرة">
                          <IconButton color="secondary" onClick={() => onQuickPrint(row)}>
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <EmptyTableRow colSpan={8} message="لا توجد حسابات موردين مطابقة." />
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
  );
}
