import React from 'react';
import { Game } from '../types';
import { ShoppingBag, ChevronRight, Filter, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { GAMES_DATA } from '../constants';

interface StoreSectionProps {
  games: Game[];
  onProductClick: (game: Game) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const StoreSection = ({ games, onProductClick, favorites = [], onToggleFavorite }: StoreSectionProps) => {
  return (
    <section className="py-24 bg-bg-dark transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-6 border-b border-border-subtle pb-8 md:pb-12 transition-colors">
          <div className="text-left">
            <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-3 md:mb-4 italic">Our Logistics</p>
            <h2 className="text-5xl md:text-7xl font-black text-[var(--text-primary)] tracking-tighter font-display uppercase italic leading-none transition-colors">The Store<span className="text-brand-red">.</span></h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="bg-bg-card border border-border-subtle px-6 py-3 rounded text-[11px] font-black text-text-secondary hover:text-[var(--text-primary)] transition-all flex items-center gap-2 uppercase tracking-widest italic">
              <Filter className="h-4 w-4" />
              Filter By
            </button>
            <div className="h-10 w-[1px] bg-border-subtle hidden md:block"></div>
            <select className="bg-transparent text-[11px] font-black text-text-secondary outline-none cursor-pointer hover:text-[var(--text-primary)] transition-all uppercase tracking-widest italic">
              <option>Default Sorting</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest First</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar Controls */}
          <div className="hidden lg:block space-y-10">
            <div>
              <h4 className="text-[10px] font-black text-brand-red tracking-[0.3em] mb-6 uppercase italic">Hardware</h4>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'PS5 Console', active: true },
                  { name: 'PS4 Console', active: false },
                  { name: 'Xbox Series', active: false },
                  { name: 'PC Digital', active: false }
                ].map(p => (
                  <div 
                    key={p.name} 
                    className={`flex items-center justify-between text-xs p-3 rounded border transition-all cursor-pointer group ${
                      p.active 
                        ? 'bg-black/5 dark:bg-white/5 border-border-subtle text-[var(--text-primary)]' 
                        : 'border-border-subtle text-text-secondary opacity-50 hover:opacity-100 hover:border-brand-red/30'
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wider">{p.name}</span>
                    {p.active && <div className="w-2 h-2 rounded-full bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-[var(--text-primary)] tracking-[0.3em] mb-6 uppercase italic transition-colors">Categories</h4>
              <div className="space-y-2">
                {['Action', 'Adventure', 'RPG', 'Shooter', 'Sports'].map(c => (
                  <div key={c} className="flex justify-between items-center group cursor-pointer p-2 rounded hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-bold text-text-secondary group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">{c}</span>
                    <span className="text-[9px] font-black text-text-secondary bg-border-subtle px-2 py-0.5 rounded group-hover:text-brand-red transition-all">12</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full bg-brand-red/5 border border-brand-red/20 text-brand-red p-5 rounded font-black text-xs uppercase tracking-widest hover:bg-brand-red/10 transition-all italic">
              WHATSAPP SUPPORT
            </button>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {games.map((game, idx) => (
                <motion.div 
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={() => onProductClick(game)}
                  className="bg-bg-card border border-border-subtle rounded-3xl group cursor-pointer group/card flex flex-col hover:border-brand-red/50 transition-all duration-500 overflow-hidden"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-900/50">
                    <img 
                      src={game.image} 
                      alt={game.title}
                      className="w-full h-full object-cover grayscale-0 group-hover:grayscale group-hover:scale-105 transition-all duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-60"></div>
                    
                    <span className={`absolute top-4 right-4 text-[9px] font-black px-2.5 py-1 rounded-sm uppercase tracking-tighter italic transition-colors ${
                      game.status === 'OUT OF STOCK' 
                        ? 'bg-gray-800 text-gray-500 border border-white/10' 
                        : 'bg-brand-red text-white'
                    }`}>
                      {game.status}
                    </span>

                    <div className="absolute top-4 left-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(game.id);
                        }}
                        className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
                          favorites.includes(game.id)
                            ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/20'
                            : 'bg-black/60 border-white/10 text-white hover:bg-brand-red'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(game.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="absolute inset-0 border-[1px] border-border-subtle m-3 pointer-events-none group-hover:border-brand-red/20 transition-colors"></div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex gap-2 mb-2">
                       {game.tags.slice(0, 1).map(tag => (
                         <span key={tag} className="text-[9px] font-black text-brand-red uppercase tracking-widest italic">{tag} Account</span>
                       ))}
                       <div className="flex text-yellow-500 gap-0.5 text-[8px]">
                         ★★★★★
                       </div>
                    </div>
                    <h3 className="font-black text-[var(--text-primary)] text-base tracking-tight uppercase group-hover:text-brand-red transition-colors font-display line-clamp-1 mb-6 italic transition-colors">{game.title}</h3>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-border-subtle transition-colors">
                      <div className="text-2xl font-black text-[var(--text-primary)] italic tracking-tighter transition-colors">
                        {game.price} <span className="text-[10px] text-text-secondary font-bold ml-0.5 italic transition-colors">L.E</span>
                      </div>
                      <button className={`btn-action transition-all ${
                        game.status === 'OUT OF STOCK' 
                          ? 'opacity-20 cursor-not-allowed' 
                          : ''
                      }`}>
                        {game.status === 'OUT OF STOCK' ? 'SOLDOUT' : 'BUY NOW'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
