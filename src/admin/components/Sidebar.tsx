import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Users, CheckSquare, UserCog, Settings, LogOut, ChevronLeft, Shield, Mail, Image, Clock, CreditCard, Layers, Truck, Key, Database, Eye, Receipt, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Screen } from '../AdminApp';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import logoBlack from '../../assets/games up word black.png';

type PermissionValue = boolean | 'read' | 'write';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  userRole?: string;
  userPermissions?: Record<string, PermissionValue>;
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
      { id: 'data-overview' as Screen, label: 'Data Overview', icon: Database }
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

export function Sidebar({ collapsed, onToggleCollapse, onLogout, userRole = 'admin', userPermissions }: SidebarProps) {
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
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-br hover:from-red-500 hover:to-red-700 hover:text-white'
              } ${isChild ? 'text-sm' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`${isChild ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
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
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src={settings.website_logo || logoBlack}
              alt={settings.website_title || settings.store_name || 'Admin'}
              className="h-8 w-auto object-contain"
            />
          </div>
        )}
        <div className="flex items-center gap-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="View Website"
          >
            <Eye className="w-5 h-5" />
          </a>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-white bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-200"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
