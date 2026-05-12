import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Truck, Save, X, DollarSign, Clock } from 'lucide-react';
import { deliveryOptionsAPI } from '../../utils/api';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  active: boolean;
}

export function Delivery() {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    estimatedDays: '',
    active: true,
  });

  useEffect(() => {
    loadDeliveryOptions();
  }, []);

  const loadDeliveryOptions = async () => {
    try {
      const data = await deliveryOptionsAPI.getAll();
      const mapped = (data || []).map((o: any) => ({
        ...o,
        estimatedDays: o.estimatedDays || o.estimated_days || '',
      }));
      setDeliveryOptions(mapped);
    } catch (error) {
      console.error('Error loading delivery options:', error);
    }
  };

  const handleOpenModal = (option?: DeliveryOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        name: option.name,
        description: option.description,
        price: option.price,
        estimatedDays: option.estimatedDays,
        active: option.active,
      });
    } else {
      setEditingOption(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        estimatedDays: '',
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOption(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      estimatedDays: '',
      active: true,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        estimated_days: formData.estimatedDays,
        active: formData.active,
      };
      if (editingOption) {
        await deliveryOptionsAPI.update(editingOption.id, payload);
      } else {
        await deliveryOptionsAPI.create(payload);
      }

      loadDeliveryOptions();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving delivery option:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this delivery option?')) return;

    try {
      await deliveryOptionsAPI.delete(id);
      loadDeliveryOptions();
    } catch (error) {
      console.error('Error deleting delivery option:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Options</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage shipping and delivery methods for your store
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Delivery Option
        </button>
      </div>

      {/* Delivery Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deliveryOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{option.name}</h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      option.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(option)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => handleDelete(option.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{option.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{option.estimatedDays}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span className="text-xl font-bold text-red-600">
                  {option.price === 0 ? 'FREE' : option.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {deliveryOptions.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No delivery options yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first delivery option to start offering shipping to customers
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
            >
              Add Delivery Option
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingOption ? 'Edit Delivery Option' : 'Add Delivery Option'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                  placeholder="e.g., Standard Shipping"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                  placeholder="e.g., Delivered in 5-7 business days"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                    placeholder="5-7 business days"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active (available for customers to select)
                </label>
              </div>
            </div>

            <div className="flex gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.name || !formData.description}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Saving...' : 'Save Delivery Option'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
