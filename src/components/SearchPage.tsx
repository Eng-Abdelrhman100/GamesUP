import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, Star, Heart, TrendingUp, History, Shield, Zap } from 'lucide-react';
import { Game } from '../types';
import { GAMES_DATA } from '../constants';

interface SearchPageProps {
  games: Game[];
  onBack: () => void;
  onProductClick: (game: Game) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const SearchPage = ({ games, onBack, onProductClick, favorites, onToggleFavorite }: SearchPageProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const filtered = games.filter(game => 
          game.title.toLowerCase().includes(query.toLowerCase()) ||
          game.description.toLowerCase().includes(query.toLowerCase()) ||
          game.category?.toLowerCase().includes(query.toLowerCase()) ||
          game.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        setResults(filtered);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [query]);

  const recentSearches = ['ELDEN RING', 'FC 25', 'CYBERPUNK', 'WARZONE'];
  const trendingAssets = games.slice(0, 4);

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Search Header */}
        <div className="mb-16">
          <div className="relative group max-w-4xl">
            <div className="absolute inset-0 bg-brand-red/20 blur-3xl opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center bg-bg-card border-2 border-border-subtle group-focus-within:border-brand-red rounded-[2rem] p-6 transition-all shadow-2xl">
              <Search className="h-8 w-8 text-text-secondary group-focus-within:text-brand-red transition-colors mr-6" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SCAN TACTICAL INVENTORY..."
                className="w-full bg-transparent text-3xl md:text-5xl font-black uppercase tracking-tight italic focus:outline-none placeholder:text-text-secondary/30 text-[var(--text-primary)]"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-3 hover:bg-bg-dark rounded-xl transition-all"
                >
                  <X className="h-6 w-6 text-text-secondary" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {query.trim().length > 1 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b border-border-subtle pb-6">
                    <h2 className="text-sm font-black uppercase tracking-[0.4em] italic text-text-secondary">
                      {isSearching ? 'SCANNING ENCRYPTED SERVERS...' : `FOUND ${results.length} MATCHING ASSETS`}
                    </h2>
                    {isSearching && (
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 h-4 bg-brand-red" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 h-4 bg-brand-red" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 h-4 bg-brand-red" />
                      </div>
                    )}
                  </div>

                  {results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {results.map((game) => (
                        <motion.div
                          layout
                          key={game.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-bg-card border border-border-subtle rounded-3xl p-4 flex gap-4 group cursor-pointer hover:border-brand-red transition-all"
                          onClick={() => onProductClick(game)}
                        >
                          <div className="h-24 w-24 rounded-2xl overflow-hidden flex-shrink-0 relative">
                            <img src={game.image} alt={game.title} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          </div>
                          <div className="flex-1 py-1 pr-4 relative">
                            <p className="text-[8px] font-black text-brand-red uppercase tracking-widest mb-1 italic">{game.category || 'ASSET'}</p>
                            <h3 className="text-lg font-black text-[var(--text-primary)] uppercase italic leading-none mb-2">{game.title}</h3>
                            <p className="text-[9px] text-text-secondary line-clamp-2 uppercase font-bold tracking-tight mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                              {game.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-brand-red italic">L.E {game.basePrice}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(game.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${favorites.includes(game.id) ? 'text-brand-red' : 'text-text-secondary hover:text-brand-red'}`}
                                >
                                  <Heart className={`h-3 w-3 ${favorites.includes(game.id) ? 'fill-current' : ''}`} />
                                </button>
                                <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : !isSearching && (
                    <div className="py-20 text-center border border-dashed border-border-subtle rounded-[2.5rem]">
                      <Shield className="h-12 w-12 text-text-secondary/20 mx-auto mb-4" />
                      <p className="text-xl font-black text-text-secondary uppercase tracking-tighter italic">No Matches Detected</p>
                      <p className="text-[10px] text-text-secondary/60 mt-2 uppercase tracking-widest italic">Try adjusting your intel parameters</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-text-secondary">
                      <TrendingUp className="h-4 w-4" />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] italic">Trending In The Underground</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {trendingAssets.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => onProductClick(game)}
                          className="flex items-center gap-4 p-4 bg-bg-card border border-border-subtle rounded-2xl text-left hover:border-brand-red transition-all group"
                        >
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-bg-dark">
                            <img src={game.image} alt="" className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[var(--text-primary)] uppercase italic leading-none">{game.title}</p>
                            <p className="text-[8px] text-brand-red font-bold uppercase tracking-widest mt-1 italic">{game.status}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-text-secondary">
                      <Zap className="h-4 w-4" />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] italic">Quick Access Keys</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {['ACCOUNT TIER', 'INSTANT DELIVERY', 'LIFETIME FIX', 'SECURE LOGIN'].map(tag => (
                        <button 
                          key={tag}
                          className="px-6 py-3 bg-bg-card border border-border-subtle rounded-xl text-[9px] font-black text-text-secondary uppercase tracking-widest hover:border-brand-red hover:text-brand-red transition-all italic"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Suggestions */}
          <div className="lg:col-span-4 space-y-12">
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10">
              <div className="flex items-center gap-4 text-brand-red mb-8">
                <History className="h-4 w-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] italic">Recent Intel Logs</h3>
              </div>
              <div className="space-y-4">
                {recentSearches.map(s => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="w-full flex items-center justify-between py-3 border-b border-border-subtle/30 text-left text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] hover:text-[var(--text-primary)] transition-all group italic"
                  >
                    {s}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setQuery('')}
                className="w-full mt-8 py-3 bg-bg-dark rounded-xl text-[8px] font-black text-text-secondary uppercase tracking-widest hover:text-brand-red transition-all italic border border-border-subtle/50"
              >
                Clear Archives
              </button>
            </div>

            <div className="bg-brand-red p-8 rounded-[2rem] relative overflow-hidden group">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
               <div className="relative z-10">
                  <Shield className="h-8 w-8 text-white mb-4" />
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">Need Specific Intelligence?</h4>
                  <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest mb-6 leading-relaxed italic">If you can't find the tactical asset you require, our operations team can source it directly.</p>
                  <button className="px-6 py-3 bg-white text-brand-red rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all italic">Request Custom Asset</button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
