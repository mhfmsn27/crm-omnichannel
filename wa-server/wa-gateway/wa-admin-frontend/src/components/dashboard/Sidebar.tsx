'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, LogOut, BookText, Terminal, MessageSquare } from 'lucide-react'; 
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/playground', icon: Terminal, label: 'Playground' },
  { href: '/documentation', icon: BookText, label: 'API Docs' }, 
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="flex flex-col w-20 h-screen border-r border-white/5 bg-black/20 backdrop-blur-md z-50 transition-all duration-300 relative">
        
        {/* Logo Area */}
        <div className="flex items-center justify-center h-20 border-b border-white/5 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <MessageSquare className="w-6 h-6 text-white" />
            </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col flex-1 gap-6 px-2">
            {navItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                
                return (
                    <div key={item.label} className="relative group flex items-center justify-center">
                        <Link
                            href={item.href}
                            className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 
                                ${isActive 
                                    ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                                    : 'text-gray-500 hover:text-gray-200 hover:scale-110'
                                }
                            `}
                        >
                            <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                        </Link>
                        
                        {/* Custom Tooltip */}
                        <div className="absolute left-16 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 pointer-events-none z-50">
                            <div className="bg-gray-900 text-gray-100 text-xs font-medium px-3 py-1.5 rounded-md shadow-xl border border-gray-700 flex items-center whitespace-nowrap">
                                {item.label}
                                {/* Arrow */}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 transform rotate-45"></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        
        {/* Logout */}
        <div className="mb-8 px-2 flex justify-center">
          <button
            onClick={() => logout()}
            className="relative group w-12 h-12 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all hover:scale-110"
          >
            <LogOut className="w-6 h-6" />
             {/* Tooltip Logout */}
             <div className="absolute left-16 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 pointer-events-none z-50">
                <div className="bg-red-900/90 text-red-100 text-xs font-medium px-3 py-1.5 rounded-md shadow-xl border border-red-800 flex items-center whitespace-nowrap">
                    Logout
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-red-900/90 border-l border-b border-red-800 transform rotate-45"></div>
                </div>
            </div>
          </button>
        </div>
    </aside>
  );
}
