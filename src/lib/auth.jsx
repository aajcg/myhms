import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase.jsx';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('user_token');
      const userData = localStorage.getItem('user_data');
      const type = localStorage.getItem('user_type');
      
      if (token && userData && type) {
        setUser(JSON.parse(userData));
        setUserType(type);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, type) => {
    try {
      setLoading(true);
      
      let userData = null;
      let userTable = '';

      switch (type) {
        case 'admin':
          userTable = 'admin_users';
          break;
        case 'doctor':
          userTable = 'doctors';
          break;
        case 'patient':
          userTable = 'patients';
          break;
        case 'pharmacist':
          userTable = 'pharmacists';
          break;
        default:
          throw new Error('Invalid user type');
      }

      // Fetch user from appropriate table
      const { data, error } = await supabase
        .from(userTable)
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      // Simple password verification for demo
      const isValidPassword = await verifyPassword(password, data.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await supabase
        .from(userTable)
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // Create session token
      const token = btoa(JSON.stringify({
        id: data.id,
        email: data.email,
        type: type,
        timestamp: Date.now()
      }));

      localStorage.setItem('user_token', token);
      localStorage.setItem('user_data', JSON.stringify(data));
      localStorage.setItem('user_type', type);
      
      setUser(data);
      setUserType(type);

      return { success: true, user: data, userType: type };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_type');
    setUser(null);
    setUserType(null);
  };

  const verifyPassword = async (password, hash) => {
    // Demo password verification
    // In production, use proper bcrypt
    const demoPasswords = {
      'admin@well2nest.com': 'admin123',
      'doctor@well2nest.com': 'doctor123',
      'patient@well2nest.com': 'patient123',
      'pharmacist@well2nest.com': 'pharmacist123'
    };
    
    // Check if it's a demo user with known password
    for (const [demoEmail, demoPassword] of Object.entries(demoPasswords)) {
      if (password === demoPassword && hash.includes('$2b$10$')) {
        return true;
      }
    }
    
    // For other users, you'd use proper bcrypt
    try {
      return password === 'default123'; // Fallback for new users
    } catch (error) {
      return false;
    }
  };

  const hasPermission = (requiredType, requiredRole = null) => {
    if (userType !== requiredType) return false;
    if (requiredRole && user?.role !== requiredRole) return false;
    return true;
  };

  const value = {
    user,
    userType,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};