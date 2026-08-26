import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, MessageSquare, Search, User, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export default function QuickReplySettings() {
    const { user: currentUser } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [templateForm, setTemplateForm] = useState({ id: null, shortcut: '', content: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/quick-replies?type=quick_reply');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (templateForm.id) {
                await axios.put(`/api/app/quick-replies/${templateForm.id}`, templateForm);
                toast.success("Template updated");
            } else {
                await axios.post('/api/app/quick-replies', { ...templateForm, type: 'quick_reply' });
                toast.success("Template created");
            }
            setIsModalOpen(false);
            fetchTemplates();
            setTemplateForm({ id: null, shortcut: '', content: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save template");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Delete this template?")) return;
        try {
            await axios.delete(`/api/app/quick-replies/${id}`);
            toast.success("Deleted");
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const openEditTemplate = (t) => {
        setTemplateForm(t);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center">Loading templates...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Message Templates</h2>
                    <p className="text-gray-500 text-sm">Create shortcuts for faster replies in Inbox.</p>
                </div>
                <button
                    onClick={() => { setTemplateForm({ id: null, shortcut: '', content: '' }); setIsModalOpen(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold shadow-sm"
                >
                    <PlusCircle className="w-4 h-4" /> New Template
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                            <th className="px-6 py-4">Shortcut</th>
                            <th className="px-6 py-4">Message Content</th>
                            {(currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'admin_member') && (
                                <th className="px-6 py-4">Created By</th>
                            )}
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {templates.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md font-mono text-sm font-bold border border-indigo-100">
                                        /{t.shortcut}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 max-w-lg truncate">
                                    {t.content}
                                </td>
                                {(currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'admin_member') && (
                                    <td className="px-6 py-4">
                                        {t.creator_name ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                <User className="w-3 h-3 text-gray-500" />
                                                {t.creator_name === currentUser?.name ? "You" : t.creator_name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'admin_member' || t.user_id === currentUser?.id) ? (
                                            <>
                                                <button onClick={() => openEditTemplate(t)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg border border-transparent hover:border-indigo-200 transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg border border-transparent hover:border-red-200 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic px-2">View Only</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {templates.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-12 text-center text-gray-400 text-sm bg-gray-50/50">
                                    No templates found. Create one to speed up your workflow!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={templateForm.id ? 'Edit Template' : 'Create Template'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleTemplateSubmit} icon={<Save className="w-4 h-4"/>}>
                            Save Template
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleTemplateSubmit} className="space-y-5">
                    <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Shortcut Key</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="welcome"
                                        value={templateForm.shortcut}
                                        onChange={e => setTemplateForm({ ...templateForm, shortcut: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Alphanumeric, spaces, underscores, hyphens allowed. Used to trigger quick reply.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Message Content</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32 outline-none resize-none"
                                    placeholder="Hi! How can we help you today?"
                                    value={templateForm.content}
                                    onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })}
                                    required
                                />
                            </div>
                        </form>
            </Modal>
        </div>
    );
}
