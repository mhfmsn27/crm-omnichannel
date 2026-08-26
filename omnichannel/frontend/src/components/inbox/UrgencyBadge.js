import React from 'react';
import { AlertTriangle } from 'lucide-react';

const SENTIMENT_CONFIG = {
    positive: { emoji: '😊', color: 'text-green-600', bg: 'bg-green-50' },
    neutral:  { emoji: '😐', color: 'text-gray-500',  bg: 'bg-gray-50' },
    negative: { emoji: '😞', color: 'text-orange-600', bg: 'bg-orange-50' },
    angry:    { emoji: '😡', color: 'text-red-600',    bg: 'bg-red-50' },
    happy:    { emoji: '😄', color: 'text-green-600',  bg: 'bg-green-50' },
};

export function SentimentBadge({ sentiment, showLabel = false }) {
    if (!sentiment || sentiment === 'neutral') return null;
    const conf = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>
            {conf.emoji}
            {showLabel && <span className="capitalize">{sentiment}</span>}
        </span>
    );
}

export function UrgencyBadge({ isUrgent, size = 'sm' }) {
    if (!isUrgent) return null;
    return (
        <span className={`inline-flex items-center gap-1 font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}`}>
            <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            Urgent
        </span>
    );
}
