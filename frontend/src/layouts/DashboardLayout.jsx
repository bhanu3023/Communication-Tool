import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '../contexts/AuthContext';

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 76;

// Nav items flagged `adminOnly` (e.g. User Access) are shown when the server says this user
// is an admin — `profile.admin`, computed by AdminRegistry from role ADMIN or the bootstrap
// email list. This replaced a hardcoded email array here that had fallen out of sync with the
// backend and hid the item from a real admin. The backend independently enforces access.

/**
 * Shared app shell with a collapsible CloudFuze-indigo sidebar. The nav entries
 * are passed in via `nav` (each: { label, icon, path, match }) so the same shell
 * serves both the employee and manager areas.
 */
export default function DashboardLayout({ nav = [], adminNav = [] }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /**
   * The sidebar in labelled groups rather than one flat list. An admin sees their own
   * assessment pages and the screens for managing other people, and in a single "Menu" run
   * those read as the same kind of thing — Feedback (mine) sat directly above Team (everyone
   * else's). Splitting them under headings makes the switch in scope explicit.
   */
  const sections = useMemo(() => {
    // Kept even though the render filters too: a non-admin must never be handed an adminOnly
    // item, and doing it here means a section can end up empty and be dropped below.
    const visible = (items) => items.filter((item) => !item.adminOnly || profile?.admin);
    const onEmployee = nav.some((item) => item.path === '/dashboard');
    const onManager = nav.some((item) => item.path === '/manager');

    if (profile?.admin && onEmployee && adminNav.length) {
      return [
        { heading: 'Menu', items: visible(nav) },
        { heading: 'Administration', items: visible(adminNav) },
      ];
    }
    if (profile?.admin && onManager) {
      return [
        {
          heading: 'Menu',
          items: [
            {
              label: 'My Dashboard',
              icon: <SpaceDashboardIcon />,
              path: '/dashboard',
              match: (p) => p === '/dashboard',
            },
          ],
        },
        { heading: 'Administration', items: visible(nav) },
      ];
    }
    return [{ heading: 'Menu', items: visible(nav) }];
  }, [nav, adminNav, profile]);

  const initials = (profile?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // `mini` = collapsed icons-only rail (desktop only; mobile always full).
  const drawerContent = (mini) => {
    const renderNavItem = (item) => {
      const active = item.match(location.pathname);
      const button = (
        <ListItemButton
          key={item.path}
          onClick={() => go(item.path)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            py: 1.15,
            justifyContent: mini ? 'center' : 'flex-start',
            position: 'relative',
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? 'rgba(48,0,174,0.08)' : 'transparent',
            '&:hover': { bgcolor: active ? 'rgba(48,0,174,0.12)' : 'rgba(0,0,0,0.035)' },
            '&::before': active
              ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                }
              : {},
          }}
        >
          <ListItemIcon sx={{ minWidth: mini ? 0 : 40, color: active ? 'primary.main' : 'text.secondary' }}>
            {item.icon}
          </ListItemIcon>
          {!mini && (
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: 15 }} />
          )}
        </ListItemButton>
      );
      return mini ? (
        <Tooltip key={item.path} title={item.label} placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      );
    };

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        {/* Header: tool name + collapse toggle */}
        <Box
          sx={{
            minHeight: 76,
            px: mini ? 0 : 2.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: mini ? 'center' : 'space-between',
          }}
        >
          {!mini && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2, flex: 1, mr: 1 }}>
              AI Communication
            </Typography>
          )}
          <IconButton size="small" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            {mini ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {sections
            .filter((section) => section.items.length > 0)
            .map((section, index) => (
              <Box key={section.heading}>
                {/* Collapsed to a rail there is no room for a heading, so a rule carries the
                    grouping instead. */}
                {index > 0 && mini && <Divider sx={{ mx: 1, my: 1 }} />}
                {!mini && (
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 2.5,
                      pt: index === 0 ? 2 : 2.5,
                      pb: 0.5,
                      color: 'text.secondary',
                      letterSpacing: 1,
                    }}
                  >
                    {section.heading}
                  </Typography>
                )}
                <List sx={{ px: mini ? 1 : 1.5, pt: mini ? 1 : 0, pb: 0 }}>
                  {section.items
                    .filter((item) => !item.adminOnly || profile?.admin)
                    .map(renderNavItem)}
                </List>
              </Box>
            ))}
        </Box>

        <Divider />
        <Box sx={{ p: mini ? 1 : 2 }}>
          {mini ? (
            <Stack alignItems="center" spacing={1}>
              <Tooltip title={`${profile?.name} · ${profile?.role}`} placement="right">
                <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: 15 }}>{initials}</Avatar>
              </Tooltip>
              <Tooltip title="Logout" placement="right">
                <IconButton onClick={logout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: 15 }}>{initials}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {profile?.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={profile?.role}
                    color="primary"
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }}
                  />
                </Box>
              </Stack>
              <Button fullWidth variant="outlined" startIcon={<LogoutIcon />} onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </Box>
      </Box>
    );
  };

  const desktopWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile top bar */}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ display: { md: 'none' }, borderBottom: '1px solid #e6ecf4', zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            AI Communication
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: desktopWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: EXPANDED_WIDTH, boxSizing: 'border-box' } }}
        >
          {drawerContent(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: desktopWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid #e6ecf4',
              overflowX: 'hidden',
              transition: (t) =>
                t.transitions.create('width', {
                  easing: t.transitions.easing.sharp,
                  duration: t.transitions.duration.enteringScreen,
                }),
            },
          }}
        >
          {drawerContent(collapsed)}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${desktopWidth}px)` } }}>
        <Toolbar sx={{ display: { md: 'none' } }} />
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
