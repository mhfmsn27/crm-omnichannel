import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Users, Zap, ArrowRight, Package,
    UserCheck, Clock, Webhook, ShieldAlert, Mail, Tag,
    ShoppingCart, Shield, Archive, Headphones, Bot, Link2, Settings2, Key, MessageSquare, Building2, Inbox, Type, LayoutTemplate, Workflow, Smartphone,
    Search, ChevronDown, ChevronRight, Star, Crown, Activity
} from 'lucide-react';

// Helper to check permission
const hasPerm = (user, perm) => {
    if (!user) return false;
    if (user.role === 'admin_member' || user.role === 'super_admin') return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(perm);
};

/**
 * CollapsibleGroup - Group of menu items that can be collapsed
 */
function CollapsibleGroup({ title, icon: Icon, children, defaultOpen = false, badge }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors group"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {badge && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] rounded font-medium">
                            {badge}
                        </span>
                    )}
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>
            {isOpen && (
                <div className="mt-1 space-y-1 pl-2">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * MenuItem - Individual menu item
 */
function MenuItem({ to, icon: Icon, label, badge, isCollapsed }) {
    return (
        <NavLink
            to={to}
            title={isCollapsed ? label : ''}
            className={({ isActive }) =>
                `w-full mb-1 px-3 py-2.5 rounded-lg border text-left shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-3 group ${
                    isActive
                        ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300'
                        : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300 dark:hover:bg-slate-800'
                }`
            }
        >
            <div className="bg-gray-100 p-1.5 rounded-md text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-orange-900/30 dark:group-hover:text-orange-400">
                <Icon className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="font-bold text-xs truncate flex-1">{label}</span>}
            {badge && (
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded font-medium">
                    {badge}
                </span>
            )}
            {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />}
        </NavLink>
    );
}

/**
 * SearchInput - Search for settings
 */
function SearchInput({ value, onChange }) {
    return (
        <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
    );
}

export default function SettingsSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const isAdmin = user?.role === 'admin_member' || user?.role === 'super_admin';
    const canManageTeam = isAdmin || hasPerm(user, 'manage_team');

    // All menu items organized by group
    const allItems = {
        workspace: [
            { to: "quick-replies", icon: MessageSquare, label: "Global Quick Replies" },
            ...(isAdmin ? [{ to: "custom-fields", icon: Type, label: "Custom Fields" }] : []),
            ...(canManageTeam ? [{ to: "team", icon: Users, label: "Team & Anggota" }] : []),
            ...(isAdmin ? [
                { to: "roles", icon: Key, label: "Role & Akses" },
                { to: "divisions", icon: Building2, label: "Divisi" },
                { to: "system-health", icon: Activity, label: "Server Health & Backup", badge: "PRO" },
            ] : []),
            ...(isAdmin ? [{ to: "license", icon: Shield, label: "Lisensi Domain", badge: "NEW" }] : []),
        ],
        automation: [
            ...(isAdmin ? [
                { to: "auto-reply", icon: Zap, label: "Auto Reply" },
                { to: "auto-label", icon: Tag, label: "Auto Label" },
                { to: "workflow-rules", icon: Workflow, label: "Workflow Rules" },
                { to: "auto-archive", icon: Archive, label: "Auto Archive" },
            ] : []),
            { to: "wa-templates", icon: LayoutTemplate, label: "WA Template" },
        ],
        customerService: [
            ...(isAdmin ? [
                { to: "inboxes", icon: Inbox, label: "Kotak Masuk Terpisah" },
                { to: "assignment", icon: UserCheck, label: "Auto Assignment" },
                { to: "working-hours", icon: Clock, label: "Jam Operasional" },
                { to: "sla", icon: ShieldAlert, label: "Kebijakan SLA" },
                { to: "device-data", icon: Smartphone, label: "Device Data" },
            ] : []),
        ],
    };

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return allItems;

        const query = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(allItems).forEach(([group, items]) => {
            const matchingItems = items.filter(item =>
                item.label.toLowerCase().includes(query)
            );
            if (matchingItems.length > 0) {
                filtered[group] = matchingItems;
            }
        });

        return filtered;
    }, [searchQuery, user]);

    // Group titles and icons
    const groupConfig = {
        workspace: { title: "Workspace", icon: Users },
        automation: { title: "Automasi", icon: Zap },
        customerService: { title: "Customer Service", icon: Headphones },
    };

    // Check if we have any items in a group
    const hasItems = (groupKey) => {
        return filteredItems[groupKey]?.length > 0;
    };

    if (isCollapsed) {
        return (
            <div className="flex flex-col h-full">
                {/* Collapsed view - simple icons */}
                <div className="space-y-1 px-1">
                    {Object.entries(allItems).map(([groupKey, items]) => (
                        items.slice(0, 2).map((item, idx) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                title={item.label}
                                className={({ isActive }) =>
                                    `w-full p-2.5 rounded-lg flex items-center justify-center transition-colors ${
                                        isActive
                                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                            </NavLink>
                        ))
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <SearchInput value={searchQuery} onChange={setSearchQuery} />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {/* Workspace Group */}
                {hasItems('workspace') && (
                    <CollapsibleGroup
                        title={groupConfig.workspace.title}
                        icon={groupConfig.workspace.icon}
                        defaultOpen={searchQuery.trim() || true}
                    >
                        {filteredItems.workspace?.map(item => (
                            <MenuItem key={item.to} {...item} />
                        ))}
                    </CollapsibleGroup>
                )}

                {/* Automation Group */}
                {hasItems('automation') && (
                    <CollapsibleGroup
                        title={groupConfig.automation.title}
                        icon={groupConfig.automation.icon}
                        defaultOpen={searchQuery.trim() || true}
                    >
                        {filteredItems.automation?.map(item => (
                            <MenuItem key={item.to} {...item} />
                        ))}
                    </CollapsibleGroup>
                )}

                {/* Customer Service Group */}
                {hasItems('customerService') && (
                    <CollapsibleGroup
                        title={groupConfig.customerService.title}
                        icon={groupConfig.customerService.icon}
                        defaultOpen={searchQuery.trim() || true}
                    >
                        {filteredItems.customerService?.map(item => (
                            <MenuItem key={item.to} {...item} />
                        ))}
                    </CollapsibleGroup>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-gray-200 dark:border-slate-700">
                <p className="text-[10px] text-gray-400 text-center">
                    CRMHub v2.0 • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
