import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Upload, Building, Mail, Phone, MapPin, CreditCard, Bell, RefreshCw, CheckCircle, XCircle, Trash2, Eye, EyeOff, Zap, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';

const GATEWAY_LABELS = {
    xendit: { name: 'Xendit', color: '#0066FF', desc: 'VA, E-Wallet, QRIS, Retail, Credit Card' },
    midtrans: { name: 'Midtrans', color: '#002855', desc: 'VA, E-Wallet, QRIS, Credit Card, Convenience Store' },
    tripay: { name: 'TriPay', color: '#6366f1', desc: 'VA, E-Wallet, QRIS, Retail' },
    duitku: { name: 'Duitku', color: '#e11d48', desc: 'VA, E-Wallet, QRIS, Retail, Credit Card' }
};

const GATEWAY_FIELDS = {
    xendit: [
        { key: 'api_key', label: 'API Key (Secret Key)', type: 'password' },
        { key: 'callback_token', label: 'Callback Verification Token', type: 'password' }
    ],
    midtrans: [
        { key: 'server_key', label: 'Server Key', type: 'password' },
        { key: 'client_key', label: 'Client Key', type: 'password' },
        { key: 'is_production', label: 'Production Mode', type: 'toggle' }
    ],
    tripay: [
        { key: 'api_key', label: 'API Key', type: 'password' },
        { key: 'private_key', label: 'Private Key', type: 'password' },
        { key: 'merchant_code', label: 'Merchant Code', type: 'text' },
        { key: 'is_production', label: 'Production Mode', type: 'toggle' }
    ],
    duitku: [
        { key: 'merchant_code', label: 'Merchant Code', type: 'text' },
        { key: 'api_key', label: 'API Key', type: 'password' },
        { key: 'is_production', label: 'Production Mode', type: 'toggle' }
    ]
};

