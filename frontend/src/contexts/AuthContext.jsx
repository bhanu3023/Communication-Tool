import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  // Guard so the ID-token exchange runs only once even if both the MSAL event
  // callback and handleRedirectPromise deliver the same result.
  const exchanging = useRef(false);

  // Exchange the Microsoft ID token for our app JWT and route the user in.
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
        navigate(data.profile.role === 'MANAGER' ? '/manager' : '/dashboard');
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || 'Login failed', 'error');
      } finally {
        exchanging.current = false;
        setLoading(false);
      }
    },
    [navigate, showToast],
  );

  // Full-page (redirect) sign-in — the whole tab goes to Microsoft, not a popup.
  const login = useCallback(async () => {
    setLoading(true);
    try {
      await instance.loginRedirect(loginRequest); // navigates away; resumes below on return
    } catch (err) {
      showToast(err?.message || 'Login failed', 'error');
      setLoading(false);
    }
  }, [instance, showToast]);

  // Finish login on return from the Microsoft redirect. main.jsx processes the redirect
  // response before the app mounts and stashes the ID token (or an error) in
  // sessionStorage; we pick it up here and exchange it for our app session.
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
