import { useState } from 'react';
import { Box } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

export default function ProductImage({ src, alt, height = 220, sx }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center', bgcolor: '#F7F7F7', color: '#BBB', ...sx }}>
        <ImageOutlinedIcon sx={{ fontSize: 48 }} />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{ width: '100%', height, objectFit: 'contain', bgcolor: '#F7F7F7', display: 'block', ...sx }}
    />
  );
}
