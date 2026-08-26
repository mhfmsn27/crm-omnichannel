import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import axios from 'axios';
import { WifiOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { HeaderProvider } from '../../context/HeaderContext'; // Import Provider

export default function MainLayout({ children }) {
    const location = useLocation();
    const socket = useSocket();
    const [disconnectedDevices, setDisconnectedDevices] = useState([]);

    // Sidebar expanded/collapsed state - persisted in localStorage
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        return localStorage.getItem('sidebar_expanded') !== 'false';
    });

    const toggleSidebar = () => {
        setIsSidebarExpanded(prev => {
            const next = !prev;
            localStorage.setItem('sidebar_expanded', String(next));
            return next;
        });
    };
    
    // Logic to exclude Header on Inbox or any other specific full-screen pages
    const isInbox = location.pathname.startsWith('/inbox');

    // Check Device Status
    const checkDevices = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/devices');
            // Filter: Unofficial AND Disconnected (Case Insensitive)
            const offline = res.data.filter(d =>
                d.type !== 'official' &&
                String(d.status).toLowerCase() === 'disconnected'
            );
            setDisconnectedDevices(offline);
        } catch (e) {
            console.error("Failed to check devices");
        }
    }, []);

    useEffect(() => {
        checkDevices();
    }, []);

    // Listen for real-time status updates to clear/show the banner instantly
    useEffect(() => {
        if (!socket || !socket.on) return;

        // Re-check on connection to ensure sync
        socket.on('connect', () => {
            checkDevices();
        });

        socket.on('device_status_update', () => {
            checkDevices();
        });

        return () => {
            if (socket && socket.off) {
                socket.off('connect');
                socket.off('device_status_update');
            }
        };
    }, [socket, checkDevices]);

    return (
        <HeaderProvider>
            <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-800 dark:text-slate-50 transition-colors duration-200">
                <Sidebar isExpanded={isSidebarExpanded} onToggle={toggleSidebar} />

                {/* Margin follows sidebar width: w-56 (expanded) or w-16 (collapsed) */}
                <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 min-w-0 ${isSidebarExpanded ? 'md:ml-56' : 'md:ml-16'}`}>
                    
                    {/* Sticky Container for Alert & Header */}
                    {!isInbox && (
                        <div className="sticky top-0 z-40 w-full">
                            {/* DISCONNECTED ALERT BAR */}
                            {disconnectedDevices.length > 0 && (
                                <div className="bg-red-600 text-white px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium shadow-md">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
                                        <span className="truncate">
                                            <strong>Warning:</strong> Device
                                            <span className="mx-1 font-bold underline decoration-red-300 underline-offset-2">
                                                {disconnectedDevices.map(d => d.name).join(', ')}
                                            </span>
                                            is disconnected from WhatsApp.
                                        </span>
                                    </div>
                                    <Link
                                        to="/integrations/whatsapp"
                                        className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1 sm:shrink-0 w-full sm:w-auto"
                                    >
                                        Reconnect Now
                                    </Link>
                                </div>
                            )}

                            {/* Header */}
                            <Header />
                        </div>
                    )}
                    
                    <div className="flex-1 relative">
                        {children}
                    </div>
                </div>
            </div>
        </HeaderProvider>
    );
}
