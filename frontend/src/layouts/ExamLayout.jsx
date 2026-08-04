import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';

/**
 * Chrome-free shell for a test in progress — no sidebar, no dashboard nav.
 *
 * A running assessment is proctored and fullscreen; leaving it costs the candidate a
 * warning. Showing the dashboard navigation next to a live test invites exactly that
 * mistake, so the shell is removed for the whole duration and the only ways out are
 * the deliberate ones the test itself provides (Back on the instructions, and the
 * buttons on the result screen).
 */
export default function ExamLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
