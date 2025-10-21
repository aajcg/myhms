import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.jsx';
import { useAuth } from '../../lib/auth.jsx';

const PharmacistDashboard = () => {
  const [stats, setStats] = useState({
    pendingPrescriptions: 0,
    lowStockItems: 0,
    todayFilled: 0
  });
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchPharmacistData();
  }, [user]);

  const fetchPharmacistData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Pending prescriptions
      const { count: pendingCount, data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients (first_name, last_name),
          doctors (first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('prescribed_date', { ascending: false })
        .limit(5);

      // Low stock items
      const { count: lowStockCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .lte('quantity', 10)
        .eq('category', 'Medication');

      // Today's filled prescriptions
      const { count: todayFilled } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'filled')
        .eq('filled_by', user.id)
        .gte('filled_date', `${today}T00:00:00`)
        .lte('filled_date', `${today}T23:59:59`);

      setStats({
        pendingPrescriptions: pendingCount || 0,
        lowStockItems: lowStockCount || 0,
        todayFilled: todayFilled || 0
      });
      setPendingPrescriptions(prescriptions || []);
    } catch (error) {
      console.error('Error fetching pharmacist data:', error);
    }
  };

  const quickActions = [
    { name: 'Pending Prescriptions', href: '/pharmacy-prescriptions', icon: '💊', count: stats.pendingPrescriptions },
    { name: 'Low Stock Alert', href: '/pharmacy-inventory', icon: '⚠️', count: stats.lowStockItems },
    { name: 'Filled Today', href: '/pharmacy-prescriptions', icon: '✅', count: stats.todayFilled },
    { name: 'Inventory', href: '/pharmacy-inventory', icon: '📦' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.first_name} {user?.last_name}</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{action.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {action.count !== undefined ? action.count : ''}
                </p>
              </div>
              <div className="text-2xl text-blue-600 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Prescriptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Prescriptions</h2>
          <Link to="/pharmacy-prescriptions" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {pendingPrescriptions.map((prescription) => (
            <div key={prescription.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {prescription.patients?.first_name} {prescription.patients?.last_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(prescription.prescribed_date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {prescription.medication_name} - {prescription.dosage}
                </p>
                <p className="text-xs text-gray-500">
                  Dr. {prescription.doctors?.first_name} {prescription.doctors?.last_name}
                </p>
              </div>
              <Link
                to={`/pharmacy-prescriptions?fill=${prescription.id}`}
                className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Fill
              </Link>
            </div>
          ))}
          {pendingPrescriptions.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No pending prescriptions
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/pharmacy-prescriptions"
          className="bg-green-600 text-white p-6 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">💊</div>
          <div className="font-semibold">Process Prescriptions</div>
        </Link>
        <Link
          to="/pharmacy-inventory"
          className="bg-orange-600 text-white p-6 rounded-lg shadow-sm hover:bg-orange-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">📦</div>
          <div className="font-semibold">Manage Inventory</div>
        </Link>
        <Link
          to="/pharmacy-patients"
          className="bg-purple-600 text-white p-6 rounded-lg shadow-sm hover:bg-purple-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="font-semibold">Patient Lookup</div>
        </Link>
      </div>

      {/* Pharmacy Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Pharmacy Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-sm font-medium text-green-800">Pharmacy Open</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">⏰</div>
            <div className="text-sm font-medium text-blue-800">9:00 AM - 6:00 PM</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">📞</div>
            <div className="text-sm font-medium text-purple-800">Ext. 1234</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;