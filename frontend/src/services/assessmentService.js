import api from './api';

// --- Employee dashboard & history ---
// `level` is 1 (base tests) or 2 (advanced portal); the backend defaults to 1.
//
// `ai` opts in to the coaching summary, which costs a live OpenAI call (~5s) server-side.
// Only the AI Coach page renders it, so every other caller leaves it off and the dashboard
// is served straight from the database.
export const getDashboard = (level = 1, { ai = false } = {}) =>
  api.get('/employee/dashboard', { params: { level, ai } }).then((r) => r.data);
export const getHistory = (level = 1) =>
  api.get('/employee/history', { params: { level } }).then((r) => r.data);
export const getMyAttempts = (level) =>
  api.get('/employee/attempts', { params: level ? { level } : {} }).then((r) => r.data);
export const getSections = (level = 1) =>
  api.get('/employee/sections', { params: { level } }).then((r) => r.data);
/**
 * Whether a level has questions seeded yet, per section. Only the Level 3 portal calls this:
 * Levels 1 and 2 have had full banks since before it existed, so asking there would be a
 * round-trip to be told what is already certain.
 */
export const getLevelReadiness = (level = 1) =>
  api.get('/employee/level-readiness', { params: { level } }).then((r) => r.data);

export const requestAttempt = (section, level = 1) =>
  api.post('/employee/request-attempt', null, { params: { section, level } }).then((r) => r.data);

// --- Listening ---
export const startListening = (level = 1) =>
  api.post('/listening/start', null, { params: { level } }).then((r) => r.data);
export const submitListening = (payload) => api.post('/listening/submit', payload).then((r) => r.data);

// --- Speaking ---
export const startSpeaking = (level = 1) =>
  api.post('/speaking/start', null, { params: { level } }).then((r) => r.data);
// Uploaded as soon as the candidate stops recording, so the take is transcribed while they can
// still re-record. Returns what the recording was actually heard to say.
export const uploadSpeakingTake = (payload) =>
  api.post('/speaking/take', payload).then((r) => r.data);

export const submitSpeaking = (payload) => api.post('/speaking/submitSpeech', payload).then((r) => r.data);
export const getSpeakingRecording = (sessionId, index) =>
  api.get(`/speaking/recording/${sessionId}/${index}`, { responseType: 'blob' }).then((r) => r.data);

// --- Writing ---
export const startWriting = (level = 1) =>
  api.post('/writing/start', null, { params: { level } }).then((r) => r.data);
export const saveDraft = (payload) => api.post('/writing/saveDraft', payload).then((r) => r.data);
export const submitWriting = (payload) => api.post('/writing/submit', payload).then((r) => r.data);

// --- Proctoring ---
export const recordViolation = (sessionId, reason) =>
  api.post('/proctor/event', { sessionId, reason }).then((r) => r.data);

// --- Manager ---
export const getTeam = (params) => api.get('/manager/team', { params }).then((r) => r.data);
export const getTeams = () => api.get('/manager/teams').then((r) => r.data);
/**
 * `ai` defaults to true, which is what the endpoint does, so nothing that omits it changes.
 * The manager detail page passes false to render immediately, then calls again with true for
 * the coaching panel: that call is a live OpenAI round trip and used to block the whole page.
 */
export const getEmployeeDetail = (id, level = 1, { ai = true } = {}) =>
  api.get(`/manager/employee/${id}`, { params: { level, ai } }).then((r) => r.data);
export const getEmployeeAttempts = (id, level) =>
  api.get(`/manager/employee/${id}/attempts`, { params: level ? { level } : {} }).then((r) => r.data);
export const downloadPdf = (id, level = 1) =>
  api.get(`/manager/download-pdf/${id}`, { params: { level }, responseType: 'blob' }).then((r) => r.data);
export const grantAttempt = (id, section, level = 1) =>
  api.post(`/manager/employee/${id}/grant-attempt`, null, { params: { section, level } }).then((r) => r.data);

// --- User Access (admin only) ---
export const getManagers = () => api.get('/manager/access/managers').then((r) => r.data);
// Adds a user with a role and team, or re-assigns one who already exists. `team` may be a
// brand-new name — the backend creates it. Admin only (enforced server-side).
export const addUser = ({ email, name, role, team }) =>
  api.post('/manager/access/users', { email, name, role, team }).then((r) => r.data);
// Every user with their role and team, for the admin User Access list.
export const getUsers = () => api.get('/manager/access/users').then((r) => r.data);
// Changes an existing user's role and/or team.
export const updateUserAccess = (id, { role, team }) =>
  api.put(`/manager/access/users/${id}`, { role, team }).then((r) => r.data);
export const grantManagerAccess = (email) =>
  api.post('/manager/access/grant', { email }).then((r) => r.data);
export const revokeManagerAccess = (id) =>
  api.delete(`/manager/access/managers/${id}`).then((r) => r.data);
