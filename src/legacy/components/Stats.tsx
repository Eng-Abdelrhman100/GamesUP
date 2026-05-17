import React from 'react';
import { Gamepad2, Package, ShieldCheck, Zap } from 'lucide-react';

const statItems = [
  { value: '338', label: 'GAMES', icon: Gamepad2 },
  { value: '244', label: 'IN STOCK', icon: Package },
  { value: '24/7', label: 'SUPPORT', icon: ShieldCheck },
  { value: 'FAST', label: 'DELIVERY', icon: Zap },
];

export const Stats = () => (
  <div className="bg-bg-card border-y border-border-subtle relative overflow-hidden transition-colors duration-300">
    <div className="max-w-[1400px] mx-auto px-10 py-8 grid grid-cols-2 md:grid-cols-4 relative z-10">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className={`flex flex-col gap-1 border-r border-border-subtle last:border-r-0 pl-0 md:pl-10 first:pl-0 ${
            idx >= 2 ? 'pt-6 md:pt-0' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-4xl font-black tracking-tighter font-display italic transition-colors ${
                item.value === 'FAST' ? 'text-brand-red' : 'text-[var(--text-primary)]'
              }`}
            >
              {item.value}
              {item.value.match(/^\d+$/) ? '+' : ''}
            </span>
          </div>
          <div className="text-[10px] font-black text-text-secondary tracking-[0.2em] uppercase transition-colors">{item.label}</div>
        </div>
      ))}
    </div>
  </div>
);
