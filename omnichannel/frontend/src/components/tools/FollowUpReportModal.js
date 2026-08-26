import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Clock, StopCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../common/Modal';

export default function FollowUpReportModal({ isOpen, onClose, sequence }) {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && sequence) {
            fetchReport();
        }
    }, [isOpen, sequence]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/followups/sequences/${sequence.id}/report`);
            setInstances(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async (id) => {
        if (!confirm("Stop follow-up for this contact?")) return;
        try {
            await axios.delete(`/api/app/followups/instances/${id}`);
            toast.success("Stopped");
            setInstances(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            toast.error("Failed to stop");
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Active Follow-ups</h3>
                        <p className="text-xs text-gray-500 font-normal">Sequence: {sequence?.name}</p>
                    </div>
                    <button onClick={fetchReport} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
            size="lg"
            className="p-0 max-h-[80vh] flex flex-col"
        >
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Progress</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Next Run</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">Loading data...</td></tr>
                        ) : instances.map(inst => (
                            <tr key={inst.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{inst.contact_name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{inst.phone_number}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                        Step {inst.current_step_index + 1} / {sequence.steps.length}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-xs" title={new Date(inst.next_run_at).toLocaleString()}>
                                            {formatDistanceToNow(new Date(inst.next_run_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleStop(inst.id)} 
                                        className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded font-bold border border-red-100 flex items-center gap-1 ml-auto"
                                    >
                                        <StopCircle className="w-3 h-3" /> Stop
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && instances.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-12 text-center text-gray-400">
                                    No active contacts in this sequence.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}
