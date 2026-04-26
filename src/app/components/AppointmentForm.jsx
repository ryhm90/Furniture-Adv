import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";

const fieldSx = {
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
  "& .MuiInputBase-root": {
    borderRadius: "14px",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
};

const sectionCardSx = {
  borderRadius: 3,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  backgroundColor: "rgba(255,255,255,0.9)",
};

const actionButtonSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  borderRadius: "12px",
  px: 2.5,
  py: 1.1,
  textTransform: "none",
};

const ITEM_TYPE_OPTIONS = ["غرفة", "تخم", "اخرى"];

const COST_MODE_OPTIONS = [
  {
    value: "total_breakdown",
    label: "من التكلفة الكلية والنقل",
    helper: "أدخل التكلفة الكلية والنقل وسيحسب النظام تكلفة المفرد تلقائياً.",
  },
  {
    value: "unit_wholesale",
    label: "من تكلفة الجملة للمفرد",
    helper: "أدخل تكلفة الجملة للمفرد مع العدد فقط، وسيحسب النظام الإجمالي تلقائياً.",
  },
];

const initialFormState = {
  RoomName: "",
  RoomPrice: "",
  OriginalCost: "",
  RoomCost: "",
  RoomsCount: "",
  FlowCount: "",
  flagf: "غرفة",
  info: "",
  Namee: "",
  TotalCost: "",
  TU: "",
  ExternalPurchase: "N",
  FinancialAccount: "",
  CostEntryMode: "total_breakdown",
  WholesaleUnitCost: "",
};

const baseNumericFields = ["RoomsCount", "RoomPrice", "FlowCount", "TotalCost", "TU", "WholesaleUnitCost"];

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const numericValue = Number.parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function toNumericValue(value) {
  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) {
    return NaN;
  }

  return Number.parseFloat(normalizedValue);
}

function setIfChanged(currentState, nextValues) {
  const nextState = { ...currentState };
  let didChange = false;

  Object.entries(nextValues).forEach(([key, value]) => {
    if (nextState[key] !== value) {
      nextState[key] = value;
      didChange = true;
    }
  });

  return didChange ? nextState : currentState;
}

