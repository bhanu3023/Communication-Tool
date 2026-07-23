import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttemptReview from '../../components/AttemptReview';
import LoadingScreen from '../../components/LoadingScreen';
import { getMyAttempts } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const SECTIONS = [
  { code: 'LISTENING', title: 'Listening', icon: <HeadphonesIcon />, color: '#1565c0' },
  { code: 'SPEAKING', title: 'Speaking', icon: <MicIcon />, color: '#00acc1' },
  { code: 'WRITING', title: 'Writing', icon: <EditNoteIcon />, color: '#7b1fa2' },
];

/** One section's attempts, each expandable to the full AttemptReview. */
function SectionFeedback({ meta, attempts }) {
  if (attempts.length === 0) {
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
            label={`${attempts.length} attempt${attempts.length > 1 ? 's' : ''}`}
          />
        </Stack>

        {attempts.map((a, idx) => (
          <Accordion
            key={a.sessionId}
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
              {a.improvedAreas?.length > 0 && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ mb: a.declinedAreas?.length ? 0.5 : 1.5, fontWeight: 500 }}
                >
                  ✔ Improved since your last attempt in: {a.improvedAreas.join(', ')}
                </Typography>
              )}
              {a.declinedAreas?.length > 0 && (
                <Typography variant="body2" color="error.main" sx={{ mb: 1.5, fontWeight: 500 }}>
                  ⚠ Weaker than your last attempt in: {a.declinedAreas.join(', ')}
                </Typography>
              )}
              <AttemptReview attempt={a} />
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Feedback page — detailed, attempt-by-attempt results for each section.
 * (The overall, section-aware AI summary lives on the AI Coach page.)
 */
export default function Feedback() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getMyAttempts()
      .then((a) => setAttempts(a || []))
      .catch(() => showToast('Failed to load feedback', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) return <LoadingScreen />;

  const hasAny = attempts.length > 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Feedback
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Detailed results for every attempt. For your overall coaching summary, visit{' '}
        <strong>AI Coach</strong>.
      </Typography>

      {!hasAny && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <AutoAwesomeIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            No detailed feedback yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Complete a Listening, Speaking or Writing test and your results will appear here.
          </Typography>
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/assessment')}>
            Go to Test
          </Button>
        </Paper>
      )}

      {hasAny && (
        <Stack spacing={3}>
          {SECTIONS.map((s) => (
            <SectionFeedback
              key={s.code}
              meta={s}
              attempts={attempts.filter((a) => a.section === s.code)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
