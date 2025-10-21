import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './lib/supabase.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Layout from './components/layout.jsx';
import Login from './pages/login.jsx';
import Dashboard from './pages/dashboard.jsx';
import Appointments from './pages/appointments.jsx';
import Patients from './pages/Patients.jsx';
import Doctors from './pages/doctors.jsx';
import Departments from './pages/Departments.jsx';
import Schedule from './pages/Schedule.jsx';
import Payments from './pages/Payments.jsx';
import Inventory from './pages/Inventory.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import './styles/globals.css';

// Protected Route component
const ProtectedRoute = ({ children, requiredType }) => {
  const { isAuthenticated, userType, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requiredType && userType !== requiredType) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <Router future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Dashboard */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/appointments" element={
                <ProtectedRoute requiredType="admin">
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/patients" element={
                <ProtectedRoute requiredType="admin">
                  <Patients />
                </ProtectedRoute>
              } />
              <Route path="/doctors" element={
                <ProtectedRoute requiredType="admin">
                  <Doctors />
                </ProtectedRoute>
              } />
              <Route path="/departments" element={
                <ProtectedRoute requiredType="admin">
                  <Departments />
                </ProtectedRoute>
              } />
              <Route path="/schedule" element={
                <ProtectedRoute requiredType="admin">
                  <Schedule />
                </ProtectedRoute>
              } />
              <Route path="/payments" element={
                <ProtectedRoute requiredType="admin">
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute requiredType="admin">
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="/admin-settings" element={
                <ProtectedRoute requiredType="admin">
                  <AdminSettings />
                </ProtectedRoute>
              } />
              
              {/* Doctor Routes - Use existing pages with filters for now */}
              <Route path="/doctor-appointments" element={
                <ProtectedRoute requiredType="doctor">
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/doctor-patients" element={
                <ProtectedRoute requiredType="doctor">
                  <Patients />
                </ProtectedRoute>
              } />
              <Route path="/doctor-schedule" element={
                <ProtectedRoute requiredType="doctor">
                  <Schedule />
                </ProtectedRoute>
              } />
              
              {/* Patient Routes - Use existing pages with filters for now */}
              <Route path="/patient-appointments" element={
                <ProtectedRoute requiredType="patient">
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/patient-billing" element={
                <ProtectedRoute requiredType="patient">
                  <Payments />
                </ProtectedRoute>
              } />
              
              {/* Pharmacist Routes - Use existing pages with filters for now */}
              <Route path="/pharmacy-inventory" element={
                <ProtectedRoute requiredType="pharmacist">
                  <Inventory />
                </ProtectedRoute>
              } />
              
              {/* Placeholder routes for future implementation */}
              <Route path="/prescriptions" element={
                <ProtectedRoute requiredType="doctor">
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4">
                      <p>Prescription management coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/patient-prescriptions" element={
                <ProtectedRoute requiredType="patient">
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">My Prescriptions</h1>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4">
                      <p>Prescription viewing coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/medical-records" element={
                <ProtectedRoute requiredType="patient">
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4">
                      <p>Medical records coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/pharmacy-prescriptions" element={
                <ProtectedRoute requiredType="pharmacist">
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Pharmacy Prescriptions</h1>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4">
                      <p>Prescription processing coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/pharmacy-patients" element={
                <ProtectedRoute requiredType="pharmacist">
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Pharmacy Patients</h1>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4">
                      <p>Patient lookup coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;