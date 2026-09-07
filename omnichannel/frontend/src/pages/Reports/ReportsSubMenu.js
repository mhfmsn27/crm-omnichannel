import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    BarChart2, Users, Star, History, Megaphone, Bot, FileText, Activity, ArrowRight,
    TrendingUp, Link2, GitBranch, Trophy, Zap, Target, Tv, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';

const MenuItem = ({ to, icon: Icon, label, badge, isCollapsed }) => (
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
        <div className="flex items-center gap-1.5 ml-2">
            {badge && (
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 text-[9px] rounded font-semibold uppercase">
                    {badge}
                </span>
            )}
            {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0" />}
        </div>
    </NavLink>
);

const SectionHeader = ({ icon: Icon, label, badge, isCollapsed }) => (
    <div className={`flex items-center gap-2 px-1 mb-2 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? label : ''}>
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>}
        {badge && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded font-medium">
                {badge}
            </span>
        )}
    </div>
);

export default function ReportsSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    const location = useLocation();

    // Section 1 items
    const s1_general = hasPerm(user, 'view_reports');
    const s1_csat = hasPerm(user, 'view_csat');
    const hasSection1 = s1_general || s1_csat;

    // Section 2 items (Advanced Analytics)
    const s2_analytics = hasPerm(user, 'view_analytics');
    const s2_wallboard = hasPerm(user, 'view_wallboard');
    const hasSection2 = s2_analytics || s2_wallboard;

    // Section 3 items (Sales & Marketing)
    const s3_kpi = hasPerm(user, 'view_reports');
    const s3_pipeline = hasPerm(user, 'manage_pipeline');
    const s3_gamification = hasPerm(user, 'view_gamification');
    const s3_broadcast = hasPerm(user, 'broadcast_reports');
    const hasSection3 = s3_kpi || s3_pipeline || s3_gamification || s3_broadcast;

    // Section 4 items (Channel & Tools)
    const s4_chatbot = hasPerm(user, 'manage_chatbot');
    const s4_chatform = hasPerm(user, 'manage_chatform');
    const hasSection4 = s4_chatbot || s4_chatform;

    // Section 5 items (System)
    const s5_api = hasPerm(user, 'manage_api');

    // Auto-detect mobile active category
    const detectCategory = (path) => {
        if (path.includes('advanced-analytics') || path.includes('attribution') || path.includes('customer-journey') || path.includes('wallboard')) return 'advanced';
        if (path.includes('sales-kpi') || path.includes('sales-pipeline') || path.includes('gamification') || path.includes('broadcast')) return 'sales';
        if (path.includes('chatbot') || path.includes('chat-form')) return 'tools';
        if (path.includes('api-logs')) return 'system';
        return 'analitik';
    };

    const [mobileCategory, setMobileCategory] = useState(() => detectCategory(location.pathname));

    useEffect(() => {
        setMobileCategory(detectCategory(location.pathname));
    }, [location.pathname]);

    const categories = [
        { id: 'all', label: 'Semua' },
        ...(hasSection1 ? [{ id: 'analitik', label: 'Analitik' }] : []),
        ...(hasSection2 ? [{ id: 'advanced', label: 'Advanced' }] : []),
        ...(hasSection3 ? [{ id: 'sales', label: 'Sales' }] : []),
        ...(hasSection4 ? [{ id: 'tools', label: 'Tools' }] : []),
        ...(s5_api ? [{ id: 'system', label: 'System' }] : [])
    ];

    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Category Filter & Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-col gap-2 w-full mb-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x px-0.5 py-0.5">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setMobileCategory(cat.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                mobileCategory === cat.id
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Submenu Item Pills */}
                <div className="flex flex-row overflow-x-auto no-scrollbar scroll-smooth touch-pan-x gap-1.5 py-1 px-1 pb-1.5 w-full">
                    {(mobileCategory === 'all' || mobileCategory === 'analitik') && (
                        <>
                            {s1_general && <MenuItem to="general" icon={BarChart2} label="Overview" isCollapsed={false} />}
                            {s1_general && <MenuItem to="agent-performance" icon={Users} label="Performa Agen" isCollapsed={false} />}
                            {s1_general && <MenuItem to="sla-csat" icon={Star} label="SLA" isCollapsed={false} />}
                            {s1_csat && <MenuItem to="csat" icon={Star} label="CSAT" badge="PRO" isCollapsed={false} />}
                            {s1_general && <MenuItem to="responder-history" icon={History} label="Riwayat" isCollapsed={false} />}
                        </>
                    )}
                    {(mobileCategory === 'all' || mobileCategory === 'advanced') && (
                        <>
                            {s2_analytics && <MenuItem to="advanced-analytics" icon={BarChart2} label="Dashboard" isCollapsed={false} />}
                            {s2_analytics && <MenuItem to="attribution" icon={Link2} label="Attribution" isCollapsed={false} />}
                            {s2_analytics && <MenuItem to="customer-journey" icon={GitBranch} label="Journey" isCollapsed={false} />}
                            {s2_wallboard && <MenuItem to="wallboard" icon={Tv} label="Wallboard" badge="LIVE" isCollapsed={false} />}
                        </>
                    )}
                    {(mobileCategory === 'all' || mobileCategory === 'sales') && (
                        <>
                            {s3_kpi && <MenuItem to="sales-kpi" icon={TrendingUp} label="Sales KPI" isCollapsed={false} />}
                            {s3_pipeline && <MenuItem to="sales-pipeline" icon={TrendingUp} label="Pipeline" isCollapsed={false} />}
                            {s3_gamification && <MenuItem to="gamification" icon={Trophy} label="Gamification" isCollapsed={false} />}
                            {s3_broadcast && <MenuItem to="broadcast" icon={Megaphone} label="Broadcast" isCollapsed={false} />}
                        </>
                    )}
                    {(mobileCategory === 'all' || mobileCategory === 'tools') && (
                        <>
                            {s4_chatbot && <MenuItem to="chatbot" icon={Bot} label="Chatbot" isCollapsed={false} />}
                            {s4_chatform && <MenuItem to="chat-form" icon={FileText} label="Chat Form" isCollapsed={false} />}
                        </>
                    )}
                    {(mobileCategory === 'all' || mobileCategory === 'system') && (
                        <>
                            {s5_api && <MenuItem to="api-logs" icon={Activity} label="Log API" isCollapsed={false} />}
                        </>
                    )}
                </div>
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Grouped Sidebar */}
            <div className="hidden md:flex md:flex-col">
                {/* ANALITIK UTAMA */}
                {hasSection1 && (
                    <>
                        <SectionHeader icon={BarChart2} label="Analitik" isCollapsed={isCollapsed} />
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                            {s1_general && <MenuItem to="general" icon={BarChart2} label="Overview" isCollapsed={isCollapsed} />}
                            {s1_general && <MenuItem to="agent-performance" icon={Users} label="Performa Agen" isCollapsed={isCollapsed} />}
                            {s1_general && <MenuItem to="sla-csat" icon={Star} label="SLA Compliance" isCollapsed={isCollapsed} />}
                            {s1_csat && <MenuItem to="csat" icon={Star} label="Survei CSAT" badge="PRO" isCollapsed={isCollapsed} />}
                            {s1_general && <MenuItem to="responder-history" icon={History} label="Riwayat Agen" isCollapsed={isCollapsed} />}
                        </div>
                    </>
                )}

                {/* ADVANCED ANALYTICS */}
                {hasSection2 && (
                    <>
                        <SectionHeader icon={Target} label="Advanced Analytics" badge="NEW" isCollapsed={isCollapsed} />
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                            {s2_analytics && <MenuItem to="advanced-analytics" icon={BarChart2} label="Dashboard Analytics" isCollapsed={isCollapsed} />}
                            {s2_analytics && <MenuItem to="attribution" icon={Link2} label="Source Attribution" isCollapsed={isCollapsed} />}
                            {s2_analytics && <MenuItem to="customer-journey" icon={GitBranch} label="Customer Journey" isCollapsed={isCollapsed} />}
                            {s2_wallboard && <MenuItem to="wallboard" icon={Tv} label="Live Wallboard TV" badge="LIVE" isCollapsed={isCollapsed} />}
                        </div>
                    </>
                )}

                {/* SALES & MARKETING */}
                {hasSection3 && (
                    <>
                        <SectionHeader icon={TrendingUp} label="Sales & Marketing" isCollapsed={isCollapsed} />
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                            {s3_kpi && <MenuItem to="sales-kpi" icon={TrendingUp} label="Sales KPI" badge="NEW" isCollapsed={isCollapsed} />}
                            {s3_pipeline && <MenuItem to="sales-pipeline" icon={TrendingUp} label="Sales Pipeline" isCollapsed={isCollapsed} />}
                            {s3_gamification && <MenuItem to="gamification" icon={Trophy} label="Team Gamification" badge="NEW" isCollapsed={isCollapsed} />}
                            {s3_broadcast && <MenuItem to="broadcast" icon={Megaphone} label="Broadcast" isCollapsed={isCollapsed} />}
                        </div>
                    </>
                )}

                {/* CHANNEL & TOOLS */}
                {hasSection4 && (
                    <>
                        <SectionHeader icon={Bot} label="Channel & Tools" isCollapsed={isCollapsed} />
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3 border border-gray-100 dark:border-slate-800/60">
                            {s4_chatbot && <MenuItem to="chatbot" icon={Bot} label="Chatbot AI" isCollapsed={isCollapsed} />}
                            {s4_chatform && <MenuItem to="chat-form" icon={FileText} label="Chat Form" isCollapsed={isCollapsed} />}
                        </div>
                    </>
                )}

                {/* SYSTEM LOGS */}
                {s5_api && (
                    <>
                        <SectionHeader icon={Activity} label="System" isCollapsed={isCollapsed} />
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 border border-gray-100 dark:border-slate-800/60">
                            <MenuItem to="api-logs" icon={Activity} label="Log API" isCollapsed={isCollapsed} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}