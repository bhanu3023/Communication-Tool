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
    // Always redirect back to whatever origin actually served the app (localhost in
    // dev, the real domain in production). This avoids a baked-in build-time value
    // (e.g. localhost) sending production users to a dead address after sign-in.
    // Each origin used must be registered as a Single-page application redirect URI
    // in the Azure app registration.
    redirectUri: window.location.origin,
    // Let the app decide where to go after login (we route to the dashboard/manager
    // view). Without this, MSAL navigates back to the login page and the sign-in
    // appears to "bounce" back to /login.
    navigateToLoginRequestUrl: false,
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
