import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import Level2Gate from './Level2Gate';
import { levelTheme, rulesSummary } from '../utils/levels';

const SECTIONS = [
  {
    code: 'LISTENING',
    key: 'listening',
    title: 'Listening',
    icon: <HeadphonesIcon fontSize="large" color="primary" />,
    detail: {
      1: 'One ~2-minute story, played once. Then 10 comprehension questions.',
      2: 'One dense cutover briefing, played once. 10 inference questions — answers are implied, not stated.',
    },
  },
  {
    code: 'SPEAKING',
    key: 'speaking',
    title: 'Speaking',
    icon: <MicIcon fontSize="large" color="secondary" />,
    detail: {
      1: '10 business-migration sentences to repeat aloud. Uses your microphone.',
      2: '10 sentences of two lines each — migration terminology, business idiom and spoken figures.',
    },
  },
  {
    code: 'WRITING',
    key: 'writing',
    title: 'Writing',
    icon: <EditNoteIcon fontSize="large" sx={{ color: '#7b1fa2' }} />,
    detail: {
      1: '2 professional writing tasks · 5 minutes each · auto-saved.',
      2: 'A live customer escalation and an incident report, marked hardest on completeness.',
    },
  },
];

/** Section cards for one level — Listening, Speaking, Writing. */
export default function LevelSectionPicker({ level, cards, level1Cards, requesting, onRequest }) {
  const navigate = useNavigate();
  const t = levelTheme(level);
  const cardFor = (code) => (cards || []).find((c) => c.section === code);
  const locked = !!cards && cards.some((c) => !c.levelUnlocked);

  if (locked) {
    return <Level2Gate cards={level1Cards} />;
  }

  return (
    <Grid container spacing={2}>
      {SECTIONS.map((s) => {
        const c = cardFor(s.code);
        const attemptsText = c ? `${c.attemptsUsed} / ${c.attemptsAllowed} attempts used` : '';
        return (
          <Grid item xs={12} md={4} key={s.key}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ height: 4, bgcolor: t.accent }} />
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  {s.icon}
                  {c && c.result === 'Passed' ? (
                    <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Passed" />
                  ) : c && c.result === 'Not passed' ? (
                    <Chip size="small" color="error" label="Not passed" />
                  ) : c && c.attemptsUsed > 0 ? (
                    <Chip size="small" label={`Best ${c.bestScore ?? '—'}`} />
                  ) : null}
                </Stack>
                <Typography variant="h6">{s.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {attemptsText}
                  {c ? ` · pass mark ${c.passMark}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                  {s.detail[level]}
                </Typography>

                {c && c.canStart ? (
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ bgcolor: t.accent, '&:hover': { bgcolor: t.accent, filter: 'brightness(0.92)' } }}
                    onClick={() => navigate(`/assessment/${s.key}?level=${level}`)}
                  >
                    {c.attemptsUsed === 0 ? `Start ${s.title}` : `Retake ${s.title}`}
                  </Button>
                ) : c && c.requestPending ? (
                  <Chip color="info" label="Request sent to manager" sx={{ width: '100%' }} />
                ) : (
                  <Button
                    variant="outlined"
                    color="warning"
                    fullWidth
                    disabled={requesting}
                    onClick={() => onRequest(s.code)}
                  >
                    Request another attempt
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

export function levelPickerBlurb(level) {
  return (
    <>
      Take them in <strong>any order</strong> — Listening, Speaking and Writing each have their own attempts at
      this level (<strong>{rulesSummary(level)}</strong>). There is no combined score. Each section runs in
      fullscreen with proctoring.
    </>
  );
}
