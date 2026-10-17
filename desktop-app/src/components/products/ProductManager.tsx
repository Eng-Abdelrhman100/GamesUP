import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { ProductEditModal } from './ProductEditModal';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Tag, 
  Barcode, 
  Printer, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Cloud, 
  CloudOff,
  Copy,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

interface ProductManagerProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  onSaveProduct: (product: Product, isNew: boolean) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onOpenLabelPrinter: (product: Product) => void;
  isOnline: boolean;
  onSyncAll: () => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  isLoading,
  onRefresh,
  onSaveProduct,
  onDeleteProduct,
  onOpenLabelPrinter,
  isOnline,
  onSyncAll
}) => {
  const { formatPrice } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      // Category
      const matchCategory =
        selectedCategory === 'all' || p.categorySlug === selectedCategory;

      // Platform
      const matchPlatform =
        selectedPlatform === 'all' || p.platform === selectedPlatform;

      // Stock
      let matchStock = true;
      if (stockFilter === 'in_stock') matchStock = p.stock > 5;
      else if (stockFilter === 'low_stock') matchStock = p.stock > 0 && p.stock <= 5;
      else if (stockFilter === 'out_of_stock') matchStock = p.stock <= 0;

      return matchSearch && matchCategory && matchPlatform && matchStock;
    });
  }, [products, searchQuery, selectedCategory, selectedPlatform, stockFilter]);

  // KPIs
  const stats = useMemo(() => {
    let totalItems = products.length;
    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let pendingSyncCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.stock || 0;
      totalCostValuation += (p.cost || 0) * (p.stock || 0);
      totalRetailValuation += (p.price || 0) * (p.stock || 0);
      if (p.stock > 0 && p.stock <= 5) lowStockCount++;
      if (p.syncStatus && p.syncStatus !== 'synced') pendingSyncCount++;
    });

    return {
      totalItems,
      totalStockUnits,
      totalCostValuation,
      totalRetailValuation,
      lowStockCount,
      pendingSyncCount
    };
  }, [products]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsEditModalOpen(true);
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    if (newStock === product.stock) return;
    await onSaveProduct({ ...product, stock: newStock }, false);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action will sync with the catalog.`)) {
      await onDeleteProduct(product.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d11] overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-6 pb-4 border-b border-white/5 space-y-4 shrink-0 bg-[#121217]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-wider flex items-center gap-2">
              <Package className="w-6 h-6 text-red-500" />
              <span>Products & Inventory Catalog</span>
              <span className="text-xs font-mono font-bold bg-white/5 text-gray-400 px-2.5 py-1 rounded-xl not-italic ml-2 border border-white/5">
                {products.length} Products
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Add, edit, adjust stock, generate barcodes, and sync seamlessly with games-up.co and offline cache.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              title="Refresh Products"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
            </button>

            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Inventory KPIs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#181820] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Units</span>
              <span className="text-lg font-black font-mono text-white">{stats.totalStockUnits.toLocaleString()}</span>
            </div>
            <Package className="w-6 h-6 text-gray-500" />
          </div>

          <div className="bg-[#181820] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Retail Valuation</span>
              <span className="text-lg font-black font-mono text-emerald-400">{formatPrice(stats.totalRetailValuation)}</span>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-500/50" />
          </div>

          <div className="bg-[#181820] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Low Stock Alerts</span>
              <span className="text-lg font-black font-mono text-amber-400">{stats.lowStockCount} items</span>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-500/50" />
          </div>

          <div className="bg-[#181820] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sync Status</span>
              <span className={`text-xs font-bold font-mono ${stats.pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stats.pendingSyncCount > 0 ? `${stats.pendingSyncCount} Changes Queued` : 'All Synced'}
              </span>
            </div>
            {stats.pendingSyncCount > 0 ? (
              <button 
                onClick={onSyncAll} 
                className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg font-bold hover:bg-amber-500/30"
              >
                Sync Now
              </button>
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-500/50" />
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, SKU, or barcode scanner..."
              className="w-full bg-[#1b1b22] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Categories</option>
            <option value="consoles">Consoles & Hardware</option>
            <option value="physical-games">Physical Games (Discs)</option>
            <option value="digital-games">Digital Accounts (Slots)</option>
            <option value="accessories">Accessories & Controllers</option>
            <option value="playstation-plus">PlayStation Plus</option>
            <option value="gift-cards">Gift Cards & Top-ups</option>
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Platforms</option>
            <option value="PS5">PlayStation 5</option>
            <option value="PS4">PlayStation 4</option>
            <option value="XBOX">Xbox</option>
            <option value="NINTENDO">Nintendo</option>
            <option value="PC">PC</option>
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-[#1b1b22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt; 5)</option>
            <option value="low_stock">Low Stock (1 - 5)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Product List Table / Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Package className="w-12 h-12 text-gray-600 mb-2" />
            <div className="text-base font-bold text-gray-400">No products found</div>
            <p className="text-xs text-gray-600 mt-1 max-w-sm">
              Try adjusting your search criteria or click "Add Product" to create a new item.
            </p>
          </div>
        ) : (
          <div className="bg-[#121217] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/40 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">Platform & Cat</th>
                  <th className="py-3 px-3">SKU & Barcode</th>
                  <th className="py-3 px-3 text-right">Cost</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock > 0 && p.stock <= 5;
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Product Name & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-red-400 transition-colors">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.requiresSerial && (
                                <span className="text-[9px] bg-red-950/60 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono">
                                  REQUIRES S/N
                                </span>
                              )}
                              {p.digitalItems && p.digitalItems.length > 0 && (
                                <span className="text-[9px] bg-blue-950/60 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                                  DIGITAL SLOTS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Platform & Cat */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-block w-fit text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 border border-white/5">
                            {p.platform || 'GEN'}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                            {p.categorySlug}
                          </span>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 font-mono text-[11px]">
                          <div 
                            onClick={() => p.sku && handleCopySku(p.sku)}
                            className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white"
                            title="Click to copy SKU"
                          >
                            <Tag className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{p.sku || 'NO SKU'}</span>
                            {copiedSku === p.sku && <span className="text-[9px] text-emerald-400 font-bold">Copied!</span>}
                          </div>
                          {p.barcode && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-[10px]">
                              <Barcode className="w-3 h-3 text-gray-500 shrink-0" />
                              <span>{p.barcode}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-mono text-gray-400">
                        {p.cost ? `${p.cost.toLocaleString()} ${useSettings().settings.currency}` : '—'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white text-sm">
                        {p.price.toLocaleString()} {useSettings().settings.currency}
                      </td>

                      {/* Stock with quick buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleQuickStockAdjust(p, -1)}
                            className="p-0.5 text-gray-500 hover:text-white transition-colors"
                            title="Decrease Stock"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>

                          <span
                            className={`min-w-[36px] text-center font-mono font-bold text-xs px-2 py-0.5 rounded-lg ${
                              isOutOfStock
                                ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                                : isLowStock
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {p.stock}
                          </span>

                          <button
                            onClick={() => handleQuickStockAdjust(p, 1)}
                            className="p-0.5 text-gray-500 hover:text-white transition-colors"
                            title="Increase Stock"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Sync Status */}
                      <td className="py-3 px-3 text-center">
                        {p.syncStatus === 'synced' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <CloudOff className="w-3 h-3" /> Queued
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Label Print */}
                          <button
                            onClick={() => onOpenLabelPrinter(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Print Barcode Thermal Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <ProductEditModal
        isOpen={isEditModalOpen}
        product={selectedProduct}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveProduct}
      />
    </div>
  );
};
