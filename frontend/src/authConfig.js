import { PublicClientApplication } from '@azure/msal-browser';

/**
 * MSAL configuration for Microsoft Azure AD sign-in.
 * Values come from Vite env variables (see frontend/.env.example).
 */
// Fallbacks so MSAL can construct even before Azure is configured (dev-login mode).
// These placeholders are never used unless a real Microsoft sign-in is attempted.
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'common';

export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes requested at login; only the ID token is exchanged with the backend.
// `prompt: 'select_account'` forces Azure to always show the account chooser, so
// users can pick a different account or "Use another account" without signing out.
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account',
};

export const msalInstance = new PublicClientApplication(msalConfig);
