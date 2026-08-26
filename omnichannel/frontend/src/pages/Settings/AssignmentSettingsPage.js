import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserCheck, Shuffle, BarChart2, Info } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const MODES = [
    {
        id: 'manual',
        label: 'Manual',
        description: 'Percakapan masuk tidak otomatis diteruskan ke agent. Admin atau agent harus pickup secara manual dari antrian.',
        icon: UserCheck,
        color: 'gray'
    },
    {
        id: 'round_robin',
        label: 'Round Robin',
        description: 'Percakapan baru dialihkan secara bergiliran ke semua agent yang sedang online. Distribusi merata ke setiap agent.',
        icon: Shuffle,
        color: 'indigo'
    },
    {
        id: 'least_active',
        label: 'Least Active',
        description: 'Percakapan baru diberikan ke agent yang paling sedikit menangani percakapan aktif saat ini.',
        icon: BarChart2,
        color: 'green'
    }
];

export default function AssignmentSettingsPage() {
    usePageTitle('PENGATURAN ASSIGNMENT');
    const [mode, setMode] = useState('manual');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/app/inbox/settings/assignment')
            .then(res => setMode(res.data.assignment_mode || 'manual'))
            .catch(() => toast.error('Gagal memuat pengaturan'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/inbox/settings/assignment', { assignment_mode: mode });
            toast.success('Pengaturan assignment disimpan');
        } catch {
            toast.error('Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Auto-Assignment Agent</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Tentukan bagaimana percakapan baru yang masuk didistribusikan ke agent.
            </p>

            <div className="space-y-3 mb-8">
                {MODES.map(m => {
                    const Icon = m.icon;
                    const isActive = mode === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                                isActive
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-dark-surface'
                            }`}
                        >
                            <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                            }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-bold text-sm ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-white'}`}>
                                        {m.label}
                                    </span>
                                    {isActive && (
                                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Aktif</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{m.description}</p>
                            </div>
                            <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                isActive ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-slate-500'
                            }`}>
                                {isActive && <div className="w-full h-full rounded-full bg-white scale-[0.4]"></div>}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800 mb-6">
                <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
                    Auto-assignment hanya berlaku untuk agent yang <strong>sedang online</strong>. Pastikan agent mengaktifkan status online saat mulai bertugas.
                </p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
        </div>
    );
}
