import React, { useState } from 'react';
import { Link, Plus, Trash2, ExternalLink, Send, GripVertical, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const CTA_TEMPLATES = [
    { id: 'buy_now', label: 'Buy Now', style: 'primary' },
    { id: 'add_cart', label: 'Add to Cart', style: 'primary' },
    { id: 'checkout', label: 'Checkout', style: 'primary' },
    { id: 'more_info', label: 'More Info', style: 'secondary' },
    { id: 'view_product', label: 'View Product', style: 'secondary' },
    { id: 'contact_us', label: 'Contact Us', style: 'secondary' },
    { id: 'visit_store', label: 'Visit Store', style: 'secondary' },
    { id: 'custom', label: 'Custom', style: 'outline' },
];

function CTATemplate({ template, onAdd }) {
    return (
        <button
            onClick={() => onAdd(template)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-sm"
        >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">{template.label}</span>
        </button>
    );
}

function CTACard({ cta, onUpdate, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(cta);

    const handleSave = () => {
        if (!form.url && form.type !== 'phone') {
            toast.error('URL or phone number required');
            return;
        }
        onUpdate(form);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="bg-white border rounded-lg p-4 space-y-3">
                <input
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Button label"
                />
                <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                >
                    <option value="url">Website URL</option>
                    <option value="phone">Phone Number</option>
                    <option value="whatsapp">WhatsApp Link</option>
                </select>
                <input
                    value={form.url || form.phone || ''}
                    onChange={e => setForm({ ...form, url: e.target.value, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder={form.type === 'phone' ? '+6281234567890' : 'https://example.com/page'}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-lg p-4 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
            <div className="flex-1">
                <span className={`font-medium ${form.style === 'primary' ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {form.label}
                </span>
                {form.url && (
                    <p className="text-xs text-gray-400 truncate">{form.url}</p>
                )}
            </div>
            <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="p-2 hover:bg-gray-100 rounded">
                    Edit
                </button>
                <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function CTAManager({ conversationId, onSendCTA }) {
    const [ctas, setCTAs] = useState([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleAddTemplate = (template) => {
        const newCta = {
            id: `cta-${Date.now()}`,
            type: template.id,
            label: template.label,
            style: template.style,
            url: '',
            phone: ''
        };
        setCTAs([...ctas, newCta]);
    };

    const handleUpdate = (index, updated) => {
        const newCTAs = [...ctas];
        newCTAs[index] = updated;
        setCTAs(newCTAs);
    };

    const handleDelete = (index) => {
        setCTAs(ctas.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (ctas.length === 0) {
            toast.error('Add at least one CTA button');
            return;
        }
        onSendCTA?.(ctas);
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <span className="font-medium text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-indigo-500" />
                    CTA Buttons
                    {ctas.length > 0 && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">{ctas.length}</span>
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
            </button>

            {!collapsed && (
                <div className="p-4 space-y-4">
                    {/* CTA List */}
                    {ctas.length > 0 ? (
                        <div className="space-y-2">
                            {ctas.map((cta, i) => (
                                <CTACard
                                    key={cta.id}
                                    cta={cta}
                                    onUpdate={updated => handleUpdate(i, updated)}
                                    onDelete={() => handleDelete(i)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No CTA buttons added yet</p>
                    )}

                    {/* Templates */}
                    {showTemplates && (
                        <div className="border-t pt-4 space-y-2">
                            <p className="text-xs text-gray-500">Quick add:</p>
                            <div className="flex flex-wrap gap-2">
                                {CTA_TEMPLATES.map(template => (
                                    <CTATemplate
                                        key={template.id}
                                        template={template}
                                        onAdd={handleAddTemplate}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            {showTemplates ? 'Hide templates' : '+ Add CTA button'}
                        </button>
                        {ctas.length > 0 && (
                            <button
                                onClick={handleSend}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"
                            >
                                <Send className="w-4 h-4" /> Send CTA
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}