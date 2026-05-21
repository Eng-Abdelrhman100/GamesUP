import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Package, 
  Heart, 
  Gamepad2, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ArrowLeft,
  ShieldCheck,
  Zap,
  Clock,
  Mail,
  Lock,
  Phone,
  Save,
  Loader2
} from 'lucide-react';
import { AppView } from '../types';
import { authAPI } from '../utils/api';

interface DashboardPageProps {
  onBack: () => void;
  onViewChange: (view: AppView) => void;
}

export const DashboardPage = ({ onBack, onViewChange }: DashboardPageProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Profile update states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  
  // UI states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const hasSession = localStorage.getItem('customerSession');
    if (!hasSession) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authAPI.getCurrentUser();
      if (userData) {
        setUser(userData);
        setProfileName(userData.user_metadata?.name || '');
        setProfilePhone(userData.user_metadata?.phone || '');
      } else {
        localStorage.removeItem('customerSession');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      localStorage.removeItem('customerSession');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await authAPI.login(email, password);
      if (res && res.session) {
        localStorage.setItem('customerSession', JSON.stringify(res.session));
        setUser(res.user);
        setProfileName(res.user.user_metadata?.name || '');
        setProfilePhone(res.user.user_metadata?.phone || '');
        setEmail('');
        setPassword('');
      } else {
        setErrorMsg('Authentication failed. No session returned.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !phone) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      // Register new user
      await authAPI.signup(email, password, name, phone);
      
      // Auto login after signup
      const res = await authAPI.login(email, password);
      if (res && res.session) {
        localStorage.setItem('customerSession', JSON.stringify(res.session));
        setUser(res.user);
        setProfileName(res.user.user_metadata?.name || '');
        setProfilePhone(res.user.user_metadata?.phone || '');
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
      } else {
        setErrorMsg('Registration succeeded, but auto-login failed. Please log in manually.');
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed. Email might already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerSession');
    setUser(null);
    setProfileName('');
    setProfilePhone('');
    setPhone('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMsg('Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await authAPI.updateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim()
      });
      if (res && res.user) {
        setUser(res.user);
        setProfileName(res.user.user_metadata?.name || '');
        setProfilePhone(res.user.user_metadata?.phone || '');
        setSuccessMsg('Profile updated successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-brand-red animate-spin" />
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] italic animate-pulse">Establishing Connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        {!user ? (
          /* Authentication Forms */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display italic mb-3">
                CUSTOMER PORTAL<span className="text-brand-red">.</span>
              </h1>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.25em] italic">Access secure retrieval systems</p>
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-border-subtle/50 mb-8 pb-4 gap-6 justify-center">
                <button
                  onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                  className={`text-xs font-black uppercase tracking-widest italic pb-2 transition-all relative ${
                    authMode === 'login' ? 'text-brand-red' : 'text-text-secondary hover:text-[var(--text-primary)]'
                  }`}
                >
                  Log In
                  {authMode === 'login' && (
                    <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
                  )}
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                  className={`text-xs font-black uppercase tracking-widest italic pb-2 transition-all relative ${
                    authMode === 'signup' ? 'text-brand-red' : 'text-text-secondary hover:text-[var(--text-primary)]'
                  }`}
                >
                  Sign Up
                  {authMode === 'signup' && (
                    <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
                  )}
                </button>
              </div>

              {/* Login Form */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="email"
                        placeholder="john.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 bg-red-500/10 border border-red-500/20 text-center py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-wider">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-red text-white py-5 rounded-2xl font-black tracking-widest text-[10px] uppercase italic hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-red/10"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In Account'}
                  </button>
                </form>
              ) : (
                /* Signup Form */
                <form onSubmit={handleSignup} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="email"
                        placeholder="john.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Comms Frequency (Phone Number)</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="tel"
                        placeholder="e.g., 01012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 bg-red-500/10 border border-red-500/20 text-center py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-wider">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-red text-white py-5 rounded-2xl font-black tracking-widest text-[10px] uppercase italic hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-red/10"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* User Dashboard when logged in */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Info */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 text-center relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-24 h-24 rounded-full bg-brand-red/10 mx-auto mb-6 flex items-center justify-center border-2 border-brand-red/20 group-hover:scale-110 transition-transform">
                    <User className="h-10 w-10 text-brand-red" />
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic mb-1">
                    {user.user_metadata?.name || 'GHOST OPERATOR'}
                  </h2>
                  <p className="text-[10px] font-bold text-text-secondary lowercase truncate mb-8 px-2">
                    {user.email}
                  </p>
                  
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={handleLogout}
                      className="w-full bg-brand-red text-white py-3.5 rounded-2xl font-black tracking-widest text-[10px] uppercase italic hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar stats panel */}
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-[0.25em] italic">
                  <ShieldCheck className="h-4 w-4 text-brand-red" />
                  Security Protocol Active
                </div>
                <p className="text-[9px] text-text-secondary leading-relaxed uppercase tracking-wider font-semibold">
                  Signed in securely. Your order checkout data will automatically populate and synchronize with your profile database entries.
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-8 animate-fadeIn">
              {/* Profile Details Form */}
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-subtle/50">
                  <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest italic">Profile Settings</h3>
                  <User className="h-4 w-4 text-brand-red" />
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                        <input
                          type="tel"
                          placeholder="e.g. 01012345678"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Email Address (Cannot be changed)</label>
                    <div className="relative opacity-60">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full bg-bg-dark border border-border-subtle rounded-2xl pl-14 pr-6 py-4 text-xs font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 bg-red-500/10 border border-red-500/20 text-center py-3 rounded-xl text-[9px] font-bold uppercase tracking-wider">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="text-green-500 bg-green-500/10 border border-green-500/20 text-center py-3 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {successMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black tracking-widest text-[10px] uppercase italic hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-red/10 ml-auto"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => onViewChange('orders')}
                  className="bg-bg-card border border-border-subtle rounded-3xl p-6 hover:border-brand-red/50 transition-all flex flex-col justify-between h-40 text-left group"
                >
                  <div className="p-3 rounded-2xl bg-brand-red/10 w-fit group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-primary)] uppercase italic leading-none mb-1 group-hover:text-brand-red transition-colors">My Orders</h4>
                    <p className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">View order deployment logs</p>
                  </div>
                </button>

                <button 
                  onClick={() => onViewChange('favorites')}
                  className="bg-bg-card border border-border-subtle rounded-3xl p-6 hover:border-brand-red/50 transition-all flex flex-col justify-between h-40 text-left group"
                >
                  <div className="p-3 rounded-2xl bg-brand-red/10 w-fit group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-primary)] uppercase italic leading-none mb-1 group-hover:text-brand-red transition-colors">Favorites</h4>
                    <p className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">Manage watchlisted games</p>
                  </div>
                </button>

                <button 
                  onClick={() => onViewChange('request')}
                  className="bg-bg-card border border-border-subtle rounded-3xl p-6 hover:border-brand-red/50 transition-all flex flex-col justify-between h-40 text-left group"
                >
                  <div className="p-3 rounded-2xl bg-brand-red/10 w-fit group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-primary)] uppercase italic leading-none mb-1 group-hover:text-brand-red transition-colors">Request Game</h4>
                    <p className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">Deploy a new game request</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
