import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Upload, 
  Swords, 
  Zap, 
  Target, 
  Shield, 
  Gamepad, 
  Trophy, 
  Flame, 
  Skull 
} from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { authAPI, categoriesAPI, productsAPI, uploadAPI } from '../../utils/api';
// import { BASE_URL, authAPI } from '../../utils/api';

export function Settings() {
  const { settings, updateSettings, loading: settingsLoading } = useStoreSettings();
  const [activeTab, setActiveTab] = useState('store');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [systemCategories, setSystemCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const [bestSellingSearch, setBestSellingSearch] = useState('');
  
  // Local state for password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ message: '', type: '' });
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ message: 'New passwords do not match', type: 'error' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ message: 'Password must be at least 6 characters long', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordStatus({ message: 'Password changed successfully', type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordStatus({ message: 'Failed to change password. Please check your current password.', type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Local state for form forms
  const [formData, setFormData] = useState({
    currency_code: 'USD',
    currency_symbol: '$',
    tax_rate: 8.5,
    website_title: '',
    website_description: '',
    website_favicon: '',
    website_logo: '',
    store_name: '',
    store_email: '',
    store_phone: '',
    store_address: '',
    instagram_url: '',
    facebook_url: '',
    whatsapp_url: '',
    twitter_url: '',
    business_hours: [] as { day: string; open: string; close: string }[],
    payment_methods: [] as { name: string; enabled: boolean }[],
    coming_soon: false,
    homepage_categories: [] as { id: string; title: string; desc: string; image: string; icon: string; count: string; system_category_slug?: string }[],
    homepage_sections: [] as { id: string; title: string; productIds: string[] }[],
    best_selling_product_ids: [] as string[],
  });
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  useEffect(() => {
    categoriesAPI.getAll()
      .then((items: any[]) => {
        const active = (items || []).filter((c: any) => c?.is_active !== false);
        setSystemCategories(active);
      })
      .catch(() => {
        setSystemCategories([]);
      });
  }, []);

  useEffect(() => {
    productsAPI.getAll()
      .then((res: any) => {
        setAllProducts(Array.isArray(res?.products) ? res.products : []);
      })
      .catch(() => {
        setAllProducts([]);
      });
  }, []);

  useEffect(() => {
    if (settings) {
      const defaultPaymentMethods = [
        { name: 'Credit/Debit Cards', enabled: true },
        { name: 'PayPal', enabled: true },
        { name: 'Apple Pay', enabled: true },
        { name: 'Google Pay', enabled: false },
        { name: 'Cryptocurrency', enabled: false },
      ];

      const defaultBusinessHours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
        day,
        open: '09:00',
        close: '18:00'
      }));

      setFormData({
        currency_code: settings.currency_code || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        tax_rate: typeof settings.tax_rate === 'number' && !Number.isNaN(settings.tax_rate) ? settings.tax_rate : 0,
        website_title: settings.website_title || '',
        website_description: settings.website_description || '',
        website_favicon: settings.website_favicon || '',
        website_logo: settings.website_logo || '',
        store_name: settings.store_name || '',
        store_email: settings.store_email || '',
        store_phone: settings.store_phone || '',
        store_address: settings.store_address || '',
        instagram_url: settings.instagram_url || '',
        facebook_url: settings.facebook_url || '',
        whatsapp_url: settings.whatsapp_url || '',
        twitter_url: settings.twitter_url || '',
        business_hours: ((settings.business_hours && settings.business_hours.length > 0) ? settings.business_hours : defaultBusinessHours).map((bh: any) => ({
          day: String(bh?.day ?? ''),
          open: bh?.open == null ? '' : String(bh.open),
          close: bh?.close == null ? '' : String(bh.close),
        })),
        payment_methods: (settings.payment_methods && settings.payment_methods.length > 0) ? settings.payment_methods : defaultPaymentMethods,
        coming_soon: settings.coming_soon || false,
        homepage_categories: (settings.homepage_categories || []).map((c: any) => ({
          ...c,
          system_category_slug: c?.system_category_slug ?? '',
        })),
        homepage_sections: (Array.isArray((settings as any).homepage_sections) ? (settings as any).homepage_sections : []).map((s: any) => ({
          id: String(s?.id ?? `sec_${Date.now()}`),
          title: s?.title == null ? '' : String(s.title),
          productIds: Array.isArray(s?.productIds) ? s.productIds.map((v: any) => String(v)) : [],
        })),
        best_selling_product_ids: Array.isArray((settings as any).best_selling_product_ids)
          ? (settings as any).best_selling_product_ids.map((v: any) => String(v))
          : [],
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaveStatus('saving');

    // Upload favicon/logo if changed
    let faviconUrl = formData.website_favicon;
    let logoUrl = formData.website_logo;
    
    if (faviconFile) {
      try {
        const result = await uploadAPI.uploadImage(faviconFile);
        faviconUrl = result.url;
      } catch (error) {
        console.error('Error uploading favicon:', error);
        // Continue saving other settings even if upload fails
      }
    }

    try {
      await updateSettings({ ...formData, website_favicon: faviconUrl, website_logo: logoUrl, coming_soon: formData.coming_soon });
      setSaveStatus('saved');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    let symbol = '$';
    switch (code) {
      case 'USD': symbol = '$'; break;
      case 'EUR': symbol = '€'; break;
      case 'GBP': symbol = '£'; break;
      case 'JPY': symbol = '¥'; break;
      case 'EGP': symbol = 'E£'; break;
      default: symbol = '$';
    }
    setFormData({ ...formData, currency_code: code, currency_symbol: symbol });
  };

  const handlePaymentToggle = (name: string) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.map(method => 
        method.name === name ? { ...method, enabled: !method.enabled } : method
      )
    }));
  };

  const handleBusinessHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData(prev => ({
      ...prev,
      business_hours: prev.business_hours.map(bh => 
        bh.day === day ? { ...bh, [field]: value } : bh
      )
    }));
  };

  const handleFaviconUpload = async () => {
    if (!faviconFile) return;

    try {
      const result = await uploadAPI.uploadImage(faviconFile);
      setFormData(prev => ({ ...prev, website_favicon: result.url }));
      setFaviconFile(null);
    } catch (error) {
      console.error('Error uploading favicon:', error);
      alert('Failed to upload favicon');
    }
  };

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      const result = await uploadAPI.uploadImage(logoFile);
      setFormData(prev => ({ ...prev, website_logo: result.url }));
      setLogoFile(null);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    }
  };

  const bestSellingFilteredProducts = allProducts.filter((p: any) => {
    const s = String(bestSellingSearch || '').toLowerCase();
    if (!s) return true;
    const name = String(p?.name || '').toLowerCase();
    const id = String(p?.id || '').toLowerCase();
    const cat = String(p?.category_slug || '').toLowerCase();
    return name.includes(s) || id.includes(s) || cat.includes(s);
  });


  const tabs = [
    { id: 'store', label: 'Store Info' },
    { id: 'categories', label: 'Home Categories' },
    { id: 'home-sections', label: 'Home Sections' },
    { id: 'payments', label: 'Payments' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'integrations', label: 'Integrations' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your store settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-red-600 text-white'
                  : 'border-transparent text-white hover:text-red-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Store Info */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Landing Page Mode</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enable to show a "Coming Soon" page to customers</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, coming_soon: !formData.coming_soon })}
                className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  formData.coming_soon ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${
                    formData.coming_soon ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {formData.coming_soon && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Coming Soon Mode Active:</strong> Users will see the "Coming Soon" landing page instead of the normal store. You can still access the admin panel and the website directly.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Store Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store Name</label>
                <input
                  type="text"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="PlayStation Store Admin"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store Email</label>
                <input
                  type="email"
                  value={formData.store_email}
                  onChange={(e) => setFormData({ ...formData, store_email: e.target.value })}
                  placeholder="store@playstation.com"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store Phone</label>
                <input
                  type="tel"
                  value={formData.store_phone}
                  onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store Address</label>
                <textarea
                  value={formData.store_address}
                  onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                  placeholder="2207 Bridgepointe Parkway, San Mateo, CA 94404"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website Title</label>
                <input
                  type="text"
                  value={formData.website_title}
                  onChange={(e) => setFormData({ ...formData, website_title: e.target.value })}
                  placeholder="Games Up"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website Description</label>
                <textarea
                  value={formData.website_description}
                  onChange={(e) => setFormData({ ...formData, website_description: e.target.value })}
                  placeholder="Your ultimate destination for gaming products and digital goods."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favicon URL</label>
                <input
                  type="text"
                  value={formData.website_favicon}
                  onChange={(e) => setFormData({ ...formData, website_favicon: e.target.value })}
                  placeholder="https://example.com/favicon.png"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="favicon-upload"
                  />
                  <label
                    htmlFor="favicon-upload"
                    className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    Choose PNG
                  </label>
                  <Button type="button" onClick={handleFaviconUpload} className="bg-red-600 hover:bg-red-700 text-white">
                    Upload Icon
                  </Button>
                  {(faviconFile || formData.website_favicon) && (
                    <span className="text-xs text-green-500">Selected</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website Logo URL</label>
                <input
                  type="text"
                  value={formData.website_logo}
                  onChange={(e) => setFormData({ ...formData, website_logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    Choose Image
                  </label>
                  <Button type="button" onClick={handleLogoUpload} className="bg-red-600 hover:bg-red-700 text-white">
                    Upload Logo
                  </Button>
                  {(logoFile || formData.website_logo) && (
                    <span className="text-xs text-green-500">Selected</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Social Media Links</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instagram URL</label>
                <input
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/gamesup"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facebook URL</label>
                <input
                  type="url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/gamesup"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WhatsApp URL</label>
                <input
                  type="url"
                  value={formData.whatsapp_url}
                  onChange={(e) => setFormData({ ...formData, whatsapp_url: e.target.value })}
                  placeholder="https://wa.me/1234567890"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">X (Twitter) URL</label>
                <input
                  type="url"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  placeholder="https://x.com/gamesup"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Business Hours</h3>
            <div className="space-y-3">
              {formData.business_hours.map((day) => (
                <div key={day.day} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-700 dark:text-gray-300">{day.day}</div>
                  <input
                    type="time"
                    value={day.open ?? ''}
                    onChange={(e) => handleBusinessHoursChange(day.day, 'open', e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="time"
                    value={day.close ?? ''}
                    onChange={(e) => handleBusinessHoursChange(day.day, 'close', e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="p-8 bg-[#0f0f0f] border border-white/10 relative overflow-hidden rounded-[2rem]">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Home Categories</h3>
                <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-wider">
                  Configure the homepage deployment sectors and category cards
                </p>
              </div>
              <div className="flex gap-3">
                {formData.homepage_categories.length === 0 && !settingsLoading && (
                  <button
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        homepage_categories: [
                          { id: 'rpg', title: 'ACTION & ADVENTURE RPG', desc: 'Elite RPG titles and high-immersive adventure protocols.', image: 'https://images.unsplash.com/photo-1605898399789-19794336e181?q=80&w=1000&auto=format&fit=crop', icon: 'Swords', count: '24 ASSETS', system_category_slug: '' },
                          { id: 'sports', title: 'SPORTS & RACING', desc: 'Peak performance required. Master the field and the track.', image: 'https://images.unsplash.com/photo-1547941126-3d5322b218b0?q=80&w=1000&auto=format&fit=crop', icon: 'Zap', count: '18 ASSETS', system_category_slug: '' },
                          { id: 'shooter', title: 'WARFARE & FPS', desc: 'Tactical dominance. High-precision assets for elite operators.', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop', icon: 'Target', count: '32 ASSETS', system_category_slug: '' },
                          { id: 'horror', title: 'HORROR & SURVIVAL', desc: 'Nightmare scenarios. Survival is the only objective.', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1000&auto=format&fit=crop', icon: 'Shield', count: '12 ASSETS', system_category_slug: '' },
                        ]
                      }));
                    }}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    Load Defaults
                  </button>
                )}
                <button
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      homepage_categories: [
                        ...prev.homepage_categories,
                        {
                          id: `custom_${Date.now()}`,
                          title: 'NEW CATEGORY',
                          desc: 'Add descriptive details for this homepage category sector.',
                          image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
                          icon: 'Gamepad',
                          count: '0 ASSETS',
                          system_category_slug: ''
                        }
                      ]
                    }));
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black uppercase italic tracking-wider transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>
            </div>

            {/* Loading state */}
            {settingsLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-400 font-bold uppercase text-sm tracking-wider">Loading categories...</span>
              </div>
            )}

            {/* Empty state */}
            {!settingsLoading && formData.homepage_categories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Gamepad className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-white font-black uppercase text-lg italic">No Categories Yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-6">Click "Load Defaults" to restore the 4 default categories, or "Add Category" to create a new one.</p>
              </div>
            )}

            {/* Categories Grid */}
            {!settingsLoading && formData.homepage_categories.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {formData.homepage_categories.map((cat, idx) => (
                  <div key={cat.id || idx} className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex flex-col gap-4">
                    
                    {/* Preview Image */}
                    <div className="relative h-[140px] rounded-2xl overflow-hidden border border-white/10 group">
                      <img
                        src={cat.image ?? ''}
                        alt={cat.title ?? 'Category'}
                        className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="px-2 py-1 bg-red-600/80 backdrop-blur-sm text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {cat.icon ?? 'Gamepad'}
                        </span>
                        <span className="text-sm font-black text-white italic uppercase tracking-tight truncate max-w-[160px]">
                          {cat.title ?? ''}
                        </span>
                      </div>
                      <span className="absolute top-3 right-3 text-[9px] font-black text-white/50 uppercase tracking-widest">
                        {cat.count ?? ''}
                      </span>
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category Title</label>
                        <input
                          type="text"
                          value={cat.title ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              homepage_categories: prev.homepage_categories.map((c, i) =>
                                i === idx ? { ...c, title: v } : c
                              )
                            }));
                          }}
                          placeholder="e.g. ACTION & ADVENTURE RPG"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Assets Count</label>
                        <input
                          type="text"
                          value={cat.count ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              homepage_categories: prev.homepage_categories.map((c, i) =>
                                i === idx ? { ...c, count: v } : c
                              )
                            }));
                          }}
                          placeholder="e.g. 24 ASSETS"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">System Category</label>
                      <select
                        value={cat.system_category_slug ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            homepage_categories: prev.homepage_categories.map((c, i) =>
                              i === idx ? { ...c, system_category_slug: v } : c
                            )
                          }));
                        }}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-red-500 transition-colors"
                      >
                        <option value="">Auto (based on title)</option>
                        {systemCategories.map((c: any) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                      <textarea
                        value={cat.desc ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            homepage_categories: prev.homepage_categories.map((c, i) =>
                              i === idx ? { ...c, desc: v } : c
                            )
                          }));
                        }}
                        placeholder="Short tagline for this category..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Icon</label>
                        <select
                          value={cat.icon ?? 'Gamepad'}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              homepage_categories: prev.homepage_categories.map((c, i) =>
                                i === idx ? { ...c, icon: v } : c
                              )
                            }));
                          }}
                          className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-red-500 transition-colors"
                        >
                          <option value="Swords">⚔️ Swords</option>
                          <option value="Zap">⚡ Zap</option>
                          <option value="Target">🎯 Target</option>
                          <option value="Shield">🛡️ Shield</option>
                          <option value="Gamepad">🎮 Gamepad</option>
                          <option value="Trophy">🏆 Trophy</option>
                          <option value="Flame">🔥 Flame</option>
                          <option value="Skull">💀 Skull</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Upload Image</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id={`cat-img-${cat.id || idx}`}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const res = await uploadAPI.uploadImage(file);
                                setFormData(prev => ({
                                  ...prev,
                                  homepage_categories: prev.homepage_categories.map((c, i) =>
                                    i === idx ? { ...c, image: res.url } : c
                                  )
                                }));
                              } catch {
                                alert('Upload failed — check server connection.');
                              }
                            }}
                          />
                          <label
                            htmlFor={`cat-img-${cat.id || idx}`}
                            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" /> Choose Image
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Image URL</label>
                      <input
                        type="text"
                        value={cat.image ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            homepage_categories: prev.homepage_categories.map((c, i) =>
                              i === idx ? { ...c, image: v } : c
                            )
                          }));
                        }}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          homepage_categories: prev.homepage_categories.filter((_, i) => i !== idx)
                        }))}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Home Sections */}
      {activeTab === 'home-sections' && (
        <div className="space-y-6">
          <div className="p-8 bg-[#0f0f0f] border border-white/10 relative overflow-hidden rounded-[2rem]">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Home Sections</h3>
                <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-wider">
                  Add homepage rows (title + selected games)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const id = `sec_${Date.now()}`;
                    setFormData(prev => ({
                      ...prev,
                      homepage_sections: [
                        ...prev.homepage_sections,
                        { id, title: 'NEW SECTION', productIds: [] }
                      ]
                    }));
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black uppercase italic tracking-wider transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>
            </div>

            <div className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex flex-col gap-4 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black text-white tracking-widest uppercase italic">Best Selling</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                    Select products for the homepage best selling row
                  </p>
                </div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  {formData.best_selling_product_ids.length} games
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search Games</label>
                  <input
                    type="text"
                    value={bestSellingSearch}
                    onChange={(e) => setBestSellingSearch(e.target.value)}
                    placeholder="Type to filter..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Selected</label>
                  <div className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold">
                    {formData.best_selling_product_ids.length} games
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  {bestSellingFilteredProducts.length === 0 ? (
                    <div className="p-4 text-xs text-gray-400 font-bold uppercase tracking-wider">
                      No matching games
                    </div>
                  ) : (
                    bestSellingFilteredProducts.map((p: any) => {
                      const pid = String(p?.id ?? '');
                      const checked = (formData.best_selling_product_ids || []).includes(pid);
                      return (
                        <label key={pid} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer">
                          <div className="min-w-0">
                            <div className="text-white text-xs font-bold truncate">{p?.name || `#${pid}`}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                              {p?.category_slug ? String(p.category_slug) : 'UNCATEGORIZED'}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setFormData(prev => {
                                const current = Array.isArray(prev.best_selling_product_ids) ? prev.best_selling_product_ids : [];
                                const next = checked ? current.filter(x => x !== pid) : [...current, pid];
                                return { ...prev, best_selling_product_ids: next };
                              });
                            }}
                            className="h-4 w-4 accent-red-600"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {formData.homepage_sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Gamepad className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-white font-black uppercase text-lg italic">No Sections Yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-6">Click “Add Section” to create a new homepage row.</p>
              </div>
            )}

            {formData.homepage_sections.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {formData.homepage_sections.map((sec, idx) => {
                  const q = sectionSearch[sec.id] || '';
                  const filteredProducts = allProducts.filter((p: any) => {
                    const name = String(p?.name || '').toLowerCase();
                    const id = String(p?.id || '').toLowerCase();
                    const cat = String(p?.category_slug || '').toLowerCase();
                    const s = q.toLowerCase();
                    if (!s) return true;
                    return name.includes(s) || id.includes(s) || cat.includes(s);
                  });

                  return (
                    <div key={sec.id || idx} className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">SECTION</span>
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{String(idx + 1).padStart(2, '0')}</span>
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              homepage_sections: prev.homepage_sections.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Title</label>
                        <input
                          type="text"
                          value={sec.title ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              homepage_sections: prev.homepage_sections.map((s, i) => i === idx ? { ...s, title: v } : s)
                            }));
                          }}
                          placeholder="e.g. FEATURED DROPS"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search Games</label>
                          <input
                            type="text"
                            value={q}
                            onChange={(e) => setSectionSearch(prev => ({ ...prev, [sec.id]: e.target.value }))}
                            placeholder="Type to filter..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Selected</label>
                          <div className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold">
                            {sec.productIds?.length || 0} games
                          </div>
                        </div>
                      </div>

                      <div className="border border-white/10 rounded-2xl overflow-hidden">
                        <div className="max-h-64 overflow-auto">
                          {filteredProducts.length === 0 ? (
                            <div className="p-4 text-xs text-gray-400 font-bold uppercase tracking-wider">
                              No matching games
                            </div>
                          ) : (
                            filteredProducts.map((p: any) => {
                              const pid = String(p?.id ?? '');
                              const checked = (sec.productIds || []).includes(pid);
                              return (
                                <label key={pid} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer">
                                  <div className="min-w-0">
                                    <div className="text-white text-xs font-bold truncate">{p?.name || `#${pid}`}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                      {p?.category_slug ? String(p.category_slug) : 'UNCATEGORIZED'}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        homepage_sections: prev.homepage_sections.map((s, i) => {
                                          if (i !== idx) return s;
                                          const current = Array.isArray(s.productIds) ? s.productIds : [];
                                          const next = checked ? current.filter(x => x !== pid) : [...current, pid];
                                          return { ...s, productIds: next };
                                        })
                                      }));
                                    }}
                                    className="h-4 w-4 accent-red-600"
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
            <div className="space-y-3">
              {formData.payment_methods.map((method) => (
                <div key={method.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">{method.name}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={method.enabled} 
                      onChange={() => handlePaymentToggle(method.name)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Currency Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                <select 
                  value={formData.currency_code}
                  onChange={handleCurrencyChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="EGP">EGP - Egyptian Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                  step="0.1"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Shipping */}
      {activeTab === 'shipping' && (
        <Card className="p-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Shipping Options</h3>
          <div className="space-y-4">
            {[
              { name: 'Standard Shipping', price: '$5.99', time: '5-7 business days' },
              { name: 'Express Shipping', price: '$12.99', time: '2-3 business days' },
              { name: 'Next Day Delivery', price: '$24.99', time: '1 business day' },
            ].map((option) => (
              <div key={option.name} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{option.name}</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{option.price}</span>
                  <span>•</span>
                  <span>{option.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <Card className="p-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { title: 'New Orders', description: 'Get notified when new orders are placed' },
              { title: 'Low Stock Alerts', description: 'Receive alerts when products are running low' },
              { title: 'Customer Messages', description: 'Get notified of new customer support messages' },
              { title: 'Sales Reports', description: 'Receive daily sales summary reports' },
              { title: 'System Updates', description: 'Get notified about system updates and maintenance' },
            ].map((notif) => (
              <div key={notif.title} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{notif.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notif.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordStatus.message && (
                <div className={`p-3 rounded-lg text-sm ${
                  passwordStatus.type === 'success' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {passwordStatus.message}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add an extra layer of security to your account</p>
            <Button>Enable 2FA</Button>
          </Card>

          <Card className="p-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">MacBook Pro - Chrome</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">San Francisco, CA • Active now</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                    Current
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: 'Stripe', description: 'Payment processing', connected: true, logo: '💳' },
            { name: 'Mailchimp', description: 'Email marketing', connected: true, logo: '📧' },
            { name: 'Slack', description: 'Team communication', connected: false, logo: '💬' },
            { name: 'Google Analytics', description: 'Website analytics', connected: true, logo: '📊' },
            { name: 'Shopify', description: 'E-commerce platform', connected: false, logo: '🛍️' },
            { name: 'Zendesk', description: 'Customer support', connected: false, logo: '🎧' },
          ].map((integration) => (
            <Card key={integration.name} className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                  {integration.logo}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{integration.description}</p>
                  {integration.connected ? (
                    <Button variant="secondary">Disconnect</Button>
                  ) : (
                    <Button>Connect</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          className="bg-red-600 hover:bg-red-700 text-white relative"
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Try Again
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
