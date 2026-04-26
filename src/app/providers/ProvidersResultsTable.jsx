"use client";

import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
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
  Typography,
} from "@mui/material";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const STATUS_META = {
  "في التصنيع": {
    label: "في التصنيع",
    backgroundColor: "rgba(141, 110, 99, 0.12)",
    color: "#5d4037",
  },
  "في الطريق": {
    label: "في الطريق",
    backgroundColor: "rgba(21, 101, 192, 0.12)",
    color: "#1565c0",
  },
  "مستلمة": {
    label: "مستلمة",
    backgroundColor: "rgba(46, 125, 50, 0.12)",
    color: "#2e7d32",
  },
  "مدخلة": {
    label: "مدخلة إلى المخزن",
    backgroundColor: "rgba(0, 121, 107, 0.12)",
    color: "#00796b",
  },
};

const tableHeaderSx = {
  backgroundColor: "#203a43",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tableCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  verticalAlign: "middle",
};

function formatDate(dateString) {
  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatUsdCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || "-",
      backgroundColor: "rgba(15, 23, 42, 0.08)",
      color: "#334155",
    }
  );
}

export default function ProvidersResultsTable({
  rows,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onViewDetails,
  onStatusUpdate,
  onArrival,
  onInventory,
  emptyMessage,
}) {
  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.05)",
        boxShadow: "0 18px 38px rgba(15, 23, 42, 0.05)",
      }}
    >
      <TableContainer sx={{ maxHeight: 620, overflowX: "auto" }}>
        <Table stickyHeader aria-label="providers orders table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={tableHeaderSx}>
                المادة
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                المورد
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                تكلفة القطعة
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                الحالة
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                العدد المتفق عليه
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                الناقل
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                تاريخ إنشاء الطلبية
              </TableCell>
              <TableCell align="center" sx={tableHeaderSx}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedRows.map((row, index) => {
              const statusMeta = getStatusMeta(row.status);
              const showShippingAction = row.status === "في التصنيع" || !STATUS_META[row.status];
              const showArrivalAction = row.status === "في الطريق";
              const showInventoryAction = row.status === "مستلمة";

              return (
                <TableRow
                  hover
                  key={row.ID}
                  sx={{
                    "&:nth-of-type(even)": {
                      backgroundColor: "rgba(15, 23, 42, 0.015)",
                    },
                    "& td": {
                      borderBottom:
                        index === paginatedRows.length - 1
                          ? "none"
                          : "1px solid rgba(15, 23, 42, 0.05)",
                    },
                  }}
                >
                  <TableCell align="center" sx={tableCellSx}>
                    <Stack spacing={0.4} alignItems="center">
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                        {row.ItemName || "-"}
                      </Typography>
                      {row.factoryName ? (
                        <Typography
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            fontSize: "11px",
                            color: "text.secondary",
                          }}
                        >
                          {row.factoryName}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    {row.providorName || "-"}
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    {formatUsdCurrency(row.factoryprice)}
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    <Chip
                      label={statusMeta.label}
                      size="small"
                      sx={{
                        borderRadius: "999px",
                        backgroundColor: statusMeta.backgroundColor,
                        color: statusMeta.color,
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    {Number(row.agreedCount ?? 0)}
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    {row.transportername || "-"}
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    {formatDate(row.date)}
                  </TableCell>

                  <TableCell align="center" sx={tableCellSx}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton color="primary" onClick={() => onViewDetails(row.ID)}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {showShippingAction ? (
                        <Tooltip title="تحويل الطلبية إلى في الطريق">
                          <IconButton color="info" onClick={() => onStatusUpdate(row.ID)}>
                            <LocalShippingRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}

                      {showArrivalAction ? (
                        <Tooltip title="تأكيد وصول الطلبية">
                          <IconButton color="success" onClick={() => onArrival(row.ID)}>
                            <DoneAllRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}

                      {showInventoryAction ? (
                        <Tooltip title="إدخال المادة إلى المخزن">
                          <IconButton color="secondary" onClick={() => onInventory(row)}>
                            <Inventory2RoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {rows.length === 0 ? (
              <EmptyTableRow
                colSpan={8}
                message={emptyMessage}
                sx={{ py: 5, fontSize: "14px" }}
              />
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        ActionsComponent={TablePaginationActionsRtl}
        labelRowsPerPage="عدد الصفوف لكل صفحة"
        sx={{
          borderTop: "1px solid rgba(15, 23, 42, 0.06)",
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
