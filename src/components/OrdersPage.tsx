import React from 'react';
import { motion } from 'motion/react';
import { Package, ArrowLeft, ExternalLink } from 'lucide-react';

interface OrdersPageProps {
  onBack: () => void;
}

export const OrdersPage = ({ onBack }: OrdersPageProps) => {
  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Retrieval Zone
        </button>

        <div className="mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-4">
            Deployment<span className="text-brand-red">.</span>History
          </h1>
          <p className="text-text-secondary text-sm font-black uppercase tracking-[0.3em] italic">Previous Missions & Assets</p>
        </div>

        <div className="space-y-4">
          {[1, 2].map((i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className="group p-6 md:p-8 rounded-3xl border border-border-subtle bg-bg-card/50 hover:border-brand-red/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-red/10 flex items-center justify-center">
                  <Package className="text-brand-red h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black text-brand-red tracking-widest uppercase">ID: EXT-09{i}2</span>
                    <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">Deployed</span>
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic">Cyberpunk 2077 - Platinum</h3>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">May 1{i}, 2026 • 1,200 L.E</p>
                </div>
              </div>
              <button className="bg-text-primary text-bg-dark px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all flex items-center justify-center gap-2 italic">
                View Intel <ExternalLink className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
