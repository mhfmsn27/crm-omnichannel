import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    GitMerge, X, Search, ArrowRightLeft, AlertTriangle,
    CheckCircle2, User, Phone, Mail, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactMergeModal({
    isOpen,
    onClose,
    initialPrimaryContact = null,
    initialSecondaryContact = null,
    onSuccess
}) {
    const [primaryContact, setPrimaryContact] = useState(initialPrimaryContact);
    const [secondaryContact, setSecondaryContact] = useState(initialSecondaryContact);
    
    // Search states for picking contact
    const [searchingFor, setSearchingFor] = useState(null); // 'primary' | 'secondary' | null
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPrimaryContact(initialPrimaryContact);
            setSecondaryContact(initialSecondaryContact);
            setSearchingFor(null);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, initialPrimaryContact, initialSecondaryContact]);

    useEffect(() => {
        if (!searchingFor || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await axios.get(`/api/app/contacts?search=${encodeURIComponent(searchQuery.trim())}&limit=10`);
                // Backend might return array or { contacts: [...] }
                const items = Array.isArray(res.data) ? res.data : (res.data?.contacts || []);
                // Filter out whichever is already selected in the other slot
                const excludeId = searchingFor === 'primary' ? secondaryContact?.id : primaryContact?.id;
                setSearchResults(items.filter(c => c.id !== excludeId));
            } catch (err) {
                console.error("Failed to search contacts:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchingFor, primaryContact, secondaryContact]);

    if (!isOpen) return null;

    const handleSwap = () => {
        const temp = primaryContact;
        setPrimaryContact(secondaryContact);
        setSecondaryContact(temp);
    };

    const handleSelectContact = (contact) => {
        if (searchingFor === 'primary') {
            setPrimaryContact(contact);
        } else if (searchingFor === 'secondary') {
            setSecondaryContact(contact);
        }
        setSearchingFor(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleConfirmMerge = async () => {
        if (!primaryContact?.id || !secondaryContact?.id) {
            toast.error('Pilih kedua kontak (Utama dan Duplikat) terlebih dahulu');
            return;
        }
        if (primaryContact.id === secondaryContact.id) {
            toast.error('Kontak utama dan kontak duplikat tidak boleh sama');
            return;
        }

        const confirmMsg = `PERINGATAN: Anda akan menggabungkan "${secondaryContact.name || secondaryContact.phone_number}" ke dalam "${primaryContact.name || primaryContact.phone_number}".\n\nSemua riwayat chat, invoice, deals, dan tiket akan dipindahkan ke kontak utama, dan kontak duplikat akan dihapus secara permanen.\n\nLanjutkan?`;
        if (!window.confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/app/contacts/merge', {
                primaryContactId: primaryContact.id,
                secondaryContactId: secondaryContact.id
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Kontak berhasil digabungkan!');
                if (onSuccess) onSuccess(res.data);
                onClose();
            } else {
                toast.error(res.data?.error || 'Gagal menggabungkan kontak');
            }
        } catch (err) {
            console.error("Merge error:", err);
            toast.error(err.response?.data?.error || 'Gagal menggabungkan kontak');
        } finally {
            setIsSubmitting(false);
        }
    };

    const cleanPhone = (num) => (num || '').replace('@s.whatsapp.net', '').replace('@c.us', '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                            <GitMerge className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">Smart Contact Merge</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Gabungkan kontak duplikat dan satukan semua riwayat chat & transaksi</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    
                    {/* Visual Merge Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                        
                        {/* Primary Slot (Survives) */}
                        <div className="border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl p-4 flex flex-col justify-between relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Kontak Utama (Tetap Ada)
                                </span>
                                {primaryContact && (
                                    <button
                                        onClick={() => setPrimaryContact(null)}
                                        className="text-[11px] text-gray-400 hover:text-red-500 underline"
                                    >
                                        Ganti
                                    </button>
                                )}
                            </div>

                            {primaryContact ? (
                                <div className="space-y-1.5 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                                            {primaryContact.name ? primaryContact.name.charAt(0).toUpperCase() : '#'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                {primaryContact.name || 'Tanpa Nama'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {cleanPhone(primaryContact.phone_number)}
                                            </p>
                                        </div>
                                    </div>
                                    {primaryContact.email && (
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                                            <Mail className="w-3 h-3" /> {primaryContact.email}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setSearchingFor('primary'); setSearchQuery(''); }}
                                    className="my-3 py-4 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Search className="w-4 h-4" /> Pilih Kontak Utama
                                </button>
                            )}

                            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-2">
                                Semua chat, invoice, deals, dan tiket akan digabungkan ke profil ini.
                            </p>
                        </div>

                        {/* Secondary Slot (Duplicate / Deleted) */}
                        <div className="border-2 border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 rounded-xl p-4 flex flex-col justify-between relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Kontak Duplikat (Dihapus)
                                </span>
                                {secondaryContact && (
                                    <button
                                        onClick={() => setSecondaryContact(null)}
                                        className="text-[11px] text-gray-400 hover:text-red-500 underline"
                                    >
                                        Ganti
                                    </button>
                                )}
                            </div>

                            {secondaryContact ? (
                                <div className="space-y-1.5 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                                            {secondaryContact.name ? secondaryContact.name.charAt(0).toUpperCase() : '#'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                {secondaryContact.name || 'Tanpa Nama'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {cleanPhone(secondaryContact.phone_number)}
                                            </p>
                                        </div>
                                    </div>
                                    {secondaryContact.email && (
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                                            <Mail className="w-3 h-3" /> {secondaryContact.email}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setSearchingFor('secondary'); setSearchQuery(''); }}
                                    className="my-3 py-4 border-2 border-dashed border-amber-300 dark:border-amber-700/50 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Search className="w-4 h-4" /> Pilih Kontak Duplikat
                                </button>
                            )}

                            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-2">
                                Kontak ini akan dilebur ke Kontak Utama kemudian dihapus.
                            </p>
                        </div>
                    </div>

                    {/* Quick Swap Button */}
                    {primaryContact && secondaryContact && (
                        <div className="flex justify-center -my-2">
                            <button
                                onClick={handleSwap}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 transition-colors shadow-sm"
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Tukar Posisi Utama ↔ Duplikat
                            </button>
                        </div>
                    )}

                    {/* Inline Contact Search Panel */}
                    {searchingFor && (
                        <div className="border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                    Cari untuk: {searchingFor === 'primary' ? 'Kontak Utama' : 'Kontak Duplikat'}
                                </span>
                                <button
                                    onClick={() => setSearchingFor(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    Batal
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Ketik nama atau nomor telepon (min 2 karakter)..."
                                    autoFocus
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-border">
                                {isSearching ? (
                                    <div className="py-4 flex justify-center text-indigo-500">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => handleSelectContact(c)}
                                            className="p-2 hover:bg-white dark:hover:bg-dark-surface rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                                                    {c.name ? c.name.charAt(0).toUpperCase() : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{c.name || 'Tanpa Nama'}</p>
                                                    <p className="text-[11px] text-gray-400 font-mono">{cleanPhone(c.phone_number)}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Pilih</span>
                                        </div>
                                    ))
                                ) : searchQuery.trim().length >= 2 ? (
                                    <p className="text-xs text-gray-400 text-center py-3">Tidak ada kontak ditemukan</p>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-2">Ketik nama atau nomor untuk mencari kontak</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Merge Summary Checklist */}
                    <div className="bg-gray-50 dark:bg-dark-bg/60 border border-gray-100 dark:border-dark-border rounded-xl p-4 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                        <p className="font-bold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Yang akan terjadi saat penggabungan:
                        </p>
                        <ul className="space-y-1.5 list-disc list-inside text-gray-500 dark:text-gray-400">
                            <li><strong>Percakapan / Chat:</strong> Seluruh riwayat pesan dipindahkan ke kontak utama tanpa ada yang hilang.</li>
                            <li><strong>Invoice & Deals:</strong> Semua invoice dan pipeline deal otomatis dialihkan ke kontak utama.</li>
                            <li><strong>Tiket & Tugas:</strong> Seluruh riwayat support ticket & task dipusatkan di kontak utama.</li>
                            <li><strong>Label & Biodata:</strong> Label dan data profil yang kosong pada kontak utama akan dilengkapi dari duplikat.</li>
                        </ul>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-dark-bg/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmMerge}
                        disabled={isSubmitting || !primaryContact || !secondaryContact}
                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Menggabungkan...
                            </>
                        ) : (
                            <>
                                <GitMerge className="w-4 h-4" /> Gabungkan Sekarang
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
