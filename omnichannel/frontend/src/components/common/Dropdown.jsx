import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Dropdown - Accessible dropdown menu component
 *
 * @param {Object} props
 * @param {ReactNode} props.trigger - Dropdown trigger button
 * @param {ReactNode} props.children - Dropdown menu items
 * @param {string} props.align - Alignment: 'left', 'right'
 * @param {string} props.width - Width: 'auto', '48', '56', '64', '48'
 * @param {boolean} props.disabled - Disabled state
 */
export default function Dropdown({
    children,
    trigger,
    align = 'left',
    width = 'auto',
    disabled = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const widthClasses = {
        auto: 'w-auto',
        sm: 'w-48',
        md: 'w-56',
        lg: 'w-64',
        xl: 'w-72',
    };

    const alignClasses = {
        left: 'left-0',
        right: 'right-0',
    };

    return (
        <div ref={dropdownRef} className={`relative inline-block ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
            <div onClick={() => !disabled && setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && (
                <div
                    role="menu"
                    className={`
                        absolute z-50 mt-2 py-1 bg-white dark:bg-dark-surface
                        rounded-xl shadow-xl border border-gray-100 dark:border-dark-border
                        overflow-hidden animate-in fade-in zoom-in-95 duration-150
                        ${widthClasses[width]} ${alignClasses[align]}
                    `}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * DropdownItem - Individual dropdown menu item
 */
export function DropdownItem({
    children,
    onClick,
    icon: Icon,
    danger = false,
    disabled = false,
    className = ''
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            role="menuitem"
            className={`
                w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left
                transition-colors
                ${danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                }
                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                ${className}
            `}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
}

/**
 * DropdownDivider - Visual separator
 */
export function DropdownDivider({ className = '' }) {
    return (
        <div className={`my-1 border-t border-gray-100 dark:border-slate-700 ${className}`} role="separator" />
    );
}

/**
 * DropdownLabel - Non-interactive label
 */
export function DropdownLabel({ children, className = '' }) {
    return (
        <div className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider ${className}`}>
            {children}
        </div>
    );
}

/**
 * SelectDropdown - Styled select dropdown with chevron
 */
export function SelectDropdown({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    disabled = false
}) {
    return (
        <div className={`relative ${className}`}>
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`
                    w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-dark-border
                    bg-white dark:bg-dark-surface
                    text-gray-900 dark:text-gray-100
                    text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                    ${disabled ? '' : 'cursor-pointer'}
                `}
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
    );
}
