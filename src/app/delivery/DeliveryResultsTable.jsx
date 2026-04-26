"use client";

import { useMemo, useState } from "react";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import {
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
} from "@mui/material";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const tableHeaderStyle = {
  backgroundColor: "#111827",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
};

const selectFieldSx = {
  minWidth: 150,
  "& .MuiInputBase-root": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  "& .MuiInputBase-input": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    textAlign: "center",
    py: 1,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "18px",
  },
};

const timeFieldSx = {
  minWidth: 132,
  "& .MuiInputBase-root": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  "& .MuiInputBase-input": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    textAlign: "center",
    py: 1,
  },
};

const menuItemSx = {
  fontFamily: "Alexandria, sans-serif",
  fontSize: "13px",
  direction: "rtl",
};

const iconButtonSx = {
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "white",
  "&:hover": {
    backgroundColor: "rgba(15, 23, 42, 0.04)",
  },
};

const statusChipSx = {
  minWidth: 92,
  fontFamily: "Alexandria, sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  borderRadius: "999px",
};

const getStatusColor = (status) => {
  switch (status) {
    case "لم تجهز":
      return "warning";
    case "جهزت":
      return "success";
    default:
      return "default";
  }
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "-";
  }

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-CA");
};

const getSortableValue = (row, sortBy) => {
  switch (sortBy) {
    case "InvoNum":
      return row.InvoNum ?? "";
    case "ClName":
      return row.ClName ?? "";
    case "Address":
      return `${row.Provin ?? ""} ${row.Provin2 ?? ""}`.trim();
    case "warehouseS":
      return row.warehouseS ?? "";
    case "Driver":
      return row.Driver ?? "";
    case "CarNam":
      return row.CarNam ?? "";
    case "time":
      return row.time ?? "";
    case "RoomNames":
      return row.RoomNames ?? "";
    case "FloorCost":
      return Number(row.FloorCost ?? 0);
    case "Provide":
      return row.Provide ?? "";
    default:
      return "";
  }
};

const compareValues = (left, right) => {
  if (typeof left === "number" || typeof right === "number") {
    return Number(left ?? 0) - Number(right ?? 0);
  }

  return String(left ?? "").localeCompare(String(right ?? ""), "ar", {
    numeric: true,
    sensitivity: "base",
  });
};

const getOptionsWithCurrentValue = (items, currentValue) => {
  const normalizedValue = String(currentValue ?? "").trim();

  if (!normalizedValue) {
    return items;
  }

  const hasCurrentValue = items.some(
    (item) => String(item?.Name ?? "").trim() === normalizedValue,
  );

  if (hasCurrentValue) {
    return items;
  }

  return [{ ID: `current-${normalizedValue}`, Name: normalizedValue }, ...items];
};

