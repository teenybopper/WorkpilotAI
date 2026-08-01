import { Scale, FileText, Key, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-[var(--text-primary)]">Terms of Service</h1>
            <p className="text-xs text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* Sections */}
      <section className="space-y-6">
        {/* Agreement */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">1. Acceptance of Terms</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>By downloading, installing, or using WorkPilot AI ("the Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.</p>
            <p>WorkPilot AI is open-source software provided under the terms of its license. These terms supplement the software license and govern your use of the application and any associated services.</p>
          </div>
        </div>

        {/* Description */}
        <div className="app-card p-6 space-y-3">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">2. Description of Service</h2>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>WorkPilot AI is a local, on-device AI assistant that provides:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Document parsing and intelligence extraction (DocOps)</li>
              <li>Meeting recording transcription and speaker diarization (MeetOps)</li>
              <li>Agentic action planning and execution with human-in-the-loop governance (ActionOps)</li>
              <li>Semantic search across workspace sources via embedded vector database</li>
            </ul>
            <p>The Software runs locally on your device. No remote servers are operated by WorkPilot AI for data processing or storage.</p>
          </div>
        </div>

        {/* API Keys */}
        <div className="app-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Key className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">3. API Keys & Third-Party Services</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p><strong className="text-[var(--text-primary)]">Your Responsibility:</strong> You are responsible for providing your own API keys for third-party services (OpenAI, HuggingFace, Jira, Slack, etc.). WorkPilot AI does not provide API keys or pay for API usage on your behalf.</p>
            <p><strong className="text-[var(--text-primary)]">API Costs:</strong> Any costs incurred from API usage (e.g., OpenAI API calls for LLM processing) are solely your responsibility. WorkPilot AI does not control or guarantee pricing from third-party API providers.</p>
            <p><strong className="text-[var(--text-primary)]">Key Security:</strong> API keys are stored locally in your configuration file. You are responsible for keeping your API keys secure and not sharing them.</p>
          </div>
        </div>

        {/* Data */}
        <div className="app-card p-6 space-y-3">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">4. Data & Content</h2>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p><strong className="text-[var(--text-primary)]">Your Data:</strong> You retain full ownership of all data you process through WorkPilot AI, including documents, audio recordings, transcripts, and extracted insights.</p>
            <p><strong className="text-[var(--text-primary)]">Local Storage:</strong> All data is stored locally on your device. You are responsible for backing up your data and maintaining your local storage.</p>
            <p><strong className="text-[var(--text-primary)]">Data Retention:</strong> Data persists on your device until you explicitly delete it. Uninstalling the application does not automatically delete your data directory.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="app-card p-6 space-y-3 border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">5. Disclaimer of Warranties</h2>
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.</p>
            <p><strong className="text-[var(--text-primary)]">AI Output Accuracy:</strong> WorkPilot AI uses machine learning models for transcription, entity extraction, and action planning. AI-generated outputs may contain errors. Always review AI-generated actions before approving them for execution. WorkPilot AI is not responsible for actions taken based on AI-generated recommendations.</p>
            <p><strong className="text-[var(--text-primary)]">Recording Consent:</strong> You are responsible for complying with all applicable laws regarding audio recording, including obtaining consent from meeting participants where legally required.</p>
          </div>
        </div>

        {/* Limitation */}
        <div className="app-card p-6 space-y-3">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">6. Limitation of Liability</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            In no event shall WorkPilot AI, its contributors, or its maintainers be liable for any indirect, incidental,
            special, consequential, or punitive damages, including but not limited to loss of profits, data, or use,
            arising out of or in connection with the use of the Software, whether based on warranty, contract, tort,
            or any other legal theory.
          </p>
        </div>

        {/* Changes */}
        <div className="app-card p-6 space-y-3">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">7. Changes to Terms</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            We may update these Terms of Service from time to time. Changes will be reflected in the "Last updated" date
            above. Continued use of the Software after changes constitutes acceptance of the revised terms.
          </p>
        </div>

        {/* Contact */}
        <div className="app-card p-6 space-y-2">
          <h2 className="font-heading text-xl text-[var(--text-primary)]">8. Contact</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            For questions about these terms, please open an issue on our{' '}
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
