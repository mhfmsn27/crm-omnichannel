import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Users, Zap, ArrowRight, Package,
    UserCheck, Clock, Webhook, ShieldAlert, Mail, Tag,
    ShoppingCart, Shield, Archive, Headphones, Bot, Link2, Settings2, Key, MessageSquare, Building2, Inbox, Type, LayoutTemplate, Workflow, Smartphone
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

// Helper to check permission - matches backend permissionMiddleware.js logic
const hasPerm = (user, perm) => {
    if (!user) return false;
    if (user.role === 'admin_member' || user.role === 'super_admin') return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(perm);
};

export default function SettingsSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin_member' || user?.role === 'super_admin';
    const canManageTeam = isAdmin || hasPerm(user, 'manage_team');

    return (
        <div className="flex flex-col">
            {/* ==================== */}
            {/* WORKSPACE              */}
            {/* ==================== */}
            <SectionHeader icon={Users} label="Workspace"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                <MenuItem to="quick-replies" icon={MessageSquare} label="Global Quick Replies"  isCollapsed={isCollapsed} />
                {isAdmin && <MenuItem to="custom-fields" icon={Type} label="Custom Fields"  isCollapsed={isCollapsed} />}
                {canManageTeam && <MenuItem to="team" icon={Users} label="Team & Anggota"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="roles" icon={Key} label="Role & Akses"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="divisions" icon={Building2} label="Divisi"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="license" icon={Shield} label="Lisensi Domain" badge="NEW"  isCollapsed={isCollapsed} />}
            </div>

            {/* ==================== */}
            {/* AUTOMASI             */}
            {/* ==================== */}
            <SectionHeader icon={Zap} label="Automasi"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                {isAdmin && <MenuItem to="auto-reply" icon={Zap} label="Auto Reply"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="auto-label" icon={Tag} label="Auto Label"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="workflow-rules" icon={Workflow} label="Workflow Rules"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="auto-archive" icon={Archive} label="Auto Archive"  isCollapsed={isCollapsed} />}
                <MenuItem to="wa-templates" icon={LayoutTemplate} label="WA Template" isCollapsed={isCollapsed} />
            </div>

            {/* ==================== */}
            {/* CUSTOMER SERVICE      */}
            {/* ==================== */}
            <SectionHeader icon={Headphones} label="Customer Service"  isCollapsed={isCollapsed} />
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 mb-3">
                {isAdmin && <MenuItem to="inboxes" icon={Inbox} label="Kotak Masuk Terpisah"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="assignment" icon={UserCheck} label="Auto Assignment"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="working-hours" icon={Clock} label="Jam Operasional"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="sla" icon={ShieldAlert} label="Kebijakan SLA"  isCollapsed={isCollapsed} />}
                {isAdmin && <MenuItem to="device-data" icon={Smartphone} label="Device Data"  isCollapsed={isCollapsed} />}
            </div>

            {/* ==================== */}
            {/* INFO               */}
            {/* ==================== */}
            <div className="mt-auto pt-3 border-t border-gray-200 dark:border-slate-700">
                <p className="text-[10px] text-gray-400 text-center mb-2">
                    CRMHub v2.0 • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}