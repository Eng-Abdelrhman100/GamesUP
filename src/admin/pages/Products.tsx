
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, ChevronDown } from 'lucide-react';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { productsAPI, categoriesAPI, api, normalizeImageSrc } from '@/utils/api';

const PLACEHOLDER_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface Product {
  id: string | number;
  name: string;
  category_slug: string;
  sub_category_slug: string;
  price: number;
  cost?: number;
  stock: number;
  status: string;
  image: string;
  instructions?: string;
  attributes?: Record<string, any>;
  digitalItems?: any;
  product_variants?: any[];
  created_at?: string;
}

function countAvailableSlots(digitalItems: any[], categorySlug?: string, subCategorySlug?: string) {
  if (!Array.isArray(digitalItems)) return 0;
  let count = 0;
  const now = new Date().getTime();
  const limitDays = String(subCategorySlug || '').toLowerCase().includes('1-month') ? 5 : 10;
  for (const item of digitalItems) {
    if (!item || !item.slots || item.fullAccountSold) continue;
    let isExpired = false;
    if (categorySlug === 'playstation-plus' && item.createdAt) {
      const createdDate = new Date(item.createdAt).getTime();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= limitDays) {
        isExpired = true;
      }
    }
    for (const slot of Object.values(item.slots)) {
      const code = (slot as any)?.code ? String((slot as any).code).trim() : '';
      if (code && !(slot as any)?.sold && !isExpired) count += 1;
    }
  }
  return count;
}

export function Products({ filterCategory }: { filterCategory?: string } = {}) {
  const navigate = useNavigate();
  const { settings, formatPrice } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'giftcards'>(filterCategory ? 'products' : 'all');
  const [categoryFilter, setCategoryFilter] = useState(filterCategory || 'All');
  const [giftCategoryFilter, setGiftCategoryFilter] = useState('All');
  const [isAlertsBannerCollapsed, setIsAlertsBannerCollapsed] = useState(false);
  
  useEffect(() => {
    if (filterCategory) {
      setCategoryFilter(filterCategory);
      setActiveTab('products');
    }
  }, [filterCategory]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        setLoading(true);
        const [catsRes, subCatsRes, productsRes] = await Promise.all([
            categoriesAPI.getAll(),
            api.get('sub_categories'),
            productsAPI.getAll()
        ]);

        setCategories(catsRes || []);
        setSubCategories(subCatsRes || []);
        setProducts(productsRes.products || []);
        setError(null);
    } catch (err: any) {
        console.error("Failed to load data", err);
        setError(err?.message || 'Failed to load data');
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const getDisplayStock = (product: Product) => {
    if (product.category_slug === 'gift-cards') return product.stock;
    const parsedItems = typeof product.digitalItems === 'string'
      ? JSON.parse(product.digitalItems)
      : (product.digitalItems || []);
    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      return countAvailableSlots(parsedItems, product.category_slug, product.sub_category_slug);
    }
    return product.stock;
  };

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isGiftCard = product.category_slug === 'gift-cards';
    const matchesTab =
      activeTab === 'all' ? true : activeTab === 'giftcards' ? isGiftCard : !isGiftCard;
    const matchesCategory =
      activeTab === 'giftcards'
        ? giftCategoryFilter === 'All' || product.sub_category_slug === giftCategoryFilter
        : categoryFilter === 'All' || product.category_slug === categoryFilter;

    return matchesSearch && matchesTab && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button onClick={loadData}>Try Again</Button>
      </div>
    );
  }

  const lowStockProducts = (products || []).filter(p => getDisplayStock(p) <= 5);

  return (
    <div className="space-y-8">
      {/* Low / Out of Stock alerts banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsAlertsBannerCollapsed(!isAlertsBannerCollapsed)}>
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="font-black text-xs uppercase tracking-widest">
                Stock Alerts ({lowStockProducts.length})
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${isAlertsBannerCollapsed ? 'rotate-180' : ''}`} />
          </div>
          
          {!isAlertsBannerCollapsed && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lowStockProducts.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-gray-900 dark:text-white truncate" title={p.name}>{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${getDisplayStock(p) === 0 ? 'bg-red-600' : 'bg-orange-500'}`}></span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase">
                        {getDisplayStock(p) === 0 ? 'Out of stock' : `${getDisplayStock(p)} left`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`edit/${p.id}`)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-200 dark:shadow-none whitespace-nowrap"
                  >
                    Refill
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <p className="admin-page-subtitle">Inventory Management</p>
          <h1 className="admin-page-title">
            {filterCategory === 'playstation-plus' ? 'PS Plus Subscriptions' : 'Products & Stock'}
            <span className="text-brand-red">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('add')}
            className="btn-primary rounded-full px-8 h-12 font-black uppercase tracking-widest text-[10px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Card className="flex-1 p-8 w-full">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>
            
            {!filterCategory && (
              <div className="flex gap-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-700 dark:text-white focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        {!filterCategory && (
          <div className="inline-flex p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner">
            <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>All</button>
            <button onClick={() => setActiveTab('products')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Games</button>
            <button onClick={() => setActiveTab('giftcards')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'giftcards' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Cards</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-2xl transition-all duration-500 group border-gray-100 dark:border-gray-800 rounded-[2.5rem]">
            <div className="aspect-[4/5] bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
              <img
                src={normalizeImageSrc(product.image) || PLACEHOLDER_IMG_SRC}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG_SRC; }}
              />
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg ${
                  getDisplayStock(product) > 0 
                    ? 'bg-white/90 text-green-600 backdrop-blur-sm' 
                    : 'bg-red-600 text-white shadow-red-200'
                }`}>
                  {getDisplayStock(product) > 0 ? 'Available' : 'Sold Out'}
                </span>
              </div>
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                <button onClick={() => navigate(`/product-editor/edit/${product.id}`)} className="p-3 bg-white text-gray-900 rounded-2xl hover:bg-red-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-500 delay-75 shadow-xl"><Edit2 className="w-5 h-5" /></button>
                <button onClick={() => handleDeleteProduct(product.id)} className="p-3 bg-white text-gray-900 rounded-2xl hover:bg-red-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-500 delay-150 shadow-xl"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{product.category_slug}</p>
                <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm" title={product.name}>{product.name}</h3>
              </div>
              <div className="flex items-end justify-between">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Base Price</p>
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-right">Available</p>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{getDisplayStock(product)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
           <Package className="w-12 h-12 text-gray-200 mb-4" />
           <p className="text-sm font-black uppercase tracking-widest text-gray-400">No products found matching your search</p>
        </div>
      )}
    </div>
  );
}
