import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState('day');
  const [formData, setFormData] = useState({
    doctor_id: '',
    schedule_date: '',
    start_time: '09:00',
    end_time: '17:00',
    status: 'scheduled'
  });

  const { userType, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [selectedDate, view, userType, user]);

  const fetchData = async () => {
    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      
      if (view === 'week') {
        endDate.setDate(startDate.getDate() + 6);
      }

      let schedulesQuery = supabase
        .from('doctor_schedules')
        .select(`
          *,
          doctors (first_name, last_name, specialization, department)
        `)
        .gte('schedule_date', startDate.toISOString().split('T')[0])
        .lte('schedule_date', endDate.toISOString().split('T')[0])
        .order('schedule_date')
        .order('start_time');

      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          *,
          patients (first_name, last_name),
          doctors (first_name, last_name, specialization)
        `)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .order('appointment_date');

      let doctorsQuery = supabase
        .from('doctors')
        .select('*')
        .order('first_name');

      // Filter for doctors - only show their own schedule
      if (userType === 'doctor') {
        schedulesQuery = schedulesQuery.eq('doctor_id', user.id);
        appointmentsQuery = appointmentsQuery.eq('doctor_id', user.id);
        doctorsQuery = doctorsQuery.eq('id', user.id);
      }

      const [schedulesRes, doctorsRes, appointmentsRes] = await Promise.all([
        schedulesQuery,
        doctorsQuery,
        appointmentsQuery
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (doctorsRes.error) throw doctorsRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      setSchedules(schedulesRes.data || []);
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
      // For doctors, auto-assign themselves
      const scheduleData = userType === 'doctor' 
        ? { ...formData, doctor_id: user.id }
        : formData;

      const { error } = await supabase
        .from('doctor_schedules')
        .insert([scheduleData]);

      if (error) throw error;
      
      setShowModal(false);
      setFormData({
        doctor_id: '',
        schedule_date: '',
        start_time: '09:00',
        end_time: '17:00',
        status: 'scheduled'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getWeekDates = (date) => {
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day;
    const weekStart = new Date(startDate.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(weekStart);
      nextDay.setDate(weekStart.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const getDoctorColor = (doctorId) => {
    const colors = [
      'bg-blue-100 border-blue-200 text-blue-800',
      'bg-green-100 border-green-200 text-green-800',
      'bg-purple-100 border-purple-200 text-purple-800',
      'bg-orange-100 border-orange-200 text-orange-800',
      'bg-pink-100 border-pink-200 text-pink-800',
      'bg-indigo-100 border-indigo-200 text-indigo-800',
      'bg-teal-100 border-teal-200 text-teal-800',
      'bg-red-100 border-red-200 text-red-800',
      'bg-yellow-100 border-yellow-200 text-yellow-800',
      'bg-cyan-100 border-cyan-200 text-cyan-800'
    ];
    return colors[doctorId.charCodeAt(0) % colors.length];
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const getScheduleForTimeSlot = (date, timeSlot, doctorId) => {
    return schedules.find(schedule => 
      schedule.schedule_date === date.toISOString().split('T')[0] &&
      schedule.doctor_id === doctorId &&
      schedule.start_time <= timeSlot &&
      schedule.end_time > timeSlot
    );
  };

  const getAppointmentsForTimeSlot = (date, timeSlot) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const appointmentTime = appointmentDate.toTimeString().substring(0, 5);
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      return appointmentDateStr === date.toISOString().split('T')[0] &&
             appointmentTime === timeSlot;
    });
  };

  const getPageTitle = () => {
    switch (userType) {
      case 'doctor': return 'My Schedule';
      default: return 'Doctor Schedules';
    }
  };

  const canAddSchedule = userType === 'admin' || userType === 'doctor';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const weekDates = view === 'week' ? getWeekDates(selectedDate) : [new Date(selectedDate)];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                view === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                view === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Week View
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {canAddSchedule && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Schedule
            </button>
          )}
        </div>
      </div>

      {/* Schedule Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{schedules.length}</div>
          <div className="text-sm text-gray-600">Scheduled Shifts</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{doctors.length}</div>
          <div className="text-sm text-gray-600">Total Doctors</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {appointments.filter(apt => apt.status === 'scheduled').length}
          </div>
          <div className="text-sm text-gray-600">Upcoming Appointments</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(schedules.map(s => s.doctor_id)).size}
          </div>
          <div className="text-sm text-gray-600">Doctors Scheduled</div>
        </div>
      </div>

      {/* Schedule Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Time
                </th>
                {weekDates.map((date, index) => (
                  <th key={index} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    <div>
                      <div className="font-semibold">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getTimeSlots().map((timeSlot) => (
                <tr key={timeSlot} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                    {formatTime(timeSlot)}
                  </td>
                  {weekDates.map((date, dateIndex) => (
                    <td key={dateIndex} className="px-4 py-3 border-r min-w-48">
                      <div className="space-y-2">
                        {/* Doctor Schedules */}
                        {doctors.map((doctor) => {
                          const schedule = getScheduleForTimeSlot(date, timeSlot, doctor.id);
                          if (schedule) {
                            return (
                              <div
                                key={doctor.id}
                                className={`p-2 rounded border text-xs ${getDoctorColor(doctor.id)}`}
                              >
                                <div className="font-medium">
                                  Dr. {doctor.first_name} {doctor.last_name}
                                </div>
                                <div className="text-gray-600 text-xs">
                                  {doctor.department}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }).filter(Boolean)}

                        {/* Appointments */}
                        {getAppointmentsForTimeSlot(date, timeSlot).map((appointment) => (
                          <div
                            key={appointment.id}
                            className="p-2 rounded border border-green-200 bg-green-50 text-xs"
                          >
                            <div className="font-medium text-green-800">
                              {appointment.patients?.first_name} {appointment.patients?.last_name}
                            </div>
                            <div className="text-green-600 text-xs">
                              Dr. {appointment.doctors?.first_name} {appointment.doctors?.last_name}
                            </div>
                            <div className="text-green-500 text-xs">
                              {appointment.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Legend (Admin only) */}
      {userType === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Doctor Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded ${getDoctorColor(doctor.id).split(' ')[0]}`}></div>
                <span className="text-sm text-gray-700">
                  Dr. {doctor.first_name} {doctor.last_name} - {doctor.department}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Doctor Schedule</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {userType === 'admin' && (
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
                        Dr. {doctor.first_name} {doctor.last_name} - {doctor.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  name="schedule_date"
                  value={formData.schedule_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time *</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
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
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;