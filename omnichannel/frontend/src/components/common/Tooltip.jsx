import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip - Accessible tooltip component
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Trigger element
 * @param {string|ReactNode} props.content - Tooltip content
 * @param {string} props.position - Position: 'top', 'bottom', 'left', 'right'
 * @param {string} props.variant - Style: 'dark', 'light', 'info', 'warning'
 */
export default function Tooltip({
    children,
    content,
    position = 'top',
    variant = 'dark',
    delay = 200,
    className = ''
}) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-current border-x-transparent border-b-transparent border-l-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-current border-x-transparent border-t-transparent border-r-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-current border-y-transparent border-r-transparent border-b-transparent',
        right: 'right-full top-1/2 translate-y-1/2 border-r-current border-y-transparent border-l-transparent border-t-transparent',
    };

    const variantClasses = {
        dark: 'bg-gray-900 text-white border-gray-700',
        light: 'bg-white text-gray-800 border-gray-200 shadow-lg',
        info: 'bg-blue-600 text-white border-blue-700',
        warning: 'bg-amber-500 text-white border-amber-600',
    };

    return (
        <div className={`relative inline-flex ${className}`}>
            <div
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
            >
                {children}
            </div>

            {isVisible && content && (
                <div
                    role="tooltip"
                    className={`
                        absolute z-50 px-2.5 py-1.5 text-xs font-medium rounded-lg shadow-lg border whitespace-nowrap
                        ${positionClasses[position]}
                        ${variantClasses[variant]}
                        animate-in fade-in zoom-in-95 duration-150
                    `}
                >
                    {content}
                    <div className={`absolute border-4 ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
}

/**
 * TooltipIcon - Icon with tooltip
 */
export function TooltipIcon({ icon: Icon, content, position = 'right', className = '' }) {
    return (
        <Tooltip content={content} position={position}>
            <span className={`inline-flex cursor-help ${className}`}>
                <Icon className="w-4 h-4" />
            </span>
        </Tooltip>
    );
}
