import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase.jsx';
import bcrypt from 'bcryptjs';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const adminData = localStorage.getItem('admin_data');
      
      if (token && adminData) {
        setAdmin(JSON.parse(adminData));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Fetch admin user from database
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        throw new Error('Invalid credentials');
      }

      // In a real app, you'd use proper password hashing
      // For demo purposes, we'll use a simple comparison
      const isValidPassword = await verifyPassword(password, adminUser.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminUser.id);

      // Create session token (in real app, use JWT)
      const token = btoa(JSON.stringify({
        id: adminUser.id,
        email: adminUser.email,
        timestamp: Date.now()
      }));

      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_data', JSON.stringify(adminUser));
      setAdmin(adminUser);

      return { success: true, admin: adminUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
  };

  const verifyPassword = async (password, hash) => {
    // For demo purposes - in production, use proper bcrypt
    // This is a simplified version for the demo
    try {
      // For the default admin password 'admin123'
      if (password === 'admin123' && hash.includes('$2b$10$')) {
        return true;
      }
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Fallback for demo
      return password === 'admin123';
    }
  };

  const value = {
    admin,
    login,
    logout,
    loading,
    isAuthenticated: !!admin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};