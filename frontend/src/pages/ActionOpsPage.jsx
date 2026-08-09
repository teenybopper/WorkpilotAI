import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Zap, Plug, Activity, CheckCircle2, XCircle, Clock, Loader2,
  ThumbsUp, ThumbsDown, ExternalLink, Plus, Trash2, Key, LayoutGrid, Shield
} from 'lucide-react';
import {
  getWorkspaces, listActions as listActionsApi, approveAction as approveActionApi,
  rejectAction as rejectActionApi, executeAction as executeActionApi,
  getConnectedTools, connectTool, disconnectTool
} from '../lib/api';

const INTEGRATION_CATALOG = [
  { type: 'jira', name: 'Jira', icon: '🎫', description: 'Create issues, update status, manage sprints and epics', auth: 'API Token', category: 'Project Management' },
  { type: 'clickup', name: 'ClickUp', icon: '✅', description: 'Create tasks, update statuses, manage lists and spaces', auth: 'API Token', category: 'Project Management' },
  { type: 'linear', name: 'Linear', icon: '📐', description: 'Create issues, manage cycles, update priorities and labels', auth: 'API Key', category: 'Project Management' },
  { type: 'asana', name: 'Asana', icon: '🎯', description: 'Create tasks, manage projects, track milestones', auth: 'API Token', category: 'Project Management' },
  { type: 'github', name: 'GitHub', icon: '🐙', description: 'Create issues, comment on PRs, manage project boards', auth: 'Personal Access Token', category: 'Development' },
  { type: 'google_docs', name: 'Google Docs', icon: '📄', description: 'Create documents, append content, share with team', auth: 'OAuth 2.0', category: 'Documentation' },
  { type: 'google_calendar', name: 'Google Calendar', icon: '📅', description: 'Schedule follow-up meetings and calendar events', auth: 'OAuth 2.0', category: 'Communication' },
  { type: 'notion', name: 'Notion', icon: '📝', description: 'Create pages, update databases, add content blocks', auth: 'Integration Token', category: 'Documentation' },
  { type: 'slack', name: 'Slack', icon: '💬', description: 'Send messages, create channels, post updates and summaries', auth: 'Bot Token', category: 'Communication' },
  { type: 'email', name: 'Email / SMTP', icon: '✉️', description: 'Send automated email notifications & summaries', auth: 'SMTP Credentials', category: 'Communication' },
];

