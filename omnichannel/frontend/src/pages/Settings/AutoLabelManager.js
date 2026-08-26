import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    Edit, Trash2, Plus, Save, Tag, ToggleRight, ToggleLeft,
    MessageSquare, Zap, BarChart3, History, X, Check,
    ChevronDown, ArrowRight, AlertCircle, Info
} from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useConfig } from '../../context/ConfigContext';

const AVAILABLE_CHANNELS = [
    { id: 'whatsapp', name: 'WhatsApp', color: 'bg-green-100 text-green-700' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-100 text-pink-700' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-100 text-blue-700' },
    { id: 'tiktok', name: 'TikTok', color: 'bg-black text-white' },
    { id: 'shopee', name: 'Shopee', color: 'bg-orange-100 text-orange-700' },
    { id: 'telegram', name: 'Telegram', color: 'bg-sky-100 text-sky-700' },
    { id: 'webchat', name: 'Web Chat', color: 'bg-purple-100 text-purple-700' }
];

const MATCH_TYPES = [
    { id: 'contains', name: 'Contains', description: 'Message contains keyword' },
    { id: 'exact', name: 'Exact Match', description: 'Message exactly matches keyword' },
    { id: 'starts_with', name: 'Starts With', description: 'Message starts with keyword' },
    { id: 'ends_with', name: 'Ends With', description: 'Message ends with keyword' },
    { id: 'regex', name: 'Regex', description: 'Use regular expression pattern' }
];

const MESSAGE_SCOPES = [
    { id: 'any', name: 'Any Message', description: 'Apply on any message' },
    { id: 'first', name: 'First Message Only', description: 'Apply only on first contact message' },
    { id: 'continued', name: 'Continued Chat', description: 'Apply only on subsequent messages' }
];

