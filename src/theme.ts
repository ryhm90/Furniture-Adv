import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  direction: "rtl",
  shape: {
    borderRadius: 10,
  },
  palette: {
    background: {
      default: "#f3f7f7",
      paper: "#ffffff",
    },
    primary: {
      main: "#2563eb",
    },
  },
  typography: {
    fontFamily: "Alexandria, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "Alexandria, sans-serif",
        },
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 600,
          gap: 8,
          textTransform: "none",
        },
        startIcon: {
          marginInlineStart: 0,
          marginInlineEnd: 0,
        },
        endIcon: {
          marginInlineStart: 0,
          marginInlineEnd: 0,
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: "Alexandria, sans-serif",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: "Alexandria, sans-serif",
        },
        input: {
          fontFamily: "Alexandria, sans-serif",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#ffffff",
          "& fieldset": {
            borderColor: "rgba(15, 23, 42, 0.18)",
          },
          "&:hover fieldset": {
            borderColor: "rgba(37, 99, 235, 0.45)",
          },
          "&.Mui-focused fieldset": {
            borderWidth: 2,
            borderColor: "#2563eb",
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          "&:hover": {
            backgroundColor: "#ffffff",
          },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: "Alexandria, sans-serif",
        },
      },
    },
  },
});

export default theme;
