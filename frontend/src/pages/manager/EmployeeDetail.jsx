import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LoadingScreen from '../../components/LoadingScreen';
import AttemptReview from '../../components/AttemptReview';
import { downloadPdf, getEmployeeAttempts, getEmployeeDetail, grantAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const SECTION_META = {
  LISTENING: { icon: <HeadphonesIcon fontSize="small" />, color: '#1565c0' },
  SPEAKING: { icon: <MicIcon fontSize="small" />, color: '#00acc1' },
  WRITING: { icon: <EditNoteIcon fontSize="small" />, color: '#7b1fa2' },
};

const FB_COLS = [
  { key: 'strengths', title: 'Strengths', icon: <CheckCircleIcon fontSize="small" />, color: '#2e7d32' },
  { key: 'weaknesses', title: 'Focus Areas', icon: <ReportProblemIcon fontSize="small" />, color: '#ed6c02' },
  { key: 'suggestions', title: 'Suggestions', icon: <LightbulbOutlinedIcon fontSize="small" />, color: '#3000ae' },
];

const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const initialsOf = (name) =>
  (name || 'U').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

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

function StatRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.35 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
    </Stack>
  );
}

/** One section summary + grant control. */
function SectionCard({ c, onGrant }) {
  const meta = SECTION_META[c.section] || {};
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${meta.color}` }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'grid', placeItems: 'center', color: meta.color, bgcolor: `${meta.color}14` }}>
            {meta.icon}
          </Box>
          <Typography sx={{ fontWeight: 700 }}>{titleCase(c.section)}</Typography>
        </Stack>

        <Box sx={{ mb: 1 }}>
          {c.result === 'Passed' ? (
            <Chip size="small" color="success" label={`Passed ✓ (≥ ${c.passMark})`} />
          ) : c.result === 'Not passed' ? (
            <Chip size="small" color="error" label={`Not passed (needed ${c.passMark})`} />
          ) : (
            <Chip size="small" variant="outlined" label={`Pass mark ${c.passMark}`} />
          )}
        </Box>

        <StatRow label="Attempts" value={`${c.attemptsUsed} / ${c.attemptsAllowed}`} />
        <StatRow label="Latest" value={c.latestScore == null ? '—' : `${c.latestScore}/100`} />
        <StatRow label="Best" value={c.bestScore == null ? '—' : `${c.bestScore}/100`} />
        <Box sx={{ mt: 0.5, mb: 1.25, minHeight: 20 }}>
          <Improvement value={c.improvement} />
        </Box>

        {c.requestPending && <Chip size="small" color="warning" label="Attempt requested" sx={{ mb: 1 }} />}
        <Button
          variant={c.requestPending ? 'contained' : 'outlined'}
          size="small"
          fullWidth
          onClick={() => onGrant(c.section)}
        >
          Grant attempt
        </Button>
      </CardContent>
    </Card>
  );
}

/** One AI-feedback column (strengths / focus areas / suggestions). */
function FeedbackCol({ col, items }) {
  const list = items && items.length ? items : ['—'];
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: `${col.color}08`, borderColor: `${col.color}33` }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: col.color }}>
        {col.icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {col.title}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {list.map((t, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ color: col.color, mt: '2px', display: 'flex' }}>{col.icon}</Box>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              {t}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getEmployeeDetail(id)
      .then(setDetail)
      .catch((e) => showToast(e?.response?.data?.message || 'Failed to load employee', 'error'))
      .finally(() => setLoading(false));
    getEmployeeAttempts(id).then(setAttempts).catch(() => setAttempts([]));
  }, [id, showToast]);

  const handleGrant = async (section) => {
    try {
      const updated = await grantAttempt(id, section);
      setDetail(updated);
      showToast(`Granted another ${section.toLowerCase()} attempt.`, 'success');
    } catch {
      showToast('Could not grant attempt', 'error');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${detail.employeeCode}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to download report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!detail) return null;

  const warnings = detail.warnings || [];

  return (
    <Box>
      {/* Top actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/manager')}>
          Back to team
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Preparing…' : 'Download PDF Report'}
        </Button>
      </Stack>

      {/* Identity banner */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(120deg, #ffffff 55%, #efeafc 100%)' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontWeight: 700, fontSize: 20 }}>
            {initialsOf(detail.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
              {detail.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {detail.email}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Sections & attempts */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Sections &amp; Attempts
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {detail.sections.map((c) => (
          <Grid item xs={12} sm={4} key={c.section}>
            <SectionCard c={c} onGrant={handleGrant} />
          </Grid>
        ))}
      </Grid>

      {/* AI feedback */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        AI Feedback &amp; Recommendations
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {FB_COLS.map((col) => (
          <Grid item xs={12} md={4} key={col.key}>
            <FeedbackCol col={col} items={detail.aiFeedback?.[col.key]} />
          </Grid>
        ))}
      </Grid>

      {/* Proctoring warnings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: warnings.length ? 1.5 : 0 }}>
            <ReportProblemIcon color={warnings.length ? 'error' : 'disabled'} fontSize="small" />
            <Typography variant="h6">Proctoring Warnings</Typography>
            <Chip size="small" color={warnings.length ? 'error' : 'success'} label={warnings.length} />
          </Stack>
          {warnings.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Section</TableCell>
                  <TableCell>Attempt</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {warnings.map((w, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{titleCase(w.section)}</TableCell>
                    <TableCell>#{w.attemptNumber}</TableCell>
                    <TableCell>{w.dateTime}</TableCell>
                    <TableCell>{w.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No malpractice warnings recorded. Clean attempts.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Feedback by attempt */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Feedback by Attempt
      </Typography>
      {attempts.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No completed attempts yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {attempts.map((a, idx) => {
            const meta = SECTION_META[a.section] || {};
            return (
              <Accordion
                key={a.sessionId}
                defaultExpanded={idx === 0}
                disableGutters
                sx={{ '&:before': { display: 'none' }, border: '1px solid #eef2f8', borderRadius: 3, overflow: 'hidden' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {titleCase(a.section)} · Attempt #{a.attemptNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.date}
                    </Typography>
                    <Chip size="small" color={scoreColor(a.score)} label={`${a.score ?? '—'}`} />
                    <Improvement value={a.improvement} />
                    {a.proctorWarnings > 0 && (
                      <Chip size="small" color="error" label={`${a.proctorWarnings} warning${a.proctorWarnings > 1 ? 's' : ''}`} />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {a.improvedAreas?.length > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ mb: a.declinedAreas?.length ? 0.5 : 1.5, fontWeight: 500 }}>
                      ✔ Improved since the previous attempt in: {a.improvedAreas.join(', ')}
                    </Typography>
                  )}
                  {a.declinedAreas?.length > 0 && (
                    <Typography variant="body2" color="error.main" sx={{ mb: 1.5, fontWeight: 500 }}>
                      ⚠ Weaker than the previous attempt in: {a.declinedAreas.join(', ')}
                    </Typography>
                  )}
                  <AttemptReview attempt={a} managerView />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
