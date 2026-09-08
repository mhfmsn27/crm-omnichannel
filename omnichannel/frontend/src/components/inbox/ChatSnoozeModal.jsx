import React, { useState } from 'react';
import { X, Clock, Bell, BellOff, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { addHours, setHours, setMinutes, addDays, isPast, format } from 'date-fns';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ChatSnoozeModal({
    isOpen,
    onClose,
    conversation,
    onSnoozeUpdated,
    onSuccess
}) {
    const [selectedPreset, setSelectedPreset] = useState('1h');
    const [customDateTime, setCustomDateTime] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !conversation) return null;

    const isCurrentlySnoozed = Boolean(conversation.snoozed_until && !isPast(new Date(conversation.snoozed_until)));

    const getPresetDate = (type) => {
        const now = new Date();
        if (type === '1h') return addHours(now, 1);
        if (type === '3h') return addHours(now, 3);
        if (type === 'evening') {
            const evening = setMinutes(setHours(now, 17), 0);
            return isPast(evening) ? setMinutes(setHours(addDays(now, 1), 17), 0) : evening;
        }
        if (type === 'tomorrow') {
            return setMinutes(setHours(addDays(now, 1), 9), 0);
        }
        return null;
    };

    const handleSnooze = async () => {
        let targetDate = null;
        if (selectedPreset === 'custom') {
            if (!customDateTime) {
                toast.error('Pilih tanggal dan waktu tunda kustom');
                return;
            }
            targetDate = new Date(customDateTime);
            if (isPast(targetDate)) {
                toast.error('Waktu tunda harus di masa mendatang');
                return;
            }
        } else {
            targetDate = getPresetDate(selectedPreset);
        }

        if (!targetDate) {
            toast.error('Waktu tunda tidak valid');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${conversation.id}/snooze`, {
                snoozed_until: targetDate.toISOString(),
                reason: reason.trim() || 'Follow-up pelanggan'
            });

            toast.success(`Obrolan ditunda hingga ${format(targetDate, 'dd/MM/yyyy HH:mm')}`);
            if (onSnoozeUpdated) onSnoozeUpdated(res.data.conversation);
            if (onSuccess) onSuccess(res.data?.conversation?.snoozed_until, res.data?.conversation);
            onClose();
        } catch (err) {
            console.error('Snooze error:', err);
            toast.error(err.response?.data?.error || 'Gagal menunda obrolan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelSnooze = async () => {
        setSubmitting(true);
        try {
            await axios.delete(`/api/app/inbox/conversations/${conversation.id}/snooze`);
            toast.success('Penundaan obrolan dibatalkan');
            const canceledPayload = { id: conversation.id, snoozed_until: null, snooze_reason: null };
            if (onSnoozeUpdated) onSnoozeUpdated(canceledPayload);
            if (onSuccess) onSuccess(null, canceledPayload);
            onClose();
        } catch (err) {
            toast.error('Gagal membatalkan penundaan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-bold">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Tunda & Ingatkan Chat</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Setel alarm tindak lanjut obrolan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Active Snooze Notice */}
                {isCurrentlySnoozed && (
                    <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
                        <div className="text-xs text-amber-800 dark:text-amber-300">
                            <span className="font-bold block">Sedang Ditunda:</span>
                            <span>{format(new Date(conversation.snoozed_until), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelSnooze}
                            disabled={submitting}
                            className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 underline"
                        >
                            Batalkan Tunda
                        </button>
                    </div>
                )}

                {/* Presets List */}
                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Pilih Waktu Tunda
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: '1h', label: '1 Jam Lagi', desc: '+1 jam dari sekarang' },
                                { id: '3h', label: '3 Jam Lagi', desc: '+3 jam dari sekarang' },
                                { id: 'evening', label: 'Sore Ini', desc: 'Pukul 17:00 WIB' },
                                { id: 'tomorrow', label: 'Besok Pagi', desc: 'Pukul 09:00 WIB' },
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setSelectedPreset(preset.id)}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        selectedPreset === preset.id
                                            ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className="text-xs font-bold">{preset.label}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-gray-400">{preset.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Custom Option */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setSelectedPreset('custom')}
                                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                                    selectedPreset === 'custom'
                                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span className="text-xs font-bold">Kustom Tanggal & Waktu</span>
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            {selectedPreset === 'custom' && (
                                <div className="mt-2 animate-in fade-in duration-150">
                                    <input
                                        type="datetime-local"
                                        value={customDateTime}
                                        onChange={e => setCustomDateTime(e.target.value)}
                                        className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reason input */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Catatan Pengingat (Opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="cth: Tunggu transfer, Konfirmasi resi..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-amber-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50/80 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSnooze}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Simpan Alarm</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
