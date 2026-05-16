import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Download, Package, Share2, ShieldCheck, Zap } from 'lucide-react';

interface OrderConfirmationPageProps {
  onBackToHome: () => void;
  onViewOrders: () => void;
}

export const OrderConfirmationPage = ({ onBackToHome, onViewOrders }: OrderConfirmationPageProps) => {
  const orderNumber = `SMU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center pt-24 pb-20 px-6">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          className="w-32 h-32 bg-brand-red rounded-full mx-auto flex items-center justify-center mb-12 shadow-[0_0_80px_rgba(235,59,59,0.3)]"
        >
          <CheckCircle2 className="h-16 w-16 text-white" />
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-6">
          OPERATION<br />SUCCESSFUL<span className="text-brand-red">.</span>
        </h1>

        <p className="text-text-secondary text-[11px] font-black uppercase tracking-[0.4em] italic mb-12">Target Assets Secured & Encrypted</p>

        <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 mb-12 space-y-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="relative z-10 space-y-8">
            <div className="text-center">
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-2 italic">Assignment ID</p>
              <p className="text-3xl font-black text-brand-red tracking-tighter italic">{orderNumber}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 bg-bg-dark/50 rounded-2xl border border-border-subtle/50 text-left">
                <div className="flex items-center gap-3 mb-2 text-brand-red">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Encrypted Keys</span>
                </div>
                <p className="text-[9px] text-text-secondary font-bold uppercase leading-relaxed">
                  Your digital access codes are being generated. This process takes 5-15 minutes.
                </p>
              </div>
              <div className="p-6 bg-bg-dark/50 rounded-2xl border border-border-subtle/50 text-left">
                <div className="flex items-center gap-3 mb-2 text-blue-500">
                  <Zap className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Rapid Deployment</span>
                </div>
                <p className="text-[9px] text-text-secondary font-bold uppercase leading-relaxed">
                  You will receive an encrypted transmission via your registered frequency (email).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onViewOrders}
            className="flex-1 bg-white text-black py-4 px-8 rounded-2xl font-black tracking-widest text-xs uppercase italic hover:bg-brand-red hover:text-white transition-all flex items-center justify-center gap-3"
          >
            Track Assets
            <Package className="h-4 w-4" />
          </button>
          <button
            onClick={onBackToHome}
            className="flex-1 bg-bg-card border border-border-subtle text-[var(--text-primary)] py-4 px-8 rounded-2xl font-black tracking-widest text-xs uppercase italic hover:border-brand-red transition-all flex items-center justify-center gap-3"
          >
            Intelligence HQ
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-16 flex items-center justify-center gap-8 opacity-40">
          <Download className="h-5 w-5 text-text-secondary hover:text-brand-red cursor-pointer transition-colors" />
          <Share2 className="h-5 w-5 text-text-secondary hover:text-brand-red cursor-pointer transition-colors" />
        </div>
      </div>
    </div>
  );
};
