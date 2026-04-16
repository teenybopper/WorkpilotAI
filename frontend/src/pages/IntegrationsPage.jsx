import { useState, useEffect } from 'react';
import {
  Plug, Plus, CheckCircle2, XCircle, Loader2,
  AlertTriangle, ExternalLink, Trash2, RefreshCw,
  Key, Globe
} from 'lucide-react';
import { integrationApi } from '../lib/api';

const TOOL_ICONS = {
  jira: '🎫',
  slack: '💬',
  google_docs: '📄',
  email: '✉️',
};

export default function IntegrationsPage() {
  const [availableTools, setAvailableTools] = useState([]);
  const [connectedTools, setConnectedTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState(null);
  const [connectForm, setConnectForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avail, connected] = await Promise.all([
        integrationApi.availableTools(),
        integrationApi.connected(),
      ]);
      setAvailableTools(avail.data);
      setConnectedTools(connected.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (toolType) => {
    const tool = availableTools.find(t => t.tool_type === toolType);
    if (!tool) return;

    setError('');
    try {
      await integrationApi.connect({
        tool_type: toolType,
        display_name: tool.display_name,
        auth_config: connectForm.auth || {},
        config: connectForm.config || {},
      });
      setConnectingType(null);
      setConnectForm({});
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to connect';
      setError(msg);
    }
  };

  const handleDisconnect = async (toolId) => {
    if (!confirm('Disconnect this tool?')) return;
    try {
      await integrationApi.disconnect(toolId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">Integrations</h1>
        <p className="text-surface-600">
          Connect external tools to enable ActionOps execution. All integrations are managed here.
        </p>
      </div>

      {/* Connected tools */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
          Connected Tools ({connectedTools.length})
        </h2>

        {connectedTools.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Plug className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-sm text-surface-600">No tools connected yet. Connect your first tool below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedTools.map(tool => (
              <div key={tool.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TOOL_ICONS[tool.tool_type] || '🔧'}</span>
                    <div>
                      <h3 className="font-semibold text-surface-950">{tool.display_name}</h3>
                      <p className="text-xs text-surface-600">{tool.tool_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      tool.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {tool.status === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {tool.status}
                    </span>
                  </div>
                </div>

                {tool.capabilities && tool.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tool.capabilities.map(cap => (
                      <span key={cap} className="px-2 py-0.5 rounded-md bg-surface-200/60 text-xs text-surface-700">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleDisconnect(tool.id)}
                  className="flex items-center gap-1.5 text-xs text-surface-600 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available tools catalog */}
      <section>
        <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
          Available Tools
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableTools.map(tool => {
            const isConnected = connectedTools.some(
              ct => ct.tool_type === tool.tool_type && ct.status === 'connected'
            );
            const isExpanded = connectingType === tool.tool_type;

            return (
              <div key={tool.tool_type} className={`glass-card p-5 ${isExpanded ? 'border-primary-500/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TOOL_ICONS[tool.tool_type] || '🔧'}</span>
                    <div>
                      <h3 className="font-semibold text-surface-950">{tool.display_name}</h3>
                      <p className="text-xs text-surface-600">{tool.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tool.capabilities.map(cap => (
                    <span key={cap} className="px-2 py-0.5 rounded-md bg-surface-200/60 text-xs text-surface-700">
                      {cap}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-surface-600 mb-3">
                  <Key className="w-3 h-3" />
                  Auth: {tool.auth_type}
                </div>

                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Already connected
                  </span>
                ) : isExpanded ? (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    {tool.config_fields.map(field => (
                      <div key={field.name}>
                        <label className="block text-xs font-medium text-surface-700 mb-1">
                          {field.description} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        <input
                          type={field.type === 'secret' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                          placeholder={field.name}
                          onChange={(e) => setConnectForm(prev => ({
                            ...prev,
                            config: { ...prev.config, [field.name]: e.target.value }
                          }))}
                          className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    ))}
                    {error && <p className="text-xs text-rose-400">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConnect(tool.tool_type)}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-medium cursor-pointer"
                      >
                        Connect
                      </button>
                      <button
                        onClick={() => { setConnectingType(null); setError(''); }}
                        className="px-3 py-2 rounded-lg text-surface-600 text-xs font-medium hover:bg-surface-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConnectingType(tool.tool_type)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-200/60 border border-white/5 text-xs text-surface-800 font-medium hover:border-primary-500/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
