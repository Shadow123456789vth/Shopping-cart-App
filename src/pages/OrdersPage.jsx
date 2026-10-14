import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Divider, Grid, Paper, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { listOrders } from '../services/orderService';
import ProductImage from '../components/ProductImage';
import StatusChip from '../components/StatusChip';
import { formatDate, formatPrice } from '../utils/format';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listOrders(user.id).then(setOrders).catch((err) => setError(err.message));
  }, [user.id]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!orders) return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={500} sx={{ mb: 2 }}>Your Orders</Typography>
      {!orders.length && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>You haven&apos;t placed any orders yet.</Typography>
          <Button variant="contained" color="secondary" component={RouterLink} to="/">Start shopping</Button>
        </Paper>
      )}
      {orders.map((order) => (
        <Paper key={order.id} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
          <Grid container spacing={2} sx={{ bgcolor: '#F0F2F2', px: 2, py: 1.5 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">ORDER PLACED</Typography>
              <Typography variant="body2">{formatDate(order.createdOn)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">TOTAL</Typography>
              <Typography variant="body2">{formatPrice(order.total)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">STATUS</Typography>
              <Box><StatusChip status={order.status} /></Box>
            </Grid>
            <Grid item xs={6} sm={3} sx={{ textAlign: { sm: 'right' } }}>
              <Typography variant="caption" color="text.secondary">ORDER # {order.number}</Typography>
              <Box><Button size="small" component={RouterLink} to={`/orders/${order.id}`}>View order details</Button></Box>
            </Grid>
          </Grid>
          <Divider />
          <Box sx={{ p: 2 }}>
            {order.items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1 }}>
                <Box sx={{ width: 80, flexShrink: 0 }}><ProductImage src={item.imageUrl} alt={item.name} height={80} /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography component={RouterLink} to={`/product/${item.productId}`} variant="body2" fontWeight={500} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">Qty: {item.quantity} · {formatPrice(item.unitPrice)} each</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700}>{formatPrice(item.lineTotal)}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
