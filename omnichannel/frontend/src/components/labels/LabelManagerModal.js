
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Trash2, Edit2, Plus, Save, Palette } from 'lucide-react';
import Modal from '../common/Modal';

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export default function LabelManagerModal({ isOpen, onClose }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null); // null = create mode, obj = edit
  const [formData, setFormData] = useState({ name: '', color: COLORS[7] });

  useEffect(() => {
    if (isOpen) fetchLabels();
  }, [isOpen]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/app/labels');
      setLabels(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingLabel) {
        await axios.put(`/api/app/labels/${editingLabel.id}`, formData);
      } else {
        await axios.post('/api/app/labels', formData);
      }
      fetchLabels();
      resetForm();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this label? It will be removed from all contacts.')) return;
    try {
      await axios.delete(`/api/app/labels/${id}`);
      fetchLabels();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const startEdit = (label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color });
  };

  const resetForm = () => {
    setEditingLabel(null);
    setFormData({ name: '', color: COLORS[7] });
  };

  if (!isOpen) return null;

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Labels"
        size="md"
        className="max-h-[80vh] p-0 overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Form Area */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                placeholder="Label Name (e.g. VIP)" 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
              >
                {editingLabel ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingLabel ? 'Update' : 'Add'}
              </button>
              {editingLabel && (
                <button type="button" onClick={resetForm} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm">Cancel</button>
              )}
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Palette className="w-3 h-3" /> Color:</span>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({...formData, color: c})}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
             <div className="text-center py-4 text-gray-400">Loading...</div>
          ) : labels.length === 0 ? (
             <div className="text-center py-8 text-gray-400 text-sm">No labels created yet.</div>
          ) : (
             <div className="space-y-1">
               {labels.map(label => (
                 <div key={label.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label.name}</p>
                        <p className="text-[10px] text-gray-400">{label.contact_count} contacts</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => startEdit(label)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 rounded"><Edit2 className="w-3 h-3" /></button>
                       <button onClick={() => handleDelete(label.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
