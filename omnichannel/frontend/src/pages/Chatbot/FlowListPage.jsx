import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bot, Zap, ArrowRight, Trash2, Edit2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function FlowCard({ flow, onDelete }) {
    return (
        <div className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{flow.name}</h3>
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                            {flow.trigger_keyword}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        flow.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {flow.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Link
                    to={`/chatbot/flows/${flow.id}`}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                >
                    <Edit2 className="w-4 h-4" /> Edit Flow
                </Link>
                <button
                    onClick={() => onDelete(flow.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function FlowListPage() {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/flows');
            setFlows(res.data);
        } catch (e) {
            toast.error('Failed to load flows');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this flow?')) return;
        try {
            await axios.delete(`/api/app/flows/${id}`);
            toast.success('Flow deleted');
            fetchFlows();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const handleToggle = async (flow) => {
        try {
            await axios.put(`/api/app/flows/${flow.id}`, {
                is_active: !flow.is_active
            });
            fetchFlows();
        } catch (e) {
            toast.error('Failed to update');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Bot className="w-6 h-6" />
                        Visual Flow Builder
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create chatbot flows with drag-and-drop
                    </p>
                </div>
                <Link
                    to="/chatbot/flows/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    New Flow
                </Link>
            </div>

            {flows.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed">
                    <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No flows yet</h3>
                    <p className="text-sm text-gray-400 mt-2">
                        Create your first visual chatbot flow
                    </p>
                    <Link
                        to="/chatbot/flows/new"
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" /> Create Flow
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flows.map(flow => (
                        <FlowCard
                            key={flow.id}
                            flow={flow}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}