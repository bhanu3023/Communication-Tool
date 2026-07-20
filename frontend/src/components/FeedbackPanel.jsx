import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

const ICONS = {
  strengths: { icon: <CheckCircleIcon color="success" />, title: 'Strengths' },
  weaknesses: { icon: <ReportProblemIcon color="warning" />, title: 'Weaknesses' },
  suggestions: { icon: <LightbulbIcon color="primary" />, title: 'Personalized Suggestions' },
};

function Section({ type, items }) {
  const meta = ICONS[type];
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {meta.title}
      </Typography>
      <List dense disablePadding>
        {(items && items.length ? items : ['No data yet.']).map((text, i) => (
          <ListItem key={i} disableGutters>
            <ListItemIcon sx={{ minWidth: 34 }}>{meta.icon}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/** Renders AI strengths / weaknesses / suggestions. */
export default function FeedbackPanel({ feedback }) {
  if (!feedback) return null;
  return (
    <Box>
      <Section type="strengths" items={feedback.strengths} />
      <Section type="weaknesses" items={feedback.weaknesses} />
      <Section type="suggestions" items={feedback.suggestions} />
    </Box>
  );
}
