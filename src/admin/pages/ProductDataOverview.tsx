import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Key, Search, List, Tag, User } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { productsAPI, customersAPI, categoriesAPI } from '../../utils/api';

interface ProductOverview {
  product: {
    id: number;
    name: string;
    image: string;
  };
  stats: {
    totalSold: number;
    totalRemaining: number;
  };
  remainingItems: Array<{
    email?: string;
    password?: string;
    code?: string;
    type?: string;
    status?: string;
  }>;
  soldItems: Array<{
    orderId: number;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    date: string;
    email?: string;
    password?: string;
    code?: string;
  }>;
  customers: Array<{
    name: string;
    email: string;
    date: string;
    orderNumber: string;
  }>;
}

export function ProductDataOverview() {
  const [view, setView] = useState<'product_details' | 'all_products' | 'all_customers' | 'categories'>('product_details');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProductOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sold' | 'customers' | 'products_inventory'>('products_inventory');
  const [allProductsInventory, setAllProductsInventory] = useState<any[]>([]);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [visibleSlots, setVisibleSlots] = useState<Record<string, boolean>>({
    'Primary ps4': true,
    'Primary ps5': true,
    'Secondary': true,
    'Offline ps4': false,
    'Offline ps5': false
  });

  // Filter inventory based on selected product
  const filteredInventory = selectedProductId === 'all' 
    ? allProductsInventory 
    : allProductsInventory.filter(item => {
        // Ensure string comparison
        return String(item.productId) === String(selectedProductId);
    });

  // Get only products that have digital items for dropdown
  const productsWithDigitalItems = products.filter(product => 
    // Show all products if we are in 'all' mode, or filter if needed
    // For now let's show all products to debug
    true
  );

  // Error boundary for component
  if (componentError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">Something went wrong</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{componentError}</div>
          <button 
            onClick={() => setComponentError(null)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProducts();
        await loadCustomers();
        await loadCategories();
        await loadAllProductsInventory();
      } catch (error) {
        console.error('Error loading data:', error);
        setComponentError('Failed to load data. Please try again.');
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      if (selectedProductId === 'all') {
        setActiveTab('products_inventory');
      } else {
        loadOverview(selectedProductId);
      }
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      if (res.products || Array.isArray(res)) {
        const productList = res.products || res;
        setProducts(productList);
        // Default to "all" products view instead of first product
        if (!selectedProductId || selectedProductId !== 'all') {
          setSelectedProductId('all');
        }
      }
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await customersAPI.getAll();
      if (res.customers) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      if (Array.isArray(res)) {
        setCategories(res);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadOverview = async (id: string) => {
    setLoading(true);
    try {
      console.log('Loading overview for product ID:', id);
      const res = await productsAPI.getOverview(id);
      console.log('Overview response:', res);
      
      // Validate the response structure
      if (!res || typeof res !== 'object') {
        console.error('Invalid overview response:', res);
        setData(null);
        return;
      }
      
      // Ensure stats object exists with default values
      const safeData = {
        ...res,
        stats: {
          totalSold: res.stats?.totalSold || 0,
          totalRemaining: res.stats?.totalRemaining || 0
        },
        product: res.product || { id: 0, name: 'Unknown Product', image: '' },
        soldItems: Array.isArray(res.soldItems) ? res.soldItems : [],
        customers: Array.isArray(res.customers) ? res.customers : [],
        remainingItems: Array.isArray(res.remainingItems) ? res.remainingItems : []
      };
      
      console.log('Safe data set:', safeData);
      setData(safeData);
    } catch (err) {
      console.error('Failed to load overview:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProductsInventory = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading products inventory...');
      const res = await productsAPI.getAll();
      console.log('Products API response:', res);
      
      if (res.products || Array.isArray(res)) {
        const productList = res.products || res;
        console.log('Product list:', productList);
        const inventoryData = [];
        
        for (const product of productList) {
          console.log('Processing product:', product.name, 'digital_items:', product.digital_items);
          
          try {
            // Handle both camelCase (DB) and snake_case (legacy/API)
            const rawDigitalItems = product.digitalItems || product.digital_items;
            const digitalItems = typeof rawDigitalItems === 'string' 
              ? JSON.parse(rawDigitalItems) 
              : (rawDigitalItems || []);
            
            console.log('Parsed digital items:', digitalItems);
            
            if (Array.isArray(digitalItems) && digitalItems.length > 0) {
              for (const digitalItem of digitalItems) {
                // Only add to inventory if there's actual data
                if (digitalItem.email || digitalItem.password || digitalItem.code || 
                    digitalItem.region || digitalItem.onlineId || digitalItem.outlookEmail) {
                  inventoryData.push({
                    productId: product.id,
                    productName: product.name,
                    email: digitalItem.email || '',
                    sonyPass: digitalItem.password || '',
                    emailPass: digitalItem.password || '',
                    codes: digitalItem.slots || {},
                    region: digitalItem.region || '',
                    onlineId: digitalItem.onlineId || ''
                  });
                  console.log('✅ Added inventory item for:', product.name);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing digital items for product:', product.id, e);
            // Skip products with parsing errors to avoid empty rows
          }
        }
        
        console.log('Final inventory data:', inventoryData);
        console.log('📊 Total inventory items:', inventoryData.length);
        setAllProductsInventory(inventoryData);
      } else {
        console.warn('⚠️ No products data found in response');
        setAllProductsInventory([]);
      }
    } catch (err) {
      console.error('❌ Failed to load products inventory:', err);
      setAllProductsInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const renderProductDetails = () => {
    // If no product is selected (selectedProductId is 'all'), show a placeholder or summary
    // But we want to allow selecting a product.
    // If 'all' is selected, maybe we shouldn't show the detailed product stats which are specific to ONE product.
    
    // However, if we want to show aggregated stats for ALL products when 'all' is selected, we need to handle that.
    // For now, let's just ensure we don't crash and show a friendly message or aggregated data.

    const currentProduct = selectedProductId === 'all' 
        ? { name: 'All Products', image: '', id: 0 } 
        : products.find(p => p.id.toString() === selectedProductId.toString()) || { name: 'Unknown Product', image: '', id: 0 };

    const totalSold = data?.stats?.totalSold || 0;
    const totalRemaining = data?.stats?.totalRemaining || 0;
    const totalInventory = totalSold + totalRemaining;
    const customerCount = data?.customers?.length || 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Products Inventory Overview</h2>
            <p className="text-gray-500 dark:text-gray-400">View all products inventory data or select a specific product</p>
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
            >
              <option value="all">All Products</option>
              {productsWithDigitalItems.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Product Header Card - Only show if a specific product is selected */}
            {selectedProductId !== 'all' && (
                <Card className="p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex gap-6">
                        <img 
                            src={currentProduct.image || 'https://via.placeholder.com/150'} 
                            alt={currentProduct.name} 
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{currentProduct.name}</h3>
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <p>Total Sales: {totalSold}</p>
                                <p>Current Stock: {totalRemaining}</p>
                                <p>Total Customers: {customerCount}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stats Cards - Aggregated or Specific */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Inventory</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalInventory}
                    </h3>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Sold Items</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalSold}
                    </h3>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Key className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Remaining Stock</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalRemaining}
                    </h3>
                  </div>
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex gap-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-all rounded-t-lg ${
                    activeTab === 'overview'
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-black hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('sold')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-all rounded-t-lg ${
                    activeTab === 'sold'
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-black hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  Sold / Used Keys
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-all rounded-t-lg ${
                    activeTab === 'customers'
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-black hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  Customers
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-all rounded-t-lg ${
                    activeTab === 'inventory'
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-black hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  Remaining Inventory
                </button>
                <button
                  onClick={() => setActiveTab('products_inventory')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-all rounded-t-lg ${
                    activeTab === 'products_inventory'
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-black hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                >
                  Products Inventory
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {activeTab === 'overview' && (
                <div className="p-6">
                  <div className="flex gap-6">
                    <img 
                      src={data?.product?.image || '/placeholder-image.png'} 
                      alt={data?.product?.name || 'Product'} 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{data?.product?.name || 'Product Name'}</h3>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p>Total Sales: {data?.stats?.totalSold || 0}</p>
                        <p>Current Stock: {data?.stats?.totalRemaining || 0}</p>
                        <p>Total Customers: {data?.customers?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sold' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Order #</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Delivered Key/Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(data?.soldItems || []).map((item) => (
                        <tr key={item.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                            {item.orderNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white">{item.customerName}</div>
                            <div className="text-xs text-gray-500">{item.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                            {item.code || item.password || item.email || 'N/A'}
                          </td>
                        </tr>
                      ))}
                      {(data?.soldItems || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            No sales recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'customers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Purchase Date</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Order #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(data?.customers || []).map((customer, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            {new Date(customer.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            {customer.orderNumber}
                          </td>
                        </tr>
                      ))}
                      {(data?.customers || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            No customers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Data</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(data?.remainingItems || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-gray-900 dark:text-white capitalize">
                            {item.type || (item.code ? 'Code' : 'Account')}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                            {item.code ? `Code: ${item.code}` : `Email: ${item.email}`}
                            {item.password && <span className="ml-2 text-gray-400">| Pass: ***</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                              Available
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(data?.remainingItems || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            Out of stock
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'products_inventory' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Product Name</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Sony Pass</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Email-Pass</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Codes</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">Show Slots</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Region</th>
                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Online ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredInventory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            <div className="text-sm">{item.email}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            <div className="text-sm font-mono">{item.sonyPass}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            <div className="text-sm font-mono">{item.emailPass}</div>
                          </td>
                          <td className="px-6 py-4">
                            <select className="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500">
                              <option value="">All Codes</option>
                              <option value="all-codes" style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                                📋 All Codes ({Object.keys(item.codes || {}).length} slots)
                              </option>
                              {Object.entries((item.codes || {}) as Record<string, any>).map(([slotType, slotData]: [string, any]) => (
                                <option 
                                  key={slotType} 
                                  value={slotType}
                                  style={{ color: slotData.sold ? '#dc2626' : '#16a34a', backgroundColor: '#f0fdf4' }}
                                >
                                  {slotData.sold ? '❌' : '✅'} {slotType}: {slotData.sold ? 'Reserved' : 'Available'} - {slotData.code || 'N/A'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <select className="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500">
                              <option value="all">All Slots</option>
                              {Object.keys(item.codes || {})
                                .filter(slotType => !slotType.toLowerCase().includes('offline'))
                                .map(slotType => (
                                  <option key={slotType} value={slotType}>
                                    {slotType}: {visibleSlots[slotType] ? 'Visible' : 'Hidden'}
                                  </option>
                                ))
                              }
                            </select>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            <div className="text-sm">{item.region}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            <div className="text-sm">{item.onlineId}</div>
                          </td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            {selectedProductId === 'all' ? 'No inventory items found' : 'No inventory items found for this product'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderAllProducts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Listed Products</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total Products: {products.length}
        </div>
      </div>
      <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Product Name</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Price</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Stock Status</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => {
                 let stock = 0;
                 try {
                   const rawDigitalItems = product.digitalItems || product.digital_items;
                   const digitalItems = typeof rawDigitalItems === 'string' 
                     ? JSON.parse(rawDigitalItems) 
                     : (rawDigitalItems || []);
                   stock = digitalItems.length;
                 } catch (e) { stock = 0; }

                 return (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image && (
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">
                      {product.category_slug?.replace(/-/g, ' ') || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        stock > 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {stock > 0 ? `${stock} in stock` : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          setSelectedProductId(product.id.toString());
                          setView('product_details');
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View Analytics
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderAllCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Customers</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total Customers: {customers.length}
        </div>
      </div>
      <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Join Date</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Orders</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Total Spent</th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {customer.joinDate}
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                    {customer.orders}
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                    ${typeof customer.spent === 'number' ? customer.spent.toFixed(2) : customer.spent}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      customer.status === 'VIP'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderCategories = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Categories</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Categories: {categories.length}
          </div>
        </div>
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Icon</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Slug</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-2xl">{category.icon}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{category.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{category.slug}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{category.display_order}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        category.is_active 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Comprehensive view of your platform data</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setView('product_details')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'product_details'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-black hover:bg-red-600 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Product Details</span>
            </div>
          </button>
          <button
            onClick={() => setView('all_products')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'all_products'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-black hover:bg-red-600 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span>All Products</span>
            </div>
          </button>
          <button
            onClick={() => setView('all_customers')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'all_customers'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-black hover:bg-red-600 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Customers</span>
            </div>
          </button>
          <button
            onClick={() => setView('categories')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'categories'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-black hover:bg-red-600 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>Categories</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {view === 'product_details' && renderProductDetails()}
      {view === 'all_products' && renderAllProducts()}
      {view === 'all_customers' && renderAllCustomers()}
      {view === 'categories' && renderCategories()}
    </div>
  );
}
