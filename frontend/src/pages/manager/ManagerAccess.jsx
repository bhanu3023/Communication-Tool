import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccountOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModeratorOutlined';
import LoadingScreen from '../../components/LoadingScreen';
import { addUser, getTeams, getUsers, updateUserAccess } from '../../services/assessmentService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

/**
 * Role presentation in ONE place. `rank` drives the sort so admins and managers sit at the
 * top of the list — alphabetical order alone buried the few people an admin actually came
 * here to manage among twenty-odd employees.
 *
 * Colours are theme tokens, never hex: the app's palette is currently off-brand (indigo
 * rather than CloudFuze blue), and referencing tokens means this screen corrects itself when
 * the theme does.
 */
const ROLE_META = {
  ADMIN: { label: 'Admin', rank: 0, color: 'primary.main', tint: 'primary.main', icon: AdminPanelSettingsIcon },
  MANAGER: { label: 'Manager', rank: 1, color: 'info.main', tint: 'info.main', icon: SupervisorAccountIcon },
  EMPLOYEE: { label: 'Employee', rank: 2, color: 'text.secondary', tint: 'text.secondary', icon: PersonOutlineIcon },
};
const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
const roleMeta = (role) => ROLE_META[role] || ROLE_META.EMPLOYEE;
const roleLabel = (role) => roleMeta(role).label;

const initialsOf = (name) =>
  (name || 'U').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());

