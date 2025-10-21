import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    reason: '',
    notes: ''
  });

  const { user, userType } = useAuth();

  useEffect(() => {
    fetchAppointments();
    if (userType === 'admin') {
      fetchPatients();
      fetchDoctors();
    } else if (userType === 'doctor') {
      fetchDoctors();
    }
  }, [user, userType]);

  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients (first_name, last_name),
          doctors (first_name, last_name, specialization)
        `)
        .order('appointment_date', { ascending: false });

      // Filter based on user type
      if (userType === 'doctor') {
        query = query.eq('doctor_id', user.id);
      } else if (userType === 'patient') {
        query = query.eq('patient_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, first_name, last_name, specialization')
        .order('first_name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const createInvoiceForAppointment = async (appointmentId, patientId, doctorId) => {
    try {
      // Get doctor's consultation fee
      const { data: doctor } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', doctorId)
        .single();

      const consultationFee = doctor?.consultation_fee || 100; // Default fee

      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert([{
          patient_id: patientId,
          appointment_id: appointmentId,
          invoice_number: invoiceNumber,
          total_amount: consultationFee,
          status: 'pending',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // For doctors, auto-assign themselves
      const appointmentData = userType === 'doctor' 
        ? { ...formData, doctor_id: user.id }
        : formData;

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select();

      if (error) throw error;
      
      // Create invoice for the appointment (admin only)
      if (userType === 'admin' && data && data[0]) {
        await createInvoiceForAppointment(data[0].id, formData.patient_id, formData.doctor_id);
      }

      setShowModal(false);
      setFormData({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        reason: '',
        notes: ''
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error creating appointment: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-yellow-100 text-yellow-800'
  };

  const getPageTitle = () => {
    switch (userType) {
      case 'doctor': return 'My Appointments';
      case 'patient': return 'My Appointments';
      default: return 'Appointments';
    }
  };

  const canCreateAppointment = userType === 'admin' || userType === 'patient';

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
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        {canCreateAppointment && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={patients.length === 0 || doctors.length === 0}
          >
            + New Appointment
          </button>
        )}
      </div>

      {userType === 'admin' && patients.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Note:</strong> You need to create at least one patient before creating appointments.
          </p>
        </div>
      )}

      {userType === 'admin' && doctors.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Note:</strong> You need to create at least one doctor before creating appointments.
          </p>
        </div>
      )}

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {userType !== 'patient' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                )}
                {userType !== 'doctor' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  {userType !== 'patient' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.patients?.first_name} {appointment.patients?.last_name}
                      </div>
                    </td>
                  )}
                  {userType !== 'doctor' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.doctors?.specialization}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(appointment.appointment_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[appointment.status] || 'bg-gray-100 text-gray-800'}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {appointment.reason}
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={userType === 'admin' ? 5 : userType === 'doctor' ? 4 : 4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Appointment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {userType === 'admin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patient *</label>
                    <select
                      name="patient_id"
                      value={formData.patient_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                    <select
                      name="doctor_id"
                      value={formData.doctor_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {userType === 'patient' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    name="doctor_id"
                    value={formData.doctor_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time *</label>
                <input
                  type="datetime-local"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason *</label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for appointment"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes..."
                />
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
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;