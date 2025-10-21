import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    status: 'active'
  });
  const [dispenseData, setDispenseData] = useState({
    quantity_dispensed: '',
    notes: ''
  });

  const { userType, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [userType, user]);

  const fetchData = async () => {
    try {
      let prescriptionsQuery = supabase
        .from('prescriptions')
        .select(`
          *,
          patients (first_name, last_name, date_of_birth),
          doctors (first_name, last_name, specialization)
        `)
        .order('created_at', { ascending: false });

      // Filter data based on user role
      if (userType === 'patient') {
        prescriptionsQuery = prescriptionsQuery.eq('patient_id', user.id);
      } else if (userType === 'doctor') {
        prescriptionsQuery = prescriptionsQuery.eq('doctor_id', user.id);
      }

      const [prescriptionsRes, patientsRes, doctorsRes, inventoryRes] = await Promise.all([
        prescriptionsQuery,
        userType === 'admin' || userType === 'doctor' ? 
          supabase.from('patients').select('id, first_name, last_name').order('first_name') : 
          { data: [] },
        userType === 'admin' ? 
          supabase.from('doctors').select('id, first_name, last_name, specialization').order('first_name') : 
          { data: [] },
        userType === 'pharmacist' || userType === 'admin' ? 
          supabase.from('inventory').select('id, item_name, quantity, category').eq('category', 'Medication').order('item_name') : 
          { data: [] }
      ]);

      if (prescriptionsRes.error) throw prescriptionsRes.error;

      setPrescriptions(prescriptionsRes.data || []);
      setPatients(patientsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Auto-set doctor_id for doctors
      const submissionData = userType === 'doctor' 
        ? { ...formData, doctor_id: user.id }
        : formData;

      const { error } = await supabase
        .from('prescriptions')
        .insert([submissionData]);

      if (error) throw error;
      
      setShowModal(false);
      setFormData({
        patient_id: '',
        doctor_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        status: 'active'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Error creating prescription: ' + error.message);
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    try {
      // Update prescription status
      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .update({ 
          status: 'dispensed',
          dispensed_at: new Date().toISOString(),
          dispensed_quantity: parseInt(dispenseData.quantity_dispensed),
          pharmacist_notes: dispenseData.notes
        })
        .eq('id', selectedPrescription.id);

      if (prescriptionError) throw prescriptionError;

      // Update inventory if medication exists
      const medication = inventory.find(item => 
        item.item_name.toLowerCase() === selectedPrescription.medication_name.toLowerCase()
      );
      
      if (medication) {
        const newQuantity = medication.quantity - parseInt(dispenseData.quantity_dispensed);
        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({ quantity: Math.max(0, newQuantity) })
          .eq('id', medication.id);

        if (inventoryError) throw inventoryError;
      }

      setShowDispenseModal(false);
      setSelectedPrescription(null);
      setDispenseData({
        quantity_dispensed: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error dispensing prescription:', error);
      alert('Error dispensing prescription: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDispenseInputChange = (e) => {
    const { name, value } = e.target;
    setDispenseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openDispenseModal = (prescription) => {
    setSelectedPrescription(prescription);
    setDispenseData({
      quantity_dispensed: '1',
      notes: ''
    });
    setShowDispenseModal(true);
  };

  const statusColors = {
    active: 'status-badge status-active',
    dispensed: 'status-badge status-dispensed',
    cancelled: 'status-badge status-cancelled',
    expired: 'status-badge status-expired'
  };

  const getPageTitle = () => {
    switch (userType) {
      case 'patient': return 'My Prescriptions';
      case 'doctor': return 'My Prescriptions';
      case 'pharmacist': return 'Prescriptions to Dispense';
      default: return 'Prescriptions Management';
    }
  };

  const canCreatePrescription = userType === 'admin' || userType === 'doctor';
  const canDispensePrescription = userType === 'admin' || userType === 'pharmacist';
  const canViewAllPrescriptions = userType === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const activePrescriptions = prescriptions.filter(p => p.status === 'active');
  const dispensedPrescriptions = prescriptions.filter(p => p.status === 'dispensed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        {canCreatePrescription && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            + New Prescription
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="stat-value">{prescriptions.length}</div>
          <div className="stat-label">Total Prescriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activePrescriptions.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dispensedPrescriptions.length}</div>
          <div className="stat-label">Dispensed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {inventory.filter(item => item.quantity > 0).length}
          </div>
          <div className="stat-label">Medications in Stock</div>
        </div>
      </div>

      {/* Low Stock Alert for Pharmacist */}
      {(userType === 'pharmacist' || userType === 'admin') && inventory.filter(item => item.quantity <= 10).length > 0 && (
        <div className="alert alert-warning">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {inventory.filter(item => item.quantity <= 10).length} medication(s) running low
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Active Prescriptions Alert for Pharmacist */}
      {userType === 'pharmacist' && activePrescriptions.length > 0 && (
        <div className="alert alert-info">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-blue-400">💊</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {activePrescriptions.length} prescription(s) ready for dispensing
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Prescriptions Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                {canViewAllPrescriptions && (
                  <th className="table-header-cell">
                    Prescription ID
                  </th>
                )}
                <th className="table-header-cell">
                  Medication
                </th>
                <th className="table-header-cell">
                  Dosage
                </th>
                {canViewAllPrescriptions && (
                  <th className="table-header-cell">
                    {userType === 'patient' ? 'Doctor' : 'Patient'}
                  </th>
                )}
                <th className="table-header-cell">
                  Instructions
                </th>
                <th className="table-header-cell">
                  Status
                </th>
                <th className="table-header-cell">
                  Date
                </th>
                {canDispensePrescription && (
                  <th className="table-header-cell">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="table-body">
              {prescriptions.map((prescription) => (
                <tr key={prescription.id} className="table-row">
                  {canViewAllPrescriptions && (
                    <td className="table-cell font-medium">
                      #{prescription.id.slice(-8)}
                    </td>
                  )}
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">{prescription.medication_name}</div>
                    <div className="text-gray-500">
                      {prescription.frequency} • {prescription.duration}
                    </div>
                  </td>
                  <td className="table-cell">
                    {prescription.dosage}
                  </td>
                  {canViewAllPrescriptions && (
                    <td className="table-cell">
                      <div className="text-gray-900">
                        {userType === 'patient' 
                          ? `Dr. ${prescription.doctors?.first_name} ${prescription.doctors?.last_name}`
                          : `${prescription.patients?.first_name} ${prescription.patients?.last_name}`
                        }
                      </div>
                      <div className="text-gray-500">
                        {userType === 'patient' 
                          ? prescription.doctors?.specialization
                          : prescription.patients?.date_of_birth 
                            ? `DOB: ${new Date(prescription.patients.date_of_birth).toLocaleDateString()}`
                            : ''
                        }
                      </div>
                    </td>
                  )}
                  <td className="table-cell max-w-xs">
                    <div className="line-clamp-2">
                      {prescription.instructions || 'No special instructions'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={statusColors[prescription.status] || 'status-badge status-expired'}>
                      {prescription.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    {new Date(prescription.created_at).toLocaleDateString()}
                  </td>
                  {canDispensePrescription && (
                    <td className="table-cell font-medium">
                      {prescription.status === 'active' && (
                        <button
                          onClick={() => openDispenseModal(prescription)}
                          className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                        >
                          Dispense
                        </button>
                      )}
                      {prescription.status === 'dispensed' && (
                        <span className="text-gray-400">Dispensed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {prescriptions.length === 0 && (
                <tr>
                  <td 
                    colSpan={
                      (canViewAllPrescriptions ? 7 : 4) + (canDispensePrescription ? 1 : 0)
                    } 
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {userType === 'pharmacist' 
                      ? 'No prescriptions pending dispensing.' 
                      : 'No prescriptions found.'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Prescription Modal */}
      {showModal && canCreatePrescription && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="p-6">
              <h2 className="modal-header">Create New Prescription</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Patient *</label>
                    <select
                      name="patient_id"
                      value={formData.patient_id}
                      onChange={handleInputChange}
                      className="form-select"
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
                  {userType === 'admin' && (
                    <div>
                      <label className="form-label">Doctor *</label>
                      <select
                        name="doctor_id"
                        value={formData.doctor_id}
                        onChange={handleInputChange}
                        className="form-select"
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
                </div>

                <div>
                  <label className="form-label">Medication Name *</label>
                  <input
                    type="text"
                    name="medication_name"
                    value={formData.medication_name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Dosage *</label>
                    <input
                      type="text"
                      name="dosage"
                      value={formData.dosage}
                      onChange={handleInputChange}
                      placeholder="e.g., 500mg"
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Frequency *</label>
                    <select
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Frequency</option>
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Three times daily">Three times daily</option>
                      <option value="Four times daily">Four times daily</option>
                      <option value="As needed">As needed</option>
                      <option value="Before meals">Before meals</option>
                      <option value="After meals">After meals</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Duration *</label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="e.g., 7 days"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Instructions</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Special instructions for the patient..."
                    className="form-textarea"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Create Prescription
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dispense Prescription Modal */}
      {showDispenseModal && selectedPrescription && canDispensePrescription && (
        <div className="modal-overlay">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="modal-header">Dispense Prescription</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Patient:</strong> {selectedPrescription.patients?.first_name} {selectedPrescription.patients?.last_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Medication:</strong> {selectedPrescription.medication_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Dosage:</strong> {selectedPrescription.dosage} • {selectedPrescription.frequency}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Duration:</strong> {selectedPrescription.duration}
              </p>
            </div>
            <form onSubmit={handleDispense} className="space-y-4">
              <div>
                <label className="form-label">Quantity Dispensed *</label>
                <input
                  type="number"
                  name="quantity_dispensed"
                  value={dispenseData.quantity_dispensed}
                  onChange={handleDispenseInputChange}
                  min="1"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Pharmacist Notes</label>
                <textarea
                  name="notes"
                  value={dispenseData.notes}
                  onChange={handleDispenseInputChange}
                  rows="3"
                  placeholder="Any additional notes..."
                  className="form-textarea"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-success"
                >
                  Dispense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;