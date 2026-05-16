import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Shield, ShieldCheck, Target, Zap } from 'lucide-react';

const categories = [
  {
    id: 'rpg',
    title: 'ACTION & RPG',
    desc: 'Immersion protocols engaged. Explore vast digital frontiers.',
    image: '/assets/ps banner.jpg',
    icon: Shield,
    count: '24 ASSETS',
  },
  {
    id: 'sports',
    title: 'SPORTS & RACING',
    desc: 'Peak performance required. Master the field and the track.',
    image: '/assets/banner 2.jpg',
    icon: Zap,
    count: '18 ASSETS',
  },
  {
    id: 'shooter',
    title: 'WARFARE & FPS',
    desc: 'Tactical dominance. High-precision assets for elite operators.',
    image: '/assets/red banner 3.jpg',
    icon: Target,
    count: '32 ASSETS',
  },
  {
    id: 'horror',
    title: 'HORROR & SURVIVAL',
    desc: 'Nightmare scenarios. Survival is the only objective.',
    image: '/assets/red new bg.jpg',
    icon: ShieldCheck,
    count: '12 ASSETS',
  },
];

export const Categories = ({ onCategoryClick }: { onCategoryClick: (category: string) => void }) => {
  const mapCategory = (id: string) => {
    if (id === 'rpg') return 'RPG';
    if (id === 'sports') return 'SPORTS';
    if (id === 'shooter') return 'SHOOTER';
    if (id === 'horror') return 'HORROR';
    return 'ALL';
  };

  return (
    <section className="py-24 bg-bg-dark overflow-hidden transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-16">
          <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-4 italic">Deployment Sectors</p>
          <h2 className="text-5xl md:text-7xl font-black text-[var(--text-primary)] tracking-tighter font-display uppercase italic leading-none transition-colors">
            Categories<span className="text-brand-red">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              onClick={() => onCategoryClick(mapCategory(cat.id))}
              className="group relative h-[500px] rounded-[2.5rem] overflow-hidden cursor-pointer border border-border-subtle"
            >
              <img
                src={cat.image}
                alt={cat.title}
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute inset-0 bg-brand-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="mb-6">
                  <div className="p-3 bg-brand-red/20 backdrop-blur-md border border-brand-red/30 rounded-2xl w-fit mb-6 group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-[0.9] mb-3 group-hover:text-brand-red transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                    {cat.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-2">
                  <span className="text-[10px] font-black text-white/50 tracking-widest uppercase italic">{cat.count}</span>
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-brand-red transition-colors">
                    <ChevronRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
