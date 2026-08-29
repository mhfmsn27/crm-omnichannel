import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Flame, Plus, Trash2, BarChart2, Lock, Crown, ArrowRight, 
    RotateCcw, Users, BookOpen, Clock, Moon, Sun, ShieldCheck, 
    Settings, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import WarmerReportModal from '../components/warmer/WarmerReportModal';
import Modal, { ModalFooter } from '../components/common/Modal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';

// --- COMPONENT: Circle Card ---
const CircleCard = ({ circle, onToggle, onDelete, onOpenReport, onReset, onEdit }) => {
    const startHour = String(circle.active_hours_start ?? 8).padStart(2, '0');
    const endHour = String(circle.active_hours_end ?? 21).padStart(2, '0');
    const isHumanHoursActive = circle.enable_active_hours !== false;

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-5 flex flex-col relative transition-all duration-200 ${
            circle.is_active 
                ? 'border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-100 dark:ring-indigo-900/30' 
                : 'border-gray-200 dark:border-slate-800'
        }`}>
            {/* Header: Title & Switch */}
            <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 pr-3">
                    <h3 className="font-black text-gray-900 dark:text-white text-base truncate">{circle.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                            <Users className="w-3 h-3 text-indigo-500" /> {circle.device_count} Device
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium capitalize">
                            <BookOpen className="w-3 h-3 text-sky-500" /> {circle.dictionary_mode === 'ai_persona' ? 'AI Persona' : circle.dictionary_mode}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onToggle(circle)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${circle.is_active ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${circle.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {/* Active Schedule Status Banner */}
            <div className="mb-4">
                {circle.is_active ? (
                    circle.is_in_active_hours ? (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-bold truncate">Jam Aktif ({startHour}:00 - {endHour}:00 WIB)</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
                            <Moon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-semibold truncate">
                                Istirahat Malam ({circle.next_schedule_desc || `Mulai ${startHour}:00 WIB`})
                            </span>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Nonaktif ({isHumanHoursActive ? `${startHour}:00 - ${endHour}:00 WIB` : '24 Jam'})</span>
                    </div>
                )}
            </div>

            {/* Metrics Stats Grid */}
            <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-xl bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800/80 mb-4 text-center">
                <div>
                    <span className="block font-black text-indigo-600 dark:text-indigo-400 text-sm">{circle.interval_min}-{circle.interval_max}s</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400">Jeda Acak</span>
                </div>
                <div className="border-x border-gray-200 dark:border-slate-700/60">
                    <span className="block font-black text-indigo-600 dark:text-indigo-400 text-sm">{circle.daily_limit_per_device}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400">Batas/Hari</span>
                </div>
                <div>
                    <span className="block font-black text-emerald-600 dark:text-emerald-400 text-sm">{circle.total_sent_today || 0}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400">Hari Ini</span>
                </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <button 
                    onClick={() => onOpenReport(circle.id)} 
                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold flex-1 justify-center border border-indigo-100 dark:border-indigo-900/50"
                >
                    <BarChart2 className="w-3.5 h-3.5" /> Laporan
                </button>
                <button
                    onClick={() => onEdit(circle)}
                    className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 text-xs border border-gray-200 dark:border-slate-700"
                    title="Pengaturan Jam & Limit"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onReset(circle)}
                    className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50 rounded-xl transition-colors flex items-center gap-1 text-xs border border-orange-100 dark:border-orange-900/50"
                    title="Reset Counter Hari Ini"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => onDelete(circle.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors flex items-center gap-1 text-xs"
                    title="Hapus Circle"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: Create / Edit Modal ---
const WarmerCircleModal = ({ isOpen, onClose, initialData, devices, systemPreview, onSubmit }) => {
    const isEdit = Boolean(initialData?.id);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: '',
        session_ids: [],
        interval_min: 60,
        interval_max: 300,
        daily_limit_per_device: 50,
        dictionary_mode: 'ai_persona',
        persona_topic: 'auto',
        custom_dictionary_text: '',
        active_hours_start: 8,
        active_hours_end: 21,
        enable_active_hours: true
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                session_ids: initialData.session_ids || [],
                interval_min: initialData.interval_min || 60,
                interval_max: initialData.interval_max || 300,
                daily_limit_per_device: initialData.daily_limit_per_device || 50,
                dictionary_mode: initialData.dictionary_mode || 'ai_persona',
                persona_topic: initialData.persona_topic || 'auto',
                custom_dictionary_text: Array.isArray(initialData.custom_dictionary) ? initialData.custom_dictionary.join('\n') : '',
                active_hours_start: initialData.active_hours_start ?? 8,
                active_hours_end: initialData.active_hours_end ?? 21,
                enable_active_hours: initialData.enable_active_hours !== false
            });
        } else {
            setForm({
                name: '',
                session_ids: [],
                interval_min: 60,
                interval_max: 300,
                daily_limit_per_device: 50,
                dictionary_mode: 'ai_persona',
                persona_topic: 'auto',
                custom_dictionary_text: '',
                active_hours_start: 8,
                active_hours_end: 21,
                enable_active_hours: true
            });
        }
        setStep(1);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const toggleDevice = (id) => {
        setForm(prev => {
            const exists = prev.session_ids.includes(id);
            if (exists) return { ...prev, session_ids: prev.session_ids.filter(x => x !== id) };
            return { ...prev, session_ids: [...prev.session_ids, id] };
        });
    };

    const applySchedulePreset = (start, end) => {
        setForm(prev => ({
            ...prev,
            active_hours_start: start,
            active_hours_end: end,
            enable_active_hours: true
        }));
    };

    const handleSubmit = () => {
        const payload = { ...form };
        if (payload.dictionary_mode === 'custom') {
            payload.custom_dictionary = payload.custom_dictionary_text.split('\n').filter(line => line.trim() !== '');
            if (payload.custom_dictionary.length === 0) return toast.error("Silakan masukkan teks pesan kustom.");
        }
        if (!isEdit && payload.session_ids.length < 2) {
            return toast.error("Pilih minimal 2 perangkat WhatsApp untuk circle pemanasan.");
        }

        onSubmit(payload);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="2xl"
            title={
                <div className="flex justify-between items-center w-full pr-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                            {isEdit ? 'Pengaturan Warmer Circle' : 'Buat Warmer Circle Baru'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Langkah {step} dari 2 — Konfigurasi Jadwal & Perangkat</p>
                    </div>
                    {step > 1 && (
                        <button onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Kembali ke Langkah 1
                        </button>
                    )}
                </div>
            }
            footer={
                <ModalFooter className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <Button variant="outline" onClick={onClose} fullWidth className="sm:w-auto">Batal</Button>
                    {step === 1 ? (
                        <Button 
                            onClick={() => setStep(2)} 
                            disabled={!form.name || (!isEdit && form.session_ids.length < 2)} 
                            fullWidth 
                            className="sm:w-auto !bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                        >
                            Lanjut: Persona Percakapan ➔
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubmit} 
                            fullWidth 
                            className="sm:w-auto !bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                        >
                            {isEdit ? 'Simpan Perubahan' : 'Mulai Warmer Circle'}
                        </Button>
                    )}
                </ModalFooter>
            }
        >
            <div className="space-y-5">
                {step === 1 && (
                    <>
                        {/* Circle Name */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                Nama Circle Warmer
                            </label>
                            <input
                                className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                placeholder="Contoh: Circle Nomor CS Baru / Warm-up Team A"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Select Devices (Only shown during creation) */}
                        {!isEdit && (
                            <div>
                                <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Pilih Perangkat WhatsApp (Minimal 2 Perangkat)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {devices.map(d => {
                                        const isSelected = form.session_ids.includes(d.id);
                                        return (
                                            <div
                                                key={d.id}
                                                onClick={() => toggleDevice(d.id)}
                                                className={`p-3 border rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                                                    isSelected 
                                                        ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-950/40' 
                                                        : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {d.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{d.name}</p>
                                                        <p className="text-[11px] text-gray-500 dark:text-slate-400">{d.whatsapp_number}</p>
                                                    </div>
                                                </div>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                                            </div>
                                        );
                                    })}
                                    {devices.length === 0 && (
                                        <p className="text-xs text-gray-400 col-span-1 sm:col-span-2 text-center py-4">
                                            Tidak ada perangkat WhatsApp yang terhubung.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Jam Operasional Percakapan (Human Active Hours) */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-sky-50/50 dark:from-slate-800/90 dark:to-slate-850 border border-indigo-100 dark:border-slate-700 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                                            Jam Operasional Chat Harian (WIB)
                                        </h4>
                                        <p className="text-[11px] text-gray-600 dark:text-slate-400">
                                            Mencegah interaksi di jam tidur/dini hari agar pola chat 100% alami bagi WhatsApp.
                                        </p>
                                    </div>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={form.enable_active_hours} 
                                        onChange={e => setForm({ ...form, enable_active_hours: e.target.checked })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span className="ml-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">Aktif</span>
                                </label>
                            </div>

                            {form.enable_active_hours && (
                                <>
                                    {/* Quick Preset Buttons */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset(8, 21)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                form.active_hours_start === 8 && form.active_hours_end === 21
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Sun className="w-3 h-3 text-amber-500" /> ☀️ Normal (08:00 - 21:00)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset(9, 18)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                form.active_hours_start === 9 && form.active_hours_end === 18
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            🏢 Kantor (09:00 - 18:00)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset(7, 22)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                form.active_hours_start === 7 && form.active_hours_end === 22
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            🌙 Fleksibel (07:00 - 22:00)
                                        </button>
                                    </div>

                                    {/* Hours Selector Dropdowns */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                                                Jam Mulai Pagi
                                            </label>
                                            <select
                                                value={form.active_hours_start}
                                                onChange={e => setForm({ ...form, active_hours_start: parseInt(e.target.value, 10) })}
                                                className="w-full border p-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                            >
                                                {[...Array(24).keys()].map(h => (
                                                    <option key={h} value={h}>
                                                        {String(h).padStart(2, '0')}:00 WIB {h >= 6 && h <= 11 ? '(Pagi)' : h >= 12 && h <= 14 ? '(Siang)' : h >= 15 && h <= 18 ? '(Sore)' : '(Malam/Dini Hari)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                                                Jam Berhenti Malam
                                            </label>
                                            <select
                                                value={form.active_hours_end}
                                                onChange={e => setForm({ ...form, active_hours_end: parseInt(e.target.value, 10) })}
                                                className="w-full border p-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                            >
                                                {[...Array(24).keys()].map(h => (
                                                    <option key={h} value={h}>
                                                        {String(h).padStart(2, '0')}:00 WIB {h >= 18 && h <= 23 ? '(Malam)' : h <= 5 ? '(Dini Hari)' : '(Siang/Sore)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Interval & Daily Limit Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Jeda Waktu Acak (Detik)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-center text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" 
                                        value={form.interval_min} 
                                        onChange={e => setForm({ ...form, interval_min: Math.max(10, parseInt(e.target.value) || 60) })} 
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-center text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" 
                                        value={form.interval_max} 
                                        onChange={e => setForm({ ...form, interval_max: Math.max(form.interval_min, parseInt(e.target.value) || 300) })} 
                                    />
                                </div>
                                <span className="text-[10px] text-gray-500 mt-1 block">Rekomendasi: 60 - 300 detik (1-5 menit)</span>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Batas Pesan Harian / Device
                                </label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" 
                                    value={form.daily_limit_per_device} 
                                    onChange={e => setForm({ ...form, daily_limit_per_device: Math.max(1, parseInt(e.target.value) || 50) })} 
                                />
                                <span className="text-[10px] text-gray-500 mt-1 block">Rekomendasi nomor baru: 30 - 50 pesan/hari</span>
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                Mode Persona Percakapan
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${form.dictionary_mode === 'ai_persona' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 dark:bg-indigo-950/40' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="dict" checked={form.dictionary_mode === 'ai_persona'} onChange={() => setForm({ ...form, dictionary_mode: 'ai_persona' })} className="hidden" />
                                    <span className="font-black text-xs text-gray-900 dark:text-white block mb-1">✨ AI Persona (Organik)</span>
                                    <span className="text-[11px] text-gray-500 dark:text-slate-400 block leading-tight">Percakapan mengalir alami layaknya 2 teman mengobrol.</span>
                                </label>

                                <label className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${form.dictionary_mode === 'system' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 dark:bg-indigo-950/40' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="dict" checked={form.dictionary_mode === 'system'} onChange={() => setForm({ ...form, dictionary_mode: 'system' })} className="hidden" />
                                    <span className="font-black text-xs text-gray-900 dark:text-white block mb-1">📚 System Database</span>
                                    <span className="text-[11px] text-gray-500 dark:text-slate-400 block leading-tight">Database pesan bawaan sistem yang telah dikurasi.</span>
                                </label>

                                <label className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${form.dictionary_mode === 'custom' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 dark:bg-indigo-950/40' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="dict" checked={form.dictionary_mode === 'custom'} onChange={() => setForm({ ...form, dictionary_mode: 'custom' })} className="hidden" />
                                    <span className="font-black text-xs text-gray-900 dark:text-white block mb-1">✍️ Kustom Manual</span>
                                    <span className="text-[11px] text-gray-500 dark:text-slate-400 block leading-tight">Masukkan daftar kalimat buatan Anda sendiri.</span>
                                </label>
                            </div>
                        </div>

                        {form.dictionary_mode === 'ai_persona' && (
                            <div className="p-4 bg-indigo-50/70 dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-2">
                                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300">
                                    Topik Persona AI Pemanasan Nomor
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                    AI akan menyusun variasi kalimat casual bahasa Indonesia (topik pekerjaan, kuliner, liburan, kabar, cuaca) sehingga riwayat chat nomor tampak 100% aktif dan manusiawi.
                                </p>
                            </div>
                        )}

                        {form.dictionary_mode === 'system' && (
                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
                                <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 mb-2">Pratinjau Contoh Pesan:</h4>
                                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-slate-400 space-y-1">
                                    {systemPreview.slice(0, 4).map((msg, i) => <li key={i}>"{msg}"</li>)}
                                    <li>...dan ratusan variasi percakapan lainnya.</li>
                                </ul>
                            </div>
                        )}

                        {form.dictionary_mode === 'custom' && (
                            <div>
                                <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Daftar Kalimat Kustom (Satu kalimat per baris)
                                </label>
                                <textarea
                                    className="w-full border p-3 rounded-2xl h-36 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="Halo gan, apakah produk ready?&#10;Ready kak, silakan diorder ya.&#10;Oke siap kak, terima kasih banyak ya!"
                                    value={form.custom_dictionary_text}
                                    onChange={e => setForm({ ...form, custom_dictionary_text: e.target.value })}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default function WarmerPage() {
    const [circles, setCircles] = useState([]);
    const [devices, setDevices] = useState([]);
    const [systemPreview, setSystemPreview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCircleForEdit, setSelectedCircleForEdit] = useState(null);
    const [selectedCircleId, setSelectedCircleId] = useState(null);
    const [stats, setStats] = useState({ locked: false });
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, 10000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/app/warmer');
            setCircles(res.data.circles || []);
            setDevices((res.data.available_devices || []).filter(d => d.type !== 'official' && d.channel !== 'wa_coex'));
            setSystemPreview(res.data.system_preview || []);
            if (res.data.stats) setStats(res.data.stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (data) => {
        try {
            if (selectedCircleForEdit?.id) {
                await axios.put(`/api/app/warmer/${selectedCircleForEdit.id}`, data);
                toast.success("Pengaturan Warmer Circle berhasil diperbarui");
            } else {
                await axios.post('/api/app/warmer', data);
                toast.success("Warmer Circle berhasil dibuat & dijadwalkan");
            }
            setIsModalOpen(false);
            setSelectedCircleForEdit(null);
            fetchData();
        } catch (err) {
            toast.error("Gagal: " + (err.response?.data?.error || err.message));
        }
    };

    const handleToggle = async (circle) => {
        try {
            await axios.patch(`/api/app/warmer/${circle.id}/toggle`, { is_active: !circle.is_active });
            fetchData();
        } catch (err) { toast.error("Gagal mengubah status circle"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Apakah Anda yakin ingin menghapus circle ini?")) return;
        try {
            await axios.delete(`/api/app/warmer/${id}`);
            fetchData();
            toast.success("Circle berhasil dihapus");
        } catch (err) { toast.error("Gagal menghapus circle"); }
    };

    const handleReset = async (circle) => {
        if (!confirm(`Reset counter pesan untuk "${circle.name}"? Ini akan mengatur Terkirim Hari Ini kembali ke 0.`)) return;
        try {
            await axios.post(`/api/app/warmer/${circle.id}/reset`);
            toast.success(`Counter untuk "${circle.name}" berhasil di-reset`);
            fetchData();
        } catch (err) {
            toast.error("Gagal reset: " + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenReport = (id) => {
        setSelectedCircleId(id);
    };

    const handleOpenEdit = (circle) => {
        setSelectedCircleForEdit(circle);
        setIsModalOpen(true);
    };

    const isLocked = false;

    if (loading && circles.length === 0) return <div className="p-8 text-center text-sm font-bold text-gray-500">Memuat data Warmer Circles...</div>;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="p-2 bg-orange-500 text-white rounded-2xl shadow-md">
                            <Flame className="w-6 h-6" />
                        </div>
                        WhatsApp Number Warmer
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                        Pemanasan nomor WhatsApp multi-perangkat otomatis dengan <b>jam aktif manusia normal (08:00 - 21:00 WIB)</b> untuk reputasi nomor yang aman & anti-banned.
                    </p>
                </div>
                {!isLocked && (
                    <div className="flex gap-2">
                        <Button 
                            onClick={fetchData} 
                            variant="secondary" 
                            iconOnly
                            title="Segarkan Data"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button 
                            onClick={() => {
                                setSelectedCircleForEdit(null);
                                setIsModalOpen(true);
                            }}
                            leftIcon={<Plus className="w-4 h-4" />}
                            className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold border-none shadow-md"
                        >
                            Buat Circle Baru
                        </Button>
                    </div>
                )}
            </div>

            {/* Information Alert Badge */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-gray-700 dark:text-slate-300">
                    <span className="font-black text-indigo-900 dark:text-indigo-300">Proteksi Jam Aktif Alami: </span>
                    Sistem otomatis menghentikan interaksi di malam/dini hari (00:00 - 07:59 WIB) dan hanya berinteraksi pada jam aktif yang Anda tentukan agar akun WhatsApp tidak terdeteksi sebagai spam bot.
                </div>
            </div>

            {/* Content List / Empty State */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : circles.length === 0 && !isLocked ? (
                <EmptyState
                    title="Belum Ada Warmer Circle"
                    description="Buat circle pemanasan dengan minimal 2 nomor WhatsApp yang terhubung untuk meningkatkan reputasi nomor secara otomatis dan alami."
                    icon="plus"
                    action={{
                        label: 'Buat Circle Baru',
                        onClick: () => {
                            setSelectedCircleForEdit(null);
                            setIsModalOpen(true);
                        },
                        icon: Plus
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {circles.map(c => (
                        <CircleCard
                            key={c.id}
                            circle={c}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onOpenReport={handleOpenReport}
                            onReset={handleReset}
                            onEdit={handleOpenEdit}
                        />
                    ))}
                </div>
            )}

            {/* Create / Edit Circle Modal */}
            <WarmerCircleModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCircleForEdit(null);
                }}
                initialData={selectedCircleForEdit}
                devices={devices}
                systemPreview={systemPreview}
                onSubmit={handleCreateOrUpdate}
            />

            {/* Analytics Report Modal */}
            {selectedCircleId && (
                <WarmerReportModal
                    isOpen={true}
                    circleId={selectedCircleId}
                    onClose={() => setSelectedCircleId(null)}
                />
            )}
        </div>
    );
}
