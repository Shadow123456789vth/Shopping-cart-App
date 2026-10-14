import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Divider, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useCart } from '../context/CartContext';
import { useNotify } from '../context/NotificationContext';
import ProductImage from '../components/ProductImage';
import QuantitySelect from '../components/QuantitySelect';
import OrderSummary from '../components/OrderSummary';
import { formatPrice } from '../utils/format';
import { FREE_SHIPPING_THRESHOLD } from '../config';

export default function CartPage() {
  const { items, loading, count, totals, updateQuantity, removeItem, refresh } = useCart();
  const notify = useNotify();
  const navigate = useNavigate();

  const run = async (fn, message) => {
    try {
      await fn();
      if (message) notify(message);
    } catch (err) {
      notify(err.message, 'error');
      refresh();
    }
  };

  if (loading && !items.length) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  if (!items.length) {
    return (
      <Paper sx={{ p: 5, textAlign: 'center' }}>
        <ShoppingCartOutlinedIcon sx={{ fontSize: 64, color: '#BBB' }} />
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>Your ShopNow Cart is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Shop today&apos;s deals and add items to your cart.</Typography>
        <Button variant="contained" color="secondary" component={RouterLink} to="/">Continue shopping</Button>
      </Paper>
    );
  }

  const stockProblem = items.some((i) => i.quantity > i.stock);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h4" fontWeight={500}>Shopping Cart</Typography>
          <Typography variant="body2" color="text.secondary" align="right">Price</Typography>
          <Divider />
          {items.map((item) => (
            <Box key={item.id}>
              <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
                <Box component={RouterLink} to={`/product/${item.productId}`} sx={{ width: { xs: 96, sm: 160 }, flexShrink: 0 }}>
                  <ProductImage src={item.imageUrl} alt={item.name} height={140} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Link component={RouterLink} to={`/product/${item.productId}`} color="inherit" underline="hover" variant="h6" sx={{ fontSize: 18, display: 'block' }}>
                    {item.name}
                  </Link>
                  {item.brand && <Typography variant="caption" color="text.secondary">{item.brand}</Typography>}
                  <Typography variant="body2" sx={{ color: item.stock > 0 ? 'success.main' : 'error.main' }}>
                    {item.stock > 0 ? (item.stock < 10 ? `Only ${item.stock} left in stock` : 'In stock') : 'Out of stock'}
                  </Typography>
                  {item.quantity > item.stock && item.stock > 0 && (
                    <Typography variant="body2" color="error">Only {item.stock} available. Reduce quantity to continue.</Typography>
                  )}
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} divider={<Divider orientation="vertical" flexItem />}>
                    <QuantitySelect
                      value={item.quantity}
                      max={item.stock}
                      disabled={item.stock <= 0}
                      onChange={(q) => run(() => updateQuantity(item.id, q))}
                    />
                    <Link component="button" variant="body2" onClick={() => run(() => removeItem(item.id), 'Removed from cart')}>Delete</Link>
                  </Stack>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography fontWeight={700}>{formatPrice(item.price * item.quantity)}</Typography>
                  {item.quantity > 1 && <Typography variant="caption" color="text.secondary">{formatPrice(item.price)} each</Typography>}
                </Box>
              </Box>
              <Divider />
            </Box>
          ))}
          <Typography align="right" variant="h6" sx={{ mt: 1.5 }}>
            Subtotal ({count} item{count === 1 ? '' : 's'}): <b>{formatPrice(totals.subtotal)}</b>
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        {totals.subtotal < FREE_SHIPPING_THRESHOLD && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Add {formatPrice(FREE_SHIPPING_THRESHOLD - totals.subtotal)} more for FREE delivery.
          </Alert>
        )}
        <OrderSummary totals={totals} itemCount={count}>
          <Button variant="contained" color="secondary" fullWidth disabled={stockProblem} onClick={() => navigate('/checkout')}>
            Proceed to Buy
          </Button>
        </OrderSummary>
      </Grid>
    </Grid>
  );
}
