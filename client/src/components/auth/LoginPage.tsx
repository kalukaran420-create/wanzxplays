import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Sparkles, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-tertiary via-discord-primary to-[#111214] flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-discord-brand/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md bg-discord-secondary/90 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-white/5 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-discord-brand text-white shadow-lg shadow-discord-brand/30 mb-4 transform hover:rotate-6 transition-transform">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back!</h1>
          <p className="text-discord-muted text-sm mt-1">We're so excited to see you again!</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Email Address <span className="text-discord-red">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Password <span className="text-discord-red">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-discord-brand hover:bg-discord-brand-hover active:bg-discord-brand/80 text-white font-semibold rounded-md shadow-md hover:shadow-discord-brand/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-discord-muted">
          Need an account?{' '}
          <Link to="/register" className="text-discord-brand hover:underline font-semibold">
            Register
          </Link>
        </div>

        {/* Quick Test Login Bar */}
        <div className="mt-6 p-3 rounded-lg bg-discord-tertiary/60 border border-white/5">
          <div className="text-[11px] uppercase tracking-wider font-bold text-discord-muted mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-discord-brand" />
            <span>Quick Seed Logins:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickLogin('alex@pulsecord.io')}
              className="flex-1 py-1.5 px-2 bg-discord-primary hover:bg-discord-hover text-xs font-medium text-discord-text rounded border border-white/5 transition-colors text-center truncate"
            >
              Alex (Dev)
            </button>
            <button
              onClick={() => handleQuickLogin('sarah@pulsecord.io')}
              className="flex-1 py-1.5 px-2 bg-discord-primary hover:bg-discord-hover text-xs font-medium text-discord-text rounded border border-white/5 transition-colors text-center truncate"
            >
              Sarah (Gamer)
            </button>
            <button
              onClick={() => handleQuickLogin('bob@pulsecord.io')}
              className="flex-1 py-1.5 px-2 bg-discord-primary hover:bg-discord-hover text-xs font-medium text-discord-text rounded border border-white/5 transition-colors text-center truncate"
            >
              Bob (Builder)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
