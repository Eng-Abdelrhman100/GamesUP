import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Smartphone, 
  ChevronRight, 
  Lock, 
  Loader2, 
  UploadCloud, 
  CheckCircle2, 
  Trash2 
} from 'lucide-react';
import { CartItem } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ordersAPI, uploadAPI, authAPI } from '../utils/api';

interface CheckoutPageProps {
  cart: CartItem[];
  onBack: () => void;
  onConfirm: () => void;
}

export const CheckoutPage = ({ cart, onBack, onConfirm }: CheckoutPageProps) => {
  const { settings } = useStoreSettings();
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'INSTAPAY' | 'TELDA' | 'VODAFONE' | 'BINANCE' | 'PAYPAL' | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hasSession = localStorage.getItem('customerSession');
    if (hasSession) {
      authAPI.getCurrentUser()
        .then(user => {
          if (user) {
            setCustomerName(user.user_metadata?.name || '');
            setCustomerEmail(user.email || '');
            setCustomerPhone(user.user_metadata?.phone || '');
          }
        })
        .catch(err => {
          console.error('Failed to fetch customer profile details:', err);
        });
    }
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const taxRate = (typeof settings.tax_rate === 'number' && !isNaN(settings.tax_rate)) ? settings.tax_rate : 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Build payment options dynamically based on settings
  const paymentOptions = [];
  
  const cardEnabled = settings.payment_methods?.find(m => m.name === 'Credit/Debit Cards')?.enabled !== false;
  if (cardEnabled) {
    paymentOptions.push({ id: 'CARD' as const, name: 'Credit / Debit Card', icon: CreditCard, desc: 'Secure payment via Stripe' });
  }

  if (settings.instapay_enabled) {
    paymentOptions.push({ id: 'INSTAPAY' as const, name: 'Instapay Transfer', icon: Smartphone, desc: 'Instant transfer to our handle' });
  }

  if (settings.telda_enabled) {
    paymentOptions.push({ id: 'TELDA' as const, name: 'Telda App', icon: Smartphone, desc: 'Quick Telda transaction' });
  }

  if (settings.vodafone_cash_enabled) {
    paymentOptions.push({ id: 'VODAFONE' as const, name: 'Vodafone Cash', icon: Wallet, desc: 'Wallet transfer / Mobile wallet' });
  }

  if (settings.binance_enabled) {
    paymentOptions.push({ id: 'BINANCE' as const, name: 'Binance Pay', icon: Wallet, desc: 'Pay via Binance ID/Wallet' });
  }

  if (settings.paypal_enabled) {
    paymentOptions.push({ id: 'PAYPAL' as const, name: 'PayPal Manual', icon: CreditCard, desc: 'PayPal Friends & Family' });
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await uploadAPI.uploadPaymentProof(file);
      setPaymentProof(res.url);
    } catch (err: any) {
      console.error('Failed to upload proof:', err);
      setErrorMsg(err.message || 'Failed to upload transaction proof. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentSelect = (methodId: 'CARD' | 'INSTAPAY' | 'TELDA' | 'VODAFONE' | 'BINANCE' | 'PAYPAL') => {
    setPaymentMethod(methodId);
    setPaymentProof(null);
    setErrorMsg('');
  };

  const handleLaunchOperation = async () => {
    if (!paymentMethod) return;
    if (!customerName.trim()) {
      setErrorMsg('Operator Alias (Full Name) is required.');
      return;
    }
    if (!customerEmail.trim()) {
      setErrorMsg('Contact Link (Email Address) is required.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Comms Frequency (Phone Number) is required.');
      return;
    }

    if (paymentMethod !== 'CARD' && !paymentProof) {
      setErrorMsg('Please upload a screenshot of your transaction proof.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // If customer is logged in, save their updated name and phone to their profile
      const hasSession = localStorage.getItem('customerSession');
      if (hasSession) {
        try {
          await authAPI.updateProfile({
            name: customerName.trim(),
            phone: customerPhone.trim(),
          });
        } catch (profileErr) {
          console.error('Failed to auto-save customer profile during checkout:', profileErr);
        }
      }

      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const orderData = {
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        phone: customerPhone.trim(),
        product_name: cart.map(item => `${item.title} (${item.tier})`).join(', '),
        date: new Date().toISOString().split('T')[0],
        status: 'pending', // Submitting manual payments puts order as pending approval
        amount: total,
        payment_method: paymentMethod.toLowerCase(),
        payment_proof: paymentProof,
        shipping_address: note.trim() || null, // Map note to shipping_address column directly
      };

      await ordersAPI.create(orderData);
      onConfirm();
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setErrorMsg(err.message || 'Failed to process order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-8 transition-colors">
                SECURE<br />CHECKOUT<span className="text-brand-red">.</span>
              </h1>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.4em] italic">Final step to complete your purchase</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic px-2">Payment Methods</h3>
              
              {paymentOptions.length === 0 ? (
                <div className="bg-bg-card border border-border-subtle p-8 rounded-3xl text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-brand-red">No payment methods currently active.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {paymentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handlePaymentSelect(opt.id)}
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
              )}
            </div>

            {/* Payment Instructions & Proof Upload */}
            {paymentMethod && paymentMethod !== 'CARD' && (
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-brand-red uppercase tracking-widest italic mb-2">
                    Payment Instructions
                  </h4>
                  <div className="bg-bg-dark border border-border-subtle rounded-2xl p-6 text-xs text-text-secondary leading-relaxed font-mono whitespace-pre-wrap">
                    {paymentMethod === 'INSTAPAY' && (settings.instapay_details || 'No instructions provided. Please contact support.')}
                    {paymentMethod === 'TELDA' && (settings.telda_details || 'No instructions provided. Please contact support.')}
                    {paymentMethod === 'VODAFONE' && (settings.vodafone_cash_details || 'No instructions provided. Please contact support.')}
                    {paymentMethod === 'BINANCE' && (settings.binance_details || 'No instructions provided. Please contact support.')}
                    {paymentMethod === 'PAYPAL' && (settings.paypal_details || 'No instructions provided. Please contact support.')}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">
                    Upload Transaction Screenshot
                  </label>
                  
                  {!paymentProof ? (
                    <div className="relative border-2 border-dashed border-border-subtle hover:border-brand-red/50 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-3 bg-bg-dark group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
                          <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider animate-pulse">Uploading Proof...</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="h-8 w-8 text-text-secondary group-hover:text-brand-red transition-colors" />
                          <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider group-hover:text-[var(--text-primary)] transition-colors">
                            Drop screenshot or click to upload
                          </p>
                          <p className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">
                            PNG, JPG, or WEBP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-bg-dark border border-brand-red/20 rounded-2xl p-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-bg-card border border-border-subtle flex-shrink-0 relative group">
                          <img src={paymentProof} alt="Receipt Proof" className="w-full h-full object-cover" />
                          <div 
                            onClick={() => window.open(paymentProof, '_blank')}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                          >
                            <span className="text-[8px] font-black text-white uppercase tracking-wider">View</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-green-500 font-black uppercase tracking-widest text-[9px] mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Proof Secured
                          </div>
                          <p className="text-[8px] text-text-secondary font-mono truncate max-w-[200px]">
                            {paymentProof.split('/').pop()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPaymentProof(null)}
                        className="p-3 text-text-secondary hover:text-brand-red bg-bg-card hover:bg-black border border-border-subtle rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Details */}
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Operator Alias (Full Name)</label>
                  <input 
                    type="text" 
                    placeholder="GHOST_OPERATOR (e.g., John Doe)" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Contact Link (Email Address)</label>
                  <input 
                    type="email" 
                    placeholder="INTEL@SAMURAI.HQ (e.g., john.doe@example.com)" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all" 
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Comms Frequency (Phone Number)</label>
                  <input 
                    type="tel" 
                    placeholder="e.g., 01012345678" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Secure Message / Note (Order Notes)</label>
                <textarea 
                  rows={3} 
                  placeholder="e.g., Any specific instructions for delivery or account details..." 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl sticky top-32 space-y-8">
              <div>
                <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.4em] italic pb-4 border-b border-border-subtle/50">Cart Summary</h3>
                
                <div className="space-y-6 mt-6 mb-10 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
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
              </div>

              <div className="space-y-4 border-t border-border-subtle/50 pt-8">
                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>L.E {subtotal.toLocaleString()}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <span>VAT ({taxRate}%)</span>
                    <span>L.E {tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-brand-red/20">
                  <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest italic">Total</span>
                  <span className="text-2xl font-black text-brand-red italic tracking-tighter">L.E {total.toLocaleString()}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button 
                onClick={handleLaunchOperation}
                disabled={!paymentMethod || isUploading || isSubmitting}
                className="w-full bg-brand-red text-white py-6 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all hover:bg-black uppercase italic shadow-xl shadow-brand-red/20 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Place Order
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[8px] font-black text-text-secondary uppercase tracking-[0.2em] italic">
                <Lock className="h-3 w-3 text-brand-red" />
                Secure SSL Checkout Enabled
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
