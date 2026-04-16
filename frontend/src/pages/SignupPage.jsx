import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot, Sparkles, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft,
  AlertTriangle, User, Building2, Users, Crown, Check, Copy
} from 'lucide-react';

const ORG_SIZES = [
  { value: 'small', label: '1–10', desc: 'Startup / Small team' },
  { value: 'medium', label: '11–50', desc: 'Growing company' },
  { value: 'large', label: '51–200', desc: 'Mid-size business' },
  { value: 'enterprise', label: '200+', desc: 'Enterprise' },
];

export default function SignupPage() {
  const { signupIndividual, signupOrganization } = useAuth();
  const navigate = useNavigate();

  // Step 1: account type, Step 2: details
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState(null);

  // Individual fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Org fields
  const [orgName, setOrgName] = useState('');
  const [orgSize, setOrgSize] = useState('small');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Success state (for org showing invite code)
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      if (accountType === 'individual') {
        await signupIndividual(name, email, password);
        navigate('/', { replace: true });
      } else {
        if (!orgName.trim()) { setError('Organization name is required'); setLoading(false); return; }
        const result = await signupOrganization(name, email, password, orgName, orgSize);
        if (result.invite_code) {
          setInviteCode(result.invite_code);
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show invite code success screen for org signup
  if (inviteCode) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="glass-card w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-surface-950 mb-2">Organization Created!</h2>
            <p className="text-surface-600 text-sm mb-6">Share this invite code with your team members so they can join:</p>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-200 border border-amber-500/30 mb-4">
              <code className="flex-1 text-2xl font-mono font-bold tracking-wider text-amber-400 text-center">{inviteCode}</code>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-surface-300 transition-colors cursor-pointer">
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-surface-600" />}
              </button>
            </div>

            <p className="text-xs text-surface-600 mb-6">
              Team members can use this code at <span className="text-primary-400">/join-org</span> to join your organization.
            </p>

            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-10 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-xl shadow-primary-500/30">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-surface-950 tracking-tight">
            Work<span className="gradient-text">Pilot</span> AI
          </span>
        </Link>

        <div className="glass-card w-full max-w-lg p-8">
          {/* Step 1: Choose account type */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold text-surface-950 mb-2">Create your account</h1>
                <p className="text-surface-600 text-sm">How will you be using WorkPilot AI?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Individual card */}
                <button
                  onClick={() => { setAccountType('individual'); setStep(2); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] ${
                    accountType === 'individual'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-300 bg-surface-200/40 hover:border-surface-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-surface-950 mb-1">Individual</h3>
                  <p className="text-sm text-surface-600">For personal use, freelancers, and solo professionals</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                    <Check className="w-3 h-3" /> Free to start
                  </div>
                </button>

                {/* Organization card */}
                <button
                  onClick={() => { setAccountType('organization'); setStep(2); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] ${
                    accountType === 'organization'
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-surface-300 bg-surface-200/40 hover:border-surface-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-surface-950 mb-1">Organization</h3>
                  <p className="text-sm text-surface-600">For teams and companies with multiple members</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                    <Users className="w-3 h-3" /> Multi-seat plans
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-surface-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 2: Details form */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-800 mb-6 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-6">
                <h2 className="text-xl font-extrabold text-surface-950 mb-1">
                  {accountType === 'individual' ? 'Personal Details' : 'Organization Setup'}
                </h2>
                <p className="text-surface-600 text-sm">
                  {accountType === 'individual'
                    ? 'Create your individual WorkPilot account'
                    : 'Set up your organization and admin account'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {accountType === 'organization' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-surface-800 mb-1.5">Organization Name</label>
                      <input
                        id="signup-org-name"
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-800 mb-1.5">Team Size</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ORG_SIZES.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setOrgSize(s.value)}
                            className={`px-3 py-2.5 rounded-xl text-left text-sm transition-all cursor-pointer border ${
                              orgSize === s.value
                                ? 'border-primary-500 bg-primary-500/10 text-surface-950'
                                : 'border-surface-300 bg-surface-200/40 text-surface-700 hover:border-surface-400'
                            }`}
                          >
                            <span className="font-semibold">{s.label}</span>
                            <span className="text-xs text-surface-600 ml-1">• {s.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-surface-300 pt-4">
                      <p className="text-xs font-medium text-surface-600 uppercase tracking-wider mb-3">Admin Account</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-surface-800 mb-1.5">
                    {accountType === 'organization' ? 'Admin Name' : 'Full Name'}
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                    autoFocus={accountType === 'individual'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-800 mb-1.5">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-800 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm pr-12"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-800 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-surface-600 mt-1">Minimum 6 characters</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 px-4 py-2.5 rounded-xl">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  id="signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'Creating...' : accountType === 'organization' ? 'Create Organization' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-surface-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-surface-600 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-400" />
          Agentic Work Orchestration Platform
        </p>
      </div>
    </div>
  );
}
