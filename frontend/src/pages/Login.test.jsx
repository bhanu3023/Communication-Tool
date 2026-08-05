import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

function renderLogin(auth = {}) {
  useAuth.mockReturnValue({
    login: vi.fn(),
    loading: false,
    msalReady: true,
    isAuthenticated: false,
    profile: null,
    ...auth,
  });
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  /**
   * This screen once shipped to main referencing BrandLogo without importing it, which threw
   * "BrandLogo is not defined" at runtime and left nobody able to sign in. A build and the rest
   * of the suite both passed, because nothing rendered this page — so simply rendering it is the
   * check that matters. Keep this test even if it looks trivial.
   */
  it('renders without throwing', () => {
    expect(() => renderLogin()).not.toThrow();
    expect(screen.getByRole('button', { name: /Sign in with Microsoft/i })).toBeInTheDocument();
  });

  it('shows the CloudFuze logo', () => {
    renderLogin();
    expect(screen.getByAltText('CloudFuze')).toBeInTheDocument();
  });

  it('disables the sign-in button until MSAL is ready', () => {
    renderLogin({ msalReady: false });
    expect(screen.getByRole('button', { name: /Preparing sign-in/i })).toBeDisabled();
  });
});
