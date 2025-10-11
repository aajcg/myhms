import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Appointments', href: '/appointments', icon: '📅' },
    { name: 'Patients', href: '/patients', icon: '👥' },
    { name: 'Doctors', href: '/doctors', icon: '👨‍⚕️' },
    { name: 'Departments', href: '/departments', icon: '🏥' },
    { name: 'Schedule', href: '/schedule', icon: '⏰' },
    { name: 'Payments', href: '/payments', icon: '💰' },
    { name: 'Inventory', href: '/inventory', icon: '📦' },
    { name: 'Admin Settings', href: '/admin-settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return children; // Return children directly for login page
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className={`text-xl font-bold text-blue-600 ${!sidebarOpen && 'hidden'}`}>
            Well2Nest
          </h1>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        
        <nav className="flex-1 mt-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors hover:no-underline ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h2>
              <div className="flex items-center space-x-4">
                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 text-sm focus:outline-none"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {admin?.full_name?.charAt(0) || 'A'}
                    </div>
                    {sidebarOpen && (
                      <span className="text-gray-700">{admin?.full_name}</span>
                    )}
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <div className="px-4 py-2 text-xs text-gray-500 border-b">
                        Signed in as {admin?.email}
                      </div>
                      <Link
                        to="/admin-settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        Admin Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;