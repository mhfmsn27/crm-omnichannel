import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Save, Plus, Trash2, ArrowLeft, Search, X, User, 
    FileText, CreditCard, Building, Percent, Repeat, CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

// Debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// Contact Autocomplete Component
const ContactAutocomplete = ({ value, onChange }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const wrapperRef = useRef(null);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        if (debouncedSearch.length < 1) {
            setResults([]);
            return;
        }

        const fetchContacts = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/app/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=20`);
                setResults(res.data.data || res.data || []);
            } catch (err) {
                console.error('Failed to search contacts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [debouncedSearch]);

    useEffect(() => {
        if (value && !selectedContact) {
            const contact = results.find(c => c.id.toString() === value.toString());
            if (contact) {
                setSelectedContact(contact);
                setSearch(contact.name);
            }
        }
    }, [value, results, selectedContact]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (contact) => {
        setSelectedContact(contact);
        setSearch(contact.name);
        onChange(contact.id);
        setShowDropdown(false);
    };

    const handleClear = () => {
        setSelectedContact(null);
        setSearch('');
        setResults([]);
        onChange('');
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    className="w-full border p-2.5 pl-10 pr-10 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Cari pelanggan berdasarkan nama atau no WhatsApp..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                />
                {search && (
                    <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showDropdown && results.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {results.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => handleSelect(c)}
                            className="p-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-white">{c.name}</p>
                                <p className="text-[11px] text-gray-500">{c.phone_number}</p>
                            </div>
                            <User className="w-4 h-4 text-gray-400" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function InvoiceForm({ embedded = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        contact_id: '',
        document_type: 'invoice', // 'invoice' or 'quotation'
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        valid_until: '',
        items: [{ description: '', quantity: 1, unit_price: 0 }],
        payment_type: 'full', // 'full' or 'partial'
        down_payment_amount: 0,
        shipping_cost: 0,
        courier: '',
        tracking_number: '',
        tax_type: 'exclusive', // 'exclusive', 'inclusive', 'exempt'
        tax_percentage: 11,
        buyer_npwp: '',
        buyer_nik: '',
        buyer_company_name: '',
        is_recurring: false,
        recurring_frequency: 'monthly',
        notes: ''
    });

    useEffect(() => {
        axios.get('/api/app/products?limit=1000').then(res => setProducts(res.data.products || [])).catch(() => {});
        axios.get('/api/app/invoice-settings').then(res => {
            if (res.data && res.data.due_days) {
                const due = new Date();
                due.setDate(due.getDate() + parseInt(res.data.due_days));
                setForm(prev => ({
                    ...prev, 
                    due_date: due.toISOString().split('T')[0],
                    tax_percentage: res.data.tax_percentage !== undefined ? res.data.tax_percentage : 11
                }));
            }
        }).catch(() => {});
    }, []);

    const handleItemChange = (idx, field, val) => {
        const newItems = [...form.items];
        newItems[idx][field] = val;
        
        if (field === 'description') {
            const product = products.find(p => p.name === val);
            if (product) {
                newItems[idx]['unit_price'] = product.price;
                newItems[idx]['product_id'] = product.id;
            } else {
                newItems[idx]['product_id'] = null;
            }
        }
        
        setForm({ ...form, items: newItems });
    };

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });
    };

    const removeItem = (idx) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
    };

    const subtotal = form.items.reduce((acc, it) => acc + (parseFloat(it.quantity || 1) * parseFloat(it.unit_price || 0)), 0);
    const taxRate = form.tax_type === 'exclusive' ? (parseFloat(form.tax_percentage || 0) / 100) : 0;
    const taxAmount = subtotal * taxRate;
    const shippingVal = parseFloat(form.shipping_cost || 0);
    const grandTotal = subtotal + taxAmount + shippingVal;

    const handleSubmit = async () => {
        if (!form.contact_id) return toast.error("Pilih kontak pelanggan terlebih dahulu");
        if (form.items.length === 0 || !form.items[0].description) return toast.error("Masukkan minimal satu item produk/layanan");
        setSubmitting(true);
        try {
            await axios.post('/api/app/invoices', form);
            toast.success(form.document_type === 'quotation' ? "Surat Penawaran Harga berhasil dibuat" : "Faktur Penjualan berhasil dibuat");
            navigate('/invoicing/list');
        } catch (err) {
            toast.error("Gagal membuat faktur: " + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);
    const wrapperClass = embedded ? "w-full" : "p-6 md:p-8 max-w-4xl mx-auto h-full overflow-y-auto space-y-6";

    return (
        <div className={wrapperClass}>
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/invoicing/list')} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-gray-800">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            {form.document_type === 'invoice' ? 'Buat Faktur Penjualan Baru' : 'Buat Surat Penawaran Harga (SPO)'}
                        </h2>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
                {/* Document Type & Customer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Tipe Dokumen</label>
                        <select
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            value={form.document_type}
                            onChange={e => setForm({ ...form, document_type: e.target.value })}
                        >
                            <option value="invoice">Faktur Penjualan (Invoice)</option>
                            <option value="quotation">Surat Penawaran Harga (Quotation / SPO)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Pilih Pelanggan</label>
                        <ContactAutocomplete
                            value={form.contact_id}
                            onChange={(contactId) => setForm({ ...form, contact_id: contactId })}
                        />
                    </div>
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Tanggal Terbit</label>
                        <input
                            type="date"
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            value={form.issue_date}
                            onChange={e => setForm({ ...form, issue_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
                            {form.document_type === 'invoice' ? 'Jatuh Tempo (Due Date)' : 'Berlaku Hingga (Valid Until)'}
                        </label>
                        <input
                            type="date"
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            value={form.document_type === 'invoice' ? form.due_date : form.valid_until}
                            onChange={e => setForm({ ...form, [form.document_type === 'invoice' ? 'due_date' : 'valid_until']: e.target.value })}
                        />
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">Item & Rincian Harga</label>
                        <button type="button" onClick={addItem} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris Produk
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.items.map((it, idx) => (
                            <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                                <input
                                    className="flex-1 border p-2 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="Deskripsi barang atau layanan..."
                                    value={it.description}
                                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                />
                                <input
                                    type="number"
                                    className="w-16 border p-2 rounded-xl text-xs text-center bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="Qty"
                                    value={it.quantity}
                                    onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                />
                                <input
                                    type="number"
                                    className="w-32 border p-2 rounded-xl text-xs text-right bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-bold"
                                    placeholder="Harga Satuan"
                                    value={it.unit_price}
                                    onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                                <span className="w-24 text-right text-xs font-bold text-gray-700 dark:text-slate-300">
                                    {formatCurrency((parseFloat(it.quantity || 1) * parseFloat(it.unit_price || 0)))}
                                </span>
                                {form.items.length > 1 && (
                                    <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Payment Type & Down Payment (DP) */}
                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">Skema Pembayaran & Uang Muka (DP)</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Jenis Pembayaran</label>
                            <select
                                className="w-full border p-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                value={form.payment_type}
                                onChange={e => setForm({ ...form, payment_type: e.target.value })}
                            >
                                <option value="full">Lunas Penuh (100%)</option>
                                <option value="partial">Pembayaran Bertahap / DP Termin</option>
                            </select>
                        </div>
                        {form.payment_type === 'partial' && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1">Nominal Uang Muka (Min DP Rp)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded-xl text-xs font-bold text-emerald-600 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                    placeholder="Contoh: 500000"
                                    value={form.down_payment_amount}
                                    onChange={e => setForm({ ...form, down_payment_amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Tax & E-Faktur Legal Details */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">Pajak Pertambahan Nilai (PPN) & Data E-Faktur</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Tipe PPN</label>
                            <select
                                className="w-full border p-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                value={form.tax_type}
                                onChange={e => setForm({ ...form, tax_type: e.target.value })}
                            >
                                <option value="exclusive">PPN Ditambahkan (+11%/12%)</option>
                                <option value="inclusive">Termasuk PPN (Inclusive)</option>
                                <option value="exempt">Non-PPN (Bebas Pajak)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">NPWP / NIK Pembeli</label>
                            <input
                                className="w-full border p-2 rounded-xl text-xs bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                placeholder="01.234.567.8-901.000"
                                value={form.buyer_npwp}
                                onChange={e => setForm({ ...form, buyer_npwp: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Nama Perusahaan / PT</label>
                            <input
                                className="w-full border p-2 rounded-xl text-xs bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                placeholder="PT. Sukses Bersama"
                                value={form.buyer_company_name}
                                onChange={e => setForm({ ...form, buyer_company_name: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Recurring Subscriptions */}
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_recurring}
                            onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1">
                            <Repeat className="w-3.5 h-3.5 text-indigo-600" /> Jadikan Faktur Berlangganan Berkala (Recurring)
                        </span>
                    </label>
                    {form.is_recurring && (
                        <select
                            className="border p-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                            value={form.recurring_frequency}
                            onChange={e => setForm({ ...form, recurring_frequency: e.target.value })}
                        >
                            <option value="weekly">Setiap Minggu</option>
                            <option value="monthly">Setiap Bulan</option>
                            <option value="quarterly">Setiap 3 Bulan</option>
                            <option value="yearly">Setiap Tahun</option>
                        </select>
                    )}
                </div>

                {/* Calculation Summary Card */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal Item:</span>
                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    {form.tax_type === 'exclusive' && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">PPN ({form.tax_percentage}%):</span>
                            <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    {shippingVal > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Ongkir:</span>
                            <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(shippingVal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-2 border-gray-200 dark:border-slate-700">
                        <span className="text-sm font-black text-gray-900 dark:text-white">Total Nilai Dokumen:</span>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end gap-2.5">
                    <Button variant="outline" onClick={() => navigate('/invoicing/list')}>Batal</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting}
                        className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                    >
                        {submitting ? 'Menyimpan...' : `Simpan & Terbitkan ${form.document_type === 'quotation' ? 'SPO' : 'Faktur'}`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
