import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const quickActions = [
    { name: 'Manage Appointments', href: '/appointments', icon: '📅', description: 'View and manage all appointments' },
    { name: 'Patient Management', href: '/patients', icon: '👥', description: 'Manage patient records and information' },
    { name: 'Doctor Management', href: '/doctors', icon: '👨‍⚕️', description: 'Manage doctor profiles and schedules' },
    { name: 'Department Overview', href: '/departments', icon: '🏥', description: 'View department statistics and management' },
    { name: 'Financial Overview', href: '/payments', icon: '💰', description: 'Monitor revenue and payments' },
    { name: 'Inventory Management', href: '/inventory', icon: '📦', description: 'Manage medical supplies and inventory' },
    { name: 'System Settings', href: '/admin-settings', icon: '⚙️', description: 'Configure system settings and users' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Administrator Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-blue-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className="text-2xl group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {action.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-sm font-medium text-green-800">System Online</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">📊</div>
            <div className="text-sm font-medium text-blue-800">All Modules Active</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">👥</div>
            <div className="text-sm font-medium text-yellow-800">Multiple Users</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">⚡</div>
            <div className="text-sm font-medium text-purple-800">Optimal Performance</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;