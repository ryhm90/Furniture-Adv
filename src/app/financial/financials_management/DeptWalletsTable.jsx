"use client";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
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

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const headerCellStyle = {
  backgroundColor: "#2c2c4d",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const bodyCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
  }).format(Number(amount ?? 0));

const formatPercentage = (value) => `${Number(value ?? 0).toFixed(1)}%`;

function getBalanceStatus(amount) {
  if (Number(amount) > 0) {
    return { label: "دائن", color: "success" };
  }

  if (Number(amount) < 0) {
    return { label: "مدين", color: "error" };
  }

  return { label: "متوازن", color: "default" };
}

export default function DeptWalletsTable({
  data,
  page,
  rowsPerPage,
  totalBalance,
  onPageChange,
  onRowsPerPageChange,
  onEnhance,
  onTransfer,
  onHistory,
}) {
  const pagedRows = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 3 }}>
      <TableContainer sx={{ maxHeight: 520, overflowX: "auto" }}>
        <Table stickyHeader aria-label="wallets table">
          <TableHead>
            <TableRow>
              <TableCell align="center" style={{ minWidth: 200, ...headerCellStyle }}>
                المحفظة
              </TableCell>
              <TableCell align="center" style={{ minWidth: 160, ...headerCellStyle }}>
                الرصيد
              </TableCell>
              <TableCell align="center" style={{ minWidth: 120, ...headerCellStyle }}>
                الحالة
              </TableCell>
              <TableCell align="center" style={{ minWidth: 140, ...headerCellStyle }}>
                نسبة المساهمة
              </TableCell>
              <TableCell align="center" style={{ minWidth: 140, ...headerCellStyle }}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row) => {
              const status = getBalanceStatus(row.Amount);
              const contribution =
                Number(totalBalance) === 0 ? 0 : (Math.abs(Number(row.Amount)) / Math.abs(Number(totalBalance))) * 100;

              return (
                <TableRow hover key={row.Name}>
                  <TableCell align="center" style={bodyCellStyle}>
                    {row.Name}
                  </TableCell>
                  <TableCell
                    align="center"
                    style={{
                      ...bodyCellStyle,
                      color: Number(row.Amount) < 0 ? "#c62828" : "#1b5e20",
                    }}
                  >
                    {formatCurrency(row.Amount)}
                  </TableCell>
                  <TableCell align="center" style={bodyCellStyle}>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
                    />
                  </TableCell>
                  <TableCell align="center" style={bodyCellStyle}>
                    {formatPercentage(contribution)}
                  </TableCell>
                  <TableCell align="center" style={bodyCellStyle}>
                    <Tooltip title="تعزيز رصيد المحفظة">
                      <IconButton onClick={() => onEnhance(row.Name)} size="small" color="secondary">
                        <AddCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تحويل أو سحب">
                      <IconButton onClick={() => onTransfer(row.Name)} size="small" color="success">
                        <SyncAltIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="عرض الحركة التاريخية">
                      <IconButton onClick={() => onHistory(row.Name)} size="small" color="primary">
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 ? <EmptyTableRow colSpan={5} /> : null}
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
      />
    </Paper>
  );
}
