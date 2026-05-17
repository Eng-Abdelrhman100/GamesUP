import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Trash2, X } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (cartId: string) => void;
  onCheckout: () => void;
}

export const CartDrawer = ({ isOpen, onClose, items, onRemove, onCheckout }: CartDrawerProps) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    onCheckout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]" />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-bg-primary border-l border-border-subtle z-[151] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-brand-red h-5 w-5" />
                <h2 className="text-lg font-black tracking-tighter uppercase italic">Mission Payload</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-border-subtle rounded-full transition-colors text-text-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-20 h-20 bg-border-subtle rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="h-10 w-10 text-text-secondary" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest italic">Inventory Empty</p>
                  <p className="text-[10px] mt-2 uppercase tracking-tighter">Your mission requires supplies.</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.cartId}
                    className="group relative flex gap-4 p-4 rounded-xl border border-border-subtle bg-bg-card/50 hover:border-brand-red/30 transition-all"
                  >
                    <div className="h-20 w-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="font-black text-sm tracking-tighter uppercase italic line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-brand-red font-black tracking-widest uppercase mb-1">{item.tier} ACCOUNT</p>
                      <p className="font-black text-base tracking-tighter">
                        {item.price} <span className="text-[10px] text-text-secondary">L.E</span>
                      </p>
                    </div>
                    <button onClick={() => onRemove(item.cartId)} className="p-2 h-fit text-text-secondary hover:text-brand-red transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 border-t border-border-subtle bg-bg-secondary/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] italic">Total Extraction Cost</span>
                  <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">
                    {total} <span className="text-xs">L.E</span>
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-brand-red text-white py-5 rounded-2xl font-black tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all hover:bg-black uppercase italic shadow-xl shadow-brand-red/20"
                >
                  Execute Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-[9px] text-center mt-6 text-text-secondary font-bold uppercase tracking-widest italic">
                  Encrypted Deployment via GamesUp
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
