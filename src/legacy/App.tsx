import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AboutPage } from './components/AboutPage';
import { CartDrawer } from './components/CartDrawer';
import { Categories } from './components/Categories';
import { CategoryRow } from './components/CategoryRow';
import { CheckoutPage } from './components/CheckoutPage';
import { ContactPage } from './components/ContactPage';
import { DashboardPage } from './components/DashboardPage';
import { FavoritesPage } from './components/FavoritesPage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderConfirmationPage } from './components/OrderConfirmationPage';
import { OrdersPage } from './components/OrdersPage';
import { Preloader } from './components/Preloader';
import { ProductPage } from './components/ProductPage';
import { RequestGamePage } from './components/RequestGamePage';
import { SearchPage } from './components/SearchPage';
import { ShopPage } from './components/ShopPage';
import { Stats } from './components/Stats';
import { StoreSection } from './components/StoreSection';
import { GAMES_DATA } from './constants';
import { AccountType, AppView, CartItem, Game } from './types';

export default function App() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [shopCategory, setShopCategory] = useState<string>('ALL');
  const [isDark, setIsDark] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const slugify = (input: string) => {
    return String(input || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const buildProductSlug = (game: Game) => `${slugify(game.title)}-${String(game.id)}`;

  const trySyncFromUrl = (url: string): boolean => {
    const [pathname] = String(url || '/').split('?');
    const path = String(pathname || '/');

    if (path === '/' || path === '') {
      setView('home');
      setSelectedGame(null);
      setShopCategory('ALL');
      window.scrollTo(0, 0);
      return true;
    }

    if (path.startsWith('/product/')) {
      const slug = decodeURIComponent(path.slice('/product/'.length));
      const idMatch = slug.match(/-([a-z0-9]+)$/i);
      const id = idMatch ? idMatch[1] : null;
      const found = id ? GAMES_DATA.find((g) => String(g.id) === String(id)) : null;
      if (found) {
        setSelectedGame(found);
        setView('product');
        window.scrollTo(0, 0);
        return true;
      }
      return false;
    }

    if (path === '/shop' || path.startsWith('/shop/')) {
      setSelectedGame(null);
      setShopCategory('ALL');
      setView('shop');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/about' || path.startsWith('/about/')) {
      setSelectedGame(null);
      setView('about');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/contact' || path.startsWith('/contact/')) {
      setSelectedGame(null);
      setView('contact');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/favorites' || path.startsWith('/favorites/')) {
      setSelectedGame(null);
      setView('favorites');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/orders' || path.startsWith('/orders/')) {
      setSelectedGame(null);
      setView('orders');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/request-game' || path === '/request' || path.startsWith('/request')) {
      setSelectedGame(null);
      setView('request');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/dashboard' || path.startsWith('/dashboard/')) {
      setSelectedGame(null);
      setView('dashboard');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/search' || path.startsWith('/search/')) {
      setSelectedGame(null);
      setView('search');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/checkout' || path.startsWith('/checkout/')) {
      setSelectedGame(null);
      setView('checkout');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/order-confirmation' || path === '/confirmation' || path.startsWith('/confirmation')) {
      setSelectedGame(null);
      setView('confirmation');
      window.scrollTo(0, 0);
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (pendingUrlRef.current != null) return;
    pendingUrlRef.current = `${window.location.pathname || '/'}${window.location.search || ''}`;

    const onPopState = () => {
      pendingUrlRef.current = `${window.location.pathname || '/'}${window.location.search || ''}`;
      const ok = trySyncFromUrl(pendingUrlRef.current);
      if (ok) pendingUrlRef.current = null;
    };

    window.addEventListener('popstate', onPopState);
    onPopState();
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateView = (nextView: AppView) => {
    if (nextView === 'home') return handleBackToHome();
    if (nextView === 'shop') return handleSeeAll();
    if (nextView === 'about') {
      setSelectedGame(null);
      setView('about');
      window.history.pushState({}, '', '/about');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'contact') {
      setSelectedGame(null);
      setView('contact');
      window.history.pushState({}, '', '/contact');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'favorites') {
      setSelectedGame(null);
      setView('favorites');
      window.history.pushState({}, '', '/favorites');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'orders') {
      setSelectedGame(null);
      setView('orders');
      window.history.pushState({}, '', '/orders');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'request') {
      setSelectedGame(null);
      setView('request');
      window.history.pushState({}, '', '/request-game');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'search') {
      setSelectedGame(null);
      setView('search');
      window.history.pushState({}, '', '/search');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'dashboard') {
      setSelectedGame(null);
      setView('dashboard');
      window.history.pushState({}, '', '/dashboard');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'checkout') {
      setSelectedGame(null);
      setView('checkout');
      window.history.pushState({}, '', '/checkout');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'confirmation') {
      setSelectedGame(null);
      setView('confirmation');
      window.history.pushState({}, '', '/confirmation');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'product') {
      if (selectedGame) {
        setView('product');
        window.history.pushState({}, '', `/product/${buildProductSlug(selectedGame)}`);
        window.scrollTo(0, 0);
        return;
      }
      return handleBackToHome();
    }
  };

  const handleProductClick = (game: Game) => {
    setSelectedGame(game);
    setView('product');
    window.history.pushState({}, '', `/product/${buildProductSlug(game)}`);
    window.scrollTo(0, 0);
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedGame(null);
    setShopCategory('ALL');
    window.history.pushState({}, '', '/');
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (category: string) => {
    setShopCategory(category);
    setView('shop');
    window.history.pushState({}, '', '/shop');
    window.scrollTo(0, 0);
  };

  const handleShopNow = () => {
    setSelectedGame(null);
    setShopCategory('ALL');
    setView('shop');
    window.history.pushState({}, '', '/shop');
    window.scrollTo(0, 0);
  };

  const handleSeeAll = () => {
    setShopCategory('ALL');
    setView('shop');
    window.history.pushState({}, '', '/shop');
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
    setCartItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));
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
    setFavorites((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]));
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <Hero onShopNow={handleShopNow} />
            <Stats />
            <Categories onCategoryClick={handleCategoryClick} />
            <CategoryRow
              title="ACTION MISSIONS"
              games={GAMES_DATA.filter((g) => g.category?.toUpperCase() === 'ACTION')}
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            <CategoryRow
              title="SPORTS ARENA"
              games={GAMES_DATA.filter((g) => g.category?.toUpperCase() === 'SPORTS')}
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            <CategoryRow
              title="RPG FRONTIERS"
              games={GAMES_DATA.filter((g) => g.category?.toUpperCase() === 'RPG')}
              onProductClick={handleProductClick}
              onSeeAll={handleSeeAll}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
            <StoreSection onProductClick={handleProductClick} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </>
        );
      case 'shop':
        return (
          <ShopPage
            games={GAMES_DATA}
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
            favoriteGames={GAMES_DATA.filter((g) => favorites.includes(g.id))}
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
        return <DashboardPage onBack={handleBackToHome} onViewChange={navigateView} />;
      case 'checkout':
        return <CheckoutPage cart={cartItems} onBack={() => navigateView('home')} onConfirm={handleConfirmOrder} />;
      case 'confirmation':
        return <OrderConfirmationPage onBackToHome={handleBackToHome} onViewOrders={() => navigateView('orders')} />;
      case 'search':
        return <SearchPage onBack={handleBackToHome} onProductClick={handleProductClick} favorites={favorites} onToggleFavorite={toggleFavorite} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen ${isDark ? 'dark' : ''} bg-bg-dark text-[var(--text-primary)] selection:bg-brand-red selection:text-white transition-colors duration-300`}
    >
      <AnimatePresence>{isLoading && <Preloader onLoadingComplete={() => setIsLoading(false)} />}</AnimatePresence>

      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        cartCount={cartItems.length}
        onCartClick={() => setIsCartOpen(true)}
        onLogoClick={handleBackToHome}
        onViewChange={navigateView}
        currentView={view}
      />

      <main>{renderView()}</main>

      <Footer isDark={isDark} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onRemove={removeFromCart} onCheckout={handleCheckout} />
    </div>
  );
}
