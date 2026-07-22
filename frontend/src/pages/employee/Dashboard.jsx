import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import FeedbackPanel from '../../components/FeedbackPanel';
import LoadingScreen from '../../components/LoadingScreen';
import AttemptReview from '../../components/AttemptReview';
import { getDashboard, getMyAttempts, requestAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const SECTION_META = {
  LISTENING: { icon: <HeadphonesIcon />, color: '#1565c0', key: 'listening' },
  SPEAKING: { icon: <MicIcon />, color: '#00acc1', key: 'speaking' },
  WRITING: { icon: <EditNoteIcon />, color: '#7b1fa2', key: 'writing' },
};

/** Small colored improvement indicator (vs the previous attempt of the section). */
function Improvement({ value, showZero = true }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  if (flat && !showZero) return null;
  const color = up ? 'success.main' : flat ? 'text.secondary' : 'error.main';
  const Icon = up ? TrendingUpIcon : flat ? TrendingFlatIcon : TrendingDownIcon;
  return (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>
        {up ? '+' : ''}{value} vs last
      </Typography>
    </Stack>
  );
}

function SectionCard({ card, onOpen, onStart, onRequest, requesting }) {
  const meta = SECTION_META[card.section] || {};
  const title = card.section.charAt(0) + card.section.slice(1).toLowerCase();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" label={`${card.attemptsUsed}/${card.attemptsAllowed} attempts`}
            color={card.exhausted ? 'default' : 'primary'} variant="outlined" />
        </Stack>

        {/* Pass status (pass mark 75) */}
        <Box sx={{ mb: 1.5 }}>
          {card.result === 'Passed' ? (
            <Chip size="small" color="success" label={`Passed ✓ (best ≥ ${card.passMark})`} />
          ) : card.result === 'Not passed' ? (
            <Chip size="small" color="error" label={`Not passed — needed ${card.passMark}`} />
          ) : (
            <Chip size="small" variant="outlined" label={`Pass mark: ${card.passMark}`} />
          )}
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Latest score</Typography>
          <Typography variant="body2" fontWeight={700}>
            {card.latestScore == null ? '—' : `${card.latestScore}/100`}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Best</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Improvement value={card.improvement} />
            <Typography variant="body2" fontWeight={700}>
              {card.bestScore == null ? '—' : `${card.bestScore}/100`}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {card.canStart ? (
            <Button variant="contained" size="small" onClick={onStart}>
              {card.attemptsUsed === 0 ? 'Start' : 'Retake'}
            </Button>
          ) : card.requestPending ? (
            <Chip size="small" color="info" label="Request sent" />
          ) : (
            <Button variant="outlined" color="warning" size="small" disabled={requesting} onClick={onRequest}>
              Request attempt
            </Button>
          )}
          {card.attemptsUsed > 0 && (
            <Button variant="text" size="small" onClick={onOpen}>
              View feedback
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const load = () => {
    getDashboard().then(setData).catch(() => showToast('Failed to load dashboard', 'error'));
    getMyAttempts().then(setAttempts).catch(() => setAttempts([]));
  };

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => showToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
    getMyAttempts().then(setAttempts).catch(() => setAttempts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const onRequest = (section) => {
    setRequesting(true);
    requestAttempt(section)
      .then(() => {
        showToast('Request sent to your manager.', 'success');
        load();
      })
      .catch((e) => showToast(e?.response?.data?.message || 'Could not send request', 'error'))
      .finally(() => setRequesting(false));
  };

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(120deg, #ffffff 60%, #efeafc)',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Welcome back, {data.name.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Each section — Listening, Speaking and Writing — is taken on its own, with up to 3 attempts.
        </Typography>
        <Button variant="contained" size="large" sx={{ mt: 2 }} onClick={() => navigate('/assessment')}>
          Go to Assessment
        </Button>
      </Paper>

      {/* Section cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.cards.map((card) => (
          <Grid item xs={12} md={4} key={card.section}>
            <SectionCard
              card={card}
              requesting={requesting}
              onOpen={() => setOpenSection(card.section)}
              onStart={() => navigate(`/assessment/${SECTION_META[card.section].key}`)}
              onRequest={() => onRequest(card.section)}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* History */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attempt History
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell align="center">Attempt</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell>Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No attempts completed yet.</TableCell>
                      </TableRow>
                    )}
                    {data.history.map((h, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{h.date}</TableCell>
                        <TableCell>
                          <Chip size="small" label={h.section.charAt(0) + h.section.slice(1).toLowerCase()}
                            variant="outlined" />
                        </TableCell>
                        <TableCell align="center">#{h.attemptNumber}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" color={scoreColor(h.score)} label={`${h.score}`} />
                        </TableCell>
                        <TableCell><Improvement value={h.improvement} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Feedback */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Feedback
              </Typography>
              <FeedbackPanel feedback={data.aiFeedback} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Per-section feedback dialog */}
      <Dialog open={!!openSection} onClose={() => setOpenSection(null)} maxWidth="md" fullWidth>
        {openSection && (
          <>
            <DialogTitle>
              {openSection.charAt(0) + openSection.slice(1).toLowerCase()} — attempts &amp; feedback
            </DialogTitle>
            <DialogContent dividers>
              {(() => {
                const sectionAttempts = attempts.filter((a) => a.section === openSection);
                if (sectionAttempts.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      You haven’t completed this section yet.
                    </Typography>
                  );
                }
                return sectionAttempts.map((a, idx) => (
                  <Box key={a.sessionId} sx={{ mb: idx < sectionAttempts.length - 1 ? 3 : 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                      <Chip color="primary" label={`Attempt #${a.attemptNumber}`} />
                      <Typography variant="caption" color="text.secondary">{a.date}</Typography>
                      <Chip size="small" color={scoreColor(a.score)} label={`Score: ${a.score ?? '—'}`} />
                      <Improvement value={a.improvement} />
                    </Stack>
                    {a.improvedAreas?.length > 0 && (
                      <Typography variant="body2" color="success.main" sx={{ mb: a.declinedAreas?.length ? 0.5 : 1.5, fontWeight: 500 }}>
                        ✔ Improved since your last attempt in: {a.improvedAreas.join(', ')}
                      </Typography>
                    )}
                    {a.declinedAreas?.length > 0 && (
                      <Typography variant="body2" color="error.main" sx={{ mb: 1.5, fontWeight: 500 }}>
                        ⚠ Weaker than your last attempt in: {a.declinedAreas.join(', ')}
                      </Typography>
                    )}
                    <AttemptReview attempt={a} />
                    {idx < sectionAttempts.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ));
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenSection(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
