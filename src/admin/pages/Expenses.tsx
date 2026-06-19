import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, TrendingUp, Calendar, ArrowUpRight, Activity, Percent, ArrowDownRight } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { expensesAPI, ordersAPI } from '../../utils/api';
import { Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line } from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'expenses' | 'reports'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [reportDuration, setReportDuration] = useState<'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'>('7days');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionsTab, setTransactionsTab] = useState<'sales' | 'expenses'>('sales');

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

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await ordersAPI.getAll();
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders for expenses dashboard:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    loadOrders();
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reportDuration === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (reportDuration === 'yesterday') {
      const yest = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (reportDuration === '7days') {
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (reportDuration === '30days') {
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (reportDuration === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  }, [reportDuration]);

  const reportsData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      const orderDate = new Date(o.created_at);
      const isCompleted = o.status === 'completed';
      return isCompleted && orderDate >= start && orderDate <= end;
    });

    const filteredExpenses = expenses.filter((e) => {
      const expDate = new Date(e.date || e.created_at || '');
      return expDate >= start && expDate <= end;
    });

    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalExp = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalSales - totalExp;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    const dailyDataMap = new Map<string, { date: string; sales: number; expenses: number; profit: number }>();
    
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      dailyDataMap.set(key, { date: key, sales: 0, expenses: 0, profit: 0 });
      current.setDate(current.getDate() + 1);
    }

    for (const o of filteredOrders) {
      const key = new Date(o.created_at).toISOString().split('T')[0];
      const entry = dailyDataMap.get(key) || { date: key, sales: 0, expenses: 0, profit: 0 };
      entry.sales += Number(o.amount) || 0;
      entry.profit = entry.sales - entry.expenses;
      dailyDataMap.set(key, entry);
    }

    for (const e of filteredExpenses) {
      const key = new Date(e.date || e.created_at || '').toISOString().split('T')[0];
      const entry = dailyDataMap.get(key) || { date: key, sales: 0, expenses: 0, profit: 0 };
      entry.expenses += Number(e.amount) || 0;
      entry.profit = entry.sales - entry.expenses;
      dailyDataMap.set(key, entry);
    }

    const dailyBreakdown = Array.from(dailyDataMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    return {
      filteredOrders,
      filteredExpenses,
      totalSales,
      totalExp,
      netProfit,
      profitMargin,
      dailyBreakdown,
    };
  }, [orders, expenses, startDate, endDate]);

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
    (error.toLowerCase().includes("doesn't exist") ||
      error.toLowerCase().includes("does not exist") ||
      error.toLowerCase().includes('schema cache') ||
      error.toLowerCase().includes('42p01') ||
      error.toLowerCase().includes('pgrst'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Hub</h1>
          <p className="text-sm text-gray-555 dark:text-gray-400">Track company spend, completed sales revenue, and business profitability</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'reports' && (
            <button
              onClick={async () => {
                await loadExpenses();
                await loadOrders();
              }}
              disabled={loading || loadingOrders}
              className="px-4 py-2 border border-gray-300 dark:border-gray-650 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1.5 font-semibold disabled:opacity-50"
            >
              Sync Live Reports
            </button>
          )}
          <Button onClick={openAddModal} icon={Plus}>
            Add Expense
          </Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'expenses'
              ? 'border-red-500 text-red-650 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Expenses Register
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-red-500 text-red-650 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Financial Reports & Profit
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{formatPrice(totalSpent)}</p>
            </Card>
            <Card className="p-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Entries</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{expenses.length}</p>
            </Card>
          </div>

          {error && (
            <Card className="p-6 border border-red-200 dark:border-red-900/50">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              {showMissingTableHint && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">Create the database table in MySQL:</p>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto text-gray-800 dark:text-gray-200">
{`CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(191) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_expenses_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`}
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
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="font-bold text-gray-900 dark:text-white">Filter Report Duration</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['today', 'yesterday', '7days', '30days', 'month', 'custom'] as const).map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setReportDuration(duration)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize border transition-all ${
                      reportDuration === duration
                        ? 'bg-red-650 text-white border-red-650 shadow'
                        : 'bg-white dark:bg-gray-800 border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400'
                    }`}
                  >
                    {duration === '7days' ? 'Last 7 Days' : duration === '30days' ? 'Last 30 Days' : duration === 'month' ? 'This Month' : duration}
                  </button>
                ))}
              </div>
            </div>

            {reportDuration === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-250 dark:border-gray-800">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-405 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-650 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-405 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-655 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Gross Sales (Revenue)</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{formatPrice(reportsData.totalSales)}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3">From {reportsData.filteredOrders.length} completed transactions</div>
            </Card>

            <Card className="p-6 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-650 mt-2">{formatPrice(reportsData.totalExp)}</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3">From {reportsData.filteredExpenses.length} expense log entries</div>
            </Card>

            <Card className="p-6 relative overflow-hidden border-2 border-transparent dark:hover:border-red-900/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Net Profit</p>
                  <p className={`text-2xl font-bold mt-2 ${reportsData.netProfit >= 0 ? 'text-[#ff1574]' : 'text-red-600'}`}>
                    {reportsData.netProfit >= 0 ? '+' : ''}{formatPrice(reportsData.netProfit)}
                  </p>
                </div>
                <div className="p-3 bg-pink-50 dark:bg-[#ff1574]/10 text-[#ff1574] rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3">Calculation: Sales - Expenses</div>
            </Card>

            <Card className="p-6 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {reportsData.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3">Overall financial health indicator</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500 animate-pulse" />
              Financial Trend Chart (Sales vs. Expenses vs. Profits)
            </h3>
            <div className="h-[300px] w-full">
              {reportsData.dailyBreakdown.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  No transaction data available for the selected dates.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[...reportsData.dailyBreakdown].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F9FAFB',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [formatPrice(Number(val)), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="sales" name="Sales Revenue" fill="#10B981" barSize={16} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" barSize={16} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#ff1574" strokeWidth={3} dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 flex flex-col h-[400px]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Daily Statement</h3>
              <div className="overflow-y-auto flex-1 pr-1">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5 text-right">Sales</th>
                      <th className="py-2.5 text-right">Expenses</th>
                      <th className="py-2.5 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reportsData.dailyBreakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="py-3 font-medium text-gray-850 dark:text-gray-300">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                          {row.sales > 0 ? formatPrice(row.sales) : '-'}
                        </td>
                        <td className="py-3 text-right text-red-500 font-semibold">
                          {row.expenses > 0 ? formatPrice(row.expenses) : '-'}
                        </td>
                        <td className={`py-3 text-right font-bold ${row.profit >= 0 ? 'text-[#ff1574]' : 'text-red-600'}`}>
                          {formatPrice(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6 flex flex-col h-[400px]">
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTransactionsTab('sales')}
                  className={`pb-2.5 px-4 border-b-2 transition-all ${
                    transactionsTab === 'sales'
                      ? 'border-red-500 text-red-650 dark:text-red-400'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Completed Sales ({reportsData.filteredOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionsTab('expenses')}
                  className={`pb-2.5 px-4 border-b-2 transition-all ${
                    transactionsTab === 'expenses'
                      ? 'border-red-500 text-red-655 dark:text-red-400'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Expense Entries ({reportsData.filteredExpenses.length})
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1">
                {transactionsTab === 'sales' ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                        <th className="py-2.5">Order ID</th>
                        <th className="py-2.5">Customer</th>
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reportsData.filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-400">No completed orders in this duration</td>
                        </tr>
                      ) : (
                        reportsData.filteredOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                            <td className="py-3 font-semibold text-gray-800 dark:text-gray-300 truncate max-w-[100px]">{o.order_number}</td>
                            <td className="py-3 text-gray-650 dark:text-gray-400 max-w-[120px] truncate">{o.customer_name}</td>
                            <td className="py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="py-3 text-right text-green-600 dark:text-green-400 font-bold">{formatPrice(o.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                        <th className="py-2.5">Title</th>
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reportsData.filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-400">No expenses in this duration</td>
                        </tr>
                      ) : (
                        reportsData.filteredExpenses.map((e) => (
                          <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                            <td className="py-3 font-semibold text-gray-800 dark:text-gray-300 truncate max-w-[110px]">{e.title}</td>
                            <td className="py-3 text-gray-500 max-w-[100px] truncate">{e.description || '-'}</td>
                            <td className="py-3 text-gray-500">{new Date(e.date || e.created_at || '').toLocaleDateString()}</td>
                            <td className="py-3 text-right text-red-500 font-bold">{formatPrice(e.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

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

