import { useState, useEffect } from 'react';
import {
  Plug, Plus, CheckCircle2, XCircle, Loader2,
  Trash2, Key
} from 'lucide-react';
import { getAvailableTools, getConnectedTools, connectTool, disconnectTool } from '../lib/api';

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
        getAvailableTools(),
        getConnectedTools(),
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
      await connectTool({
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
      await disconnectTool(toolId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-1">Integrations Hub</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage API keys and authentication tokens for ActionOps MCP adapters.
        </p>
      </div>

      {/* Connected tools */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl text-[var(--text-primary)]">
          Active Integrations ({connectedTools.length})
        </h2>

        {connectedTools.length === 0 ? (
          <div className="app-card p-8 text-center">
            <Plug className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-60" />
            <p className="text-xs text-[var(--text-secondary)]">No tools connected yet. Connect your first integration below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedTools.map(tool => (
              <div key={tool.id} className="app-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TOOL_ICONS[tool.tool_type] || '🔧'}</span>
                    <div>
                      <h3 className="font-heading text-lg text-[var(--text-primary)]">{tool.display_name}</h3>
                      <p className="text-[11px] text-[var(--text-muted)]">{tool.tool_type}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    tool.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {tool.status === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {tool.status}
                  </span>
                </div>

                <button
                  onClick={() => handleDisconnect(tool.id)}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:underline mt-3 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available tools catalog */}
      <section className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
        <h2 className="font-heading text-xl text-[var(--text-primary)]">
          Supported Tool Registry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableTools.map(tool => {
            const isConnected = connectedTools.some(
              ct => ct.tool_type === tool.tool_type && ct.status === 'connected'
            );
            const isExpanded = connectingType === tool.tool_type;

            return (
              <div key={tool.tool_type} className="app-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">{TOOL_ICONS[tool.tool_type] || '🔧'}</span>
                    <div>
                      <h3 className="font-heading text-lg text-[var(--text-primary)]">{tool.display_name}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{tool.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-2">
                    <Key className="w-3 h-3" /> Auth: {tool.auth_type}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] mt-3">
                  {isConnected ? (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : isExpanded ? (
                    <div className="space-y-2">
                      {tool.config_fields.map(field => (
                        <div key={field.name}>
                          <label className="block text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-1">
                            {field.description}
                          </label>
                          <input
                            type={field.type === 'secret' ? 'password' : 'text'}
                            placeholder={field.name}
                            onChange={(e) => setConnectForm(prev => ({
                              ...prev,
                              config: { ...prev.config, [field.name]: e.target.value }
                            }))}
                            className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none"
                          />
                        </div>
                      ))}
                      {error && <p className="text-[11px] text-rose-500">{error}</p>}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleConnect(tool.tool_type)}
                          className="btn-dark px-3 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          Save Connection
                        </button>
                        <button
                          onClick={() => { setConnectingType(null); setError(''); }}
                          className="px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConnectingType(tool.tool_type)}
                      className="btn-dark px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
