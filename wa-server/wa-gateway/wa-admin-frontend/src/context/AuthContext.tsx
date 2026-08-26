
'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie'; 

interface User {
  id: string;
  username: string;
  iat: number;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_NAME = 'admin_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
        try {
          const storedToken = Cookies.get(TOKEN_NAME);
          if (storedToken) {
            const decodedUser = jwtDecode<User>(storedToken);
            if (decodedUser.exp * 1000 > Date.now()) {
              setUser(decodedUser);
            } else {
              Cookies.remove(TOKEN_NAME);
              setUser(null);
            }
          } else {
              setUser(null);
          }
        } catch (error) {
          console.error("Failed to parse token from cookie", error);
          Cookies.remove(TOKEN_NAME);
          setUser(null);
        } finally {
          setLoading(false);
        }
    };
    
    checkAuth();
  }, []);

  const login = (newToken: string) => {
    try {
      const decodedUser = jwtDecode<User>(newToken);
      Cookies.set(TOKEN_NAME, newToken, { expires: 7, secure: true, sameSite: 'strict' });
      setUser(decodedUser);
    } catch (error) {
      console.error("Failed to decode token", error);
      logout();
    }
  };

  const logout = () => {
    // CRITICAL FIX: Hapus cookie lalu paksa reload halaman ke /login
    // Ini mencegah infinite loop redirect antara Middleware dan Client State
    Cookies.remove(TOKEN_NAME);
    setUser(null);
    window.location.href = '/login'; 
  };
  
  const isAuthenticated = !!user;

  if (loading) {
    return null; // Atau loading spinner sederhana
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
