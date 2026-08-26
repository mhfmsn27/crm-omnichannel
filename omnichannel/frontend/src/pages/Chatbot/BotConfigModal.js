import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, MessageSquare, Clock, Database, Upload, Trash2, Calendar, ToggleLeft, ToggleRight, Sparkles, Plus, Book, Bot, Settings, BarChart2, Edit2, ExternalLink, RefreshCw, MessageCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

const DAYS = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' }
];

export default function BotConfigModal({ isOpen, bot, onClose }) {
    const [activeTab, setActiveTab] = useState('persona');
    const [formData, setFormData] = useState({
        ...bot,
        auto_reply_config: {
            welcome: { enabled: false, message: '' },
            business_hours: {
                enabled: false,
                message: 'Maaf, kami sedang tutup. Kami akan membalas pesan Anda pada jam kerja.',
                schedule: {}
            },
            ...bot.auto_reply_config
        }
    });

    const [qaList, setQaList] = useState([]);
    const manualQAList = qaList.filter(q => !q.is_ai_learned);
    const aiQAList = qaList.filter(q => q.is_ai_learned);
    const [assets, setAssets] = useState([]);
    const [newQa, setNewQa] = useState({ question: '', answer: '' });
    const handleUpload = () => toast.error('Upload asset is not configured');
    
    // AI Tools & Analytics State
    const [aiTools, setAiTools] = useState([]);
    const [newTool, setNewTool] = useState({ name: '', description: '', method: 'GET', url: '', parameters: '' });
    const [aiStats, setAiStats] = useState({ total_messages: 0, total_fallbacks: 0, fallback_rate: 0 });
    const [aiLogs, setAiLogs] = useState([]);

    useEffect(() => {
        if (bot && bot.id) {
            if (activeTab === 'kb' && !formData.use_global_kb) {
                axios.get(`/api/app/chatbot/kb?session_id=${bot.id}`).then(res => {
                    setQaList(res.data.qa || []);
                    setAssets(res.data.assets || []);
                }).catch(() => { });
            } else if (activeTab === 'tools') {
                axios.get(`/api/app/chatbot/tools?bot_config_id=${bot.id}`)
                    .then(res => setAiTools(res.data)).catch(() => { });
            } else if (activeTab === 'analytics') {
                axios.get(`/api/app/chatbot/logs/analytics?bot_config_id=${bot.id}`)
                    .then(res => {
                        if (res.data.metrics) setAiStats(res.data.metrics);
                        if (res.data.recent_fallbacks) setAiLogs(res.data.recent_fallbacks);
                    }).catch(() => { });
            }
        }
    }, [activeTab, bot, formData.use_global_kb]);

    const handleSave = async () => {
        try {
            await axios.put(`/api/app/chatbot/bots/${bot.id}`, formData);
            toast.success("Configuration Saved");
            onClose();
        } catch (err) {
            toast.error("Failed to save");
        }
    };

    const handleDayToggle = (dayKey) => {
        setFormData(prev => ({
            ...prev,
            auto_reply_config: {
                ...prev.auto_reply_config,
                business_hours: {
                    ...prev.auto_reply_config.business_hours,
                    schedule: { ...prev.auto_reply_config.business_hours.schedule, [dayKey]: { isOpen: !(prev.auto_reply_config.business_hours.schedule?.[dayKey]?.isOpen), open: '09:00', close: '17:00' } }
                }
            }
        }));
    };

    const handleTimeChange = (dayKey, type, value) => {
        setFormData(prev => ({
            ...prev,
            auto_reply_config: {
                ...prev.auto_reply_config,
                business_hours: {
                    ...prev.auto_reply_config.business_hours,
                    schedule: { ...prev.auto_reply_config.business_hours.schedule, [dayKey]: { ...prev.auto_reply_config.business_hours.schedule?.[dayKey], [type]: value } }
                }
            }
        }));
    };

    const handleAddQa = async () => {
        try {
            const res = await axios.post('/api/app/chatbot/kb/qa', { ...newQa, session_id: bot.id });
            setQaList([...qaList, res.data]);
            setNewQa({ question: '', answer: '' });
        } catch (err) { toast.error("Failed add QA"); }
    };

    const handleAddTool = async () => {
        if (!newTool.name || !newTool.url) return toast.error("Name and URL are required");
        let parsedParams = {};
        try { if (newTool.parameters) parsedParams = JSON.parse(newTool.parameters); }
        catch (e) { return toast.error("Parameters must be valid JSON"); }
        try {
            const res = await axios.post('/api/app/chatbot/tools', { ...newTool, bot_config_id: bot.id, parameters: parsedParams });
            setAiTools([res.data, ...aiTools]);
            setNewTool({ name: '', description: '', method: 'GET', url: '', parameters: '' });
            toast.success("Tool added");
        } catch (err) { toast.error("Failed to add tool"); }
    };

    const handleDeleteTool = async (id) => {
        try {
            await axios.delete(`/api/app/chatbot/tools/${id}`);
            setAiTools(aiTools.filter(t => t.id !== id));
            toast.success("Tool deleted");
        } catch (err) { toast.error("Failed to delete tool"); }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Configure: ${bot?.name || ''}`}
            size="full"
            className="h-[90vh] bg-gray-50/50 p-0 overflow-hidden"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                            <Save className="w-5 h-5" /> Save Configuration
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="flex flex-col h-full">
                <div className="flex border-b bg-white overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('persona')} className={`px-6 py-3 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'persona' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                        Persona & Rules
                    </button>
                    <button onClick={() => setActiveTab('kb')} className={`px-6 py-3 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'kb' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                        Knowledge Base
                    </button>
                    <button onClick={() => setActiveTab('tools')} className={`px-6 py-3 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'tools' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                        Function Calling
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                        AI Analytics
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {/* TAB 1: PERSONA */}
                    {activeTab === 'persona' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div>
                                        <span className="font-bold text-gray-800 block">Enable AI Bot</span>
                                        <span className="text-xs text-gray-500">Turn off to stop auto-replies</span>
                                    </div>
                                    <div
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${formData.is_active ? 'translate-x-6' : ''}`}></div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">System Prompt (Persona)</label>
                                    <textarea
                                        className="w-full h-40 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.system_prompt}
                                        onChange={e => setFormData({ ...formData, system_prompt: e.target.value })}
                                        placeholder="Kamu adalah asisten customer service yang ramah.&#10;Selalu sapa customer dengan nama mereka di awal percakapan.&#10;Contoh: &quot;Halo {{customer_name}}! Ada yang bisa saya bantu?&quot;"
                                    />
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tip: Gunakan Variabel untuk Personalisasi</p>
                                        <div className="text-xs text-blue-800 space-y-1">
                                            <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{customer_name}}'}</code> untuk nama customer</div>
                                            <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{whatsapp_number}}'}</code> untuk nomor WhatsApp</div>
                                            <p className="text-blue-700 italic mt-1.5">Contoh: "Halo {'{{customer_name}}'}, terima kasih sudah chat!"</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Escalation Keywords</label>
                                    <input
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.escalation_keywords}
                                        onChange={e => setFormData({ ...formData, escalation_keywords: e.target.value })}
                                        placeholder="human, admin, manager"
                                    />
                                </div>
                                
                                <div className="mt-6 border-t pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="font-bold text-gray-800">AI Auto Follow-up (Double Text)</label>
                                        <div
                                            onClick={() => setFormData({ ...formData, double_text_enabled: !formData.double_text_enabled })}
                                            className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${formData.double_text_enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${formData.double_text_enabled ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">If the customer stops replying, the AI will automatically send a follow-up message to bump the conversation.</p>
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-600">Delay before follow-up (minutes):</label>
                                        <input type="number" min="1" className="border p-2 rounded-lg w-20 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.double_text_delay_minutes || 5} onChange={e => setFormData({...formData, double_text_delay_minutes: parseInt(e.target.value)})} disabled={!formData.double_text_enabled} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: RULES */}
                    {activeTab === 'rules' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {/* Welcome Message */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-bold text-gray-800 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Welcome Message</span>
                                    <div
                                        onClick={() => setFormData({
                                            ...formData,
                                            auto_reply_config: {
                                                ...formData.auto_reply_config,
                                                welcome: { ...formData.auto_reply_config.welcome, enabled: !formData.auto_reply_config.welcome?.enabled }
                                            }
                                        })}
                                        className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${formData.auto_reply_config.welcome?.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${formData.auto_reply_config.welcome?.enabled ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </div>

                                {formData.auto_reply_config.welcome?.enabled && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <textarea
                                            className="w-full border p-3 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.auto_reply_config.welcome?.message || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                auto_reply_config: { ...formData.auto_reply_config, welcome: { ...formData.auto_reply_config.welcome, message: e.target.value } }
                                            })}
                                            placeholder="Hi! Thanks for contacting us. How can I help?"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Business Hours */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 flex items-center gap-2"><Clock className="w-4 h-4" /> Bot Active Time</span>
                                        <span className="text-xs text-gray-500">Bot will only reply within these hours</span>
                                    </div>
                                    <div
                                        onClick={() => setFormData({
                                            ...formData,
                                            auto_reply_config: {
                                                ...formData.auto_reply_config,
                                                business_hours: { ...formData.auto_reply_config.business_hours, enabled: !formData.auto_reply_config.business_hours?.enabled }
                                            }
                                        })}
                                        className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${formData.auto_reply_config.business_hours?.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${formData.auto_reply_config.business_hours?.enabled ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </div>

                                {formData.auto_reply_config.business_hours?.enabled && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                        {/* Daily Schedule */}
                                        <div className="space-y-3">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Operational Schedule</label>
                                            {DAYS.map(day => {
                                                const schedule = formData.auto_reply_config.business_hours?.schedule?.[day.key] || { isOpen: false, open: '09:00', close: '17:00' };

                                                return (
                                                    <div key={day.key} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-3 w-32">
                                                            <div
                                                                onClick={() => handleDayToggle(day.key)}
                                                                className={`cursor-pointer ${schedule.isOpen ? 'text-green-600' : 'text-gray-300'}`}
                                                            >
                                                                {schedule.isOpen ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                            </div>
                                                            <span className={`text-sm font-medium ${schedule.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>{day.label}</span>
                                                        </div>

                                                        {schedule.isOpen ? (
                                                            <div className="flex items-center gap-2 animate-in fade-in">
                                                                <input
                                                                    type="time"
                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                    value={schedule.open}
                                                                    onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                                                                />
                                                                <span className="text-gray-400 text-xs">to</span>
                                                                <input
                                                                    type="time"
                                                                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                    value={schedule.close}
                                                                    onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic mr-4">Closed</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: KB */}
                    {activeTab === 'kb' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm mb-6">
                                <label className="font-bold text-gray-800 mb-2 block">Knowledge Source</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-4 border rounded-lg cursor-pointer ${formData.use_global_kb ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'}`}>
                                        <input type="radio" name="kbsource" checked={formData.use_global_kb} onChange={() => setFormData({ ...formData, use_global_kb: true })} className="hidden" />
                                        <div className="font-bold text-indigo-900">Global Knowledge Base</div>
                                        <div className="text-xs text-gray-500">Use shared data for all bots.</div>
                                    </label>
                                    <label className={`flex-1 p-4 border rounded-lg cursor-pointer ${!formData.use_global_kb ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'}`}>
                                        <input type="radio" name="kbsource" checked={!formData.use_global_kb} onChange={() => setFormData({ ...formData, use_global_kb: false })} className="hidden" />
                                        <div className="font-bold text-indigo-900">Custom Knowledge Base</div>
                                        <div className="text-xs text-gray-500">Exclusive data for this bot only.</div>
                                    </label>
                                </div>
                            </div>

                            {!formData.use_global_kb && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Q&A */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
                                        <h3 className="font-bold mb-4">Custom Q&A</h3>
                                        <div className="space-y-2 mb-4">
                                            <input className="w-full border p-2 rounded text-sm" placeholder="Question" value={newQa.question} onChange={e => setNewQa({ ...newQa, question: e.target.value })} />
                                            <input className="w-full border p-2 rounded text-sm" placeholder="Answer" value={newQa.answer} onChange={e => setNewQa({ ...newQa, answer: e.target.value })} />
                                            <button onClick={handleAddQa} className="w-full bg-gray-800 text-white py-1 rounded text-sm">Add Pair</button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto max-h-80 pr-2 custom-scrollbar space-y-4">

                                            {/* MANUAL LIST */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-white py-1">Manual Q&A</h4>
                                                <div className="space-y-2">
                                                    {manualQAList.map(q => (
                                                        <div key={q.id} className="p-2 bg-gray-50 border rounded text-xs relative group">
                                                            <p className="font-bold">Q: {q.question}</p>
                                                            <p>A: {q.answer}</p>
                                                            <button onClick={(e) => { e.stopPropagation(); axios.delete(`/api/app/chatbot/kb/qa/${q.id}`).then(() => { setQaList(prev => prev.filter(x => x.id !== q.id)); toast.success("Q&A terhapus"); }).catch(err => toast.error("Gagal menghapus Q&A")); }} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-1 z-10">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {manualQAList.length === 0 && <p className="text-gray-400 text-xs italic">No manual items.</p>}
                                                </div>
                                            </div>

                                            {/* AI GENERATED LIST */}
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2 sticky top-0 bg-white py-1 flex items-center gap-1 mt-4">
                                                    <Sparkles className="w-3 h-3" /> AI Learned Q&A
                                                </h4>
                                                <div className="space-y-2">
                                                    {aiQAList.map(q => (
                                                        <div key={q.id} className="p-2 bg-indigo-50 border border-indigo-100 rounded text-xs relative group">
                                                            <p className="font-bold text-indigo-900">Q: {q.question}</p>
                                                            <p className="text-indigo-800">A: {q.answer}</p>
                                                            <button onClick={(e) => { e.stopPropagation(); axios.delete(`/api/app/chatbot/kb/qa/${q.id}`).then(() => { setQaList(prev => prev.filter(x => x.id !== q.id)); toast.success("Q&A terhapus"); }).catch(err => toast.error("Gagal menghapus Q&A")); }} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-1 z-10">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {aiQAList.length === 0 && <p className="text-gray-400 text-xs italic">No AI generated items.</p>}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Assets */}
                                    <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
                                        <h3 className="font-bold mb-4">Custom Documents</h3>
                                        <div className="border-2 border-dashed p-4 text-center rounded-lg mb-4 hover:bg-gray-50 transition-colors relative">
                                            <input type="file" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                            <span className="text-xs text-gray-500">Upload PDF</span>
                                        </div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {assets.map(a => (
                                                <div key={a.id} className="flex justify-between p-2 bg-gray-50 border rounded text-xs items-center">
                                                    <span className="truncate w-40">{a.description}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="uppercase text-gray-400 text-[10px]">{a.mime_type.split('/')[1]}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); axios.delete(`/api/app/chatbot/assets/${a.id}`).then(() => { setAssets(prev => prev.filter(x => x.id !== a.id)); toast.success("Dokumen terhapus"); }).catch(err => toast.error("Gagal menghapus dokumen")); }} className="text-red-400 hover:text-red-600 p-1 z-10 relative">
                                                            <Trash2 className="w-3 h-3 pointer-events-none" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {assets.length === 0 && <p className="text-gray-400 text-xs text-center">No documents.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: FUNCTION CALLING */}
                    {activeTab === 'tools' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-600" /> AI Function Calling</h3>
                                <p className="text-sm text-gray-500 mb-6">Allow your AI to securely access external APIs (e.g. check invoice status, search product inventory) when interacting with users.</p>

                                <div className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-4">
                                    <h4 className="font-bold text-sm text-gray-700">Add New Tool</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="border p-2 rounded text-sm" placeholder="Function Name (e.g. check_order)" value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} />
                                        <input className="border p-2 rounded text-sm" placeholder="Description (Tell AI when to use this)" value={newTool.description} onChange={e => setNewTool({...newTool, description: e.target.value})} />
                                        <div className="flex gap-2">
                                            <select className="border p-2 rounded text-sm" value={newTool.method} onChange={e => setNewTool({...newTool, method: e.target.value})}>
                                                <option>GET</option>
                                                <option>POST</option>
                                            </select>
                                            <input className="flex-1 border p-2 rounded text-sm" placeholder="URL Endpoint" value={newTool.url} onChange={e => setNewTool({...newTool, url: e.target.value})} />
                                        </div>
                                        <textarea className="border p-2 rounded text-sm font-mono h-10" placeholder='{"order_id": {"type": "string"}}' value={newTool.parameters} onChange={e => setNewTool({...newTool, parameters: e.target.value})} />
                                    </div>
                                    <button onClick={handleAddTool} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700">Add Tool</button>
                                </div>

                                <div className="space-y-3">
                                    {aiTools.map(t => (
                                        <div key={t.id} className="border p-4 rounded-lg flex justify-between items-start bg-white">
                                            <div>
                                                <div className="font-bold text-indigo-700">{t.name} <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded ml-2">{t.method}</span></div>
                                                <div className="text-sm text-gray-600">{t.description}</div>
                                                <div className="text-xs text-gray-400 mt-1 truncate max-w-md">{t.url}</div>
                                            </div>
                                            <button onClick={() => handleDeleteTool(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {aiTools.length === 0 && <p className="text-center text-gray-400 py-4">No tools defined yet.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <div className="text-gray-500 text-sm font-bold uppercase mb-2">Total AI Queries</div>
                                    <div className="text-3xl font-black text-gray-800">{aiStats.total_messages}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <div className="text-gray-500 text-sm font-bold uppercase mb-2">Fallbacks (Unanswered)</div>
                                    <div className="text-3xl font-black text-orange-600">{aiStats.total_fallbacks}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <div className="text-gray-500 text-sm font-bold uppercase mb-2">Fallback Rate</div>
                                    <div className="text-3xl font-black text-red-600">{aiStats.fallback_rate}%</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-600"/> Unanswered Questions Log</h3>
                                    <span className="text-xs text-gray-500">Train your KB with these queries</span>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b sticky top-0">
                                            <tr>
                                                <th className="p-4 font-bold text-gray-600">User Message</th>
                                                <th className="p-4 font-bold text-gray-600">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aiLogs.map(log => (
                                                <tr key={log.id} className="border-b hover:bg-red-50/30">
                                                    <td className="p-4 font-medium text-gray-800">{log.user_message}</td>
                                                    <td className="p-4 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {aiLogs.length === 0 && (
                                                <tr><td colSpan="2" className="p-8 text-center text-gray-400">No fallback logs found. Excellent!</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}


                </div>
            </div>
        </Modal>
    );
}