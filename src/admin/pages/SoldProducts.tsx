import { useState, useEffect } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { adminAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface SoldProduct {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  price: number;
  date: string;
  digitalItem: {
    email?: string;
    password?: string;
    code?: string;
  };
}

export function SoldProducts() {
  const { formatPrice } = useStoreSettings();
  const [products, setProducts] = useState<SoldProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getSoldProducts();
      
      // Map API response (snake_case) to component interface (camelCase)
      const mappedProducts: SoldProduct[] = (data || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        productName: order.product_name,
        price: order.amount,
        date: order.created_at,
        digitalItem: {
          email: order.digital_email,
          password: order.digital_password,
          code: order.digital_code
        }
      }));

      setProducts(mappedProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProducts = products.filter(p => 
    (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sold Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage sold digital keys</p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, customers, or order numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading sold products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No sold products found matching your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{product.productName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{product.orderNumber}</p>
                </div>
                <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  Sold
                </div>
              </div>

              <div className="space-y-3 flex-grow">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{product.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Email:</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]" title={product.customerEmail}>{product.customerEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(product.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Price:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(product.price)}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Digital Key / Credentials</p>
                  
                  {product.digitalItem.code && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2">
                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold truncate mr-2 select-all">
                          {product.digitalItem.code}
                        </code>
                        <button 
                          onClick={() => handleCopy(product.digitalItem.code!, `code-${product.id}`)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Copy Code"
                        >
                          {copiedId === `code-${product.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {(product.digitalItem.email || product.digitalItem.password) && (
                    <div className="space-y-2 mt-2">
                      {product.digitalItem.email && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-mono bg-white px-1 rounded select-all">{product.digitalItem.email}</span>
                        </div>
                      )}
                      {product.digitalItem.password && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Pass:</span>
                          <span className="font-mono bg-white px-1 rounded select-all">{product.digitalItem.password}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!product.digitalItem.code && !product.digitalItem.email && !product.digitalItem.password && (
                    <div className="text-center text-sm text-gray-500 italic">
                      No digital content recorded
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
