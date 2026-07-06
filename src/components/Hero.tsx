import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronLeft, ChevronRight, MessageSquare, Facebook, Instagram, Twitter } from 'lucide-react';
import { bannersAPI, normalizeImageSrc } from '../utils/api';

interface HeroProps {
  games?: any[];
  onProductClick?: (game: any) => void;
  onShopNow?: () => void;
}

interface Slide {
  id: string | number;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  linkType: 'none' | 'product' | 'url';
  productId: string;
  url: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 'default-1',
    title: 'CALL OF DUTY',
    subtitle: 'Call of Duty is a first-person shooter video game franchise published by Activision. Starting out in 2003, it first focused on games set in World War II. The most recent title, Call of Duty: Modern Warfare, was released on October 25, 2019.',
    badge: 'MODERN WARFARE',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920&auto=format&fit=crop',
    linkType: 'none',
    productId: '',
    url: ''
  },
  {
    id: 'default-2',
    title: 'PLAYSTATION 5 PRO',
    subtitle: 'Experience the next generation of gaming with high-fidelity graphics, faster loading times, and immersive sensory feedback.',
    badge: 'NEXT GEN HARDWARE',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1920&auto=format&fit=crop',
    linkType: 'none',
    productId: '',
    url: ''
  },
  {
    id: 'default-3',
    title: 'EA SPORTS FC 25',
    subtitle: 'The World\'s Game is here. Experience unparalleled realism with HyperMotionV, PlayStyles optimized by Opta, and a revolutionized Frostbite™ Engine.',
    badge: 'SPORTS ARENA',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1920&auto=format&fit=crop',
    linkType: 'none',
    productId: '',
    url: ''
  }
];

