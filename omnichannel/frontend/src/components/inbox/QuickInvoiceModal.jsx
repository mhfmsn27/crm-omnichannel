import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, Package, Receipt, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function QuickInvoiceModal({
    isOpen,
    onClose,
    conversationId,
    contactId,
    contactName,
    onSendInvoiceMessage
}) {
    const [loadingAi, setLoadingAi] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState([]);
    const [showCatalogPicker, setShowCatalogPicker] = useState(false);

    const [items, setItems] = useState([
        { description: '', quantity: 1, unit_price: 0, amount: 0 }
    ]);
    const [taxPercentage, setTaxPercentage] = useState(0);
    const [notes, setNotes] = useState('');
    const [dueDays, setDueDays] = useState(3);

    // Fetch catalog products when modal opens
    useEffect(() => {
        if (isOpen) {
            axios.get('/api/app/billing/products')
                .then(res => {
                    const prods = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    setProducts(prods);
                })
                .catch(() => {
                    setProducts([]);
                });
        } else {
            // Reset form
            setItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
            setTaxPercentage(0);
            setNotes('');
            setDueDays(3);
            setShowCatalogPicker(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Calculate subtotal
    const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const taxAmount = Math.round((subtotal * (parseFloat(taxPercentage) || 0)) / 100);
    const totalAmount = subtotal + taxAmount;

    // Update specific item field
    const updateItem = (index, field, value) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        
        if (field === 'quantity' || field === 'unit_price') {
            const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
            const price = parseFloat(field === 'unit_price' ? value : item.unit_price) || 0;
            item.amount = Math.round(qty * price);
        }
        
        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) {
            setItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const addFromCatalog = (product) => {
        const price = parseFloat(product.price) || 0;
        setItems(prev => [
            ...prev.filter(it => it.description.trim() !== '' || it.amount > 0),
            {
                description: product.name,
                quantity: 1,
                unit_price: price,
                amount: price
            }
        ]);
        setShowCatalogPicker(false);
        toast.success(`"${product.name}" ditambahkan`);
    };

    // AI Auto-Draft Generator
    const handleAiGenerate = async () => {
        if (!conversationId) {
            toast.error('Conversation ID tidak valid');
            return;
        }

        setLoadingAi(true);
        try {
            const res = await axios.post('/api/app/billing/invoices/generate-from-chat', {
                conversation_id: conversationId
            });

            const data = res.data;
            if (data?.items && data.items.length > 0) {
                setItems(data.items.map(it => ({
                    description: it.description || '',
                    quantity: parseInt(it.quantity) || 1,
                    unit_price: parseFloat(it.unit_price) || 0,
                    amount: (parseInt(it.quantity) || 1) * (parseFloat(it.unit_price) || 0)
                })));
                if (data.notes) setNotes(data.notes);
                if (data.suggested_due_days) setDueDays(data.suggested_due_days);
                toast.success('Draft invoice berhasil diekstrak otomatis dari percakapan!');
            } else {
                toast('AI tidak mendeteksi detail produk/harga pada chat terakhir.', { icon: 'ℹ️' });
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal generate draft AI');
        } finally {
            setLoadingAi(false);
        }
    };

    // Submit invoice and send in chat
    const handleSubmit = async (e) => {
        e.preventDefault();
        const validItems = items.filter(it => it.description.trim() !== '' && it.amount > 0);
        if (validItems.length === 0) {
            toast.error('Masukkan minimal 1 produk/layanan dengan harga valid');
            return;
        }

        if (!contactId) {
            toast.error('Kontak pelanggan tidak valid');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                draft: {
                    contact_id: contactId,
                    items: validItems,
                    subtotal,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    notes: notes.trim(),
                    suggested_due_days: parseInt(dueDays) || 3,
                    conversation_id: conversationId
                }
            };

            const res = await axios.post('/api/app/billing/invoices/create-from-draft', payload);
            const inv = res.data;

            // Format message for WhatsApp / Chat
            const itemsListText = validItems
                .map(it => `• ${it.quantity}x ${it.description} - Rp ${parseInt(it.amount).toLocaleString('id-ID')}`)
                .join('\n');

            const dueDateObj = new Date();
            dueDateObj.setDate(dueDateObj.getDate() + (parseInt(dueDays) || 3));
            const dueDateFormatted = dueDateObj.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            const invoiceUrl = (inv.invoice_url && !inv.invoice_url.startsWith('undefined') && !inv.invoice_url.startsWith('/'))
                ? inv.invoice_url
                : `${window.location.origin}/p/invoice/${inv.public_token}`;

            const invoiceMsg = 
`🧾 *FAKTUR TAGIHAN RESMI*
━━━━━━━━━━━━━━━━━━━━
Kepada: *${contactName || 'Pelanggan'}*
No. Faktur: *#${inv.invoice_number}*
Jatuh Tempo: *${dueDateFormatted}*
━━━━━━━━━━━━━━━━━━━━
📦 *Rincian Pesanan:*
${itemsListText}
${taxAmount > 0 ? `\nPPN (${taxPercentage}%): Rp ${parseInt(taxAmount).toLocaleString('id-ID')}` : ''}
💰 *Total Tagihan: Rp ${parseInt(totalAmount).toLocaleString('id-ID')}*
${notes ? `\n📝 *Catatan:* ${notes}` : ''}
━━━━━━━━━━━━━━━━━━━━
📲 *Detail Faktur & Pembayaran Online / QRIS:*
${invoiceUrl}

_Terima kasih banyak atas pesanan dan kepercayaannya!_ 🙏`;

            if (onSendInvoiceMessage) {
                await onSendInvoiceMessage(invoiceMsg, inv);
            }

            toast.success(`Invoice #${inv.invoice_number} berhasil dibuat dan dikirim!`);
            onClose();
        } catch (err) {
            console.error('Create invoice error:', err);
            toast.error(err.response?.data?.error || 'Gagal membuat invoice');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Buat Faktur & Pesanan</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Untuk {contactName ? <strong>{contactName}</strong> : 'pelanggan ini'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar AI & Catalog */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/30">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={loadingAi}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                            {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>{loadingAi ? 'Menganalisis Chat...' : '✨ Ekstrak Otomatis dari Chat (AI)'}</span>
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowCatalogPicker(!showCatalogPicker)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold shadow-sm transition-all"
                            >
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Pilih dari Katalog</span>
                            </button>

                            {showCatalogPicker && (
                                <div className="absolute top-full mt-1 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 p-2 max-h-56 overflow-y-auto">
                                    <div className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase">Katalog Produk</div>
                                    {products.length === 0 ? (
                                        <div className="text-xs text-gray-500 p-2">Belum ada produk terdaftar.</div>
                                    ) : (
                                        products.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => addFromCatalog(p)}
                                                className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs flex justify-between items-center transition-colors"
                                            >
                                                <div className="truncate mr-2">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400">Stok: {p.stock ?? '-'}</p>
                                                </div>
                                                <span className="font-bold text-emerald-600 text-xs whitespace-nowrap">
                                                    Rp {parseInt(p.price || 0).toLocaleString('id-ID')}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {items.filter(i => i.description.trim()).length} produk terpilih
                    </span>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {/* Items Table */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Rincian Produk / Layanan
                            </label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tambah Baris
                            </button>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700">
                                    {/* Description */}
                                    <input
                                        type="text"
                                        placeholder="Nama produk / jasa"
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                        required
                                    />

                                    {/* Qty */}
                                    <div className="w-16">
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>

                                    {/* Price */}
                                    <div className="w-28">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Harga Satuan"
                                            value={item.unit_price}
                                            onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>

                                    {/* Subtotal */}
                                    <div className="w-24 text-right text-xs font-bold text-gray-700 dark:text-gray-200 pr-1">
                                        Rp {parseInt(item.amount || 0).toLocaleString('id-ID')}
                                    </div>

                                    {/* Remove button */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Hapus Baris"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Due Date & Tax */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                Jatuh Tempo
                            </label>
                            <select
                                value={dueDays}
                                onChange={e => setDueDays(parseInt(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none"
                            >
                                <option value={1}>1 Hari (Besok)</option>
                                <option value={3}>3 Hari</option>
                                <option value={7}>7 Hari (1 Minggu)</option>
                                <option value={14}>14 Hari (2 Minggu)</option>
                                <option value={30}>30 Hari (1 Bulan)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                PPN / Pajak (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={taxPercentage}
                                onChange={e => setTaxPercentage(e.target.value)}
                                placeholder="0"
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Catatan untuk Pelanggan (Opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="cth: Silakan selesaikan pembayaran sebelum batas waktu agar pesanan segera diproses."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-100 outline-none"
                        />
                    </div>

                    {/* Totals Box */}
                    <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl space-y-2 border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Subtotal:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                Rp {parseInt(subtotal).toLocaleString('id-ID')}
                            </span>
                        </div>
                        {taxAmount > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Pajak ({taxPercentage}%):</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    Rp {parseInt(taxAmount).toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-slate-700">
                            <span>Total Tagihan:</span>
                            <span className="text-base text-emerald-600 dark:text-emerald-400">
                                Rp {parseInt(totalAmount).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {/* Submit Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || totalAmount <= 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Memproses Faktur...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Buat & Kirim ke Chat</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
