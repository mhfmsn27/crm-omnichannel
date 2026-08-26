'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { LogIn, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isAuthenticated) {
        timer = setTimeout(() => router.replace('/'), 100);
    }
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!username || !password) {
        setError('Both username and password are required.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await api.post('/admin/auth/login', {
        username,
        password,
      });

      if (response.data && response.data.token) {
        login(response.data.token);
      } else {
        throw new Error('Login failed: No token received');
      }

    } catch (err: any) {
      console.error('Login Error:', err);
      const errorMessage = err.response?.data?.message || 'Invalid credentials.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };
 
  if (isAuthenticated) return null;

  return (
    <main className="flex items-center justify-center min-h-screen overflow-hidden relative">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md p-8 space-y-8 glass-panel rounded-2xl shadow-2xl z-10 relative overflow-hidden">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 mb-4">
              <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm">
            Enter your credentials to access the galaxy.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                    <User size={18} />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Username"
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
            </div>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                    <Lock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-200 bg-red-900/50 border border-red-800 rounded-lg animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/25 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? (
                 <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Authenticating...
                 </>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
