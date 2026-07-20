import { Box, Paper } from '@mui/material';
import CircularTimer from './CircularTimer';

/** Displays the overall + per-question countdown timers side by side. */
export default function AssessmentTimers({
  overallLeft,
  overallTotal,
  questionLeft,
  questionTotal,
  questionLabel = 'This question',
}) {
  return (
    <Paper sx={{ p: 2, display: 'flex', gap: 4, justifyContent: 'center', position: 'sticky', top: 80, zIndex: 2 }}>
      <CircularTimer secondsLeft={overallLeft} totalSeconds={overallTotal} label="Overall" />
      <Box sx={{ borderLeft: '1px solid #e6ecf4' }} />
      <CircularTimer secondsLeft={questionLeft} totalSeconds={questionTotal} label={questionLabel} />
    </Paper>
  );
}