export const Hero = ({ games = [], onProductClick, onShopNow }: HeroProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHeroSlides() {
      try {
        const data = await bannersAPI.getPublic();
        const activeBanners = (data.banners || []).map((b: any) => {
          let meta: any = {};
          try {
            if (b.link && b.link.trim().startsWith('{')) {
              meta = JSON.parse(b.link);
            } else {
              meta = { url: b.link, linkType: b.link ? 'url' : 'none' };
            }
          } catch (e) {
            meta = { url: b.link, linkType: b.link ? 'url' : 'none' };
          }
          
          return {
            id: b.id,
            title: b.title || '',
            subtitle: meta.subtitle || b.subtitle || '',
            badge: meta.badge || b.badge || '',
            imageUrl: normalizeImageSrc(b.image_url || b.imageUrl || ''),
            linkType: meta.linkType || 'none',
            productId: meta.productId || '',
            url: meta.url || '',
            slot: meta.slot || '',
            position: Number(b.position)
          };
        })
        .filter((b: any) => b.slot === 'hero' || (b.position >= 100 && b.position < 200));

        if (activeBanners.length > 0) {
          // Sort by position just in case
          activeBanners.sort((a: any, b: any) => a.position - b.position);
          setSlides(activeBanners);
        } else {
          setSlides(DEFAULT_SLIDES);
        }
      } catch (err) {
        console.error('Failed to load public banners for hero slider:', err);
        setSlides(DEFAULT_SLIDES);
      } finally {
        setLoading(false);
      }
    }

    loadHeroSlides();
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 9000); // 9 seconds
    return () => clearInterval(interval);
  }, [slides]);

  if (loading) {
    return (
      <div className="relative min-h-[85vh] bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-black tracking-widest text-text-secondary uppercase">Loading Arena...</span>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  if (!currentSlide) return null;

  const nextIndex = (currentIndex + 1) % slides.length;
  const nextSlide = slides[nextIndex];

  const handleCtaClick = (slide: Slide) => {
    if (slide.linkType === 'product' && slide.productId && games.length > 0 && onProductClick) {
      const game = games.find((g) => String(g.id) === String(slide.productId));
      if (game) {
        onProductClick(game);
        return;
      }
    }
    
    if (slide.linkType === 'url' && slide.url) {
      if (slide.url.startsWith('http')) {
        window.open(slide.url, '_blank', 'noreferrer');
      } else {
        window.history.pushState({}, '', slide.url);
        window.dispatchEvent(new Event('popstate'));
      }
      return;
    }

    if (onShopNow) {
      onShopNow();
    }
  };

  // Social icon details
  const socialLinks = [
    { icon: Facebook, url: 'https://facebook.com/gamesup.eg', label: 'Facebook' },
    { icon: Twitter, url: 'https://twitter.com', label: 'Twitter' },
    { icon: Instagram, url: 'https://instagram.com/gamesup.eg', label: 'Instagram' },
    { icon: MessageSquare, url: 'https://wa.me/201008480536', label: 'WhatsApp' }
  ];

  return (
    <section className="relative min-h-screen md:h-screen w-full bg-bg-primary overflow-hidden flex flex-col justify-end font-sans">
      {/* Background Image Slider */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Visual Overlays matching the dark/light thematic design */}
            <div className="absolute inset-0 bg-black/15 dark:bg-black/45 mix-blend-multiply"></div>
            {/* Diagonal left-to-right gradient for text readability */}
            <div className="absolute inset-y-0 left-0 w-full md:w-[70%] bg-gradient-to-r from-bg-primary via-bg-primary/95 dark:via-bg-primary/85 to-transparent z-1"></div>
            {/* Bottom-to-top gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-primary via-bg-primary/80 dark:via-bg-primary/70 to-transparent z-1"></div>
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-bg-primary/40 dark:to-bg-primary/90 z-1 pointer-events-none"></div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Grid Pattern overlay for tech/tactical aesthetic */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] z-[2] pointer-events-none"></div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12 flex-1 flex flex-col justify-center pt-24 pb-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          {/* Slide Description Panel */}
          <div className="lg:col-span-8 flex flex-col items-start text-left max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -20 }
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Badge/Tagline */}
                {currentSlide.badge && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/25 px-4 py-1.5 rounded-full"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
                    <span className="text-[9px] md:text-[10px] font-black tracking-[0.3em] text-brand-red uppercase italic">
                      {currentSlide.badge}
                    </span>
                  </motion.div>
                )}

                {/* Main Heading */}
                <h2 className="text-5xl sm:text-7xl md:text-[90px] font-black tracking-tighter text-text-primary uppercase italic leading-[0.9] font-display drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {currentSlide.title}
                </h2>

                {/* Subtitle / Description card */}
                {currentSlide.subtitle && (
                  <div className="bg-[#0f0f12]/5 dark:bg-[#0f0f12]/50 backdrop-blur-lg border border-black/5 dark:border-white/5 p-6 rounded-2xl max-w-xl text-left shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-red"></div>
                    <h4 className="text-brand-red text-[10px] font-black tracking-[0.25em] uppercase mb-2 italic">
                      ABOUT THE GAME
                    </h4>
                    <p className="text-xs md:text-sm text-text-secondary leading-relaxed line-clamp-4 font-medium tracking-wide">
                      {currentSlide.subtitle}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-4 items-center">
                  <button
                    onClick={() => handleCtaClick(currentSlide)}
                    className="relative group overflow-hidden bg-text-primary text-bg-primary font-black uppercase text-xs tracking-widest px-10 py-4.5 hover:text-white transition-all duration-300 transform skew-x-[-12deg] shadow-lg shadow-black/10 dark:shadow-black/40 border border-text-primary active:scale-95"
                  >
                    {/* Background hover slide */}
                    <div className="absolute inset-0 bg-brand-red transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0"></div>
                    <span className="relative z-10 skew-x-[12deg] flex items-center gap-2">
                      ORDER NOW <Play className="w-3.5 h-3.5 fill-current" />
                    </span>
                  </button>
                  
                  {onShopNow && (
                    <button
                      onClick={onShopNow}
                      className="group overflow-hidden border border-text-primary/20 text-text-primary font-black uppercase text-xs tracking-widest px-8 py-4.5 hover:bg-text-primary/5 transition-all duration-300 transform skew-x-[-12deg] active:scale-95"
                    >
                      <span className="skew-x-[12deg]">BROWSE LIBRARY</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Social Media Float Menu (Bottom Left Side) */}
      <div className="absolute bottom-10 left-6 md:left-12 z-20 flex items-center gap-4">
        <div className="hidden md:flex flex-col gap-3 bg-[#0d0d11]/5 dark:bg-[#0d0d11]/80 backdrop-blur-md border border-black/5 dark:border-white/5 p-2 rounded-xl shadow-2xl">
          {socialLinks.map((s, idx) => {
            const Icon = s.icon;
            return (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-brand-red/10 dark:hover:bg-brand-red/20 transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
        
        {/* Carousel Slide Indicators */}
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                currentIndex === idx ? 'w-8 bg-brand-red' : 'w-2 bg-text-primary/20 hover:bg-text-primary/40'
              }`}
            ></button>
          ))}
        </div>
      </div>

      {/* Up Next Card Slider Navigation (Bottom Right Side) */}
      {slides.length > 1 && (
        <div className="hidden lg:block absolute bottom-10 right-12 z-20">
          <div className="text-right mb-2">
            <span className="text-[10px] font-black tracking-[0.3em] text-text-primary/40 uppercase">UP NEXT</span>
          </div>
          <button
            onClick={() => setCurrentIndex(nextIndex)}
            className="group relative flex items-end w-80 h-44 rounded-2xl overflow-hidden border border-text-primary/10 shadow-2xl hover:border-brand-red/50 transition-all duration-500 hover:scale-[1.03]"
          >
            {/* Slide Thumbnail */}
            <img
              src={nextSlide.imageUrl}
              alt={nextSlide.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/95 via-bg-primary/40 dark:from-black dark:via-black/40 to-transparent z-1"></div>

            {/* Hover Play/Forward Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-2">
              <div className="w-12 h-12 rounded-full bg-bg-primary/40 backdrop-blur-md flex items-center justify-center border border-text-primary/20 group-hover:bg-brand-red group-hover:scale-110 group-hover:border-transparent transition-all duration-300 shadow-xl">
                <Play className="w-4 h-4 text-text-primary fill-current ml-0.5" />
              </div>
            </div>

            {/* Slide Metadata */}
            <div className="relative p-4 z-10 w-full text-left">
              {nextSlide.badge && (
                <span className="text-[9px] font-black text-brand-red tracking-widest uppercase italic block mb-1">
                  {nextSlide.badge}
                </span>
              )}
              <h4 className="text-sm font-bold text-text-primary uppercase truncate">
                {nextSlide.title}
              </h4>
            </div>
          </button>
        </div>
      )}
    </section>
  );
};
