import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, FileText, Mic, ArrowRight,
  Brain, Layers, Zap, Loader2, Sparkles
} from 'lucide-react';
import { getWorkspaces, createWorkspace } from '../lib/api';

export default function DashboardPage() {
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
      const res = await getWorkspaces();
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
      await createWorkspace({ name: newName, description: newDesc });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      loadWorkspaces();
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const features = [
    { icon: FileText, label: 'DocOps', desc: 'Upload, parse & extract document intelligence', to: '/docops', accent: 'border-amber-500/20 text-amber-600 dark:text-amber-400' },
    { icon: Mic, label: 'MeetOps', desc: 'Live listener, ASR transcription & diarization', to: '/meetops', accent: 'border-purple-500/20 text-purple-600 dark:text-purple-400' },
    { icon: Zap, label: 'ActionOps', desc: 'Agentic action plans & MCP tool integrations', to: '/actions', accent: 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
    { icon: Brain, label: 'Intelligence', desc: 'RAG search, cross-source synthesis & summaries', to: '/docops', accent: 'border-blue-500/20 text-blue-600 dark:text-blue-400' },
  ];

  const totalDocs = workspaces.reduce((sum, ws) => sum + (ws.document_count || 0), 0);
  const totalMeetings = workspaces.reduce((sum, ws) => sum + (ws.meeting_count || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Unified Workspace</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl text-[var(--text-primary)]">
            {greeting}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Documents, meeting recordings, and agentic workflows — running on your device.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-dark px-4 py-2.5 text-xs flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </section>

      {/* Quick Metrics Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Workspaces</span>
            <Layers className="w-4 h-4 text-stone-500" />
          </div>
          <p className="font-heading text-3xl text-[var(--text-primary)]">{workspaces.length}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Active environments</p>
        </div>

        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Documents</span>
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-heading text-3xl text-[var(--text-primary)]">{totalDocs}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Parsed & indexed</p>
        </div>

        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Meetings</span>
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="font-heading text-3xl text-[var(--text-primary)]">{totalMeetings}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Diarized & transcribed</p>
        </div>

        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Local Status</span>
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-heading text-xl text-[var(--text-primary)] mt-1">Ready</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active companion
          </p>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <Link
            key={f.label}
            to={f.to}
            className="app-card p-5 group flex flex-col justify-between hover:border-[var(--border-strong)] transition-all"
          >
            <div>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 bg-[var(--bg-primary)] ${f.accent}`}>
                <f.icon className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-xl text-[var(--text-primary)] group-hover:underline">{f.label}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{f.desc}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] mt-4 group-hover:text-[var(--text-primary)] transition-colors">
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </section>

      {/* Workspace Listing */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-[var(--text-primary)]">Workspaces</h2>
          <span className="text-xs text-[var(--text-muted)]">{workspaces.length} workspace(s) available</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="app-card p-12 text-center">
            <FolderOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
            <h3 className="font-heading text-xl text-[var(--text-primary)] mb-1">No workspaces created yet</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
              Create a workspace to start ingesting PDFs, capturing audio recordings, and extracting action items.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-dark px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create First Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className="group">
                <div className="app-card p-5 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center">
                        <Layers className="w-4 h-4 text-[var(--text-primary)]" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-heading text-xl text-[var(--text-primary)] mb-1 group-hover:underline">{ws.name}</h3>
                    {ws.description && (
                      <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2">{ws.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
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

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="app-card p-6 w-full max-w-md bg-[var(--bg-card)] shadow-2xl">
            <h3 className="font-heading text-2xl text-[var(--text-primary)] mb-4">Create New Workspace</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Workspace Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Q3 Strategic Planning"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Context or goals for this workspace..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-dark px-5 py-2 text-xs font-medium cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
