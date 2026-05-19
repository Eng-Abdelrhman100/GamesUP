import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Users, CheckSquare, UserCog, Settings, LogOut, ChevronLeft, Shield, Mail, Image, Clock, CreditCard, Layers, Truck, Key, Database, Eye, Receipt, MessageSquare, SlidersHorizontal, Gamepad2, TableProperties } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Screen } from '../AdminApp';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import logoBlack from '../../assets/games up word black.png';
import logoWhite from '../../assets/games up word white.png';

type PermissionValue = boolean | 'read' | 'write';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  userRole?: string;
  userPermissions?: Record<string, PermissionValue>;
  isDarkMode?: boolean;
}

interface MenuItem {
  id: Screen;
  label: string;
  icon: any;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard' as Screen, label: 'Dashboard', icon: LayoutDashboard },
  { 
    id: 'products' as Screen, 
    label: 'Products', 
    icon: Package, 
    children: [
      { id: 'data-overview' as Screen, label: 'Data Overview', icon: Database },
      { id: 'inventory-sheet' as Screen, label: 'Inventory Sheet', icon: TableProperties }
    ]
  },
  { 
    id: 'orders' as Screen, 
    label: 'Orders', 
    icon: ShoppingCart, 
    children: [
      { id: 'order-chats' as Screen, label: 'Support Chats', icon: MessageSquare }
    ]
  },
  { id: 'sold-products' as Screen, label: 'Sold Products', icon: Key },
  { id: 'pos' as Screen, label: 'Point of Sale', icon: CreditCard },
  { id: 'analytics' as Screen, label: 'Analytics & Revenue', icon: TrendingUp },
  { id: 'expenses' as Screen, label: 'Expenses', icon: Receipt },
  { id: 'customers' as Screen, label: 'Customers', icon: Users },
  { id: 'game-requests' as Screen, label: 'Requested Games', icon: Gamepad2 },
  { id: 'banners' as Screen, label: 'Banners', icon: Image },
  { id: 'hero-slider' as Screen, label: 'Hero Slider', icon: SlidersHorizontal },
  { id: 'outlook' as Screen, label: 'Outlook Accounts', icon: Mail },
  { id: 'hr' as Screen, label: 'HR & Attendance', icon: Clock },
  { id: 'tasks' as Screen, label: 'Tasks', icon: CheckSquare },
  { id: 'team' as Screen, label: 'Team Members', icon: UserCog },
  { id: 'roles' as Screen, label: 'Roles & Access', icon: Shield },
  { id: 'system' as Screen, label: 'System', icon: Layers },
  { id: 'delivery' as Screen, label: 'Delivery Options', icon: Truck },
  { id: 'email-templates' as Screen, label: 'Email Templates', icon: Mail },
  { id: 'settings' as Screen, label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggleCollapse, onLogout, userRole = 'admin', userPermissions, isDarkMode }: SidebarProps) {
  const { settings } = useStoreSettings();
  // Helper to check permission
  const hasPermission = (item: MenuItem) => {
    // If permissions are present, use them
    if (userPermissions && Object.keys(userPermissions).length > 0) {
      const val = userPermissions[item.id];
      // Allow if explicit permission exists
      if (val === true || val === 'read' || val === 'write') return true;
      return false;
    }
    
    if (userRole === 'admin') return true;
    return false;
  };

  // Filter menu items
  const filteredMenuItems = menuItems.reduce<MenuItem[]>((acc, item) => {
    if (hasPermission(item)) {
       const newItem = { ...item };
       if (newItem.children) {
         newItem.children = newItem.children.filter(child => hasPermission(child));
       }
       acc.push(newItem);
    }
    return acc;
  }, []);

  const renderMenuItem = (item: MenuItem, isChild = false) => {
      const Icon = item.icon;
      return (
        <div key={item.id} className="mb-1">
            <NavLink
              to={`/${item.id}`}
              end={!item.children}
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-brand-red text-white uppercase tracking-wider italic font-extrabold shadow-[0_0_15px_rgba(220,38,38,0.35)] scale-[1.02]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-brand-red/10 uppercase tracking-wider font-bold italic'
              } ${isChild ? 'text-xs pl-6' : 'text-sm'}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`${isChild ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`} />
              {!collapsed && <span className="font-display tracking-tight text-xs md:text-sm">{item.label}</span>}
            </NavLink>
            
            {item.children && item.children.length > 0 && !collapsed && (
                <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700 mt-1 space-y-1">
                    {item.children.map(child => renderMenuItem(child, true))}
                </div>
            )}
        </div>
      );
  };

  return (
    <div
      className={`bg-bg-secondary border-r border-border-subtle transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src={settings.website_logo || (isDarkMode ? logoWhite : logoBlack)}
              alt={settings.website_title || settings.store_name || 'Admin'}
              className="h-8 w-auto object-contain transition-all duration-300"
            />
          </div>
        )}
        <div className="flex items-center gap-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors duration-200"
            title="View Website"
          >
            <Eye className="w-5 h-5" />
          </a>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-1">
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-border-subtle">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white bg-brand-red hover:bg-brand-red-hover shadow-lg hover:shadow-brand-red/35 active:scale-95 transition-all duration-300 uppercase tracking-wider font-extrabold italic"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-display tracking-widest">Logout</span>}
        </button>
      </div>
    </div>
  );
}
