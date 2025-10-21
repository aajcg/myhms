import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Pre-fill demo credentials based on user type
  useEffect(() => {
    const demoCredentials = {
      admin: { email: 'admin@well2nest.com', password: 'admin123' },
      doctor: { email: 'doctor@well2nest.com', password: 'doctor123' },
      patient: { email: 'patient@well2nest.com', password: 'patient123' },
      pharmacist: { email: 'pharmacist@well2nest.com', password: 'pharmacist123' }
    };
    
    const creds = demoCredentials[userType];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
    }
  }, [userType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, userType);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const userTypeInfo = {
    admin: {
      title: 'Administrator Portal',
      description: 'Manage hospital operations, users, and system settings',
      icon: '⚙️'
    },
    doctor: {
      title: 'Doctor Portal',
      description: 'View appointments, manage patients, and write prescriptions',
      icon: '👨‍⚕️'
    },
    patient: {
      title: 'Patient Portal',
      description: 'View your appointments, medical records, and prescriptions',
      icon: '👤'
    },
    pharmacist: {
      title: 'Pharmacy Portal',
      description: 'Manage prescriptions and inventory',
      icon: '💊'
    }
  };

  const currentInfo = userTypeInfo[userType];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="text-4xl">{currentInfo.icon}</div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Well2Nest Hospital
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {currentInfo.title}
        </p>
        <p className="mt-1 text-center text-sm text-gray-500">
          {currentInfo.description}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* User Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Login As
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userTypeInfo).map(([type, info]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUserType(type)}
                  className={`p-3 border rounded-md text-center transition-colors ${
                    userType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg mb-1">{info.icon}</div>
                  <div className="text-xs font-medium capitalize">{type}</div>
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-500">Demo Credentials Pre-filled</span>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : `Sign in as ${userType}`}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hospital Management System</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;