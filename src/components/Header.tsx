import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, Menu, X, Sun, Moon, Package, Heart, Info, Headset, Store, ShoppingBag, Gamepad2, User } from 'lucide-react';
import { AppView } from '../types';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  cartCount: number;
  onCartClick: () => void;
  onLogoClick: () => void;
  onViewChange: (view: AppView) => void;
  currentView: AppView;
}

export const Header = ({ isDark, toggleTheme, cartCount, onCartClick, onLogoClick, onViewChange, currentView }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const navLinks: { label: string; view: AppView; icon: any }[] = [
    { label: 'Intelligence HQ', view: 'home', icon: Store },
    { label: 'Search Archives', view: 'search', icon: Search },
    { label: 'The Armory (Shop)', view: 'shop', icon: ShoppingBag },
    { label: 'Request Game', view: 'request', icon: Gamepad2 },
    { label: 'My Orders', view: 'orders', icon: Package },
    { label: 'Favorites', view: 'favorites', icon: Heart },
    { label: 'About Us', view: 'about', icon: Info },
    { label: 'Contact', view: 'contact', icon: Headset },
  ];

  const handleLinkClick = (view: AppView) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[var(--glass-bg)] backdrop-blur-md border-b border-border-subtle transition-all duration-300">
      <div className="w-full border-b border-border-subtle bg-bg-card/40">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-2">
          <div className="text-center text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] italic text-text-secondary">
            More Games, Less Waiting
          </div>
        </div>
      </div>
      <nav className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 md:py-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div 
            className="h-8 md:h-10 cursor-pointer select-none transition-all hover:opacity-80 flex items-center" 
            onClick={onLogoClick}
          >
            {!logoError ? (
              <img 
                src={isDark ? "/logo-dark.png" : "/logo-light.png"} 
                alt="GAMES UP" 
                className="h-full w-auto object-contain"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl md:text-2xl font-black italic tracking-tighter text-[var(--text-primary)] font-display uppercase">
                GAMES<span className="text-brand-red">UP</span>
              </span>
            )}
          </div>
          {/* Desktop links hidden in favor of side menu */}
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={() => handleLinkClick('search')}
            className="p-2 text-text-secondary hover:text-[var(--text-primary)] transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-border-subtle text-text-secondary hover:text-[var(--text-primary)] hover:border-brand-red transition-all active:scale-90"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button 
            onClick={() => handleLinkClick('dashboard')}
            className={`p-2.5 rounded-xl border border-border-subtle text-text-secondary hover:text-brand-red hover:border-brand-red transition-all active:scale-90 ${currentView === 'dashboard' ? 'text-brand-red border-brand-red' : ''}`}
            aria-label="Dashboard"
          >
            <User className="h-4 w-4" />
          </button>
          
          <button 
            onClick={onCartClick}
            className="flex items-center gap-2 md:gap-3 bg-text-primary text-bg-dark dark:bg-white dark:text-black hover:bg-brand-red hover:text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[10px] md:text-[11px] font-black uppercase transition-all shadow-xl active:scale-95 italic group"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden lg:inline">INVENTORY</span>
            <span className="bg-brand-red text-white px-2 py-0.5 rounded-full text-[9px] group-hover:bg-white group-hover:text-black transition-colors">{cartCount}</span>
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[var(--text-primary)] hover:text-brand-red transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Side Menu (Mobile & Desktop) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 top-[73px] md:top-[89px] bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-[73px] md:top-[89px] bottom-0 w-full max-w-xs bg-white dark:bg-[#050505] border-l border-border-subtle z-50 flex flex-col pt-10 shadow-2xl"
            >
              <div className="px-6 mb-8">
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-6 italic">Navigation Protocols</p>
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.view}
                      onClick={() => handleLinkClick(link.view)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        currentView === link.view 
                          ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                          : 'text-text-secondary hover:bg-bg-secondary hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <link.icon className="h-5 w-5" />
                      <span className="text-sm font-black uppercase tracking-widest italic">{link.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto p-6 border-t border-border-subtle">
                <div className="flex items-center gap-4 text-[10px] font-black text-text-secondary uppercase tracking-widest italic">
                  <Package className="h-4 w-4" /> Samurai HQ: Locked
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
