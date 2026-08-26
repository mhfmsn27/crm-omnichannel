import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Code, Copy, CheckCircle, Upload, Image, Plus, Globe, Edit, Trash2, ToggleLeft, ToggleRight, X, MessageSquare, Lock, ArrowRight, HelpCircle, Bot, Send, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import Modal, { ModalFooter } from '../../components/common/Modal';
import { toast } from 'react-hot-toast';

const WebchatEditorModal = ({ isOpen, onClose, widget, onSave }) => {
    const defaultConfig = {
        name: 'New Widget',
        is_active: true,
        primary_color: '#6366F1',
        logo_url: '',
        agent_name: 'Support Team',
        agent_status: 'Online',
        welcome_message: 'Halo! Ada yang bisa kami bantu?',
        require_email: false,
        require_phone: false,
        show_agent_face: true
    };

    const [config, setConfig] = useState(defaultConfig);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (widget) {
            setConfig({ ...defaultConfig, ...widget });
        } else {
            setConfig(defaultConfig);
        }
    }, [widget, isOpen]);

    const updateField = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/webchat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateField(field, res.data.url);
            toast.success("Image uploaded");
        } catch (err) {
            toast.error("Upload failed");
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onSave(config);
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={widget ? 'Edit Widget' : 'Create Widget'}
            size="full"
            className="h-[90vh] bg-gray-50 overflow-hidden p-0"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end gap-3 px-2">
                        <button onClick={onClose} className="px-6 py-2 border rounded-xl text-gray-700 font-bold hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Widget
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="flex h-full">
                {/* LEFT: FORM */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <section>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">General</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Widget Name</label>
                                <input className="w-full border p-2 rounded-lg" value={config.name} onChange={e => updateField('name', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Appearance</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Primary Color</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-10 rounded cursor-pointer border-0 p-0" value={config.primary_color} onChange={e => updateField('primary_color', e.target.value)} />
                                    <input type="text" className="flex-1 border p-2 rounded-lg uppercase" value={config.primary_color} onChange={e => updateField('primary_color', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Agent Avatar</label>
                                <div className="flex items-center gap-4 border p-3 rounded-lg border-dashed hover:bg-gray-50">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                        {config.logo_url ? <img src={getApiUrl(config.logo_url)} className="w-full h-full object-cover" /> : <Image className="w-4 h-4 text-gray-400" />}
                                    </div>
                                    <input type="file" className="text-xs" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} />
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <input type="checkbox" id="show_face" checked={config.show_agent_face} onChange={e => updateField('show_agent_face', e.target.checked)} />
                                    <label htmlFor="show_face" className="text-sm text-gray-600">Show Agent Avatar in Header</label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Company / Agent Name</label>
                                <input className="w-full border p-2 rounded-lg" value={config.agent_name} onChange={e => updateField('agent_name', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Status Text</label>
                                <input className="w-full border p-2 rounded-lg" value={config.agent_status} onChange={e => updateField('agent_status', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Greeting & Options</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Welcome Message</label>
                                <textarea className="w-full border p-2 rounded-lg h-24" value={config.welcome_message} onChange={e => updateField('welcome_message', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="req_email" checked={config.require_email} onChange={e => updateField('require_email', e.target.checked)} />
                                <label htmlFor="req_email" className="text-sm text-gray-600">Require Email Before Chat</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="req_phone" checked={config.require_phone} onChange={e => updateField('require_phone', e.target.checked)} />
                                <label htmlFor="req_phone" className="text-sm text-gray-600">Require Phone Before Chat</label>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 border-l border-gray-100">
                     <div className="text-gray-400 text-sm font-medium">Live Preview</div>
                </div>
            </div>
        </Modal>
    );
};

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Instalasi Webchat
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Saya Mengerti
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4 text-sm text-gray-600">
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 1: Buat Widget</h4>
                    <p>Klik tombol <strong>"Create Widget"</strong>, atur tampilan, warna, dan pesan sambutan sesuai brand Anda. Jangan lupa klik <strong>Save</strong>.</p>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 2: Ambil Kode Instalasi</h4>
                    <p>Klik tombol <strong>"Get Install Code"</strong> pada widget yang sudah dibuat. Copy kode HTML yang muncul.</p>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 3: Pasang di Website</h4>
                    <p>Paste kode tersebut di dalam tag <code>&lt;body&gt;</code> atau <code>&lt;head&gt;</code> pada file HTML website Anda (Wordpress, Wix, custom HTML, dll).</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-700">
                    <strong>Tips:</strong> Pastikan status widget <strong>"Active"</strong> agar muncul di website Anda.
                </div>
            </div>
        </Modal>
    );
};

export default function WebchatPage() {
    const navigate = useNavigate();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [selectedWidget, setSelectedWidget] = useState(null);
    const [installCode, setInstallCode] = useState(null);
    const [limitStats, setLimitStats] = useState({ used: 0, limit: 0, allowed: true, locked: false });

    const fetchWidgets = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/webchat');
            const data = Array.isArray(res.data) ? res.data : [res.data];
            setWidgets(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/app/webchat/stats');
            setLimitStats(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchWidgets();
        fetchStats();
    }, []);

    const handleSave = async (config) => {
        try {
            if (config.id) {
                await axios.put(`/api/app/webchat/${config.id}`, config);
                toast.success("Updated successfully");
            } else {
                await axios.post('/api/app/webchat', config);
                toast.success("Created successfully");
                fetchStats();
            }
            setIsModalOpen(false);
            fetchWidgets();
        } catch (e) {
            if (e.response && e.response.status === 403) {
                if (confirm(`⚠️ LIMIT REACHED / LOCKED!\n\n${e.response.data.error}\n\nUpgrade your plan?`)) {
                    navigate('/order');
                }
            } else {
                toast.error("Failed to save: " + (e.response?.data?.error || e.message));
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this widget?")) return;
        try {
            await axios.delete(`/api/app/webchat/${id}`);
            fetchWidgets();
            fetchStats();
            toast.success("Widget deleted");
        } catch (e) { toast.error("Delete failed"); }
    };

    const handleToggle = async (widget) => {
        try {
            await axios.put(`/api/app/webchat/${widget.id}`, { ...widget, is_active: !widget.is_active });
            fetchWidgets();
        } catch (e) {
            if (e.response?.status === 403) toast.error("Cannot activate: Feature Locked");
            else toast.error("Toggle failed: " + (e.response?.data?.error || "Unknown Error"));
        }
    };

    const showInstallCode = (uid) => {
        const code = `
<!-- Script Webchat -->
<script>
  window.REPLY_WIDGET_ID = "${uid}";
</script>
<script src="${getApiUrl('/widget.js')}" async></script>
<!-- End Webchat -->`;
        setInstallCode(code);
    };

    const isLocked = false; // PERSONAL VERSION: Unlock
    const isLimitReached = false;
    const isBlocked = false;

    if (loading) return <div className="p-8 flex justify-center"><Upload className="w-8 h-8 animate-bounce text-gray-300" /></div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="w-8 h-8 text-indigo-600" /> Webchat Widgets
                    </h1>

                    <div className="flex gap-2 items-center mt-1">
                        <p className="text-sm text-gray-500">Create and manage live chat widgets for your websites.</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" /> Panduan
                    </button>
                    <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${isBlocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {isBlocked ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {isLocked ? 'Feature Locked' : <span>Usage: {limitStats.used} / {limitStats.limit}</span>}
                    </div>
                    {!isBlocked && (
                        <button
                            onClick={() => { setSelectedWidget(null); setIsModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Create Widget
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {isBlocked && (
                    <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-5 flex flex-col items-center justify-center text-center h-[280px] group transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-red-100 flex items-center justify-center mb-4 z-10">
                            <Lock className="w-8 h-8 text-red-400" />
                        </div>
                        <span className="font-bold text-lg text-gray-700 z-10">
                            {isLocked ? "Feature Locked" : "Limit Reached"}
                        </span>
                        <span className="text-xs mt-2 text-gray-500 max-w-[80%] z-10 mb-4">
                            {isLocked
                                ? "This feature is not included in your current plan."
                                : `You have reached the limit of ${limitStats.limit} widgets.`}
                        </span>
                        <button
                            onClick={() => navigate('/order')}
                            className="z-10 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1 animate-pulse"
                        >
                            <ArrowRight className="w-3 h-3" /> Upgrade Plan
                        </button>
                    </div>
                )}

                {widgets.map(w => (
                    <div key={w.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[280px] flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 truncate w-40">{w.name}</h3>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                {w.is_active ? 'Active' : 'Inactive'}
                            </div>
                        </div>
                        <div className="p-5 space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: w.primary_color }}>
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Widget ID</p>
                                    <p className="font-mono text-xs font-bold bg-gray-100 px-1 rounded">{w.widget_uid?.substring(0, 8)}...</p>
                                </div>
                            </div>
                            <button
                                onClick={() => showInstallCode(w.widget_uid)}
                                className="w-full py-2 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-2"
                            >
                                <Code className="w-3 h-3" /> Get Install Code
                            </button>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                            <button onClick={() => handleToggle(w)} className={`text-2xl ${w.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                {w.is_active ? <ToggleRight /> : <ToggleLeft />}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedWidget(w); setIsModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(w.id)} className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!isBlocked && widgets.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Globe className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400">No widgets found.</p>
                    </div>
                )}
            </div>

            <WebchatEditorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                widget={selectedWidget}
                onSave={handleSave}
            />

            <Modal
                isOpen={!!installCode}
                onClose={() => setInstallCode(null)}
                title="Installation Code"
                size="md"
            >
                <div className="bg-gray-900 p-4 rounded-lg relative group mt-4">
                    <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap break-all">{installCode}</pre>
                    <button
                        onClick={() => { navigator.clipboard.writeText(installCode); toast.success("Copied!"); }}
                        className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 text-white"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
            </Modal>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}
