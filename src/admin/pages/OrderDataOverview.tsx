import { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/ui/card';
import { Package, ShoppingCart, TrendingUp, Users, DollarSign, Clock, CheckCircle, Edit2, X, Plus } from 'lucide-react';
import { ordersAPI, productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

// Force refresh

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  recentOrders: any[];
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  product_name: string;
  status: string;
  amount: number;
  created_at: string;
  payment_method: string;
}

interface GameAccount {
  id: string;
  productId: string | number;
  gameName: string;
  email: string;
  sonyPass: string;
  birthdate: string;
  emailPass: string;
  inventory: { label: string; code: string; status: string; customerName?: string; customerEmail?: string; customerPhone?: string; orderId?: string }[];
  region: string;
  onlineId: string;
  status: string;
}

interface GiftCard {
  id: string;
  productId: string | number;
  productName: string;
  code: string;
  status: 'Available' | 'Sold';
  customerName?: string;
  customerEmail?: string;
  orderId?: string;
}

interface EditableCellProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  isMono?: boolean;
}

function EditableCell({ initialValue, onSave, placeholder, className = '', isMono = false }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only update local value from props if we are NOT currently editing
    if (!isEditing) {
      setValue(initialValue);
    }
  }, [initialValue, isEditing]);

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    // Focus will be handled by autoFocus, but we can ensure it here too
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }
    
    try {
      setIsSaving(true);
      await onSave(value);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setValue(initialValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave(e);
            if (e.key === 'Escape') handleCancel(e);
          }}
          onBlur={(e) => {
            // Optional: Auto-save on blur if you prefer
            // handleSave();
          }}
          className="w-full px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
          autoFocus
          placeholder={placeholder}
          disabled={isSaving}
        />
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="text-green-600 hover:text-green-700 disabled:opacity-50 shrink-0"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent animate-spin rounded-full" /> : <CheckCircle className="w-4 h-4" />}
        </button>
        <button 
          onClick={handleCancel}
          disabled={isSaving}
          className="text-red-600 hover:text-red-700 disabled:opacity-50 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`group relative cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-1 rounded transition-colors min-h-[1.5rem] flex items-center ${className}`}
      onClick={handleStartEditing}
    >
      <span className={!initialValue ? 'text-gray-400 italic text-xs' : `text-gray-500 dark:text-gray-400 ${isMono ? 'font-mono' : ''}`}>
        {initialValue || '-'}
      </span>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit2 className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}

