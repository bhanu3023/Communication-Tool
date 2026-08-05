import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { msalBootstrap, msalInstance } from './authConfig';
import theme from './theme';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

// handleRedirectPromise MUST run before BrowserRouter mounts. Azure returns to
// http://localhost:5174/#code=… ; an immediate Navigate to /login would strip
// that hash and the sign-in would silently fail.
msalBootstrap()
  .then((result) => {
    if (result?.idToken) {
      sessionStorage.setItem('pending_id_token', result.idToken);
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Microsoft sign-in redirect failed:', err);
    sessionStorage.setItem('login_error', err?.errorMessage || err?.message || 'Sign-in failed');
  })
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <ToastProvider>
                <AuthProvider>
                  <ErrorBoundary>
                    <App />
                  </ErrorBoundary>
                </AuthProvider>
              </ToastProvider>
            </BrowserRouter>
          </ThemeProvider>
        </MsalProvider>
      </React.StrictMode>,
    );
  });
