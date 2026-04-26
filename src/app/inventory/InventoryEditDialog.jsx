"use client";

import {
  Alert,
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

const numericLabels = {
  RoomPrice: "سعر البيع",
  RoomCost: "تكلفة الجملة للمفرد",
  RoomCounts: "العدد المتاح",
  DelevCount: "العدد المستلم",
  FlowCount: "المتضرر",
};

const itemTypeOptions = ["غرفة", "تخم", "اخرى"];
const syncOptions = [
  {
    value: "entrytable_only",
    label: "تحديث المخزن فقط",
    helper: "يتم تعديل RoomCost داخل entrytable فقط، وتبقى المبيعات السابقة كما هي.",
  },
  {
    value: "sync_selltable",
    label: "تحديث المخزن والمبيعات السابقة",
    helper:
      "يتم تعديل RoomCost داخل entrytable ثم إعادة احتساب RoomCost في selltable لكل صف سابق حسب RoomNum و countt.",
  },
];

export default function InventoryEditDialog({
  open,
  row,
  financialAccounts = [],
  onClose,
  onChange,
  onSubmit,
}) {
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  if (!row) {
    return null;
  }

  const currentSyncMode = row.RoomCostUpdateScope || "entrytable_only";

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
      await onSubmit();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        تحديث بيانات المادة
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
            يمكنك تعديل تكلفة الجملة للمادة داخل المخزن فقط، أو مزامنتها مع كل المبيعات
            السابقة لنفس المادة وفق `RoomNum` وعدد القطع `countt`.
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
                      بيانات المادة
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="اسم المادة"
                          name="RoomName"
                          value={row.RoomName || ""}
                          onChange={onChange}
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="الاسم المصنعي"
                          name="Namee"
                          value={row.Namee || ""}
                          onChange={onChange}
                          sx={fieldSx}
                        />
                      </Grid>

                      {["RoomPrice", "RoomCost", "RoomCounts", "DelevCount", "FlowCount"].map(
                        (name) => (
                          <Grid item xs={12} md={name === "RoomCost" ? 12 : 6} key={name}>
                            <TextField
                              fullWidth
                              variant="outlined"
                              margin="dense"
                              label={numericLabels[name]}
                              name={name}
                              value={(row[name] ?? "")
                                .toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                              onChange={(event) =>
                                onChange({
                                  target: {
                                    name,
                                    value: event.target.value.replace(/,/g, ""),
                                  },
                                })
                              }
                              sx={fieldSx}
                            />
                          </Grid>
                        ),
                      )}

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="نوع المادة"
                          name="flagf"
                          select
                          value={row.flagf || ""}
                          onChange={onChange}
                          sx={fieldSx}
                        >
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
                          label="بيع الجملة"
                          name="wholesale"
                          select
                          value={row.wholesale || "N"}
                          onChange={onChange}
                          sx={fieldSx}
                        >
                          <MenuItem
                            value="Y"
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            نعم
                          </MenuItem>
                          <MenuItem
                            value="N"
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            كلا
                          </MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="الملاحظات"
                          name="info"
                          value={row.info || ""}
                          onChange={onChange}
                          multiline
                          rows={3}
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
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
                        نطاق تحديث تكلفة الجملة
                      </Typography>

                      <TextField
                        fullWidth
                        variant="outlined"
                        margin="dense"
                        label="تطبيق تعديل RoomCost"
                        name="RoomCostUpdateScope"
                        select
                        value={currentSyncMode}
                        onChange={onChange}
                        sx={fieldSx}
                      >
                        {syncOptions.map((option) => (
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
                        severity={currentSyncMode === "sync_selltable" ? "warning" : "success"}
                        sx={{
                          borderRadius: 3,
                          "& .MuiAlert-message": {
                            fontFamily: "Alexandria, sans-serif",
                            fontSize: "13px",
                            lineHeight: 1.9,
                          },
                        }}
                      >
                        {
                          syncOptions.find((option) => option.value === currentSyncMode)?.helper
                        }
                      </Alert>
                    </Stack>
                  </CardContent>
                </Card>

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
                        الربط المالي وتسعير الجملة
                      </Typography>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={row.ExternalPurchase === "Y"}
                            onChange={(event) =>
                              onChange({
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

                      {row.ExternalPurchase === "Y" ? (
                        <TextField
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          label="الحساب المالي المرتبط"
                          name="FinancialAccount"
                          select
                          value={row.FinancialAccount || ""}
                          onChange={onChange}
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

                      {row.wholesale === "Y" ? (
                        <Grid container spacing={2}>
                          {["Tier1", "Tier2", "Tier3"].map((tier, index) => (
                            <Grid item xs={12} key={tier}>
                              <TextField
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                label={`سعر الفئة ${["الأولى", "الثانية", "الثالثة"][index]}`}
                                name={tier}
                                value={(row[tier] ?? "")
                                  .toString()
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                onChange={(event) =>
                                  onChange({
                                    target: {
                                      name: tier,
                                      value: event.target.value.replace(/,/g, ""),
                                    },
                                  })
                                }
                                sx={fieldSx}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ direction: "rtl", px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary" sx={actionButtonSx}>
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
          {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
