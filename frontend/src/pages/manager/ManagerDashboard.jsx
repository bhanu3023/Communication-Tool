import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Typography,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import GroupWorkIcon from '@mui/icons-material/GroupWorkOutlined';
import LoadingScreen from '../../components/LoadingScreen';
import { getTeam, getTeams } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

const initialsOf = (name) =>
  (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // 'all' | 'attempted' | 'not_attempted'
  const [team, setTeam] = useState(''); // '' = all teams
  const [teams, setTeams] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    getTeam({ search: search || undefined, team: team || undefined })
      .then(setRows)
      .catch(() => showToast('Failed to load team', 'error'))
      .finally(() => setLoading(false));
  }, [search, team, showToast]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .catch(() => {}); // filter is optional — silently degrade if teams can't load
  }, []);

  const open = (id) => navigate(`/manager/employee/${id}`);

  const hasAttempted = (r) =>
    (r.listeningAttempts || 0) + (r.speakingAttempts || 0) + (r.writingAttempts || 0) > 0;

  const counts = {
    all: rows.length,
    attempted: rows.filter(hasAttempted).length,
    not_attempted: rows.filter((r) => !hasAttempted(r)).length,
  };

  const filteredRows = rows.filter((r) => {
    if (status === 'attempted') return hasAttempted(r);
    if (status === 'not_attempted') return !hasAttempted(r);
    return true;
  });

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'attempted', label: 'Attempted' },
    { key: 'not_attempted', label: 'Not attempted' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Team Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your team members&apos; communication assessment results.
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search employee by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {/* Filters: team (left) + attempt status (right) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 3,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 210 }}>
          <Select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            displayEmpty
            startAdornment={
              <InputAdornment position="start">
                <GroupWorkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            }
            sx={{ bgcolor: '#fff', borderRadius: 2 }}
          >
            <MenuItem value="">All teams</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {statusFilters.map((f) => {
            const active = status === f.key;
            return (
              <Chip
                key={f.key}
                label={`${f.label} (${counts[f.key]})`}
                onClick={() => setStatus(f.key)}
                variant={active ? 'filled' : 'outlined'}
                color={active ? 'primary' : 'default'}
                sx={{ fontWeight: 600, borderRadius: 2, cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      </Box>

      {loading ? (
        <LoadingScreen rows={5} />
      ) : filteredRows.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <GroupsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            No employees found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {status === 'attempted'
              ? 'No one here has attempted an assessment yet.'
              : status === 'not_attempted'
                ? 'Everyone here has attempted at least one assessment.'
                : team
                  ? `No employees are in the "${team}" team yet.`
                  : 'No one on your team matches this search.'}
          </Typography>
        </Paper>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {/* Column header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2.5,
              py: 1.5,
              bgcolor: '#faf9fe',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="overline" sx={{ flex: 1, color: 'text.secondary', letterSpacing: 0.6 }}>
              Employee
            </Typography>
            <Typography variant="overline" sx={{ width: 160, color: 'text.secondary', letterSpacing: 0.6 }}>
              Requests
            </Typography>
            <Box sx={{ width: 120 }} />
          </Box>

          {/* One line per user */}
          {filteredRows.map((r, i) => (
            <Box
              key={r.employeeId}
              onClick={() => open(r.employeeId)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2.5,
                py: 1.75,
                cursor: 'pointer',
                borderTop: i === 0 ? 'none' : '1px solid',
                borderColor: 'divider',
                transition: 'background .15s',
                '&:hover': { bgcolor: 'rgba(48,0,174,0.04)' },
              }}
            >
              {/* Name + email */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontWeight: 700, fontSize: 15 }}>
                  {initialsOf(r.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {r.email}
                  </Typography>
                </Box>
              </Box>

              {/* Requests */}
              <Box sx={{ width: 160 }}>
                {r.requestPending ? (
                  <Chip size="small" color="warning" label="Attempt requested" />
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    —
                  </Typography>
                )}
              </Box>

              {/* View */}
              <Box sx={{ width: 120, textAlign: 'right' }}>
                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    open(r.employeeId);
                  }}
                >
                  View
                </Button>
              </Box>
            </Box>
          ))}
        </Card>
      )}
    </Box>
  );
}
