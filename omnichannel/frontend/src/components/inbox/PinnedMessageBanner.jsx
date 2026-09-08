import React, { useState } from 'react';
import { Pin, X, ChevronLeft, ChevronRight, FileText, Image as ImageIcon } from 'lucide-react';

/**
 * PinnedMessageBanner - Top banner showing pinned messages in active chat
 *
 * @param {Object} props
 * @param {Array} props.pinnedMessages - Array of pinned message objects
 * @param {Function} props.onJumpToMessage - Callback to scroll to message bubble
 * @param {Function} props.onUnpinMessage - Callback to unpin message
 */
export default function PinnedMessageBanner({ pinnedMessages = [], onJumpToMessage, onUnpinMessage }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!pinnedMessages || pinnedMessages.length === 0) return null;

    // Guard index bounds
    const activeIndex = Math.min(currentIndex, pinnedMessages.length - 1);
    const activeMsg = pinnedMessages[activeIndex];
    if (!activeMsg) return null;

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : pinnedMessages.length - 1));
    };

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev < pinnedMessages.length - 1 ? prev + 1 : 0));
    };

    const getMessagePreview = (msg) => {
        if (msg.content && msg.content.trim()) {
            return msg.content.length > 90 ? msg.content.substring(0, 90) + '...' : msg.content;
        }
        if (msg.type === 'image') return '📷 Foto Lampiran';
        if (msg.type === 'video') return '🎥 Video Lampiran';
        if (msg.type === 'audio') return '🎵 Pesan Suara / Audio';
        if (msg.type === 'document') return '📄 Dokumen Lampiran';
        return 'Pesan Tersemat';
    };

    return (
        <div 
            onClick={() => onJumpToMessage && onJumpToMessage(activeMsg.id)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border-b border-emerald-100 dark:border-emerald-800/40 flex items-center justify-between gap-3 cursor-pointer select-none z-10 transition-all hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 shadow-sm"
        >
            {/* Left Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex-shrink-0">
                    <Pin className="w-3.5 h-3.5 transform rotate-45 fill-emerald-600 dark:fill-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                        <span>Pesan Tersemat</span>
                        {pinnedMessages.length > 1 && (
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-1.5 py-0.2 rounded-full">
                                {activeIndex + 1} / {pinnedMessages.length}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-200 truncate font-normal">
                        {getMessagePreview(activeMsg)}
                    </p>
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {pinnedMessages.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded transition-colors"
                            title="Pesan Tersemat Sebelumnya"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded transition-colors"
                            title="Pesan Tersemat Berikutnya"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}

                {onUnpinMessage && (
                    <button
                        type="button"
                        onClick={() => onUnpinMessage(activeMsg.id, true)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors ml-1"
                        title="Lepas Sematan (Unpin)"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
