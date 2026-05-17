import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ChevronRight, Heart, Info, ShieldCheck, ShoppingCart, Star, Zap } from 'lucide-react';
import { AccountType, Game } from '../types';

interface ProductPageProps {
  game: Game;
  onBack: () => void;
  onAddToCart: (game: Game, accountType: AccountType) => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export const ProductPage = ({ game, onBack, onAddToCart, isFavorited, onToggleFavorite }: ProductPageProps) => {
  const [selectedTier, setSelectedTier] = useState<number>(1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const visibleAccountTypes = game.accountTypes.filter((opt) => {
    const t = String((opt as any)?.tier || '').toLowerCase();
    if (!t) return true;
    if (t.includes('offline')) return false;
    return true;
  });

  const hasOptions = visibleAccountTypes.length > 0;
  const safeSelectedTier = hasOptions ? Math.min(Math.max(0, selectedTier), visibleAccountTypes.length - 1) : 0;
  const activeOption = hasOptions ? visibleAccountTypes[safeSelectedTier] : null;

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Retrieval Zone
        </button>

        <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[70vh]">
          <div className="lg:w-1/2 relative bg-black group overflow-hidden h-96 lg:h-auto">
            <motion.img
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              src={game.banner}
              alt={game.title}
              className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:opacity-100"
            />
            <div className="absolute top-6 md:top-12 right-6 md:right-12">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`p-4 rounded-2xl backdrop-blur-xl border transition-all ${
                  isFavorited
                    ? 'bg-brand-red border-brand-red text-white shadow-[0_0_30px_rgba(235,59,59,0.5)]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`h-6 w-6 ${isFavorited ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-bg-card hidden lg:block"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>

            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
                {game.status !== 'IN STOCK' && (
                  <span className="bg-brand-red text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase italic shadow-2xl shadow-brand-red/40">
                    {game.status}
                  </span>
                )}
                <span className="bg-white/10 backdrop-blur-xl text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase border border-white/10 italic">
                  Digital Authority Verified
                </span>
              </div>
              <h1 className="text-4xl md:text-8xl font-black tracking-[-0.05em] text-white uppercase font-display leading-[0.8] italic mb-6">
                {game.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 italic">
                <div className="flex text-brand-red gap-1 bg-brand-red/10 px-3 py-1.5 rounded-full border border-brand-red/20 shadow-[0_0_15px_-3px_rgba(235,59,59,0.3)]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />
                  ))}
                  <span className="ml-1 text-white border-l border-white/20 pl-2">4.9</span>
                </div>
                <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/5">128 Operations Completed</span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 p-6 md:p-10 lg:p-20 flex flex-col justify-center">
            <div className="mb-12">
              <div className="flex items-center gap-3 text-[10px] text-brand-red font-black mb-4 tracking-[0.3em] uppercase italic">
                <Zap className="h-4 w-4" /> Instant Deployment Available
              </div>
              <p className="text-text-secondary text-lg leading-relaxed font-medium tracking-tight italic">{game.description}</p>
            </div>

            <div className="space-y-10">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[11px] font-black text-[var(--text-primary)] tracking-[0.4em] uppercase italic">Select Tier</h3>
                  <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-2">
                    <Check className="h-3 w-3" /> Best Value Secured
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {visibleAccountTypes.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => option.isAvailable && setSelectedTier(idx)}
                      className={`group relative p-6 rounded-3xl text-left border-2 transition-all flex items-center gap-6 ${
                        !option.isAvailable
                          ? 'border-border-subtle bg-black/5 dark:bg-white/[0.01] cursor-not-allowed opacity-30 shadow-none'
                          : safeSelectedTier === idx
                            ? 'border-brand-red bg-brand-red/[0.03] shadow-[0_0_30px_-10px_rgba(235,59,59,0.1)]'
                            : 'border-border-subtle hover:border-brand-red/30 bg-black/5 dark:bg-white/[0.02] shadow-none'
                      }`}
                      disabled={!option.isAvailable}
                    >
                      <div
                        className={`p-4 rounded-2xl transition-all ${safeSelectedTier === idx ? 'bg-brand-red text-white scale-110 shadow-lg shadow-brand-red/30' : 'bg-bg-dark text-text-secondary'}`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-text-secondary tracking-widest uppercase italic">{option.tier} ACCESS</span>
                          <span className="text-[9px] font-black text-green-500 italic">SAVE {option.save}</span>
                        </div>
                        <div className="text-3xl font-black text-[var(--text-primary)] tracking-tighter font-display">
                          {option.price} <span className="text-xs text-text-secondary">L.E</span>
                        </div>
                      </div>
                      {safeSelectedTier === idx && (
                        <div className="bg-brand-red text-white p-2 rounded-full shadow-lg shadow-brand-red/20">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                  {!hasOptions && (
                    <div className="p-6 rounded-3xl border border-border-subtle bg-black/5 dark:bg-white/[0.01] text-text-secondary text-xs font-bold uppercase tracking-widest italic">
                      No tiers available
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-10 mb-2 border-t border-border-subtle/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Selected Extraction Cost</span>
                </div>
                <div className="flex items-baseline gap-2 h-16">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={safeSelectedTier}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="text-5xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter font-display italic transition-colors"
                    >
                      {activeOption ? (
                        <>
                          {activeOption.price} <span className="text-xl text-text-secondary font-sans not-italic ml-1">L.E</span>
                        </>
                      ) : (
                        <>N/A</>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => activeOption && onAddToCart(game, activeOption)}
                  className="py-6 rounded-3xl font-black tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all uppercase italic bg-[var(--text-primary)] text-bg-dark hover:scale-[1.02] active:scale-95 group shadow-2xl"
                  disabled={!activeOption}
                >
                  Add to Inventory
                  <ShoppingCart className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                </button>
                <button
                  onClick={() => activeOption && onAddToCart(game, activeOption)}
                  className="py-6 rounded-3xl font-black tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all uppercase italic bg-brand-red text-white hover:scale-[1.02] active:scale-95 group shadow-2xl shadow-brand-red/20"
                  disabled={!activeOption}
                >
                  Instant Buy
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-12 pt-8 border-t border-border-subtle">
                <div className="flex flex-col items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest italic group cursor-help transition-all hover:text-brand-red">
                  <div className="p-3 bg-brand-red/5 rounded-full group-hover:bg-brand-red/10 transition-colors">
                    <ShieldCheck className="h-5 w-5 text-brand-red" />
                  </div>
                  Anti-Ban Shield
                </div>
                <div className="flex flex-col items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest italic group cursor-help transition-all hover:text-brand-red">
                  <div className="p-3 bg-brand-red/5 rounded-full group-hover:bg-brand-red/10 transition-colors">
                    <Zap className="h-5 w-5 text-brand-red" />
                  </div>
                  Flash Delivery
                </div>
                <div className="flex flex-col items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest italic group cursor-help transition-all hover:text-brand-red">
                  <div className="p-3 bg-brand-red/5 rounded-full group-hover:bg-brand-red/10 transition-colors">
                    <Info className="h-5 w-5 text-brand-red" />
                  </div>
                  Elite Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
