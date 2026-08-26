import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Edit, Trash2, ChevronRight, MessageCircle, Clock, ToggleRight, ToggleLeft, Save, LayoutTemplate, Copy, Zap, ArrowRight, Plus, Users } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import PaywallGuard from '../../components/common/PaywallGuard';

// --- TEMPLATE DATA ---
const TEMPLATES = [
    {
        id: 'restaurant',
        name: 'Restaurant Menu Flow',
        description: 'Interactive menu for food ordering.',
        rules: [
            { keyword: 'MENU', match_type: 'exact', response_content: 'Welcome to our restaurant! Reply with number:\n1. Foods\n2. Drinks\n3. Promo' },
            { keyword: '1', parent_keyword: 'MENU', response_content: 'FOOD MENU:\nA. Fried Rice - 25k\nB. Noodle - 20k\nReply code to order.' },
            { keyword: '2', parent_keyword: 'MENU', response_content: 'DRINKS:\nC. Ice Tea - 5k\nD. Coffee - 10k' },
            { keyword: 'A', parent_keyword: '1', response_content: 'You ordered Fried Rice. Please wait...' }
        ]
    },
    {
        id: 'faq',
        name: 'Simple FAQ',
        description: 'Common questions about shipping and returns.',
        rules: [
            { keyword: 'INFO', match_type: 'contains', response_content: 'Hi! Here is our info:\n1. Shipping\n2. Returns\n3. Contact Admin' },
            { keyword: '1', parent_keyword: 'INFO', response_content: 'We ship daily via JNE/J&T. Order before 3PM for same-day shipping.' },
            { keyword: '2', parent_keyword: 'INFO', response_content: 'Returns accepted within 7 days of purchase with video unboxing.' }
        ]
    },
    {
        id: 'onboarding',
        name: 'New User Onboarding',
        description: 'Guide new users through registration.',
        rules: [
            { keyword: 'START', match_type: 'exact', response_content: 'Welcome! Are you a:\n1. New Member\n2. Existing Member' },
            { keyword: '1', parent_keyword: 'START', response_content: 'Please reply with your Name to register.' },
            { keyword: '2', parent_keyword: 'START', response_content: 'Please reply with your Member ID to login.' }
        ]
    }
];

const RuleEditor = ({ rule, parentId, onSave, onCancel }) => {
    const [form, setForm] = useState(rule || { keyword: '', match_type: 'exact', response_content: '', media_url: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({ ...form, parent_id: parentId });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border mb-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trigger Keyword</label>
                    <input className="w-full border p-2 rounded text-sm" value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} placeholder="e.g. MENU" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Match Type</label>
                    <select className="w-full border p-2 rounded text-sm bg-white" value={form.match_type} onChange={e => setForm({ ...form, match_type: e.target.value })}>
                        <option value="exact">Exact Match</option>
                        <option value="contains">Contains Word</option>
                    </select>
                </div>
            </div>
            <div className="mb-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Response Message</label>
                <textarea className="w-full border p-2 rounded text-sm h-24" value={form.response_content} onChange={e => setForm({ ...form, response_content: e.target.value })} placeholder="Reply text..." required />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 text-white rounded text-sm font-bold">Save Rule</button>
            </div>
        </form>
    );
};

const RuleItem = ({ rule, onEdit, onDelete, onSelectChild }) => {
    return (
        <div className="bg-white border rounded-lg p-4 mb-2 shadow-sm hover:border-indigo-300 transition-colors group">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1" onClick={() => onSelectChild(rule)}>
                    <div className="bg-indigo-50 p-2 rounded text-indigo-600 font-bold text-xs uppercase flex-shrink-0">
                        {rule.match_type}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{rule.keyword}</h4>
                        <p className="text-sm text-gray-500 line-clamp-1 break-all">{rule.response_content}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(rule)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => onSelectChild(rule)} className="p-1.5 text-gray-400 hover:text-indigo-600"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};

