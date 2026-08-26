import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToggleLeft, ToggleRight, AlertTriangle, Save, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';

const categories = {
    core: { label: 'Core System', color: 'bg-blue-100 text-blue-700' },
    module: { label: 'Modules', color: 'bg-purple-100 text-purple-700' },
    tool: { label: 'Tools', color: 'bg-orange-100 text-orange-700' },
    finance: { label: 'Finance', color: 'bg-green-100 text-green-700' },
    integration: { label: 'Integrations', color: 'bg-gray-100 text-gray-700' }
};

export default function FeatureManager() {
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMessageKey, setEditMessageKey] = useState(null);
    const [messageDraft, setMessageDraft] = useState('');

    useEffect(() => {
        fetchFlags();
    }, []);

    const fetchFlags = async () => {
        try {
            const res = await axios.get('/api/sa/features');
            setFlags(res.data);
        } catch (err) {
            toast.error("Failed to load flags");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (flag) => {
        const newStatus = !flag.is_active;
        if (!newStatus) {
            if (!confirm(`WARNING: Disabling ${flag.name} will block access for ALL users. Are you sure?`)) return;
        }

        try {
            await axios.put(`/api/sa/features/${flag.key}`, {
                is_active: newStatus,
                maintenance_message: flag.maintenance_message
            });
            setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, is_active: newStatus } : f));
            toast.success(`Feature ${newStatus ? 'Enabled' : 'Disabled'}`);
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const saveMessage = async (key) => {
        try {
            await axios.put(`/api/sa/features/${key}`, {
                is_active: false, // Assuming editing message implies it's in maintenance or stays same state, logic simplified
                maintenance_message: messageDraft
            });
            setFlags(prev => prev.map(f => f.key === key ? { ...f, maintenance_message: messageDraft } : f));
            setEditMessageKey(null);
            toast.success("Maintenance message updated");
        } catch (err) {
            toast.error("Failed to save message");
        }
    };

    const groupedFlags = flags.reduce((acc, flag) => {
        const cat = flag.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(flag);
        return acc;
    }, {});

    if (loading) return <div className="p-8 text-center">Loading features...</div>;

    return (
        <div className="p-6">
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
                <Wrench className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                    <h3 className="font-bold text-blue-900">System Feature Flags</h3>
                    <p className="text-sm text-blue-700">
                        Use these switches to enable/disable features globally. Useful for maintenance or emergency kill-switches.
                        Changes apply immediately to all tenants.
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {Object.keys(groupedFlags).map(cat => (
                    <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${categories[cat]?.color || 'bg-gray-100'}`}>
                                {categories[cat]?.label || cat}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {groupedFlags[cat].map(flag => (
                                <div key={flag.key} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                {flag.name}
                                                {!flag.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">MAINTENANCE</span>}
                                            </h4>
                                            <code className="text-xs text-gray-400 bg-gray-100 px-1 rounded">{flag.key}</code>
                                        </div>
                                        <button
                                            onClick={() => handleToggle(flag)}
                                            className={`text-2xl transition-colors ${flag.is_active ? 'text-green-500' : 'text-gray-400'}`}
                                        >
                                            {flag.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    </div>

                                    {!flag.is_active && (
                                        <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Maintenance Message
                                                </span>
                                                {editMessageKey !== flag.key && (
                                                    <button
                                                        onClick={() => { setEditMessageKey(flag.key); setMessageDraft(flag.maintenance_message || ''); }}
                                                        className="text-xs text-indigo-600 hover:underline"
                                                    >
                                                        Edit Message
                                                    </button>
                                                )}
                                            </div>

                                            {editMessageKey === flag.key ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 border p-1.5 rounded text-sm"
                                                        value={messageDraft}
                                                        onChange={e => setMessageDraft(e.target.value)}
                                                        placeholder="Reason for maintenance..."
                                                    />
                                                    <button onClick={() => saveMessage(flag.key)} className="bg-indigo-600 text-white px-3 rounded text-xs font-bold">Save</button>
                                                    <button onClick={() => setEditMessageKey(null)} className="text-gray-500 text-xs px-2">Cancel</button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-red-700 italic">
                                                    "{flag.maintenance_message || 'System Maintenance'}"
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}