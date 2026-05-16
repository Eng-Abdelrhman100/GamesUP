import React from 'react';
import { Clock, Package, Heart, Gamepad2, Settings, ChevronRight, ArrowLeft, User, Zap } from 'lucide-react';
import { AppView } from '../types';

interface DashboardPageProps {
  onBack: () => void;
  onViewChange: (view: AppView) => void;
}

export const DashboardPage = ({ onBack, onViewChange }: DashboardPageProps) => {
  const stats = [
    { label: 'Deployed Assets', value: '12', icon: Package, color: 'text-brand-red' },
    { label: 'Watchlisted', value: '05', icon: Heart, color: 'text-pink-500' },
    { label: 'Active Requests', value: '02', icon: Gamepad2, color: 'text-blue-500' },
  ];

  const actions = [
    { label: 'Deployment History', desc: 'View all previous missions & accounts', icon: Package, view: 'orders' as AppView },
    { label: 'Intel Watchlist', desc: 'Manage your favorited game assets', icon: Heart, view: 'favorites' as AppView },
    { label: 'Game Requests', desc: 'Check status of your target acquisition', icon: Gamepad2, view: 'request' as AppView },
    { label: 'Profile Protocols', desc: 'Update your alias and security keys', icon: User, view: 'about' as AppView },
  ];

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 text-center relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-full bg-brand-red/10 mx-auto mb-6 flex items-center justify-center border-2 border-brand-red/20 group-hover:scale-110 transition-transform">
                  <User className="h-10 w-10 text-brand-red" />
                </div>
                <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic mb-2">GHOST_OPERATOR</h2>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] italic mb-8">Level 4 Elite Access</p>

                <div className="flex justify-center gap-4">
                  <button className="p-3 bg-bg-dark border border-border-subtle rounded-2xl text-text-secondary hover:text-brand-red hover:border-brand-red transition-all">
                    <Settings className="h-5 w-5" />
                  </button>
                  <button className="flex-1 bg-brand-red text-white py-3 rounded-2xl font-black tracking-widest text-[10px] uppercase italic hover:bg-black transition-all">
                    Log Out Signal
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-bg-card border border-border-subtle rounded-3xl p-6 flex items-center justify-between group hover:border-brand-red/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-bg-dark ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic">{stat.label}</span>
                  </div>
                  <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter italic">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onViewChange(action.view)}
                  className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 text-left group hover:border-brand-red/50 hover:shadow-[0_0_50px_-10px_rgba(235,59,59,0.1)] transition-all flex flex-col justify-between h-64"
                >
                  <div className="p-4 rounded-2xl bg-brand-red/10 w-fit group-hover:bg-brand-red group-hover:text-white transition-all">
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase italic tracking-tighter mb-2 group-hover:text-brand-red transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-relaxed">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-[var(--text-primary)] tracking-[0.4em] uppercase italic">Recent Operations</h3>
                <button
                  onClick={() => onViewChange('orders')}
                  className="text-[10px] font-black text-brand-red hover:underline uppercase tracking-widest italic flex items-center gap-2"
                >
                  View Full Logs <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-5 bg-bg-dark border border-border-subtle rounded-2xl group hover:border-brand-red/20 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="p-2.5 bg-brand-red/10 rounded-xl">
                        <Zap className="h-4 w-4 text-brand-red" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)] uppercase italic tracking-tighter">Cyberpunk 2077 - Deployment</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" /> 2 Hours Ago
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase italic">Success</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
