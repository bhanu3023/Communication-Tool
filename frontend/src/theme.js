import { createTheme } from '@mui/material/styles';

// CloudFuze brand palette. Primary is the CloudFuze indigo sampled from the logo (#3000ae).
const theme = createTheme({
  palette: {
    primary: { main: '#3000ae', light: '#6536d6', dark: '#20007a', contrastText: '#fff' },
    secondary: { main: '#00acc1' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    error: { main: '#c62828' },
    background: { default: '#f4f7fb', paper: '#ffffff' },
    text: { primary: '#1a2233', secondary: '#5a6b85' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 4px 20px rgba(48, 0, 174, 0.08)', border: '1px solid #eef2f8' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default theme;
