import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import { ArrowLeft, Save, Sparkles, Clock, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import PaywallGuard from '../../components/common/PaywallGuard';
import { useConfig } from '../../context/ConfigContext';

export default function CreateUpselling() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Data State
    const [devices, setDevices] = useState([]);
    const [rotators, setRotators] = useState([]);
    const [labels, setLabels] = useState([]);

    // Form State
    const [form, setForm] = useState({
        name: '',
        delay_seconds: 60,
        device_mode: 'ai', // ai, specific, rotator
        device_id: '',
        rotator_group_id: '',
        target_type: 'label', // all, label, group
        target_value: '[]',

        // Scheduling
        frequency: 'daily', // daily, monthly, yearly
        time: '09:00',
        day_of_month: 1,
        month_of_year: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',

        // Message
        message_template: ''
    });

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (!hasFeature('feat_upselling')) return;
        const fetchResources = async () => {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const [devRes, rotRes, labRes] = await Promise.all([
                    axios.get('/api/app/devices', { headers }),
                    axios.get('/api/app/rotators/stats', { headers }),
                    axios.get('/api/app/labels', { headers })
                ]);
                setDevices(devRes.data);
                setRotators(rotRes.data);
                setLabels(labRes.data);
            } catch (err) {
                console.error("Failed to load resources");
            }
        };
        fetchResources();
    }, [hasFeature]);

    const handleChange = (key, val) => {
        setForm(prev => ({ ...prev, [key]: val }));
    };

    const handleLabelToggle = (id) => {
        const current = JSON.parse(form.target_value || '[]');
        let next;
        if (current.includes(id)) next = current.filter(x => x !== id);
        else next = [...current, id];
        handleChange('target_value', JSON.stringify(next));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validation
        if (!form.name || !form.message_template) {
            alert("Mohon lengkapi nama campaign dan pesan.");
            setLoading(false);
            return;
        }

        if (!hasFeature('feat_upselling')) {
            toast.error("Upgrade diperlukan untuk membuat kampanye upselling.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/app/upselling', form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/broadcast/upselling');
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                toast.error("Fitur Premium Terkunci");
            } else {
                alert(err.response?.data?.error || "Gagal membuat campaign.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <PaywallGuard feature="feat_upselling" title="Upselling Campaigns Locked" description="Automate your follow-ups and increase sales.">
            <div className="p-6 pb-20">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Buat Upselling Campaign</h1>
                        <p className="text-sm text-gray-500">Kirim pesan otomatis berkala untuk engage customer.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                    {/* Section 1: Basic Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Judul Upselling Campaign <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Contoh: Promo Ulang Tahun"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Delay Antar Pengiriman (detik)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    value={form.delay_seconds}
                                    onChange={e => handleChange('delay_seconds', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Device */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" /> Konfigurasi Device
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Opsi Penggunaan Device</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                    value={form.device_mode}
                                    onChange={e => handleChange('device_mode', e.target.value)}
                                >
                                    <option value="ai">AI Choose (Otomatis Pilih)</option>
                                    <option value="specific">Pilih Device Spesifik</option>
                                    <option value="rotator">Gunakan Rotator</option>
                                </select>
                            </div>

                            {form.device_mode === 'specific' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Device</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                        value={form.device_id}
                                        onChange={e => handleChange('device_id', e.target.value)}
                                    >
                                        <option value="">-- Pilih Device --</option>
                                        {Array.isArray(devices) && devices.filter(d => d.type !== 'official' && d.channel !== 'wa_coex').map(d => (
                                            <option key={d.id} value={d.id}>{d.name || d.whatsapp_number}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {form.device_mode === 'rotator' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Rotator Group</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                        value={form.rotator_group_id}
                                        onChange={e => handleChange('rotator_group_id', e.target.value)}
                                    >
                                        <option value="">-- Pilih Rotator --</option>
                                        {Array.isArray(rotators) && rotators.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Target */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" /> Target Audience
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Target</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={form.target_type === 'all'} onChange={() => handleChange('target_type', 'all')} />
                                        <span>Semua Kontak</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={form.target_type === 'label'} onChange={() => handleChange('target_type', 'label')} />
                                        <span>Berdasarkan Label</span>
                                    </label>
                                </div>
                            </div>

                            {form.target_type === 'all' && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-yellow-800">
                                        <strong>Caution:</strong> Campaign will run for <strong>ALL</strong> contacts.
                                    </div>
                                </div>
                            )}

                            {form.target_type === 'label' && (
                                <div className="border p-4 rounded-lg bg-gray-50">
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Pilih Label</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.isArray(labels) && labels.map(l => (
                                            <button
                                                key={l.id} type="button"
                                                onClick={() => handleLabelToggle(l.id)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${JSON.parse(form.target_value).includes(l.id)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-600 border-gray-300'
                                                    }`}
                                            >
                                                {l.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Schedule (Frequency) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> Opsi Penjadwalan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Frekuensi Pengiriman <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-bold text-indigo-600"
                                    value={form.frequency}
                                    onChange={e => handleChange('frequency', e.target.value)}
                                >
                                    <option value="daily">Harian (Setiap Hari)</option>
                                    <option value="monthly">Bulanan (Setiap Bulan)</option>
                                    <option value="yearly">Tahunan (Setiap Tahun)</option>
                                </select>
                            </div>

                            {form.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Setiap Tanggal</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        value={form.day_of_month}
                                        onChange={e => handleChange('day_of_month', parseInt(e.target.value))}
                                    />
                                </div>
                            )}

                            {form.frequency === 'yearly' && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Bulan</label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            value={form.month_of_year}
                                            onChange={e => handleChange('month_of_year', parseInt(e.target.value))}
                                        >
                                            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal</label>
                                        <input
                                            type="number" min="1" max="31"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            value={form.day_of_month}
                                            onChange={e => handleChange('day_of_month', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Waktu Pengiriman (Jam)</label>
                                <input
                                    type="time"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    value={form.time}
                                    onChange={e => handleChange('time', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    value={form.start_date}
                                    onChange={e => handleChange('start_date', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Berakhir (Opsional)</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    value={form.end_date}
                                    onChange={e => handleChange('end_date', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Message */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Template Pesan</h3>
                        <textarea
                            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                            placeholder="Halo {name}, dapatkan penawaran spesial..."
                            value={form.message_template}
                            onChange={e => handleChange('message_template', e.target.value)}
                        />
                        <div className="mt-2 text-xs text-gray-500">
                            Available variables: {'{name}, {phone}, {birthday}, {var1}, {var2}'}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : <><Save className="w-5 h-5" /> Simpan Campaign</>}
                        </button>
                    </div>
                </form>
            </div>
        </PaywallGuard>
    );
}
