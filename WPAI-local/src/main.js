// WorkPilot Companion — Frontend Entry
// Editorial Design System aligned with WorkPilot AI Web

const { invoke } = window.__TAURI__?.core || { invoke: async () => ({}) };

const app = document.getElementById('app');

let state = {
  view: 'loading',  // loading, pair, status, settings
  authStatus: null,
  sessionStatus: null,
  devices: [],
  error: null,
  backendOnline: false,
};

// Theme Management (Synced with WorkPilot AI Web App)
let currentTheme = localStorage.getItem('workpilot_theme') ||
  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('workpilot_theme', theme);
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  render();
}

// ── Backend Health Check ────────────────────────────────────────────────

const BACKEND_URL = 'http://localhost:8000';

async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const wasOffline = !state.backendOnline;
    state.backendOnline = res.ok;
    if (wasOffline && res.ok) render(); // re-render on status change
    else if (!wasOffline && !res.ok) render();
  } catch {
    if (state.backendOnline) {
      state.backendOnline = false;
      render();
    }
  }
}

// Poll backend health every 10 seconds
checkBackendHealth();
setInterval(checkBackendHealth, 10000);

// ── Core App Logic ──────────────────────────────────────────────────────

async function init() {
  applyTheme(currentTheme);
  try {
    const authStatus = await invoke('get_auth_status');
    state.authStatus = authStatus;
    state.view = authStatus.paired ? 'status' : 'pair';
  } catch (e) {
    state.view = 'pair';
  }
  render();
}

async function doPair() {
  const backendUrl = document.getElementById('backend-url').value;
  const accessToken = document.getElementById('access-token').value;
  const deviceName = document.getElementById('device-name').value;

  if (!backendUrl || !accessToken || !deviceName) {
    state.error = 'All fields are required';
    render();
    return;
  }

  try {
    await invoke('pair_device', { backendUrl, accessToken, deviceName });
    state.authStatus = await invoke('get_auth_status');
    state.view = 'status';
    state.error = null;
  } catch (e) {
    state.error = String(e);
  }
  render();
}

async function startListening() {
  try {
    const result = await invoke('start_listening', {
      workspaceId: '',
      title: null,
    });
    state.sessionStatus = result;
    state.error = null;
  } catch (e) {
    state.error = String(e);
  }
  render();
}

async function stopListening() {
  try {
    const result = await invoke('stop_listening');
    state.sessionStatus = result;
    state.error = null;
  } catch (e) {
    state.error = String(e);
  }
  render();
}

async function refreshStatus() {
  try {
    state.sessionStatus = await invoke('get_session_status');
  } catch (e) {
    console.error(e);
  }
  render();
}

function openFeedback() {
  const url = 'https://github.com/teenybopper/workpilotAI/issues';
  if (window.__TAURI__?.shell) {
    window.__TAURI__.shell.open(url);
  } else {
    window.open(url, '_blank');
  }
}

const sunIconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const moonIconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const bugIconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`;

function renderHeader() {
  const statusClass = state.backendOnline ? 'backend-online' : 'backend-offline';
  const statusLabel = state.backendOnline ? 'Backend Connected' : 'Backend Starting\u2026';

  return `
    <header class="app-header">
      <div class="brand-group">
        <img src="logo-w-dark.svg" class="brand-logo" alt="WorkPilot AI Logo" />
        <span class="brand-title">WorkPilot</span>
        <span class="brand-tag">Companion</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="backend-status ${statusClass}">
          <span class="backend-status-dot"></span>
          ${statusLabel}
        </span>
        <button class="theme-toggle-btn" onclick="toggleTheme()" title="Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode">
          ${currentTheme === 'dark' ? sunIconSvg : moonIconSvg}
        </button>
      </div>
    </header>
  `;
}

function render() {
  let html = renderHeader();

  if (state.view === 'loading') {
    html += '<div class="center"><div class="spinner"></div></div>';
  } else if (state.view === 'pair') {
    html += `
      <div class="container">
        <div class="hero-section">
          <img src="logo-w-dark.svg" class="app-logo-large" alt="WorkPilot AI Logo" />
          <h1 class="hero-title">Pair Companion Device</h1>
          <p class="subtitle">Connect this desktop companion with your WorkPilot AI workspace</p>
        </div>

        <div class="app-card">
          <div class="form-group">
            <label>Backend Control Plane URL</label>
            <input id="backend-url" type="url" value="http://localhost:8000" placeholder="http://127.0.0.1:8000" />
          </div>
          <div class="form-group">
            <label>Access Token</label>
            <input id="access-token" type="password" placeholder="Paste access token from settings" />
          </div>
          <div class="form-group">
            <label>Companion Device Name</label>
            <input id="device-name" type="text" value="Work Laptop Companion" placeholder="e.g. Work Laptop" />
          </div>
          ${state.error ? `<div class="error">${state.error}</div>` : ''}
          <button class="btn-primary" onclick="doPair()">Pair Device</button>
        </div>
      </div>
    `;
  } else if (state.view === 'status') {
    const isListening = state.sessionStatus?.status === 'listening';
    const statusClass = isListening ? 'status-active' : 'status-idle';
    const statusText = isListening ? 'Listening Active' : 'Companion Idle';

    html += `
      <div class="container">
        <div class="hero-section">
          <img src="logo-w-dark.svg" class="app-logo-large" alt="WorkPilot AI Logo" />
          <h1 class="hero-title">WorkPilot Companion</h1>
          <p class="subtitle">On-device live audio capture & meeting synchronization</p>
        </div>

        <div class="status-card ${statusClass}">
          <div class="status-header-row">
            <span class="status-indicator-dot"></span>
            <span class="status-title">${statusText}</span>
          </div>
          ${state.sessionStatus?.chunks_sent != null
            ? `<span class="status-detail">${state.sessionStatus.chunks_sent} audio chunks streamed to FastAPI control plane</span>`
            : '<span class="status-detail">Ready to capture live desktop audio & mic</span>'}
        </div>

        ${state.error ? `<div class="error">${state.error}</div>` : ''}

        <div class="actions">
          ${isListening
            ? '<button class="btn-danger" onclick="stopListening()">Stop Recording</button>'
            : '<button class="btn-primary" onclick="startListening()">Start Live Audio Ingestion</button>'}
        </div>

        <p class="hint">Tip: WorkPilot Companion runs in the background. You can minimize or close this window anytime.</p>
      </div>
    `;
  }

  // Footer with feedback link
  html += `
    <footer class="companion-footer">
      <button class="feedback-link" onclick="openFeedback()">
        ${bugIconSvg} Report Bug / Feedback
      </button>
      <span class="footer-version">v0.1.0</span>
    </footer>
  `;

  app.innerHTML = html;
}

// Expose handlers to global window scope for inline event bindings
window.doPair = doPair;
window.startListening = startListening;
window.stopListening = stopListening;
window.toggleTheme = toggleTheme;
window.openFeedback = openFeedback;

init();

