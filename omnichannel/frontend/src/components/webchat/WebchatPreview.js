import React, { useState } from 'react';
import { MessageCircle, Mail, Zap, X, Send, User } from 'lucide-react';
import { getApiUrl } from '../../config/api';

export default function WebchatPreview({ config }) {
    const [isOpen, setIsOpen] = useState(true);

    const {
        appearance = {},
        text = {},
        form = {}
    } = config;

    const primaryColor = appearance.primary_color || '#6366F1';
    const positionClass = appearance.position === 'bottom-left' ? 'left-4 bottom-4' : 'right-4 bottom-4';
    
    const width = appearance.launcher_width || 60;
    const height = appearance.launcher_height || 60;

    // If launcher logo exists, we use it. If open, show X (optional, can also be custom)
    // Standard logic: If custom logo used, background is transparent. If default, use primary color.
    
    const isCustomLogo = !!appearance.launcher_logo_url;
    
    const launcherStyle = {
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: isOpen || !isCustomLogo ? primaryColor : 'transparent',
        boxShadow: isOpen || !isCustomLogo ? '0 4px 12px rgba(0,0,0,0.15)' : 'none', // Remove shadow for custom transparent icons
        // If open, force standard size for X button
        ...(isOpen && { width: '60px', height: '60px' }) 
    };

    const getIcon = () => {
        if (appearance.launcher_logo_url) {
            return (
                <img 
                    src={getApiUrl(appearance.launcher_logo_url)} 
                    alt="Launcher" 
                    className="w-full h-full object-contain"
                />
            );
        }
        switch(appearance.launcher_icon) {
            case 'mail': return <Mail className="w-6 h-6 text-white" />;
            case 'zap': return <Zap className="w-6 h-6 text-white" />;
            default: return <MessageCircle className="w-6 h-6 text-white" />;
        }
    };

    return (
        <div className="relative w-full h-[600px] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden shadow-inner flex flex-col justify-end p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <h1 className="text-4xl font-bold text-gray-400 rotate-[-15deg]">Website Content</h1>
            </div>

            {/* WIDGET WINDOW */}
            {isOpen && (
                <div 
                    className={`absolute bottom-20 ${appearance.position === 'bottom-left' ? 'left-4' : 'right-4'} w-[350px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all`}
                    style={{ height: '500px' }}
                >
                    {/* Header */}
                    <div className="p-4 text-white flex justify-between items-center" style={{ backgroundColor: primaryColor }}>
                        <div className="flex items-center gap-3">
                            {appearance.show_agent_face && (
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
                                    {appearance.logo_url ? (
                                        <img src={getApiUrl(appearance.logo_url)} className="w-full h-full object-cover" alt="Agent" />
                                    ) : (
                                        <User className="w-6 h-6 text-white" />
                                    )}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-sm">Chat Support</h3>
                                <span className="text-[10px] opacity-80 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="opacity-70 hover:opacity-100"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                        {/* Bot Message */}
                        <div className="flex gap-2 items-end mb-4">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 overflow-hidden">
                                {appearance.logo_url ? (
                                    <img src={getApiUrl(appearance.logo_url)} className="w-full h-full object-cover" alt="Bot" />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                            </div>
                            <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm text-sm text-gray-700 max-w-[80%]">
                                {text.welcome || 'Halo! Ada yang bisa kami bantu?'}
                            </div>
                        </div>

                        {/* Pre-chat Form Simulation */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Start Chatting</p>
                            <div className="space-y-3">
                                {form.require_name && (
                                    <input className="w-full border border-gray-200 p-2 rounded text-sm" placeholder="Name" />
                                )}
                                {form.require_email && (
                                    <input className="w-full border border-gray-200 p-2 rounded text-sm" placeholder="Email" />
                                )}
                                {form.require_phone && (
                                    <input className="w-full border border-gray-200 p-2 rounded text-sm" placeholder="Phone (Optional)" />
                                )}
                                <button className="w-full py-2 rounded text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                                    Start Chat
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Input (Mock) */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 text-sm" placeholder="Type a message..." disabled />
                        <button className="p-2 rounded-full text-white" style={{ backgroundColor: primaryColor }}>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* LAUNCHER */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute ${positionClass} flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${isOpen || !isCustomLogo ? 'rounded-full shadow-lg' : ''}`}
                style={launcherStyle}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : getIcon()}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                        1
                    </span>
                )}
            </button>
        </div>
    );
}