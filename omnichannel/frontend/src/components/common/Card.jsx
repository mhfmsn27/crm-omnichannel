import React from 'react';

/**
 * Card - Reusable card container
 *
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {ReactNode} props.header - Custom header content
 * @param {ReactNode} props.footer - Footer content
 * @param {string} props.variant - Card variant: 'default', 'bordered', 'flat'
 * @param {boolean} props.hoverable - Enable hover effect
 * @param {Function} props.onClick - Click handler
 */
export default function Card({
    children,
    title,
    header,
    footer,
    variant = 'default',
    hoverable = false,
    onClick,
    className = '',
    bodyClassName = '',
    ...props
}) {
    const variants = {
        default: 'bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border',
        bordered: 'bg-white dark:bg-dark-surface rounded-xl border-2 border-gray-200 dark:border-dark-border',
        flat: 'bg-gray-50 dark:bg-dark-bg rounded-xl',
    };

    const hoverClass = hoverable || onClick
        ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer'
        : '';

    return (
        <div
            className={`${variants[variant]} ${hoverClass} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
            {...props}
        >
            {/* Header */}
            {(title || header) && (
                <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                    {title && (
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">
                            {title}
                        </h3>
                    )}
                    {header}
                </div>
            )}

            {/* Body */}
            <div className={bodyClassName}>
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                    {footer}
                </div>
            )}
        </div>
    );
}

/**
 * CardHeader - Card header with actions
 */
export function CardHeader({ title, subtitle, action, className = '' }) {
    return (
        <div className={`flex items-start justify-between gap-4 ${className}`}>
            <div>
                {title && (
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

/**
 * CardBody - Card body wrapper
 */
export function CardBody({ children, className = '', padding = true }) {
    return (
        <div className={`${padding ? 'p-4' : ''} ${className}`}>
            {children}
        </div>
    );
}
