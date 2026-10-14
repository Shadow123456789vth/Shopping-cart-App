import { Box, Divider, Paper, Typography } from '@mui/material';
import { formatPrice } from '../utils/format';

function Row({ label, value, bold }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}

export default function OrderSummary({ totals, itemCount, children, title = 'Order Summary' }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Row label={`Items (${itemCount}):`} value={formatPrice(totals.subtotal)} />
      <Row label="Delivery:" value={totals.shipping ? formatPrice(totals.shipping) : 'FREE'} />
      {totals.tax > 0 && <Row label="Tax:" value={formatPrice(totals.tax)} />}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'price.main' }}>
        <Typography variant="h6" fontWeight={700}>Order Total:</Typography>
        <Typography variant="h6" fontWeight={700}>{formatPrice(totals.total)}</Typography>
      </Box>
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Paper>
  );
}
