import {
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HistoryIcon from '@mui/icons-material/History';
import { scoreColor } from '../utils/format';
import { levelTheme, sectionTitle } from '../utils/levels';
import { Improvement } from './SectionTile';

/**
 * Attempt history for one level. Shared so both level pages end with the same block;
 * only the accent and the empty-state copy differ.
 */
export default function AttemptHistoryTable({ rows = [], level = 1, showLevelBadge = true, onTestClick }) {
  const t = levelTheme(level);
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <HistoryIcon sx={{ color: t.accent }} />
          <Typography variant="h6">Recent attempts</Typography>
          {showLevelBadge && (
            <Chip size="small" label={t.label} sx={{ bgcolor: `${t.accent}14`, color: t.accent, fontWeight: 600 }} />
          )}
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Section</TableCell>
                <TableCell align="center">Attempt</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell>Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    <Stack spacing={1.5} alignItems="center">
                      <Typography variant="body2">No attempts yet.</Typography>
                      {onTestClick && (
                        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={onTestClick}>
                          Go to Test
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((h, i) => (
                <TableRow key={i} hover>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={sectionTitle(h.section)} />
                  </TableCell>
                  <TableCell align="center">#{h.attemptNumber}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color={scoreColor(h.score)} label={`${h.score}`} />
                  </TableCell>
                  <TableCell>
                    <Improvement value={h.improvement} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
