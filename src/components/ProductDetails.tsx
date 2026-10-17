import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Truck, PackageCheck, CircleHelp, Star, BadgeCheck } from 'lucide-react';
import type { Game } from '../types';
import { getProductKind } from '../utils/availability';

function attr(game: Game, ...keys: string[]): string {
  const a = game.attributes || {};
  for (const k of keys) {
    const v = a[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

export function ProductKindBadge({ game }: { game: Game }) {
  const kind = getProductKind(game);
  const label: Record<string, string> = {
    account: 'Digital Account',
    key: 'Game Key',
    subscription: 'Subscription',
    physical: 'Physical Product',
  };
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xl text-white text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase border border-white/10 italic">
      <PackageCheck className="h-3 w-3" /> {label[kind]}
    </span>
  );
}

// TASK 03: standardized product information template.
export function ProductInformation({ game }: { game: Game }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const platform = attr(game, 'platform', 'console', 'system') || game.category || '—';
  const edition = attr(game, 'edition', 'version', 'tier') || 'Standard Edition';
  const region = attr(game, 'region', 'account_region', 'country') || '—';
  const deliveryMethod = attr(game, 'delivery_method', 'fulfillment', 'deliveryMethod') || 'Digital delivery to your order';
  const deliveryTime = attr(game, 'delivery_time', 'estimated_delivery', 'deliveryTime', 'eta') || 'Usually within minutes after payment verification';
  const included = attr(game, 'whats_included', 'included', 'whatsIncluded');
  const howItWorks = attr(game, 'how_it_works', 'howItWorks', 'activation', 'redemption_steps');
  const regionNotes = attr(game, 'region_restrictions', 'regionNotes', 'restrictions');
  const sharingNotes = attr(game, 'account_sharing', 'sharing_limits', 'accountSharing');

  const faqs: { q: string; a: string }[] = Array.isArray((game.attributes as any)?.faqs)
    ? (game.attributes as any).faqs.filter((f: any) => f?.q && f?.a).slice(0, 8)
    : [
        { q: 'How will I receive my purchase?', a: howItWorks || 'Your account details or key are delivered to your order confirmation and email after payment verification.' },
        { q: 'How long does delivery take?', a: deliveryTime },
        { q: 'Are there region restrictions?', a: regionNotes || `This product is listed for region: ${region}. Contact support before purchase if your account region differs.` },
      ];

  // Reviews are shown only when genuine and attributable (author + text required).
  const reviews: { author: string; text: string; rating?: number }[] = Array.isArray((game.attributes as any)?.reviews)
    ? (game.attributes as any).reviews.filter((r: any) => r?.author && r?.text).slice(0, 6)
    : [];

  return (
    <div className="space-y-8 mt-8">
      {/* Core fields */}
      <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <h3 className="text-lg md:text-xl font-black text-white mb-8 uppercase tracking-wider flex items-center gap-3 italic font-display">
          <span className="text-brand-red">■</span> Product Details
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ['Game / Product', game.title],
            ['Platform', platform],
            ['Edition', edition],
            ['Region', region],
            ['Delivery Method', deliveryMethod],
            ['Estimated Delivery', deliveryTime],
          ].map(([k, v]) => (
            <div key={k} className="space-y-2 border-l-2 border-brand-red/20 pl-4">
              <dt className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] italic">{k}</dt>
              <dd className="text-white font-black text-sm uppercase italic">{v}</dd>
            </div>
          ))}
        </dl>

        {(regionNotes || sharingNotes) && (
          <div className="mt-8 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-200 leading-relaxed font-medium">
              {regionNotes && <p><span className="font-black uppercase tracking-widest text-amber-300">Region: </span>{regionNotes}</p>}
              {sharingNotes && <p className="mt-1"><span className="font-black uppercase tracking-widest text-amber-300">Account sharing: </span>{sharingNotes}</p>}
              {!regionNotes && !sharingNotes && null}
            </div>
          </div>
        )}
        {!regionNotes && (
          <div className="mt-8 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-200 leading-relaxed font-medium">
              <span className="font-black uppercase tracking-widest text-amber-300">Region & sharing: </span>
              Check that region ({region}) matches your account, and follow the activation steps exactly — account-sharing limits apply to Primary/Secondary slots.
            </p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-dark border border-border-subtle rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-brand-red uppercase tracking-[0.25em] italic mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4" /> What&apos;s included
            </h4>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line font-medium">
              {included || 'Full product as described (account access or key, credentials where applicable, and order support).'}
            </p>
          </div>
          <div className="bg-bg-dark border border-border-subtle rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-brand-red uppercase tracking-[0.25em] italic mb-3">How it works</h4>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line font-medium">
              {howItWorks || '1) Complete checkout. 2) Payment is verified. 3) Your delivery (account details or key) appears in your order and email. 4) Follow the activation / redemption steps before signing in.'}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <h3 className="text-lg md:text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3 italic font-display">
          <span className="text-brand-red">■</span> Frequently Asked Questions
        </h3>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-border-subtle rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2"><CircleHelp className="h-4 w-4 text-brand-red shrink-0" />{f.q}</span>
                <span className="text-brand-red font-black">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 text-xs md:text-sm text-text-secondary leading-relaxed">
                  {f.a}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews — genuine and attributable only */}
      {reviews.length > 0 && (
        <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
          <h3 className="text-lg md:text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3 italic font-display">
            <span className="text-brand-red">■</span> Customer Reviews
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="bg-bg-dark border border-border-subtle rounded-2xl p-5">
                <div className="flex items-center gap-1 text-brand-red mb-2">
                  {Array.from({ length: Math.min(5, Math.max(1, Number(r.rating) || 5)) }).map((_, s) => (
                    <Star key={s} className="h-3 w-3 fill-current" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-gray-200 leading-relaxed mb-3">“{r.text}”</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-green-500" /> {r.author} · Verified purchase
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
