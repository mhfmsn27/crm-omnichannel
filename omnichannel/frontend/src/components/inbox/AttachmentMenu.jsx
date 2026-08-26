import React from 'react';
import {
    Image as ImageIcon,
    Video,
    Mic,
    FileText,
    ExternalLink,
    Package,
    Truck,
    CreditCard,
    FormInput,
    User,
    MapPin,
    BarChart3,
    Calendar
} from 'lucide-react';

/**
 * AttachmentMenu - File attachment and media menu
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether menu is open
 * @param {Function} props.onSelect - Selection handler (receives type)
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.isGroupChat - Whether in a group chat (for poll/event)
 */
export default function AttachmentMenu({ isOpen, onSelect, onClose, isGroupChat = false }) {
    if (!isOpen) return null;

    const menuItems = [
        { type: 'image', icon: ImageIcon, label: 'Photos', color: 'purple' },
        { type: 'video', icon: Video, label: 'Videos', color: 'pink' },
        { type: 'audio', icon: Mic, label: 'Audios', color: 'orange' },
        { type: 'document', icon: FileText, label: 'Documents', color: 'indigo' },
        { divider: true },
        { type: 'contact', icon: User, label: 'Kontak', color: 'green' },
        { type: 'location', icon: MapPin, label: 'Lokasi', color: 'blue' },
        { type: 'poll', icon: BarChart3, label: 'Polling', color: 'violet', groupOnly: true },
        { type: 'event', icon: Calendar, label: 'Acara', color: 'purple', groupOnly: true },
        { divider2: true },
        { type: 'cta', icon: ExternalLink, label: 'CTA Buttons', color: 'indigo' },
        { type: 'product', icon: Package, label: 'Product Catalog', color: 'green' },
        { divider2: true },
        { type: 'ongkir', icon: Truck, label: 'Cek Ongkir', color: 'green' },
        { type: 'payment', icon: CreditCard, label: 'Payment Link', color: 'blue' },
        { type: 'waflow', icon: FormInput, label: 'WA Form (Flow)', color: 'emerald' },
    ];

    const colorClasses = {
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300',
        pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
        violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300',
    };

    return (
        <div
            className="absolute bottom-[60px] left-2 bg-white dark:bg-dark-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-dark-border p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 w-52 origin-bottom-left max-h-[60vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="space-y-1 pb-1">
                {menuItems.map((item, idx) => {
                    if (item.divider) {
                        return <div key={`divider-${idx}`} className="h-px bg-gray-100 dark:bg-gray-700 my-2" />;
                    }
                    if (item.divider2) {
                        return <div key={`divider2-${idx}`} className="h-px bg-gray-100 dark:bg-gray-700 my-2" />;
                    }

                    // Skip group-only items if not in group
                    if (item.groupOnly && !isGroupChat) {
                        return null;
                    }

                    const Icon = item.icon;

                    return (
                        <button
                            key={item.type}
                            onClick={() => {
                                onSelect(item.type);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors min-h-[44px]"
                        >
                            <div className={`p-1.5 rounded-full ${colorClasses[item.color]}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span>{item.label}</span>
                            {item.groupOnly && (
                                <span className="ml-auto text-[10px] text-gray-400">Grup</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
