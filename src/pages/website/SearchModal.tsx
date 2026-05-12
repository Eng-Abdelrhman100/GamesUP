import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { productsAPI } from '../../utils/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: 'product', productId: string) => void;
}

export function SearchModal({ isOpen, onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setQuery('');
        setResults([]);
        return;
    }
  }, [isOpen]);

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await productsAPI.getPublic(undefined, query);
        // Handle response format { products: [...] } or [...]
        const products = data.products || (Array.isArray(data) ? data : []);
        setResults(products);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search games, consoles, accessories..."
              className="flex-1 outline-none text-lg text-gray-800 placeholder-gray-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      onNavigate('product', product.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">${product.price}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-8 text-center text-gray-500">
                {!loading && "No results found"}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                Start typing to search...
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
