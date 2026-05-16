import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, CreditCard, Wallet, Smartphone, ChevronRight, Lock } from 'lucide-react';
import { CartItem } from '../types';

interface CheckoutPageProps {
  cart: CartItem[];
  onBack: () => void;
  onConfirm: () => void;
}

export const CheckoutPage = ({ cart, onBack, onConfirm }: CheckoutPageProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'INSTAPAY' | 'VODAFONE' | null>(null);
  
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.14; // 14% VAT
  const total = subtotal + tax;

  const paymentOptions = [
    { id: 'CARD', name: 'Credit / Debit Card', icon: CreditCard, desc: 'Secure payment via Stripe' },
    { id: 'INSTAPAY', name: 'Instapay Transfer', icon: Smartphone, desc: 'Instant transfer to our handle' },
    { id: 'VODAFONE', name: 'Vodafone Cash', icon: Wallet, desc: 'Wallet transfer / Store payment' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Abort Mission
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-8 transition-colors">
                SECURE<br />CHECKOUT<span className="text-brand-red">.</span>
              </h1>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.4em] italic">Operation: Final Acquisition</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic px-2">Payment Protocols</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id as any)}
                    className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden group ${
                      paymentMethod === opt.id 
                        ? 'border-brand-red bg-brand-red/5 ring-1 ring-brand-red' 
                        : 'border-border-subtle bg-bg-card hover:border-brand-red/30'
                    }`}
                  >
                    <div className={`p-3 rounded-xl w-fit mb-4 transition-all ${paymentMethod === opt.id ? 'bg-brand-red text-white' : 'bg-bg-dark text-text-secondary group-hover:text-brand-red'}`}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest italic mb-1 ${paymentMethod === opt.id ? 'text-brand-red' : 'text-[var(--text-primary)]'}`}>{opt.name}</p>
                    <p className="text-[8px] text-text-secondary font-bold uppercase tracking-widest leading-tight">{opt.desc}</p>
                    
                    {paymentMethod === opt.id && (
                      <div className="absolute top-2 right-2">
                        <ShieldCheck className="h-4 w-4 text-brand-red" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Details */}
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Operator Alias</label>
                  <input type="text" placeholder="GHOST_OPERATOR" className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Contact Link (Email)</label>
                  <input type="email" placeholder="INTEL@SAMURAI.HQ" className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Secure Message / Note</label>
                <textarea rows={3} placeholder="ANY SPECIFIC DELIVERY INSTRUCTIONS..." className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all resize-none"></textarea>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl sticky top-32">
              <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.4em] italic mb-8 pb-4 border-b border-border-subtle/50">Mission Assets</h3>
              
              <div className="space-y-6 mb-10 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-bg-dark flex-shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale opacity-50" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-tighter italic leading-none mb-1">{item.title}</p>
                      <p className="text-[8px] text-brand-red font-black uppercase tracking-widest italic">{item.tier} ACCESS</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-text-secondary font-bold">QTY: {item.quantity}</span>
                        <span className="text-[10px] font-black text-[var(--text-primary)] italic">L.E {item.price * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t border-border-subtle/50 pt-8">
                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <span>Subtotal Intel</span>
                  <span>L.E {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <span>Tax Protocols (14%)</span>
                  <span>L.E {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-brand-red/20">
                  <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest italic">Total Cost</span>
                  <span className="text-2xl font-black text-brand-red italic tracking-tighter">L.E {total.toLocaleString()}</span>
                </div>
              </div>

              <button 
                onClick={onConfirm}
                disabled={!paymentMethod}
                className="w-full bg-brand-red text-white py-6 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all hover:bg-black uppercase italic shadow-xl shadow-brand-red/20 mt-10 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                Launch Operation
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 mt-6 text-[8px] font-black text-text-secondary uppercase tracking-[0.2em] italic">
                <Lock className="h-3 w-3 text-brand-red" />
                End-to-End Encryption Enabled
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
