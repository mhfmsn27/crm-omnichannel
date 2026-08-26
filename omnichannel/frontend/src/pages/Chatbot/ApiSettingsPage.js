import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Save, ExternalLink, Eye, EyeOff, Info, CheckCircle, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PROVIDERS = [
    {
        id: 'gemini',
        label: 'Google Gemini',
        badge: 'Free Tier',
        badgeColor: 'bg-green-100 text-green-700',
        icon: '✦',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        description: 'Gemini 2.5 Flash — powerful and free for most use cases.',
        keyPlaceholder: 'AIzaSy...',
        keyLabel: 'Google Gemini API Key',
        keyHint: 'Required for AI chat responses AND Knowledge Base embeddings.',
        steps: [
            {
                title: 'Visit Google AI Studio',
                desc: 'Log in with your Google account.',
                link: { href: 'https://aistudio.google.com/app/apikey', label: 'Open AI Studio' }
            },
            { title: 'Create API Key', desc: 'Click "Get API key" → "Create API key in new project".' },
            { title: 'Copy & Paste', desc: 'Copy the key starting with AIzaSy... and paste it here.' }
        ],
        tip: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-50 border-green-100 text-green-700', label: 'Free Tier Available', body: 'Generous free quota for experimentation. Ideal for most teams.' }
    },
    {
        id: 'openai',
        label: 'OpenAI ChatGPT',
        badge: 'Paid',
        badgeColor: 'bg-orange-100 text-orange-700',
        icon: '⬡',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        description: 'GPT-4o mini — fast, cost-efficient, high quality answers.',
        keyPlaceholder: 'sk-...',
        keyLabel: 'OpenAI API Key',
        keyHint: 'Used for AI chat responses. Gemini key is still used for Knowledge Base embeddings (optional).',
        steps: [
            {
                title: 'Visit OpenAI Platform',
                desc: 'Log in with your OpenAI account.',
                link: { href: 'https://platform.openai.com/api-keys', label: 'Open OpenAI Platform' }
            },
            { title: 'Create API Key', desc: 'Click "+ Create new secret key", give it a name, and confirm.' },
            { title: 'Copy & Paste', desc: 'Copy the key starting with sk-... and paste it here.' }
        ],
        tip: { icon: <Info className="w-4 h-4" />, color: 'bg-orange-50 border-orange-100 text-orange-800', label: 'Usage-Based Billing', body: 'GPT-4o mini is very affordable (~$0.15 per 1M tokens). Add billing at platform.openai.com.' }
    },
    {
        id: 'openrouter',
        label: 'OpenRouter (Llama/Claude/dll)',
        badge: 'Aggregator',
        badgeColor: 'bg-purple-100 text-purple-700',
        icon: '◬',
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
        description: 'Satu API untuk banyak model (Claude, Llama, DeepSeek).',
        keyPlaceholder: 'sk-or-v1-...',
        keyLabel: 'OpenRouter API Key',
        keyHint: 'Digunakan untuk membalas chat. Gemini key tetap dibutuhkan untuk embeddings Knowledge Base (opsional).',
        steps: [
            {
                title: 'Visit OpenRouter',
                desc: 'Log in with your account.',
                link: { href: 'https://openrouter.ai/keys', label: 'Open OpenRouter' }
            },
            { title: 'Create API Key', desc: 'Click "Create Key", beri nama, dan salin kodenya.' },
            { title: 'Copy & Paste', desc: 'Copy the key starting with sk-or-v1- and paste it here.' }
        ],
        tip: { icon: <Info className="w-4 h-4" />, color: 'bg-purple-50 border-purple-100 text-purple-800', label: 'Fleksibilitas Model', body: 'Bisa pilih Llama 3 yang gratis, atau Claude 3.5 Sonnet untuk performa maksimal.' }
    }
];

