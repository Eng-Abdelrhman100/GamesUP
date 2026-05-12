import { useState, useEffect } from 'react';
import { Search, Star, Mail, Phone, MapPin, X, User, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { customersAPI, ordersAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { AnimatePresence } from 'motion/react';

export function Customers() {
  const { settings, formatPrice } = useStoreSettings();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer?.email) {
      loadCustomerOrders(selectedCustomer.email);
    }
  }, [selectedCustomer]);

  const loadCustomerOrders = async (email: string) => {
    try {
      setOrdersLoading(true);
      const data = await ordersAPI.getAll({ email });
      setCustomerOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load customer orders:', error);
      setCustomerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersAPI.getAll();
      if (data && data.customers) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    setIsDeleting(true);
    try {
      await customersAPI.delete(selectedCustomer.email);
      setToast({ message: 'Customer deleted successfully', type: 'success' });
      setCustomers(customers.filter(c => c.email !== selectedCustomer.email));
      setSelectedCustomer(null);
      setShowDeleteModal(false);
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      setToast({ message: err.message || 'Failed to delete customer', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const triggerDelete = (customer: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the details modal
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage customer profiles and relationships</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{customers.length}</p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">VIP Customers</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {customers.filter((c) => c.status === 'VIP').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {customers.length > 0 
              ? Math.round(customers.reduce((acc, c) => acc + c.orders, 0) / customers.length)
              : 0}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lifetime Value</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatPrice(customers.reduce((acc, c) => acc + c.spent, 0))}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </Card>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-lg hover:border-red-500 dark:hover:border-red-500 transition-all p-8 group relative"
              onClick={() => setSelectedCustomer(customer)}
            >
              {/* Delete Icon - visible on hover */}
              <button 
                onClick={(e) => triggerDelete(customer, e)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Delete Customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 pr-10">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{customer.name}</h4>
                    {customer.status === 'VIP' && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0">
                        <Star className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate pr-10">{customer.email}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Orders</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{customer.orders}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Spent</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(customer.spent)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Customer Details Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}></div>
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                  title="Delete Account"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Account</span>
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
                    {selectedCustomer.status === 'VIP' && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customer since {selectedCustomer.joinDate}</p>
                </div>
              </div>

              {/* Contact Info */}
              <Card className="p-8">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedCustomer.location}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{selectedCustomer.orders}</p>
                </Card>
                <Card className="p-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatPrice(selectedCustomer.spent)}</p>
                </Card>
              </div>

              {/* Order History */}
              <Card>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h4>
                <div className="space-y-3">
                  {ordersLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading orders...</div>
                  ) : customerOrders.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No orders found.</div>
                  ) : (
                    customerOrders.map((order) => (
                      <div
                        key={order.id || order.order_number}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{order.order_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{order.product_name || '—'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(order.amount || 0)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'completed' || order.status === 'delivered' || order.status === 'paid' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {String(order.status || '').charAt(0).toUpperCase() + String(order.status || '').slice(1)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Notes */}
              <Card>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Notes</h4>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Add notes about this customer..."
                ></textarea>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Customer Account"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">Warning: Permanent Action</h4>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Are you sure you want to permanently delete the account for <span className="font-bold">{selectedCustomer?.name}</span>? This action cannot be undone and will remove their access to the store.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCustomer}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
