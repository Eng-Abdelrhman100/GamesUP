import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: LucideIcon;
  chartData: any[];
  chartColor: string;
  chartType?: 'line' | 'bar';
}

export function KPICard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  chartData,
  chartColor,
  chartType = 'line',
}: KPICardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {change}%
            </span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={60}>
        {chartType === 'line' ? (
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="sales"
              stroke={chartColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}