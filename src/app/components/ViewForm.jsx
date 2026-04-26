"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import useSubmissionState from "@/app/components/useSubmissionState";

const FONT_FAMILY = "Alexandria, sans-serif";
const currencyFormatter = new Intl.NumberFormat("ar-IQ");

const provinceOptions = [
  "بغداد",
  "أربيل",
  "الأنبار",
  "البصرة",
  "بابل",
  "نينوى",
  "صلاح الدين",
  "السليمانية",
  "دهوك",
  "ديالى",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "كربلاء",
  "النجف",
  "الديوانية",
  "كركوك",
  "حلبجة",
];

const floorOptions = [
  "حساب معرض",
  "بدون عمال",
  "طابق أرضي",
  "طابق أول",
  "طابق ثاني",
  "طابق ثالث",
  "مجمع سكني",
];

const emptyFormState = {
  ClName: "",
  Provin: "بغداد",
  Provin2: "",
  Cellphone: "",
  Cellphone1: "",
  Details: "",
  Floor: "",
  FloorCost: 0,
  selectedDate: "",
  Sum: 0,
  MoneyPaid: 0,
  MoneyRemain: 0,
};

const fieldSx = {
  "& .MuiInputBase-input": {
    fontFamily: FONT_FAMILY,
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
  "& .MuiInputLabel-root": {
    fontFamily: FONT_FAMILY,
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
};

const tableHeadCellSx = {
  fontFamily: FONT_FAMILY,
  fontWeight: 600,
  fontSize: "12px",
  color: "#ffffff",
  backgroundColor: "#123232",
  borderBottom: "none",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tableCellSx = {
  fontFamily: FONT_FAMILY,
  fontWeight: 400,
  fontSize: "13px",
  textAlign: "center",
  color: "#0f172a",
};

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA");
}

function formatReadableDate(value) {
  if (!value) {
    return "غير متوفر";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "غير متوفر";
  }

  return date.toLocaleString("ar-IQ");
}

function parseNumberValue(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/,/g, "").trim();
    if (!normalizedValue) {
      return Number.NaN;
    }

    return Number.parseFloat(normalizedValue);
  }

  return Number.NaN;
}

function formatMoney(value) {
  const parsedValue = parseNumberValue(value);
  if (!Number.isFinite(parsedValue)) {
    return "0";
  }

  return currencyFormatter.format(parsedValue);
}

function normalizeInvoiceItems(rows = []) {
  const itemMap = new Map();

  rows.forEach((row) => {
    const roomnum = Number(row.roomnum ?? row.RoomNum);
    const countt = Number(row.countt ?? 0);
    const lineRoomCost = Number(row.lineRoomCost ?? row.RoomCost ?? 0);
    const unitRoomCost = countt > 0
      ? Number(((lineRoomCost || 0) / countt).toFixed(2))
      : Number(row.unitRoomCost ?? 0);
    const availableCount = Number(row.RoomCounts ?? 0) + countt;
    const existingValue = itemMap.get(roomnum);

    if (existingValue) {
      existingValue.countt += countt;
      existingValue.lineRoomCost += lineRoomCost;
      existingValue.availableCount += 0;
      existingValue.unitRoomCost =
        existingValue.countt > 0
          ? Number((existingValue.lineRoomCost / existingValue.countt).toFixed(2))
          : existingValue.unitRoomCost;
      return;
    }

    itemMap.set(roomnum, {
      roomnum,
      roomName: row.RoomName,
      countt,
      availableCount,
      currentStockCount: Number(row.RoomCounts ?? 0),
      lineRoomCost,
      unitRoomCost,
      flagf: row.flagf ?? "",
    });
  });

  return Array.from(itemMap.values()).sort((firstItem, secondItem) =>
    firstItem.roomName.localeCompare(secondItem.roomName, "ar"),
  );
}

