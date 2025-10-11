import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'admin'
  });
  const { admin } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, usersRes] = await Promise.all([
        supabase.from('site_settings').select('*').order('setting_key'),
        supabase.from('admin_users').select('*').order('created_at')
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (usersRes.error) throw usersRes.error;

      setSettings(settingsRes.data || []);
      setAdminUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => prev.map(setting => 
      setting.setting_key === key ? { ...setting, setting_value: value } : setting
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('site_settings')
          .update({ 
            setting_value: setting.setting_value,
            updated_by: admin.id
          })
          .eq('setting_key', setting.setting_key);

        if (error) throw error;
      }
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const createAdminUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // In a real app, you'd hash the password properly
      const passwordHash = btoa(userForm.password); // Simple encoding for demo

      const { error } = await supabase
        .from('admin_users')
        .insert([{
          email: userForm.email.toLowerCase(),
          password_hash: passwordHash,
          full_name: userForm.full_name,
          role: userForm.role
        }]);

      if (error) throw error;

      setShowUserModal(false);
      setUserForm({ email: '', full_name: '', password: '', role: 'admin' });
      fetchData();
      alert('Admin user created successfully!');
    } catch (error) {
      console.error('Error creating admin user:', error);
      alert('Error creating admin user: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['general', 'users', 'system'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'general' ? 'General Settings' : 
               tab === 'users' ? 'User Management' : 'System Info'}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hospital Information</h2>
            </div>
            <div className="p-6 space-y-6">
              {settings.filter(s => !s.setting_key.includes('_')).map((setting) => (
                <div key={setting.setting_key} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                      {setting.setting_key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="md:col-span-2">
                    {setting.setting_type === 'number' ? (
                      <input
                        type="number"
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Business Settings</h2>
            </div>
            <div className="p-6 space-y-6">
              {settings.filter(s => s.setting_key.includes('_')).map((setting) => (
                <div key={setting.setting_key} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                      {setting.setting_key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="md:col-span-2">
                    {setting.setting_type === 'number' ? (
                      <input
                        type="number"
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={setting.setting_value}
                        onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Admin User
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.id !== admin.id && (
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={`${
                              user.is_active 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System Info Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Application Info</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">App Name</dt>
                    <dd className="text-sm text-gray-900">Well2Nest Hospital Management</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Version</dt>
                    <dd className="text-sm text-gray-900">1.0.0</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Environment</dt>
                    <dd className="text-sm text-gray-900">Production</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Database</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Provider</dt>
                    <dd className="text-sm text-gray-900">Supabase</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Status</dt>
                    <dd className="text-sm text-green-600">Connected</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-sm font-medium text-gray-900">Clear Cache</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-900">Generate Reports</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">🔒</div>
                <div className="text-sm font-medium text-gray-900">Backup Data</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Admin User</h2>
            <form onSubmit={createAdminUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;