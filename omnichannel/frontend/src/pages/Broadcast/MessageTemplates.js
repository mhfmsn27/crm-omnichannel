import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, X, Save, MessageSquare, Copy, Check, Upload, Loader2, Image as ImageIcon, Smartphone, Shuffle, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';
import Modal, { ModalFooter } from '../../components/common/Modal';

// --- INTERNAL MOBILE PREVIEW COMPONENT ---
const getSpintaxPreview = (text) => {
    if (!text) return "";
    const regex = /\{([^{}]+)\}|\[([^[\]]+)\]/g;
    return text.replace(regex, (match, p1, p2) => {
        const choicesStr = p1 || p2;
        const choices = choicesStr.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
};

const MobilePreview = ({ message, mediaUrl }) => {
    const [previewText, setPreviewText] = useState(message);

    useEffect(() => {
        const interval = setInterval(() => {
            setPreviewText(getSpintaxPreview(message));
        }, 3000);
        return () => clearInterval(interval);
    }, [message]);

    return (
        <div className="w-[240px] h-[480px] bg-gray-900 rounded-[30px] p-3 border-[6px] border-gray-800 shadow-xl relative mx-auto">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-gray-800 rounded-b-lg"></div>
            <div className="w-full h-full bg-[#e5ddd5] rounded-[20px] overflow-hidden flex flex-col pt-8 pb-4 px-2 font-sans">
                <div className="bg-[#075e54] h-10 flex items-center px-2 text-white mb-2 -mx-2 -mt-8 relative z-10 shadow-md">
                    <div className="w-7 h-7 bg-gray-300 rounded-full mr-2"></div>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold">My Brand</div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[95%] mb-2 text-[10px] text-gray-800 relative">
                        {mediaUrl && (
                            <div className="mb-2 rounded overflow-hidden">
                                <img src={getApiUrl(mediaUrl)} alt="Attachment" className="w-full h-auto object-cover max-h-24" />
                            </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{previewText || "Type message..."}</p>
                        <span className="text-[8px] text-gray-400 block text-right mt-1">12:00 PM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
// ---------------------------------------

export default function MessageTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ id: null, shortcut: '', content: '', media_url: '' });
    const [copiedId, setCopiedId] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/quick-replies?type=broadcast');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (form.id) {
                await axios.put(`/api/app/quick-replies/${form.id}`, form);
                toast.success("Template diperbarui");
            } else {
                await axios.post('/api/app/quick-replies', { ...form, type: 'broadcast' });
                toast.success("Template dibuat");
            }
            setIsModalOpen(false);
            fetchTemplates();
            setForm({ id: null, shortcut: '', content: '', media_url: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || "Gagal menyimpan");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this template?")) return;
        try {
            await axios.delete(`/api/app/quick-replies/${id}`);
            toast.success("Dihapus");
            fetchTemplates();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/inbox/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setForm(prev => ({ ...prev, media_url: res.data.url }));
            toast.success("Media diunggah");
        } catch (err) {
            toast.error("Gagal mengunggah");
        } finally {
            setUploading(false);
        }
    };

    const openCreate = () => {
        setForm({ id: null, shortcut: '', content: '', media_url: '' });
        setIsModalOpen(true);
    };

    const openEdit = (e, t) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setForm(t);
        setIsModalOpen(true);
    };

    const insertSpintax = (text) => {
        setForm(prev => ({ ...prev, content: prev.content + text }));
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-600" /> Message Templates
                    </h2>
                    <p className="text-gray-500 text-sm">Create reusable message templates with media & spintax.</p>
                </div>
                <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-bold shadow-sm">
                    <Plus className="w-4 h-4" /> Create Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {templates.map(t => (
                    <div key={t.id} onClick={() => openEdit({stopPropagation: () => {}}, t)} className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-purple-500/30 transition-all duration-300 flex flex-col h-full group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-1 truncate w-32" title={t.shortcut}>{t.shortcut}</h4>
                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-mono border border-purple-100">
                                    /{t.shortcut}
                                </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => openEdit(e, t)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-50"><Edit className="w-4 h-4" /></button>
                                <button onClick={(e) => handleDelete(e, t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-50"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {t.media_url && (
                            <div className="mb-3 rounded-lg overflow-hidden h-24 bg-gray-100 border border-gray-100">
                                <img src={getApiUrl(t.media_url)} alt="" className="w-full h-full object-cover opacity-80" />
                            </div>
                        )}

                        <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4 overflow-hidden">
                            <p className="text-xs text-gray-600 line-clamp-4 whitespace-pre-wrap font-sans">{t.content}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                            <span className="text-[10px] text-gray-400">
                                {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Unknown date'}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(t.content);
                                    setCopiedId(t.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                    toast.success("Konten disalin!");
                                }}
                                className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 font-medium"
                            >
                                {copiedId === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedId === t.id ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                ))}
                {templates.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                        No templates found.
                    </div>
                )}
            </div>

            {/* FULL SCREEN MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">{form.id ? 'Edit Template' : 'Create New Template'}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 font-normal">Define your message template and preview it instantly.</p>
                    </div>
                }
                size="lg"
                className="max-h-[90vh] flex flex-col p-0"
                footer={
                    <ModalFooter>
                        <div className="w-full flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button type="button" onClick={handleSubmit} className="px-8 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all transform hover:-translate-y-0.5">
                                <Save className="w-4 h-4" /> Save Template
                            </button>
                        </div>
                    </ModalFooter>
                }
            >
                <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                        {/* LEFT: FORM */}
                        <div className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template Name (Shortcut)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        value={form.shortcut}
                                        onChange={e => setForm({ ...form, shortcut: e.target.value })}
                                        placeholder="welcome_promo"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5">Lowercase letters, numbers, underscores, hyphens, and spaces allowed.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message Content</label>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    <button type="button" onClick={() => insertSpintax('{Hi|Hello|Halo}')} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 flex items-center gap-1 hover:bg-purple-100 transition-colors font-medium"><Shuffle className="w-3 h-3" /> Spintax</button>
                                    <button type="button" onClick={() => insertSpintax('{name}')} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors font-medium">{'{name}'}</button>
                                </div>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-4 text-sm h-48 focus:ring-2 focus:ring-purple-500 outline-none font-sans transition-all"
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    placeholder="Hi {name}, check out our new promo..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Attachment (Optional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative group">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleMediaUpload} />
                                    <div className="flex flex-col items-center justify-center pointer-events-none transition-transform group-hover:scale-105 duration-200">
                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                        ) : form.media_url ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="bg-green-100 p-2 rounded-full">
                                                    <ImageIcon className="w-6 h-6 text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium text-green-700">Media Attached Successfully</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-gray-100 p-3 rounded-full mb-2 group-hover:bg-purple-100 transition-colors">
                                                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-purple-700">Click to Upload Image</span>
                                                <span className="text-xs text-gray-400 mt-1">Supports JPG, PNG</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {form.media_url && (
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, media_url: '' })}
                                        className="text-xs text-red-500 hover:text-red-700 hover:underline mt-2 flex items-center justify-center w-full gap-1 font-medium"
                                    >
                                        <Trash2 className="w-3 h-3" /> Remove Media
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: PREVIEW */}
                        <div className="sticky top-0">
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center shadow-sm">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</h4>
                                </div>

                                <div className="transform scale-[0.85] sm:scale-100 transition-transform origin-top">
                                    <MobilePreview message={form.content.replace(/{name}/g, 'Budi')} mediaUrl={form.media_url} />
                                </div>

                                <p className="text-[10px] text-gray-400 mt-6 text-center max-w-xs bg-gray-50 px-3 py-1.5 rounded-full">
                                    Preview updates every 3s to demonstrate variables
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