export default function AppointmentForm({
  open,
  handleClose,
  financialAccounts = [],
  onSuccess,
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    const roomsCount = toNumericValue(formData.RoomsCount);

    if (!Number.isFinite(roomsCount) || roomsCount <= 0) {
      setFormData((prevState) =>
        setIfChanged(prevState, {
          OriginalCost: "",
          RoomCost: "",
          ...(prevState.CostEntryMode === "unit_wholesale" ? { TotalCost: "", TU: "0" } : {}),
        }),
      );
      return;
    }

    if (formData.CostEntryMode === "unit_wholesale") {
      const unitWholesaleCost = toNumericValue(formData.WholesaleUnitCost);

      if (!Number.isFinite(unitWholesaleCost) || unitWholesaleCost <= 0) {
        setFormData((prevState) =>
          setIfChanged(prevState, {
            OriginalCost: "",
            RoomCost: "",
            TotalCost: "",
            TU: "0",
          }),
        );
        return;
      }

      setFormData((prevState) =>
        setIfChanged(prevState, {
          OriginalCost: formatNumber(unitWholesaleCost),
          RoomCost: formatNumber(unitWholesaleCost),
          TotalCost: formatNumber(unitWholesaleCost * roomsCount),
          TU: "0",
        }),
      );
      return;
    }

    const totalCost = toNumericValue(formData.TotalCost);
    const transportCost = toNumericValue(formData.TU);

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      setFormData((prevState) =>
        setIfChanged(prevState, {
          OriginalCost: "",
          RoomCost: "",
        }),
      );
      return;
    }

    const originalCost = totalCost / roomsCount;
    const totalRoomCost =
      (totalCost + (Number.isFinite(transportCost) ? transportCost : 0)) / roomsCount;

    setFormData((prevState) =>
      setIfChanged(prevState, {
        OriginalCost: formatNumber(originalCost),
        RoomCost: formatNumber(totalRoomCost),
      }),
    );
  }, [
    formData.CostEntryMode,
    formData.RoomsCount,
    formData.TotalCost,
    formData.TU,
    formData.WholesaleUnitCost,
  ]);

  const selectedCostMode = useMemo(
    () =>
      COST_MODE_OPTIONS.find((option) => option.value === formData.CostEntryMode) ??
      COST_MODE_OPTIONS[0],
    [formData.CostEntryMode],
  );

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const closeDialog = () => {
    handleClose();
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (baseNumericFields.includes(name)) {
      const numericValue = value.replace(/,/g, "");
      if (numericValue !== "" && Number.isNaN(Number(numericValue))) {
        return;
      }

      setFormData((prevState) => ({
        ...prevState,
        [name]: numericValue === "" ? "" : formatNumber(numericValue),
      }));
      return;
    }

    if (name === "ExternalPurchase") {
      setFormData((prevState) => ({
        ...prevState,
        ExternalPurchase: value,
        FinancialAccount: value === "Y" ? prevState.FinancialAccount : "",
      }));
      return;
    }

    if (name === "CostEntryMode") {
      setFormData((prevState) => ({
        ...prevState,
        CostEntryMode: value,
        TotalCost: value === "unit_wholesale" ? prevState.TotalCost : prevState.TotalCost,
        TU: value === "unit_wholesale" ? "0" : prevState.TU,
      }));
      return;
    }

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (formData.ExternalPurchase === "Y" && !formData.FinancialAccount) {
      toast.warning("يرجى اختيار الحساب المالي للمادة ذات الشراء الخارجي.");
      return;
    }

    if (
      !formData.RoomName ||
      !formData.RoomPrice ||
      !formData.RoomsCount ||
      !formData.FlowCount ||
      !formData.RoomCost ||
      !formData.OriginalCost ||
      !formData.TotalCost
    ) {
      toast.warning("يرجى إكمال الحقول الأساسية للمادة قبل الحفظ.");
      return;
    }

    if (formData.CostEntryMode === "unit_wholesale" && !formData.WholesaleUnitCost) {
      toast.warning("يرجى إدخال تكلفة الجملة للمفرد.");
      return;
    }

    if (formData.CostEntryMode === "total_breakdown" && (!formData.TotalCost || !formData.TU)) {
      toast.warning("يرجى إدخال التكلفة الكلية والنقل والتفريغ.");
      return;
    }

    await runWithSubmission(async () => {
      try {
        await axios.post("/api/furniture/add", formData);
        closeDialog();
        toast.success("تمت إضافة المادة بنجاح.");
        await onSuccess?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("تعذر إضافة المادة.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(248,251,251,1) 0%, rgba(255,255,255,1) 100%)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 600,
          fontSize: "20px",
          direction: "rtl",
          color: "#123232",
          pb: 1,
        }}
      >
        إضافة مادة جديدة إلى المخزن
      </DialogTitle>

      <DialogContent dividers sx={{ backgroundColor: "rgba(248, 251, 251, 0.94)" }}>
        <Stack spacing={2.5}>
          <Alert
            severity="info"
            sx={{
              borderRadius: 3,
              "& .MuiAlert-message": {
                fontFamily: "Alexandria, sans-serif",
                fontSize: "13px",
                lineHeight: 1.9,
              },
            }}
          >
            يمكنك إدخال المادة بالطريقة التفصيلية التقليدية، أو الاعتماد على تكلفة الجملة
            للمفرد مع العدد فقط. في كلا الحالتين سيحسب النظام تكلفة المخزن تلقائياً.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#123232",
                        }}
                      >
                        بيانات المادة الأساسية
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          color: "text.secondary",
                        }}
                      >
                        أدخل اسم المادة، سعر البيع، العدد، ونوع الصنف.
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="RoomName"
                          label="اسم المادة"
                          value={formData.RoomName}
                          onChange={handleChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="Namee"
                          label="الاسم المصنعي"
                          value={formData.Namee}
                          onChange={handleChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="RoomPrice"
                          label="سعر البيع"
                          value={formData.RoomPrice}
                          onChange={handleChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="RoomsCount"
                          label="العدد"
                          value={formData.RoomsCount}
                          onChange={handleChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="FlowCount"
                          label="المتضرر"
                          value={formData.FlowCount}
                          onChange={handleChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="flagf"
                          label="نوع المادة"
                          select
                          value={formData.flagf}
                          onChange={handleChange}
                          sx={fieldSx}
                        >
                          {ITEM_TYPE_OPTIONS.map((option) => (
                            <MenuItem
                              key={option}
                              value={option}
                              sx={{
                                fontFamily: "Alexandria, sans-serif",
                                fontSize: "13px",
                                direction: "rtl",
                              }}
                            >
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#123232",
                        }}
                      >
                        طريقة احتساب التكلفة
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          color: "text.secondary",
                        }}
                      >
                        اختر الطريقة المناسبة لإدخال تكلفة المادة.
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      name="CostEntryMode"
                      label="آلية إدخال التكلفة"
                      select
                      value={formData.CostEntryMode}
                      onChange={handleChange}
                      sx={fieldSx}
                    >
                      {COST_MODE_OPTIONS.map((option) => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            fontSize: "13px",
                            direction: "rtl",
                          }}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Alert
                      severity="success"
                      sx={{
                        borderRadius: 3,
                        "& .MuiAlert-message": {
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          lineHeight: 1.9,
                        },
                      }}
                    >
                      {selectedCostMode.helper}
                    </Alert>

                    {formData.CostEntryMode === "total_breakdown" ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            name="TotalCost"
                            label="التكلفة الكلية"
                            value={formData.TotalCost}
                            onChange={handleChange}
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            name="TU"
                            label="النقل والتفريغ"
                            value={formData.TU}
                            onChange={handleChange}
                            sx={fieldSx}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            name="WholesaleUnitCost"
                            label="تكلفة الجملة للمفرد"
                            value={formData.WholesaleUnitCost}
                            onChange={handleChange}
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            name="TotalCost"
                            label="إجمالي تكلفة المادة"
                            value={formData.TotalCost}
                            InputProps={{ readOnly: true }}
                            sx={fieldSx}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#123232",
                        }}
                      >
                        التكلفة الناتجة
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          color: "text.secondary",
                        }}
                      >
                        هذه القيم تُستخدم مباشرة داخل المخزن وعند احتساب كلفة البيع لاحقاً.
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="OriginalCost"
                          label="تكلفة المفرد من المصدر"
                          value={formData.OriginalCost}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          name="RoomCost"
                          label="تكلفة الجملة للمفرد"
                          value={formData.RoomCost}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#123232",
                        }}
                      >
                        الربط المالي والملاحظات
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          color: "text.secondary",
                        }}
                      >
                        فعّل الشراء الخارجي عند الحاجة لربط تكلفة المادة بمحفظة مالية.
                      </Typography>
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.ExternalPurchase === "Y"}
                          onChange={(event) =>
                            handleChange({
                              target: {
                                name: "ExternalPurchase",
                                value: event.target.checked ? "Y" : "N",
                              },
                            })
                          }
                        />
                      }
                      label="شراء خارجي"
                      sx={{
                        direction: "rtl",
                        m: 0,
                        "& .MuiFormControlLabel-label": {
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                        },
                      }}
                    />

                    {formData.ExternalPurchase === "Y" ? (
                      <TextField
                        fullWidth
                        variant="outlined"
                        margin="dense"
                        name="FinancialAccount"
                        label="الحساب المالي المرتبط"
                        select
                        value={formData.FinancialAccount}
                        onChange={handleChange}
                        sx={fieldSx}
                      >
                        {financialAccounts.length === 0 ? (
                          <MenuItem
                            disabled
                            value=""
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            لا توجد حسابات مالية متاحة
                          </MenuItem>
                        ) : null}
                        {financialAccounts.map((accountName) => (
                          <MenuItem
                            key={accountName}
                            value={accountName}
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            {accountName}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : null}

                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      name="info"
                      label="الملاحظات"
                      multiline
                      rows={4}
                      value={formData.info}
                      onChange={handleChange}
                      sx={fieldSx}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ direction: "rtl", px: 3, py: 2 }}>
        <Button onClick={closeDialog} color="secondary" sx={actionButtonSx}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{
            ...actionButtonSx,
            backgroundColor: "#386e6e",
            "&:hover": { backgroundColor: "#2e5a5a" },
          }}
        >
          {isSubmitting ? "جاري الحفظ..." : "حفظ المادة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
