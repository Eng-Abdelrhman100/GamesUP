import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Wallet,
  Smartphone,
  ChevronRight,
  Lock,
  Loader2,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Banknote,
  MessageCircle,
  Package,
} from 'lucide-react';
import { CartItem } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ordersAPI, uploadAPI, authAPI } from '../utils/api';

interface CheckoutPageProps {
  cart: CartItem[];
  onBack: () => void;
  onConfirm: () => void;
}

type MethodId = 'CARD' | 'INSTAPAY' | 'TELDA' | 'VODAFONE' | 'BINANCE' | 'PAYPAL' | 'COD';

// TASK 04 target flow: Product → Checkout → Payment → Delivery.
// Single details form (no repeated entry), payment selection, then one review screen.
const STEPS = ['Details', 'Payment', 'Review'] as const;

export const CheckoutPage = ({ cart, onBack, onConfirm }: CheckoutPageProps) => {
  const { settings } = useStoreSettings();
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<MethodId | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredPlatform, setPreferredPlatform] = useState('');
  const [note, setNote] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
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

  const whatsappUrl = (settings as any)?.whatsapp_url
    ? String((settings as any).whatsapp_url)
    : 'https://wa.me/201008480536';

  // ASK 01: block unavailable / zero-priced lines before payment.
  const invalidLines = useMemo(
    () => cart.filter((i) => !(Number(i.price) > 0)),
    [cart],
  );

  // TASK 04: cash on delivery only for eligible physical products.
  const allPhysical = cart.length > 0 && cart.every((i) => (i as any).isPhysical === true);
  const codEnabled = (settings as any)?.cod_enabled === true || (settings as any)?.cash_on_delivery_enabled === true;

  // Build payment options dynamically based on settings (approved gateways only).
  const paymentOptions: { id: MethodId; name: string; icon: any; desc: string }[] = [];

  const cardEnabled = settings.payment_methods?.find(m => m.name === 'Credit/Debit Cards')?.enabled !== false;
  if (cardEnabled) {
    // Cards + Egyptian digital wallets are supported where the selected gateway permits them.
    paymentOptions.push({ id: 'CARD', name: 'Credit / Debit Card', icon: CreditCard, desc: 'Cards & supported Egyptian wallets via gateway' });
  }

  if (settings.instapay_enabled) {
    paymentOptions.push({ id: 'INSTAPAY', name: 'Instapay Transfer', icon: Smartphone, desc: 'Instant transfer to our handle' });
  }

  if (settings.telda_enabled) {
    paymentOptions.push({ id: 'TELDA', name: 'Telda App', icon: Smartphone, desc: 'Quick Telda transaction' });
  }

  if (settings.vodafone_cash_enabled) {
    paymentOptions.push({ id: 'VODAFONE', name: 'Vodafone Cash', icon: Wallet, desc: 'Wallet transfer / Mobile wallet' });
  }

  if (settings.binance_enabled) {
    paymentOptions.push({ id: 'BINANCE', name: 'Binance Pay', icon: Wallet, desc: 'Pay via Binance ID/Wallet' });
  }

  if (settings.paypal_enabled) {
    paymentOptions.push({ id: 'PAYPAL', name: 'PayPal Manual', icon: CreditCard, desc: 'PayPal Friends & Family' });
  }

  if (codEnabled && allPhysical) {
    paymentOptions.push({ id: 'COD', name: 'Cash on Delivery', icon: Banknote, desc: 'Pay in cash — physical products only' });
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

  const handlePaymentSelect = (methodId: MethodId) => {
    setPaymentMethod(methodId);
    setPaymentProof(null);
    setErrorMsg('');
  };

  const validateDetails = (): boolean => {
    if (!customerName.trim()) {
      setErrorMsg('Full name is required.');
      return false;
    }
    if (!customerEmail.trim()) {
      setErrorMsg('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return false;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Phone number is required.');
      return false;
    }
    return true;
  };

  const handleLaunchOperation = async () => {
    if (!paymentMethod) return;
    if (!validateDetails()) {
      setStep(0);
      return;
    }
    if (invalidLines.length > 0) {
      setErrorMsg('Your cart contains unavailable or zero-priced items. Please remove them to continue.');
      return;
    }

    if (paymentMethod !== 'CARD' && paymentMethod !== 'COD' && !paymentProof) {
      setErrorMsg('Please upload a screenshot of your transaction proof.');
      setStep(1);
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

      const orderData: any = {
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        phone: customerPhone.trim(),
        preferred_platform: preferredPlatform.trim() || undefined,
        marketing_consent: marketingConsent,
        product_name: cart.map(item => `${item.title} (${item.tier})`).join(', '),
        // Structured lines enable server-side inventory + price validation.
        items: cart.map((item) => ({
          productId: (item as any).gameId ?? (item as any).productId,
          variantName: (item as any).tier,
          quantity: item.quantity,
          price: item.price,
        })),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        amount: total,
        payment_method: paymentMethod.toLowerCase(),
        payment_proof: paymentProof,
        shipping_address: note.trim() || null,
      };

      // TASK 04: validate inventory + price server-side before creating the order.
      try {
        await ordersAPI.validate(orderData);
      } catch (validationErr: any) {
        setErrorMsg(validationErr.message || 'Some items in your cart are no longer available at the listed price.');
        setIsSubmitting(false);
        return;
      }

      await ordersAPI.create(orderData);
      onConfirm();
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setErrorMsg(err.message || 'Failed to process order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-bg-dark pt-32 pb-20">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <Package className="h-12 w-12 text-text-secondary mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase italic text-[var(--text-primary)] mb-4">Cart is empty</h1>
          <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-8">Add a product before checking out.</p>
          <button onClick={onBack} className="bg-brand-red text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic">
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-8 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-6 transition-colors">
                SECURE<br />CHECKOUT<span className="text-brand-red">.</span>
              </h1>
              {/* Progress: Product → Payment → Delivery */}
              <div className="flex items-center gap-2 md:gap-3" aria-label="Checkout progress">
                {['Product', ...STEPS.slice(1)].map((label, i) => {
                  const activeIdx = step + 1;
                  const done = i < activeIdx;
                  const current = i === activeIdx;
                  return (
                    <div key={label} className="flex items-center gap-2 md:gap-3">
                      <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-widest italic ${current ? 'border-brand-red bg-brand-red/10 text-brand-red' : done ? 'border-green-500/40 text-green-500' : 'border-border-subtle text-text-secondary'}`}>
                        <span className="opacity-70">{i + 1}</span> {label}
                      </div>
                      {i < 2 && <div className="w-4 md:w-8 h-px bg-border-subtle" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {invalidLines.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-center">
                ⚠️ {invalidLines.length} item(s) in your cart are unavailable or have no valid price. Please remove them to continue.
              </div>
            )}

            {/* STEP 1 — Details (single form, no repeated entry) */}
            {step === 0 && (
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-10 space-y-6">
                <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic">1 · Your Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g., John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g., john.doe@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g., 01012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Preferred Platform</label>
                    <select
                      value={preferredPlatform}
                      onChange={(e) => setPreferredPlatform(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all"
                    >
                      <option value="">Select (optional)</option>
                      <option value="PS5">PS5</option>
                      <option value="PS4">PS4</option>
                      <option value="Xbox">Xbox</option>
                      <option value="PC">PC</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Order Notes (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Any delivery instructions..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-brand-red transition-all resize-none"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer text-[11px] text-text-secondary font-bold">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red-600"
                  />
                  I agree to receive offers and updates (optional — order messages are sent regardless).
                </label>
                <button
                  onClick={() => { setErrorMsg(''); if (validateDetails()) setStep(1); }}
                  className="w-full bg-brand-red text-white py-5 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 uppercase italic hover:opacity-90 transition-all"
                >
                  Continue to Payment <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* STEP 2 — Payment */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic px-2">2 · Payment Method</h3>

                  {paymentOptions.length === 0 ? (
                    <div className="bg-bg-card border border-border-subtle p-8 rounded-3xl text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-brand-red">No payment methods currently active.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {paymentMethod && paymentMethod !== 'CARD' && paymentMethod !== 'COD' && (
                  <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-10 space-y-6">
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

                {paymentMethod === 'COD' && (
                  <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 text-xs text-text-secondary font-bold">
                    Pay in cash when your physical order arrives. Digital items cannot use cash on delivery.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setErrorMsg(''); setStep(0); }}
                    className="px-8 py-5 rounded-2xl border border-border-subtle text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-[var(--text-primary)] transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setErrorMsg(''); if (paymentMethod) setStep(2); else setErrorMsg('Please choose a payment method.'); }}
                    disabled={!paymentMethod}
                    className="flex-1 bg-brand-red text-white py-5 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 uppercase italic hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    Review Order <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Review + confirm */}
            {step === 2 && (
              <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-10 space-y-6">
                <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest italic">3 · Review & Confirm</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-bg-dark border border-border-subtle rounded-2xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-2">Customer</p>
                    <p className="font-bold text-[var(--text-primary)]">{customerName}</p>
                    <p className="text-text-secondary font-bold">{customerEmail}</p>
                    <p className="text-text-secondary font-bold">{customerPhone}</p>
                    {preferredPlatform && <p className="text-text-secondary font-bold">Platform: {preferredPlatform}</p>}
                  </div>
                  <div className="bg-bg-dark border border-border-subtle rounded-2xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-2">Payment</p>
                    <p className="font-bold text-[var(--text-primary)] uppercase">{paymentMethod}</p>
                    <p className="text-text-secondary font-bold mt-1">Status after submit: <span className="text-yellow-500">Pending verification</span></p>
                    {note && <p className="text-text-secondary font-bold mt-1">Note: {note}</p>}
                  </div>
                </div>
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-center">
                    ⚠️ {errorMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setErrorMsg(''); setStep(1); }}
                    className="px-8 py-5 rounded-2xl border border-border-subtle text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-[var(--text-primary)] transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLaunchOperation}
                    disabled={!paymentMethod || isUploading || isSubmitting || invalidLines.length > 0}
                    className="flex-1 bg-brand-red text-white py-5 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all hover:opacity-90 uppercase italic shadow-xl shadow-brand-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Place Order
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp support during checkout */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-green-500 transition-colors italic"
            >
              <MessageCircle className="h-4 w-4" />
              Need help? Chat with us on WhatsApp
            </a>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-8 md:p-10 shadow-2xl sticky top-32 space-y-8">
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

              {errorMsg && step !== 2 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

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
