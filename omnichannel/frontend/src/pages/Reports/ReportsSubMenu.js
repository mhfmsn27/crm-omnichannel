import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    BarChart2, Users, Star, History, Megaphone, Bot, FileText, Activity, ArrowRight,
    TrendingUp, Link2, GitBranch, Trophy, Zap, Target
} from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, badge , isCollapsed}) => (
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
        {!isCollapsed && (
        <div className="flex items-center gap-2">
            {badge && (
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded font-medium">
                    {badge}
                </span>
            )}
            {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />}
        </div>
        )}
    </NavLink>
);

const SectionHeader = ({ icon: Icon, label, badge , isCollapsed}) => (
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
    return (
        <div className="flex flex-col">
            {/* ==================== */}
            {/* ANALITIK UTAMA       */}
            {/* ==================== */}
            <SectionHeader icon={BarChart2} label="Analitik"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="general" icon={BarChart2} label="Overview"  isCollapsed={isCollapsed} />
                <MenuItem to="agent-performance" icon={Users} label="Performa Agen"  isCollapsed={isCollapsed} />
                <MenuItem to="sla-csat" icon={Star} label="SLA & CSAT"  isCollapsed={isCollapsed} />
                <MenuItem to="responder-history" icon={History} label="Riwayat Agen"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* ADVANCED ANALYTICS   */}
            {/* ==================== */}
            <SectionHeader icon={Target} label="Advanced Analytics" badge="NEW"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="advanced-analytics" icon={BarChart2} label="Dashboard Analytics"  isCollapsed={isCollapsed} />
                <MenuItem to="attribution" icon={Link2} label="Source Attribution"  isCollapsed={isCollapsed} />
                <MenuItem to="customer-journey" icon={GitBranch} label="Customer Journey"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* SALES & MARKETING   */}
            {/* ==================== */}
            <SectionHeader icon={TrendingUp} label="Sales & Marketing"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="sales-kpi" icon={TrendingUp} label="Sales KPI" badge="NEW" isCollapsed={isCollapsed} />
                <MenuItem to="sales-pipeline" icon={TrendingUp} label="Sales Pipeline"  isCollapsed={isCollapsed} />
                <MenuItem to="gamification" icon={Trophy} label="Team Gamification" badge="NEW"  isCollapsed={isCollapsed} />
                <MenuItem to="broadcast" icon={Megaphone} label="Broadcast"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* CHANNEL & TOOLS    */}
            {/* ==================== */}
            <SectionHeader icon={Bot} label="Channel & Tools"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="chatbot" icon={Bot} label="Chatbot AI"  isCollapsed={isCollapsed} />
                <MenuItem to="chat-form" icon={FileText} label="Chat Form"  isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* SYSTEM LOGS        */}
            {/* ==================== */}
            <SectionHeader icon={Activity} label="System"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2">
                <MenuItem to="api-logs" icon={Activity} label="Log API"  isCollapsed={isCollapsed} />
            </div>
        </div>
    );
}