import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.jsx';
import { useAuth } from '../../lib/auth.jsx';

const PatientDashboard = () => {
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    activePrescriptions: 0,
    pendingPayments: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchPatientData();
  }, [user]);

  const fetchPatientData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString();
      
      // Upcoming appointments
      const { count: upcomingAppointmentsCount, data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors (first_name, last_name, specialization)
        `)
        .eq('patient_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', today)
        .order('appointment_date')
        .limit(5);

      // Active prescriptions
      const { count: activePrescriptions } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .eq('status', 'active');

      // Pending payments
      const { count: pendingPayments } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .neq('status', 'paid');

      setStats({
        upcomingAppointments: upcomingAppointmentsCount || 0,
        activePrescriptions: activePrescriptions || 0,
        pendingPayments: pendingPayments || 0
      });
      setUpcomingAppointments(appointments || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const quickActions = [
    { name: 'Upcoming Appointments', href: '/patient-appointments', icon: '📅', count: stats.upcomingAppointments },
    { name: 'My Prescriptions', href: '/patient-prescriptions', icon: '💊', count: stats.activePrescriptions },
    { name: 'Pending Payments', href: '/patient-billing', icon: '💰', count: stats.pendingPayments },
    { name: 'Medical Records', href: '/medical-records', icon: '📋' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
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

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <Link to="/patient-appointments" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}
                  </span>
                  <p className="text-xs text-gray-500">{appointment.doctors?.specialization}</p>
                  <p className="text-xs text-gray-500">{appointment.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900 block">
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(appointment.appointment_date).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))}
          {upcomingAppointments.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No upcoming appointments
            </div>
          )}
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Health Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Blood Type</span>
              <span className="text-sm font-medium text-gray-900">{user?.blood_type || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Visit</span>
              <span className="text-sm font-medium text-gray-900">
                {user?.last_visit ? new Date(user.last_visit).toLocaleDateString() : 'No visits yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Primary Doctor</span>
              <span className="text-sm font-medium text-gray-900">Not assigned</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/patient-appointments?action=book"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Book New Appointment
            </Link>
            <Link
              to="/patient-prescriptions"
              className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              View Prescriptions
            </Link>
            <Link
              to="/medical-records"
              className="block w-full text-center bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              Medical History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;