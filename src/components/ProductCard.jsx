import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, Chip, Rating, Typography } from '@mui/material';
import ProductImage from './ProductImage';
import Price from './Price';
import { useCart } from '../context/CartContext';
import { useNotify } from '../context/NotificationContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const notify = useNotify();
  const [adding, setAdding] = useState(false);
  const outOfStock = product.stock <= 0;

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addItem(product, 1);
      notify(`Added "${product.name}" to cart`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea component={RouterLink} to={`/product/${product.id}`} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ position: 'relative' }}>
          <ProductImage src={product.imageUrl} alt={product.name} />
          {product.featured && (
            <Chip label="Best seller" size="small" sx={{ position: 'absolute', top: 8, left: 8, bgcolor: '#E47911', color: '#fff', borderRadius: 1 }} />
          )}
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Typography
            variant="body1"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 48, '&:hover': { color: '#C7511F' } }}
          >
            {product.name}
          </Typography>
          {product.brand && (
            <Typography variant="caption" color="text.secondary">{product.brand}</Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, my: 0.5 }}>
            <Rating value={product.rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="primary">{product.ratingCount.toLocaleString()}</Typography>
          </Box>
          <Price price={product.price} mrp={product.mrp} />
          <Typography variant="caption" color={outOfStock ? 'error' : product.stock < 10 ? 'price.main' : 'text.secondary'}>
            {outOfStock ? 'Currently unavailable' : product.stock < 10 ? `Only ${product.stock} left in stock` : 'FREE delivery on orders over ₹499'}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Box sx={{ px: 2, pb: 2 }}>
        <Button variant="contained" color="secondary" fullWidth disabled={outOfStock || adding} onClick={handleAdd}>
          {adding ? 'Adding…' : 'Add to cart'}
        </Button>
      </Box>
    </Card>
  );
}
