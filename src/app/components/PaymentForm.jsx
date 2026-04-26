import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";
import { workerTypeOptions } from "@/app/components/furnitureOptions";

const titleSx = {
  borderRadius: "4px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "16px",
  direction: "rtl",
};

const fieldSx = {
  borderRadius: "4px",
  "& .MuiInputBase-input": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
  "& .MuiInputLabel-root": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
  "& input::placeholder": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
  },
};

const actionButtonSx = {
  backgroundColor: "#386e6e",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
  mt: 2,
  "&:hover": {
    backgroundColor: "#2e5a5a",
  },
};

function toNumber(value) {
  return Number(String(value ?? "").replace(/,/g, "")) || 0;
}

function formatWithCommas(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = String(value).replace(/,/g, "");
  if (!numericValue || Number.isNaN(Number(numericValue))) {
    return "";
  }

  return Number(numericValue).toLocaleString("en-US");
}

function PaymentForm({ open, onClose, moneyRemaina: _moneyRemaina, inv, onSave: _onSave }) {
  const [moneyPaid, setMoneyPaid] = useState("");
  const [workerType, setWorkerType] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [wage, setWage] = useState("");
  const [moneyRemain, setMoneyRemain] = useState(0);
  const [driverflag, setDriverflag] = useState("");
  const [carflag, setCarflag] = useState("");
  const [ulaodflag, setUlaodflag] = useState("");
  const [carpenterNames, setCarpenterNames] = useState([]);
  const [driverNames, setDriverNames] = useState([]);
  const [invoNum, setInvo] = useState("");
  const [clientName, setClientName] = useState("");
  const [isSubmittingPayment, runPaymentSubmission] = useSubmissionState();
  const [isSubmittingWage, runWageSubmission] = useSubmissionState();

  useEffect(() => {
    if (!inv) {
      return;
    }

    setMoneyRemain(inv.MoneyRemain ?? 0);
    setWorkerType(inv.WorkerType || "");
    setWorkerName(inv.WorkerName || "");
    setDriverflag(inv.Driverflag || "");
    setCarflag(inv.Carflag || "");
    setUlaodflag(inv.Ulaodflag || "");
    setInvo(inv.InvoNum);
    setClientName(inv.ClName || "");
  }, [inv]);

  useEffect(() => {
    if (workerType === "السائق" && driverflag === "Paid") {
      setWage("");
    } else if (workerType === "فني التركيب" && carflag === "Paid") {
      setWage("");
    }
  }, [workerType, driverflag, carflag]);

  useEffect(() => {
    if (!open) {
      return;
    }

    async function fetchWorkerNames() {
      try {
        const response = await axios.get("/api/worker-names", { cache: "no-store" });
        setCarpenterNames(response.data.carpenterNames || []);
        setDriverNames(response.data.driverNames || []);
      } catch (error) {
        console.error("Error fetching worker names:", error);
      }
    }

    fetchWorkerNames();
  }, [open]);

  const handleMoneyPaidChange = (event) => {
    const value = event.target.value.replace(/,/g, "");
    if (!Number.isNaN(Number(value)) || value === "") {
      setMoneyPaid(value === "" ? "" : formatWithCommas(value));
    }
  };

  const handleWageChange = (event) => {
    const value = event.target.value.replace(/,/g, "");
    if (!Number.isNaN(Number(value)) || value === "") {
      setWage(value === "" ? "" : formatWithCommas(value));
    }
  };

  const handleSubmitPayment = async () => {
    await runPaymentSubmission(async () => {
      try {
        const response = await axios.post("/api/sellmoney/payment", {
          invoNum,
          moneyPaid: String(toNumber(moneyPaid)),
          moneyRemain: String(toNumber(moneyRemain)),
          ClName: clientName,
        });

        if (response.status === 200) {
          toast.success("تم تسديد المبلغ بنجاح.");
          setMoneyRemain(response.data.updatedMoneyRemain?.toString() ?? "0");
          setMoneyPaid("");
        } else {
          toast.error("تعذر تسديد المبلغ.");
        }
      } catch (error) {
        console.error("Payment submission failed:", error);
        toast.error("تعذر تسديد المبلغ.");
      }
    });
  };

  const handleSubmitWage = async () => {
    await runWageSubmission(async () => {
      try {
        const strippedWage = String(toNumber(wage));
        let updateData = {};
        let insertData = {};

        if (workerType === "فني التركيب") {
          updateData = {
            workerName,
            carflag: "Paid",
            invoNum,
          };
          insertData = {
            details: invoNum,
            moneyPaid: strippedWage,
            type: "Carpenter",
            workerName,
          };
          setCarflag("Paid");
        } else if (workerType === "السائق") {
          updateData = {
            workerName,
            driverflag: "Paid",
            invoNum,
          };
          insertData = {
            details: invoNum,
            moneyPaid: strippedWage,
            type: "Driver",
            workerName,
          };
          setDriverflag("Paid");
        } else if (workerType === "المفرغ") {
          updateData = {
            workerName,
            ulaodflag: "Paid",
            invoNum,
          };
          insertData = {
            details: invoNum,
            moneyPaid: strippedWage,
            type: "Unloading",
            workerName,
          };
          setUlaodflag("Paid");
        }

        const updateResponse = await axios.post("/api/sellmoney/update", updateData);
        if (updateResponse.status !== 200) {
          toast.error("تعذر تسديد أجور العامل.");
          return;
        }

        const insertResponse = await axios.post("/api/safeboxiqd/insert", insertData);
        if (insertResponse.status === 200) {
          toast.success("تم تسديد أجور العامل بنجاح.");
          setWorkerName("");
          setWage("");
          setWorkerType("");
          setMoneyPaid("");
        } else {
          toast.error("تعذر تسديد أجور العامل.");
        }
      } catch (error) {
        console.error("Wage submission failed:", error);
        toast.error("تعذر تسديد أجور العامل.");
      }
    });
  };

  const resetForm = () => {
    setMoneyPaid("");
    setWorkerType("");
    setWorkerName("");
    setWage("");
    setMoneyRemain(0);
    setDriverflag("");
    setCarflag("");
    setUlaodflag("");
    setInvo("");
    setClientName("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isSubmitMoneyPaidDisabled =
    toNumber(moneyPaid) > toNumber(moneyRemain) ||
    toNumber(moneyRemain) === 0 ||
    moneyPaid === "";

  const isWorkerNameDisabled =
    workerName === "" ||
    (workerType === "السائق" && driverflag === "Paid") ||
    (workerType === "فني التركيب" && carflag === "Paid") ||
    (workerType === "المفرغ" && ulaodflag === "Paid");

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={titleSx} align="center">
        تفاصيل الدفع
      </DialogTitle>
      <DialogContent>
        <TextField
          label="المبلغ المتبقي"
          value={formatWithCommas(String(moneyRemain))}
          fullWidth
          margin="normal"
          InputProps={{ readOnly: true }}
          variant="filled"
          sx={fieldSx}
        />

        <TextField
          label="المبلغ المسدد"
          value={moneyPaid}
          onChange={handleMoneyPaidChange}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        />

        <Button
          onClick={handleSubmitPayment}
          variant="contained"
          sx={actionButtonSx}
          fullWidth
          disabled={isSubmitMoneyPaidDisabled || isSubmittingPayment}
        >
          {isSubmittingPayment ? "جاري الحفظ..." : "تسديد"}
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography sx={titleSx} variant="caption" display="block" align="center">
          تفاصيل دفع الخدمات
        </Typography>

        <TextField
          select
          label="نوع الخدمة"
          value={workerType}
          onChange={(event) => setWorkerType(event.target.value)}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        >
          {workerTypeOptions.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          options={workerType === "السائق" || workerType === "المفرغ" ? driverNames : carpenterNames}
          ListboxProps={{
            sx: {
              direction: "rtl",
              fontFamily: "Alexandria, sans-serif",
              fontSize: "14px",
            },
          }}
          value={workerName}
          onChange={(_event, newValue) => setWorkerName(newValue || "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="الاسم"
              margin="normal"
              fullWidth
              disabled={isWorkerNameDisabled}
              variant="filled"
              sx={{
                "& input": {
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  direction: "rtl",
                },
                "& label": {
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "13px",
                  direction: "rtl",
                },
              }}
            />
          )}
          fullWidth
        />

        <TextField
          label="المبلغ"
          value={wage}
          onChange={handleWageChange}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        />

        <Button
          onClick={handleSubmitWage}
          variant="contained"
          fullWidth
          sx={actionButtonSx}
          disabled={isWorkerNameDisabled || !wage || !workerName || isSubmittingWage}
        >
          {isSubmittingWage ? "جاري الحفظ..." : "دفع الخدمة"}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button
          color="secondary"
          onClick={handleClose}
          sx={{
            fontFamily: "Alexandria, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
            direction: "rtl",
          }}
        >
          إلغاء
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentForm;
