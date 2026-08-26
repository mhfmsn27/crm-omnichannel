import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MessageSquare, X } from 'lucide-react';

export default function GlobalNotificationManager() {
  const socket = useSocket();
  const location = useLocation();
  // Initialize ref as null first to avoid SSR/initialization issues
  const audioRef = useRef(null);

  useEffect(() => {
      // Create Audio object on mount
      audioRef.current = new Audio('/sounds/notification.mp3');

      // Request permission on mount
      if (typeof window !== 'undefined' && "Notification" in window && window.Notification.permission !== "granted") {
          window.Notification.requestPermission();
      }
  }, []);

  useEffect(() => {
    if (!socket || !socket.on) return;

    const handleNewMessage = ({ message }) => {
        // Ignore outgoing messages
        if (message.from_me) return;

        // 1. Play Sound (Always, unless configured otherwise)
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Audio blocked:", e));
            }
        } catch(e) {}

        // 2. Browser Notification (If tab hidden)
        if (typeof window !== 'undefined' && document.hidden && "Notification" in window && window.Notification.permission === "granted") {
            new window.Notification(`New message from ${message.pushName || 'Customer'}`, {
                body: message.content || 'Sent a media file',
                icon: '/vite.svg'
            });
        }

        // 3. In-App Toast Preview (Only if NOT in Inbox)
        // Shows "Galaxy" styled toast
        if (!location.pathname.startsWith('/inbox')) {
            toast.custom((t) => (
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
            ), { duration: 5000, position: 'top-right' });
        }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
        if (socket && socket.off) {
            socket.off('new_message', handleNewMessage);
        }
    };
  }, [socket, location.pathname]);

  return null; // Headless component
}
