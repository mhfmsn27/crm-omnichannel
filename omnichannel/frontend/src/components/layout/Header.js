import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios'; // Import axios
import { Link } from 'react-router-dom';
import {
    Bell, HelpCircle, FileText, Moon, Sun,
    Settings, BarChart2, Package, Users,
    Smartphone, Code, LogOut, ChevronDown,
    CreditCard, User, DollarSign, CheckCheck, Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getApiUrl } from '../../config/api';
import { getInitialsAvatar } from '../../utils/avatar';
import { useHeader } from '../../context/HeaderContext'; // Import Hook
import { useSocket } from '../../context/SocketContext'; // Import Socket
import ThemeSelectorModal from '../common/ThemeSelectorModal';

const GridMenuItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-dark-surface border border-transparent hover:border-indigo-100 dark:hover:border-dark-border transition-all group">
        <div className="w-10 h-10 bg-gray-50 dark:bg-dark-bg group-hover:bg-white dark:group-hover:bg-dark-surface rounded-full flex items-center justify-center mb-2 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 shadow-sm">
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-indigo-700 text-center leading-tight">{label}</span>
    </Link>
);

const ListMenuItem = ({ icon: Icon, label, onClick, toggle }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-sm text-gray-600 dark:text-gray-300 font-medium"
    >
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-400" />
            <span>{label}</span>
        </div>
        {toggle}
    </button>
);

