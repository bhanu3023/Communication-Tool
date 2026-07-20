import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * Non-dismissible proctoring warning shown when the candidate leaves fullscreen.
 * The only way forward is to return to fullscreen via onContinue.
 */
export default function ExamWarningDialog({ open, count, max, reason, onContinue }) {
  const isFinal = count >= max;
  return (
    <Dialog open={open} disableEscapeKeyDown maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        Malpractice warning
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          {reason || 'You left the exam view.'} This assessment must be taken in fullscreen with no
          tab switching. Return to fullscreen to continue.
        </Typography>
        <Typography variant="body2" color={isFinal ? 'error' : 'warning.main'} fontWeight={700} sx={{ mt: 1 }}>
          Warning {count} of {max}
          {isFinal
            ? ' — final warning. Leaving fullscreen again will end the exam.'
            : '. Repeated exits will end the exam automatically.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="contained" size="large" startIcon={<FullscreenIcon />} onClick={onContinue}>
          Continue exam in fullscreen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
