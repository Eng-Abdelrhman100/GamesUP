import React from 'react';
import { motion } from 'motion/react';
import { Shield, Target, Zap, ArrowLeft } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage = ({ onBack }: AboutPageProps) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-12">
              THE<br />GAMES<span className="text-brand-red">UP</span><br /><span className="text-brand-red">WAY.</span>
            </h1>
            <div className="space-y-6 text-text-secondary text-lg leading-relaxed font-medium italic">
              <p>
                GamesUp was built for gamers who want fast delivery, secure transactions, and a smooth way to level up their library. We focus on PlayStation digital accounts (Full, Primary &amp; Secondary), PS Plus subscriptions, game top-ups, Steam accounts, and more.
              </p>
              <p>
                Every order is handled with clear processes and support-first service so you can buy with confidence and get back to playing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-10 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/30 transition-all flex flex-col items-center text-center group">
              <div className="p-4 rounded-2xl bg-brand-red/10 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-10 w-10 text-brand-red" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase italic mb-3 tracking-tighter">ELITE DEFENSE</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-loose">Anti-Ban technology and encrypted data handling on every deployment.</p>
            </div>
            <div className="p-10 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/30 transition-all flex flex-col items-center text-center group">
              <div className="p-4 rounded-2xl bg-brand-red/10 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-10 w-10 text-brand-red" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase italic mb-3 tracking-tighter">FLASH DEPLOY</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-loose">Instant asset delivery to your communication channels within seconds.</p>
            </div>
            <div className="p-10 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/30 transition-all flex flex-col items-center text-center group md:col-span-2">
              <div className="p-4 rounded-2xl bg-brand-red/10 mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-10 w-10 text-brand-red" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase italic mb-3 tracking-tighter">PRECISION SERVICE</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-loose">Support that helps you choose the right option and solves issues quickly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
