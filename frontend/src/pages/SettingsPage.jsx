import { useState, useEffect } from 'react';
import { Settings, Key, HardDrive, Info, CheckCircle, XCircle, Loader2, Sun, Moon, Palette, Shield, Lock } from 'lucide-react';
import { getSettings, updateSettings, getSettingsStatus } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [openaiKey, setOpenaiKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [whisperModel, setWhisperModel] = useState('base');
  const [embeddingModel, setEmbeddingModel] = useState('all-MiniLM-L6-v2');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        getSettings(),
        getSettingsStatus(),
      ]);
      setSettings(settingsRes.data);
      setStatus(statusRes.data);
      setWhisperModel(settingsRes.data?.models?.whisper_model || 'base');
      setEmbeddingModel(settingsRes.data?.models?.embedding_model || 'all-MiniLM-L6-v2');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const data = {};
      if (openaiKey) data.openai_api_key = openaiKey;
      if (hfToken) data.hf_token = hfToken;
      data.whisper_model = whisperModel;
      data.embedding_model = embeddingModel;

      await updateSettings(data);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setOpenaiKey('');
      setHfToken('');
      await loadSettings();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-primary)]" />
        <span className="text-sm font-medium">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-6 h-6 text-[var(--text-primary)]" />
          <h1 className="font-heading text-3xl text-[var(--text-primary)]">Settings</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage application theme, API keys, AI models, and local storage preferences.
        </p>
      </header>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Theme Preference Section */}
      <section className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <Palette className="w-5 h-5 text-[var(--text-primary)]" />
          <h2 className="font-heading text-xl text-[var(--text-primary)]">Appearance & Theme</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Select your preferred application color theme.
        </p>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-[#F6F5F2] border-[var(--btn-dark-bg)] text-[#1C1917] shadow-md ring-2 ring-stone-900/10'
                : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-stone-300 flex items-center justify-center flex-shrink-0 text-amber-600">
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-heading text-lg block text-stone-950">Light Editorial</span>
              <span className="text-[11px] text-stone-600">Warm stone & cream landing theme</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-[#1C1917] border-white text-white shadow-md ring-2 ring-white/10'
                : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#0C0A09] border border-stone-700 flex items-center justify-center flex-shrink-0 text-amber-400">
              <Moon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-heading text-lg block text-stone-100">Dark Minimal</span>
              <span className="text-[11px] text-stone-400">Deep charcoal & stone contrast</span>
            </div>
          </button>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Keys Section */}
        <section className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Key className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">API Credentials</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">OpenAI API Key</label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder={settings?.api_keys?.openai_configured ? '•••••••••••••••••••• (Configured)' : 'sk-proj-...'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              {settings?.api_keys?.openai_configured ? (
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                  <XCircle className="w-3.5 h-3.5" /> Required
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Required for transcription analysis, document RAG, and ActionOps LLM planning.</p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">HuggingFace Token</label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder={settings?.api_keys?.hf_configured ? '•••••••••••••••••••• (Configured)' : 'hf_...'}
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              {settings?.api_keys?.hf_configured ? (
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-stone-500/10 border border-stone-500/20 text-[var(--text-muted)] text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                  <XCircle className="w-3.5 h-3.5" /> Optional
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Used for Pyannote speaker diarization models.</p>
          </div>
        </section>

        {/* AI Models Section */}
        <section className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Info className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">AI Model Configurations</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Whisper ASR Model</label>
              <select
                value={whisperModel}
                onChange={(e) => setWhisperModel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              >
                <option value="tiny">Tiny (fastest)</option>
                <option value="base">Base (balanced default)</option>
                <option value="small">Small (higher precision)</option>
                <option value="medium">Medium (accurate, slower)</option>
                <option value="large-v3">Large v3 (best quality)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Vector Embedding Model</label>
              <select
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              >
                <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (384d, fast)</option>
                <option value="all-mpnet-base-v2">all-mpnet-base-v2 (768d, quality)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Local Storage Section */}
        <section className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <HardDrive className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Local File Persistence</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">Data Directory</span>
              <code className="text-[var(--text-primary)] font-mono">{settings?.data_dir || '~/WorkPilotAI'}</code>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">Files Ingested</span>
              <span className="font-heading text-lg text-[var(--text-primary)]">{settings?.storage?.file_count || 0} files</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">Storage Usage</span>
              <span className="font-heading text-lg text-[var(--text-primary)]">{settings?.storage?.total_size_mb || 0} MB</span>
            </div>
          </div>
        </section>

        {/* Privacy & Data Security Section */}
        <section className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-heading text-xl text-[var(--text-primary)]">Privacy & Data Security</h2>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">Your Data Stays On-Device</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">WorkPilot AI is built with a privacy-first, local-only architecture. All your data is processed and stored exclusively on your computer.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">Database</span>
              <span className="text-[var(--text-primary)] font-medium">SQLite — stored locally at ~/WorkPilotAI/data/</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">Vector Store</span>
              <span className="text-[var(--text-primary)] font-medium">ChromaDB — embedded, local disk persistence</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">File Storage</span>
              <span className="text-[var(--text-primary)] font-medium">Local filesystem at ~/WorkPilotAI/files/</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] block mb-1">External API Calls</span>
              <span className="text-[var(--text-primary)] font-medium">Only LLM text prompts sent to OpenAI (no files)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1 text-xs">
            <Link to="/privacy" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors">Terms of Service</Link>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-dark px-6 py-2.5 text-xs font-medium cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
