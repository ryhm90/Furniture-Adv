"use client";

import {
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
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import RedeemOutlinedIcon from "@mui/icons-material/RedeemOutlined";
import RuleFolderOutlinedIcon from "@mui/icons-material/RuleFolderOutlined";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const headerCellSx = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function EmployeesTable({
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onOpenPayment,
  onOpenAdvance,
  onOpenEdit,
  onOpenActionDialog,
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
        <Table stickyHeader aria-label="employees table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellSx}>
                رقم
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                اسم الموظف
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                المسمى الوظيفي
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الراتب
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                السلف الحالية
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                صافي الراتب القادم
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                المكافآت
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                المستلم من الزبائن
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                آخر راتب
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                تاريخ التعيين
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                  <TableCell align="center" sx={bodyCellSx}>
                    {row.id}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {row.name}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {row.role}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {moneyFormatter.format(Number(row.salary ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {moneyFormatter.format(Number(row.salary_advance ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {moneyFormatter.format(Number(row.net_salary_due ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {moneyFormatter.format(Number(row.bonus ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {moneyFormatter.format(Number(row.received ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {formatDate(row.last_payment_date)}
                  </TableCell>
                  <TableCell align="center" sx={bodyCellSx}>
                    {formatDate(row.hire_date)}
                  </TableCell>
                  <TableCell align="center" sx={{ ...bodyCellSx, minWidth: 220 }}>
                    <Tooltip title="صرف الراتب">
                      <IconButton color="success" onClick={() => onOpenPayment(row)}>
                        <PaidOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="سحب سلفة من الراتب">
                      <IconButton color="warning" onClick={() => onOpenAdvance(row)}>
                        <AccountBalanceWalletOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل بيانات الموظف">
                      <IconButton color="primary" onClick={() => onOpenEdit(row)}>
                        <EditOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    {Number(row.bonus ?? 0) > 0 ? (
                      <Tooltip title="صرف المكافآت المعلقة">
                        <IconButton
                          color="secondary"
                          onClick={() =>
                            onOpenActionDialog({
                              type: "bonus",
                              employee: row,
                            })
                          }
                        >
                          <RedeemOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {Number(row.received ?? 0) > 0 ? (
                      <Tooltip title="تصفية المبالغ المستلمة من الزبائن">
                        <IconButton
                          color="info"
                          onClick={() =>
                            onOpenActionDialog({
                              type: "received",
                              employee: row,
                            })
                          }
                        >
                          <RuleFolderOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="حذف الموظف">
                      <IconButton
                        color="error"
                        onClick={() =>
                          onOpenActionDialog({
                            type: "delete",
                            employee: row,
                          })
                        }
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            {data.length === 0 ? <EmptyTableRow colSpan={11} message="لا توجد بيانات موظفين." /> : null}
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
