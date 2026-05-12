import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, MapPin, Save, Edit2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { authAPI } from '../../utils/api';

interface ProfileProps {
  onBack: () => void;
}

export function Profile({ onBack }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = () => {
    const savedSession = localStorage.getItem('customerSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUser(session.user);
        setFormData({
          name: session.user.user_metadata?.name || session.user.name || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || session.user.phone || '',
          address: session.user.user_metadata?.address || session.user.address || '',
          city: session.user.user_metadata?.city || session.user.city || '',
          state: session.user.user_metadata?.state || session.user.state || '',
          zipCode: session.user.user_metadata?.zipCode || session.user.zipCode || '',
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { user: updatedUser } = await authAPI.updateProfile({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      });

      // Update localStorage session
      const savedSession = localStorage.getItem('customerSession');
      if (savedSession && updatedUser) {
        const session = JSON.parse(savedSession);
        session.user = updatedUser;
        localStorage.setItem('customerSession', JSON.stringify(session));
        setUser(updatedUser);
      }
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            ← Back to Home
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-500 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                <User className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{user?.user_metadata?.name || user?.name || 'Guest User'}</h2>
                <p className="text-red-100">{user?.email || 'No email provided'}</p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="p-8">
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-red-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={true}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
                        placeholder="john@example.com"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  Default Shipping Address
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="123 Main St, Apt 4B"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      loadUserProfile();
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-lg p-6 text-center"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Member Since</p>
            <p className="text-lg font-bold text-gray-900">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-lg p-6 text-center"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-lg font-bold text-gray-900">0</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-lg p-6 text-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Wishlist Items</p>
            <p className="text-lg font-bold text-gray-900">0</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
