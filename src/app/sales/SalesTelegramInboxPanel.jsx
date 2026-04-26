"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";

const typeLabels = {
  paper_receipt: "وصل ورقي",
  online_receipt: "وصل أونلاين",
  schedule_change: "تغيير موعد تجهيز",
  other: "طلب عام",
};

const filterOptions = [
  { value: "pending", label: "غير المنفذة" },
  { value: "executed", label: "المنفذة" },
  { value: "all", label: "الكل" },
];

const cardSx = {
  borderRadius: 3,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const formatDateTime = (value) => {
  if (!value) {
    return "غير متوفر";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

function CounterChip({ label, value, isActive, onClick }) {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "contained" : "outlined"}
      sx={{
        borderRadius: 999,
        fontFamily: "Alexandria, sans-serif",
        fontSize: "12px",
        textTransform: "none",
        px: 1.5,
        py: 0.8,
        color: isActive ? "white" : "#164444",
        borderColor: "rgba(22, 68, 68, 0.24)",
        backgroundColor: isActive ? "#164444" : "transparent",
        "&:hover": {
          borderColor: "#164444",
          backgroundColor: isActive ? "#123737" : "rgba(22, 68, 68, 0.05)",
        },
      }}
    >
      {label}
      <Box component="span" sx={{ mr: 0.75 }}>
        {value}
      </Box>
    </Button>
  );
}

export default function SalesTelegramInboxPanel({
  requests,
  summary,
  statusFilter,
  isLoading,
  selectedId,
  onStatusFilterChange,
  onRefresh,
  onSelectRequest,
  onToggleStatus,
}) {
  const [hiddenImageIds, setHiddenImageIds] = useState([]);
  const [pendingActionId, setPendingActionId] = useState(null);

  const summaryMap = useMemo(
    () => ({
      pending: summary?.pending ?? 0,
      executed: summary?.executed ?? 0,
      all: summary?.all ?? 0,
    }),
    [summary],
  );

  const isImagesHidden = (requestId) => hiddenImageIds.includes(requestId);

  const handleToggleImages = (requestId) => {
    setHiddenImageIds((previousState) =>
      previousState.includes(requestId)
        ? previousState.filter((item) => item !== requestId)
        : [...previousState, requestId],
    );
  };

  const handleToggleStatus = async (request) => {
    try {
      setPendingActionId(request.id);
      await onToggleStatus(request);
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <Stack spacing={2.25}>
      <Card sx={cardSx}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 600,
                  fontSize: "18px",
                  color: "#102a2a",
                }}
              >
                وارد التليغرام
              </Typography>
              <Typography
                sx={{
                  mt: 0.75,
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "12px",
                  lineHeight: 1.9,
                  color: "rgba(16, 42, 42, 0.72)",
                }}
              >
                صور الوصولات الورقية أو الأونلاين وطلبات تغيير مواعيد التجهيز، مع حالة التنفيذ
                ووقت الإنجاز.
              </Typography>
            </Box>

            <Tooltip title="تحديث">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={isLoading}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    backgroundColor: "white",
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {filterOptions.map((option) => (
              <CounterChip
                key={option.value}
                label={option.label}
                value={summaryMap[option.value]}
                isActive={statusFilter === option.value}
                onClick={() => onStatusFilterChange(option.value)}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card sx={cardSx}>
          <CardContent sx={{ py: 6 }}>
            <Stack alignItems="center" spacing={1.5}>
              <CircularProgress size={26} />
              <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                جارٍ تحميل الطلبات...
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && requests.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            fontFamily: "Alexandria, sans-serif",
            "& .MuiAlert-message": {
              fontFamily: "Alexandria, sans-serif",
            },
          }}
        >
          لا توجد طلبات مطابقة لهذا الفلتر حالياً.
        </Alert>
      ) : null}

      {!isLoading
        ? requests.map((request) => {
            const selected = selectedId === request.id;
            const requestTypeLabel = typeLabels[request.requestType] ?? typeLabels.other;
            const attachmentsCount = request.attachmentPaths.length;
            const canHideImages = attachmentsCount > 0;
            const actionLabel = request.isExecuted ? "إرجاع إلى غير منفذ" : "تم التنفيذ";
            const actionIcon = request.isExecuted ? <RestartAltIcon /> : <CheckCircleOutlineIcon />;

            return (
              <Card
                key={request.id}
                sx={{
                  ...cardSx,
                  borderColor: selected ? "rgba(22, 68, 68, 0.45)" : "rgba(15, 23, 42, 0.08)",
                  backgroundColor: selected ? "rgba(22, 68, 68, 0.03)" : "white",
                }}
              >
                <CardContent sx={{ p: 2.25 }}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1.25}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={requestTypeLabel}
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            backgroundColor: "rgba(56, 110, 110, 0.12)",
                            color: "#164444",
                          }}
                        />
                        <Chip
                          label={request.isExecuted ? "منفذ" : "غير منفذ"}
                          color={request.isExecuted ? "success" : "warning"}
                          sx={{ fontFamily: "Alexandria, sans-serif" }}
                        />
                        {request.linkedInvoiceNumber ? (
                          <Chip
                            label={`الوصل ${request.linkedInvoiceNumber}`}
                            variant="outlined"
                            sx={{ fontFamily: "Alexandria, sans-serif" }}
                          />
                        ) : null}
                      </Stack>

                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "12px",
                          color: "text.secondary",
                        }}
                      >
                        {formatDateTime(request.createdAt)}
                      </Typography>
                    </Stack>

                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 600,
                          fontSize: "15px",
                        }}
                      >
                        {request.senderName || "مرسل غير معروف"}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "12px",
                          color: "text.secondary",
                        }}
                      >
                        {request.senderUsername ? `@${request.senderUsername}` : "بدون اسم مستخدم"}
                      </Typography>
                    </Box>

                    {request.requestText ? (
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          lineHeight: 2,
                          color: "#102a2a",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {request.requestText}
                      </Typography>
                    ) : null}

                    {request.executedAt ? (
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "12px",
                          color: "text.secondary",
                        }}
                      >
                        نُفذ في: {formatDateTime(request.executedAt)}
                        {request.executedBy ? ` بواسطة ${request.executedBy}` : ""}
                      </Typography>
                    ) : null}

                    {attachmentsCount > 0 ? (
                      <>
                        <Divider />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Typography
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "12px",
                              color: "text.secondary",
                            }}
                          >
                            عدد المرفقات: {attachmentsCount}
                          </Typography>

                          {canHideImages ? (
                            <Button
                              size="small"
                              startIcon={
                                isImagesHidden(request.id) ? (
                                  <VisibilityIcon fontSize="small" />
                                ) : (
                                  <VisibilityOffIcon fontSize="small" />
                                )
                              }
                              onClick={() => handleToggleImages(request.id)}
                              sx={{
                                fontFamily: "Alexandria, sans-serif",
                                textTransform: "none",
                                fontSize: "12px",
                              }}
                            >
                              {isImagesHidden(request.id) ? "إظهار الصور" : "إخفاء الصور"}
                            </Button>
                          ) : null}
                        </Stack>

                        {!isImagesHidden(request.id) ? (
                          <Stack spacing={1.25}>
                            {request.attachmentPaths.map((attachmentPath) => (
                              <Box
                                key={attachmentPath}
                                sx={{
                                  borderRadius: 2,
                                  overflow: "hidden",
                                  border: "1px solid rgba(15, 23, 42, 0.08)",
                                  backgroundColor: "rgba(15, 23, 42, 0.02)",
                                }}
                              >
                                {attachmentPath.toLowerCase().endsWith(".pdf") ? (
                                  <Button
                                    href={attachmentPath}
                                    target="_blank"
                                    rel="noreferrer"
                                    fullWidth
                                    sx={{
                                      py: 2,
                                      fontFamily: "Alexandria, sans-serif",
                                      textTransform: "none",
                                    }}
                                  >
                                    فتح ملف PDF
                                  </Button>
                                ) : (
                                  <Box
                                    component="img"
                                    src={attachmentPath}
                                    alt="مرفق تليغرام"
                                    sx={{
                                      display: "block",
                                      width: "100%",
                                      maxHeight: 230,
                                      objectFit: "cover",
                                    }}
                                  />
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : null}
                      </>
                    ) : null}

                    <Divider />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Button
                        variant={selected ? "contained" : "outlined"}
                        onClick={() => onSelectRequest(request)}
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          textTransform: "none",
                          borderRadius: 2,
                          backgroundColor: selected ? "#164444" : "transparent",
                          "&:hover": {
                            backgroundColor: selected ? "#123737" : "rgba(22, 68, 68, 0.05)",
                          },
                        }}
                      >
                        {selected ? "الطلب المحدد" : "تحديد هذا الطلب"}
                      </Button>

                      <Button
                        variant="outlined"
                        color={request.isExecuted ? "warning" : "success"}
                        onClick={() => handleToggleStatus(request)}
                        startIcon={actionIcon}
                        disabled={pendingActionId === request.id}
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          textTransform: "none",
                          borderRadius: 2,
                        }}
                      >
                        {pendingActionId === request.id ? "جارٍ التحديث..." : actionLabel}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })
        : null}
    </Stack>
  );
}
