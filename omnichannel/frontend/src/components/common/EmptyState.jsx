import React from 'react';
import { Inbox, Search, Users, FileText, MessageSquare, ShoppingCart, Bell, Wifi, WifiOff, Folder, Image, File, Mail, Phone, Calendar, Clock, AlertTriangle, CheckCircle, Star, Heart, Trash2, Edit3, Filter, Download, Upload, Plus, RefreshCw } from 'lucide-react';

/**
 * EmptyState Component
 * Provides consistent empty state UI across the application
 *
 * @param {Object} props
 * @param {string|ReactNode} props.title - Title text
 * @param {string|ReactNode} props.description - Description text
 * @param {ReactNode|Function} props.icon - Icon component or render prop returning icon
 * @param {Object} props.action - { label, onClick, icon, variant } for action button
 * @param {Array} props.actions - Array of action objects for multiple actions
 * @param {string} props.variant - Preset variant: 'default', 'search', 'error', 'success'
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Compact mode with smaller padding
 */
export default function EmptyState({
    title = 'No data found',
    description,
    icon,
    action,
    actions,
    variant = 'default',
    className = '',
    compact = false,
    ...props
}) {
    // Default icons by variant
    const defaultIcons = {
        default: Inbox,
        search: Search,
        users: Users,
        file: FileText,
        message: MessageSquare,
        cart: ShoppingCart,
        notification: Bell,
        connected: Wifi,
        disconnected: WifiOff,
        folder: Folder,
        image: Image,
        document: File,
        email: Mail,
        phone: Phone,
        calendar: Calendar,
        clock: Clock,
        warning: AlertTriangle,
        success: CheckCircle,
        star: Star,
        heart: Heart,
        trash: Trash2,
        edit: Edit3,
        filter: Filter,
        download: Download,
        upload: Upload,
        plus: Plus,
        refresh: RefreshCw,
    };

    // Color schemes by variant
    const colorSchemes = {
        default: {
            icon: 'text-gray-400',
            iconBg: 'bg-gray-100 dark:bg-gray-800',
            title: 'text-gray-700 dark:text-gray-200',
            desc: 'text-gray-500 dark:text-gray-400',
        },
        search: {
            icon: 'text-indigo-400',
            iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
            title: 'text-gray-700 dark:text-gray-200',
            desc: 'text-gray-500 dark:text-gray-400',
        },
        error: {
            icon: 'text-red-400',
            iconBg: 'bg-red-50 dark:bg-red-900/30',
            title: 'text-red-700 dark:text-red-300',
            desc: 'text-red-500 dark:text-red-400',
        },
        success: {
            icon: 'text-green-400',
            iconBg: 'bg-green-50 dark:bg-green-900/30',
            title: 'text-green-700 dark:text-green-300',
            desc: 'text-green-500 dark:text-green-400',
        },
    };

    // Resolve icon
    const IconComponent = icon
        ? (typeof icon === 'string' ? defaultIcons[icon] || Inbox : icon)
        : Inbox;

    const colors = colorSchemes[variant] || colorSchemes.default;

    // Action button styles
    const buttonVariants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
        secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200',
        outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:text-gray-200',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
        <div
            className={`flex flex-col items-center justify-center ${compact ? 'py-8 px-4' : 'py-12 px-4'} text-center w-full max-w-md mx-auto ${className}`}
            {...props}
        >
            {/* Icon Wrapper with Glow */}
            <div className="relative mb-6">
                <div className={`absolute inset-0 ${colors.iconBg} blur-xl opacity-60 rounded-full transform scale-150`} />
                <div className={`relative w-16 h-16 md:w-20 md:h-20 ${colors.iconBg} rounded-full flex items-center justify-center shadow-sm border border-white/50 dark:border-slate-700/50 backdrop-blur-sm`}>
                    <IconComponent className={`w-8 h-8 md:w-10 md:h-10 ${colors.icon}`} />
                </div>
            </div>

            {/* Title */}
            <h3 className={`text-base md:text-xl font-black ${colors.title} mb-2 tracking-tight`}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className={`text-sm md:text-base ${colors.desc} mb-8 leading-relaxed`}>
                    {description}
                </p>
            )}

            {/* Single Action */}
            {action && !actions && (
                <button
                    onClick={action.onClick}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${buttonVariants[action.variant || 'primary']} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={action.disabled}
                >
                    {action.icon && <action.icon className="w-4 h-4" />}
                    {action.label}
                </button>
            )}

            {/* Multiple Actions */}
            {actions && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {actions.map((actionItem, index) => (
                        <button
                            key={index}
                            onClick={actionItem.onClick}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${buttonVariants[actionItem.variant || 'primary']} ${actionItem.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={actionItem.disabled}
                        >
                            {actionItem.icon && <actionItem.icon className="w-4 h-4" />}
                            {actionItem.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * EmptyStateGrid - Grid layout version for multiple empty states
 */
export function EmptyStateGrid({ children, className = '' }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
            {children}
        </div>
    );
}

/**
 * EmptyStateCard - Card style empty state
 */
export function EmptyStateCard({ title, description, icon, action, className = '' }) {
    return (
        <div className={`card p-6 flex flex-col items-center text-center ${className}`}>
            <EmptyState
                title={title}
                description={description}
                icon={icon}
                action={action}
                compact
            />
        </div>
    );
}

/**
 * EmptyChatState - Specialized empty state for chat/inbox
 */
export function EmptyChatState({ onNewChat, onImport }) {
    return (
        <EmptyState
            icon="message"
            title="No conversations yet"
            description="Start a new conversation or import contacts to begin chatting with your customers."
            actions={[
                { label: 'New Chat', onClick: onNewChat, icon: Plus },
                { label: 'Import Contacts', onClick: onImport, icon: Upload, variant: 'secondary' },
            ]}
        />
    );
}

/**
 * EmptySearchState - Specialized empty state for search
 */
export function EmptySearchState({ query, onClear }) {
    return (
        <EmptyState
            icon="search"
            title={`No results for "${query || 'search query'}"`}
            description="Try adjusting your search terms or filters to find what you're looking for."
            action={{ label: 'Clear Search', onClick: onClear, icon: RefreshCw, variant: 'secondary' }}
        />
    );
}

/**
 * EmptyListState - Generic empty state for lists
 */
export function EmptyListState({ itemType = 'items', onAdd, onRefresh }) {
    return (
        <EmptyState
            icon="folder"
            title={`No ${itemType} yet`}
            description={`Start by adding your first ${itemType.slice(0, -1)} to get organized.`}
            actions={[
                ...(onAdd ? [{ label: `Add ${itemType.slice(0, -1).charAt(0).toUpperCase() + itemType.slice(1, -1)}`, onClick: onAdd, icon: Plus }] : []),
                ...(onRefresh ? [{ label: 'Refresh', onClick: onRefresh, icon: RefreshCw, variant: 'secondary' }] : []),
            ]}
        />
    );
}
