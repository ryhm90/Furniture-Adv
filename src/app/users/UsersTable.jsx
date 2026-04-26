"use client";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const formatDateTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function UsersTable({
  data,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
}) {
  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell align="right" style={{ minWidth: 70 }}>
                ID
              </TableCell>
              <TableCell align="right" style={{ minWidth: 170 }}>
                Name
              </TableCell>
              <TableCell align="right" style={{ minWidth: 170 }}>
                Email
              </TableCell>
              <TableCell align="right" style={{ minWidth: 170 }}>
                Type
              </TableCell>
              <TableCell align="right" style={{ minWidth: 170 }}>
                Created At
              </TableCell>
              <TableCell align="center" style={{ minWidth: 170 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                  <TableCell align="right">{row.id}</TableCell>
                  <TableCell align="right">{row.name}</TableCell>
                  <TableCell align="right">{row.email}</TableCell>
                  <TableCell align="right">{row.type}</TableCell>
                  <TableCell align="right">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell align="right">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="cursor-pointer text-green-700 mr-2 bg-transparent border-0 p-0"
                        onClick={() => onEdit(row)}
                        aria-label={`Edit ${row.name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer text-orange-700 mr-2 bg-transparent border-0 p-0"
                        onClick={() => onDelete(row)}
                        aria-label={`Delete ${row.name}`}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
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
      />
    </Paper>
  );
}
