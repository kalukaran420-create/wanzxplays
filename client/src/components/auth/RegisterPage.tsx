import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Lock, Mail, User } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

interface RegisterPageProps {
  onSwitchToLogin?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, username, password, displayName);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-cyber-base flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-cyber-cyan/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyber-violet/15 rounded-full blur-3xl pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl z-10 border border-white/10 animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-aurora-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
            <Zap className="w-10 h-10 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create an Account</h1>
          <p className="text-xs text-cyber-muted mt-1.5">Join communities and start real-time sharing on <strong>PulseCord</strong>.</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-cyber-muted uppercase mb-1.5 tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-cyber-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-cyber-input text-white border border-cyber-border rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-cyber-violet focus:shadow-glow-violet transition-all duration-300 placeholder-cyber-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-cyber-muted uppercase mb-1.5 tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-cyber-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-cyber-input text-white border border-cyber-border rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-cyber-violet focus:shadow-glow-violet transition-all duration-300 placeholder-cyber-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-cyber-muted uppercase mb-1.5 tracking-wider">
              Display Name (Optional)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-cyber-muted" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-cyber-input text-white border border-cyber-border rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-cyber-violet focus:shadow-glow-violet transition-all duration-300 placeholder-cyber-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-cyber-muted uppercase mb-1.5 tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-cyber-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-cyber-input text-white border border-cyber-border rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-cyber-violet focus:shadow-glow-violet transition-all duration-300 placeholder-cyber-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-aurora-gradient hover:bg-aurora-hover text-white font-extrabold text-sm rounded-2xl shadow-glow-violet transition-all duration-300 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Continue'}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#12131e] px-3 text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider absolute">
            OR
          </span>
        </div>

        <GoogleAuthButton onError={(msg) => setError(msg)} />

        <div className="mt-6 text-center text-xs text-cyber-muted">
          Already have an account?{' '}
          <button
            onClick={handleLoginClick}
            className="font-bold text-cyber-cyan hover:underline transition-colors ml-1"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};
