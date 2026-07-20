import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

/**
 * Full-screen blocking loader shown from the moment a section is submitted until
 * scoring returns — so the candidate never sees a frozen/unresponsive screen.
 */
export default function ScoringScreen() {
  return (
    <Box
      sx={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2,
        px: 3,
      }}
    >
      <CircularProgress size={64} thickness={4} />
      <Typography variant="h5">Submitting your answers…</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        Your responses are being scored. This can take a few seconds — please do not close, refresh,
        or navigate away from this window.
      </Typography>
      <Box sx={{ width: 260, mt: 1 }}>
        <LinearProgress />
      </Box>
    </Box>
  );
}
