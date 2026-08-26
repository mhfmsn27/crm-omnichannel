
'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; 
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto relative">
         {/* Main content area with slight transparency for galaxy bg to show through */}
        <div className="relative z-10">
            {children}
        </div>
        
        {/* Background Glows for Dashboard Area */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="fixed bottom-0 left-20 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      </main>
    </div>
  );
}
