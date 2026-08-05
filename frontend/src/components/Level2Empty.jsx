import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { levelTheme } from '../utils/levels';

/**
 * Level 2 is open but has produced nothing to show yet. Deliberately encouraging
 * rather than apologetic — and it wears the earned teal accent, unlike the locked
 * gate, so an unlocked-but-empty state can never be mistaken for a locked one.
 */
export default function Level2Empty({ title, body }) {
  const navigate = useNavigate();
  const t = levelTheme(2);

  return (
    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: `${t.accent}0a` }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          mx: 'auto',
          mb: 1.5,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          bgcolor: t.accent,
        }}
      >
        <RocketLaunchIcon />
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 480, mx: 'auto' }}>
        {body}
      </Typography>
      <Button
        variant="contained"
        endIcon={<ArrowForwardIcon />}
        sx={{ bgcolor: t.accent, '&:hover': { bgcolor: t.accent, filter: 'brightness(0.92)' } }}
        onClick={() => navigate('/level-2')}
      >
        Go to Level 2
      </Button>
    </Paper>
  );
}
