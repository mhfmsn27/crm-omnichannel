import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Users, MapPin, FileText, Tv } from 'lucide-react';
import { triggerHaptic } from '../../utils/nativeBridge';

export default function MobileBottomNav() {
    const location = useLocation();

    // Do not show on fullscreen wallboard or auth login pages
    if (location.pathname === '/wallboard' || location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    const navItems = [
        { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
        { to: '/contacts', icon: Users, label: 'Kontak' },
        { to: '/sales-visits', icon: MapPin, label: 'Sales GPS' },
        { to: '/invoicing', icon: FileText, label: 'Faktur' },
        { to: '/reports/wallboard', icon: Tv, label: 'TV Mode' }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 pb-safe shadow-2xl">
            <div className="grid grid-cols-5 h-14">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.to);

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => triggerHaptic('light')}
                            className={`flex flex-col items-center justify-center transition-all ${
                                isActive 
                                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px]">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
