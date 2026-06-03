import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Zap, Info, ChevronRight, Check, Heart } from 'lucide-react';
import { Game, AccountType } from '../types';

interface ProductPageProps {
  game: Game;
  onBack: () => void;
  onAddToCart: (game: Game, accountType: AccountType) => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export const ProductPage = ({ game, onBack, onAddToCart, isFavorited, onToggleFavorite }: ProductPageProps) => {
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const visibleAccountTypes = game.accountTypes.filter((opt) => {
    const t = String((opt as any)?.tier || '').toLowerCase();
    if (!t) return true;
    if (t.includes('offline')) return false;
    return true;
  });

  const groups = Array.from(new Set(visibleAccountTypes.map(opt => opt.group)));
  
  useEffect(() => {
    if (groups.length > 0 && (!selectedGroup || !groups.includes(selectedGroup))) {
      setSelectedGroup(groups[0]);
      setSelectedTier(0);
    }
  }, [groups, selectedGroup]);

  const activeGroup = selectedGroup || groups[0] || 'General';
  const optionsForGroup = visibleAccountTypes.filter(opt => opt.group === activeGroup);
  const hasOptions = optionsForGroup.length > 0;
  const safeSelectedTier = hasOptions ? Math.min(Math.max(0, selectedTier), optionsForGroup.length - 1) : 0;
  const activeOption = hasOptions ? optionsForGroup[safeSelectedTier] : null;

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Navigation / Breadcrumb */}
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Retrieval Zone
        </button>

        <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[70vh]">
          {/* Visual Section (Left) */}
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
                   <span className="bg-brand-red text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase italic shadow-2xl shadow-brand-red/40">{game.status}</span>
                 )}
                 <span className="bg-white/10 backdrop-blur-xl text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase border border-white/10 italic">Digital Authority Verified</span>
              </div>
              <h1 className="text-3xl md:text-6xl lg:text-8xl font-black tracking-[-0.05em] text-white uppercase font-display leading-[0.8] italic mb-6">
                {game.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 italic">
                <div className="flex text-brand-red gap-1 bg-brand-red/10 px-3 py-1.5 rounded-full border border-brand-red/20 shadow-[0_0_15px_-3px_rgba(235,59,59,0.3)]">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />)}
                  <span className="ml-1 text-white border-l border-white/20 pl-2">4.9</span>
                </div>
                <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/5">128 Operations Completed</span>
              </div>
            </div>
          </div>
          
          {/* Configuration Section (Right) */}
          <div className="lg:w-1/2 p-6 md:p-10 lg:p-20 flex flex-col justify-center">
            <div className="mb-12">
               <div className="flex items-center gap-3 text-[10px] text-brand-red font-black mb-4 tracking-[0.3em] uppercase italic">
                  <Zap className="h-4 w-4" /> Instant Deployment Available
               </div>
               <p className="text-text-secondary text-lg leading-relaxed font-medium tracking-tight italic">
                 {game.description}
               </p>
            </div>

            <div className="space-y-10">
              <div>
                {groups.length > 0 && !(groups.length === 1 && groups[0] === 'General') && (
                  <div className="mb-6">
                    <h3 className="text-[11px] font-black text-text-secondary tracking-[0.2em] uppercase italic mb-3">Group</h3>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => (
                        <button
                          key={group}
                          onClick={() => { setSelectedGroup(group); setSelectedTier(0); }}
                          className={`px-6 py-2.5 rounded-full text-sm font-black transition-all border-2 italic ${
                            activeGroup === group
                              ? 'bg-brand-red text-white border-brand-red shadow-[0_0_15px_rgba(235,59,59,0.3)]'
                              : 'bg-transparent text-text-secondary border-border-subtle hover:border-brand-red/50 hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-[11px] font-black text-text-secondary tracking-[0.2em] uppercase italic mb-3">Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {optionsForGroup.map((option, idx) => (
                      <button 
                        key={idx}
                        onClick={() => option.isAvailable && setSelectedTier(idx)}
                        className={`px-5 py-2.5 rounded-full text-sm font-black transition-all border-2 italic flex items-center gap-2 ${
                          !option.isAvailable 
                            ? 'border-border-subtle bg-black/5 dark:bg-white/[0.01] cursor-not-allowed opacity-30 text-text-secondary' 
                            : safeSelectedTier === idx 
                              ? 'bg-transparent text-[var(--text-primary)] border-[var(--text-primary)] shadow-sm' 
                              : 'bg-transparent text-text-secondary border-border-subtle hover:border-[var(--text-primary)]/50 hover:text-[var(--text-primary)]'
                        }`}
                        disabled={!option.isAvailable}
                      >
                        {option.tier}
                      </button>
                    ))}
                    {!hasOptions && (
                      <div className="px-5 py-2.5 rounded-full border border-border-subtle bg-black/5 dark:bg-white/[0.01] text-text-secondary text-xs font-bold uppercase tracking-widest italic">
                        No types available
                      </div>
                    )}
                  </div>
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
                      transition={{ duration: 0.3, ease: "easeOut" }}
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
              
              {/* Trust Badges */}
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

        {/* Technical Specifications */}
        {(game.attributes && Object.keys(game.attributes).length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 shadow-2xl"
          >
            <h3 className="text-lg md:text-xl font-black text-white mb-8 uppercase tracking-wider flex items-center gap-3 italic font-display">
              <span className="text-brand-red">■</span> Technical Specifications
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              {game.attributes.region && (
                <div className="space-y-2 border-l-2 border-brand-red/20 pl-4">
                  <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Region</div>
                  <div className="text-white font-black text-sm uppercase italic">{game.attributes.region}</div>
                </div>
              )}
              {game.attributes.genre && (
                <div className="space-y-2 border-l-2 border-brand-red/20 pl-4">
                  <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Genre</div>
                  <div className="text-white font-black text-sm uppercase italic">{game.attributes.genre}</div>
                </div>
              )}
              {game.attributes.platform && (
                <div className="space-y-2 border-l-2 border-brand-red/20 pl-4">
                  <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Platform</div>
                  <div className="text-white font-black text-sm uppercase italic">{game.attributes.platform}</div>
                </div>
              )}
              {game.attributes.gameSize && (
                <div className="space-y-2 border-l-2 border-brand-red/20 pl-4">
                  <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Game Size</div>
                  <div className="text-white font-black text-sm uppercase italic">{game.attributes.gameSize}</div>
                </div>
              )}
              {game.attributes.language && (
                <div className="space-y-2 border-l-2 border-brand-red/20 pl-4">
                  <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Language</div>
                  <div className="text-white font-black text-sm uppercase italic">{game.attributes.language}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {game.instructions && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-fade-in"
          >
            <h3 className="text-lg md:text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3 italic font-display">
              <span className="text-brand-red">■</span> Delivery & Activation Instructions
            </h3>
            <div className="text-text-secondary text-sm md:text-base leading-relaxed whitespace-pre-line font-medium border-l-2 border-brand-red/30 pl-4 md:pl-6 py-1">
              {game.instructions}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
