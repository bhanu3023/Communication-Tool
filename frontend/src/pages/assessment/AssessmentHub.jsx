import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { getSections, requestAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

const SECTIONS = [
  { code: 'LISTENING', key: 'listening', title: 'Listening', icon: <HeadphonesIcon fontSize="large" color="primary" />,
    detail: 'One ~2-minute story, played once. Then 10 comprehension questions.' },
  { code: 'SPEAKING', key: 'speaking', title: 'Speaking', icon: <MicIcon fontSize="large" color="secondary" />,
    detail: '10 business-migration sentences to repeat aloud. Uses your microphone.' },
  { code: 'WRITING', key: 'writing', title: 'Writing', icon: <EditNoteIcon fontSize="large" sx={{ color: '#7b1fa2' }} />,
    detail: '2 professional writing tasks · 5 minutes each · auto-saved.' },
];

export default function AssessmentHub() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [cards, setCards] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const load = () => getSections().then(setCards).catch(() => showToast('Could not load sections', 'error'));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cardFor = (code) => (cards || []).find((c) => c.section === code);

  const onRequest = (code) => {
    setRequesting(true);
    requestAttempt(code)
      .then(() => { showToast('Request sent to your manager.', 'success'); load(); })
      .catch((e) => showToast(e?.response?.data?.message || 'Could not send request', 'error'))
      .finally(() => setRequesting(false));
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5">Assessment</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Take each section <strong>independently</strong> — Listening, Speaking and Writing each have their own
          <strong> 3 attempts</strong>. There is no combined score. Each section runs in fullscreen with proctoring.
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        {SECTIONS.map((s) => {
          const c = cardFor(s.code);
          const attemptsText = c ? `${c.attemptsUsed} / ${c.attemptsAllowed} attempts used` : '';
          return (
            <Grid item xs={12} md={4} key={s.key}>
              <Card sx={{ height: '100%' }}>
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
                    {attemptsText}{c ? ` · pass mark ${c.passMark}` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>{s.detail}</Typography>

                  {c && c.canStart ? (
                    <Button variant="contained" fullWidth onClick={() => navigate(`/assessment/${s.key}`)}>
                      {c.attemptsUsed === 0 ? `Start ${s.title}` : `Retake ${s.title}`}
                    </Button>
                  ) : c && c.requestPending ? (
                    <Chip color="info" label="Request sent to manager" sx={{ width: '100%' }} />
                  ) : (
                    <Button variant="outlined" color="warning" fullWidth disabled={requesting}
                      onClick={() => onRequest(s.code)}>
                      Request another attempt
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Button variant="text" size="large" sx={{ mt: 3 }} onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </Box>
  );
}
