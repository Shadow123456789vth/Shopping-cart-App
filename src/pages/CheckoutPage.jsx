import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Divider, FormControlLabel, Grid, Paper, Radio, RadioGroup, Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotify } from '../context/NotificationContext';
import AddressDialog from '../components/AddressDialog';
import OrderSummary from '../components/OrderSummary';
import ProductImage from '../components/ProductImage';
import { createAddress, listAddresses } from '../services/addressService';
import { createOrder } from '../services/orderService';
import {
  detectCardBrand, digitsOnly, luhnValid, payForOrder, PAYMENT_METHODS, UPI_PATTERN, validateExpiry,
} from '../services/paymentService';
import { formatAddress, formatPrice } from '../utils/format';

const STEPS = ['Delivery address', 'Payment method', 'Review & place order'];

const EMPTY_PAYMENT = { cardNumber: '', cardName: '', expiry: '', cvv: '', upiId: '' };

function formatCardNumber(value) {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const d = digitsOnly(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, count, totals, loading: cartLoading, refresh, clear } = useCart();
  const notify = useNotify();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [method, setMethod] = useState('card');
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [paymentErrors, setPaymentErrors] = useState({});

  const [pendingOrder, setPendingOrder] = useState(null); // kept so a failed payment can be retried
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listAddresses(user.id)
      .then((list) => {
        setAddresses(list);
        setAddressId((list.find((a) => a.isDefault) || list[0])?.id || '');
        if (!list.length) setDialogOpen(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setAddressesLoading(false));
  }, [user.id]);

  if (!cartLoading && !items.length && !pendingOrder) return <Navigate to="/cart" replace />;

  const address = addresses.find((a) => a.id === addressId);

  const handleSaveAddress = async (form) => {
    try {
      const created = await createAddress(user.id, form, addresses);
      setAddresses((prev) => [created, ...prev.map((a) => (created.isDefault ? { ...a, isDefault: false } : a))]);
      setAddressId(created.id);
      setDialogOpen(false);
      notify('Address saved');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const setPay = (field, formatter) => (e) => setPayment((p) => ({ ...p, [field]: formatter ? formatter(e.target.value) : e.target.value }));

  const validatePayment = () => {
    const errs = {};
    if (method === 'card') {
      if (!luhnValid(payment.cardNumber)) errs.cardNumber = 'Enter a valid card number';
      if (!payment.cardName.trim()) errs.cardName = 'Enter the name on the card';
      if (!validateExpiry(payment.expiry)) errs.expiry = 'Invalid or expired (MM/YY)';
      if (!/^\d{3,4}$/.test(payment.cvv)) errs.cvv = '3 or 4 digits';
    }
    if (method === 'upi' && !UPI_PATTERN.test(payment.upiId.trim())) errs.upiId = 'Enter a valid UPI ID, e.g. name@okbank';
    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    setError('');
    if (step === 0 && !address) {
      setError('Select or add a delivery address.');
      return;
    }
    if (step === 1 && !validatePayment()) return;
    setStep((s) => s + 1);
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const order = pendingOrder || (await createOrder({ userId: user.id, cartItems: items, address }));
      setPendingOrder(order);

      const result = await payForOrder({
        order,
        userId: user.id,
        method,
        details: { cardNumber: payment.cardNumber, upiId: payment.upiId.trim() },
      });

      if (result.status === 'failed') {
        setError(`Payment failed: ${result.failureReason || 'please try another method'}. Your order ${order.number} is saved; you can retry.`);
        setStep(1);
        return;
      }

      // The server-side business rule clears the cart; clear() is a fallback if it isn't installed.
      await clear().catch(() => refresh());
      setPayment(EMPTY_PAYMENT);
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const displayTotals = pendingOrder || totals;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h4" fontWeight={500} sx={{ mb: 2 }}>Checkout</Typography>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {step === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Choose a delivery address</Typography>
              {addressesLoading ? (
                <CircularProgress size={24} />
              ) : (
                <RadioGroup value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((a) => (
                    <Paper
                      key={a.id}
                      variant="outlined"
                      sx={{ mb: 1.5, p: 1.5, borderColor: a.id === addressId ? 'warning.main' : undefined, bgcolor: a.id === addressId ? '#FCF5EE' : undefined }}
                    >
                      <FormControlLabel
                        value={a.id}
                        control={<Radio />}
                        sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                        label={(
                          <Box sx={{ pt: 1 }}>
                            <Typography fontWeight={700}>{a.fullName}{a.isDefault ? ' · Default' : ''}</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{formatAddress({ ...a, fullName: '' })}</Typography>
                          </Box>
                        )}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              )}
              <Button startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add a new address</Button>
            </Box>
          )}

          {step === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Payment method</Typography>
              {pendingOrder && <Alert severity="info" sx={{ mb: 2 }}>Retrying payment for order {pendingOrder.number}.</Alert>}
              <RadioGroup value={method} onChange={(e) => { setMethod(e.target.value); setPaymentErrors({}); }}>
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                  <FormControlLabel key={key} value={key} control={<Radio />} label={label} />
                ))}
              </RadioGroup>
              <Divider sx={{ my: 2 }} />

              {method === 'card' && (
                <Grid container spacing={2} sx={{ maxWidth: 520 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth size="small" label="Card number" value={payment.cardNumber} onChange={setPay('cardNumber', formatCardNumber)}
                      error={!!paymentErrors.cardNumber} helperText={paymentErrors.cardNumber || (payment.cardNumber ? detectCardBrand(payment.cardNumber) : 'Test: 4111 1111 1111 1111 (ends in 0002 = decline)')}
                      inputProps={{ inputMode: 'numeric', autoComplete: 'cc-number' }}
                      InputProps={{ startAdornment: <CreditCardIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="Name on card" value={payment.cardName} onChange={setPay('cardName')} error={!!paymentErrors.cardName} helperText={paymentErrors.cardName} inputProps={{ autoComplete: 'cc-name' }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="Expiry (MM/YY)" value={payment.expiry} onChange={setPay('expiry', formatExpiry)} error={!!paymentErrors.expiry} helperText={paymentErrors.expiry} inputProps={{ inputMode: 'numeric', autoComplete: 'cc-exp' }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth size="small" label="CVV" type="password" value={payment.cvv} onChange={setPay('cvv', (v) => digitsOnly(v).slice(0, 4))} error={!!paymentErrors.cvv} helperText={paymentErrors.cvv} inputProps={{ inputMode: 'numeric', autoComplete: 'cc-csc' }} />
                  </Grid>
                </Grid>
              )}
              {method === 'upi' && (
                <TextField
                  size="small" label="UPI ID" value={payment.upiId} onChange={setPay('upiId')} sx={{ maxWidth: 360 }} fullWidth
                  error={!!paymentErrors.upiId} helperText={paymentErrors.upiId || 'e.g. name@okbank ("fail@upi" simulates a decline)'}
                />
              )}
              {method === 'cod' && (
                <Alert severity="info">Pay with cash or UPI when your order is delivered.</Alert>
              )}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, color: 'text.secondary' }}>
                <LockOutlinedIcon fontSize="small" />
                <Typography variant="caption">Demo gateway: card number and CVV never leave your browser. Only the brand and last 4 digits are stored.</Typography>
              </Stack>
            </Box>
          )}

          {step === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Review your order</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Delivering to</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{address && formatAddress(address)}</Typography>
                  <Button size="small" onClick={() => setStep(0)}>Change</Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Paying with</Typography>
                  <Typography variant="body2">
                    {method === 'card' ? `${detectCardBrand(payment.cardNumber)} ending in ${digitsOnly(payment.cardNumber).slice(-4)}` : method === 'upi' ? `UPI: ${payment.upiId}` : 'Cash on Delivery'}
                  </Typography>
                  <Button size="small" onClick={() => setStep(1)}>Change</Button>
                </Grid>
              </Grid>
              <Divider />
              {items.map((i) => (
                <Box key={i.id} sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'center' }}>
                  <Box sx={{ width: 64, flexShrink: 0 }}><ProductImage src={i.imageUrl} alt={i.name} height={64} /></Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>{i.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Qty: {i.quantity}</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>{formatPrice(i.price * i.quantity)}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={step === 0 || placing} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 2 ? (
              <Button variant="contained" color="secondary" onClick={next}>Continue</Button>
            ) : (
              <Button variant="contained" color="secondary" onClick={placeOrder} disabled={placing} startIcon={placing && <CircularProgress size={16} />}>
                {placing ? 'Processing payment…' : method === 'cod' ? 'Place your order' : `Pay ${formatPrice(displayTotals.total)}`}
              </Button>
            )}
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <OrderSummary totals={displayTotals} itemCount={count} />
      </Grid>

      <AddressDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSaveAddress} defaultName={user.name} />
    </Grid>
  );
}
