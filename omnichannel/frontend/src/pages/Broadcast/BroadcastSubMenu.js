import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { PlusCircle, BarChart2, FileText, RefreshCw, HelpCircle, ArrowRight, LayoutTemplate, DollarSign, Repeat, Bot } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, isExternal , isCollapsed}) => {
    const baseClasses = "w-full mb-2 px-3 py-2.5 bg-white rounded-lg border border-transparent text-gray-600 font-bold text-left shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 flex items-center justify-between group dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300 dark:hover:bg-slate-800";

    if (isExternal) {
        return (
            <Link to={to} className={baseClasses + " border-pink-200 hover:border-pink-400 text-pink-600 hover:animate-pulse dark:border-pink-800 dark:text-pink-400"}>
                <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="bg-pink-50 p-1.5 rounded-md text-pink-500 group-hover:text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                        <Icon className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="text-red-500 font-bold text-xs dark:text-red-400">{label}</span>}
                </div>
                {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500" />}
            </Link>
        );
    }

    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                isActive
                    ? "w-full mb-2 px-3 py-2.5 bg-orange-50 rounded-lg border border-orange-500 text-orange-700 font-bold text-left shadow-sm flex items-center justify-between group dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300"
                    : baseClasses
            }
        >
            <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="bg-gray-100 p-1.5 rounded-md text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400">
                    <Icon className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="text-xs">{label}</span>}
            </div>
            {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 dark:text-orange-300" />}
        </NavLink>
    );
};

export default function BroadcastSubMenu({ isCollapsed }) {
    return (
        <div className="flex flex-col">
            <div className="mb-4 px-1">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Campaign Tools</p>}
                <MenuItem to="create" icon={PlusCircle} label="Create Campaign"  isCollapsed={isCollapsed} />
                <MenuItem to="reports" icon={BarChart2} label="Broadcast Reports"  isCollapsed={isCollapsed} />
                <MenuItem to="upselling" icon={Repeat} label="Upselling Campaign"  isCollapsed={isCollapsed} />
            </div>

            <div className="mb-4 px-1">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Assets</p>}
                <MenuItem to="templates" icon={FileText} label="Templates"  isCollapsed={isCollapsed} />
                <MenuItem to="meta-templates" icon={LayoutTemplate} label="Meta Templates"  isCollapsed={isCollapsed} />
                <MenuItem to="rotators" icon={RefreshCw} label="Rotators"  isCollapsed={isCollapsed} />
            </div>

            <div className="px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                <MenuItem to="settings" icon={Bot} label="Bot & Settings" isCollapsed={isCollapsed} />
                <MenuItem to="tutorial" icon={HelpCircle} label="Tutorial" isCollapsed={isCollapsed} />
            </div>
        </div>
    );
}
