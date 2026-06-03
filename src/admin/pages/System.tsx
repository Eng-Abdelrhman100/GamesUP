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

interface SubSubCategory {
  id: string;
  sub_category_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
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

type Tab = 'categories' | 'subcategories' | 'subsubcategories' | 'attributes';

export function System() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
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
        const mappedData = data.map((item: any) => ({
            ...item,
            displayOrder: item.display_order,
            isActive: item.is_active,
        }));
        setCategories(mappedData);
      } else if (activeTab === 'subcategories') {
        const cats = await categoriesAPI.getAll();
        setCategories(cats.map((item: any) => ({ ...item, displayOrder: item.display_order, isActive: item.is_active })));

        const data = await api.get('sub_categories');
        const mappedData = data.map((item: any) => ({
            ...item,
            categoryId: item.category_id,
            displayOrder: item.display_order,
            isActive: item.is_active,
        }));
        setSubCategories(mappedData);
      } else if (activeTab === 'subsubcategories') {
        const subs = await api.get('sub_categories');
        setSubCategories(subs.map((item: any) => ({ ...item, categoryId: item.category_id, displayOrder: item.display_order, isActive: item.is_active })));

        const data = await api.get('sub_sub_categories');
        setSubSubCategories(data);
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
      } else if (activeTab === 'subsubcategories') {
          if (!editingItem?.sub_category_id) {
            setToast({ message: 'Please select a sub-category', type: 'error' });
            return;
          }

          const subSubCategoryData: any = {
            sub_category_id: parseInt(editingItem.sub_category_id as any),
            name: editingItem.name,
            slug: editingItem.slug,
            display_order: parseInt(editingItem.display_order as any) || 0,
            is_active: !!(editingItem.is_active ?? editingItem.isActive)
          };

          if (editingItem?.id) {
             await (api as any).put('sub_sub_categories', editingItem.id, subSubCategoryData);
          } else {
             await api.post('sub_sub_categories', subSubCategoryData);
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
      let endpoint = '';
      if (activeTab === 'categories') {
          const category = categories.find(c => c.id === id);
          if (category && ['digital-games', 'games', 'digital', 'gift-cards', 'consoles', 'accessories'].includes(category.slug)) {
              setToast({ message: 'System protected category cannot be deleted', type: 'error' });
              return;
          }
          await categoriesAPI.delete(id);
          setToast({ message: 'Deleted successfully', type: 'success' });
          loadData();
          return;
      } else if (activeTab === 'subcategories') endpoint = 'sub_categories';
      else if (activeTab === 'subsubcategories') endpoint = 'sub_sub_categories';
      else endpoint = 'product_attributes';
      
      await api.delete(endpoint, id);
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
      const demoCategories = [
        { name: 'Consoles', slug: 'consoles', icon: '🎮', displayOrder: 1, isActive: true },
        { name: 'Digital Games', slug: 'digital-games', icon: '🎯', displayOrder: 2, isActive: true },
        { name: 'Accessories', slug: 'accessories', icon: '🎧', displayOrder: 3, isActive: true },
        { name: 'Gift Cards', slug: 'gift-cards', icon: '💳', displayOrder: 4, isActive: true },
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
      setEditingItem({ name: '', slug: '', icon: '', displayOrder: 0, isActive: true });
    } else if (activeTab === 'subcategories') {
      setEditingItem({ categoryId: categories[0]?.id || '', name: '', description: '', slug: '', displayOrder: 0, isActive: true });
    } else if (activeTab === 'subsubcategories') {
      setEditingItem({ sub_category_id: subCategories[0]?.id || '', name: '', slug: '', display_order: 0, is_active: true });
    } else {
      setEditingItem({ name: '', type: 'text', options: [], isRequired: false, displayOrder: 0, isActive: true });
    }
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem({ ...item });
    setShowModal(true);
  };

  const handleToggleStatus = async (item: any, type: Tab) => {
    try {
      const newStatus = !(item.isActive ?? item.is_active);
      
      if (type === 'categories') {
        const categoryData = { ...item, display_order: item.displayOrder, is_active: newStatus };
        await categoriesAPI.update(item.id, categoryData);
      } else {
        let endpoint = '';
        if (type === 'subcategories') endpoint = 'sub_categories';
        else if (type === 'subsubcategories') endpoint = 'sub_sub_categories';
        else endpoint = 'product_attributes';

        const payload: any = { ...item, is_active: newStatus };
        if (type === 'subcategories') {
             payload.category_id = item.categoryId;
             payload.display_order = item.displayOrder;
             delete payload.categoryId; delete payload.displayOrder; delete payload.isActive;
        } else if (type === 'attributes') {
             payload.is_required = item.isRequired;
             payload.display_order = item.displayOrder;
             delete payload.isRequired; delete payload.displayOrder; delete payload.isActive;
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
    return icon.startsWith('http') || icon.startsWith('data:image') 
      ? <img src={icon} alt="Icon" className="w-6 h-6 object-contain" />
      : <span className="text-xl">{icon}</span>;
  };

  const renderCategoriesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Slug</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Icon</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-border-subtle">
              <td className="p-4 text-sm text-text-primary font-medium">{category.name}</td>
              <td className="p-4 text-sm text-text-secondary">{category.slug}</td>
              <td className="p-4 text-sm text-text-secondary">
                <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">{renderIcon(category.icon)}</div>
              </td>
              <td className="p-4 text-sm text-text-secondary">{category.displayOrder}</td>
              <td className="p-4">
                <button onClick={() => handleToggleStatus(category, 'categories')} className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${category.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openEditModal(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit2 className="w-4 h-4" /></button>
                {!['digital-games', 'games', 'digital', 'gift-cards', 'consoles', 'accessories'].includes(category.slug) && (
                  <button onClick={() => handleDelete(category.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                )}
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
          <tr className="border-b border-border-subtle">
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Category</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Slug</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subCategories.map((sub) => (
            <tr key={sub.id} className="border-b border-border-subtle">
              <td className="p-4 text-sm text-text-primary font-medium">{sub.name}</td>
              <td className="p-4 text-sm text-text-secondary">{categories.find(c => String(c.id) === String(sub.categoryId))?.name || 'Unknown'}</td>
              <td className="p-4 text-sm text-text-secondary">{sub.slug}</td>
              <td className="p-4 text-sm text-text-secondary">{sub.displayOrder}</td>
              <td className="p-4">
                <button onClick={() => handleToggleStatus(sub, 'subcategories')} className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${sub.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {sub.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openEditModal(sub)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(sub.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSubSubCategoriesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Sub Category</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Slug</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subSubCategories.map((item) => (
            <tr key={item.id} className="border-b border-border-subtle">
              <td className="p-4 text-sm text-text-primary font-medium">{item.name}</td>
              <td className="p-4 text-sm text-text-secondary">{subCategories.find(s => String(s.id) === String(item.sub_category_id))?.name || 'Unknown'}</td>
              <td className="p-4 text-sm text-text-secondary">{item.slug}</td>
              <td className="p-4 text-sm text-text-secondary">{item.display_order}</td>
              <td className="p-4">
                <button onClick={() => handleToggleStatus(item, 'subsubcategories')} className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${item.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
          <tr className="border-b border-border-subtle">
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Name</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Type</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Required</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Order</th>
            <th className="text-left p-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-right p-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((attr) => (
            <tr key={attr.id} className="border-b border-border-subtle">
              <td className="p-4 text-sm text-text-primary font-medium">{attr.name}</td>
              <td className="p-4 text-sm text-text-secondary capitalize">{attr.type}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${attr.isRequired ? 'bg-orange-100 text-orange-700' : 'bg-bg-secondary text-text-secondary'}`}>{attr.isRequired ? 'Required' : 'Optional'}</span></td>
              <td className="p-4 text-sm text-text-secondary">{attr.displayOrder}</td>
              <td className="p-4">
                <button onClick={() => handleToggleStatus(attr, 'attributes')} className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${attr.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {attr.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openEditModal(attr)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(attr.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Name</label><input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Slug</label><input type="text" value={editingItem.slug} onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })} disabled={editingItem.id && ['digital-games', 'games', 'digital', 'gift-cards', 'consoles', 'accessories'].includes(editingItem.slug)} className="w-full px-3 py-2 border rounded-lg bg-bg-primary disabled:opacity-50" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Icon</label><div className="flex gap-3"><input type="text" value={editingItem.icon} onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg bg-bg-primary" /><div className="w-10 h-10 border rounded-lg flex items-center justify-center bg-bg-secondary">{renderIcon(editingItem.icon)}</div></div></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Order</label><input type="number" value={editingItem.displayOrder || 0} onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div className="flex items-center"><input type="checkbox" checked={editingItem.isActive} onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })} className="mr-2" /><label className="text-sm">Active</label></div>
            </>
          )}
          {activeTab === 'subcategories' && (
            <>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Parent Category</label><select value={editingItem.categoryId} onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary">{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Name</label><input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Slug</label><input type="text" value={editingItem.slug} onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Order</label><input type="number" value={editingItem.displayOrder || 0} onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div className="flex items-center"><input type="checkbox" checked={editingItem.isActive} onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })} className="mr-2" /><label className="text-sm">Active</label></div>
            </>
          )}
          {activeTab === 'subsubcategories' && (
            <>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Parent Sub-Category</label><select value={editingItem.sub_category_id} onChange={(e) => setEditingItem({ ...editingItem, sub_category_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary">{subCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Name</label><input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Slug</label><input type="text" value={editingItem.slug} onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Order</label><input type="number" value={editingItem.display_order || 0} onChange={(e) => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div className="flex items-center"><input type="checkbox" checked={!!(editingItem.is_active ?? editingItem.isActive)} onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })} className="mr-2" /><label className="text-sm">Active</label></div>
            </>
          )}
          {activeTab === 'attributes' && (
            <>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Name</label><input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Type</label><select value={editingItem.type} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary"><option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="boolean">Boolean</option></select></div>
              <div><label className="block text-sm font-medium text-text-secondary mb-2">Order</label><input type="number" value={editingItem.displayOrder || 0} onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-bg-primary" /></div>
              <div className="flex items-center"><input type="checkbox" checked={editingItem.isActive} onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })} className="mr-2" /><label className="text-sm">Active</label></div>
            </>
          )}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1"><Save className="w-4 h-4 mr-2" />Save</Button>
            <Button onClick={() => setShowModal(false)} variant="secondary" className="flex-1"><X className="w-4 h-4 mr-2" />Cancel</Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-text-primary">System Configuration</h1><p className="text-text-secondary mt-1">Manage categories, sub-categories, and product attributes</p></div>
      </div>
      <div className="flex gap-2 border-b border-border-subtle">
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'categories' ? 'border-brand-red text-text-primary' : 'border-transparent text-text-secondary hover:text-brand-red'}`}><Tag className="w-4 h-4" />Categories</button>
        <button onClick={() => setActiveTab('subcategories')} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'subcategories' ? 'border-brand-red text-text-primary' : 'border-transparent text-text-secondary hover:text-brand-red'}`}><FolderTree className="w-4 h-4" />Sub-Categories</button>
        <button onClick={() => setActiveTab('subsubcategories')} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'subsubcategories' ? 'border-brand-red text-text-primary' : 'border-transparent text-text-secondary hover:text-brand-red'}`}><FolderTree className="w-4 h-4" />Sub-Sub-Categories</button>
        <button onClick={() => setActiveTab('attributes')} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'attributes' ? 'border-brand-red text-text-primary' : 'border-transparent text-text-secondary hover:text-brand-red'}`}><SettingsIcon className="w-4 h-4" />Attributes</button>
      </div>
      <Card className="p-8">
        <div>
          <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold text-text-primary capitalize">{activeTab}</h2><Button onClick={openAddModal}><Plus className="w-4 h-4 mr-2" />Add Item</Button></div>
          {loading ? (
            <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div><p className="text-text-secondary mt-4">Loading...</p></div>
          ) : (
            <>
              {activeTab === 'categories' && renderCategoriesTable()}
              {activeTab === 'subcategories' && renderSubCategoriesTable()}
              {activeTab === 'subsubcategories' && renderSubSubCategoriesTable()}
              {activeTab === 'attributes' && renderAttributesTable()}
            </>
          )}
        </div>
      </Card>
      {renderModal()}
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}
