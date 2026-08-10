import { Box, CircularProgress, Typography } from '@mui/material';
import { fmtScore, PASS_MARK } from '../utils/format';

/**
 * Circular 0-100 score gauge — green at/above the pass mark, red below.
 *
 * `passMark` defaults to Level 1's. Pass the level's own mark wherever the gauge can show a
 * Level 2 score, or a 77 renders green while the tile beside it correctly says not passed.
 */
export default function ScoreGauge({ score, size = 120, label, passMark = PASS_MARK }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = score == null ? 'inherit' : value >= passMark ? 'success' : 'error';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={100} size={size} thickness={5} sx={{ color: '#eef2f8' }} />
        <CircularProgress
          variant="determinate"
          value={value}
          size={size}
          thickness={5}
          color={color === 'inherit' ? 'primary' : color}
          sx={{ position: 'absolute', left: 0 }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            {score == null ? '—' : fmtScore(value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / 100
          </Typography>
        </Box>
      </Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
