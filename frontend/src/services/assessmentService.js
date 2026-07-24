import api from './api';

// --- Employee dashboard & history ---
export const getDashboard = () => api.get('/employee/dashboard').then((r) => r.data);
export const getHistory = () => api.get('/employee/history').then((r) => r.data);
export const getMyAttempts = () => api.get('/employee/attempts').then((r) => r.data);
export const getSections = () => api.get('/employee/sections').then((r) => r.data);
export const requestAttempt = (section) =>
  api.post('/employee/request-attempt', null, { params: { section } }).then((r) => r.data);

// --- Listening ---
export const startListening = () => api.post('/listening/start').then((r) => r.data);
export const submitListening = (payload) => api.post('/listening/submit', payload).then((r) => r.data);

// --- Speaking ---
export const startSpeaking = () => api.post('/speaking/start').then((r) => r.data);
export const submitSpeaking = (payload) => api.post('/speaking/submitSpeech', payload).then((r) => r.data);
export const getSpeakingRecording = (sessionId, index) =>
  api.get(`/speaking/recording/${sessionId}/${index}`, { responseType: 'blob' }).then((r) => r.data);

// --- Writing ---
export const startWriting = () => api.post('/writing/start').then((r) => r.data);
export const saveDraft = (payload) => api.post('/writing/saveDraft', payload).then((r) => r.data);
export const submitWriting = (payload) => api.post('/writing/submit', payload).then((r) => r.data);

// --- Proctoring ---
export const recordViolation = (sessionId, reason) =>
  api.post('/proctor/event', { sessionId, reason }).then((r) => r.data);

// --- Manager ---
export const getTeam = (params) => api.get('/manager/team', { params }).then((r) => r.data);
export const getEmployeeDetail = (id) => api.get(`/manager/employee/${id}`).then((r) => r.data);
export const getEmployeeAttempts = (id) => api.get(`/manager/employee/${id}/attempts`).then((r) => r.data);
export const downloadPdf = (id) =>
  api.get(`/manager/download-pdf/${id}`, { responseType: 'blob' }).then((r) => r.data);
export const grantAttempt = (id, section) =>
  api.post(`/manager/employee/${id}/grant-attempt`, null, { params: { section } }).then((r) => r.data);

// --- Manager Access (admin only) ---
export const getManagers = () => api.get('/manager/access/managers').then((r) => r.data);
export const grantManagerAccess = (email) =>
  api.post('/manager/access/grant', { email }).then((r) => r.data);
