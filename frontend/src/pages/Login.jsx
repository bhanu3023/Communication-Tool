import { Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/HeadphonesOutlined';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from '../components/BrandLogo';

/** Authentic four-square Microsoft logo (per Microsoft brand guidelines). */
function MicrosoftLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const FEATURES = [
  { icon: HeadphonesIcon, title: 'Listening', desc: 'Comprehension from real workplace audio' },
  { icon: RecordVoiceOverIcon, title: 'Speaking', desc: 'Pronunciation and fluency, scored by AI' },
  { icon: EditNoteIcon, title: 'Writing', desc: 'Clarity and professionalism in your writing' },
];

export default function Login() {
  const { login, loading, isAuthenticated, profile } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={profile?.role === 'MANAGER' ? '/manager' : '/dashboard'} replace />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      {/* ---- Brand / hero panel (hidden on small screens) ---- */}
      <Box
        sx={{
          flex: 1.1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
          px: { md: 7, lg: 10 },
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(155deg, #20007a 0%, #3000ae 55%, #6536d6 100%)',
        }}
      >
        {/* soft decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
          }}
        />
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}>
            AI Communication
            <br />
            Skills Trainer
          </Typography>
          <Typography sx={{ maxWidth: 460, color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
            Assess and improve how your team listens, speaks, and writes — with instant,
            AI-powered feedback and clear progress tracking.
          </Typography>
        </Box>

        <Stack spacing={2.25} sx={{ mt: 1 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Stack key={title} direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255,255,255,0.14)',
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{title}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{desc}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ---- Sign-in panel ---- */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* CloudFuze logo */}
          <Box sx={{ mb: 4 }}>
            <BrandLogo height={52} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Welcome
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Sign in with your CloudFuze Microsoft account to continue.
          </Typography>

          <Button
            onClick={login}
            disabled={loading}
            fullWidth
            disableElevation
            startIcon={loading ? <CircularProgress size={18} /> : <MicrosoftLogo />}
            sx={{
              py: 1.35,
              textTransform: 'none',
              fontSize: 15,
              fontWeight: 600,
              color: '#3c4043',
              bgcolor: '#fff',
              border: '1px solid #dadce0',
              borderRadius: 2,
              '&:hover': { bgcolor: '#f8f9fa', borderColor: '#c6cbd1' },
              '&.Mui-disabled': { bgcolor: '#fff', color: '#9aa0a6' },
            }}
          >
            {loading ? 'Signing in…' : 'Sign in with Microsoft'}
          </Button>

          <Divider sx={{ my: 4 }} />

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              Secured by Microsoft Azure AD · CloudFuze employees only
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
