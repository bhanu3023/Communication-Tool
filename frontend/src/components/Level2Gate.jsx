import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { LOCKED_THEME, gateProgress } from '../utils/levels';

/** One row of the unlock checklist. */
function GateRow({ item }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
      {item.passed ? (
        <CheckCircleIcon sx={{ color: 'success.main' }} />
      ) : (
        <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />
      )}
      <Typography variant="body2" sx={{ fontWeight: item.passed ? 700 : 500, minWidth: 92 }}>
        {item.title}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      {item.passed ? (
        <Chip size="small" color="success" variant="outlined" label={`Passed · ${item.bestScore}`} />
      ) : item.bestScore != null ? (
        <Chip size="small" color="warning" variant="outlined" label={`${item.shortfall} points short`} />
      ) : (
        <Chip size="small" variant="outlined" label="Not attempted" />
      )}
    </Stack>
  );
}

/**
 * The single explanation of why a level is closed, reused everywhere a locked level can be
 * reached (portal, hub, Feedback, AI Coach). One component means the answer to "why can't I
 * get in?" is worded and styled identically wherever the user asks it.
 *
 * `level` is which level is CLOSED; `cards` are the sections of the level below it, whose
 * results decide the gate. It defaults to 2 so that every call site written before Level 3
 * existed renders exactly the card it rendered then.
 */
export default function Level2Gate({ cards, blurb, level = 2 }) {
  const navigate = useNavigate();
  const progress = gateProgress(cards);
  const below = Math.max(1, level - 1);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <LockIcon sx={{ color: LOCKED_THEME.accent }} />
          <Typography variant="h6">How to unlock Level {level}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {blurb ||
            `Every Level ${below} section needs a passing best score. Retakes count — only your best attempt matters.`}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {progress.map((item) => (
          <GateRow key={item.section} item={item} />
        ))}
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate(below === 1 ? '/assessment' : `/assessment?level=${below}`)}
        >
          Go to Level {below} tests
        </Button>
      </CardContent>
    </Card>
  );
}
