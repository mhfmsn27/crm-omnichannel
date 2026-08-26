import React from 'react';
import {
    Pencil, Star, Reply, Forward, Database, Trash2,
    RotateCw, MoreVertical, Info, Copy, Pin, Smile
} from 'lucide-react';

/**
 * MessageMenu - Dropdown menu for message actions
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether menu is open
 * @param {boolean} props.isStarred - Whether message is starred
 * @param {boolean} props.isPinned - Whether message is pinned
 * @param {boolean} props.isOutbound - Whether message is outbound
 * @param {boolean} props.canEdit - Whether message can be edited
 * @param {boolean} props.canRetry - Whether retry is available
 * @param {string} props.status - Message status
 * @param {Function} props.onClose - Close menu handler
 * @param {Function} props.onInfo - Message info handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onStar - Star/unstar handler
 * @param {Function} props.onPin - Pin/unpin handler
 * @param {Function} props.onReply - Reply handler
 * @param {Function} props.onForward - Forward handler
 * @param {Function} props.onCopy - Copy text handler
 * @param {Function} props.onReact - React handler
 * @param {Function} props.onSaveToKb - Save to KB handler
 * @param {Function} props.onRevoke - Revoke handler (Delete for everyone)
 * @param {Function} props.onDelete - Delete handler (Delete for me)
 * @param {Function} props.onRetry - Retry handler
 * @param {Function} props.onToggle - Toggle menu handler
 * @param {boolean} props.isHovered - Whether message is hovered
 * @param {string} props.position - Menu position ('top' or 'bottom')
 */
export default function MessageMenu({
    isOpen,
    isStarred,
    isPinned,
    isOutbound,
    canEdit,
    canRetry,
    status,
    onClose,
    onInfo,
    onEdit,
    onStar,
    onPin,
    onReply,
    onForward,
    onCopy,
    onReact,
    onSaveToKb,
    onRevoke,
    onDelete,
    onRetry,
    onToggle,
    isHovered,
    position = 'bottom'
}) {
    const menuItems = [
        // Info (outbound only typically, or both)
        onInfo && {
            icon: Info,
            label: 'Info pesan',
            onClick: () => { onInfo(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Reply
        onReply && {
            icon: Reply,
            label: 'Balas',
            onClick: () => { onReply(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Copy
        onCopy && {
            icon: Copy,
            label: 'Salin',
            onClick: () => { onCopy(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // React
        onReact && {
            icon: Smile,
            label: 'Reaksi',
            onClick: () => { onReact(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Forward
        onForward && {
            icon: Forward,
            label: 'Teruskan',
            onClick: () => { onForward(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Pin
        onPin && {
            icon: Pin,
            label: isPinned ? 'Batal sematkan' : 'Sematkan',
            onClick: () => { onPin(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]',
            iconProps: isPinned ? { fill: 'currentColor' } : {}
        },
        // Star
        onStar && {
            icon: Star,
            label: isStarred ? 'Batal bintang' : 'Beri bintang',
            onClick: () => { onStar(); onClose(); },
            className: isStarred ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]',
            iconProps: isStarred ? { fill: 'currentColor' } : {}
        },
        // Edit (CRM specific, outbound within 15 min)
        canEdit && onEdit && {
            icon: Pencil,
            label: 'Edit',
            onClick: () => { onEdit(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Save to KB (CRM specific)
        onSaveToKb && {
            icon: Database,
            label: 'Simpan ke KB',
            onClick: () => { onSaveToKb(); onClose(); },
            className: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#182229]'
        },
        // Revoke (Delete for everyone - Outbound only)
        onRevoke && isOutbound && {
            icon: Trash2,
            label: 'Tarik pesan',
            onClick: () => { onRevoke(); onClose(); },
            className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
        },
        // Delete (Delete for me)
        onDelete && {
            icon: Trash2,
            label: 'Hapus untuk saya',
            onClick: () => { onDelete(); onClose(); },
            className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
        },
        // Retry (outbound pending/failed)
        canRetry && onRetry && {
            icon: RotateCw,
            label: 'Coba lagi',
            onClick: () => { onRetry(); onClose(); },
            className: 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
        }
    ].filter(Boolean);

    return (
        <div className="relative flex items-start mt-1 z-10">
            {/* Menu Toggle Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity ${
                    isOpen || isHovered ? 'opacity-100' : 'opacity-0'
                }`}
                aria-label="Message options"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    />

                    {/* Menu */}
                    <div
                        className={`
                            absolute z-50 bg-white dark:bg-[#233138] shadow-xl border border-gray-100 dark:border-gray-700
                            rounded-lg py-1 w-36 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100
                            ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                            ${isOutbound ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
                        `}
                    >
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={item.onClick}
                                    className={`px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${item.className}`}
                                >
                                    <Icon className="w-3.5 h-3.5" {...item.iconProps} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
