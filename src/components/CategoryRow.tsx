import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, Star, ShoppingCart, Heart } from 'lucide-react';
import { Game } from '../types';

interface CategoryRowProps {
  title: string;
  games: Game[];
  onProductClick: (game: Game) => void;
  onSeeAll: () => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const CategoryRow = ({ title, games, onProductClick, onSeeAll, favorites = [], onToggleFavorite }: CategoryRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="py-12 bg-bg-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase italic leading-none">
              {title}<span className="text-brand-red">.</span>
            </h2>
            <div className="h-1 w-12 bg-brand-red mt-2"></div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onSeeAll}
              className="text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-widest italic"
            >
              Show All Operations
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => scroll('left')}
                className="p-2 rounded-full border border-border-subtle text-text-secondary hover:text-brand-red hover:border-brand-red transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => scroll('right')}
                className="p-2 rounded-full border border-border-subtle text-text-secondary hover:text-brand-red hover:border-brand-red transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-6 snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {games.map((game) => (
            <motion.div
              key={game.id}
              whileHover={{ y: -5 }}
              className="min-w-[280px] md:min-w-[320px] snap-start group"
              onClick={() => onProductClick(game)}
            >
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-bg-card border border-border-subtle cursor-pointer transition-all hover:border-brand-red/50">
                <img 
                  src={game.image} 
                  alt={game.title}
                  className="w-full h-full object-cover grayscale-0 group-hover:grayscale group-hover:scale-105 transition-all duration-300 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-60"></div>
                
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                   {game.status !== 'IN STOCK' && (
                     <span className="bg-brand-red text-white text-[8px] font-black tracking-[0.2em] px-3 py-1 rounded-full uppercase italic shadow-lg shadow-brand-red/20">{game.status}</span>
                   )}
                   <span className="bg-black/40 backdrop-blur-md text-white text-[8px] font-black tracking-[0.2em] px-3 py-1 rounded-full uppercase italic border border-white/10">L.E {game.basePrice}</span>
                </div>

                <div className="absolute top-4 right-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(game.id);
                    }}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                      favorites.includes(game.id)
                        ? 'bg-brand-red border-brand-red text-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-white hover:bg-brand-red hover:border-brand-red/50 px-3'
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${favorites.includes(game.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
                    {game.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex text-brand-red gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="h-2 w-2 fill-current" />)}
                    </div>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Asset Verified</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
