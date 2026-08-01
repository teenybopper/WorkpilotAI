import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, Radio, MonitorSpeaker, Play, Square, Upload,
  Loader2, AlertTriangle, Shield, ListChecks
} from 'lucide-react';
import {
  getWorkspaces, uploadMeeting, startSession, stopSession, listSessions,
  transcribeMeeting
} from '../lib/api';

const MODE_INFO = {
  local_listener: {
    icon: MonitorSpeaker,
    title: 'Live Desktop Capture',
    subtitle: 'On-device system audio & mic',
    accent: 'border-purple-500/20 text-purple-600 dark:text-purple-400',
    description: 'Captures system output & microphone directly from your local desktop companion app.',
  },
  upload: {
    icon: Upload,
    title: 'Upload Audio/Video',
    subtitle: 'WAV, MP3, M4A, OGG, WebM',
    accent: 'border-blue-500/20 text-blue-600 dark:text-blue-400',
    description: 'Upload an existing recording file to transcribe and extract meeting insights.',
  },
};

const STATUS_MAP = {
  pending: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Pending' },
  listening: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Listening' },
  processing: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', label: 'Processing' },
  completed: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed' },
  failed: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', label: 'Failed' },
  cancelled: { color: 'text-[var(--text-muted)]', bg: 'bg-stone-500/10', label: 'Cancelled' },
};

export default function MeetOpsPage() {
  const { id: workspaceId } = useParams();
  const [mode, setMode] = useState('local_listener');
  const [sessions, setSessions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(workspaceId || '');
  const [title, setTitle] = useState('');
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (selectedWs) loadSessions(); }, [selectedWs]);

  const loadWorkspaces = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await listSessions(selectedWs);
      setSessions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStart = async () => {
    if (!selectedWs) return setError('Select a workspace first');
    if (!consent) return setError('Consent is required for local audio capture');

    setStarting(true);
    setError('');
    try {
      await startSession({
        workspace_id: selectedWs,
        capture_mode: mode,
        title: title || undefined,
        consent_given: consent,
      });
      setTitle('');
      setConsent(false);
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedWs) return setError('Select a workspace first');
    if (!uploadFile) return setError('Select a file to upload');

    setUploading(true);
    setError('');
    try {
      const uploadRes = await uploadMeeting(selectedWs, uploadFile);
      const sourceId = uploadRes.data.id;
      await transcribeMeeting(sourceId);
      setUploadFile(null);
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStop = async (sessionId) => {
    try { await stopSession(sessionId); loadSessions(); }
    catch (err) { console.error(err); }
  };

  const modeConfig = MODE_INFO[mode];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const activeSessions = sessions.filter(s => ['listening', 'pending'].includes(s.status));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-1">MeetOps</h1>
        <p className="text-sm text-[var(--text-secondary)]">Record, transcribe, diarize speakers, and extract actionable insights.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="app-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-heading text-2xl text-[var(--text-primary)]">{sessions.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Total Sessions</p>
          </div>
        </div>
        <div className="app-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-heading text-2xl text-[var(--text-primary)]">{completedSessions.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Completed</p>
          </div>
        </div>
        <div className="app-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-heading text-2xl text-[var(--text-primary)]">{activeSessions.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Active Listening</p>
          </div>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Workspace:</label>
        <select
          value={selectedWs}
          onChange={(e) => setSelectedWs(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
        >
          <option value="">Select workspace...</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </div>

      {/* Capture Mode Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(MODE_INFO).map(([key, info]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`app-card p-5 text-left transition-all cursor-pointer ${
              mode === key ? 'border-[var(--btn-dark-bg)] ring-1 ring-[var(--btn-dark-bg)]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl bg-[var(--bg-primary)] border flex items-center justify-center ${info.accent}`}>
                  <info.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-[var(--text-primary)]">{info.title}</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">{info.subtitle}</p>
                </div>
              </div>
              {mode === key && <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{info.description}</p>
          </button>
        ))}
      </div>

      {/* Start / Upload Panel */}
      <div className="app-card p-6">
        <h3 className="font-heading text-xl text-[var(--text-primary)] mb-4">
          {mode === 'upload' ? 'Upload Audio File' : `Initiate Live Session — ${modeConfig.title}`}
        </h3>

        <div className="space-y-4">
          {mode === 'upload' ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Select Audio / Video File</label>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs"
                />
                {uploadFile && (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">
                    Selected: <strong className="text-[var(--text-primary)]">{uploadFile.name}</strong> ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-500">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedWs || !uploadFile}
                className="btn-dark px-5 py-2.5 text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Transcribing with Whisper...' : 'Upload & Transcribe'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Session Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Design Review, Weekly Sync"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-[var(--text-secondary)]">
                  <Shield className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                  I consent to on-device audio capture for this meeting session.
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-500">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={starting || !selectedWs}
                className="btn-dark px-5 py-2.5 text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {starting ? 'Initializing Session...' : 'Start Session'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sessions History List */}
      <div className="space-y-3">
        <h3 className="font-heading text-xl text-[var(--text-primary)]">
          Meeting Sessions Log
        </h3>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="app-card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-heading text-2xl text-[var(--text-primary)] mb-2">Welcome to MeetOps</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-6">
              Upload meeting recordings or start live audio capture. WorkPilot automatically transcribes speech, identifies speakers, and extracts actionable insights.
            </p>
            {/* Workflow steps */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 text-left max-w-2xl mx-auto">
              {[
                { step: '1', title: 'Upload or Capture', desc: 'Upload a recording or start live desktop audio capture' },
                { step: '2', title: 'ASR Transcription', desc: 'Faster-Whisper converts speech to text on-device' },
                { step: '3', title: 'Speaker Diarization', desc: 'Pyannote identifies who said what' },
                { step: '4', title: 'Extract Insights', desc: 'Tasks, decisions, blockers & risks auto-extracted' },
              ].map(s => (
                <div key={s.step} className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] flex items-center justify-center text-[10px] font-bold mb-2">{s.step}</div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{s.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
            {/* Supported formats + Privacy */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {['WAV', 'MP3', 'M4A', 'OGG', 'WebM'].map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {fmt}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>All audio stays on your device — processed locally, never uploaded to the cloud</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => {
              const st = STATUS_MAP[session.status] || STATUS_MAP.pending;
              return (
                <div key={session.id} className="app-card px-5 py-3.5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
                    {session.capture_mode === 'upload'
                      ? <Upload className="w-4 h-4 text-blue-500" />
                      : <MonitorSpeaker className="w-4 h-4 text-purple-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-lg text-[var(--text-primary)] truncate">
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {session.capture_mode === 'upload' ? 'File Upload' : 'Live Capture'}
                      {session.duration_seconds && ` • ${Math.round(session.duration_seconds / 60)} mins`}
                      {session.created_at && ` • ${new Date(session.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${st.bg} ${st.color}`}>
                    {session.status === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {st.label}
                  </span>
                  {['listening', 'pending'].includes(session.status) && (
                    <button
                      onClick={() => handleStop(session.id)}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Stop Session"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
