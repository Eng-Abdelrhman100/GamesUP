import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Login } from './components/Login';
import { Button } from '../components/ui/button';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import ProductEditor from './pages/ProductEditor';
import { ProductDataOverview } from './pages/ProductDataOverview';
import { InventorySheet } from './pages/InventorySheet';
import { OrderDataOverview } from './pages/OrderDataOverview';
import { Orders } from './pages/Orders';
import { Analytics } from './pages/Analytics';
import { Customers } from './pages/Customers';
import { Tasks } from './pages/Tasks';
import { TeamMembers } from './pages/TeamMembers';
import { Settings } from './pages/Settings';
import { Roles } from './pages/Roles';
import { Outlook } from './pages/Outlook';
import { Banners, HeroSliderBanners } from './pages/Banners';
import { HR } from './pages/HR';
import { POSNew } from './pages/POSNew';
import { System } from './pages/System';
import { Delivery } from './pages/Delivery';
import { SoldProducts } from './pages/SoldProducts';
import { EmailTemplates } from './pages/EmailTemplates';
import { Expenses } from './pages/Expenses';
import { SupportChats } from './pages/SupportChats';
import { GameRequests } from './pages/GameRequests';
import { BalanceInventory } from './pages/BalanceInventory';
import { authAPI, rolesAPI } from '../utils/api';
// import { setAccessToken } from './utils/api';

export type Screen = 'dashboard' | 'products' | 'data-overview' | 'inventory-sheet' | 'playstation-plus' | 'orders' | 'sold-products' | 'order-chats' | 'analytics' | 'customers' | 'tasks' | 'team' | 'settings' | 'roles' | 'outlook' | 'banners' | 'hero-slider' | 'hr' | 'pos' | 'system' | 'delivery' | 'email-templates' | 'expenses' | 'game-requests' | 'balance-inventory';

