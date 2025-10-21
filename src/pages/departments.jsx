import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    head_doctor_id: ''
  });

  const { userType } = useAuth();

  useEffect(() => {
    if (userType === 'admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userType]);

  const fetchData = async () => {
    try {
      const [departmentsRes, doctorsRes, appointmentsRes] = await Promise.all([
        supabase.from('departments').select(`
          *,
          doctors!departments_head_doctor_id_fkey (first_name, last_name)
        `).order('name'),
        supabase.from('doctors').select('*').order('first_name'),
        supabase.from('appointments').select(`
          *,
          doctors (department, specialization)
        `)
      ]);

      if (departmentsRes.error) throw departmentsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      setDepartments(departmentsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('departments')
        .insert([formData]);

      if (error) throw error;
      
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        head_doctor_id: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating department:', error);
      alert('Error creating department: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate department statistics
  const getDepartmentStats = (departmentName) => {
    const departmentDoctors = doctors.filter(doctor => doctor.department === departmentName);
    const departmentAppointments = appointments.filter(apt => 
      apt.doctors?.department === departmentName
    );
    
    const activeDoctors = departmentDoctors.filter(doctor => doctor.status === 'active');
    const todayAppointments = departmentAppointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      const today = new Date();
      return aptDate.toDateString() === today.toDateString();
    });

    return {
      totalDoctors: departmentDoctors.length,
      activeDoctors: activeDoctors.length,
      totalAppointments: departmentAppointments.length,
      todayAppointments: todayAppointments.length,
      specialization: departmentDoctors[0]?.specialization || 'Various'
    };
  };

  const departmentColors = {
    'Cardiology': 'bg-red-50 border-red-200',
    'Pediatrics': 'bg-blue-50 border-blue-200',
    'Surgery': 'bg-green-50 border-green-200',
    'Neurology': 'bg-purple-50 border-purple-200',
    'Orthopedics': 'bg-orange-50 border-orange-200',
    'Dermatology': 'bg-pink-50 border-pink-200',
    'Psychiatry': 'bg-indigo-50 border-indigo-200',
    'Radiology': 'bg-cyan-50 border-cyan-200',
    'Emergency Medicine': 'bg-yellow-50 border-yellow-200',
    'Internal Medicine': 'bg-gray-50 border-gray-200'
  };

  const getDepartmentColor = (departmentName) => {
    return departmentColors[departmentName] || 'bg-white border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (userType !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Departments</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">Department management is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Department
        </button>
      </div>

      {/* Department Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{departments.length}</div>
          <div className="text-sm text-gray-600">Total Departments</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{doctors.length}</div>
          <div className="text-sm text-gray-600">Total Doctors</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {doctors.filter(d => d.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active Doctors</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {appointments.filter(apt => {
              const aptDate = new Date(apt.appointment_date);
              const today = new Date();
              return aptDate.toDateString() === today.toDateString();
            }).length}
          </div>
          <div className="text-sm text-gray-600">Today's Appointments</div>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => {
          const stats = getDepartmentStats(department.name);
          const departmentDoctors = doctors.filter(doctor => doctor.department === department.name);
          
          return (
            <div key={department.id} className={`rounded-lg shadow-sm border p-6 ${getDepartmentColor(department.name)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{stats.specialization}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {stats.activeDoctors} Active
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {department.description || 'No description available.'}
              </p>

              {department.doctors && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Head: Dr. {department.doctors.first_name} {department.doctors.last_name}
                  </p>
                </div>
              )}

              {/* Department Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{stats.totalDoctors}</div>
                  <div className="text-xs text-gray-500">Doctors</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{stats.totalAppointments}</div>
                  <div className="text-xs text-gray-500">Appointments</div>
                </div>
              </div>

              {/* Department Doctors */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Department Doctors:</h4>
                <div className="space-y-2">
                  {departmentDoctors.slice(0, 3).map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        doctor.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doctor.status}
                      </span>
                    </div>
                  ))}
                  {departmentDoctors.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{departmentDoctors.length - 3} more doctors
                    </div>
                  )}
                  {departmentDoctors.length === 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      No doctors assigned
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
          <p className="text-gray-500 mb-4">Create your first department to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Department
          </button>
        </div>
      )}

      {/* Add Department Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Department</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the department's focus and services..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Head Doctor (Optional)</label>
                <select
                  name="head_doctor_id"
                  value={formData.head_doctor_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Head Doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;