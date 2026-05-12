import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, LogOut, Package, Heart, Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { categoriesAPI, ordersAPI } from '../../utils/api';
import { Cart } from './Cart';
import { SearchModal } from './SearchModal';
import { ChatWidget } from './ChatWidget';
import logoBlack from '../../assets/games up word black.png';

interface WebsiteLayoutProps {
  children: ReactNode;
  currentPage: 'home' | 'shop' | 'gift-cards' | 'product';
  onNavigate: (page: string, productId?: string, categorySlug?: string) => void;
  isCartOpen: boolean;
  onOpenCart: () => void;
  onCloseCart: () => void;
}

export function WebsiteLayout({ children, onNavigate, isCartOpen, onOpenCart, onCloseCart }: WebsiteLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasSuccessfulOrder, setHasSuccessfulOrder] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const { settings } = useStoreSettings();

  useEffect(() => {
    // Check for customer session
    const checkSession = () => {
      const savedSession = localStorage.getItem('customerSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setUser(session.user);
        } catch (error) {
          console.error('Error parsing customer session:', error);
        }
      } else {
        setUser(null);
        setHasSuccessfulOrder(false);
      }
    };

    checkSession();
    updateCartCount();
    updateFavoritesCount();

    // Listen for storage changes (for login from other tabs and favorites updates)
    const handleStorageChange = () => {
      checkSession();
      updateFavoritesCount();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for session and favorites changes
    const interval = setInterval(() => {
      checkSession();
      updateFavoritesCount();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const checkUserOrders = async () => {
      // For testing/development: if you want the chat button to always show for logged-in users, 
      // you could bypass this check. For now, we strictly check for any order under the user's email.
      if (!user) {
        setHasSuccessfulOrder(false);
        return;
      }
      
      // If user is logged in, but we can't find an email, we still might want to fallback.
      const email = user.email || user.user_metadata?.email;
      if (!email) {
        setHasSuccessfulOrder(false);
        return;
      }
      
      try {
        const res = await ordersAPI.getAll({ email });
        const hasSuccess = res?.orders && res.orders.length > 0;
        
        setHasSuccessfulOrder(!!hasSuccess);
      } catch (err) {
        console.error('Error checking user orders:', err);
      }
    };
    
    checkUserOrders();
  }, [user]);

  useEffect(() => {
    const loadFooterCategories = async () => {
      try {
        const cats = await categoriesAPI.getFooterTop(5);
        setFooterCategories(Array.isArray(cats) ? cats : []);
      } catch (error) {
        console.error('Failed to load footer categories:', error);
        setFooterCategories([]);
      }
    };

    loadFooterCategories();
  }, []);

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.length);
  };

  const updateFavoritesCount = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavoritesCount(favorites.length);
  };

  const handleLogout = () => {
    localStorage.removeItem('customerSession');
    setUser(null);
    setUserMenuOpen(false);
  };

  const handleOpenCart = () => {
    onOpenCart();
    updateCartCount();
  };

  const handleCheckout = () => {
    onNavigate('checkout');
  };

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary">
      {/* Global Header */}
      <div className="fixed top-4 left-0 right-0 z-50 px-6">
        <header className="mx-auto max-w-6xl bg-white/80 backdrop-blur-xl border-2 border-red-500 rounded-3xl shadow-xl shadow-black/5 transition-all duration-300">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <img 
                src={logoBlack} 
                alt="Games Up" 
                onClick={() => onNavigate('home')} 
                className="h-10 w-auto cursor-pointer object-contain"
              />
              <div className="relative hidden md:block w-96">
                <form onSubmit={(e) => { e.preventDefault(); onNavigate('shop'); }}>
                  <input 
                    type="text" 
                    placeholder="Search for games, gift cards..." 
                    className="w-full bg-white/60 backdrop-blur-sm border border-white/20 rounded-full py-2.5 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-surface-raised/50 transition-all text-text-primary placeholder:text-text-tertiary font-medium"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </form>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-8">
                <NavLink to="/" className={({ isActive }) => `text-[14px] font-medium ${isActive ? 'text-surface-raised' : 'text-text-primary hover:text-surface-raised transition-colors'}`}>Home</NavLink>
                <NavLink to="/shop" className={({ isActive }) => `text-[14px] font-medium ${isActive ? 'text-surface-raised' : 'text-text-primary hover:text-surface-raised transition-colors'}`}>Shop</NavLink>
                <NavLink to="/gift-cards" className={({ isActive }) => `text-[14px] font-medium ${isActive ? 'text-surface-raised' : 'text-text-primary hover:text-surface-raised transition-colors'}`}>Gift Cards</NavLink>
              </nav>

              <button className="hidden md:block p-2.5 hover:bg-white/20 rounded-full transition-colors relative" onClick={() => onNavigate('favorites')}>
                <Heart className={`h-5 w-5 ${favoritesCount > 0 ? 'fill-[#ff1574] text-[#ff1574]' : 'text-text-primary'}`} />
                {favoritesCount > 0 && (
                  <span className="absolute top-0 right-0 bg-[#ff1574] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{favoritesCount}</span>
                )}
              </button>
              
              <button className="p-2.5 hover:bg-white/20 rounded-full transition-colors relative" onClick={() => onNavigate('shop')}>
                <ShoppingCart className="h-5 w-5 text-text-primary" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-surface-raised text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>
                )}
              </button>

              {user ? (
                <div className="hidden md:block relative group">
                  <button className="p-2.5 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                    <User className="h-5 w-5 text-text-primary" />
                    <span className="hidden md:block text-xs font-medium">{user.name}</span>
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl shadow-black/10 overflow-hidden"
                      >
                        <button onClick={() => { onNavigate('profile'); setUserMenuOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-white/50 flex items-center gap-2 text-[11px] font-medium">
                          <User className="w-4 h-4" /> Profile
                        </button>
                        <button onClick={() => { onNavigate('orders'); setUserMenuOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-white/50 flex items-center gap-2 text-[11px] font-medium">
                          <Package className="w-4 h-4" /> My Orders
                        </button>
                        <button onClick={handleLogout} className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 border-t border-white/20 flex items-center gap-2 text-[11px] font-medium">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => onNavigate('login')} className="hidden sm:block text-[14px] font-medium px-6 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors">Login</button>
                  <button onClick={() => onNavigate('signup')} className="bg-red-600 text-white text-[14px] font-medium px-6 py-2.5 rounded-full hover:bg-red-700 transition-colors">Signup</button>
                </div>
              )}

              <button className="md:hidden p-2.5 hover:bg-white/20 rounded-full transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5 text-text-primary" /> : <Menu className="h-5 w-5 text-text-primary" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 mt-4 mx-6"
            >
              <div className="px-8 py-6 space-y-4">
                <button onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} className="w-full text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">Home</button>
                <button onClick={() => { onNavigate('shop'); setMobileMenuOpen(false); }} className="w-full text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">Shop</button>
                <button onClick={() => { onNavigate('gift-cards'); setMobileMenuOpen(false); }} className="w-full text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">Gift Cards</button>
                <button onClick={() => { onNavigate('favorites'); setMobileMenuOpen(false); }} className="w-full flex items-center justify-between text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">
                  <div className="flex items-center gap-2">
                    <Heart className={`h-4 w-4 ${favoritesCount > 0 ? 'fill-[#ff1574] text-[#ff1574]' : 'text-text-primary'}`} />
                    <span>Favorites</span>
                  </div>
                  {favoritesCount > 0 && (
                    <span className="bg-[#ff1574] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{favoritesCount}</span>
                  )}
                </button>
                {!user && (
                  <div className="pt-4 border-t border-white/20 flex gap-3">
                    <button onClick={() => onNavigate('login')} className="flex-1 text-[14px] font-medium py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors">Login</button>
                    <button onClick={() => onNavigate('signup')} className="flex-1 bg-red-600 text-white text-[14px] font-medium py-2.5 rounded-full hover:bg-red-700 transition-colors">Signup</button>
                  </div>
                )}
                {user && (
                  <div className="pt-4 border-t border-white/20 space-y-2">
                    <button onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </button>
                    <button onClick={() => { onNavigate('orders'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-left text-[14px] font-medium text-text-primary hover:text-surface-raised transition-colors py-2">
                      <Package className="h-4 w-4" />
                      <span>My Orders</span>
                    </button>
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 text-left text-[14px] font-medium text-red-600 hover:text-red-700 transition-colors py-2">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content - Unified Top Padding for all pages */}
      <main className="pt-56 lg:pt-64 pb-20">
        {children}
      </main>

      {/* Global Footer */}
      <div className="container mx-auto px-4 mb-8">
        <footer className="bg-white text-gray-900 pt-16 pb-8 rounded-[30px] shadow-2xl mt-20 border border-gray-200">
          <div className="container mx-auto px-8 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <img 
              src={logoBlack} 
              alt="Games Up" 
              onClick={() => onNavigate('home')} 
              className="h-10 w-auto mb-6 cursor-pointer object-contain"
            />
              <p className="text-gray-600 text-sm leading-relaxed mb-8 max-w-md font-medium">
                {settings.website_description || "Games Up is your ultimate destination for digital gaming. We provide instant delivery for PlayStation, Xbox, Nintendo, and PC titles, along with a wide range of global gift cards."}
              </p>
              <div className="flex gap-4">
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#b90909] hover:text-white transition-all text-gray-700">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#b90909] hover:text-white transition-all text-gray-700">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {settings.whatsapp_url && (
                  <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#b90909] hover:text-white transition-all text-gray-700">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </a>
                )}
                {settings.twitter_url && (
                  <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#b90909] hover:text-white transition-all text-gray-700">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {!settings.instagram_url && !settings.facebook_url && !settings.whatsapp_url && !settings.twitter_url && (
                  <div className="text-gray-500 text-sm italic">Connect with us coming soon!</div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-8 text-gray-500">Store Categories</h4>
              <ul className="space-y-4 text-[13px] text-gray-700 font-bold">
                {footerCategories.length > 0 ? (
                  footerCategories.map((cat) => (
                    <li
                      key={cat.id ?? cat.slug}
                      onClick={() => onNavigate('shop', undefined, cat.slug)}
                      className="hover:text-[#b90909] cursor-pointer transition-colors uppercase"
                    >
                      {cat.name}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 font-medium uppercase">No categories</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-8 text-gray-500">Customer Care</h4>
              <ul className="space-y-4 text-[13px] text-gray-700 font-bold">
                <li onClick={() => onNavigate('help')} className="hover:text-[#b90909] cursor-pointer transition-colors uppercase">Help & Support</li>
                <li onClick={() => onNavigate('refunds')} className="hover:text-[#b90909] cursor-pointer transition-colors uppercase">Refund Policy</li>
                <li onClick={() => onNavigate('activate')} className="hover:text-[#b90909] cursor-pointer transition-colors uppercase">How to Activate</li>
                <li onClick={() => onNavigate('contact')} className="hover:text-[#b90909] cursor-pointer transition-colors uppercase">Contact Us</li>
              </ul>
            </div>
          </div>
          <div className="container mx-auto px-8 lg:px-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">© 2026 GAMES UP. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-6 items-center">
               <div className="flex gap-3 opacity-60">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-10 h-6 bg-gray-300/60 rounded-sm"></div>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Cart Modal */}
      <Cart 
        isOpen={isCartOpen}
        onClose={() => {
          onCloseCart();
          updateCartCount();
        }}
        onCheckout={handleCheckout}
        onNavigate={onNavigate}
      />

      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Floating Action Buttons */}
      <div
        className="fixed bottom-6 right-24 flex flex-col gap-3 z-[999998]"
      >
        {/* Internal Chat Widget (Only visible if logged in with successful order) */}
        {user && hasSuccessfulOrder && (
          <ChatWidget user={user} />
        )}

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/201008480536"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 border-[3px] border-white"
          aria-label="Chat with us on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" className="ml-0.5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>

      {/* Floating Cart Button (Always visible, separate from the stack) */}
      <button
        onClick={handleOpenCart}
        className="fixed bottom-6 right-6 bg-gradient-to-tr from-red-600 to-[#ff1574] text-white w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(255,21,116,0.4)] hover:shadow-[0_12px_30px_rgba(255,21,116,0.5)] transition-all duration-300 flex items-center justify-center z-[999999] border-2 border-white"
      >
        <ShoppingCart className="w-6 h-6" />
        {cartCount > 0 && (
          <span
            className="absolute -top-2 -right-2 bg-gray-900 text-white text-[11px] font-bold"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2.5px solid white',
            }}
          >
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
}
