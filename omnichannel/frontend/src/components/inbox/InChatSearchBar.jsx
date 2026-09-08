import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

export default function InChatSearchBar({
    isOpen,
    onClose,
    searchQuery,
    onSearchChange,
    matchCount = 0,
    totalMatches = 0,
    currentMatchIndex = 0,
    onPrevMatch,
    onNextMatch
}) {
    const effectiveMatchCount = matchCount || totalMatches || 0;
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            if (e.shiftKey) {
                onPrevMatch();
            } else {
                onNextMatch();
            }
        }
    };

    return (
        <div className="px-4 py-2 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 z-20 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-gray-50 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Cari kata kunci dalam chat ini..."
                    className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                {searchQuery.trim() && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {effectiveMatchCount > 0 ? `${currentMatchIndex + 1} dari ${effectiveMatchCount}` : 'Tidak ditemukan'}
                    </span>
                )}

                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={onPrevMatch}
                        disabled={effectiveMatchCount === 0}
                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                        title="Hasil Sebelumnya (Shift + Enter)"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onNextMatch}
                        disabled={effectiveMatchCount === 0}
                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                        title="Hasil Berikutnya (Enter)"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Tutup Pencarian (Esc)"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
