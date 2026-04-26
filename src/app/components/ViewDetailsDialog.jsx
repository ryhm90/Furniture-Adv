import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Grid } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from "date-fns";

const ViewDetailsDialog = ({ open, onClose, providorId }) => {
  const [details, setDetails] = useState(null);

  const dateformatter = (dateString) => {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate)) {
      console.error('Invalid date');
      return '';
    }
    return format(parsedDate, 'yyyy-MM-dd');
  };

  useEffect(() => {
    if (providorId) {
      axios.get(`/api/providor-details/${providorId}`)
        .then(response => setDetails(response.data))
        .catch(error => console.error('Error fetching providor details:', error));
    }
  }, [providorId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle  sx={{
    fontFamily: 'Alexandria, sans-serif',
    fontWeight: 400,
    fontSize: '15px',
    direction: 'rtl',
  }}>معلومات المورد</DialogTitle>
      <DialogContent>
        {details ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم المادة"
                value={details.ItemName || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم المصنع"
                value={details.factoryName || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="العدد المتفق عليه"
                value={details.agreedCount || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="العدد المستلم"
                value={details.recivedCount || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="سعر المفرد مصنعيا بالدولار"
                value={details.factoryprice || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الناقل"
                value={details.transportername || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تكلفة نقل المادة بالدولار"
                value={details.transportercost || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تكلفة تفريغ البضاعة بالدينار"
                value={details.unlaodcost || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الملاحظات"
                value={details.note || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                multiline
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ ادخل الطلبية في النظام"
                value={dateformatter(details.Created_at) || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ انشاء الطلبية"
                value={dateformatter(details.date) || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم المورد"
                value={details.providorName || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الحالة"
                value={details.status || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="filled"
sx={{
      borderRadius: '4px',
      '& .MuiInputBase-input': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& .MuiInputLabel-root': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        direction: 'rtl',
        marginTop: 2
      },
      '& input::placeholder': {
        fontFamily: 'Alexandria, sans-serif',
        fontWeight: 400,
        fontSize: '13px',
        marginTop: 2
      },
    }}
              />
            </Grid>
          </Grid>
        ) : (
          <p>[جاري تحميل المعلومات]...</p> 
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary"   sx={{
    fontFamily: 'Alexandria, sans-serif',
    fontWeight: 400,
    fontSize: '13px',
    direction: 'rtl',
  }}>اغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewDetailsDialog;
