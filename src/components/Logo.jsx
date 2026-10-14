import { Box, Typography } from '@mui/material';

export default function Logo({ dark = false, size = 24 }) {
  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <Typography component="span" sx={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.5px', color: dark ? '#0F1111' : '#fff', lineHeight: 1 }}>
        shop<Box component="span" sx={{ color: 'nav.accent' }}>now</Box>
      </Typography>
      <Box sx={{ width: '70%', height: 3, bgcolor: 'nav.accent', borderRadius: '0 0 50% 50%', mt: 0.25, ml: '15%' }} />
    </Box>
  );
}
