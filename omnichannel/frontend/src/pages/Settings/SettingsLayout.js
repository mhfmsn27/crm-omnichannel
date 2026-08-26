import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SettingsSubMenu from './SettingsSubMenu';
import { usePageTitle } from '../../context/HeaderContext';

export default function SettingsLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  usePageTitle('SETTINGS');

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        {/* Kolom Kiri: Navigasi Menu */}
        <aside className={`w-full  transition-all duration-300 ${isCollapsed ? 'w-full md:w-16' : 'w-full md:w-52'}  flex-shrink-0 md:sticky md:top-6 relative`}>
           {/* Toggle Button */}
           <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 bg-white text-gray-500 rounded-full shadow-md items-center justify-center border border-gray-200 hover:scale-110 hover:text-orange-500 transition-transform cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
           <SettingsSubMenu isCollapsed={isCollapsed} />
        </aside>

        {/* Kolom Kanan: Konten Dinamis */}
        <main className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] md:min-h-[600px] relative overflow-hidden">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
