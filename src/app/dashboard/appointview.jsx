import React, { useCallback, useState, useEffect } from 'react';
import Modal from '@mui/material/Modal';
import { Box, Typography, Button, Table, TableHead, TableBody, TableCell, TableRow, TextField, Select, MenuItem,Grid } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { format } from 'date-fns';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from "@mui/system";
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Popover from '@mui/material/Popover';
import EmptyTableRow from "@/app/components/EmptyTableRow";


const AppointView = ({ open, handleClose, selectedPatientId }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [appointments, setAppointments] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [diagnosisl, setDiagnosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [money, setMoney] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [value, setValue] = useState('1');
  const [doctors, setDoctors] = useState([]);
  const [diagnosislL, setDiagnosisL] = useState([]);


  const handleChangeTab = (event, newValue) => {
    setValue(newValue);
  };
  
  const [opgImage, setOpgImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  
  const [popoverState, setPopoverState] = useState({
    anchorEl: null,
    openPopover: false,
    currentTooth: null,
    currentPatientType: null
  });

  const resetImageAdjustments = () => {
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setPosition({ x: 0, y: 0 });
  };

  
  useEffect(() => {
    if (selectedPatientId) {


      const fetchDoctors = async () => {
        
        try {
          const response = await axios.get('/api/appointments/doctorsf');
          setDoctors(response.data);
        } catch (_error) {
        }
      };
      fetchDoctors();
      const fetchOpgImage = async () => {
        try {
          const response = await axios.get(`/api/appointments/get-opg/${selectedPatientId.id}`, {
            responseType: 'blob',
          });
          const imageUrl = URL.createObjectURL(response.data);
          setOpgImage(imageUrl);
        } catch (error) {
          console.error("Error fetching OPG image:", error);
        }
      };
      fetchOpgImage();
    }
  }, [selectedPatientId]);

  const handleWheel = (event) => {
    event.preventDefault();
    if (!panning) {
      const scaleAmount = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prevZoom => Math.min(Math.max(prevZoom * scaleAmount, 1), 3)); // Limiting zoom between 1x and 3x
    }
  };
  

  const handleMouseDown = (event) => {
    if (event.button === 1) { // Middle mouse button
      event.preventDefault();
      setPanning(true);
      setStartPan({ x: event.clientX - position.x, y: event.clientY - position.y });
    }
  };

  const handleMouseMove = (event) => {
    if (panning) {
      setPosition({
        x: event.clientX - startPan.x,
        y: event.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = (event) => {
    if (event.button === 1) {
      setPanning(false);
    }
  };


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleUpdateAppointment = async (appointmentId, field, value) => {
    try {
      await axios.put(`/api/appointments/doctorsu`, { 
        field, // send field name
        value, // send field value
        Pid: appointmentId,
      });
      fetchData()
      toast.success('Appointment updated successfully');

      // Refresh the data after update
      const appointmentsResponse = await axios.get(`/api/appointments/id/${selectedPatientId.id}`);
      setAppointments(appointmentsResponse.data);
    } catch (_error) {
      toast.error('Failed to update appointment');
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const dateformatter = (dateString) => {
    const parsedDate = new Date(dateString);
    return format(parsedDate, 'yyyy-MM-dd h:mm a');
  };


  const fetchData = useCallback(async () => {
    if (!selectedPatientId) {
      return;
    }

    setLoading(true);

    try {
      const diagnosisResponse = await axios.get(`/api/appointments/diagnosis/${selectedPatientId.id}`);
      setDiagnosis(diagnosisResponse.data);
    } catch (_error) {
      toast.error('Error fetching patient data.');
    } finally {
      setLoading(false);
    }
    try {
      const diagnosisResponseL = await axios.get(`/api/appointments/lab/${selectedPatientId.id}`);
      setDiagnosisL(diagnosisResponseL.data);
    } catch (_error) {
      toast.error('Error fetching patient data.');
    } finally {
      setLoading(false);
    }
    try {
      const appointmentsResponse = await axios.get(`/api/appointments/id/${selectedPatientId.Pid}`);
      setAppointments(appointmentsResponse.data);
      const financialsResponse = await axios.get(`/api/financials/${selectedPatientId.Pid}`);
      setFinancials(financialsResponse.data);
      const diagnosiss  = await axios.get(`/api/appointments/diagnosis/${selectedPatientId.id}`);
      setDiagnosis(diagnosiss.data);

    } catch (_error) {
      toast.error('Error fetching patient data.');
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);



  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [fetchData, open]);



  const handleViewAppointment = (_appointmentId) => {
  };
  const CustomTypography = styled(Typography)({
    fontSize: "18px",
    color: "#333",
    marginBottom: "8px",
  });
  const totalMoney = appointments.reduce((acc, appointment) => acc + appointment.money, 0);
  const totalPaid = financials.reduce((acc, financial) => acc + financial.moneyP, 0);
  const Ftotal = totalMoney - totalPaid;
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#ffcc00'; // yellow
      case 'Done':
        return '#00cc00'; // green
      case 'Canceled':
        return '#ff3300'; // red
      case 'On Chair':
        return '#3399ff'; // blue
      default:
        return '#ffffff'; // white
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#000000'; // black
      case 'Done':
        return '#ffffff'; // white
      case 'Canceled':
        return '#ffffff'; // white
      case 'On Chair':
        return '#ffffff'; // white
      default:
        return '#000000'; // black
    }
  };
  
  const renderButtons = (patientType) => {
    if (patientType === 'Treatment') {
      return (
        <>
          <Button  style={{ backgroundColor: 'blue', color: 'white' }}>
        Exo
      </Button>
      <Button  style={{ backgroundColor: 'green', color: 'white' }}>
        Endo
      </Button>
      <Button  style={{ backgroundColor: 'orange', color: 'white' }}>
        Filling
      </Button>
      <Button  style={{ backgroundColor: 'yellow', color: 'black' }}>
        Whitening
      </Button>
      <Button  style={{ backgroundColor: 'gray', color: 'white' }}>
        TF
      </Button>

        </>
      );
    } else if (patientType === 'Implant') {
      return (
        <>
<Button  style={{ backgroundColor: 'purple', color: 'white' }}>
        Zargon
      </Button>
      <Button  style={{ backgroundColor: 'red', color: 'white' }}>
        Ceramic
      </Button>
        </>
      );
    } else {
      return null;
    }
  };
  const renderButtonsL = (patientType) => {
    if (patientType === 'Treatment') {
      return (
        <>
          <Button  style={{ backgroundColor: 'blue', color: 'white' }}>
        Ceramic
      </Button>
      <Button  style={{ backgroundColor: 'green', color: 'white' }}>
        Zirgon
      </Button>


        </>
      );
    } else if (patientType === 'Implant') {
      return (
        <>
    <Button  style={{ backgroundColor: 'blue', color: 'white' }}>
        Ceramic
      </Button>
      <Button  style={{ backgroundColor: 'green', color: 'white' }}>
        Zirgon
      </Button>
        </>
      );
    } else {
      return null;
    }
  };
  const handleClickD = async (label, ll, Pid, id, type) => {
    const data = {
      Pid: Pid,
      Aid: id,
      type: type,
      tooth: ll,
      orthodontics: type === 'Orthodontics' ? label : null,
      implant: type === 'Implant' ? label : null,
      treatment: type === 'Treatment' ? label : null,
    };

    try {
      if (label === 'Delete') {
        await axios.post('/api/appointments/diagnosis/crdd', JSON.stringify(data));
        toast.success('Diagnosis Deleted successfully');
        handleCloseB();
        fetchData(); // Refetch data to refresh the UI
  
      } else {

      await axios.post('/api/appointments/diagnosis/crd', JSON.stringify(data));
      toast.success('Diagnosis updated successfully');
      handleCloseB();
      fetchData()}; // Refetch data to refresh the UI
    } catch (error) {
      console.error('Error updating diagnosis:', error);
      toast.error('Failed to update diagnosis');
    }
  };

  const handleClickDL = async (label, ll, Pid, id, type) => {
    const data = {
      Pid: Pid,
      Aid: id,
      type: type,
      tooth: ll,
      orthodontics: type === 'Orthodontics' ? label : null,
      implant: type === 'Implant' ? label : null,
      treatment: type === 'Treatment' ? label : null,
    };

    try {
      if (label === 'Delete') {
        await axios.post('/api/appointments/lab/crdd', JSON.stringify(data));
        toast.success('Diagnosis Deleted successfully');
        handleCloseB();
        fetchData(); // Refetch data to refresh the UI
  
      } else {

      await axios.post('/api/appointments/lab/crd', JSON.stringify(data));
      toast.success('Diagnosis updated successfully');
      handleCloseB();
      fetchData()}; // Refetch data to refresh the UI
    } catch (error) {
      console.error('Error updating diagnosis:', error);
      toast.error('Failed to update diagnosis');
    }
  };

  const renderPopover = (patientType, value, Aid, id, type) => {
    const labelStyle = {
      textAlign: 'center',
      fontWeight: 'bold',
      padding: '8px',
      color: 'white',
      cursor: 'pointer',
    };

    if (patientType === 'Treatment') {
      return (
        <>
          <Typography sx={{ ...labelStyle, backgroundColor: 'blue' }} onClick={() => handleClickD('Exo', value, Aid, id, type)}>
            Exo
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'green' }} onClick={() => handleClickD('Endo', value, Aid, id, type)}>
            Endo
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'orange' }} onClick={() => handleClickD('Filling', value, Aid, id, type)}>
            Filling
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'yellow', color: 'black' }} onClick={() => handleClickD('Whitening', value, Aid, id, type)}>
            Whitening
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'gray' }} onClick={() => handleClickD('TF', value, Aid, id, type)}>
            TF
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'black' }} onClick={() => handleClickD('Delete', value, Aid, id, type)}>
            Delete
          </Typography>
        </>
      );
    } else if (patientType === 'Implant') {
      return (
        <>
          <Typography sx={{ ...labelStyle, backgroundColor: 'purple' }} onClick={() => handleClickD('Zargon', value, Aid, id, type)}>
            Zargon
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'red' }} onClick={() => handleClickD('Ceramic', value, Aid, id, type)}>
            Ceramic
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'black' }} onClick={() => handleClickD('Delete', value, Aid, id, type)}>
            Delete
          </Typography>
        </>
      );
    } else {
      return null;
    }
  };
  
  const renderPopoverL = (patientType, value, Aid, id, type) => {
    const labelStyle = {
      textAlign: 'center',
      fontWeight: 'bold',
      padding: '8px',
      color: 'white',
      cursor: 'pointer',
    };

    if (patientType === 'Treatment') {
      return (
        <>
          <Typography sx={{ ...labelStyle, backgroundColor: 'blue' }} onClick={() => handleClickDL('Ceramic', value, Aid, id, type)}>
            Ceramic
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'green' }} onClick={() => handleClickDL('Zirgon', value, Aid, id, type)}>
            Zirgon
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'black' }} onClick={() => handleClickDL('Delete', value, Aid, id, type)}>
            Delete
          </Typography>
        </>
      );
    } else if (patientType === 'Implant') {
      return (
        <>
          <Typography sx={{ ...labelStyle, backgroundColor: 'purple' }} onClick={() => handleClickDL('Zargon', value, Aid, id, type)}>
            Zargon
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'red' }} onClick={() => handleClickDL('Ceramic', value, Aid, id, type)}>
            Ceramic
          </Typography>
          <Typography sx={{ ...labelStyle, backgroundColor: 'black' }} onClick={() => handleClickDL('Delete', value, Aid, id, type)}>
            Delete
          </Typography>
        </>
      );
    } else {
      return null;
    }
  };
  const hasUL1 = diagnosisl.some(record => record.tooth === 'UL1' && (record.orthodontics || record.implant || record.treatment));
  const hasUL2 = diagnosisl.some(record => record.tooth === 'UL2' && (record.orthodontics || record.implant || record.treatment));
  const hasUL3 = diagnosisl.some(record => record.tooth === 'UL3' && (record.orthodontics || record.implant || record.treatment));
  const hasUL4 = diagnosisl.some(record => record.tooth === 'UL4' && (record.orthodontics || record.implant || record.treatment));
  const hasUL5 = diagnosisl.some(record => record.tooth === 'UL5' && (record.orthodontics || record.implant || record.treatment));
  const hasUL6 = diagnosisl.some(record => record.tooth === 'UL6' && (record.orthodontics || record.implant || record.treatment));
  const hasUL7 = diagnosisl.some(record => record.tooth === 'UL7' && (record.orthodontics || record.implant || record.treatment));
  const hasUL8 = diagnosisl.some(record => record.tooth === 'UL8' && (record.orthodontics || record.implant || record.treatment));

  const hasUR1 = diagnosisl.some(record => record.tooth === 'UR1' && (record.orthodontics || record.implant || record.treatment));
  const hasUR2 = diagnosisl.some(record => record.tooth === 'UR2' && (record.orthodontics || record.implant || record.treatment));
  const hasUR3 = diagnosisl.some(record => record.tooth === 'UR3' && (record.orthodontics || record.implant || record.treatment));
  const hasUR4 = diagnosisl.some(record => record.tooth === 'UR4' && (record.orthodontics || record.implant || record.treatment));
  const hasUR5 = diagnosisl.some(record => record.tooth === 'UR5' && (record.orthodontics || record.implant || record.treatment));
  const hasUR6 = diagnosisl.some(record => record.tooth === 'UR6' && (record.orthodontics || record.implant || record.treatment));
  const hasUR7 = diagnosisl.some(record => record.tooth === 'UR7' && (record.orthodontics || record.implant || record.treatment));
  const hasUR8 = diagnosisl.some(record => record.tooth === 'UR8' && (record.orthodontics || record.implant || record.treatment));

  const hasLL1 = diagnosisl.some(record => record.tooth === 'LL1' && (record.orthodontics || record.implant || record.treatment));
  const hasLL2 = diagnosisl.some(record => record.tooth === 'LL2' && (record.orthodontics || record.implant || record.treatment));
  const hasLL3 = diagnosisl.some(record => record.tooth === 'LL3' && (record.orthodontics || record.implant || record.treatment));
  const hasLL4 = diagnosisl.some(record => record.tooth === 'LL4' && (record.orthodontics || record.implant || record.treatment));
  const hasLL5 = diagnosisl.some(record => record.tooth === 'LL5' && (record.orthodontics || record.implant || record.treatment));
  const hasLL6 = diagnosisl.some(record => record.tooth === 'LL6' && (record.orthodontics || record.implant || record.treatment));
  const hasLL7 = diagnosisl.some(record => record.tooth === 'LL7' && (record.orthodontics || record.implant || record.treatment));
  const hasLL8 = diagnosisl.some(record => record.tooth === 'LL8' && (record.orthodontics || record.implant || record.treatment));

  const hasLR1 = diagnosisl.some(record => record.tooth === 'LR1' && (record.orthodontics || record.implant || record.treatment));
  const hasLR2 = diagnosisl.some(record => record.tooth === 'LR2' && (record.orthodontics || record.implant || record.treatment));
  const hasLR3 = diagnosisl.some(record => record.tooth === 'LR3' && (record.orthodontics || record.implant || record.treatment));
  const hasLR4 = diagnosisl.some(record => record.tooth === 'LR4' && (record.orthodontics || record.implant || record.treatment));
  const hasLR5 = diagnosisl.some(record => record.tooth === 'LR5' && (record.orthodontics || record.implant || record.treatment));
  const hasLR6 = diagnosisl.some(record => record.tooth === 'LR6' && (record.orthodontics || record.implant || record.treatment));
  const hasLR7 = diagnosisl.some(record => record.tooth === 'LR7' && (record.orthodontics || record.implant || record.treatment));
  const hasLR8 = diagnosisl.some(record => record.tooth === 'LR8' && (record.orthodontics || record.implant || record.treatment));


  const hasUL1L = diagnosislL.some(record => record.tooth === 'UL1' && (record.orthodontics || record.implant || record.treatment));
  const hasUL2L = diagnosislL.some(record => record.tooth === 'UL2' && (record.orthodontics || record.implant || record.treatment));
  const hasUL3L = diagnosislL.some(record => record.tooth === 'UL3' && (record.orthodontics || record.implant || record.treatment));
  const hasUL4L = diagnosislL.some(record => record.tooth === 'UL4' && (record.orthodontics || record.implant || record.treatment));
  const hasUL5L = diagnosislL.some(record => record.tooth === 'UL5' && (record.orthodontics || record.implant || record.treatment));
  const hasUL6L = diagnosislL.some(record => record.tooth === 'UL6' && (record.orthodontics || record.implant || record.treatment));
  const hasUL7L = diagnosislL.some(record => record.tooth === 'UL7' && (record.orthodontics || record.implant || record.treatment));
  const hasUL8L= diagnosislL.some(record => record.tooth === 'UL8' && (record.orthodontics || record.implant || record.treatment));

  const hasUR1L = diagnosislL.some(record => record.tooth === 'UR1' && (record.orthodontics || record.implant || record.treatment));
  const hasUR2L = diagnosislL.some(record => record.tooth === 'UR2' && (record.orthodontics || record.implant || record.treatment));
  const hasUR3L = diagnosislL.some(record => record.tooth === 'UR3' && (record.orthodontics || record.implant || record.treatment));
  const hasUR4L = diagnosislL.some(record => record.tooth === 'UR4' && (record.orthodontics || record.implant || record.treatment));
  const hasUR5L = diagnosislL.some(record => record.tooth === 'UR5' && (record.orthodontics || record.implant || record.treatment));
  const hasUR6L = diagnosislL.some(record => record.tooth === 'UR6' && (record.orthodontics || record.implant || record.treatment));
  const hasUR7L = diagnosislL.some(record => record.tooth === 'UR7' && (record.orthodontics || record.implant || record.treatment));
  const hasUR8L = diagnosislL.some(record => record.tooth === 'UR8' && (record.orthodontics || record.implant || record.treatment));

  const hasLL1L = diagnosislL.some(record => record.tooth === 'LL1' && (record.orthodontics || record.implant || record.treatment));
  const hasLL2L = diagnosislL.some(record => record.tooth === 'LL2' && (record.orthodontics || record.implant || record.treatment));
  const hasLL3L = diagnosislL.some(record => record.tooth === 'LL3' && (record.orthodontics || record.implant || record.treatment));
  const hasLL4L = diagnosislL.some(record => record.tooth === 'LL4' && (record.orthodontics || record.implant || record.treatment));
  const hasLL5L = diagnosislL.some(record => record.tooth === 'LL5' && (record.orthodontics || record.implant || record.treatment));
  const hasLL6L = diagnosislL.some(record => record.tooth === 'LL6' && (record.orthodontics || record.implant || record.treatment));
  const hasLL7L = diagnosislL.some(record => record.tooth === 'LL7' && (record.orthodontics || record.implant || record.treatment));
  const hasLL8L = diagnosislL.some(record => record.tooth === 'LL8' && (record.orthodontics || record.implant || record.treatment));

  const hasLR1L = diagnosislL.some(record => record.tooth === 'LR1' && (record.orthodontics || record.implant || record.treatment));
  const hasLR2L = diagnosislL.some(record => record.tooth === 'LR2' && (record.orthodontics || record.implant || record.treatment));
  const hasLR3L = diagnosislL.some(record => record.tooth === 'LR3' && (record.orthodontics || record.implant || record.treatment));
  const hasLR4L = diagnosislL.some(record => record.tooth === 'LR4' && (record.orthodontics || record.implant || record.treatment));
  const hasLR5L = diagnosislL.some(record => record.tooth === 'LR5' && (record.orthodontics || record.implant || record.treatment));
  const hasLR6L = diagnosislL.some(record => record.tooth === 'LR6' && (record.orthodontics || record.implant || record.treatment));
  const hasLR7L = diagnosislL.some(record => record.tooth === 'LR7' && (record.orthodontics || record.implant || record.treatment));
  const hasLR8L = diagnosislL.some(record => record.tooth === 'LR8' && (record.orthodontics || record.implant || record.treatment));



  const getColorForTooth = (record) => {
    if (record.orthodontics) {
      return 'rgba(0, 0, 255, 0.05)'; // More transparent blue
    } else if (record.implant) {
      return record.implant === 'Zargon' ? 'rgba(128, 0, 128, 0.6)' : 'rgba(255, 0, 0, 0.6)'; // More transparent purple or red
    } else if (record.treatment) {
      switch (record.treatment) {
        case 'Exo':
          return 'rgba(0, 0, 255, 0.6)'; // More transparent blue
        case 'Endo':
          return 'rgba(0, 128, 0, 0.6)'; // More transparent green
        case 'Filling':
          return 'rgba(255, 165, 0, 0.6)'; // More transparent orange
        case 'Whitening':
          return 'rgba(255, 255, 0, 0.6)'; // More transparent yellow
        case 'TF':
          return 'rgba(128, 128, 128, 0.6)'; // More transparent gray
          case 'Ceramic':
            return 'rgba(0, 0, 255, 0.6)'; // More transparent blue
            case 'Zirgon':
              return 'rgba(0, 128, 0, 0.6)'; // More transparent green
      
        default:
          return null;
      }
    } else {
      return null;
    }
  };
  
  const _imageStyle = {
    display: 'block'
  };
  
  const containerStyle = {
    position: 'relative',
    display: 'inline-block'
  };
  
  const overlayColoru9 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL1') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru10 = diagnosisl.reduce((color, record) => {

    if (record.tooth === 'UL2') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru11 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL3') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru12 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL4') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru13 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL5') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru14 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL6') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru15 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL7') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru16 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UL8') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru8 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR1') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru7 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR2') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
        return color;
  }, null);
  const overlayColoru6 = diagnosisl.reduce((color, record) => {

    if (record.tooth === 'UR3') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru5 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR4') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru4 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR5') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru3 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR6') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru2 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR7') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColoru1 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'UR8') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl9 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL1') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl10 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL2') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl11 = diagnosisl.reduce((color, record) => {

    if (record.tooth === 'LL3') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl12 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL4') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl13 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL5') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl14 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL6') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl15 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL7') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl16 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LL8') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl8 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR1') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl7 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR2') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl6 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR3') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl5 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR4') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl4 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR5') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl3= diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR6') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl2 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR7') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  const overlayColorl1 = diagnosisl.reduce((color, record) => {
    if (record.tooth === 'LR8') {
      const toothColor = getColorForTooth(record);
      if (toothColor) {        
        return toothColor;
      }
    }
    return color;
  }, null);
  


