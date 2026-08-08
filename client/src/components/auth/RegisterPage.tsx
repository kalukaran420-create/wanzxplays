import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Sparkles } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, username, password, displayName);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Try a different email/username.');
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-discord-brand text-white shadow-lg shadow-discord-brand/30 mb-3 transform hover:-rotate-6 transition-transform">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create an account</h1>
          <p className="text-discord-muted text-sm mt-1">Join the PulseCord community today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Email <span className="text-discord-red">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Username <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="John Doe (Optional)"
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
              minLength={6}
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand transition-colors text-sm font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-discord-brand hover:bg-discord-brand-hover active:bg-discord-brand/80 text-white font-semibold rounded-md shadow-md hover:shadow-discord-brand/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Continue</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-discord-muted">
          <Link to="/login" className="text-discord-brand hover:underline font-semibold">
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
};
