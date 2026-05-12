import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff, Package } from 'lucide-react';
import { authAPI } from '../../utils/api';
import logo from '../../assets/games up logo black.png';

interface CustomerAuthProps {
  mode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export function CustomerAuth({ mode, onSuccess, onSwitchMode }: CustomerAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { session, user } = await authAPI.login(email, password);
        if (session) {
          localStorage.setItem('customerSession', JSON.stringify(session));
          onSuccess();
        } else {
          throw new Error('Login failed');
        }
      } else {
        const { session, user } = await authAPI.signup(email, password, name);
        // If auto-confirm is enabled or unnecessary
        if (user) {
             // Try to login immediately
             const loginRes = await authAPI.login(email, password);
             if (loginRes.session) {
                 localStorage.setItem('customerSession', JSON.stringify(loginRes.session));
                 onSuccess();
             } else {
                 setError('Signup successful. Please verify your email.');
             }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[700px] pt-[30px] pb-[30px]"
      >
        {/* Back Button */}
        <motion.button
          whileHover={{ x: -5 }}
          onClick={() => onSuccess()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </motion.button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img 
              src={logo} 
              alt="Games Up" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-[#ff1574] bg-clip-text text-transparent">
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h1>
            <p className="text-gray-600">
              {mode === 'login'
                ? 'Sign in to continue shopping'
                : 'Join us and start shopping'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter your phone (optional)"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <a href="#" className="text-red-600 hover:text-red-700 font-medium">
                  Forgot password?
                </a>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-xl shadow-red-600/30 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </motion.button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
