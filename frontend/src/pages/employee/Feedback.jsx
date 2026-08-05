import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AttemptReview from '../../components/AttemptReview';
import LoadingScreen from '../../components/LoadingScreen';
import { LevelToggleRow } from '../../components/LevelToggle';
import { getMyAttempts, getSections } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';
import { isLevel1Complete } from '../../utils/levels';

const SECTIONS = [
  { code: 'LISTENING', title: 'Listening', icon: <HeadphonesIcon />, color: '#1565c0' },
  { code: 'SPEAKING', title: 'Speaking', icon: <MicIcon />, color: '#00acc1' },
  { code: 'WRITING', title: 'Writing', icon: <EditNoteIcon />, color: '#7b1fa2' },
];

/** API fields should be string arrays; coerce so a bad payload cannot crash the page. */
function asStringList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => v != null && v !== '').map(String);
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function normalizeAttempts(raw) {
  return Array.isArray(raw) ? raw : [];
}

function SectionFeedback({ meta, attempts = [] }) {
  const rows = Array.isArray(attempts) ? attempts : [];
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
            <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
            <Typography variant="h6">{meta.title}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            No attempts yet — complete a {meta.title.toLowerCase()} test to see feedback here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
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
          <Typography variant="h6">{meta.title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            variant="outlined"
            label={`${rows.length} attempt${rows.length > 1 ? 's' : ''}`}
          />
        </Stack>

        {rows.map((a, idx) => {
          const improved = asStringList(a.improvedAreas);
          const declined = asStringList(a.declinedAreas);
          return (
          <Accordion
            key={`${a.sessionId ?? idx}-${a.section ?? meta.code}-${a.attemptNumber ?? idx}`}
            defaultExpanded={idx === 0}
            disableGutters
            sx={{ '&:before': { display: 'none' }, border: '1px solid #eef2f8', borderRadius: 2, mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={`Attempt #${a.attemptNumber}`} />
                <Typography variant="caption" color="text.secondary">
                  {a.date}
                </Typography>
                <Chip size="small" color={scoreColor(a.score)} label={`Score ${a.score ?? '—'}`} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {improved.length > 0 && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ mb: declined.length ? 0.5 : 1.5, fontWeight: 500 }}
                >
                  ✔ Improved since your last attempt in: {improved.join(', ')}
                </Typography>
              )}
              {declined.length > 0 && (
                <Typography variant="body2" color="error.main" sx={{ mb: 1.5, fontWeight: 500 }}>
                  ⚠ Weaker than your last attempt in: {declined.join(', ')}
                </Typography>
              )}
              <AttemptReview attempt={a} />
            </AccordionDetails>
          </Accordion>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Attempt-by-attempt results for each section at the selected level. */
export default function Feedback() {
  const [attempts, setAttempts] = useState([]);
  const [level1Cards, setLevel1Cards] = useState(null);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const level2Unlocked = isLevel1Complete(level1Cards);
  const isUnlocked = useCallback((n) => n === 1 || level2Unlocked, [level2Unlocked]);

  useEffect(() => {
    if (level !== 1 && level1Cards && !isUnlocked(level)) {
      setLevel(1);
    }
  }, [level, level1Cards, isUnlocked]);

  useEffect(() => {
    let active = true;
    Promise.all([getMyAttempts(), getSections(1).catch(() => null)])
      .then(([a, s]) => {
        if (!active) return;
        setAttempts(normalizeAttempts(a));
        setLevel1Cards(s);
      })
      .catch(() => {
        if (active) showToast('Failed to load feedback', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const atLevel = useMemo(
    () => attempts.filter((a) => (a.level ?? 1) === level),
    [attempts, level],
  );
  const attemptsBySection = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((s) => [
          s.code,
          atLevel.filter((a) => String(a.section || '').toUpperCase() === s.code),
        ]),
      ),
    [atLevel],
  );

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(120deg, #ffffff 50%, #efeafc 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Feedback
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
              Detailed results for every attempt, grouped by section.
            </Typography>
          </Box>
          <LevelToggleRow value={level} onChange={setLevel} isUnlocked={isUnlocked} />
        </Stack>
      </Paper>

      <Stack spacing={3} key={`feedback-${level}`}>
        {SECTIONS.map((s) => (
          <SectionFeedback key={s.code} meta={s} attempts={attemptsBySection[s.code] || []} />
        ))}
      </Stack>
    </Box>
  );
}
