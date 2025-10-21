import React from 'react';
import { useAuth } from '../lib/auth.jsx';
import AdminDashboard from '../components/dashboards/AdminDashboard.jsx';
import DoctorDashboard from '../components/dashboards/DoctorDashboard.jsx';
import PatientDashboard from '../components/dashboards/PatientDashboard.jsx';
import PharmacistDashboard from '../components/dashboards/PharmacistDashboard.jsx';

const Dashboard = () => {
  const { userType } = useAuth();

  const renderDashboard = () => { 
    switch (userType) {
      case 'admin':
        return <AdminDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'patient':
        return <PatientDashboard />;
      case 'pharmacist':
        return <PharmacistDashboard />;
      default:
        return <div>Invalid user type</div>;
    }
  };

  return renderDashboard();
};

export default Dashboard;