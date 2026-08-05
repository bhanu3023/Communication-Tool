import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { LOCKED_THEME, gateProgress, SECTION_CODES, isLevel1Complete, passedCount, rulesSummary, testPath } from '../utils/levels';

/**
 * Compact Level 2 status strip for the Level 1 dashboard — the pointer to the other
 * portal. It shows the gate progress even while locked (a hidden goal motivates
 * nobody) and names exactly which sections are still outstanding.
 */
export default function Level2Banner({ cards }) {
  const navigate = useNavigate();
  const unlocked = isLevel1Complete(cards);
  const passed = passedCount(cards);
  const remaining = gateProgress(cards).filter((p) => !p.passed).map((p) => p.title);

  return (
    <Paper
      onClick={() => navigate(testPath(unlocked ? 2 : 1))}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 3,
        cursor: 'pointer',
        color: '#fff',
        background: unlocked
          ? 'linear-gradient(120deg, #20007a 0%, #3000ae 60%, #00acc1 100%)'
          : 'linear-gradient(120deg, #2b3245 0%, #3b4459 100%)',
        transition: 'transform .18s ease, box-shadow .18s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.18)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.16)',
            flexShrink: 0,
          }}
        >
          {unlocked ? <RocketLaunchIcon /> : <LockIcon />}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Level 2
            </Typography>
            <Chip
              size="small"
              label={unlocked ? 'Unlocked' : `${passed}/${SECTION_CODES.length}`}
              sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {unlocked
              ? `All three Level 1 tests passed — your Level 2 portal is open (${rulesSummary(2)}).`
              : `Pass ${remaining.join(', ')} to unlock a separate portal with three tougher tests — ${rulesSummary(2)}.`}
          </Typography>
          {!unlocked && (
            <LinearProgress
              variant="determinate"
              value={(passed / SECTION_CODES.length) * 100}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                maxWidth: 320,
                bgcolor: 'rgba(255,255,255,0.22)',
                '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 3 },
              }}
            />
          )}
        </Box>

        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{ bgcolor: 'rgba(255,255,255,0.18)', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, flexShrink: 0 }}
        >
          {unlocked ? 'Enter Level 2' : 'View Level 2'}
        </Button>
      </Stack>
    </Paper>
  );
}
