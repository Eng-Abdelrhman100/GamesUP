"use client";
 
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { GlowingEffect } from "../../components/ui/glowing-effect";

// Assets
import plusBg from "../../assets/Bento Bg/plus bg.png";
import psnBg from "../../assets/Bento Bg/psn bg.png";
import pubgBg from "../../assets/Bento Bg/pubg bg.png";
import steamBg from "../../assets/Bento Bg/staem bg.png";

import plusPng from "../../assets/Bento pngs floating/plus.png";
import psnPng from "../../assets/Bento pngs floating/psn cards.png";
import pubgPng from "../../assets/Bento pngs floating/pubg.png";
import pubg2Png from "../../assets/Bento pngs floating/pubg 2.png";
import steamPng from "../../assets/Bento pngs floating/staem.png";

interface CategoryBentoProps {
  onNavigate: (page: string, productId?: string, categorySlug?: string) => void;
}

export function CategoryBento({ onNavigate }: CategoryBentoProps) {
  const brandRed = "#dc2626";

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 mb-20">
      
      {/* 1. Gameshare Accounts - Top Wide */}
      <BentoCard
        className="col-span-2 lg:col-span-4"
        minHeight="420px"
        bgImage={pubgBg}
        title="Gameshare Accounts"
        subtitle="Primary • Secondary • Full"
        badge="EXPLORE"
        onClick={() => onNavigate("shop", undefined, "gameshare")}
        images={[
          { src: pubgPng, className: "bottom-[-20px] lg:bottom-[-40px] right-[-20px] lg:right-[-40px] w-[220px] lg:w-[500px]", transform: "translateX(20px) translateY(20px) scale(0.8)", zIndex: 10 },
          { src: pubg2Png, className: "bottom-[-10px] lg:bottom-[-20px] right-[100px] lg:right-[180px] w-[140px] lg:w-[280px]", transform: "translateX(10px) translateY(10px) scale(0.7)", zIndex: 9, opacity: 0.7 }
        ]}
      />

      {/* 2. PlayStation Plus */}
      <BentoCard
        className="col-span-1 lg:col-span-2"
        minHeight="480px"
        bgImage={plusBg}
        title="PlayStation Plus"
        subtitle="Essential • Extra • Deluxe"
        badge="EXPLORE"
        onClick={() => onNavigate("shop", undefined, "playstation-plus")}
        images={[
          { src: plusPng, className: "bottom-[-20px] lg:bottom-[-40px] right-[-20px] lg:right-[-40px] w-[180px] lg:w-[320px]", transform: "translateX(20px) translateY(20px) scale(0.8) rotate(-5deg)", zIndex: 10 }
        ]}
      />

      {/* 3. Steam */}
      <BentoCard
        className="col-span-1 lg:col-span-2"
        minHeight="480px"
        bgImage={steamBg}
        title="Steam"
        subtitle="Accounts • Keys"
        badge="EXPLORE"
        onClick={() => onNavigate("shop", undefined, "steam")}
        showArrow
        images={[
          { src: steamPng, className: "bottom-[-20px] lg:bottom-[-40px] right-[-20px] lg:right-[-40px] w-[180px] lg:w-[320px]", transform: "translateX(20px) translateY(20px) scale(0.8)", zIndex: 10 }
        ]}
      />

      {/* 4. PlayStation Gift Cards */}
      <BentoCard
        className="col-span-1 lg:col-span-2"
        minHeight="480px"
        bgImage={psnBg}
        title="Gift Cards"
        subtitle="US • UK • KSA • UAE"
        badge="EXPLORE"
        onClick={() => onNavigate("shop", undefined, "playstation-network")}
        images={[
          { src: psnPng, className: "bottom-[-20px] lg:bottom-[-40px] right-[-20px] lg:right-[-40px] w-[180px] lg:w-[320px]", transform: "translateX(20px) translateY(20px) rotate(5deg)", zIndex: 10 }
        ]}
      />

      {/* 5. iTunes - Gradient Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => onNavigate("shop")}
        className="col-span-1 lg:col-span-2 overflow-hidden relative group cursor-pointer bg-gradient-to-br from-rose-500 to-orange-400 isolation-isolate"
        style={{ minHeight: "480px", borderRadius: '64px' }}
      >
        <GlowingEffect variant="red" />
        <div className="absolute inset-0 p-6 lg:p-10 flex flex-col justify-start z-[20]">
          <div className="relative w-fit bg-black/50 backdrop-blur-xl rounded-full px-8 py-4 border border-white/20">
            <span className="font-black text-[10px] lg:text-[11px] uppercase tracking-[0.3em] mb-1.5 block text-white opacity-80">EXPLORE</span>
            <h3 className="text-xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-1">iTunes</h3>
            <p className="text-white font-bold text-[9px] lg:text-[11px] uppercase tracking-[0.25em]">Global Gift Cards</p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-all z-10">
          <ArrowRight className="w-8 h-8 text-white" />
        </div>
      </motion.div>
    </div>
  );
}

interface BentoCardProps {
  className?: string;
  minHeight: string;
  bgImage: string;
  title: string;
  subtitle: string;
  badge: string;
  onClick: () => void;
  showArrow?: boolean;
  images: Array<{
    src: string;
    className: string;
    transform: string;
    zIndex: number;
    opacity?: number;
  }>;
}

function BentoCard({ className, minHeight, bgImage, title, subtitle, badge, onClick, showArrow, images }: BentoCardProps) {
  const radius = "64px";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={onClick}
      className={`overflow-hidden relative group cursor-pointer bg-black isolation-isolate ${className}`}
      style={{ minHeight, borderRadius: radius }}
    >
      <GlowingEffect variant="red" />
      
      <img
        src={bgImage}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover object-center opacity-90 group-hover:scale-105 transition-all duration-[3s] ease-out z-0"
        style={{ borderRadius: radius }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/20 to-transparent z-[1]" style={{ borderRadius: radius }} />

      {showArrow && (
        <div className="absolute top-8 right-8 lg:top-12 lg:right-12 w-10 h-10 lg:w-16 lg:h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform border border-white/20 z-10">
          <ArrowRight className="w-5 h-5 lg:w-8 lg:h-8" />
        </div>
      )}

      {/* Content Layer - MOVED TO TOP LEFT to avoid PNG collision */}
      <div className="absolute inset-0 p-6 lg:p-10 flex flex-col justify-start z-[20]">
        <div className="relative w-fit bg-black/50 backdrop-blur-xl rounded-full px-8 py-4 border border-white/20">
          <span 
            className="font-black text-[10px] lg:text-[11px] uppercase tracking-[0.3em] mb-1.5 block text-white opacity-80"
          >
            {badge}
          </span>
          <h3 className="text-xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-1">
            {title}
          </h3>
          <p className="text-white font-bold text-[9px] lg:text-[11px] uppercase tracking-[0.25em]">{subtitle}</p>
        </div>
      </div>

      {/* PNG Assets - STRICT BOTTOM RIGHT SYNCED */}
      {images.map((img, i) => (
        <motion.img
          key={i}
          src={img.src}
          alt={`${title} element ${i}`}
          initial={{ opacity: img.opacity ?? 1, transform: img.transform }}
          whileHover={{ opacity: 1, transform: "translateX(0) translateY(0) scale(1) rotate(0deg)" }}
          className={`absolute h-auto object-contain pointer-events-none drop-shadow-2xl transition-all duration-1000 ${img.className}`}
          style={{ 
            zIndex: img.zIndex, 
            transitionDelay: `${i * 100}ms`
          }}
        />
      ))}
    </motion.div>
  );
}
