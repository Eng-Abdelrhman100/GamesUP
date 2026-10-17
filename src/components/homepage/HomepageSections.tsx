import { motion } from 'motion/react';
import { ChevronRight, Gamepad2, Gift, Crown, Timer, ShieldCheck, Zap, Headset, BadgeCheck, MessageSquarePlus } from 'lucide-react';
import type { Game } from '../../types';
import { CategoryRow } from '../CategoryRow';

interface RowProps {
  games: Game[];
  onProductClick: (game: Game) => void;
  onSeeAll: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

// 02 — Shop by Platform: PS5 · PS4 · Xbox · PC
const PLATFORMS = [
  { id: 'PS5', title: 'PS5', desc: 'Next-gen PlayStation 5 titles', icon: Gamepad2 },
  { id: 'PS4', title: 'PS4', desc: 'PlayStation 4 library', icon: Gamepad2 },
  { id: 'Xbox', title: 'Xbox', desc: 'Xbox One & Series titles', icon: Gamepad2 },
  { id: 'PC', title: 'PC', desc: 'Steam & PC keys', icon: Gamepad2 },
];

export function ShopByPlatform({ onSelect }: { onSelect: (platform: string) => void }) {
  return (
    <section className="py-16 md:py-20 bg-bg-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-3 italic">Shop by Platform</p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <h2 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter font-display uppercase italic leading-none">
            Platforms<span className="text-brand-red">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary">PS5 · PS4 · Xbox · PC</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {PLATFORMS.map(({ id, title, desc, icon: Icon }, idx) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => onSelect(id)}
              className="group text-left bg-bg-card border border-border-subtle rounded-3xl p-6 md:p-8 hover:border-brand-red/50 transition-all active:scale-[0.98]"
            >
              <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl w-fit mb-5 text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-[var(--text-primary)]">{title}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mt-1 mb-4">{desc}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-red">
                Shop now <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

// 04 — GTA VI dedicated collection / pre-order landing
export function GtaCollectionSection({ games, onProductClick, onSeeAll, favorites, onToggleFavorite }: RowProps) {
  if (!games.length) return null;
  return (
    <CategoryRow
      title="GTA VI — PRE-ORDER COLLECTION"
      games={games}
      onProductClick={onProductClick}
      onSeeAll={onSeeAll}
      favorites={favorites}
      onToggleFavorite={onToggleFavorite}
    />
  );
}

// 05 — PlayStation Plus subscription plans and durations
export function PsPlusSection({ games, onProductClick, onSeeAll, favorites, onToggleFavorite }: RowProps) {
  if (!games.length) return null;
  return (
    <div>
      <CategoryRow
        title="PLAYSTATION PLUS"
        games={games}
        onProductClick={onProductClick}
        onSeeAll={onSeeAll}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
      />
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 -mt-4 mb-4 flex flex-wrap gap-2">
        {['Essential', 'Extra', 'Deluxe'].map((tier) => (
          <span key={tier} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-border-subtle text-text-secondary">
            {tier}
          </span>
        ))}
        {['1 Month', '3 Months', '1 Year'].map((d) => (
          <span key={d} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

// 06 — Gift Cards denominations and regions
export function GiftCardsSection({ games, onProductClick, onSeeAll, favorites, onToggleFavorite }: RowProps) {
  if (!games.length) return null;
  return (
    <div>
      <CategoryRow
        title="GIFT CARDS"
        games={games}
        onProductClick={onProductClick}
        onSeeAll={onSeeAll}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
      />
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 -mt-4 mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        <Gift className="h-4 w-4 text-brand-red" />
        Available denominations & supported regions shown on each card
      </div>
    </div>
  );
}

// 07 — Request Any Game
export function RequestGameCTA({ onRequest }: { onRequest: () => void }) {
  return (
    <section className="py-16 md:py-20 bg-bg-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
            <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-3 italic">Request Any Game</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-[var(--text-primary)] leading-none mb-4">
              Can&apos;t find it? We&apos;ll get it<span className="text-brand-red">.</span>
            </h2>
            <p className="text-xs md:text-sm text-text-secondary font-medium max-w-xl">
              Submit a game request and our team will source it for you. Requests are typically answered within 24–48 hours.
            </p>
          </div>
          <button
            onClick={onRequest}
            className="shrink-0 inline-flex items-center gap-2 bg-brand-red text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs italic hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-red/20"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Request a Game
          </button>
        </div>
      </div>
    </section>
  );
}

// 08 — Why Games Up?
const PERKS = [
  { icon: Zap, title: 'Fast Delivery', desc: 'Instant digital delivery after payment verification' },
  { icon: ShieldCheck, title: 'Secure Payment', desc: 'Encrypted checkout — credentials never exposed' },
  { icon: Headset, title: '24/7 Support', desc: 'WhatsApp & order chat support around the clock' },
  { icon: BadgeCheck, title: 'Verified Products', desc: 'Every account checked before it reaches you' },
];

export function WhyGamesUp() {
  return (
    <section className="py-16 md:py-24 bg-bg-dark border-t border-border-subtle">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-3 italic">Why Games Up?</p>
        <h2 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter font-display uppercase italic leading-none mb-10">
          Built for gamers<span className="text-brand-red">.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {PERKS.map(({ icon: Icon, title, desc }, idx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              className="bg-bg-card border border-border-subtle rounded-3xl p-6 md:p-8"
            >
              <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl w-fit mb-5 text-brand-red">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-base md:text-lg font-black uppercase italic tracking-tight text-[var(--text-primary)] mb-2">{title}</h3>
              <p className="text-[11px] text-text-secondary font-medium leading-relaxed">{desc}</p>
              {title === 'Fast Delivery' && (
                <p className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                  <Timer className="h-3 w-3 text-brand-red" /> Estimated time on every product
                </p>
              )}
              {title === 'Verified Products' && (
                <p className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                  <Crown className="h-3 w-3 text-brand-red" /> Genuine reviews only
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
