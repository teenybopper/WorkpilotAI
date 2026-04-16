import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, FolderOpen, FileText, Mic, ArrowRight,
  Sparkles, Brain, Layers, Zap, ListTodo,
  AlertTriangle, Loader2, Activity, Plug,
  Building2, User, BarChart3, Clock
} from 'lucide-react';
import { workspaceApi } from '../lib/api';

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const res = await workspaceApi.list();
      setWorkspaces(res.data);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await workspaceApi.create({ name: newName, description: newDesc });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      loadWorkspaces();
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const allFeatures = [
    { icon: FileText, label: 'DocOps', desc: 'Upload, parse, and manage documents', color: 'from-blue-500 to-cyan-500', to: '/docops' },
    { icon: Mic, label: 'MeetOps', desc: 'Meeting bot, transcripts & insights', color: 'from-purple-500 to-pink-500', to: '/meetops', orgOnly: true },
    { icon: Zap, label: 'ActionOps', desc: 'Integrations, approvals & automation', color: 'from-emerald-500 to-teal-500', to: '/actions' },
    { icon: Brain, label: 'Intelligence', desc: 'Cross-source Q&A and evidence', color: 'from-amber-500 to-orange-500', to: '/' },
  ];

  const features = allFeatures.filter(f => !f.orgOnly || organization);

  const totalDocs = workspaces.reduce((sum, ws) => sum + (ws.document_count || 0), 0);
  const totalMeetings = workspaces.reduce((sum, ws) => sum + (ws.meeting_count || 0), 0);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Hero */}
      <section className="mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-surface-950 tracking-tight mb-1">
              {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-sm text-surface-600">
              {organization
                ? <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-purple-400" /> {organization.name} — {organization.plan_tier} plan</span>
                : 'Your unified workspace — documents, meetings, and actions in one place.'
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium text-xs shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Workspace
          </button>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-primary-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-surface-950">{workspaces.length}</p>
          <p className="text-xs text-surface-600 mt-0.5">Workspaces</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-surface-950">{totalDocs}</p>
          <p className="text-xs text-surface-600 mt-0.5">Documents</p>
        </div>
        {organization && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Mic className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-surface-950">{totalMeetings}</p>
            <p className="text-xs text-surface-600 mt-0.5">Meetings</p>
          </div>
        )}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-surface-950">—</p>
          <p className="text-xs text-surface-600 mt-0.5">Pending Actions</p>
        </div>
      </section>

      {/* Module cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {features.map((f, i) => (
          <Link
            key={f.label}
            to={f.to}
            className={`glass-card p-4 group animate-fade-in-up animate-fade-in-up-delay-${i + 1}`}
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-2.5 shadow-lg`}>
              <f.icon className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-surface-950 mb-0.5 group-hover:text-primary-400 transition-colors">{f.label}</h3>
            <p className="text-xs text-surface-700">{f.desc}</p>
          </Link>
        ))}
      </section>

      {/* Capture Mode card — only for org users */}
      {organization && (
        <section className="mb-8 animate-fade-in-up">
          <Link to="/setup/bot" className="glass-card p-5 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-surface-950 mb-0.5 group-hover:text-primary-400 transition-colors">Meeting Bot Service</h3>
              <p className="text-xs text-surface-700">Configure bot to join meetings as a visible participant. Manage provider connections.</p>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 flex-shrink-0">
              <Building2 className="w-3 h-3" /> Business Mode
            </div>
          </Link>
        </section>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="glass-card p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-surface-950 mb-4">Create Workspace</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Q1 Vendor Contract Review"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Brief description of this workspace..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-800 hover:bg-surface-300 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspace grid */}
      <section>
        <h2 className="text-xl font-bold text-surface-950 mb-4">Workspaces</h2>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FolderOpen className="w-12 h-12 text-surface-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-800 mb-2">No workspaces yet</h3>
            <p className="text-sm text-surface-600">Create your first workspace to start uploading documents and meetings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className="group">
                <div className="glass-card p-6 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-primary-400" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-surface-950 mb-1 group-hover:text-primary-400 transition-colors">{ws.name}</h3>
                  {ws.description && (
                    <p className="text-sm text-surface-600 mb-4 line-clamp-2">{ws.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-surface-600">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {ws.document_count || 0} docs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" /> {ws.meeting_count || 0} meetings
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