/** A clickable count that doubles as the role filter. */
function RoleTile({ role, count, active, onClick }) {
  const meta = role ? roleMeta(role) : null;
  const Icon = meta?.icon;
  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      sx={{
        flex: 1,
        minWidth: 120,
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
        borderColor: active ? (meta?.color ?? 'primary.main') : undefined,
        boxShadow: active ? '0 4px 16px rgba(0,0,0,.10)' : undefined,
        '&:hover': { transform: 'translateY(-1px)' },
        outlineOffset: 2,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
        {Icon ? (
          <Box sx={{ color: meta.color, display: 'flex' }}>
            <Icon fontSize="small" />
          </Box>
        ) : null}
        <Typography variant="caption" color="text.secondary" noWrap>
          {role ? `${roleLabel(role)}s` : 'Everyone'}
        </Typography>
      </Stack>
      <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
        {count}
      </Typography>
    </Card>
  );
}

export default function ManagerAccess() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'EMPLOYEE', team: '' });
  const [submitting, setSubmitting] = useState(false);

  const [savingId, setSavingId] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const [pending, setPending] = useState(null); // a demotion awaiting confirmation
  // An admin whose admin access is being removed, plus the role to drop them to. Unlike the
  // dropdown's demotion, this asks WHICH role they land on rather than assuming one.
  const [removeAdmin, setRemoveAdmin] = useState(null);

  // `profile.admin` is the server's verdict (role ADMIN or the bootstrap email list), so this
  // page and the backend can never disagree the way two hardcoded lists did.
  const isAdmin = !!profile?.admin;

  useEffect(() => {
    let active = true;
    if (!isAdmin) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    Promise.all([getUsers(), getTeams().catch(() => [])])
      .then(([u, t]) => {
        if (!active) return;
        setUsers(u || []);
        setTeams(t || []);
      })
      .catch(() => {
        if (active) showToast('Failed to load users', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin, showToast]);

  const counts = useMemo(() => {
    const c = { ADMIN: 0, MANAGER: 0, EMPLOYEE: 0 };
    users.forEach((u) => {
      if (c[u.role] !== undefined) c[u.role] += 1;
    });
    return c;
  }, [users]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter ? u.role === roleFilter : true))
      .filter(
        (u) =>
          !q ||
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.team || '').toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          roleMeta(a.role).rank - roleMeta(b.role).rank ||
          (a.name || '').localeCompare(b.name || ''),
      );
  }, [users, search, roleFilter]);

  // Defense-in-depth: the backend also blocks non-admins, but hide the page too.
  if (!isAdmin) {
    return (
      <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
        <AdminPanelSettingsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          Not authorized
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Only the administrator can manage user access.
        </Typography>
      </Paper>
    );
  }

  const rememberTeam = (teamName) => {
    if (teamName && !teams.some((t) => t.toLowerCase() === teamName.toLowerCase())) {
      setTeams((prev) => [...prev, teamName].sort((a, b) => a.localeCompare(b)));
    }
  };

  const flash = (id) => {
    setJustSaved(id);
    // Long enough to notice which row moved, short enough not to linger.
    window.setTimeout(() => setJustSaved((cur) => (cur === id ? null : cur)), 1800);
  };

  const handleAdd = async () => {
    if (!isValidEmail(form.email)) {
      showToast('Enter a valid email address.', 'warning');
      return;
    }
    if (!form.team.trim()) {
      showToast('Choose or type a team.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const added = await addUser({
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
        team: form.team.trim(),
      });
      showToast(
        `${added.created ? 'Added' : 'Updated'} ${added.name} — ${roleLabel(added.role)} in ${added.team}.`,
        'success',
      );
      rememberTeam(added.team);
      setUsers(await getUsers());
      flash(added.id);
      setAddOpen(false);
      setForm({ email: '', name: '', role: 'EMPLOYEE', team: '' });
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not add the user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const save = async (user, nextRole, nextTeam) => {
    setSavingId(user.id);
    try {
      const row = await updateUserAccess(user.id, { role: nextRole, team: nextTeam });
      setUsers((prev) => prev.map((u) => (u.id === row.id ? row : u)));
      rememberTeam(row.team);
      flash(row.id);
      showToast(
        `${row.name} — ${roleLabel(row.role)}${row.team ? ` in ${row.team}` : ''}.`,
        'success',
      );
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not update the user.', 'error');
      // Re-sync so the dropdown never shows a value the server rejected.
      try {
        setUsers(await getUsers());
      } catch {
        /* keep the stale row rather than blanking the list */
      }
    } finally {
      setSavingId(null);
    }
  };

  // Losing privileges is the one change worth confirming; everything else applies at once.
  const requestChange = (user, nextRole, nextTeam) => {
    if (nextRole === 'EMPLOYEE' && user.role !== 'EMPLOYEE') {
      setPending({ user, role: nextRole, team: nextTeam });
      return;
    }
    save(user, nextRole, nextTeam);
  };

  const confirmPending = async () => {
    const { user, role, team } = pending;
    setPending(null);
    await save(user, role, team);
  };

  /** Why this row's role cannot be edited, or '' when it can. */
  const lockReason = (u) => {
    if (u.protectedAdmin) {
      return 'This is the root administrator, set in configuration so the app can always be recovered. Their role cannot be changed.';
    }
    if (u.id === profile?.id) return 'You cannot change your own role.';
    return '';
  };

  /** Admin access can be removed from any admin except the root account and yourself. */
  const canRemoveAdmin = (u) => u.role === 'ADMIN' && !u.protectedAdmin && u.id !== profile?.id;

  const confirmRemoveAdmin = async () => {
    const { user, role } = removeAdmin;
    setRemoveAdmin(null);
    // Team omitted — removing admin access must not disturb where they sit in the org.
    await save(user, role, '');
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter(null);
  };
  const filtered = !!search.trim() || !!roleFilter;

  return (
    <Box>
      {/* Header — the primary action sits here so the list below stays the focus. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'flex-end' }}
        sx={{ mb: 3 }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h4">User Access</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Add people and set who is an employee, manager or admin. Role changes take effect
            straight away — they do not need to sign in again.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<PersonAddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Add user
        </Button>
      </Stack>

      {/* Counts double as filters — one click to see just the admins. */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        <RoleTile role={null} count={users.length} active={!roleFilter} onClick={() => setRoleFilter(null)} />
        {ROLES.slice()
          .reverse()
          .map((r) => (
            <RoleTile
              key={r}
              role={r}
              count={counts[r]}
              active={roleFilter === r}
              onClick={() => setRoleFilter(roleFilter === r ? null : r)}
            />
          ))}
      </Stack>

      {/* Toolbar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mb: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="Search name, email or team"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { sm: 300 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {visible.length} of {users.length} shown
        </Typography>
        {filtered && (
          <Button size="small" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Stack>

      {loading ? (
        <LoadingScreen rows={5} />
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {/* Column labels so the two dropdowns are self-explanatory (desktop only). */}
          {!compact && visible.length > 0 && (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 1.25 }}>
                <Box sx={{ width: 40 }} />
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  Person
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 140 }}>
                  Role
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 160 }}>
                  Team
                </Typography>
                <Box sx={{ width: 44 }} />
              </Stack>
              <Divider />
            </>
          )}

          {visible.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                No one matches these filters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {search.trim() ? `Nothing found for “${search.trim()}”.` : 'Try a different role.'}
              </Typography>
              <Button variant="outlined" onClick={clearFilters}>
                Clear filters
              </Button>
            </Box>
          ) : (
            visible.map((u, i) => {
              const meta = roleMeta(u.role);
              const locked = lockReason(u);
              const isSelf = u.id === profile?.id;
              const busy = savingId === u.id;
              return (
                <Box
                  key={u.id}
                  sx={{
                    transition: 'background-color .6s',
                    bgcolor: justSaved === u.id ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {i > 0 && <Divider />}
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    alignItems={{ md: 'center' }}
                    sx={{ px: 2.5, py: 1.5 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                      <Avatar
                        sx={{
                          bgcolor: meta.tint,
                          width: 40,
                          height: 40,
                          fontWeight: 600,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {initialsOf(u.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography sx={{ fontWeight: 600 }} noWrap>
                            {u.name}
                          </Typography>
                          {isSelf && <Chip size="small" label="You" variant="outlined" />}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: 'block' }}
                        >
                          {u.email}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Role: one control, not a control plus a redundant chip. Locked rows show
                        a static chip so it is obvious the value is deliberate, not disabled. */}
                    <Box sx={{ width: { xs: '100%', md: 140 } }}>
                      {locked ? (
                        <Tooltip title={locked}>
                          <Chip
                            size="small"
                            label={meta.label}
                            sx={{ bgcolor: meta.tint, color: '#fff', fontWeight: 600 }}
                          />
                        </Tooltip>
                      ) : (
                        <Select
                          fullWidth
                          size="small"
                          value={u.role}
                          disabled={busy}
                          aria-label={`Role for ${u.name}`}
                          // Team omitted so the server keeps whatever they already have — this
                          // row may have no team, and a role change must not require one.
                          onChange={(e) => requestChange(u, e.target.value, '')}
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {roleLabel(r)}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </Box>

                    <Box sx={{ width: { xs: '100%', md: 160 } }}>
                      <Select
                        fullWidth
                        size="small"
                        displayEmpty
                        value={teams.includes(u.team) ? u.team : ''}
                        disabled={busy}
                        aria-label={`Team for ${u.name}`}
                        onChange={(e) => requestChange(u, u.role, e.target.value)}
                        renderValue={(v) =>
                          v || u.team || (
                            <Typography component="span" variant="body2" color="text.disabled">
                              No team
                            </Typography>
                          )
                        }
                      >
                        {teams.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box
                      sx={{
                        width: { xs: '100%', md: 44 },
                        display: 'flex',
                        justifyContent: { xs: 'flex-start', md: 'center' },
                        alignItems: 'center',
                      }}
                    >
                      {busy ? (
                        <Fade in>
                          <CircularProgress size={18} />
                        </Fade>
                      ) : canRemoveAdmin(u) ? (
                        <Tooltip title={`Remove admin access from ${u.name}`}>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Remove admin access from ${u.name}`}
                            onClick={() => setRemoveAdmin({ user: u, role: 'MANAGER' })}
                          >
                            <RemoveModeratorIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Box>
                  </Stack>
                </Box>
              );
            })
          )}
        </Card>
      )}

      {/* Add user — a dialog rather than a permanent block, so the list stays the page. */}
      <Dialog open={addOpen} onClose={() => !submitting && setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add a user</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            They can be set up before their first sign-in. If this email already exists, that
            person is moved to the role and team you choose.
          </Typography>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              autoFocus
              required
              fullWidth
              type="email"
              label="Email"
              placeholder="name@cloudfuze.com"
              value={form.email}
              error={!!form.email && !isValidEmail(form.email)}
              helperText={
                !!form.email && !isValidEmail(form.email) ? 'That does not look like an email address.' : ' '
              }
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Name"
              placeholder="Optional — we derive it from the email"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                sx={{ minWidth: 150 }}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {roleLabel(r)}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                freeSolo
                fullWidth
                options={teams}
                inputValue={form.team}
                onInputChange={(_, v) => setForm((f) => ({ ...f, team: v }))}
                renderInput={(params) => (
                  <TextField {...params} required label="Team" placeholder="Pick one or type a new name" />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          >
            Add user
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove admin access — asks what they become, since "not an admin" is two things. */}
      <Dialog open={!!removeAdmin} onClose={() => setRemoveAdmin(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove admin access?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {removeAdmin && (
              <>
                <strong>{removeAdmin.user.name}</strong> will lose the User Access screen and can
                no longer change anyone's role. Their team and assessment data are untouched, and
                you can make them an admin again at any time. This takes effect immediately, even
                if they are signed in right now.
              </>
            )}
          </DialogContentText>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            What should they become?
          </Typography>
          <Select
            fullWidth
            size="small"
            value={removeAdmin?.role || 'MANAGER'}
            aria-label="Role after removing admin access"
            onChange={(e) => setRemoveAdmin((cur) => ({ ...cur, role: e.target.value }))}
          >
            <MenuItem value="MANAGER">Manager — keeps team oversight</MenuItem>
            <MenuItem value="EMPLOYEE">Employee — loses team oversight too</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoveAdmin(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveModeratorIcon />}
            onClick={confirmRemoveAdmin}
          >
            Remove admin access
          </Button>
        </DialogActions>
      </Dialog>

      {/* Demotion confirmation */}
      <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change to employee?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending && (
              <>
                <strong>{pending.user.name}</strong> will lose{' '}
                {pending.user.role === 'ADMIN' ? 'administrator' : 'manager'} access and become a
                regular employee. Their assessment data is kept, and you can change this back at
                any time. This takes effect immediately, even if they are signed in right now.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmPending}>
            Change to employee
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
