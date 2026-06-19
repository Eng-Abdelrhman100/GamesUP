import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, Trash2, Plus, Minus, User, Mail, Phone, MapPin, CreditCard, X, Package, Grid, List, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { categoriesAPI, productsAPI, posAPI } from '../../utils/api';
import { emailService } from '../../utils/emailService';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface DigitalItem {
  email: string;
  password: string;
  code: string;
  outlookEmail: string;
  outlookPassword: string;
  twoFactorCode?: string;
  birthdate: string;
  region: string;
  onlineId: string;
  backupCodes: string;
  slots: Record<string, { sold: boolean; orderId: string | null; code: string }>;
  totalCodes: number;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number | null;
  cost: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categorySlug?: string;
  stock: number;
  attributes?: Record<string, any>;
  digitalItems?: DigitalItem[];
  product_variants?: ProductVariant[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
}

interface CartItem extends Product {
  quantity: number;
  selectedDigitalItem?: DigitalItem;
  selectedSlot?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  isWalkerMode?: boolean;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export function POSNew() {
  const { settings, formatPrice } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Record<string, number>>({});
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  
  // Product modal customer info
  const [productCustomerInfo, setProductCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isWalkerMode, setIsWalkerMode] = useState(false);

  // Live Inventory/Trader States
  const [selectedDigitalItem, setSelectedDigitalItem] = useState<DigitalItem | undefined>(undefined);
  const [isFetchingInventory, setIsFetchingInventory] = useState(false);
  const [liveDigitalItems, setLiveDigitalItems] = useState<DigitalItem[]>([]);
  const [isTraderMode, setIsTraderMode] = useState(false);
  const [traderDiscountType, setTraderDiscountType] = useState<'percent' | 'flat'>('percent');
  const [traderDiscountValue, setTraderDiscountValue] = useState<number>(0);
  const [specialOfferPreset, setSpecialOfferPreset] = useState<string>('');

  const fetchLiveInventory = async (productId: string) => {
    setIsFetchingInventory(true);
    try {
      const response = await productsAPI.getPublicById(productId);
      if (response && response.product) {
        setLiveDigitalItems(response.product.digitalItems || []);
        // Sync products list in background
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...response.product } : p));
      }
    } catch (error) {
      console.error('Error fetching live inventory:', error);
    } finally {
      setIsFetchingInventory(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      // Debug: Log the product data to see what variants we have
      console.log('Selected product:', selectedProduct);
      console.log('Product variants:', selectedProduct.product_variants);
      
      // Calculate available slots from product_variants
      const counts: Record<string, number> = {};
      if (selectedProduct.product_variants && selectedProduct.product_variants.length > 0) {
        selectedProduct.product_variants.forEach((variant) => {
          console.log('Processing variant:', variant.name, 'stock:', variant.stock);
          if (variant.stock > 0) {
            counts[variant.name] = variant.stock;
          }
        });
      } else if (selectedProduct.digitalItems) {
        // Fallback to legacy digitalItems if no product_variants
        selectedProduct.digitalItems.forEach((item) => {
          if (item.slots) {
            Object.entries(item.slots).forEach(([key, val]) => {
              if (!val.sold) {
                counts[key] = (counts[key] || 0) + 1;
              }
            });
          }
        });
      }
      setAvailableSlots(counts);
      setSelectedSlot('');

      // Load live inventory automatically when modal opens
      setLiveDigitalItems(selectedProduct.digitalItems || []);
      fetchLiveInventory(selectedProduct.id);
    } else {
      setLiveDigitalItems([]);
    }
  }, [selectedProduct?.id]);
  
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    // For digital products, require slot selection if slots exist
    const hasSlots = Object.keys(availableSlots).length > 0;
    if (hasSlots && !selectedSlot) {
      alert('Please select a slot type (e.g. Primary PS4, Offline PS5)');
      return;
    }

    // Prepare customer info for this cart item
    const itemCustomerInfo = isWalkerMode ? {
      name: 'Walker Customer',
      email: 'walker@gamesup.store',
      phone: ''
    } : {
      name: productCustomerInfo.name,
      email: productCustomerInfo.email,
      phone: productCustomerInfo.phone
    };

    addToCart(selectedProduct, 1, selectedDigitalItem, selectedSlot, itemCustomerInfo, isWalkerMode);
    
    // Reset product modal state
    setSelectedProduct(null);
    setSelectedSlot('');
    setSelectedDigitalItem(undefined);
    setProductCustomerInfo({ name: '', email: '', phone: '' });
    setIsWalkerMode(false);
  };
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data.filter((cat: any) => cat.isActive));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getPublic(selectedCategory || undefined, searchQuery || undefined);
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product, quantity: number = 1, selectedDigitalItem?: DigitalItem, selectedSlot?: string, itemCustomerInfo?: {name: string, email: string, phone: string}, itemIsWalkerMode?: boolean) => {
    const existingItem = cart.find(item => 
      item.id === product.id && 
      item.selectedSlot === selectedSlot && 
      item.selectedDigitalItem?.email === selectedDigitalItem?.email
    );
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id && 
        item.selectedSlot === selectedSlot && 
        item.selectedDigitalItem?.email === selectedDigitalItem?.email
          ? { ...item, quantity: item.quantity + quantity, selectedDigitalItem, selectedSlot, customerInfo: itemCustomerInfo, isWalkerMode: itemIsWalkerMode }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity, selectedDigitalItem, selectedSlot, customerInfo: itemCustomerInfo, isWalkerMode: itemIsWalkerMode }]);
    }
    
    setSelectedProduct(null);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    setShowCustomerForm(true);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${lastInvoice?.invoiceNumber || Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleCompleteCheckout = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    try {
      // Pull customer details from cart if they exist
      const firstCustomerItem = cart.find(item => item.customerInfo && !item.isWalkerMode);
      const name = firstCustomerItem?.customerInfo?.name || customerInfo.name || 'Walk-in Customer';
      const email = firstCustomerItem?.customerInfo?.email || customerInfo.email || 'pos@store.com';
      const phone = firstCustomerItem?.customerInfo?.phone || customerInfo.phone || '';

      const invoiceData = {
        customerName: name,
        customerEmail: email,
        phone: phone,
        total: cartTotal,
        items: cart.map(item => ({
          id: item.id,
          name: item.name + (item.selectedSlot ? ` - ${item.selectedSlot}` : ''),
          price: item.customPrice !== undefined ? item.customPrice : item.price,
          quantity: item.quantity,
          selectedDigitalItem: item.selectedDigitalItem
        })),
        paymentMethod: 'POS',
        date: new Date().toISOString()
      };

      const result = await posAPI.createInvoice(invoiceData);
      
      if (result.success) {
        // --- START DIGITAL FULFILLMENT LOGIC ---
        for (const item of cart) {
          if (item.selectedSlot) {
            // 1. Fetch latest product data to ensure we have current digitalItems
            const { product } = await productsAPI.getPublicById(item.id);
            
            if (product && product.digitalItems && Array.isArray(product.digitalItems)) {
              let updated = false;
              const digitalItems = [...product.digitalItems];
              let assignedDigitalItem = null;

              // 2. Find an available item for the selected variant
              for (let i = 0; i < digitalItems.length; i++) {
                const di = digitalItems[i];
                
                const isFullAccount = String(item.selectedSlot || '').toLowerCase().endsWith('full account');
                if (isFullAccount) {
                  // Full Account: available only if NO slots are sold
                  const anySlotSold = di.slots ? Object.values(di.slots).some((s: any) => s.sold) : false;
                  if (!anySlotSold) {
                    // Mark all slots as sold and set fullAccountSold
                    if (di.slots) {
                      Object.keys(di.slots).forEach(key => {
                        di.slots[key].sold = true;
                        di.slots[key].orderId = result.order.id;
                      });
                    }
                    di.fullAccountSold = true;
                    assignedDigitalItem = di;
                    updated = true;
                    break;
                  }
                } else {
                  // Individual Slot: available if this slot is not sold AND no fullAccountSold
                  if (di.slots && di.slots[item.selectedSlot] && !di.slots[item.selectedSlot].sold && !di.fullAccountSold) {
                    di.slots[item.selectedSlot].sold = true;
                    di.slots[item.selectedSlot].orderId = result.order.id;
                    assignedDigitalItem = di;
                    updated = true;
                    break;
                  }
                }
              }

              if (updated) {
                // 3. Save updated digitalItems back to product
                await productsAPI.update(item.id, { digitalItems });
                
                // 4. Attach digital info to the item in our cart result for email sending
                (item as any).fulfilledDigitalItem = assignedDigitalItem;
              }
            }
          }
        }
        // --- END DIGITAL FULFILLMENT LOGIC ---

        // Send digital delivery emails to each customer
        for (const item of cart) {
          if (item.customerInfo && !item.isWalkerMode) {
            const digitalItem = (item as any).fulfilledDigitalItem;
            
            if (digitalItem) {
              try {
                // If Full Account, we send all details. If Slot, we send the slot code.
                const isFullAccount = String(item.selectedSlot || '').toLowerCase().endsWith('full account');
                
                await emailService.sendDigitalDelivery(
                  {
                    customer_name: item.customerInfo.name || 'Customer',
                    customer_email: item.customerInfo.email,
                    order_number: result.order.order_number,
                    id: result.order.id
                  },
                  [{
                    name: item.name + (item.selectedSlot ? ` - ${item.selectedSlot}` : ''),
                    code: isFullAccount ? (digitalItem.code || 'See details below') : (digitalItem.slots?.[item.selectedSlot!]?.code || digitalItem.code),
                    email: digitalItem.email,
                    password: digitalItem.password,
                    outlookEmail: digitalItem.outlookEmail,
                    outlookPassword: digitalItem.outlookPassword,
                    twoFactorCode: digitalItem.twoFactorCode,
                    birthdate: digitalItem.birthdate,
                    region: digitalItem.region,
                    onlineId: digitalItem.onlineId,
                    backupCodes: digitalItem.backupCodes
                  }]
                );
                console.log(`Digital delivery email sent to ${item.customerInfo.email}`);
              } catch (emailError) {
                console.error(`Failed to send email to ${item.customerInfo.email}:`, emailError);
              }
            }
          }
        }

        setLastInvoice({
          ...invoiceData,
          orderNumber: result.order.order_number,
          customer: { 
            name: invoiceData.customerName,
            email: invoiceData.customerEmail,
            phone: invoiceData.phone
          },
          subtotal: cartSubtotal,
          discount: traderDiscountAmount,
          tax: cartTax,
          total: cartTotal
        });
        setShowInvoice(true);
        setCart([]);
        setCustomerInfo({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
        });
        setShowCustomerForm(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.customPrice !== undefined ? item.customPrice : item.price) * item.quantity), 0);
  
  let traderDiscountAmount = 0;
  if (isTraderMode) {
    if (traderDiscountType === 'percent') {
      traderDiscountAmount = cartSubtotal * (traderDiscountValue / 100);
    } else {
      traderDiscountAmount = traderDiscountValue;
    }
  }

  const cartSubtotalAfterDiscount = Math.max(0, cartSubtotal - traderDiscountAmount);
  const cartTax = cartSubtotalAfterDiscount * (settings.tax_rate / 100);
  const cartTotal = cartSubtotalAfterDiscount + cartTax;

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                !selectedCategory
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === category.slug
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-red-500 transition-all"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-red-600 mt-1">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Stock: {product.stock}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer border-2 border-transparent hover:border-red-500 transition-all flex items-center gap-4"
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{product.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Stock: {product.stock}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Current Order</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{cart.length} items</p>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.id}-${item.selectedSlot || 'default'}-${item.selectedDigitalItem?.email || 'default'}`} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex gap-3 mb-2">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover animate-pulse"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Price:</span>
                        <input
                          type="number"
                          value={item.customPrice !== undefined ? item.customPrice : item.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCart(cart.map(c => 
                              c.id === item.id && c.selectedSlot === item.selectedSlot && c.selectedDigitalItem?.email === item.selectedDigitalItem?.email
                                ? { ...c, customPrice: isNaN(val) ? undefined : val } 
                                : c
                            ));
                          }}
                          className="w-20 px-1.5 py-0.5 text-xs text-red-600 font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    {item.selectedSlot && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Slot: {item.selectedSlot}</p>
                    )}
                    {item.selectedDigitalItem && (
                      <p className="text-[10px] text-gray-450 dark:text-gray-500 font-mono truncate" title={item.selectedDigitalItem.email}>
                        Acc: {item.selectedDigitalItem.email}
                      </p>
                    )}
                    {item.customerInfo && (
                      <p className="text-xs text-gray-550 dark:text-gray-450 truncate mt-0.5">
                        {item.isWalkerMode ? 'Walker' : item.customerInfo.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-white hover:bg-red-650 dark:hover:bg-red-650 p-1.5 rounded bg-red-600 self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center flex-shrink-0"
                  >
                    <Minus className="w-4 h-4 text-red-600" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-16 px-1 py-0.5 text-center font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                    min="1"
                  />
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-red-600" />
                  </button>
                  <span className="ml-auto font-bold text-gray-900 dark:text-white truncate">
                    {formatPrice((item.customPrice !== undefined ? item.customPrice : item.price) * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Trader Offers & Custom Discounts */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-150 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={isTraderMode}
                    onChange={(e) => {
                      setIsTraderMode(e.target.checked);
                      if (!e.target.checked) {
                        setTraderDiscountValue(0);
                        setSpecialOfferPreset('');
                      }
                    }}
                    className="w-4 h-4 text-red-605 rounded border-gray-300 dark:border-gray-600 focus:ring-red-500"
                  />
                  <span>Trader Special Offer Mode</span>
                </label>
                {isTraderMode && (
                  <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                    Trader
                  </span>
                )}
              </div>

              {isTraderMode && (
                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Trader Offer Preset
                    </label>
                    <select
                      value={specialOfferPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecialOfferPreset(val);
                        if (val === 'tier1') {
                          setTraderDiscountType('percent');
                          setTraderDiscountValue(5);
                        } else if (val === 'tier2') {
                          setTraderDiscountType('percent');
                          setTraderDiscountValue(10);
                        } else if (val === 'tier3') {
                          setTraderDiscountType('percent');
                          setTraderDiscountValue(15);
                        } else if (val === 'bulk') {
                          setTraderDiscountType('percent');
                          setTraderDiscountValue(20);
                        } else if (val === 'custom') {
                          // Keep values, let user type
                        } else {
                          setTraderDiscountValue(0);
                        }
                      }}
                      className="w-full text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-650 rounded-lg p-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-red-500 focus:outline-none font-semibold"
                    >
                      <option value="">-- Choose Trader Offer Preset --</option>
                      <option value="tier1">Trader Tier 1 (5% Off)</option>
                      <option value="tier2">Trader Tier 2 (10% Off)</option>
                      <option value="tier3">Trader Tier 3 (15% Off)</option>
                      <option value="bulk">Bulk Trader Special (20% Off)</option>
                      <option value="custom">Custom Trader Offer</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Discount Type
                      </label>
                      <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5">
                        <button
                          type="button"
                          onClick={() => setTraderDiscountType('percent')}
                          className={`flex-1 text-[9px] py-1 rounded font-semibold transition-all ${
                            traderDiscountType === 'percent'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-gray-650 dark:text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setTraderDiscountType('flat')}
                          className={`flex-1 text-[9px] py-1 rounded font-semibold transition-all ${
                            traderDiscountType === 'flat'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-gray-650 dark:text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          Flat
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-20">
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={traderDiscountValue}
                        onChange={(e) => {
                          setTraderDiscountValue(parseFloat(e.target.value) || 0);
                          setSpecialOfferPreset('custom');
                        }}
                        className="w-full text-xs bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPrice(cartSubtotal)}</span>
              </div>
              {isTraderMode && traderDiscountAmount > 0 && (
                <div className="flex justify-between text-green-650 dark:text-green-400 font-semibold text-sm">
                  <span>Trader Discount</span>
                  <span>-{formatPrice(traderDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                <span>Tax ({settings.tax_rate}%)</span>
                <span className="font-semibold">{formatPrice(cartTax)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span className="text-red-600">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="flex-1 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Details</h2>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-24 h-24 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedProduct.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {selectedProduct.description}
                    </p>
                    <p className="text-3xl font-bold text-red-600 mb-4">
                      {formatPrice(selectedProduct.price)}
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Category</span>
                        <span className="font-semibold">{selectedProduct.categorySlug || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Stock</span>
                        <span className={`font-semibold ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedProduct.stock} units
                        </span>
                      </div>
                      {(Object.keys(availableSlots).length > 0 || (selectedProduct?.product_variants && selectedProduct.product_variants.length > 0)) && (
                        <div className="pt-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Slot</label>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedProduct?.product_variants?.map((variant) => {
                              // Calculate real available count from digitalItems slots
                              let availableCount = variant.stock;
                              if (selectedProduct.digitalItems && availableCount === 0) {
                                const isFullAccount = String(variant.name || '').toLowerCase().endsWith('full account');
                                if (isFullAccount) {
                                  // Full Account is available if an account has ZERO sold slots
                                  availableCount = selectedProduct.digitalItems.reduce((count, item) => {
                                    if (!item.slots) return count + 1; // Basic account, no slots defined yet
                                    const anySlotSold = Object.values(item.slots).some(s => s.sold);
                                    return anySlotSold ? count : count + 1;
                                  }, 0);
                                } else {
                                  // Individual slot availability
                                  availableCount = selectedProduct.digitalItems.reduce((count, item) => {
                                    if (item.slots && item.slots[variant.name] && !item.slots[variant.name].sold) {
                                      // Also check if this account was already partially sold.
                                      // If an account is sold as 'Full Account', then item.slots[variant.name].sold would be true.
                                      return count + 1;
                                    }
                                    return count;
                                  }, 0);
                                }
                              }
                              
                              return (
                                <button
                                  key={variant.id}
                                  onClick={() => setSelectedSlot(variant.name)}
                                  disabled={availableCount <= 0}
                                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                                    selectedSlot === variant.name
                                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                                      : availableCount > 0
                                        ? 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                                        : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {variant.name} ({availableCount})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Fetch Live Inventory & Account Slots Section */}
                      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="w-4 h-4 text-red-600" />
                            Inventory & Slots Inspector
                          </h4>
                          <button
                            type="button"
                            onClick={() => fetchLiveInventory(selectedProduct.id)}
                            disabled={isFetchingInventory}
                            className="text-[10px] px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 font-semibold"
                          >
                            {isFetchingInventory ? (
                              <>
                                <div className="w-2.5 h-2.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                Syncing...
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
                                </svg>
                                Sync Live Slots
                              </>
                            )}
                          </button>
                        </div>

                        {liveDigitalItems.length === 0 ? (
                          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-center text-xs text-gray-500">
                            No active digital items loaded for this product.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                            {liveDigitalItems.map((item, idx) => (
                              <div key={idx} className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-gray-900 dark:text-white font-mono break-all leading-tight">{item.email}</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Password: <span className="font-mono">{item.password}</span> | Region: {item.region || 'N/A'}</p>
                                  </div>
                                  <span className="text-[8px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-2">
                                    Acc #{idx + 1}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 mt-2">
                                  {item.slots && Object.entries(item.slots).map(([slotName, slotVal]) => {
                                    const isSold = slotVal.sold;
                                    const isSelected = selectedSlot === slotName && selectedDigitalItem?.email === item.email;
                                    return (
                                      <button
                                        key={slotName}
                                        type="button"
                                        disabled={isSold}
                                        onClick={() => {
                                          setSelectedSlot(slotName);
                                          setSelectedDigitalItem(item);
                                        }}
                                        className={`px-2 py-1 text-[10px] text-left rounded-lg border transition-all flex items-center justify-between ${
                                          isSelected
                                            ? 'bg-red-650 text-white border-red-655 font-semibold shadow-sm animate-pulse'
                                            : isSold
                                              ? 'bg-gray-105 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 line-through cursor-not-allowed'
                                              : 'bg-white dark:bg-gray-800 hover:border-red-400 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                      >
                                        <span className="truncate mr-1">{slotName}</span>
                                        <span className={`text-[8px] px-1 rounded font-bold ${
                                          isSelected
                                            ? 'bg-red-700 text-white'
                                            : isSold
                                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                              : 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
                                        }`}>
                                          {isSold ? 'Sold' : 'Free'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Info Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Customer Info</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isWalkerMode}
                            onChange={(e) => setIsWalkerMode(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Walker Mode</span>
                        </label>
                      </div>
                      
                      {!isWalkerMode && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                            <input
                              type="text"
                              value={productCustomerInfo.name}
                              onChange={(e) => setProductCustomerInfo({...productCustomerInfo, name: e.target.value})}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Customer name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
                            <input
                              type="email"
                              value={productCustomerInfo.email}
                              onChange={(e) => setProductCustomerInfo({...productCustomerInfo, email: e.target.value})}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="customer@email.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={productCustomerInfo.phone}
                              onChange={(e) => setProductCustomerInfo({...productCustomerInfo, phone: e.target.value})}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={selectedProduct.stock <= 0 || (!isWalkerMode && !productCustomerInfo.email)}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoice && lastInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 print:hidden">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Generated</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handlePrintInvoice}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Print Invoice"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowInvoice(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6" id="invoice-content">
                  <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Games Up</h3>
                      <p className="text-gray-500 dark:text-gray-400">123 Gaming Street</p>
                      <p className="text-gray-500 dark:text-gray-400">Tech City, TC 90210</p>
                      <p className="text-gray-500 dark:text-gray-400">contact@games-up.co</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Invoice #{lastInvoice.invoiceNumber}</p>
                      <p className="text-gray-500 dark:text-gray-400">{new Date(lastInvoice.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bill To:</h4>
                      <p className="text-gray-600 dark:text-gray-300">{lastInvoice.customer.name}</p>
                      <p className="text-gray-600 dark:text-gray-300">{lastInvoice.customer.email}</p>
                      <p className="text-gray-600 dark:text-gray-300">{lastInvoice.customer.phone}</p>
                    </div>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-sm font-semibold text-gray-900 dark:text-white">Item</th>
                        <th className="text-center py-2 text-sm font-semibold text-gray-900 dark:text-white">Qty</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                        <th className="text-right py-2 text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {lastInvoice.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="font-medium">{item.name}</div>
                            {item.attributes && Object.entries(item.attributes).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {Object.entries(item.attributes).map(([key, val]) => (
                                  <span key={key} className="mr-2">{key}: {String(val)}</span>
                                ))}
                              </div>
                            )}
                            {item.digitalItem && (
                              <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-600">
                                {item.digitalItem.email && (
                                  <div className="flex gap-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span> <span className="font-mono text-gray-600 dark:text-gray-400 select-all">{item.digitalItem.email}</span></div>
                                )}
                                {item.digitalItem.password && (
                                  <div className="flex gap-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Password:</span> <span className="font-mono text-gray-600 dark:text-gray-400 select-all">{item.digitalItem.password}</span></div>
                                )}
                                {item.digitalItem.code && (
                                  <div className="flex gap-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Code:</span> <span className="font-mono text-gray-600 dark:text-gray-400 select-all">{item.digitalItem.code}</span></div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-center text-sm text-gray-600 dark:text-gray-300">{item.quantity || 1}</td>
                          <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatPrice(item.price)}</td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                            {formatPrice(item.price * (item.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPrice(lastInvoice.subtotal)}</span>
                    </div>
                    {lastInvoice.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold">
                        <span>Trader Discount:</span>
                        <span>-{formatPrice(lastInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax ({settings.tax_rate}%):</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPrice(lastInvoice.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-red-600">{formatPrice(lastInvoice.total)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 print:hidden">
                   <p>Thank you for your business!</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Area - Hidden normally, shown on print */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[100] p-8">
        {lastInvoice && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Games Up</h3>
                  <p className="text-gray-500">123 Gaming Street</p>
                  <p className="text-gray-500">Tech City, TC 90210</p>
                  <p className="text-gray-500">contact@games-up.co</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">Invoice #{lastInvoice.invoiceNumber}</p>
                  <p className="text-gray-500">{new Date(lastInvoice.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 border-b border-gray-200 pb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Bill To:</h4>
                  <p className="text-gray-600">{lastInvoice.customer.name}</p>
                  <p className="text-gray-600">{lastInvoice.customer.email}</p>
                  <p className="text-gray-600">{lastInvoice.customer.phone}</p>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-semibold text-gray-900">Item</th>
                    <th className="text-center py-2 text-sm font-semibold text-gray-900">Qty</th>
                    <th className="text-right py-2 text-sm font-semibold text-gray-900">Price</th>
                    <th className="text-right py-2 text-sm font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lastInvoice.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="py-3 text-sm text-gray-600">
                        <div className="font-medium">{item.name}</div>
                        {item.digitalItem && (
                          <div className="mt-1 text-xs border border-gray-200 p-1 rounded">
                            {item.digitalItem.email && <div><span className="font-semibold">Email:</span> {item.digitalItem.email}</div>}
                            {item.digitalItem.password && <div><span className="font-semibold">Password:</span> {item.digitalItem.password}</div>}
                            {item.digitalItem.code && <div><span className="font-semibold">Code:</span> {item.digitalItem.code}</div>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-center text-sm text-gray-600">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-sm text-gray-600">{formatPrice(item.price)}</td>
                      <td className="py-3 text-right text-sm font-medium text-gray-900">
                        {formatPrice(item.price * (item.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">{formatPrice(lastInvoice.subtotal)}</span>
                </div>
                {lastInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Trader Discount:</span>
                    <span>-{formatPrice(lastInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({settings.tax_rate}%):</span>
                  <span className="font-medium text-gray-900">{formatPrice(lastInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">{formatPrice(lastInvoice.total)}</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                 <p>Thank you for your business!</p>
              </div>
            </div>
        )}
      </div>

      {/* Customer Information Modal */}
      <AnimatePresence>
        {showCustomerForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Order</h2>
                    <p className="text-gray-600 dark:text-gray-400">Review and complete the purchase</p>
                  </div>
                  <button
                    onClick={() => setShowCustomerForm(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Cart Items Summary */}
                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.id}-${item.selectedSlot || 'default'}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.name}</h4>
                        {item.selectedSlot && <p className="text-xs text-gray-500">{item.selectedSlot}</p>}
                        <p className="text-xs text-gray-500">{item.isWalkerMode ? 'Walker' : item.customerInfo?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(item.price)}</p>
                        <p className="text-xs text-gray-500">× {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Order Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Items</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{cart.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(cartSubtotal)}</span>
                    </div>
                    {isTraderMode && traderDiscountAmount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold animate-pulse">
                        <span>Trader Discount</span>
                        <span>-{formatPrice(traderDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(cartTax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-red-600">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowCustomerForm(false)}
                    className="flex-1 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteCheckout}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Complete Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
