import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Zap, Plug, Activity, CheckCircle2, XCircle, Clock, Loader2,
  ThumbsUp, ThumbsDown, Play, AlertTriangle, ExternalLink,
  Plus, Trash2, RefreshCw, Key, ChevronDown, ChevronRight,
  BarChart3, ArrowRight, Sparkles, Shield, Link2, Settings2,
  GitBranch, FileText, MessageSquare, LayoutGrid
} from 'lucide-react';
import { actionApi, integrationApi, workspaceApi } from '../lib/api';

// ── Integration catalog ──────────────────────────────────────────────
const INTEGRATION_CATALOG = [
  {
    type: 'jira', name: 'Jira', icon: '🎫', color: 'from-blue-500 to-blue-600',
    description: 'Create issues, update status, manage sprints and epics',
    actions: ['Create Issue', 'Update Status', 'Add Comment', 'Assign User', 'Manage Sprint'],
    auth: 'API Token', category: 'Project Management'
  },
  {
    type: 'clickup', name: 'ClickUp', icon: '✅', color: 'from-purple-500 to-violet-600',
    description: 'Create tasks, update statuses, manage lists and spaces',
    actions: ['Create Task', 'Update Status', 'Add Comment', 'Set Priority', 'Manage List'],
    auth: 'API Token', category: 'Project Management'
  },
  {
    type: 'linear', name: 'Linear', icon: '📐', color: 'from-indigo-500 to-blue-600',
    description: 'Create issues, manage cycles, update priorities and labels',
    actions: ['Create Issue', 'Update State', 'Add Comment', 'Set Priority', 'Manage Cycle'],
    auth: 'API Key', category: 'Project Management'
  },
  {
    type: 'asana', name: 'Asana', icon: '🎯', color: 'from-rose-500 to-pink-600',
    description: 'Create tasks, manage projects, track milestones',
    actions: ['Create Task', 'Update Status', 'Assign', 'Set Due Date', 'Add to Project'],
    auth: 'API Token', category: 'Project Management'
  },
  {
    type: 'trello', name: 'Trello', icon: '📋', color: 'from-sky-500 to-blue-500',
    description: 'Create cards, move between lists, manage boards',
    actions: ['Create Card', 'Move Card', 'Add Label', 'Add Comment', 'Archive'],
    auth: 'API Key + Token', category: 'Project Management'
  },
  {
    type: 'monday', name: 'Monday.com', icon: '📊', color: 'from-red-500 to-orange-500',
    description: 'Create items, update columns, manage boards',
    actions: ['Create Item', 'Update Column', 'Add Update', 'Move Group'],
    auth: 'API Token', category: 'Project Management'
  },
  {
    type: 'github', name: 'GitHub', icon: '🐙', color: 'from-gray-600 to-gray-800',
    description: 'Create issues, comment on PRs, manage project boards',
    actions: ['Create Issue', 'Add Comment', 'Update Label', 'Close Issue'],
    auth: 'Personal Access Token', category: 'Development'
  },
  {
    type: 'google_docs', name: 'Google Docs', icon: '📄', color: 'from-blue-400 to-cyan-500',
    description: 'Create documents, append content, share with team',
    actions: ['Create Document', 'Append Content', 'Share', 'Add Comment'],
    auth: 'OAuth 2.0', category: 'Documentation'
  },
  {
    type: 'notion', name: 'Notion', icon: '📝', color: 'from-gray-500 to-gray-700',
    description: 'Create pages, update databases, add content blocks',
    actions: ['Create Page', 'Update Database', 'Add Block', 'Share'],
    auth: 'Integration Token', category: 'Documentation'
  },
  {
    type: 'confluence', name: 'Confluence', icon: '📚', color: 'from-blue-600 to-indigo-600',
    description: 'Create pages, update spaces, manage documentation',
    actions: ['Create Page', 'Update Page', 'Add Comment', 'Manage Space'],
    auth: 'API Token', category: 'Documentation'
  },
  {
    type: 'slack', name: 'Slack', icon: '💬', color: 'from-green-500 to-emerald-600',
    description: 'Send messages, create channels, post updates and summaries',
    actions: ['Send Message', 'Post Update', 'Create Channel', 'Share File'],
    auth: 'Bot Token', category: 'Communication'
  },
  {
    type: 'teams', name: 'Microsoft Teams', icon: '👥', color: 'from-violet-500 to-purple-600',
    description: 'Send messages, create tasks in Planner, post in channels',
    actions: ['Send Message', 'Create Planner Task', 'Post in Channel'],
    auth: 'OAuth 2.0', category: 'Communication'
  },
];

