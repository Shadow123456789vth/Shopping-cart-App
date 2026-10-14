import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { canUseLocalLogin } from '../services/authService';
import Logo from '../components/Logo';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';
  if (!loading && user) return <Navigate to={from} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !password) {
      setError('Enter your user name and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(userName.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Invalid user name or password.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, px: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Logo dark size={32} />
      </Box>

      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 360, p: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={500} gutterBottom>Sign in</Typography>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>
        ) : canUseLocalLogin() ? (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Alert severity="info" sx={{ mb: 2 }}>
              Local dev: sign in with your ServiceNow user. Credentials go through the Vite proxy as Basic auth.
            </Alert>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              label="User name"
              fullWidth
              size="small"
              margin="dense"
              autoComplete="username"
              autoFocus
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <TextField
              label="Password"
              fullWidth
              size="small"
              margin="dense"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>
        ) : (
          <Alert severity="warning">
            Your ServiceNow session has expired. <a href="/login.do">Sign in to ServiceNow</a> and reopen the store.
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          By continuing, you agree to ShopNow&apos;s demo Conditions of Use. Payments are simulated.
        </Typography>
      </Paper>
    </Box>
  );
}
