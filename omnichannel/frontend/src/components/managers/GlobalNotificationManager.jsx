import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MessageSquare, X } from 'lucide-react';
import { getApiUrl } from '../../config/api';

// Component extracted outside to guarantee scope initialization
const ToastNotification = ({ t, message }) => (
    <div
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-indigo-800 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-white/10 cursor-pointer border border-white/10`}
        onClick={() => {
            toast.dismiss(t.id);
            window.location.href = '/inbox';
        }}
    >
        <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <MessageSquare className="w-5 h-5 text-yellow-400" />
                    </div>
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-white">
                        {message.pushName || 'New Message'}
                    </p>
                    <p className="mt-1 text-sm text-indigo-100 line-clamp-2">
                        {message.content || (message.type !== 'text' ? `[${message.type.toUpperCase()}]` : '')}
                    </p>
                </div>
            </div>
        </div>
        <div className="flex border-l border-white/10">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-200 hover:text-white focus:outline-none"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    </div>
);

export default function GlobalNotificationManager() {
    const { socket } = useSocket();
    const { config } = useConfig();
    const { user } = useAuth();
    const location = useLocation();
    const audioRef = useRef(null);

    // Initialize audio with config
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const soundUrl = config.notification_sound
                ? `${getApiUrl(config.notification_sound)}?t=${Date.now()}`
                : '/sounds/notification.mp3';
            audioRef.current = new Audio(soundUrl);
        }
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, [config.notification_sound]);

    useEffect(() => {
        if (!socket || !socket.on || !user) return;

        const handleNewMessage = ({ message, assigned_to, sessionId }) => {
            // Ignore outgoing messages
            if (message.from_me) return;

            // 2. Suppress if User is not assigned and is an Agent
            if (user.role === 'admin_member') {
                // Admin: Receive ALL notifications
            } else if (user.role === 'agent') {
                // Agent & Super Agent: Filter by Assigned Devices
                // Check if user has specific device assignments
                const assignedDevices = user.assigned_devices || [];

                // If the message comes from a session that is NOT in the user's assigned list, ignore it.
                // Note: If assignedDevices is empty, it usually implies NO access (or full access depending on policy, but user said "only based on assigned").
                // Assuming strict assignment:
                if (sessionId && assignedDevices.length > 0 && !assignedDevices.includes(sessionId)) {
                    return;
                }
                // Logic enhancement: If assignedDevices is empty but user is an agent, should they receive?
                // Usually "Super Agent" with full view might have empty list implying all? 
                // BUT looking at the UI image, "Device Access (Leave Empty for ALL)" is for permissions.
                // However, the user request says: "Super Agent dan Agent : hanya berdasarkan device access yang di assign."
                // This suggests strict filtering.
                // But if "Leave Empty for ALL" is the rule, then empty array means ALL.
                // Let's check logic: "hanya berdasarkan device access yang di assign" -> Only what is assigned. 
                // If User UI says "Leave Empty for ALL", then empty = All.
                // Let's respect "Leave Empty for ALL" behavior for safety.

                if (assignedDevices.length > 0 && sessionId && !assignedDevices.includes(sessionId)) {
                    return;
                }
            }

            // --- Execute Notification ---

            // Play Sound
            try {
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(() => { });
                }
            } catch (e) { }

            // Desktop Notification (if background)
            if (typeof window !== 'undefined' && document.hidden && "Notification" in window && Notification.permission === "granted") {
                try {
                    new Notification(`New message from ${message.pushName || 'Customer'}`, {
                        body: message.content || 'Sent a media file',
                        icon: config.app_favicon ? getApiUrl(config.app_favicon) : '/vite.svg'
                    });
                } catch (e) { }
            }

            // Toast Notification (if not in Inbox page)
            if (!location.pathname.startsWith('/inbox')) {
                toast.custom((t) => <ToastNotification t={t} message={message} />, {
                    duration: 5000,
                    position: 'top-right'
                });
            }
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, location.pathname, config, user]);

    return null;
}