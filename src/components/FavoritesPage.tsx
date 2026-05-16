import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ArrowLeft, Star, ShoppingCart, Trash2 } from 'lucide-react';
import { Game } from '../types';

interface FavoritesPageProps {
  onBack: () => void;
  favoriteGames: Game[];
  onProductClick: (game: Game) => void;
  onToggleFavorite: (id: string) => void;
}

export const FavoritesPage = ({ onBack, favoriteGames, onProductClick, onToggleFavorite }: FavoritesPageProps) => {
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
            Intel<span className="text-brand-red">.</span>Watchlist
          </h1>
          <p className="text-text-secondary text-sm font-black uppercase tracking-[0.3em] italic">Targets of Interest ({favoriteGames.length})</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {favoriteGames.length > 0 ? (
              favoriteGames.map((game) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={game.id}
                  className="group"
                >
                  <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-bg-card border border-border-subtle cursor-pointer transition-all hover:border-brand-red group-hover:shadow-[0_0_50px_-10px_rgba(235,59,59,0.15)]">
                    <div className="absolute inset-0" onClick={() => onProductClick(game)}>
                      <img 
                        src={game.image} 
                        alt={game.title}
                        className="w-full h-full object-cover grayscale-0 group-hover:grayscale group-hover:scale-105 transition-all duration-500 opacity-80 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-80"></div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-6 right-6">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(game.id);
                        }}
                        className="p-3 bg-bg-dark/80 backdrop-blur-md rounded-xl text-brand-red hover:bg-brand-red hover:text-white transition-all border border-brand-red/20 shadow-lg"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                      <p className="text-[9px] font-black text-brand-red uppercase tracking-[0.4em] mb-2 italic">{game.category || 'ASSET'}</p>
                      <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">
                        {game.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex text-brand-red gap-0.5">
                          {[1,2,3,4,5].map(i => <Star key={i} className="h-2.5 w-2.5 fill-current" />)}
                        </div>
                        <span className="text-[10px] font-black text-white italic">L.E {game.basePrice}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-20 border border-dashed border-border-subtle rounded-[2.5rem] opacity-50 col-span-full"
              >
                <Heart className="h-16 w-16 text-text-secondary mb-6" />
                <p className="text-xl font-black uppercase tracking-tighter italic">No Targets identified</p>
                <p className="text-[10px] mt-2 uppercase tracking-widest leading-relaxed">Scan the store and add assets to your personal intelligence watchlist.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
