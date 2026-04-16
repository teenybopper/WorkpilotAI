import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Sparkles, Eye, EyeOff, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-10 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-xl shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-surface-950 tracking-tight">
            Work<span className="gradient-text">Pilot</span> AI
          </span>
        </Link>

        {/* Card */}
        <div className="glass-card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-surface-950 mb-2">Welcome back</h1>
            <p className="text-surface-600 text-sm">Sign in to your WorkPilot AI account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-800 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-800 cursor-pointer"
                >
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
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-surface-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Sign up
              </Link>
            </p>
            <p className="text-sm text-surface-600">
              Have an invite code?{' '}
              <Link to="/join-org" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
                Join Organization
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-surface-600 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-400" />
          Agentic Work Orchestration Platform
        </p>
      </div>
    </div>
  );
}
