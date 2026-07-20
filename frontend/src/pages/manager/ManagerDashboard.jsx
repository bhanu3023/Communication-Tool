import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LoadingScreen from '../../components/LoadingScreen';
import { getTeam } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { scoreColor } from '../../utils/format';

const cell = (v) => (v == null ? '—' : v);

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('');
  const [department, setDepartment] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getTeam({ search: search || undefined })
      .then(setRows)
      .catch(() => showToast('Failed to load team', 'error'))
      .finally(() => setLoading(false));
  }, [search, showToast]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Team Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your team members' communication assessment results.
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            size="small"
            fullWidth
            placeholder="Search employee by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <LoadingScreen rows={5} />
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Listening</TableCell>
                  <TableCell align="center">Speaking</TableCell>
                  <TableCell align="center">Writing</TableCell>
                  <TableCell align="center">Warnings</TableCell>
                  <TableCell align="center">Requests</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const scoreCell = (score, attempts) => (
                    <Box>
                      <Chip size="small" color={scoreColor(score)} label={cell(score)} />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {attempts} / 3 used
                      </Typography>
                    </Box>
                  );
                  return (
                    <TableRow key={r.employeeId} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell align="center">{scoreCell(r.listeningScore, r.listeningAttempts)}</TableCell>
                      <TableCell align="center">{scoreCell(r.speakingScore, r.speakingAttempts)}</TableCell>
                      <TableCell align="center">{scoreCell(r.writingScore, r.writingAttempts)}</TableCell>
                      <TableCell align="center">
                        <Chip size="small" color={r.totalWarnings > 0 ? 'error' : 'default'} label={r.totalWarnings} />
                      </TableCell>
                      <TableCell align="center">
                        {r.requestPending ? (
                          <Chip size="small" color="warning" label="Pending" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => navigate(`/manager/employee/${r.employeeId}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
