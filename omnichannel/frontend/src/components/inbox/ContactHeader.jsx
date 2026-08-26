import React, { useState } from 'react';
import { X } from 'lucide-react';
import LabelSelector from '../labels/LabelSelector';

/**
 * ContactHeader - Contact info header component
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 * @param {Array} props.activeLabels - Active labels
 * @param {Function} props.onLabelUpdate - Label update handler
 */
export default function ContactHeader({ conversation, activeLabels, onLabelUpdate }) {
    const [isLabelSelectorOpen, setIsLabelSelectorOpen] = useState(false);

    const formatDisplayName = (name) => {
        if (!name) return '';
        return String(name).split('@')[0];
    };

    return (
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
                <img
                    src={conversation.profile_pic_url || `/api/avatar/${encodeURIComponent(conversation.contact_name || '')}`}
                    onError={(e) => { e.target.onerror = null; e.target.src = `/api/avatar/${encodeURIComponent(conversation.contact_name || '')}`; }}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 dark:ring-slate-700"
                    alt=""
                />
                {conversation.status === 'open' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {formatDisplayName(conversation.contact_name)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                    {formatDisplayName(conversation.phone_number)}
                </p>

                {/* Labels */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {activeLabels.map(l => (
                        <span
                            key={l.id}
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                            style={{ backgroundColor: l.color + '20', color: l.color, borderColor: l.color + '40' }}
                        >
                            {l.name}
                        </span>
                    ))}
                    <button
                        onClick={() => setIsLabelSelectorOpen(!isLabelSelectorOpen)}
                        className="text-[10px] font-medium text-indigo-600 hover:underline flex items-center gap-1 min-h-[20px]"
                    >
                        {activeLabels.length === 0 ? "+ Add Label" : "Edit"}
                    </button>
                </div>

                {/* Inline Label Selector */}
                {isLabelSelectorOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white shadow-xl rounded-lg border border-gray-200 p-2 z-20">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-xs font-bold">Manage Labels</span>
                            <button onClick={() => setIsLabelSelectorOpen(false)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <LabelSelector
                            contactId={conversation.contact_id}
                            existingLabels={activeLabels}
                            onClose={() => setIsLabelSelectorOpen(false)}
                            onUpdate={onLabelUpdate}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
