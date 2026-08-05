import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

// Mirrors the real nav shapes in App.jsx: the manager list carries an adminOnly entry.
const EMPLOYEE_NAV = [
  { label: 'Dashboard', icon: null, path: '/dashboard', match: (p) => p === '/dashboard' },
  { label: 'Test', icon: null, path: '/test', match: (p) => p.startsWith('/test') },
];
const MANAGER_NAV = [
  { label: 'Team', icon: null, path: '/manager', match: (p) => p === '/manager' },
  { label: 'User Access', icon: null, path: '/manager/access', match: (p) => p.startsWith('/manager/access'), adminOnly: true },
];

function renderLayout({ role, admin, nav, adminNav, at = '/dashboard' }) {
  useAuth.mockReturnValue({
    profile: { id: 1, name: 'Test Person', role, admin, team: 'Migration' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[at]}>
      <DashboardLayout nav={nav} adminNav={adminNav} />
    </MemoryRouter>,
  );
}

// The layout renders a permanent desktop drawer AND a temporary mobile one, so every nav
// label appears twice in the DOM. Assert on match counts rather than single elements.
describe('DashboardLayout sidebar', () => {
  it('hides the admin-only item from a plain manager', () => {
    // Worth pinning down because the adminOnly filter is applied in two places: once when
    // building menuNav for admins, and once again at render. It is the render-time filter that
    // covers a plain manager, whose nav returns early and unfiltered from the memo. Removing
    // either one looks harmless in isolation; this test fails if the render filter goes.
    renderLayout({ role: 'MANAGER', admin: false, nav: MANAGER_NAV, at: '/manager' });
    expect(screen.queryAllByText('Team').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('User Access')).toHaveLength(0);
  });

  it('hides manager and admin items from an employee', () => {
    renderLayout({ role: 'EMPLOYEE', admin: false, nav: EMPLOYEE_NAV, adminNav: MANAGER_NAV });
    expect(screen.queryAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Team')).toHaveLength(0);
    expect(screen.queryAllByText('User Access')).toHaveLength(0);
  });

  it('gives an admin both the employee nav and the admin items', () => {
    renderLayout({ role: 'ADMIN', admin: true, nav: EMPLOYEE_NAV, adminNav: MANAGER_NAV });
    expect(screen.queryAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Team').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('User Access').length).toBeGreaterThan(0);
  });

  it('injects My Dashboard for an admin on a manager page', () => {
    renderLayout({ role: 'ADMIN', admin: true, nav: MANAGER_NAV, at: '/manager' });
    expect(screen.queryAllByText('My Dashboard').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('User Access').length).toBeGreaterThan(0);
  });
});
