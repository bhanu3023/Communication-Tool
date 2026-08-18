import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Level2Gate from '../../components/Level2Gate';
import { getSections, requestAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { levelTheme, rulesSummary } from '../../utils/levels';

// Per-level briefs. The sections are the same three at both levels; what changes is
// how demanding the content is, which is what the copy has to convey.
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
      1: '2 professional writing tasks · 5 min to read + 10 min to write each · auto-saved.',
      2: 'A live customer escalation and an incident report, marked hardest on completeness.',
    },
  },
];

/**
 * "Choose a Test" — the same hub for both levels, selected by `?level=`. Level 2 gets
 * the identical flow (portal → Go to Test → pick a section) rather than a second,
 * differently-shaped screen; only the accent, the rules and the briefs differ.
 */
export default function AssessmentHub() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const level = Number(searchParams.get('level')) === 2 ? 2 : 1;
  const [cards, setCards] = useState(null);
  const [level1Cards, setLevel1Cards] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const t = levelTheme(level);
  const homePath = level === 2 ? '/level-2' : '/dashboard';

  const load = useCallback(
    () => getSections(level).then(setCards).catch(() => showToast('Could not load sections', 'error')),
    [level, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Only needed to explain a closed Level 2 gate.
  useEffect(() => {
    if (level === 2) getSections(1).then(setLevel1Cards).catch(() => setLevel1Cards(null));
  }, [level]);

  const cardFor = (code) => (cards || []).find((c) => c.section === code);
  const locked = !!cards && cards.some((c) => !c.levelUnlocked);

  const onRequest = (code) => {
    setRequesting(true);
    requestAttempt(code, level)
      .then(() => {
        showToast('Request sent to your manager.', 'success');
        load();
      })
      .catch((e) => showToast(e?.response?.data?.message || 'Could not send request', 'error'))
      .finally(() => setRequesting(false));
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={`Level ${level}`}
            sx={{ bgcolor: `${t.accent}14`, color: t.accent, fontWeight: 600 }}
          />
          <Typography variant="h5">Choose a Test</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Take them in <strong>any order</strong> — Listening, Speaking and Writing each have their own
          attempts at this level (<strong>{rulesSummary(level)}</strong>). There is no combined score.
          Each section runs in fullscreen with proctoring.
        </Typography>
      </Paper>

      {/* A locked level must not offer its tests, whatever the URL says. */}
      {locked ? (
        <Level2Gate cards={level1Cards} />
      ) : (
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
      )}

      <Button variant="text" size="large" sx={{ mt: 3 }} onClick={() => navigate(homePath)}>
        {level === 2 ? 'Back to Level 2' : 'Back to Dashboard'}
      </Button>
    </Box>
  );
}
