import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Sparkles, RefreshCw, Loader2, X, ChevronRight } from 'lucide-react';

export default function SmartReplySuggestions({ conversationId, onSelect, onDismiss }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const hasFetched = useRef(false);
    const prevConversationId = useRef(conversationId);

    // Fetch suggestions when conversation changes
    useEffect(() => {
        // Reset state when conversation changes
        if (conversationId !== prevConversationId.current) {
            hasFetched.current = false;
            setDismissed(false);
            setSuggestions([]);
            prevConversationId.current = conversationId;
        }

        if (conversationId && !hasFetched.current) {
            fetchSuggestions();
        }
    }, [conversationId]);

    const fetchSuggestions = async (forceRefresh = false) => {
        if (!conversationId) return;

        if (forceRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const endpoint = forceRefresh
                ? `/api/app/ai/suggestions/${conversationId}/refresh`
                : `/api/app/ai/suggestions/${conversationId}`;

            const res = await axios.get(endpoint);
            setSuggestions(res.data.suggestions || []);
            hasFetched.current = true;
            setDismissed(false);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
            setSuggestions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchSuggestions(true);
    };

    const handleSelect = async (suggestion) => {
        try {
            // Track usage
            await axios.post(`/api/app/ai/suggestions/${conversationId}/use`, {
                suggestionText: suggestion.text
            });
        } catch (err) {
            console.error('Failed to track suggestion usage:', err);
        }

        onSelect(suggestion.text);
    };

    const handleDismiss = () => {
        setDismissed(true);
        if (onDismiss) onDismiss();
    };

    // Don't Render if dismissed or no suggestions
    if (dismissed || (!loading && suggestions.length === 0)) {
        return null;
    }

    return (
        <div className="px-3 pb-2 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50 p-3 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                            AI Suggestions
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                            title="Refresh suggestions"
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1 text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                            title="Dismiss"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">Generating suggestions...</span>
                    </div>
                )}

                {/* Suggestions List */}
                {!loading && suggestions.length > 0 && (
                    <div className="space-y-2">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => { handleSelect(suggestion); }}
                                className="w-full text-left bg-white dark:bg-dark-bg rounded-lg border border-purple-100 dark:border-purple-900/50 p-2.5 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-2">
                                            {suggestion.text}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-purple-500 dark:text-purple-400 font-medium">
                                                {suggestion.reason}
                                            </span>
                                            <span className="text-[9px] text-gray-300 dark:text-gray-600">
                                                •
                                            </span>
                                            <span className="text-[9px] text-gray-400">
                                                {Math.round(suggestion.confidence * 100)}% match
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer hint */}
                {!loading && suggestions.length > 0 && (
                    <p className="text-[9px] text-purple-500 dark:text-purple-400 mt-2 text-center">
                        Klik untuk menggunakan • Teks akan disalin ke chat
                    </p>
                )}
            </div>
        </div>
    );
}
