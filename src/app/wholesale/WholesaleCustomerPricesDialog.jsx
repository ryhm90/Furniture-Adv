"use client";

import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SellIcon from "@mui/icons-material/Sell";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import EmptyTableRow from "@/app/components/EmptyTableRow";

const textFieldSx = {
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
};

const headerCellSx = {
  backgroundColor: "#2c2c4d",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export default function WholesaleCustomerPricesDialog({
  open,
  customer,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [draftPrices, setDraftPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingRoomId, setSavingRoomId] = useState(null);
  const [removingRoomId, setRemovingRoomId] = useState(null);

  const affiliateId = customer?.Id;

  const syncDrafts = (items) => {
    setDraftPrices((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const roomKey = String(item.roomId);
        if (next[roomKey] === undefined) {
          next[roomKey] =
            item.customPrice == null ? "" : Number(item.customPrice).toLocaleString("en-US");
        }
      });
      return next;
    });
  };

  const loadCurrentPrices = useCallback(async () => {
    if (!affiliateId) {
      return;
    }

    try {
      const response = await axios.get(`/api/affiliate/prices/${affiliateId}`);
      setCurrentPrices(response.data.items || []);
      syncDrafts(response.data.items || []);
    } catch (error) {
      console.error("Error loading current customer prices:", error);
      toast.error("تعذر جلب الأسعار الخاصة الحالية.");
    }
  }, [affiliateId]);

  useEffect(() => {
    if (!open || !affiliateId) {
      return;
    }

    setSearchQuery("");
    setSearchResults([]);
    setDraftPrices({});
    loadCurrentPrices();
  }, [open, affiliateId, loadCurrentPrices]);

  const handleSearch = async () => {
    if (!affiliateId || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(`/api/affiliate/prices/${affiliateId}`, {
        params: { query: searchQuery.trim() },
      });
      const items = response.data.items || [];
      setSearchResults(items);
      syncDrafts(items);
    } catch (error) {
      console.error("Error searching wholesale items:", error);
      toast.error("تعذر البحث عن المواد.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrice = async (roomId) => {
    const draftValue = draftPrices[String(roomId)] ?? "";
    const parsedPrice = Number.parseFloat(String(draftValue).replace(/,/g, ""));

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.warning("يرجى إدخال سعر خاص صحيح.");
      return;
    }

    setSavingRoomId(roomId);

    try {
      await axios.put(`/api/affiliate/prices/${affiliateId}`, {
        roomId,
        price: parsedPrice,
      });
      toast.success("تم حفظ السعر الخاص.");
      await loadCurrentPrices();
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (error) {
      console.error("Error saving custom price:", error);
      toast.error("تعذر حفظ السعر الخاص.");
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleRemovePrice = async (roomId) => {
    setRemovingRoomId(roomId);

    try {
      await axios.delete(`/api/affiliate/prices/${affiliateId}`, {
        data: { roomId },
      });
      setDraftPrices((prev) => ({ ...prev, [String(roomId)]: "" }));
      toast.success("تم حذف السعر الخاص وسيُستخدم سعر الفئة.");
      await loadCurrentPrices();
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (error) {
      console.error("Error deleting custom price:", error);
      toast.error("تعذر حذف السعر الخاص.");
    } finally {
      setRemovingRoomId(null);
    }
  };

  const renderTable = (items, allowSave = false) => (
    <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 3 }}>
      <TableContainer sx={{ maxHeight: 320 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellSx}>
                المادة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                سعر الفئة
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                السعر الخاص
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                السعر الفعلي
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                المصدر
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow hover key={item.roomId}>
                <TableCell align="center" sx={bodyCellSx}>
                  {item.RoomName}
                </TableCell>
                <TableCell align="center" sx={bodyCellSx}>
                  {formatCurrency(item.tierPrice)}
                </TableCell>
                <TableCell align="center" sx={bodyCellSx}>
                  <TextField
                    size="small"
                    value={draftPrices[String(item.roomId)] ?? ""}
                    onChange={(event) =>
                      setDraftPrices((prev) => ({
                        ...prev,
                        [String(item.roomId)]: event.target.value
                          .replace(/,/g, "")
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                      }))
                    }
                    sx={{ ...textFieldSx, width: 140 }}
                    inputProps={{ inputMode: "numeric" }}
                  />
                </TableCell>
                <TableCell align="center" sx={bodyCellSx}>
                  {formatCurrency(item.customPrice ?? item.effectivePrice)}
                </TableCell>
                <TableCell align="center" sx={bodyCellSx}>
                  {item.priceSource === "custom" ? "سعر خاص" : "سعر الفئة"}
                </TableCell>
                <TableCell align="center" sx={bodyCellSx}>
                  {allowSave ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSavePrice(item.roomId)}
                      disabled={savingRoomId === item.roomId}
                      sx={{
                        mr: 1,
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "12px",
                        backgroundColor: "#386e6e",
                        "&:hover": { backgroundColor: "#2e5a5a" },
                      }}
                    >
                      {savingRoomId === item.roomId ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => handleRemovePrice(item.roomId)}
                    disabled={removingRoomId === item.roomId}
                    sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
                  >
                    {removingRoomId === item.roomId ? "جاري الحذف..." : "إلغاء السعر الخاص"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? <EmptyTableRow colSpan={6} /> : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 500,
          fontSize: "16px",
          direction: "rtl",
        }}
      >
        إدارة الأسعار الخاصة للزبون: {customer?.affiliate || "-"}
      </DialogTitle>

      <DialogContent sx={{ direction: "rtl" }}>
        <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px", mb: 2 }}>
          إذا وُجد سعر خاص للمادة لهذا الزبون فسيُستخدم مباشرة في شاشة الجملة، وإلا فسيعود النظام إلى سعر الفئة `{customer?.TiD || "-"}`
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
          <TextField
            variant="filled"
            label="ابحث عن مادة جملة"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{ ...textFieldSx, minWidth: 280 }}
          />
          <Button
            variant="contained"
            startIcon={<ManageSearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{
              fontFamily: "Alexandria, sans-serif",
              fontSize: "13px",
              backgroundColor: "#386e6e",
              "&:hover": { backgroundColor: "#2e5a5a" },
            }}
          >
            {loading ? "جاري البحث..." : "بحث"}
          </Button>
          <IconButton onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
            <RestartAltIcon />
          </IconButton>
        </Box>

        {searchResults.length > 0 ? (
          <>
            <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "14px", mb: 1.5 }}>
              نتائج البحث
            </Typography>
            {renderTable(searchResults, true)}
            <Divider sx={{ my: 3 }} />
          </>
        ) : null}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <SellIcon fontSize="small" />
          <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "14px" }}>
            الأسعار الخاصة الحالية
          </Typography>
        </Box>
        {renderTable(currentPrices, false)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, direction: "rtl" }}>
        <Button onClick={onClose} color="secondary" sx={{ fontFamily: "Alexandria, sans-serif" }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
