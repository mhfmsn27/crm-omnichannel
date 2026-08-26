import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * SuggestionPopover - Quick reply suggestions popover
 *
 * @param {Object} props
 * @param {Array} props.suggestions - Array of suggestion items
 * @param {number} props.selectedIndex - Currently selected index
 * @param {Function} props.onSelect - Selection handler
 */
export default function SuggestionPopover({ suggestions, selectedIndex, onSelect }) {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="absolute bottom-full mb-2 left-4 w-64 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-dark-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-border font-medium flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Quick Replies ({suggestions.length})
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {suggestions.map((item, idx) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={`
                            px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0
                            transition-colors
                            ${idx === selectedIndex
                                ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                /{item.shortcut}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                            {item.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
