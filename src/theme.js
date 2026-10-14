import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#007185', contrastText: '#ffffff' },
    secondary: { main: '#FFD814', dark: '#F7CA00', contrastText: '#0F1111' },
    warning: { main: '#FFA41C', contrastText: '#0F1111' },
    nav: { main: '#131921', light: '#232F3E', accent: '#FEBD69' },
    price: { main: '#B12704' },
    background: { default: '#EAEDED', paper: '#ffffff' },
    text: { primary: '#0F1111', secondary: '#565959' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Amazon Ember", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid #DDD' } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});

export default theme;
