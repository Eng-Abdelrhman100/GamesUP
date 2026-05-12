import { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import logoIcon from '../../assets/games up icon white.png';

interface LoginProps {
  onLogin: (user: any, session: any) => void;
}

export function Login({ onLogin }: LoginProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authAPI.login(email, password);
      console.log('Login successful');
      if (result.session) {
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
    <div className="min-h-screen bg-gradient-to-br from-[#ff1574] via-[#e00d65] to-[#c70c5e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/40 mb-4">
            <img
              src={settings.website_logo || logoIcon}
              alt={settings.website_title || settings.store_name || 'Admin'}
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{settings.website_title || settings.store_name || 'Admin'} Admin</h1>
          <p className="text-red-100">Admin Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to continue to your admin dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-sm text-[#ff1574]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1574] focus:border-transparent"
                placeholder={settings.store_email || 'email@domain.com'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1574] focus:border-transparent pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#ff1574] to-[#e00d65] text-white rounded-lg font-medium shadow-lg shadow-[#ff1574]/30 hover:shadow-xl hover:shadow-[#ff1574]/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Landing Page Redirect Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              window.location.hash = '#website';
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium text-sm transition-all border border-white/20 hover:border-white/40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Website
          </button>
        </div>
      </div>
    </div>
  );
}
