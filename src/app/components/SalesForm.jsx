import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
  Typography,
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import AddIcon from '@mui/icons-material/Add';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import EmptyTableRow from "@/app/components/EmptyTableRow";
import useSubmissionState from "@/app/components/useSubmissionState";
import {
  floorOptions,
  iraqProvinceOptions,
} from "@/app/components/furnitureOptions";

const sectionCardSx = {
  p: { xs: 1.75, md: 2.25 },
  borderRadius: 3,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "rgba(255,255,255,0.82)",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.04)",
};

const sectionTitleSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 600,
  fontSize: "14px",
  color: "#123232",
  mb: 1.25,
};

const dialogPaperSx = {
  borderRadius: 4,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(247,249,249,1) 0%, rgba(240,245,245,1) 100%)",
};

const FurnitureEntryForm = ({
  open,
  handleClose,
  fetchData: _fetchData,
  telegramPanel = null,
  selectedTelegramRequest = null,
  isTelegramPanelVisible = true,
  onToggleTelegramPanel = null,
  onTelegramRequestExecuted = null,
}) => {
  const initialFormState = {
    MoneyPaid: '',
    MoneyRemain: '',
    Sum: '',
    ClName: '',
    CellPhone: '',
    CellPhone1: '',
    Provide: '',
    sellor: '',
    Floor: '',
    FloorCost: '',
    Details: '',
    Provin: '',
    Provin2: '',
    selectedRoom: null,
    roomsInTable: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const { Sum, MoneyPaid } = formData;
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoomTable, setShowRoomTable] = useState(true); // State to control table visibility
  const [hasSearchedRooms, setHasSearchedRooms] = useState(false);
  const { data: session } = useSession();
  const _namee = session?.user?.name; // Use optional chaining to safely access 'user' and 'name'
const [sellors, setSellors] = useState([]);

useEffect(() => {
  const fetchSellors = async () => {
    try {
      const response = await axios.get('/api/sellors'); // API مخصص لجلب البائعين
      setSellors(response.data);
    } catch (error) {
      console.error("Error fetching sellors:", error);
    }
  };

  fetchSellors();
}, []);
  const formatNumber = (number) => {
    return number ? parseFloat(number).toLocaleString('en-US') : '';
  };
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false); // State for disabling the submit button
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (Sum && MoneyPaid) {
      const remain = parseFloat(Sum.replace(/,/g, '')) - parseFloat(MoneyPaid.replace(/,/g, ''));
      setFormData((prevState) => ({
        ...prevState,
        MoneyRemain: formatNumber(remain.toFixed(2)) || ''
      }));
      setIsSubmitDisabled(remain < 0); // Disable submit if MoneyRemain is less than 0
    }
  }, [MoneyPaid, Sum]);
  
  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'MoneyPaid' || name === 'Sum') {
      let formattedValue = value.replace(/,/g, '');
      setFormData((prevState) => ({
        ...prevState,
        sellor: session.user.name, // Automatically set the sellor field based on session
      }));
      if (isNaN(formattedValue) && formattedValue !== '') {
        return;
      }
      if (formattedValue !== '') {
        formattedValue = parseFloat(formattedValue).toLocaleString('en-US');
      }
      setFormData((prevState) => ({
        ...prevState,
        [name]: formattedValue
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value
      }));
    }
  };

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
    // Check if rooms are added
    
    if (formData.roomsInTable.length === 0) {
      alert('يرجى إضافة مادة واحدة على الأقل.');
      return;
    }
  
    // Check if required fields are filled
    const requiredFields = [
      'MoneyPaid',
      'MoneyRemain',
      'Sum',
      'ClName',
      'CellPhone',
      'Provide',
      'sellor',
      'Floor',
      'Provin',
      'Provin2',
    ];
  
    for (let field of requiredFields) {
      if (!formData[field]) {
        toast.warning("يرجى ملء كل الحقول المطلوبة.");
        return;
      }
    }
  
    // Generate unique `invonum`
    const now = new Date();
    const invonum = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
    
    try {
      // Insert data into `sellmoney`
      const sellMoneyData = {
        InvoNum: invonum,
        MoneyPaid: formData.MoneyPaid,
        Sum: formData.Sum,
        ClName: formData.ClName,
        details: formData.Details,
        CellPhone: formData.CellPhone,
        Provide: formData.Provide,
        sellor: formData.sellor,
        Floor: formData.Floor,
        FloorCost: formData.FloorCost,
        CellPhone1: formData.CellPhone1,
        Provin: formData.Provin,
        Provin2: formData.Provin2,
      };
      await axios.post('/api/sellmoney', sellMoneyData);
      // Insert rows into `selltable`
      const sellTableData = formData.roomsInTable.map((room) => ({
        RoomNum: room.id,
        InvoNum: invonum,
        State: 'Active',  // or some other default value
        countt: room.count,
        flagf: room.flagf,
        sellor: formData.sellor,
        RoomCost: room.RoomCost
      }));
      toast.success("تم حفظ الوصل بنجاح.");
      await Promise.all(sellTableData.map((data) => axios.post('/api/selltable', data)));

      if (selectedTelegramRequest?.id && onTelegramRequestExecuted) {
        await onTelegramRequestExecuted(selectedTelegramRequest.id, invonum);
      }

      
    
      // Refresh or close form after successful submission

      handleClose();
      resetForm();   // Reset form fields

    } catch (error) {
      toast.error("تعذر حفظ الوصل.");

      console.error('Error submitting form:', error);
    }
    });
  };
  

  const closeDialog = () => {
    handleClose();
    resetForm();
  };
  const resetForm = () => {
    setFormData(initialFormState);
    setSearchQuery('');
    setRooms([]);
    setShowRoomTable(true);
    setHasSearchedRooms(false);
  };
  const fetchRooms = async () => {
    try {
      const response = await axios.get(`/api/rooms/${searchQuery}`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSelectRoom = (room) => {
    setFormData((prevState) => {
      // Check if the selected room already exists in the roomsInTable array
      const existingRoomIndex = prevState.roomsInTable.findIndex(
        (r) => r.id === room.id
      );
  
      // Create a copy of the roomsInTable array to avoid modifying the original state directly
      const updatedRooms = [...prevState.roomsInTable];
  
      if (existingRoomIndex !== -1) {
        // Increment the count by 1 for the existing room
        updatedRooms[existingRoomIndex] = {
          ...updatedRooms[existingRoomIndex],
          count: updatedRooms[existingRoomIndex].count + 1,
        };
      } else {
        // Add the new room with a count of 1
        updatedRooms.push({ ...room, count: 1 });
      }
  
      return { ...prevState, roomsInTable: updatedRooms };
    });
  };
  

  const handleRemoveRoom = (id) => {
    setFormData({
      ...formData,
      roomsInTable: formData.roomsInTable.filter(room => room.id !== id),
    });
  };

  const handleSearchButtonClick = async () => {
    await fetchRooms();
    setHasSearchedRooms(true);
    setShowRoomTable(true); // Reset table visibility when searching
  };

  const hasTelegramPanel = Boolean(telegramPanel);

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      maxWidth={hasTelegramPanel ? "xl" : "md"}
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={{
      borderRadius: '4px',
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 600,
        fontSize: '18px',
        direction: 'rtl',
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        background:
          "linear-gradient(135deg, rgba(243,247,247,1) 0%, rgba(232,242,242,1) 100%)",
        color: "#123232",
    }}>وصل بيع جديد</DialogTitle>
      <DialogContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedTelegramRequest ? (
              <Chip
                label={`الطلب المحدد #${selectedTelegramRequest.id}`}
                size="small"
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  backgroundColor: "rgba(56, 110, 110, 0.12)",
                  color: "#164444",
                }}
              />
            ) : null}
          </Stack>

          {hasTelegramPanel && onToggleTelegramPanel ? (
            <Button
              onClick={onToggleTelegramPanel}
              sx={{
                fontFamily: "Alexandria, sans-serif",
                fontWeight: 400,
                fontSize: "13px",
                textTransform: "none",
                alignSelf: { xs: "flex-start", md: "center" },
              }}
            >
              {isTelegramPanelVisible ? "إخفاء وارد التليغرام" : "إظهار وارد التليغرام"}
            </Button>
          ) : null}
        </Stack>

        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid item xs={12} lg={hasTelegramPanel && isTelegramPanelVisible ? 8 : 12}>
        <Paper sx={sectionCardSx}>
        <Typography sx={sectionTitleSx}>اختيار المواد وإضافتها إلى الوصل</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8}>
            <TextField
              margin="dense"
              label="بحث عن مادة"
              variant="filled"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                borderRadius: '4px',
                '& .MuiInputBase-input': {
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  direction: 'rtl',
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  direction: 'rtl',
                },
                '& input::placeholder': {
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">🔍</InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="contained"
              fullWidth
              style={{ borderRadius: "4px", background: "#386e6e", color: "white" }}
              sx={{
                borderRadius: '4px',
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '12px',
                  direction: 'rtl',
                
              }}
              onClick={handleSearchButtonClick}
            >
              بحث
            </Button>
          </Grid>
          {rooms.length > 0 && (
            <Grid item xs={2}>
              <Button
              
                variant="contained"
                color="secondary"
                className="ml-2"
                style={{ borderRadius: "4px", color: "white" }}
                sx={{
                  borderRadius: '4px',
                    fontFamily: 'Alexandria, sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    direction: 'rtl',
                  
                }}
                fullWidth
                onClick={() => setShowRoomTable(!showRoomTable)}
              >
                {showRoomTable ? 'إخفاء الجدول' : 'إظهار الجدول'}
              </Button>
            </Grid>
          )}
        </Grid>

        {/* Room Table */}
        {showRoomTable && hasSearchedRooms && (
          <>
            <Table >
              <TableHead>
                <TableRow>
                  <TableCell  align="center" style={{ minWidth: 50 , backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>اسم المادة</TableCell>
                  <TableCell align="center" style={{ minWidth: 50 , backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>المتاح</TableCell>
                  <TableCell align="center" style={{ minWidth: 50 , backgroundColor: '#2c2c4d', color: 'white',fontFamily: 'Alexandria, sans-serif',fontWeight: '400',fontSize: '13px' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="Alexandria"  align="center" >{room.RoomName}</TableCell>
                    <TableCell className="Alexandria"  align="center" >{room.RoomCounts}</TableCell>
                    <TableCell className="Alexandria"  align="center">
                        <AddIcon  onClick={() => handleSelectRoom(room)} style={{ cursor: 'pointer', color: 'green', marginRight: '8px' }}/>


                    </TableCell>
                  </TableRow>
                ))}
                {rooms.length === 0 ? <EmptyTableRow colSpan={3} /> : null}
              </TableBody>
            </Table>
            <Divider />
          </>
        )}
        </Paper>

        {/* Selected Rooms Table */}
        <Paper sx={{ ...sectionCardSx, mt: 2 }}>
        <Typography sx={sectionTitleSx}>المواد المختارة داخل الوصل</Typography>
        <TableContainer>
        <Table>
          <TableBody>
            {formData.roomsInTable.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="Alexandria"  align="center" >{room.id}</TableCell>
                <TableCell className="Alexandria"  align="center" >{room.RoomName}</TableCell>
                <TableCell className="Alexandria"  align="center" >
                  <TextField
                    value={room.count}
                    type="number"
                    onChange={(e) => {
                      const updatedRooms = formData.roomsInTable.map((r) =>
                        r.id === room.id ? { ...r, count: e.target.value } : r
                      );
                      setFormData({ ...formData, roomsInTable: updatedRooms });
                    }}
                    inputProps={{ min: 1 }}
                  />
                </TableCell>
                <TableCell className="Alexandria"  align="center">
                <RemoveShoppingCartIcon onClick={() => handleRemoveRoom(room.id)} style={{ cursor: 'pointer', color: 'red', marginRight: '8px' }}/>

                  
                </TableCell>
              </TableRow>
            ))}
            {formData.roomsInTable.length === 0 ? <EmptyTableRow colSpan={4} /> : null}
          </TableBody>
        </Table>
        </TableContainer>
        </Paper>

         {/* Form Fields */}
         <Paper sx={{ ...sectionCardSx, mt: 2 }}>
         <Typography sx={sectionTitleSx}>بيانات الوصل والزبون</Typography>
         <div className="grid grid-cols-2 gap-4">
          <TextField
            margin="dense"
            name="Sum"
            label="المجموع الكلي"
            type="text"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.Sum}
            onChange={handleChange}
            required

          />
          <TextField
            margin="dense"
            name="MoneyPaid"
            label="المبلغ المدفوع"
            type="text"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.MoneyPaid}
            onChange={handleChange}
            required
          />
          <TextField
            margin="dense"
            name="MoneyRemain"
            label="المتبقي بذمة الزبون"
            type="text"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.MoneyRemain}
            InputProps={{
              readOnly: true,
            }}
            
          />
          {parseFloat(formData.MoneyRemain.replace(/,/g, '')) < 0 && (
  <p style={{ color: 'red' }}>لا يمكن أن يكون المبلغ المتبقي سالباً. يرجى تعديل الدفعة.</p>
)}
          <TextField
            margin="dense"
            name="ClName"
            label="اسم الزبون"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.ClName}
            onChange={handleChange}
            required
          />
