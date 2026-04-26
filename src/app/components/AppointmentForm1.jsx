import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, MenuItem } from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import axios from 'axios';
import dayjs from 'dayjs';

const AppointmentForm = ({ open, handleClose, fetchData, initialData }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Treatment');
  const [date, setDate] = useState(dayjs());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userResponse = await axios.get(`/api/userd`, { params: { name } });
      let userId = userResponse.data?.id;

      if (!userId) {
        const newUserResponse = await axios.post('/api/userd', { name, phone });
        userId = newUserResponse.data.id;
      }

      await axios.post('/api/dashboard', {
        Pid: userId,
        name: name,
        phone: phone,
        dt: date.format('YYYY-MM-DD HH:mm:ss'),
        type: type,
        note: '',
        doctor: '',
      });

      fetchData();
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Add Appointment</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          InputProps={{ readOnly: true }}
        />
        <TextField
          margin="dense"
          label="Phone"
          type="text"
          fullWidth
          variant="outlined"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Type"
          select
          fullWidth
          variant="outlined"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <MenuItem value="Treatment">Treatment</MenuItem>
          <MenuItem value="Implant">Implant</MenuItem>
          <MenuItem value="Orthodontics">Orthodontics</MenuItem>
        </TextField>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Select Date and Time"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            disablePast
            minDate={dayjs()}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Submit"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentForm;
