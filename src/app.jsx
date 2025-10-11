import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './lib/supabase.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Appointments from './pages/Appointments.jsx';
import Patients from './pages/Patients.jsx';
import Doctors from './pages/Doctors.jsx';
import Departments from './pages/Departments.jsx';
import Schedule from './pages/Schedule.jsx';
import Payments from './pages/Payments.jsx';
import Inventory from './pages/Inventory.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import './styles/globals.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
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
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/patients" element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              } />
              <Route path="/doctors" element={
                <ProtectedRoute>
                  <Doctors />
                </ProtectedRoute>
              } />
              <Route path="/departments" element={
                <ProtectedRoute>
                  <Departments />
                </ProtectedRoute>
              } />
              <Route path="/schedule" element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } />
              <Route path="/payments" element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="/admin-settings" element={
                <ProtectedRoute>
                  <AdminSettings />
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