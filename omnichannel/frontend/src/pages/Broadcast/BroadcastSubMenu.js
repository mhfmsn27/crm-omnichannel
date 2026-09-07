import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { PlusCircle, BarChart2, FileText, RefreshCw, HelpCircle, ArrowRight, LayoutTemplate, DollarSign, Repeat, Bot, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';

const MenuItem = ({ to, icon: Icon, label, isExternal, isCollapsed }) => {
    const baseClasses = "shrink-0 md:w-full mb-0 md:mb-1.5 px-3 py-2 md:py-2.5 bg-white rounded-xl border border-gray-100 text-gray-600 font-medium text-left shadow-xs hover:shadow-sm hover:bg-gray-50 transition-all duration-200 flex items-center justify-between group whitespace-nowrap dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800";

    if (isExternal) {
        return (
            <Link to={to} className={baseClasses + " border-pink-200 hover:border-pink-400 text-pink-600 hover:animate-pulse dark:border-pink-800 dark:text-pink-400"}>
                <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
                    <div className="bg-pink-50 p-1.5 rounded-lg text-pink-500 group-hover:text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 shrink-0">
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
                </div>
                {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500 ml-2" />}
            </Link>
        );
    }

    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                isActive
                    ? "shrink-0 md:w-full mb-0 md:mb-1.5 px-3 py-2 md:py-2.5 bg-orange-50 rounded-xl border border-orange-500 text-orange-700 font-bold text-left shadow-xs flex items-center justify-between group whitespace-nowrap dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300"
                    : baseClasses
            }
        >
            <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
                <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                    <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
            </div>
            {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 dark:text-orange-300 ml-2" />}
        </NavLink>
    );
};

export default function BroadcastSubMenu({ isCollapsed }) {
    const { user } = useAuth();

    const canBroadcast = hasPerm(user, 'manage_broadcast');
    const canSchedule = hasPerm(user, 'broadcast_schedule');
    const canReports = hasPerm(user, 'broadcast_reports');
    const canTemplates = hasPerm(user, 'manage_templates');
    const canRotators = hasPerm(user, 'manage_rotator');

    const hasCampaignTools = canBroadcast || canSchedule || canReports;
    const hasAssets = canTemplates || canRotators;

    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-row overflow-x-auto no-scrollbar gap-1.5 py-1 px-1 pb-1.5 w-full">
                {canBroadcast && <MenuItem to="create" icon={PlusCircle} label="Create Campaign" isCollapsed={false} />}
                {canSchedule && <MenuItem to="schedule" icon={Calendar} label="Jadwal" isCollapsed={false} />}
                {canReports && <MenuItem to="reports" icon={BarChart2} label="Reports" isCollapsed={false} />}
                {canBroadcast && <MenuItem to="upselling" icon={Repeat} label="Upselling" isCollapsed={false} />}
                {canTemplates && <MenuItem to="templates" icon={FileText} label="Templates" isCollapsed={false} />}
                {canTemplates && <MenuItem to="meta-templates" icon={LayoutTemplate} label="Meta Templates" isCollapsed={false} />}
                {canRotators && <MenuItem to="rotators" icon={RefreshCw} label="Rotators" isCollapsed={false} />}
                {canBroadcast && <MenuItem to="settings" icon={Bot} label="Bot & Settings" isCollapsed={false} />}
                {canBroadcast && <MenuItem to="tutorial" icon={HelpCircle} label="Tutorial" isCollapsed={false} />}
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Categorized Sidebar */}
            <div className="hidden md:flex md:flex-col">
                {hasCampaignTools && (
                    <div className="mb-4 px-1">
                        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Campaign Tools</p>}
                        {canBroadcast && <MenuItem to="create" icon={PlusCircle} label="Create Campaign" isCollapsed={isCollapsed} />}
                        {canSchedule && <MenuItem to="schedule" icon={Calendar} label="Jadwal Broadcast" isCollapsed={isCollapsed} />}
                        {canReports && <MenuItem to="reports" icon={BarChart2} label="Broadcast Reports" isCollapsed={isCollapsed} />}
                        {canBroadcast && <MenuItem to="upselling" icon={Repeat} label="Upselling Campaign" isCollapsed={isCollapsed} />}
                    </div>
                )}

                {hasAssets && (
                    <div className="mb-4 px-1">
                        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Assets</p>}
                        {canTemplates && <MenuItem to="templates" icon={FileText} label="Templates" isCollapsed={isCollapsed} />}
                        {canTemplates && <MenuItem to="meta-templates" icon={LayoutTemplate} label="Meta Templates" isCollapsed={isCollapsed} />}
                        {canRotators && <MenuItem to="rotators" icon={RefreshCw} label="Rotators" isCollapsed={isCollapsed} />}
                    </div>
                )}

                {canBroadcast && (
                    <div className="px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                        <MenuItem to="settings" icon={Bot} label="Bot & Settings" isCollapsed={isCollapsed} />
                        <MenuItem to="tutorial" icon={HelpCircle} label="Tutorial" isCollapsed={isCollapsed} />
                    </div>
                )}
            </div>
        </div>
    );
}
