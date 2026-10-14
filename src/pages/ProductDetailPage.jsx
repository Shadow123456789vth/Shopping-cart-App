import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Breadcrumbs, Button, CircularProgress, Divider, Grid, Link, Paper, Rating, Stack, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ProductImage from '../components/ProductImage';
import Price from '../components/Price';
import QuantitySelect from '../components/QuantitySelect';
import { getProduct } from '../services/productService';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';
import { useNotify } from '../context/NotificationContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const notify = useNotify();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProduct(null);
    setError('');
    setQty(1);
    getProduct(id).then(setProduct).catch((err) => setError(err.status === 404 ? 'Product not found.' : err.message));
  }, [id]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;

  const inStock = product.stock > 0;

  const add = async (goToCheckout) => {
    setBusy(true);
    try {
      await addItem(product, qty);
      if (goToCheckout) navigate('/checkout');
      else notify(`Added ${qty} × "${product.name}" to cart`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" underline="hover" color="inherit">Home</Link>
        {product.categoryName && (
          <Link component={RouterLink} to={`/?category=${product.categoryId}`} underline="hover" color="inherit">{product.categoryName}</Link>
        )}
        <Typography color="text.primary" noWrap sx={{ maxWidth: 240 }}>{product.name}</Typography>
      </Breadcrumbs>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <ProductImage src={product.imageUrl} alt={product.name} height={420} sx={{ borderRadius: 2 }} />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={500}>{product.name}</Typography>
            {product.brand && <Typography variant="body2" color="primary">Brand: {product.brand}</Typography>}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
              <Typography variant="body2">{product.rating.toFixed(1)}</Typography>
              <Rating value={product.rating} precision={0.5} size="small" readOnly />
              <Typography variant="body2" color="primary">{product.ratingCount.toLocaleString()} ratings</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Price price={product.price} mrp={product.mrp} size="large" />
            <Typography variant="caption" color="text.secondary">Inclusive of all taxes</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={700}>About this item</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{product.description}</Typography>
            {product.sku && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>SKU: {product.sku}</Typography>}
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={500}>{formatPrice(product.price)}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 1 }}>
                <LocalShippingOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="body2">FREE delivery on orders over ₹499</Typography>
              </Stack>
              <Typography variant="h6" sx={{ color: inStock ? (product.stock < 10 ? 'price.main' : 'success.main') : 'error.main', my: 1 }}>
                {inStock ? (product.stock < 10 ? `Only ${product.stock} left in stock` : 'In stock') : 'Currently unavailable'}
              </Typography>
              {inStock && (
                <Stack spacing={1.5}>
                  <QuantitySelect value={qty} max={product.stock} onChange={setQty} />
                  <Button variant="contained" color="secondary" fullWidth disabled={busy} onClick={() => add(false)}>Add to Cart</Button>
                  <Button variant="contained" color="warning" fullWidth disabled={busy} onClick={() => add(true)}>Buy Now</Button>
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <VerifiedUserOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="caption" color="text.secondary">Secure transaction</Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
