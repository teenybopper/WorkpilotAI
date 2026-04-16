import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, Radio, MonitorSpeaker, Play, Square, Clock,
  CheckCircle2, XCircle, Loader2, AlertTriangle,
  Video, Sparkles, Shield, Bot, Calendar,
  BarChart3, ListChecks, MessageSquare, Users, Monitor, Download
} from 'lucide-react';
import { meetingSessionApi, workspaceApi } from '../lib/api';

const MODE_INFO = {
  local_listener: {
    icon: MonitorSpeaker,
    title: 'Personal Mode',
    subtitle: 'Listen locally on your device',
    color: 'from-purple-500 to-pink-500',
    description: 'Captures audio from your system/browser. The assistant stays on your device — it does not join the meeting room.',
  },
  bot_join: {
    icon: Video,
    title: 'Business Mode',
    subtitle: 'Bot joins the meeting room',
    color: 'from-blue-500 to-cyan-500',
    description: 'A meeting assistant bot joins the call as a participant. Available on Team and Enterprise plans.',
  },
};

const STATUS_MAP = {
  pending: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Pending' },
  joining: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Joining...' },
  listening: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Listening' },
  processing: { color: 'text-primary-400', bg: 'bg-primary-500/10', label: 'Processing' },
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed' },
  failed: { color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Failed' },
  cancelled: { color: 'text-surface-500', bg: 'bg-surface-500/10', label: 'Cancelled' },
};

export default function MeetOpsPage() {
  const { id: workspaceId } = useParams();
  const { user, organization } = useAuth();
  const defaultMode = organization ? 'bot_join' : 'local_listener';
  const [mode, setMode] = useState(defaultMode);
  const [sessions, setSessions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(workspaceId || '');
  const [title, setTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (selectedWs) loadSessions(); }, [selectedWs]);

  const loadWorkspaces = async () => {
    try {
      const res = await workspaceApi.list();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await meetingSessionApi.list(selectedWs);
      setSessions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStart = async () => {
    if (!selectedWs) return setError('Select a workspace first');
    if (!consent) return setError('You must give consent to capture audio');
    if (mode === 'bot_join' && !meetingUrl) return setError('Meeting URL is required for bot mode');

    setStarting(true);
    setError('');
    try {
      await meetingSessionApi.start({
        workspace_id: selectedWs,
        capture_mode: mode,
        title: title || undefined,
        meeting_url: mode === 'bot_join' ? meetingUrl : undefined,
        consent_given: consent,
        platform: mode === 'bot_join' ? undefined : 'system_audio',
      });
      setTitle('');
      setMeetingUrl('');
      setConsent(false);
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (sessionId) => {
    try { await meetingSessionApi.stop(sessionId); loadSessions(); }
    catch (err) { console.error(err); }
  };

  const modeConfig = MODE_INFO[mode];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const activeSessions = sessions.filter(s => ['listening', 'joining', 'pending'].includes(s.status));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">MeetOps</h1>
        <p className="text-surface-600">Your AI meeting assistant — joins meetings, transcribes, and extracts action items.</p>
      </div>

      {/* Bot status & insights strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
        <div className="glass-card p-4 flex items-center gap-3 sm:col-span-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-950">WorkPilot Meeting Bot</p>
            <p className="text-xs text-surface-600">
              {activeSessions.length > 0
                ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}</span>
                : 'Ready to join your next meeting'
              }
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-surface-950">{sessions.length}</p>
            <p className="text-xs text-surface-600">Total Sessions</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-surface-950">{completedSessions.length}</p>
            <p className="text-xs text-surface-600">Completed</p>
          </div>
        </div>
      </div>

      {/* Workspace selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-2">Workspace</label>
        <select
          value={selectedWs}
          onChange={(e) => setSelectedWs(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 text-sm focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="">Select workspace...</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {Object.entries(MODE_INFO).map(([key, info]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              mode === key ? 'border-primary-500/40 glow-pulse' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
                <info.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-950">{info.title}</h3>
                <p className="text-xs text-surface-600">{info.subtitle}</p>
              </div>
              {mode === key && <Radio className="w-4 h-4 text-primary-400 ml-auto" />}
            </div>
            <p className="text-sm text-surface-700">{info.description}</p>
          </button>
        ))}
      </div>

      {/* Setup CTA */}
      {mode === 'local_listener' && (
        <Link to="/setup/companion" className="glass-card p-4 mb-6 flex items-center gap-3 group border-pink-500/20 hover:border-pink-500/40 transition-all">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-4 h-4 text-pink-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-950 group-hover:text-primary-400 transition-colors">Set up Local Companion</p>
            <p className="text-xs text-surface-600">Install and pair the desktop app to start capturing audio</p>
          </div>
          <Download className="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors" />
        </Link>
      )}
      {mode === 'bot_join' && organization && (
        <Link to="/setup/bot" className="glass-card p-4 mb-6 flex items-center gap-3 group border-cyan-500/20 hover:border-cyan-500/40 transition-all">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-950 group-hover:text-primary-400 transition-colors">Configure Bot Service</p>
            <p className="text-xs text-surface-600">Set up provider connections and service tokens</p>
          </div>
        </Link>
      )}

      {/* Session start form */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
          Start New Session — {modeConfig.title}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-800 mb-1.5">Session Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning, 1:1 with Manager"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
            />
          </div>

          {mode === 'bot_join' && (
            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Meeting URL</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
              />
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 accent-primary-500"
            />
            <span className="text-sm text-surface-700">
              <Shield className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
              I consent to audio capture for this session. {mode === 'bot_join'
                ? 'The bot will join as a visible participant.'
                : 'Audio will be captured locally on my device.'
              }
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-400">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={starting || !selectedWs}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-40 cursor-pointer"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {starting ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      </div>

      {/* Meeting log */}
      <div>
        <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
          Meeting Log
        </h3>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Mic className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-sm text-surface-600">No meetings yet. Start your first MeetOps session above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => {
              const st = STATUS_MAP[session.status] || STATUS_MAP.pending;
              return (
                <div key={session.id} className="glass-card px-5 py-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    session.capture_mode === 'bot_join'
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : 'bg-purple-500/10 border border-purple-500/20'
                  }`}>
                    {session.capture_mode === 'bot_join'
                      ? <Video className="w-4 h-4 text-blue-400" />
                      : <MonitorSpeaker className="w-4 h-4 text-purple-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-950 truncate">
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-xs text-surface-600 mt-0.5">
                      {session.capture_mode === 'bot_join' ? 'Bot Join' : 'Local Listener'}
                      {session.platform && ` • ${session.platform}`}
                      {session.duration_seconds && ` • ${Math.round(session.duration_seconds / 60)}m`}
                      {session.created_at && ` • ${new Date(session.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${st.bg} ${st.color}`}>
                    {session.status === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {st.label}
                  </span>
                  {['listening', 'joining', 'pending'].includes(session.status) && (
                    <button
                      onClick={() => handleStop(session.id)}
                      className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 text-rose-400" />
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
