import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Clock, Info } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: '09:00',
    end_time: '17:00',
    is_active: i >= 1 && i <= 5
}));

const TIMEZONES = [
    'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura',
    'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Bangkok',
    'Asia/Manila', 'Asia/Tokyo', 'UTC'
];

const OUTSIDE_MODES = [
    { id: 'message', label: 'Kirim pesan offline otomatis' },
    { id: 'ai', label: 'Biarkan AI tetap merespons' },
    { id: 'none', label: 'Tidak ada respons otomatis' }
];

export default function WorkingHoursPage() {
    usePageTitle('JAM OPERASIONAL');
    const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
    const [config, setConfig] = useState({
        timezone: 'Asia/Jakarta',
        outside_mode: 'message',
        offline_message: 'Terima kasih telah menghubungi kami. Saat ini kami sedang tidak beroperasi. Kami akan segera membalas pesan Anda pada jam operasional berikutnya.'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/app/settings/working-hours')
            .then(res => {
                if (res.data.schedule) setSchedule(res.data.schedule);
                if (res.data.config) setConfig(res.data.config);
            })
            .catch(() => toast.error('Gagal memuat jam operasional'))
            .finally(() => setLoading(false));
    }, []);

    const updateDay = (idx, field, value) => {
        setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/settings/working-hours', { schedule, config });
            toast.success('Jam operasional disimpan');
        } catch {
            toast.error('Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Jam Operasional</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Tentukan jam kerja bisnis Anda. Di luar jam ini, sistem akan otomatis merespons sesuai pengaturan.
            </p>

            {/* Timezone */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Zona Waktu</label>
                <select
                    value={config.timezone}
                    onChange={e => setConfig(c => ({ ...c, timezone: e.target.value }))}
                    className="w-full md:w-64 border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
            </div>

            {/* Schedule Grid */}
            <div className="mb-6 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border grid grid-cols-[100px_1fr_1fr_60px] gap-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <span>Hari</span>
                    <span>Mulai</span>
                    <span>Selesai</span>
                    <span>Aktif</span>
                </div>
                {schedule.map((day, idx) => (
                    <div
                        key={day.day_of_week}
                        className={`px-4 py-3 grid grid-cols-[100px_1fr_1fr_60px] gap-3 items-center border-b border-gray-100 dark:border-dark-border last:border-0 ${!day.is_active ? 'opacity-40' : ''}`}
                    >
                        <span className="text-sm font-medium text-gray-800 dark:text-white">{DAY_NAMES[day.day_of_week]}</span>
                        <input
                            type="time"
                            value={day.start_time}
                            disabled={!day.is_active}
                            onChange={e => updateDay(idx, 'start_time', e.target.value)}
                            className="border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                        />
                        <input
                            type="time"
                            value={day.end_time}
                            disabled={!day.is_active}
                            onChange={e => updateDay(idx, 'end_time', e.target.value)}
                            className="border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-center">
                            <button
                                onClick={() => updateDay(idx, 'is_active', !day.is_active)}
                                className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${day.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${day.is_active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Outside Hours Behavior */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Perilaku di Luar Jam Operasional</label>
                <div className="space-y-2">
                    {OUTSIDE_MODES.map(m => (
                        <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="outside_mode"
                                value={m.id}
                                checked={config.outside_mode === m.id}
                                onChange={() => setConfig(c => ({ ...c, outside_mode: m.id }))}
                                className="text-indigo-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300">{m.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {config.outside_mode === 'message' && (
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Pesan Offline</label>
                    <textarea
                        rows={4}
                        value={config.offline_message}
                        onChange={e => setConfig(c => ({ ...c, offline_message: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-dark-border rounded-xl px-4 py-3 text-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Contoh: Kami sedang tidak beroperasi..."
                    />
                </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Jam operasional digunakan untuk mengontrol respons otomatis chatbot. Mode <strong>AI tetap merespons</strong> akan mengabaikan jam operasional dan menggunakan AI sepanjang waktu.
                </p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
                {saving ? 'Menyimpan...' : 'Simpan Jam Operasional'}
            </button>
        </div>
    );
}
