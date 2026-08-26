import React from 'react';

/**
 * Input - Consistent form input component
 *
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.error - Error message
 * @param {string} props.hint - Helper text
 * @param {ReactNode} props.leftIcon - Left icon
 * @param {ReactNode} props.rightIcon - Right icon
 * @param {string} props.size - Input size: 'sm', 'md', 'lg'
 */
export default function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    size = 'md',
    className = '',
    containerClassName = '',
    ...props
}) {
    const sizes = {
        sm: 'py-1.5 text-xs',
        md: 'py-2 text-sm',
        lg: 'py-3 text-base',
    };

    return (
        <div className={containerClassName}>
            {label && (
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {leftIcon}
                    </div>
                )}
                <input
                    className={`
                        w-full px-3 py-2 rounded-xl border
                        bg-white dark:bg-slate-900
                        border-gray-300 dark:border-slate-700
                        text-gray-900 dark:text-slate-100
                        placeholder-gray-400 dark:placeholder-slate-500
                        transition-all duration-300 shadow-sm hover:border-gray-400 dark:hover:border-slate-500
                        focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500
                        disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500
                        ${leftIcon ? 'pl-9' : ''}
                        ${rightIcon ? 'pr-9' : ''}
                        ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                        ${sizes[size]}
                        ${className}
                    `}
                    disabled={props.disabled}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {hint && !error && (
                <p className="mt-1 text-xs text-gray-400">{hint}</p>
            )}
        </div>
    );
}

/**
 * Select - Consistent select dropdown component
 */
export function Select({
    label,
    error,
    hint,
    size = 'md',
    className = '',
    containerClassName = '',
    children,
    ...props
}) {
    const sizes = {
        sm: 'py-1.5 text-xs',
        md: 'py-2 text-sm',
        lg: 'py-3 text-base',
    };

    return (
        <div className={containerClassName}>
            {label && (
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                    {label}
                </label>
            )}
            <select
                className={`
                    w-full px-3 rounded-lg border appearance-none
                    bg-white dark:bg-slate-900
                    border-gray-300 dark:border-slate-700
                    text-gray-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200
                    ${sizes[size]}
                    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
                    ${className}
                `}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {hint && !error && (
                <p className="mt-1 text-xs text-gray-400">{hint}</p>
            )}
        </div>
    );
}

/**
 * Textarea - Consistent textarea component
 */
export function Textarea({
    label,
    error,
    hint,
    size = 'md',
    className = '',
    containerClassName = '',
    rows = 3,
    ...props
}) {
    const sizes = {
        sm: 'py-1.5 text-xs',
        md: 'py-2 text-sm',
        lg: 'py-3 text-base',
    };

    return (
        <div className={containerClassName}>
            {label && (
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                rows={rows}
                className={`
                    w-full px-3 rounded-lg border resize-none
                    bg-white dark:bg-slate-900
                    border-gray-300 dark:border-slate-700
                    text-gray-900 dark:text-slate-100
                    placeholder-gray-400 dark:placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200
                    ${sizes[size]}
                    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {hint && !error && (
                <p className="mt-1 text-xs text-gray-400">{hint}</p>
            )}
        </div>
    );
}
