import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronUp, MessageSquare } from 'lucide-react';

/**
 * Beautiful Load More component for message history
 * Features:
 * - Load older messages (scroll up)
 * - Load newer messages (scroll down)
 * - Smooth animations
 * - Loading states
 * - Message count indicators
 */
export default function MessageLoadMore({
    pagination,
    onLoadMore,
    onLoadNewer,
    isLoading,
    isLoadingNewer,
    position = 'top', // 'top' or 'bottom'
    className = ''
}) {
    const [showJumpToBottom, setShowJumpToBottom] = useState(false);

    const hasMoreBefore = pagination?.hasMore?.before ?? false;
    const hasMoreAfter = pagination?.hasMore?.after ?? false;
    const loadedBefore = pagination?.loadedCounts?.before ?? 0;
    const loadedAfter = pagination?.loadedCounts?.after ?? 0;

    const handleLoadOlder = () => {
        if (pagination?.oldestId) {
            onLoadMore?.(pagination.oldestId);
        }
    };

    const handleLoadNewer = () => {
        if (pagination?.newestId) {
            onLoadNewer?.(pagination.newestId);
        }
    };

    if (position === 'top') {
        const shouldRenderStats = loadedBefore > 0 && !hasMoreBefore;
        
        return (
            <div className={`flex flex-col items-center gap-2 py-3 min-h-[48px] ${className}`}>
                {/* Load Older Messages Button */}
                {hasMoreBefore ? (
                    <button
                        onClick={handleLoadOlder}
                        disabled={isLoading}
                        className="group flex items-center justify-center gap-2 px-4 h-[38px] bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full transition-all duration-200 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                    Memuat pesan lama...
                                </span>
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-4 h-4 text-indigo-500 group-hover:-translate-y-0.5 transition-transform" />
                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                    Muat {loadedBefore > 0 ? `${loadedBefore} pesan` : 'lebih banyak'} sebelumnya
                                </span>
                            </>
                        )}
                    </button>
                ) : null}

                {/* Stats indicator */}
                {loadedBefore > 0 && !hasMoreBefore && (
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                        <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                        <span className="text-xs">
                            {loadedBefore} pesan sebelumnya dimuat
                        </span>
                        <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                    </div>
                )}


            </div>
        );
    }

    // Bottom position (load newer messages)
    const shouldRenderStatsBottom = loadedAfter > 0 && !hasMoreAfter;
    if (!hasMoreAfter && !showJumpToBottom && !shouldRenderStatsBottom) return null;

    return (
        <div className={`flex flex-col items-center gap-2 py-3 ${className}`}>
            {/* Jump to bottom button when scrolled up */}
            {showJumpToBottom && (
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('scroll-to-bottom'));
                        setShowJumpToBottom(false);
                    }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                >
                    <ChevronUp className="w-4 h-4 rotate-180" />
                    <span className="text-sm font-medium">Pesan baru</span>
                </button>
            )}

            {/* Load Newer Messages Button */}
            {hasMoreAfter && (
                <button
                    onClick={handleLoadNewer}
                    disabled={isLoadingNewer}
                    className="group flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full transition-all duration-200 disabled:opacity-50"
                >
                    {isLoadingNewer ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                Memuat...
                            </span>
                        </>
                    ) : (
                        <>
                            <ChevronUp className="w-4 h-4 text-emerald-500 group-hover:translate-y-0.5 transition-transform rotate-180" />
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                {loadedAfter > 0 ? `${loadedAfter} pesan baru` : 'Pesan lebih baru'}
                            </span>
                        </>
                    )}
                </button>
            )}

            {/* Stats */}
            {loadedAfter > 0 && !hasMoreAfter && (
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                    <span className="text-xs">
                        {loadedAfter} pesan baru dimuat
                    </span>
                    <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                </div>
            )}
        </div>
    );
}

/**
 * Scroll Position Manager for messages
 * Tracks scroll position and triggers callbacks
 */
export function useMessageScroll({ onLoadMore, onLoadNewer, hasMoreBefore, hasMoreAfter }) {
    const [isNearTop, setIsNearTop] = useState(false);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const messagesRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const container = messagesRef.current;
            if (!container) return;

            const { scrollTop, scrollHeight, clientHeight } = container;
            const scrollPosition = scrollTop / (scrollHeight - clientHeight || 1);

            setIsNearTop(scrollPosition < 0.3);
            setIsNearBottom(scrollPosition > 0.7);

            // Auto-load older messages when scrolling up
            if (scrollTop < 100 && hasMoreBefore) {
                onLoadMore?.();
            }
        };

        const container = messagesRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreBefore, onLoadMore]);

    const scrollToBottom = () => {
        const container = messagesRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    return { messagesRef, isNearTop, isNearBottom, scrollToBottom };
}

/**
 * Beautiful loading skeleton for messages
 */
export function MessageLoadingSkeleton({ count = 3 }) {
    return (
        <div className="flex flex-col gap-4 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Empty state for conversation
 */
export function ConversationEmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Belum ada pesan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Mulai percakapan dengan mengirim pesan pertama
            </p>
        </div>
    );
}
