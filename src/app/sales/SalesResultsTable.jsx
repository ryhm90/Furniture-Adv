"use client";

import {
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from "@mui/material";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const tableHeaderStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  backgroundColor: "#123232",
  color: "white",
  borderBottom: "none",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatDate = (dateString) => {
  if (!dateString) {
    return "غير متوفر";
  }

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return "تاريخ غير صالح";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStatusColor = (status) => {
  switch (status) {
    case "غير مجهز":
      return "#ffcc00";
    case "مجهز":
      return "#00cc00";
    case "ملغى":
      return "#ff3300";
    default:
      return "#ffffff";
  }
};

const getStatusTextColor = (status) => {
  switch (status) {
    case "غير مجهز":
      return "#000000";
    case "مجهز":
    case "ملغى":
      return "#ffffff";
    default:
      return "#000000";
  }
};

function SalesResultsTable({
  role,
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPayment,
  onDelete,
}) {
  const canView = role === "Manager" || role === "Sellor";
  const isModified = (value) => value === "Y" || value === "y" || value === true || value === 1;

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        fontFamily: "Alexandria, sans-serif",
      }}
    >
      <TableContainer style={{ maxHeight: 520, overflowX: "auto" }}>
        <Table stickyHeader aria-label="sales table">
          <TableHead>
            <TableRow>
              <TableCell align="center" style={{ minWidth: 50, ...tableHeaderStyle }}>
                رقم الوصل
              </TableCell>
              <TableCell align="center" style={{ minWidth: 170, ...tableHeaderStyle }}>
                اسم الزبون
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...tableHeaderStyle }}>
                العنوان
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...tableHeaderStyle }}>
                المبلغ المتبقي
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...tableHeaderStyle }}>
                حالة التجهيز
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...tableHeaderStyle }}>
                تاريخ التجهيز
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...tableHeaderStyle }}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
              const canPay =
                row.warehouseS === "جهزت" &&
                (role === "Manager" || role === "Sellor") &&
                row.Por !== "ملغى" &&
                row.wholesale !== "Y";
              const canDelete =
                (role === "Manager" ||
                  role === "Sellor" ||
                  role === "SECRETARY") &&
                row.Por !== "ملغى";

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
                  <TableCell align="center" style={tableCellStyle}>
                    <Stack spacing={0.75} alignItems="center">
                      <span>{row.InvoNum}</span>
                      {isModified(row.is_modified) ? (
                        <Chip
                          label={
                            isModified(row.modification_confirmed)
                              ? "معدل ومؤكد"
                              : "معدل بانتظار التأكيد"
                          }
                          size="small"
                          sx={{
                            borderRadius: "999px",
                            fontFamily: "Alexandria, sans-serif",
                            fontSize: "11px",
                            color: isModified(row.modification_confirmed) ? "#0f5132" : "#92400e",
                            backgroundColor: isModified(row.modification_confirmed)
                              ? "rgba(16, 185, 129, 0.14)"
                              : "rgba(245, 158, 11, 0.18)",
                          }}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    {row.ClName}
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    {row.Provin} - {row.Provin2}
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    {moneyFormatter.format(row.MoneyRemain)}
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    <Chip
                      label={row.Por}
                      size="small"
                      sx={{
                        borderRadius: "999px",
                        px: 0.5,
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "12px",
                        color: getStatusTextColor(row.Por),
                        backgroundColor: getStatusColor(row.Por),
                      }}
                    />
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    {formatDate(row.Provide)}
                  </TableCell>
                  <TableCell align="center" style={tableCellStyle}>
                    {canView ? (
                      <Tooltip title="عرض الوصل">
                        <IconButton
                          size="small"
                          onClick={() => onView(row)}
                          sx={{ color: "#1565c0" }}
                        >
                          <RemoveRedEyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canPay ? (
                      <Tooltip title="تسديد الوصل">
                        <IconButton
                          size="small"
                          onClick={() => onPayment(row)}
                          sx={{ color: "#2e7d32" }}
                        >
                          <AttachMoneyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete ? (
                      <Tooltip title="إلغاء الوصل">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(row)}
                          sx={{ color: "#c62828" }}
                        >
                          <DeleteForeverIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 ? <EmptyTableRow colSpan={7} /> : null}
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

export default SalesResultsTable;
