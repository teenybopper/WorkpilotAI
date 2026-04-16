import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bot, Key, Plus, CheckCircle2, XCircle, Loader2, Trash2,
  Shield, Copy, Check, AlertTriangle, Video, MessageSquare,
  Headphones, Radio, Clock, RefreshCw, Settings2
} from 'lucide-react';
import { botServiceApi } from '../lib/api';

const PROVIDERS = [
  {
    id: 'google_meet', name: 'Google Meet', icon: '📹',
    color: 'from-green-500 to-emerald-500',
    desc: 'Join Google Meet calls as a visible bot participant',
    status: 'ready',
  },
  {
    id: 'microsoft_teams', name: 'Microsoft Teams', icon: '🟦',
    color: 'from-blue-500 to-indigo-500',
    desc: 'Join Teams meetings via Bot Framework',
    status: 'ready',
  },
  {
    id: 'slack', name: 'Slack', icon: '💬',
    color: 'from-purple-500 to-pink-500',
    desc: 'Join Slack Huddles and capture audio',
    status: 'coming_soon',
  },
  {
    id: 'discord', name: 'Discord', icon: '🎮',
    color: 'from-indigo-500 to-violet-500',
    desc: 'Join Discord voice channels',
    status: 'coming_soon',
  },
];

export default function OrgBotSetupPage() {
  const { organization } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadTokens(); }, []);

  const loadTokens = async () => {
    try {
      const res = await botServiceApi.listTokens();
      setTokens(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!serviceName.trim()) {
      setError('Service name is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await botServiceApi.createToken({ service_name: serviceName });
      setNewToken(res.data);
      setServiceName('');
      setShowCreate(false);
      loadTokens();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId) => {
    try {
      await botServiceApi.revokeToken(tokenId);
      loadTokens();
    } catch (err) { console.error(err); }
  };

  const copyToken = () => {
    if (newToken?.token) {
      navigator.clipboard.writeText(newToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">Organization Bot Setup</h1>
        <p className="text-surface-600">
          Configure the meeting bot service for {organization?.name || 'your organization'}.
          The bot joins calls as a visible participant.
        </p>
      </div>

      {/* Provider grid */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-surface-950 mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary-400" /> Meeting Providers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg text-lg`}>
                  {p.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-surface-950">{p.name}</h3>
                  <p className="text-xs text-surface-600">{p.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  p.status === 'ready'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {p.status === 'ready' ? 'Ready' : 'Coming Soon'}
                </span>
              </div>
              {p.status === 'ready' && (
                <p className="text-xs text-surface-600">
                  <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-400" />
                  Adapter contract ready. Configure provider credentials in bot service.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Token created notification */}
      {newToken && (
        <div className="glass-card p-6 mb-8 border-emerald-500/30 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">Bot Service Token Created!</span>
          </div>
          <p className="text-sm text-surface-700 mb-3">
            Configure the bot service with this token. It authenticates requests to the WorkPilot backend.
          </p>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-200 border border-amber-500/30 mb-4">
            <code className="flex-1 text-xs font-mono text-amber-400 break-all">{newToken.token}</code>
            <button onClick={copyToken} className="p-2 rounded-lg hover:bg-surface-300 transition-colors cursor-pointer flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-surface-600" />}
            </button>
          </div>
          <p className="text-xs text-rose-400 mb-4">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            This token is shown only once. Store it securely in your bot service configuration.
          </p>
          <button
            onClick={() => setNewToken(null)}
            className="px-4 py-2 rounded-xl bg-surface-200 hover:bg-surface-300 text-sm text-surface-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Service tokens */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-950 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-400" /> Service Tokens
          </h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Token
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="glass-card p-5 mb-4 animate-fade-in-up">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-800 mb-1.5">Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Production Bot Service"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Generate Token'}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="px-4 py-2 rounded-xl text-sm text-surface-800 hover:bg-surface-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Key className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-sm text-surface-600">No service tokens yet. Create one to connect your bot service.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div key={token.id} className="glass-card px-5 py-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  token.is_active ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-surface-300/40 border border-surface-400/20'
                }`}>
                  <Bot className={`w-4 h-4 ${token.is_active ? 'text-primary-400' : 'text-surface-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-950 truncate">{token.service_name}</p>
                  <p className="text-xs text-surface-600 mt-0.5">
                    Created {new Date(token.created_at).toLocaleDateString()}
                    {token.last_used_at && ` • Last used ${new Date(token.last_used_at).toLocaleString()}`}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  token.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-300/40 text-surface-500'
                }`}>
                  {token.is_active ? 'Active' : 'Revoked'}
                </span>
                {token.is_active && (
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Revoke token"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
