import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Zap, Info, ChevronRight, Check, Heart, Box, CheckSquare, Square } from 'lucide-react';
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
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  
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

  // Find attributes like language
  const language = game.attributes?.language || 'English';
  const gameSize = game.attributes?.gameSize || 'N/A';

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

        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[70vh] transition-colors duration-300">
          {/* Visual Section (Left) */}
          <div className="lg:w-1/2 relative bg-gray-100 dark:bg-black group overflow-hidden h-96 lg:h-auto">
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

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white dark:to-[#1a1a1a] hidden lg:block transition-colors duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 dark:to-black/80 transition-colors duration-300"></div>
            
            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
                 {game.status !== 'IN STOCK' && (
                   <span className="bg-brand-red text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase italic shadow-2xl shadow-brand-red/40">{game.status}</span>
                 )}
                 <span className="bg-white/10 backdrop-blur-xl text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase border border-white/10 italic">Digital Authority Verified</span>
              </div>
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-[-0.05em] text-black dark:text-white uppercase font-display leading-[0.9] italic mb-6">
                {game.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 italic">
                <div className="flex text-brand-red gap-1 bg-brand-red/10 px-3 py-1.5 rounded-full border border-brand-red/20 shadow-[0_0_15px_-3px_rgba(235,59,59,0.3)]">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />)}
                  <span className="ml-1 text-black dark:text-white border-l border-black/20 dark:border-white/20 pl-2">4.9</span>
                </div>
                <span className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5">128 Operations Completed</span>
              </div>
            </div>
          </div>
          
          {/* Configuration Section (Right) */}
          <div className="lg:w-1/2 p-6 md:p-10 lg:p-12 flex flex-col justify-start bg-gradient-to-br from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#0a0a0a] text-black dark:text-white font-sans relative overflow-hidden transition-colors duration-300">
            {/* Subtle glow effect behind content */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 blur-[100px] pointer-events-none"></div>

            <div className="space-y-6">
              
              {/* Language Group */}
              {language && (
                <div className="relative z-10">
                  <h3 className="text-[11px] font-black text-gray-500 dark:text-text-secondary tracking-[0.2em] uppercase italic mb-3">Language</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-6 py-2.5 rounded-full text-sm font-bold border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all">
                      {language}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Groups (e.g. Type) */}
              {groups.length > 0 && (
                <div>
                  {groups.length > 1 && (
                    <div className="mb-6 relative z-10">
                      <h3 className="text-[11px] font-black text-gray-500 dark:text-text-secondary tracking-[0.2em] uppercase italic mb-3">Category</h3>
                      <div className="flex flex-wrap gap-2">
                        {groups.map((group) => (
                          <button
                            key={group}
                            onClick={() => { setSelectedGroup(group); setSelectedTier(0); }}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold border transition-all duration-300 ${
                              activeGroup === group
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-105'
                                : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#444] hover:border-black dark:hover:border-gray-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <h3 className="text-[11px] font-black text-brand-red tracking-[0.2em] uppercase italic mb-3">{activeGroup} Options</h3>
                    <div className="flex flex-wrap gap-3">
                      {optionsForGroup.map((option, idx) => (
                        <button 
                          key={idx}
                          onClick={() => option.isAvailable && setSelectedTier(idx)}
                          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border relative overflow-hidden group ${
                            !option.isAvailable 
                              ? 'border-gray-200 dark:border-[#333] bg-gray-100 dark:bg-[#111]/50 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                              : safeSelectedTier === idx 
                                ? 'bg-brand-red text-white border-brand-red shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105' 
                                : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#444] hover:border-brand-red/50 hover:text-brand-red dark:hover:text-white hover:bg-brand-red/5'
                          }`}
                          disabled={!option.isAvailable}
                        >
                          {!option.isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-full h-[1px] bg-red-500/50 rotate-[-12deg]"></div>
                            </div>
                          )}
                          <span className="relative z-10">{option.tier}</span>
                        </button>
                      ))}
                      {!hasOptions && (
                        <div className="px-6 py-2.5 rounded-full border border-gray-200 dark:border-[#333] text-gray-500 text-sm font-bold uppercase tracking-widest italic bg-gray-100 dark:bg-[#111]">
                          No types available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Display */}
              <div className="pt-8 relative z-10 border-t border-gray-200 dark:border-[#333]/50">
                <div className="flex items-end gap-4 mb-2">
                  {/* Optional Old Price mockup */}
                  <span className="text-lg text-gray-400 dark:text-gray-500 line-through font-bold italic">
                    LE {(activeOption ? activeOption.price * 1.4 : game.basePrice * 1.4).toFixed(2)}
                  </span>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={safeSelectedTier}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl md:text-5xl font-black text-black dark:text-white flex items-center gap-6 italic tracking-tighter"
                    >
                      {activeOption ? (
                        <>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 mr-2">
                            LE {activeOption.price.toFixed(2)}
                          </span>
                          <span className="px-4 py-1.5 bg-brand-red/10 text-brand-red border border-brand-red/20 text-xs font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(220,38,38,0.2)]">Sale</span>
                        </>
                      ) : (
                        <>N/A</>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-xs font-bold text-brand-red uppercase tracking-widest mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                  Shipping <span className="text-gray-500">calculated at checkout</span>
                </div>
              </div>

              {/* Dynamic Note Text */}
              <div className="relative z-10 bg-brand-red/5 border border-brand-red/20 rounded-xl p-4 my-6">
                <p className="text-[10px] text-gray-700 dark:text-gray-300 uppercase font-black tracking-widest leading-relaxed">
                  <span className="text-brand-red">⚠️ Note:</span> PRIMARY PS5 IS ONLY FOR PS5 CONSOLE AND PRIMARY PS4 IS ONLY FOR PS4 CONSOLE. SECONDARY CAN BE BOTH PS4 OR PS5.
                </p>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-3 text-black dark:text-white font-black italic text-sm uppercase tracking-widest bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] p-4 rounded-xl">
                  <Zap className="h-5 w-5 text-brand-red" />
                  Instant Delivery
                </div>
                <div className="flex items-center gap-3 text-black dark:text-white font-black italic text-sm uppercase tracking-widest bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] p-4 rounded-xl">
                  <Box className="h-5 w-5 text-brand-red" />
                  Size: {gameSize}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8 relative z-10">
                <h3 className="text-[11px] font-black text-gray-500 dark:text-text-secondary tracking-[0.2em] uppercase italic mb-3">Quantity</h3>
                <div className="flex items-center border border-gray-200 dark:border-[#333] rounded-xl w-36 bg-gray-50 dark:bg-[#111] overflow-hidden shadow-inner">
                  <button className="px-4 py-3 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#222] transition-colors" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span className="flex-1 text-center font-black text-black dark:text-white text-lg">{quantity}</span>
                  <button className="px-4 py-3 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#222] transition-colors" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className={`relative z-10 border rounded-xl p-5 mb-8 cursor-pointer transition-all duration-300 ${agreedToTerms ? 'bg-brand-red/10 border-brand-red/30 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#333] hover:border-gray-400 dark:hover:border-gray-500'}`} onClick={() => setAgreedToTerms(!agreedToTerms)}>
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md transition-colors duration-300 ${agreedToTerms ? 'bg-brand-red border-brand-red' : 'bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-[#444]'}`}>
                    {agreedToTerms && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">
                    I agree to the <span className="text-brand-red underline decoration-brand-red/30 underline-offset-4 hover:decoration-brand-red transition-all">Refund Policy & Game Share Terms</span> and understand that all sales are final.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <button 
                  onClick={() => {
                    if (activeOption) {
                       for(let i=0; i<quantity; i++) onAddToCart(game, activeOption);
                    }
                  }}
                  className={`py-5 rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-300 uppercase italic border-2 ${(!activeOption || !agreedToTerms) ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-[#333] text-gray-500 bg-transparent' : 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                  disabled={!activeOption || !agreedToTerms}
                >
                  Add to Inventory
                  <ShoppingCart className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    if (activeOption) {
                       for(let i=0; i<quantity; i++) onAddToCart(game, activeOption);
                       // Add logic to go to checkout directly here
                    }
                  }}
                  className={`py-5 rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-300 uppercase italic border-2 ${(!activeOption || !agreedToTerms) ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-[#333] text-gray-500 bg-transparent' : 'bg-brand-red text-white border-brand-red hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}
                  disabled={!activeOption || !agreedToTerms}
                >
                  Instant Buy 
                  <ChevronRight className="h-4 w-4" />
                </button>
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
              <span className="text-brand-red">■</span> Full, Primary & Secondary Instructions
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
