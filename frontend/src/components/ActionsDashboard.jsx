import { useState } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle,
  User, Calendar, Flag, ChevronDown, ChevronRight,
  ListTodo, Gavel, ShieldAlert
} from 'lucide-react';

const STATUS_BADGE = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Pending' },
  in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'In Progress' },
  done: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Done' },
  cancelled: { bg: 'bg-surface-500/10', text: 'text-surface-500', border: 'border-surface-500/20', label: 'Cancelled' },
};

const PRIORITY_BADGE = {
  low: { bg: 'bg-surface-500/10', text: 'text-surface-600', label: 'Low' },
  medium: { bg: 'bg-primary-500/10', text: 'text-primary-400', label: 'Medium' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'High' },
  critical: { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Critical' },
};

const SEVERITY_BADGE = {
  low: { bg: 'bg-surface-500/10', text: 'text-surface-600' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  critical: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
};

export default function ActionsDashboard({ tasks, decisions, riskFlags, workspaceId, onRefresh }) {
  const [expandedSection, setExpandedSection] = useState('tasks');

  const sections = [
    {
      id: 'tasks',
      label: 'Action Items',
      icon: ListTodo,
      count: tasks.length,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'decisions',
      label: 'Decisions',
      icon: Gavel,
      count: decisions.length,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'risks',
      label: 'Risk Flags',
      icon: ShieldAlert,
      count: riskFlags.length,
      color: 'from-rose-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setExpandedSection(sec.id)}
            className={`glass-card p-5 text-left cursor-pointer transition-all ${
              expandedSection === sec.id ? 'border-primary-500/30 glow-pulse' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${sec.color} flex items-center justify-center`}>
                <sec.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-bold text-surface-950">{sec.count}</span>
            </div>
            <p className="text-sm font-medium text-surface-800">{sec.label}</p>
          </button>
        ))}
      </div>

      {/* Tasks section */}
      {expandedSection === 'tasks' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
            Action Items ({tasks.length})
          </h3>
          {tasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ListTodo className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-600">No action items extracted yet. Upload and process meetings to extract tasks.</p>
            </div>
          ) : (
            tasks.map((task) => {
              const status = STATUS_BADGE[task.status] || STATUS_BADGE.pending;
              const priority = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;

              return (
                <div key={task.id} className="glass-card px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-surface-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-950">{task.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}>
                          {status.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${priority.bg} ${priority.text}`}>
                          <Flag className="w-3 h-3" /> {priority.label}
                        </span>
                        {task.owner && (
                          <span className="inline-flex items-center gap-1 text-xs text-surface-600">
                            <User className="w-3 h-3" /> {task.owner}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="inline-flex items-center gap-1 text-xs text-surface-600">
                            <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.evidence_text && (
                        <p className="mt-2 text-xs text-surface-600 italic border-l-2 border-surface-400 pl-3">
                          "{task.evidence_text}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Decisions section */}
      {expandedSection === 'decisions' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
            Decisions ({decisions.length})
          </h3>
          {decisions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Gavel className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-600">No decisions extracted yet.</p>
            </div>
          ) : (
            decisions.map((d) => (
              <div key={d.id} className="glass-card px-5 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-950">{d.text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {d.approver && (
                        <span className="inline-flex items-center gap-1 text-xs text-surface-600">
                          <User className="w-3 h-3" /> {d.approver}
                        </span>
                      )}
                      {d.confidence !== null && (
                        <span className="text-xs text-surface-500">
                          {Math.round(d.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    {d.evidence_text && (
                      <p className="mt-2 text-xs text-surface-600 italic border-l-2 border-surface-400 pl-3">
                        "{d.evidence_text}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Risk flags section */}
      {expandedSection === 'risks' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
            Risk Flags ({riskFlags.length})
          </h3>
          {riskFlags.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-600">No risks detected.</p>
            </div>
          ) : (
            riskFlags.map((r) => {
              const severity = SEVERITY_BADGE[r.severity] || SEVERITY_BADGE.medium;
              return (
                <div key={r.id} className="glass-card px-5 py-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 ${severity.text} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-950">{r.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${severity.bg} ${severity.text}`}>
                          {r.severity} severity
                        </span>
                      </div>
                      {r.evidence_text && (
                        <p className="mt-2 text-xs text-surface-600 italic border-l-2 border-surface-400 pl-3">
                          "{r.evidence_text}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
