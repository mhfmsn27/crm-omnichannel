import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Tag, Target, Upload, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';

const MenuItem = ({ to, icon: Icon, label, isNew, isCollapsed }) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to} 
        className={({ isActive }) => 
            `shrink-0 md:w-full mb-0 md:mb-2 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="p-1.5 rounded-lg transition-colors bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
                {isNew && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase dark:bg-green-900/30 dark:text-green-400 shrink-0">New</span>}
            </div>
        </div>
        {!isCollapsed && <ArrowRight className="hidden md:block w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />}
    </NavLink>
);

export default function ContactsSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    return (
        <div className="flex flex-col w-full">
            <div className="mb-1 md:mb-2 px-1">
                {!isCollapsed && <p className="hidden md:block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Database Kontak</p>}
                <div className="flex flex-row md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:gap-0 pb-1.5 md:pb-0">
                    {hasPerm(user, 'manage_contacts') && (
                        <MenuItem to="list" icon={Users} label="Semua Kontak" isCollapsed={isCollapsed} />
                    )}
                    {hasPerm(user, 'manage_leads') && (
                        <MenuItem to="leads" icon={Target} label="Lead & Prospek" isNew isCollapsed={isCollapsed} />
                    )}
                    {hasPerm(user, 'import_contacts') && (
                        <MenuItem to="import" icon={Upload} label="Import Kontak" isCollapsed={isCollapsed} />
                    )}
                    {hasPerm(user, 'manage_labels') && (
                        <MenuItem to="labels" icon={Tag} label="Manajemen Label" isCollapsed={isCollapsed} />
                    )}
                </div>
            </div>
        </div>
    );
}
