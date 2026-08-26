
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, X, Check } from 'lucide-react';

export default function LabelSelector({ contactId, existingLabels = [], onUpdate, onClose }) {
    const [labels, setLabels] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // Derive selected IDs from existingLabels prop
    const [selectedIds, setSelectedIds] = useState(existingLabels.map(l => l.id));

    useEffect(() => {
        fetchLabels();
        if(inputRef.current) inputRef.current.focus();
    }, []);

    useEffect(() => {
        // Sync local state if props change
        setSelectedIds(existingLabels.map(l => l.id));
    }, [existingLabels]);

    const fetchLabels = async () => {
        try {
            const res = await axios.get('/api/app/labels');
            setLabels(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (label) => {
        const isSelected = selectedIds.includes(label.id);
        
        // Optimistic Update
        let newSelectedIds;
        if (isSelected) {
            newSelectedIds = selectedIds.filter(id => id !== label.id);
        } else {
            newSelectedIds = [...selectedIds, label.id];
        }
        setSelectedIds(newSelectedIds);

        try {
            let res;
            if (isSelected) {
                res = await axios.delete(`/api/app/contacts/${contactId}/labels/${label.id}`);
            } else {
                res = await axios.post(`/api/app/contacts/${contactId}/labels`, { label_id: label.id });
            }
            
            // Pass updated labels back to parent for real-time UI update
            if (onUpdate && res.data.labels) {
                onUpdate(res.data.labels);
            }
        } catch (err) {
            console.error("Failed to toggle label");
            // Revert
            setSelectedIds(existingLabels.map(l => l.id));
        }
    };

    const handleCreate = async () => {
        if (!search) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/app/labels', { 
                name: search, 
                color: '#6366f1' // Default Indigo
            });
            const newLabel = res.data;
            setLabels([...labels, newLabel]);
            handleToggle(newLabel); // Auto assign
            setSearch('');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLabels = labels.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                    ref={inputRef}
                    type="text" 
                    className="w-full text-sm outline-none" 
                    placeholder="Search or create label..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="max-h-48 overflow-y-auto p-1">
                {filteredLabels.map(label => {
                    const isSelected = selectedIds.includes(label.id);
                    return (
                        <div 
                            key={label.id} 
                            onClick={() => handleToggle(label)}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }}></div>
                                <span>{label.name}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                    );
                })}

                {search && filteredLabels.length === 0 && (
                    <div 
                        onClick={handleCreate}
                        className="p-2 hover:bg-indigo-50 rounded cursor-pointer text-sm text-indigo-600 font-medium flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}
