import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Key, Book, ArrowRight , ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const MenuItem = ({ to, icon: Icon, label }) => (
    <NavLink 
        to={to} 
        className={({ isActive }) => 
            `shrink-0 md:w-full mb-0 md:mb-2 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className="flex items-center gap-2.5">
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs">{label}</span>
        </div>
        <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />
    </NavLink>
);

export default function DeveloperLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  usePageTitle('DEVELOPER API');

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-200">
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
        <aside className={`w-full transition-all duration-300 ${isCollapsed ? 'w-full md:w-16' : 'w-full md:w-52'} flex-shrink-0 md:sticky md:top-6 relative`}>
           {/* Toggle Button */}
           <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 rounded-full shadow-md items-center justify-center border border-gray-200 dark:border-slate-700 hover:scale-110 hover:text-orange-500 transition-transform cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
           <div className="flex flex-row md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:gap-0 pb-1.5 md:pb-0 px-1 w-full">
                <MenuItem to="apps" icon={Key} label="My Apps" />
                <MenuItem to="docs" icon={Book} label="Documentation" />
           </div>
        </aside>

        <main className="flex-1 w-full bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] min-h-[400px] md:min-h-[600px] relative overflow-hidden">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
