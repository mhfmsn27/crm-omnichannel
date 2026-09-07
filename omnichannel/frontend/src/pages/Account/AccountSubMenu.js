import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, MessageSquare, ArrowRight, Globe } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, isCollapsed }) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to}
        className={({ isActive }) =>
            `shrink-0 md:w-full mb-0 md:mb-1.5 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${
                isActive
                    ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold'
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
        </div>
        {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />}
    </NavLink>
);

const SectionHeader = ({ icon: Icon, label, isCollapsed }) => (
    <div className={`flex items-center gap-2 px-1 mb-2 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? label : ''}>
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>}
    </div>
);

export default function AccountSubMenu({ isCollapsed }) {
    const { user } = useAuth();

    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-row overflow-x-auto no-scrollbar gap-1.5 py-1 px-1 pb-1.5 w-full">
                <MenuItem to="profile" icon={User} label="Profil & Password" isCollapsed={false} />
                <MenuItem to="quick-replies" icon={MessageSquare} label="Template Balasan" isCollapsed={false} />
                <MenuItem to="language" icon={Globe} label="Bahasa" isCollapsed={false} />
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Sidebar */}
            <div className="hidden md:flex md:flex-col">
                <SectionHeader icon={User} label="Akun Saya" isCollapsed={isCollapsed} />
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                    <MenuItem to="profile" icon={User} label="Profil & Password" isCollapsed={isCollapsed} />
                </div>

                <SectionHeader icon={MessageSquare} label="Preferensi" isCollapsed={isCollapsed} />
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                    <MenuItem to="quick-replies" icon={MessageSquare} label="Template Balasan" isCollapsed={isCollapsed} />
                    <MenuItem to="language" icon={Globe} label="Bahasa" isCollapsed={isCollapsed} />
                </div>

                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-800/60">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-gray-400">{user?.email || ''}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}