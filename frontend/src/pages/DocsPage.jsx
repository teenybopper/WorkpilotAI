import { useState } from 'react';
import {
  BookOpen, Download, Shield, Terminal, Settings, Cpu, Key,
  MonitorSpeaker, Apple, Monitor, Laptop, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, FileText, Mic, Zap, ArrowLeft,
  HardDrive, Lock, ExternalLink, Bug
} from 'lucide-react';
import { Link } from 'react-router-dom';

function AccordionSection({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="app-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center gap-3 text-left cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <Icon className="w-4.5 h-4.5 text-[var(--text-primary)] flex-shrink-0" />
        <span className="font-heading text-xl text-[var(--text-primary)] flex-1">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 border-t border-[var(--border-subtle)]">
          {children}
        </div>
      )}
    </div>
  );
}

function StepCard({ number, title, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] flex items-center justify-center flex-shrink-0 text-xs font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1">{title}</h4>
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <code className="block px-3 py-2 mt-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] overflow-x-auto">
      {children}
    </code>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-[var(--text-primary)]">Documentation</h1>
            <p className="text-sm text-[var(--text-secondary)]">Everything you need to install, configure, and use WorkPilot AI</p>
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Installation', icon: Download, href: '#installation' },
          { label: 'Getting Started', icon: Settings, href: '#getting-started' },
          { label: 'Architecture', icon: Cpu, href: '#architecture' },
          { label: 'Troubleshooting', icon: Bug, href: '#troubleshooting' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            className="app-card p-3 flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </a>
        ))}
      </div>

      {/* ── Installation & OS Security ──────────────────────────────────── */}
      <div id="installation" className="space-y-4">
        <h2 className="font-heading text-2xl text-[var(--text-primary)] flex items-center gap-2">
          <Download className="w-5 h-5" /> Installation Guide
        </h2>

        {/* macOS */}
        <AccordionSection icon={Apple} title="macOS — Gatekeeper Bypass" defaultOpen={true}>
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                Since the app is not yet code-signed with an Apple Developer certificate, macOS Gatekeeper will block it on first launch. Follow these 2 simple steps to bypass this safely.
              </p>
            </div>
            <StepCard number="1" title="Right-click → Open">
              <p>After downloading the <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">.dmg</code> file and dragging WorkPilot Companion to Applications, <strong>right-click</strong> (or Control-click) the app icon and select <strong>"Open"</strong> from the context menu.</p>
              <p className="mt-1.5 text-[var(--text-muted)] italic">Do NOT double-click — this will show a non-bypassable error dialog.</p>
            </StepCard>
            <StepCard number="2" title="Click 'Open' in the dialog">
              <p>macOS will show a security dialog saying the app is from an unidentified developer. Click the <strong>"Open"</strong> button to confirm. This is a one-time step — subsequent launches will work normally.</p>
            </StepCard>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Alternative:</strong> You can also go to <strong>System Settings → Privacy & Security</strong> and click <strong>"Open Anyway"</strong> next to the WorkPilot Companion entry.
              </p>
            </div>
          </div>
        </AccordionSection>

        {/* Windows */}
        <AccordionSection icon={Monitor} title="Windows — SmartScreen Bypass">
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                Windows SmartScreen may show a warning for unsigned applications. This is expected for open-source software that doesn't have an EV code-signing certificate.
              </p>
            </div>
            <StepCard number="1" title='Click "More info"'>
              <p>When Windows SmartScreen shows "Windows protected your PC", click the <strong>"More info"</strong> link at the bottom of the dialog. This reveals the app details and the "Run anyway" button.</p>
            </StepCard>
            <StepCard number="2" title='Click "Run anyway"'>
              <p>After clicking "More info", a <strong>"Run anyway"</strong> button appears at the bottom. Click it to proceed with the installation. This is a one-time action.</p>
            </StepCard>
          </div>
        </AccordionSection>

        {/* Linux */}
        <AccordionSection icon={Laptop} title="Linux — AppImage / .deb Permissions">
          <div className="space-y-3 pt-2">
            <StepCard number="1" title="Make the AppImage executable">
              <CodeBlock>chmod +x WorkPilot-Companion_0.1.0_amd64.AppImage</CodeBlock>
            </StepCard>
            <StepCard number="2" title="Run the application">
              <CodeBlock>./WorkPilot-Companion_0.1.0_amd64.AppImage</CodeBlock>
              <p className="mt-1.5">Or for <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">.deb</code> packages:</p>
              <CodeBlock>sudo dpkg -i workpilot-companion_0.1.0_amd64.deb</CodeBlock>
            </StepCard>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 mt-2">
              <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Audio access:</strong> On PipeWire / PulseAudio systems, ensure your user has access to the audio group: <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">sudo usermod -aG audio $USER</code>
              </p>
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* ── Getting Started ────────────────────────────────────────────── */}
      <div id="getting-started" className="space-y-4">
        <h2 className="font-heading text-2xl text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="w-5 h-5" /> Getting Started
        </h2>

        <AccordionSection icon={Key} title="1. Configure API Keys" defaultOpen={true}>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[var(--text-secondary)]">Navigate to <Link to="/settings" className="text-[var(--text-primary)] underline hover:no-underline">Settings</Link> and configure:</p>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">OpenAI API Key (Required)</p>
                <p className="text-[11px] text-[var(--text-muted)]">Powers document analysis, meeting insight extraction, and ActionOps planning. Get yours at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">platform.openai.com</a>.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">HuggingFace Token (Optional)</p>
                <p className="text-[11px] text-[var(--text-muted)]">Required only for speaker diarization (identifying who said what). Get yours at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">huggingface.co</a>.</p>
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection icon={FileText} title="2. Your First Document (DocOps)">
          <div className="space-y-3 pt-2">
            <StepCard number="1" title="Create a Workspace">
              <p>Go to the <Link to="/" className="underline hover:no-underline text-[var(--text-primary)]">Dashboard</Link> and create a new workspace (e.g., "Q3 Project" or "Legal Review").</p>
            </StepCard>
            <StepCard number="2" title="Upload a Document">
              <p>Navigate to <Link to="/docops" className="underline hover:no-underline text-[var(--text-primary)]">DocOps</Link>, select your workspace, and drag a PDF, DOCX, or PPTX file into the upload zone.</p>
            </StepCard>
            <StepCard number="3" title="View Extracted Intelligence">
              <p>WorkPilot automatically parses the document with Docling, extracts entities (people, dates, monetary amounts, obligations), and indexes it for semantic search.</p>
            </StepCard>
          </div>
        </AccordionSection>

        <AccordionSection icon={Mic} title="3. Your First Meeting (MeetOps)">
          <div className="space-y-3 pt-2">
            <StepCard number="1" title="Upload a Recording">
              <p>Go to <Link to="/meetops" className="underline hover:no-underline text-[var(--text-primary)]">MeetOps</Link>, select "Upload Audio/Video" mode, and upload a WAV, MP3, M4A, OGG, or WebM file.</p>
            </StepCard>
            <StepCard number="2" title="Automatic Processing">
              <p>WorkPilot transcribes the audio with Faster-Whisper, identifies speakers with Pyannote diarization, and extracts tasks, decisions, blockers, risks, and follow-ups.</p>
            </StepCard>
            <StepCard number="3" title="Review in ActionOps">
              <p>Extracted actions appear in <Link to="/actions" className="underline hover:no-underline text-[var(--text-primary)]">ActionOps</Link> where you can review, approve, and execute them through connected integrations.</p>
            </StepCard>
          </div>
        </AccordionSection>
      </div>

      {/* ── Architecture ───────────────────────────────────────────────── */}
      <div id="architecture" className="space-y-4">
        <h2 className="font-heading text-2xl text-[var(--text-primary)] flex items-center gap-2">
          <Cpu className="w-5 h-5" /> Architecture Overview
        </h2>

        <AccordionSection icon={HardDrive} title="System Components">
          <div className="space-y-3 pt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'FastAPI Backend', desc: 'Python control plane handling all API requests, AI model orchestration, and database management', tech: 'Python 3.12, FastAPI, SQLAlchemy' },
                { name: 'React Web App', desc: 'Browser-based dashboard for managing workspaces, documents, meetings, and actions', tech: 'React 19, Vite, Tailwind CSS v4' },
                { name: 'Tauri Companion', desc: 'Desktop system tray app for live audio capture and real-time meeting streaming', tech: 'Tauri v2, Rust, cpal audio I/O' },
                { name: 'AI Pipeline', desc: 'On-device ML models for transcription, diarization, and document parsing', tech: 'Faster-Whisper, Pyannote, Docling' },
              ].map(comp => (
                <div key={comp.name} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{comp.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{comp.desc}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">{comp.tech}</p>
                </div>
              ))}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection icon={Lock} title="Privacy Architecture">
          <div className="space-y-2 pt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>WorkPilot AI follows a strict <strong className="text-[var(--text-primary)]">local-first architecture</strong>:</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">On-device storage:</strong> SQLite database + ChromaDB vector store + local filesystem — all at <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">~/WorkPilotAI/</code></li>
              <li><strong className="text-[var(--text-primary)]">On-device AI:</strong> Faster-Whisper transcription, Pyannote diarization, Docling parsing, and sentence-transformer embeddings all run locally</li>
              <li><strong className="text-[var(--text-primary)]">Minimal external calls:</strong> Only LLM prompts (text excerpts, not full files) are sent to OpenAI for analysis. No analytics, no telemetry, no tracking</li>
              <li><strong className="text-[var(--text-primary)]">Your API keys:</strong> All external service credentials are stored in your local config file, never transmitted to our servers</li>
            </ul>
          </div>
        </AccordionSection>
      </div>

      {/* ── Troubleshooting ─────────────────────────────────────────────── */}
      <div id="troubleshooting" className="space-y-4">
        <h2 className="font-heading text-2xl text-[var(--text-primary)] flex items-center gap-2">
          <Bug className="w-5 h-5" /> Troubleshooting
        </h2>

        <AccordionSection icon={MonitorSpeaker} title="Backend Not Starting">
          <div className="space-y-2 pt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>If the companion shows "Backend Starting…":</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>The backend should auto-start when the companion launches. Wait 10-15 seconds for initialization.</li>
              <li>If developing locally, ensure the FastAPI server is running:</li>
            </ul>
            <CodeBlock>cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000</CodeBlock>
            <p className="mt-2">Check if port 8000 is already in use:</p>
            <CodeBlock>lsof -i :8000  # macOS/Linux{'\n'}netstat -ano | findstr :8000  # Windows</CodeBlock>
          </div>
        </AccordionSection>

        <AccordionSection icon={Mic} title="Audio Capture Issues">
          <div className="space-y-2 pt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">macOS:</strong> Grant microphone access in System Settings → Privacy & Security → Microphone</li>
              <li><strong className="text-[var(--text-primary)]">Windows:</strong> Allow app access in Settings → Privacy → Microphone</li>
              <li><strong className="text-[var(--text-primary)]">Linux:</strong> Ensure PipeWire/PulseAudio is running and your user is in the <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">audio</code> group</li>
            </ul>
          </div>
        </AccordionSection>

        <AccordionSection icon={AlertTriangle} title="File Upload Limits">
          <div className="space-y-2 pt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>WorkPilot AI enforces the following upload limits to ensure stable processing:</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Documents</p>
                <p className="text-[11px] text-[var(--text-muted)]">Max 50 MB per file</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Audio Files</p>
                <p className="text-[11px] text-[var(--text-muted)]">Max 100 MB per file</p>
              </div>
            </div>
            <p className="mt-2">For larger files, consider splitting documents or trimming audio recordings before uploading.</p>
          </div>
        </AccordionSection>

        {/* Feedback CTA */}
        <div className="app-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Bug className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-lg text-[var(--text-primary)] mb-0.5">Found a bug or need help?</h3>
            <p className="text-xs text-[var(--text-secondary)]">Report issues and get support through our GitHub repository.</p>
          </div>
          <a
            href="https://github.com/teenybopper/workpilotAI/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-dark px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5 flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Issue
          </a>
        </div>
      </div>
    </div>
  );
}
