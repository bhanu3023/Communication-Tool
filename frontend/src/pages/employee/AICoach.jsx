import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoadingScreen from '../../components/LoadingScreen';
import { getDashboard } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

// Visual config per feedback column.
const COLUMNS = [
  {
    key: 'strengths',
    title: 'Strengths',
    icon: <CheckCircleIcon />,
    color: '#2e7d32',
    tint: 'rgba(46,125,50,0.08)',
    border: 'rgba(46,125,50,0.25)',
    empty: 'Complete a section to start building strengths.',
  },
  {
    key: 'weaknesses',
    title: 'Focus Areas',
    icon: <ReportProblemIcon />,
    color: '#ed6c02',
    tint: 'rgba(237,108,2,0.08)',
    border: 'rgba(237,108,2,0.25)',
    empty: 'No focus areas yet.',
  },
  {
    key: 'suggestions',
    title: 'Suggestions',
    icon: <LightbulbOutlinedIcon />,
    color: '#3000ae',
    tint: 'rgba(48,0,174,0.06)',
    border: 'rgba(48,0,174,0.2)',
    empty: 'Suggestions will appear as you attempt sections.',
  },
];

function FeedbackColumn({ col, items }) {
  const list = items && items.length ? items : [col.empty];
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3, height: '100%', borderColor: col.border, bgcolor: col.tint }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: col.color,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: col.border,
          }}
        >
          {col.icon}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {col.title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {items && items.length > 0 && (
          <Chip size="small" label={items.length} sx={{ bgcolor: '#fff', fontWeight: 700 }} />
        )}
      </Stack>

      <Stack spacing={1.25}>
        {list.map((text, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ color: col.color, mt: '2px', display: 'flex', flexShrink: 0 }}>{col.icon}</Box>
            <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
              {text}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

/**
 * AI Coach — the employee's overall, section-aware coaching in its own section.
 * (Per-attempt detail lives on the Feedback page.)
 */
export default function AICoach() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => showToast('Failed to load AI coach', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  const fb = data.aiFeedback || {};

  return (
    <Box>
      {/* Header banner */}
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(120deg, #ffffff 50%, #efeafc 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              bgcolor: 'primary.main',
            }}
          >
            <AutoAwesomeIcon />
          </Box>
          <Typography variant="h4">AI Coach</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
          Personalized, <strong>section-by-section</strong> coaching across Listening, Speaking and
          Writing. This updates <strong>after each attempt</strong> — sections you haven&apos;t taken
          yet show how to get started. For attempt-by-attempt detail, open the{' '}
          <strong>Feedback</strong> section.
        </Typography>
      </Paper>

      {/* Three feedback columns */}
      <Grid container spacing={2.5}>
        {COLUMNS.map((col) => (
          <Grid item xs={12} md={4} key={col.key}>
            <FeedbackColumn col={col} items={fb[col.key]} />
          </Grid>
        ))}
      </Grid>

      {/* CTA */}
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/assessment')}>
          Go to Test
        </Button>
      </Box>
    </Box>
  );
}
