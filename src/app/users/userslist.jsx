"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import axios from "axios";
import Button from "@mui/material/Button";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { toast } from "react-toastify";

const ConfirmDialog = dynamic(() => import("@/app/components/ConfirmDialog"), {
  ssr: false,
});

const UserFormPanel = dynamic(() => import("./UserFormPanel"), {
  ssr: false,
});

const UsersTable = dynamic(() => import("./UsersTable"), {
  ssr: false,
});

export default function UserList() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [rows, setRows] = useState(null);
  const [isAdd, setIsAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [utype, setUtype] = useState("User");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleIsAddClose = () => {
    setIsAdd(false);
  };

  const getData = () => {
    axios
      .get("/api/users")
      .then((response) => {
        setData(response.data);
        setAllData(response.data);
      })
      .catch((error) => {
        console.log("Error", error);
      });
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setData(allData);
      return;
    }

    const normalizedSearch = searchQuery.toLowerCase();
    const filteredData = allData.filter(
      (user) =>
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch),
    );

    setData(filteredData);
    setPage(0);
  }, [allData, searchQuery]);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const editRecord = (row) => {
    setRows(row);
    setUtype(row.type);
    setIsAdd(true);
  };

  const addRecord = () => {
    setRows(null);
    setUtype("User");
    setIsAdd(true);
  };

  const deleteRow = (row) => {
    axios
      .delete("/api/users", { data: { id: row.id } })
      .then(() => {
        toast.success("Data Deleted!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        setDeleteTarget(null);
        getData();
      })
      .catch((error) => {
        console.log("Error", error);
        toast.error("Error deleting data", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      });
  };

  const handleSave = async (formData) => {
    if (rows) {
      try {
        await axios.put("/api/users", { ...formData, id: rows.id });
        toast.success("Edit Complete!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        handleIsAddClose();
        getData();
      } catch (error) {
        console.log("Error", error);
        toast.error("Error editing data", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
      return;
    }

    try {
      await axios.post("/api/users", formData);
      toast.success("Data Added!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      handleIsAddClose();
      getData();
    } catch (error) {
      console.log("Error", error);
      toast.error("Error adding data", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  };

  return (
    <>
      {deleteTarget ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Confirm to submit"
          description="Are you sure to delete this record!"
          confirmLabel="Yes"
          cancelLabel="No"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteRow(deleteTarget)}
        />
      ) : null}

      {isAdd ? (
        <UserFormPanel
          row={rows}
          initialType={utype}
          onClose={handleIsAddClose}
          onSubmit={handleSave}
        />
      ) : (
        <>
          <h2 className="font-bold mb-4">Users</h2>
          <div className="flex justify-between">
            <div>
              <input
                type="text"
                placeholder="Search users"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="mb-2 px-2 py-2 border-rounded"
              />
            </div>
            <Button
              variant="outlined"
              onClick={addRecord}
              className="mb-2"
              endIcon={<AddCircleIcon />}
            >
              Add
            </Button>
          </div>
          <UsersTable
            data={data}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            onEdit={editRecord}
            onDelete={setDeleteTarget}
          />
        </>
      )}
    </>
  );
}
