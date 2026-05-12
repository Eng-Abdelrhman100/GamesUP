import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, UserPlus, Shield, Eye } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { rolesAPI } from '../../utils/api';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: {
    [key: string]: boolean | 'none' | 'read' | 'write';
  };
  created_at?: string;
}

const permissionKeys = [
  'dashboard', 'products', 'orders', 'pos', 'analytics', 
  'customers', 'banners', 'outlook', 'hr', 'tasks', 
  'team', 'roles', 'system', 'delivery', 'settings'
];

const permissionLabels: { [key: string]: string } = {
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  pos: 'Point of Sale',
  analytics: 'Analytics',
  customers: 'Customers',
  banners: 'Banners',
  outlook: 'Outlook Accounts',
  hr: 'HR & Attendance',
  tasks: 'Tasks',
  team: 'Team Members',
  roles: 'Roles & Access',
  system: 'System',
  delivery: 'Delivery Options',
  settings: 'Settings',
};

export function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    id: undefined as number | undefined,
    name: '',
    description: '',
    permissions: permissionKeys.reduce((acc, key) => ({ ...acc, [key]: 'none' }), {} as any),
  });

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const result = (await rolesAPI.getAll()) as any;
      setRoles(result.roles && Array.isArray(result.roles) ? result.roles : []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (isEditMode && roleFormData.id) {
        await rolesAPI.update(roleFormData.id, {
          name: roleFormData.name,
          description: roleFormData.description,
          permissions: roleFormData.permissions
        });
      } else {
        await rolesAPI.create({
          name: roleFormData.name,
          description: roleFormData.description,
          permissions: roleFormData.permissions
        });
      }
      await loadRoles();
      setIsRoleModalOpen(false);
      setRoleFormData({
        id: undefined,
        name: '',
        description: '',
        permissions: permissionKeys.reduce((acc, key) => ({ ...acc, [key]: 'none' }), {} as any),
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save role');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await rolesAPI.delete(id);
      await loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setRoleFormData({
      id: undefined,
      name: '',
      description: '',
      permissions: permissionKeys.reduce((acc, key) => ({ ...acc, [key]: 'none' }), {} as any),
    });
    setIsRoleModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setIsEditMode(true);
    // Ensure all base permission keys exist with at least 'none'
    const rolePermissions = role.permissions || {};
    const filledPermissions = permissionKeys.reduce((acc, key) => {
      acc[key] = rolePermissions[key] !== undefined ? rolePermissions[key] : 'none';
      return acc;
    }, {} as any);

    setRoleFormData({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: filledPermissions
    });
    setIsRoleModalOpen(true);
  };

  const handleCreateUser = async () => {
    try {
      await rolesAPI.createAdminUser(userFormData);
      alert('User created successfully');
      setIsUserModalOpen(false);
      setUserFormData({
        name: '',
        email: '',
        password: '',
        role: '',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user. Email might be taken.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Access</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage user roles and permissions</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsUserModalOpen(true)} variant="outline" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Create User Account
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Shield className="w-4 h-4" />
            Create New Role
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {roles.map((role) => (
            <Card key={role.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {role.name}
                    {role.name === 'admin' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">System</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
                </div>
                {role.name !== 'admin' && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(role)} className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/40">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)} className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/40">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissions</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {permissionKeys.map((key) => {
                    const permVal = role.permissions ? role.permissions[key] : false;
                    
                    let bgClass = 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500';
                    let Icon = X;
                    let badgeText = '';

                    if (permVal === 'write' || permVal === true) {
                      bgClass = 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
                      Icon = Check;
                      badgeText = 'Full';
                    } else if (permVal === 'read') {
                      bgClass = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
                      Icon = Eye;
                      badgeText = 'View';
                    } else {
                      badgeText = 'None';
                    }

                    return (
                      <div 
                        key={key} 
                        className={`flex items-center gap-2 text-sm p-2 rounded-lg ${bgClass}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate flex-1" title={permissionLabels[key]}>{permissionLabels[key]}</span>
                        <span className="text-[10px] uppercase font-bold opacity-70 px-1.5 py-0.5 rounded bg-white/20">{badgeText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={isEditMode ? "Edit Role" : "Create New Role"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
            <input
              type="text"
              value={roleFormData.name}
              onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
              placeholder="e.g. Sales Associate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={roleFormData.description}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
              placeholder="Brief description of the role"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
              {permissionKeys.map((key) => {
                const permissionValue = roleFormData.permissions[key] || 'none';
                return (
                  <div key={key} className="flex flex-col gap-1.5 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{permissionLabels[key]}</span>
                    <select
                      value={permissionValue === true ? 'write' : permissionValue === false ? 'none' : permissionValue}
                      onChange={(e) => setRoleFormData({
                        ...roleFormData,
                        permissions: { ...roleFormData.permissions, [key]: e.target.value }
                      })}
                      className="w-full text-sm py-1.5 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="none">No Access</option>
                      <option value="read">Read Only</option>
                      <option value="write">Full Access (Edit)</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} className="bg-red-600 text-white hover:bg-red-700">
              {isEditMode ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Create User Account"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Role</label>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} className="bg-red-600 text-white hover:bg-red-700">Create Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