<TextField
  margin="dense"
  name="CellPhone"
  label="رقم الهاتف"
  fullWidth
  variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
  value={formData.CellPhone}
  onChange={(e) => {
    if (e.target.value.length <= 11) {
      handleChange(e);
    }
  }}
  inputProps={{ maxLength: 11 }}
  required
/>
<TextField
  margin="dense"
  name="CellPhone1"
  label="رقم الهاتف الاحتياطي"
  fullWidth
  variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
  value={formData.CellPhone1}
  onChange={(e) => {
    if (e.target.value.length <= 11) {
      handleChange(e);
    }
  }}
  inputProps={{ maxLength: 11 }}
/>

          <TextField
            margin="dense"
            name="Provin"
            label="المحافظة"
            select
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.Provin}
            onChange={handleChange}
            required
          >
            {iraqProvinceOptions.map((province) => (
              <MenuItem
                key={province}
                sx={{
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  direction: 'rtl',
                }}
                value={province}
              >
                {province}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            name="Provin2"
            label="العنوان"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.Provin2}
            onChange={handleChange}
            required
          />
          <TextField
            margin="dense"
            name="Provide"
            label="تاريخ التجهيز"
            type="date"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.Provide}
            onChange={handleChange}
            required
          />
          <TextField
  margin="dense"
  name="sellor"
  label="البائع"
  select
  fullWidth
  variant="filled"
  value={formData.sellor}
  onChange={handleChange}
  sx={{
    borderRadius: '4px',
    '& .MuiInputBase-input': {
      fontFamily: 'Alexandria, sans-serif',
      fontWeight: 400,
      fontSize: '13px',
      direction: 'rtl',
    },
    '& .MuiInputLabel-root': {
      fontFamily: 'Alexandria, sans-serif',
      fontWeight: 400,
      fontSize: '13px',
      direction: 'rtl',
    },
    '& input::placeholder': {
      fontFamily: 'Alexandria, sans-serif',
      fontWeight: 400,
      fontSize: '13px',
    },
  }}
  required
>
  {sellors.map((user) => (
    <MenuItem
      key={user.id}
      value={user.name}
      sx={{
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      }}
    >
      {user.name}
    </MenuItem>
  ))}
</TextField>

    
          <TextField
            margin="dense"
            name="Floor"
            label="الطابق"
            select
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.Floor}
            onChange={handleChange}
            required
          >
            {floorOptions.map((floorOption) => (
              <MenuItem
                key={floorOption}
                sx={{
                  fontFamily: 'Alexandria, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  direction: 'rtl',
                }}
                value={floorOption}
              >
                {floorOption}
              </MenuItem>
            ))}

          </TextField>
          <TextField
            margin="dense"
            name="FloorCost"
            label="تكلفة التفريغ"
            type="text"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.FloorCost}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) { // Allows only digits
                handleChange(e);
              }
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />
          <TextField
            margin="dense"
            name="Details"
            label="الملاحظات"
            fullWidth
            variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
      },
    }}
            value={formData.Details}
            onChange={handleChange}
          />
        </div>
        </Paper>
          </Grid>

          {hasTelegramPanel && isTelegramPanelVisible ? (
            <Grid item xs={12} lg={4}>
              <Box
                sx={{
                  position: { lg: "sticky" },
                  top: 0,
                  maxHeight: { lg: "72vh" },
                  overflowY: "auto",
                  pr: { lg: 0.5 },
                }}
              >
                {telegramPanel}
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          backgroundColor: "rgba(255,255,255,0.88)",
        }}
      >
      <Button sx={{
      borderRadius: '4px',
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '16px',
        direction: 'rtl',
      
    }} onClick={closeDialog} color="secondary">
    الغاء
  </Button>
  <Button
    color="primary"
    onClick={handleSubmit}
    disabled={isSubmitDisabled || isSubmitting} // Disable based on the state
    sx={{
      borderRadius: '4px',
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '16px',
        direction: 'rtl',
      
    }}>
    {isSubmitting ? 'جاري الحفظ...' : 'إدخال'}
  </Button>
  
</DialogActions>

    </Dialog>
  );
};

export default FurnitureEntryForm;
