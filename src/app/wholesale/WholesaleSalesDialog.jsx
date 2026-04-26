"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import EmptyTableRow from "@/app/components/EmptyTableRow";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const titleSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "15px",
  direction: "rtl",
};

const headerCellStyle = {
  minWidth: 50,
  backgroundColor: "#2c2c4d",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: "400",
  fontSize: "13px",
};

const bodyCellStyle = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: "400",
  fontSize: "13px",
};

function WholesaleSalesDialog({ open, data, editSum, onEditChange, onUpdate, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={titleSx}>تفاصيل السحوبات</DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" style={headerCellStyle}>
                رقم الوصل
              </TableCell>
              <TableCell align="center" style={headerCellStyle}>
                المبلغ المسدد
              </TableCell>
              <TableCell align="center" style={headerCellStyle}>
                المبلغ المتبقي
              </TableCell>
              <TableCell align="center" style={headerCellStyle}>
                المجموع الكلي
              </TableCell>
              <TableCell align="center" style={headerCellStyle}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.ID}>
                <TableCell align="center" style={bodyCellStyle}>
                  {item.InvoNum}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {currencyFormatter.format(item.MoneyPaid)}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  {currencyFormatter.format(item.MoneyRemain)}
                </TableCell>
                <TableCell align="center" style={bodyCellStyle}>
                  <TextField
                    value={
                      editSum[item.InvoNum]
                        ? Number(editSum[item.InvoNum]).toLocaleString()
                        : Number(item.Sum).toLocaleString()
                    }
                    onChange={(event) => onEditChange(item.InvoNum, event.target.value)}
                    type="text"
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                    sx={{
                      "& input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "14px",
                        direction: "rtl",
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button sx={bodyCellStyle} color="primary" onClick={() => onUpdate(item.InvoNum)}>
                    تحديث
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 ? <EmptyTableRow colSpan={5} /> : null}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" sx={bodyCellStyle} onClick={onClose}>
          اغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WholesaleSalesDialog;
