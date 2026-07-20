import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LoadingScreen from '../../components/LoadingScreen';
import FeedbackPanel from '../../components/FeedbackPanel';
import AttemptReview from '../../components/AttemptReview';
import { downloadPdf, getEmployeeAttempts, getEmployeeDetail, grantAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const SECTION_ICON = {
  LISTENING: <HeadphonesIcon color="primary" />,
  SPEAKING: <MicIcon color="secondary" />,
  WRITING: <EditNoteIcon sx={{ color: '#7b1fa2' }} />,
};

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
        {up ? '+' : ''}{value} vs last
      </Typography>
    </Stack>
  );
}

function ProfileRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
    </Stack>
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

  const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/manager')}>Back to team</Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Preparing…' : 'Download PDF Report'}
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Profile */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{detail.name}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{detail.email}</Typography>
              <Divider sx={{ my: 1 }} />
              <ProfileRow label="Team" value={detail.team} />
              <ProfileRow label="Manager" value={detail.manager} />
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI Feedback &amp; Recommendations</Typography>
              <FeedbackPanel feedback={detail.aiFeedback} />
            </CardContent>
          </Card>
        </Grid>

        {/* Per-section attempts + grant */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sections &amp; Attempts</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {detail.sections.map((c) => (
                  <Grid item xs={12} sm={4} key={c.section}>
                    <Box sx={{ border: '1px solid #eef2f8', borderRadius: 2, p: 2, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        {SECTION_ICON[c.section]}
                        <Typography sx={{ fontWeight: 700 }}>{title(c.section)}</Typography>
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
                      <ProfileRow label="Attempts" value={`${c.attemptsUsed} / ${c.attemptsAllowed}`} />
                      <ProfileRow label="Latest" value={c.latestScore == null ? '—' : `${c.latestScore}/100`} />
                      <ProfileRow label="Best" value={c.bestScore == null ? '—' : `${c.bestScore}/100`} />
                      <Box sx={{ mt: 0.5, mb: 1 }}><Improvement value={c.improvement} /></Box>
                      {c.requestPending && (
                        <Chip size="small" color="warning" label="Requested attempt" sx={{ mb: 1 }} />
                      )}
                      <Button variant={c.requestPending ? 'contained' : 'outlined'} size="small" fullWidth
                        onClick={() => handleGrant(c.section)}>
                        Grant attempt
                      </Button>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <ReportProblemIcon color={detail.warnings?.length ? 'error' : 'disabled'} fontSize="small" />
                <Typography variant="h6">Proctoring Warnings</Typography>
                <Chip size="small" color={detail.warnings?.length ? 'error' : 'success'}
                  label={detail.warnings?.length || 0} />
              </Stack>
              {detail.warnings?.length ? (
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
                    {detail.warnings.map((w, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{title(w.section)}</TableCell>
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
        </Grid>

        {/* Feedback by attempt (per section) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Feedback by Attempt</Typography>
              <Divider sx={{ mb: 2 }} />
              {attempts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No completed attempts yet.</Typography>
              ) : (
                attempts.map((a, idx) => (
                  <Accordion key={a.sessionId} defaultExpanded={idx === 0} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        {SECTION_ICON[a.section]}
                        <Typography sx={{ fontWeight: 600 }}>{title(a.section)} · Attempt #{a.attemptNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.date}</Typography>
                        <Chip size="small" color={scoreColor(a.score)} label={`${a.score ?? '—'}`} />
                        <Improvement value={a.improvement} />
                        {a.proctorWarnings > 0 && (
                          <Chip size="small" color="error"
                            label={`${a.proctorWarnings} warning${a.proctorWarnings > 1 ? 's' : ''}`} />
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      {a.declinedAreas?.length > 0 && (
                        <Typography variant="body2" color="error.main" sx={{ mb: 1.5, fontWeight: 500 }}>
                          ⚠ Weaker than the previous attempt in: {a.declinedAreas.join(', ')}
                        </Typography>
                      )}
                      <AttemptReview attempt={a} />
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
