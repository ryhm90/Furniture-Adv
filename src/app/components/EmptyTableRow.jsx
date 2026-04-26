import { TableCell, TableRow } from "@mui/material";

export default function EmptyTableRow({
  colSpan,
  message = "لا توجد بيانات للعرض",
  sx = {},
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        align="center"
        sx={{
          py: 3,
          color: "text.secondary",
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 400,
          fontSize: "13px",
          ...sx,
        }}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
