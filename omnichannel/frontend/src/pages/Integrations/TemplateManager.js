import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { RefreshCw, LayoutTemplate, CheckCircle, XCircle, Clock, Search, Plus, Trash2, Smartphone, AlertCircle, X, Save, Image as ImageIcon, Play, FileText, Link as ExternalLink, Phone, Copy, Reply } from 'lucide-react';

// Mobile Preview Component (Adapting from CreateCampaign)
const MobilePreview = ({ message, headerType, headerMedia, footer, buttons }) => {
    const [previewText, setPreviewText] = useState(message);

    useEffect(() => {
        setPreviewText(message);
    }, [message]);

    const displayMedia = headerMedia ? (typeof headerMedia === 'string' ? headerMedia : URL.createObjectURL(headerMedia)) : null;

    return (
        <div className="w-[280px] h-[580px] bg-gray-900 rounded-[35px] p-3 border-[6px] border-gray-800 shadow-2xl relative mx-auto select-none">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-gray-800 rounded-b-xl z-20"></div>
            <div className="w-full h-full bg-[#e5ddd5] rounded-[25px] overflow-hidden flex flex-col pt-10 pb-4 px-2 font-sans relative">
                {/* Header Bar */}
                <div className="bg-[#075e54] h-14 flex items-center px-3 text-white absolute top-0 left-0 w-full z-10 shadow-sm">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                    <div className="flex-1">
                        <div className="text-xs font-bold">My Brand</div>
                        <div className="text-[10px] opacity-80">online</div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-4">
                    <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[95%] mb-2 text-sm text-gray-800 relative ml-1">
                        {/* Header Media */}
                        {headerType === 'IMAGE' && (
                            <div className="mb-2 rounded overflow-hidden bg-gray-200 min-h-[100px] flex items-center justify-center">
                                {displayMedia ? (
                                    <img src={displayMedia} alt="Header" className="w-full h-auto object-cover" />
                                ) : (
                                    <ImageIcon className="text-gray-400 w-8 h-8" />
                                )}
                            </div>
                        )}
                        {headerType === 'VIDEO' && (
                            <div className="mb-2 rounded overflow-hidden bg-gray-200 h-24 flex items-center justify-center">
                                <Play className="text-gray-400 w-8 h-8" />
                            </div>
                        )}
                        {headerType === 'DOCUMENT' && (
                            <div className="mb-2 rounded bg-gray-100 p-3 flex items-center gap-2 border border-gray-200">
                                <FileText className="text-red-500 w-6 h-6" />
                                <span className="text-xs text-gray-500 font-mono">DOCUMENT.PDF</span>
                            </div>
                        )}

                        {/* Body */}
                        <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{previewText || "Type message..."}</p>

                        {/* Footer */}
                        {footer && (
                            <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{footer}</p>
                        )}

                        <span className="text-[9px] text-gray-400 block text-right mt-1">12:00 PM</span>
                    </div>

                    {/* Buttons */}
                    {buttons && buttons.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1 max-w-[95%] ml-1">
                            {buttons.map((btn, idx) => (
                                <div key={idx} className="bg-white text-[#00a69e] text-center py-2 rounded-lg shadow-sm text-sm font-medium border border-gray-100 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                                    {btn.type === 'PHONE_NUMBER' && <Smartphone className="w-3 h-3" />}
                                    {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                                    {btn.type === 'COPY_CODE' && <Copy className="w-3 h-3" />}
                                    {btn.type === 'QUICK_REPLY' && <Reply className="w-3 h-3" />}
                                    {btn.text || "Button"}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TemplateManager = () => {
    const [templates, setTemplates] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => { fetchDevices(); }, []);
    useEffect(() => { if (selectedDevice) fetchTemplates(selectedDevice); else setTemplates([]); }, [selectedDevice]);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/app/devices');
            const officials = res.data.filter(d => d.type === 'official' && d.status === 'connected');
            setDevices(officials);
            if (officials.length > 0) setSelectedDevice(officials[0].waba_id);
            else setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    const fetchTemplates = async (wabaId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/meta/templates?waba_id=${wabaId}`);
            setTemplates(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSync = async () => {
        if (!selectedDevice) return toast.error("Select a device first");
        setSyncing(true);
        const toastId = toast.loading("Syncing with Meta...");
        try {
            const res = await axios.put('/api/app/meta/templates/sync');
            toast.success(`Synced ${res.data.count} templates!`, { id: toastId });
            fetchTemplates(selectedDevice);
        } catch (err) {
            toast.error("Sync Failed: " + (err.response?.data?.error || err.message), { id: toastId });
        } finally { setSyncing(false); }
    };

    const handleDelete = async (templateName) => {
        if (!confirm(`Delete template "${templateName}"?`)) return;
        const toastId = toast.loading("Deleting...");
        try {
            await axios.delete(`/api/app/meta/templates/${templateName}?waba_id=${selectedDevice}`);
            toast.success("Template deleted", { id: toastId });
            setTemplates(prev => prev.filter(t => t.name !== templateName));
        } catch (err) {
            toast.error("Delete Failed: " + (err.response?.data?.error || err.message), { id: toastId });
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'APPROVED') return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle className="w-3 h-3" /> Approved</span>;
        if (status === 'REJECTED') return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3" /> Rejected</span>;
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold"><Clock className="w-3 h-3" /> Pending</span>;
    };

    const getBodyText = (components) => {
        if (!Array.isArray(components)) return '';
        const body = components.find(c => c.type === 'BODY');
        return body ? body.text : '';
    };

    const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    const currentDeviceName = devices.find(d => d.waba_id === selectedDevice)?.name || 'Unknown';

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutTemplate className="w-8 h-8 text-indigo-600" /> Template Manager
                    </h2>
                    <p className="text-sm text-gray-500">Create, sync and manage your Official WhatsApp templates.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <select
                            value={selectedDevice || ''}
                            onChange={(e) => setSelectedDevice(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-48 font-medium"
                        >
                            <option value="">Select Device</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.waba_id}>{d.name} ({d.whatsapp_number})</option>
                            ))}
                        </select>
                        <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    <button onClick={handleSync} disabled={syncing || !selectedDevice} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2 disabled:opacity-70 shadow-sm">
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setIsCreateOpen(true)} disabled={!selectedDevice} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70 shadow-sm">
                        <Plus className="w-4 h-4" /> Create Template
                    </button>
                </div>
            </div>

            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {!selectedDevice ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400">
                    <Smartphone className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium">Select a WhatsApp Device</p>
                </div>
            ) : loading ? (
                <div className="p-12 text-center text-gray-500">Loading templates...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(t => (
                        <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col group relative">
                            <button onClick={() => handleDelete(t.name)} className="absolute top-4 right-4 bg-white p-1.5 rounded-md border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 className="w-4 h-4" /></button>
                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm truncate w-40" title={t.name}>{t.name}</h4>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{t.language} • {t.category}</p>
                                </div>
                            </div>
                            <div className="mb-3 flex gap-2">{getStatusBadge(t.status)}</div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex-1 mb-3 overflow-hidden text-sm relative">
                                <p className="text-gray-600 whitespace-pre-wrap line-clamp-6 leading-relaxed">{getBodyText(t.components)}</p>
                            </div>
                            <div className="text-[10px] text-gray-400 text-right mt-auto">Last Sync: {new Date(t.synced_at).toLocaleString()}</div>
                        </div>
                    ))}
                    {filteredTemplates.length === 0 && <div className="col-span-full text-center py-16 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400">No templates found.</div>}
                </div>
            )}
            <CreateTemplateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} wabaId={selectedDevice} onSuccess={() => fetchTemplates(selectedDevice)} />
        </div>
    );
}

const CreateTemplateModal = ({ isOpen, onClose, wabaId, onSuccess }) => {
    // Config State
    const [name, setName] = useState('');
    const [category, setCategory] = useState('MARKETING');
    const [language, setLanguage] = useState('id');

    // Components State
    const [activeTab, setActiveTab] = useState('body'); // debug
    const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
    const [headerText, setHeaderText] = useState('');
    const [headerMedia, setHeaderMedia] = useState(null); // File object for Preview
    const [headerHandle, setHeaderHandle] = useState(null); // Meta File Handle
    const [uploadingMedia, setUploadingMedia] = useState(false); // NEW
    const [body, setBody] = useState('');
    const [footer, setFooter] = useState('');
    const [buttons, setButtons] = useState([]); // Array of { type, text, url?, phone_number? }

    const [submitting, setSubmitting] = useState(false);

    const addButton = (type) => {
        if (buttons.length >= 3) return toast.error("Max 3 buttons allowed");
        setButtons([...buttons, { type, text: '', url: '', phone_number: '' }]);
    };

    const removeButton = (idx) => {
        setButtons(buttons.filter((_, i) => i !== idx));
    };

    const updateButton = (idx, field, val) => {
        const newButtons = [...buttons];
        newButtons[idx][field] = val;
        setButtons(newButtons);
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Set Preview
        setHeaderMedia(file);
        setHeaderHandle(null); // Reset handle

        // 2. Upload to Backend -> Meta
        setUploadingMedia(true);
        const toastId = toast.loading("Uploading media to Meta...");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('waba_id', wabaId);

        try {
            const res = await axios.post('/api/app/meta/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setHeaderHandle(res.data.h);
            toast.success("Media uploaded successfully", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Upload Failed: " + (err.response?.data?.error || err.message), { id: toastId });
            setHeaderMedia(null); // Clear preview on failure? Or keep/retry? Clear is safer.
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSubmit = async () => {
        if (!name || !body) return toast.error("Name and Body are required");
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && !headerHandle) {
            return toast.error("Please wait for media upload to finish or re-upload.");
        }

        // Button Validation
        for (const btn of buttons) {
            if (!btn.text) return toast.error("All buttons must have text");
            if (btn.type === 'URL' && !btn.url) return toast.error("URL button requires a URL");
            if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) return toast.error("Phone button requires a number");
        }

        setSubmitting(true);
        try {
            const components = [];

            // Header
            if (headerType !== 'NONE') {
                const header = { type: 'HEADER', format: headerType };
                if (headerType === 'TEXT') header.text = headerText;

                // Add Media Example (Required for Approval)
                if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerHandle) {
                    header.example = { header_handle: [headerHandle] };
                }

                components.push(header);
            }

            // Body
            components.push({ type: 'BODY', text: body });

            // Footer
            if (footer) components.push({ type: 'FOOTER', text: footer });

            // Buttons
            if (buttons.length > 0) {
                const buttonsPayload = buttons.map(btn => {
                    if (btn.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: btn.text };
                    if (btn.type === 'URL') return { type: 'URL', text: btn.text, url: btn.url };
                    if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phone_number };
                    if (btn.type === 'COPY_CODE') return { type: 'COPY_CODE', example: "CODE123" }; // Simplified
                    return null;
                }).filter(Boolean);
                components.push({ type: 'BUTTONS', buttons: buttonsPayload });
            }

            await axios.post('/api/app/meta/templates', {
                waba_id: wabaId,
                name,
                category,
                language,
                components
            });
            toast.success("Template submitted to Meta!");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error("Failed: " + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="full"
            className="h-[90vh]"
            title={
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="w-6 h-6 text-indigo-600" /> Create New Template
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 hidden sm:block">Design your WhatsApp message template with real-time preview.</p>
                </div>
            }
            footer={
                <ModalFooter>
                    <div className="flex justify-end gap-3 w-full">
                        <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors">Cancel</button>
                        <button onClick={handleSubmit} disabled={submitting} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0">
                            {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {submitting ? 'Submitting...' : 'Submit Template'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="w-full max-w-7xl mx-auto p-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT: Config Form */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 leading-relaxed">
                                <strong>Tip:</strong> Avoid promotional language in Utility templates. Ensure content complies with Meta's Commerce Policy.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Template Name</label>
                                    <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} placeholder="e.g. promo_desember_2025" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    <p className="text-[10px] text-gray-400 mt-1.5">Unique name for your template (lowercase, underscores).</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Category</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                            <option value="MARKETING">Marketing</option>
                                            <option value="UTILITY">Utility</option>
                                            <option value="AUTHENTICATION">Authentication</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Language</label>
                                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                            <option value="id">Indonesian (id)</option>
                                            <option value="en">English (en)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-2"></div>

                            {/* Header Config */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Header (Optional)</label>
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                    {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map(type => (
                                        <button key={type} onClick={() => setHeaderType(type)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${headerType === type ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {headerType === 'TEXT' && (
                                    <input value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Enter header text..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                )}
                                {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                                    <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative group ${uploadingMedia ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}>
                                        <input type="file" id="headerUpload" className="hidden"
                                            accept={headerType === 'IMAGE' ? "image/*" : headerType === 'VIDEO' ? "video/*" : ".pdf"}
                                            onChange={handleMediaUpload} disabled={uploadingMedia} />
                                        <label htmlFor="headerUpload" className="cursor-pointer flex flex-col items-center gap-3 w-full h-full justify-center">
                                            <div className={`p-3 rounded-full ${uploadingMedia ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                                                {uploadingMedia ? <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" /> : <UploadIcon className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />}
                                            </div>
                                            <div>
                                                <span className="text-sm text-indigo-600 font-bold hover:underline">{uploadingMedia ? 'Uploading...' : `Click to upload ${headerType.toLowerCase()}`}</span>
                                                {!uploadingMedia && <p className="text-xs text-gray-400 mt-1">Required for Meta approval</p>}
                                            </div>
                                        </label>
                                        {headerMedia && !uploadingMedia && (
                                            <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                                <CheckCircle className="w-3.5 h-3.5" /> {headerMedia.name}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Body Config */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Message Body</label>
                                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Hello {{1}}, check out our latest offers..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm h-40 resize-none leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-[10px] text-gray-400">Supports variables {'{{1}}'}, bold *text*, italics _text_.</p>
                                    <button className="text-[10px] font-bold text-indigo-600 hover:underline">+ Add Variable</button>
                                </div>
                            </div>

                            {/* Footer Config */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Footer (Optional)</label>
                                <div className="relative">
                                    <input value={footer} onChange={e => setFooter(e.target.value)} placeholder="e.g. Reply STOP to unsubscribe" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">TXT</span>
                                </div>
                            </div>

                            {/* Buttons Config */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-bold text-gray-700 uppercase">Buttons (Optional)</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => addButton('QUICK_REPLY')} className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-bold hover:bg-indigo-100 border border-indigo-100 transition-colors">+ Quick Reply</button>
                                        <button onClick={() => addButton('URL')} className="text-[10px] bg-pink-50 text-pink-700 px-3 py-1.5 rounded-md font-bold hover:bg-pink-100 border border-pink-100 transition-colors">+ URL</button>
                                        <button onClick={() => addButton('PHONE_NUMBER')} className="text-[10px] bg-green-50 text-green-700 px-3 py-1.5 rounded-md font-bold hover:bg-green-100 border border-green-100 transition-colors">+ Phone</button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {buttons.map((btn, idx) => (
                                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-3 relative group transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm">
                                            <button onClick={() => removeButton(idx)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${btn.type === 'QUICK_REPLY' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : btn.type === 'URL' ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                    {btn.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <input value={btn.text} onChange={e => updateButton(idx, 'text', e.target.value)} placeholder="Button Text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />

                                            {btn.type === 'URL' && (
                                                <input value={btn.url} onChange={e => updateButton(idx, 'url', e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-blue-600 font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            )}
                                            {btn.type === 'PHONE_NUMBER' && (
                                                <input value={btn.phone_number} onChange={e => updateButton(idx, 'phone_number', e.target.value)} placeholder="+62..." className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-green-600 font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            )}
                                        </div>
                                    ))}
                                    {buttons.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                            <p className="text-xs text-gray-400">No buttons added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Live Preview */}
                    <div className="lg:col-span-5 sticky top-0">
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 flex flex-col items-center justify-center shadow-lg shadow-gray-100/50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400"></div>
                            <div className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Preview
                            </div>

                            <div className="transform scale-[0.85] xl:scale-100 transition-transform origin-top">
                                <MobilePreview
                                    message={body}
                                    headerType={headerType}
                                    headerMedia={headerMedia}
                                    footer={footer}
                                    buttons={buttons}
                                />
                            </div>

                            <p className="text-[10px] text-gray-400 mt-6 text-center max-w-xs">Template preview as it will appear on WhatsApp.</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Helper Icon
const UploadIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export default TemplateManager;
