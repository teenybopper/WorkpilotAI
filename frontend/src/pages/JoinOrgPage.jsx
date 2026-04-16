import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Sparkles, Eye, EyeOff, Loader2, ArrowRight, AlertTriangle, Users, KeyRound } from 'lucide-react';

export default function JoinOrgPage() {
  const { joinOrg } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinOrg(name, email, password, inviteCode.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join organization');
    } finally {
      setLoading(false);
    }
  };

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

        <div className="glass-card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-surface-950 mb-2">Join Organization</h1>
            <p className="text-surface-600 text-sm">Enter the invite code you received from your team admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Invite Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  id="join-invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-200 border border-amber-500/20 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono tracking-wider uppercase"
                  autoFocus
                />
              </div>
            </div>

            <div className="border-t border-surface-300 pt-4">
              <p className="text-xs font-medium text-surface-600 uppercase tracking-wider mb-3">Your Account</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Full Name</label>
              <input
                id="join-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Email</label>
              <input
                id="join-email"
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
                  id="join-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm pr-12"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-800 cursor-pointer">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 px-4 py-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              id="join-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Joining...' : 'Join Organization'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-surface-600">
              Don't have an invite code?{' '}
              <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">Create an account</Link>
            </p>
            <p className="text-sm text-surface-600">
              Already a member?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-surface-600 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-400" />
          Agentic Work Orchestration Platform
        </p>
      </div>
    </div>
  );
}
