import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface CartItem {
  id: string;
  cartItemId?: string; // Added for unique identification of variants
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  attribute?: string;
  attributes?: Record<string, any>;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onNavigate: (page: any) => void;
}

export function Cart({ isOpen, onClose, onCheckout, onNavigate }: CartProps) {
  const { formatPrice } = useStoreSettings();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadCart();
  }, [isOpen]);

  const loadCart = async () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
      setCartItems(cart);
      return;
    }

    try {
      const updatedCart = await Promise.all(
        cart.map(async (item: CartItem) => {
          try {
            const data = await productsAPI.getById(item.id);
            const product = data?.products?.[0];
            if (product?.image && product.image !== item.image) {
              return { ...item, image: product.image };
            }
            return item;
          } catch {
            return item;
          }
        })
      );
      setCartItems(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    } catch {
      setCartItems(cart);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedCart = cartItems.map(item => {
      // Use cartItemId if available, otherwise fallback to id
      const currentId = item.cartItemId || item.id;
      return currentId === itemId ? { ...item, quantity: newQuantity } : item;
    });
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => {
      const currentId = item.cartItemId || item.id;
      return currentId !== itemId;
    });
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.setItem('cart', JSON.stringify([]));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                  <p className="text-sm text-gray-600">{cartItems.length} items</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 mb-6">Add some products to get started!</p>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate('shop');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {cartItems.map((item, index) => {
                    // Determine unique key for React list
                    const uniqueKey = item.cartItemId || `${item.id}-${index}`;
                    const itemId = item.cartItemId || item.id;

                    return (
                    <motion.div
                      key={uniqueKey}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg bg-white overflow-hidden flex-shrink-0 shadow-sm">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image';
                            e.currentTarget.onerror = null;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        {item.category && (
                          <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                        )}
                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                           <div className="flex flex-wrap gap-1 mb-2">
                             {Object.entries(item.attributes).map(([key, val]) => (
                               <span key={key} className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                                 {key}: {String(val)}
                               </span>
                             ))}
                           </div>
                        )}
                        <p className="text-lg font-bold text-red-600">{formatPrice(item.price)}</p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(itemId, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(itemId)}
                        className="p-2 h-fit hover:bg-red-50 rounded-lg transition-colors group"
                      >
                        <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </button>
                    </motion.div>
                  )})}

                  {/* Clear Cart Button */}
                  {cartItems.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear Cart
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer - Summary & Checkout */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (10%)</span>
                    <span className="font-semibold">{formatPrice(tax)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-red-600">{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onCheckout();
                    onClose();
                  }}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigate('shop');
                  }}
                  className="w-full mt-3 py-3 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
