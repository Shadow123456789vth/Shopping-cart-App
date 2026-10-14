import { Box, Typography } from '@mui/material';
import { discountPercent, formatPrice } from '../utils/format';

export default function Price({ price, mrp, size = 'medium' }) {
  const off = discountPercent(price, mrp);
  const big = size === 'large';
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1 }}>
      {off > 0 && (
        <Typography component="span" sx={{ color: 'price.main', fontSize: big ? 26 : 18, fontWeight: 300 }}>
          -{off}%
        </Typography>
      )}
      <Typography component="span" sx={{ fontSize: big ? 28 : 20, fontWeight: 500 }}>
        {formatPrice(price)}
      </Typography>
      {off > 0 && (
        <Typography component="span" variant="body2" color="text.secondary">
          M.R.P.: <s>{formatPrice(mrp)}</s>
        </Typography>
      )}
    </Box>
  );
}
