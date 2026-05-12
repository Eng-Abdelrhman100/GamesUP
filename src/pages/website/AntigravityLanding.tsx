import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShoppingBag, Heart, User, Play, Download, 
  Gamepad2, Star, TrendingUp, Smartphone, Disc, HardDrive, 
  Keyboard, Headphones, Monitor, Laptop, Menu, X, ChevronRight,
  Sparkles, Globe, Shield, Zap
} from 'lucide-react';
import { categoriesAPI, productsAPI, bannersAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import controllerImg from '../../assets/antigravity_controller.png';

interface Banner {
  id: string | number;
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
  originalPrice?: number;
  discountPercentage?: number;
}

interface LandingPageProps {
  onNavigate: (page: string, productId?: string, categorySlug?: string) => void;
  onOpenCart: () => void;
}

export function AntigravityLanding({ onNavigate, onOpenCart }: LandingPageProps) {
  const { formatPrice } = useStoreSettings();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('customerSession');
    if (savedSession) {
      try {
        setCustomer(JSON.parse(savedSession).user);
      } catch (e) {
        console.error('Session error', e);
      }
    }

    const loadData = async () => {
      try {
        const [bannersData, productsData] = await Promise.all([
          bannersAPI.getAll(),
          productsAPI.getAll()
        ]);
        const mappedBanners = (bannersData.banners || bannersData || [])
          .filter((b: any) => b.is_active !== false && b.isActive !== false)
          .map((b: any) => {
            let extendedData: any = {};
            try {
              if (b.link && b.link.trim().startsWith('{')) {
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
              subtitle: extendedData.subtitle || b.subtitle || '',
              badge: extendedData.badge || b.badge || ''
            };
          });
        setBanners(mappedBanners);
        // Simulate some discounts if not present
        const processedProducts = (productsData.products || productsData || []).slice(0, 8).map((p: any) => ({
          ...p,
          originalPrice: p.price * 1.25,
          discountPercentage: 20
        }));
        setFeaturedProducts(processedProducts);
      } catch (error) {
        console.error('Load error', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const bannerInterval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % (banners.length || 1));
    }, 8000);

    return () => clearInterval(bannerInterval);
  }, [banners.length]);

  const glassStyle = "bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]";
  const neonCyan = "shadow-[0_0_20px_rgba(34,211,238,0.5)] border-cyan-400/50";
  const neonViolet = "shadow-[0_0_20px_rgba(168,85,247,0.5)] border-purple-400/50";

  return (
    <div className="relative min-h-screen bg-[#020204] text-white selection:bg-cyan-500 selection:text-black overflow-x-hidden mt-20">
      
      {/* 1. Global Background Layers */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBannerIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            <img 
              src={banners[currentBannerIndex]?.imageUrl || "/assets/red banner 3.jpg"} 
              className="w-full h-full object-cover blur-[100px] scale-110"
              alt="Atmosphere"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020204]/80 to-[#020204]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      {/* 2. Floating Header (Sticky Nav) */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`fixed top-8 left-12 right-12 z-[100] h-16 rounded-2xl flex items-center justify-between px-8 ${glassStyle}`}
      >
        <div className="flex items-center gap-12">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('home')}>
             <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center rotate-45 group-hover:rotate-180 transition-transform duration-700 shadow-[0_0_20px_rgba(255,21,116,0.8)]">
                <Play className="w-5 h-5 text-black -rotate-45 group-hover:-rotate-180 transition-transform duration-700 fill-current" />
             </div>
             <span className="text-2xl font-black tracking-tighter italic uppercase">Games Up</span>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center gap-3 bg-white/5 rounded-full px-5 py-2 border border-white/10 w-96 group focus-within:border-pink-500/50 transition-all">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-pink-400" />
            <input type="text" placeholder="Search for games..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-500" />
          </div>
        </div>

        <div className="flex items-center gap-8">
           <nav className="hidden xl:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-gray-400">
             <button onClick={() => onNavigate('shop')} className="hover:text-cyan-400 transition-colors">Categories</button>
             <button onClick={() => onNavigate('favorites')} className="hover:text-cyan-400 transition-colors">Library</button>
           </nav>
           
           <div className="flex items-center gap-4">
              <button className="p-2.5 rounded-xl hover:bg-white/10 transition-colors relative">
                <Heart className="w-5 h-5 text-zinc-400" />
              </button>
              <button onClick={onOpenCart} className="p-2.5 rounded-xl bg-cyan-500 group relative shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5 text-black" />
              </button>
              
              <div className="h-8 w-[1px] bg-white/10 mx-2" />
              
              {customer ? (
                <button onClick={() => onNavigate('profile')} className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                       <User className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="hidden sm:block text-left">
                     <p className="text-xs font-black uppercase tracking-tighter leading-none">{customer.name}</p>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase">View Profile</p>
                  </div>
                </button>
              ) : (
                <button onClick={() => onNavigate('login')} className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase italic tracking-widest rounded-xl hover:bg-cyan-500 transition-colors">
                  Authorize
                </button>
              )}
           </div>
        </div>
      </motion.nav>

      <div className="flex px-12 gap-12 relative z-10">
        
        {/* 3. Fast Launch Sidebar */}
        <aside className="hidden lg:block w-80 sticky top-32 h-[calc(100vh-160px)]">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`w-full h-full rounded-[2.5rem] p-8 flex flex-col ${glassStyle}`}
          >
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Fast Launch</h3>
               <Sparkles className="w-4 h-4 text-cyan-500" />
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
               {[
                 { name: 'Minecraft', status: 'Ready', icon: Globe },
                 { name: 'Red Dead 2', status: 'Updating', icon: Shield },
                 { name: 'Far Cry 6', status: 'Ready', icon: Zap },
                 { name: 'Mafia', status: 'Ready', icon: Monitor },
               ].map((game, i) => (
                 <motion.div 
                   key={i}
                   whileHover={{ x: 10 }}
                   className="group cursor-pointer flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-all"
                 >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all">
                       <game.icon className="w-6 h-6 text-zinc-500 group-hover:text-cyan-400" />
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-widest">{game.name}</p>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{game.status}</p>
                    </div>
                 </motion.div>
               ))}

               {/* Cyberpunk Snap-in Bar */}
               <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-cyan-400">Cyberpunk 2077</span>
                     <span>60%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "60%" }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                     />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-black uppercase italic">
                     <Download className="w-3 h-3 animate-bounce" /> Downloading Core Files...
                  </div>
               </div>
            </div>
          </motion.div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-32 pb-32">
          
          {/* 4. Antigravity Hero Section */}
          <section className="relative min-h-[700px] flex items-center justify-center rounded-[4rem] overflow-hidden border border-white/5 mt-8">
             {/* Background Atmosphere */}
             <div className="absolute inset-0 z-0">
                <img src={banners[0]?.imageUrl || "/assets/ps banner.jpg"} className="w-full h-full object-cover opacity-20 blur-sm" alt="Hero BG" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-transparent" />
             </div>

             <div className="relative z-10 text-center max-w-4xl px-8">
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-[0.5em] mb-12 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  Defy Gravity Inside Games Up
                </motion.span>

                {/* Floating Controller centerpiece */}
                <div className="relative mb-8 h-96 flex items-center justify-center">
                   {/* Neon Base Anchor */}
                   <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute bottom-1/4 w-64 h-24 bg-cyan-500/40 blur-[50px] rounded-[100%]"
                   />
                   <motion.div 
                      animate={{ y: [0, -30, 0], rotate: [-2, 2, -2] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="relative z-20"
                   >
                      <img 
                        src={controllerImg} 
                        className="w-[500px] h-auto drop-shadow-[0_35px_35px_rgba(0,0,0,0.8)]"
                        alt="Antigravity Controller"
                      />
                   </motion.div>
                </div>

                <motion.h1 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-tight mb-8 drop-shadow-2xl"
                >
                  Experience <br /> <span className="text-cyan-400">Pure Flight</span>
                </motion.h1>

                <div className="flex flex-wrap items-center justify-center gap-6">
                   <motion.button 
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onNavigate('shop')}
                      className="px-12 py-5 bg-cyan-500 text-black font-black uppercase italic tracking-widest rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:bg-white transition-all flex items-center gap-3"
                   >
                      Pre-order Now <ChevronRight className="w-5 h-5" />
                   </motion.button>
                   <motion.button 
                      whileHover={{ scale: 1.05 }}
                      className={`px-10 py-5 ${glassStyle} text-white font-black uppercase italic tracking-widest rounded-2xl flex items-center gap-3`}
                   >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <Play className="w-4 h-4 fill-current" />
                      </div>
                      Watch Reveal
                   </motion.button>
                </div>
             </div>
          </section>

          {/* 5. Games with Discounts (Floating Grid) */}
          <section>
             <div className="flex items-center justify-between mb-16 px-4">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2">Magnetic Deals</h2>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em]">Propelled by massive savings</p>
                </div>
                <div className="flex gap-4">
                   <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all">
                      <ChevronRight className="w-6 h-6 rotate-180" />
                   </button>
                   <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all">
                      <ChevronRight className="w-6 h-6" />
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 px-4">
                {featuredProducts.map((product, i) => (
                   <motion.div 
                     key={product.id}
                     whileHover={{ y: -20, rotateY: 10, rotateX: 5 }}
                     className={`group relative aspect-[3/4.5] rounded-[2.5rem] overflow-hidden cursor-pointer ${glassStyle} transition-all duration-500`}
                     onClick={() => onNavigate('product', product.id)}
                   >
                      <img 
                        src={product.image} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        alt={product.name}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      
                      {/* Discount Badge */}
                      <div className="absolute top-6 left-6 px-4 py-1.5 bg-cyan-500 text-black text-[10px] font-black uppercase italic rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                          -{product.discountPercentage}% OFF
                      </div>

                      <div className="absolute bottom-8 left-8 right-8">
                         <h3 className="text-xl font-black uppercase italic leading-none mb-3 tracking-tighter drop-shadow-lg">{product.name}</h3>
                         <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                               <span className="text-[10px] text-zinc-500 line-through font-bold">{formatPrice(product.originalPrice || 0)}</span>
                               <span className="text-2xl font-black text-white italic tracking-tighter">{formatPrice(product.price)}</span>
                            </div>
                            <button className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center group-hover:bg-cyan-500 transition-colors shadow-xl">
                               <ShoppingBag className="w-5 h-5" />
                            </button>
                         </div>
                      </div>

                      {/* Floating Light Effect */}
                      <div className="absolute -inset-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rotate-45 pointer-events-none" />
                   </motion.div>
                ))}
             </div>
          </section>
        </main>
      </div>

      {/* 6. Detached Floating Footer */}
      <motion.footer 
        whileHover={{ y: -5 }}
        className={`fixed bottom-8 left-12 right-12 z-[100] h-12 rounded-full flex items-center justify-between px-12 ${glassStyle}`}
      >
        <div className="flex items-center gap-10">
           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">© 2026 Games Up</span>
           <div className="hidden md:flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <a href="#" className="hover:text-cyan-400">Terms of Orbital Service</a>
              <a href="#" className="hover:text-cyan-400">Privacy Void</a>
              <a href="#" className="hover:text-cyan-400">Core Contact</a>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className={`px-4 py-1 rounded-full ${glassStyle} text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border-cyan-500/30`}>
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" /> All Systems Nominal
           </div>
           <div className="h-4 w-[1px] bg-white/10" />
           <div className="flex gap-4">
              <div className="w-2 h-2 bg-white/20 rounded-full" />
              <div className="w-2 h-2 bg-white/20 rounded-full" />
           </div>
        </div>
      </motion.footer>

      {/* Background Orbs */}
      <div className="fixed top-1/4 -right-32 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full z-0 pointer-events-none" />
      <div className="fixed bottom-1/4 -left-32 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full z-0 pointer-events-none" />

    </div>
  );
}

// Sidebar Scroller Logic Helper
const noScrollbarStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = noScrollbarStyles;
  document.head.appendChild(style);
}
