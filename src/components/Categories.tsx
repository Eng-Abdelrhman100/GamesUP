import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface CategoriesProps {
  onCategoryClick: (category: string) => void;
}

export const Categories = ({ onCategoryClick }: CategoriesProps) => {
  const { settings } = useStoreSettings();

  // Load from store settings with fallback to default categories
  const categoriesList = settings.homepage_categories || [];

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.Gamepad; // Fallback to Gamepad icon if not found
  };

  const getCleanCategoryId = (title: string) => {
    const t = String(title || '').toLowerCase();
    if (t.includes('rpg') || t.includes('action')) return 'RPG';
    if (t.includes('sports') || t.includes('racing')) return 'SPORTS';
    if (t.includes('fps') || t.includes('warfare') || t.includes('shooter')) return 'SHOOTER';
    if (t.includes('horror') || t.includes('survival')) return 'HORROR';
    return 'ALL';
  };

  return (
    <section className="py-24 bg-bg-dark overflow-hidden transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-16">
          <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-4 italic">Deployment Sectors</p>
          <h2 className="text-5xl md:text-7xl font-black text-[var(--text-primary)] tracking-tighter font-display uppercase italic leading-none transition-colors">
            Categories<span className="text-brand-red">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoriesList.map((cat, idx) => {
            const Icon = getIcon(cat.icon);
            const selectedCategory = String((cat as any).system_category_slug || '').trim();
            const categoryFilter = (selectedCategory || getCleanCategoryId(cat.title)).toUpperCase();
            return (
              <motion.div
                key={cat.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                onClick={() => onCategoryClick(categoryFilter)}
                className="group relative h-[500px] rounded-[2.5rem] overflow-hidden cursor-pointer border border-border-subtle"
              >
                {/* Background Image */}
                <img 
                  src={cat.image} 
                  alt={cat.title} 
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                />
                
                {/* Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute inset-0 bg-brand-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="mb-6">
                    <div className="p-3 bg-brand-red/20 backdrop-blur-md border border-brand-red/30 rounded-2xl w-fit mb-6 group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-[0.9] mb-3 group-hover:text-brand-red transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                      {cat.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-2">
                    <span className="text-[10px] font-black text-white/50 tracking-widest uppercase italic">{cat.count}</span>
                    <div className="p-2 rounded-full bg-white/5 group-hover:bg-brand-red transition-colors">
                      <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
