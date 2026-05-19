/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { categoriesAPI, productsAPI, normalizeImageSrc } from './utils/api';
import { useStoreSettings } from './context/StoreSettingsContext';
import { Facebook, Instagram, MessageCircle, Twitter } from 'lucide-react';

export default function App() {
  const { settings, loading: settingsLoading } = useStoreSettings();
  const [games, setGames] = useState<Game[]>(GAMES_DATA);
  const [catalogCategories, setCatalogCategories] = useState<any[]>([]);
  const [catalogSubCategories, setCatalogSubCategories] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [collection, setCollection] = useState<{ title: string; productIds: string[] } | null>(null);
  const [shopCategory, setShopCategory] = useState<string>('ALL');
  const [isDark, setIsDark] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      if (settingsLoading) return;
      if (settings?.coming_soon) return;
      try {
        const [cats, subs, productsResult] = await Promise.all([
          categoriesAPI.getAll(),
          categoriesAPI.getSubCategories(),
          productsAPI.getPublic(),
        ]);

        const activeCats = Array.isArray(cats) ? cats.filter((c: any) => c && (c.is_active === undefined ? true : !!c.is_active)) : [];
        const activeSubs = Array.isArray(subs) ? subs.filter((s: any) => s && (s.is_active === undefined ? true : !!s.is_active)) : [];
        setCatalogCategories(activeCats);
        setCatalogSubCategories(activeSubs);

        const products = (productsResult as any)?.products || [];

        const categoryNameBySlug = new Map<string, string>(
          activeCats
            .filter((c: any) => c?.slug)
            .map((c: any) => [String(c.slug).trim().toLowerCase(), String(c.name || c.slug)]),
        );

        if (products && products.length > 0) {
          const mappedGames: Game[] = products.map((p: any) => ({
            // basePrice should show the lowest available attribute/variant price (excluding "Full Account")
            id: String(p.id),
            title: p.name,
            image: normalizeImageSrc(p.image || ''),
            banner: normalizeImageSrc(p.image || ''),
            price: (() => {
              const base = Number(p.price);
              return Number.isFinite(base) ? base : 0;
            })(),
            basePrice: (() => {
              const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
              const toPrice = (v: any) => {
                const n = Number(v?.price);
                return Number.isFinite(n) && n > 0 ? n : null;
              };

              const usable = variants.filter((v: any) => String(v?.name || '').trim().toLowerCase() !== 'full account');
              const inStock = usable.filter((v: any) => Number(v?.stock) > 0).map(toPrice).filter((x: any) => x != null) as number[];
              const any = usable.map(toPrice).filter((x: any) => x != null) as number[];

              const prices = inStock.length ? inStock : any;
              if (prices.length) return Math.min(...prices);

              const fallback = Number(p.price);
              return Number.isFinite(fallback) ? fallback : 0;
            })(),
            categorySlug: p.category_slug ? String(p.category_slug) : undefined,
            subCategorySlug: p.sub_category_slug ? String(p.sub_category_slug) : undefined,
            category: p.category_slug
              ? (categoryNameBySlug.get(String(p.category_slug).trim().toLowerCase()) ||
                  String(p.category_slug).replace(/[-_]/g, ' '))
              : 'Uncategorized',
            tags: [],
            status: p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK',
            description: p.description || '',
            instructions: p.instructions || '',
            accountTypes: Array.isArray(p.product_variants) && p.product_variants.length > 0
              ? p.product_variants.map((v: any) => ({
                  tier: v.name.toUpperCase(),
                  price: Number(v.price) || 0,
                  save: '0%',
                  status: v.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK',
                  icon: v.name.toUpperCase().includes('PLATINUM') ? '💎' : v.name.toUpperCase().includes('GOLD') ? '🥇' : '🥈',
                  isAvailable: v.stock > 0
                }))
              : [
                  { price: Number(p.price) || 0, tier: 'SILVER', save: '0%', status: p.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK', icon: '🥈', isAvailable: p.stock > 0 }
                ]
          }));
          setGames(mappedGames);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    }
    fetchCatalog();
  }, [settingsLoading, settings?.coming_soon]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const homepageSections = useMemo(() => {
    const raw = Array.isArray((settings as any)?.homepage_sections) ? (settings as any).homepage_sections : [];
    if (!raw.length) return [];
    const byId = new Map<string, Game>(games.map((g) => [String(g.id), g]));
    return raw
      .map((s: any) => {
        const productIds = Array.isArray(s?.productIds) ? s.productIds : [];
        const picked = productIds.map((id: any) => byId.get(String(id))).filter(Boolean) as Game[];
        return {
          id: String(s?.id ?? ''),
          title: s?.title == null ? '' : String(s.title),
          games: picked,
        };
      })
      .filter((s: any) => s.title && Array.isArray(s.games) && s.games.length > 0);
  }, [(settings as any)?.homepage_sections, games]);

  const bestSellingIds = useMemo(() => {
    const raw = (settings as any)?.best_selling_product_ids;
    return Array.isArray(raw) ? raw.map((v: any) => String(v)) : [];
  }, [(settings as any)?.best_selling_product_ids]);

  const bestSellingGames = useMemo(() => {
    if (!bestSellingIds.length) return [];
    const byId = new Map<string, Game>(games.map((g) => [String(g.id), g]));
    return bestSellingIds.map((id) => byId.get(String(id))).filter(Boolean) as Game[];
  }, [bestSellingIds, games]);

  const collectionGames = useMemo(() => {
    const ids = collection?.productIds;
    if (!Array.isArray(ids) || !ids.length) return [];
    const byId = new Map<string, Game>(games.map((g) => [String(g.id), g]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean) as Game[];
  }, [collection?.productIds, games]);

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
    const [pathname, search] = String(url || '/').split('?');
    const path = String(pathname || '/');
    if (path === '/' || path === '') {
      setView('home');
      setSelectedGame(null);
      setShopCategory('ALL');
      setCollection(null);
      window.scrollTo(0, 0);
      return true;
    }

    if (path.startsWith('/product/')) {
      const slug = decodeURIComponent(path.slice('/product/'.length));
      const idMatch = slug.match(/-([a-z0-9]+)$/i);
      const id = idMatch ? idMatch[1] : null;
      const found = id ? games.find((g) => String(g.id) === String(id)) : null;
      if (found) {
        setSelectedGame(found);
        setView('product');
        setCollection(null);
        window.scrollTo(0, 0);
        return true;
      }
      return false;
    }

    if (path === '/shop' || path.startsWith('/shop/')) {
      setSelectedGame(null);
      setCollection(null);
      setShopCategory('ALL');
      setView('shop');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/best-sellers' || path === '/best-selling' || path.startsWith('/best-sellers/')) {
      setSelectedGame(null);
      setCollection(null);
      setShopCategory('ALL');
      setView('best_sellers');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/about' || path.startsWith('/about/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('about');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/contact' || path.startsWith('/contact/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('contact');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/favorites' || path.startsWith('/favorites/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('favorites');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/orders' || path.startsWith('/orders/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('orders');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/request-game' || path === '/request' || path.startsWith('/request')) {
      setSelectedGame(null);
      setCollection(null);
      setView('request');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/dashboard' || path.startsWith('/dashboard/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('dashboard');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/search' || path.startsWith('/search/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('search');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/checkout' || path.startsWith('/checkout/')) {
      setSelectedGame(null);
      setCollection(null);
      setView('checkout');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/order-confirmation' || path === '/confirmation' || path.startsWith('/confirmation')) {
      setSelectedGame(null);
      setCollection(null);
      setView('confirmation');
      window.scrollTo(0, 0);
      return true;
    }

    if (path === '/collection' || path.startsWith('/collection/')) {
      const params = new URLSearchParams(search || '');
      const ids = (params.get('ids') || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (!ids.length) return false;
      const title = params.get('title') ? String(params.get('title')) : 'Selected Products';
      setCollection({ title, productIds: ids });
      setSelectedGame(null);
      setShopCategory('ALL');
      setView('collection');
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

  useEffect(() => {
    if (settingsLoading) return;
    if (settings?.coming_soon) return;
    if (pendingUrlRef.current == null) return;
    const ok = trySyncFromUrl(pendingUrlRef.current);
    if (ok) pendingUrlRef.current = null;
  }, [games, settingsLoading, settings?.coming_soon]);

  const navigateView = (nextView: AppView) => {
    if (nextView === 'home') return handleBackToHome();
    if (nextView === 'shop') return handleSeeAll();
    if (nextView === 'best_sellers') return openBestSellers();
    if (nextView === 'about') {
      setSelectedGame(null);
      setCollection(null);
      setView('about');
      window.history.pushState({}, '', '/about');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'contact') {
      setSelectedGame(null);
      setCollection(null);
      setView('contact');
      window.history.pushState({}, '', '/contact');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'favorites') {
      setSelectedGame(null);
      setCollection(null);
      setView('favorites');
      window.history.pushState({}, '', '/favorites');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'orders') {
      setSelectedGame(null);
      setCollection(null);
      setView('orders');
      window.history.pushState({}, '', '/orders');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'request') {
      setSelectedGame(null);
      setCollection(null);
      setView('request');
      window.history.pushState({}, '', '/request-game');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'search') {
      setSelectedGame(null);
      setCollection(null);
      setView('search');
      window.history.pushState({}, '', '/search');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'dashboard') {
      setSelectedGame(null);
      setCollection(null);
      setView('dashboard');
      window.history.pushState({}, '', '/dashboard');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'checkout') {
      setSelectedGame(null);
      setCollection(null);
      setView('checkout');
      window.history.pushState({}, '', '/checkout');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'confirmation') {
      setSelectedGame(null);
      setCollection(null);
      setView('confirmation');
      window.history.pushState({}, '', '/confirmation');
      window.scrollTo(0, 0);
      return;
    }
    if (nextView === 'product') {
      if (selectedGame) {
        setCollection(null);
        setView('product');
        window.history.pushState({}, '', `/product/${buildProductSlug(selectedGame)}`);
        window.scrollTo(0, 0);
        return;
      }
      return handleBackToHome();
    }
    if (nextView === 'collection') {
      if (collection && Array.isArray(collection.productIds) && collection.productIds.length > 0) {
        setSelectedGame(null);
        setShopCategory('ALL');
        setView('collection');
        const params = new URLSearchParams();
        params.set('title', collection.title || 'Selected Products');
        params.set('ids', collection.productIds.join(','));
        window.history.pushState({}, '', `/collection?${params.toString()}`);
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
    setCollection(null);
    window.history.pushState({}, '', '/');
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (category: string) => {
    setShopCategory(category);
    setView('shop');
    setCollection(null);
    window.history.pushState({}, '', '/shop');
    window.scrollTo(0, 0);
  };
  
  const openCollection = (title: string, productIds: string[]) => {
    const ids = Array.isArray(productIds) ? productIds.map((v) => String(v)) : [];
    if (!ids.length) return;
    setCollection({ title: String(title || ''), productIds: ids });
    setSelectedGame(null);
    setView('collection');
    const params = new URLSearchParams();
    params.set('title', String(title || 'Selected Products'));
    params.set('ids', ids.join(','));
    window.history.pushState({}, '', `/collection?${params.toString()}`);
    window.scrollTo(0, 0);
  };

  const handleShopNow = () => {
    setSelectedGame(null);
    setShopCategory('ALL');
    setView('shop');
    setCollection(null);
    window.history.pushState({}, '', '/shop');
    window.scrollTo(0, 0);
  };

  const openBestSellers = () => {
    setSelectedGame(null);
    setShopCategory('ALL');
    setCollection(null);
    setView('best_sellers');
    window.history.pushState({}, '', '/best-sellers');
    window.scrollTo(0, 0);
  };

  const handleSeeAll = () => {
    setShopCategory('ALL');
    setView('shop');
    setCollection(null);
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
    setCartItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleCheckout = () => {
    setView('checkout');
    window.history.pushState({}, '', '/checkout');
    window.scrollTo(0, 0);
  };

  const handleConfirmOrder = () => {
    setCartItems([]);
    setView('confirmation');
    window.history.pushState({}, '', '/confirmation');
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
            <Hero onShopNow={handleShopNow} />
            <Stats />
            {bestSellingGames.length > 0 && (
              <CategoryRow
                title="BEST SELLING"
                games={bestSellingGames}
                onProductClick={handleProductClick}
                onSeeAll={openBestSellers}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            )}
            <Categories onCategoryClick={handleCategoryClick} />
            
            {homepageSections.length > 0 ? (
              homepageSections.map((sec: any) => (
                <CategoryRow
                  key={sec.id}
                  title={sec.title}
                  games={sec.games}
                  onProductClick={handleProductClick}
                  onSeeAll={() => openCollection(sec.title, (sec.games || []).map((g: any) => String(g.id)))}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            ) : (
              <>
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
              </>
            )}

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
            categories={catalogCategories}
            subCategories={catalogSubCategories}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'best_sellers':
        return (
          <ShopPage
            games={bestSellingGames}
            onProductClick={handleProductClick}
            onBack={handleBackToHome}
            initialCategory="ALL"
            pageTitle="BEST SELLERS"
            pageSubtitle="Best Selling Products"
            hideCategoriesBar
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'collection':
        return (
          <ShopPage
            games={collectionGames}
            onProductClick={handleProductClick}
            onBack={handleBackToHome}
            initialCategory="ALL"
            pageTitle={collection?.title || 'Selected Products'}
            pageSubtitle="Selected Products"
            hideCategoriesBar
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
        return <DashboardPage onBack={handleBackToHome} onViewChange={navigateView} />;
      case 'checkout':
        return <CheckoutPage cart={cartItems} onBack={() => navigateView('home')} onConfirm={handleConfirmOrder} />;
      case 'confirmation':
        return <OrderConfirmationPage onBackToHome={handleBackToHome} onViewOrders={() => navigateView('orders')} />;
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
        onViewChange={navigateView}
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

