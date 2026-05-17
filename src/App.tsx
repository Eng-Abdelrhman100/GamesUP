/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { StoreSection } from './components/StoreSection';
import { Categories } from './components/Categories';
import { CategoryRow } from './components/CategoryRow';
import { ProductPage } from './components/ProductPage';
import { ShopPage } from './components/ShopPage';
import { OrdersPage } from './components/OrdersPage';
import { FavoritesPage } from './components/FavoritesPage';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { RequestGamePage } from './components/RequestGamePage';
import { DashboardPage } from './components/DashboardPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmationPage } from './components/OrderConfirmationPage';
import { SearchPage } from './components/SearchPage';
import { Preloader } from './components/Preloader';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Game, CartItem, AccountType, AppView } from './types';
import { GAMES_DATA } from './constants';
import { productsAPI } from './utils/api';
import { useStoreSettings } from './context/StoreSettingsContext';
import { Facebook, Instagram, MessageCircle, Twitter } from 'lucide-react';

export default function App() {
  const { settings, loading: settingsLoading } = useStoreSettings();
  const [games, setGames] = useState<Game[]>(GAMES_DATA);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [shopCategory, setShopCategory] = useState<string>('ALL');
  const [isDark, setIsDark] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      if (settingsLoading) return;
      if (settings?.coming_soon) return;
      try {
        const { products } = await productsAPI.getPublic();
        if (products && products.length > 0) {
          const mappedGames: Game[] = products.map((p: any) => ({
            id: String(p.id),
            title: p.name,
            image: p.image || '',
            banner: p.image || '',
            price: p.price || 0,
            basePrice: p.price || 0,
            category: p.category_slug ? p.category_slug.charAt(0).toUpperCase() + p.category_slug.slice(1) : 'Action',
            tags: [],
            status: p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK',
            description: p.description || '',
            accountTypes: Array.isArray(p.product_variants) && p.product_variants.length > 0
              ? p.product_variants.map((v: any) => ({
                  tier: v.name.toUpperCase(),
                  price: v.price,
                  save: '0%',
                  status: v.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK',
                  icon: v.name.toUpperCase().includes('PLATINUM') ? '💎' : v.name.toUpperCase().includes('GOLD') ? '🥇' : '🥈',
                  isAvailable: v.stock > 0
                }))
              : [
                  { price: p.price, tier: 'SILVER', save: '0%', status: p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK', icon: '🥈', isAvailable: p.stock > 0 }
                ]
          }));
          setGames(mappedGames);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    }
    fetchProducts();
  }, [settingsLoading, settings?.coming_soon]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleProductClick = (game: Game) => {
    setSelectedGame(game);
    setView('product');
    window.scrollTo(0, 0);
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedGame(null);
    setShopCategory('ALL');
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (category: string) => {
    setShopCategory(category);
    setView('shop');
    window.scrollTo(0, 0);
  };
  
  const handleSeeAll = () => {
    setShopCategory('ALL');
    setView('shop');
    window.scrollTo(0, 0);
  };

  const addToCart = (game: Game, accountType: AccountType) => {
    const newItem: CartItem = {
      cartId: `${game.id}-${accountType.tier}-${Date.now()}`,
      gameId: game.id,
      title: game.title,
      image: game.image,
      tier: accountType.tier,
      price: accountType.price,
      quantity: 1,
    };
    setCartItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleCheckout = () => {
    setView('checkout');
    window.scrollTo(0, 0);
  };

  const handleConfirmOrder = () => {
    setCartItems([]);
    setView('confirmation');
    window.scrollTo(0, 0);
  };

  const toggleFavorite = (gameId: string) => {
    setFavorites(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId) 
        : [...prev, gameId]
    );
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <Hero />
            <Stats />
            <Categories onCategoryClick={handleCategoryClick} />
            
            {/* Category Sliders */}
            <CategoryRow 
              title="ACTION MISSIONS" 
              games={games.filter(g => g.category?.toUpperCase() === 'ACTION')} 
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            <CategoryRow 
              title="SPORTS ARENA" 
              games={games.filter(g => g.category?.toUpperCase() === 'SPORTS')} 
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            <CategoryRow 
              title="RPG FRONTIERS" 
              games={games.filter(g => g.category?.toUpperCase() === 'RPG')} 
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />

            <StoreSection 
              games={games}
              onProductClick={handleProductClick} 
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </>
        );
      case 'shop':
        return (
          <ShopPage 
            games={games} 
            onProductClick={handleProductClick} 
            onBack={handleBackToHome}
            initialCategory={shopCategory}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'product':
        return selectedGame ? (
          <ProductPage 
            game={selectedGame} 
            onBack={handleBackToHome}
            onAddToCart={addToCart}
            isFavorited={favorites.includes(selectedGame.id)}
            onToggleFavorite={() => toggleFavorite(selectedGame.id)}
          />
        ) : null;
      case 'orders':
        return <OrdersPage onBack={handleBackToHome} />;
      case 'favorites':
        return (
          <FavoritesPage 
            onBack={handleBackToHome} 
            favoriteGames={games.filter(g => favorites.includes(g.id))}
            onProductClick={handleProductClick}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'about':
        return <AboutPage onBack={handleBackToHome} />;
      case 'contact':
        return <ContactPage onBack={handleBackToHome} />;
      case 'request':
        return <RequestGamePage onBack={handleBackToHome} />;
      case 'dashboard':
        return <DashboardPage onBack={handleBackToHome} onViewChange={setView} />;
      case 'checkout':
        return <CheckoutPage cart={cartItems} onBack={() => setView('home')} onConfirm={handleConfirmOrder} />;
      case 'confirmation':
        return <OrderConfirmationPage onBackToHome={handleBackToHome} onViewOrders={() => setView('orders')} />;
      case 'search':
        return (
          <SearchPage 
            games={games}
            onBack={handleBackToHome} 
            onProductClick={handleProductClick}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        );
      default:
        return null;
    }
  };

  if (!settingsLoading && settings?.coming_soon) {
    const socialLinks = [
      { key: 'instagram', url: settings?.instagram_url, label: 'Instagram', Icon: Instagram },
      { key: 'facebook', url: settings?.facebook_url, label: 'Facebook', Icon: Facebook },
      { key: 'whatsapp', url: settings?.whatsapp_url, label: 'WhatsApp', Icon: MessageCircle },
      { key: 'twitter', url: settings?.twitter_url, label: 'X', Icon: Twitter },
    ].filter((s) => !!s.url);

    return (
      <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-bg-dark text-[var(--text-primary)] selection:bg-brand-red selection:text-white transition-colors duration-300`}>
        <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-[0.08]" />
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-brand-red/20 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-brand-red/10 blur-[140px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl w-full bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 md:p-14 text-center shadow-2xl">
            <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase italic mb-4">Maintenance Mode</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter font-display uppercase italic leading-none text-[var(--text-primary)]">
              {settings?.store_name || settings?.website_title || 'Games Up'}
              <span className="text-brand-red">.</span>
            </h1>
            <p className="mt-6 text-sm md:text-base font-bold uppercase tracking-widest text-text-secondary leading-relaxed">
              Coming Soon. We’re preparing the store for launch.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              {settings?.store_email ? (
                <a href={`mailto:${settings.store_email}`} className="btn-primary">
                  Contact Support
                </a>
              ) : (
                <a href="#contact" className="btn-primary">
                  Contact Support
                </a>
              )}
              <button type="button" onClick={toggleTheme} className="btn-secondary">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>

            {(settings?.store_phone || settings?.store_email || socialLinks.length > 0) && (
              <div className="mt-10 pt-8 border-t border-border-subtle">
                <div className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">
                  {settings?.store_phone && <div>{settings.store_phone}</div>}
                  {settings?.store_email && <div>{settings.store_email}</div>}
                </div>

                {socialLinks.length > 0 && (
                  <div className="mt-6 flex items-center justify-center gap-3">
                    {socialLinks.map(({ key, url, label, Icon }) => (
                      <a
                        key={key}
                        href={String(url)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={label}
                        className="h-10 w-10 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-[var(--text-primary)] hover:border-brand-red transition-all bg-bg-card active:scale-95"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-bg-dark text-[var(--text-primary)] selection:bg-brand-red selection:text-white transition-colors duration-300`}>
      <AnimatePresence>
        {isLoading && (
          <Preloader onLoadingComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <Header 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        cartCount={cartItems.length}
        onCartClick={() => setIsCartOpen(true)}
        onLogoClick={handleBackToHome}
        onViewChange={setView}
        currentView={view}
      />
      
      <main>
        {renderView()}
      </main>

      <Footer isDark={isDark} />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

