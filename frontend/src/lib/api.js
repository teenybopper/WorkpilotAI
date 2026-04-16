/**
 * WorkPilot AI — API client for communicating with the FastAPI backend.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth interceptor ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wp_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor (auto-refresh on 401) ──────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('wp_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('wp_access_token', res.data.access_token);
          localStorage.setItem('wp_refresh_token', res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(original);
        } catch (e) {
          localStorage.removeItem('wp_access_token');
          localStorage.removeItem('wp_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signupIndividual: (data) => api.post('/auth/signup/individual', data),
  signupOrganization: (data) => api.post('/auth/signup/organization', data),
  joinOrg: (data) => api.post('/auth/join-org', data),
  me: () => api.get('/auth/me'),
  refresh: (data) => api.post('/auth/refresh', data),
  logout: (data) => api.post('/auth/logout', data),
  orgMembers: () => api.get('/auth/org/members'),
  createInvite: (data) => api.post('/auth/org/invite', data),
};

// ── Workspaces ───────────────────────────────────────────────

export const workspaceApi = {
  list: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  query: (data) => api.post('/workspaces/query', data),
  caseSummary: (id) => api.get(`/workspaces/${id}/case-summary`),
  conflicts: (id) => api.get(`/workspaces/${id}/conflicts`),
  listTasks: (id, status) => api.get(`/workspaces/${id}/tasks`, { params: { status } }),
  updateTask: (workspaceId, taskId, data) =>
    api.patch(`/workspaces/${workspaceId}/tasks/${taskId}`, data),
};

// ── Documents ────────────────────────────────────────────────

export const documentApi = {
  upload: (file, workspaceId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  extract: (sourceId) => api.post('/documents/extract', { source_id: sourceId }),
  compare: (sourceIdA, sourceIdB) =>
    api.post('/documents/compare', { source_id_a: sourceIdA, source_id_b: sourceIdB }),
  query: (workspaceId, queryText, topK = 5) =>
    api.post('/documents/query', { workspace_id: workspaceId, query: queryText, top_k: topK }),
};

// ── Meetings (file upload flow) ──────────────────────────────

export const meetingApi = {
  upload: (file, workspaceId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    return api.post('/meetings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  transcribe: (sourceId) => api.post('/meetings/transcribe', { source_id: sourceId }),
  diarize: (sourceId) => api.post('/meetings/diarize', { source_id: sourceId }),
  extractActions: (sourceId) =>
    api.post('/meetings/extract-actions', { source_id: sourceId }),
  summary: (sourceId) => api.get(`/meetings/${sourceId}/summary`),
  transcript: (sourceId) => api.get(`/meetings/${sourceId}/transcript`),
};

// ── MeetOps Sessions (live capture) ──────────────────────────

export const meetingSessionApi = {
  start: (data) => api.post('/meetings/sessions/start', data),
  stop: (sessionId) => api.post(`/meetings/sessions/${sessionId}/stop`),
  submitTranscript: (sessionId, data) =>
    api.post(`/meetings/sessions/${sessionId}/transcript`, data),
  list: (workspaceId, status) =>
    api.get('/meetings/sessions', { params: { workspace_id: workspaceId, status } }),
  get: (sessionId) => api.get(`/meetings/sessions/${sessionId}`),
};

// ── ActionOps ────────────────────────────────────────────────

export const actionApi = {
  plan: (data) => api.post('/actions/plan', data),
  list: (workspaceId, approvalState) =>
    api.get('/actions', { params: { workspace_id: workspaceId, approval_state: approvalState } }),
  get: (actionId) => api.get(`/actions/${actionId}`),
  update: (actionId, data) => api.patch(`/actions/${actionId}`, data),
  approve: (actionId) => api.post(`/actions/${actionId}/approve`),
  reject: (actionId, reason) => api.post(`/actions/${actionId}/reject`, { reason }),
  execute: (actionId) => api.post(`/actions/${actionId}/execute`),
  executionLog: (actionId) => api.get(`/actions/${actionId}/execution-log`),
};

// ── Integrations / MCP ───────────────────────────────────────

export const integrationApi = {
  availableTools: () => api.get('/integrations/available-tools'),
  connected: () => api.get('/integrations/connected'),
  connect: (data) => api.post('/integrations/connect', data),
  disconnect: (toolId) => api.delete(`/integrations/${toolId}`),
  capabilities: (toolId) => api.get(`/integrations/${toolId}/capabilities`),
};

// ── Settings ─────────────────────────────────────────────────

export const settingsApi = {
  plan: () => api.get('/settings/plan'),
  entitlements: () => api.get('/settings/entitlements'),
  policies: () => api.get('/settings/policies'),
  updatePolicies: (data) => api.put('/settings/policies', data),
};

// ── Activity ─────────────────────────────────────────────────

export const activityApi = {
  list: (workspaceId) => api.get('/activity', { params: { workspace_id: workspaceId } }),
};

// ── Device Auth (Local Companion) ────────────────────────────

export const deviceApi = {
  pair: (data) => api.post('/devices/pair', data),
  list: () => api.get('/devices'),
  revoke: (deviceId) => api.delete(`/devices/${deviceId}`),
  verify: (data) => api.post('/devices/verify', data),
  companionStatus: () => api.get('/devices/companion-status'),
};

// ── Bot Service Auth (Organization Bot) ──────────────────────

export const botServiceApi = {
  createToken: (data) => api.post('/bot-service/token', data),
  listTokens: () => api.get('/bot-service/tokens'),
  revokeToken: (tokenId) => api.delete(`/bot-service/token/${tokenId}`),
  verify: (data) => api.post('/bot-service/verify', data),
  status: () => api.get('/bot-service/status'),
};

// ── Audio Capture ────────────────────────────────────────────

export const captureApi = {
  createSession: (data) => api.post('/capture/session', data),
  sessionStatus: (sessionId) => api.get(`/capture/session/${sessionId}/status`),
};

export default api;
