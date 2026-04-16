import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, Upload, Search, Grid3X3, List, Loader2, Eye,
  BarChart3, Calendar, Filter, ChevronDown, CheckCircle2,
  XCircle, Clock, Sparkles, File, FileSpreadsheet, FileImage,
  AlertTriangle, Trash2, ArrowUpDown
} from 'lucide-react';
import { documentApi, workspaceApi } from '../lib/api';
import UploadZone from '../components/UploadZone';

const FILE_ICONS = {
  'application/pdf': { icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: File, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'text/plain': { icon: FileText, color: 'text-surface-500', bg: 'bg-surface-500/10' },
  'text/markdown': { icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileImage, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const STATUS_BADGE = {
  uploaded: { label: 'Uploaded', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  processing: { label: 'Processing', color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
  ready: { label: 'Ready', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
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
      const res = await workspaceApi.list();
      setWorkspaces(res.data);
      if (!selectedWs && res.data.length > 0) setSelectedWs(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await workspaceApi.get(selectedWs);
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
        const uploadRes = await documentApi.upload(file, selectedWs);
        const sourceId = uploadRes.data.id;
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Parsing & extracting...' } }));
        await documentApi.extract(sourceId);
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Done', done: true } }));
      } catch (err) {
        setProcessing(p => ({ ...p, [fileId]: { name: file.name, step: 'Failed', error: true } }));
        console.error(err);
      }
    }
    loadDocuments();
    // Clear completed processing after 3s
    setTimeout(() => setProcessing({}), 3000);
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">DocOps</h1>
          <p className="text-surface-600">Upload, parse, extract entities, and manage your document library.</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Documents', value: stats.total, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Processed', value: stats.ready, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Processing', value: stats.processing, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-surface-950">{s.value}</p>
              <p className="text-xs text-surface-600">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div className="mb-6">
        <UploadZone
          title="Upload Documents"
          subtitle="PDF, DOCX, PPTX, TXT, MD, XLSX"
          icon={FileText}
          accept={{ 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] }}
          onDrop={handleUpload}
          gradient="from-blue-500/10 to-cyan-500/10"
          borderColor="border-blue-500/20"
        />
      </div>

      {/* Processing queue */}
      {Object.keys(processing).length > 0 && (
        <div className="mb-6 space-y-2">
          {Object.entries(processing).map(([key, p]) => (
            <div key={key} className="glass-card px-4 py-3 flex items-center gap-3">
              {p.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
               p.error ? <XCircle className="w-4 h-4 text-rose-500" /> :
               <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />}
              <span className="text-sm text-surface-800 flex-1">{p.name}</span>
              <span className={`text-xs font-medium ${p.done ? 'text-emerald-400' : p.error ? 'text-rose-400' : 'text-primary-400'}`}>{p.step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={selectedWs}
          onChange={(e) => setSelectedWs(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-200 border border-white/5 text-surface-950 text-sm focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="">Select workspace...</option>
          {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex gap-1 p-0.5 rounded-lg bg-surface-200/40 border border-white/5">
          {['', 'ready', 'processing', 'failed'].map(f => (
            <button
              key={f || 'all'}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === f ? 'bg-surface-300 text-surface-950 shadow-sm' : 'text-surface-600 hover:text-surface-800'
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 p-0.5 rounded-lg bg-surface-200/40 border border-white/5">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-surface-300' : 'text-surface-600 hover:text-surface-800'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-surface-300' : 'text-surface-600 hover:text-surface-800'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document library */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-10 h-10 text-surface-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-surface-800 mb-2">{documents.length === 0 ? 'No documents yet' : 'No matching documents'}</h3>
          <p className="text-sm text-surface-600">
            {documents.length === 0 ? 'Upload your first document using the drop zone above.' : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => {
            const fileInfo = FILE_ICONS[doc.mime_type] || FILE_ICONS['text/plain'];
            const statusInfo = STATUS_BADGE[doc.status] || STATUS_BADGE.uploaded;
            return (
              <div key={doc.id} className="glass-card p-5 group cursor-pointer" onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${fileInfo.bg} flex items-center justify-center`}>
                    <fileInfo.icon className={`w-5 h-5 ${fileInfo.color}`} />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-surface-950 truncate mb-1 group-hover:text-primary-400 transition-colors">
                  {doc.filename}
                </h4>
                <div className="flex items-center gap-3 text-xs text-surface-600">
                  <span>{formatBytes(doc.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.created_at)}</span>
                </div>
                {doc.metadata_json?.page_count && (
                  <p className="text-xs text-surface-600 mt-1">{doc.metadata_json.page_count} pages</p>
                )}
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
              <div key={doc.id} className="glass-card px-5 py-3 flex items-center gap-4 cursor-pointer group" onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}>
                <div className={`w-9 h-9 rounded-xl ${fileInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <fileInfo.icon className={`w-4 h-4 ${fileInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-950 truncate group-hover:text-primary-400 transition-colors">{doc.filename}</p>
                  <p className="text-xs text-surface-600">{formatBytes(doc.file_size)} • {formatDate(doc.created_at)}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
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
