import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { msalInstance } from './authConfig';
import theme from './theme';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ToastProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ToastProvider>
          </BrowserRouter>
        </ThemeProvider>
      </MsalProvider>
    </React.StrictMode>,
  );
}

// MSAL v3 must be initialized before use. We process the sign-in redirect response
// HERE — before the app renders — so it can't race with MsalProvider's own internal
// handling (which would otherwise consume the auth code first and drop it). If a
// redirect just completed, stash the ID token for AuthContext to exchange on mount.
msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .then((result) => {
    if (result?.idToken) {
      sessionStorage.setItem('pending_id_token', result.idToken);
    }
  })
  .catch((err) => {
    // Surface Azure errors (e.g. consent / redirect-URI issues) instead of silently
    // bouncing back to the login page.
    // eslint-disable-next-line no-console
    console.error('Microsoft sign-in redirect failed:', err);
    sessionStorage.setItem('login_error', err?.errorMessage || err?.message || 'Sign-in failed');
  })
  .finally(renderApp);
