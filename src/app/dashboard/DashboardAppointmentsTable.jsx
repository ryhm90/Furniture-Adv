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
  TableRow,
  Tooltip,
} from "@mui/material";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

import EmptyTableRow from "@/app/components/EmptyTableRow";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const headerCellStyle = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
};

const bodyCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("ar-IQ");
}

function getStatusConfig(status) {
  switch (status) {
    case "غير مجهز":
      return { label: status, color: "#ffb300", textColor: "#1f2937" };
    case "مجهز":
      return { label: status, color: "#2e7d32", textColor: "#ffffff" };
    case "ملغى":
      return { label: status, color: "#d32f2f", textColor: "#ffffff" };
    default:
      return { label: status || "-", color: "#90a4ae", textColor: "#ffffff" };
  }
}

export default function DashboardAppointmentsTable({
  data,
  role,
  onView,
  onPayment,
  onDelete,
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
        <Table stickyHeader aria-label="dashboard table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellStyle}>
                رقم الوصل
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                اسم الزبون
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                العنوان
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                المتبقي
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                حالة التجهيز
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                تاريخ التجهيز
              </TableCell>
              <TableCell align="center" sx={headerCellStyle}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => {
                const canView = role === "Manager" || role === "Sellor";
                const canPay =
                  row.warehouseS === "جهزت" &&
                  (role === "Manager" || role === "Sellor") &&
                  row.Por !== "ملغى";
                const canDelete =
                  (role === "Manager" || role === "Sellor" || role === "SECRETARY") &&
                  row.Por !== "ملغى";
                const statusConfig = getStatusConfig(row.Por);

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={row.InvoNum}
                    sx={{
                      "&:nth-of-type(even)": {
                        backgroundColor: "rgba(15, 23, 42, 0.02)",
                      },
                    }}
                  >
                    <TableCell align="center" sx={bodyCellStyle}>
                      {row.InvoNum}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellStyle}>
                      {row.ClName || "-"}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellStyle}>
                      {[row.Provin, row.Provin2].filter(Boolean).join(" - ") || "-"}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellStyle}>
                      {moneyFormatter.format(Number(row.MoneyRemain ?? 0))}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellStyle}>
                      <Chip
                        label={statusConfig.label}
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 500,
                          fontSize: "12px",
                          color: statusConfig.textColor,
                          backgroundColor: statusConfig.color,
                          minWidth: 96,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={bodyCellStyle}>
                      {formatDate(row.Provide)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...bodyCellStyle, minWidth: 150 }}>
                      {canView ? (
                        <Tooltip title="عرض الوصل">
                          <IconButton onClick={() => onView(row)} color="primary">
                            <RemoveRedEyeIcon />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canPay ? (
                        <Tooltip title="تسديد المتبقي">
                          <IconButton onClick={() => onPayment(row)} color="success">
                            <AttachMoneyIcon />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canDelete ? (
                        <Tooltip title="إلغاء الوصل">
                          <IconButton onClick={() => onDelete(row)} color="error">
                            <DeleteForeverIcon />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <EmptyTableRow colSpan={7} message="لا توجد وصولات لهذا العرض الحالي." />
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
