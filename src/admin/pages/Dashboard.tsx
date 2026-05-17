import { useEffect, useMemo, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Percent } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '../../components/ui/KPICard';
import { Card } from '../../components/ui/card';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { adminAPI } from '../../utils/api';

export function Dashboard() {
  const { formatPrice } = useStoreSettings();
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [category, setCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const apiTimeRange = useMemo(() => {
    if (timeRange === 'daily') return '1day';
    if (timeRange === 'weekly') return '7days';
    return '30days';
  }, [timeRange]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adminAPI
      .getDashboard({ timeRange: apiTimeRange, category: category || undefined })
      .then((d: any) => {
        if (mounted) setData(d);
      })
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiTimeRange, category]);

  const numberFmt = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const kpis = data?.kpis || { revenue: 0, orders: 0, activeCustomers: 0, conversionRate: 0 };
  const deltas = data?.deltas || {
    revenuePct: 0,
    ordersPct: 0,
    activeCustomersPct: 0,
    conversionRatePct: 0,
  };
  const charts = data?.charts || {
    productSales: [],
    revenueSpark: [],
    ordersSpark: [],
    customersSpark: [],
    conversionSpark: [],
  };
  const trafficData = data?.trafficData || [];
  const topProducts = data?.topProducts || [];
  const recentOrders = data?.recentOrders || [];
  const categories = data?.categories || [];

  const totalSales = (charts.productSales || []).reduce((sum: number, p: any) => sum + (Number(p.sales) || 0), 0);
  const totalEarning = (charts.productSales || []).reduce((sum: number, p: any) => sum + (Number(p.earning) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-page-subtitle">Overview</p>
          <h1 className="admin-page-title">Dashboard<span className="text-brand-red">.</span></h1>
        </div>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest italic mt-2 md:mt-0">
          Here is the summary of overall data
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={formatPrice(kpis.revenue || 0)}
          change={Math.round((deltas.revenuePct || 0) * 10) / 10}
          trend={(deltas.revenuePct || 0) >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          chartData={charts.revenueSpark || []}
          chartColor="#3B82F6"
        />
        <KPICard
          title="Orders"
          value={numberFmt.format(Number(kpis.orders) || 0)}
          change={Math.round((deltas.ordersPct || 0) * 10) / 10}
          trend={(deltas.ordersPct || 0) >= 0 ? 'up' : 'down'}
          icon={ShoppingCart}
          chartData={charts.ordersSpark || []}
          chartColor="#10B981"
          chartType="bar"
        />
        <KPICard
          title="Active Customers"
          value={numberFmt.format(Number(kpis.activeCustomers) || 0)}
          change={Math.round((deltas.activeCustomersPct || 0) * 10) / 10}
          trend={(deltas.activeCustomersPct || 0) >= 0 ? 'up' : 'down'}
          icon={Users}
          chartData={charts.customersSpark || []}
          chartColor="#8B5CF6"
        />
        <KPICard
          title="Conversion Rate"
          value={`${Math.round((Number(kpis.conversionRate) || 0) * 10) / 10}%`}
          change={Math.round((deltas.conversionRatePct || 0) * 10) / 10}
          trend={(deltas.conversionRatePct || 0) >= 0 ? 'up' : 'down'}
          icon={Percent}
          chartData={charts.conversionSpark || []}
          chartColor="#EC4899"
        />
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Product Sales</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Sales: {numberFmt.format(totalSales)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Earning: {formatPrice(totalEarning)}</span>
                </div>
              </div>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Category</option>
              {categories.map((c: any) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts.productSales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="sales" stroke="#DC2626" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="earning" stroke="#FBBF24" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Traffic Source */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Sales by Traffic Source</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={trafficData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {trafficData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {trafficData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <img src={product.image || '/placeholder-image.png'} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{numberFmt.format(Number(product.sales) || 0)} sales</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{order.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        String(order.status || '').toLowerCase() === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : String(order.status || '').toLowerCase() === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.customer}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(order.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
