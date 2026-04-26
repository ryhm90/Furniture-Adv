"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import useSubmissionState from "@/app/components/useSubmissionState";

const requestTypeOptions = [
  { value: "paper_receipt", label: "وصل ورقي" },
  { value: "online_receipt", label: "وصل أونلاين" },
  { value: "schedule_change", label: "تغيير موعد تجهيز" },
  { value: "other", label: "طلب عام" },
];

const fieldSx = {
  "& .MuiInputBase-input": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    direction: "rtl",
  },
  "& .MuiInputLabel-root": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    direction: "rtl",
  },
};

export default function PublicSalesRequestPortal({ dbName }) {
  const [formState, setFormState] = useState({
    senderName: "",
    phoneNumber: "",
    requestType: "paper_receipt",
    requestText: "",
    startedAt: String(Date.now()),
    website: "",
  });
  const [files, setFiles] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const selectedRequestTypeLabel = useMemo(
    () =>
      requestTypeOptions.find((option) => option.value === formState.requestType)?.label ??
      "طلب عام",
    [formState.requestType],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previousState) => ({
      ...previousState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await runWithSubmission(async () => {
      setSuccessMessage("");
      setErrorMessage("");

      const payload = new FormData();
      payload.set("senderName", formState.senderName);
      payload.set("phoneNumber", formState.phoneNumber);
      payload.set("requestType", formState.requestType);
      payload.set("requestText", formState.requestText);
      payload.set("startedAt", formState.startedAt);
      payload.set("website", formState.website);
      files.forEach((file) => payload.append("attachments", file));

      try {
        const response = await fetch(`/api/public/sales-request/${encodeURIComponent(dbName)}`, {
          method: "POST",
          body: payload,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "تعذر إرسال الطلب.");
        }

        setSuccessMessage("تم إرسال طلبك بنجاح، وسيظهر مباشرة في وارد المبيعات.");
        setFormState({
          senderName: "",
          phoneNumber: "",
          requestType: "paper_receipt",
          requestText: "",
          startedAt: String(Date.now()),
          website: "",
        });
        setFiles([]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "تعذر إرسال الطلب.");
      }
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, md: 8 },
        background:
          "linear-gradient(180deg, rgba(245,248,248,1) 0%, rgba(232,241,241,1) 100%)",
      }}
    >
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 5,
            boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
            border: "1px solid rgba(15, 23, 42, 0.06)",
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: "24px", md: "32px" },
                  color: "#123232",
                }}
              >
                إرسال وصل أو طلب تجهيز
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  lineHeight: 2,
                  color: "rgba(18, 50, 50, 0.78)",
                }}
              >
                يمكنك رفع صورة وصل ورقي أو أونلاين، أو إرسال طلب تغيير موعد تجهيز. لا تحتاج هذه
                الصفحة إلى تسجيل دخول، لكن الطلبات محمية من الإغراق وتظهر مباشرة في وارد المبيعات.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Card sx={{ flex: 1, borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CloudUploadOutlinedIcon sx={{ color: "#386e6e" }} />
                    <Box>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600 }}>
                        مرفقات مدعومة
                      </Typography>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                        صور JPG/PNG/WEBP/HEIC أو PDF، حتى 4 ملفات.
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <TaskAltOutlinedIcon sx={{ color: "#386e6e" }} />
                    <Box>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600 }}>
                        نوع الطلب الحالي
                      </Typography>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                        {selectedRequestTypeLabel}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ShieldOutlinedIcon sx={{ color: "#386e6e" }} />
                    <Box>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600 }}>
                        حماية أساسية
                      </Typography>
                      <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                        Rate limiting وفحص ضد السبام قبل قبول الطلب.
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            {successMessage ? (
              <Alert sx={{ "& .MuiAlert-message": { fontFamily: "Alexandria, sans-serif" } }}>
                {successMessage}
              </Alert>
            ) : null}

            {errorMessage ? (
              <Alert severity="error" sx={{ "& .MuiAlert-message": { fontFamily: "Alexandria, sans-serif" } }}>
                {errorMessage}
              </Alert>
            ) : null}

            <Paper
              component="form"
              onSubmit={handleSubmit}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 4,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: "rgba(255,255,255,0.78)",
              }}
            >
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="الاسم"
                    name="senderName"
                    value={formState.senderName}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="filled"
                    sx={fieldSx}
                  />
                  <TextField
                    label="رقم الهاتف"
                    name="phoneNumber"
                    value={formState.phoneNumber}
                    onChange={handleChange}
                    fullWidth
                    variant="filled"
                    sx={fieldSx}
                  />
                </Stack>

                <TextField
                  select
                  label="نوع الطلب"
                  name="requestType"
                  value={formState.requestType}
                  onChange={handleChange}
                  variant="filled"
                  fullWidth
                  sx={fieldSx}
                >
                  {requestTypeOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="التفاصيل"
                  name="requestText"
                  value={formState.requestText}
                  onChange={handleChange}
                  multiline
                  minRows={4}
                  variant="filled"
                  fullWidth
                  sx={fieldSx}
                />

                <input
                  type="text"
                  name="website"
                  value={formState.website}
                  onChange={handleChange}
                  autoComplete="off"
                  tabIndex={-1}
                  style={{ display: "none" }}
                />

                <Button
                  component="label"
                  variant="outlined"
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    textTransform: "none",
                    alignSelf: "flex-start",
                  }}
                >
                  اختيار المرفقات
                  <input
                    hidden
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  />
                </Button>

                <Stack spacing={0.75}>
                  {files.length === 0 ? (
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                      لم يتم اختيار أي مرفق بعد.
                    </Typography>
                  ) : (
                    files.map((file) => (
                      <Typography
                        key={`${file.name}-${file.size}`}
                        sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
                      >
                        {file.name}
                      </Typography>
                    ))
                  )}
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "12px",
                      color: "text.secondary",
                      lineHeight: 1.9,
                    }}
                  >
                    برفعك هذا الطلب فأنت ترسل البيانات مباشرة إلى لوحة المبيعات للمراجعة والتنفيذ.
                  </Typography>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      textTransform: "none",
                      borderRadius: 2,
                      px: 3,
                      backgroundColor: "#386e6e",
                      "&:hover": { backgroundColor: "#2e5a5a" },
                    }}
                  >
                    {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
