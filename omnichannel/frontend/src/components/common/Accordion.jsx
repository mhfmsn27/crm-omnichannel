import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Accordion - Collapsible section component
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {ReactNode} props.children - Section content
 * @param {boolean} props.defaultOpen - Whether section is open by default
 * @param {Function} props.icon - Icon component
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.contentClassName - Additional content CSS classes
 */
export default function Accordion({
    title,
    children,
    defaultOpen = false,
    icon: Icon,
    className = '',
    contentClassName = '',
    ...props
}) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className={`border-b border-gray-100 dark:border-dark-border ${className}`} {...props}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-left min-h-[56px]"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className={`px-5 pb-5 bg-white dark:bg-dark-surface ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
}
