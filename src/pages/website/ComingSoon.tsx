import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Mail, Clock } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface ComingSoonProps {
  onNavigateToAdmin?: () => void;
}

export function ComingSoon({ onNavigateToAdmin }: ComingSoonProps) {
  const { settings } = useStoreSettings();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const storeName = settings?.store_name || 'Games Up';
  const storeEmail = settings?.store_email || 'info@games-up.co';

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white relative overflow-hidden">
      {/* Background Image & Pattern */}
      <div className="absolute inset-0 bg-black pointer-events-none">
        {/* Deep dark gaming background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')` }}
        ></div>
        
        {/* Solid dark overlay for perfect contrast */}
        <div className="absolute inset-0 bg-black/80"></div>
        
        {/* Intense red glowing orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-red-600/30 rounded-full blur-[100px] md:blur-[150px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#ff1574]/30 rounded-full blur-[100px] md:blur-[150px]"></div>
        
        {/* Center ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(224,13,101,0.15)_0%,transparent_60%)]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12 md:py-20 min-h-screen md:min-h-[calc(100vh-70px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-2">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                {storeName}
              </span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#ff1574] to-[#e00d65] mx-auto rounded-full"></div>
          </motion.div>

          {/* Coming Soon Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8"
          >
            <Clock className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium uppercase tracking-wider">Coming Soon</span>
          </motion.div>

          {/* Main Message */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            We're Building Something <span className="text-red-500">Amazing</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-gray-400 mb-8 leading-relaxed"
          >
            Our team is working hard to bring you the ultimate gaming experience.
            <br />
            Stay tuned for something extraordinary!
          </motion.p>

          {/* Live Clock */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' • '}
                {currentTime.toLocaleTimeString('en-US')}
              </span>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href={`mailto:${storeEmail}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff1574] hover:bg-[#e00d65] text-white font-medium rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#ff1574]/25"
            >
              <Mail className="w-4 h-4" />
              Contact Us
            </a>
            {/* Admin Panel Button Hidden
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/20 hover:border-white/30"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </button>
            )}
            */}
          </motion.div>

          {/* Social Links Placeholder */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex items-center justify-center gap-6"
          >
            <div 
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => window.open('https://wa.me/201008480536', '_blank')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <div 
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => window.open('https://www.instagram.com/games_up.eg?igsh=YXU2dWRucHdwMzE1&utm_source=qr', '_blank')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <div 
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => window.open('https://www.facebook.com/share/1Dks5gHv5f/?mibextid=wwXIfr', '_blank')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="relative z-10 text-center py-6 border-t border-white/10"
      >
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}