export default function InvoiceSettings() {
    const [settings, setSettings] = useState({ 
        prefix: 'INV', footer_note: '', tax_percentage: 0, due_days: 7,
        logo_url: '', org_name: '', org_address: '', org_email: '', org_phone: '',
        theme_color: '#4f46e5',
        reminder_enabled: false, reminder_days_before: 3, reminder_days_after: 3, reminder_message_template: '',
        recurring_enabled: false
    });
    const [activeTab, setActiveTab] = useState('general'); // general, gateway, automation
    const [gateways, setGateways] = useState([]);
    const [gwForms, setGwForms] = useState({});
    const [showSecrets, setShowSecrets] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/app/invoice-settings').then(res => setSettings(prev => ({...prev, ...res.data})));
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const res = await axios.get('/api/app/invoice-gateway');
            setGateways(res.data.configs || []);
            // Initialize forms from existing configs
            const forms = {};
            (res.data.configs || []).forEach(g => {
                forms[g.gateway_type] = { config: g.safe_config || {}, is_active: g.is_active, is_default: g.is_default };
            });
            setGwForms(forms);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/invoice-settings', settings);
            toast.success("Settings saved!");
        } catch (e) { toast.error("Failed to save"); }
        finally { setSaving(false); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/invoice-settings/upload', formData, { headers: {'Content-Type':'multipart/form-data'}});
            setSettings({ ...settings, logo_url: res.data.url });
            toast.success("Logo uploaded");
        } catch (e) { toast.error("Upload failed"); }
    };

    const handleSaveGateway = async (type) => {
        const form = gwForms[type];
        if (!form) return;
        try {
            await axios.post('/api/app/invoice-gateway', {
                gateway_type: type,
                config: form.config,
                is_active: form.is_active ?? true,
                is_default: form.is_default ?? false
            });
            toast.success(`${GATEWAY_LABELS[type]?.name || type} saved!`);
            fetchGateways();
        } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    };

    const handleDeleteGateway = async (type) => {
        if (!confirm(`Hapus konfigurasi ${GATEWAY_LABELS[type]?.name}?`)) return;
        try {
            await axios.delete(`/api/app/invoice-gateway/${type}`);
            toast.success('Deleted');
            setGwForms(prev => { const n = {...prev}; delete n[type]; return n; });
            fetchGateways();
        } catch (e) { toast.error('Failed'); }
    };

    const updateGwForm = (type, key, value) => {
        setGwForms(prev => ({
            ...prev,
            [type]: {
                ...(prev[type] || { config: {}, is_active: false, is_default: false }),
                config: { ...(prev[type]?.config || {}), [key]: value }
            }
        }));
    };

    const toggleGwField = (type, field) => {
        setGwForms(prev => ({
            ...prev,
            [type]: { ...(prev[type] || { config: {} }), [field]: !(prev[type]?.[field]) }
        }));
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Building },
        { id: 'gateway', label: 'Payment Gateway', icon: CreditCard },
        { id: 'automation', label: 'Automasi', icon: Zap }
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Invoice Settings</h2>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-bold transition-all ${
                            activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* TAB: General Settings */}
            {activeTab === 'general' && (
                <div className="bg-white p-8 rounded-xl border shadow-sm space-y-8">
                    {/* Section 1: Branding */}
                    <div>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase mb-4 border-b pb-2">Branding & Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Organization Name</label>
                                <div className="relative">
                                    <Building className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                        value={settings.org_name} onChange={e => setSettings({...settings, org_name: e.target.value})} placeholder="e.g. My Company Ltd." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded border flex items-center justify-center bg-gray-50 overflow-hidden">
                                        {settings.logo_url ? <img src={getApiUrl(settings.logo_url)} className="h-full w-full object-contain" alt="Logo"/> : <span className="text-xs text-gray-400">None</span>}
                                    </div>
                                    <input type="file" onChange={handleUpload} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Theme Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" className="w-12 h-12 p-1 rounded cursor-pointer border" 
                                        value={settings.theme_color || '#4f46e5'} onChange={e => setSettings({...settings, theme_color: e.target.value})} />
                                    <input type="text" className="w-full border p-2 rounded-lg text-sm uppercase" 
                                        value={settings.theme_color || '#4f46e5'} onChange={e => setSettings({...settings, theme_color: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contact Info */}
                    <div>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase mb-4 border-b pb-2">Organization Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                <div className="relative">
                                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <textarea className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-24 resize-none" 
                                        value={settings.org_address} onChange={e => setSettings({...settings, org_address: e.target.value})} placeholder="Full Address..." />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        <input type="email" className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                            value={settings.org_email} onChange={e => setSettings({...settings, org_email: e.target.value})} placeholder="contact@company.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        <input className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                            value={settings.org_phone} onChange={e => setSettings({...settings, org_phone: e.target.value})} placeholder="+62 812..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Invoice Config */}
                    <div>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase mb-4 border-b pb-2">Invoice Configuration</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Prefix</label>
                                <input className="w-full border p-2 rounded-lg text-sm" value={settings.prefix} onChange={e => setSettings({...settings, prefix: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Default Due Days</label>
                                <input type="number" className="w-full border p-2 rounded-lg text-sm" value={settings.due_days} onChange={e => setSettings({...settings, due_days: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tax Percentage (%)</label>
                                <input type="number" className="w-full border p-2 rounded-lg text-sm" value={settings.tax_percentage} onChange={e => setSettings({...settings, tax_percentage: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Footer Note (Bank Details)</label>
                            <textarea className="w-full border p-2 rounded-lg text-sm h-24" value={settings.footer_note} onChange={e => setSettings({...settings, footer_note: e.target.value})} />
                        </div>
                    </div>

                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            )}

            {/* TAB: Payment Gateway */}
            {activeTab === 'gateway' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Konfigurasi Payment Gateway</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Pilih dan konfigurasi gateway pembayaran. Gateway yang di-set sebagai <strong>Default</strong> akan digunakan untuk tombol "Bayar Online" di halaman invoice publik.
                                    Webhook URL: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/webhook/invoice-payment/[type]</code>
                                </p>
                            </div>
                        </div>
                    </div>

                    {Object.entries(GATEWAY_LABELS).map(([type, meta]) => {
                        const form = gwForms[type] || { config: {}, is_active: false, is_default: false };
                        const existsInDb = gateways.find(g => g.gateway_type === type);
                        const fields = GATEWAY_FIELDS[type] || [];

                        return (
                            <div key={type} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${form.is_active ? 'ring-2 ring-indigo-200' : ''}`}>
                                <div className="p-5 flex items-center justify-between border-b bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: meta.color }}>
                                            {meta.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{meta.name}</h3>
                                            <p className="text-xs text-gray-500">{meta.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {form.is_default && (
                                            <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">DEFAULT</span>
                                        )}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" 
                                                checked={form.is_active || false}
                                                onChange={() => toggleGwField(type, 'is_active')} />
                                            <div className="relative w-10 h-5 bg-gray-200 peer-checked:bg-green-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                                            <span className="text-xs font-bold text-gray-500">{form.is_active ? 'Active' : 'Inactive'}</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="p-5 space-y-4">
                                    {fields.map(field => (
                                        <div key={field.key}>
                                            {field.type === 'toggle' ? (
                                                <label className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-sm font-bold text-gray-700">{field.label}</span>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer"
                                                            checked={form.config[field.key] === true || form.config[field.key] === 'true'}
                                                            onChange={() => updateGwForm(type, field.key, !(form.config[field.key] === true || form.config[field.key] === 'true'))} />
                                                        <div className="relative w-10 h-5 bg-gray-200 peer-checked:bg-indigo-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                                                    </label>
                                                </label>
                                            ) : (
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">{field.label}</label>
                                                    <div className="relative">
                                                        <input
                                                            type={field.type === 'password' && !showSecrets[`${type}_${field.key}`] ? 'password' : 'text'}
                                                            className="w-full border p-2.5 pr-10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            value={form.config[field.key] || ''}
                                                            onChange={e => updateGwForm(type, field.key, e.target.value)}
                                                            placeholder={`Enter ${field.label}...`}
                                                        />
                                                        {field.type === 'password' && (
                                                            <button className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                                                onClick={() => setShowSecrets(p => ({ ...p, [`${type}_${field.key}`]: !p[`${type}_${field.key}`] }))}>
                                                                {showSecrets[`${type}_${field.key}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={form.is_default || false}
                                                onChange={() => toggleGwField(type, 'is_default')} />
                                            <span className="font-bold text-gray-700">Set as Default</span>
                                        </label>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => handleSaveGateway(type)}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-sm flex items-center justify-center gap-2 transition-all">
                                            <Save className="w-4 h-4" /> Save
                                        </button>
                                        {existsInDb && (
                                            <button onClick={() => handleDeleteGateway(type)}
                                                className="py-2.5 px-4 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 text-sm flex items-center gap-2 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB: Automation */}
            {activeTab === 'automation' && (
                <div className="space-y-6">
                    {/* Auto Reminder */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-5 flex items-center justify-between border-b bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Auto-Reminder Invoice</h3>
                                    <p className="text-xs text-gray-500">Kirim pengingat otomatis via WhatsApp sebelum & sesudah jatuh tempo</p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="sr-only peer" 
                                    checked={settings.reminder_enabled}
                                    onChange={() => setSettings(s => ({...s, reminder_enabled: !s.reminder_enabled}))} />
                                <div className="relative w-10 h-5 bg-gray-200 peer-checked:bg-amber-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        {settings.reminder_enabled && (
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Ingatkan H-__ sebelum jatuh tempo</label>
                                        <input type="number" min="1" max="30" className="w-full border p-2 rounded-lg text-sm"
                                            value={settings.reminder_days_before} onChange={e => setSettings({...settings, reminder_days_before: parseInt(e.target.value) || 3})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Kirim overdue notice H+__ setelah</label>
                                        <input type="number" min="1" max="30" className="w-full border p-2 rounded-lg text-sm"
                                            value={settings.reminder_days_after} onChange={e => setSettings({...settings, reminder_days_after: parseInt(e.target.value) || 3})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Template Pesan (Opsional)</label>
                                    <textarea className="w-full border p-2 rounded-lg text-sm h-20" placeholder="Kosongkan untuk menggunakan template default..."
                                        value={settings.reminder_message_template || ''} onChange={e => setSettings({...settings, reminder_message_template: e.target.value})} />
                                    <p className="text-xs text-gray-400 mt-1">Biarkan kosong untuk menggunakan template bawaan yang sudah dioptimalkan.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recurring Invoice */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-5 flex items-center justify-between border-b bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Recurring Invoice</h3>
                                    <p className="text-xs text-gray-500">Buat invoice otomatis secara berkala (mingguan / bulanan / tahunan)</p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="sr-only peer" 
                                    checked={settings.recurring_enabled}
                                    onChange={() => setSettings(s => ({...s, recurring_enabled: !s.recurring_enabled}))} />
                                <div className="relative w-10 h-5 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        {settings.recurring_enabled && (
                            <div className="p-5">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-blue-700">
                                        <strong>Fitur aktif.</strong> Kelola template invoice berulang dari halaman <strong>Invoicing → Recurring Templates</strong>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Automation Settings'}
                    </button>
                </div>
            )}
        </div>
    );
}