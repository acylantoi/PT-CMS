import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// ╔═══════════════════════════════════════════════════════════╗
// ║  TEST MODE — set to true to bypass login                 ║
// ║  Set back to false when Supabase connection is working   ║
// ╚═══════════════════════════════════════════════════════════╝
const TEST_MODE = true;

const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  full_name: 'System Administrator',
  email: 'admin@pt-cms.local',
  role: 'ADMIN',
  active: true
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TEST_MODE ? TEST_USER : null);
  const [token, setToken] = useState(TEST_MODE ? 'test-token' : localStorage.getItem('pt_cms_token'));
  const [loading, setLoading] = useState(TEST_MODE ? false : true);

  const logout = useCallback(() => {
    localStorage.removeItem('pt_cms_token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    if (TEST_MODE) return; // Skip auth verification in test mode
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, logout]);

  // Session timeout
  useEffect(() => {
    if (!user) return;
    
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        alert('Session expired due to inactivity. Please log in again.');
        logout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [user, logout]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('pt_cms_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    logout();
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
