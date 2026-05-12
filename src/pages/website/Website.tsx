import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { WebsiteLayout } from './WebsiteLayout';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { ComingSoon } from './ComingSoon';
import { Cart } from './Cart'; 

export function Website() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { settings } = useStoreSettings();

  // Redirect to coming soon if enabled
  if (settings.coming_soon && !location.pathname.startsWith('/admin')) {
    return (
      <ComingSoon onNavigateToAdmin={() => navigate('/admin')} />
    );
  }

  const handleNavigate = (page: string, productId?: string, categorySlug?: string) => {
    if (page === 'home') navigate('/');
    else if (page === 'shop') {
      if (categorySlug) navigate(`/shop?category=${categorySlug}`);
      else navigate('/shop');
    }
    else if (page === 'product' && productId) navigate(`/product/${productId}`);
    else navigate(`/${page}`);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCart = () => setIsCartOpen(true);
  const handleCloseCart = () => setIsCartOpen(false);

  // Determine current page type for layout
  const getPageType = () => {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/gift-cards')) return 'gift-cards';
    if (path.startsWith('/product')) return 'product';
    return 'shop'; // default
  };

  return (
    <WebsiteLayout 
      currentPage={getPageType() as any} 
      onNavigate={handleNavigate}
      isCartOpen={isCartOpen}
      onOpenCart={handleOpenCart}
      onCloseCart={handleCloseCart}
    >
      <Outlet context={{ handleNavigate, handleOpenCart }} />
    </WebsiteLayout>
  );
}
