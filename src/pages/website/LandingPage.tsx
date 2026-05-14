import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { productsAPI, bannersAPI, categoriesAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../../components/ui/carousel';
import PremiumHero from './PremiumHero';
import { GlowingGamesUp } from './GlowingGamesUp';
import { CategoryBento } from './CategoryBento';

// Bento Assets
import plusBg from '../../assets/Bento Bg/plus bg.png';
import psnBg from '../../assets/Bento Bg/psn bg.png';
import pubgBg from '../../assets/Bento Bg/pubg bg.png';
import steamBg from '../../assets/Bento Bg/staem bg.png';

import plusPng from '../../assets/Bento pngs floating/plus.png';
import psnPng from '../../assets/Bento pngs floating/psn cards.png';
import pubgPng from '../../assets/Bento pngs floating/pubg.png';
import pubg2Png from '../../assets/Bento pngs floating/pubg 2.png';
import steamPng from '../../assets/Bento pngs floating/staem.png';

interface Banner {
  id: string | number;
  title: string;
  imageUrl: string;
  link: string;
  linkRaw?: string;
  position: number;
  isActive: boolean;
  subtitle?: string;
  badge?: string;
  linkType?: 'none' | 'url' | 'product';
  productId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category_slug?: string;
  categorySlug?: string;
  tag?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface LandingPageProps {
  onNavigate: (page: string, productId?: string, categorySlug?: string) => void;
  onOpenCart?: () => void;
}

export function LandingPage({ onNavigate, onOpenCart }: LandingPageProps) {
  const { formatPrice } = useStoreSettings();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [heroApi, setHeroApi] = useState<any>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroCount, setHeroCount] = useState(0);

  useEffect(() => {
    loadFeaturedProducts();
    loadCategories();
    loadBanners();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const response = await productsAPI.getPublic();
      const products = (response.products || []).map((p: any) => ({
        ...p,
        tag: (p.category_slug || p.categorySlug) === 'playstation' ? 'PS5 Digital' : (p.category_slug || p.categorySlug) === 'steam' ? 'Steam Key' : 'Digital'
      }));
      setFeaturedProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      const list = Array.isArray(data) ? data : (data as any)?.categories || (data as any)?.data || [];
      const active = (list || []).filter((cat: any) => (cat.is_active ?? cat.isActive) !== false);
      setCategories(active.filter((cat: any) => cat.slug !== 'gift-cards').slice(0, 6));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBanners = async () => {
    try {
      setLoadingBanners(true);
      const data = await bannersAPI.getAll();
      const mappedBanners = (data.banners || [])
        .filter((b: any) => b.is_active !== false && b.isActive !== false)
        .map((b: any) => {
          const rawLink = b.link;
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
            link: extendedData.url || rawLink,
            linkRaw: rawLink,
            subtitle: extendedData.subtitle || b.subtitle || '',
            badge: extendedData.badge || b.badge || '',
            linkType: extendedData.linkType,
            productId: extendedData.productId
          };
        });
      setBanners(mappedBanners);
    } catch (error) {
      console.error('Error loading banners:', error);
    } finally {
      setLoadingBanners(false);
    }
  };

  const getBanner = (pos: number) => banners.find(b => b.position === pos);

  const handleBannerClick = (link?: string) => {
    if (!link) return;
    
    if (link.startsWith('/product/')) {
      const productId = link.split('/product/')[1];
      onNavigate('product', productId);
    } else if (link.startsWith('/shop')) {
      const url = new URL(link, window.location.origin);
      const category = url.searchParams.get('category');
      onNavigate('shop', undefined, category || undefined);
    } else if (link.startsWith('/gift-cards')) {
      onNavigate('gift-cards');
    } else if (link === '/') {
      onNavigate('home');
    } else if (link.startsWith('http')) {
      window.open(link, '_blank');
    }
  };

  const parseHeroLink = (banner: Banner) => {
    if (banner.linkRaw && banner.linkRaw.trim().startsWith('{')) {
      try {
        const data = JSON.parse(banner.linkRaw);
        const linkType = (data.linkType as Banner['linkType']) || (data.productId ? 'product' : data.url ? 'url' : 'none');
        return {
          slot: String(data.slot || ''),
          hasLinkType: Object.prototype.hasOwnProperty.call(data, 'linkType'),
          linkType,
          url: String(data.url || ''),
          productId: String(data.productId || ''),
        };
      } catch (e) {
        return { slot: '', hasLinkType: false, linkType: 'none' as const, url: '', productId: '' };
      }
    }

    return { slot: '', hasLinkType: false, linkType: banner.link ? ('url' as const) : ('none' as const), url: banner.link || '', productId: '' };
  };

  const handleHeroSlideClick = (banner: Banner) => {
    const { linkType, url, productId } = parseHeroLink(banner);
    if (linkType === 'product' && productId) {
      onNavigate('product', productId);
      return;
    }
    if (linkType === 'url' && url) {
      handleBannerClick(url);
    }
  };

  useEffect(() => {
    if (!heroApi) return;

    const onSelect = () => {
      setHeroIndex(heroApi.selectedScrollSnap());
    };

    setHeroCount(heroApi.scrollSnapList().length);
    onSelect();
    heroApi.on('select', onSelect);
    heroApi.on('reInit', () => {
      setHeroCount(heroApi.scrollSnapList().length);
      onSelect();
    });

    return () => {
      heroApi.off('select', onSelect);
    };
  }, [heroApi]);

  useEffect(() => {
    if (!heroApi) return;
    if (heroCount < 2) return;
    const interval = setInterval(() => {
      heroApi.scrollNext();
    }, 6500);
    return () => clearInterval(interval);
  }, [heroApi, heroCount]);

  const heroSlides = banners
    .filter(b => {
      const meta = parseHeroLink(b);
      return (meta.slot === 'hero' || meta.hasLinkType === true || (b.position >= 100 && b.position < 200)) && b.isActive;
    })
    .sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary">
      <PremiumHero banners={heroSlides} onNavigate={onNavigate} loading={loadingBanners} />

      <div className="px-4 lg:px-16 pb-8 lg:pb-16 overflow-hidden">
        {/* Modernized Category Bento Grid */}
        <CategoryBento onNavigate={onNavigate} />


        {/* Dynamic Category Bento Section */}
        <section className="mb-20 category-section-wrapper">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <span className="text-surface-raised font-black text-[11px] uppercase tracking-[0.2em] mb-4 block">Store Directory</span>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Explore Categories</h2>
              <p className="text-text-tertiary text-sm mt-4 font-medium">From next-gen consoles to digital keys, find everything you need to fuel your gaming passion in our curated collections.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => {
              // Create a Bento effect by varying card sizes
              const isLarge = i === 0 || i === 3;
              return (
                <motion.div 
                  key={cat.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onNavigate('shop', undefined, cat.slug)}
                  className={`${isLarge ? 'md:col-span-2' : 'md:col-span-1'} bg-white border-2 border-border-strong/50 p-10 category-card-bento flex flex-col items-center justify-center gap-6 hover:border-surface-raised hover:shadow-4 hover:bg-surface-strong transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    {cat.icon && cat.icon.startsWith('http') ? (
                      <img src={cat.icon} alt={cat.name} className="w-24 h-24 object-contain" />
                    ) : (
                      <span className="text-8xl">{cat.icon || '🎮'}</span>
                    )}
                  </div>
                  
                  <div className="w-20 h-20 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all group-hover:scale-110 relative z-10">
                    {cat.icon && cat.icon.startsWith('http') ? (
                      <img src={cat.icon} alt={cat.name} className="w-14 h-14 object-contain" />
                    ) : (
                      <span className="text-5xl">{cat.icon || '🎮'}</span>
                    )}
                  </div>
                  <div className="text-center relative z-10">
                    <span className="text-[13px] font-black tracking-widest uppercase block mb-1">{cat.name}</span>
                    <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">Browse Store</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* New Customized Glowing Section */}
        <GlowingGamesUp />

        {/* Trending Section */}
        <section className="mb-24 section-pt">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-surface-raised font-black text-[11px] uppercase tracking-[0.2em] mb-3 block">Most Popular</span>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter">Trending Now</h2>
            </div>
            <button 
              onClick={() => onNavigate('shop')}
              className="bg-surface-strong text-text-primary font-black text-[10px] px-6 py-3 rounded-full hover:bg-surface-raised hover:text-white transition-all uppercase tracking-widest border border-border-strong"
            >
              View Full Store
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {featuredProducts.slice(0, 8).map((game, i) => (
              <motion.div 
                key={game.id} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                onClick={() => onNavigate('product', game.id)}
                className="product-card-glass group cursor-pointer"
              >
                {/* Full-bleed Background Image */}
                <img 
                  src={game.image} 
                  alt={game.name} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] cubic-bezier(0.16, 1, 0.3, 1)"
                />
                
                {/* Cinematic Glass Overlay (Hardened for lower-mounted text) */}
                <div className="glass-gradient-overlay" />
                
                {/* Context-aware Badges (Floating Top Left) */}
                <div className="absolute badge-floating z-10 flex gap-2">
                  <span className="badge-glass-pill bg-surface-raised/20 !text-surface-raised border-surface-raised/30">Trending</span>
                </div>

                {/* Content Overlayed FIXED at the BOTTOM */}
                <div className="absolute inset-0 z-10 p-8 flex flex-col justify-end gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-black text-2xl glass-title-white leading-tight uppercase tracking-tight line-clamp-2">
                      {game.name}
                    </h4>
                    <span className="glass-price-capsule flex-shrink-0">
                      {formatPrice(game.price)}
                    </span>
                  </div>
                  
                  <p className="glass-desc-white text-[13px] font-medium leading-relaxed line-clamp-2 mb-1">
                    Experience the next level of gaming with {game.name}. Get instant access to Digital Keys and more.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-glass-pill">Top Pick</span>
                    <span className="badge-glass-pill text-surface-raised">Only 2 left</span>
                  </div>
                  
                  <button className="btn-glass-white mt-1 flex items-center justify-center gap-2 group/btn">
                    ADD TO CART
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>

      {/* Full Width Promo Section with Curved Corners */}
      <div className="px-4 lg:px-16 mb-32">
        <section className="relative h-[480px] lg:h-[600px] w-full promo-banner-premium flex items-center">
          <img 
            src="https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=1200" 
            alt="Crimson Desert" 
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          <div className="promo-banner-darken" />
          <div className="promo-banner-overlay" />
          
          <div className="relative z-10 p-8 lg:p-24 max-w-2xl text-white">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="bg-surface-raised text-white text-[10px] lg:text-[12px] font-black px-6 py-2 rounded-full w-fit mb-8 uppercase tracking-[0.3em] block border border-white/20 shadow-lg"
            >
              Coming Soon
            </motion.span>
            <h2 className="text-4xl lg:text-7xl font-black mb-8 uppercase tracking-tighter leading-none">
              Crimson <br/>Desert
            </h2>
            <p className="text-white/80 text-sm lg:text-lg mb-12 leading-relaxed font-medium max-w-lg">
              Experience the cinematic saga of a mercenary fighting for survival in the vast continent of Pywel. A next-generation open-world action-adventure.
            </p>
            <button 
              onClick={() => onNavigate('shop')}
              className="bg-surface-raised text-white px-10 lg:px-16 py-4 lg:py-6 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all w-fit shadow-4 uppercase tracking-tighter text-sm lg:text-base flex items-center gap-3 group/btn"
            >
              PRE-ORDER DETAILS
              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
