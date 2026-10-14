import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, CircularProgress, Divider, Grid, Paper, Typography } from '@mui/material';
import { getOrder } from '../services/orderService';
import { listPayments, PAYMENT_METHODS } from '../services/paymentService';
import ProductImage from '../components/ProductImage';
import StatusChip from '../components/StatusChip';
import OrderSummary from '../components/OrderSummary';
import { formatDate, formatPrice } from '../utils/format';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('placed') === '1';
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getOrder(id), listPayments(id)])
      .then(([o, p]) => {
        setOrder(o);
        setPayments(p);
      })
      .catch((err) => setError(err.status === 404 ? 'Order not found.' : err.message));
  }, [id]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!order) return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;

  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {justPlaced && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Order placed, thank you!</AlertTitle>
          Your order <b>{order.number}</b> has been placed. A confirmation will be available in Your Orders.
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" fontWeight={500}>Order Details</Typography>
        <StatusChip status={order.status} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ordered on {formatDate(order.createdOn)} · Order # {order.number}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Shipping Address</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{order.shippingAddress}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Payment</Typography>
                {payments.length === 0 && <Typography variant="body2" color="text.secondary">No payment recorded.</Typography>}
                {payments.map((p) => (
                  <Box key={p.id} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {PAYMENT_METHODS[p.method] || p.method}
                      {p.cardLast4 && ` · ${p.cardBrand} ••••${p.cardLast4}`}
                      {p.upiId && ` · ${p.upiId}`}
                    </Typography>
                    <Typography variant="caption" color={p.status === 'failed' ? 'error' : 'text.secondary'}>
                      {p.status.toUpperCase()} · {formatPrice(p.amount)} · {p.transactionId}
                      {p.failureReason && ` · ${p.failureReason}`}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>Items</Typography>
            {order.items.map((item, idx) => (
              <Box key={item.id}>
                {idx > 0 && <Divider />}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1.5 }}>
                  <Box sx={{ width: 90, flexShrink: 0 }}><ProductImage src={item.imageUrl} alt={item.name} height={90} /></Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography component={RouterLink} to={`/product/${item.productId}`} fontWeight={500} sx={{ color: 'primary.main', textDecoration: 'none' }}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Qty: {item.quantity} · {formatPrice(item.unitPrice)} each</Typography>
                  </Box>
                  <Typography fontWeight={700}>{formatPrice(item.lineTotal)}</Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <OrderSummary totals={order} itemCount={itemCount} title="Order Summary">
            <Button fullWidth variant="contained" color="secondary" component={RouterLink} to="/">Continue shopping</Button>
            <Button fullWidth sx={{ mt: 1 }} component={RouterLink} to="/orders">View all orders</Button>
          </OrderSummary>
        </Grid>
      </Grid>
    </Box>
  );
}
