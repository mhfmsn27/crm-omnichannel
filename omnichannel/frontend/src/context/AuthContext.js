import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure Axios default on load
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Explicitly pass token in header to ensure it uses the latest one
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Handle new backend structure which returns fresh JWT token for dynamic RBAC updates
        const userData = res.data.user || res.data;
        const freshToken = res.data.token;

        if (freshToken && freshToken !== token) {
          // Update storage and axios headers silently — do NOT call setToken()
          // to avoid re-triggering this useEffect and creating an infinite loop
          localStorage.setItem('token', freshToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${freshToken}`;
        }

        setUser(userData);
      } catch (err) {
        console.error("Auth check failed:", err);
        // Only logout if token is definitely invalid
        if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;

    // Set everything immediately
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    // Update State
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const setAuthData = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  // Explicitly refresh token to get latest permissions (call after role updates)
  const refreshToken = async () => {
    try {
      const res = await axios.post('/api/auth/refresh');
      const { token: newToken, user: newUser } = res.data;

      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (err) {
      console.error("Token refresh failed:", err);
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setAuthData, refreshToken }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
