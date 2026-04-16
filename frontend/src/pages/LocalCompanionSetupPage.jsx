import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Monitor, Download, Link2, CheckCircle2, XCircle, Loader2,
  Smartphone, Shield, ArrowRight, RefreshCw, Trash2, Wifi,
  WifiOff, Clock, AlertTriangle, Copy, Check, Laptop, ExternalLink
} from 'lucide-react';
import { deviceApi } from '../lib/api';

const PLATFORMS = [
  {
    value: 'windows',
    label: 'Windows',
    icon: '🪟',
    desc: 'Windows 10/11 64-bit',
    filename: 'WorkPilot-Companion_1.0.0_x64-setup.exe',
    url: 'https://github.com/workpilot-ai/companion/releases/latest/download/WorkPilot-Companion_1.0.0_x64-setup.exe',
  },
  {
    value: 'macos',
    label: 'macOS',
    icon: '🍎',
    desc: 'macOS 12+ Apple Silicon & Intel',
    filename: 'WorkPilot-Companion_1.0.0_universal.dmg',
    url: 'https://github.com/workpilot-ai/companion/releases/latest/download/WorkPilot-Companion_1.0.0_universal.dmg',
  },
  {
    value: 'linux',
    label: 'Linux',
    icon: '🐧',
    desc: 'Ubuntu 22.04+, Fedora 38+',
    filename: 'WorkPilot-Companion_1.0.0_amd64.AppImage',
    url: 'https://github.com/workpilot-ai/companion/releases/latest/download/WorkPilot-Companion_1.0.0_amd64.AppImage',
  },
];

