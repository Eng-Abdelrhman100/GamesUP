import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, ShoppingCart, Trash2, Star } from 'lucide-react';

interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
  rating?: number;
}

interface FavoritesProps {
  onBack: () => void;
  onNavigate?: (page: string, productId?: string) => void;
}

export function Favorites({ onBack, onNavigate }: FavoritesProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (id: string) => {
    const updatedFavorites = favorites.filter(item => item.id !== id);
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  const handleAddToCart = (item: FavoriteItem) => {
    if (onNavigate) {
      onNavigate('product', item.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            ← Back to Home
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600">{favorites.length} item(s) in your wishlist</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-6">Start adding products to your wishlist!</p>
            <button
              onClick={() => onNavigate ? onNavigate('shop') : onBack()}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all group"
              >
                {/* Product Image */}
                <div className="relative h-64 bg-gray-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/400x300?text=No+Image';
                      e.currentTarget.onerror = null;
                    }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <button
                    onClick={() => removeFavorite(item.id)}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 transition-colors group"
                  >
                    <Heart className="w-5 h-5 text-red-600 fill-red-600" />
                  </button>
                  {item.category && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                      <span className="text-white text-xs font-semibold">{item.category}</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {item.name}
                  </h3>
                  
                  {item.rating && (
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < item.rating!
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">({item.rating})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-2xl font-bold text-red-600">${item.price.toFixed(2)}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Select Options
                    </button>
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="px-4 py-3 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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
