import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { productsAPI, posAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface Product {
  id: string | number;
  name: string;
  category: string;
  subCategory?: string;
  price: string;
  stock: number;
  image: string;
  attributes?: Record<string, any>;
  purchasedEmail?: string;
  purchasedPassword?: string;
  productCode?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export function POS() {
  const { settings, formatPrice } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await productsAPI.getPublic();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Cannot add more. Stock limit reached.');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string | number, change: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.stock) {
          alert('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string | number) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', email: '', phone: '', address: '' });
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (settings.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      alert('Please enter customer name and phone number');
      return;
    }

    try {
      setLoading(true);
      
      const invoiceData = {
        customer: customerInfo,
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.price) * item.quantity,
          attributes: item.attributes || {},
          // Include product credentials if available
          purchasedEmail: item.purchasedEmail || null,
          purchasedPassword: item.purchasedPassword || null,
          productCode: item.productCode || null,
        })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        date: new Date().toISOString(),
        invoiceNumber: `INV-${Date.now()}`,
      };

      const result: any = await posAPI.createInvoice(invoiceData);
      setLastInvoice(result.invoice);
      setShowInvoice(true);
      
      // Clear cart after successful checkout
      setCart([]);
      setCustomerInfo({ name: '', email: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Select products and create invoices</p>
        </div>
        {cart.length > 0 && (
          <Button onClick={clearCart} variant="secondary">
            Clear Cart
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters */}
          <Card className="p-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>All</option>
                <option>Consoles</option>
                <option>Accessories</option>
                <option>Games</option>
                <option>Services</option>
              </select>
            </div>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow p-8">
                <div onClick={() => addToCart(product)}>
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <Card>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No products found
              </div>
            </Card>
          )}
        </div>

        {/* Cart and Checkout Section */}
        <div className="space-y-4">
          {/* Customer Information */}
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer Name *"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="text"
                placeholder="Address (optional)"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </Card>

          {/* Cart */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({cart.length})
              </h3>
            </div>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  Cart is empty. Click on products to add them.
                </div>
              )}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(calculateSubtotal())}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({settings.tax_rate}%):</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(calculateTax())}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full mt-4"
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </Button>
          </Card>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between print:hidden">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Generated</h2>
              <button
                onClick={() => setShowInvoice(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Content */}
            <div className="p-8" id="invoice-content">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Games - Up</h1>
                <p className="text-gray-600 dark:text-gray-400">Gaming Store Invoice</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bill To:</h3>
                  <p className="text-gray-600 dark:text-gray-400">{lastInvoice.customer.name}</p>
                  <p className="text-gray-600 dark:text-gray-400">{lastInvoice.customer.phone}</p>
                  {lastInvoice.customer.email && (
                    <p className="text-gray-600 dark:text-gray-400">{lastInvoice.customer.email}</p>
                  )}
                  {lastInvoice.customer.address && (
                    <p className="text-gray-600 dark:text-gray-400">{lastInvoice.customer.address}</p>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Invoice Details:</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Invoice #: {lastInvoice.invoiceNumber}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Date: {new Date(lastInvoice.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Item</th>
                    <th className="text-center py-2 text-gray-900 dark:text-white">Qty</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Price</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastInvoice.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        <div>{item.productName}</div>
                        {item.attributes && Object.entries(item.attributes).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(item.attributes).map(([key, val]) => (
                              <span key={key} className="mr-2">{key}: {String(val)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatPrice(item.price)}
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatPrice(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">{formatPrice(lastInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="text-gray-900 dark:text-white">{formatPrice(lastInvoice.tax)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 dark:border-gray-600 pt-2">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-red-600 dark:text-red-400">{formatPrice(lastInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Product Credentials Section */}
              {lastInvoice.items.some((item: any) => item.purchasedEmail || item.productCode) && (
                <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">IMPORTANT</span>
                    Product Access Credentials
                  </h3>
                  <div className="space-y-4">
                    {lastInvoice.items.map((item: any, index: number) => {
                      if (!item.purchasedEmail && !item.productCode) return null;
                      
                      return (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{item.productName}</h4>
                          <div className="space-y-2 text-sm">
                            {item.purchasedEmail && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Email: </span>
                                <span className="font-mono text-gray-900 dark:text-white">{item.purchasedEmail}</span>
                              </div>
                            )}
                            {item.purchasedPassword && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Password: </span>
                                <span className="font-mono text-gray-900 dark:text-white">{item.purchasedPassword}</span>
                              </div>
                            )}
                            {item.productCode && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Product Code: </span>
                                <span className="font-mono font-bold text-red-600 dark:text-red-400">{item.productCode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                    ⚠️ Please keep this information secure. These credentials are for your personal use only.
                  </p>
                </div>
              )}

              <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p>Thank you for your business!</p>
                <p>For support, contact us at support@gamesup.com</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 print:hidden">
              <Button onClick={handlePrintInvoice} icon={Printer} className="flex-1">
                Print Invoice
              </Button>
              <Button onClick={() => setShowInvoice(false)} variant="secondary" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
