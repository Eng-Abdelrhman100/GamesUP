import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Mail, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../utils/api';

interface OutlookAccount {
  id: string | number;
  email: string;
  password: string;
  recoveryEmail?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdDate: string;
  lastLogin?: string;
  productName?: string;
}

export function Outlook() {
  const [accounts, setAccounts] = useState<OutlookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OutlookAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    recoveryEmail: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
    productName: '',
  });

  const formatDate = (value?: any) => {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const rows = await api.get('outlook_accounts');
      const mapped = (rows || []).map((r: any) => ({
        id: r.id,
        email: r.email,
        password: r.password,
        recoveryEmail: r.recovery_email || '',
        status: (r.status || 'Active') as any,
        createdDate: formatDate(r.created_at),
        lastLogin: formatDate(r.last_login),
        productName: r.product_name || '',
      }));
      setAccounts(mapped);
    } catch (e) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSaveAccount = async () => {
    setLoading(true);
    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        recovery_email: formData.recoveryEmail || null,
        status: formData.status,
        product_name: formData.productName || null,
      };

      if (editingAccount) {
        await api.put('outlook_accounts', editingAccount.id, payload);
      } else {
        await api.post('outlook_accounts', payload);
      }

      setIsAddModalOpen(false);
      setEditingAccount(null);
      setFormData({ email: '', password: '', recoveryEmail: '', status: 'Active', productName: '' });
      await loadAccounts();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this Outlook account?')) return;
    setLoading(true);
    try {
      await api.delete('outlook_accounts', id);
      await loadAccounts();
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account: OutlookAccount) => {
    setEditingAccount(account);
    setFormData({
      email: account.email,
      password: account.password,
      recoveryEmail: account.recoveryEmail || '',
      status: account.status,
      productName: account.productName || '',
    });
    setIsAddModalOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const togglePasswordVisibility = (id: string | number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccounts = accounts.filter((account) =>
    account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (account.productName && account.productName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Inactive':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
      case 'Suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Outlook Accounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage product-linked Outlook accounts</p>
        </div>
        <Button
          onClick={() => {
            setEditingAccount(null);
            setFormData({ email: '', password: '', recoveryEmail: '', status: 'Active', productName: '' });
            setIsAddModalOpen(true);
          }}
          icon={Plus}
        >
          Add Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{accounts.length}</p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {accounts.filter(a => a.status === 'Active').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
            {accounts.filter(a => a.status === 'Inactive').length}
          </p>
        </Card>
        <Card className="text-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Suspended</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {accounts.filter(a => a.status === 'Suspended').length}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </Card>

      {/* Accounts Table */}
      <Card className="p-8">
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading accounts...</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Password</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Created</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{account.email}</span>
                      <button
                        onClick={() => copyToClipboard(account.email, 'Email')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {showPasswords[account.id] ? account.password : '••••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(account.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {showPasswords[account.id] ? (
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(account.password, 'Password')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                    {account.productName || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">{account.createdDate}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {/* Add/Edit Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAccount(null);
          setFormData({ email: '', password: '', recoveryEmail: '', status: 'Active', productName: '' });
        }}
        title={editingAccount ? 'Edit Outlook Account' : 'Add New Outlook Account'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="account@outlook.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recovery Email (Optional)</label>
            <input
              type="email"
              value={formData.recoveryEmail}
              onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="recovery@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Linked Product</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Product name"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingAccount(null);
                setFormData({ email: '', password: '', recoveryEmail: '', status: 'Active', productName: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAccount}>
              {editingAccount ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
