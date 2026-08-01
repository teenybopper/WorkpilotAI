import { Shield, Lock, Eye, Server, Database, Cloud, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const lastUpdated = 'August 1, 2026';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back Link */}
      <Link
        to="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
      </Link>

      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-[var(--text-primary)]">Privacy Policy</h1>
            <p className="text-xs text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* Privacy-First Banner */}
      <div className="app-card p-5 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading text-xl text-[var(--text-primary)] mb-1">Privacy-First, Local-Only Architecture</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              WorkPilot AI is designed as a fully local, on-device application. Your documents, meeting recordings,
              transcripts, and extracted insights are stored exclusively on your computer. We do not operate servers
              that collect, store, or process your data.
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <section className="space-y-6">
        {/* Data Storage */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Data Storage & Processing</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p><strong className="text-[var(--text-primary)]">Local Database:</strong> All structured data (workspaces, sources, transcripts, extracted entities, action plans) is stored in a SQLite database located at <code className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] font-mono text-[11px]">~/WorkPilotAI/data/workpilot.db</code> on your computer.</p>
            <p><strong className="text-[var(--text-primary)]">Vector Embeddings:</strong> Document and transcript embeddings for semantic search are stored locally using ChromaDB at <code className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] font-mono text-[11px]">~/WorkPilotAI/data/chroma/</code>.</p>
            <p><strong className="text-[var(--text-primary)]">Files:</strong> Uploaded documents and audio recordings remain on your local filesystem at <code className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] font-mono text-[11px]">~/WorkPilotAI/files/</code>.</p>
            <p><strong className="text-[var(--text-primary)]">No Cloud Sync:</strong> WorkPilot AI does not sync, back up, or transmit your files to any remote server. All processing (document parsing with Docling, audio transcription with Faster-Whisper, speaker diarization with Pyannote) runs entirely on your device.</p>
          </div>
        </div>

        {/* External API Usage */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">External API Usage</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p><strong className="text-[var(--text-primary)]">OpenAI API:</strong> When you use features like document entity extraction, meeting insight extraction, action planning, or RAG-based Q&A, WorkPilot AI sends <em>only the relevant text excerpts</em> (not entire files) to the OpenAI API for LLM processing. This is controlled by your personal OpenAI API key configured in Settings.</p>
            <p><strong className="text-[var(--text-primary)]">What is sent:</strong> Extracted text snippets, transcript segments, and structured prompts. Raw audio files and full documents are never transmitted.</p>
            <p><strong className="text-[var(--text-primary)]">HuggingFace:</strong> If configured, the HuggingFace token is used only to download the Pyannote speaker diarization model weights. No user data is sent to HuggingFace.</p>
            <p><strong className="text-[var(--text-primary)]">Integration Tools:</strong> When you connect third-party tools (Jira, Slack, Google Docs, etc.) via ActionOps, WorkPilot AI sends only the specific action payloads you approve. All integrations require your explicit API credentials and human-in-the-loop approval before execution.</p>
          </div>
        </div>

        {/* What We Don't Do */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">What We Don't Do</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> collect analytics or telemetry data</li>
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> track your usage or behavior</li>
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> store cookies or browser fingerprints</li>
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> sell, share, or monetize your data in any way</li>
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> operate remote servers that receive your files</li>
              <li>We do <strong className="text-[var(--text-primary)]">not</strong> require account creation or authentication with our servers</li>
            </ul>
          </div>
        </div>

        {/* Data Ownership */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Data Ownership & Deletion</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>You own 100% of your data. Since all data is stored locally on your device, you have complete control:</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">Delete individual items</strong> through the WorkPilot AI web interface</li>
              <li><strong className="text-[var(--text-primary)]">Delete all data</strong> by removing the <code className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] font-mono text-[11px]">~/WorkPilotAI/</code> directory</li>
              <li><strong className="text-[var(--text-primary)]">Uninstall</strong> the companion app to remove the application binary</li>
            </ul>
            <p>No residual data remains on any external server after deletion.</p>
          </div>
        </div>

        {/* Contact */}
        <div className="app-card p-6 space-y-2">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">Contact & Questions</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            If you have questions about this privacy policy, please open an issue on our{' '}
            <a
              href="https://github.com/teenybopper/workpilotAI/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] underline hover:no-underline"
            >
              GitHub repository
            </a>.
          </p>
        </div>
      </section>
    </div>
  );
}
