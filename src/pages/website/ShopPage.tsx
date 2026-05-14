import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Filter, ShoppingCart, Star, Heart } from 'lucide-react';
import { categoriesAPI, productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface ShopPageProps {
  onNavigate: (page: 'product', productId: string) => void;
  onOpenCart: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categorySlug?: string;
  subcategorySlug?: string;
  stock: number;
  rating?: number;
  hasVariants?: boolean;
}

export function ShopPage({ onNavigate, onOpenCart }: any) {
  const { formatPrice } = useStoreSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const selectedCategory = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(cat => cat.slug === selectedCategory);
      if (category) {
        document.title = `${category.name} - Games Up`;
      }
    } else {
      document.title = 'Shop - Games Up';
    }
  }, [selectedCategory, categories]);

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      const list = Array.isArray(data) ? data : (data as any)?.categories || (data as any)?.data || [];
      const active = (list || []).filter((cat: any) => (cat.is_active ?? cat.isActive) !== false);
      setCategories(active.filter((cat: any) => cat.slug !== 'gift-cards'));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (selectedCategory === 'gift-cards') {
        onNavigate('gift-cards' as any);
        return;
      }
      const response = await productsAPI.getPublic(selectedCategory || undefined, searchQuery || undefined);
      const withoutGiftCards = (response.products || []).filter((p: any) => p.category_slug !== 'gift-cards').map((p: any) => {
        // Calculate the minimum price if there are slots
        let displayPrice = p.price;
        let isFrom = false;
        
        if (p.digitalItems && p.digitalItems.length > 0) {
          const slotPrices: number[] = [];
          p.digitalItems.forEach((item: any) => {
            if (item.slots) {
              Object.values(item.slots).forEach((slot: any) => {
                if (!slot.sold && slot.price !== undefined && slot.price !== null) {
                  slotPrices.push(Number(slot.price));
                }
              });
            }
          });
          
          if (slotPrices.length > 0) {
            displayPrice = Math.min(...slotPrices);
            isFrom = true;
          }
        }
        
        return {
          ...p,
          displayPrice,
          isFrom
        };
      });
      setProducts(withoutGiftCards);
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

  const addToCart = (product: Product) => {
    // If product has variants (like Ps4/Ps5), redirect to details page
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

  const toggleFavorite = (product: Product) => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const existingIndex = favorites.findIndex((fav: any) => fav.id === product.id);
    
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      alert('Removed from favorites!');
    } else {
      favorites.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.categorySlug,
        rating: product.rating,
      });
      alert('Added to favorites!');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    // Trigger storage event to update header
    window.dispatchEvent(new Event('storage'));
  };

  const isFavorite = (productId: string) => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: any) => fav.id === productId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-red-600 bg-clip-text text-transparent">
            {selectedCategory 
              ? `${categories.find(cat => cat.slug === selectedCategory)?.name || selectedCategory}` 
              : 'Shop All Products'
            }
          </h1>
          <p className="text-xl text-gray-600">
            {selectedCategory 
              ? `Browse our collection of ${categories.find(cat => cat.slug === selectedCategory)?.name?.toLowerCase() || selectedCategory}`
              : 'Browse our extensive collection of gaming products'
            }
          </p>
        </motion.div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff1574] focus:border-transparent shadow-lg"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl flex items-center gap-2 font-medium hover:bg-white shadow-lg"
          >
            <Filter className="w-5 h-5" />
            Filters
          </motion.button>
        </div>

        {/* Categories */}
        <div className="mb-8 flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchParams({})}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              !selectedCategory
                ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200'
            }`}
          >
            All Products
          </motion.button>
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSearchParams({ category: category.slug })}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                selectedCategory === category.slug
                  ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </motion.button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff1574]"></div>
            <p className="text-gray-600 mt-4">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-xl">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-pink-500 hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => onNavigate('product', product.id)}
              >
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="px-3 py-1 bg-pink-600 text-white text-sm font-bold rounded-full">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  {product.rating && (
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < product.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">({product.rating})</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      {(product as any).isFrom && <span className="text-xs text-gray-500 mr-1 font-medium">From</span>}
                      <span className="text-2xl font-bold text-[#ff1574]">
                        {formatPrice((product as any).displayPrice || product.price)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(product);
                        }}
                        className="p-3 rounded-xl border-2 border-gray-300 hover:border-pink-500 transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-[#ff1574] text-[#ff1574]' : 'text-gray-400'}`} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        disabled={product.stock <= 0}
                        className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
                          product.stock > 0
                            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </motion.button>
                    </div>
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