export default function Header() {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { title } = useHeader(); // Get Title
    const socket = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    // Notification Dropdown State
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const notificationRef = useRef(null);

    const dropdownRef = useRef(null);
    const [isOnline, setIsOnline] = useState(user?.is_online || false);

    // Sync state with user prop
    useEffect(() => {
        if (user) setIsOnline(user.is_online);
    }, [user]);

    const toggleOnline = async () => {
        const newState = !isOnline;
        setIsOnline(newState); // Optimistic update
        try {
            await axios.post('/api/auth/toggle-online', { is_online: newState });
            // Optionally update user context if needed, but simple state is fine for now
        } catch (e) {
            console.error("Failed to toggle online status", e);
            setIsOnline(!newState); // Revert
        }
    };

    // Fetch Unread Count
    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get('/api/app/inbox/count');
            setUnreadCount(res.data.count);
        } catch (e) {
            console.error("Failed to fetch unread count", e);
        }
    };

    // Fetch Notification List (Unread Conversations)
    const fetchNotifications = async () => {
        setLoadingNotifications(true);
        try {
            // Using existing endpoint with filter
            const res = await axios.get('/api/app/inbox/conversations', {
                params: {
                    filter_by: 'unread',
                    sort_by: 'newest'
                    // Limit is hardcoded to 50 in controller, which is fine
                }
            });
            // We only show top 5-10 in dropdown usually
            setNotifications(res.data.conversations.slice(0, 10));
        } catch (e) {
            console.error("Failed to fetch notifications", e);
        } finally {
            setLoadingNotifications(false);
        }
    };

    // Trigger fetch when dropdown opens
    useEffect(() => {
        if (isNotificationOpen) {
            fetchNotifications();
        }
    }, [isNotificationOpen]);

    // Socket Listeners
    useEffect(() => {
        fetchUnreadCount();

        const handleConversationRead = ({ conversationId }) => {
            fetchUnreadCount();
            if (conversationId) {
                setNotifications(prev => prev.filter(n => String(n.id) !== String(conversationId)));
            }
        };

        if (socket && socket.on) {
            socket.on('new_message', fetchUnreadCount);
            socket.on('conversation_read', handleConversationRead);
            socket.on('conversation_status_update', fetchUnreadCount);
            socket.on('conversation_assigned', fetchUnreadCount); // Just in case
        }
        return () => {
            if (socket && socket.off) {
                socket.off('new_message', fetchUnreadCount);
                socket.off('conversation_read', handleConversationRead);
                socket.off('conversation_status_update', fetchUnreadCount);
                socket.off('conversation_assigned', fetchUnreadCount);
            }
        };
    }, [socket]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        setIsOpen(false);
        logout();
    };

    const handleMarkAsRead = async (e, convId) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Optimistic UI update
        setNotifications(prev => prev.filter(n => String(n.id) !== String(convId)));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        try {
            await axios.put(`/api/app/inbox/conversations/${convId}/read`);
        } catch (error) {
            console.error("Failed to mark as read", error);
            // On failure, re-fetch the real count
            fetchUnreadCount();
        }
    };

    const handleMarkAllAsRead = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentNotifications = [...notifications];
        // Optimistic UI update
        setNotifications([]);
        setUnreadCount(0);
        
        try {
            // Fire individual requests in background
            await Promise.all(currentNotifications.map(n => 
                axios.put(`/api/app/inbox/conversations/${n.id}/read`).catch(() => {})
            ));
        } catch (error) {
            console.error("Failed to mark all as read", error);
            fetchUnreadCount();
        }
    };    return (
        <header className="h-14 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors duration-200">
            {/* Left Side: Page Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {title && (
                    <h1 className="text-base md:text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight truncate min-w-0">
                        {title}
                    </h1>
                )}
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Theme Palette Switcher Button */}
                <button
                    onClick={() => setIsThemeModalOpen(true)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/80 dark:hover:bg-dark-bg/80 rounded-xl transition-colors text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-sky-400"
                    title="Pilih Tema & Tampilan UI"
                    aria-label="Pilih Tema"
                >
                    <Palette className="w-5 h-5" />
                </button>

                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/80 dark:hover:bg-dark-bg/80 rounded-xl transition-colors relative group text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5 transition-colors" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-dark-surface shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] max-w-[360px] bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
                            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-bg">
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">Notifikasi</h4>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && notifications.length > 0 && (
                                        <button 
                                            onClick={handleMarkAllAsRead}
                                            className="text-[10px] text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                                        >
                                            Tandai Semua Dibaca
                                        </button>
                                    )}
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                                            {unreadCount} Baru
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto">
                                {loadingNotifications ? (
                                    <div className="p-4 text-center text-xs text-gray-500">Loading...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center gap-2">
                                        <Bell className="w-8 h-8 text-gray-200 dark:text-slate-700" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tidak ada pesan baru</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <Link
                                            key={notif.id}
                                            to={`/inbox?id=${notif.id}`}
                                            onClick={() => setIsNotificationOpen(false)}
                                            className="block p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 border-b border-gray-50 dark:border-slate-800 last:border-0 transition-colors group/notif"
                                        >
                                            <div className="flex gap-3">
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={notif.profile_pic_url || getInitialsAvatar(notif.contact_name)}
                                                        onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(notif.contact_name); }}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                        alt=""
                                                    />
                                                    {['whatsapp', 'messenger', 'instagram', 'telegram'].includes(notif.channel) && (
                                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-dark-surface rounded-full p-0.5">
                                                            <img src={`/icons/${notif.channel}.svg`} className="w-3.5 h-3.5" alt="" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2">{notif.contact_name}</p>
                                                        <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap group-hover/notif:hidden">
                                                            {new Date(notif.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => handleMarkAsRead(e, notif.id)}
                                                            className="text-gray-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 hidden group-hover/notif:block transition-colors"
                                                            title="Tandai sudah dibaca"
                                                        >
                                                            <CheckCheck className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-clamp-1">
                                                        {notif.last_message}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            <Link
                                to="/inbox"
                                onClick={() => setIsNotificationOpen(false)}
                                className="block p-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 dark:text-indigo-400 border-t border-gray-100 dark:border-dark-border transition-colors"
                            >
                                Lihat Semua Pesan
                            </Link>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 dark:bg-dark-border hidden md:block"></div>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 focus:outline-none group min-h-[44px] px-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.name || 'User'}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <p className="text-xs text-gray-500 dark:text-dark-muted">{isOnline ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                        <div className="relative">
                            <img
                                src={user?.profile_pic_url ? getApiUrl(user.profile_pic_url) : getInitialsAvatar(user?.name)}
                                onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(user?.name); }}
                                alt="Profile"
                                className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 dark:border-dark-border group-hover:border-indigo-300 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white dark:border-dark-surface w-3 h-3 rounded-full"></div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] max-w-[380px] bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">

                            {/* 1. User Info Header - Hidden on Mobile */}
                            <div className="hidden md:flex p-5 border-b border-gray-100 dark:border-dark-border items-center gap-4 bg-gray-50/50 dark:bg-dark-bg/50">
                                <img
                                    src={user?.profile_pic_url ? getApiUrl(user.profile_pic_url) : getInitialsAvatar(user?.name)}
                                    onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(user?.name); }}
                                    className="w-12 h-12 rounded-full object-cover"
                                    alt=""
                                />
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{user?.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-dark-muted truncate">{user?.email}</p>
                                </div>
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>

                            {/* 2. Upgrade Banner - Hidden on Mobile */
                            /* <div className="hidden md:flex p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white mx-4 mt-4 rounded-xl flex-col gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
                                <p className="text-xs font-medium opacity-90">
                                    Nikmati pengalaman terbaik dengan berlangganan aplikasi kami. Dapatkan akses eksklusif ke fitur-fitur premium!
                                </p>
                                <Link to="/order" onClick={() => setIsOpen(false)} className="bg-white text-indigo-600 text-center py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Upgrade
                                </Link>
                            </div> */}

                            {/* 3. Grid Menu (The Box) - Hidden on Mobile, hidden for super_admin */}
                            {user?.role !== 'super_admin' && (
                            <div className="hidden md:grid p-4 grid-cols-3 gap-2">
                                {(user?.role === 'admin_member' ||
                                  (user?.role === 'agent' && user?.role_level >= 10 &&
                                   Array.isArray(user?.permissions) && user.permissions.includes('manage_team'))
                                ) && (
                                    <GridMenuItem to="/settings/team" icon={Users} label="Manage User" />
                                )}
                                {/* <GridMenuItem to="/order" icon={CreditCard} label="Affiliate/Paket" /> */}
                                {/* <GridMenuItem to="/reports" icon={BarChart2} label="Laporan" /> */}
                                {/* <GridMenuItem to="/tools/group-extractor" icon={Users} label="Grup WhatsApp" /> */}
                                <GridMenuItem to="/account/profile" icon={Settings} label="Pengaturan" />
                                <GridMenuItem to="/developer" icon={Code} label="API" />
                            </div>
                            )}

                            {/* 4. List Menu (Below Box) - Always Visible, No top border on mobile */}
                            <div className="md:border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/30">
                                <div className="py-1">
                                    <ListMenuItem
                                        icon={Palette}
                                        label="Personalisasi Tema UI"
                                        onClick={() => {
                                            setIsOpen(false);
                                            setIsThemeModalOpen(true);
                                        }}
                                    />
                                    <ListMenuItem
                                        icon={isDark ? Moon : Sun}
                                        label={isDark ? "Tema Gelap (On)" : "Tema Terang (On)"}
                                        onClick={toggleTheme}
                                        toggle={
                                            <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isDark ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                        }
                                    />
                                    <ListMenuItem
                                        icon={isOnline ? Users : LogOut}
                                        label={isOnline ? "Status: Online" : "Status: Offline"}
                                        onClick={toggleOnline}
                                        toggle={
                                            <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isOnline ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                        }
                                    />

                                    <ListMenuItem icon={LogOut} label="Logout" onClick={handleLogout} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Theme & UI Customization Modal */}
            <ThemeSelectorModal 
                isOpen={isThemeModalOpen} 
                onClose={() => setIsThemeModalOpen(false)} 
            />
        </header>
    );
}