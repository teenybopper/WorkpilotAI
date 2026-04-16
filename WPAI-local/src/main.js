// WorkPilot Companion — Frontend Entry
// Lightweight UI for pairing, status, and audio device selection

const { invoke } = window.__TAURI__.core;

const app = document.getElementById('app');

let state = {
  view: 'loading',  // loading, pair, status, settings
  authStatus: null,
  sessionStatus: null,
  devices: [],
  error: null,
};

async function init() {
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
      workspaceId: '',  // Would be selected from UI
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

function render() {
  let html = '';

  if (state.view === 'loading') {
    html = '<div class="center"><div class="spinner"></div></div>';
  } else if (state.view === 'pair') {
    html = `
      <div class="container">
        <div class="logo">🤖</div>
        <h1>WorkPilot Companion</h1>
        <p class="subtitle">Pair this device with your WorkPilot account</p>
        <div class="form-group">
          <label>Backend URL</label>
          <input id="backend-url" type="url" value="http://localhost:8000" />
        </div>
        <div class="form-group">
          <label>Access Token</label>
          <input id="access-token" type="password" placeholder="Paste from WorkPilot settings" />
        </div>
        <div class="form-group">
          <label>Device Name</label>
          <input id="device-name" type="text" placeholder="e.g. Work Laptop" />
        </div>
        ${state.error ? `<div class="error">${state.error}</div>` : ''}
        <button class="btn-primary" onclick="doPair()">Pair Device</button>
      </div>
    `;
  } else if (state.view === 'status') {
    const isListening = state.sessionStatus?.status === 'listening';
    const statusClass = isListening ? 'status-active' : 'status-idle';
    const statusText = isListening ? '● Listening' : '○ Idle';

    html = `
      <div class="container">
        <div class="logo">🤖</div>
        <h1>WorkPilot Companion</h1>
        <div class="status-card ${statusClass}">
          <span class="status-indicator">${statusText}</span>
          ${state.sessionStatus?.chunks_sent != null
            ? `<span class="status-detail">${state.sessionStatus.chunks_sent} chunks sent</span>`
            : ''}
        </div>
        ${state.error ? `<div class="error">${state.error}</div>` : ''}
        <div class="actions">
          ${isListening
            ? '<button class="btn-danger" onclick="stopListening()">Stop</button>'
            : '<button class="btn-primary" onclick="startListening()">Start Listening</button>'}
        </div>
        <p class="hint">Tip: The companion runs in the system tray. You can close this window.</p>
      </div>
    `;
  }

  app.innerHTML = html;
}

init();
