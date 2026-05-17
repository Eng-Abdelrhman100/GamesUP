
import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { Mail, Phone, Plus, Edit2, Trash2, Upload, Shield, User, FileText } from 'lucide-react';
import { rolesAPI, uploadAPI, teamAPI } from '../../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string; // 'admin', 'manager', 'staff'
  job_title?: string;
  phone?: string;
  avatar?: string;
  identity_document?: string;
  created_at?: string;
}

export function TeamMembers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>(['admin', 'manager', 'staff']);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    job_title: '',
    phone: '',
    avatar: '',
    identity_document: ''
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await teamAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await rolesAPI.getAll();
      const rolesArray = Array.isArray(data) ? data : Array.isArray((data as any)?.roles) ? (data as any).roles : [];
      const roleNames = rolesArray
        .map((role: any) => (typeof role === 'string' ? role : role?.name))
        .filter((name: any) => typeof name === 'string' && name.length > 0);
      const nextRoles = roleNames.length > 0 ? roleNames : ['admin', 'manager', 'staff'];
      setRoles(nextRoles);
      setFormData((prev) => (nextRoles.includes(prev.role) ? prev : { ...prev, role: nextRoles[0] }));
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const data = await uploadAPI.uploadImage(file);
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let avatarUrl = formData.avatar;
      let idUrl = formData.identity_document;

      if (avatarFile) {
        avatarUrl = await handleFileUpload(avatarFile);
      }
      if (idFile) {
        idUrl = await handleFileUpload(idFile);
      }

      const payload = {
        ...formData,
        avatar: avatarUrl,
        identity_document: idUrl,
      };

      if (editingUser) {
        await teamAPI.update(editingUser.id, payload);
      } else {
        await teamAPI.create(payload);
      }

      setShowModal(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await teamAPI.delete(id);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Empty for edit unless resetting
      role: user.role,
      job_title: user.job_title || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      identity_document: user.identity_document || ''
    });
    setAvatarFile(null);
    setIdFile(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      job_title: '',
      phone: '',
      avatar: '',
      identity_document: ''
    });
    setAvatarFile(null);
    setIdFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your team members and roles</p>
        </div>
        <Button onClick={openAddModal} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30">
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{user.job_title || user.role}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(user)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="capitalize">{user.role} Access</span>
              </div>
              {user.identity_document && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="w-4 h-4" />
                  <a href={user.identity_document} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    View ID Document
                  </a>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit Employee' : 'Add New Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={editingUser ? 'Enter to reset password' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role (Access)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {(formData.role && !roles.includes(formData.role) ? [formData.role, ...roles] : roles).map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. Sales Manager"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avatar</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </label>
                {(avatarFile || formData.avatar) && <span className="text-xs text-green-500">Selected</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National ID / Passport</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="id-upload"
                />
                <label
                  htmlFor="id-upload"
                  className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload ID
                </label>
                {(idFile || formData.identity_document) && <span className="text-xs text-green-500">Selected</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Save Employee
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
