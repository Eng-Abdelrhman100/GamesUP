import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Mail, Phone, ArrowLeft, Send } from 'lucide-react';

interface ContactPageProps {
  onBack: () => void;
}

export const ContactPage = ({ onBack }: ContactPageProps) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-8">
              OPEN<br />CHANNELS<span className="text-brand-red">.</span>
            </h1>
            <p className="text-text-secondary text-sm font-black uppercase tracking-[0.3em] italic mb-12">HQ Communication Protocols</p>
            
            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic mb-1">Direct Signal</p>
                  <p className="text-lg font-black text-[var(--text-primary)] tracking-tighter uppercase italic">HQ@SAMURAI-STORE.EG</p>
                </div>
              </div>
              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic mb-1">Live Intelligence</p>
                  <p className="text-lg font-black text-[var(--text-primary)] tracking-tighter uppercase italic">M.ME/SAMURAI.STORE.EG</p>
                </div>
              </div>
              <div className="flex items-center gap-6 group">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic mb-1">Emergency Comms</p>
                  <p className="text-lg font-black text-[var(--text-primary)] tracking-tighter uppercase italic">+20 0123 456 789</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 md:p-16 space-y-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Alias</label>
                  <input type="text" placeholder="GHOST_OPERATOR" className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Signal Address</label>
                  <input type="email" placeholder="SIGNAL@SECURE.NET" className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Mission Intelligence</label>
                <textarea rows={6} placeholder="DESCRIBE THE OBJECTIVE..." className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all resize-none"></textarea>
              </div>
              <button className="w-full bg-brand-red text-white py-6 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all hover:bg-black uppercase italic shadow-xl shadow-brand-red/20">
                Transmit Signal
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
