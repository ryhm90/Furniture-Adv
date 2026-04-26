"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  backgroundColor: "rgba(255,255,255,0.92)",
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

const itemTypeOptions = ["غرفة", "تخم", "اخرى"];

const initialFormValues = {
  itemName: "",
  RoomPrice: "",
  receivedCount: "",
  factoryPrice: "",
  changePrice: "",
  itemCost: "",
  originalCost: "",
  transporterName: "",
  transporterId: null,
  transportPrice: "",
  unloadCost: "",
  type: "",
  providerName: "",
};

function stripCommas(value) {
  return parseFloat(value?.toString().replace(/,/g, "")) || 0;
}

function formatWithCommas(value = "") {
  return String(value).replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateCosts(values) {
  const factoryPrice = stripCommas(values.factoryPrice);
  const changePrice = stripCommas(values.changePrice);
  const receivedCount = stripCommas(values.receivedCount);
  const transportPrice = stripCommas(values.transportPrice);
  const unloadCost = stripCommas(values.unloadCost);

  const originalCost = factoryPrice && changePrice ? Math.round(factoryPrice * changePrice) : 0;

  const itemCost =
    factoryPrice && changePrice && receivedCount
      ? Math.round(
          ((factoryPrice * receivedCount + transportPrice + unloadCost / changePrice) /
            receivedCount) *
            changePrice,
        )
      : 0;

  const totalInventoryCost = itemCost && receivedCount ? itemCost * receivedCount : 0;

  return { originalCost, itemCost, totalInventoryCost };
}

export default function ProviderInventoryDialog({ open, row, onClose, onSuccess }) {
  const [formValues, setFormValues] = useState(initialFormValues);
  const [transporters, setTransporters] = useState([]);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open || !row) {
      return;
    }

    setFormValues({
      ...initialFormValues,
      itemName: row.ItemName ?? "",
      receivedCount: row.recivedCount ?? "",
      factoryPrice: row.factoryprice ?? "",
      providerName: row.providorName ?? "",
    });
  }, [open, row]);

  useEffect(() => {
    if (!open) {
      setTransporters([]);
      return;
    }

    let ignore = false;

    async function fetchTransporters() {
      try {
        const response = await axios.get("/api/transportersname");

        if (!ignore) {
          setTransporters(response.data);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error fetching transporters:", error);
        }
      }
    }

    fetchTransporters();

    return () => {
      ignore = true;
    };
  }, [open]);

  const handleClose = () => {
    setFormValues(initialFormValues);
    onClose();
  };

  const handleFieldChange = (name, value) => {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const { originalCost, itemCost, totalInventoryCost } = useMemo(
    () => calculateCosts(formValues),
    [formValues],
  );

  const selectedTransporter =
    transporters.find((transporter) => transporter.id === formValues.transporterId) ?? null;

  const handleSubmit = async () => {
    if (!row) {
      return;
    }

    if (!formValues.itemName || !formValues.RoomPrice || !formValues.type) {
      toast.warning("يرجى إكمال بيانات المادة الأساسية قبل الإدخال.");
      return;
    }

    if (!formValues.transporterId) {
      toast.warning("يرجى اختيار الناقل.");
      return;
    }

    await runWithSubmission(async () => {
      try {
        const response = await axios.post("/api/inventory/add", {
          ...formValues,
          originalCost,
          itemCost,
          selectedProvidorIda: row.ID_providor,
          selectedRecord: row.ID,
          changeRate: formValues.changePrice,
        });

        if (response.status === 200) {
          toast.success("تم إدخال المادة إلى المخزن بنجاح.");
          await onSuccess?.();
          handleClose();
        }
      } catch (error) {
        console.error("Error adding to inventory:", error);
        toast.error("تعذر إدخال المادة إلى المخزن.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        إدخال المادة مخزنياً
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
            هذا الحوار يربط بيانات المورد والناقل مع المخزن مباشرة، ويحسب تكلفة المفرد
            الأصلية وتكلفة الجملة النهائية قبل الإدخال.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#123232",
                      }}
                    >
                      بيانات المادة والاستلام
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="اسم المادة"
                          value={formValues.itemName}
                          onChange={(event) => handleFieldChange("itemName", event.target.value)}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="اسم المورد"
                          value={formValues.providerName}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="سعر البيع"
                          value={formValues.RoomPrice}
                          onChange={(event) =>
                            handleFieldChange("RoomPrice", formatWithCommas(event.target.value))
                          }
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="العدد المستلم"
                          value={formValues.receivedCount}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="نوع المادة"
                          select
                          value={formValues.type}
                          onChange={(event) => handleFieldChange("type", event.target.value)}
                          sx={fieldSx}
                        >
                          <MenuItem
                            value=""
                            disabled
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            اختر نوع المادة
                          </MenuItem>
                          {itemTypeOptions.map((option) => (
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

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="سعر المفرد مصنعياً بالدولار"
                          value={formValues.factoryPrice}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="سعر صرف الدولار"
                          value={formValues.changePrice}
                          onChange={(event) =>
                            handleFieldChange("changePrice", formatWithCommas(event.target.value))
                          }
                          sx={fieldSx}
                        />
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
                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#123232",
                      }}
                    >
                      النقل والمصاريف
                    </Typography>

                    <Autocomplete
                      options={transporters}
                      getOptionLabel={(option) => option.name || ""}
                      value={selectedTransporter}
                      onChange={(_event, newValue) => {
                        handleFieldChange("transporterName", newValue?.name || "");
                        handleFieldChange("transporterId", newValue?.id || null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="الناقل"
                          variant="outlined"
                          sx={{
                            ...fieldSx,
                            "& .MuiAutocomplete-endAdornment": {
                              direction: "ltr",
                            },
                          }}
                        />
                      )}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      label="تكلفة نقل المادة بالدولار"
                      value={formValues.transportPrice}
                      onChange={(event) =>
                        handleFieldChange("transportPrice", formatWithCommas(event.target.value))
                      }
                      sx={fieldSx}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      label="تكلفة تفريغ البضاعة بالدينار"
                      value={formValues.unloadCost}
                      onChange={(event) =>
                        handleFieldChange("unloadCost", formatWithCommas(event.target.value))
                      }
                      sx={fieldSx}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#123232",
                      }}
                    >
                      التكلفة المحسوبة
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="تكلفة المفرد الأصلية بالدينار"
                          value={formatWithCommas(originalCost || "")}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="تكلفة الجملة للمفرد"
                          value={formatWithCommas(itemCost || "")}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="إجمالي تكلفة الإدخال للمخزن"
                          value={formatWithCommas(totalInventoryCost || "")}
                          InputProps={{ readOnly: true }}
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ direction: "rtl", px: 3, py: 2 }}>
        <Button color="secondary" sx={actionButtonSx} onClick={handleClose}>
          إلغاء
        </Button>
        <Button
          sx={{
            ...actionButtonSx,
            backgroundColor: "#386e6e",
            color: "white",
            "&:hover": { backgroundColor: "#2e5a5a" },
          }}
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الإدخال..." : "إدخال المادة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
