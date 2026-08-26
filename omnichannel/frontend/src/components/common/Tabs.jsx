import React, { useState } from 'react';

/**
 * Tabs - Accessible tab component
 *
 * @param {Object} props
 * @param {Array} props.tabs - Array of {id, label, icon, badge, disabled}
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onChange - Tab change handler
 * @param {string} props.variant - Style: 'default', 'pills', 'underline'
 * @param {string} props.size - Size: 'sm', 'md', 'lg'
 */
export default function Tabs({
    tabs = [],
    activeTab,
    onChange,
    variant = 'default',
    size = 'md',
    className = ''
}) {
    const sizeClasses = {
        sm: 'text-xs py-2 px-3',
        md: 'text-sm py-2.5 px-4',
        lg: 'text-base py-3 px-5',
    };

    const variantClasses = {
        default: `
            border-b-2 border-transparent
            hover:border-gray-300 dark:hover:border-gray-600
            data-[state=active]:border-indigo-600 dark:data-[state=active]:border-indigo-400
        `,
        pills: `
            rounded-lg
            data-[state=active]:bg-indigo-600 data-[state=active]:text-white
            hover:bg-gray-100 dark:hover:bg-slate-700
        `,
        underline: `
            border-b-2 border-transparent
            data-[state=active]:border-indigo-600 dark:data-[state=active]:border-indigo-400
        `,
    };

    return (
        <div className={`flex gap-1 ${className}`} role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => !tab.disabled && onChange(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    data-state={activeTab === tab.id ? 'active' : 'inactive'}
                    disabled={tab.disabled}
                    className={`
                        flex items-center gap-2 font-semibold transition-all duration-200
                        ${sizeClasses[size]}
                        ${variantClasses[variant]}
                        ${activeTab === tab.id
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    {tab.icon && <tab.icon className="w-4 h-4" />}
                    {tab.label}
                    {tab.badge !== undefined && (
                        <span className={`
                            px-1.5 py-0.5 text-[10px] font-bold rounded-full
                            ${activeTab === tab.id
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
                            }
                        `}>
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

/**
 * TabPanel - Content for a tab
 */
export function TabPanel({ children, isActive, className = '' }) {
    if (!isActive) return null;
    return (
        <div role="tabpanel" className={className}>
            {children}
        </div>
    );
}

/**
 * TabList - Grouped tabs with header
 */
export function TabList({ title, actions, children, className = '' }) {
    return (
        <div className={className}>
            {(title || actions) && (
                <div className="flex items-center justify-between mb-4">
                    {title && (
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {title}
                        </h2>
                    )}
                    {actions && <div>{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}

/**
 * TabBadge - Badge counts for tabs
 */
export function TabBadge({ count, variant = 'default' }) {
    const variantStyles = {
        default: 'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
        dot: 'w-2 h-2 rounded-full',
    };

    if (variant === 'dot') {
        return (
            <span className={`bg-indigo-500 ${variantStyles[variant]}`} />
        );
    }

    return (
        <span className={`bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 ${variantStyles[variant]}`}>
            {count}
        </span>
    );
}
