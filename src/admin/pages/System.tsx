import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Tag, FolderTree, Settings as SettingsIcon, Upload, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { api, categoriesAPI } from '../../utils/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Attribute {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

type Tab = 'categories' | 'subcategories' | 'attributes';

export function System() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        const data = await categoriesAPI.getAll();
        // Map snake_case from DB to camelCase for component state
        const mappedData = data.map((item: any) => ({
            ...item,
            displayOrder: item.display_order,
            isActive: item.is_active,
        }));
        setCategories(mappedData);
      } else if (activeTab === 'subcategories') {
        // Load categories first to ensure we can show parent names
        const cats = await categoriesAPI.getAll();
        const mappedCats = cats.map((item: any) => ({
            ...item,
            displayOrder: item.display_order,
            isActive: item.is_active,
        }));
        setCategories(mappedCats);

        const data = await api.get('sub_categories');
        const mappedData = data.map((item: any) => ({
            ...item,
            categoryId: item.category_id,
            displayOrder: item.display_order,
            isActive: item.is_active,
        }));
        setSubCategories(mappedData);
      } else {
        const data = await api.get('product_attributes');
        const mappedData = data.map((item: any) => ({
            ...item,
            displayOrder: item.display_order,
            isActive: item.is_active,
            isRequired: item.is_required
        }));
        setAttributes(mappedData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: `Failed to load ${activeTab}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'categories') {
          // Filter out fields that don't exist in DB
          const categoryData: any = {
            name: editingItem.name,
            slug: editingItem.slug,
            icon: editingItem.icon,
            display_order: parseInt(editingItem.displayOrder as any) || 0,
            is_active: editingItem.isActive
          };

          if (editingItem?.id) {
              await categoriesAPI.update(editingItem.id, categoryData);
          } else {
              await categoriesAPI.create(categoryData);
          }
      } else if (activeTab === 'subcategories') {
          if (!editingItem?.categoryId) {
            setToast({ message: 'Please select a category', type: 'error' });
            return;
          }

          const subCategoryData: any = {
            category_id: parseInt(editingItem.categoryId as any),
            name: editingItem.name,
            description: editingItem.description,
            slug: editingItem.slug,
            display_order: parseInt(editingItem.displayOrder as any) || 0,
            is_active: editingItem.isActive
          };

          if (editingItem?.id) {
             await (api as any).put('sub_categories', editingItem.id, subCategoryData);
          } else {
             await api.post('sub_categories', subCategoryData);
          }
      } else if (activeTab === 'attributes') {
          const attributeData: any = {
            name: editingItem.name,
            type: editingItem.type,
            options: Array.isArray(editingItem.options) ? editingItem.options : [],
            is_required: !!editingItem.isRequired,
            display_order: parseInt(editingItem.displayOrder as any) || 0,
            is_active: !!editingItem.isActive
          };

          if (editingItem?.id) {
             await (api as any).put('product_attributes', editingItem.id, attributeData);
          } else {
             await api.post('product_attributes', attributeData);
          }
      }

      setToast({ message: 'Saved successfully', type: 'success' });
      setShowModal(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error('Error saving data:', error);
      setToast({ message: 'Failed to save', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      if (activeTab === 'categories') {
          await categoriesAPI.delete(id);
      } else {
          const endpoint = activeTab === 'subcategories' ? 'sub_categories' : 'product_attributes';
          await api.delete(endpoint, id);
      }
      setToast({ message: 'Deleted successfully', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting data:', error);
      setToast({ message: 'Failed to delete', type: 'error' });
    }
  };

  const initializeDemoData = async () => {
    if (!confirm('This will create demo categories, subcategories, and attributes. Continue?')) return;

    setLoading(true);
    try {
      // Demo categories
      const demoCategories = [
        { name: 'Consoles', slug: 'consoles', icon: '🎮', displayOrder: 1, isActive: true },
        { name: 'Games', slug: 'games', icon: '🎯', displayOrder: 2, isActive: true },
        { name: 'Accessories', slug: 'accessories', icon: '🎧', displayOrder: 3, isActive: true },
        { name: 'Digital', slug: 'digital', icon: '💳', displayOrder: 4, isActive: true },
      ];

      for (const cat of demoCategories) {
        await categoriesAPI.create(cat);
      }

      setToast({ message: 'Demo data initialized successfully!', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error initializing demo data:', error);
      setToast({ message: 'Failed to initialize demo data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (activeTab === 'categories') {
      setEditingItem({
        name: '',
        slug: '',
        icon: '',
        displayOrder: 0,
        isActive: true,
      });
    } else if (activeTab === 'subcategories') {
      setEditingItem({
        categoryId: categories[0]?.id || '',
        name: '',
        description: '',
        slug: '',
        displayOrder: 0,
        isActive: true,
      });
    } else {
      setEditingItem({
        name: '',
        type: 'text',
        options: [],
        isRequired: false,
        displayOrder: 0,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem({ ...item });
    setShowModal(true);
  };

  const handleToggleStatus = async (item: any, type: Tab) => {
    try {
      const newStatus = !item.isActive;
      
      if (type === 'categories') {
        const categoryData = {
            id: item.id, 
            name: item.name,
            slug: item.slug,
            icon: item.icon,
            display_order: item.displayOrder,
            is_active: newStatus
        };
        await categoriesAPI.update(item.id, categoryData);
      } else {
        const endpoint = type === 'subcategories' ? 'sub_categories' : 'product_attributes';
        // For subcategories/attributes, make sure we send the full object back or minimal needed
        // Assuming minimal update might fail if required fields are missing, let's send full object
        // BUT mapped correctly.
        const payload: any = { 
            ...item, 
            is_active: newStatus 
        };
        
        // Remove frontend specific camelCase if DB expects snake_case for everything
        // Or if 'item' already has snake_case props mixed in, we need to be careful.
        // Let's assume the API wrapper handles it or we need to be explicit.
        
        if (type === 'subcategories') {
             // Ensure snake_case for subcategories
             payload.category_id = item.categoryId;
             payload.display_order = item.displayOrder;
             delete payload.categoryId;
             delete payload.displayOrder;
             delete payload.isActive; // We are sending is_active
        } else if (type === 'attributes') {
             payload.is_required = item.isRequired;
             payload.display_order = item.displayOrder;
             delete payload.isRequired;
             delete payload.displayOrder;
             delete payload.isActive;
        }

        await (api as any).put(endpoint, item.id, payload);
      }
      
      await loadData(); 
      setToast({ message: 'Status updated successfully', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an SVG or image
    if (!file.type.includes('svg') && !file.type.includes('image')) {
      setToast({ message: 'Please upload an SVG or image file', type: 'error' });
      return;
    }

    setUploadingIcon(true);
    try {
      const { uploadAPI } = await import('../../utils/api');
      const { url } = await uploadAPI.uploadImage(file);
      setEditingItem({ ...editingItem, icon: url });
      setToast({ message: 'Icon uploaded successfully', type: 'success' });
    } catch (error) {
      console.error('Icon upload error:', error);
      setToast({ message: 'Failed to upload icon', type: 'error' });
    } finally {
      setUploadingIcon(false);
    }
  };

  const renderIcon = (icon: string) => {
    if (!icon) return null;
    const isUrl = icon.startsWith('http') || icon.startsWith('data:image');
    if (isUrl) {
      return <img src={icon} alt="Icon" className="w-6 h-6 object-contain" />;
    }
    return <span className="text-xl">{icon}</span>;
  };

  const renderCategoriesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Slug</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Icon</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">{category.name}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{category.slug}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {renderIcon(category.icon)}
                </div>
              </td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{category.displayOrder}</td>
              <td className="p-4">
                <button
                  onClick={() => handleToggleStatus(category, 'categories')}
                  className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    category.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button
                  onClick={() => openEditModal(category)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg mr-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSubCategoriesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Category</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Slug</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subCategories.map((subCategory) => (
            <tr key={subCategory.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">{subCategory.name}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                {categories.find(c => c.id === subCategory.categoryId)?.name || 'Unknown'}
              </td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{subCategory.slug}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{subCategory.displayOrder}</td>
              <td className="p-4">
                <button
                  onClick={() => handleToggleStatus(subCategory, 'subcategories')}
                  className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    subCategory.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
                  }`}
                >
                  {subCategory.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button
                  onClick={() => openEditModal(subCategory)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg mr-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(subCategory.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAttributesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Type</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Required</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((attribute) => (
            <tr key={attribute.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">{attribute.name}</td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{attribute.type}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  attribute.isRequired ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {attribute.isRequired ? 'Required' : 'Optional'}
                </span>
              </td>
              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{attribute.displayOrder}</td>
              <td className="p-4">
                <button
                  onClick={() => handleToggleStatus(attribute, 'attributes')}
                  className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    attribute.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
                  }`}
                >
                  {attribute.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button
                  onClick={() => openEditModal(attribute)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg mr-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(attribute.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderModal = () => {
    if (!editingItem) return null;

    return (
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editingItem.id ? 'Edit' : 'Add'} ${activeTab}`}>
        <div className="space-y-4">
          {activeTab === 'categories' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug</label>
                <input
                  type="text"
                  value={editingItem.slug}
                  onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon (Emoji, URL, or SVG Upload)</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editingItem.icon}
                      onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                      placeholder="Emoji or URL"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="icon-upload"
                        className="hidden"
                        accept=".svg,image/*"
                        onChange={handleIconUpload}
                      />
                      <label
                        htmlFor="icon-upload"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {uploadingIcon ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        Upload SVG/Image
                      </label>
                      {editingItem.icon && (
                        <button 
                          onClick={() => setEditingItem({ ...editingItem, icon: '' })}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-14 h-14 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    {renderIcon(editingItem.icon)}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                <input
                  type="number"
                  value={editingItem.displayOrder || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem.isActive}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              </div>
            </>
          )}

          {activeTab === 'subcategories' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parent Category</label>
                <select
                  value={editingItem.categoryId}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug</label>
                <input
                  type="text"
                  value={editingItem.slug}
                  onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                <input
                  type="number"
                  value={editingItem.displayOrder || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem.isActive}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              </div>
            </>
          )}

          {activeTab === 'attributes' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              {editingItem.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={editingItem.options?.join(', ') || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, options: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                <input
                  type="number"
                  value={editingItem.displayOrder || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem.isRequired}
                  onChange={(e) => setEditingItem({ ...editingItem, isRequired: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem.isActive}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => setShowModal(false)} variant="secondary" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage categories, sub-categories, and product attributes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-red-600 text-white'
              : 'border-transparent text-white hover:text-red-300'
          }`}
        >
          <Tag className="w-4 h-4" />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'subcategories'
              ? 'border-red-600 text-white'
              : 'border-transparent text-white hover:text-red-300'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Sub-Categories
        </button>
        <button
          onClick={() => setActiveTab('attributes')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'attributes'
              ? 'border-red-600 text-white'
              : 'border-transparent text-white hover:text-red-300'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Attributes
        </button>
      </div>

      {/* Content */}
      <Card className="p-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">{activeTab}</h2>
            <div className="flex gap-2">
              {activeTab === 'categories' && categories.length === 0 && (
                <Button onClick={initializeDemoData} variant="secondary">
                  Initialize Demo Data
                </Button>
              )}
              <Button onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add {activeTab === 'categories' ? 'Category' : activeTab === 'subcategories' ? 'Sub-Category' : 'Attribute'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'categories' && renderCategoriesTable()}
              {activeTab === 'subcategories' && renderSubCategoriesTable()}
              {activeTab === 'attributes' && renderAttributesTable()}
            </>
          )}
        </div>
      </Card>

      {renderModal()}

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
