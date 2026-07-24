import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import LoadingScreen from '../../components/LoadingScreen';
import { getManagers, grantManagerAccess } from '../../services/assessmentService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SUPER_ADMIN_EMAILS = ['abhinav.surattu@cloudfuze.com', 'bhanu.srikakulam@cloudfuze.com'];
const isSuperAdmin = (email) => SUPER_ADMIN_EMAILS.includes((email || '').toLowerCase());

const initialsOf = (name) =>
  (name || 'U').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function ManagerAccess() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = isSuperAdmin(profile?.email);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    getManagers()
      .then(setManagers)
      .catch(() => showToast('Failed to load managers', 'error'))
      .finally(() => setLoading(false));
  }, [isAdmin, showToast]);

  // Defense-in-depth: the backend also blocks non-admins, but hide the page too.
  if (!isAdmin) {
    return (
      <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
        <AdminPanelSettingsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          Not authorized
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Only the administrator can manage manager access.
        </Typography>
      </Paper>
    );
  }

  const handleGrant = async () => {
    const value = email.trim();
    if (!isValidEmail(value)) {
      showToast('Enter a valid email address.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await grantManagerAccess(value);
      setManagers(updated);
      setEmail('');
      showToast(`${value} now has manager access.`, 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not grant manager access.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <AdminPanelSettingsIcon color="primary" />
        <Typography variant="h4">Manager Access</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Grant manager access to anyone by email. New people are set up as managers even
        before their first sign-in.
      </Typography>

      {/* Grant form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Add a manager
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
            <TextField
              fullWidth
              type="email"
              placeholder="name@cloudfuze.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
              onClick={handleGrant}
              disabled={submitting}
              sx={{ whiteSpace: 'nowrap', px: 3 }}
            >
              Grant access
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Current managers */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Current managers
      </Typography>
      {loading ? (
        <LoadingScreen rows={3} />
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {managers.length === 0 ? (
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                No managers yet.
              </Typography>
            </CardContent>
          ) : (
            managers.map((m, i) => (
              <Box key={m.id}>
                {i > 0 && <Divider />}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 1.75 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontWeight: 700, fontSize: 15 }}>
                    {initialsOf(m.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={600} noWrap>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {m.email}
                    </Typography>
                  </Box>
                  {isSuperAdmin(m.email) ? (
                    <Chip size="small" color="primary" label="Admin" />
                  ) : (
                    <Chip size="small" variant="outlined" label="Manager" />
                  )}
                </Stack>
              </Box>
            ))
          )}
        </Card>
      )}
    </Box>
  );
}
