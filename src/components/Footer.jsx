import { Box, Button, Typography } from '@mui/material';
import Logo from './Logo';

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 4 }}>
      <Button
        fullWidth
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{ bgcolor: '#37475A', color: '#fff', borderRadius: 0, py: 1.5, '&:hover': { bgcolor: '#485769' } }}
      >
        Back to top
      </Button>
      <Box sx={{ bgcolor: 'nav.light', color: '#DDD', py: 4, textAlign: 'center' }}>
        <Logo />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Demo storefront powered by ServiceNow Table API · React · MUI
        </Typography>
      </Box>
    </Box>
  );
}
