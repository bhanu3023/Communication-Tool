import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HistoryIcon from '@mui/icons-material/History';
import LoadingScreen from '../../components/LoadingScreen';
import { getDashboard } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const SECTION_META = {
  LISTENING: { icon: <HeadphonesIcon />, color: '#1565c0' },
  SPEAKING: { icon: <MicIcon />, color: '#00acc1' },
  WRITING: { icon: <EditNoteIcon />, color: '#7b1fa2' },
};

/** Small colored improvement indicator (vs the previous attempt of the section). */
function Improvement({ value }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  const color = up ? 'success.main' : flat ? 'text.secondary' : 'error.main';
  const Icon = up ? TrendingUpIcon : flat ? TrendingFlatIcon : TrendingDownIcon;
  return (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>
        {up ? '+' : ''}
        {value} vs last
      </Typography>
    </Stack>
  );
}

/** Read-only status tile for one section (taking a test happens via "Go to Test"). */
function StatusTile({ card }) {
  const meta = SECTION_META[card.section] || {};
  const title = card.section.charAt(0) + card.section.slice(1).toLowerCase();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: meta.color,
              bgcolor: `${meta.color}14`,
            }}
          >
            {meta.icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            variant="outlined"
            color={card.exhausted ? 'default' : 'primary'}
            label={`${card.attemptsUsed}/${card.attemptsAllowed}`}
          />
        </Stack>

        <Box sx={{ mb: 1.5 }}>
          {card.result === 'Passed' ? (
            <Chip size="small" color="success" label={`Passed ✓ (best ≥ ${card.passMark})`} />
          ) : card.result === 'Not passed' ? (
            <Chip size="small" color="error" label={`Not passed — needed ${card.passMark}`} />
          ) : (
            <Chip size="small" variant="outlined" label={`Pass mark: ${card.passMark}`} />
          )}
        </Box>

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Latest
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {card.latestScore == null ? '—' : `${card.latestScore}/100`}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Best
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Improvement value={card.improvement} />
            <Typography variant="body2" fontWeight={700}>
              {card.bestScore == null ? '—' : `${card.bestScore}/100`}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Test Dashboard — the employee's landing page. Shows a welcome banner with the
 * "Go to Test" entry point, a read-only status summary per section, and the full
 * attempt history. Actually taking a test happens on the tests page (any order),
 * and all detailed feedback lives on the Feedback page.
 */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => showToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  return (
    <Box>
      {/* Welcome + primary CTA */}
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(120deg, #ffffff 55%, #efeafc 100%)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              Welcome back, {data.name.split(' ')[0]} {'👋'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              Take Listening, Speaking and Writing in any order — each section is scored on its
              own, with up to 3 attempts. When you are ready, jump into a test.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/assessment')}
            >
              Go to Test
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Read-only section status */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.cards.map((card) => (
          <Grid item xs={12} md={4} key={card.section}>
            <StatusTile card={card} />
          </Grid>
        ))}
      </Grid>

      {/* Attempt history */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">Attempt History</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <TableContainer sx={{ maxHeight: 420 }}>
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
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No attempts completed yet — press <strong>Go to Test</strong> to begin.
                    </TableCell>
                  </TableRow>
                )}
                {data.history.map((h, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{h.date}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={h.section.charAt(0) + h.section.slice(1).toLowerCase()}
                      />
                    </TableCell>
                    <TableCell align="center">#{h.attemptNumber}</TableCell>
                    <TableCell align="right">
                      <Chip size="small" color={scoreColor(h.score)} label={`${h.score}`} />
                    </TableCell>
                    <TableCell>
                      <Improvement value={h.improvement} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
