import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, FileText, Mic, ArrowRight,
  Sparkles, Brain, Layers, Zap
} from 'lucide-react';
import { workspaceApi } from '../lib/api';

export default function HomePage() {
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

  const features = [
    { icon: FileText, label: 'DocOps', desc: 'Parse, extract, compare documents', color: 'from-blue-500 to-cyan-500' },
    { icon: Mic, label: 'MeetOps', desc: 'Transcribe, diarize, extract actions', color: 'from-purple-500 to-pink-500' },
    { icon: Brain, label: 'Intelligence', desc: 'Cross-source Q&A and evidence', color: 'from-amber-500 to-orange-500' },
    { icon: Zap, label: 'ActionOps', desc: 'Execute across enterprise tools', color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero */}
      <section className="text-center mb-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-200/60 border border-white/5 mb-6">
          <Sparkles className="w-4 h-4 text-accent-400" />
          <span className="text-sm font-medium text-surface-800">Agentic Work Orchestration Platform</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
          <span className="text-surface-950">From Documents & Meetings</span>
          <br />
          <span className="gradient-text">to Intelligent Actions</span>
        </h1>
        <p className="text-lg text-surface-700 max-w-2xl mx-auto mb-8">
          Upload documents and meeting recordings. WorkPilot AI extracts decisions, tasks, blockers,
          and follow-ups — then connects everything with cross-source intelligence.
        </p>
      </section>

      {/* Feature pills */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {features.map((f, i) => (
          <div
            key={f.label}
            className={`glass-card p-5 animate-fade-in-up animate-fade-in-up-delay-${i + 1}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-lg`}>
              <f.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-surface-950 mb-1">{f.label}</h3>
            <p className="text-sm text-surface-700">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Workspaces */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-surface-950">Workspaces</h2>
            <p className="text-sm text-surface-600 mt-1">Each workspace is a case, project, or review cycle</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Workspace
          </button>
        </div>

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
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-800 hover:bg-surface-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workspace grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
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
                      <FileText className="w-3.5 h-3.5" />
                      {ws.document_count || 0} docs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" />
                      {ws.meeting_count || 0} meetings
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
