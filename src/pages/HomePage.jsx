import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Grid, MenuItem, Paper, Skeleton, TextField, Typography } from '@mui/material';
import ProductCard from '../components/ProductCard';
import useCategories from '../hooks/useCategories';
import { listProducts, SORT_OPTIONS } from '../services/productService';
import { PAGE_SIZE } from '../config';

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const categories = useCategories();
  const search = params.get('q') || '';
  const categoryId = params.get('category') || '';
  const sort = params.get('sort') || 'featured';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listProducts({ search, categoryId, sort, limit: PAGE_SIZE, offset: 0 })
      .then((res) => {
        if (!active) return;
        setProducts(res.products);
        setTotal(res.total);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [search, categoryId, sort]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await listProducts({ search, categoryId, sort, limit: PAGE_SIZE, offset: products.length });
      setProducts((prev) => [...prev, ...res.products]);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const category = categories.find((c) => c.id === categoryId);
  const showHero = !search && !categoryId;

  return (
    <Box>
      {showHero && (
        <Paper
          sx={{
            mb: 3, p: { xs: 3, md: 5 }, borderRadius: 2, color: '#fff',
            background: 'linear-gradient(120deg, #232F3E 0%, #37475A 55%, #007185 100%)',
          }}
        >
          <Typography variant="overline" sx={{ color: 'nav.accent', fontWeight: 700 }}>Great Festive Sale</Typography>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: 26, md: 36 } }}>Up to 50% off on top brands</Typography>
          <Typography sx={{ mt: 1, opacity: 0.85 }}>Electronics, books, fashion and more. FREE delivery on orders over ₹499.</Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {search ? `Results for "${search}"` : category ? category.name : 'Recommended for you'}
          </Typography>
          {!loading && <Typography variant="body2" color="text.secondary">{total} item{total === 1 ? '' : 's'}</Typography>}
        </Box>
        <TextField select size="small" label="Sort by" value={sort} onChange={(e) => setParam('sort', e.target.value === 'featured' ? '' : e.target.value)} sx={{ minWidth: 200, bgcolor: '#fff' }}>
          {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
            <MenuItem key={key} value={key}>{opt.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip label="All" clickable color={!categoryId ? 'primary' : 'default'} onClick={() => setParam('category', '')} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} clickable color={c.id === categoryId ? 'primary' : 'default'} onClick={() => setParam('category', c.id)} sx={{ bgcolor: c.id === categoryId ? undefined : '#fff' }} />
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
            <Grid item key={i} xs={12} sm={6} md={4} lg={3}>
              <Paper sx={{ p: 2 }}>
                <Skeleton variant="rectangular" height={200} />
                <Skeleton sx={{ mt: 1 }} />
                <Skeleton width="60%" />
              </Paper>
            </Grid>
          ))
          : products.map((p) => (
            <Grid item key={p.id} xs={12} sm={6} md={4} lg={3}>
              <ProductCard product={p} />
            </Grid>
          ))}
      </Grid>

      {!loading && !error && products.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No results found</Typography>
          <Typography color="text.secondary">Try a different search or category.</Typography>
        </Paper>
      )}

      {!loading && products.length < total && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="outlined" onClick={loadMore} disabled={loadingMore} sx={{ bgcolor: '#fff' }}>
            {loadingMore ? 'Loading…' : 'Show more'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
