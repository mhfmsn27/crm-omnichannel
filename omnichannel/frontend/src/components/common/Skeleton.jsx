import React from 'react';

/**
 * Skeleton Component
 * Provides loading placeholder animations
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Shape variant: 'text', 'circular', 'rectangular', 'rounded'
 * @param {string} props.width - Width value (e.g., 'w-32', '75%')
 * @param {string} props.height - Height value (e.g., 'h-4', '48px')
 * @param {boolean} props.animate - Enable/disable animation (default: true)
 */
export function Skeleton({
    className = '',
    variant = 'rounded',
    width,
    height,
    animate = true,
    style = {},
    ...props
}) {
    const baseClasses = 'bg-gray-200 dark:bg-slate-700';

    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-lg',
    };

    return (
        <div
            className={`relative overflow-hidden ${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{
                width,
                height,
                ...style,
            }}
            {...props}
        >
            {animate && (
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
            )}
        </div>
    );
}

/**
 * SkeletonCircle - Circular skeleton placeholder
 */
export function SkeletonCircle({ size = 10, className = '' }) {
    return (
        <Skeleton
            className={`rounded-full flex-shrink-0 ${className}`}
            width={`${size * 4}px`}
            height={`${size * 4}px`}
        />
    );
}

/**
 * SkeletonText - Multi-line text placeholder
 */
export function SkeletonText({
    lines = 3,
    className = '',
    lastLineWidth = '60%',
    spacing = 'mt-2',
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            {[...Array(lines - 1)].map((_, i) => (
                <Skeleton key={i} variant="text" className="w-full" />
            ))}
            <Skeleton variant="text" className={lastLineWidth} />
        </div>
    );
}

/**
 * SkeletonAvatar - Avatar placeholder
 */
export function SkeletonAvatar({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    return <SkeletonCircle size={parseInt(sizes[size].match(/\d+/)[0])} className={`${sizes[size]} ${className}`} />;
}

/**
 * SkeletonButton - Button placeholder
 */
export function SkeletonButton({ className = '' }) {
    return (
        <Skeleton
            className={`h-10 w-24 rounded-lg ${className}`}
            variant="rounded"
        />
    );
}

/**
 * SkeletonCard - Card content placeholder
 */
export function SkeletonCard({ className = '' }) {
    return (
        <div className={`p-4 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-slate-700 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <SkeletonAvatar size="md" />
                <div className="flex-1">
                    <Skeleton variant="text" className="w-32 mb-2" />
                    <Skeleton variant="text" className="w-24 h-3" />
                </div>
            </div>
            <SkeletonText lines={2} />
            <div className="flex gap-2 mt-4">
                <SkeletonButton />
                <SkeletonButton />
            </div>
        </div>
    );
}

/**
 * SkeletonList - List items placeholder
 */
export function SkeletonList({ count = 5, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-slate-700">
                    <SkeletonCircle size={10} />
                    <div className="flex-1">
                        <Skeleton variant="text" className="w-40 mb-1" />
                        <Skeleton variant="text" className="w-64 h-3" />
                    </div>
                    <Skeleton variant="text" className="w-16 h-3" />
                </div>
            ))}
        </div>
    );
}

/**
 * SkeletonTable - Table rows placeholder
 */
export function SkeletonTable({ columns = 4, rows = 5, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {/* Header */}
            <div className="flex gap-4 p-3">
                {[...Array(columns)].map((_, i) => (
                    <Skeleton key={i} variant="text" className="flex-1 h-4" />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-slate-700">
                    {[...Array(columns)].map((_, colIndex) => (
                        <Skeleton
                            key={colIndex}
                            variant="text"
                            className="flex-1"
                            style={{ width: colIndex === 0 ? '60%' : '80%' }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * SkeletonDashboard - Dashboard widget placeholder
 */
export function SkeletonDashboard({ className = '' }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <Skeleton variant="text" className="w-24 h-4" />
                        <Skeleton variant="text" className="w-8 h-8 rounded" />
                    </div>
                    <Skeleton variant="text" className="w-16 h-8 mb-2" />
                    <Skeleton variant="text" className="w-32 h-3" />
                </div>
            ))}
        </div>
    );
}

/**
 * SkeletonChat - Chat conversation placeholder
 */
export function SkeletonChat({ className = '' }) {
    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-700">
                <SkeletonCircle size={10} />
                <div className="flex-1">
                    <Skeleton variant="text" className="w-32 mb-1" />
                    <Skeleton variant="text" className="w-20 h-3" />
                </div>
                <Skeleton variant="text" className="w-8 h-8 rounded" />
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Incoming message */}
                <div className="flex gap-2">
                    <SkeletonCircle size={8} />
                    <div className="flex-1 max-w-[70%]">
                        <Skeleton className="h-16 rounded-2xl rounded-tl-none" />
                    </div>
                </div>

                {/* Outgoing message */}
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-48 rounded-2xl rounded-tr-none" />
                </div>

                {/* Incoming message */}
                <div className="flex gap-2">
                    <SkeletonCircle size={8} />
                    <div className="flex-1 max-w-[70%]">
                        <Skeleton className="h-20 rounded-2xl rounded-tl-none" />
                    </div>
                </div>

                {/* Outgoing message */}
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-32 rounded-2xl rounded-tr-none" />
                </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                <Skeleton className="h-12 w-full rounded-full" />
            </div>
        </div>
    );
}

/**
 * SkeletonForm - Form fields placeholder
 */
export function SkeletonForm({ fields = 4, className = '' }) {
    return (
        <div className={`space-y-4 ${className}`}>
            {[...Array(fields)].map((_, i) => (
                <div key={i}>
                    <Skeleton variant="text" className="w-24 h-4 mb-2" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>
            ))}
            <div className="flex gap-3 pt-4">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
        </div>
    );
}

export default Skeleton;