export default function AdminApp() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 1. Try saved user metadata first
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.user_metadata?.theme) {
          return parsed.user_metadata.theme === 'dark';
        }
      } catch (e) {}
    }
    // 2. Fallback to localStorage theme
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [dynamicRoles, setDynamicRoles] = useState<any[]>([]);
  const refreshedUserRef = useRef(false);

  const normalizeRole = (role: any) => {
    const r = String(role || '').trim().toLowerCase();
    if (!r) return 'staff';
    if (r === 'mgr' || r === 'managerial' || r.startsWith('manager')) return 'manager';
    if (r === 'employee') return 'staff';
    if (r === 'superadmin' || r === 'super_admin' || r === 'administrator') return 'admin';
    return r;
  };

  useEffect(() => {
    if (isAuthenticated) {
      const role = normalizeRole(user?.user_metadata?.role);
      if (role === 'admin' || role === 'manager') {
        rolesAPI
          .getAll()
          .then((data: any) => {
            if (data && data.roles) setDynamicRoles(data.roles);
          })
          .catch(() => {});
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Sync theme with backend if logged in and it's different from what's in metadata
    const currentMetadataTheme = user?.user_metadata?.theme;
    const newTheme = isDarkMode ? 'dark' : 'light';

    if (isAuthenticated && user && currentMetadataTheme !== newTheme) {
      authAPI.updateProfile({ theme: newTheme })
        .then(({ user: updatedUser }: any) => {
          if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => {});
    }

    console.log('Theme changed to:', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to document element');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from document element');
    }
  }, [isDarkMode, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token || refreshedUserRef.current) return;
    refreshedUserRef.current = true;
    authAPI
      .getCurrentUser()
      .then((freshUser) => {
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, session]);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('session');
    const savedUser = localStorage.getItem('user');
    
    if (savedSession && savedUser) {
      try {
        const parsedSession = JSON.parse(savedSession);
        const parsedUser = JSON.parse(savedUser);
        
        // Validate that the session has an access token
        if (parsedSession && parsedSession.access_token) {
          setSession(parsedSession);
          setUser(parsedUser);
          
          // Restore theme from metadata if available
          if (parsedUser?.user_metadata?.theme) {
            setIsDarkMode(parsedUser.user_metadata.theme === 'dark');
          }

          // setAccessToken(parsedSession.access_token);
          setIsAuthenticated(true);
          console.log('Session restored from localStorage');
        } else {
          // Invalid session, clear storage
          console.log('Invalid session found, clearing...');
          localStorage.removeItem('session');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && (window.location.pathname === '/login' || window.location.pathname === '/employee-login')) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = (user: any, session: any) => {
    setUser(user);
    setSession(session);
    
    // Set theme from metadata if available
    if (user?.user_metadata?.theme) {
      setIsDarkMode(user.user_metadata.theme === 'dark');
    }

    // Set the access token immediately
    // setAccessToken(session.access_token);
    setIsAuthenticated(true);
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('session', JSON.stringify(session));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    // setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    navigate('/login');
  };

  const currentRoleName = normalizeRole(user?.user_metadata?.role);
  const customRole = dynamicRoles.find(r => normalizeRole(r.name) === currentRoleName);
  const effectivePermissions = customRole?.permissions || user?.user_metadata?.permissions || null;

  const hasRoleAccess = (screenId: string) => {
    const role = currentRoleName;
    if (role === 'admin') return true;
    if (!effectivePermissions || Object.keys(effectivePermissions).length === 0) {
      return role === 'manager';
    }
    // Map playstation-plus to products permission
    const permKey = screenId === 'playstation-plus' ? 'products' : screenId;
    const val = effectivePermissions[permKey];
    return val === true || val === 'read' || val === 'write';
  };

  const ProtectedRoute = ({ id, children }: { id: string, children: React.ReactNode }) => {
    if (!hasRoleAccess(id)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 text-[#ff1574] mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">You don't have the necessary permissions to view this page. Please contact your administrator if you believe this is a mistake.</p>
        </div>
      );
    }
    return <>{children}</>;
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} mode="admin" />} />
        <Route path="/employee-login" element={<Login onLogin={handleLogin} mode="employee" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} admin-panel`}>
      <div className="flex h-screen bg-bg-primary text-text-primary transition-colors duration-300">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          userRole={currentRoleName}
          userPermissions={effectivePermissions}
          isDarkMode={isDarkMode}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            user={user}
            onLogout={handleLogout}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="products" element={<ProtectedRoute id="products"><Products /></ProtectedRoute>} />
              <Route path="products/add" element={<ProtectedRoute id="products"><ProductEditor /></ProtectedRoute>} />
              <Route path="products/edit/:id" element={<ProtectedRoute id="products"><ProductEditor /></ProtectedRoute>} />
              <Route path="dashboard" element={<ProtectedRoute id="dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="data-overview" element={<ProtectedRoute id="data-overview"><OrderDataOverview /></ProtectedRoute>} />
              <Route path="inventory-sheet" element={<ProtectedRoute id="inventory-sheet"><InventorySheet /></ProtectedRoute>} />
              <Route path="playstation-plus" element={<ProtectedRoute id="playstation-plus"><Products filterCategory="playstation-plus" /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute id="orders"><Orders /></ProtectedRoute>} />
              <Route path="order-chats" element={<ProtectedRoute id="order-chats"><SupportChats /></ProtectedRoute>} />
              <Route path="sold-products" element={<ProtectedRoute id="sold-products"><SoldProducts /></ProtectedRoute>} />
              <Route path="pos" element={<ProtectedRoute id="pos"><POSNew /></ProtectedRoute>} />
              <Route path="analytics" element={<ProtectedRoute id="analytics"><Analytics /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute id="customers"><Customers /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute id="expenses"><Expenses /></ProtectedRoute>} />
              <Route path="game-requests" element={<ProtectedRoute id="game-requests"><GameRequests /></ProtectedRoute>} />
              <Route path="banners" element={<ProtectedRoute id="banners"><Banners /></ProtectedRoute>} />
              <Route path="hero-slider" element={<ProtectedRoute id="hero-slider"><HeroSliderBanners /></ProtectedRoute>} />
              <Route path="outlook" element={<ProtectedRoute id="outlook"><Outlook /></ProtectedRoute>} />
              <Route path="hr" element={<ProtectedRoute id="hr"><HR /></ProtectedRoute>} />
              <Route path="tasks" element={<ProtectedRoute id="tasks"><Tasks /></ProtectedRoute>} />
              <Route path="team" element={<ProtectedRoute id="team"><TeamMembers /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute id="roles"><Roles /></ProtectedRoute>} />
              <Route path="system" element={<ProtectedRoute id="system"><System /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute id="settings"><Settings /></ProtectedRoute>} />
              <Route path="delivery" element={<ProtectedRoute id="delivery"><Delivery /></ProtectedRoute>} />
              <Route path="email-templates" element={<ProtectedRoute id="email-templates"><EmailTemplates /></ProtectedRoute>} />
              <Route path="balance-inventory" element={<ProtectedRoute id="balance-inventory"><BalanceInventory /></ProtectedRoute>} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-full">
                  <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
                  <p className="text-gray-500 mb-4">The URL you are trying to reach ({window.location.pathname}) doesn't match any route.</p>
                  <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
