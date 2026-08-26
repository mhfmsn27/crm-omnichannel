import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ShieldAlert, Info } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const PRIORITY_META = {
    low:    { label: 'Rendah',   color: 'gray',  badge: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' },
    medium: { label: 'Sedang',   color: 'blue',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    high:   { label: 'Tinggi',   color: 'orange',badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    urgent: { label: 'Urgent',   color: 'red',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const DEFAULTS = [
    { priority: 'low',    frt_minutes: 240, resolution_minutes: 1440, is_active: true },
    { priority: 'medium', frt_minutes: 60,  resolution_minutes: 480,  is_active: true },
    { priority: 'high',   frt_minutes: 30,  resolution_minutes: 240,  is_active: true },
    { priority: 'urgent', frt_minutes: 10,  resolution_minutes: 60,   is_active: true },
];

function minutesToHuman(min) {
    if (min < 60) return `${min} menit`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export default function SLASettingsPage() {
    usePageTitle('KEBIJAKAN SLA');
    const [policies, setPolicies] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/app/tickets/sla-policies')
            .then(res => setPolicies(res.data))
            .catch(() => toast.error('Gagal memuat SLA'))
            .finally(() => setLoading(false));
    }, []);

    const updatePolicy = (priority, field, value) => {
        setPolicies(prev => prev.map(p =>
            p.priority === priority ? { ...p, [field]: value } : p
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/tickets/sla-policies', { policies });
            toast.success('Kebijakan SLA disimpan');
        } catch {
            toast.error('Gagal menyimpan SLA');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-1">
                <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kebijakan SLA & Tiket</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Atur target waktu respons pertama (FRT) dan resolusi untuk setiap level prioritas tiket.
            </p>

            <div className="space-y-4 mb-6">
                {policies.map(policy => {
                    const meta = PRIORITY_META[policy.priority];
                    return (
                        <div
                            key={policy.priority}
                            className={`bg-white dark:bg-dark-surface rounded-xl border ${policy.is_active ? 'border-gray-200 dark:border-dark-border' : 'border-gray-100 dark:border-slate-800 opacity-50'} shadow-sm overflow-hidden`}
                        >
                            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${meta.badge}`}>
                                        {meta.label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => updatePolicy(policy.priority, 'is_active', !policy.is_active)}
                                    className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${policy.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${policy.is_active ? 'translate-x-4' : ''}`}></div>
                                </button>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                        Waktu Respons Pertama (FRT)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={policy.frt_minutes}
                                            disabled={!policy.is_active}
                                            onChange={e => updatePolicy(policy.priority, 'frt_minutes', parseInt(e.target.value) || 1)}
                                            className="w-24 border border-gray-300 dark:border-dark-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-slate-400">menit</span>
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                            ({minutesToHuman(policy.frt_minutes)})
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                        Target Waktu Resolusi
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={policy.resolution_minutes}
                                            disabled={!policy.is_active}
                                            onChange={e => updatePolicy(policy.priority, 'resolution_minutes', parseInt(e.target.value) || 1)}
                                            className="w-24 border border-gray-300 dark:border-dark-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-slate-400">menit</span>
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                            ({minutesToHuman(policy.resolution_minutes)})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed space-y-1">
                    <p><strong>FRT (First Reply Time):</strong> Waktu maksimal dari percakapan dibuat hingga agent pertama kali membalas.</p>
                    <p><strong>Resolusi:</strong> Waktu maksimal dari percakapan dibuat hingga percakapan diselesaikan.</p>
                    <p>Tiket yang melewati batas waktu akan otomatis ditandai sebagai <strong>SLA Breached</strong> dan bisa dilihat di halaman Reports.</p>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
                {saving ? 'Menyimpan...' : 'Simpan Kebijakan SLA'}
            </button>
        </div>
    );
}
