import { FileText, Mic, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  uploaded: { icon: Clock, color: 'text-amber-400', label: 'Uploaded' },
  processing: { icon: Loader2, color: 'text-primary-400 animate-spin', label: 'Processing' },
  ready: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Ready' },
  failed: { icon: XCircle, color: 'text-rose-400', label: 'Failed' },
};

export default function SourceList({ sources, workspaceId }) {
  if (!sources.length) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-surface-600">No sources uploaded yet. Upload documents or meeting recordings above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
        Uploaded Sources ({sources.length})
      </h3>
      {sources.map((src) => {
        const isDoc = src.source_type === 'document';
        const statusCfg = STATUS_CONFIG[src.status] || STATUS_CONFIG.uploaded;
        const StatusIcon = statusCfg.icon;

        return (
          <div key={src.id} className="glass-card px-5 py-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isDoc
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'bg-purple-500/10 border border-purple-500/20'
            }`}>
              {isDoc
                ? <FileText className="w-4 h-4 text-blue-400" />
                : <Mic className="w-4 h-4 text-purple-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-950 truncate">{src.filename}</p>
              <p className="text-xs text-surface-600 mt-0.5">
                {isDoc ? 'Document' : 'Meeting'} • {src.file_size ? `${(src.file_size / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${statusCfg.color}`} />
              <span className={`text-xs font-medium ${statusCfg.color.split(' ')[0]}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
