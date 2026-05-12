import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, Calendar, MessageCircle } from 'lucide-react';
import { ordersAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { OrderChatModal } from './OrderChatModal';

interface TrackOrderProps {
  onBack: () => void;
}

export function TrackOrder({ onBack }: TrackOrderProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChatOrder, setSelectedChatOrder] = useState<any>(null);
  const { formatPrice } = useStoreSettings();

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      // Use search parameter to find order by number
      const response = await ordersAPI.getAll({ search: orderNumber });

      if (response && response.orders && response.orders.length > 0) {
        // Find exact match if multiple returned
        const foundOrder = response.orders.find((o: any) => o.order_number === orderNumber);
        if (foundOrder) {
            setOrder(foundOrder);
        } else {
            setError('Order not found. Please check your order number and try again.');
        }
      } else {
        setError('Order not found. Please check your order number and try again.');
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError('Failed to track order. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  const statusSteps = [
    { id: 'pending', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
    { id: 'processing', label: 'Processing', icon: Clock, description: 'We are preparing your order' },
    { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Your order is on the way' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle, description: 'Order delivered successfully' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-600">Enter your order number to track your delivery</p>
        </div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleTrackOrder}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g., GU12345678)"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Order
                </>
              )}
            </button>
          </div>
        </motion.form>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 text-center"
          >
            <p className="text-red-800 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Order Details */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Order Info Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-100 mb-1">Order Number</p>
                    <p className="text-2xl font-bold">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-100 mb-1">Order Date</p>
                    <p className="font-semibold">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                </div>
                {['processing', 'shipped', 'completed', 'delivered', 'paid', 'awaiting_payment'].includes(order.status) && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setSelectedChatOrder(order)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-medium flex items-center gap-2 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Support
                    </button>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Delivery Status</h3>
                <div className="relative">
                  {statusSteps.map((step, index) => {
                    const currentStep = getStatusStep(order.status);
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {/* Connector Line */}
                        {index < statusSteps.length - 1 && (
                          <div
                            className={`absolute left-6 top-12 w-0.5 h-full ${
                              isCompleted ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          />
                        )}

                        {/* Icon */}
                        <div
                          className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <p className={`font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          <p className={`text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                            {step.description}
                          </p>
                          {isCurrent && (
                            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              Current Status
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Shipping Address
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-900">{order.shippingAddress?.fullName}</p>
                <p className="text-gray-600 mt-1">{order.shippingAddress?.address}</p>
                <p className="text-gray-600">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                </p>
                <p className="text-gray-600 mt-2">
                  <span className="font-medium">Phone:</span> {order.shippingAddress?.phone}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                Order Items ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-sm font-bold text-red-600 mt-1">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Order Total</span>
                  <span className="text-red-600">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-600" />
                Delivery Method
              </h3>
              <p className="text-gray-700 font-medium">{order.deliveryMethod}</p>
            </div>
          </motion.div>
        )}

        {/* Order Chat Modal */}
        {selectedChatOrder && (
          <OrderChatModal
            order={selectedChatOrder}
            onClose={() => setSelectedChatOrder(null)}
          />
        )}
      </div>
    </div>
  );
}
