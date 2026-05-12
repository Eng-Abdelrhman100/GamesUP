import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingCart, Heart, ArrowLeft, Star, Truck, Shield, Share2, ChevronDown, ShoppingBag } from 'lucide-react';
import { productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categorySlug?: string;
  stock: number;
  rating?: number;
  reviews?: number;
  specs?: Record<string, string>;
  attributes?: Record<string, any>;
  digitalItems?: any[];
}

interface ProductDetailsProps {
  onOpenCart: () => void;
  productId: string | null;
}

export function ProductDetails({ onOpenCart, productId }: ProductDetailsProps) {
  const navigate = useNavigate();
  const { formatPrice } = useStoreSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [availableAttributes, setAvailableAttributes] = useState<Record<string, { count: number; price: number }>>({});

  useEffect(() => {
    if (productId) {
      loadProduct(productId);
    } else {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.some((f: any) => f.id === product.id));

      // Calculate available attributes from product variants or digital items slots
      const stats: Record<string, { count: number; price: number }> = {};
      let hasSlots = false;

      // Prefer new product_variants table if available
      if ((product as any).product_variants && (product as any).product_variants.length > 0) {
        hasSlots = true;
        // First get stock counts from digital items
        const stockCounts: Record<string, number> = {};
        if (product.digitalItems && product.digitalItems.length > 0) {
          product.digitalItems.forEach((item: any) => {
            if (item.slots) {
              Object.entries(item.slots).forEach(([attr, slot]: [string, any]) => {
                if (!slot.sold) {
                  stockCounts[attr] = (stockCounts[attr] || 0) + 1;
                }
              });
            }
          });
        }

        (product as any).product_variants.forEach((variant: any) => {
          let count = 0;
          if (product.digitalItems && product.digitalItems.length > 0) {
            if (variant.name === 'Full Account') {
              // Full Account is available if an account has ZERO sold slots
              count = product.digitalItems.reduce((acc: number, item: any) => {
                if (!item.slots) return acc + 1;
                const anySlotSold = Object.values(item.slots).some((s: any) => s.sold);
                return anySlotSold ? acc : acc + 1;
              }, 0);
            } else {
              // Individual slot availability
              count = stockCounts[variant.name] || 0;
            }
          } else {
            count = 1; // Default if no stock tracking
          }

          if (count > 0) {
            stats[variant.name] = {
              count,
              price: variant.price !== null ? Number(variant.price) : Number(product.price)
            };
          }
        });
      } 
      // Fallback to legacy JSONB approach
      else if (product.digitalItems && product.digitalItems.length > 0) {
        product.digitalItems.forEach((item: any) => {
          if (item.slots) {
            hasSlots = true;
            Object.entries(item.slots).forEach(([attr, slot]: [string, any]) => {
              if (!slot.sold) {
                // Safely parse price, fallback to product base price
                const slotPrice = slot.price !== undefined && slot.price !== null && slot.price !== ''
                  ? Number(slot.price)
                  : Number(product.price);

                if (!stats[attr]) {
                  stats[attr] = { 
                    count: 0, 
                    price: slotPrice
                  };
                }
                stats[attr].count += 1;
              }
            });
          }
        });
      }

      if (hasSlots && Object.keys(stats).length > 0) {
        setAvailableAttributes(stats);
      }
    }
  }, [product]);

  const loadProduct = async (productId: string) => {
    setLoading(true);
    try {
      console.log('Loading product:', productId);
      // Fetch product details from API
      const response = await productsAPI.getById(productId);

      if (response && response.products) {
        const data = response;
        console.log('Product data:', data);
        // The API might return an array or a single object depending on implementation
        // Adjusting based on typical behavior
        const foundProduct = data.products.length > 0 ? data.products[0] : null;
        
        if (foundProduct) {
          const rawAttributes: any = foundProduct.attributes || foundProduct.specs || {};
          const specs: Record<string, string> = {};
          
          const genre = rawAttributes.genre || rawAttributes.Genre;
          const platform = rawAttributes.platform || rawAttributes.Platform;
          const gameSize = rawAttributes.gameSize || rawAttributes['Game Size'] || rawAttributes.publisher || rawAttributes.Publisher; // fallback to publisher for backward compatibility if needed
          const language = rawAttributes.language || rawAttributes.Language || rawAttributes.releaseDate || rawAttributes['Release Date']; // fallback to releaseDate for backward compatibility if needed
          
          if (platform) specs['Platform'] = String(platform);
          if (genre) specs['Genre'] = String(genre);
          if (gameSize) specs['Game Size'] = String(gameSize);
          if (language) specs['Language'] = String(language);

          setProduct({
            ...foundProduct,
            categorySlug: foundProduct.category_slug || foundProduct.categorySlug,
            rating: foundProduct.rating || 4.5,
            reviews: foundProduct.reviews || 128,
            attributes: rawAttributes,
            specs
          });
        } else {
          console.log('Product not found in list');
        }
      } else {
        console.error('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!product) return;
    
    // Validate attribute selection if required
    const hasAttributes = Object.keys(availableAttributes).length > 0;
    if (hasAttributes && !selectedAttribute) {
      alert('Please select a version (Primary/Secondary/etc) before adding to cart');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    // Create a unique ID for cart item based on product ID AND selected attribute
    const cartItemId = hasAttributes && selectedAttribute 
      ? `${product.id}-${selectedAttribute}` 
      : product.id;

    // Use selected attribute price if available
    const itemPrice = hasAttributes && selectedAttribute && availableAttributes[selectedAttribute]
      ? availableAttributes[selectedAttribute].price
      : product.price;

    const existingItemIndex = cart.findIndex((ci: any) => ci.cartItemId === cartItemId || (ci.id === product.id && ci.attribute === selectedAttribute));
    
    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        cartItemId: cartItemId, // Unique identifier for cart management
        name: product.name,
        price: itemPrice,
        image: product.image,
        quantity: quantity,
        attribute: selectedAttribute, // For backend processing
        attributes: selectedAttribute ? { "Version": selectedAttribute } : {}, // For display
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    onOpenCart();
  };

  const toggleFavorite = () => {
    if (!product) return;

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.findIndex((f: any) => f.id === product.id);

    if (index >= 0) {
      favorites.splice(index, 1);
      setIsFavorite(false);
    } else {
      favorites.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.categorySlug,
        rating: product.rating,
      });
      setIsFavorite(true);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Product not found</h2>
        <button 
          onClick={() => navigate('/shop')}
          className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto pt-10">
        <button 
          onClick={() => navigate('/shop')}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors mb-12 group"
        >
          <div className="p-3 bg-white rounded-full shadow-md group-hover:shadow-lg transition-all border border-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-bold uppercase tracking-widest text-xs">Back to Shop</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="p-8 lg:p-12 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-lg aspect-square"
              >
                 <img 
                  src={product.image} 
                  alt={product.name}
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/600x600?text=No+Image';
                    e.currentTarget.onerror = null;
                  }}
                  className="w-full h-full object-cover drop-shadow-2xl hover:scale-105 transition-transform duration-500 rounded-[20px]"
                />
              </motion.div>
              
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Details Section */}
            <div className="p-8 lg:p-12 flex flex-col">
              <div className="mb-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <motion.span 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-block px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase tracking-wider mb-3"
                    >
                      {product.categorySlug || 'Gaming'}
                    </motion.span>
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight"
                    >
                      {product.name}
                    </motion.h1>
                  </div>
                  <button className="p-3 rounded-full bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-gray-900 ml-1">{product.rating}</span>
                  </div>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">{product.reviews} Reviews</span>
                  <span className="text-gray-400">|</span>
                  <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-600 text-lg leading-relaxed mb-8"
                >
                  {product.description}
                </motion.p>

                {/* Attribute Selection */}
                {(() => {
                  const slotsList = Object.entries(availableAttributes).filter(([attr]) => !attr.toLowerCase().includes('offline'));
                  if (slotsList.length === 0) return null;

                  // Group by main attribute (e.g., "Platform" from "Platform: PS4 - Primary" or "Standard - PS5")
                  const groupedAttributes: Record<string, Array<[string, any, string]>> = {};
                  slotsList.forEach(([attr, stats]) => {
                    let mainAttr = 'Version';
                    let subAttr = attr;
                    
                    if (attr.includes(' - ')) {
                      const parts = attr.split(' - ');
                      mainAttr = parts[0].trim();
                      subAttr = parts.slice(1).join(' - ').trim();
                    } else if (attr.includes(':')) {
                      const parts = attr.split(':');
                      mainAttr = parts[0].trim();
                      subAttr = parts.slice(1).join(':').trim();
                    }
                    
                    if (!groupedAttributes[mainAttr]) {
                      groupedAttributes[mainAttr] = [];
                    }
                    groupedAttributes[mainAttr].push([subAttr, stats, attr]);
                  });

                  const groupNames = Object.keys(groupedAttributes);
                  const currentActiveGroup = activeGroup && groupNames.includes(activeGroup) ? activeGroup : groupNames[0];

                  return (
                    <div className="mb-8">
                      {/* Tabs for main groups */}
                      {groupNames.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {groupNames.map((name) => (
                            <button
                              key={name}
                              onClick={() => {
                                setActiveGroup(name);
                              }}
                              className={`px-4 pt-[10px] pb-[10px] rounded-[20px] font-bold text-xs transition-all duration-300 uppercase tracking-widest border-2 outline-none focus:outline-none ${
                                currentActiveGroup === name
                                  ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                  : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900'
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sub attributes grid for active group */}
                      {currentActiveGroup && groupedAttributes[currentActiveGroup] && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8 py-[10px] rounded-[20px]">
                          {groupedAttributes[currentActiveGroup].map(([subAttr, stats, fullAttr]) => {
                            const isSelected = selectedAttribute === fullAttr;
                            const isAvailable = stats.count > 0;
                            return (
                              <button
                                key={subAttr}
                                onClick={() => setSelectedAttribute(fullAttr)}
                                disabled={!isAvailable}
                                className={`relative group overflow-hidden px-3 pt-[10px] pb-[10px] rounded-[20px] border-2 font-bold transition-all duration-300 flex flex-col items-center justify-center text-center outline-none focus:outline-none ${
                                  isSelected
                                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
                                    : !isAvailable
                                    ? 'border-gray-200 bg-gray-50/50 text-gray-400 cursor-not-allowed'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:-translate-y-0.5 shadow-sm'
                                }`}
                                style={{ opacity: !isAvailable ? 0.6 : 1 }}
                              >
                                {isSelected && (
                                  <span className="absolute inset-0 bg-gray-900/5 rounded-[20px]" />
                                )}
                                <span className="relative z-10 text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">{subAttr}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Console Compatibility Note */}
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 mb-8 flex gap-3 items-start">
                        <div className="p-2 bg-white dark:bg-blue-900/30 rounded-full shadow-sm text-blue-600 dark:text-blue-400">
                          <Shield className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-bold text-blue-700 dark:text-blue-400 block mb-0.5">Console Compatibility:</span>
                          Primary Ps5 is only for Ps5 console and Primary Ps4 is only for Ps4 console. Secondary can be both Ps4 or PS5.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Specs */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {product.specs && Object.keys(product.specs).length > 0 && Object.entries(product.specs).map(([key, value], index) => (
                    <motion.div 
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1) }}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-100"
                    >
                      <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">{key}</span>
                      <span className="block text-gray-900 font-medium">{value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Action Area */}
              <div className="pt-8 mt-8">
                <div className="flex flex-col mb-6">
                  <div className="mb-6">
                    <span className="text-gray-500 text-sm font-medium mb-1 block">Total Price</span>
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice((selectedAttribute && availableAttributes[selectedAttribute] 
                        ? availableAttributes[selectedAttribute].price 
                        : (Object.keys(availableAttributes).length > 0 
                            ? Math.min(...Object.values(availableAttributes).map(a => a.price))
                            : product.price)) * quantity)}
                    </span>
                    {!selectedAttribute && Object.keys(availableAttributes).length > 0 && (
                      <span className="text-sm text-red-500 ml-2 font-medium">From</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full p-1 w-full sm:w-[130px] justify-between shadow-sm shrink-0">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-white rounded-full transition-all font-medium text-2xl"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center font-bold text-gray-900 text-lg">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-white rounded-full transition-all font-medium text-2xl"
                      >
                        +
                      </button>
                    </div>

                    <motion.button
                      whileHover={{ scale: product.stock > 0 ? 1.02 : 1 }}
                      whileTap={{ scale: product.stock > 0 ? 0.98 : 1 }}
                      onClick={addToCart}
                      disabled={product.stock <= 0}
                      className={`flex-1 min-w-[180px] py-4 px-4 sm:px-6 rounded-full font-bold flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 ${
                        product.stock > 0 
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                      <span className="text-base sm:text-lg whitespace-nowrap">
                        {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                      </span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleFavorite}
                      className={`p-4 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                        isFavorite 
                          ? 'border-red-500 bg-red-50 text-red-500 shadow-sm shadow-red-500/20' 
                          : 'border-gray-200 bg-white hover:border-red-500 hover:bg-red-50 text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                    </motion.button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>Free Shipping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>2 Year Warranty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
