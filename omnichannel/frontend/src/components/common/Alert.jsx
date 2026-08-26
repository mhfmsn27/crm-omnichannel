import React from 'react';
import { AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';

/**
 * Alert - Alert/Message component
 *
 * @param {Object} props
 * @param {string} props.variant - Alert variant: 'info', 'success', 'warning', 'error'
 * @param {string} props.title - Optional title
 * @param {ReactNode} props.children - Alert content
 * @param {Function} props.onClose - Optional close handler
 * @param {boolean} props.dismissible - Whether alert can be dismissed
 * @param {string} props.className - Additional CSS classes
 */
export default function Alert({
    variant = 'info',
    title,
    children,
    onClose,
    dismissible = false,
    className = '',
    ...props
}) {
    const [isVisible, setIsVisible] = React.useState(true);

    if (!isVisible) return null;

    const icons = {
        info: Info,
        success: CheckCircle,
        warning: AlertCircle,
        error: XCircle,
    };

    const Icon = icons[variant];

    const variants = {
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            text: 'text-blue-700 dark:text-blue-300',
            icon: 'text-blue-500',
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            text: 'text-green-700 dark:text-green-300',
            icon: 'text-green-500',
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            text: 'text-amber-700 dark:text-amber-300',
            icon: 'text-amber-500',
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-700 dark:text-red-300',
            icon: 'text-red-500',
        },
    };

    const styles = variants[variant];

    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-xl border
                ${styles.bg}
                ${styles.border}
                ${className}
            `}
            role="alert"
            {...props}
        >
            <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                {title && (
                    <h4 className={`font-bold text-sm ${styles.text} mb-1`}>
                        {title}
                    </h4>
                )}
                <div className={`text-sm ${styles.text}`}>
                    {children}
                </div>
            </div>
            {(dismissible || onClose) && (
                <button
                    onClick={() => {
                        setIsVisible(false);
                        onClose?.();
                    }}
                    className={`flex-shrink-0 p-1 rounded hover:bg-black/10 ${styles.text}`}
                    aria-label="Dismiss"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
