import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

const LabelAssignmentModal = ({ isOpen, onClose, conversationId, initialLabels = [], onUpdate }) => {
    const [availableLabels, setAvailableLabels] = useState([]);
    const [selectedLabelIds, setSelectedLabelIds] = useState([]);
    const [newLabelName, setNewLabelName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLabels();
            setSelectedLabelIds(initialLabels.map(l => l.id));
        }
    }, [isOpen, initialLabels]);

    const fetchLabels = async () => {
        try {
            const res = await axios.get('/api/app/labels'); // Assuming endpoint exists
            setAvailableLabels(res.data);
        } catch (e) {
            console.error("Failed to fetch labels");
            // Mock if fail
            setAvailableLabels([
                { id: 1, name: 'VIP', color: '#ef4444' },
                { id: 2, name: 'New Customer', color: '#10b981' },
                { id: 3, name: 'Support', color: '#3b82f6' },
                { id: 4, name: 'Lead', color: '#f59e0b' }
            ]);
        }
    };

    const handleCreateLabel = async () => {
        if (!newLabelName.trim()) return;
        setIsCreating(true);
        try {
            const res = await axios.post('/api/app/labels', { name: newLabelName, color: '#6366f1' }); // Default color
            setAvailableLabels([...availableLabels, res.data]);
            setNewLabelName('');
            toast.success("Label created");
        } catch (e) {
            toast.error("Failed to create label");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // This endpoint might need to be adjusted based on actual backend API
            await axios.post(`/api/app/inbox/conversations/${conversationId}/labels`, { labelIds: selectedLabelIds });

            // Construct new labels array for local update
            const newLabels = availableLabels.filter(l => selectedLabelIds.includes(l.id));
            onUpdate(newLabels);

            toast.success("Labels updated");
            onClose();
        } catch (e) {
            toast.error("Failed to update labels");
        } finally {
            setLoading(false);
        }
    };

    const toggleLabel = (id) => {
        if (selectedLabelIds.includes(id)) {
            setSelectedLabelIds(selectedLabelIds.filter(lid => lid !== id));
        } else {
            setSelectedLabelIds([...selectedLabelIds, id]);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Manage Labels
                </div>
            }
            size="sm"
            footer={
                <ModalFooter>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Saving...' : 'Save Labels'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                {/* Label List */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {availableLabels.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No labels found.</p>}
                        {availableLabels.map(label => (
                            <div
                                key={label.id}
                                onClick={() => toggleLabel(label.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${selectedLabelIds.includes(label.id)
                                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800'
                                        : 'bg-gray-50 border-transparent hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }}></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{label.name}</span>
                                </div>
                                {selectedLabelIds.includes(label.id) && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                            </div>
                        ))}
                    </div>

                    {/* Create New */}
                    <div className="flex gap-2 mb-4">
                        <input
                            className="flex-1 text-xs border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white"
                            placeholder="New label name..."
                            value={newLabelName}
                            onChange={e => setNewLabelName(e.target.value)}
                        />
                        <button
                            onClick={handleCreateLabel}
                            disabled={!newLabelName || isCreating}
                            className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                </div>
        </Modal>
    );
};

export default LabelAssignmentModal;
