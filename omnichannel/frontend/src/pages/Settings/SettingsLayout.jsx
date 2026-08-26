import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SettingsSubMenu from './SettingsSubMenu';
import { X, Menu, ChevronRight, ChevronLeft } from 'lucide-react';

// Map routes to display names
const routeNames = {
    'quick-replies': 'Quick Replies',
    'custom-fields': 'Custom Fields',
    'team': 'Team & Anggota',
    'roles': 'Role & Akses',
    'divisions': 'Divisi',
    'license': 'Lisensi Domain',
    'auto-reply': 'Auto Reply',
    'auto-label': 'Auto Label',
    'workflow-rules': 'Workflow Rules',
    'auto-archive': 'Auto Archive',
    'wa-templates': 'WA Template',
    'inboxes': 'Kotak Masuk Terpisah',
    'assignment': 'Auto Assignment',
    'working-hours': 'Jam Operasional',
    'sla': 'Kebijakan SLA',
    'device-data': 'Device Data',
    'profile': 'Profile',
    'billing': 'Billing',
    'webhook': 'Webhook Settings',
    'email': 'Email Settings',
};

export default function SettingsLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(
        localStorage.getItem('settings_mobile_menu_open') === 'true'
    );
    const location = useLocation();

    // Get current page name from route
    const getCurrentPageName = () => {
        const path = location.pathname.split('/').pop();
        return routeNames[path] || path?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Settings';
    };

    // Persist mobile menu state
    useEffect(() => {
        localStorage.setItem('settings_mobile_menu_open', isMobileMenuOpen.toString());
    }, [isMobileMenuOpen]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
            {/* Mobile Header with Breadcrumb */}
            <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center justify-between">
                <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 bg-white text-gray-500 rounded-full shadow-md items-center justify-center border border-gray-200 hover:scale-110 hover:text-orange-500 transition-transform cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
                        </div>
                        <div className="p-4">
                            <SettingsSubMenu isCollapsed={isCollapsed} />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-dark-border overflow-hidden">
                    {/* Desktop Breadcrumb */}
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800/50">
                        <nav className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Settings</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="font-bold text-gray-800 dark:text-white">{getCurrentPageName()}</span>
                        </nav>
                    </div>
                    <Outlet />
                </main>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden p-4">
                <main className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-dark-border overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
