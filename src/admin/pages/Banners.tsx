import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { bannersAPI, uploadAPI, productsAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface Banner {
  id: string | number;
  title: string;
  imageUrl: string;
  link: string;
  position: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  subtitle?: string; // Derived from link JSON or separate logic
  badge?: string;    // Derived from link JSON or separate logic
}

export function Banners() {
  const { settings } = useStoreSettings();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    link: '',
    position: 1,
    isActive: true,
    startDate: '',
    endDate: '',
    subtitle: '',
    badge: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [heroConfig, setHeroConfig] = useState({
    badge: '🎮 Your Ultimate Gaming Destination',
    title: 'GAMES UP',
    subtitle: 'Experience the next level of gaming with our premium collection of consoles, accessories, and titles.',
    ctaPrimary: 'Shop Now',
    ctaSecondary: 'Learn More'
  });

  const [specialOffer, setSpecialOffer] = useState({
    title: 'SPECIAL OFFER',
    subtitle: 'Up to 50% Off on Selected Items'
  });

  useEffect(() => {
    loadBanners();
    const savedOffer = localStorage.getItem('specialOfferConfig');
    if (savedOffer) {
      setSpecialOffer(JSON.parse(savedOffer));
    }
    const savedHero = localStorage.getItem('heroConfig');
    if (savedHero) {
      setHeroConfig(JSON.parse(savedHero));
    }
  }, []);

  const handleSaveHero = () => {
    localStorage.setItem('heroConfig', JSON.stringify(heroConfig));
    // Dispatch event for same-tab updates
    window.dispatchEvent(new Event('heroConfigUpdated'));
    window.dispatchEvent(new Event('storage')); // Force update for some listeners
    alert('Hero section updated successfully!');
  };

  const handleSaveSpecialOffer = () => {
    localStorage.setItem('specialOfferConfig', JSON.stringify(specialOffer));
    // Dispatch event for same-tab updates
    window.dispatchEvent(new Event('specialOfferUpdated'));
    window.dispatchEvent(new Event('storage')); // Force update for some listeners
    alert('Special Offer updated successfully!');
  };

  async function loadBanners() {
    try {
      setLoading(true);
      const data = await bannersAPI.getAll();
      const loadedBanners = (data.banners || []).map((b: any) => {
        // Try to parse 'link' as JSON for extended metadata
        // Format: { url: "...", subtitle: "...", badge: "..." }
        // If not JSON, treat as simple URL
        let extendedData: any = {};
        let url = b.link;
        try {
           if (b.link && b.link.trim().startsWith('{')) {
               extendedData = JSON.parse(b.link);
               url = extendedData.url || '';
           }
        } catch (e) {
           // Not JSON, ignore
        }
        
        return {
            ...b,
            id: b.id,
            title: b.title,
            position: Number(b.position),
            isActive: b.is_active !== undefined ? b.is_active : b.isActive,
            imageUrl: b.image_url || b.imageUrl,
            link: url,
            subtitle: extendedData.subtitle || '',
            badge: extendedData.badge || ''
        };
      }).filter((b: any) => Number(b.position) < 100);
      setBanners(loadedBanners);
      setError(null);
    } catch (err: any) {
      console.error('Error loading banners:', err);
      setError(err.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }

  const initializeDefaults = async () => {
    if (!confirm('This will create default banners for positions 1-6 if they don\'t exist. Continue?')) return;
    
    const defaults = Array.isArray((settings as any).default_banners) ? (settings as any).default_banners : [];
    if (!defaults.length) {
      alert('No default banners configured in Settings. Add a settings key named "default_banners" with a JSON array of banner objects.');
      return;
    }

    setLoading(true);
    try {
      let createdCount = 0;
      for (const def of defaults) {
        const position = Number(def.position ?? 0);
        if (!Number.isFinite(position) || position <= 0) continue;
        const exists = banners.some(b => Number(b.position) === position);
        if (!exists) {
          const link =
            typeof def.link === 'string'
              ? def.link
              : JSON.stringify({
                  url: def.url || '',
                  subtitle: def.subtitle || '',
                  badge: def.badge || '',
                });

          const payload: any = {
            title: def.title || `Banner ${position}`,
            image_url: def.image_url || def.imageUrl || '',
            link,
            position,
            is_active: def.is_active !== undefined ? !!def.is_active : def.isActive !== undefined ? !!def.isActive : true,
            start_date: def.start_date || def.startDate || null,
            end_date: def.end_date || def.endDate || null,
          };

          await bannersAPI.create(payload);
          createdCount++;
        }
      }

      if (createdCount > 0) {
        alert(`Successfully initialized ${createdCount} default banners.`);
        loadBanners();
      } else {
        alert('All default positions (1-6) are already occupied.');
      }

    } catch (err) {
      console.error('Error initializing defaults:', err);
      alert('Failed to initialize defaults.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async () => {
    try {
      // Pack extended data into link field
      const packedLink = JSON.stringify({
          url: formData.link,
          subtitle: formData.subtitle,
          badge: formData.badge
      });

      const payload = {
          ...formData,
          link: packedLink
      };
      
      // Remove temporary fields from payload before sending (though API might ignore them, safer to clean)
      delete (payload as any).subtitle;
      delete (payload as any).badge;

      if (editingBanner) {
        await bannersAPI.update(editingBanner.id, payload);
      } else {
        await bannersAPI.create(payload);
      }
      
      setFormData({ title: '', imageUrl: '', link: '', position: 1, isActive: true, startDate: '', endDate: '', subtitle: '', badge: '' });
      setIsAddModalOpen(false);
      setEditingBanner(null);
      loadBanners();
    } catch (err: any) {
      console.error('Error saving banner:', err);
      alert(err.message || 'Failed to save banner');
    }
  };

  const handleDeleteBanner = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await bannersAPI.delete(id);
      await loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const packedLink = JSON.stringify({
          url: banner.link,
          subtitle: banner.subtitle,
          badge: banner.badge
      });
      
      const payload = {
          ...banner,
          link: packedLink,
          isActive: !banner.isActive
      };
      
      delete (payload as any).subtitle;
      delete (payload as any).badge;

      await bannersAPI.update(banner.id, payload);
      await loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
      alert('Failed to update banner');
    }
  };

  const openAddModal = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      imageUrl: '',
      link: '',
      position: 1,
      isActive: true,
      startDate: '',
      endDate: '',
      subtitle: '',
      badge: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link,
      position: banner.position,
      isActive: banner.isActive,
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
      subtitle: (banner as any).subtitle || '',
      badge: (banner as any).badge || ''
    });
    setIsAddModalOpen(true);
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadAPI.uploadImage(file);
      setFormData({ ...formData, imageUrl: result.url });
      alert('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading banners...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button onClick={loadBanners}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Website Banners</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage promotional banners for your website</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={initializeDefaults} variant="secondary">
            Initialize Defaults
          </Button>
          <Button onClick={openAddModal} icon={Plus}>
            Add Banner
          </Button>
        </div>
      </div>

      {/* Hero Section Configuration */}
      <Card className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Hero Section</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Badge Text</label>
            <input
              type="text"
              value={heroConfig.badge}
              onChange={(e) => setHeroConfig({ ...heroConfig, badge: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="🎮 Your Ultimate Gaming Destination"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Main Title</label>
            <input
              type="text"
              value={heroConfig.title}
              onChange={(e) => setHeroConfig({ ...heroConfig, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="GAMES UP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtitle</label>
            <textarea
              value={heroConfig.subtitle}
              onChange={(e) => setHeroConfig({ ...heroConfig, subtitle: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Description text..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Button Text</label>
            <input
              type="text"
              value={heroConfig.ctaPrimary}
              onChange={(e) => setHeroConfig({ ...heroConfig, ctaPrimary: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Shop Now"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secondary Button Text</label>
            <input
              type="text"
              value={heroConfig.ctaSecondary}
              onChange={(e) => setHeroConfig({ ...heroConfig, ctaSecondary: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Learn More"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveHero}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Save Hero Section
          </Button>
        </div>
      </Card>

      {/* Special Offer Configuration */}
      <Card className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Special Offer Section</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={specialOffer.title}
              onChange={(e) => setSpecialOffer({ ...specialOffer, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="SPECIAL OFFER"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offer Text</label>
            <input
              type="text"
              value={specialOffer.subtitle}
              onChange={(e) => setSpecialOffer({ ...specialOffer, subtitle: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Up to 50% Off on Selected Items"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSpecialOffer}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Save Special Offer
          </Button>
        </div>
      </Card>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <Card key={banner.id} className="p-8">
            <div className="space-y-4">
              {/* Banner Preview */}
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=400&fit=crop';
                  }}
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    banner.isActive 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Position {banner.position}
                  </span>
                </div>
              </div>

              {/* Banner Info */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{banner.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  Link: {banner.link || 'No link'}
                </p>
                {(banner.startDate || banner.endDate) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {banner.startDate && `From: ${new Date(banner.startDate).toLocaleDateString()}`}
                    {banner.endDate && ` | To: ${new Date(banner.endDate).toLocaleDateString()}`}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleToggleActive(banner)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {banner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {banner.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleEditBanner(banner)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {banners.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            No banners yet. Click "Add Banner" to create your first one.
          </div>
        )}
      </div>

      {/* Add/Edit Banner Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBanner(null);
          setFormData({ title: '', imageUrl: '', link: '', position: 1, isActive: true, startDate: '', endDate: '', subtitle: '', badge: '' });
        }}
        title={editingBanner ? 'Edit Banner' : 'Add New Banner'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Banner Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Summer Sale 2024"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="https://... or /uploads/filename.jpg"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={triggerFileInput}
                  disabled={uploading}
                  variant="secondary"
                  icon={Upload}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 h-32">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link URL (optional)</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Badge Text (Optional)</label>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="NEW ARRIVALS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtitle (Optional)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Short description"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position (Landing Page Section)</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={1}>Position 1 - Bento Main (2x2)</option>
                <option value={2}>Position 2 - Bento Top Right (2x1)</option>
                <option value={3}>Position 3 - Bento Bottom Mid (1x1)</option>
                <option value={4}>Position 4 - Bento Bottom Right (1x1)</option>
                <option value={5}>Position 5 - Secondary Banner 1</option>
                <option value={6}>Position 6 - Secondary Banner 2</option>
                <option value={7}>Position 7 - Secondary Banner 3</option>
                <option value={8}>8+ - Other Pages</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Positions 1-4 control the Hero Bento Grid</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date (optional)</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date (optional)</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingBanner(null);
                setFormData({ title: '', imageUrl: '', link: '', position: 1, isActive: true, startDate: '', endDate: '', subtitle: '', badge: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBanner}>
              {editingBanner ? 'Update Banner' : 'Add Banner'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface HeroSlide {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  isActive: boolean;
  position: number;
  linkType: 'none' | 'url' | 'product';
  url: string;
  productId: string;
  slot?: string;
  hasLinkType?: boolean;
}

export function HeroSliderBanners() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<HeroSlide, 'id'>>({
    title: '',
    subtitle: '',
    imageUrl: '',
    isActive: true,
    position: 100,
    linkType: 'none',
    url: '',
    productId: '',
    slot: 'hero',
  });

  useEffect(() => {
    loadSlides();
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await productsAPI.getAll();
      const mapped = (data.products || []).map((p: any) => ({ id: String(p.id), name: String(p.name || 'Untitled') }));
      setProducts(mapped);
    } catch (err: any) {
      console.error('Error loading products:', err);
    }
  }

  function parseLinkData(rawLink: any) {
    if (typeof rawLink !== 'string') {
      return { subtitle: '', linkType: 'none' as const, url: '', productId: '', slot: '', hasLinkType: false };
    }

    if (rawLink.trim().startsWith('{')) {
      try {
        const data = JSON.parse(rawLink);
        const linkType = (data.linkType as HeroSlide['linkType']) || (data.productId ? 'product' : data.url ? 'url' : 'none');
        return {
          subtitle: String(data.subtitle || ''),
          linkType,
          url: String(data.url || ''),
          productId: String(data.productId || ''),
          slot: String(data.slot || ''),
          hasLinkType: Object.prototype.hasOwnProperty.call(data, 'linkType'),
        };
      } catch (e) {
        return { subtitle: '', linkType: 'none' as const, url: '', productId: '', slot: '', hasLinkType: false };
      }
    }

    return { subtitle: '', linkType: rawLink ? ('url' as const) : ('none' as const), url: String(rawLink || ''), productId: '', slot: '', hasLinkType: false };
  }

  async function loadSlides() {
    try {
      setLoading(true);
      const data = await bannersAPI.getAll();
      const mappedSlides = (data.banners || [])
        .map((b: any) => {
          const meta = parseLinkData(b.link);
          return {
            id: b.id,
            title: String(b.title || ''),
            subtitle: meta.subtitle,
            imageUrl: String(b.image_url || b.imageUrl || ''),
            isActive: b.is_active !== undefined ? Boolean(b.is_active) : Boolean(b.isActive),
            position: Number(b.position),
            linkType: meta.linkType,
            url: meta.url,
            productId: meta.productId,
            slot: meta.slot,
            hasLinkType: meta.hasLinkType,
          } satisfies HeroSlide;
        })
        .filter((s: any) => s.slot === 'hero' || s.hasLinkType === true || (s.position >= 100 && s.position < 200))
        .sort((a: HeroSlide, b: HeroSlide) => a.position - b.position);

      setSlides(mappedSlides);
      setError(null);
    } catch (err: any) {
      console.error('Error loading hero slides:', err);
      setError(err.message || 'Failed to load hero slider');
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    const nextPosition = Math.max(99, ...slides.map(s => Number(s.position) || 100)) + 1;
    setEditingSlide(null);
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      isActive: true,
      position: nextPosition,
      linkType: 'none',
      url: '',
      productId: '',
      slot: 'hero',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      imageUrl: slide.imageUrl,
      isActive: slide.isActive,
      position: slide.position,
      linkType: slide.linkType,
      url: slide.url,
      productId: slide.productId,
      slot: slide.slot || 'hero',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSlide(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: result.url }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const buildLinkPayload = (data: Omit<HeroSlide, 'id'>) => {
    const payload: any = {
      subtitle: data.subtitle || '',
      linkType: data.linkType,
      slot: 'hero',
    };

    if (data.linkType === 'product') {
      payload.productId = data.productId || '';
      payload.url = '';
    } else if (data.linkType === 'url') {
      payload.url = data.url || '';
      payload.productId = '';
    } else {
      payload.url = '';
      payload.productId = '';
    }

    return JSON.stringify(payload);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!formData.imageUrl.trim()) {
      alert('Please add a background image');
      return;
    }
    if (formData.linkType === 'product' && !formData.productId) {
      alert('Please select a product');
      return;
    }
    if (formData.linkType === 'url' && !formData.url.trim()) {
      alert('Please enter a URL');
      return;
    }

    const payload = {
      title: formData.title,
      image_url: formData.imageUrl,
      link: buildLinkPayload(formData),
      position: Number(formData.position) || 100,
      is_active: formData.isActive,
    };

    try {
      if (editingSlide) {
        await bannersAPI.update(editingSlide.id, payload);
      } else {
        await bannersAPI.create(payload);
      }
      closeModal();
      await loadSlides();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save slide');
    }
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    try {
      await bannersAPI.delete(slide.id);
      await loadSlides();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete slide');
    }
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    try {
      await bannersAPI.update(slide.id, {
        title: slide.title,
        image_url: slide.imageUrl,
        link: buildLinkPayload({
          title: slide.title,
          subtitle: slide.subtitle,
          imageUrl: slide.imageUrl,
          isActive: !slide.isActive,
          position: slide.position,
          linkType: slide.linkType,
          url: slide.url,
          productId: slide.productId,
          slot: slide.slot || 'hero',
        }),
        position: slide.position,
        is_active: !slide.isActive,
      });
      await loadSlides();
    } catch (err) {
      console.error('Toggle failed:', err);
      alert('Failed to update slide status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading hero slider...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button onClick={loadSlides}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hero Slider</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage the modern slider shown at the top of the website</p>
        </div>
        <Button onClick={openAddModal} icon={Plus}>
          Add Slide
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {slides.map(slide => (
          <Card key={slide.id} className="p-8">
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-52 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=400&fit=crop';
                  }}
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    slide.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {slide.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Order {slide.position}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{slide.title}</h3>
                {slide.subtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{slide.subtitle}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Link: {slide.linkType === 'product' ? `Product (${slide.productId || 'not set'})` : slide.linkType === 'url' ? (slide.url || 'not set') : 'None'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className={`p-2 rounded-lg transition-colors ${
                      slide.isActive
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(slide)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(slide)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {slides.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            No slides yet. Click "Add Slide" to create your first one.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSlide ? 'Edit Slide' : 'Add New Slide'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="New Season Drop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtitle</label>
            <textarea
              value={formData.subtitle}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Short description for the banner"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 100 }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Background Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://..."
              />
              <Button type="button" variant="secondary" icon={Upload} onClick={triggerFileInput} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
            {formData.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Click Action</label>
            <select
              value={formData.linkType}
              onChange={(e) => setFormData(prev => ({ ...prev, linkType: e.target.value as HeroSlide['linkType'], url: '', productId: '' }))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="none">No link</option>
              <option value="product">Link to product</option>
              <option value="url">Link to URL</option>
            </select>
          </div>

          {formData.linkType === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Product</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.linkType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="/shop or https://..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave}>{editingSlide ? 'Update Slide' : 'Add Slide'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
