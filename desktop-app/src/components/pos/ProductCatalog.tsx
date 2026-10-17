import React, { useState } from 'react';
import { Product, ProductVariant, DigitalItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Search, Gamepad2, Disc, Tag, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, isLoading }) => {
  const { addItem } = useCart();
  const { formatPrice } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductForSlots, setSelectedProductForSlots] = useState<Product | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Assets (الكل)' },
    { id: 'consoles', label: 'Consoles (الأجهزة)' },
    { id: 'accessories', label: 'Controllers & Acc (الإكسسوارات)' },
    { id: 'physical-games', label: 'Physical Discs (أسطوانات)' },
    { id: 'digital-games', label: 'Digital Accounts (ألعاب ديجيتال)' },
    { id: 'playstation-plus', label: 'PS Plus & Subs (اشتراكات)' },
    { id: 'gift-cards', label: 'Cards & Top-ups (كروت شحن)' }
  ];

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.categorySlug === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCat;
    
    const matchesName = p.name.toLowerCase().includes(query);
    const matchesSku = (p.sku || '').toLowerCase().includes(query);
    const matchesBarcode = (p.barcode || '').toLowerCase().includes(query);
    return matchesCat && (matchesName || matchesSku || matchesBarcode);
  });

  const handleProductClick = (product: Product) => {
    // If product has digital slots or variants, open selection modal
    if (product.digitalItems && product.digitalItems.length > 0) {
      setSelectedProductForSlots(product);
      return;
    }
    if (product.product_variants && product.product_variants.length > 0) {
      setSelectedProductForSlots(product);
      return;
    }

    // Otherwise add directly
    addItem(product, 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e12] border-r border-white/5">
      {/* Search & Top Action Bar */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Title, SKU, or Scan Barcode (F2)..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 placeholder-gray-500 font-medium transition-all"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
            Loading store inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-sm">
            <Gamepad2 className="w-10 h-10 mb-2 opacity-30" />
            No products match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              const isOutOfStock = p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && handleProductClick(p)}
                  className={`group relative p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white/[0.07] hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/20 active:scale-[0.98]'
                  }`}
                >
                  <div>
                    {/* Image / Thumbnail */}
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-black/50 mb-2.5 relative border border-white/5">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Gamepad2 className="w-8 h-8" />
                        </div>
                      )}
                      
                      {/* Platform Badge */}
                      {p.platform && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-white border border-white/10">
                          {p.platform}
                        </span>
                      )}

                      {/* Stock Badge */}
                      <span className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        p.stock > 10 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' :
                        p.stock > 0 ? 'bg-amber-950/80 text-amber-400 border border-amber-500/20' :
                        'bg-red-950/80 text-red-400 border border-red-500/20'
                      }`}>
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug mb-1">
                      {p.name}
                    </h4>

                    {/* SKU badge */}
                    {p.sku && (
                      <div className="text-[10px] text-gray-500 font-mono tracking-tight mb-2 truncate">
                        {p.sku}
                      </div>
                    )}
                  </div>

                  {/* Price Bar */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="font-black text-sm text-red-400 font-mono">
                      {formatPrice(p.price)}
                    </span>
                    {p.digitalItems?.length ? (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">
                        Slots
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Digital Slot / Variant Selection */}
      {selectedProductForSlots && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1 uppercase italic">
              {selectedProductForSlots.name}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Select desired digital account slot or physical edition variant:
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto mb-6 pr-1">
              {/* Product Variants (e.g. Primary PS4, Primary PS5, Secondary) */}
              {selectedProductForSlots.product_variants && selectedProductForSlots.product_variants.length > 0 ? (
                selectedProductForSlots.product_variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => {
                      addItem(selectedProductForSlots, 1, variant, variant.name);
                      setSelectedProductForSlots(null);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/40 transition-all text-left"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{variant.name}</div>
                      <div className="text-xs text-gray-400">Available Stock: {variant.stock}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-red-400 font-mono">
                        {formatPrice(variant.price ?? selectedProductForSlots.price)}
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">Select</span>
                    </div>
                  </button>
                ))
              ) : selectedProductForSlots.digitalItems ? (
                // Fallback to legacy slots
                Object.keys(selectedProductForSlots.digitalItems[0]?.slots || {}).map(slotName => (
                  <button
                    key={slotName}
                    onClick={() => {
                      const di = selectedProductForSlots.digitalItems?.[0];
                      addItem(selectedProductForSlots, 1, undefined, slotName, di);
                      setSelectedProductForSlots(null);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/40 transition-all text-left"
                  >
                    <span className="text-sm font-bold text-white">{slotName}</span>
                    <span className="text-sm font-black text-red-400 font-mono">
                      {formatPrice(selectedProductForSlots.price)}
                    </span>
                  </button>
                ))
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProductForSlots(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
