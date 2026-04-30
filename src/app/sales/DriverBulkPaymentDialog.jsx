"use client";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import EmptyTableRow from "@/app/components/EmptyTableRow";

const headerCellSx = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
};

const bodyCellSx = {
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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DriverBulkPaymentDialog({
  open,
  driverName,
  rows,
  isLoading,
  onClose,
  onPayment,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          direction: "rtl",
          textAlign: "center",
        }}
      >
        تسديد جماعي حسب السائق
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Alert
            severity="info"
            sx={{
              mt: 1,
              borderRadius: 3,
              "& .MuiAlert-message": {
                fontFamily: "Alexandria, sans-serif",
                fontSize: "13px",
                lineHeight: 1.8,
              },
            }}
          >
            {driverName
              ? `يعرض هذا الجدول الوصولات الجاهزة ذات الرصيد المتبقي الخاصة بالسائق: ${driverName}.`
              : "اختر سائقاً أولاً ثم افتح التسديد الجماعي."}
          </Alert>

          <Paper
            sx={{
              width: "100%",
              overflow: "hidden",
              borderRadius: 3,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
            }}
          >
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={headerCellSx}>
                      رقم الوصل
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      اسم الزبون
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      تاريخ التجهيز
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      المبلغ المتبقي
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      السائق
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      فني التركيب
                    </TableCell>
                    <TableCell align="center" sx={headerCellSx}>
                      الإجراء
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.InvoNum} hover>
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.InvoNum}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.ClName || "-"}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {formatDate(row.Provide)}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {moneyFormatter.format(Number(row.MoneyRemain ?? 0))}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.Driver || "غير معيّن"}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        {row.CarNam || "غير معيّن"}
                      </TableCell>
                      <TableCell align="center" sx={bodyCellSx}>
                        <Tooltip title="تسديد الوصل">
                          <IconButton
                            size="small"
                            onClick={() => onPayment(row)}
                            sx={{ color: "#2e7d32" }}
                          >
                            <AttachMoneyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!isLoading && rows.length === 0 ? (
                    <EmptyTableRow
                      colSpan={7}
                      message="لا توجد وصولات جاهزة ذات رصيد متبقٍ لهذا السائق."
                    />
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {isLoading ? (
            <Typography
              sx={{
                fontFamily: "Alexandria, sans-serif",
                fontSize: "13px",
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              جاري تحميل وصولات السائق...
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            fontFamily: "Alexandria, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
          }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DriverBulkPaymentDialog;
