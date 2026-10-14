import { useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, TextField,
} from '@mui/material';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false };

const REQUIRED = ['fullName', 'phone', 'line1', 'city', 'postalCode'];

export default function AddressDialog({ open, onClose, onSave, defaultName = '' }) {
  const [form, setForm] = useState({ ...EMPTY, fullName: defaultName });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const next = {};
    REQUIRED.forEach((f) => {
      if (!form[f]?.trim()) next[f] = 'Required';
    });
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    if (form.postalCode && !/^[A-Za-z0-9\s-]{3,10}$/.test(form.postalCode)) next.postalCode = 'Enter a valid PIN / postal code';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
      setForm({ ...EMPTY, fullName: defaultName });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={form[name]}
      onChange={set(name)}
      error={!!errors[name]}
      helperText={errors[name]}
      required={REQUIRED.includes(name)}
      {...props}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a new address</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>{field('fullName', 'Full name')}</Grid>
          <Grid item xs={12}>{field('phone', 'Mobile number', { inputProps: { inputMode: 'tel' } })}</Grid>
          <Grid item xs={12}>{field('line1', 'Flat, house no., building, street')}</Grid>
          <Grid item xs={12}>{field('line2', 'Area, landmark (optional)')}</Grid>
          <Grid item xs={6}>{field('city', 'Town / City')}</Grid>
          <Grid item xs={6}>{field('state', 'State')}</Grid>
          <Grid item xs={6}>{field('postalCode', 'PIN code')}</Grid>
          <Grid item xs={6}>{field('country', 'Country')}</Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Checkbox checked={form.isDefault} onChange={set('isDefault')} />} label="Make this my default address" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="secondary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Use this address'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
