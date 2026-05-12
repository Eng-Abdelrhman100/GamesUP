import { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { adminAPI } from '../../utils/api';

export function Analytics() {
  const { formatPrice } = useStoreSettings();
  const [dateRange, setDateRange] = useState('12months');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    revenueData: [],
    categoryData: [],
    topRegions: [],
    totals: { revenue: 0, profit: 0, avgOrderValue: 0 },
    deltas: { revenuePct: 0, profitPct: 0, avgOrderValuePct: 0 }
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAnalytics(dateRange);
      // Ensure we have a fallback structure if API returns something unexpected
      if (response && response.totals) {
        setData({
          revenueData: response.revenueData || [],
          categoryData: response.categoryData || [],
          topRegions: response.topRegions || [],
          totals: {
            revenue: response.totals.revenue || 0,
            profit: response.totals.profit || 0,
            avgOrderValue: response.totals.avgOrderValue || 0
          },
          deltas: {
            revenuePct: response.deltas?.revenuePct ?? 0,
            profitPct: response.deltas?.profitPct ?? 0,
            avgOrderValuePct: response.deltas?.avgOrderValuePct ?? 0,
          },
        });
      } else {
         // Handle case where totals might be missing
         setData({
          revenueData: [],
          categoryData: [],
          topRegions: [],
          totals: { revenue: 0, profit: 0, avgOrderValue: 0 },
          deltas: { revenuePct: 0, profitPct: 0, avgOrderValuePct: 0 }
         });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set fallback data to prevent crash
      setData({
        revenueData: [],
        categoryData: [],
        topRegions: [],
        totals: { revenue: 0, profit: 0, avgOrderValue: 0 },
        deltas: { revenuePct: 0, profitPct: 0, avgOrderValuePct: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (value: number) => {
    const n = Number(value) || 0;
    const rounded = Math.round(n * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`;
  };

  const isPositive = (value: number) => (Number(value) || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Revenue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Detailed insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          <Button icon={Download}>Export Report</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatPrice(data.totals.revenue)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className={`w-4 h-4 ${isPositive(data.deltas.revenuePct) ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${isPositive(data.deltas.revenuePct) ? 'text-green-500' : 'text-red-500'}`}>{formatPct(data.deltas.revenuePct)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">vs previous period</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-700 shadow-lg shadow-green-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatPrice(data.totals.profit)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className={`w-4 h-4 ${isPositive(data.deltas.profitPct) ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${isPositive(data.deltas.profitPct) ? 'text-green-500' : 'text-red-500'}`}>{formatPct(data.deltas.profitPct)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">vs previous period</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Order Value</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatPrice(data.totals.avgOrderValue)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className={`w-4 h-4 ${isPositive(data.deltas.avgOrderValuePct) ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${isPositive(data.deltas.avgOrderValuePct) ? 'text-green-500' : 'text-red-500'}`}>{formatPct(data.deltas.avgOrderValuePct)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">vs previous period</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Revenue Overview</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monthly revenue and profit trends</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.revenueData}>
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
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Breakdown & Top Regions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card className="p-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Revenue by Category</h3>
              <div className="flex items-center justify-center mb-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data.categoryData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Regions */}
            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Top Regions by Revenue</h3>
              <div className="space-y-4">
                {data.topRegions.map((region: any, index: number) => (
                  <div
                    key={`${region.region}-${index}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{region.region}</h4>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(region.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, Number(region.percent) || 0))}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{formatPct(region.percent)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Orders Chart */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Orders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total orders processed each month</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.revenueData}>
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
                <Bar dataKey="orders" fill="#DC2626" radius={[8, 8, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
