import React from 'react';
import { X, Check, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageInfoModal({ isOpen, onClose, message }) {
    if (!isOpen || !message) return null;

    const isOutbound = message.from_me;
    
    // Status timestamps - WhatsApp doesn't strictly provide exact timestamps for each stage in standard Webhooks
    // But we can approximate or just show current status and created time.
    const createdTime = message.created_at ? format(new Date(message.created_at), 'dd MMM yyyy, HH:mm') : '-';
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#111b21] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#202c33]">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Info Pesan</h3>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-6">
                    
                    {/* Message Preview */}
                    <div className="p-3 bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg shadow-sm">
                        <p className="text-sm text-gray-800 dark:text-gray-100 break-words whitespace-pre-wrap line-clamp-3">
                            {message.content || 'Media/Dokumen'}
                        </p>
                    </div>

                    {/* Info List */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-8 flex justify-center">
                                <Check className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] text-gray-800 dark:text-gray-200">Terkirim</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{createdTime}</span>
                            </div>
                        </div>

                        {isOutbound && (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 flex justify-center">
                                        <CheckCircle2 className={`w-5 h-5 ${['delivered', 'read'].includes(message.status) ? 'text-gray-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] text-gray-800 dark:text-gray-200">Tersampaikan</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {['delivered', 'read'].includes(message.status) ? (message.updated_at ? format(new Date(message.updated_at), 'dd MMM yyyy, HH:mm') : 'Ya') : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-8 flex justify-center">
                                        <CheckCircle2 className={`w-5 h-5 ${message.status === 'read' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] text-gray-800 dark:text-gray-200">Dibaca</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {message.status === 'read' ? (message.updated_at ? format(new Date(message.updated_at), 'dd MMM yyyy, HH:mm') : 'Ya') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
