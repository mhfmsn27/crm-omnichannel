import React, { useState, useEffect } from 'react';
import { X, FormInput, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

/**
 * WAFlowModal - Send WhatsApp Flow form
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.conversationId - Conversation ID
 */
export default function WAFlowModal({ isOpen, onClose, conversationId }) {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState(null);
    const [bodyText, setBodyText] = useState('');
    const [headerText, setHeaderText] = useState('');
    const [ctaText, setCtaText] = useState('Buka Form');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !conversationId) return;
        setLoading(true);
        setError('');
        setFlows([]);
        setSelectedFlow(null);
        setBodyText('');
        setHeaderText('');
        setCtaText('Buka Form');

        axios.get(`/api/app/inbox/conversations/${conversationId}/wa-flows`)
            .then(r => setFlows(r.data))
            .catch(e => setError(e.response?.data?.error || 'Gagal memuat WA Flows'))
            .finally(() => setLoading(false));
    }, [isOpen, conversationId]);

    const handleSend = async () => {
        if (!selectedFlow || !bodyText.trim()) {
            toast.error('Pilih form dan isi pesan terlebih dahulu');
            return;
        }
        setSending(true);
        try {
            await axios.post(`/api/app/inbox/conversations/${conversationId}/send-flow`, {
                flow_id: selectedFlow.id,
                body_text: bodyText.trim(),
                header_text: headerText.trim() || undefined,
                flow_cta: ctaText.trim() || 'Buka Form',
            });
            toast.success('WA Form berhasil dikirim!');
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Gagal mengirim WA Form');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="absolute bottom-[68px] left-2 bg-white dark:bg-dark-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-dark-border p-4 z-50 w-80 animate-in fade-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FormInput className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Kirim WA Form</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300 mb-3">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-3">
                    {flows.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-3">
                            Tidak ada WA Flow yang dipublish. Buat dan publish flow di Meta Business Manager terlebih dahulu.
                        </p>
                    ) : (
                        <>
                            {/* Flow Selector */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                    Pilih Form
                                </label>
                                <select
                                    value={selectedFlow?.id || ''}
                                    onChange={e => setSelectedFlow(flows.find(f => f.id === e.target.value) || null)}
                                    className="input"
                                >
                                    <option value="">-- Pilih Form --</option>
                                    {flows.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Body Text */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                    Pesan (Body)
                                </label>
                                <textarea
                                    value={bodyText}
                                    onChange={e => setBodyText(e.target.value)}
                                    placeholder="cth: Mohon lengkapi form berikut..."
                                    rows={2}
                                    className="input resize-none"
                                />
                            </div>

                            {/* Header & CTA */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                        Header (opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={headerText}
                                        onChange={e => setHeaderText(e.target.value)}
                                        placeholder="Judul form"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                        Teks Tombol
                                    </label>
                                    <input
                                        type="text"
                                        value={ctaText}
                                        onChange={e => setCtaText(e.target.value)}
                                        placeholder="Buka Form"
                                        className="input"
                                    />
                                </div>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={sending || !selectedFlow || !bodyText.trim()}
                                className="w-full btn bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FormInput className="w-4 h-4" />
                                )}
                                Kirim WA Form
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
