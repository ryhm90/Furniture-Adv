
"use client";
import React, { useMemo, useState } from "react";
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, MenuItem, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
  InputAdornment, Grid, Paper, TableContainer
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
  Tier: number;       // سعر القطعة
  TierPrice?: number;
  CustomPrice?: number | null;
  priceSource?: string;
  flagf?: string;
};

type Line = {
  lineId: string;       // مفتاح فريد للسطر
  roomId: number;
  RoomName: string;
  Tier: number;
  priceSource?: string;
  RoomCounts: number;
  flagf?: string;
  count: number;

  // حقول الوصل المنفصلة لكل سطر:
  lineProvin: string;
  lineAddress: string;
  lineDriver: string;
  lineDate: string;   // Provide
  lineSum: number;    // مبلغ الوصل لهذا السطر (رقم)
  sumEdited: boolean; // لو قام المستخدم بتعديل المبلغ يدوياً
};

type Props = {
  open: boolean;
  handleClose: () => void;
  affiliate: string;  // اسم الزبون/الوكيل للعرض
  Ida: number;        // affiliateID
  TiD: string;        // فئة البحث
};

const WSForm: React.FC<Props> = ({ open, handleClose, affiliate, Ida, TiD }) => {
  const { data: session } = useSession();

  // قائمة المواد للبحث
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoomTable, setShowRoomTable] = useState(true);
  const [hasSearchedRooms, setHasSearchedRooms] = useState(false);

  // سطور مختارة — كل سطر = وصل منفصل
  const [lines, setLines] = useState<Line[]>([]);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  // أدوات أرقام
  const formatNum = (n: number) => (isNaN(n) ? "" : n.toLocaleString("en-US"));
  const getPriceSourceLabel = (source?: string) =>
    source === "custom" ? "سعر خاص" : "سعر الفئة";
  const parseNum = (s: string) => {
    const v = s.replace(/,/g, "");
    const n = parseFloat(v);
    return isNaN(n) ? NaN : n;
  };

  const today = new Date().toLocaleDateString("en-CA");

  const makeInvoNum = (suffix = "") => {
    const now = new Date();
    return (
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0") +
      String(now.getMilliseconds()).padStart(3, "0") +
      suffix
    );
  };

  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // جلب المواد
  const fetchRooms = async () => {
    try {
      const res = await axios.get<Room[]>(
        `/api/rooms-ws/${encodeURIComponent(searchQuery)}/${encodeURIComponent(TiD)}?affiliateId=${encodeURIComponent(String(Ida))}`
      );
      setRooms(res.data);
    } catch {
      toast.error("فشل تحميل المواد");
    }
  };

  // إضافة سطر جديد دائماً حتى لو كانت الغرفة مضافة مسبقاً
  const handleSelectRoom = (room: Room) => {
    const defaultCount = 1;
    const defaultSum = room.Tier * defaultCount;

    setLines((prev) => [
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
        lineProvin: "",
        lineAddress: "",
        lineDriver: "",
        lineDate: today,
        lineSum: defaultSum,
        sumEdited: false,
      },
    ]);
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const setLine = <K extends keyof Line>(lineId: string, key: K, value: Line[K]) => {
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, [key]: value } : l)));
  };

  // عند تغيير العدد: إن لم يعدّل المستخدم المبلغ يدوياً، حدّث المبلغ = السعر × العدد
  const handleCountChange = (line: Line, val: string) => {
    const n = Math.max(1, parseInt(val || "1", 10));
    if (!line.sumEdited) {
      setLines((prev) =>
        prev.map((l) =>
          l.lineId === line.lineId ? { ...l, count: n, lineSum: l.Tier * n } : l
        )
      );
    } else {
      setLine(line.lineId, "count", n);
    }
  };

  // مجموع استعراضي
  const totalSum = useMemo(
    () => lines.reduce((acc, l) => acc + (isNaN(l.lineSum) ? 0 : l.lineSum), 0),
    [lines]
  );

  const resetAll = () => {
    setRooms([]);
    setSearchQuery("");
    setShowRoomTable(true);
    setHasSearchedRooms(false);
    setLines([]);
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
      if (!l.lineProvin) return toast.warn(`اختر المحافظة للسطر: ${l.RoomName}`);
      if (!l.lineDriver) return toast.warn(`أدخل اسم السائق للسطر: ${l.RoomName}`);
      if (!l.lineDate) return toast.warn(`حدد تاريخ التجهيز للسطر: ${l.RoomName}`);
      if (isNaN(l.lineSum) || l.lineSum <= 0) return toast.warn(`أدخل مبلغًا صحيحًا للسطر: ${l.RoomName}`);
    }

    try {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const inv = makeInvoNum();

        // 1) وصل مستقل في sellmoney
        await axios.post("/api/sellmoney-ws", {
          InvoNum: inv,
          MoneyPaid: "0",
          Sum: l.lineSum,             // مبلغ منفصل
          ClName: affiliate,
          Provide: l.lineDate,        // تاريخ منفصل
          Provin: l.lineProvin,       // محافظة منفصلة
          Provin2: l.lineAddress || "",
          Id: Ida,                    // affiliateID
          Driver: l.lineDriver,       // سائق منفصل
        });

        // 2) صف مستقل في selltable مربوط بنفس الوصل
        await axios.post("/api/selltable-ws", {
          RoomNum: l.roomId,
          InvoNum: inv,
          State: "Active",
          countt: l.count,
          RoomCost: l.Tier,                 // backend سيحسب الإجمالي: RoomCost * countt
          flagf: l.flagf || "",
          sellor: session?.user?.name || "",
        });
      }

      toast.success("تم إنشاء وصل منفصل لكل غرفة مع الحقول المخصصة.");
      closeDialog();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الإدخال");
    }
    });
  };

  // أنماط مهنية للجداول
  const _tablePaperSx = {
    mt: 2,
    mb: 2,
    borderRadius: 2,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  } as const;

  const _tableContainerSx = {
    maxHeight: 460,
    "& .MuiTable-root": { minWidth: 900 },
    "& .MuiTableCell-head": {
      bgcolor: "#111827", // slate-900
      color: "#fff",
      fontWeight: 600,
      fontSize: 13,
    },
    "& .MuiTableCell-body": { fontSize: 13 },
    "& .MuiTableRow-root:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" },
    "& .MuiTableRow-hover:hover": { bgcolor: "rgba(56,110,110,0.08)" },
  } as const;
  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontFamily: "Alexandria, sans-serif", direction: "rtl" }}>
        إدخال وصولات شراء منفصلة: {affiliate}
      </DialogTitle>

      <DialogContent>
        {/* البحث وإحضار المواد */}
        <Grid container spacing={2} alignItems="center"> <Grid item xs={8}> <TextField margin="dense" label="بحث عن مادة" variant="filled" sx={{ borderRadius: '4px', '& .MuiInputBase-input': { fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }, '& .MuiInputLabel-root': { fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }, '& input::placeholder': { fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', }, }} fullWidth value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: ( <InputAdornment position="start">🔍</InputAdornment> ), }} /> </Grid>
          <Grid item xs={2}>
            <Button
             variant="contained" className="ml-2 mb-2" style={{ borderRadius: "4px", background: "#386e6e", color: "white" }} sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }} fullWidth
              onClick={() => {
                setHasSearchedRooms(true);
                fetchRooms();
              }}
            >
              بحث
            </Button>
          </Grid>
          {rooms.length > 0 && (
            <Grid item xs={2}>
              <Button
variant="contained" className="ml-2 mb-2" style={{ borderRadius: "4px", color: "white" }} sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }} color="secondary" fullWidth
                onClick={() => setShowRoomTable((s) => !s)}
              >
                {showRoomTable ? "إخفاء الجدول" : "إظهار الجدول"}
              </Button>
            </Grid>
          )}
        </Grid>

        {/* جدول المواد للانتقاء */}
        {showRoomTable && hasSearchedRooms && (
          <>
            <Paper sx={{ marginBottom: "20px", width: "100%", overflow: "hidden", fontFamily: 'Alexandria, sans-serif' }}> <TableContainer style={{ maxHeight: 440, overflowX: "auto" }}> <Table stickyHeader aria-label="sticky table"> <TableHead>
                    <TableRow>
                      <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المادة</TableCell>
                      <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المتاح</TableCell>
                      <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>سعر القطعة</TableCell>
                      <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>مصدر السعر</TableCell>
                      <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>إضافة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((r) => (
                      <TableRow key={r.id}>
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
            </Paper>
            <Divider />
          </>
        )}

        {/* جدول السطور المختارة — كل سطر = وصل منفصل مع حقوله */}
            <Paper sx={{ marginBottom: "20px", width: "100%", overflow: "hidden", fontFamily: 'Alexandria, sans-serif' }}> <TableContainer style={{ maxHeight: 440, overflowX: "auto" }}> <Table stickyHeader aria-label="sticky table"> <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>#</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المادة</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={90}>العدد</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={120}>سعر القطعة</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={120}>مصدر السعر</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={140}>المبلغ (للوصل)</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={150}>المحافظة</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={220}>العنوان</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={160}>السائق</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={160}>تاريخ التجهيز</TableCell>
                  <TableCell align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} width={90}>حذف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={l.lineId} hover>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{idx + 1}</TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{l.RoomName}</TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        type="number"
                        value={l.count}
                        onChange={(e) => handleCountChange(l, e.target.value)}
                        inputProps={{ min: 1 }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{formatNum(l.Tier)}</TableCell>
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >{getPriceSourceLabel(l.priceSource)}</TableCell>

                    {/* مبلغ منفصل قابل للتعديل */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        value={formatNum(l.lineSum)}
                        onChange={(e) => {
                          // اسمح بأرقام مع فواصل، ثم أعد تنسيقها
                          const raw = e.target.value.replace(/,/g, "");
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

                        size="small"
                        inputProps={{ inputMode: "numeric" }}
                      />
                    </TableCell>

                    {/* محافظة منفصلة */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        select
                        value={l.lineProvin}
                        onChange={(e) => setLine(l.lineId, "lineProvin", e.target.value)}
                        size="small"
                        fullWidth
                      >
                        {[
                          "بغداد","أربيل","الأنبار","البصرة","بابل","نينوى","صلاح الدين","السليمانية","دهوك",
                          "ديالى","واسط","ميسان","ذي قار","المثنى","كربلاء","النجف","الديوانية","كركوك","حلبجة"
                        ].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                      </TextField>
                    </TableCell>

                    {/* عنوان منفصل */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        value={l.lineAddress}
                        onChange={(e) => setLine(l.lineId, "lineAddress", e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>

                    {/* سائق منفصل */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        value={l.lineDriver}
                        onChange={(e) => setLine(l.lineId, "lineDriver", e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </TableCell>

                    {/* تاريخ تجهيز منفصل */}
                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <TextField
                        type="date"
                        value={l.lineDate}
                        onChange={(e) => setLine(l.lineId, "lineDate", e.target.value)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>

                    <TableCell style={{fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }} align="center" >
                      <Button color="error" size="small" onClick={() => handleRemoveLine(l.lineId)}>
                        <DeleteOutlineIcon style={{ cursor: 'pointer', color: 'red', marginRight: '8px' }}/>

                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center">لا توجد مواد مُضافة</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* إجمالي (للعرض فقط) */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="المجموع الكلي (للعرض)"
              value={formatNum(totalSum) || 0}
              inputProps={{ readOnly: true }}
              variant="filled"
              fullWidth
            />
          </Grid>
        </Grid>

      </DialogContent>

      <DialogActions>
<Button sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }} onClick={closeDialog} color="secondary"> الغاء </Button> <Button sx={{ fontFamily: 'Alexandria, sans-serif', fontWeight: 400, fontSize: '13px', direction: 'rtl', }}onClick={handleSubmit} color="primary" disabled={isSubmitting}> {isSubmitting ? "جاري الحفظ..." : "ادخال"} </Button>      </DialogActions>
    </Dialog>
  );
};

export default WSForm;
