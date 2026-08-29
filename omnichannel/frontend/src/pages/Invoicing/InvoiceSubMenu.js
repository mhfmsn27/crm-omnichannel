import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, PlusCircle, Settings, ArrowRight, Repeat } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label , isCollapsed}) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to} 
        className={({ isActive }) => 
            `w-full mb-2 px-3 py-2.5 rounded-lg border text-left shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300' 
                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300 dark:hover:bg-slate-800'
            }`
        }
    >
        <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-md text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                {!isCollapsed && <span className="font-bold text-xs truncate">{label}</span>}
            </div>
        </div>
        {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" shrink-0 />}
    </NavLink>
);

export default function InvoiceSubMenu({ isCollapsed }) {
  return (
    <div className="flex flex-col px-1">
        <MenuItem to="list" icon={FileText} label="Semua Faktur & SPO" isCollapsed={isCollapsed} />
        <MenuItem to="create" icon={PlusCircle} label="Buat Faktur / SPO" isCollapsed={isCollapsed} />
        <MenuItem to="recurring" icon={Repeat} label="Faktur Berlangganan" isCollapsed={isCollapsed} />
        <MenuItem to="settings" icon={Settings} label="Pengaturan" isCollapsed={isCollapsed} />
    </div>
  );
}
