import React from 'react';

/**
 * Badge - Badge/Tag component
 *
 * @param {Object} props
 * @param {string} props.variant - Color variant: 'default', 'primary', 'success', 'warning', 'danger', 'info'
 * @param {string} props.size - Size: 'sm', 'md', 'lg'
 * @param {ReactNode} props.children - Badge content
 * @param {string} props.className - Additional CSS classes
 */
export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center font-bold rounded-full';

    const sizes = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
    };

    const variants = {
        default: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
        primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <span
            className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
