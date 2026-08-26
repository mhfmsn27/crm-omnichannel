import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Edit2, Trash2, Search, ArrowLeft, Palette, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import { Link } from 'react-router-dom';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'
];

export default function LabelManagementPage() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: COLORS[7] });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLabels();
  }, []);

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
        toast.success("Label updated");
      } else {
        await axios.post('/api/app/labels', formData);
        toast.success("Label created");
      }
      fetchLabels();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus label ini? Label akan hilang dari semua kontak.')) return;
    try {
      await axios.delete(`/api/app/labels/${id}`);
      toast.success("Label deleted");
      fetchLabels();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const startEdit = (label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingLabel(null);
    setFormData({ name: '', color: COLORS[7] });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading labels...</div>;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-dark-bg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Label Management
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Manage categories and tags for your contacts.</p>
            </div>
            <button onClick={openCreate} className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold shadow-sm">
                <Plus className="w-4 h-4" /> Create Label
            </button>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Label Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Tagged Contacts</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Created At</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {labels.map(label => (
                        <tr key={label.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                                <span 
                                    className="px-3 py-1 rounded-full text-sm font-bold border inline-flex items-center gap-2"
                                    style={{ 
                                        backgroundColor: label.color + '20', 
                                        color: label.color,
                                        borderColor: label.color + '40'
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: label.color}}></div>
                                    {label.name}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <Link to={`/contacts/list?label_ids=${label.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-sm">
                                    {label.contact_count || 0} Contacts
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">
                                {label.created_at ? new Date(label.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => startEdit(label)} className="p-2 text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 bg-white dark:bg-dark-bg border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(label.id)} className="p-2 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 bg-white dark:bg-dark-bg border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {labels.length === 0 && (
                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 dark:text-slate-500">No labels found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden space-y-3">
             {labels.map(label => (
                <div key={label.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                         <span 
                            className="px-3 py-1 rounded-full text-sm font-bold border inline-flex items-center gap-2"
                            style={{ 
                                backgroundColor: label.color + '20', 
                                color: label.color,
                                borderColor: label.color + '40'
                            }}
                        >
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: label.color}}></div>
                            {label.name}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => startEdit(label)} className="p-2 text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(label.id)} className="p-2 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-slate-400 mt-3 border-t border-gray-100 dark:border-slate-800 pt-3">
                        <Link to={`/contacts/list?label_ids=${label.id}`} className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                            {label.contact_count || 0} Contacts
                        </Link>
                        <span className="text-xs">
                             {label.created_at ? new Date(label.created_at).toLocaleDateString() : '-'}
                        </span>
                    </div>
                </div>
            ))}
             {labels.length === 0 && (
                <div className="p-8 text-center text-gray-400 dark:text-slate-500 bg-white dark:bg-dark-surface rounded-xl border border-dashed border-gray-300 dark:border-slate-700">No labels found.</div>
            )}
        </div>

        {/* MODAL */}
        {/* MODAL */}
        <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingLabel ? 'Edit Label' : 'Create Label'}
            size="md"
            footer={
                <ModalFooter>
                    <div className="w-full">
                        <button 
                            type="button"
                            onClick={handleSubmit}
                            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> {editingLabel ? 'Update Label' : 'Create Label'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Label Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. VIP Customer" 
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        autoFocus
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Label Color
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setFormData({...formData, color: c})}
                                className={`w-8 h-8 rounded-full transition-transform ${formData.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    </div>
  );
}
