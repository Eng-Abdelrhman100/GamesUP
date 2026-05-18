import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Search, Grid, List as ListIcon, Star, ShoppingCart, SlidersHorizontal, X, ArrowLeft, Heart } from 'lucide-react';
import { Game } from '../types';

interface ShopPageProps {
  games: Game[];
  onProductClick: (game: Game) => void;
  onBack: () => void;
  initialCategory?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  hideCategoriesBar?: boolean;
  categories?: any[];
  subCategories?: any[];
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const ShopPage = ({ 
  games, 
  onProductClick, 
  onBack, 
  initialCategory = 'ALL',
  pageTitle,
  pageSubtitle,
  hideCategoriesBar = false,
  categories: catalogCategories,
  subCategories: catalogSubCategories,
  favorites = [],
  onToggleFavorite
}: ShopPageProps) => {
  const [activeCategory, setActiveCategory] = useState<string>(String(initialCategory || 'ALL').toUpperCase());
  const [activeSubCategory, setActiveSubCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'LOW' | 'HIGH' | 'DEFAULT'| 'AZ' | 'ZA'>('DEFAULT');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  React.useEffect(() => {
    setActiveCategory(String(initialCategory || 'ALL').toUpperCase());
    setActiveSubCategory('ALL');
  }, [initialCategory]);

  const categoryOptions = useMemo(() => {
    if (Array.isArray(catalogCategories) && catalogCategories.length > 0) {
      const active = catalogCategories.filter((c: any) => c && (c.is_active === undefined ? true : !!c.is_active));
      const mapped = active
        .map((c: any) => ({
          value: String(c.slug || '').trim().toUpperCase(),
          label: String(c.name || c.slug || '').trim(),
        }))
        .filter((x: any) => x.value && x.label);
      return [{ value: 'ALL', label: 'ALL' }, ...mapped];
    }

    const set = new Set<string>();
    for (const g of games) {
      const c = String((g as any)?.category || '').trim();
      if (c) set.add(c.toUpperCase());
    }
    const dynamic = Array.from(set).sort();
    return [{ value: 'ALL', label: 'ALL' }, ...dynamic.map((v) => ({ value: v, label: v }))];
  }, [catalogCategories, games]);

  React.useEffect(() => {
    const exists = categoryOptions.some((c: any) => String(c.value).toUpperCase() === String(activeCategory).toUpperCase());
    if (!exists) setActiveCategory('ALL');
  }, [activeCategory, categoryOptions]);

  const subCategoryOptions = useMemo(() => {
    if (activeCategory === 'ALL') return [{ value: 'ALL', label: 'ALL' }];
    if (!Array.isArray(catalogCategories) || !Array.isArray(catalogSubCategories)) return [{ value: 'ALL', label: 'ALL' }];

    const categoryIdBySlug = new Map<string, any>(
      catalogCategories
        .filter((c: any) => c && c.slug != null)
        .map((c: any) => [String(c.slug).trim().toUpperCase(), c.id]),
    );
    const categoryId = categoryIdBySlug.get(activeCategory);
    if (categoryId == null) return [{ value: 'ALL', label: 'ALL' }];

    const mapped = catalogSubCategories
      .filter((s: any) => s && (s.is_active === undefined ? true : !!s.is_active) && String(s.category_id) === String(categoryId))
      .map((s: any) => ({
        value: String(s.slug || s.name || '').trim().toUpperCase(),
        label: String(s.name || s.slug || '').trim(),
      }))
      .filter((x: any) => x.value && x.label);

    return [{ value: 'ALL', label: 'ALL' }, ...mapped];
  }, [activeCategory, catalogCategories, catalogSubCategories]);

  React.useEffect(() => {
    setActiveSubCategory('ALL');
  }, [activeCategory]);

  const statuses = ['ALL', 'IN STOCK', 'NEW', 'LIMITED', 'OUT OF STOCK'];
  const tiers = ['ALL', 'PLATINUM', 'GOLD', 'SILVER'];

  const filteredGames = games.filter(game => {
    const gameCategorySlug = String((game as any)?.categorySlug || '').trim().toUpperCase();
    const matchesCategory =
      activeCategory === 'ALL'
        ? true
        : gameCategorySlug
          ? gameCategorySlug === activeCategory
          : (game.category || '').toUpperCase().includes(String(activeCategory).toUpperCase());

    const gameSubCategorySlug = String((game as any)?.subCategorySlug || '').trim().toUpperCase();
    const matchesSubCategory =
      activeSubCategory === 'ALL' ? true : !!gameSubCategorySlug && gameSubCategorySlug === activeSubCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || game.status === statusFilter;
    const matchesTier = tierFilter === 'ALL' || game.accountTypes.some(t => t.tier === tierFilter && t.isAvailable);
    const matchesMinPrice = minPrice === '' || game.basePrice >= parseInt(minPrice);
    const matchesMaxPrice = maxPrice === '' || game.basePrice <= parseInt(maxPrice);
    
    return matchesCategory && matchesSubCategory && matchesSearch && matchesStatus && matchesTier && matchesMinPrice && matchesMaxPrice;
  }).sort((a, b) => {
    if (priceSort === 'LOW') return a.basePrice - b.basePrice;
    if (priceSort === 'HIGH') return b.basePrice - a.basePrice;
    if (priceSort === 'AZ') return a.title.localeCompare(b.title);
    if (priceSort === 'ZA') return b.title.localeCompare(a.title);
    return 0;
  });

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-8 group italic"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Return To Base
            </button>
            <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-4 transition-colors">
              {pageTitle ? (
                <>
                  {pageTitle}
                  <span className="text-brand-red">.</span>
                </>
              ) : (
                <>
                  THE<br />ARMORY<span className="text-brand-red">.</span>
                </>
              )}
            </h1>
            <p className="text-text-secondary text-sm font-black uppercase tracking-[0.3em] italic">
              {pageSubtitle || 'Full Tactical Asset Inventory'}
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="PROBE INVENTORY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-bg-card border border-border-subtle rounded-2xl px-12 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-brand-red transition-all"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="flex-1 bg-bg-card border border-border-subtle rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest italic cursor-pointer focus:border-brand-red transition-all"
              >
                <option value="DEFAULT">SORT BY: DEFAULT</option>
                <option value="LOW">PRICE: LOW TO HIGH</option>
                <option value="HIGH">PRICE: HIGH TO LOW</option>
                <option value="AZ">ALPHABETICAL: A-Z</option>
                <option value="ZA">ALPHABETICAL: Z-A</option>
              </select>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 bg-bg-card border rounded-xl transition-all ${showFilters ? 'border-brand-red text-brand-red' : 'border-border-subtle text-text-secondary hover:text-brand-red'}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {!hideCategoriesBar && (
          <div className="pb-10 mb-10 border-b border-border-subtle/50">
            <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
              {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(String(cat.value).toUpperCase())}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap transition-all ${
                  activeCategory === cat.value 
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                    : 'bg-bg-card border border-border-subtle text-text-secondary hover:border-brand-red/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
            </div>

            {subCategoryOptions.length > 1 && (
              <div className="mt-4 flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
                {subCategoryOptions.map((sub) => (
                  <button
                    key={sub.value}
                    onClick={() => setActiveSubCategory(String(sub.value).toUpperCase())}
                    className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap transition-all ${
                      activeSubCategory === sub.value
                        ? 'bg-brand-red/20 text-brand-red border border-brand-red'
                        : 'bg-bg-card/40 border border-border-subtle text-text-secondary hover:border-brand-red/30'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-bg-card/50 border border-border-subtle rounded-[2rem] p-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] italic">Availability Protocol</p>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                          statusFilter === status 
                            ? 'bg-brand-red/20 text-brand-red border border-brand-red' 
                            : 'bg-bg-dark border border-border-subtle text-text-secondary hover:border-brand-red/30'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] italic">Price Range (L.E)</p>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="MIN"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-xl px-4 py-2 text-[10px] font-bold uppercase focus:outline-none focus:border-brand-red transition-all"
                    />
                    <input 
                      type="number" 
                      placeholder="MAX"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-bg-dark border border-border-subtle rounded-xl px-4 py-2 text-[10px] font-bold uppercase focus:outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] italic">Intelligence Class (Tiers)</p>
                  <div className="flex flex-wrap gap-2">
                    {tiers.map(tier => (
                      <button
                        key={tier}
                        onClick={() => setTierFilter(tier)}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                          tierFilter === tier 
                            ? 'bg-brand-red/20 text-brand-red border border-brand-red' 
                            : 'bg-bg-dark border border-border-subtle text-text-secondary hover:border-brand-red/30'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredGames.length > 0 ? (
              filteredGames.map((game, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={game.id}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group"
                  onClick={() => onProductClick(game)}
                >
                  <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-bg-card border border-border-subtle cursor-pointer transition-all hover:border-brand-red group-hover:shadow-[0_0_50px_-10px_rgba(235,59,59,0.15)]">
                    <img 
                      src={game.image} 
                      alt={game.title}
                      className="w-full h-full object-cover grayscale-0 group-hover:grayscale group-hover:scale-105 transition-all duration-500 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-80"></div>
                    
                    {/* Badges */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                       {game.status !== 'IN STOCK' && (
                         <span className="bg-brand-red/90 backdrop-blur-md text-white text-[9px] font-black tracking-[0.2em] px-4 py-2 rounded-xl uppercase italic border border-white/10">{game.status}</span>
                       )}
                       <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black tracking-[0.2em] px-4 py-2 rounded-xl uppercase italic border border-white/10">L.E {game.basePrice}</span>
                    </div>

                    <div className="absolute top-6 right-6">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(game.id);
                        }}
                        className={`p-3 rounded-xl backdrop-blur-md border transition-all ${
                          favorites.includes(game.id)
                            ? 'bg-brand-red border-brand-red text-white shadow-lg'
                            : 'bg-black/40 border-white/10 text-white hover:bg-brand-red hover:border-brand-red'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(game.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8">
                      <p className="text-[9px] font-black text-brand-red uppercase tracking-[0.4em] mb-2 italic">{game.category || 'ASSET'}</p>
                      <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">
                        {game.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex text-brand-red gap-0.5">
                          {[1,2,3,4,5].map(i => <Star key={i} className="h-2.5 w-2.5 fill-current" />)}
                        </div>
                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white group-hover:bg-brand-red group-hover:border-brand-red transition-all">
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-32 text-center text-text-secondary">
                <X className="h-16 w-16 mx-auto mb-6 opacity-20" />
                <p className="text-xl font-black uppercase tracking-[0.1em] italic">No Assets Matching This Protocol</p>
                <button onClick={() => {setActiveCategory('ALL'); setSearchQuery(''); setMinPrice(''); setMaxPrice(''); setStatusFilter('ALL'); setTierFilter('ALL');}} className="mt-4 text-brand-red font-black uppercase tracking-widest hover:underline italic">Reset Filters</button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
