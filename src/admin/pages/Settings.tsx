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
import { authAPI, uploadAPI } from '../../utils/api';
// import { BASE_URL, authAPI } from '../../utils/api';

export function Settings() {
  const { settings, updateSettings } = useStoreSettings();
  const [activeTab, setActiveTab] = useState('store');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
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
    homepage_categories: [] as { id: string; title: string; desc: string; image: string; icon: string; count: string }[],
  });
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

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
        currency_code: settings.currency_code,
        currency_symbol: settings.currency_symbol,
        tax_rate: settings.tax_rate,
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
        business_hours: (settings.business_hours && settings.business_hours.length > 0) ? settings.business_hours : defaultBusinessHours,
        payment_methods: (settings.payment_methods && settings.payment_methods.length > 0) ? settings.payment_methods : defaultPaymentMethods,
        coming_soon: settings.coming_soon || false,
        homepage_categories: settings.homepage_categories || [],
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


  const tabs = [
    { id: 'store', label: 'Store Info' },
    { id: 'categories', label: 'Home Categories' },
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
                    value={day.open}
                    onChange={(e) => handleBusinessHoursChange(day.day, 'open', e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="time"
                    value={day.close}
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
          <Card className="p-8 bg-bg-dark border border-border-subtle relative overflow-hidden rounded-[2rem]">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Home Categories</h3>
                <p className="text-sm text-gray-400 mt-1 font-bold uppercase tracking-wider">Configure the homepage deployment sectors and category cards</p>
              </div>
              <Button
                onClick={() => {
                  const newId = `custom_${Date.now()}`;
                  setFormData(prev => ({
                    ...prev,
                    homepage_categories: [
                      ...prev.homepage_categories,
                      {
                        id: newId,
                        title: 'NEW CATEGORY',
                        desc: 'Add descriptive details for this homepage category sector.',
                        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
                        icon: 'Gamepad',
                        count: '0 ASSETS'
                      }
                    ]
                  }));
                }}
                className="bg-brand-red hover:bg-brand-red-hover text-white font-black uppercase italic tracking-wider px-6 py-3 rounded-xl transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </div>

            {/* Categories List/Editor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.homepage_categories.map((cat, idx) => (
                <div key={cat.id || idx} className="p-6 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden flex flex-col justify-between group">
                  {/* Category Image Preview & Info */}
                  <div className="space-y-4">
                    <div className="relative h-[160px] rounded-2xl overflow-hidden border border-white/10">
                      <img 
                        src={cat.image} 
                        alt={cat.title} 
                        className="w-full h-full object-cover grayscale opacity-70 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 flex items-center gap-3">
                        <div className="p-2 bg-brand-red text-white rounded-lg">
                          {cat.icon === 'Swords' && <Swords className="w-5 h-5" />}
                          {cat.icon === 'Zap' && <Zap className="w-5 h-5" />}
                          {cat.icon === 'Target' && <Target className="w-5 h-5" />}
                          {cat.icon === 'Shield' && <Shield className="w-5 h-5" />}
                          {cat.icon === 'Gamepad' && <Gamepad className="w-5 h-5" />}
                          {cat.icon === 'Trophy' && <Trophy className="w-5 h-5" />}
                          {cat.icon === 'Flame' && <Flame className="w-5 h-5" />}
                          {cat.icon === 'Skull' && <Skull className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white italic uppercase tracking-tighter">{cat.title}</h4>
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{cat.count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Title</label>
                          <input 
                            type="text"
                            value={cat.title}
                            onChange={(e) => {
                              const updated = [...formData.homepage_categories];
                              updated[idx].title = e.target.value;
                              setFormData({ ...formData, homepage_categories: updated });
                            }}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assets Count Text</label>
                          <input 
                            type="text"
                            value={cat.count}
                            onChange={(e) => {
                              const updated = [...formData.homepage_categories];
                              updated[idx].count = e.target.value;
                              setFormData({ ...formData, homepage_categories: updated });
                            }}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-brand-red"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Short Description</label>
                        <textarea 
                          value={cat.desc}
                          onChange={(e) => {
                            const updated = [...formData.homepage_categories];
                            updated[idx].desc = e.target.value;
                            setFormData({ ...formData, homepage_categories: updated });
                          }}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-brand-red resize-none"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lucide Icon</label>
                          <select
                            value={cat.icon}
                            onChange={(e) => {
                              const updated = [...formData.homepage_categories];
                              updated[idx].icon = e.target.value;
                              setFormData({ ...formData, homepage_categories: updated });
                            }}
                            className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-brand-red"
                          >
                            <option value="Swords">Swords</option>
                            <option value="Zap">Zap</option>
                            <option value="Target">Target</option>
                            <option value="Shield">Shield</option>
                            <option value="Gamepad">Gamepad</option>
                            <option value="Trophy">Trophy</option>
                            <option value="Flame">Flame</option>
                            <option value="Skull">Skull</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Upload Art</label>
                          <div className="flex gap-2">
                            <input 
                              type="file"
                              accept="image/*"
                              id={`art-upload-${cat.id || idx}`}
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const res = await uploadAPI.uploadImage(file);
                                    const updated = [...formData.homepage_categories];
                                    updated[idx].image = res.url;
                                    setFormData({ ...formData, homepage_categories: updated });
                                  } catch (err) {
                                    console.error('Image upload failed', err);
                                  }
                                }
                              }}
                            />
                            <label 
                              htmlFor={`art-upload-${cat.id || idx}`}
                              className="w-full cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold"
                            >
                              <Upload className="w-3.5 h-3.5" /> Choose Image
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Image URL</label>
                        <input 
                          type="text"
                          value={cat.image}
                          onChange={(e) => {
                            const updated = [...formData.homepage_categories];
                            updated[idx].image = e.target.value;
                            setFormData({ ...formData, homepage_categories: updated });
                          }}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-brand-red"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
                    <Button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          homepage_categories: prev.homepage_categories.filter((_, cIdx) => cIdx !== idx)
                        }));
                      }}
                      className="bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-400 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Category
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
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
