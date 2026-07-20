import { AppBar, Box, Button, Chip, Container, Divider, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const home = profile?.role === 'MANAGER' ? '/manager' : '/dashboard';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e6ecf4' }}>
        <Toolbar>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}
            onClick={() => navigate(home)}
          >
            <BrandLogo height={38} />
            <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Communication Skills Trainer
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {profile && (
            <>
              <Chip
                size="small"
                label={profile.role}
                color={profile.role === 'MANAGER' ? 'secondary' : 'primary'}
                sx={{ mr: 2, fontWeight: 600 }}
              />
              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                {profile.name}
              </Typography>
              <Button startIcon={<LogoutIcon />} onClick={logout} color="inherit">
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
