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
  
  // Extract discount tags if available
  const getDiscounts = () => {
    // Fake static discounts for visual effect as requested to match image, or pull from attributes
    // In a real scenario these could be pulled from the product, but we'll add them as a UI element if it's a digital game
    if (game.categorySlug?.includes('digital') || game.category?.toLowerCase().includes('digital')) {
      return [
        { label: 'Gold: 7% Off', color: 'bg-[#FFD700] text-black' },
        { label: 'Silver: 3% Off', color: 'bg-[#C0C0C0] text-black' },
        { label: 'Platinum: 10% Off', color: 'bg-[#4682B4] text-white' }
      ];
    }
    return [];
  };

  const discounts = getDiscounts();

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

        <div className="bg-[#1a1a1a] border border-[#333] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[70vh]">
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

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#1a1a1a] hidden lg:block"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
            
            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
                 {game.status !== 'IN STOCK' && (
                   <span className="bg-brand-red text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase italic shadow-2xl shadow-brand-red/40">{game.status}</span>
                 )}
                 <span className="bg-white/10 backdrop-blur-xl text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase border border-white/10 italic">Digital Authority Verified</span>
              </div>
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-[-0.05em] text-white uppercase font-display leading-[0.9] italic mb-6">
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
          <div className="lg:w-1/2 p-6 md:p-10 lg:p-12 flex flex-col justify-start bg-[#1a1a1a] text-white font-sans">
            
            {/* Discounts */}
            {discounts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {discounts.map((d, i) => (
                  <span key={i} className={`px-3 py-1 rounded-md text-xs font-bold ${d.color}`}>
                    {d.label}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-6">
              
              {/* Language Group */}
              {language && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Language</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-6 py-2 rounded-full text-sm font-semibold border border-white bg-white text-black">
                      {language}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Groups (e.g. Type) */}
              {groups.length > 0 && (
                <div>
                  {groups.length > 1 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Category</h3>
                      <div className="flex flex-wrap gap-2">
                        {groups.map((group) => (
                          <button
                            key={group}
                            onClick={() => { setSelectedGroup(group); setSelectedTier(0); }}
                            className={`px-6 py-2 rounded-full text-sm font-semibold border transition-all ${
                              activeGroup === group
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-gray-300 border-[#444] hover:border-gray-400'
                            }`}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">{activeGroup}</h3>
                    <div className="flex flex-wrap gap-2">
                      {optionsForGroup.map((option, idx) => (
                        <button 
                          key={idx}
                          onClick={() => option.isAvailable && setSelectedTier(idx)}
                          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all border relative overflow-hidden ${
                            !option.isAvailable 
                              ? 'border-[#333] text-gray-500 cursor-not-allowed' 
                              : safeSelectedTier === idx 
                                ? 'bg-white text-black border-white' 
                                : 'bg-transparent text-gray-300 border-[#444] hover:border-gray-400'
                          }`}
                          disabled={!option.isAvailable}
                        >
                          {!option.isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-full h-[1px] bg-gray-500 rotate-[-10deg]"></div>
                            </div>
                          )}
                          {option.tier}
                        </button>
                      ))}
                      {!hasOptions && (
                        <div className="px-6 py-2 rounded-full border border-[#333] text-gray-500 text-sm font-semibold">
                          No types available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Display */}
              <div className="pt-6">
                <div className="flex items-end gap-3 mb-1">
                  {/* Optional Old Price mockup */}
                  <span className="text-lg text-gray-500 line-through font-semibold">
                    LE {(activeOption ? activeOption.price * 1.4 : game.basePrice * 1.4).toFixed(2)} EGP
                  </span>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={safeSelectedTier}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-3xl font-bold text-white flex items-center gap-3"
                    >
                      {activeOption ? (
                        <>
                          LE {activeOption.price.toFixed(2)} EGP
                          <span className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full">Sale</span>
                        </>
                      ) : (
                        <>N/A</>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="text-sm text-brand-red underline cursor-pointer mt-2">Shipping <span className="text-gray-400 no-underline">calculated at checkout.</span></div>
              </div>

              {/* Dynamic Note Text */}
              <p className="text-xs text-gray-400 uppercase font-semibold leading-relaxed my-6 border-l-2 border-brand-red pl-3">
                PRIMARY PS5 IS ONLY FOR PS5 CONSOLE AND PRIMARY PS4 IS ONLY FOR PS4 CONSOLE. SECONDARY CAN BE BOTH PS4 OR PS5.
              </p>

              {/* Features List */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-white font-bold italic text-lg uppercase tracking-wide">
                  <Zap className="h-6 w-6 text-white" />
                  Instant Delivery
                </div>
                <div className="flex items-center gap-3 text-white font-bold italic text-lg uppercase tracking-wide">
                  <Box className="h-6 w-6 text-white" />
                  Game Size : {gameSize}
                </div>
              </div>

              {/* Quantity (Mockup for design parity, mostly 1 for digital) */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Quantity</h3>
                <div className="flex items-center border border-[#444] rounded-md w-32 bg-[#111]">
                  <button className="px-4 py-2 text-gray-400 hover:text-white" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span className="flex-1 text-center font-semibold text-white">{quantity}</span>
                  <button className="px-4 py-2 text-gray-400 hover:text-white" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="bg-[#222] border border-[#333] rounded-lg p-4 mb-6 cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded ${agreedToTerms ? 'bg-[#ff0055]' : 'bg-[#111] border border-[#555]'}`}>
                    {agreedToTerms && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <p className="text-sm text-gray-200 font-medium">
                    I agree to the <span className="text-[#ff0055] underline">Refund Policy & Game Share Terms</span> and understand that all sales are final.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if (activeOption) {
                       for(let i=0; i<quantity; i++) onAddToCart(game, activeOption);
                    }
                  }}
                  className={`py-4 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center gap-3 transition-all uppercase bg-white text-black hover:bg-gray-200 ${(!activeOption || !agreedToTerms) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!activeOption || !agreedToTerms}
                >
                  Add to Inventory
                  <ShoppingCart className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => {
                    if (activeOption) {
                       for(let i=0; i<quantity; i++) onAddToCart(game, activeOption);
                       // Add logic to go to checkout directly here
                    }
                  }}
                  className={`py-4 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center gap-3 transition-all uppercase bg-[#e62e2d] text-white hover:bg-[#ff3b3a] ${(!activeOption || !agreedToTerms) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!activeOption || !agreedToTerms}
                >
                  Instant Buy 
                  <ChevronRight className="h-5 w-5" />
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
