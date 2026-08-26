import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, MessageSquare, ArrowRight, Globe } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label , isCollapsed}) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to}
        className={({ isActive }) =>
            `w-full mb-1.5 px-3 py-2.5 rounded-lg border text-left shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group ${
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
            {!isCollapsed && <span className="font-bold text-xs truncate">{label}</span>}
        </div>
        {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" shrink-0 />}
    </NavLink>
);

const SectionHeader = ({ icon: Icon, label , isCollapsed}) => (
    <div className={`flex items-center gap-2 px-1 mb-2 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? label : ''}>
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>}
    </div>
);

export default function AccountSubMenu({ isCollapsed }) {
    const { user } = useAuth();

    return (
        <div className="flex flex-col">
            {/* ==================== */}
            {/* AKUN & PROFIL       */}
            {/* ==================== */}
            <SectionHeader icon={User} label="Akun Saya"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="profile" icon={User} label="Profil & Password"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* PREFERENSI           */}
            {/* ==================== */}
            <SectionHeader icon={MessageSquare} label="Preferensi"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="quick-replies" icon={MessageSquare} label="Template Balasan"  isCollapsed={isCollapsed} />
                <MenuItem to="language" icon={Globe} label="Bahasa"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* INFO USER           */}
            {/* ==================== */}
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-gray-400">{user?.email || ''}</p>
                </div>
            </div>
        </div>
    );
}