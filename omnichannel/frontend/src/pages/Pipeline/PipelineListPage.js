import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Layout, Trash2, Copy, BarChart2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import PaywallGuard from '../../components/common/PaywallGuard';
import { useConfig } from '../../context/ConfigContext';

export default function PipelineListPage() {
    const navigate = useNavigate();
    const [pipelines, setPipelines] = useState([]);
    const [loading, setLoading] = useState(true);

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (hasFeature('feat_pipeline')) {
            fetchPipelines();
        } else {
            setLoading(false);
        }
    }, [hasFeature]);

    const fetchPipelines = async () => {
        try {
            const res = await axios.get('/api/app/pipelines');
            setPipelines(res.data);
        } catch (err) {
            if (err.response && err.response.status !== 403) {
                toast.error("Failed to load pipelines");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will delete all stages and history.")) return;
        try {
            await axios.delete(`/api/app/pipelines/${id}`);
            toast.success("Pipeline deleted");
            fetchPipelines();
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const handleCreate = () => {
        navigate('/pipelines/create');
    };

    return (
        <PaywallGuard feature="feat_pipeline" title="Pipeline CRM Locked" description="Manage your leads and deals efficiently with our Kanban-style Pipeline CRM.">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipelines</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your sales and support workflows</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Pipeline
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pipelines.map(pipe => (
                            <div key={pipe.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Layout className="w-6 h-6" />
                                    </div>
                                    <div className="dropdown dropdown-end relative group">
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 py-1">
                                            <button onClick={() => handleDelete(pipe.id)} className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm">
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{pipe.name}</h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{pipe.description || "No description"}</p>

                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>{pipe.stages?.length || 0} Stages</span>
                                    <span>{new Date(pipe.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                    <button
                                        onClick={() => navigate(`/pipelines/${pipe.id}/board`)}
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Open Board
                                    </button>
                                    <button className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500">
                                        <BarChart2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {pipelines.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <Layout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-xl font-medium text-gray-400">No pipelines yet</h3>
                                <button onClick={handleCreate} className="mt-4 text-indigo-600 font-medium hover:underline">Create your first pipeline</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PaywallGuard>
    );
}