const RuleForm = ({ rule, labels, onSave, onCancel }) => {
    const [form, setForm] = useState(rule || {
        name: '',
        rule_type: 'source',
        source_channel: '',
        keyword_pattern: '',
        keyword_match_type: 'contains',
        case_sensitive: false,
        message_scope: 'any',
        label_id: '',
        priority: 0,
        is_active: true,
        auto_remove: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.label_id) {
            toast.error('Please select a label');
            return;
        }
        if (form.rule_type === 'keyword' && !form.keyword_pattern) {
            toast.error('Please enter a keyword pattern');
            return;
        }
        await onSave(form);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={rule ? 'Edit Rule' : 'Create Auto-Label Rule'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} icon={<Save className="w-4 h-4"/>}>
                        {rule ? 'Update Rule' : 'Create Rule'}
                    </Button>
                </ModalFooter>
            }
        >
            <form onSubmit={handleSubmit} className="p-2 space-y-4">

            {/* Rule Name */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., Label Shopee Ads Customers"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>

            {/* Rule Type */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type *</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, rule_type: 'source' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${form.rule_type === 'source' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className={`w-4 h-4 ${form.rule_type === 'source' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="font-semibold text-sm">Source Channel</span>
                        </div>
                        <p className="text-xs text-gray-500">Auto-label based on chat source (WA, IG, FB, etc.)</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, rule_type: 'keyword' })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${form.rule_type === 'keyword' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className={`w-4 h-4 ${form.rule_type === 'keyword' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="font-semibold text-sm">Keyword Based</span>
                        </div>
                        <p className="text-xs text-gray-500">Auto-label based on message keywords</p>
                    </button>
                </div>
            </div>

            {/* Source Channel (for source type) */}
            {form.rule_type === 'source' && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Source Channel *</label>
                    <select
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={form.source_channel}
                        onChange={e => setForm({ ...form, source_channel: e.target.value })}
                    >
                        <option value="">All Channels</option>
                        {AVAILABLE_CHANNELS.map(ch => (
                            <option key={ch.id} value={ch.id}>{ch.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Leave empty to match all channels</p>
                </div>
            )}

            {/* Keyword Settings (for keyword type) */}
            {form.rule_type === 'keyword' && (
                <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keyword Pattern *</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="e.g., harga, order, complain"
                            value={form.keyword_pattern}
                            onChange={e => setForm({ ...form, keyword_pattern: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Match Type</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={form.keyword_match_type}
                                onChange={e => setForm({ ...form, keyword_match_type: e.target.value })}
                            >
                                {MATCH_TYPES.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Scope</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={form.message_scope}
                                onChange={e => setForm({ ...form, message_scope: e.target.value })}
                            >
                                {MESSAGE_SCOPES.map(scope => (
                                    <option key={scope.id} value={scope.id}>{scope.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="case_sensitive"
                            checked={form.case_sensitive}
                            onChange={e => setForm({ ...form, case_sensitive: e.target.checked })}
                            className="rounded"
                        />
                        <label htmlFor="case_sensitive" className="text-sm text-gray-600">Case Sensitive</label>
                    </div>
                </div>
            )}

            {/* Label Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Apply Label *</label>
                <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.label_id}
                    onChange={e => setForm({ ...form, label_id: e.target.value })}
                    required
                >
                    <option value="">Select a label...</option>
                    {labels.map(label => (
                        <option key={label.id} value={label.id}>{label.name}</option>
                    ))}
                </select>
            </div>

            {/* Priority */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (Higher = processed first)</label>
                <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                />
            </div>

            {/* Active Toggle */}
            <div className="mb-6 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <span className="font-medium text-sm">Rule Active</span>
                    <p className="text-xs text-gray-500">Enable/disable this rule</p>
                </div>
                <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`p-1 rounded-full transition-colors ${form.is_active ? 'text-green-600' : 'text-gray-300'}`}
                >
                    {form.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
            </div>

            </form>
        </Modal>
    );
};

const RuleCard = ({ rule, onEdit, onDelete, onToggle }) => {
    const isSource = rule.rule_type === 'source';
    const channel = AVAILABLE_CHANNELS.find(c => c.id === (rule.source_channel || rule.source_channel));

    return (
        <div className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${rule.is_active ? '' : 'opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-semibold text-sm">{rule.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${isSource ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                            {isSource ? 'Source' : 'Keyword'}
                        </span>
                        {channel && (
                            <span className={`px-2 py-0.5 rounded ${channel.color}`}>
                                {channel.name}
                            </span>
                        )}
                        {!isSource && (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {rule.keyword_match_type}
                            </span>
                        )}
                        {rule.match_count > 0 && (
                            <span className="text-gray-400">| {rule.match_count} matches</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onToggle(rule)}
                    className={`p-1 rounded transition-colors ${rule.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-300 hover:text-gray-400'}`}
                >
                    {rule.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
            </div>

            {!isSource && rule.keyword_pattern && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-500">Pattern: </span>
                    <code className="bg-gray-200 px-1 rounded">{rule.keyword_pattern}</code>
                    <span className="text-gray-400 ml-2">({rule.message_scope})</span>
                </div>
            )}

            {rule.label_name && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500">Apply:</span>
                    <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: rule.label_color + '20', color: rule.label_color }}
                    >
                        {rule.label_name}
                    </span>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => onEdit(rule)} className="p-1.5 text-gray-400 hover:text-indigo-600">
                    <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const StatsCard = ({ stats }) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.total_rules || 0}</div>
            <div className="text-xs text-gray-500">Total Rules</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active_rules || 0}</div>
            <div className="text-xs text-gray-500">Active Rules</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total_applied || 0}</div>
            <div className="text-xs text-gray-500">Labels Applied</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.total_matches || 0}</div>
            <div className="text-xs text-gray-500">Total Matches</div>
        </div>
    </div>
);

const AutoLabelManager = () => {
    const [rules, setRules] = useState([]);
    const [labels, setLabels] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [activeTab, setActiveTab] = useState('rules');

    const fetchData = async () => {
        try {
            const [rulesRes, labelsRes, statsRes] = await Promise.all([
                axios.get('/api/app/auto-label/rules'),
                axios.get('/api/app/labels'),
                axios.get('/api/app/auto-label/stats')
            ]);
            setRules(rulesRes.data);
            setLabels(labelsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Error fetching auto-label data:', err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (formData) => {
        try {
            if (editingRule) {
                await axios.put(`/api/app/auto-label/rules/${editingRule.id}`, formData);
                toast.success('Rule updated');
            } else {
                await axios.post('/api/app/auto-label/rules', formData);
                toast.success('Rule created');
            }
            setShowForm(false);
            setEditingRule(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save rule');
        }
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await axios.delete(`/api/app/auto-label/rules/${id}`);
            toast.success('Rule deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete rule');
        }
    };

    const handleToggle = async (rule) => {
        try {
            await axios.patch(`/api/app/auto-label/rules/${rule.id}/toggle`, {
                is_active: !rule.is_active
            });
            fetchData();
        } catch (err) {
            toast.error('Failed to toggle rule');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Tag className="w-6 h-6" />
                        Auto-Label Rules
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Automatically label contacts based on source or keywords
                    </p>
                </div>
                <button
                    onClick={() => { setEditingRule(null); setShowForm(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Rule
                </button>
            </div>

            {/* Stats */}
            <StatsCard stats={stats} />

            {/* Tabs */}
            <div className="flex gap-4 border-b mb-6">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'rules' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Rules ({rules.length})
                </button>
                <button
                    onClick={() => setActiveTab('info')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Info className="w-4 h-4 inline mr-1" />
                    How It Works
                </button>
            </div>

            {/* Rules List */}
            {activeTab === 'rules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rules.length === 0 ? (
                        <div className="col-span-2 bg-white rounded-xl border border-dashed p-8 text-center">
                            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="font-medium text-gray-600 mb-1">No rules yet</h3>
                            <p className="text-sm text-gray-400 mb-4">Create your first auto-label rule to get started</p>
                            <button
                                onClick={() => { setEditingRule(null); setShowForm(true); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Create First Rule
                            </button>
                        </div>
                    ) : (
                        rules.map(rule => (
                            <RuleCard
                                key={rule.id}
                                rule={rule}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onToggle={handleToggle}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="font-bold text-lg mb-4">How Auto-Label Works</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="bg-indigo-100 rounded-lg p-3 h-fit">
                                <Zap className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Source-Based Rules</h4>
                                <p className="text-sm text-gray-600">
                                    Automatically apply labels when customers chat from specific platforms.
                                    For example, label all Shopee chats with "Shopee" tag.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-green-100 rounded-lg p-3 h-fit">
                                <MessageSquare className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Keyword-Based Rules</h4>
                                <p className="text-sm text-gray-600">
                                    Apply labels when messages contain specific keywords.
                                    Support for: contains, exact match, starts with, ends with, and regex patterns.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-orange-100 rounded-lg p-3 h-fit">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Message Scope</h4>
                                <p className="text-sm text-gray-600">
                                    Control when labels apply: any message, first message only, or continued conversations.
                                </p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Priority System</h4>
                            <p className="text-xs text-gray-600">
                                Rules with higher priority numbers are processed first.
                                This allows you to create catch-all rules (low priority) and specific rules (high priority).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Form Modal */}
            {showForm && (
                <RuleForm
                    rule={editingRule}
                    labels={labels}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingRule(null); }}
                />
            )}
        </div>
    );
};

export default AutoLabelManager;