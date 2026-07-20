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

// When the Microsoft sign-in popup redirects back to our origin, this same app would
// otherwise boot a second time INSIDE the popup and consume the auth-response hash
// before the opener window can read it (causing MSAL "hash_empty_error"). If we detect
// we are that popup, don't boot the SPA — leave the hash intact for the opener to read.
const authHash = window.location.hash || '';
const isAuthPopup =
  window.opener && window.opener !== window && /[#&](code|error|state|id_token)=/.test(authHash);

if (!isAuthPopup) {
  // MSAL v3 must be initialized before rendering.
  msalInstance.initialize().then(() => {
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
  });
}