const GeneralSettings = () => {
    const [config, setConfig] = useState({
        welcome: { enabled: false, message: '' },
        business_hours: { enabled: false, message: '', schedule: {} }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/app/auto-reply/general').then(res => {
            if (res.data.config && Object.keys(res.data.config).length > 0) {
                setConfig(prev => ({ ...prev, ...res.data.config }));
            }
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        try {
            await axios.put('/api/app/auto-reply/general', { config });
            toast.success("Settings Saved");
        } catch (e) { toast.error("Failed"); }
    };

    const toggleDay = (day) => {
        const sched = config.business_hours.schedule || {};
        const dayConf = sched[day] || { isOpen: false, open: '09:00', close: '17:00' };
        setConfig({
            ...config,
            business_hours: {
                ...config.business_hours,
                schedule: { ...sched, [day]: { ...dayConf, isOpen: !dayConf.isOpen } }
            }
        });
    };

    if (loading) return <div>Loading...</div>;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Welcome */}
            <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Welcome Message</h3>
                    <div onClick={() => setConfig({ ...config, welcome: { ...config.welcome, enabled: !config.welcome.enabled } })} className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${config.welcome.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${config.welcome.enabled ? 'translate-x-5' : ''}`}></div>
                    </div>
                </div>
                {config.welcome.enabled && (
                    <textarea className="w-full border p-2 rounded text-sm h-20" value={config.welcome.message} onChange={e => setConfig({ ...config, welcome: { ...config.welcome, message: e.target.value } })} placeholder="Hi, welcome to our store!" />
                )}
            </div>

            {/* Business Hours */}
            <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock className="w-4 h-4" /> Business Hours</h3>
                    <div onClick={() => setConfig({ ...config, business_hours: { ...config.business_hours, enabled: !config.business_hours.enabled } })} className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${config.business_hours.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${config.business_hours.enabled ? 'translate-x-5' : ''}`}></div>
                    </div>
                </div>

                {config.business_hours.enabled && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Outside Hours Reply</label>
                            <textarea className="w-full border p-2 rounded text-sm h-20 mt-1" value={config.business_hours.message} onChange={e => setConfig({ ...config, business_hours: { ...config.business_hours, message: e.target.value } })} placeholder="We are closed..." />
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            {days.map(day => {
                                const dayConf = config.business_hours.schedule?.[day] || { isOpen: false, open: '09:00', close: '17:00' };
                                return (
                                    <div key={day} className="flex flex-wrap justify-between items-center gap-2">
                                        <div className="flex items-center gap-2 w-28">
                                            <button onClick={() => toggleDay(day)}>{dayConf.isOpen ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}</button>
                                            <span className="capitalize text-sm font-medium">{day}</span>
                                        </div>
                                        {dayConf.isOpen ? (
                                            <div className="flex gap-2">
                                                <input type="time" className="border rounded px-1 text-sm" value={dayConf.open} onChange={(e) => setConfig({ ...config, business_hours: { ...config.business_hours, schedule: { ...config.business_hours.schedule, [day]: { ...dayConf, open: e.target.value } } } })} />
                                                <span className="text-sm">-</span>
                                                <input type="time" className="border rounded px-1 text-sm" value={dayConf.close} onChange={(e) => setConfig({ ...config, business_hours: { ...config.business_hours, schedule: { ...config.business_hours.schedule, [day]: { ...dayConf, close: e.target.value } } } })} />
                                            </div>
                                        ) : <span className="text-xs text-gray-400">Closed</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save Config</button>
        </div>
    );
};

const TemplateGallery = ({ onApply }) => {
    const [applying, setApplying] = useState(null);

    const handleApply = async (template) => {
        setApplying(template.id);
        try {
            // 1. Find or Create Root Rule
            const rootRule = template.rules.find(r => !r.parent_keyword);
            if (!rootRule) throw new Error("Invalid Template");

            const rootRes = await axios.post('/api/app/auto-reply/rules', {
                keyword: rootRule.keyword,
                match_type: rootRule.match_type,
                response_content: rootRule.response_content
            });
            const rootId = rootRes.data.id;

            // 2. Create Children
            const children = template.rules.filter(r => r.parent_keyword === rootRule.keyword);
            for (const child of children) {
                await axios.post('/api/app/auto-reply/rules', {
                    parent_id: rootId,
                    keyword: child.keyword,
                    match_type: 'exact',
                    response_content: child.response_content
                });
                // Note: Nested levels (level 3+) logic omitted for brevity in this template engine MVP
            }

            toast.success("Template Applied Successfully!");
            onApply(); // Refresh parent

        } catch (err) {
            toast.error("Failed to apply template");
            console.error(err);
        } finally {
            setApplying(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-900">{t.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500">{t.description}</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-600 font-mono mb-4 flex-1 overflow-y-auto max-h-32">
                        {t.rules.map((r, i) => (
                            <div key={i} className="mb-1">
                                <span className="font-bold text-indigo-600">{r.keyword}</span> → {r.response_content.substring(0, 30)}...
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => handleApply(t)}
                        disabled={!!applying}
                        className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {applying === t.id ? 'Applying...' : <><Copy className="w-3 h-3" /> Use Template</>}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default function AutoReplyManager() {
    const { hasFeature } = useConfig();
    const [activeTab, setActiveTab] = useState('keywords');
    const [rules, setRules] = useState([]);
    const [parentId, setParentId] = useState(null);
    const [parentChain, setParentChain] = useState([]); // Breadcrumbs
    const [isAdding, setIsAdding] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    useEffect(() => {
        if (activeTab === 'keywords') fetchRules();
    }, [activeTab, parentId]);

    const fetchRules = async () => {
        try {
            const res = await axios.get('/api/app/auto-reply/rules', { params: { parent_id: parentId } });
            setRules(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSaveRule = async (data) => {
        try {
            if (data.id) await axios.put(`/api/app/auto-reply/rules/${data.id}`, data);
            else await axios.post('/api/app/auto-reply/rules', data);
            setIsAdding(false);
            setEditingRule(null);
            fetchRules();
            toast.success("Saved");
        } catch (e) { toast.error("Failed"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete rule? Sub-menus will also be deleted.")) return;
        try {
            await axios.delete(`/api/app/auto-reply/rules/${id}`);
            fetchRules();
        } catch (e) { toast.error("Failed"); }
    };

    const enterChild = (rule) => {
        setParentChain([...parentChain, rule]);
        setParentId(rule.id);
    };

    const goBack = () => {
        const newChain = [...parentChain];
        newChain.pop();
        setParentChain(newChain);
        setParentId(newChain.length > 0 ? newChain[newChain.length - 1].id : null);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <h1 className="text-xl md:text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-orange-500" /> Auto-Reply Rules
            </h1>

            <div className="flex border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab('keywords')} className={`px-6 py-3 font-bold border-b-2 ${activeTab === 'keywords' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Keyword Rules</button>
                <button onClick={() => setActiveTab('templates')} className={`px-6 py-3 font-bold border-b-2 ${activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Templates</button>
                <button onClick={() => setActiveTab('general')} className={`px-6 py-3 font-bold border-b-2 ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>General Settings</button>
                <button onClick={() => setActiveTab('queue')} className={`px-6 py-3 font-bold border-b-2 ${activeTab === 'queue' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Queue Mode</button>
            </div>

            {activeTab === 'keywords' && (
                <div className="max-w-3xl">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                        <button onClick={() => { setParentId(null); setParentChain([]); }} className="hover:text-indigo-600 font-bold">Root</button>
                        {parentChain.map((p, i) => (
                            <React.Fragment key={p.id}>
                                <ArrowRight className="w-3 h-3" />
                                <span className={i === parentChain.length - 1 ? 'text-gray-900 font-bold' : ''}>{p.keyword}</span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Current Level Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{parentId ? `Sub-menu for "${parentChain[parentChain.length - 1].keyword}"` : 'Main Menu Triggers'}</h3>
                        <div className="flex gap-2">
                            {parentId && <button onClick={goBack} className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">Back</button>}
                            <button onClick={() => { setIsAdding(true); setEditingRule(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> New Rule</button>
                        </div>
                    </div>

                    {/* Editors */}
                    {isAdding && <RuleEditor parentId={parentId} onSave={handleSaveRule} onCancel={() => setIsAdding(false)} />}
                    {editingRule && <RuleEditor rule={editingRule} parentId={parentId} onSave={handleSaveRule} onCancel={() => setEditingRule(null)} />}

                    {/* List */}
                    <div className="space-y-2">
                        {rules.map(r => (
                            <RuleItem
                                key={r.id}
                                rule={r}
                                onEdit={setEditingRule}
                                onDelete={handleDelete}
                                onSelectChild={enterChild}
                            />
                        ))}
                        {rules.length === 0 && !isAdding && <p className="text-gray-400 text-center py-8">No rules defined at this level.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <TemplateGallery onApply={() => { setActiveTab('keywords'); fetchRules(); }} />
            )}

            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'queue' && <QueueSettings />}
        </div>
    );
}

// ... existing code ...

const QueueSettings = () => {
    const [config, setConfig] = useState({ enabled: false, welcome_message: '' });
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get('/api/app/auto-reply/general');
                if (res.data.config?.queue_mode) {
                    setConfig(res.data.config.queue_mode);
                }
                // Fetch detected divisions from Team
                const teamRes = await axios.get('/api/app/team');
                // Extract unique divisions from supervisors
                const divs = [...new Set(teamRes.data.filter(m => m.role_level >= 10 && m.division).map(m => m.division))];
                setDivisions(divs);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        try {
            // We need to fetch current general config first to merge? 
            // Or the endpoint handles partial updates? 
            // In GeneralSettings it sends { config }. 
            // We should do the same pattern.
            // Let's first get current config to be safe, or assumes endpoint merges.
            // The endpoint `updateGeneralConfig` (from my knowledge of typical controller) 
            // likely replaces or merges.
            // Based on GeneralSettings: `await axios.put('/api/app/auto-reply/general', { config });` 
            // It sends the WHOLE config object.
            // So we must fetch whole config, update queue_mode, and send back.

            const currentRes = await axios.get('/api/app/auto-reply/general');
            const newConfig = {
                ...currentRes.data.config,
                queue_mode: config
            };

            await axios.put('/api/app/auto-reply/general', { config: newConfig });
            toast.success("Queue Settings Saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <PaywallGuard feature="feat_queue" title="Queue Mode Locked" description="Enable Queue Mode to manage customer waiting lists.">
            <div className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-4 h-4" /> Queue Mode</h3>
                    <div onClick={() => setConfig({ ...config, enabled: !config.enabled })} className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow transform duration-200 ${config.enabled ? 'translate-x-5' : ''}`}></div>
                    </div>
                </div>

                {config.enabled && (
                    <div className="space-y-4 animate-in fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Queue Welcome Message</label>
                            <textarea
                                className="w-full border p-2 rounded text-sm h-24"
                                value={config.welcome_message}
                                onChange={e => setConfig({ ...config, welcome_message: e.target.value })}
                                placeholder="Silahkan tunggu kak {{customer_name}}, Anda antrian ke {{queue_position}}. Divisi: {{division}}."
                            />
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-semibold text-blue-900 mb-1">💡 Variabel yang Tersedia:</p>
                                <div className="text-xs text-blue-800 space-y-0.5">
                                    <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{customer_name}}'}</code> - Nama customer</div>
                                    <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{queue_position}}'}</code> - Posisi antrian (1, 2, 3...)</div>
                                    <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{division}}'}</code> - Nama divisi (SUPPORT, SALES)</div>
                                    <div>• <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 font-mono">{'{{whatsapp_number}}'}</code> - Nomor WA customer</div>
                                    <p className="text-blue-700 italic mt-1.5">Contoh: "Halo {'{{customer_name}}'}, Anda antrian ke {'{{queue_position}}'}. Kami akan respons segera."</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Menu divisions will be automatically appended below this message.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Detected Divisions</label>
                            {divisions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {divisions.map((d, i) => (
                                        <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                                            {i + 1}. {d}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                    No divisions found. Please set 'Division' for Supervisors in Team Management.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 mt-4"><Save className="w-4 h-4" /> Save Queue Config</button>
            </div>
        </PaywallGuard>
    );
};