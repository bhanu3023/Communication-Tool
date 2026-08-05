import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, msalBootstrap } from '../authConfig';
import api from '../services/api';
import { homeForRole } from '../utils/auth';
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
  const msalReady = true;

  const isAuthenticated = Boolean(localStorage.getItem('app_token') && profile);

  const exchanging = useRef(false);

  const completeLogin = useCallback(
    async (idToken) => {
      if (exchanging.current || localStorage.getItem('app_token')) return;
      exchanging.current = true;
      setLoading(true);
      try {
        const { data } = await api.post('/auth/login', { idToken });
        localStorage.setItem('app_token', data.token);
        localStorage.setItem('profile', JSON.stringify(data.profile));
        setProfile(data.profile);
        showToast(`Welcome, ${data.profile.name}`, 'success');
        navigate(homeForRole(data.profile));
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || 'Login failed', 'error');
      } finally {
        exchanging.current = false;
        setLoading(false);
      }
    },
    [navigate, showToast],
  );

  const login = useCallback(async () => {
    if (!msalReady) return;
    setLoading(true);
    try {
      await msalBootstrap();
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      showToast(err?.message || 'Login failed', 'error');
      setLoading(false);
    }
  }, [instance, msalReady, showToast]);

  // Finish login after Microsoft redirect (token captured in main.jsx before Router ran).
  useEffect(() => {
    const err = sessionStorage.getItem('login_error');
    if (err) {
      sessionStorage.removeItem('login_error');
      showToast(err, 'error');
    }
    const idToken = sessionStorage.getItem('pending_id_token');
    if (idToken) {
      sessionStorage.removeItem('pending_id_token');
      completeLogin(idToken);
    }
  }, [completeLogin, showToast]);

  const logout = useCallback(async () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('profile');
    setProfile(null);
    try {
      await instance.clearCache();
      instance.setActiveAccount(null);
    } catch {
      /* ignore */
    }
    navigate('/login');
  }, [instance, navigate]);

  // Keep the cached profile in sync with the database (role promotions, admin flag, etc.).
  useEffect(() => {
    const token = localStorage.getItem('app_token');
    if (!token) return;
    let active = true;
    api.get('/auth/profile')
      .then(({ data }) => {
        if (!active) return;
        localStorage.setItem('profile', JSON.stringify(data));
        setProfile(data);
      })
      .catch(() => {
        /* non-fatal — stale cache still works until the token expires */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem('profile');
      setProfile(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo(
    () => ({ profile, isAuthenticated, loading, msalReady, login, logout }),
    [profile, isAuthenticated, loading, msalReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
