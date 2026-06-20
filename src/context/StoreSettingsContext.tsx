import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsAPI } from '../utils/api';

interface StoreSettings {
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  website_title?: string;
  website_description?: string;
  website_favicon?: string;
  website_logo?: string;
  store_name?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  instagram_url?: string;
  facebook_url?: string;
  whatsapp_url?: string;
  twitter_url?: string;
  business_hours?: { day: string; open: string; close: string }[];
  payment_methods?: { name: string; enabled: boolean }[];
  coming_soon?: boolean;
  default_banners?: any[];
  homepage_categories?: {
    id: string;
    title: string;
    desc: string;
    image: string;
    icon: string;
    count: string;
    system_category_slug?: string;
    redirect_url?: string;
  }[];
  homepage_sections?: {
    id: string;
    title: string;
    productIds: string[];
  }[];
  best_selling_product_ids?: string[];
  instapay_details?: string;
  instapay_enabled?: boolean;
  telda_details?: string;
  telda_enabled?: boolean;
  vodafone_cash_details?: string;
  vodafone_cash_enabled?: boolean;
  binance_details?: string;
  binance_enabled?: boolean;
  paypal_details?: string;
  paypal_enabled?: boolean;
}

interface StoreSettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  formatPrice: (price: number | string) => string;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  currency_code: 'EGP',
  currency_symbol: 'EGP',
  tax_rate: 0,
  website_title: 'Games Up',
  website_description: 'Your premium gaming destination',
  website_favicon: '',
  store_name: 'Games Up',
  store_email: '',
  store_phone: '',
  store_address: '',
  instagram_url: '',
  facebook_url: '',
  whatsapp_url: '',
  twitter_url: '',
  business_hours: [],
  payment_methods: [],
  coming_soon: false,
  best_selling_product_ids: [],
  instapay_details: '',
  instapay_enabled: false,
  telda_details: '',
  telda_enabled: false,
  vodafone_cash_details: '',
  vodafone_cash_enabled: false,
  binance_details: '',
  binance_enabled: false,
  paypal_details: '',
  paypal_enabled: false,
  homepage_categories: [
    {
      id: 'rpg',
      title: 'ACTION & ADVENTURE RPG',
      desc: 'Elite RPG titles and high-immersive adventure protocols.',
      image: 'https://images.unsplash.com/photo-1605898399789-19794336e181?q=80&w=1000&auto=format&fit=crop',
      icon: 'Swords',
      count: '24 ASSETS',
      system_category_slug: ''
    },
    {
      id: 'sports',
      title: 'SPORTS & RACING',
      desc: 'Peak performance required. Master the field and the track.',
      image: 'https://images.unsplash.com/photo-1547941126-3d5322b218b0?q=80&w=1000&auto=format&fit=crop',
      icon: 'Zap',
      count: '18 ASSETS',
      system_category_slug: ''
    },
    {
      id: 'shooter',
      title: 'WARFARE & FPS',
      desc: 'Tactical dominance. High-precision assets for elite operators.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
      icon: 'Target',
      count: '32 ASSETS',
      system_category_slug: ''
    },
    {
      id: 'horror',
      title: 'HORROR & SURVIVAL',
      desc: 'Nightmare scenarios. Survival is the only objective.',
      image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1000&auto=format&fit=crop',
      icon: 'Shield',
      count: '12 ASSETS',
      system_category_slug: ''
    }
  ]
};

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await settingsAPI.get();
      
      // Parse JSON strings for complex objects
      let business_hours = [];
      try {
        business_hours = data.business_hours ? JSON.parse(data.business_hours) : [];
      } catch (e) {
        // console.error('Failed to parse business_hours', e);
      }

      let payment_methods = [];
      try {
        payment_methods = data.payment_methods ? JSON.parse(data.payment_methods) : [];
      } catch (e) {
        // console.error('Failed to parse payment_methods', e);
      }

      let default_banners: any[] = [];
      try {
        default_banners = data.default_banners ? JSON.parse(data.default_banners) : [];
      } catch (e) {}

      let homepage_categories: any[] = [];
      try {
        homepage_categories = data.homepage_categories ? JSON.parse(data.homepage_categories) : [];
      } catch (e) {}

      let homepage_sections: any[] = [];
      try {
        homepage_sections = data.homepage_sections ? JSON.parse(data.homepage_sections) : [];
      } catch (e) {}

      let best_selling_product_ids: any[] = [];
      try {
        best_selling_product_ids = data.best_selling_product_ids ? JSON.parse(data.best_selling_product_ids) : [];
      } catch (e) {}

      setSettings({
        currency_code: data.currency_code || 'EGP',
        currency_symbol: data.currency_symbol || 'EGP',
        tax_rate: parseFloat(data.tax_rate) || 0,
        website_title: data.website_title || 'Games Up',
        website_description: data.website_description || '',
        website_favicon: data.website_favicon || '',
        website_logo: data.website_logo || '',
        store_name: data.store_name || 'Games Up',
        store_email: data.store_email || '',
        store_phone: data.store_phone || '',
        store_address: data.store_address || '',
        instagram_url: data.instagram_url || '',
        facebook_url: data.facebook_url || '',
        whatsapp_url: data.whatsapp_url || '',
        twitter_url: data.twitter_url || '',
        business_hours,
        payment_methods,
        default_banners,
        homepage_categories: (homepage_categories && homepage_categories.length > 0) ? homepage_categories : defaultSettings.homepage_categories,
        homepage_sections: Array.isArray(homepage_sections) ? homepage_sections : [],
        best_selling_product_ids: Array.isArray(best_selling_product_ids) ? best_selling_product_ids.map((v: any) => String(v)) : [],
        coming_soon: data.coming_soon === true || data.coming_soon === 'true',
        instapay_details: data.instapay_details || '',
        instapay_enabled: data.instapay_enabled === true || data.instapay_enabled === 'true',
        telda_details: data.telda_details || '',
        telda_enabled: data.telda_enabled === true || data.telda_enabled === 'true',
        vodafone_cash_details: data.vodafone_cash_details || '',
        vodafone_cash_enabled: data.vodafone_cash_enabled === true || data.vodafone_cash_enabled === 'true',
        binance_details: data.binance_details || '',
        binance_enabled: data.binance_enabled === true || data.binance_enabled === 'true',
        paypal_details: data.paypal_details || '',
        paypal_enabled: data.paypal_enabled === true || data.paypal_enabled === 'true',
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      // Optimistic update
      setSettings(prev => ({ ...prev, ...newSettings }));

      // Prepare data for server (serialize objects)
      const serverData: any = { ...newSettings };
      if (serverData.business_hours) {
        serverData.business_hours = JSON.stringify(serverData.business_hours);
      }
      if (serverData.payment_methods) {
        serverData.payment_methods = JSON.stringify(serverData.payment_methods);
      }
      if (serverData.homepage_categories) {
        serverData.homepage_categories = JSON.stringify(serverData.homepage_categories);
      }
      if (serverData.homepage_sections) {
        serverData.homepage_sections = JSON.stringify(serverData.homepage_sections);
      }
      if (serverData.best_selling_product_ids) {
        serverData.best_selling_product_ids = JSON.stringify(serverData.best_selling_product_ids);
      }

      await settingsAPI.update(serverData);
      
      await fetchSettings(); // Refresh to ensure sync
    } catch (error) {
      console.error('Failed to update settings:', error);
      fetchSettings(); // Revert on error
      throw error;
    }
  };

  const formatPrice = (price: number | string): string => {
    if (price == null) return `${settings.currency_symbol}0.00`;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `${settings.currency_symbol}0.00`;
    
    // Check if currency code implies different formatting (optional, keep simple for now)
    return `${settings.currency_symbol}${numPrice.toFixed(2)}`;
  };

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, formatPrice, updateSettings, refreshSettings: fetchSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (context === undefined) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
}
