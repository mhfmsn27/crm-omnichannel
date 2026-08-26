import React from 'react';

/**
 * Shared Button Component
 * Ensures consistent touch targets (44px minimum) across the application
 *
 * @param {Object} props
 * @param {string} props.variant - Button style: 'primary', 'secondary', 'outline', 'ghost', 'danger'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} props.fullWidth - Make button full width
 * @param {boolean} props.iconOnly - Icon only button (different padding)
 * @param {ReactNode} props.leftIcon - Icon on the left
 * @param {ReactNode} props.rightIcon - Icon on the right
 * @param {boolean} props.loading - Show loading spinner
 * @param {boolean} props.disabled - Disabled state
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    iconOnly = false,
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    className = '',
    ...props
}) {
    // Base styles
    const baseStyles = `
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2
        hover:-translate-y-0.5
        active:scale-[0.96] active:translate-y-0
    `;

    // Touch target minimum - 44px for mobile accessibility
    const touchTarget = 'min-h-[44px] min-w-[44px]';

    // Size variants
    const sizes = {
        sm: iconOnly
            ? 'w-9 h-9 p-0'
            : 'px-3 py-1.5 text-xs min-h-[32px]',
        md: iconOnly
            ? 'w-11 h-11 p-0'
            : 'px-4 py-2.5 text-sm min-h-[40px]',
        lg: iconOnly
            ? 'w-14 h-14 p-0'
            : 'px-6 py-3 text-base min-h-[48px]',
        xl: iconOnly
            ? 'w-16 h-16 p-0'
            : 'px-8 py-4 text-lg min-h-[56px]',
    };

    // Color variants
    const variants = {
        primary: `
            bg-indigo-600 text-white
            shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.35)]
            hover:bg-indigo-700
            active:bg-indigo-800
            dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:active:bg-indigo-800
        `,
        secondary: `
            bg-gray-100 text-gray-700
            hover:bg-gray-200
            active:bg-gray-300
            dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 dark:active:bg-slate-500
        `,
        outline: `
            bg-transparent text-indigo-600 border-2 border-indigo-600
            hover:bg-indigo-50 hover:border-indigo-700 hover:text-indigo-700
            active:bg-indigo-100
            dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-indigo-900/30
        `,
        ghost: `
            bg-transparent text-gray-600
            hover:bg-gray-100
            active:bg-gray-200
            dark:text-gray-300 dark:hover:bg-slate-700 dark:active:bg-slate-600
        `,
        danger: `
            bg-red-600 text-white
            hover:bg-red-700
            active:bg-red-800
            dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800
        `,
        success: `
            bg-green-600 text-white
            hover:bg-green-700
            active:bg-green-800
            dark:bg-green-600 dark:hover:bg-green-700 dark:active:bg-green-800
        `,
        warning: `
            bg-amber-500 text-white
            hover:bg-amber-600
            active:bg-amber-700
            dark:bg-amber-600 dark:hover:bg-amber-700 dark:active:bg-amber-800
        `,
        link: `
            bg-transparent text-indigo-600 underline-offset-4
            hover:underline hover:text-indigo-700
            dark:text-indigo-400 dark:hover:text-indigo-300
            min-h-0 min-w-0 p-0
        `,
    };

    return (
        <button
            className={`
                ${baseStyles}
                ${iconOnly ? touchTarget : 'px-4'}
                ${sizes[size]}
                ${variants[variant]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : (
                leftIcon
            )}
            {children}
            {rightIcon && !loading && rightIcon}
        </button>
    );
}

/**
 * IconButton - Icon-only button with proper touch target
 */
export function IconButton({
    icon: Icon,
    label,
    size = 'md',
    variant = 'ghost',
    className = '',
    ...props
}) {
    const sizes = {
        sm: 'w-9 h-9',
        md: 'w-11 h-11',
        lg: 'w-14 h-14',
    };

    return (
        <button
            className={`
                ${sizes[size]}
                flex items-center justify-center rounded-xl
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                active:scale-[0.98]
                ${variant === 'ghost' ? 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700' : ''}
                ${variant === 'primary' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                ${variant === 'danger' ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' : ''}
                ${className}
            `}
            title={label}
            aria-label={label}
            {...props}
        >
            {Icon && <Icon className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />}
        </button>
    );
}

/**
 * TouchTargetWrapper - Wrapper to ensure minimum touch target
 */
export function TouchTarget({ children, className = '', minSize = 44 }) {
    return (
        <span
            className={`inline-flex items-center justify-center ${className}`}
            style={{ minWidth: minSize, minHeight: minSize }}
        >
            {children}
        </span>
    );
}
