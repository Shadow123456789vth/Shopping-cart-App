import { Chip } from '@mui/material';
import { ORDER_STATUS } from '../services/orderService';

export default function StatusChip({ status }) {
  const s = ORDER_STATUS[status] || { label: status, color: 'default' };
  return <Chip size="small" label={s.label} color={s.color} variant="outlined" sx={{ fontWeight: 600 }} />;
}
