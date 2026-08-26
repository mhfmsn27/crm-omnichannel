import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageLoader - Consistent loading state for lazy-loaded pages
 *
 * @param {Object} props
 * @param {string} props.message - Custom loading message
 * @param {string} props.variant - Loading variant: 'fullscreen', 'inline', 'skeleton'
 */
export default function PageLoader({ message = 'Memuat...', variant = 'fullscreen' }) {
    if (variant === 'inline') {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
                </div>
            </div>
        );
    }

    if (variant === 'skeleton') {
        return (
            <div className="animate-pulse p-6 space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3" />
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                </div>
            </div>
        );
    }

    // Default: fullscreen
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-dark-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <div className="absolute inset-0 animate-ping w-10 h-10 rounded-full bg-indigo-200 opacity-20" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
            </div>
        </div>
    );
}

/**
 * SectionLoader - Loading skeleton for page sections
 */
export function SectionLoader({ height = 'h-32' }) {
    return (
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${height}`} />
    );
}

/**
 * ListLoader - Loading skeleton for list items
 */
export function ListLoader({ count = 5 }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-dark-border">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * CardLoader - Loading skeleton for cards
 */
export function CardLoader({ count = 4 }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="p-5 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-32" />
                </div>
            ))}
        </div>
    );
}

/**
 * TableLoader - Loading skeleton for tables
 */
export function TableLoader({ rows = 5, columns = 4 }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 p-3 border-b border-gray-200 dark:border-gray-700">
                {[...Array(columns)].map((_, i) => (
                    <div key={i} className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-3">
                    {[...Array(columns)].map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
                            style={{ width: `${Math.random() * 30 + 70}%` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default PageLoader;
