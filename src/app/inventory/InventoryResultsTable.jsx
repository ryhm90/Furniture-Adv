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
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const headerCellStyle = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
  whiteSpace: "nowrap",
};

const bodyCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return "0 د.ع";
  }

  return `${moneyFormatter.format(numericValue)} د.ع`;
}

function InventoryResultsTable({
  data,
  page,
  rowsPerPage,
  role,
  onPageChange,
  onRowsPerPageChange,
  onView,
}) {
  const canView = role === "Manager" || role === "DOCTOR";

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <TableContainer sx={{ maxHeight: 540, overflowX: "auto" }}>
        <Table stickyHeader aria-label="inventory table">
          <TableHead>
            <TableRow>
              <TableCell align="center" style={{ minWidth: 70, ...headerCellStyle }}>
                رقم المادة
              </TableCell>
              <TableCell align="center" style={{ minWidth: 200, ...headerCellStyle }}>
                اسم المادة
              </TableCell>
              <TableCell align="center" style={{ minWidth: 110, ...headerCellStyle }}>
                النوع
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...headerCellStyle }}>
                سعر البيع
              </TableCell>
              <TableCell align="center" style={{ minWidth: 160, ...headerCellStyle }}>
                تكلفة الجملة للمفرد
              </TableCell>
              <TableCell align="center" style={{ minWidth: 120, ...headerCellStyle }}>
                العدد المتاح
              </TableCell>
              <TableCell align="center" style={{ minWidth: 120, ...headerCellStyle }}>
                المتضرر
              </TableCell>
              <TableCell align="center" style={{ minWidth: 130, ...headerCellStyle }}>
                الشراء الخارجي
              </TableCell>
              <TableCell align="center" style={{ minWidth: 120, ...headerCellStyle }}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <TableRow
                hover
                role="checkbox"
                tabIndex={-1}
                key={row.id}
                sx={{
                  "&:nth-of-type(even)": {
                    backgroundColor: "rgba(15, 23, 42, 0.02)",
                  },
                }}
              >
                <TableCell align="center" style={bodyCellStyle}>
                  {row.id}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {row.RoomName}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  <Chip
                    label={row.flagf || "غير محدد"}
                    size="small"
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "12px",
                      backgroundColor: "rgba(21, 101, 192, 0.1)",
                      color: "#1565c0",
                    }}
                  />
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {formatMoney(row.RoomPrice)}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {formatMoney(row.RoomCost)}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {moneyFormatter.format(Number(row.RoomCounts ?? 0))}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {moneyFormatter.format(Number(row.FlowCount ?? 0))}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  <Tooltip
                    title={
                      row.ExternalPurchase === "Y"
                        ? row.FinancialAccount || "لا يوجد حساب مالي محدد"
                        : "مادة مخزنية اعتيادية"
                    }
                  >
                    <Chip
                      label={row.ExternalPurchase === "Y" ? "خارجي" : "اعتيادي"}
                      size="small"
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "12px",
                        backgroundColor:
                          row.ExternalPurchase === "Y"
                            ? "rgba(245, 124, 0, 0.12)"
                            : "rgba(56, 110, 110, 0.12)",
                        color: row.ExternalPurchase === "Y" ? "#f57c00" : "#386e6e",
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {canView ? (
                    <Tooltip title="عرض وتعديل المادة">
                      <IconButton size="small" onClick={() => onView(row)} sx={{ color: "#1565c0" }}>
                        <RemoveRedEyeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 ? <EmptyTableRow colSpan={9} /> : null}
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

export default InventoryResultsTable;
