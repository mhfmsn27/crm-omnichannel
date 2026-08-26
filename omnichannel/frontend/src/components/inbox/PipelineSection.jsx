import React, { useState, useEffect, memo } from 'react';
import { ChevronDown, ChevronUp, Columns } from 'lucide-react';
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
 * PipelineSection - Pipeline management section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function PipelineSection({ conversation }) {
    const [pipelines, setPipelines] = useState([]);
    const [selectedPipeline, setSelectedPipeline] = useState(conversation?.pipeline_id || '');
    const [selectedStage, setSelectedStage] = useState(conversation?.pipeline_stage_id || '');

    useEffect(() => {
        fetchPipelines();
    }, []);

    const fetchPipelines = async () => {
        try {
            const res = await axios.get('/api/app/pipelines');
            setPipelines(res.data);
        } catch {}
    };

    const handlePipelineChange = async (pipeId) => {
        const pid = pipeId === '' ? null : Number(pipeId);
        setSelectedPipeline(pid);
        let newStageId = null;
        if (pid) {
            const pipe = pipelines.find(p => p.id === pid);
            if (pipe?.stages?.length > 0) newStageId = pipe.stages[0].id;
        }
        await updatePipeline(pid, newStageId);
    };

    const handleStageChange = async (stageId) => {
        const sid = stageId === '' ? null : Number(stageId);
        await updatePipeline(selectedPipeline, sid);
    };

    const updatePipeline = async (pid, sid) => {
        try {
            await axios.post(`/api/app/conversations/${conversation.id}/pipeline`, {
                pipelineId: pid,
                stageId: sid
            });
            setSelectedStage(sid);
            toast.success("Pipeline updated");
        } catch {
            toast.error("Update failed");
        }
    };

    return (
        <AccordionSection title="Pipeline" isOpen={false} onToggle={() => {}} icon={Columns}>
            <div className="space-y-3">
                <select
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    value={selectedPipeline || ''}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                >
                    <option value="">No Pipeline</option>
                    {pipelines.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                {selectedPipeline && (
                    <select
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                        value={selectedStage || ''}
                        onChange={(e) => handleStageChange(e.target.value)}
                    >
                        <option value="">Select Stage...</option>
                        {pipelines.find(p => p.id === selectedPipeline)?.stages?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </AccordionSection>
    );
}
