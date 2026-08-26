import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
    CheckCircle, XCircle, AlertCircle, Info,
    X, Loader2
} from 'lucide-react';

/**
 * Custom Toast Icons
 */
const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    loading: <Loader2 className="w-5 h-5 animate-spin" />,
};

/**
 * Toast Types Configuration
 */
const toastTypes = {
    success: {
        className: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        iconClassName: 'text-green-500',
    },
    error: {
        className: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        iconClassName: 'text-red-500',
    },
    warning: {
        className: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
        iconClassName: 'text-amber-500',
    },
    info: {
        className: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        iconClassName: 'text-blue-500',
    },
    loading: {
        className: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        iconClassName: 'text-gray-500',
    },
};

/**
 * Custom Toast Styles
 */
const toastStyles = {
    custom: {
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
};

/**
 * Custom Toast Component
 */
const CustomToast = ({ message, type = 'info', icon, title }) => {
    const config = toastTypes[type] || toastTypes.info;
    const ToastIcon = icon || icons[type] || icons.info;

    return (
        <div className={`flex items-start gap-3 ${config.className} border rounded-2xl p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-right-8 fade-in duration-300 ease-out pointer-events-auto`}>
            <div className={config.iconClassName}>
                {ToastIcon}
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-0.5 tracking-tight">
                        {title}
                    </p>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    {message}
                </p>
            </div>
            <button
                onClick={() => toast.dismiss()}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

/**
 * Toast Configuration
 */
export const toastConfig = {
    position: 'bottom-right',
    gutter: 12,
    containerStyle: {
        margin: '16px',
        zIndex: 9999,
    },
    toastStyle: {
        ...toastStyles.custom,
        maxWidth: '400px',
        width: '100%',
    },
    duration: 4000,
};

/**
 * Pre-configured Toast Functions
 */
export const showToast = {
    success: (message, options = {}) => {
        return toast.success(message, {
            ...options,
            style: toastStyles.custom,
            className: toastTypes.success.className,
        });
    },

    error: (message, options = {}) => {
        return toast.error(message, {
            ...options,
            style: toastStyles.custom,
            className: toastTypes.error.className,
            duration: options.duration || 6000, // Errors stay longer
        });
    },

    warning: (message, options = {}) => {
        return toast(message, {
            ...options,
            icon: icons.warning,
            style: toastStyles.custom,
            className: toastTypes.warning.className,
        });
    },

    info: (message, options = {}) => {
        return toast(message, {
            ...options,
            icon: icons.info,
            style: toastStyles.custom,
            className: toastTypes.info.className,
        });
    },

    loading: (message, options = {}) => {
        return toast.loading(message, {
            ...options,
            style: toastStyles.custom,
            className: toastTypes.loading.className,
        });
    },

    custom: (message, { type = 'info', title, icon } = {}, options = {}) => {
        return toast.custom(
            <CustomToast message={message} type={type} title={title} icon={icon} />,
            {
                ...options,
                style: toastStyles.custom,
            }
        );
    },
};

/**
 * Toast Provider Component
 * Add this to your app's root component
 */
export function ToastProvider() {
    return (
        <Toaster
            position={toastConfig.position}
            gutter={toastConfig.gutter}
            containerStyle={toastConfig.containerStyle}
            toastOptions={{
                duration: toastConfig.duration,
            }}
        />
    );
}

/**
 * Hook for using toast in components
 */
export function useToast() {
    return {
        success: showToast.success,
        error: showToast.error,
        warning: showToast.warning,
        info: showToast.info,
        loading: showToast.loading,
        custom: showToast.custom,
        dismiss: toast.dismiss,
        dismissAll: toast.dismiss,
    };
}

export default ToastProvider;
