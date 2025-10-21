import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.jsx';
import { useAuth } from '../../lib/auth.jsx';

const DoctorDashboard = () => {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    pendingPrescriptions: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchDoctorData();
  }, [user]);

  const fetchDoctorData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Today's appointments
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', `${today}T00:00:00`)
        .lte('appointment_date', `${today}T23:59:59`);

      // Total patients
      const { count: totalPatients } = await supabase
        .from('appointments')
        .select('patient_id', { count: 'exact', head: true })
        .eq('doctor_id', user.id);

      // Pending prescriptions
      const { count: pendingPrescriptions } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .eq('status', 'pending');

      // Today's schedule
      const { data: schedule } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (first_name, last_name)
        `)
        .eq('doctor_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', `${today}T00:00:00`)
        .lte('appointment_date', `${today}T23:59:59`)
        .order('appointment_date');

      setStats({
        todayAppointments: todayAppointments || 0,
        totalPatients: totalPatients || 0,
        pendingPrescriptions: pendingPrescriptions || 0
      });
      setTodaySchedule(schedule || []);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const quickActions = [
    { name: 'Today\'s Appointments', href: '/doctor-appointments', icon: '📅', count: stats.todayAppointments },
    { name: 'My Patients', href: '/doctor-patients', icon: '👥', count: stats.totalPatients },
    { name: 'Write Prescription', href: '/prescriptions', icon: '💊', count: stats.pendingPrescriptions },
    { name: 'My Schedule', href: '/doctor-schedule', icon: '⏰' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600">Welcome back, Dr. {user?.first_name} {user?.last_name}</p>
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

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Appointments</h2>
          <Link to="/doctor-appointments" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {todaySchedule.slice(0, 5).map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {appointment.patients?.first_name} {appointment.patients?.last_name}
                  </span>
                  <p className="text-xs text-gray-500">{appointment.reason}</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">
                {new Date(appointment.appointment_date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          ))}
          {todaySchedule.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No appointments scheduled for today
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/prescriptions?action=new"
          className="bg-blue-600 text-white p-6 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">➕</div>
          <div className="font-semibold">New Prescription</div>
        </Link>
        <Link
          to="/doctor-schedule"
          className="bg-green-600 text-white p-6 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Update Schedule</div>
        </Link>
        <Link
          to="/doctor-patients"
          className="bg-purple-600 text-white p-6 rounded-lg shadow-sm hover:bg-purple-700 transition-colors text-center"
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="font-semibold">Patient Records</div>
        </Link>
      </div>
    </div>
  );
};

export default DoctorDashboard;