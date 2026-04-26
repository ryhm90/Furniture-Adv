"use client";

import DownloadIcon from "@mui/icons-material/Download";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import EmptyTableRow from "@/app/components/EmptyTableRow";

const headerCellSx = {
  backgroundColor: "#2c2c4d",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: 13,
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontSize: 13,
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
  }).format(Number(amount ?? 0));

export default function DeptHistoryDialog({
  open,
  selectedWallet,
  historyData,
  currentBalance = 0,
  onClose,
  onExportPdf,
  isExporting = false,
}) {
  const totalIn = historyData.reduce((sum, item) => {
    const amount = Number(item.amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const totalOut = historyData.reduce((sum, item) => {
    const amount = Number(item.amount ?? 0);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 500,
          fontSize: "16px",
          direction: "rtl",
        }}
      >
        كشف حركة المحفظة: {selectedWallet}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, direction: "rtl" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            { label: "الرصيد الحالي", value: formatCurrency(currentBalance), color: "success" },
            { label: "إجمالي الحركات الدائنة", value: formatCurrency(totalIn), color: "primary" },
            { label: "إجمالي الحركات المدينة", value: formatCurrency(totalOut), color: "error" },
            { label: "عدد الحركات", value: historyData.length, color: "default" },
          ].map((card) => (
            <Paper key={card.label} sx={{ p: 2, borderRadius: 3, backgroundColor: "#fafafa" }}>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                {card.label}
              </Typography>
              <Chip
                label={card.value}
                color={card.color}
                sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
              />
            </Paper>
          ))}
        </Box>

        <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 3 }}>
          <TableContainer sx={{ maxHeight: 520, overflowX: "auto" }}>
            <Table stickyHeader aria-label="wallet history table">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 150, ...headerCellSx }}>
                    التاريخ
                  </TableCell>
                  <TableCell align="center" sx={{ width: 150, ...headerCellSx }}>
                    المبلغ
                  </TableCell>
                  <TableCell align="center" sx={{ width: 140, ...headerCellSx }}>
                    الحالة
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 280, ...headerCellSx }}>
                    التفاصيل
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.map((item, index) => (
                  <TableRow key={`${item.Created_at}-${index}`} hover>
                    <TableCell align="center" sx={bodyCellSx}>
                      {new Date(item.Created_at).toLocaleDateString("en-CA")}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...bodyCellSx,
                        color: Number(item.amount) < 0 ? "#c62828" : "#1b5e20",
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellSx}>
                      {item.state || "-"}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...bodyCellSx,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.details || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {historyData.length === 0 ? <EmptyTableRow colSpan={4} /> : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, direction: "rtl" }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExportPdf}
          disabled={historyData.length === 0 || isExporting}
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: 13 }}
        >
          {isExporting ? "جاري التصدير..." : "تصدير PDF"}
        </Button>
        <Button
          onClick={onClose}
          color="secondary"
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: 13 }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