//ASDASDSADSADSADSADSADSAD

const overlayColoru9L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL1') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru10L = diagnosislL.reduce((color, record) => {

  if (record.tooth === 'UL2') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru11L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL3') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru12L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL4') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru13L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL5') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru14L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL6') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru15L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL7') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru16L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UL8') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru8L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR1') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru7L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR2') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
      return color;
}, null);
const overlayColoru6L = diagnosislL.reduce((color, record) => {

  if (record.tooth === 'UR3') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru5L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR4') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru4L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR5') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru3L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR6') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru2L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR7') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColoru1L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'UR8') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl9L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL1') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl10L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL2') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl11L = diagnosislL.reduce((color, record) => {

  if (record.tooth === 'LL3') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl12L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL4') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl13L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL5') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl14L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL6') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl15L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL7') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl16L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LL8') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl8L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR1') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl7L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR2') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl6L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR3') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl5L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR4') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl4L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR5') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl3L= diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR6') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl2L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR7') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);
const overlayColorl1L = diagnosislL.reduce((color, record) => {
  if (record.tooth === 'LR8') {
    const toothColor = getColorForTooth(record);
    if (toothColor) {        
      return toothColor;
    }
  }
  return color;
}, null);


  

  const overlayStyleu1 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru1 ? `linear-gradient(to top, ${overlayColoru1} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/1.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
    
  };

  const overlayStyleu2 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru2 ? `linear-gradient(to top, ${overlayColoru2} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/2.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu3 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru3 ? `linear-gradient(to top, ${overlayColoru3} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/3.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu4 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru4 ? `linear-gradient(to top, ${overlayColoru4} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/4.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu5 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru5 ? `linear-gradient(to top, ${overlayColoru5} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/5.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu6 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru6 ? `linear-gradient(to top, ${overlayColoru6} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/6.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu7 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru7 ? `linear-gradient(to top, ${overlayColoru7} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/7.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu8 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru8 ? `linear-gradient(to top, ${overlayColoru8} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/8.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu9 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru9 ? `linear-gradient(to top, ${overlayColoru9} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/9.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu10 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru10 ? `linear-gradient(to top, ${overlayColoru10} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/10.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu11 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru11 ? `linear-gradient(to top, ${overlayColoru11} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/11.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu12 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru12 ? `linear-gradient(to top, ${overlayColoru12} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/12.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu13 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru13 ? `linear-gradient(to top, ${overlayColoru13} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/13.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu14 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru14 ? `linear-gradient(to top, ${overlayColoru14} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/14.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu15 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru15 ? `linear-gradient(to top, ${overlayColoru15} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/15.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu16 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru16 ? `linear-gradient(to top, ${overlayColoru16} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/16.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };

  const overlayStyled1 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl1 ? `linear-gradient(to bottom, ${overlayColorl1} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/1.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };

  const overlayStyled2 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl2 ? `linear-gradient(to bottom, ${overlayColorl2} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/2.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled3 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl3 ? `linear-gradient(to bottom, ${overlayColorl3} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/3.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled4 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl4 ? `linear-gradient(to bottom, ${overlayColorl4} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/4.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled5 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl5 ? `linear-gradient(to bottom, ${overlayColorl5} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/5.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled6 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl6 ? `linear-gradient(to bottom, ${overlayColorl6} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/6.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled7 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl7 ? `linear-gradient(to bottom, ${overlayColorl7} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/7.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled8 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl8 ? `linear-gradient(to bottom, ${overlayColorl8} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/8.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled9 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl9 ? `linear-gradient(to bottom, ${overlayColorl9} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/9.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled10 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl10 ? `linear-gradient(to bottom, ${overlayColorl10} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/10.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled11 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl11 ? `linear-gradient(to bottom, ${overlayColorl11} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/11.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled12 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl12 ? `linear-gradient(to bottom, ${overlayColorl12} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/12.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled13 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl13 ? `linear-gradient(to bottom, ${overlayColorl13} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/13.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled14 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl14 ? `linear-gradient(to bottom, ${overlayColorl14} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/14.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled15 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl15 ? `linear-gradient(to bottom, ${overlayColorl15} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/15.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled16 = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl16 ? `linear-gradient(to bottom, ${overlayColorl16} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/16.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };


  //AWDWADWADWADWADWADWADWADWAD


  const overlayStyleu1L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru1L ? `linear-gradient(to top, ${overlayColoru1L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/1.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
    
  };

  const overlayStyleu2L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru2L ? `linear-gradient(to top, ${overlayColoru2L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/2.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu3L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru3L ? `linear-gradient(to top, ${overlayColoru3L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/3.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu4L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru4L ? `linear-gradient(to top, ${overlayColoru4L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/4.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu5L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru5L ? `linear-gradient(to top, ${overlayColoru5L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/5.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu6L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru6L ? `linear-gradient(to top, ${overlayColoru6L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/6.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu7L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru7L ? `linear-gradient(to top, ${overlayColoru7L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/7.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu8L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru8L ? `linear-gradient(to top, ${overlayColoru8L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/8.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu9L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru9L ? `linear-gradient(to top, ${overlayColoru9L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/9.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu10L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru10L ? `linear-gradient(to top, ${overlayColoru10L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/10.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu11L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru11L ? `linear-gradient(to top, ${overlayColoru11L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/11.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu12L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru12L ? `linear-gradient(to top, ${overlayColoru12L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/12.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu13L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru13L ? `linear-gradient(to top, ${overlayColoru13L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/13.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu14L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru14L ? `linear-gradient(to top, ${overlayColoru14L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/14.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu15L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru15L ? `linear-gradient(to top, ${overlayColoru15L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/15.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyleu16L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColoru16L ? `linear-gradient(to top, ${overlayColoru16L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/up/16.png')`, // Ensure this path is correct relative to your setup
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };

  const overlayStyled1L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl1L ? `linear-gradient(to bottom, ${overlayColorl1L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/1.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };

  const overlayStyled2L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl2L ? `linear-gradient(to bottom, ${overlayColorl2L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/2.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled3L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl3L ? `linear-gradient(to bottom, ${overlayColorl3L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/3.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled4L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl4L ? `linear-gradient(to bottom, ${overlayColorl4L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/4.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled5L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl5L ? `linear-gradient(to bottom, ${overlayColorl5L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/5.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled6L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl6L ? `linear-gradient(to bottom, ${overlayColorl6L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/6.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled7L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl7L ? `linear-gradient(to bottom, ${overlayColorl7L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/7.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled8L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl8L ? `linear-gradient(to bottom, ${overlayColorl8L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/8.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled9L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl9L ? `linear-gradient(to bottom, ${overlayColorl9L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/9.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled10L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl10L ? `linear-gradient(to bottom, ${overlayColorl10L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/10.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled11L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl11L ? `linear-gradient(to bottom, ${overlayColorl11L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/11.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled12L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl12L ? `linear-gradient(to bottom, ${overlayColorl12L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/12.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled13L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl13L ? `linear-gradient(to bottom, ${overlayColorl13L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/13.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled14L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl14L ? `linear-gradient(to bottom, ${overlayColorl14L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/14.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled15L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl15L ? `linear-gradient(to bottom, ${overlayColorl15L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/15.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };
  const overlayStyled16L = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: overlayColorl16L ? `linear-gradient(to bottom, ${overlayColorl16L} 50%, rgba(255, 255, 255, 0) 100%)` : 'none',
    maskImage: `url('/Teeth/down/16.png')`, // Ensure this path is correct relative to your setdown
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    pointerEvents: 'none' // Ensure the overlay doesn't block interactions with the image
  };

  const handleClickB = (event, tooth, patientType) => {
    setPopoverState({
      anchorEl: event.currentTarget,
      openPopover: true,
      currentTooth: tooth,
      currentPatientType: patientType
    });
  };

  const handleCloseB = () => {
    setPopoverState({
      ...popoverState,
      anchorEl: null,
      openPopover: false
    });
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', height: loading ? 100 : 835,width: loading ? 100 : 1250, bgcolor: loading ? 'rgba(0, 0, 0, 0)' : '#dae2e9', borderRadius: 5, boxShadow: loading ? 0 : 24, p: 4 }}>
        {loading ? (
          <CircularProgress className='text-white mr-2' />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '10px' }}>
  <div style={{ marginRight: '10px', width: '50%' }}>
    <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '3px', backgroundColor: '#f5f5f5' }}>
      <CustomTypography className="Alexandria mt-7" variant="h6" align="center">
        General Information
      </CustomTypography>
      <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
        <CustomTypography className="Alexandria"></CustomTypography>
        <CustomTypography className="Alexandria"></CustomTypography>
        <CustomTypography className="Alexandria"></CustomTypography>
      </Box>
    </div>
  </div>
  <div style={{ width: '50%' }}>
    <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '3px', backgroundColor: '#f5f5f5' }}>
      <Typography className="Alexandria" variant="h6" component="h3" style={{ marginBottom: '10px' }}>
        Financial Summary
      </Typography>
      <div className="Alexandria" style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
        <div className="Alexandria" style={{ marginBottom: '5px' }}>
          Total Money: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IQD' }).format(totalMoney)}
        </div>
        <div className="Alexandria" style={{ marginBottom: '5px' }}>
          Total Paid: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IQD' }).format(totalPaid)}
        </div>
        <div className="Alexandria">
          Total Remaining: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IQD' }).format(Ftotal)}
        </div>
      </div>
    </div>
  </div>
</div>


            
            <Box sx={{ width: '100%', typography: 'body1' }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleChangeTab} aria-label="lab API tabs example">
            <Tab label="Patient History" value="1" />
            <Tab label="Current Appointment De" value="2" />
            <Tab label="OPG" value="3" />
            <Tab label="Diagnosis Type" value="4" />
            <Tab label="Labratory" value="5" />

          </TabList>
        </Box>
        <TabPanel value="2">
        <Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}>
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Doctor Name</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Select
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          sx={{ flexGrow: 1, backgroundColor: 'white' }}
        >
          {doctors.map((doctor) => (
            <MenuItem key={doctor.id} value={doctor.Name}>
              {doctor.Name}
            </MenuItem>
          ))}
        </Select>
        <Button
          onClick={() => handleUpdateAppointment(selectedPatientId.id, 'doctor', doctorName)}
          sx={{ backgroundColor: '#31b8bd', color: 'white' }}
        >
          Update
        </Button>
      </Box>
    </Box>
  </Grid>
  
  <Grid item xs={12} sm={6} md={4}>
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Status</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        {['Done', 'Pending', 'On Chair', 'Canceled'].map((status) => (
          <Button
            key={status}
            onClick={() => handleUpdateAppointment(selectedPatientId.id, 'Status', status)}
            sx={{ backgroundColor: '#31b8bd', color: 'white' }}
          >
            {status}
          </Button>
        ))}
      </Box>
    </Box>
  </Grid>
  
  <Grid item xs={12} sm={6} md={4}>
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Analysis</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        {['Yes', 'No'].map((analysis) => (
          <Button
            key={analysis}
            onClick={() => handleUpdateAppointment(selectedPatientId.id, 'analy', analysis)}
            sx={{ backgroundColor: '#31b8bd', color: 'white' }}
          >
            {analysis}
          </Button>
        ))}
      </Box>
    </Box>
  </Grid>
  
  <Grid item xs={12} sm={6} md={4}>
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Anesthetic</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        {['Yes', 'No'].map((anesthetic) => (
          <Button
            key={anesthetic}
            onClick={() => handleUpdateAppointment(selectedPatientId.id, 'anesthetic', anesthetic)}
            sx={{ backgroundColor: '#31b8bd', color: 'white' }}
          >
            {anesthetic}
          </Button>
        ))}
      </Box>
    </Box>
  </Grid>
  
  <Grid item xs={12} sm={6} md={4}>
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Money</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          label="Amount"
          value={money}
          onChange={(e) => setMoney(e.target.value)}
          sx={{ flexGrow: 1, backgroundColor: 'white' }}
        />
        <Button
          onClick={() => { handleUpdateAppointment(selectedPatientId.id, 'money', money); setMoney(''); }}
          sx={{ backgroundColor: '#31b8bd', color: 'white' }}
        >
          Update
        </Button>
      </Box>
    </Box>
  </Grid>
</Grid>
        </TabPanel>
        <TabPanel value="3">
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ flex: '1 1 calc(33.33% - 16px)', p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
        {opgImage ? (
        <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '400px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setPanning(false)} // Stop panning if mouse leaves the div
        >
          <img
            src={opgImage}
            alt="OPG Image"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: 'transform 0.2s, filter 0.2s',
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            }}
          />
          <div style={{
  position: 'absolute',
  bottom: '10px',
  width: '100%',
  textAlign: 'center',
  background: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  padding: '10px 0',
  fontSize: '14px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
}}>
  <label style={{
    marginRight: '40px',
    display: 'flex',
    alignItems: 'center'
  }}>
    Brightness
    <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(e.target.value)} style={{ marginLeft: '10px' }} />
  </label>
  <label style={{
    marginRight: '20px',
    display: 'flex',
    alignItems: 'center'
  }}>
    Contrast
    <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(e.target.value)} style={{ marginLeft: '10px' }} />
  </label>
  <button 
  onClick={resetImageAdjustments} 
  style={{ marginLeft: '20px', alignSelf: 'center' }}
>
  Reset
</button>
</div>
        </div>
      ) : (
        <Typography variant="body1" style={{ marginTop: '10px' }}>No OPG image available</Typography>
      )}
              </Box>
        </TabPanel>
        <TabPanel value="4">
                  <Box sx={{ flex: '1 1 calc(33.33% - 16px)', p: 2, border: '1px solid #ccc', borderRadius: 2 }} style={{ marginBottom: '10px', padding: '10px', borderRadius: '3px', backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6">Diagnosis Type</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedPatientId?.type && renderButtons(selectedPatientId.type)}
                    </Box>
                    <Box sx={{ flex: '1 1 calc(33.33% - 16px)', p: 2 }} className="gradient-background">
                      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/1.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR8', selectedPatientId?.type)}
                            />
                            {hasUR8 && <div style={overlayStyleu1} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/1.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR8', selectedPatientId?.type)}
                            />
                            {hasLR8 && <div style={overlayStyled1} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/2.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR7', selectedPatientId?.type)}
                            />
                            {hasUR7 && <div style={overlayStyleu2} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/2.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR7', selectedPatientId?.type)}
                            />
                            {hasLR7 && <div style={overlayStyled2} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/3.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR6', selectedPatientId?.type)}
                            />
                            {hasUR6 && <div style={overlayStyleu3} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/3.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR6', selectedPatientId?.type)}
                            />
                            {hasLR6 && <div style={overlayStyled3} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/4.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR5', selectedPatientId?.type)}
                            />
                            {hasUR5 && <div style={overlayStyleu4} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/4.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR5', selectedPatientId?.type)}
                            />
                            {hasLR5 && <div style={overlayStyled4} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/5.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR4', selectedPatientId?.type)}
                            />
                            {hasUR4 && <div style={overlayStyleu5} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/5.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR4', selectedPatientId?.type)}
                            />
                            {hasLR4 && <div style={overlayStyled5} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/6.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR3', selectedPatientId?.type)}
                            />
                            {hasUR3 && <div style={overlayStyleu6} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/6.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR3', selectedPatientId?.type)}
                            />
                            {hasLR3 && <div style={overlayStyled6} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/7.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR2', selectedPatientId?.type)}
                            />
                            {hasUR2 && <div style={overlayStyleu7} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/7.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR2', selectedPatientId?.type)}
                            />
                            {hasLR2 && <div style={overlayStyled7} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/8.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR1', selectedPatientId?.type)}
                            />
                            {hasUR1 && <div style={overlayStyleu8} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UR1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/8.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR1', selectedPatientId?.type)}
                            />
                            {hasLR1 && <div style={overlayStyled8} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LR1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/9.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL1', selectedPatientId?.type)}
                            />
                            {hasUL1 && <div style={overlayStyleu9} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/9.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL1', selectedPatientId?.type)}
                            />
                            {hasLL1 && <div style={overlayStyled9} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/10.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL2', selectedPatientId?.type)}
                            />
                            {hasUL2 && <div style={overlayStyleu10} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/10.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL2', selectedPatientId?.type)}
                            />
                            {hasLL2 && <div style={overlayStyled10} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/11.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL3', selectedPatientId?.type)}
                            />
                            {hasUL3 && <div style={overlayStyleu11} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/11.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL3', selectedPatientId?.type)}
                            />
                            {hasLL3 && <div style={overlayStyled11} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/12.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL4', selectedPatientId?.type)}
                            />
                            {hasUL4 && <div style={overlayStyleu12} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/12.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL4', selectedPatientId?.type)}
                            />
                            {hasLL4 && <div style={overlayStyled12} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/13.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL5', selectedPatientId?.type)}
                            />
                            {hasUL5 && <div style={overlayStyleu13} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/13.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL5', selectedPatientId?.type)}
                            />
                            {hasLL5 && <div style={overlayStyled13} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/14.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL6', selectedPatientId?.type)}
                            />
                            {hasUL6 && <div style={overlayStyleu14} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/14.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL6', selectedPatientId?.type)}
                            />
                            {hasLL6 && <div style={overlayStyled14} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/15.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL7', selectedPatientId?.type)}
                            />
                            {hasUL7 && <div style={overlayStyleu15} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/15.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL7', selectedPatientId?.type)}
                            />
                            {hasLL7 && <div style={overlayStyled15} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/16.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL8', selectedPatientId?.type)}
                            />
                            {hasUL8 && <div style={overlayStyleu16} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'UL8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/16.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL8', selectedPatientId?.type)}
                            />
                            {hasLL8 && <div style={overlayStyled16} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopover(selectedPatientId.type, 'LL8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        {/* Additional images and popovers here */}
                      </Box>
                    </Box>
                  </Box>
                </TabPanel>
                <TabPanel value="5">
                  <Box sx={{ flex: '1 1 calc(33.33% - 16px)', p: 2, border: '1px solid #ccc', borderRadius: 2 }} style={{ marginBottom: '10px', padding: '10px', borderRadius: '3px', backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6">Labratory</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedPatientId?.type && renderButtonsL(selectedPatientId.type)}
                    </Box>
                    <Box sx={{ flex: '1 1 calc(33.33% - 16px)', p: 2 }} className="gradient-background">
                      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/1.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR8', selectedPatientId?.type)}
                            />
                            {hasUR8L && <div style={overlayStyleu1L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/1.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR8', selectedPatientId?.type)}
                            />
                            {hasLR8L && <div style={overlayStyled1L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/2.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR7', selectedPatientId?.type)}
                            />
                            {hasUR7L && <div style={overlayStyleu2L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/2.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR7', selectedPatientId?.type)}
                            />
                            {hasLR7L && <div style={overlayStyled2L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/3.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR6', selectedPatientId?.type)}
                            />
                            {hasUR6L && <div style={overlayStyleu3L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/3.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR6', selectedPatientId?.type)}
                            />
                            {hasLR6L && <div style={overlayStyled3L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/4.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR5', selectedPatientId?.type)}
                            />
                            {hasUR5L && <div style={overlayStyleu4L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/4.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR5', selectedPatientId?.type)}
                            />
                            {hasLR5L && <div style={overlayStyled4L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/5.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR4', selectedPatientId?.type)}
                            />
                            {hasUR4L && <div style={overlayStyleu5L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/5.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR4', selectedPatientId?.type)}
                            />
                            {hasLR4L && <div style={overlayStyled5L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/6.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR3', selectedPatientId?.type)}
                            />
                            {hasUR3L && <div style={overlayStyleu6L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/6.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR3', selectedPatientId?.type)}
                            />
                            {hasLR3L && <div style={overlayStyled6L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/7.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR2', selectedPatientId?.type)}
                            />
                            {hasUR2L && <div style={overlayStyleu7L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/7.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR2', selectedPatientId?.type)}
                            />
                            {hasLR2L && <div style={overlayStyled7L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/8.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UR1', selectedPatientId?.type)}
                            />
                            {hasUR1L && <div style={overlayStyleu8L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UR1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UR1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/8.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LR1', selectedPatientId?.type)}
                            />
                            {hasLR1L && <div style={overlayStyled8L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LR1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LR1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/9.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL1', selectedPatientId?.type)}
                            />
                            {hasUL1L && <div style={overlayStyleu9L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/9.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL1', selectedPatientId?.type)}
                            />
                            {hasLL1L && <div style={overlayStyled9L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL1'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL1', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/10.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL2', selectedPatientId?.type)}
                            />
                            {hasUL2L && <div style={overlayStyleu10L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/10.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL2', selectedPatientId?.type)}
                            />
                            {hasLL2L && <div style={overlayStyled10L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL2'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL2', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/11.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL3', selectedPatientId?.type)}
                            />
                            {hasUL3L && <div style={overlayStyleu11L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/11.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL3', selectedPatientId?.type)}
                            />
                            {hasLL3L && <div style={overlayStyled11L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL3'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL3', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/12.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL4', selectedPatientId?.type)}
                            />
                            {hasUL4L && <div style={overlayStyleu12L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/12.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL4', selectedPatientId?.type)}
                            />
                            {hasLL4L && <div style={overlayStyled12L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL4'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL4', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/13.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL5', selectedPatientId?.type)}
                            />
                            {hasUL5L && <div style={overlayStyleu13L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/13.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL5', selectedPatientId?.type)}
                            />
                            {hasLL5L && <div style={overlayStyled13L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL5'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL5', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/14.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL6', selectedPatientId?.type)}
                            />
                            {hasUL6L && <div style={overlayStyleu14L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/14.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL6', selectedPatientId?.type)}
                            />
                            {hasLL6L && <div style={overlayStyled14L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL6'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL6', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/15.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL7', selectedPatientId?.type)}
                            />
                            {hasUL7L && <div style={overlayStyleu15L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/15.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL7', selectedPatientId?.type)}
                            />
                            {hasLL7L && <div style={overlayStyled15L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL7'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL7', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        <div className="image-container">
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/up/16.png`} // Replace with your image source
                              alt={`Shape Up ur1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'UL8', selectedPatientId?.type)}
                            />
                            {hasUL8L && <div style={overlayStyleu16L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'UL8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'UL8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                          <div style={containerStyle}>
                            <img
                              src={`/Teeth/down/16.png`}
                              alt={`Shape Up lr1}`}
                              className="interactive-image"
                              onClick={(e) => handleClickB(e, 'LL8', selectedPatientId?.type)}
                            />
                            {hasLL8L && <div style={overlayStyled16L} />}
                            <Popover
                              id={popoverState.openPopover ? 'simple-popover' : undefined}
                              open={popoverState.openPopover && popoverState.currentTooth === 'LL8'}
                              anchorEl={popoverState.anchorEl}
                              onClose={handleCloseB}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                              }}
                            >
                              {selectedPatientId?.type && renderPopoverL(selectedPatientId.type, 'LL8', selectedPatientId?.Pid, selectedPatientId?.id, selectedPatientId?.type)}
                            </Popover>
                          </div>
                        </div>
                        {/* Additional images and popovers here */}
                      </Box>
                    </Box>
                  </Box>
                </TabPanel>
      <TabPanel value='1'>
      <Typography style={{ marginBottom: '5px' }} className="Alexandria" variant="h6" component="h3" mb={2}>Appointments</Typography>
            <Paper sx={{ marginBottom: '20px', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 350, overflowX: 'auto' }}>
                <Table stickyHeader aria-label="sticky table">
                  <TableHead>
                    <TableRow>
                    <TableCell className="Alexandria" align="center" style={{ minWidth: 100, backgroundColor: '#2c2c4d', color: 'white' }}>ID</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 100, backgroundColor: '#2c2c4d', color: 'white' }}>Appointment Date</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white' }}>Status</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white' }}>Type</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white' }}>Analysis</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white' }}>Money</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 50, backgroundColor: '#2c2c4d', color: 'white' }}>Doctor</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 100, backgroundColor: '#2c2c4d', color: 'white' }}>Note</TableCell>
                      <TableCell className="Alexandria" align="center" style={{ minWidth: 100, backgroundColor: '#2c2c4d', color: 'white' }}>Action</TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {appointments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((roww) => (
                      <TableRow hover role="checkbox" tabIndex={-1} key={roww.id}>
                        <TableCell align="center" className="Alexandria">{roww.id}</TableCell>
                        <TableCell align="center" className="Alexandria">{dateformatter(roww.dt)}</TableCell>
                        <TableCell align="center" className="Alexandria">
                          <span align="center" className="Alexandria" style={{ borderRadius: '5px', padding: '1px 15px', color: getStatusTextColor(roww.Status), backgroundColor: getStatusColor(roww.Status) }}>{roww.Status}</span>
                        </TableCell>
                        <TableCell align="center" className="Alexandria">{roww.type}</TableCell>
                        <TableCell align="center" className="Alexandria">{roww.analy}</TableCell>
                        <TableCell align="center" className="Alexandria">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IQD' }).format(roww.money)}</TableCell>
                        <TableCell align="center" className="Alexandria">{roww.doctor}</TableCell>
                        <TableCell align="center" className="Alexandria">{roww.note}</TableCell>
                        <TableCell align="center">
                          <div className='flex justify-center'>
                            <div className='cursor-pointer text-blue-700 mr-2' onClick={() => handleViewAppointment(roww.id)}>
                              <RemoveRedEyeIcon />
                            </div>                          
                            </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {appointments.length === 0 ? <EmptyTableRow colSpan={9} /> : null}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={appointments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
      </TabPanel>
      </TabContext>
    </Box>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                style={{
                  color: loading ? 'rgba(0, 0, 0, 0)' : '#ffffff',
                  backgroundColor: loading ? 'rgba(0, 0, 0, 0)' : '#2e6da4',
                  boxShadow: loading ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                  borderRadius: '5px',
                  padding: '10px 20px',
                  textTransform: 'none',
                }}
                
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default AppointView;
