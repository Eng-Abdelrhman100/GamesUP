import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Package, Wallet, Coins } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { accountFinanceAPI, productsAPI } from '../../utils/api';

interface DashboardData {
  summary: {
    totalAccounts: number;
    totalPurchased: number;
    totalCreated: number;
    totalLegacy: number;
    totalUnknown: number;
    totalAcquisitionCost: number;
    totalSalesCount: number;
    totalSalesRevenue: number;
    totalProfit: number;
    profitMargin: number | null;
  };
  accounts: any[];
}

const fmtMoney = (v: number | null | undefined) => {
  if (v == null || isNaN(Number(v))) return '—';
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function AccountProfitability() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ productId: string; type: string; from: string; to: string }>({
    productId: '',
    type: '',
    from: '',
    to: '',
  });

  const loadProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      setProducts(res?.products || []);
    } catch (err) {
      console.error('Failed to load products for filter', err);
      setProducts([]);
    }
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountFinanceAPI.getDashboard({
        productId: filters.productId || undefined,
        type: filters.type || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load account profitability dashboard', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.productId, filters.type, filters.from, filters.to]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = data?.summary;

  const kpiCards = [
    {
      label: 'Total Accounts Purchased',
      value: summary?.totalPurchased != null ? String(summary.totalPurchased) : '—',
      sub: summary?.totalAccounts != null ? `of ${summary.totalAccounts} total` : '',
      icon: Package,
      color: 'text-blue-500',
    },
    {
      label: 'Total Accounts Created (Balance)',
      value: summary?.totalCreated != null ? String(summary.totalCreated) : '—',
      sub: `Legacy ${summary?.totalLegacy ?? 0} · Unknown ${summary?.totalUnknown ?? 0}`,
      icon: Wallet,
      color: 'text-purple-500',
    },
    {
      label: 'Total Acquisition Cost',
      value: fmtMoney(summary?.totalAcquisitionCost),
      sub: '',
      icon: DollarSign,
      color: 'text-orange-500',
    },
    {
      label: 'Total Sales Revenue',
      value: fmtMoney(summary?.totalSalesRevenue),
      sub: `${summary?.totalSalesCount ?? 0} sales`,
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      label: 'Total Profit',
      value: fmtMoney(summary?.totalProfit),
      sub: summary?.profitMargin != null ? `${summary.profitMargin.toFixed(1)}% margin` : '',
      icon: Coins,
      color: 'text-brand-red',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Profitability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acquisition cost, sales revenue & profit by account — admin only.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select
            value={filters.productId}
            onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value }))}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="">All Products / Games</option>
            {products.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="">All Acquisition Types</option>
            <option value="purchased">Purchased Account</option>
            <option value="created_from_balance">Created From Balance</option>
            <option value="legacy">Legacy</option>
            <option value="unknown">Unknown</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
          />
          <Button
            variant="outline"
            onClick={() => setFilters({ productId: '', type: '', from: '', to: '' })}
            className="text-xs"
          >
            Reset
          </Button>
          <Button
            onClick={() => loadDashboard()}
            className="bg-brand-red text-white text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading profitability data...
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{kpi.value}</p>
                    {kpi.sub && <p className="text-[11px] text-gray-400 mt-1">{kpi.sub}</p>}
                  </div>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </Card>
            ))}
          </div>

          {/* Per-account table */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800/80 font-bold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800">Product / Game</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800">Account</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800">Acquisition Type</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right">Cost</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center">Sales</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right">Revenue</th>
                    <th className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right">Profit</th>
                    <th className="px-4 py-2.5 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {(!data?.accounts || data.accounts.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                        No financial data yet. Add acquisition costs via the Inventory Sheet bulk parser or stock modal.
                      </td>
                    </tr>
                  ) : (
                    data.accounts.map((a) => {
                      const profit = a.total_profit;
                      const positive = profit != null && profit >= 0;
                      return (
                        <tr key={`${a.product_id}-${a.digital_item_id}`} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">{a.product_name || '—'}</td>
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 font-mono text-gray-600 dark:text-gray-300">{a.digital_item_id?.slice(0, 8) || '—'}</td>
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                              {String(a.acquisition_type || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right text-gray-700 dark:text-gray-200">
                            {a.acquisition_cost != null ? fmtMoney(a.acquisition_cost) : '—'}
                          </td>
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-center text-gray-700 dark:text-gray-200">{a.sales_count}</td>
                          <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(a.total_revenue)}</td>
                          <td className={`px-4 py-2.5 border-r border-gray-200 dark:border-gray-800 text-right font-bold ${profit == null ? 'text-gray-400' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profit != null ? fmtMoney(profit) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">
                            {a.profit_margin != null ? `${a.profit_margin.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default AccountProfitability;
