import React, { useState } from 'react';
import { Ticket, AlertTriangle, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

/**
 * TicketInfoSection - Ticket info and priority section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function TicketInfoSection({ conversation }) {
    const [localPriority, setLocalPriority] = useState(conversation?.priority || 'medium');

    const handlePriorityChange = async (newPriority) => {
        const prev = localPriority;
        setLocalPriority(newPriority);
        try {
            await axios.patch(`/api/app/inbox/conversations/${conversation.id}/priority`, { priority: newPriority });
            toast.success('Prioritas diperbarui');
        } catch {
            setLocalPriority(prev);
            toast.error('Gagal mengubah prioritas');
        }
    };

    const priorityClasses = {
        urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        low: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
    };

    const priorityLabels = {
        urgent: 'Urgent',
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah',
    };

    return (
        <div className="px-5 py-2.5 bg-indigo-50/60 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-2 flex-wrap">
            {/* Ticket Number */}
            <div className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide">
                    {conversation.ticket_number}
                </span>
            </div>

            {/* Priority & SLA */}
            <div className="flex items-center gap-1.5">
                <select
                    value={localPriority}
                    onChange={e => handlePriorityChange(e.target.value)}
                    className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border-0 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-400 ${priorityClasses[localPriority]}`}
                >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Urgent</option>
                </select>

                {conversation.sla_breached ? (
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle className="w-2.5 h-2.5" /> SLA
                    </span>
                ) : !conversation.sla_breached && conversation.sla_deadline_at && conversation.status !== 'resolved' ? (
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <ShieldAlert className="w-2.5 h-2.5" /> On Track
                    </span>
                ) : null}
            </div>
        </div>
    );
}
