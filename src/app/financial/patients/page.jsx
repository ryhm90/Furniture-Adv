"use client"
import { useState, useEffect } from "react";
import { Box, Card, CardContent, TextField, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import axios from "axios";
import AppShell from "@/app/components/AppShell";
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

function Patients() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate] = useState(null);
  const [, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState(""); // Added state for sorting

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    let filterData = [...allData];
    if (searchQuery) {
      filterData = filterData.filter((usr) =>
        usr.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDate) {
      filterData = filterData.filter((usr) => {
        const appointmentDate = new Date(usr.dt).toDateString();
        const selected = new Date(selectedDate).toDateString();
        return appointmentDate === selected;
      });
    }

    // Apply sorting
    if (sortOption === "name-asc") {
      filterData.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "name-desc") {
      filterData.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === "balance-asc") {
      filterData.sort((a, b) => a.balance - b.balance);
    } else if (sortOption === "balance-desc") {
      filterData.sort((a, b) => b.balance - a.balance);
    }

    setData(filterData);
  }, [allData, searchQuery, selectedDate, sortOption]);

  const getData = () => {
    setLoading(true);
    axios
      .get("/api/financials/dept") // Updated API endpoint
      .then((response) => {
        setData(response.data);
        setAllData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error", err);
        setLoading(false);
      });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      maximumFractionDigits: 2,
    }).format(balance);
  };

  return (
    <AppShell A="Patients Dept">
      <Box className="flex justify-between items-center mb-4">
        <Card sx={{ width: "100%", padding: 2 }}>
          <CardContent>
            <Box className="flex justify-between items-center">
              <Box className="flex flex-wrap gap-4">
                <TextField
                  label="Search Patients"
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="Alexandria mb-2"
                  style={{ borderRadius: "4px" }}
                />
                <FormControl variant="outlined" style={{ minWidth: 200 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="name-asc">Name: A-Z</MenuItem>
                    <MenuItem value="name-desc">Name: Z-A</MenuItem>
                    <MenuItem value="balance-asc">Balance: Low to High</MenuItem>
                    <MenuItem value="balance-desc">Balance: High to Low</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440, overflowX: "auto" }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
              <TableCell className="Alexandria" align="center" sx={{backgroundColor: '#2c2c4d', color: 'white' }}>

                  ID
                </TableCell>
                <TableCell className="Alexandria" align="center" sx={{backgroundColor: '#2c2c4d', color: 'white' }}>
                Patient Name
                </TableCell>
                <TableCell className="Alexandria" align="center" sx={{backgroundColor: '#2c2c4d', color: 'white' }}>
                Balance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.Pid}>
                  <TableCell className="Alexandria" align="center">
{row.Pid}</TableCell>
                  <TableCell className="Alexandria" align="center">
{row.name}</TableCell>
                  <TableCell className="Alexandria" align="center">
{formatBalance(row.balance)}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 ? <EmptyTableRow colSpan={3} /> : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
  rowsPerPageOptions={[10, 25, 100]}
  component="div"
  count={data.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
  ActionsComponent={TablePaginationActionsRtl}
  labelRowsPerPage="عدد الصفوف لكل صفحة"
/>
      </Paper>
    </AppShell>
  );
}

export default Patients;
