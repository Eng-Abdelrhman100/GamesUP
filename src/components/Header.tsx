import React, { useEffect, useRef, useState } from 'react';
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const last = lastScrollYRef.current;

        if (y <= 10) {
          setIsHeaderVisible(true);
        } else if (y > last + 8) {
          setIsHeaderVisible(false);
        } else if (y < last - 8) {
          setIsHeaderVisible(true);
        }

        lastScrollYRef.current = y;
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const shouldShowHeader = isMobileMenuOpen || isHeaderVisible;

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 bg-[var(--glass-bg)] backdrop-blur-md border-b border-border-subtle transition-transform duration-300 transform-gpu will-change-transform ${shouldShowHeader ? 'translate-y-0' : '-translate-y-full'}`}
      >
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
      </header>

      {/* Side Menu (Mobile & Desktop) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-black border-l border-border-subtle z-[70] flex flex-col shadow-2xl shadow-black/40"
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
                <button
                  onClick={onLogoClick}
                  className="h-8 flex items-center gap-3 select-none active:scale-95 transition-transform"
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
                    <span className="text-lg font-black italic tracking-tighter text-[var(--text-primary)] font-display uppercase">
                      GAMES<span className="text-brand-red">UP</span>
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-full border border-border-subtle bg-bg-card/30 text-text-secondary hover:text-brand-red hover:border-brand-red/40 transition-all active:scale-95"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] italic">Navigation</p>
              </div>

              <div className="px-6 pb-6">
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.view}
                      onClick={() => handleLinkClick(link.view)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all border ${
                        currentView === link.view
                          ? 'bg-brand-red text-white border-brand-red shadow-[0_18px_40px_rgba(220,38,38,0.25)]'
                          : 'bg-bg-card/20 text-text-secondary border-border-subtle hover:bg-bg-card/40 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
                        currentView === link.view
                          ? 'border-white/20 bg-white/10'
                          : 'border-border-subtle bg-bg-card/20'
                      }`}>
                        <link.icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest italic">{link.label}</span>
                      <span className={`h-2 w-2 rounded-full ${currentView === link.view ? 'bg-white' : 'bg-brand-red/50'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto p-6 border-t border-border-subtle bg-bg-card/10">
                <div className="flex items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest italic">
                  <Package className="h-4 w-4" />
                  <span className="flex-1">GamesUp HQ: Online</span>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
