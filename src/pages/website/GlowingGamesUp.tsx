"use client";
// Absolute Red (#dc2626) Bento with Cinematic Spacing and Scaled Typography

import { Box, Lock, Zap, Shield, Sparkles } from "lucide-react";
import { GlowingEffect } from "../../components/ui/glowing-effect";

export function GlowingGamesUp() {
  const brandRed = '#dc2626';
  
  const cardBaseStyle: React.CSSProperties = {
    borderRadius: '64px',
    border: `2px solid rgba(220, 38, 38, 0.08)`,
    backgroundColor: '#ffffff',
    minHeight: '280px',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  return (
    <section className="py-48 bg-white relative">
      <div className="max-w-[1550px] mx-auto px-8 relative z-10">
        <div className="pt-32 mb-32 text-center pb-20">
          <h2 className="text-[5rem] lg:text-[10rem] font-black text-black uppercase tracking-tighter mb-4 leading-[0.85]">
            Why Choose <br className="hidden lg:block"/> <span style={{ color: brandRed }}>Games Up</span>
          </h2>
          <p className="text-black/40 font-bold text-lg lg:text-xl max-w-2xl mx-auto uppercase tracking-[0.2em]">
            The trusted platform for elite gaming assets.
          </p>
        </div>

        {/* 12-column grid with floating assets */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
          
          <GridItem
            style={{ ...cardBaseStyle, gridColumn: 'span 7 / span 7' }}
            icon={<Zap className="h-10 w-10" style={{ color: brandRed }} />}
            title="Ultra-Fast Delivery"
            description="Fulfillment in less than 30 seconds, 24/7."
            image="/src/assets/Bento pngs floating/psn cards.png"
          />

          <GridItem
            style={{ ...cardBaseStyle, gridColumn: 'span 5 / span 5' }}
            icon={<Shield className="h-10 w-10" style={{ color: brandRed }} />}
            title="Ironclad Security"
            description="Enterprise-level encryption protecting you."
            image="/src/assets/Bento pngs floating/staem.png"
          />

          <GridItem
            style={{ ...cardBaseStyle, gridColumn: 'span 4 / span 4' }}
            icon={<Lock className="h-10 w-10" style={{ color: brandRed }} />}
            title="Elite Access"
            description="Exclusive global cards and rare accounts."
            image="/src/assets/Bento pngs floating/plus.png"
          />

          <GridItem
            style={{ ...cardBaseStyle, gridColumn: 'span 4 / span 4' }}
            icon={<Sparkles className="h-10 w-10" style={{ color: brandRed }} />}
            title="Hand-Verified"
            description="Rigorous multi-step verification process."
            image="/src/assets/Bento pngs floating/pubg.png"
          />

          <GridItem
            style={{ ...cardBaseStyle, gridColumn: 'span 4 / span 4' }}
            icon={<Box className="h-10 w-10" style={{ color: brandRed }} />}
            title="24/7 Support"
            description="Gaming specialists available 24/7."
            image="/src/assets/Bento pngs floating/pubg 2.png"
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) {
          .grid-cols-12 > div {
            grid-column: span 12 / span 12 !important;
            padding: 2.5rem !important;
            min-height: 240px !important;
          }
        }
        .bento-card:hover {
          border-color: rgba(220, 38, 38, 0.3) !important;
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(220, 38, 38, 0.08);
        }
        .bento-card:hover img {
          transform: translateX(10px) translateY(10px) scale(0.9) rotate(0deg) !important;
        }
      `}} />
    </section>
  );
}

interface GridItemProps {
  style?: React.CSSProperties;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  image?: string;
}

const GridItem = ({ style, icon, title, description, image }: GridItemProps) => {
  return (
    <div style={style} className="bento-card group cursor-default">
      {/* Background Glow Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <GlowingEffect />
      </div>

      {/* Content Layer */}
      <div className="relative z-20 flex flex-col h-full">
        <div className="mb-4 transition-all duration-700 group-hover:scale-110">
          {icon}
        </div>
        <div className="pt-6">
          <h3 className="font-sans text-2xl lg:text-3xl font-black text-black uppercase tracking-tighter mb-2 leading-none">
            {title}
          </h3>
          <p className="font-sans text-base lg:text-lg text-black/50 font-bold leading-tight uppercase tracking-tight">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
