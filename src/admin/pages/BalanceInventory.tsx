import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { balanceInventoryAPI } from '../../utils/api';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { motion, AnimatePresence } from 'motion/react';

interface BalanceItem {
  id: number;
  email: string;
  password?: string;
  birthdate?: string;
  outlook_email?: string;
  outlook_password?: string;
  dollar_balance: number;
  dollar_to_egp_rate: number;
  created_at?: string;
}

export function BalanceInventory() {
  const { formatPrice } = useStoreSettings();
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    birthdate: '',
    outlook_email: '',
    outlook_password: '',
    dollar_balance: '',
    dollar_to_egp_rate: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await balanceInventoryAPI.getAll();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load balance inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.email) {
      alert('Email is required');
      return;
    }
    try {
      await balanceInventoryAPI.create({
        ...formData,
        dollar_balance: Number(formData.dollar_balance) || 0,
        dollar_to_egp_rate: Number(formData.dollar_to_egp_rate) || 0
      });
      setShowAddModal(false);
      resetForm();
      loadItems();
    } catch (err: any) {
      alert(err.message || 'Failed to add item');
    }
  };

  const handleUpdate = async (id: number, updates: Partial<BalanceItem>) => {
    try {
      await balanceInventoryAPI.update(id, updates);
      setEditingId(null);
      loadItems();
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await balanceInventoryAPI.delete(id);
      loadItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      birthdate: '',
      outlook_email: '',
      outlook_password: '',
      dollar_balance: '',
      dollar_to_egp_rate: ''
    });
  };

  const filteredItems = items.filter(item => 
    item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.outlook_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Balance Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage account balances</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Card className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by email or outlook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Account Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Password</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Birthdate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Outlook</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Dollar Balance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Rate (EGP)</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total EGP</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No accounts found</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-medium">{item.email}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{item.password || '-'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{item.birthdate ? new Date(item.birthdate).toLocaleDateString() : '-'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>{item.outlook_email || '-'}</div>
                      <div className="text-xs opacity-60">{item.outlook_password}</div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={item.dollar_balance}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, dollar_balance: Number(e.target.value) } : i))}
                          className="w-24 h-8"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center text-green-600 font-bold">
                          <DollarSign className="w-3 h-3" />
                          {item.dollar_balance}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={item.dollar_to_egp_rate}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, dollar_to_egp_rate: Number(e.target.value) } : i))}
                          className="w-24 h-8"
                        />
                      ) : (
                        <span className="text-gray-500">{item.dollar_to_egp_rate}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-blue-600">
                      {formatPrice(item.dollar_balance * item.dollar_to_egp_rate)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === item.id ? (
                          <>
                            <button onClick={() => handleUpdate(item.id, item)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingId(null); loadItems(); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingId(item.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Account</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Email</label>
                    <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@gmail.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                    <Input value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="******" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Birthdate</label>
                    <Input type="date" value={formData.birthdate} onChange={(e) => setFormData({...formData, birthdate: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Outlook Email</label>
                    <Input value={formData.outlook_email} onChange={(e) => setFormData({...formData, outlook_email: e.target.value})} placeholder="recovery@outlook.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Outlook Password</label>
                    <Input value={formData.outlook_password} onChange={(e) => setFormData({...formData, outlook_password: e.target.value})} placeholder="******" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dollar Balance</label>
                    <Input type="number" value={formData.dollar_balance} onChange={(e) => setFormData({...formData, dollar_balance: e.target.value})} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">EGP Rate</label>
                    <Input type="number" value={formData.dollar_to_egp_rate} onChange={(e) => setFormData({...formData, dollar_to_egp_rate: e.target.value})} placeholder="50.00" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-blue-500 uppercase mb-1">Total EGP Amount (Calculated)</label>
                    <div className="w-full px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatPrice((Number(formData.dollar_balance) || 0) * (Number(formData.dollar_to_egp_rate) || 0))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700 text-white">Create Account</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
