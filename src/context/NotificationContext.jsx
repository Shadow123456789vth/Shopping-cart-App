import { createContext, useCallback, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotificationContext = createContext(() => {});

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState({ message: '', severity: 'success', key: 0 });
  const [open, setOpen] = useState(false);

  const notify = useCallback((message, severity = 'success') => {
    setToast({ message, severity, key: Date.now() });
    setOpen(true);
  }, []);

  const close = (_, reason) => {
    if (reason !== 'clickaway') setOpen(false);
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar key={toast.key} open={open} autoHideDuration={3500} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={close} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export const useNotify = () => useContext(NotificationContext);
