import React from 'react';
import { GitBranch, StopCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

/**
 * FlowIndicator - Active chat flow indicator
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function FlowIndicator({ conversation }) {
    if (!conversation.active_flow_name) return null;

    const handleStopFlow = async () => {
        if (!confirm("Terminate the current Chat Flow for this user?")) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/stop-flow`);
            toast.success("Flow terminated");
            window.location.reload();
        } catch (err) {
            toast.error("Failed to stop flow");
        }
    };

    return (
        <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 flex items-center justify-between">
            <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <GitBranch className="w-3 h-3" /> Active Flow
                </span>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                    {conversation.active_flow_name}
                </p>
            </div>
            <button
                onClick={handleStopFlow}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Stop Flow"
            >
                <StopCircle className="w-4 h-4" />
            </button>
        </div>
    );
}
