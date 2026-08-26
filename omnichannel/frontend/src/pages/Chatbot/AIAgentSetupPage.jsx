import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeft, Save, Bot, MessageSquare, Book, Globe, BarChart2, 
    Settings, Upload, Trash2, Send, RotateCcw, AlertTriangle, Sparkles 
} from 'lucide-react';
import AISkillLibraryModal from '../../components/chatbot/AISkillLibraryModal';
import AIQuickSetupWizard from '../../components/chatbot/AIQuickSetupWizard';

export default function AIAgentSetupPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Core State
    const [loading, setLoading] = useState(true);
    const [bot, setBot] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [orgProvider, setOrgProvider] = useState('gemini');

    // Form Data State
    const [formData, setFormData] = useState({
        name: '',
        system_prompt: '',
        ai_model: '',
        escalation_keywords: '',
        use_global_kb: false,
        auto_reply_config: { welcome: { enabled: false, message: '' } }
    });

    // Sub-states
    const [qaList, setQaList] = useState([]);
    const [assets, setAssets] = useState([]);
    const [newQa, setNewQa] = useState({ question: '', answer: '' });
    const [aiTools, setAiTools] = useState([]);
    const [newTool, setNewTool] = useState({ name: '', description: '', method: 'GET', url: '', parameters: '' });
    const [aiStats, setAiStats] = useState({ total_messages: 0, total_fallbacks: 0, fallback_rate: 0 });
    const [aiLogs, setAiLogs] = useState([]);
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [skillPresets, setSkillPresets] = useState([]);

    // Simulator State
    const [simMessages, setSimMessages] = useState([{ id: 1, from: 'bot', text: 'Simulator ready. Send a message to test your AI configuration.' }]);
    const [simInput, setSimInput] = useState('');
    const [simLoading, setSimLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [simMessages]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Get Provider info
            const keyRes = await axios.get('/api/app/chatbot/api-key').catch(() => ({ data: {} }));
            setOrgProvider(keyRes.data.ai_provider || 'gemini');

            // Get Bot Details
            const botRes = await axios.get(`/api/app/chatbot/bots`);
            const currentBot = botRes.data.find(b => b.id.toString() === id);
            if (!currentBot) {
                toast.error("Bot not found");
                navigate('/chatbot/list');
                return;
            }
            setBot(currentBot);
            setFormData({
                name: currentBot.name || '',
                system_prompt: currentBot.system_prompt || '',
                ai_model: currentBot.ai_model || '',
                escalation_keywords: currentBot.escalation_keywords || '',
                use_global_kb: currentBot.use_global_kb || false,
                auto_reply_config: currentBot.auto_reply_config || { welcome: { enabled: false, message: '' } },
                double_text_enabled: currentBot.double_text_enabled || false,
                double_text_delay_minutes: currentBot.double_text_delay_minutes || 5
            });

            // Fetch KB, Tools, Analytics
            axios.get(`/api/app/chatbot/kb?session_id=${currentBot.id}`).then(res => {
                if (res.data.qa) setQaList(res.data.qa);
                if (res.data.assets) setAssets(res.data.assets);
            }).catch(()=>{});
            axios.get(`/api/app/chatbot/tools?bot_config_id=${currentBot.id}`).then(res => setAiTools(res.data)).catch(()=>{});
            axios.get(`/api/app/chatbot/logs/analytics?bot_config_id=${currentBot.id}`).then(res => {
                if (res.data.metrics) setAiStats(res.data.metrics);
                if (res.data.recent_fallbacks) setAiLogs(res.data.recent_fallbacks);
            }).catch(()=>{});
            axios.get('/api/app/chatbot/skills').then(res => {
                if (res.data?.data) setSkillPresets(res.data.data);
            }).catch(()=>{});

        } catch (err) {
            toast.error("Failed to load bot data");
        } finally {
            setLoading(false);
        }
    };

    const handleSkillApplied = (result) => {
        if (result?.bot) {
            setBot(result.bot);
            const parsedAutoReply = typeof result.bot.auto_reply_config === 'string'
                ? JSON.parse(result.bot.auto_reply_config)
                : result.bot.auto_reply_config;
            setFormData(prev => ({
                ...prev,
                system_prompt: result.bot.system_prompt || '',
                escalation_keywords: result.bot.escalation_keywords || '',
                auto_reply_config: parsedAutoReply || { welcome: { enabled: false, message: '' } },
                double_text_enabled: result.bot.double_text_enabled || false,
                double_text_delay_minutes: result.bot.double_text_delay_minutes || 5
            }));
        }
        if (bot?.id) {
            axios.get(`/api/app/chatbot/kb?session_id=${bot.id}`).then(res => {
                if (res.data.qa) setQaList(res.data.qa);
                if (res.data.assets) setAssets(res.data.assets);
            }).catch(()=>{});
        }
    };

    const handleSave = async () => {
        try {
            await axios.put(`/api/app/chatbot/bots/${bot.id}`, formData);
            toast.success("AI Configuration Saved");
        } catch (err) {
            toast.error("Failed to save configuration");
        }
    };

    // KB Handlers
    const handleAddQa = async () => {
        try {
            const res = await axios.post('/api/app/chatbot/kb/qa', { ...newQa, session_id: bot.id });
            setQaList([...qaList, res.data]);
            setNewQa({ question: '', answer: '' });
        } catch (err) { toast.error("Failed add QA"); }
    };
    const handleDeleteQa = async (qaId) => {
        try {
            await axios.delete(`/api/app/chatbot/kb/qa/${qaId}`);
            setQaList(qaList.filter(q => q.id !== qaId));
        } catch (err) { toast.error("Failed delete QA"); }
    };
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('session_id', bot.id);
        const toastId = toast.loading("Uploading and processing document...");
        try {
            const res = await axios.post('/api/app/chatbot/kb/upload', fd);
            setAssets([...assets, res.data]);
            toast.success("Document processed", { id: toastId });
        } catch (err) { toast.error("Upload failed", { id: toastId }); }
    };
    const handleDeleteAsset = async (assetId) => {
        try {
            await axios.delete(`/api/app/chatbot/assets/${assetId}`);
            setAssets(assets.filter(a => a.id !== assetId));
            toast.success("Document deleted");
        } catch (err) { toast.error("Failed delete document"); }
    };

    // Tools Handlers
    const handleAddTool = async () => {
        if (!newTool.name || !newTool.url) return toast.error("Name and URL required");
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
    const handleDeleteTool = async (tid) => {
        try {
            await axios.delete(`/api/app/chatbot/tools/${tid}`);
            setAiTools(aiTools.filter(t => t.id !== tid));
        } catch (err) { toast.error("Failed to delete tool"); }
    };

    // Simulator Handler
    const handleSimulate = async () => {
        if (!simInput.trim()) return;
        const userMsg = { id: Date.now(), from: 'user', text: simInput };
        setSimMessages(prev => [...prev, userMsg]);
        setSimInput('');
        setSimLoading(true);

        const history = simMessages.filter(m => m.id !== 1).map(m => ({
            role: m.from === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        try {
            const res = await axios.post('/api/app/chatbot/simulate/test', {
                bot_config_id: bot.id,
                user_message: userMsg.text,
                chat_history: history
            });
            setSimMessages(prev => [...prev, { id: Date.now()+1, from: 'bot', text: res.data.response }]);
        } catch (err) {
            setSimMessages(prev => [...prev, { id: Date.now()+1, from: 'bot', text: '⚠️ Simulation Error. Did you save your config?' }]);
        } finally {
            setSimLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading AI Agent Configuration...</div>;

    let availableModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'];
    if (orgProvider === 'openai') {
        availableModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    } else if (orgProvider === 'openrouter') {
        availableModels = [
            'meta-llama/llama-3.1-8b-instruct',
            'anthropic/claude-3.5-sonnet',
            'google/gemini-flash-1.5',
            'mistralai/mistral-nemo'
        ];
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
            
            {/* LEFT COLUMN: Setup Tabs */}
            <div className="flex-1 min-w-0 flex flex-col h-full">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/chatbot/list')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-800">AI Agent Setup</h1>
                            <p className="text-sm text-gray-500">{formData.name || 'Unnamed Bot'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSkillModalOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs md:text-sm rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow-amber-500/20"
                        >
                            <Sparkles className="w-4 h-4 text-gray-950" />
                            <span>✨ Pasang AI Skill</span>
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-sm">
                            <Save className="w-4 h-4" /> Save Configuration
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b overflow-x-auto custom-scrollbar bg-gray-50">
                    {[
                        { id: 'skills', icon: Sparkles, label: '✨ AI CS Skills' },
                        { id: 'general', icon: Settings, label: 'General' },
                        { id: 'handoff', icon: MessageSquare, label: 'Handoff Rules' },
                        { id: 'knowledge', icon: Book, label: 'Knowledge Base' },
                        { id: 'tools', icon: Globe, label: 'Function Calling' },
                        { id: 'analytics', icon: BarChart2, label: 'Analytics' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center shrink-0 gap-2 px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                    <div className="max-w-4xl mx-auto">
                        
                        {/* Quick Setup Wizard */}
                        <AIQuickSetupWizard
                            bot={bot}
                            onOpenSkillModal={() => setIsSkillModalOpen(true)}
                            onSwitchTab={(t) => setActiveTab(t)}
                        />

                        {/* AI SKILLS TAB */}
                        {activeTab === 'skills' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 p-6 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black mb-2 border border-amber-200">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Instant Skill Marketplace</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900">Katalog AI CS Skills Indonesia</h3>
                                        <p className="text-xs text-gray-600 mt-1 max-w-xl">
                                            Pasang kemampuan khusus CS dengan 1-klik. AI akan langsung menguasai gaya komunikasi, alur penjualan, aturan eskalasi, dan tool integrasi industri Anda.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsSkillModalOpen(true)}
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0"
                                    >
                                        <Sparkles className="w-4 h-4" /> Buka Modal Skill Fullscreen
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {skillPresets.map(skill => (
                                        <div key={skill.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group hover:border-indigo-500/40">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[11px] font-black px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                                                        {skill.badge}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-gray-900 text-base group-hover:text-indigo-600 transition-colors">{skill.name}</h4>
                                                <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">{skill.description}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsSkillModalOpen(true);
                                                }}
                                                className="mt-4 w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <span>Pilih & Terapkan Skill</span>
                                                <Sparkles className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Bot Identity</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Bot Name</label>
                                            <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">AI Model Selection <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2 uppercase">New</span></label>
                                            <select className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.ai_model} onChange={e => setFormData({...formData, ai_model: e.target.value})}>
                                                <option value="">-- Default ({orgProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash'}) --</option>
                                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Select the intelligence level for this bot based on your provider ({orgProvider.toUpperCase()}).</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">System Prompt (Persona & Instructions)</label>
                                            <textarea className="w-full border p-3 rounded-lg h-40 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="You are a helpful customer service agent for..." value={formData.system_prompt} onChange={e => setFormData({...formData, system_prompt: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HANDOFF TAB */}
                        {activeTab === 'handoff' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Welcome & Handoff Settings</h3>
                                    <div className="space-y-6">
                                        <div className="p-4 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="font-bold text-gray-700">Initial Welcome Message</label>
                                                <input type="checkbox" className="toggle" checked={formData.auto_reply_config?.welcome?.enabled || false} onChange={e => setFormData({...formData, auto_reply_config: {...formData.auto_reply_config, welcome: {...formData.auto_reply_config?.welcome, enabled: e.target.checked}}})} />
                                            </div>
                                            <textarea className="w-full border p-2 rounded-lg" placeholder="Welcome! How can I help?" value={formData.auto_reply_config?.welcome?.message || ''} onChange={e => setFormData({...formData, auto_reply_config: {...formData.auto_reply_config, welcome: {...formData.auto_reply_config?.welcome, message: e.target.value}}})} disabled={!formData.auto_reply_config?.welcome?.enabled} />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Transfer Condition (Escalation Keywords)</label>
                                            <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. human, agen, bayar, transfer" value={formData.escalation_keywords} onChange={e => setFormData({...formData, escalation_keywords: e.target.value})} />
                                            <p className="text-xs text-gray-500 mt-2">If customer types these exact keywords (comma separated), AI will stop replying and append [ESCALATE] tag to alert Human Agents.</p>
                                        </div>

                                        <div className="p-4 bg-gray-50 rounded-lg border mt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="font-bold text-gray-700">AI Auto Follow-up (Double Text)</label>
                                                <input type="checkbox" className="toggle" checked={formData.double_text_enabled || false} onChange={e => setFormData({...formData, double_text_enabled: e.target.checked})} />
                                            </div>
                                            <p className="text-xs text-gray-500 mb-4">If the customer stops replying, the AI will automatically send a follow-up message to bump the conversation.</p>
                                            
                                            <div className="flex items-center gap-3">
                                                <label className="text-sm font-medium text-gray-600">Delay before follow-up (minutes):</label>
                                                <input type="number" min="1" className="border p-2 rounded-lg w-24 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.double_text_delay_minutes || 5} onChange={e => setFormData({...formData, double_text_delay_minutes: parseInt(e.target.value)})} disabled={!formData.double_text_enabled} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* KNOWLEDGE BASE TAB */}
                        {activeTab === 'knowledge' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <div className="flex items-center justify-between mb-6 border-b pb-2">
                                        <h3 className="font-bold text-gray-800">Knowledge Base Source</h3>
                                        <select className="border p-1.5 text-sm rounded bg-gray-50 font-bold" value={formData.use_global_kb ? 'global' : 'custom'} onChange={e => setFormData({...formData, use_global_kb: e.target.value === 'global'})}>
                                            <option value="custom">Custom (This Bot Only)</option>
                                            <option value="global">Global (Shared across all bots)</option>
                                        </select>
                                    </div>

                                    {!formData.use_global_kb ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* QA Section */}
                                            <div>
                                                <h4 className="font-bold text-sm mb-3">Q&A Pairs</h4>
                                                <div className="space-y-2 mb-4">
                                                    <input className="w-full border p-2 text-sm rounded" placeholder="Question" value={newQa.question} onChange={e => setNewQa({...newQa, question: e.target.value})} />
                                                    <textarea className="w-full border p-2 text-sm rounded h-20" placeholder="Answer" value={newQa.answer} onChange={e => setNewQa({...newQa, answer: e.target.value})} />
                                                    <button onClick={handleAddQa} className="w-full bg-indigo-100 text-indigo-700 font-bold py-2 rounded text-sm hover:bg-indigo-200">Add Q&A</button>
                                                </div>
                                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                    {qaList.map(qa => (
                                                        <div key={qa.id} className="bg-gray-50 p-3 rounded border text-sm relative group">
                                                            <div className="font-bold text-gray-800 mb-1">{qa.question}</div>
                                                            <div className="text-gray-600 line-clamp-3">{qa.answer}</div>
                                                            <button onClick={() => handleDeleteQa(qa.id)} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                                                        </div>
                                                    ))}
                                                    {qaList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No Q&A data.</p>}
                                                </div>
                                            </div>
                                            
                                            {/* Documents Section */}
                                            <div>
                                                <h4 className="font-bold text-sm mb-3">RAG Documents (PDF)</h4>
                                                <div className="border-2 border-dashed border-gray-300 p-6 text-center rounded-xl mb-4 hover:bg-indigo-50 hover:border-indigo-300 transition-colors relative cursor-pointer">
                                                    <input type="file" onChange={handleUpload} accept=".pdf,.txt" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-gray-600">Click or drag PDF here</p>
                                                    <p className="text-xs text-gray-400 mt-1">AI will read and answer based on this document.</p>
                                                </div>
                                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                    {assets.map(a => (
                                                        <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 border rounded text-sm">
                                                            <div className="truncate w-4/5">
                                                                <div className="font-medium text-gray-800 truncate">{a.description}</div>
                                                                <div className="text-[10px] text-gray-400 uppercase">{a.mime_type?.split('/')[1] || 'DOC'}</div>
                                                            </div>
                                                            <button onClick={() => handleDeleteAsset(a.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-blue-50 rounded-xl border border-blue-100">
                                            <Globe className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                                            <p className="font-bold text-blue-800">Using Global Knowledge Base</p>
                                            <p className="text-sm text-blue-600">Manage your global KB from the main sidebar.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TOOLS TAB */}
                        {activeTab === 'tools' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Function Calling</h3>
                                    <p className="text-sm text-gray-500 mb-6">Allow your AI to securely access external APIs.</p>
                                    
                                    <div className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-4">
                                        <h4 className="font-bold text-sm text-gray-700">Add New Tool</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Name (e.g. check_order)" value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} />
                                            <input className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Description (When AI uses this)" value={newTool.description} onChange={e => setNewTool({...newTool, description: e.target.value})} />
                                            <div className="flex gap-2">
                                                <select className="border p-2 rounded text-sm" value={newTool.method} onChange={e => setNewTool({...newTool, method: e.target.value})}>
                                                    <option>GET</option><option>POST</option>
                                                </select>
                                                <input className="flex-1 border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="URL Endpoint" value={newTool.url} onChange={e => setNewTool({...newTool, url: e.target.value})} />
                                            </div>
                                            <textarea className="border p-2 rounded text-sm font-mono h-10 outline-none focus:ring-1 focus:ring-indigo-500" placeholder='{"order_id": {"type": "string"}}' value={newTool.parameters} onChange={e => setNewTool({...newTool, parameters: e.target.value})} />
                                        </div>
                                        <button onClick={handleAddTool} className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold hover:bg-black transition-colors">Add Tool</button>
                                    </div>
                                    <div className="space-y-3">
                                        {aiTools.map(t => (
                                            <div key={t.id} className="border p-4 rounded-lg flex justify-between items-start bg-white hover:border-indigo-200 transition-colors">
                                                <div>
                                                    <div className="font-bold text-indigo-700">{t.name} <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded ml-2 uppercase font-bold">{t.method}</span></div>
                                                    <div className="text-sm text-gray-600 mt-1">{t.description}</div>
                                                    <div className="text-xs text-gray-400 mt-1 font-mono">{t.url}</div>
                                                </div>
                                                <button onClick={() => handleDeleteTool(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ANALYTICS TAB */}
                        {activeTab === 'analytics' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-xl border shadow-sm text-center">
                                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">Total Queries</div>
                                        <div className="text-2xl font-black text-gray-800">{aiStats.total_messages}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border shadow-sm text-center">
                                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">Fallbacks</div>
                                        <div className="text-2xl font-black text-orange-600">{aiStats.total_fallbacks}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border shadow-sm text-center">
                                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">Fallback Rate</div>
                                        <div className="text-2xl font-black text-red-600">{aiStats.fallback_rate}%</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                    <div className="p-4 border-b bg-gray-50">
                                        <h3 className="font-bold text-gray-800">Unanswered Questions (Fallbacks)</h3>
                                        <p className="text-xs text-gray-500">Train your KB with these exact queries to lower the fallback rate.</p>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b sticky top-0">
                                                <tr><th className="p-3 font-bold text-gray-600">User Message</th><th className="p-3 font-bold text-gray-600 w-32">Time</th></tr>
                                            </thead>
                                            <tbody>
                                                {aiLogs.map(log => (
                                                    <tr key={log.id} className="border-b hover:bg-orange-50/50">
                                                        <td className="p-3 font-medium text-gray-800">{log.user_message}</td>
                                                        <td className="p-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                {aiLogs.length === 0 && <tr><td colSpan="2" className="p-8 text-center text-gray-400">No fallbacks recorded yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Live Test Simulator */}
            <div className="hidden lg:flex w-[400px] flex-col border-l bg-gray-50/50 h-full">
                <div className="h-16 bg-[#00A884] flex items-center justify-between px-4 text-white shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                            <Bot className="w-6 h-6 text-white"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm leading-tight">Live Test Simulator</h3>
                            <p className="text-[11px] text-white/80 leading-tight">Unsaved changes won't reflect here</p>
                        </div>
                    </div>
                    <button onClick={() => setSimMessages([{ id: 1, from: 'bot', text: 'Chat reset. Send a new message.' }])} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Reset Chat">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={scrollRef} style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}>
                    {simMessages.map(m => (
                        <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm relative break-words
                                ${m.from === 'user' ? 'bg-[#D9FDD3] rounded-tr-none text-gray-800' : 'bg-white rounded-tl-none text-gray-800'}
                            `}>
                                <div dangerouslySetInnerHTML={{__html: m.text.replace(/\n/g, '<br/>')}} />
                            </div>
                        </div>
                    ))}
                    {simLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white rounded-lg p-3 rounded-tl-none shadow-sm flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 bg-[#F0F2F5] flex items-center gap-2 shrink-0">
                    <input
                        className="flex-1 p-3 rounded-full border-none outline-none text-sm shadow-sm bg-white"
                        placeholder="Type a message to test AI..."
                        value={simInput}
                        onChange={e => setSimInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSimulate()}
                    />
                    <button
                        onClick={handleSimulate}
                        disabled={simLoading || !simInput.trim()}
                        className="w-10 h-10 rounded-full bg-[#00A884] text-white flex items-center justify-center hover:bg-[#009B7C] disabled:opacity-50 transition-colors shadow-sm shrink-0"
                    >
                        <Send className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>

            {/* AI Skill Library Modal */}
            <AISkillLibraryModal
                isOpen={isSkillModalOpen}
                onClose={() => setIsSkillModalOpen(false)}
                botId={bot?.id}
                onSkillApplied={handleSkillApplied}
            />
        </div>
    );
}
