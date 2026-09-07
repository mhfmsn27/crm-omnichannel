import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import IntegrationsSubMenu from './IntegrationsSubMenu';
import { usePageTitle } from '../../context/HeaderContext';

export default function IntegrationsLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  usePageTitle('INTEGRATIONS');

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-200">
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
        {/* Kolom Kiri: Navigasi Menu */}
        <aside className={`w-full transition-all duration-300 ${isCollapsed ? 'w-full md:w-16' : 'w-full md:w-52'} flex-shrink-0 md:sticky md:top-6 relative`}>
           {/* Toggle Button */}
           <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 rounded-full shadow-md items-center justify-center border border-gray-200 dark:border-slate-700 hover:scale-110 hover:text-orange-500 transition-transform cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
           <IntegrationsSubMenu isCollapsed={isCollapsed} />
        </aside>

        {/* Kolom Kanan: Konten Dinamis */}
        <main className="flex-1 w-full bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 min-h-[400px] md:min-h-[600px] relative overflow-hidden">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
