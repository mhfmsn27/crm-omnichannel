import React, { useState, memo } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

/**
 * AccordionSection - Reusable accordion component
 */
const AccordionSection = memo(({ title, isOpen, onToggle, icon: Icon, children }) => (
    <div className="border-b border-gray-100 dark:border-dark-border">
        <button
            onClick={onToggle}
            className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-left"
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && (
            <div className="px-5 pb-5 bg-white dark:bg-dark-surface">
                {children}
            </div>
        )}
    </div>
));

/**
 * NoteSection - Internal note section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function NoteSection({ conversation }) {
    const [note, setNote] = useState(conversation?.internal_note || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveNote = async () => {
        setIsSaving(true);
        try {
            await axios.put(`/api/app/contacts/${conversation.contact_id}/note`, { internal_note: note });
            toast.success("Note saved");
        } catch {
            toast.error("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AccordionSection title="Internal Note" isOpen={false} onToggle={() => {}} icon={FileText}>
            <div className="relative">
                <textarea
                    className="w-full bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-gray-700 dark:text-yellow-100 placeholder-gray-400 dark:placeholder-yellow-500/50 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none h-32 resize-none"
                    placeholder="Add notes about this contact..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={handleSaveNote}
                />
                {isSaving && (
                    <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 italic">
                        Saving...
                    </span>
                )}
            </div>
        </AccordionSection>
    );
}
