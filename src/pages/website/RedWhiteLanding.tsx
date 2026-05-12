import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, ShoppingBag, User, Bell, 
  Gamepad2, ChevronRight,
  Home, LayoutGrid, Library
} from 'lucide-react';
import { productsAPI, bannersAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  position: number;
  isActive: boolean;
  subtitle?: string;
  badge?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  categorySlug?: string;
}

interface LandingPageProps {
  onNavigate: (page: string, productId?: string, categorySlug?: string) => void;
  onOpenCart: () => void;
}

export function RedWhiteLanding({ onNavigate, onOpenCart }: LandingPageProps) {
  const { formatPrice } = useStoreSettings();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    // 1. Theme Logic
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    if (initialTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    // 2. Auth Logic
    const savedSession = localStorage.getItem('customerSession');
    if (savedSession) {
      try {
        setCustomer(JSON.parse(savedSession).user);
      } catch (e) {
        console.error('Session error', e);
      }
    }

    // 3. Data Fetching
    const loadData = async () => {
      try {
        const [productsData, bannersData] = await Promise.all([
          productsAPI.getAll(),
          bannersAPI.getAll()
        ]);
        
        setFeaturedProducts(productsData.products?.slice(0, 8) || []);
        
        // Parse and filter bento banners (positions 1-4)
        // Use a map to ensure we only have one banner per position (indices 1-4)
        const bannerMap: Record<number, any> = {};
        (bannersData.banners || []).forEach((b: any) => {
          const pos = Number(b.position);
          if (b.is_active && pos >= 1 && pos <= 4) {
            // Keep the most recent one for each position
            bannerMap[pos] = b;
          }
        });

        const bentoBanners = Object.values(bannerMap)
          .map((b: any) => {
            let extendedData: any = {};
            try {
              if (b.link?.trim().startsWith('{')) {
                extendedData = JSON.parse(b.link);
              }
            } catch (e) {}
            return {
              ...b,
              id: b.id,
              title: b.title,
              position: Number(b.position),
              isActive: b.is_active !== undefined ? b.is_active : b.isActive,
              imageUrl: b.image_url || b.imageUrl,
              link: extendedData.url || b.link,
              subtitle: extendedData.subtitle || '',
              badge: extendedData.badge || ''
            };
          })
          .sort((a: any, b: any) => Number(a.position) - Number(b.position))
          .slice(0, 4);
        
        setBanners(bentoBanners);
      } catch (error) {
        console.error('Load error', error);
      }
    };
    loadData();
  }, []);

  const handleBannerClick = (link?: string) => {
    if (!link) return;
    
    if (link.startsWith('/product/')) {
      const productId = link.split('/product/')[1];
      onNavigate('shop', productId);
    } else if (link.startsWith('/shop')) {
      const url = new URL(link, window.location.origin);
      const category = url.searchParams.get('category');
      onNavigate('shop', undefined, category || undefined);
    } else if (link.startsWith('/gift-cards')) {
      // @ts-ignore
      onNavigate('gift-cards');
    } else if (link === '/') {
      // @ts-ignore
      onNavigate('home');
    } else if (link.startsWith('http')) {
      window.open(link, '_blank');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-color)] text-[var(--text-color)] font-['Inter'] mt-20 gap-5 overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <aside className="w-[300px] bg-[var(--sidebar-bg)] rounded-[30px] p-10 flex flex-col shadow-[10px_0_30px_var(--shadow)] shrink-0">
        <div className="flex items-center gap-4 mb-12 group cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-12 h-12 bg-[#ff1574] text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_10px_20px_rgba(255,21,116,0.4)] group-hover:rotate-12 transition-transform">P</div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">PLAYPACK</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-primary-red text-white font-semibold transition-all shadow-[0_10px_20px_rgba(255,21,116,0.2)]">
                <Home className="w-5 h-5" /> Home
            </button>
            <button onClick={() => onNavigate('shop')} className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-color)] opacity-70 hover:opacity-100 font-semibold transition-all">
                <LayoutGrid className="w-5 h-5" /> Categories
            </button>
            <button onClick={() => onNavigate('favorites')} className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-color)] opacity-70 hover:opacity-100 font-semibold transition-all">
                <Library className="w-5 h-5" /> My Library
            </button>
            
            <div className="h-[1px] bg-[var(--text-color)] opacity-10 my-6 mx-4" />
            
            <p className="text-[10px] font-black tracking-[0.3em] opacity-30 mb-4 px-4 uppercase">Fast Launch</p>
            
            {['Minecraft', 'Red Dead 2', 'Far Cry 6'].map((game) => (
                <button key={game} className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-color)] opacity-70 hover:opacity-100 font-bold text-xs tracking-widest uppercase transition-all">
                   <div className="w-2 h-2 rounded-full bg-[var(--primary-red)]" /> {game}
                </button>
            ))}
        </nav>

        {/* Theme Switcher */}
        <div className="mt-auto px-4">
          <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-[24px] border border-black/5 dark:border-white/5 relative h-12">
              <div 
                className={`absolute inset-1 w-[calc(50%-4px)] bg-primary-red rounded-2xl transition-all duration-500 shadow-[0_5px_15px_rgba(255,21,116,0.3)] ${theme === 'dark' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
              />
              <button 
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 relative z-10 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${theme === 'light' ? 'text-white' : 'text-zinc-500'}`}
              >
                Light
              </button>
              <button 
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 relative z-10 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-zinc-500'}`}
              >
                Dark
              </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEW */}
      <main className="flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar">
        
        {/* Top Bar */}
        <header className="flex items-center justify-between p-4 px-8 min-h-[80px]">
            <div className="flex items-center gap-4 bg-[var(--card-bg)] px-6 py-3 rounded-2xl border border-white/10 w-1/3 min-w-[300px] shadow-sm">
                <Search className="w-4 h-4 opacity-40" />
                <input 
                   type="text" 
                   placeholder="Search the Games Up universe..." 
                   className="bg-transparent border-none outline-none text-xs w-full"
                />
            </div>

            <div className="flex items-center gap-6">
                <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <Bell className="w-5 h-5 opacity-60" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary-red rounded-full shadow-[0_0_10px_rgba(255,21,116,0.8)]" />
                </button>
                <div onClick={onOpenCart} className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <ShoppingBag className="w-5 h-5 opacity-60" />
                </div>
                
                <div className="w-[1px] h-6 bg-white/10" />

                <button onClick={() => onNavigate('profile')} className="flex items-center gap-4 group">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase leading-tight">{customer?.name || 'Authorized'}</p>
                        <p className="text-[8px] font-bold uppercase opacity-30 leading-none">View Profile</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-purple-500 p-[2px] shadow-xl group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-2xl bg-[var(--bg-color)] flex items-center justify-center overflow-hidden">
                           <User className="w-5 h-5 text-primary-red" />
                        </div>
                    </div>
                </button>
            </div>
        </header>

        {/* Bento Hero Section */}
        <section 
            style={{ minHeight: '600px', flexShrink: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 pb-4"
        >
            {banners.length > 0 ? (
                banners.map((banner: Banner, index: number) => {
                    const gridClasses = [
                        "md:col-span-2 md:row-span-2", // Pos 1
                        "md:col-span-2 md:row-span-1", // Pos 2
                        "md:col-span-1 md:row-span-1", // Pos 3
                        "md:col-span-1 md:row-span-1", // Pos 4
                    ][index] || "md:col-span-1";

                    return (
                        <motion.div
                            key={banner.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.01 }}
                            className={`${gridClasses} relative rounded-[40px] overflow-hidden group cursor-pointer border border-[var(--glass-border)] shadow-2xl bg-zinc-900`}
                            onClick={() => banner.link ? handleBannerClick(banner.link) : onNavigate('shop')}
                        >
                            {/* Background Image */}
                            <img 
                                src={banner.imageUrl} 
                                alt={banner.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80';
                                }}
                            />
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                {banner.badge && (
                                    <div className="mb-4">
                                        <span className="px-2.5 py-1 rounded-lg bg-primary-red text-white text-[9px] font-black tracking-widest uppercase shadow-lg">
                                            {banner.badge}
                                        </span>
                                    </div>
                                )}
                                <h2 className={`${index === 0 ? 'text-5xl' : 'text-2xl'} font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-3`}>
                                    {banner.title}
                                </h2>
                                {banner.subtitle && (
                                    <p className="text-[11px] text-white/70 font-bold max-w-[90%] line-clamp-2 uppercase tracking-wide leading-relaxed">
                                        {banner.subtitle}
                                    </p>
                                )}
                            </div>

                            {/* Glass Glow Effect */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                            </div>
                        </motion.div>
                    );
                })
            ) : (
                /* Static Fallback if no banners */
                <div 
                    style={{ minHeight: '600px' }}
                    className="md:col-span-4 md:row-span-2 flex items-center justify-between p-16 bg-[var(--card-bg)] rounded-[40px] border border-[var(--glass-border)] relative overflow-hidden group shadow-2xl bg-zinc-900"
                >
                    <div className="relative z-10 max-w-2xl text-white">
                        <span className="inline-block px-4 py-1 rounded-full bg-primary-red text-white text-[9px] font-black tracking-[0.3em] mb-6 uppercase">EXCLUSIVE</span>
                        <h1 className="text-[5rem] font-[800] leading-[1] uppercase tracking-tighter mb-6 italic">
                            DEFY <br /> <span className="text-primary-red">GRAVITY</span>
                        </h1>
                        <p className="text-sm font-medium opacity-60 mb-10 max-w-md">
                            Experience the future of gaming gear with our curated collections.
                        </p>
                        <button onClick={() => onNavigate('shop')} className="px-10 py-5 bg-primary-red text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-[0_15px_30px_rgba(255,21,116,0.4)]">
                            Get Started
                        </button>
                    </div>
                    {/* Background Blobs for Fallback */}
                    <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[var(--primary-red)] filter blur-[150px] opacity-[0.15] animate-pulse pointer-events-none" />
                </div>
            )}
        </section>

        {/* Secondary Featured Grid */}
        <section className="mt-4 pb-20">
            <div className="flex items-center justify-between mb-8 px-4">
                <h3 className="text-xl font-black uppercase italic italic tracking-tighter">Featured Releases</h3>
                <button onClick={() => onNavigate('shop')} className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-red)] hover:underline flex items-center gap-2">
                    Browse All <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar px-4">
                {featuredProducts.length === 0 ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center opacity-20 italic">
                        <Gamepad2 className="w-12 h-12 mb-4 animate-bounce" />
                        <p>Scanning the multiverse for gear...</p>
                    </div>
                ) : (
                    featuredProducts.map((product: Product) => (
                    <motion.div 
                      key={product.id}
                      whileHover={{ y: -10 }}
                      onClick={() => onNavigate('product', product.id)}
                      className="min-w-[280px] bg-[var(--card-bg)] rounded-[32px] p-6 border border-white/5 cursor-pointer shadow-sm hover:border-[var(--primary-red)]/30 transition-all"
                    >
                        <div className="aspect-square rounded-2xl overflow-hidden mb-6">
                            <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Recommended</p>
                        <h4 className="text-sm font-black uppercase italic leading-tight mb-4">{product.name}</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-black tracking-tighter">{formatPrice(product.price)}</span>
                            <button className="w-10 h-10 bg-primary-red text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-primary-red-dark">
                                <ShoppingBag className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )))}
            </div>
        </section>

      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
