import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

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

interface PremiumHeroProps {
  banners: Banner[];
  onNavigate: (page: string, productId?: string) => void;
  loading?: boolean;
}

const PremiumHero: React.FC<PremiumHeroProps> = ({ banners, onNavigate, loading }) => {
  const [progress, setProgress] = useState(0);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [progressColor, setProgressColor] = useState('#ff5b79');
  const [activeIndex, setActiveIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, skipSnaps: false }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  const onSelect = useCallback((emblaApi: any) => {
    const index = emblaApi.selectedScrollSnap();
    setActiveIndex(index);
    
    // Assign theme colors based on index
    const themes = [
      { bg: '#ffffff', progress: '#ff3b5c' },
      { bg: '#ffffff', progress: '#6366f1' },
      { bg: '#ffffff', progress: '#10b981' },
    ];
    const theme = themes[index % themes.length];
    setBgColor(theme.bg);
    setProgressColor(theme.progress);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    
    // Progress bar simulation
    let interval: any;
    const startProgress = () => {
        setProgress(0);
        interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 0;
                return prev + (100 / 50); // 5 seconds = 50 steps of 100ms
            });
        }, 100);
    };
    
    startProgress();
    emblaApi.on('select', () => {
        clearInterval(interval);
        startProgress();
    });

    return () => {
        clearInterval(interval);
    };
  }, [emblaApi, onSelect]);

  const parseHeroLink = (banner: Banner) => {
    if (banner.linkRaw && banner.linkRaw.trim().startsWith('{')) {
      try {
        const data = JSON.parse(banner.linkRaw);
        return {
          linkType: (data.linkType as Banner['linkType']) || (data.productId ? 'product' : data.url ? 'url' : 'none'),
          url: String(data.url || ''),
          productId: String(data.productId || ''),
        };
      } catch (e) {
        return { linkType: 'none' as const, url: '', productId: '' };
      }
    }
    return { linkType: banner.link ? ('url' as const) : ('none' as const), url: banner.link || '', productId: '' };
  };

  const handleHeroSlideClick = (banner: Banner) => {
    const { linkType, url, productId } = parseHeroLink(banner);
    if (linkType === 'product' && productId) {
      onNavigate('product', productId);
      return;
    }
    if (linkType === 'url' && url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        onNavigate('shop'); // Fallback
      }
    }
  };

  if (loading || banners.length === 0) {
    return (
      <section className="premium-hero-container relative w-full h-[80vh] flex items-center justify-center bg-[#111]">
        <div className="w-[90vw] max-w-[1100px] h-full rounded-[50px] bg-zinc-800 animate-pulse flex items-center justify-center">
            <div className="text-white/80 font-black uppercase italic tracking-widest">Loading Premium Experience...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-hero-container relative w-full overflow-visible py-6" style={{ backgroundColor: bgColor, transition: 'background-color 0.8s ease' }}>
      {/* Top Progress Bar */}
      <div className="autoplay-progress-bar" style={{ width: `${progress}%`, backgroundColor: progressColor, transition: 'width 0.1s linear' } as any}></div>

      <div className="max-w-[1500px] mx-auto px-4 relative">
        {/* Horizontal-only overflow clipping container */}
        <div className="relative" style={{ overflow: 'clip', overflowClipMargin: '150px' }}>
          <div ref={emblaRef}>
            <div className="flex py-6">
            {banners.map((banner, index) => {
              const themes = [
                { bg: '#ffffff', progress: '#ff3b5c' },
                { bg: '#ffffff', progress: '#6366f1' },
                { bg: '#ffffff', progress: '#10b981' },
              ];
              const theme = themes[index % themes.length];
              const isActive = activeIndex === index;

              return (
                <div key={banner.id} className="flex-[0_0_100%] min-w-0 pl-4 relative">
                  <motion.div 
                    animate={{ 
                        scale: isActive ? 1 : 0.9,
                        opacity: isActive ? 1 : 0.5,
                        rotateY: isActive ? 0 : (index > activeIndex ? 15 : -15)
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className={`premium-card slide-${(index % 3) + 1} group`}
                  >
                     {/* Background Image */}
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-[50px]">
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-[5s] ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/30 to-black/80"></div>
                    </div>

                    {/* SVG Decorations */}
                    <div className="svg-wrapper pointer-events-none">
                      {index % 3 === 0 && <Slide1SVG color={theme.progress} />}
                      {index % 3 === 1 && <Slide2SVG color={theme.progress} />}
                      {index % 3 === 2 && <Slide3SVG color={theme.progress} />}
                    </div>

                    <div className="card-content relative z-10">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="card-sub-title" 
                        style={{ color: theme.progress }}
                      >
                        {banner.badge || `#${index + 1} Featured`}
                      </motion.div>
                      
                      <motion.h2 
                        className="card-title" 
                        data-text={banner.title.toUpperCase()} 
                      >
                        {banner.title}
                      </motion.h2>
                      
                      <motion.p className="card-description text-white/80">
                        {banner.subtitle || 'Experience the next generation of gaming content and digital services.'}
                      </motion.p>
                      
                      <div className="card-cta">
                        <button 
                          onClick={() => handleHeroSlideClick(banner)}
                          className="cta-button" 
                          style={{ backgroundColor: theme.progress }}
                        >
                          Explore Now
                        </button>
                      </div>
                    </div>

                    <div className="card-ghost-info relative z-10">
                      <span style={{ backgroundColor: theme.progress }}></span>
                      <div className="ghost-name font-black tracking-tighter italic text-white">GAMES UP</div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50">Premium Platform</div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

        {/* Custom Navigation */}
        <div className="premium-slider-button premium-slider-button-prev" onClick={() => emblaApi?.scrollPrev()}>
          <SliderArrowIcon progressColor={progressColor} />
        </div>
        <div className="premium-slider-button premium-slider-button-next" onClick={() => emblaApi?.scrollNext()}>
          <SliderArrowIcon progressColor={progressColor} isNext />
        </div>

        {/* Custom Pagination */}
        <div className="premium-swiper-pagination !bottom-10">
            {banners.map((_, i) => (
                <button 
                    key={i} 
                    className={`swiper-pagination-bullet ${activeIndex === i ? 'swiper-pagination-bullet-active' : ''}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                />
            ))}
        </div>
      </div>

      <div className="autoplay-progress-circle" style={{ color: progressColor }}>
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" style={{ stroke: progressColor, strokeDashoffset: `calc(125.6px * (1 - ${progress / 100}))` } as any}></circle>
        </svg>
        <span>{Math.ceil((100 - progress) / 20)}s</span>
      </div>

      <div className="mouse-scroll" style={{ color: progressColor }}>
        <div className="mouse">
          <div className="roll" style={{ backgroundColor: progressColor }}></div>
          <div className="rollshadow"></div>
        </div>
        scroll for next
      </div>
    </section>
  );
};

const Slide1SVG = ({ color }: { color: string }) => (
    <svg className="floating" width="600" height="600" viewBox="0 0 1172 1024" fill="none">
        <circle cx="586" cy="512" r="300" fill={color} opacity="0.1" />
        <path d="M586 212 L886 512 L586 812 L286 512 Z" stroke={color} strokeWidth="2" opacity="0.2" />
    </svg>
);

const Slide2SVG = ({ color }: { color: string }) => (
    <svg className="floating" width="600" height="600" viewBox="0 0 725 621" fill="none">
        <rect x="162" y="110" width="400" height="400" rx="100" stroke={color} strokeWidth="2" opacity="0.1" />
        <circle cx="362" cy="310" r="150" fill={color} opacity="0.05" />
    </svg>
);

const Slide3SVG = ({ color }: { color: string }) => (
    <svg className="floating swing" width="600" height="600" viewBox="0 0 1151 1024" fill="none">
        <path d="M200 200 L800 500 L200 800 Z" fill={color} opacity="0.08" />
        <circle cx="400" cy="500" r="100" stroke={color} strokeWidth="2" opacity="0.2" />
    </svg>
);

const SliderArrowIcon = ({ progressColor, isNext }: { progressColor: string, isNext?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 350 160 90" className={isNext ? 'rotate-180' : ''} style={{ width: '100px' }}>
        <g>
            <circle cx="42" cy="42" r="40" stroke={progressColor} strokeWidth="2" fill="none" />
            <path d="M.983,6.929,4.447,3.464.983,0,0,.983,2.482,3.464,0,5.946Z" fill={progressColor} transform="translate(55, 38) scale(1.5)" />
            <path d="M80,0H0" stroke={progressColor} strokeWidth="2" transform="translate(45, 42)" />
        </g>
    </svg>
);

export default PremiumHero;
