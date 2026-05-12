import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreditCard, MapPin, User, Mail, Phone, Lock, CheckCircle, Truck, Package, Printer, Download, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { deliveryOptionsAPI, ordersAPI, productsAPI, uploadAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { emailService } from '../../utils/emailService';

interface CheckoutProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
}

export function Checkout({ onBack, onSuccess }: CheckoutProps) {
  const { formatPrice } = useStoreSettings();
  const [searchParams] = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'info' | 'delivery' | 'payment' | 'success'>('info');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod' | 'instapay' | 'vodafone_cash' | 'telda'>('card');
  const [paymentProofFile, setPaymentProofFile] = useState<File | string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Egypt',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const egyptCities = [
    "Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", 
    "Suez", "Luxor", "Mansoura", "El Mahalla El Kubra", "Tanta", 
    "Asyut", "Ismailia", "Fayyum", "Zagazig", "Aswan", 
    "Damietta", "Damanhur", "Minya", "Beni Suef", "Qena", 
    "Sohag", "Hurghada", "6th of October", "Shibin El Kom", "Banha", 
    "Kafr El Sheikh", "Arish", "Mallawi", "10th of Ramadan"
  ];

  useEffect(() => {
    const paymentRef = searchParams.get('payment_ref') || searchParams.get('tran_ref');
    const orderNumber = searchParams.get('cart_id') || searchParams.get('orderNumber');
    
    if (paymentRef && orderNumber) {
      verifyPayment(paymentRef, orderNumber);
    } else {
      loadCart();
      loadDeliveryOptions();
    }
  }, [searchParams]);

  const verifyPayment = async (tranRef: string, orderNumber: string) => {
    setLoading(true);
    setStep('payment'); // Show payment step/loading
    
    try {
      // Mock payment verification for now as backend is removed
      // In production, this should be an Edge Function call
      console.log('Verifying payment', tranRef, orderNumber);
      
      const success = true; // Mock success
      
      if (success) {
        // Payment successful
        if (purchasedItems.length === 0) {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            setPurchasedItems(cart);
        }
        setCartItems([]); // Clear cart items
        localStorage.setItem('cart', JSON.stringify([]));
        setStep('success');
      } else {
        alert('Payment verification failed');
        setStep('payment');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      alert('Payment verification failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
  };

  const loadDeliveryOptions = async () => {
    try {
      const data = await deliveryOptionsAPI.getAll();
      setDeliveryOptions((data as any) || []);
      if (data && (data as any).length > 0) {
        setSelectedDelivery((data as any)[0].id);
      }
    } catch (error) {
      console.error('Error loading delivery options:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProofFile(e.target.files[0]);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    // Short delay to allow render
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = receiptRef.current;
    if (!element) {
        setIsGeneratingPdf(false);
        return;
    }

    try {
      // Temporarily make it visible for capture if needed, but the current class 'fixed left-[-9999px]' should work
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        windowWidth: 794 // A4 width in px at 96 DPI approx (210mm)
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt-${formData.fullName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF receipt.');
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handlePaymentProofUpload = async (file: File) => {
    try {
      setLoading(true);
      const { url } = await uploadAPI.uploadPaymentProof(file);
      setPaymentProofFile(url as any); // Storing URL instead of File object for submission
      setLoading(false);
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      alert('Failed to upload payment proof. Please try again.');
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const delivery = deliveryOptions.find(d => d.id === selectedDelivery);
      const deliveryPrice = delivery?.price || 0;
      const total = subtotal + deliveryPrice;

      // Create order
      const orderData = {
        items: cartItems,
        customer: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        delivery: delivery,
        paymentMethod,
        subtotal,
        deliveryPrice,
        total,
        status: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
      };

      const order = await ordersAPI.create({
        order_number: `ORD-${Date.now()}`,
        customer_name: orderData.customer.name,
        customer_email: orderData.customer.email,
        shipping_address: {
          address: orderData.customer.address,
          city: orderData.customer.city,
          state: orderData.customer.state,
          zipCode: orderData.customer.zipCode,
          country: orderData.customer.country,
          phone: orderData.customer.phone,
        },
        digital_delivery: orderData.items,
        payment_method: paymentMethod,
        amount: orderData.total,
        status: orderData.status,
        payment_proof:
          typeof paymentProofFile === 'string'
            ? paymentProofFile
            : paymentProofFile
              ? await uploadAPI.uploadPaymentProof(paymentProofFile).then((r) => r.url)
              : null,
      });
      
      // --- START DIGITAL FULFILLMENT LOGIC ---
      for (const item of cartItems) {
        if (item.attribute) {
          const { product } = await productsAPI.getPublicById(item.id);
          
          if (product && product.digitalItems && Array.isArray(product.digitalItems)) {
            let updated = false;
            const digitalItems = [...product.digitalItems];
            let assignedDigitalItem = null;

            for (let i = 0; i < digitalItems.length; i++) {
              const di = digitalItems[i];
              
              if (item.attribute === 'Full Account') {
                const anySlotSold = di.slots ? Object.values(di.slots).some((s: any) => s.sold) : false;
                if (!anySlotSold) {
                  if (di.slots) {
                    Object.keys(di.slots).forEach(key => {
                      di.slots[key].sold = true;
                      di.slots[key].orderId = order.id;
                    });
                  }
                  di.fullAccountSold = true;
                  assignedDigitalItem = di;
                  updated = true;
                  break;
                }
              } else {
                if (di.slots && di.slots[item.attribute] && !di.slots[item.attribute].sold && !di.fullAccountSold) {
                  di.slots[item.attribute].sold = true;
                  di.slots[item.attribute].orderId = order.id;
                  assignedDigitalItem = di;
                  updated = true;
                  break;
                }
              }
            }

            if (updated) {
              await productsAPI.updatePublicDigitalItems(item.id, digitalItems);
              item.digitalItem = assignedDigitalItem; // Attach for email sending
            }
          }
        }
      }
      // --- END DIGITAL FULFILLMENT LOGIC ---

      // Send confirmation email
      await emailService.sendOrderConfirmation(order);

      // Clear cart and show success
      localStorage.removeItem('cart');
      setPurchasedItems(cartItems);
      setStep('success');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'info') {
      setStep('delivery');
    } else if (step === 'delivery') {
      setStep('payment');
    } else if (step === 'payment') {
      await handleCheckout();
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1;
  const deliveryFee = selectedDelivery ? (deliveryOptions.find(d => d.id === selectedDelivery)?.price || 0) : 0;
  const total = subtotal + tax + deliveryFee;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Successful!</h1>
            <p className="text-gray-600 mb-8">
              Your order has been placed successfully. You'll receive a confirmation email shortly.
            </p>
            
            {purchasedItems.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Digital Items</h3>
                <div className="space-y-4">
                  {purchasedItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-4 mb-3">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{item.name}</p>
                          {item.attributes && Object.keys(item.attributes).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(item.attributes).map(([key, val]) => (
                                <span key={key} className="mr-2">{key}: {String(val)}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-gray-500">Digital Product</p>
                        </div>
                      </div>
                      
                      {(item.digitalItem || item.digital_key) ? (
                        (() => {
                          const digital = item.digitalItem || item.digital_key;
                          const isManualPayment = ['instapay', 'vodafone_cash', 'telda'].includes(paymentMethod);

                          if (isManualPayment) {
                            return (
                              <div className="mt-3 p-4 bg-yellow-50 rounded-md border border-yellow-200 text-yellow-800 text-sm flex items-start gap-3">
                                <Clock className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600" />
                                <div>
                                  <p className="font-bold text-yellow-900">Payment Verification Pending</p>
                                  <p className="mt-1 text-yellow-800">
                                    Your digital items are reserved. Once your payment is verified by our team, 
                                    you will receive the codes via email.
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100 space-y-3">
                          {digital.code && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Code</span>
                              <div className="font-mono text-lg font-bold text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.code}
                              </div>
                            </div>
                          )}
                          
                          {digital.email && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Email</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.email}
                              </div>
                            </div>
                          )}
                          
                          {digital.password && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Password</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.password}
                              </div>
                            </div>
                          )}

                          {/* Extra Fields */}
                          {digital.outlookEmail && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Outlook Email</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.outlookEmail}
                              </div>
                            </div>
                          )}

                          {digital.outlookPassword && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Outlook Password</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.outlookPassword}
                              </div>
                            </div>
                          )}

                          {digital.birthdate && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Birthdate</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.birthdate}
                              </div>
                            </div>
                          )}

                          {digital.region && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Region</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.region}
                              </div>
                            </div>
                          )}

                          {digital.onlineId && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Online ID</span>
                              <div className="font-mono text-gray-800 bg-white px-3 py-1 rounded border border-blue-200 inline-block select-all break-all">
                                {digital.onlineId}
                              </div>
                            </div>
                          )}

                          {digital.backupCodes && (
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Backup Codes</span>
                              <pre className="font-mono text-sm text-gray-800 bg-white px-3 py-2 rounded border border-blue-200 overflow-x-auto whitespace-pre-wrap select-all">
                                {digital.backupCodes}
                              </pre>
                            </div>
                          )}
                        </div>
                          );
                        })()
                      ) : (
                        <div className="mt-3 text-amber-600 text-sm italic">
                          Product details will be sent to your email.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Order Total</p>
              <p className="text-3xl font-bold text-pink-600">{formatPrice(total)}</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownloadPDF}
                className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Receipt
              </button>
              <button
                onClick={onSuccess}
                className="px-8 py-4 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-pink-500/30 hover:shadow-xl transition-all"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            ← Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-4">
          {['info', 'delivery', 'payment'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === s
                    ? 'bg-[#b90909] text-[#ffffff]'
                    : ['info', 'delivery'].includes(s) && ['delivery', 'payment'].includes(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 2 && (
                <div className={`w-16 h-1 ${
                  ['delivery', 'payment'].includes(step) && idx === 0
                    ? 'bg-green-500'
                    : step === 'payment' && idx === 1
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
              {step === 'info' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-pink-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-8 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-pink-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Shipping Address</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="123 Main St, Apt 4B"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      >
                        <option value="Egypt">Egypt</option>
                        <option value="Saudi Arabia">Saudi Arabia</option>
                        <option value="UAE">UAE</option>
                        <option value="Kuwait">Kuwait</option>
                        <option value="Qatar">Qatar</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      {formData.country === 'Egypt' ? (
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          required
                        >
                          <option value="">Select City</option>
                          {egyptCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          placeholder="City"
                          required
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State / Province</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="State / Province"
                        required
                      />
                    </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="10001"
                        required
                      />
                    </div>
                  </div>

                </motion.div>
              )}

              {step === 'delivery' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-pink-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Delivery Method</h2>
                  </div>

                  <div className="space-y-4">
                    {deliveryOptions.length === 0 ? (
                      <p className="text-gray-600">Loading delivery options...</p>
                    ) : (
                      deliveryOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedDelivery === option.id
                              ? 'border-pink-500 bg-pink-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="radio"
                              name="delivery"
                              value={option.id}
                              checked={selectedDelivery === option.id}
                              onChange={(e) => setSelectedDelivery(e.target.value)}
                              className="w-5 h-5 text-[#ff1574]"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{option.name}</p>
                              <p className="text-sm text-gray-600">{option.description}</p>
                              <p className="text-xs text-gray-500 mt-1">{option.estimatedDays}</p>
                            </div>
                          </div>
                          <p className="font-bold text-red-600">
                            {option.price === 0 ? 'FREE' : formatPrice(option.price)}
                          </p>
                        </label>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Credit Card */}
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'card' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-5 h-5 text-red-600 mr-4"
                      />
                      <CreditCard className="w-6 h-6 text-gray-700 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900">Credit Card (PayTabs)</p>
                        <p className="text-sm text-gray-600">Secure payment via PayTabs gateway</p>
                      </div>
                    </label>

                    {/* Cash on Delivery */}
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'cod' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-5 h-5 text-red-600 mr-4"
                      />
                      <Truck className="w-6 h-6 text-gray-700 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </label>

                    {/* Instapay */}
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'instapay' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="instapay"
                        checked={paymentMethod === 'instapay'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-5 h-5 text-red-600 mr-4"
                      />
                      <div className="w-6 h-6 mr-3 flex items-center justify-center text-lg">🏦</div>
                      <div>
                        <p className="font-semibold text-gray-900">Instapay Transfer</p>
                        <p className="text-sm text-gray-600">Transfer and upload screenshot</p>
                      </div>
                    </label>

                    {/* Vodafone Cash */}
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'vodafone_cash' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="vodafone_cash"
                        checked={paymentMethod === 'vodafone_cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-5 h-5 text-red-600 mr-4"
                      />
                      <div className="w-6 h-6 mr-3 flex items-center justify-center text-lg">📱</div>
                      <div>
                        <p className="font-semibold text-gray-900">Vodafone Cash</p>
                        <p className="text-sm text-gray-600">Transfer and upload screenshot</p>
                      </div>
                    </label>

                    {/* Telda */}
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'telda' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="telda"
                        checked={paymentMethod === 'telda'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-5 h-5 text-red-600 mr-4"
                      />
                      <div className="w-6 h-6 mr-3 flex items-center justify-center text-lg">💳</div>
                      <div>
                        <p className="font-semibold text-gray-900">Telda</p>
                        <p className="text-sm text-gray-600">Transfer and upload screenshot</p>
                      </div>
                    </label>
                  </div>

                  {/* Payment Details / Instructions */}
                  <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                    {paymentMethod === 'card' && (
                      <div className="text-center">
                        <p className="text-gray-700 mb-2">You will be redirected to PayTabs to complete your purchase securely.</p>
                      </div>
                    )}
                    
                    {paymentMethod === 'cod' && (
                      <div className="text-center">
                        <p className="text-gray-700">Please have the exact amount ready upon delivery.</p>
                      </div>
                    )}

                    {paymentMethod === 'instapay' && (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-bold text-gray-900 mb-2">Instapay Details:</p>
                          <p className="text-sm text-gray-600">Instapay ID: <span className="font-mono font-bold text-gray-900">username@instapay</span></p>
                          <p className="text-sm text-gray-600">Phone: <span className="font-mono font-bold text-gray-900">01234567890</span></p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Screenshot</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handlePaymentProofUpload(e.target.files[0]);
                              }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">Please upload a clear screenshot of the transaction receipt.</p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'vodafone_cash' && (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-bold text-gray-900 mb-2">Vodafone Cash Details:</p>
                          <p className="text-sm text-gray-600">Phone: <span className="font-mono font-bold text-gray-900">010xxxxxxxx</span></p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Screenshot</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handlePaymentProofUpload(e.target.files[0]);
                              }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">Please upload a clear screenshot of the transaction receipt.</p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'telda' && (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-bold text-gray-900 mb-2">Telda Details:</p>
                          <p className="text-sm text-gray-600">Telda ID: <span className="font-mono font-bold text-gray-900">username@telda</span></p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Screenshot</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handlePaymentProofUpload(e.target.files[0]);
                              }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">Please upload a clear screenshot of the transaction receipt.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                {step !== 'info' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'delivery') setStep('info');
                      if (step === 'payment') setStep('delivery');
                    }}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-6 text-[#ffffff] bg-[#bd0000] rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : step === 'payment' ? 'Place Order' : 'Continue'}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    <p className="text-sm font-bold text-red-600">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className="font-semibold">
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-semibold">{formatPrice(tax)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-red-600">{formatPrice(total)}</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden Print Receipt - Only rendered when generating PDF */}
      <div 
        ref={receiptRef} 
        className={`${isGeneratingPdf ? 'fixed left-[-9999px] top-0 z-[-1]' : 'hidden'} w-[210mm] min-h-[297mm] bg-white p-8`}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Games Up</h1>
          <p className="text-gray-600">Order Receipt</p>
          <p className="text-sm text-gray-500 mt-2">{new Date().toLocaleString()}</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Customer:</span>
            <span>{formData.fullName}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Email:</span>
            <span>{formData.email}</span>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {purchasedItems.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2">
                  <div>{item.name}</div>
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {Object.entries(item.attributes).map(([key, val]) => (
                        <span key={key} className="mr-2">{key}: {String(val)}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="text-right py-2">1</td>
                <td className="text-right py-2">{formatPrice(item.price || item.amount || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Thank you for your purchase!</p>
          <p>www.games-up.co</p>
        </div>
      </div>
    </div>
  );
}
