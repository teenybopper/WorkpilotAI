import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Mic, MessageSquare, ListTodo,
  AlertTriangle, Upload, Loader2, CheckCircle2,
  XCircle, Clock, Send, ChevronDown, Sparkles
} from 'lucide-react';
import {
  getWorkspace, uploadDocument, extractDocument,
  uploadMeeting, transcribeMeeting, extractActions
} from '../lib/api';
import UploadZone from '../components/UploadZone';
import ChatPanel from '../components/ChatPanel';
import SourceList from '../components/SourceList';
import ActionsDashboard from '../components/ActionsDashboard';

const TABS = [
  { id: 'sources', label: 'Sources', icon: FileText },
  { id: 'chat', label: 'Intelligence', icon: MessageSquare },
  { id: 'actions', label: 'Actions & Decisions', icon: ListTodo },
];

export default function WorkspacePage() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('sources');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  const loadWorkspace = async () => {
    try {
      const res = await getWorkspace(id);
      setWorkspace(res.data);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocUpload = async (files) => {
    for (const file of files) {
      const fileId = `upload-${Date.now()}`;
      setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Uploading...' } }));

      try {
        // Upload
        const uploadRes = await uploadDocument(id, file);
        const sourceId = uploadRes.data.id;

        // Extract
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Parsing & extracting...' } }));
        await extractDocument(sourceId);

        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Done', done: true } }));
      } catch (err) {
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Failed', error: true } }));
        console.error(err);
      }
    }
    loadWorkspace();
  };

  const handleMeetingUpload = async (files) => {
    for (const file of files) {
      const fileId = `upload-${Date.now()}`;
      setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Uploading...' } }));

      try {
        const uploadRes = await uploadMeeting(id, file);
        const sourceId = uploadRes.data.id;

        // Transcribe
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Transcribing...' } }));
        await transcribeMeeting(sourceId);

        // Extract actions
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Extracting actions...' } }));
        await extractActions(sourceId);

        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Done', done: true } }));
      } catch (err) {
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Failed', error: true } }));
        console.error(err);
      }
    }
    loadWorkspace();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h2 className="text-xl font-semibold text-surface-800">Workspace not found</h2>
        <Link to="/" className="text-primary-400 mt-2 inline-block">← Back to workspaces</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="w-9 h-9 rounded-xl bg-surface-200/60 border border-white/5 flex items-center justify-center hover:bg-surface-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-surface-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-950">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-surface-600 mt-0.5">{workspace.description}</p>
          )}
        </div>
        <div className="flex gap-3 text-sm text-surface-600">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200/60 border border-white/5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            {workspace.document_count || 0} docs
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200/60 border border-white/5">
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            {workspace.meeting_count || 0} meetings
          </span>
        </div>
      </div>

      {/* Processing queue */}
      {Object.keys(processing).length > 0 && (
        <div className="mb-6 space-y-2">
          {Object.entries(processing).map(([key, p]) => (
            <div key={key} className="glass-card px-4 py-3 flex items-center gap-3">
              {p.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : p.error ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              )}
              <span className="text-sm text-surface-800 flex-1">{p.name}</span>
              <span className={`text-xs font-medium ${p.done ? 'text-emerald-400' : p.error ? 'text-rose-400' : 'text-primary-400'}`}>
                {p.step}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface-200/40 border border-white/5 w-fit">
        {TABS.map((tab) => (
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UploadZone
              title="Upload Documents"
              subtitle="PDF, DOCX, PPTX, TXT, MD"
              icon={FileText}
              accept={{ 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] }}
              onDrop={handleDocUpload}
              gradient="from-blue-500/10 to-cyan-500/10"
              borderColor="border-blue-500/20"
            />
            <UploadZone
              title="Upload Meetings"
              subtitle="WAV, MP3, M4A, OGG, WebM"
              icon={Mic}
              accept={{ 'audio/*': ['.wav', '.mp3', '.m4a', '.ogg', '.webm'] }}
              onDrop={handleMeetingUpload}
              gradient="from-purple-500/10 to-pink-500/10"
              borderColor="border-purple-500/20"
            />
          </div>

          <SourceList sources={workspace.sources || []} workspaceId={id} />
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatPanel workspaceId={id} />
      )}

      {activeTab === 'actions' && (
        <ActionsDashboard
          tasks={workspace.tasks || []}
          decisions={workspace.decisions || []}
          riskFlags={workspace.risk_flags || []}
          workspaceId={id}
          onRefresh={loadWorkspace}
        />
      )}
    </div>
  );
}