function ViewForm({ open, onClose, inv }) {
  const { data: session } = useSession();
  const [formState, setFormState] = useState(emptyFormState);
  const [invoiceData, setInvoiceData] = useState(null);
  const [items, setItems] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomQuery, setRoomQuery] = useState("");
  const [roomSearchLoading, setRoomSearchLoading] = useState(false);
  const [roomResults, setRoomResults] = useState([]);
  const [modificationNote, setModificationNote] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const isManager = session?.user?.role === "Manager";
  const invoiceNumber = invoiceData?.InvoNum ?? inv?.InvoNum ?? "";
  const isCanceled = invoiceData?.Por === "ملغى";
  const isWholesale = invoiceData?.wholesale === "Y";
  const canEdit = Boolean(invoiceData) && !isCanceled && !isWholesale;

  const itemsSummary = useMemo(
    () => ({
      totalQuantity: items.reduce((total, item) => total + Number(item.countt ?? 0), 0),
      totalCost: items.reduce((total, item) => total + Number(item.lineRoomCost ?? 0), 0),
    }),
    [items],
  );

  const invoiceRemaining = useMemo(() => {
    const total = parseNumberValue(formState.Sum);
    const paid = parseNumberValue(formState.MoneyPaid);
    if (!Number.isFinite(total) || !Number.isFinite(paid)) {
      return 0;
    }

    return total - paid;
  }, [formState.MoneyPaid, formState.Sum]);

  const currentItemQuantities = useMemo(() => {
    const itemMap = new Map();

    items.forEach((item) => {
      itemMap.set(item.roomnum, Number(item.countt ?? 0));
    });

    return itemMap;
  }, [items]);

  const loadInvoiceData = useCallback(async (invoiceToLoad) => {
    if (!invoiceToLoad) {
      return;
    }

    setLoading(true);

    try {
      const [detailsResponse, itemsResponse] = await Promise.all([
        axios.get("/api/sellmoney/details", {
          params: { invonum: invoiceToLoad },
          headers: { "Cache-Control": "no-store" },
        }),
        axios.get("/api/sellmoney/items", {
          params: { invonum: invoiceToLoad },
          headers: { "Cache-Control": "no-store" },
        }),
      ]);

      const nextInvoiceData = detailsResponse.data;
      const nextItems = normalizeInvoiceItems(itemsResponse.data);

      setInvoiceData(nextInvoiceData);
      setFormState({
        ClName: nextInvoiceData.ClName ?? "",
        Provin: nextInvoiceData.Provin ?? "بغداد",
        Provin2: nextInvoiceData.Provin2 ?? "",
        Cellphone: nextInvoiceData.CellPhone ?? "",
        Cellphone1: nextInvoiceData.CellPhone1 ?? "",
        Details: nextInvoiceData.Details ?? nextInvoiceData.details ?? "",
        Floor: nextInvoiceData.Floor ?? "",
        FloorCost: Number(nextInvoiceData.FloorCost ?? 0),
        selectedDate: formatDateValue(nextInvoiceData.Provide),
        Sum: Number(nextInvoiceData.Sum ?? 0),
        MoneyPaid: Number(nextInvoiceData.MoneyPaid ?? 0),
        MoneyRemain: Number(nextInvoiceData.MoneyRemain ?? 0),
      });
      setItems(nextItems);
      setHistoryRows(Array.isArray(nextInvoiceData.modificationHistory) ? nextInvoiceData.modificationHistory : []);
    } catch (error) {
      console.error("Error loading invoice details:", error);
      toast.error("تعذر تحميل بيانات الوصل.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !inv?.InvoNum) {
      return;
    }

    setRoomQuery("");
    setRoomResults([]);
    setModificationNote("");
    setConfirmationNote("");
    loadInvoiceData(inv.InvoNum);
  }, [inv?.InvoNum, loadInvoiceData, open]);

  useEffect(() => {
    if (!open || !canEdit) {
      setRoomResults([]);
      return undefined;
    }

    const trimmedQuery = roomQuery.trim();
    if (!trimmedQuery) {
      setRoomResults([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setRoomSearchLoading(true);

      try {
        const response = await axios.get(`/api/rooms/${encodeURIComponent(trimmedQuery)}`, {
          headers: { "Cache-Control": "no-store" },
        });

        const nextResults = Array.isArray(response.data) ? response.data : [];
        setRoomResults(
          nextResults.map((item) => {
            const existingQuantity = currentItemQuantities.get(Number(item.id)) ?? 0;
            return {
              roomnum: Number(item.id),
              roomName: item.RoomName,
              availableCount: Number(item.RoomCounts ?? 0) + existingQuantity,
              roomCost: Number(item.RoomCost ?? 0),
            };
          }),
        );
      } catch (error) {
        console.error("Error fetching inventory search results:", error);
        toast.error("تعذر البحث عن المواد داخل المخزن.");
      } finally {
        setRoomSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [canEdit, currentItemQuantities, open, roomQuery]);

  const handleClose = () => {
    setFormState(emptyFormState);
    setInvoiceData(null);
    setItems([]);
    setHistoryRows([]);
    setRoomQuery("");
    setRoomResults([]);
    setModificationNote("");
    setConfirmationNote("");
    onClose();
  };

  const handleFormChange = (fieldName, value) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  };

  const handleCellphoneChange = (fieldName, nextValue) => {
    if (!/^\d{0,11}$/.test(nextValue)) {
      return;
    }

    handleFormChange(fieldName, nextValue);
  };

  const handleAddRoom = (room) => {
    setItems((currentValue) => {
      const existingItem = currentValue.find((item) => item.roomnum === room.roomnum);

      if (existingItem) {
        return currentValue.map((item) => {
          if (item.roomnum !== room.roomnum) {
            return item;
          }

          const nextQuantity = Math.min(item.availableCount, Number(item.countt) + 1);
          return {
            ...item,
            countt: nextQuantity,
            lineRoomCost: Number((nextQuantity * item.unitRoomCost).toFixed(2)),
          };
        });
      }

      return [
        ...currentValue,
        {
          roomnum: room.roomnum,
          roomName: room.roomName,
          countt: 1,
          availableCount: room.availableCount,
          currentStockCount: room.availableCount,
          lineRoomCost: Number(room.roomCost ?? 0),
          unitRoomCost: Number(room.roomCost ?? 0),
          flagf: "",
        },
      ].sort((firstItem, secondItem) => firstItem.roomName.localeCompare(secondItem.roomName, "ar"));
    });
  };

  const handleItemQuantityChange = (roomnum, nextValue) => {
    if (nextValue === "") {
      return;
    }

    const parsedValue = Number.parseInt(nextValue, 10);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setItems((currentValue) =>
      currentValue.map((item) => {
        if (item.roomnum !== roomnum) {
          return item;
        }

        const boundedQuantity = Math.max(1, Math.min(item.availableCount, parsedValue));
        return {
          ...item,
          countt: boundedQuantity,
          lineRoomCost: Number((boundedQuantity * item.unitRoomCost).toFixed(2)),
        };
      }),
    );
  };

  const handleRemoveItem = (roomnum) => {
    setItems((currentValue) => currentValue.filter((item) => item.roomnum !== roomnum));
  };

  const handleSaveChanges = async () => {
    if (!canEdit || !invoiceNumber) {
      return;
    }

    if (items.length === 0) {
      toast.error("يجب أن يحتوي الوصل على مادة واحدة على الأقل.");
      return;
    }

    const totalValue = parseNumberValue(formState.Sum);
    const paidValue = parseNumberValue(formState.MoneyPaid);

    if (!Number.isFinite(totalValue) || totalValue < 0) {
      toast.error("المبلغ الكلي غير صالح.");
      return;
    }

    if (totalValue < paidValue) {
      toast.error("المبلغ الكلي لا يمكن أن يكون أقل من المبلغ المدفوع.");
      return;
    }

    const saveSucceeded = await runWithSubmission(async () => {
      await axios.post("/api/sellmoney/updateview", {
        ID: invoiceNumber,
        ClName: formState.ClName,
        Provin: formState.Provin,
        Provin2: formState.Provin2,
        Cellphone: formState.Cellphone,
        Cellphone1: formState.Cellphone1,
        Details: formState.Details,
        Floor: formState.Floor,
        FloorCost: formState.FloorCost,
        selectedDate: formState.selectedDate,
        Sum: formState.Sum,
        note: modificationNote,
        items: items.map((item) => ({
          roomnum: item.roomnum,
          countt: item.countt,
        })),
      });
    });

    if (!saveSucceeded) {
      return;
    }

    toast.success("تم حفظ تعديل الوصل بنجاح.");
    setModificationNote("");
    setRoomQuery("");
    setRoomResults([]);
    await loadInvoiceData(invoiceNumber);
  };

  const handleConfirmModification = async () => {
    if (!invoiceNumber || !isManager || !invoiceData?.isModified || invoiceData?.modificationConfirmed) {
      return;
    }

    setConfirming(true);

    try {
      await axios.post("/api/sellmoney/confirm-modification", {
        invoNum: invoiceNumber,
        note: confirmationNote,
      });

      toast.success("تم تأكيد تعديل الوصل بنجاح.");
      setConfirmationNote("");
      await loadInvoiceData(invoiceNumber);
    } catch (error) {
      console.error("Error confirming invoice modification:", error);
      toast.error("تعذر تأكيد تعديل الوصل.");
    } finally {
      setConfirming(false);
    }
  };

  const modificationStatusChip = invoiceData?.isModified ? (
    <Chip
      size="small"
      label={invoiceData?.modificationConfirmed ? "معدل ومؤكد" : "معدل بانتظار التأكيد"}
      sx={{
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: invoiceData?.modificationConfirmed ? "#0f5132" : "#92400e",
        backgroundColor: invoiceData?.modificationConfirmed
          ? "rgba(16, 185, 129, 0.14)"
          : "rgba(245, 158, 11, 0.18)",
      }}
    />
  ) : (
    <Chip
      size="small"
      label="غير معدل"
      sx={{
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#1d4ed8",
        backgroundColor: "rgba(59, 130, 246, 0.14)",
      }}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundColor: "#f8fbfb",
          fontFamily: FONT_FAMILY,
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "22px", color: "#123232" }}>
              تعديل تفاصيل وصل البيع
            </Typography>
            <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "13px", color: "text.secondary", mt: 0.75 }}>
              يمكنك تعديل بيانات الزبون والمواد والمبلغ الكلي، مع تسجيل التغييرات وإظهارها في تقرير الوصولات المعدلة.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            {invoiceNumber ? (
              <Chip
                size="small"
                label={`رقم الوصل: ${invoiceNumber}`}
                sx={{ fontFamily: FONT_FAMILY, fontSize: "12px" }}
              />
            ) : null}
            {modificationStatusChip}
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress />
              <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "13px", color: "text.secondary" }}>
                جارٍ تحميل بيانات الوصل...
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {isWholesale ? (
              <Alert severity="info" sx={{ fontFamily: FONT_FAMILY }}>
                هذا الوصل تابع لمبيعات الجملة، لذلك يبقى العرض هنا للقراءة فقط.
              </Alert>
            ) : null}

            {isCanceled ? (
              <Alert severity="warning" sx={{ fontFamily: FONT_FAMILY }}>
                هذا الوصل ملغى، لذلك تم تعطيل التعديل عليه.
              </Alert>
            ) : null}

            {invoiceData?.isModified ? (
              <Alert
                severity={invoiceData?.modificationConfirmed ? "success" : "warning"}
                sx={{
                  "& .MuiAlert-message": {
                    fontFamily: FONT_FAMILY,
                    fontSize: "13px",
                    lineHeight: 1.9,
                  },
                }}
              >
                <strong>ملخص آخر تعديل:</strong> {invoiceData?.modification_summary || "لا يوجد ملخص."}
                <br />
                تم بواسطة: {invoiceData?.modified_by || "غير معروف"} | التاريخ:{" "}
                {formatReadableDate(invoiceData?.modified_at)}
                {invoiceData?.modificationConfirmed ? (
                  <>
                    <br />
                    تم التأكيد بواسطة: {invoiceData?.modification_confirmed_by || "غير معروف"} | التاريخ:{" "}
                    {formatReadableDate(invoiceData?.modification_confirmed_at)}
                  </>
                ) : null}
              </Alert>
            ) : null}

            <Grid container spacing={2.5}>
              <Grid item xs={12} lg={8}>
                <Stack spacing={2.5}>
                  <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <Inventory2OutlinedIcon sx={{ color: "#386e6e" }} />
                        <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px" }}>
                          بيانات الزبون والتجهيز
                        </Typography>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="اسم الزبون"
                            value={formState.ClName}
                            onChange={(event) => handleFormChange("ClName", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            fullWidth
                            label="المحافظة"
                            value={formState.Provin}
                            onChange={(event) => handleFormChange("Provin", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          >
                            {provinceOptions.map((province) => (
                              <MenuItem key={province} value={province} sx={{ fontFamily: FONT_FAMILY, fontSize: "13px" }}>
                                {province}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="العنوان"
                            value={formState.Provin2}
                            onChange={(event) => handleFormChange("Provin2", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="رقم الهاتف"
                            value={formState.Cellphone}
                            onChange={(event) => handleCellphoneChange("Cellphone", event.target.value)}
                            sx={fieldSx}
                            inputProps={{ maxLength: 11 }}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="رقم الهاتف الاحتياطي"
                            value={formState.Cellphone1}
                            onChange={(event) => handleCellphoneChange("Cellphone1", event.target.value)}
                            sx={fieldSx}
                            inputProps={{ maxLength: 11 }}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            type="date"
                            label="تاريخ التجهيز"
                            value={formState.selectedDate}
                            onChange={(event) => handleFormChange("selectedDate", event.target.value)}
                            sx={fieldSx}
                            InputLabelProps={{ shrink: true }}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            fullWidth
                            label="الطابق"
                            value={formState.Floor}
                            onChange={(event) => handleFormChange("Floor", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          >
                            {floorOptions.map((floor) => (
                              <MenuItem key={floor} value={floor} sx={{ fontFamily: FONT_FAMILY, fontSize: "13px" }}>
                                {floor}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="تكلفة التفريغ"
                            type="number"
                            value={formState.FloorCost}
                            onChange={(event) => handleFormChange("FloorCost", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="الملاحظات"
                            value={formState.Details}
                            onChange={(event) => handleFormChange("Details", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        sx={{ mb: 2 }}
                      >
                        <Box>
                          <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px" }}>
                            مواد الوصل الحالية
                          </Typography>
                          <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "12px", color: "text.secondary", mt: 0.5 }}>
                            إضافة المواد أو حذفها أو تعديل عددها سيؤثر مباشرة على تقرير الوصولات المعدلة بعد الحفظ.
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                          <Chip
                            label={`عدد المواد: ${itemsSummary.totalQuantity}`}
                            sx={{ fontFamily: FONT_FAMILY, fontSize: "12px" }}
                          />
                          <Chip
                            label={`الكلفة الداخلية: ${formatMoney(itemsSummary.totalCost)}`}
                            sx={{ fontFamily: FONT_FAMILY, fontSize: "12px" }}
                          />
                        </Stack>
                      </Stack>

                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ borderRadius: 2.5, borderColor: "rgba(15, 23, 42, 0.08)" }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={tableHeadCellSx}>المادة</TableCell>
                              <TableCell sx={tableHeadCellSx}>المتاح بعد الإرجاع</TableCell>
                              <TableCell sx={tableHeadCellSx}>عدد الوصل</TableCell>
                              <TableCell sx={tableHeadCellSx}>كلفة المفرد</TableCell>
                              <TableCell sx={tableHeadCellSx}>الكلفة الإجمالية</TableCell>
                              <TableCell sx={tableHeadCellSx}>إجراء</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.roomnum}>
                                <TableCell sx={tableCellSx}>{item.roomName}</TableCell>
                                <TableCell sx={tableCellSx}>{formatMoney(item.availableCount)}</TableCell>
                                <TableCell sx={tableCellSx}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.countt}
                                    onChange={(event) => handleItemQuantityChange(item.roomnum, event.target.value)}
                                    disabled={!canEdit}
                                    inputProps={{
                                      min: 1,
                                      max: item.availableCount,
                                      style: { textAlign: "center", fontFamily: FONT_FAMILY },
                                    }}
                                    sx={{ width: 120, ...fieldSx }}
                                  />
                                </TableCell>
                                <TableCell sx={tableCellSx}>{formatMoney(item.unitRoomCost)}</TableCell>
                                <TableCell sx={tableCellSx}>{formatMoney(item.lineRoomCost)}</TableCell>
                                <TableCell sx={tableCellSx}>
                                  <Tooltip title="إزالة المادة من الوصل">
                                    <span>
                                      <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleRemoveItem(item.roomnum)}
                                        disabled={!canEdit}
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}

                            {items.length === 0 ? (
                              <EmptyTableRow colSpan={6} message="لا توجد مواد داخل الوصل" />
                            ) : null}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>

                  <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                    <CardContent>
                      <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px", mb: 2 }}>
                        البيانات المالية
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="المبلغ الكلي"
                            type="number"
                            value={formState.Sum}
                            onChange={(event) => handleFormChange("Sum", event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">د.ع</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="المبلغ المدفوع"
                            value={formatMoney(formState.MoneyPaid)}
                            sx={fieldSx}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="المبلغ المتبقي"
                            value={formatMoney(invoiceRemaining)}
                            sx={fieldSx}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="ملاحظة التعديل"
                            placeholder="اكتب سبب التعديل أو ما الذي تغير داخل الوصل."
                            value={modificationNote}
                            onChange={(event) => setModificationNote(event.target.value)}
                            sx={fieldSx}
                            disabled={!canEdit}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

              <Grid item xs={12} lg={4}>
                <Stack spacing={2.5}>
                  <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <SearchIcon sx={{ color: "#386e6e" }} />
                        <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px" }}>
                          إضافة مواد من المخزن
                        </Typography>
                      </Stack>

                      <TextField
                        fullWidth
                        label="ابحث باسم المادة"
                        value={roomQuery}
                        onChange={(event) => setRoomQuery(event.target.value)}
                        sx={fieldSx}
                        disabled={!canEdit}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ mt: 2, borderRadius: 2.5, borderColor: "rgba(15, 23, 42, 0.08)" }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={tableHeadCellSx}>المادة</TableCell>
                              <TableCell sx={tableHeadCellSx}>المتاح</TableCell>
                              <TableCell sx={tableHeadCellSx}>كلفة المفرد</TableCell>
                              <TableCell sx={tableHeadCellSx}>إضافة</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {roomSearchLoading ? (
                              <TableRow>
                                <TableCell colSpan={4} sx={tableCellSx}>
                                  جارٍ البحث...
                                </TableCell>
                              </TableRow>
                            ) : roomResults.length > 0 ? (
                              roomResults.map((room) => (
                                <TableRow key={room.roomnum}>
                                  <TableCell sx={tableCellSx}>{room.roomName}</TableCell>
                                  <TableCell sx={tableCellSx}>{formatMoney(room.availableCount)}</TableCell>
                                  <TableCell sx={tableCellSx}>{formatMoney(room.roomCost)}</TableCell>
                                  <TableCell sx={tableCellSx}>
                                    <Tooltip title="إضافة المادة إلى الوصل">
                                      <span>
                                        <IconButton
                                          color="primary"
                                          size="small"
                                          onClick={() => handleAddRoom(room)}
                                          disabled={!canEdit || room.availableCount <= 0}
                                        >
                                          <AddCircleOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <EmptyTableRow
                                colSpan={4}
                                message={
                                  roomQuery.trim()
                                    ? "لا توجد مواد مطابقة لبحثك"
                                    : "ابدأ بكتابة اسم المادة لعرض نتائج المخزن"
                                }
                              />
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>

                  {isManager && invoiceData?.isModified && !invoiceData?.modificationConfirmed ? (
                    <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <VerifiedOutlinedIcon sx={{ color: "#386e6e" }} />
                          <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px" }}>
                            تأكيد المدير
                          </Typography>
                        </Stack>

                        <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "13px", color: "text.secondary", lineHeight: 1.9 }}>
                          بعد مراجعة بيانات الوصل المعدل يمكنك تأكيده. عند التأكيد يختفي من تقرير الوصولات المعدلة.
                        </Typography>

                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="ملاحظة التأكيد"
                          value={confirmationNote}
                          onChange={(event) => setConfirmationNote(event.target.value)}
                          sx={{ ...fieldSx, mt: 2 }}
                          disabled={confirming}
                        />

                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<VerifiedOutlinedIcon />}
                          onClick={handleConfirmModification}
                          disabled={confirming}
                          sx={{
                            mt: 2,
                            borderRadius: 2.5,
                            fontFamily: FONT_FAMILY,
                            fontWeight: 700,
                            backgroundColor: "#386e6e",
                            "&:hover": { backgroundColor: "#2e5a5a" },
                          }}
                        >
                          {confirming ? "جارٍ التأكيد..." : "تأكيد مراجعة الوصل"}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card sx={{ borderRadius: 3, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <HistoryOutlinedIcon sx={{ color: "#386e6e" }} />
                        <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px" }}>
                          سجل التعديلات
                        </Typography>
                      </Stack>

                      <Stack spacing={1.5}>
                        {historyRows.length > 0 ? (
                          historyRows.map((historyRow) => (
                            <Paper
                              key={historyRow.id}
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderRadius: 2.5,
                                borderColor: "rgba(15, 23, 42, 0.08)",
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <Stack spacing={1}>
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  justifyContent="space-between"
                                  spacing={1}
                                  alignItems={{ xs: "flex-start", sm: "center" }}
                                >
                                  <Chip
                                    size="small"
                                    label={historyRow.action_type === "confirmed" ? "تأكيد" : "تعديل"}
                                    sx={{
                                      fontFamily: FONT_FAMILY,
                                      fontSize: "11px",
                                      backgroundColor:
                                        historyRow.action_type === "confirmed"
                                          ? "rgba(16, 185, 129, 0.14)"
                                          : "rgba(59, 130, 246, 0.14)",
                                      color:
                                        historyRow.action_type === "confirmed"
                                          ? "#0f5132"
                                          : "#1d4ed8",
                                    }}
                                  />
                                  <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "12px", color: "text.secondary" }}>
                                    {formatReadableDate(historyRow.created_at)}
                                  </Typography>
                                </Stack>

                                <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "13px", color: "#0f172a", lineHeight: 1.8 }}>
                                  {historyRow.summary || "لا يوجد وصف لهذا التعديل."}
                                </Typography>
                                <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "12px", color: "text.secondary" }}>
                                  بواسطة: {historyRow.actor_name || "غير معروف"}
                                </Typography>
                              </Stack>
                            </Paper>
                          ))
                        ) : (
                          <Alert severity="info" sx={{ fontFamily: FONT_FAMILY }}>
                            لا يوجد سجل تعديلات على هذا الوصل حتى الآن.
                          </Alert>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button
          onClick={handleClose}
          variant="text"
          sx={{ fontFamily: FONT_FAMILY, fontWeight: 700 }}
        >
          إغلاق
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          onClick={handleSaveChanges}
          disabled={!canEdit || isSubmitting || loading}
          sx={{
            borderRadius: 2.5,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            backgroundColor: "#386e6e",
            "&:hover": { backgroundColor: "#2e5a5a" },
          }}
        >
          {isSubmitting ? "جارٍ حفظ التعديل..." : "حفظ التعديل"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ViewForm;
