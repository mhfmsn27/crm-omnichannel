import React, { useState, useEffect, memo } from 'react';
import { ChevronDown, ChevronUp, Play, StopCircle } from 'lucide-react';
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
 * FollowupSection - Auto follow-up section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function FollowupSection({ conversation }) {
    const [activeFollowup, setActiveFollowup] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [selectedSequence, setSelectedSequence] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchFollowupStatus();
        fetchSequences();
    }, [conversation?.id]);

    const fetchFollowupStatus = async () => {
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${conversation.id}/followup/status`);
            setActiveFollowup(res.data);
        } catch {
            setActiveFollowup(null);
        }
    };

    const fetchSequences = async () => {
        try {
            const res = await axios.get('/api/app/followups/sequences');
            setSequences(res.data);
            if (res.data.length > 0) setSelectedSequence(res.data[0].id);
        } catch {}
    };

    const startFollowup = async () => {
        if (!selectedSequence) return;
        setIsLoading(true);
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/followup/start`, { sequence_id: selectedSequence });
            toast.success("Auto Follow-up Started");
            fetchFollowupStatus();
        } catch {
            toast.error("Failed to start");
        } finally {
            setIsLoading(false);
        }
    };

    const stopFollowup = async () => {
        if (!confirm("Stop auto follow-up?")) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/followup/stop`);
            toast.success("Stopped");
            setActiveFollowup(null);
        } catch {
            toast.error("Failed to stop");
        }
    };

    return (
        <AccordionSection title="Auto Follow-up" isOpen={false} onToggle={() => {}}>
            {activeFollowup ? (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs font-bold text-orange-800 dark:text-orange-300">
                                {activeFollowup.sequence_name}
                            </p>
                            <p className="text-[10px] text-orange-600 dark:text-orange-400">
                                Step {activeFollowup.current_step_index} of {activeFollowup.steps.length}
                            </p>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3">
                        Next run: {new Date(activeFollowup.next_run_at).toLocaleString()}
                    </p>
                    <button
                        onClick={stopFollowup}
                        className="w-full py-1.5 bg-white dark:bg-dark-bg border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center gap-1"
                    >
                        <StopCircle className="w-3 h-3" /> Stop Sequence
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <select
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                        value={selectedSequence}
                        onChange={e => setSelectedSequence(e.target.value)}
                    >
                        <option value="">Select Sequence...</option>
                        {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                        onClick={startFollowup}
                        disabled={!selectedSequence || isLoading}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Play className="w-3 h-3" />
                        )}
                        Start Follow-up
                    </button>
                </div>
            )}
        </AccordionSection>
    );
}
