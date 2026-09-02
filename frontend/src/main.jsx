import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { msalInstance } from './authConfig';
import theme from './theme';
import App, { preloadRouteChunk } from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { initHotjar } from './utils/hotjar';
import './index.css';

// Before the first render so early interactions are captured. No-op unless a site id was
// baked in at build time. The remote script itself loads on idle — see utils/hotjar.js.
initHotjar();

// Ask for the current page's chunk NOW, in parallel with everything below, instead of after
// MSAL, AuthContext and the route guard have all had their turn. Pure prefetch: React.lazy
// reuses the same promise when it renders, so nothing here decides what the user sees.
preloadRouteChunk(window.location.pathname);

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ToastProvider>
              <AuthProvider>
                {/* Inside the theme so the fallback UI is styled, and inside the router so
                    its Reload button works — but around App, so a crash in ANY screen shows
                    a recoverable message instead of blanking the page. */}
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