// ── Severity config ──────────────────────────────────────────────────
const SEVERITY_MAP = {
  light: { label: 'Light', desc: 'Auto-executed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '⚡' },
  medium: { label: 'Medium', desc: 'Execute & Notify', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '📢' },
  heavy: { label: 'Heavy', desc: 'Requires Approval', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '🛡️' },
};

const APPROVAL_STATUS_MAP = {
  auto_executed: { label: 'Auto-Executed', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  notified: { label: 'Notified', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  pending_approval: { label: 'Pending Approval', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  approved: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  rejected: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  executing: { label: 'Executing', color: 'text-primary-400', bg: 'bg-primary-500/10' },
  executed: { label: 'Executed', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'Failed', color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

export default function ActionOpsPage() {
  const { id: workspaceId } = useParams();
  const [activeTab, setActiveTab] = useState('approvals');

  // Approvals state
  const [actions, setActions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(workspaceId || '');
  const [actionsLoading, setActionsLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Integrations state
  const [connectedTools, setConnectedTools] = useState([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [connectingType, setConnectingType] = useState(null);
  const [connectForm, setConnectForm] = useState({});
  const [connectError, setConnectError] = useState('');

  // Activity state
  const [activities, setActivities] = useState([]);

  useEffect(() => { loadWorkspaces(); loadIntegrations(); }, []);
  useEffect(() => { if (selectedWs) loadActions(); }, [selectedWs]);

  const loadWorkspaces = async () => {
    try {
      const res = await workspaceApi.list();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadActions = async () => {
    setActionsLoading(true);
    try {
      const res = await actionApi.list(selectedWs);
      setActions(res.data || []);
    } catch (err) { setActions([]); }
    finally { setActionsLoading(false); }
  };

  const loadIntegrations = async () => {
    setIntegrationsLoading(true);
    try {
      const res = await integrationApi.connected();
      setConnectedTools(res.data || []);
    } catch (err) { setConnectedTools([]); }
    finally { setIntegrationsLoading(false); }
  };

  const handleApprove = async (id) => {
    try { await actionApi.approve(id); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return;
    try { await actionApi.reject(id, rejectReason); setRejectId(null); setRejectReason(''); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleExecute = async (id) => {
    try { await actionApi.execute(id); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleConnect = async (toolType) => {
    const tool = INTEGRATION_CATALOG.find(t => t.type === toolType);
    if (!tool) return;
    setConnectError('');
    try {
      await integrationApi.connect({
        tool_type: toolType,
        display_name: tool.name,
        auth_config: connectForm.auth || {},
        config: connectForm.config || {},
      });
      setConnectingType(null);
      setConnectForm({});
      loadIntegrations();
    } catch (err) {
      setConnectError(err.response?.data?.detail || 'Failed to connect');
    }
  };

  const handleDisconnect = async (toolId) => {
    if (!confirm('Disconnect this integration?')) return;
    try { await integrationApi.disconnect(toolId); loadIntegrations(); }
    catch (err) { console.error(err); }
  };

  const tabs = [
    { id: 'approvals', label: 'Pending Approvals', icon: Shield, count: actions.filter(a => a.approval_status === 'pending_approval' || a.approval_state === 'proposed').length },
    { id: 'integrations', label: 'Integrations', icon: Plug, count: connectedTools.length },
    { id: 'activity', label: 'Activity Log', icon: Activity, count: null },
  ];

  const pendingActions = actions.filter(a =>
    a.approval_status === 'pending_approval' || a.approval_state === 'proposed'
  );
  const completedActions = actions.filter(a =>
    !['pending_approval', 'proposed'].includes(a.approval_status || a.approval_state)
  );

  const categories = [...new Set(INTEGRATION_CATALOG.map(t => t.category))];

  // Mock activity data (from actual actions)
  const activityItems = actions.filter(a => a.approval_status !== 'pending_approval' && a.approval_state !== 'proposed').map(a => ({
    id: a.id,
    title: a.title,
    type: a.action_type,
    status: a.approval_status || a.approval_state || 'executed',
    severity: a.severity || a.risk_level || 'medium',
    tool: a.target_object_id,
    created: a.created_at,
    description: a.description,
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">ActionOps</h1>
          <p className="text-surface-600">Connect your tools, approve AI-suggested actions, and track execution.</p>
        </div>
      </div>

      {/* Severity legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {Object.entries(SEVERITY_MAP).map(([key, s]) => (
          <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${s.bg} border ${s.border}`}>
            <span className="text-sm">{s.icon}</span>
            <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
            <span className="text-xs text-surface-600">— {s.desc}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface-200/40 border border-white/5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-surface-300 text-surface-950 shadow-sm'
                : 'text-surface-600 hover:text-surface-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab.id === 'approvals' ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-400/30 text-surface-600'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Pending Approvals ────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div>
          {/* Workspace selector */}
          <div className="mb-4">
            <select value={selectedWs} onChange={(e) => setSelectedWs(e.target.value)}
              className="px-4 py-2 rounded-xl bg-surface-200 border border-white/5 text-surface-950 text-sm focus:outline-none focus:border-primary-500 cursor-pointer">
              <option value="">Select workspace...</option>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>

          {actionsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
          ) : pendingActions.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Shield className="w-10 h-10 text-surface-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-surface-800 mb-2">No pending approvals</h3>
              <p className="text-sm text-surface-600">
                When meeting action items require user approval (heavy-stage), they'll appear here.
                Light actions execute automatically. Medium actions execute and notify.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingActions.map(action => {
                const severity = SEVERITY_MAP[action.severity || action.risk_level] || SEVERITY_MAP.heavy;
                const status = APPROVAL_STATUS_MAP[action.approval_status || action.approval_state] || APPROVAL_STATUS_MAP.pending_approval;
                return (
                  <div key={action.id} className="glass-card p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${severity.bg} border ${severity.border} flex items-center justify-center flex-shrink-0 text-lg`}>
                        {severity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-semibold text-surface-950">{action.title}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${severity.bg} ${severity.color}`}>
                            {severity.label}
                          </span>
                        </div>
                        {action.description && <p className="text-sm text-surface-700 mb-2">{action.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-surface-600">
                          <span className="bg-surface-200/60 px-2 py-0.5 rounded">{action.action_type}</span>
                          {action.target_object_id && (
                            <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {action.target_object_id}</span>
                          )}
                          {action.confidence && <span>{Math.round(action.confidence * 100)}% confidence</span>}
                          {action.owner && <span>→ {action.owner}</span>}
                        </div>
                        {action.source_evidence && action.source_evidence.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Evidence</p>
                            {action.source_evidence.slice(0, 2).map((ev, i) => (
                              <p key={i} className="text-xs text-surface-600 italic border-l-2 border-surface-400 pl-3">
                                [{ev.type}] "{ev.text?.slice(0, 120)}..."
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Approval buttons */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => handleApprove(action.id)} className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer" title="Approve">
                          <ThumbsUp className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button onClick={() => setRejectId(action.id)} className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer" title="Reject">
                          <ThumbsDown className="w-4 h-4 text-rose-400" />
                        </button>
                      </div>
                    </div>
                    {rejectId === action.id && (
                      <div className="mt-4 flex items-center gap-2">
                        <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..."
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 text-sm focus:outline-none focus:border-primary-500" autoFocus />
                        <button onClick={() => handleReject(action.id)} className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium hover:bg-rose-500/20 cursor-pointer">Confirm</button>
                        <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-3 py-2 rounded-lg text-surface-600 text-xs font-medium hover:bg-surface-200 cursor-pointer">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Integrations ─────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div>
          {/* Connected tools */}
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
              Connected ({connectedTools.length})
            </h2>
            {integrationsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
            ) : connectedTools.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Plug className="w-8 h-8 text-surface-500 mx-auto mb-2" />
                <p className="text-sm text-surface-600">No integrations connected yet. Connect your tools below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedTools.map(tool => {
                  const catalog = INTEGRATION_CATALOG.find(t => t.type === tool.tool_type);
                  return (
                    <div key={tool.id} className="glass-card p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{catalog?.icon || '🔧'}</span>
                          <div>
                            <h3 className="font-semibold text-surface-950">{tool.display_name}</h3>
                            <p className="text-xs text-surface-600">{tool.tool_type}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                          tool.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tool.status === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {tool.status}
                        </span>
                      </div>
                      {tool.capabilities && tool.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tool.capabilities.map(cap => (
                            <span key={cap} className="px-2 py-0.5 rounded-md bg-surface-200/60 text-xs text-surface-700">{cap}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => handleDisconnect(tool.id)} className="flex items-center gap-1.5 text-xs text-surface-600 hover:text-rose-400 transition-colors cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Available integrations catalog */}
          <section>
            <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
              Available Integrations
            </h2>
            {categories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5" /> {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INTEGRATION_CATALOG.filter(t => t.category === category).map(tool => {
                    const isConnected = connectedTools.some(ct => ct.tool_type === tool.type && ct.status === 'connected');
                    const isExpanded = connectingType === tool.type;
                    return (
                      <div key={tool.type} className={`glass-card p-5 ${isExpanded ? 'border-primary-500/30' : ''}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-lg shadow-lg flex-shrink-0`}>
                            {tool.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-surface-950">{tool.name}</h4>
                            <p className="text-xs text-surface-600 line-clamp-2">{tool.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {tool.actions.slice(0, 3).map(a => (
                            <span key={a} className="px-1.5 py-0.5 rounded bg-surface-200/60 text-xs text-surface-700">{a}</span>
                          ))}
                          {tool.actions.length > 3 && <span className="px-1.5 py-0.5 text-xs text-surface-600">+{tool.actions.length - 3}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-600 mb-3">
                          <Key className="w-3 h-3" /> {tool.auth}
                        </div>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                        ) : isExpanded ? (
                          <div className="space-y-3 pt-3 border-t border-white/5">
                            <div>
                              <label className="block text-xs font-medium text-surface-700 mb-1">API Key / Token <span className="text-rose-400">*</span></label>
                              <input type="password" placeholder="Enter your API key..."
                                onChange={(e) => setConnectForm(prev => ({ ...prev, config: { ...prev.config, api_key: e.target.value } }))}
                                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 text-sm focus:outline-none focus:border-primary-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-surface-700 mb-1">Project / Workspace URL</label>
                              <input type="url" placeholder="https://..."
                                onChange={(e) => setConnectForm(prev => ({ ...prev, config: { ...prev.config, base_url: e.target.value } }))}
                                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 text-sm focus:outline-none focus:border-primary-500" />
                            </div>
                            {connectError && <p className="text-xs text-rose-400">{connectError}</p>}
                            <div className="flex gap-2">
                              <button onClick={() => handleConnect(tool.type)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-medium cursor-pointer">Connect</button>
                              <button onClick={() => { setConnectingType(null); setConnectError(''); }} className="px-3 py-2 rounded-lg text-surface-600 text-xs font-medium hover:bg-surface-200 cursor-pointer">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setConnectingType(tool.type)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-200/60 border border-white/5 text-xs text-surface-800 font-medium hover:border-primary-500/30 transition-all cursor-pointer">
                            <Plus className="w-3 h-3" /> Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* ── Tab: Activity Log ─────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div>
          {activityItems.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Activity className="w-10 h-10 text-surface-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-surface-800 mb-2">No activity yet</h3>
              <p className="text-sm text-surface-600">
                When the AI creates tickets, updates documents, or performs actions through your integrations, they'll be logged here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityItems.map((item, i) => {
                const severity = SEVERITY_MAP[item.severity] || SEVERITY_MAP.medium;
                const status = APPROVAL_STATUS_MAP[item.status] || APPROVAL_STATUS_MAP.executed;
                return (
                  <div key={item.id} className="glass-card px-5 py-4 flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl ${severity.bg} border ${severity.border} flex items-center justify-center flex-shrink-0 text-base`}>
                      {severity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-950 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-600">
                        <span>{item.type}</span>
                        {item.tool && <span>• {item.tool}</span>}
                        {item.created && <span>• {new Date(item.created).toLocaleString()}</span>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
