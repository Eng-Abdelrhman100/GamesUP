import React from 'react';
import { 
  Gamepad2, 
  Package, 
  Tag, 
  Receipt, 
  Wallet, 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useShift } from '../../context/ShiftContext';
import { useSettings } from '../../context/SettingsContext';

export type NavTab = 'pos' | 'products' | 'sku' | 'invoices' | 'shifts' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  totalProductsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onSyncNow,
  isCollapsed,
  onToggleCollapse,
  totalProductsCount
}) => {
  const { activeShift } = useShift();
  const { settings } = useSettings();

  const navItems: { id: NavTab; label: string; subLabel: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'pos',
      label: 'POS Terminal',
      subLabel: 'نقطة البيع والكاشير',
      icon: <Gamepad2 className="w-5 h-5 shrink-0" />
    },
    {
      id: 'products',
      label: 'Products',
      subLabel: 'إدارة وتعديل المنتجات',
      icon: <Package className="w-5 h-5 shrink-0" />,
      badge: totalProductsCount > 0 ? totalProductsCount : undefined
    },
    {
      id: 'sku',
      label: 'SKU & Barcodes',
      subLabel: 'طباعة الباركود والملصقات',
      icon: <Tag className="w-5 h-5 shrink-0" />
    },
    {
      id: 'invoices',
      label: 'Invoices History',
      subLabel: 'الفواتير وإعادة الطباعة',
      icon: <Receipt className="w-5 h-5 shrink-0" />
    },
    {
      id: 'shifts',
      label: 'Cash Drawer',
      subLabel: 'الورديات والخزينة',
      icon: <Wallet className="w-5 h-5 shrink-0" />,
      badge: activeShift ? 'OPEN' : 'CLOSED'
    },
    {
      id: 'settings',
      label: 'Settings',
      subLabel: 'الطابعات والشكل والضرائب',
      icon: <Settings className="w-5 h-5 shrink-0" />
    }
  ];

  return (
    <aside
      className={`h-screen bg-[#111116] border-r border-white/5 flex flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/5">
          <div 
            onClick={() => onTabChange('pos')}
            className={`flex items-center gap-3 cursor-pointer overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="text-base font-black tracking-tighter uppercase italic leading-none flex items-center gap-1">
                  <span className="text-white">GAMES</span>
                  <span className="text-red-500">UP</span>
                  <span className="text-[9px] font-mono font-bold bg-red-950/80 text-red-400 px-1 py-0.5 rounded ml-1 border border-red-800/40">
                    POS
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-bold truncate max-w-[130px] mt-0.5">
                  {settings.branchName}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative group ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}>
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 text-left flex flex-col">
                    <span className="font-extrabold uppercase tracking-wide leading-tight">{item.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? 'text-red-100' : 'text-gray-500'}`}>
                      {item.subLabel}
                    </span>
                  </div>
                )}

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.badge === 'CLOSED'
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Section */}
      <div className="p-3 border-t border-white/5 space-y-2.5">
        {/* Cloud Sync & Offline Status */}
        <div
          className={`rounded-2xl border p-2.5 transition-all ${
            isOnline
              ? pendingSyncCount > 0
                ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="relative flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 relative"></span>
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
              )}
              {!isCollapsed && (
                <span className="text-[11px] font-extrabold uppercase tracking-wider">
                  {isOnline ? (pendingSyncCount > 0 ? `${pendingSyncCount} Pending Sync` : 'Cloud Synced') : 'Offline Mode'}
                </span>
              )}
            </div>

            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              title={isOnline ? 'Sync with website now' : 'Retry online connection'}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
            </button>
          </div>

          {!isCollapsed && (
            <div className="text-[10px] text-gray-400 mt-1 pl-4 flex items-center justify-between">
              <span>{isOnline ? 'Direct to games-up.co' : 'Working from local DB'}</span>
            </div>
          )}
        </div>

        {/* Active Cashier Shift */}
        {!isCollapsed && (
          <div className="bg-black/40 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-300 font-bold text-xs">
                {activeShift ? activeShift.cashierName.charAt(0) : '?'}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                  {activeShift ? activeShift.cashierName : 'No Active Shift'}
                </span>
                <span className="text-[9px] text-gray-400">
                  {activeShift ? `Shift #${activeShift.id.slice(-4)}` : 'Terminal Locked'}
                </span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          </div>
        )}
      </div>
    </aside>
  );
};