const SEVERITY_MAP = {
  light: { label: 'Light', desc: 'Auto-executed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '⚡' },
  medium: { label: 'Medium', desc: 'Execute & Notify', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '📢' },
  heavy: { label: 'Heavy', desc: 'Requires Approval', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '🛡️' },
};

const APPROVAL_STATUS_MAP = {
  auto_executed: { label: 'Auto-Executed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  notified: { label: 'Notified', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  pending_approval: { label: 'Pending Approval', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  approved: { label: 'Approved', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  rejected: { label: 'Rejected', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
  executing: { label: 'Executing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  executed: { label: 'Executed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'Failed', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
};

export default function ActionOpsPage() {
  const { id: workspaceId } = useParams();
  const [activeTab, setActiveTab] = useState('approvals');
  const [actions, setActions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(workspaceId || '');
  const [actionsLoading, setActionsLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [connectedTools, setConnectedTools] = useState([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [connectingType, setConnectingType] = useState(null);
  const [connectForm, setConnectForm] = useState({});
  const [connectError, setConnectError] = useState('');

  useEffect(() => { loadWorkspaces(); loadIntegrations(); }, []);
  useEffect(() => { if (selectedWs) loadActions(); }, [selectedWs]);

  const loadWorkspaces = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadActions = async () => {
    setActionsLoading(true);
    try {
      const res = await listActionsApi(selectedWs);
      setActions(res.data || []);
    } catch (err) { setActions([]); }
    finally { setActionsLoading(false); }
  };

  const loadIntegrations = async () => {
    setIntegrationsLoading(true);
    try {
      const res = await getConnectedTools();
      setConnectedTools(res.data || []);
    } catch (err) { setConnectedTools([]); }
    finally { setIntegrationsLoading(false); }
  };

  const handleApprove = async (id) => {
    try { await approveActionApi(id); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return;
    try { await rejectActionApi(id, rejectReason); setRejectId(null); setRejectReason(''); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleExecute = async (id) => {
    try { await executeActionApi(id); loadActions(); }
    catch (err) { console.error(err); }
  };

  const handleConnect = async (toolType) => {
    const tool = INTEGRATION_CATALOG.find(t => t.type === toolType);
    if (!tool) return;
    setConnectError('');
    try {
      await connectTool({
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
    if (!confirm('Disconnect this tool integration?')) return;
    try { await disconnectTool(toolId); loadIntegrations(); }
    catch (err) { console.error(err); }
  };

  const tabs = [
    { id: 'approvals', label: 'Pending Approvals', icon: Shield, count: actions.filter(a => a.approval_status === 'pending_approval' || a.approval_state === 'proposed').length },
    { id: 'integrations', label: 'Integrations Hub', icon: Plug, count: connectedTools.length },
    { id: 'activity', label: 'Execution Audit Log', icon: Activity, count: null },
  ];

  const pendingActions = actions.filter(a =>
    a.approval_status === 'pending_approval' || a.approval_state === 'proposed'
  );
  const categories = [...new Set(INTEGRATION_CATALOG.map(t => t.category))];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-1">ActionOps</h1>
        <p className="text-sm text-[var(--text-secondary)]">Agentic action planning, human-in-the-loop approvals, and MCP tool execution.</p>
      </div>

      {/* Governance Model Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {Object.entries(SEVERITY_MAP).map(([key, s]) => (
          <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${s.bg} border ${s.border}`}>
            <span className="text-sm">{s.icon}</span>
            <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
            <span className="text-xs text-[var(--text-muted)]">— {s.desc}</span>
          </div>
        ))}
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Workspace:</label>
            <select
              value={selectedWs}
              onChange={(e) => setSelectedWs(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
            >
              <option value="">Select workspace...</option>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>

          {actionsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" /></div>
          ) : pendingActions.length === 0 ? (
            <div className="app-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-heading text-2xl text-[var(--text-primary)] mb-2">Human-in-the-Loop Governance</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-6">
                Actions extracted from your meetings and documents will appear here for review. WorkPilot uses a 3-tier governance model to ensure you're always in control.
              </p>
              {/* Workflow */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 text-left max-w-2xl mx-auto">
                {[
                  { step: '1', title: 'Process Sources', desc: 'Upload documents or transcribe meetings in DocOps & MeetOps' },
                  { step: '2', title: 'Actions Extracted', desc: 'AI identifies tasks, decisions, and follow-ups with owners' },
                  { step: '3', title: 'Review & Approve', desc: 'Heavy actions require your explicit approval before execution' },
                  { step: '4', title: '1-Click Execute', desc: 'Approved actions trigger Jira, Slack, Email, or Google Docs' },
                ].map(s => (
                  <div key={s.step} className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] flex items-center justify-center text-[10px] font-bold mb-2">{s.step}</div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{s.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Connect your tools in the <strong className="text-[var(--text-primary)]">Integrations Hub</strong> tab to enable 1-click execution.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingActions.map(action => {
                const severity = SEVERITY_MAP[action.severity || action.risk_level] || SEVERITY_MAP.heavy;
                const status = APPROVAL_STATUS_MAP[action.approval_status || action.approval_state] || APPROVAL_STATUS_MAP.pending_approval;
                return (
                  <div key={action.id} className="app-card p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${severity.bg} border ${severity.border} flex items-center justify-center flex-shrink-0 text-base`}>
                        {severity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-heading text-xl text-[var(--text-primary)]">{action.title}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${severity.bg} ${severity.color}`}>
                            {severity.label}
                          </span>
                        </div>
                        {action.description && <p className="text-xs text-[var(--text-secondary)] mb-2">{action.description}</p>}
                        {(action.payload_json || action.payload) && (
                          <div className="my-2.5 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs space-y-1">
                            {action.action_type === 'schedule_meeting' && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--text-secondary)]">
                                <span>📅 <strong>Time:</strong> {(action.payload_json || action.payload).proposed_time || 'TBD'}</span>
                                <span>👥 <strong>Participants:</strong> {Array.isArray((action.payload_json || action.payload).participants) ? (action.payload_json || action.payload).participants.join(', ') : ((action.payload_json || action.payload).participants || 'Team')}</span>
                                {(action.payload_json || action.payload).purpose && (
                                  <span>📌 <strong>Purpose:</strong> {(action.payload_json || action.payload).purpose}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                          <span className="bg-[var(--bg-primary)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)] font-mono">{action.action_type}</span>
                          {action.target_object_id && (
                            <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {action.target_object_id}</span>
                          )}
                          {action.confidence && <span>{Math.round(action.confidence * 100)}% confidence</span>}
                          {action.owner && <span>→ {action.owner}</span>}
                        </div>
                      </div>
                      {/* Approval Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => handleApprove(action.id)} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors cursor-pointer" title="Approve">
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRejectId(action.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer" title="Reject">
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {rejectId === action.id && (
                      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleReject(action.id)} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-medium hover:bg-rose-500/20 cursor-pointer">Confirm</button>
                        <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-3 py-1.5 rounded-xl text-[var(--text-muted)] text-xs font-medium hover:bg-[var(--bg-card-hover)] cursor-pointer">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Connected Tools ({connectedTools.length})</h2>
            {integrationsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" /></div>
            ) : connectedTools.length === 0 ? (
              <div className="app-card p-8 text-center">
                <Plug className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-60" />
                <p className="text-xs text-[var(--text-secondary)]">No integrations connected yet. Select a tool from the catalog below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedTools.map(tool => {
                  const catalog = INTEGRATION_CATALOG.find(t => t.type === tool.tool_type);
                  return (
                    <div key={tool.id} className="app-card p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{catalog?.icon || '🔧'}</span>
                          <div>
                            <h3 className="font-heading text-lg text-[var(--text-primary)]">{tool.display_name}</h3>
                            <p className="text-[11px] text-[var(--text-muted)]">{tool.tool_type}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      </div>
                      <button onClick={() => handleDisconnect(tool.id)} className="flex items-center gap-1 text-xs text-rose-500 hover:underline mt-4 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Catalog */}
          <section className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Integration Catalog</h2>
            {categories.map(category => (
              <div key={category} className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5" /> {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INTEGRATION_CATALOG.filter(t => t.category === category).map(tool => {
                    const isConnected = connectedTools.some(ct => ct.tool_type === tool.type && ct.status === 'connected');
                    const isExpanded = connectingType === tool.type;
                    return (
                      <div key={tool.type} className="app-card p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-2xl">{tool.icon}</span>
                            <div>
                              <h4 className="font-heading text-lg text-[var(--text-primary)]">{tool.name}</h4>
                              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{tool.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[var(--border-subtle)] mt-3">
                          {isConnected ? (
                            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
                          ) : isExpanded ? (
                            <div className="space-y-2">
                              <input
                                type="password"
                                placeholder="Enter API Token..."
                                onChange={(e) => setConnectForm(prev => ({ ...prev, config: { ...prev.config, api_key: e.target.value } }))}
                                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none"
                              />
                              {connectError && <p className="text-[11px] text-rose-500">{connectError}</p>}
                              <div className="flex gap-2">
                                <button onClick={() => handleConnect(tool.type)} className="btn-dark px-3 py-1.5 text-xs font-medium cursor-pointer">Save & Connect</button>
                                <button onClick={() => setConnectingType(null)} className="px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] cursor-pointer">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setConnectingType(tool.type)} className="btn-dark px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer">
                              <Plus className="w-3.5 h-3.5" /> Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">Execution Audit Trail</h2>
          {actions.length === 0 ? (
            <div className="app-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-heading text-2xl text-[var(--text-primary)] mb-2">Execution Audit Trail</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-4">
                Every action execution is logged here with timestamps, status, duration, and response details. This provides a complete audit trail of all automated actions taken on your behalf.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Process meetings or documents to generate actions, then approve and execute them to see entries here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map(action => {
                const status = APPROVAL_STATUS_MAP[action.approval_status || action.approval_state] || APPROVAL_STATUS_MAP.executed;
                return (
                  <div key={action.id} className="app-card px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-heading text-lg text-[var(--text-primary)]">{action.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{action.action_type} • {new Date(action.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${status.bg} ${status.color}`}>
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
