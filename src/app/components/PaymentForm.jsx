import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";

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

function PaymentForm({ open, onClose, moneyRemaina: _moneyRemaina, inv, onSave }) {
  const [moneyPaid, setMoneyPaid] = useState("");
  const [moneyRemain, setMoneyRemain] = useState(0);
  const [driverflag, setDriverflag] = useState("");
  const [carflag, setCarflag] = useState("");
  const [driverNames, setDriverNames] = useState([]);
  const [carpenterNames, setCarpenterNames] = useState([]);
  const [invoNum, setInvo] = useState("");
  const [clientName, setClientName] = useState("");
  const [registeredDriver, setRegisteredDriver] = useState("");
  const [registeredCarpenter, setRegisteredCarpenter] = useState("");
  const [driverWage, setDriverWage] = useState("");
  const [carpenterWage, setCarpenterWage] = useState("");
  const [isSubmittingPayment, runPaymentSubmission] = useSubmissionState();
  const [isSubmittingDriverWage, runDriverWageSubmission] = useSubmissionState();
  const [isSubmittingCarpenterWage, runCarpenterWageSubmission] = useSubmissionState();

  useEffect(() => {
    if (!inv) {
      return;
    }

    setMoneyRemain(inv.MoneyRemain ?? 0);
    setDriverflag(inv.Driverflag || "");
    setCarflag(inv.Carflag || "");
    setInvo(inv.InvoNum || "");
    setClientName(inv.ClName || "");
    setRegisteredDriver(inv.Driver || "");
    setRegisteredCarpenter(inv.CarNam || "");
    setDriverWage("");
    setCarpenterWage("");
  }, [inv]);

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

  const handleDriverWageChange = (event) => {
    const value = event.target.value.replace(/,/g, "");

    if (!Number.isNaN(Number(value)) || value === "") {
      setDriverWage(value === "" ? "" : formatWithCommas(value));
    }
  };

  const handleCarpenterWageChange = (event) => {
    const value = event.target.value.replace(/,/g, "");

    if (!Number.isNaN(Number(value)) || value === "") {
      setCarpenterWage(value === "" ? "" : formatWithCommas(value));
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
          onSave?.(response.data);
          return;
        }

        toast.error("تعذر تسديد المبلغ.");
      } catch (error) {
        console.error("Payment submission failed:", error);
        toast.error("تعذر تسديد المبلغ.");
      }
    });
  };

  const submitServiceWage = async ({
    workerName,
    wageValue,
    type,
    flagKey,
    setPaidFlag,
    clearWage,
    runSubmission,
  }) => {
    await runSubmission(async () => {
      try {
        const strippedWage = String(toNumber(wageValue));

        const updateData =
          type === "Driver"
            ? {
                workerName,
                driverflag: "Paid",
                invoNum,
              }
            : {
                workerName,
                carflag: "Paid",
                invoNum,
              };

        const insertData = {
          details: invoNum,
          moneyPaid: strippedWage,
          type,
          workerName,
        };

        const updateResponse = await axios.post("/api/sellmoney/update", updateData);

        if (updateResponse.status !== 200) {
          toast.error("تعذر تسديد أجور الخدمة.");
          return;
        }

        const insertResponse = await axios.post("/api/safeboxiqd/insert", insertData);

        if (insertResponse.status === 200) {
          setPaidFlag("Paid");
          clearWage("");
          toast.success(
            flagKey === "driver" ? "تم تسديد أجور السائق بنجاح." : "تم تسديد أجور فني التركيب بنجاح.",
          );
          return;
        }

        toast.error("تعذر تسديد أجور الخدمة.");
      } catch (error) {
        console.error("Service wage submission failed:", error);
        toast.error("تعذر تسديد أجور الخدمة.");
      }
    });
  };

  const resetForm = () => {
    setMoneyPaid("");
    setMoneyRemain(0);
    setDriverflag("");
    setCarflag("");
    setInvo("");
    setClientName("");
    setRegisteredDriver("");
    setRegisteredCarpenter("");
    setDriverWage("");
    setCarpenterWage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isSubmitMoneyPaidDisabled =
    toNumber(moneyPaid) > toNumber(moneyRemain) ||
    toNumber(moneyRemain) === 0 ||
    moneyPaid === "";

  const isDriverPaid = driverflag === "Paid";
  const isCarpenterPaid = carflag === "Paid";

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

        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack spacing={1}>
            <TextField
              select
              label="السائق المسجل"
              value={registeredDriver}
              onChange={(event) => setRegisteredDriver(event.target.value)}
              fullWidth
              variant="filled"
              sx={fieldSx}
              disabled={isDriverPaid}
            >
              {driverNames.map((driverName) => (
                <MenuItem key={driverName} value={driverName}>
                  {driverName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="مبلغ السائق"
              value={driverWage}
              onChange={handleDriverWageChange}
              fullWidth
              variant="filled"
              sx={fieldSx}
              disabled={isDriverPaid}
            />

            <Button
              onClick={() =>
                submitServiceWage({
                  workerName: registeredDriver,
                  wageValue: driverWage,
                  type: "Driver",
                  flagKey: "driver",
                  setPaidFlag: setDriverflag,
                  clearWage: setDriverWage,
                  runSubmission: runDriverWageSubmission,
                })
              }
              variant="contained"
              fullWidth
              sx={actionButtonSx}
              disabled={!registeredDriver || !driverWage || isDriverPaid || isSubmittingDriverWage}
            >
              {isSubmittingDriverWage ? "جاري الحفظ..." : "دفع أجور السائق"}
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <TextField
              select
              label="فني التركيب المسجل"
              value={registeredCarpenter}
              onChange={(event) => setRegisteredCarpenter(event.target.value)}
              fullWidth
              variant="filled"
              sx={fieldSx}
              disabled={isCarpenterPaid}
            >
              {carpenterNames.map((carpenterName) => (
                <MenuItem key={carpenterName} value={carpenterName}>
                  {carpenterName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="مبلغ فني التركيب"
              value={carpenterWage}
              onChange={handleCarpenterWageChange}
              fullWidth
              variant="filled"
              sx={fieldSx}
              disabled={isCarpenterPaid}
            />

            <Button
              onClick={() =>
                submitServiceWage({
                  workerName: registeredCarpenter,
                  wageValue: carpenterWage,
                  type: "Carpenter",
                  flagKey: "carpenter",
                  setPaidFlag: setCarflag,
                  clearWage: setCarpenterWage,
                  runSubmission: runCarpenterWageSubmission,
                })
              }
              variant="contained"
              fullWidth
              sx={actionButtonSx}
              disabled={
                !registeredCarpenter ||
                !carpenterWage ||
                isCarpenterPaid ||
                isSubmittingCarpenterWage
              }
            >
              {isSubmittingCarpenterWage ? "جاري الحفظ..." : "دفع أجور فني التركيب"}
            </Button>
          </Stack>
        </Stack>
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
