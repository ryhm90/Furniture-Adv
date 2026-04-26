import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";

const MAIN_SUBJECT_OPTIONS = [
  "المصاريف العمومية",
  "المصاريف الادارية",
  "المصاريف الايرادية",
  "المصاريف المالية",
  "ايرادات خدمات",
];

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

const getTodayDate = () => new Date().toLocaleDateString("en-CA");
const createLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createExpenseLine = (expenseDate = getTodayDate()) => ({
  id: createLineId(),
  subject: "",
  subSubject: "",
  amount: "",
  details: "",
  returnToSafebox: false,
  expenseDate,
});

function formatNumber(value) {
  if (value === "") return "";
  const number = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isNaN(number) ? "" : number.toLocaleString("en-US");
}

export default function ExpenseModal({ handleClose }) {
  const [lines, setLines] = useState([createExpenseLine()]);
  const [bulkDate, setBulkDate] = useState(getTodayDate());
  const [subSubjectOptions, setSubSubjectOptions] = useState({});
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const totalAmount = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const value = Number.parseFloat(String(line.amount).replace(/,/g, ""));
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    [lines],
  );

  const updateLine = (lineId, updates) => {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...updates } : line)),
    );
  };

  const handleAddLine = () => {
    setLines((current) => [...current, createExpenseLine(bulkDate || getTodayDate())]);
  };

  const handleRemoveLine = (lineId) => {
    setLines((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((line) => line.id !== lineId);
    });
  };

  const handleAmountChange = (lineId, rawValue) => {
    const value = rawValue.replace(/,/g, "");
    if (value === "" || /^\d+$/.test(value)) {
      updateLine(lineId, { amount: formatNumber(value) });
    }
  };

  const loadSubSubjects = async (subject) => {
    if (!subject || subSubjectOptions[subject]) {
      return;
    }

    try {
      const response = await axios.get(`/api/spendac/subsubjects?main=${encodeURIComponent(subject)}`);
      setSubSubjectOptions((current) => ({
        ...current,
        [subject]: Array.isArray(response.data) ? response.data : [],
      }));
    } catch (error) {
      console.error("Error fetching sub-subjects:", error);
      toast.error("تعذر تحميل مواضيع الصرف الفرعية.");
    }
  };

  const handleSubjectChange = async (lineId, subject) => {
    updateLine(lineId, { subject, subSubject: "" });
    await loadSubSubjects(subject);
  };

  const handleApplyBulkDate = () => {
    if (!bulkDate) {
      toast.warning("يرجى تحديد التاريخ العام أولاً.");
      return;
    }

    setLines((current) => current.map((line) => ({ ...line, expenseDate: bulkDate })));
    toast.success("تم تعميم التاريخ على جميع المصروفات.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedLines = lines.map((line, index) => {
      const numericAmount = Number.parseFloat(String(line.amount).replace(/,/g, ""));
      const adjustedAmount = line.returnToSafebox
        ? Math.abs(numericAmount)
        : -Math.abs(numericAmount);

      return {
        lineIndex: index + 1,
        subject: line.subject,
        subSubject: line.subSubject,
        amount: adjustedAmount,
        displayAmount: numericAmount,
        details: line.details.trim(),
        entryDate: line.expenseDate,
      };
    });

    for (const line of normalizedLines) {
      if (!line.subject) {
        toast.warning(`اختر موضوع الصرف الرئيسي للسطر ${line.lineIndex}.`);
        return;
      }
      if (!line.subSubject) {
        toast.warning(`اختر موضوع الصرف الفرعي للسطر ${line.lineIndex}.`);
        return;
      }
      if (!Number.isFinite(line.displayAmount) || line.displayAmount <= 0) {
        toast.warning(`أدخل مبلغاً صحيحاً للسطر ${line.lineIndex}.`);
        return;
      }
      if (!line.details) {
        toast.warning(`أدخل التفاصيل للسطر ${line.lineIndex}.`);
        return;
      }
      if (!line.entryDate) {
        toast.warning(`حدد تاريخ المصروف للسطر ${line.lineIndex}.`);
        return;
      }
    }

    await runWithSubmission(async () => {
      try {
        await axios.post("/api/safeboxiqd/inserts", {
          expenses: normalizedLines.map(({ subSubject, amount, details, entryDate }) => ({
            subSubject,
            amount,
            details,
            entryDate,
          })),
        });
        toast.success(`تم إدخال ${normalizedLines.length} مصروفات بنجاح.`);
        handleClose();
      } catch (error) {
        console.error("Error inserting expenses:", error);
        toast.error("تعذر إدخال المصروفات.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
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
        إضافة مصروفات متعددة
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
            يمكنك إدخال عدة مصروفات دفعة واحدة، مع تاريخ مستقل لكل سطر أو تعميم تاريخ واحد
            على جميع المصروفات.
          </Alert>

          <Card sx={sectionCardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#123232",
                    }}
                  >
                    إعدادات عامة للمصروفات
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    التاريخ العام سيسهل إدخال مجموعة مصروفات ليوم واحد، ويمكن تعديله لكل سطر
                    على حدة عند الحاجة.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                  <TextField
                    label="تاريخ عام للمصروفات"
                    type="date"
                    value={bulkDate}
                    onChange={(event) => setBulkDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...fieldSx, minWidth: { xs: "100%", sm: 220 } }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CalendarMonthOutlinedIcon />}
                    onClick={handleApplyBulkDate}
                    sx={actionButtonSx}
                    disabled={!bulkDate}
                  >
                    تعميم التاريخ
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddLine}
                    sx={{
                      ...actionButtonSx,
                      backgroundColor: "#386e6e",
                      "&:hover": { backgroundColor: "#2e5a5a" },
                    }}
                  >
                    إضافة سطر مصروف
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {lines.map((line, index) => (
              <Card key={line.id} sx={sectionCardSx}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#123232",
                        }}
                      >
                        مصروف رقم {index + 1}
                      </Typography>

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={lines.length === 1}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="موضوع الصرف الرئيسي"
                          value={line.subject}
                          onChange={(event) => handleSubjectChange(line.id, event.target.value)}
                          sx={fieldSx}
                        >
                          <MenuItem value="" disabled sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px", direction: "rtl" }}>
                            اختر موضوع الصرف الرئيسي
                          </MenuItem>
                          {MAIN_SUBJECT_OPTIONS.map((subject) => (
                            <MenuItem
                              key={subject}
                              value={subject}
                              sx={{
                                fontFamily: "Alexandria, sans-serif",
                                fontSize: "13px",
                                direction: "rtl",
                              }}
                            >
                              {subject}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="موضوع الصرف الفرعي"
                          value={line.subSubject}
                          onChange={(event) =>
                            updateLine(line.id, { subSubject: event.target.value })
                          }
                          sx={fieldSx}
                          disabled={!line.subject}
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
                            اختر موضوع الصرف الفرعي
                          </MenuItem>
                          {(subSubjectOptions[line.subject] ?? []).map((sub, subIndex) => (
                            <MenuItem
                              key={`${line.id}-${subIndex}`}
                              value={sub.Action}
                              sx={{
                                fontFamily: "Alexandria, sans-serif",
                                fontSize: "13px",
                                direction: "rtl",
                              }}
                            >
                              {sub.Action}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="تاريخ المصروف"
                          type="date"
                          value={line.expenseDate}
                          onChange={(event) =>
                            updateLine(line.id, { expenseDate: event.target.value })
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="المبلغ"
                          value={line.amount}
                          onChange={(event) => handleAmountChange(line.id, event.target.value)}
                          inputProps={{ inputMode: "numeric" }}
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          label="التفاصيل"
                          value={line.details}
                          onChange={(event) =>
                            updateLine(line.id, { details: event.target.value })
                          }
                          sx={fieldSx}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={line.returnToSafebox}
                              onChange={(event) =>
                                updateLine(line.id, { returnToSafebox: event.target.checked })
                              }
                            />
                          }
                          label="استرجاع إلى الصندوق"
                          sx={{
                            direction: "rtl",
                            m: 0,
                            "& .MuiFormControlLabel-label": {
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              fontWeight: 400,
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card sx={sectionCardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1}
              >
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "14px",
                    color: "text.secondary",
                  }}
                >
                  عدد السطور الحالية: {lines.length}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#123232",
                  }}
                >
                  إجمالي المبالغ المدخلة: {totalAmount.toLocaleString("en-US")} د.ع
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ direction: "rtl", px: 3, py: 2 }}>
        <Button onClick={handleClose} color="secondary" sx={actionButtonSx}>
          إلغاء
        </Button>
        <Button
          type="submit"
          variant="contained"
          sx={{
            ...actionButtonSx,
            backgroundColor: "#386e6e",
            "&:hover": { backgroundColor: "#2e5a5a" },
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الحفظ..." : "حفظ المصروفات"}
        </Button>
      </DialogActions>
    </form>
  );
}
