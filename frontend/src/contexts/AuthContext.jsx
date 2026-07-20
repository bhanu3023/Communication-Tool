import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../authConfig';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem('profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(localStorage.getItem('app_token') && profile);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      const idToken = result.idToken;
      const { data } = await api.post('/auth/login', { idToken });
      localStorage.setItem('app_token', data.token);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      setProfile(data.profile);
      showToast(`Welcome, ${data.profile.name}`, 'success');
      navigate(data.profile.role === 'MANAGER' ? '/manager' : '/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [instance, navigate, showToast]);

  const logout = useCallback(async () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('profile');
    setProfile(null);
    // Local sign-out: clear MSAL's cached session without opening the Microsoft
    // "You signed out" popup. The next sign-in still shows the account chooser
    // (loginRequest uses prompt: 'select_account').
    try {
      await instance.clearCache();
      instance.setActiveAccount(null);
    } catch {
      /* ignore */
    }
    navigate('/login');
  }, [instance, navigate]);

  // Keep profile in sync if another tab logs out.
  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem('profile');
      setProfile(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo(
    () => ({ profile, isAuthenticated, loading, login, logout }),
    [profile, isAuthenticated, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
