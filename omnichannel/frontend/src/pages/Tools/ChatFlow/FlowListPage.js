import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GitBranch, Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PaywallGuard from '../../../components/common/PaywallGuard';
import { useConfig } from '../../../context/ConfigContext';

export default function FlowListPage() {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (hasFeature('feat_flowbuilder')) {
            fetchFlows();
        } else {
            setLoading(false);
        }
    }, [hasFeature]);

    const fetchFlows = async () => {
        try {
            const res = await axios.get('/api/app/flows');
            setFlows(res.data);
        } catch (err) {
            if (err.response && err.response.status !== 403) {
                console.error(err);
            }
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this flow?")) return;
        try {
            await axios.delete(`/api/app/flows/${id}`);
            setFlows(prev => prev.filter(f => f.id !== id));
            toast.success("Deleted");
        } catch (e) { toast.error("Failed"); }
    };

    const handleToggle = async (flow) => {
        try {
            const updated = { ...flow, is_active: !flow.is_active };
            await axios.put(`/api/app/flows/${flow.id}`, updated);
            setFlows(prev => prev.map(f => f.id === flow.id ? updated : f));
            toast.success("Status updated");
        } catch (e) { toast.error("Failed"); }
    };

    return (
        <PaywallGuard feature="feat_flowbuilder" title="Flow Builder Locked" description="Visual Flow Builder allows you to design complex conversation flows with drag-and-drop simplicity.">
            {loading ? (
                <div className="p-8 text-center">Loading...</div>
            ) : (
                <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
                    <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <GitBranch className="w-8 h-8 text-indigo-600" /> Chat Flow Builder
                            </h2>
                            <p className="text-sm text-gray-500">Design visual conversation flows.</p>
                        </div>
                        <Link to="create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create Flow
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flows.map(f => (
                            <div key={f.id} className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{f.name}</h3>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block text-gray-600">
                                            Trigger: {f.trigger_keyword}
                                        </span>
                                    </div>
                                    <button onClick={() => handleToggle(f)} className={`p-2 rounded-full ${f.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                                        {f.is_active ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                                    </button>
                                </div>

                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <Link to={`edit/${f.id}`} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {flows.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No flows created yet.</div>}
                    </div>
                </div>
            )}
        </PaywallGuard>
    );
}