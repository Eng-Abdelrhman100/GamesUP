import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { expensesAPI } from '../../utils/api';

interface Expense {
  id: string | number;
  title: string;
  description?: string | null;
  amount: number;
  date?: string | null;
  created_at?: string | null;
}

export function Expenses() {
  const { formatPrice } = useStoreSettings();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await expensesAPI.getAll();
      setExpenses(data.expenses || []);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to load expenses';
      setError(message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title || '',
      description: String(expense.description || ''),
      amount: String(expense.amount ?? ''),
      date: String(expense.date || expense.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const amountNumber = Number(formData.amount);
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert('Cost must be a valid number greater than 0');
      return;
    }

    try {
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        amount: amountNumber,
        date: formData.date || null,
      };

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, payload);
      } else {
        await expensesAPI.create(payload);
      }

      setIsModalOpen(false);
      setEditingExpense(null);
      await loadExpenses();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      alert(err?.message || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      await loadExpenses();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert(err?.message || 'Failed to delete expense');
    }
  };

  const showMissingTableHint =
    !!error &&
    (error.toLowerCase().includes('does not exist') ||
      error.toLowerCase().includes('schema cache') ||
      error.toLowerCase().includes('42p01') ||
      error.toLowerCase().includes('pgrst'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track external spend and operational costs</p>
        </div>
        <Button onClick={openAddModal} icon={Plus}>
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatPrice(totalSpent)}</p>
        </Card>
        <Card className="p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">Entries</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{expenses.length}</p>
        </Card>
      </div>

      {error && (
        <Card className="p-6 border border-red-200 dark:border-red-900/50">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          {showMissingTableHint && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">Create the database table in Supabase SQL Editor:</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto text-gray-800 dark:text-gray-200">
{`create table if not exists public.expenses (
  id bigserial primary key,
  title text not null,
  description text,
  amount numeric not null,
  date date default (now()::date),
  created_at timestamptz default now()
);`}
              </pre>
            </div>
          )}
        </Card>
      )}

      <Card className="p-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Cost</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    No expenses yet
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(expense.date || expense.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">{expense.title}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[420px] truncate">{expense.description || '-'}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white text-right">{formatPrice(expense.amount)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingExpense(null);
              }}
              icon={X}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

