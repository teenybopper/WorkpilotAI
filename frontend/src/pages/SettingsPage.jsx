import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Shield, Zap, Crown,
  CheckCircle2, XCircle, Loader2, Save
} from 'lucide-react';
import { settingsApi } from '../lib/api';

const TIER_INFO = {
  personal: { label: 'Personal', color: 'from-surface-400 to-surface-500', icon: '👤' },
  team: { label: 'Team', color: 'from-primary-500 to-accent-500', icon: '👥' },
  enterprise: { label: 'Enterprise', color: 'from-amber-500 to-orange-500', icon: '🏢' },
};

export default function SettingsPage() {
  const [plan, setPlan] = useState(null);
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [planRes, policyRes] = await Promise.all([
        settingsApi.plan(),
        settingsApi.policies(),
      ]);
      setPlan(planRes.data);
      setPolicies(policyRes.data.policies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      await settingsApi.updatePolicies(policies);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const tier = TIER_INFO[plan?.subscription_tier] || TIER_INFO.personal;
  const features = plan?.features || {};

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-950 tracking-tight mb-1">Settings</h1>
        <p className="text-surface-600">Manage your plan, features, and execution policies.</p>
      </div>

      {/* Current plan */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
          Your Plan
        </h2>
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl shadow-lg`}>
              {tier.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-surface-950">{tier.label} Plan</h3>
              <p className="text-sm text-surface-600">Your current subscription tier</p>
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(features).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const isEnabled = typeof value === 'boolean' ? value : (value === -1 ? true : value > 0);
              const displayValue = typeof value === 'boolean'
                ? (value ? 'Enabled' : 'Disabled')
                : (value === -1 ? 'Unlimited' : String(value));

              return (
                <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-200/40 border border-white/5">
                  <span className="text-sm text-surface-800">{label}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    isEnabled ? 'text-emerald-400' : 'text-surface-500'
                  }`}>
                    {isEnabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Execution policies */}
      <section>
        <h2 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-4">
          Execution Policies
        </h2>
        <div className="glass-card p-6 space-y-5">
          <p className="text-sm text-surface-600 mb-4">
            Control how ActionOps handles proposed actions. These policies determine what requires human review.
          </p>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-surface-900">Auto-execute low-risk actions</span>
              <p className="text-xs text-surface-600 mt-0.5">Skip approval for actions classified as low-risk</p>
            </div>
            <input
              type="checkbox"
              checked={policies?.auto_execute_low_risk || false}
              onChange={(e) => setPolicies(prev => ({ ...prev, auto_execute_low_risk: e.target.checked }))}
              className="accent-primary-500 w-5 h-5 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-surface-900">Require review for all actions</span>
              <p className="text-xs text-surface-600 mt-0.5">Every action must be manually approved before execution</p>
            </div>
            <input
              type="checkbox"
              checked={policies?.require_review_all ?? true}
              onChange={(e) => setPolicies(prev => ({ ...prev, require_review_all: e.target.checked }))}
              className="accent-primary-500 w-5 h-5 cursor-pointer"
            />
          </label>

          <div>
            <label className="text-sm font-medium text-surface-900">Max daily auto-executions</label>
            <p className="text-xs text-surface-600 mb-2">Safety limit on auto-executed actions per day</p>
            <input
              type="number"
              min={0}
              max={100}
              value={policies?.max_daily_auto_executions ?? 10}
              onChange={(e) => setPolicies(prev => ({ ...prev, max_daily_auto_executions: parseInt(e.target.value) || 0 }))}
              className="w-24 px-3 py-2 rounded-lg bg-surface-200 border border-white/5 text-surface-950 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <button
            onClick={handleSavePolicies}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-40 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Policies'}
          </button>
        </div>
      </section>
    </div>
  );
}
