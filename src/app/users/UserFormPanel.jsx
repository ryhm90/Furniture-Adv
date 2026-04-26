"use client";

import { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormPanel({
  row,
  initialType,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState(initialType || "User");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(row?.name || "");
    setEmail(row?.email || "");
    setType(initialType || row?.type || "User");
    setErrors({});
  }, [initialType, row]);

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Please Enter Name!";
    }

    if (!email.trim()) {
      nextErrors.email = "Please Enter Email!";
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = "Please Enter Valid Email!";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        type,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-start">
        <ArrowBackIcon className="mr-2 cursor-pointer" onClick={onClose} />
        <h2 className="font-bold mb-4">{row ? "Edit User" : "Add User"}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <TextField
              fullWidth
              size="small"
              label="Name"
              variant="outlined"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-orange-600 ml-1 text-xs">{errors.name}</p>
          </div>

          <div>
            <TextField
              fullWidth
              size="small"
              label="Email"
              variant="outlined"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="text-orange-600 ml-1 text-xs">{errors.email}</p>
          </div>

          <div>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={type}
                label="Type"
                size="small"
                onChange={(event) => setType(event.target.value)}
              >
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <Button variant="outlined" className="mb-2" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
