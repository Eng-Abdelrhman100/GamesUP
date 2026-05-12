import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ShoppingCart } from 'lucide-react';
import { productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface GiftCardsPageProps {
  onNavigate: (page: 'product', productId: string) => void;
  onOpenCart: () => void;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock?: number;
  category_slug?: string;
  sub_category_slug?: string;
  hasVariants?: boolean;
}

const getGiftCardCategory = (product: any): string => {
  return (
    product?.sub_category_slug ||
    product?.subCategory ||
    product?.subcategorySlug ||
    ''
  );
};

export function GiftCardsPage({ onNavigate, onOpenCart }: GiftCardsPageProps) {
  const { formatPrice } = useStoreSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedGiftCategory = searchParams.get('category') || 'All';

  useEffect(() => {
    loadGiftCards();
  }, []);

  const loadGiftCards = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getPublic('gift-cards');
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading gift cards:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const giftCardCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach((p: any) => {
      const c = getGiftCardCategory(p);
      if (c) categories.add(String(c));
    });
    return ['All', ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p: any) => {
      if (selectedGiftCategory !== 'All' && getGiftCardCategory(p) !== selectedGiftCategory) return false;
      if (!q) return true;
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedGiftCategory]);

  const addToCart = (product: Product | any) => {
    if (product.hasVariants) {
      onNavigate('product', product.id);
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    onOpenCart();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Gift Cards</h1>
            <p className="text-gray-600 mt-2">Browse and purchase gift cards and digital top-ups.</p>
          </div>

          <div className="w-full md:w-[420px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search gift cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff1574]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {giftCardCategories.map((c) => (
            <button
              key={c}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (c === 'All') next.delete('category');
                else next.set('category', c);
                setSearchParams(next);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                (selectedGiftCategory === 'All' && c === 'All') || selectedGiftCategory === c
                  ? 'bg-[#ff1574] text-white border-[#ff1574]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:text-[#ff1574]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading gift cards...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No gift cards found.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -6 }}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#ff1574] hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => onNavigate('product', product.id)}
              >
                <div className="aspect-[3/4] bg-white overflow-hidden flex items-center justify-center relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  {(product.stock ?? 0) <= 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="px-3 py-1 bg-black/70 text-white text-xs font-semibold rounded-full">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description || ''}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-[#ff1574]">{formatPrice(product.price)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={(product.stock ?? 0) <= 0}
                      className="px-3 py-1.5 bg-[#ff1574] text-white text-xs font-semibold rounded hover:bg-[#e00d65] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
