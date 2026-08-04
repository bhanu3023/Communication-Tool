import { Box, Button, Chip, Dialog, DialogContent, Grow, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { SECTION_CODES, levelRules, sectionTitle } from '../utils/levels';

// Confetti without a dependency: a handful of positioned pieces on one keyframe.
// Deterministic offsets (no Math.random) so the burst looks identical every time
// and never re-renders differently.
const PIECES = [
  { left: '8%', delay: 0, color: '#3000ae', size: 9 },
  { left: '18%', delay: 0.12, color: '#00acc1', size: 7 },
  { left: '28%', delay: 0.05, color: '#f5a623', size: 10 },
  { left: '38%', delay: 0.2, color: '#2e7d32', size: 7 },
  { left: '48%', delay: 0.08, color: '#7b1fa2', size: 9 },
  { left: '58%', delay: 0.24, color: '#00acc1', size: 8 },
  { left: '68%', delay: 0.14, color: '#3000ae', size: 7 },
  { left: '78%', delay: 0.03, color: '#f5a623', size: 9 },
  { left: '88%', delay: 0.18, color: '#2e7d32', size: 8 },
];

/**
 * The unlock moment. Fires once, right after the third Level 1 section is passed —
 * this single transition is what makes the progression feel earned, so it gets a
 * real animation rather than a toast. Motion is disabled under
 * prefers-reduced-motion; the dialog still reads correctly without it.
 */
export default function Level2UnlockDialog({ open, onEnter, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={260}
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', position: 'relative' } }}
    >
      {/* Confetti layer — purely decorative, so it is hidden from assistive tech. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          '@keyframes confettiFall': {
            '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: 0 },
            '15%': { opacity: 1 },
            '100%': { transform: 'translateY(320px) rotate(420deg)', opacity: 0 },
          },
          '@media (prefers-reduced-motion: reduce)': { display: 'none' },
        }}
      >
        {PIECES.map((p, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: 0,
              left: p.left,
              width: p.size,
              height: p.size * 0.5,
              borderRadius: 0.5,
              bgcolor: p.color,
              animation: `confettiFall 1.5s ${p.delay}s ease-in forwards`,
            }}
          />
        ))}
      </Box>

      <DialogContent sx={{ px: 4, pt: 4, pb: 3, textAlign: 'center' }}>
        <Box
          sx={{
            width: 84,
            height: 84,
            mx: 'auto',
            mb: 2,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: 'linear-gradient(135deg, #3000ae 0%, #6536d6 60%, #00acc1 100%)',
            boxShadow: '0 10px 30px rgba(48,0,174,0.35)',
            '@keyframes badgePop': {
              '0%': { transform: 'scale(0.6)', opacity: 0 },
              '60%': { transform: 'scale(1.08)', opacity: 1 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
            animation: 'badgePop .45s ease-out',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <RocketLaunchIcon sx={{ fontSize: 40 }} />
        </Box>

        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
          Level 1 complete
        </Typography>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Level 2 unlocked {'🎉'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          You passed all three Level 1 tests. Level 2 is a separate portal with three tougher
          tests — <strong>{levelRules(2).attempts} attempts</strong> each, and{' '}
          <strong>{levelRules(2).passMark}/100</strong> to pass.
        </Typography>

        <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 0.75 }}>
          {SECTION_CODES.map((code) => (
            <Chip
              key={code}
              size="small"
              color="success"
              variant="outlined"
              icon={<CheckCircleIcon />}
              label={sectionTitle(code)}
            />
          ))}
        </Stack>

        <Stack spacing={1}>
          <Button variant="contained" size="large" onClick={onEnter} endIcon={<RocketLaunchIcon />}>
            Enter Level 2
          </Button>
          <Button variant="text" onClick={onClose}>
            Stay on Level 1
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
