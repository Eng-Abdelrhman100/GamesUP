import { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import logoIcon from '../../assets/games up icon white.png';

interface LoginProps {
  onLogin: (user: any, session: any) => void;
  mode?: 'admin' | 'employee';
}

export function Login({ onLogin, mode = 'admin' }: LoginProps) {
  const { settings } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Clear any old/invalid sessions on mount to force fresh login
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // If the session looks old or invalid, clear it
        if (!parsed.access_token || !parsed.user) {
          console.log('Clearing invalid session from localStorage');
          localStorage.removeItem('session');
          localStorage.removeItem('user');
        }
      } catch (error) {
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const normalizeRole = (role: any) => {
    const r = String(role || '').trim().toLowerCase();
    if (!r) return 'staff';
    if (r === 'mgr' || r === 'managerial' || r.startsWith('manager')) return 'manager';
    if (r === 'employee') return 'staff';
    if (r === 'superadmin' || r === 'super_admin' || r === 'administrator') return 'admin';
    return r;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authAPI.login(email, password);
      console.log('Login successful');
      if (result.session) {
        const role = normalizeRole(result?.user?.user_metadata?.role);
        if (mode === 'admin' && role !== 'admin' && role !== 'manager') {
          setError('This account is not allowed in Admin Portal. Use Employee Access.');
          setLoading(false);
          return;
        }
        if (mode === 'employee' && (role === 'admin' || role === 'manager')) {
          setError('This account is for Admin Portal. Use Admin Portal login.');
          setLoading(false);
          return;
        }
        onLogin(result.user, result.session);
      } else {
          setError('Login failed. No session returned.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] grid-pattern flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-bg-secondary border border-border-subtle shadow-2xl shadow-brand-red/25 mb-4">
            <img
              src={settings.website_logo || logoIcon}
              alt={settings.website_title || settings.store_name || 'Admin'}
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-white font-display uppercase italic tracking-tight leading-none mb-1">
            {settings.website_title || settings.store_name || 'Admin'}<span className="text-brand-red">.</span>
          </h1>
          <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase italic">
            {mode === 'employee' ? 'Employee Access' : 'Admin Portal'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-bg-secondary border border-border-subtle rounded-[2rem] shadow-2xl p-8 backdrop-blur-md">
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-black text-text-primary font-display uppercase italic tracking-tight leading-none mb-2">
              Welcome Back<span className="text-brand-red">.</span>
            </h2>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest italic">
              {mode === 'employee' ? 'Sign in to access your tools.' : 'Sign in to manage your system.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-brand-red/10 border border-brand-red/20 rounded-xl">
              <p className="text-xs font-bold text-brand-red uppercase tracking-wider italic">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-brand-red tracking-widest uppercase italic mb-2 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-transparent text-sm transition-all duration-300 font-medium"
                placeholder={settings.store_email || 'email@domain.com'}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-brand-red tracking-widest uppercase italic mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-transparent pr-10 text-sm transition-all duration-300 font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 hover:shadow-brand-red/35 hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="font-black uppercase tracking-widest italic">Verifying...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic">
            {mode === 'employee' ? (
              <a href="/login" className="text-text-secondary hover:text-brand-red transition-colors">
                Admin Portal
              </a>
            ) : (
              <a href="/employee-login" className="text-text-secondary hover:text-brand-red transition-colors">
                Employee Access
              </a>
            )}
            <span className="text-text-secondary/60">Use the correct portal for your role.</span>
          </div>
        </div>

        {/* Landing Page Redirect Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              window.location.hash = '#website';
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-secondary hover:bg-bg-secondary/80 text-text-primary rounded-xl font-bold text-xs transition-all border border-border-subtle hover:border-brand-red/50 uppercase tracking-widest italic cursor-pointer scale-100 active:scale-95 shadow-md shadow-black/10"
          >
            <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Website
          </button>
        </div>
      </div>
    </div>
  );
}
