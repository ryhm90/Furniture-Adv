"use client";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import PrintIcon from "@mui/icons-material/Print";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import {
  Box,
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const headerCellSx = {
  backgroundColor: "#111827",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
  whiteSpace: "nowrap",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
  borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
};

const actionButtonSx = {
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "white",
  "&:hover": {
    backgroundColor: "rgba(15, 23, 42, 0.04)",
  },
};

function getTierColor(tier) {
  if (tier === "Tier3") {
    return "secondary";
  }

  if (tier === "Tier2") {
    return "warning";
  }

  return "success";
}

function WholesaleCustomersTable({
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPayment,
  onAddSale,
  onManagePrices,
  onCopyPublicLink,
  onOpenPublicPage,
  onPrint,
}) {
  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.05)",
      }}
    >
      <TableContainer sx={{ maxHeight: 620, overflowX: "auto" }}>
        <Table stickyHeader aria-label="wholesale customers table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellSx}>
                اسم الزبون
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                اسم الصفحة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الحساب
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الفئة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الرمز العام
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <TableRow
                key={row.Id}
                hover
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(15, 23, 42, 0.018)",
                  },
                }}
              >
                <TableCell align="center" sx={bodyCellSx}>
                  <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                    {row.Clname}
                  </Typography>
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                    {row.affiliate}
                  </Typography>
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  {currencyFormatter.format(Number(row.totalMPU ?? 0))}
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <Chip
                    label={row.TiD || "Tier1"}
                    color={getTierColor(row.TiD)}
                    size="small"
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 2,
                      backgroundColor: "rgba(15, 23, 42, 0.04)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {row.username || "-"}
                  </Box>
                </TableCell>

                <TableCell align="center" sx={bodyCellSx}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    justifyContent="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Tooltip title="كشف الحساب">
                      <IconButton onClick={() => onView(row)} sx={actionButtonSx} size="small">
                        <RemoveRedEyeIcon sx={{ color: "#1565c0" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="تعزيز الحساب">
                      <IconButton onClick={() => onPayment(row)} sx={actionButtonSx} size="small">
                        <AttachMoneyIcon sx={{ color: "#2e7d32" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="إضافة بيع">
                      <IconButton onClick={() => onAddSale(row)} sx={actionButtonSx} size="small">
                        <LibraryAddIcon sx={{ color: "#ef6c00" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="التسعير الخاص">
                      <IconButton
                        onClick={() => onManagePrices(row)}
                        sx={actionButtonSx}
                        size="small"
                      >
                        <PriceChangeIcon sx={{ color: "#7b1fa2" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="نسخ الرابط العام">
                      <IconButton
                        onClick={() => onCopyPublicLink(row)}
                        sx={actionButtonSx}
                        size="small"
                      >
                        <ContentCopyIcon sx={{ color: "#00838f" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="فتح الصفحة العامة">
                      <IconButton
                        onClick={() => onOpenPublicPage(row)}
                        sx={actionButtonSx}
                        size="small"
                      >
                        <OpenInNewIcon sx={{ color: "#455a64" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="طباعة التقرير">
                      <IconButton onClick={() => onPrint(row)} sx={actionButtonSx} size="small">
                        <PrintIcon sx={{ color: "#212121" }} fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}

            {data.length === 0 ? <EmptyTableRow colSpan={6} /> : null}
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
          borderTop: "1px solid rgba(15, 23, 42, 0.06)",
          "& .MuiTablePagination-toolbar": {
            fontFamily: "Alexandria, sans-serif",
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontFamily: "Alexandria, sans-serif",
            fontSize: "12px",
          },
        }}
      />
    </Paper>
  );
}

export default WholesaleCustomersTable;
