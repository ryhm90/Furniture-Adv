"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
  InputAdornment, Paper, TableContainer, Toolbar, Typography, Box,
  IconButton, Autocomplete
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import AddIcon from '@mui/icons-material/Add'; 
import EmptyTableRow from "@/app/components/EmptyTableRow";
import useSubmissionState from "@/app/components/useSubmissionState";

type Room = {
  id: number;
  RoomName: string;
  RoomCounts: number;
  Tier: number;
  priceSource?: string;
  flagf?: string;
};

type Affiliate = {
  Id: number;
  Clname: string;
  affiliate: string;
  username?: string;
  TiD?: string;       // مهم: سنستخدمه في استعلام /rooms-ws
  totalMPU?: number;
};

type Line = {
  lineId: string;
  roomId: number;
  RoomName: string;
  Tier: number;
  priceSource?: string;
  RoomCounts: number;
  flagf?: string;
  count: number;

  affiliateID?: number;
  affiliateName?: string;

  lineProvin: string;
  lineAddress: string;
  lineDriver: string;
  lineDate: string;
  lineSum: number;
  sumEdited: boolean;
};

type Props = {
  open: boolean;
  handleClose: () => void;
};

const WSFormMulti: React.FC<Props> = ({ open, handleClose }) => {
  const { data: session } = useSession();

  // المواد
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoomTable, setShowRoomTable] = useState(true);
  const [hasSearchedRooms, setHasSearchedRooms] = useState(false);

  // الزبائن (من /api/affiliate) + زبون افتراضي للاستعلام عن TiD
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [defaultAffiliate, setDefaultAffiliate] = useState<Affiliate | null>(null);

  // السطور
  const [lines, setLines] = useState<Line[]>([]);
  const [isSubmitting, runWithSubmission] = useSubmissionState();
  const [globalLineDate, setGlobalLineDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );

  // أدوات الأرقام
  const formatNum = (n: number) => (isNaN(n) ? "" : n.toLocaleString("en-US"));
  const getPriceSourceLabel = (source?: string) =>
    source === "custom" ? "سعر خاص" : "سعر الفئة";
  const parseNum = (s: string) => {
    const v = s.replace(/,/g, "");
    const n = parseFloat(v);
    return isNaN(n) ? NaN : n;
  };

  const today = new Date().toLocaleDateString("en-CA");
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const makeInvoNum = () => {
    const now = new Date();
    return (
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0") +
      String(now.getMilliseconds()).padStart(3, "0")
    );
  };

  // جلب الزبائن (ومنها TiD)
  const fetchAffiliates = async () => {
    try {
      const res = await axios.get<Affiliate[]>("/api/affiliate");
      setAffiliates(res.data as Affiliate[]);
    } catch {
      toast.error("فشل تحميل قائمة الزبائن");
    }
  };

  useEffect(() => {
    if (open) {
      fetchAffiliates();
    }
  }, [open]);

  // جلب المواد — يعتمد الآن على TiD القادم من الزبون الافتراضي
  const fetchRooms = async () => {
    try {
      const tid = defaultAffiliate?.TiD;
      const affiliateId = defaultAffiliate?.Id;
      if (!tid) {
        toast.warn("يرجى اختيار زبون افتراضي لاستخدام فئته (TiD) في البحث.");
        return;
      }
      const url = `/api/rooms-ws/${encodeURIComponent(searchQuery)}/${encodeURIComponent(tid)}?affiliateId=${encodeURIComponent(String(affiliateId ?? ""))}`;
      const res = await axios.get<Room[]>(url);
      setRooms(res.data);
    } catch {
      toast.error("فشل تحميل المواد");
    }
  };

  // عند تغيير الزبون الافتراضي: افرغ جدول نتائج البحث وحقل البحث فقط (لا نمسّ السطور)
  const handleDefaultAffiliateChange = (_: any, v: Affiliate | null) => {
    setDefaultAffiliate(v);
    setRooms([]);           // تفريغ جدول المواد
    setSearchQuery("");     // تفريغ نص البحث
    setShowRoomTable(true); // إبقاء الجدول جاهزًا
  };

  // إضافة سطر دائمًا حتى لو تكررت نفس الغرفة
  const applyAffiliatePriceToLine = async (lineId: string, roomId: number, affiliateId?: number) => {
    if (!affiliateId) {
      return;
    }

    try {
      const response = await axios.get("/api/rooms-ws/price", {
        params: { roomId, affiliateId },
      });

      const unitPrice = Number(response.data.unitPrice ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return;
      }

      setLines((prev) =>
        prev.map((line) =>
          line.lineId === lineId
            ? {
                ...line,
                Tier: unitPrice,
                priceSource: response.data.priceSource,
                lineSum: line.sumEdited ? line.lineSum : unitPrice * line.count,
              }
            : line,
        ),
      );
    } catch (error) {
      console.error("Error applying affiliate price:", error);
      toast.error("تعذر تحديث سعر المادة لهذا الزبون.");
    }
  };

  const handleSelectRoom = (room: Room) => {
    const defaultCount = 1;
    const defaultSum = room.Tier * defaultCount;

    setLines(prev => [
      ...prev,
      {
        lineId: uniqueId(),
        roomId: room.id,
        RoomName: room.RoomName,
        Tier: room.Tier,
        priceSource: room.priceSource ?? "tier",
        RoomCounts: room.RoomCounts,
        flagf: room.flagf,
        count: defaultCount,

        // لو موجود زبون افتراضي، نملأه للسطر
        affiliateID: defaultAffiliate?.Id,
        affiliateName: defaultAffiliate?.affiliate,

        lineProvin: "",
        lineAddress: "",
        lineDriver: "",
        lineDate: globalLineDate || today,
        lineSum: defaultSum,
        sumEdited: false,
      },
    ]);
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.lineId !== lineId));
  };

  const setLine = <K extends keyof Line>(lineId: string, key: K, value: Line[K]) => {
    setLines(prev => prev.map(l => (l.lineId === lineId ? { ...l, [key]: value } : l)));
  };

  const handleCountChange = (line: Line, val: string) => {
    const n = Math.max(1, parseInt(val || "1", 10));
    if (!line.sumEdited) {
      setLines(prev =>
        prev.map(l => (l.lineId === line.lineId ? { ...l, count: n, lineSum: l.Tier * n } : l))
      );
    } else {
      setLine(line.lineId, "count", n);
    }
  };

  const totalSum = useMemo(
    () => lines.reduce((acc, l) => acc + (isNaN(l.lineSum) ? 0 : l.lineSum), 0),
    [lines]
  );

  const handleApplyGlobalDate = () => {
    if (!globalLineDate) {
      toast.warn("يرجى تحديد التاريخ العام أولاً.");
      return;
    }

    if (lines.length === 0) {
      toast.warn("لا توجد مواد مضافة لتطبيق التاريخ عليها.");
      return;
    }

    setLines((prev) => prev.map((line) => ({ ...line, lineDate: globalLineDate })));
    toast.success("تم تعميم التاريخ على جميع المواد المضافة.");
  };

  const resetAll = () => {
    setRooms([]);
    setSearchQuery("");
    setShowRoomTable(true);
    setHasSearchedRooms(false);
    setLines([]);
    setDefaultAffiliate(null);
    setGlobalLineDate(today);
  };

  const closeDialog = () => {
    resetAll();
    handleClose();
  };

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
    if (lines.length === 0) {
      toast.warn("يرجى إضافة مادة واحدة على الأقل.");
      return;
    }

    for (const l of lines) {
      if (!l.affiliateID || !l.affiliateName) return toast.warn(`اختر الزبون للسطر: ${l.RoomName}`);
      if (!l.lineProvin) return toast.warn(`اختر المحافظة للسطر: ${l.RoomName}`);
      if (!l.lineDriver) return toast.warn(`أدخل اسم السائق للسطر: ${l.RoomName}`);
      if (!l.lineDate) return toast.warn(`حدد تاريخ التجهيز للسطر: ${l.RoomName}`);
      if (isNaN(l.lineSum) || l.lineSum <= 0) return toast.warn(`أدخل مبلغًا صحيحًا للسطر: ${l.RoomName}`);
    }

    try {
      for (const l of lines) {
        const inv = makeInvoNum();

        // 1) وصل مستقل في sellmoney
        await axios.post("/api/sellmoney-ws", {
          InvoNum: inv,
          MoneyPaid: "0",
          Sum: l.lineSum,
          ClName: l.affiliateName,
          Provide: l.lineDate,
          Provin: l.lineProvin,
          Provin2: l.lineAddress || "",
          Id: l.affiliateID,
          Driver: l.lineDriver,
        });

        // 2) صف مستقل في selltable
        await axios.post("/api/selltable-ws", {
          RoomNum: l.roomId,
          InvoNum: inv,
          State: "Active",
          countt: l.count,
          RoomCost: l.Tier, // backend سيحسب الإجمالي: RoomCost * countt
          flagf: l.flagf || "",
          sellor: session?.user?.name || "",
        });
      }

      toast.success("تم إنشاء وصولات متعددة لعدة زبائن بنجاح.");
      closeDialog();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الإدخال");
    }
    });
  };

  // (نفس التنسيقات التي لديك في الكود)
  const tablePaperSx = {
    mt: 2, mb: 2, borderRadius: 2, boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  } as const;

  const tableContainerSx = {
    maxHeight: 460,
    "& .MuiTable-root": { minWidth: 980 },
    "& .MuiTableCell-head": { bgcolor: "#111827", color: "#fff", fontWeight: 600, fontSize: 13 },
    "& .MuiTableCell-body": { fontSize: 13 },
    "& .MuiTableRow-root:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" },
    "& .MuiTableRow-hover:hover": { bgcolor: "rgba(56,110,110,0.08)" },
  } as const;

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontFamily: "Alexandria, sans-serif", direction: "rtl" }}>
        إدخال وصولات شراء متعددة لعدة زبائن
      </DialogTitle>

      <DialogContent>
        {/* اختيار زبون افتراضي (TiD منه) + البحث */}
        <Paper sx={{ ...tablePaperSx, p: 1.5 }}>
          <Toolbar sx={{ p: 0, minHeight: 48, gap: 1, justifyContent: "space-between" }}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Autocomplete
                options={affiliates}
                getOptionLabel={(o) => o.affiliate || ""}
                value={defaultAffiliate}
                onChange={handleDefaultAffiliateChange}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="زبون افتراضي (اختياري)" />
                )}
                sx={{ width: 300 }}
              />

              <TextField
                size="small"
                label="بحث عن مادة"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ width: 360 }}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => {
                  setHasSearchedRooms(true);
                  fetchRooms();
                }}          // يستخدم TiD من defaultAffiliate
                sx={{ background: "#386e6e", "&:hover": { background: "#2e5757" } }}
              >
                بحث
              </Button>
              <IconButton onClick={() => { setSearchQuery(""); setRooms([]); }}>
                <RefreshIcon />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary">
              المواد: {rooms.length} | السطور المختارة: {lines.length}
            </Typography>
          </Toolbar>
        </Paper>

        {/* جدول المواد */}
        {showRoomTable && hasSearchedRooms && (
          <Paper sx={tablePaperSx}>
            <TableContainer sx={tableContainerSx}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} >المادة</TableCell>
                    <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المتاح</TableCell>
                    <TableCell align="center" style={{  backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>سعر القطعة</TableCell>
                    <TableCell align="center" style={{  backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>مصدر السعر</TableCell>
                    <TableCell align="center" style={{  backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>إضافة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rooms.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{r.RoomName}</TableCell>
                      <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{r.RoomCounts}</TableCell>
                      <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{formatNum(r.Tier)}</TableCell>
                      <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{getPriceSourceLabel(r.priceSource)}</TableCell>
                      <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                        <Button size="small" onClick={() => handleSelectRoom(r)}>
                            <AddIcon style={{ cursor: 'pointer', color: 'green', marginRight: '8px' }}/>
                          </Button>

                      </TableCell>
                    </TableRow>
                  ))}
                  {rooms.length === 0 ? <EmptyTableRow colSpan={5} /> : null}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="flex-end" p={1}>
              <Button size="small" onClick={() => setShowRoomTable(false)} sx={{ textDecoration: "underline" }}>
                إخفاء الجدول
              </Button>
            </Box>
          </Paper>
        )}

        {/* جدول السطور */}
        <Paper sx={tablePaperSx}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            flexDirection={{ xs: "column", md: "row" }}
            gap={1.5}
            px={2}
            pt={2}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  direction: "rtl",
                }}
              >
                إعدادات عامة للسطور
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "text.secondary",
                  direction: "rtl",
                  mt: 0.5,
                }}
              >
                أي مادة جديدة ستأخذ هذا التاريخ تلقائياً، ويمكنك تعميمه أيضاً على كل المواد
                الحالية.
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <TextField
                size="small"
                type="date"
                label="تاريخ عام للمواد"
                value={globalLineDate}
                onChange={(e) => setGlobalLineDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 190 }}
              />
              <Button
                variant="outlined"
                onClick={handleApplyGlobalDate}
                disabled={!globalLineDate || lines.length === 0}
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "13px",
                  direction: "rtl",
                  borderRadius: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                تعميم التاريخ على كل المواد
              </Button>
            </Box>
          </Box>

          <TableContainer sx={tableContainerSx}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>#</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المادة</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={110}>العدد</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={120}>سعر القطعة</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={120}>مصدر السعر</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={210}>الزبون</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={140}>المبلغ (للوصل)</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={150}>المحافظة</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={220}>العنوان</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={160}>السائق</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={160}>تاريخ التجهيز</TableCell>
                  <TableCell align="center" style={{ backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={80}>حذف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={l.lineId} hover>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{idx + 1}</TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{l.RoomName}</TableCell>

                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        type="number"
                        value={l.count}
                        onChange={(e) => handleCountChange(l, e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>

                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{formatNum(l.Tier)}</TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{getPriceSourceLabel(l.priceSource)}</TableCell>

                    {/* اختيار الزبون للسطر (لا يغير TiD؛ TiD للبحث يأتي من الزبون الافتراضي) */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <Autocomplete
                        options={affiliates}
                        getOptionLabel={(o) => o.affiliate || ""}
                        value={
                          l.affiliateID
                            ? affiliates.find((a) => a.Id === l.affiliateID) || null
                            : null
                        }
                        onChange={async (_, v) => {
                          setLine(l.lineId, "affiliateID", v?.Id);
                          setLine(l.lineId, "affiliateName", v?.affiliate);
                          if (v?.Id) {
                            await applyAffiliatePriceToLine(l.lineId, l.roomId, v.Id);
                          }
                        }}
                        renderInput={(params) => <TextField {...params} size="small" label="الزبون" />}
                        sx={{ width: 200 }}
                      />
                    </TableCell>

                    {/* مبلغ السطر */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        value={formatNum(l.lineSum)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = parseNum(raw);
                          if (raw === "") {
                            setLine(l.lineId, "lineSum", NaN);
                            setLine(l.lineId, "sumEdited", true);
                            return;
                          }
                          if (isNaN(parsed)) return;
                          setLine(l.lineId, "lineSum", parsed);
                          setLine(l.lineId, "sumEdited", true);
                        }}
                        sx={{ width: 140 }}
                        inputProps={{ inputMode: "numeric" }}
                      />
                    </TableCell>

                    {/* المحافظة */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        select
                        value={l.lineProvin}
                        onChange={(e) => setLine(l.lineId, "lineProvin", e.target.value)}
                        sx={{ width: 150 }}
                      >
                        {[
                          "بغداد","أربيل","الأنبار","البصرة","بابل","نينوى","صلاح الدين","السليمانية","دهوك",
                          "ديالى","واسط","ميسان","ذي قار","المثنى","كربلاء","النجف","الديوانية","كركوك","حلبجة"
                        ].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                      </TextField>
                    </TableCell>

                    {/* العنوان */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        value={l.lineAddress}
                        onChange={(e) => setLine(l.lineId, "lineAddress", e.target.value)}
                        sx={{ width: 220 }}
                      />
                    </TableCell>

                    {/* السائق */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        value={l.lineDriver}
                        onChange={(e) => setLine(l.lineId, "lineDriver", e.target.value)}
                        sx={{ width: 160 }}
                      />
                    </TableCell>

                    {/* التاريخ */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        size="small"
                        type="date"
                        value={l.lineDate}
                        onChange={(e) => setLine(l.lineId, "lineDate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160 }}
                      />
                    </TableCell>

                    {/* حذف */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <IconButton color="error" onClick={() => handleRemoveLine(l.lineId)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      لا توجد مواد مُضافة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
            <Typography variant="body2" color="text.secondary">
              المجموع الاستعراضي: <b>{formatNum(totalSum || 0)}</b> IQD
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={() => setLines([])}
              sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl' }}
            >
              مسح السطور
            </Button>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl' }} onClick={closeDialog} color="secondary">
          الغاء
        </Button>
        <Button sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl' }} onClick={handleSubmit} color="primary" disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "ادخال"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WSFormMulti;
