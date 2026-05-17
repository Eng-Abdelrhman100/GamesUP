import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Play } from 'lucide-react';

export const Hero = ({ onShopNow }: { onShopNow?: () => void }) => (
  <section className="relative pt-64 pb-32 overflow-hidden grid-pattern">
    {/* Gradient Overlay for better contrast */}
    <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-bg-dark via-bg-dark/80 to-transparent transition-colors duration-300"></div>
    <div className="absolute inset-0 bg-text-primary/5 pointer-events-none transition-colors duration-300"></div>
    
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 px-4 md:px-5 py-1.5 rounded-full mb-6 md:mb-8"
      >
        <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
        <span className="text-[8px] md:text-[10px] font-black tracking-[0.3em] text-brand-red uppercase italic">PlayStation Specialists • Egypt</span>
      </motion.div>
      
      <motion.h2 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-4xl sm:text-7xl md:text-[140px] lg:text-[160px] leading-[1] md:leading-[0.8] font-black tracking-tighter text-[var(--text-primary)] uppercase mb-8 md:mb-10 drop-shadow-2xl italic font-display transition-colors break-words overflow-hidden"
      >
        Games<span className="text-brand-red">Up</span> Community
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-base md:text-xl text-text-secondary max-w-2xl mb-10 md:mb-14 leading-relaxed font-medium tracking-wide transition-colors"
      >
        Welcome to Gamesup, your trusted gaming hub! Level up with secure PlayStation digital accounts (Full, Primary &amp; Secondary), PS Plus subscriptions, and instant game top-ups. Dive into PC gaming with premium Steam accounts, or shop our latest consoles, accessories, and physical games.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex flex-row gap-4 sm:gap-6 items-center w-full sm:w-auto"
      >
        <button className="btn-primary h-14 px-6 sm:px-12 text-sm flex-1 sm:flex-none" onClick={onShopNow}>
          SHOP NOW
        </button>
        <button
          className="btn-secondary h-14 px-6 sm:px-12 text-sm italic flex-1 sm:flex-none"
          onClick={() => window.open('https://wa.me/201008480536', '_blank', 'noreferrer')}
          type="button"
        >
          WHATSAPP SUPPORT
        </button>
      </motion.div>
    </div>
  </section>
);