function SortableHeader({ label, sortKey, sortBy, sortDirection, onSort, minWidth = 130 }) {
  return (
    <TableCell align="center" style={{ minWidth, ...tableHeaderStyle }}>
      <TableSortLabel
        active={sortBy === sortKey}
        direction={sortBy === sortKey ? sortDirection : "asc"}
        onClick={() => onSort(sortKey)}
        sx={{
          color: "inherit !important",
          "& .MuiTableSortLabel-icon": {
            color: "white !important",
          },
          "& .MuiTableSortLabel-iconDirectionAsc, & .MuiTableSortLabel-iconDirectionDesc": {
            color: "white !important",
          },
          "& .MuiTableSortLabel-root": {
            fontFamily: "Alexandria, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
          },
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

function DeliveryResultsTable({
  role,
  data,
  page,
  rowsPerPage,
  drivers,
  carpenters,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPayment,
  onDelivery,
  onReturn,
  onDriverChange,
  onCarpenterChange,
  onTimeChange,
  showProvideColumn,
}) {
  const [sortBy, setSortBy] = useState("InvoNum");
  const [sortDirection, setSortDirection] = useState("desc");

  const rows = useMemo(() => {
    const uniqueRows = data
      .filter((row) => row.Por !== "ملغى")
      .reduce((accumulator, currentRow) => {
        const exists = accumulator.some((item) => item.InvoNum === currentRow.InvoNum);
        return exists ? accumulator : accumulator.concat(currentRow);
      }, []);

    return uniqueRows.sort((left, right) => {
      const comparison = compareValues(
        getSortableValue(left, sortBy),
        getSortableValue(right, sortBy),
      );

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortBy, sortDirection]);

  const canView = role === "Manager" || role === "Provider";
  const canUpdate = role === "Manager" || role === "Provider";

  const handleSort = (columnKey) => {
    setSortDirection((currentDirection) => {
      if (sortBy === columnKey) {
        return currentDirection === "asc" ? "desc" : "asc";
      }

      return "asc";
    });
    setSortBy(columnKey);
  };

  return (
    <Paper
      sx={{
        marginBottom: "20px",
        width: "100%",
        overflow: "hidden",
        fontFamily: "Alexandria, sans-serif",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.05)",
      }}
    >
      <TableContainer style={{ maxHeight: 560, overflowX: "auto" }}>
        <Table stickyHeader aria-label="delivery table">
          <TableHead>
            <TableRow>
              <SortableHeader
                label="رقم الوصل"
                sortKey="InvoNum"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={80}
              />
              <SortableHeader
                label="اسم الزبون"
                sortKey="ClName"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={180}
              />
              <SortableHeader
                label="العنوان"
                sortKey="Address"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={180}
              />
              <SortableHeader
                label="حالة التجهيز"
                sortKey="warehouseS"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="السائق"
                sortKey="Driver"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="فني التركيب"
                sortKey="CarNam"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="الوقت"
                sortKey="time"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={110}
              />
              <SortableHeader
                label="المواد"
                sortKey="RoomNames"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={180}
              />
              <SortableHeader
                label="تكلفة التفريغ"
                sortKey="FloorCost"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                minWidth={120}
              />
              {showProvideColumn ? (
                <SortableHeader
                  label="تاريخ التجهيز"
                  sortKey="Provide"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  minWidth={130}
                />
              ) : null}
              <TableCell align="center" style={{ minWidth: 150, ...tableHeaderStyle }}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow
                  hover
                  role="checkbox"
                  tabIndex={-1}
                  key={row.InvoNum}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: "rgba(15, 23, 42, 0.018)",
                    },
                  }}
                >
                  <TableCell style={tableCellStyle} align="center">
                    {row.InvoNum}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {row.ClName}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {[row.Provin, row.Provin2].filter(Boolean).join(" - ") || "-"}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    <Chip
                      label={row.warehouseS || "-"}
                      color={getStatusColor(row.warehouseS)}
                      sx={statusChipSx}
                    />
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {canUpdate ? (
                      <TextField
                        select
                        size="small"
                        value={row.Driver || ""}
                        onChange={(event) => onDriverChange(event, "Driver", row.InvoNum)}
                        sx={selectFieldSx}
                      >
                        <MenuItem value="" disabled sx={menuItemSx}>
                          اختر السائق
                        </MenuItem>
                        {getOptionsWithCurrentValue(drivers, row.Driver).map((driver) => (
                          <MenuItem key={driver.ID} value={driver.Name} sx={menuItemSx}>
                            {driver.Name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      row.Driver || "-"
                    )}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {canUpdate ? (
                      <TextField
                        select
                        size="small"
                        value={row.CarNam || ""}
                        onChange={(event) => onCarpenterChange(event, "CarNam", row.InvoNum)}
                        sx={selectFieldSx}
                      >
                        <MenuItem value="" disabled sx={menuItemSx}>
                          اختر فني التركيب
                        </MenuItem>
                        {getOptionsWithCurrentValue(carpenters, row.CarNam).map((carpenter) => (
                          <MenuItem key={carpenter.ID} value={carpenter.Name} sx={menuItemSx}>
                            {carpenter.Name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      row.CarNam || "-"
                    )}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {canUpdate ? (
                      <TextField
                        type="time"
                        size="small"
                        value={row.time || ""}
                        onChange={(event) => onTimeChange(event, "Time", row.InvoNum)}
                        sx={timeFieldSx}
                      />
                    ) : (
                      row.time || "-"
                    )}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {row.RoomNames || "-"}
                  </TableCell>
                  <TableCell style={tableCellStyle} align="center">
                    {row.FloorCost ?? "-"}
                  </TableCell>
                  {showProvideColumn ? (
                    <TableCell style={tableCellStyle} align="center">
                      {formatDate(row.Provide)}
                    </TableCell>
                  ) : null}
                  <TableCell style={tableCellStyle} align="center">
                    {canView ? (
                      <Tooltip title="عرض الوصل">
                        <IconButton onClick={() => onView(row)} sx={iconButtonSx} size="small">
                          <RemoveRedEyeIcon sx={{ color: "blue" }} fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {role === "Manager" &&
                    row.warehouseS === "جهزت" &&
                    row.Por !== "ملغى" &&
                    row.wholesale !== "Y" ? (
                      <Tooltip title="تسديد">
                        <IconButton
                          onClick={() => onPayment(row)}
                          sx={{ ...iconButtonSx, mr: 0.5 }}
                          size="small"
                        >
                          <AttachMoneyIcon sx={{ color: "green" }} fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && row.Por !== "ملغى" ? (
                      <Tooltip title="تحديث إلى جهزت">
                        <IconButton
                          onClick={() => onDelivery(row)}
                          sx={{ ...iconButtonSx, mr: 0.5 }}
                          size="small"
                        >
                          <LocalShippingIcon sx={{ color: "orange" }} fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate ? (
                      <Tooltip title="إرجاع إلى لم تجهز">
                        <IconButton
                          onClick={() => onReturn(row)}
                          sx={{ ...iconButtonSx, mr: 0.5 }}
                          size="small"
                        >
                          <KeyboardReturnIcon sx={{ color: "red" }} fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            {rows.length === 0 ? <EmptyTableRow colSpan={showProvideColumn ? 11 : 10} /> : null}
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
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontFamily: "Alexandria, sans-serif",
            fontSize: "12px",
          },
          "& .MuiSelect-select": {
            fontFamily: "Alexandria, sans-serif",
            fontSize: "12px",
          },
        }}
      />
    </Paper>
  );
}

export default DeliveryResultsTable;
