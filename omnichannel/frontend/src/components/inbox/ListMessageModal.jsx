import React, { useState } from 'react';
import { X, Plus, Trash2, ListFilter, Send, HelpCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ListMessageModal({ isOpen, onClose, conversationId, onSent }) {
    const [title, setTitle] = useState('Pilihan Layanan');
    const [description, setDescription] = useState('Silakan pilih salah satu menu di bawah ini untuk dibantu oleh tim kami:');
    const [buttonText, setButtonText] = useState('Pilih Menu');
    const [sections, setSections] = useState([
        {
            title: 'Layanan Utama',
            rows: [
                { id: 'opt_1', title: 'Konsultasi Produk', description: 'Info fitur & paket langganan' },
                { id: 'opt_2', title: 'Kendala Teknis', description: 'Bantuan error & konfigurasi' },
                { id: 'opt_3', title: 'Billing & Invoice', description: 'Konfirmasi pembayaran & faktur' }
            ]
        }
    ]);
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const totalRows = sections.reduce((sum, sec) => sum + (sec.rows?.length || 0), 0);

    const handleAddRow = (sectionIndex) => {
        if (totalRows >= 10) {
            toast.error('Maksimal 10 opsi baris untuk pesan list WhatsApp');
            return;
        }
        const updated = [...sections];
        const newRowId = `opt_${Date.now()}`;
        updated[sectionIndex].rows.push({
            id: newRowId,
            title: '',
            description: ''
        });
        setSections(updated);
    };

    const handleRemoveRow = (sectionIndex, rowIndex) => {
        const updated = [...sections];
        updated[sectionIndex].rows.splice(rowIndex, 1);
        setSections(updated);
    };

    const handleRowChange = (sectionIndex, rowIndex, field, value) => {
        const updated = [...sections];
        updated[sectionIndex].rows[rowIndex][field] = value;
        setSections(updated);
    };

    const handleAddSection = () => {
        if (sections.length >= 3) {
            toast.error('Maksimal 3 kategori section');
            return;
        }
        setSections([...sections, { title: 'Kategori Tambahan', rows: [{ id: `opt_${Date.now()}`, title: '', description: '' }] }]);
    };

    const handleRemoveSection = (sectionIndex) => {
        if (sections.length <= 1) {
            toast.error('Minimal harus ada 1 kategori');
            return;
        }
        setSections(sections.filter((_, i) => i !== sectionIndex));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Judul pesan wajib diisi');
            return;
        }
        if (!buttonText.trim()) {
            toast.error('Teks tombol wajib diisi');
            return;
        }

        // Validate rows
        const cleanedSections = sections.map(sec => ({
            title: sec.title.trim() || 'Menu',
            rows: (sec.rows || []).filter(r => r.title.trim()).map((r, i) => ({
                id: r.id || `opt_${i + 1}`,
                title: r.title.trim().substring(0, 24),
                description: (r.description || '').trim().substring(0, 72)
            }))
        })).filter(sec => sec.rows.length > 0);

        if (cleanedSections.length === 0) {
            toast.error('Harap masukkan minimal 1 opsi pilihan');
            return;
        }

        setSending(true);
        const toastId = toast.loading('Mengirim pesan list interaktif...');
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`/api/app/inbox/conversations/${conversationId}/send-list`, {
                title: title.trim(),
                description: description.trim(),
                buttonText: buttonText.trim(),
                sections: cleanedSections
            }, { headers });

            toast.success('Pesan list berhasil dikirim!', { id: toastId });
            onSent?.();
            onClose();
        } catch (err) {
            console.error('[sendListMessage] Error:', err);
            toast.error(err.response?.data?.error || 'Gagal mengirim pesan list', { id: toastId });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                            <ListFilter className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Kirim WhatsApp List Message</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pesan interaktif dropdown pilihan menu / cabang</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Judul Pesan / Header <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={60}
                                placeholder="Contoh: Menu Layanan CRMHUB"
                                className="w-full text-xs px-3 py-2 border rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-[#202c33] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Deskripsi / Pesan Pengantar
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                maxLength={250}
                                placeholder="Tuliskan petunjuk pilihan kepada pelanggan..."
                                className="w-full text-xs px-3 py-2 border rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-[#202c33] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Teks Tombol Pembuka Menu <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={buttonText}
                                onChange={e => setButtonText(e.target.value)}
                                maxLength={20}
                                placeholder="Contoh: Pilih Layanan"
                                className="w-full text-xs px-3 py-2 border rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-[#202c33] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Sections & Rows */}
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                Daftar Pilihan ({totalRows}/10 Opsi)
                            </span>
                            {sections.length < 3 && (
                                <button
                                    type="button"
                                    onClick={handleAddSection}
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tambah Kategori
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {sections.map((sec, secIdx) => (
                                <div key={secIdx} className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-[#202c33]/60 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <input
                                            type="text"
                                            value={sec.title}
                                            onChange={e => {
                                                const updated = [...sections];
                                                updated[secIdx].title = e.target.value;
                                                setSections(updated);
                                            }}
                                            placeholder="Nama Kategori (Contoh: Layanan)"
                                            className="text-xs font-bold px-2 py-1 bg-white dark:bg-[#111b21] border border-gray-200 dark:border-slate-600 rounded flex-1 outline-none text-emerald-700 dark:text-emerald-400"
                                        />
                                        {sections.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSection(secIdx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Hapus Kategori"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Rows in this section */}
                                    <div className="space-y-2 pl-2 border-l-2 border-emerald-500/40">
                                        {sec.rows.map((row, rowIdx) => (
                                            <div key={rowIdx} className="flex items-center gap-2">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={row.title}
                                                        onChange={e => handleRowChange(secIdx, rowIdx, 'title', e.target.value)}
                                                        maxLength={24}
                                                        placeholder="Judul Opsi (maks 24 kar)"
                                                        className="text-xs px-2.5 py-1.5 border rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-[#111b21] text-gray-900 dark:text-white outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={row.description}
                                                        onChange={e => handleRowChange(secIdx, rowIdx, 'description', e.target.value)}
                                                        maxLength={72}
                                                        placeholder="Deskripsi singkat (opsional)"
                                                        className="text-xs px-2.5 py-1.5 border rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-[#111b21] text-gray-900 dark:text-white outline-none"
                                                    />
                                                </div>
                                                {sec.rows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(secIdx, rowIdx)}
                                                        className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {totalRows < 10 && (
                                            <button
                                                type="button"
                                                onClick={() => handleAddRow(secIdx)}
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-1 font-medium"
                                            >
                                                <Plus className="w-3 h-3" /> Tambah Opsi di Kategori Ini
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notice Info */}
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>
                            Pesan list akan muncul sebagai popup pilihan interaktif di WhatsApp pelanggan. Jika pelanggan menggunakan channel lain (Telegram/Instagram/Webchat), sistem otomatis mengonversinya menjadi daftar teks bernomor.
                        </span>
                    </div>

                    {/* Modal Footer */}
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={sending}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={sending}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Send className="w-3.5 h-3.5" />
                            {sending ? 'Mengirim...' : 'Kirim Pesan List'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