export function OrderDataOverview() {
  const { formatPrice } = useStoreSettings();
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  
  const [gameAccounts, setGameAccounts] = useState<GameAccount[]>([]);
  const [originalProducts, setOriginalProducts] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [selectedGiftCardProduct, setSelectedGiftCardProduct] = useState<string>('all');
  const [uniqueGiftCardProducts, setUniqueGiftCardProducts] = useState<string[]>([]);

  const [visibleDetails, setVisibleDetails] = useState<Record<string, boolean>>({});
  
  const toggleDetails = (slotId: string) => {
    setVisibleDetails(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }));
  };

  const saveField = async (account: GameAccount, field: string, newValue: string) => {
    try {
      const productIndex = originalProducts.findIndex(p => p.id === account.productId);
      if (productIndex === -1) throw new Error('Product not found');
      
      const product = { ...originalProducts[productIndex] };
      const digitalItems = Array.isArray(product.digitalItems) ? [...product.digitalItems] : [];
      
      // Find item by ID or fallback to email lookup
      const itemIndex = digitalItems.findIndex(item => (item.id && item.id === account.id) || item.email === account.email);
      if (itemIndex === -1) throw new Error('Digital item not found');
      
      const item = { ...digitalItems[itemIndex] };
      
      if (field === 'email') item.email = newValue;
      else if (field === 'sonyPass') item.password = newValue;
      else if (field === 'birthdate') item.birthdate = newValue;
      else if (field === 'emailPass') item.outlookPassword = newValue;
      else if (field === 'region') item.region = newValue;
      else if (field === 'onlineId') item.onlineId = newValue;
      
      digitalItems[itemIndex] = item;
      product.digitalItems = digitalItems;
      
      await productsAPI.update(product.id, { digitalItems: product.digitalItems });
      await loadData();
    } catch (err) {
      console.error('Error saving field:', err);
      throw err;
    }
  };

  const saveSlotCustomer = async (account: GameAccount, slotType: string, newValue: string) => {
    try {
      console.log('saveSlotCustomer called:', { accountId: account.id, email: account.email, productId: account.productId, slotType, newValue });
      
      const normalizedSlotType = slotType.toLowerCase();
      
      const productIndex = originalProducts.findIndex(p => p.id === account.productId);
      if (productIndex === -1) throw new Error('Product not found: ' + account.productId);
      
      const product = { ...originalProducts[productIndex] };
      console.log('Found product:', product.name, product.id);
      
      const digitalItems = Array.isArray(product.digitalItems) ? [...product.digitalItems] : [];
      console.log('Digital items count:', digitalItems.length);
      
      // Debug: log all item emails and ids
      digitalItems.forEach((item, idx) => {
        console.log(`Item ${idx}: id=${item.id}, email=${item.email}`);
      });
      
      const itemIndex = digitalItems.findIndex(item => (item.id && item.id === account.id) || item.email === account.email);
      console.log('Found itemIndex:', itemIndex);
      
      if (itemIndex === -1) throw new Error('Digital item not found for: ' + account.email);
      
      const item = { ...digitalItems[itemIndex] };
      if (!item.slots) {
        item.slots = {};
      }
      const slots = { ...item.slots };
      
      let actualSlotKey: string | null = null;
      for (const key of Object.keys(slots)) {
        if (key.toLowerCase() === normalizedSlotType || key.toLowerCase().includes(normalizedSlotType)) {
          actualSlotKey = key;
          break;
        }
      }
      
      console.log('Found slotKey:', actualSlotKey, 'slots:', Object.keys(slots));
      
      if (!actualSlotKey) {
        actualSlotKey = slotType;
        slots[actualSlotKey] = { sold: false, orderId: null, code: '', price: 0, cost: 0 };
      }
      
      const slot = { ...slots[actualSlotKey] };
      console.log('Found slot:', slot);
      let orderUpdated = false;
      
      if (slot.sold && slot.orderId && slot.orderId !== 'MANUAL') {
        const order = originalOrders.find((o: any) => 
          o.id?.toString() === slot.orderId?.toString() || 
          o.order_number === slot.orderId
        );
        console.log('Found order:', order);
        if (order) {
          await ordersAPI.update(order.id, { customer_name: newValue });
          orderUpdated = true;
          console.log('Updated order customer_name to:', newValue);
        }
      }
      
      slot.customerName = newValue;
      
      if (!slot.sold) {
        slot.sold = true;
        slot.orderId = slot.orderId || 'MANUAL';
      }
      
      slots[actualSlotKey] = slot;
      item.slots = slots;
      digitalItems[itemIndex] = item;
      product.digitalItems = digitalItems;
      
      console.log('Saving to product.id:', product.id, 'with digitalItems:', JSON.stringify(digitalItems[itemIndex]));
      
      await productsAPI.update(product.id, { digitalItems: product.digitalItems });
      console.log('Save successful!');
      await loadData();
    } catch (err) {
      console.error('Error saving slot:', err);
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
      throw err;
    }
  };

  const markGiftCardAsSold = async (giftCard: GiftCard) => {
    try {
      const customerName = prompt('Enter customer name:');
      if (!customerName) return;
      
      const customerEmail = prompt('Enter customer email (optional):') || '';
      
      // Find the product
      const productIndex = originalProducts.findIndex(p => p.id === giftCard.productId);
      if (productIndex === -1) throw new Error('Product not found');
      
      const product = { ...originalProducts[productIndex] };
      const digitalItems = Array.isArray(product.digitalItems) ? [...product.digitalItems] : [];
      
      // Find and update the item
      const itemIndex = digitalItems.findIndex(item => item.id === giftCard.id);
      if (itemIndex === -1) throw new Error('Gift card not found');
      
      const item = { ...digitalItems[itemIndex] };
      if (!item.slots) item.slots = {};
      
      // Add sold info to the first slot or create one
      const slotKey = 'Gift Card';
      item.slots[slotKey] = {
        sold: true,
        orderId: 'MANUAL',
        code: giftCard.code,
        customerName,
        customerEmail
      };
      
      digitalItems[itemIndex] = item;
      product.digitalItems = digitalItems;
      
      // Update stock count
      product.stock = Math.max(0, (product.stock || 1) - 1);
      product.status = product.stock === 0 ? 'Out of Stock' : 'In Stock';
      
      await productsAPI.update(product.id, { digitalItems, stock: product.stock, status: product.status });
      await loadData();
    } catch (err) {
      console.error('Error marking gift card as sold:', err);
      alert('Failed to update gift card');
    }
  };

  const markGiftCardAsAvailable = async (giftCard: GiftCard) => {
    try {
      // Find the product
      const productIndex = originalProducts.findIndex(p => p.id === giftCard.productId);
      if (productIndex === -1) throw new Error('Product not found');
      
      const product = { ...originalProducts[productIndex] };
      const digitalItems = Array.isArray(product.digitalItems) ? [...product.digitalItems] : [];
      
      // Find and update the item
      const itemIndex = digitalItems.findIndex(item => item.id === giftCard.id);
      if (itemIndex === -1) throw new Error('Gift card not found');
      
      const item = { ...digitalItems[itemIndex] };
      if (item.slots && item.slots['Gift Card']) {
        delete item.slots['Gift Card'];
      }
      
      digitalItems[itemIndex] = item;
      product.digitalItems = digitalItems;
      
      // Update stock count
      product.stock = (product.stock || 0) + 1;
      product.status = 'In Stock';
      
      await productsAPI.update(product.id, { digitalItems, stock: product.stock, status: product.status });
      await loadData();
    } catch (err) {
      console.error('Error marking gift card as available:', err);
      alert('Failed to update gift card');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Starting loadData...');
      if (isInitialLoad) setLoading(true);
      setError(null);
      
      console.log('Fetching products and orders...');
      const [productsRes, ordersRes] = await Promise.all([
        productsAPI.getAll(),
        ordersAPI.getAll()
      ]);
      
      console.log('Data fetched successfully');
      const products = productsRes.products || [];
      const orders = ordersRes.orders || [];
      
      setOriginalProducts(products);
      setOriginalOrders(orders);

      // --- Process Stats ---
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((order: any) => order.status === 'pending').length;
      const completedOrders = orders.filter((order: any) => ['delivered', 'completed', 'paid'].includes(order.status)).length;
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.amount, 0);
      const recentOrders = orders.slice(0, 5);
      
      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        recentOrders
      });

      // --- Process Game Accounts ---
      const accounts: GameAccount[] = [];

      if (products) {
        products.forEach((product: any) => {
          // Handle both camelCase (DB) and snake_case (legacy/API)
          const rawDigitalItems = product.digitalItems || product.digital_items;
          const digitalItems = typeof rawDigitalItems === 'string' 
            ? JSON.parse(rawDigitalItems) 
            : (rawDigitalItems || []);

          if (digitalItems && Array.isArray(digitalItems)) {
            digitalItems.forEach((item: any, idx: number) => {
              // Aggregate slots for this digital item
              const inventory: { label: string; code: string; status: string; customerName?: string; customerEmail?: string; customerPhone?: string; orderId?: string }[] = [];
              let hasAvailable = false;
              let hasSold = false;

              if (item.slots) {
                Object.entries(item.slots).forEach(([slotName, slotData]: [string, any]) => {
                  if (slotData.code) {
                    let customerName, customerEmail, customerPhone, orderId;
                    
                    if (slotData.sold) {
                      customerName = slotData.customerName;
                      if (slotData.orderId) {
                        // Find order to get customer details
                        const order = orders.find((o: any) => o.id.toString() === slotData.orderId.toString() || o.order_number === slotData.orderId);
                        if (order) {
                          customerName = order.customer_name || customerName;
                          customerEmail = order.customer_email;
                          orderId = order.order_number || order.id;
                        } else if (slotData.orderId === 'MANUAL') {
                          orderId = 'MANUAL';
                        }
                      }
                    }

                    inventory.push({
                      label: slotName,
                      code: slotData.code,
                      status: slotData.sold ? 'Sold' : 'Available',
                      customerName,
                      customerEmail,
                      customerPhone,
                      orderId
                    });
                    if (slotData.sold) hasSold = true;
                    else hasAvailable = true;
                  }
                });
              }
              
              // Add backup codes to inventory list
              if (item.backupCodes) {
                 const backups = item.backupCodes.split(/[\n,]+/).map((c: string) => c.trim()).filter(Boolean);
                 backups.forEach((bc: any, idx: any) => {
                   inventory.push({
                     label: `Backup Code ${idx + 1}`,
                     code: bc,
                     status: 'Backup'
                   });
                 });
              } else if (item.code && inventory.length === 0) {
                 // Fallback if no slots but simple code
                 inventory.push({
                   label: 'Code',
                   code: item.code,
                   status: 'Available'
                 });
                 hasAvailable = true;
              }

              // Determine overall status
              let status = 'Unknown';
              if (hasAvailable && !hasSold) status = 'In Stock';
              else if (!hasAvailable && hasSold) status = 'Sold Out';
              else if (hasAvailable && hasSold) status = 'Partially Sold';
              else if (inventory.length > 0) status = 'In Stock'; // Default fallback

              accounts.push({
                id: item.id || `temp-${idx}`, // Stable ID
                productId: product.id,
                gameName: product.name,
                email: item.email || '',
                sonyPass: item.password || '',
                birthdate: item.birthdate || '',
                emailPass: item.outlookPassword || '',
                inventory: inventory,
                region: item.region || '',
                onlineId: item.onlineId || '',
                status: status
              });
            });
          }
        });
      }
      setGameAccounts(accounts);
      
      // Extract unique product names for filter
      const productNames = Array.from(new Set(accounts.map(acc => acc.gameName))).sort();
      setUniqueProducts(productNames);

      // --- Process Gift Cards ---
      const gcList: GiftCard[] = [];
      
      products.forEach((product: any) => {
        // Check if this is a gift card product
        if (product.category_slug?.toLowerCase().includes('gift')) {
          const rawDigitalItems = product.digitalItems || product.digital_items;
          const digitalItems = typeof rawDigitalItems === 'string' 
            ? JSON.parse(rawDigitalItems) 
            : (rawDigitalItems || []);
          
          if (digitalItems && Array.isArray(digitalItems)) {
            digitalItems.forEach((item: any, idx: number) => {
              // Check if this item has an associated order
              const soldOrder = orders.find((order: any) => 
                order.product_name === product.name && 
                order.items && order.items.some((orderItem: any) => orderItem.code === item.code)
              );
              
              gcList.push({
                id: item.id || `gc-${product.id}-${idx}`,
                productId: product.id,
                productName: product.name,
                code: item.code || '',
                status: soldOrder ? 'Sold' : 'Available',
                customerName: soldOrder?.customer_name,
                customerEmail: soldOrder?.customer_email,
                orderId: soldOrder?.id
              });
            });
          }
        }
      });
      
      setGiftCards(gcList);
      const giftCardProductNames = Array.from(new Set(gcList.map(gc => gc.productName))).sort();
      setUniqueGiftCardProducts(giftCardProductNames);
      
      setIsInitialLoad(false);
      
    } catch (err) {
      console.error('Error in loadData:', err);
      setError('Failed to load data');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderEditableCell = (account: GameAccount, field: string, value: string) => {
    return (
      <EditableCell 
        initialValue={value} 
        onSave={(newValue) => saveField(account, field, newValue)} 
        isMono={['sonyPass', 'emailPass'].includes(field)}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading order statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => loadData()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Order Data Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your orders, revenue, and customer activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalOrders}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Total Orders</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.pendingOrders}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Pending Orders</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.completedOrders}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Completed Orders</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPrice(stats.totalRevenue)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Total Revenue</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.recentOrders.length}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Recent Orders</p>
          </div>
        </Card>
      </div>

      {/* Game Accounts Table */}
      <Card className="p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Game Accounts Data</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by Product:</span>
            <select 
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">All Products</option>
              {uniqueProducts.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Game Name</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Sony Pass</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Birthdate</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email - Pass</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Slots & Codes</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Region</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Online Id</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {gameAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No game accounts found
                  </td>
                </tr>
              ) : (
                gameAccounts
                  .filter(acc => selectedProduct === 'all' || acc.gameName === selectedProduct)
                  .map((account, idx) => (
                  <tr key={`game-${account.productId}-${account.email || idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{account.gameName}</td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'email', account.email)}</td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'sonyPass', account.sonyPass)}</td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'birthdate', account.birthdate)}</td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'emailPass', account.emailPass)}</td>
                    <td className="px-4 py-3">
                      {account.inventory.length > 0 ? (
                        <select className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 max-w-[200px]">
                          <option value="">View {account.inventory.length} Slots</option>
                          {account.inventory.map((item, idx) => (
                            <option 
                              key={idx} 
                              value={item.code}
                              className={item.status === 'Sold' ? 'text-red-600 font-medium' : 'text-green-600'}
                            >
                              {item.status === 'Sold' ? '🔴' : '🟢'} {item.label} ({item.status})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400 italic">No inventory</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'region', account.region)}</td>
                    <td className="px-4 py-3">{renderEditableCell(account, 'onlineId', account.onlineId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'In Stock'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : account.status === 'Sold Out'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Accounts Distribution Table */}
      <Card className="p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Accounts Distribution</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by Product:</span>
            <select 
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">All Products</option>
              {uniqueProducts.filter(name => !name.toLowerCase().includes('gift card')).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Primary PS4</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Primary PS5</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Secondary</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Offline PS4</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Offline PS5</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Full Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {gameAccounts.filter(acc => !acc.gameName.toLowerCase().includes('gift card')).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No account distribution data available
                  </td>
                </tr>
              ) : (
                gameAccounts
                  .filter(acc => !acc.gameName.toLowerCase().includes('gift card') && (selectedProduct === 'all' || acc.gameName === selectedProduct))
                  .map((account) => {
                  // Helper to find customer for a specific slot type
                  const getCustomerForSlot = (slotType: string) => {
                    const slot = account.inventory.find(i => i.label.toLowerCase().includes(slotType.toLowerCase()));
                    const initialValue = slot?.customerName || '';
                    
                    return (
                      <EditableCell 
                        initialValue={initialValue}
                        onSave={(newValue) => saveSlotCustomer(account, slotType, newValue)}
                        placeholder="Customer Name"
                      />
                    );
                  };

                  return (
                    <tr key={`dist-${account.productId}-${account.email || account.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                        {account.email}
                        <div className="text-xs text-gray-500 dark:text-gray-400">{account.gameName}</div>
                      </td>
                      <td className="px-4 py-3">{getCustomerForSlot('Primary ps4')}</td>
                      <td className="px-4 py-3">{getCustomerForSlot('Primary ps5')}</td>
                      <td className="px-4 py-3">{getCustomerForSlot('Secondary')}</td>
                      <td className="px-4 py-3">{getCustomerForSlot('Offline ps4')}</td>
                      <td className="px-4 py-3">{getCustomerForSlot('Offline ps5')}</td>
                      <td className="px-4 py-3">{getCustomerForSlot('Full Account')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Gift Cards Overview Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gift Cards Overview</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by Product:</span>
            <select 
              value={selectedGiftCardProduct}
              onChange={(e) => setSelectedGiftCardProduct(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">All Gift Cards</option>
              {uniqueGiftCardProducts.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Gift Cards Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {giftCards.filter(gc => gc.status === 'Available').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {giftCards.filter(gc => gc.status === 'Sold').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Sold</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {giftCards.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Codes</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Gift Card Codes</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {giftCards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No gift cards found
                  </td>
                </tr>
              ) : (
                // Group gift cards by product
                (selectedGiftCardProduct === 'all' 
                  ? uniqueGiftCardProducts 
                  : [selectedGiftCardProduct]
                ).map(productName => {
                  const productGiftCards = giftCards.filter(gc => gc.productName === productName);
                  const availableCount = productGiftCards.filter(gc => gc.status === 'Available').length;
                  const soldCount = productGiftCards.filter(gc => gc.status === 'Sold').length;
                  
                  return (
                    <tr key={`gc-product-${productName}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {productName}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {availableCount} available, {soldCount} sold
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="w-full max-w-[200px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none font-mono"
                          value=""
                          onChange={(e) => {
                            const selectedGiftCard = productGiftCards.find(gc => gc.code === e.target.value);
                            if (selectedGiftCard) {
                              if (selectedGiftCard.status === 'Available') {
                                markGiftCardAsSold(selectedGiftCard);
                              } else {
                                markGiftCardAsAvailable(selectedGiftCard);
                              }
                            }
                          }}
                        >
                          <option value="">Select a code...</option>
                          {productGiftCards.map((gc, idx) => (
                            <option key={gc.id || idx} value={gc.code}>
                              {gc.code} ({gc.status})
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {productGiftCards.slice(0, 5).map((gc, idx) => (
                            <span 
                              key={gc.id || idx}
                              className={`inline-block px-2 py-0.5 text-xs rounded font-mono ${
                                gc.status === 'Available' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {gc.code.slice(-4)}
                            </span>
                          ))}
                          {productGiftCards.length > 5 && (
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              +{productGiftCards.length - 5} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                            {availableCount} Available
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 w-fit">
                            {soldCount} Sold
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {soldCount > 0 ? (
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {productGiftCards.filter(gc => gc.status === 'Sold').map((gc, idx) => (
                              <div key={gc.id || idx} className="text-sm">
                                <span className="text-gray-900 dark:text-gray-300">{gc.customerName || 'Unknown'}</span>
                                {gc.customerEmail && (
                                  <div className="text-xs text-gray-500">{gc.customerEmail}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => {
                            const available = productGiftCards.find(gc => gc.status === 'Available');
                            if (available) markGiftCardAsSold(available);
                          }}
                          disabled={availableCount === 0}
                          className={`text-sm font-medium ${availableCount === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                        >
                          Sell One
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
