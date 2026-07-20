import { Box, CircularProgress, Typography } from '@mui/material';
import { formatTime } from '../hooks/useCountdown';

/** Circular countdown display; turns amber then red as time runs low. */
export default function CircularTimer({ secondsLeft, totalSeconds, label, size = 72 }) {
  const pct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const color = secondsLeft <= 10 ? 'error' : secondsLeft <= 60 ? 'warning' : 'primary';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={size}
          thickness={4}
          sx={{ color: '#e6ecf4' }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={size}
          thickness={4}
          color={color}
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
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            {formatTime(secondsLeft)}
          </Typography>
        </Box>
      </Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
