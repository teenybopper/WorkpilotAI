import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, Search, Grid3X3, List, Loader2,
  CheckCircle2, XCircle, Clock, File, FileSpreadsheet, FileImage
} from 'lucide-react';
import { uploadDocument, extractDocument, getWorkspaces, getWorkspace } from '../lib/api';
import UploadZone from '../components/UploadZone';

const FILE_ICONS = {
  'application/pdf': { icon: FileText, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: File, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  'text/plain': { icon: FileText, color: 'text-stone-500', bg: 'bg-stone-500/10' },
  'text/markdown': { icon: FileText, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileImage, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
};

const STATUS_BADGE = {
  uploaded: { label: 'Uploaded', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  processing: { label: 'Processing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ready: { label: 'Ready', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export default function DocOpsPage() {
  const { id: workspaceId } = useParams();
  const [documents, setDocuments] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(workspaceId || '');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState({});
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (selectedWs) loadDocuments(); }, [selectedWs]);

  const loadWorkspaces = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await getWorkspace(selectedWs);
      const docs = (res.data.sources || []).filter(s => s.source_type === 'document');
      setDocuments(docs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async (files) => {
    for (const file of files) {
      const fileId = `upload-${Date.now()}-${file.name}`;
      setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Uploading...' } }));
      try {
        const uploadRes = await uploadDocument(selectedWs, file);
        const sourceId = uploadRes.data.id;
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Parsing with Docling...' } }));
        await extractDocument(sourceId);
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Done', done: true } }));
      } catch (err) {
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Failed', error: true } }));
        console.error(err);
      }
    }
    loadDocuments();
    setTimeout(() => setProcessing({}), 3500);
  };

  const filtered = documents.filter(doc => {
    const matchesSearch = !search || doc.filename.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: documents.length,
    ready: documents.filter(d => d.status === 'ready').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed').length,
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-1">DocOps</h1>
          <p className="text-sm text-[var(--text-secondary)]">Upload, parse, extract entities, and manage workspace documents.</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: stats.total, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Processed', value: stats.ready, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Processing', value: stats.processing, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
        ].map(s => (
          <div key={s.label} className="app-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="font-heading text-2xl text-[var(--text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div>
        <UploadZone
          title="Upload Documents to Workspace"
          subtitle="PDF, DOCX, PPTX, TXT, MD, XLSX supported"
          icon={FileText}
          accept={{ 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] }}
          onDrop={handleUpload}
        />
      </div>

      {/* Processing queue status */}
      {Object.keys(processing).length > 0 && (
        <div className="space-y-2">
          {Object.entries(processing).map(([key, p]) => (
            <div key={key} className="app-card px-4 py-3 flex items-center gap-3">
              {p.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
               p.error ? <XCircle className="w-4 h-4 text-rose-500" /> :
               <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">{p.name}</span>
              <span className={`text-xs font-medium ${p.done ? 'text-emerald-500' : p.error ? 'text-rose-500' : 'text-blue-500'}`}>{p.step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedWs}
          onChange={(e) => setSelectedWs(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
        >
          <option value="">Select workspace...</option>
          {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document names..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--border-focus)]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          {['', 'ready', 'processing', 'failed'].map(f => (
            <button
              key={f || 'all'}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                statusFilter === f
                  ? 'bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-0.5 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)]' : 'text-[var(--text-secondary)]'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'list' ? 'bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)]' : 'text-[var(--text-secondary)]'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Library Grid / List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="app-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-heading text-2xl text-[var(--text-primary)] mb-2">
            {documents.length === 0 ? 'Welcome to DocOps' : 'No matching documents'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-6">
            {documents.length === 0
              ? 'Upload documents to extract structured intelligence — entities, obligations, dates, and more — powered by Docling AI parsing.'
              : 'Try clearing your search or status filter to see all documents.'}
          </p>
          {documents.length === 0 && (
            <>
              {/* Quick-start steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-left max-w-lg mx-auto">
                {[
                  { step: '1', title: 'Create a Workspace', desc: 'Go to the Dashboard and create your first project workspace' },
                  { step: '2', title: 'Upload a Document', desc: 'Drag & drop a PDF, DOCX, or PPTX into the upload area above' },
                  { step: '3', title: 'View Extracted Insights', desc: 'Entities, tables, and text are automatically parsed and indexed' },
                ].map(s => (
                  <div key={s.step} className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] flex items-center justify-center text-[10px] font-bold mb-2">{s.step}</div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{s.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">{s.desc}</p>
                  </div>
                ))}
              </div>
              {/* Supported formats */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['PDF', 'DOCX', 'PPTX', 'TXT', 'MD', 'XLSX'].map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {fmt}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => {
            const fileInfo = FILE_ICONS[doc.mime_type] || FILE_ICONS['text/plain'];
            const statusInfo = STATUS_BADGE[doc.status] || STATUS_BADGE.uploaded;
            return (
              <div key={doc.id} className="app-card p-5 group cursor-pointer flex flex-col justify-between" onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}>
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${fileInfo.bg} flex items-center justify-center`}>
                      <fileInfo.icon className={`w-4.5 h-4.5 ${fileInfo.color}`} />
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <h4 className="font-heading text-lg text-[var(--text-primary)] truncate mb-1 group-hover:underline">
                    {doc.filename}
                  </h4>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{formatBytes(doc.file_size)}</span>
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const fileInfo = FILE_ICONS[doc.mime_type] || FILE_ICONS['text/plain'];
            const statusInfo = STATUS_BADGE[doc.status] || STATUS_BADGE.uploaded;
            return (
              <div key={doc.id} className="app-card px-5 py-3.5 flex items-center gap-4 cursor-pointer group" onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}>
                <div className={`w-9 h-9 rounded-xl ${fileInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <fileInfo.icon className={`w-4.5 h-4.5 ${fileInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-lg text-[var(--text-primary)] truncate group-hover:underline">{doc.filename}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatBytes(doc.file_size)} • {formatDate(doc.created_at)}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                  {statusInfo.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
