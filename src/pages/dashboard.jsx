import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    totalBedrooms: 24,
    lowStockItems: 0,
    totalDoctors: 0,
    todayAppointments: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel for better performance
      const [
        patientsRes,
        appointmentsRes,
        invoicesRes,
        doctorsRes,
        inventoryRes,
        transactionsRes,
        departmentsRes,
        schedulesRes
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('*').lte('quantity', 10),
        supabase.from('transactions').select('amount'),
        supabase.from('departments').select('name'),
        supabase.from('doctor_schedules').select(`
          *,
          doctors (first_name, last_name, specialization, department)
        `).eq('schedule_date', new Date().toISOString().split('T')[0])
      ]);

      // Calculate total revenue from transactions
      const totalRevenue = transactionsRes.data?.reduce((sum, transaction) => 
        sum + (transaction.amount || 0), 0) || 0;

      // Get today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', `${today}T00:00:00`)
        .lte('appointment_date', `${today}T23:59:59`);

      // Get revenue data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: monthlyRevenue } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .gte('transaction_date', sixMonthsAgo.toISOString());

      // Process monthly revenue data
      const revenueByMonth = processMonthlyRevenue(monthlyRevenue || []);
      
      // Get patient registration data for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentPatients } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process patient data for the last 7 days
      const patientsByDay = processPatientData(recentPatients || []);
      
      // Get department distribution
      const { data: departmentDoctors } = await supabase
        .from('doctors')
        .select('department');
      
      const departmentDistribution = processDepartmentData(departmentDoctors || []);
      
      // Get recent activity (last 5 appointments and invoices)
      const { data: recentAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (first_name, last_name),
          doctors (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get today's schedule
      const { data: todaysSchedules } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          doctors (first_name, last_name, specialization, department)
        `)
        .eq('schedule_date', today)
        .order('start_time');

      setStats({
        totalPatients: patientsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        totalInvoices: invoicesRes.count || 0,
        totalRevenue: totalRevenue,
        totalBedrooms: 24, // This could be made dynamic if you have a bedrooms table
        lowStockItems: inventoryRes.data?.length || 0,
        totalDoctors: doctorsRes.count || 0,
        todayAppointments: todayAppointments?.count || 0
      });

      setRevenueData(revenueByMonth);
      setPatientData(patientsByDay);
      setDepartmentData(departmentDistribution);
      setRecentActivity(recentAppointments || []);
      setTodaySchedule(todaysSchedules || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyRevenue = (transactions) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = months[date.getMonth()];
      
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = {
          month: monthName,
          revenue: 0,
          patients: 0 // This would need additional data to be accurate
        };
      }
      
      revenueByMonth[monthKey].revenue += transaction.amount;
    });
    
    return Object.values(revenueByMonth).slice(-6); // Last 6 months
  };

  const processPatientData = (patients) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const patientsByDay = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = days[date.getDay()];
      patientsByDay[dayKey] = 0;
    }
    
    // Count patients by day
    patients.forEach(patient => {
      const date = new Date(patient.created_at);
      const dayKey = days[date.getDay()];
      if (patientsByDay.hasOwnProperty(dayKey)) {
        patientsByDay[dayKey]++;
      }
    });
    
    return Object.entries(patientsByDay).map(([day, patients]) => ({
      day,
      patients
    }));
  };

  const processDepartmentData = (doctors) => {
    const departmentCount = {};
    
    doctors.forEach(doctor => {
      const department = doctor.department || 'Unassigned';
      departmentCount[department] = (departmentCount[department] || 0) + 1;
    });
    
    return Object.entries(departmentCount).map(([name, value]) => ({
      name,
      value
    }));
  };

  const StatCard = ({ title, value, color, icon, prefix = '', suffix = '' }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}
            {typeof value === 'number' && prefix === '$' 
              ? value.toLocaleString() 
              : value.toLocaleString()}
            {suffix}
          </p>
        </div>
      </div>
    </div>
  );

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Patients" 
          value={stats.totalPatients} 
          color="text-green-600"
          icon="👥"
        />
        <StatCard 
          title="Today's Appointments" 
          value={stats.todayAppointments} 
          color="text-blue-600"
          icon="📅"
        />
        <StatCard 
          title="Total Revenue" 
          value={stats.totalRevenue} 
          color="text-purple-600"
          icon="💰"
          prefix="$"
        />
        <StatCard 
          title="Active Doctors" 
          value={stats.totalDoctors} 
          color="text-orange-600"
          icon="👨‍⚕️"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Appointments" 
          value={stats.totalAppointments} 
          color="text-indigo-600"
          icon="📋"
        />
        <StatCard 
          title="Pending Invoices" 
          value={stats.totalInvoices} 
          color="text-red-600"
          icon="🧾"
        />
        <StatCard 
          title="Low Stock Items" 
          value={stats.lowStockItems} 
          color="text-yellow-600"
          icon="📦"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Revenue Overview (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Revenue"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Patient Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Patient Registrations (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patientData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="patients" 
                fill="#8884d8" 
                name="New Patients"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Doctors']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-green-500' :
                    index === 1 ? 'bg-blue-500' :
                    index === 2 ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div>
                    <span className="text-sm text-gray-700">
                      Appointment with {activity.patients?.first_name} {activity.patients?.last_name}
                    </span>
                    <p className="text-xs text-gray-500">
                      Dr. {activity.doctors?.first_name} {activity.doctors?.last_name}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Today's Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todaySchedule.map((schedule, index) => (
            <div key={schedule.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Dr. {schedule.doctors?.first_name} {schedule.doctors?.last_name}
                </span>
                <p className="text-xs text-gray-600">{schedule.doctors?.department}</p>
                <p className="text-xs text-gray-500">{schedule.doctors?.specialization}</p>
              </div>
              <span className="text-sm font-medium text-blue-600">
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </span>
            </div>
          ))}
          {todaySchedule.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No schedules for today
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">{stats.totalBedrooms}</div>
          <div className="text-xs text-gray-600">Available Beds</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">
            {Math.round((stats.todayAppointments / Math.max(stats.totalDoctors, 1)) * 10) / 10}
          </div>
          <div className="text-xs text-gray-600">Avg. Appointments per Doctor</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">
            ${stats.totalRevenue > 0 ? Math.round(stats.totalRevenue / Math.max(stats.totalPatients, 1)) : 0}
          </div>
          <div className="text-xs text-gray-600">Avg. Revenue per Patient</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">
            {stats.totalAppointments > 0 ? Math.round((stats.todayAppointments / stats.totalAppointments) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-600">Today's Appointment Rate</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;