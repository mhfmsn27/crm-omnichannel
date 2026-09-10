import React from 'react';
import { NavLink } from 'react-router-dom';
import { Star, Puzzle, FileText, Users, ArrowRight } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, badge, isCollapsed }) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to}
        className={({ isActive }) =>
            `shrink-0 md:w-full mb-0 md:mb-1.5 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${isActive
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
                {badge && <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ml-1 shrink-0">{badge}</span>}
            </div>
        </div>
        {!badge && !isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />}
    </NavLink>
);

export default function OrderSubMenu({ isCollapsed }) {
    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-row overflow-x-auto no-scrollbar scroll-smooth touch-pan-x gap-1.5 py-1 px-1 pb-1.5 w-full">
                <MenuItem to="plans" icon={Star} label="Paket Langganan" isCollapsed={false} />
                <MenuItem to="addons" icon={Puzzle} label="Beli Add-on" isCollapsed={false} />
                <MenuItem to="invoices" icon={FileText} label="Invoice & Riwayat" isCollapsed={false} />
                <MenuItem to="partner" icon={Users} label="Partner" isCollapsed={false} />
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Sidebar */}
            <div className="hidden md:flex md:flex-col px-1">
                <MenuItem to="plans" icon={Star} label="Paket Langganan" isCollapsed={isCollapsed} />
                <MenuItem to="addons" icon={Puzzle} label="Beli Add-on" isCollapsed={isCollapsed} />
                <MenuItem to="invoices" icon={FileText} label="Invoice & Riwayat" isCollapsed={isCollapsed} />
                <MenuItem to="partner" icon={Users} label="Partner" isCollapsed={isCollapsed} />
            </div>
        </div>
    );
}