export default function LocalCompanionSetupPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [pairResult, setPairResult] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [platform, setPlatform] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [downloadStarted, setDownloadStarted] = useState('');

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    try {
      const res = await deviceApi.list();
      setDevices(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePair = async () => {
    if (!deviceName.trim() || !platform) {
      setError('Please enter a device name and select a platform');
      return;
    }
    setPairing(true);
    setError('');
    try {
      const res = await deviceApi.pair({ device_name: deviceName, device_platform: platform });
      setPairResult(res.data);
      setDeviceName('');
      setPlatform('');
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'Pairing failed');
    } finally {
      setPairing(false);
    }
  };

  const handleRevoke = async (deviceId) => {
    try {
      await deviceApi.revoke(deviceId);
      loadDevices();
    } catch (err) { console.error(err); }
  };

  const handleDownload = (p) => {
    setDownloadStarted(p.value);
    // Trigger browser download
    const link = document.createElement('a');
    link.href = p.url;
    link.download = p.filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadStarted(''), 3000);
  };

  const copyToken = () => {
    if (pairResult?.device_token) {
      navigator.clipboard.writeText(pairResult.device_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.is_active && !device.last_seen_at) {
      return { label: 'Pending', color: 'bg-amber-500/10 text-amber-400', icon: Clock, dotColor: 'border-amber-400' };
    }
    if (device.is_active) {
      return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400', icon: Wifi, dotColor: 'border-emerald-400' };
    }
    return { label: 'Revoked', color: 'bg-surface-300/40 text-surface-500', icon: WifiOff, dotColor: 'border-surface-400' };
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-surface-950 tracking-tight mb-1">Local Companion Setup</h1>
        <p className="text-sm text-surface-600">Install and pair the WorkPilot desktop companion to capture meeting audio locally.</p>
      </div>

      {/* Steps guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { step: 1, icon: Download, title: 'Download', desc: 'Get the companion app for your OS' },
          { step: 2, icon: Link2, title: 'Pair Device', desc: 'Connect companion to your account' },
          { step: 3, icon: Monitor, title: 'Start Listening', desc: 'Capture audio during meetings' },
        ].map((s) => (
          <div key={s.step} className="glass-card p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                {s.step}
              </div>
              <s.icon className="w-4 h-4 text-surface-600" />
            </div>
            <h3 className="font-semibold text-sm text-surface-950 mb-0.5">{s.title}</h3>
            <p className="text-xs text-surface-700">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Download section */}
      <section className="glass-card p-5 mb-6">
        <h2 className="text-base font-bold text-surface-950 mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary-400" /> Download Companion App
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleDownload(p)}
              className="p-3.5 rounded-xl border border-surface-300 bg-surface-200/40 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all text-left cursor-pointer group"
            >
              <div className="text-xl mb-1.5">{p.icon}</div>
              <h4 className="font-semibold text-sm text-surface-950">{p.label}</h4>
              <p className="text-xs text-surface-600 mb-2">{p.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary-400 font-medium group-hover:underline">
                {downloadStarted === p.value ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Downloading...</>
                ) : (
                  <><Download className="w-3 h-3" /> Download</>
                )}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-surface-600 mt-2.5">
          <Shield className="w-3 h-3 inline mr-1 text-amber-400" />
          Audio is captured locally and uploaded securely. No screen or video capture.
        </p>
      </section>

      {/* Pair device section */}
      <section className="glass-card p-5 mb-6">
        <h2 className="text-base font-bold text-surface-950 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary-400" /> Pair a Device
        </h2>

        {pairResult ? (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm text-amber-400">Device Created — Pending Activation</span>
            </div>
            <p className="text-xs text-surface-700 mb-2">
              Copy this token and paste it into your companion app. The device will become <strong>Active</strong> once the companion app verifies it.
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-200 border border-amber-500/30 mb-3">
              <code className="flex-1 text-xs font-mono text-amber-400 break-all">{pairResult.device_token}</code>
              <button onClick={copyToken} className="p-1.5 rounded-lg hover:bg-surface-300 transition-colors cursor-pointer flex-shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-surface-600" />}
              </button>
            </div>
            <p className="text-xs text-rose-400 mb-3">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              This token is shown only once. Store it securely.
            </p>
            <button
              onClick={() => { setPairResult(null); loadDevices(); }}
              className="px-3 py-1.5 rounded-xl bg-surface-200 hover:bg-surface-300 text-xs text-surface-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-surface-800 mb-1">Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Work Laptop, MacBook Pro"
                className="w-full px-3 py-2 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-800 mb-1">Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs text-center transition-all cursor-pointer border ${
                      platform === p.value
                        ? 'border-primary-500 bg-primary-500/10 text-surface-950'
                        : 'border-surface-300 bg-surface-200/40 text-surface-700 hover:border-surface-400'
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
            <button
              onClick={handlePair}
              disabled={pairing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-40 cursor-pointer"
            >
              {pairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {pairing ? 'Pairing...' : 'Pair Device'}
            </button>
          </div>
        )}
      </section>

      {/* Paired devices list */}
      <section>
        <h2 className="text-base font-bold text-surface-950 mb-3 flex items-center gap-2">
          <Laptop className="w-4 h-4 text-primary-400" /> Paired Devices
        </h2>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <Smartphone className="w-6 h-6 text-surface-500 mx-auto mb-2" />
            <p className="text-xs text-surface-600">No devices paired yet. Pair your first device above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => {
              const status = getDeviceStatus(device);
              const StatusIcon = status.icon;
              return (
                <div key={device.id} className="glass-card px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    device.is_active ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    !device.last_seen_at ? 'bg-amber-500/10 border border-amber-500/20' :
                    'bg-surface-300/40 border border-surface-400/20'
                  }`}>
                    <Monitor className={`w-3.5 h-3.5 ${
                      device.is_active ? 'text-emerald-400' :
                      !device.last_seen_at ? 'text-amber-400' :
                      'text-surface-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-950 truncate">{device.device_name || 'Unnamed Device'}</p>
                    <p className="text-xs text-surface-600 mt-0.5">
                      {device.device_platform}
                      {device.last_seen_at && ` • Last seen ${new Date(device.last_seen_at).toLocaleString()}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                  {(device.is_active || !device.last_seen_at) && (
                    <button
                      onClick={() => handleRevoke(device.id)}
                      className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Revoke device"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
