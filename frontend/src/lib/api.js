/**
 * WorkPilot AI — API client (local desktop app, no auth)
 */
import axios from 'axios';

// Backend runs as a sidecar on localhost
// In Tauri, this will be dynamically set; for dev, use default port
const BASE_URL = window.__WORKPILOT_API_URL__ || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for AI operations
});

// ── Workspaces ──────────────────────────────────────────────────────────

export const getWorkspaces = () => api.get('/api/workspaces');
export const createWorkspace = (data) => api.post('/api/workspaces', data);
export const getWorkspace = (id) => api.get(`/api/workspaces/${id}`);
export const deleteWorkspace = (id) => api.delete(`/api/workspaces/${id}`);

// ── Documents (DocOps) ──────────────────────────────────────────────────

export const uploadDocument = (workspaceId, file) => {
  const form = new FormData();
  form.append('workspace_id', workspaceId);
  form.append('file', file);
  return api.post('/api/documents/upload', form);
};

export const extractDocument = (sourceId) =>
  api.post('/api/documents/extract', { source_id: sourceId });

export const compareDocuments = (sourceIdA, sourceIdB) =>
  api.post('/api/documents/compare', { source_id_a: sourceIdA, source_id_b: sourceIdB });

export const queryDocuments = (workspaceId, query, topK = 5) =>
  api.post('/api/documents/query', { workspace_id: workspaceId, query, top_k: topK });

// ── Meetings (MeetOps) ──────────────────────────────────────────────────

export const uploadMeeting = (workspaceId, file) => {
  const form = new FormData();
  form.append('workspace_id', workspaceId);
  form.append('file', file);
  return api.post('/api/meetings/upload', form);
};

export const transcribeMeeting = (sourceId) =>
  api.post('/api/meetings/transcribe', { source_id: sourceId });

export const diarizeMeeting = (sourceId) =>
  api.post('/api/meetings/diarize', { source_id: sourceId });

export const extractActions = (sourceId) =>
  api.post('/api/meetings/extract-actions', { source_id: sourceId });

export const getMeetingSummary = (sourceId) =>
  api.get(`/api/meetings/${sourceId}/summary`);

export const getTranscript = (sourceId) =>
  api.get(`/api/meetings/${sourceId}/transcript`);

// ── Sessions ────────────────────────────────────────────────────────────

export const startSession = (data) =>
  api.post('/api/meetings/sessions/start', data);

export const stopSession = (sessionId) =>
  api.post(`/api/meetings/sessions/${sessionId}/stop`);

export const listSessions = (workspaceId, status) =>
  api.get('/api/meetings/sessions', { params: { workspace_id: workspaceId, status } });

// ── Actions (ActionOps) ─────────────────────────────────────────────────

export const planActions = (workspaceId, scope) =>
  api.post('/api/actions/plan', { workspace_id: workspaceId, scope });

export const listActions = (workspaceId, approvalState) =>
  api.get('/api/actions', { params: { workspace_id: workspaceId, approval_state: approvalState } });

export const approveAction = (actionId) =>
  api.post(`/api/actions/${actionId}/approve`);

export const rejectAction = (actionId, reason) =>
  api.post(`/api/actions/${actionId}/reject`, { reason });

export const executeAction = (actionId) =>
  api.post(`/api/actions/${actionId}/execute`);

// ── Workspace Intelligence ──────────────────────────────────────────────

export const queryWorkspace = (workspaceId, query, topK = 5) =>
  api.post('/api/workspaces/query', { workspace_id: workspaceId, query, top_k: topK });

export const getCaseSummary = (workspaceId) =>
  api.get(`/api/workspaces/${workspaceId}/case-summary`);

export const getConflicts = (workspaceId) =>
  api.get(`/api/workspaces/${workspaceId}/conflicts`);

// ── Tasks ───────────────────────────────────────────────────────────────

export const getTasks = (workspaceId, status) =>
  api.get(`/api/workspaces/${workspaceId}/tasks`, { params: { status } });

export const updateTask = (workspaceId, taskId, data) =>
  api.patch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, data);

// ── Settings ────────────────────────────────────────────────────────────

export const getSettings = () => api.get('/api/settings');
export const updateSettings = (data) => api.put('/api/settings', data);
export const getSettingsStatus = () => api.get('/api/settings/status');
export const getUserProfile = () => api.get('/api/auth/me');

// ── Integrations ────────────────────────────────────────────────────────

export const getAvailableTools = () => api.get('/api/integrations/available-tools');
export const getConnectedTools = () => api.get('/api/integrations/connected');
export const connectTool = (data) => api.post('/api/integrations/connect', data);
export const disconnectTool = (toolId) => api.delete(`/api/integrations/${toolId}`);

export default api;
