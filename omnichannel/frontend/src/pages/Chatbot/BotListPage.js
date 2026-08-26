import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Plus, Settings, Trash2, Smartphone, Power, Database, ToggleLeft, ToggleRight, Facebook, Instagram, Send, Globe, AlertTriangle, ArrowRight, Lock, Crown, X, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import PaywallGuard from '../../components/common/PaywallGuard'; // NEW Import
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import AISkillLibraryModal from '../../components/chatbot/AISkillLibraryModal';

// Edit Device Modal
const EditDeviceModal = ({ isOpen, onClose, bot, devices, onSubmit }) => {
    const [channelType, setChannelType] = useState('');
    const [sessionId, setSessionId] = useState('');

    useEffect(() => {
        if (bot && isOpen) {
            // Auto-detect current channel type
            const currentDevice = devices.find(d => d.value === bot.session_id);
            setChannelType(currentDevice?.type || '');
            setSessionId(bot.session_id || '');
        }
    }, [bot, isOpen, devices]);

    if (!isOpen || !bot) return null;

    const filteredDevices = channelType
        ? devices.filter(d => d.value === bot.session_id || d.type === channelType)
        : devices.filter(d => d.value === bot.session_id);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Device Assignment"
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSubmit(sessionId)} disabled={!sessionId}>
                        Save Assignment
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800">
                    You are changing the device for: <strong>{bot.name}</strong>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Channel Platform</label>
                    <select
                        className="w-full border p-2 rounded-lg"
                        value={channelType}
                        onChange={e => {
                            setChannelType(e.target.value);
                            if (e.target.value !== channelType) {
                                setSessionId('');
                            }
                        }}
                    >
                        <option value="">-- Select Platform --</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Messenger">Messenger</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Webchat">Webchat</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Device</label>
                    <select
                        className="w-full border p-2 rounded-lg disabled:bg-gray-100"
                        value={sessionId}
                        onChange={e => setSessionId(e.target.value)}
                        disabled={!channelType}
                    >
                        <option value="">-- Select Device --</option>
                        {filteredDevices.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {!channelType ? "Select a platform first." : "Only shows connected devices without a bot."}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

const CreateBotModal = ({ isOpen, onClose, devices, onSubmit }) => {
    const [name, setName] = useState('');
    const [channelType, setChannelType] = useState('');
    const [sessionId, setSessionId] = useState('');

    if (!isOpen) return null;

    // Filter devices based on selected Channel Type
    const filteredDevices = channelType
        ? devices.filter(d => d.type === channelType)
        : [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Chatbot"
            size="md"
            footer={
                <ModalFooter>
                    <div className="flex gap-2 w-full justify-end">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => onSubmit({ name, session_id: sessionId })} disabled={!name || !sessionId}>
                            Create Bot
                        </Button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bot Name</label>
                    <input className="w-full border p-2 rounded-lg" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Bot 01" />
                </div>

                {/* Step 1: Select Channel Type */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Channel Platform</label>
                    <select
                        className="w-full border p-2 rounded-lg"
                        value={channelType}
                        onChange={e => {
                            setChannelType(e.target.value);
                            setSessionId(''); // Reset device selection
                        }}
                    >
                        <option value="">-- Select Platform --</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Messenger">Messenger</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Webchat">Webchat</option>
                    </select>
                </div>

                {/* Step 2: Select Device (Filtered) */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Device</label>
                    <select
                        className="w-full border p-2 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                        value={sessionId}
                        onChange={e => setSessionId(e.target.value)}
                        disabled={!channelType}
                    >
                        <option value="">-- Select Device --</option>
                        {filteredDevices.map(d => (
                            <option key={d.value} value={d.value}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {!channelType ? "Select a platform first." : "Only shows connected devices without a bot."}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

// Sandbox Modal
const SandboxModal = ({ isOpen, onClose, bots }) => {
    const [selectedBotId, setSelectedBotId] = useState(bots.length > 0 ? bots[0].id : '');
    const [messages, setMessages] = useState([{ id: 1, from: 'bot', text: 'Hello! I am your AI Assistant. How can I help you today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !selectedBotId) return;

        const userMsg = { id: Date.now(), from: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const history = messages.map(m => ({
            role: m.from === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        try {
            const res = await axios.post('/api/app/chatbot/sandbox', {
                bot_id: selectedBotId,
                message: userMsg.text,
                history: history
            });

            const botMsg = { id: Date.now() + 1, from: 'bot', text: res.data.response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, botMsg]);

        } catch (err) {
            toast.error("Sandbox Error: " + (err.response?.data?.error || err.message));
            setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: '⚠️ Error: Could not get response.', time: 'now', error: true }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedBot = bots.find(b => parseInt(b.id) === parseInt(selectedBotId));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null}
            size="full"
            className="h-[85vh] p-0 overflow-hidden"
        >
            <div className="flex h-full w-full">
                {/* Left: Configuration */}
                <div className="w-1/2 p-8 border-r bg-gray-50 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <Smartphone className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Sandbox Playground</h2>
                                <p className="text-sm text-gray-500">Test your bot behavior in real-time.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Bot to Test</label>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedBotId}
                            onChange={e => {
                                setSelectedBotId(e.target.value);
                                setMessages([{ id: 1, from: 'bot', text: 'Hello! I am your AI Assistant. How can I help you today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                            }}
                        >
                            {bots.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.device_name})</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 text-sm space-y-3">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Active Configuration</h3>
                        {selectedBot ? (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">System Prompt:</span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-[200px]">{selectedBot.system_prompt?.substring(0, 50)}...</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Knowledge Base:</span>
                                    <span className={selectedBot.use_global_kb ? 'text-green-600 font-bold' : 'text-blue-600 font-bold'}>
                                        {selectedBot.use_global_kb ? 'Global' : 'Custom Only'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Escalation:</span>
                                    <span className="text-red-600 font-mono text-xs">{selectedBot.escalation_keywords || 'None'}</span>
                                </div>
                            </>
                        ) : <p className="text-gray-400 italic">Select a bot to view config</p>}
                    </div>

                    <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-700">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>This is a simulation environment. Messages sent here will NOT be sent to actual WhatsApp/Social Media channels.</p>
                    </div>
                </div>

                {/* Right: Phone Simulator */}
                <div className="w-1/2 bg-gray-100 flex items-center justify-center p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow hover:bg-gray-200 hidden md:block"><X className="w-6 h-6 text-gray-600" /></button>

                    {/* Device Frame */}
                    <div className="w-[380px] h-[700px] bg-gray-900 rounded-[50px] p-4 shadow-2xl relative border-[4px] border-gray-800">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-900 rounded-b-2xl z-20"></div>

                        {/* Screen */}
                        <div className="w-full h-full bg-[#E5DDD5] rounded-[40px] overflow-hidden flex flex-col relative font-sans">
                            {/* Status Bar */}
                            <div className="h-20 bg-[#00A884] flex items-center px-6 pt-6 text-white shrink-0 shadow-sm z-10">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                                        Bot
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm truncate">{selectedBot?.name || 'Chatbot'}</h4>
                                        <p className="text-[10px] opacity-80">online</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={scrollRef}>
                                {messages.map(m => (
                                    <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg p-2 text-sm shadow-sm relative pb-5 ${m.from === 'user' ? 'bg-[#D9FDD3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                                            } ${m.error ? 'border-red-500 border-2' : ''}`}>
                                            <p>{m.text}</p>
                                            <span className="text-[10px] text-gray-400 absolute bottom-1 right-2">{m.time}</span>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
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
                                    className="flex-1 p-3 rounded-full border-none outline-none text-sm shadow-sm"
                                    placeholder="Type a message..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={loading || !input.trim()}
                                    className="p-3 bg-[#00A884] text-white rounded-full hover:bg-[#009B7C] transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default function BotListPage() {
    const [bots, setBots] = useState([]);
    const [devices, setDevices] = useState([]); // Unified list for dropdown
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSandboxOpen, setIsSandboxOpen] = useState(false);
    const [selectedBot, setSelectedBot] = useState(null);
    const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
    const [editingBot, setEditingBot] = useState(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [aiProvider, setAiProvider] = useState('gemini');
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [selectedBotForSkill, setSelectedBotForSkill] = useState(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            // REMOVED: axios.get('/api/app/chatbot/stats') check
            const [botRes, devRes, msgRes, igRes, tgRes, webRes, keyRes] = await Promise.all([
                axios.get('/api/app/chatbot/bots').catch(e => ({ data: [] })),
                axios.get('/api/app/devices?exclude_status=terblokir'),
                axios.get('/api/app/messenger/pages'),
                axios.get('/api/app/instagram/accounts'),
                axios.get('/api/app/telegram/bots'),
                axios.get('/api/app/webchat'), // Returns Array of widgets
                axios.get('/api/app/chatbot/api-key').catch(e => ({ data: {} }))
            ]);

            const provider = keyRes.data.ai_provider || 'gemini';
            let activeKey = keyRes.data.gemini_api_key;
            if (provider === 'openai') activeKey = keyRes.data.openai_api_key;
            if (provider === 'openrouter') activeKey = keyRes.data.openrouter_api_key;
            setAiProvider(provider);
            setHasApiKey(!!activeKey);

            // 1. Enrich Bots with Channel Icon & Name
            const waSessions = devRes.data;
            const messengerPages = msgRes.data;
            const instagramAccounts = igRes.data;
            const telegramBots = tgRes.data;
            const webchatWidgets = Array.isArray(webRes.data) ? webRes.data : (webRes.data.id ? [webRes.data] : []);

            const enrichedBots = botRes.data.map(bot => {
                let icon = '/icons/device.svg';
                let deviceName = bot.session_id;

                const wa = waSessions.find(s => s.session_id === bot.session_id);
                if (wa) {
                    icon = wa.type === 'official' ? '/icons/whatsapp-official.svg' : '/icons/whatsapp-unofficial.svg';
                    deviceName = wa.name || wa.whatsapp_number;
                } else {
                    const msg = messengerPages.find(p => p.page_id === bot.session_id);
                    if (msg) {
                        icon = '/icons/messenger.svg';
                        deviceName = msg.page_name;
                    } else {
                        const ig = instagramAccounts.find(i => i.ig_id === bot.session_id);
                        if (ig) {
                            icon = '/icons/instagram.svg';
                            deviceName = `@${ig.username}`;
                        } else {
                            const tg = telegramBots.find(t => t.bot_token === bot.session_id);
                            if (tg) {
                                icon = '/icons/telegram.svg';
                                deviceName = tg.first_name || `@${tg.username}`;
                            } else {
                                const wc = webchatWidgets.find(w => w.widget_uid === bot.session_id);
                                if (wc) {
                                    icon = '/icons/webchat.svg';
                                    deviceName = wc.name;
                                }
                            }
                        }
                    }
                }

                return { ...bot, channel_icon: icon, device_name: deviceName };
            });
            setBots(enrichedBots);

            // 2. Build Available Devices List for Dropdown
            const usedSessions = botRes.data.map(b => b.session_id).filter(Boolean);
            const allChannels = [];

            // WhatsApp
            waSessions.forEach(d => {
                const isConnected = d.status?.toLowerCase() === 'connected';
                if (isConnected && !usedSessions.includes(d.session_id)) {
                    allChannels.push({ type: 'WhatsApp', value: d.session_id, label: `${d.name} (${d.whatsapp_number || 'No Num'})` });
                }
            });

            // Messenger
            messengerPages.forEach(p => {
                if (p.is_active && !usedSessions.includes(p.page_id)) {
                    allChannels.push({ type: 'Messenger', value: p.page_id, label: p.page_name });
                }
            });

            // Instagram
            instagramAccounts.forEach(a => {
                if (a.is_active && !usedSessions.includes(a.ig_id)) {
                    allChannels.push({ type: 'Instagram', value: a.ig_id, label: `@${a.username}` });
                }
            });

            // Telegram
            telegramBots.forEach(b => {
                if (b.is_active && !usedSessions.includes(b.bot_token)) {
                    allChannels.push({ type: 'Telegram', value: b.bot_token, label: `@${b.username}` });
                }
            });

            // Webchat
            webchatWidgets.forEach(w => {
                if (w.is_active && !usedSessions.includes(w.widget_uid)) {
                    allChannels.push({ type: 'Webchat', value: w.widget_uid, label: w.name });
                }
            });

            setDevices(allChannels);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        if (!hasApiKey) {
            const providerLabel = aiProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
            toast.error(`${providerLabel} API Key is missing. Please configure it first.`);
            return;
        }
        setIsCreateOpen(true);
    };

    const handleCreate = async (data) => {
        try {
            await axios.post('/api/app/chatbot/bots', data);
            toast.success("Bot Created");
            setIsCreateOpen(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setIsCreateOpen(false);
                if (confirm(`⚠️ Feature Locked!\n\n${err.response.data.error}\n\nUpgrade your plan to enable Chatbot?`)) {
                    navigate('/order');
                }
            } else {
                toast.error("Failed to create: " + (err.response?.data?.error || err.message));
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Delete this bot?")) return;
        try {
            await axios.delete(`/api/app/chatbot/bots/${id}`);
            fetchData();
        } catch (err) { toast.error("Failed to delete"); }
    };

    const handleToggle = async (bot) => {
        try {
            const updatedBot = { ...bot, is_active: !bot.is_active };
            // Optimistic update
            setBots(prev => prev.map(b => b.id === bot.id ? updatedBot : b));

            await axios.put(`/api/app/chatbot/bots/${bot.id}`, updatedBot);
            toast.success(`Bot ${updatedBot.is_active ? 'Activated' : 'Deactivated'}`);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // Revert state
                fetchData();
                if (confirm(`⚠️ Feature Locked!\n\n${err.response.data.error}\n\nUpgrade your plan to enable Chatbot?`)) {
                    navigate('/order');
                }
            } else {
                toast.error("Failed to update status");
                fetchData();
            }
        }
    };

    const handleEditDevice = async (botId, data) => {
        try {
            await axios.patch(`/api/app/chatbot/bots/${botId}/device`, data);
            toast.success("Device Updated");
            setIsEditDeviceOpen(false);
            setEditingBot(null);
            fetchData();
        } catch (err) {
            toast.error("Failed: " + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    // REMOVED Custom Lock Screen

    return (
        <PaywallGuard feature="feat_chatbot" title="AI Chatbot Locked" description="Unlock the power of AI to automate your customer service 24/7.">
            <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">

                {/* Missing API Key Warning */}
                {!loading && !hasApiKey && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">Missing API Key</h3>
                                <p className="text-xs text-red-700">
                                    {aiProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} API Key is required to create and run chatbots.
                                </p>
                            </div>
                        </div>
                        <Link to="/chatbot/api" className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 flex items-center gap-1">
                            Configure Now <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}

                <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Bot className="w-8 h-8 text-indigo-600" /> Manage Bots
                        </h2>
                        <p className="text-sm text-gray-500">Configure AI behavior for each device/channel.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsSandboxOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 shadow-sm transition-colors"
                        >
                            <Smartphone className="w-4 h-4 text-indigo-600" /> Sandbox
                        </button>
                        <button
                            onClick={handleCreateClick}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm ${!hasApiKey ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            <Plus className="w-4 h-4" /> New Bot
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bots.map(bot => (
                        <div key={bot.id} className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col ${bot.is_active ? 'border-green-200 ring-1 ring-green-50' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${bot.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Bot className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{bot.name}</h3>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggle(bot); }}
                                            className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors mt-1 cursor-pointer border ${bot.is_active ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {bot.is_active ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(bot.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>

                            <div className="space-y-2 mb-6 flex-1">
                                <div
                                    className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded group cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                        setEditingBot(bot);
                                        setIsEditDeviceOpen(true);
                                    }}
                                >
                                    <img
                                        src={getApiUrl(bot.channel_icon || '/icons/device.svg')}
                                        className="w-4 h-4"
                                        alt="Device"
                                    />
                                    {bot.session_id ? (
                                        <span className="font-medium truncate w-full flex items-center justify-between">
                                            <span className="flex items-center gap-1 truncate" title={bot.device_name || bot.cached_device_name || bot.session_id}>
                                                {!bot.device_name && bot.cached_device_name && (
                                                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                                )}
                                                <span className={!bot.device_name && bot.cached_device_name ? 'text-red-600' : ''}>
                                                    {bot.device_name || bot.cached_device_name || bot.session_id}
                                                </span>
                                                {!bot.device_name && bot.cached_device_name && (
                                                    <span className="text-[10px] text-red-500 font-normal">(Deleted)</span>
                                                )}
                                            </span>
                                            <Settings className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        </span>
                                    ) : (
                                        <span className="text-yellow-600 italic">No Device Assigned</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    <Database className="w-4 h-4" />
                                    <span>{bot.use_global_kb ? 'Global Knowledge' : 'Custom Knowledge'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedBotForSkill(bot);
                                        setIsSkillModalOpen(true);
                                    }}
                                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Pasang Skill</span>
                                </button>
                                <button
                                    onClick={() => navigate(`/chatbot/ai-agent/${bot.id}`)}
                                    className="flex-1 py-2 border border-indigo-200 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 flex items-center justify-center gap-1.5 text-xs transition-all"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Configure</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {bots.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No bots created yet.</p>
                            <p className="text-xs text-gray-400">Create one to automate your customer support.</p>
                        </div>
                    )}
                </div>

                <CreateBotModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    devices={devices}
                    onSubmit={handleCreate}
                />

                {/* Removed BotConfigModal */}

                <SandboxModal
                    isOpen={isSandboxOpen}
                    onClose={() => setIsSandboxOpen(false)}
                    bots={bots}
                />

                <EditDeviceModal
                    isOpen={isEditDeviceOpen}
                    onClose={() => {
                        setIsEditDeviceOpen(false);
                        setEditingBot(null);
                    }}
                    bot={editingBot}
                    devices={devices}
                    onSubmit={handleEditDevice}
                />

                {/* AI Skill Library Modal */}
                <AISkillLibraryModal
                    isOpen={isSkillModalOpen}
                    onClose={() => {
                        setIsSkillModalOpen(false);
                        setSelectedBotForSkill(null);
                    }}
                    botId={selectedBotForSkill?.id}
                    onSkillApplied={() => {
                        fetchData();
                    }}
                />
            </div>
        </PaywallGuard>
    );
}
