import { MenuItem, TextField } from '@mui/material';
import { MAX_QTY_PER_ITEM } from '../config';

export default function QuantitySelect({ value, max, onChange, disabled }) {
  const limit = Math.max(1, Math.min(max, MAX_QTY_PER_ITEM));
  const options = Array.from({ length: Math.max(limit, value) }, (_, i) => i + 1);
  return (
    <TextField
      select
      size="small"
      label="Qty"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F0F2F2' } }}
    >
      {options.map((n) => (
        <MenuItem key={n} value={n} disabled={n > limit}>{n}</MenuItem>
      ))}
    </TextField>
  );
}