export default function ApiSettingsPage() {
    const [provider, setProvider] = useState('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/app/chatbot/api-key')
            .then(res => {
                setProvider(res.data.ai_provider || 'gemini');
                setGeminiKey(res.data.gemini_api_key || '');
                setOpenaiKey(res.data.openai_api_key || '');
                setOpenrouterKey(res.data.openrouter_api_key || '');
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        let activeKey = geminiKey;
        if (provider === 'openai') activeKey = openaiKey;
        if (provider === 'openrouter') activeKey = openrouterKey;
        
        if (!activeKey) return toast.error(`${provider.toUpperCase()} API Key cannot be empty`);

        setIsSaving(true);
        try {
            await axios.put('/api/app/chatbot/api-key', {
                gemini_api_key: geminiKey,
                openai_api_key: openaiKey,
                openrouter_api_key: openrouterKey,
                ai_provider: provider
            });
            toast.success('AI configuration saved successfully');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    );

    const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
    let activeKey = geminiKey;
    let showKey = showGeminiKey;
    let setShowKey = setShowGeminiKey;
    let setActiveKey = setGeminiKey;

    if (provider === 'openai') {
        activeKey = openaiKey;
        showKey = showOpenaiKey;
        setShowKey = setShowOpenaiKey;
        setActiveKey = setOpenaiKey;
    } else if (provider === 'openrouter') {
        activeKey = openrouterKey;
        showKey = showOpenrouterKey;
        setShowKey = setShowOpenrouterKey;
        setActiveKey = setOpenrouterKey;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Key className="w-8 h-8 text-indigo-600" /> AI Configuration
                </h2>
                <p className="text-sm text-gray-500 mt-1">Choose your AI provider and enter the API key for chatbot responses.</p>
            </div>

            {/* Provider Selector */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">AI Provider</label>
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                    {PROVIDERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setProvider(p.id)}
                            className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                                provider === p.id
                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold ${p.iconBg} ${p.iconColor} shrink-0`}>
                                {p.icon}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-gray-800 text-sm leading-tight">{p.label}</div>
                                <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 ${p.badgeColor}`}>
                                    {p.badge}
                                </span>
                            </div>
                            {provider === p.id && (
                                <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">

                {/* CARD 1: CONFIGURATION */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                        <Key className="w-5 h-5 text-indigo-500" /> Settings — {activeProvider.label}
                    </h3>

                    <div className="space-y-5 flex-1">
                        {/* Active provider key input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {activeProvider.keyLabel}
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={activeKey}
                                    onChange={e => setActiveKey(e.target.value)}
                                    placeholder={activeProvider.keyPlaceholder}
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{activeProvider.keyHint}</p>
                        </div>

                        {/* If OpenAI or OpenRouter selected, also show optional Gemini key for embeddings */}
                        {(provider === 'openai' || provider === 'openrouter') && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Google Gemini API Key
                                    <span className="ml-2 text-xs font-normal text-gray-400">(Optional — for Knowledge Base)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showGeminiKey ? 'text' : 'password'}
                                        className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                                        value={geminiKey}
                                        onChange={e => setGeminiKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                    />
                                    <button
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                    >
                                        {showGeminiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Required if you want the chatbot to search the Knowledge Base (RAG). Leave empty to skip KB search.
                                </p>
                            </div>
                        )}

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-bold mb-1">Security Note</p>
                                <p>Your API keys are stored encrypted. Never share them with anyone outside your organization.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-transform active:scale-95 disabled:opacity-70"
                        >
                            {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Configuration</>}
                        </button>
                    </div>
                </div>

                {/* CARD 2: GUIDE */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                        <ExternalLink className="w-5 h-5 text-green-600" /> How to get {activeProvider.label} API Key?
                    </h3>

                    <div className="space-y-5 flex-1">
                        {activeProvider.steps.map((step, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 shrink-0">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{step.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                                    {step.link && (
                                        <a
                                            href={step.link.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline mt-2"
                                        >
                                            {step.link.label} <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className={`mt-4 p-4 rounded-xl border ${activeProvider.tip.color}`}>
                            <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                {activeProvider.tip.icon} {activeProvider.tip.label}
                            </h4>
                            <p className="text-xs leading-relaxed">{activeProvider.tip.body}</p>
                        </div>

                        {/* Model info badge */}
                        <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <Bot className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-700">Model Default: </span>
                                {provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'openai' ? 'gpt-4o-mini' : 'meta-llama/llama-3.1-8b-instruct'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
