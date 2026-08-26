import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit, Trash2, FolderOpen, Tag, Check, X,
    Image, Box, FileText, ToggleLeft, ToggleRight, Loader2, Filter, AlertCircle, ShoppingCart, Wrench, Package, RefreshCw, Edit2, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { getApiUrl } from '../../config/api';

const UNITS_PRODUK = ['pcs', 'unit', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'lusin', 'paket', 'set', 'buah', 'lembar', 'botol', 'karton'];
const UNITS_JASA   = ['jam', 'hari', 'minggu', 'bulan', 'tahun', 'sesi', 'kunjungan', 'proyek', 'paket', 'orang', 'unit'];
const UNITS = [...new Set([...UNITS_PRODUK, ...UNITS_JASA])];

const TYPE_CONFIG = {
    produk: { label: 'Produk', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    jasa:   { label: 'Jasa',   icon: Wrench,       color: 'bg-purple-50 text-purple-600 border-purple-100' },
};

const formatPrice = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// ─── Category Modal ──────────────────────────────────────────────────────────
function CategoryModal({ isOpen, onClose, onSaved }) {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [loading, setLoading] = useState(false);

    const fetchCategories = useCallback(async () => {
        try { const r = await axios.get('/api/app/products/categories'); setCategories(r.data); } catch {}
    }, []);

    useEffect(() => { if (isOpen) { fetchCategories(); setName(''); setColor('#6366f1'); } }, [isOpen]);

    const handleAdd = async () => {
        if (!name.trim()) return toast.error('Nama kategori wajib diisi');
        setLoading(true);
        try {
            await axios.post('/api/app/products/categories', { name, color });
            toast.success('Kategori ditambahkan');
            setName(''); fetchCategories(); onSaved();
        } catch (e) { toast.error(e.response?.data?.error || 'Gagal menambah kategori'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus kategori ini? Produk terkait tidak akan dihapus.')) return;
        try { await axios.delete(`/api/app/products/categories/${id}`); fetchCategories(); onSaved(); toast.success('Kategori dihapus'); }
        catch { toast.error('Gagal hapus kategori'); }
    };

    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-indigo-500" />
                    Kelola Kategori
                </div>
            }
            size="md"
        >
            <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama kategori baru..."
                            className="flex-1 border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                            className="w-10 h-10 rounded-lg border border-gray-200 dark:border-dark-border cursor-pointer p-0.5" />
                        <button onClick={handleAdd} disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                            Tambah
                        </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categories.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-4">Belum ada kategori</p>
                        ) : categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-dark-bg">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{cat.name}</span>
                                    <span className="text-xs text-gray-400">{cat.product_count} produk</span>
                                </div>
                                <button onClick={() => handleDelete(cat.id)} className="text-gray-300 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
            </div>
        </Modal>
    );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductFormModal({ isOpen, onClose, onSaved, editProduct, categories }) {
    const [form, setForm] = useState({ name: '', description: '', sku: '', price: '', cost_price: '', unit: 'pcs', product_type: 'produk', category_id: '', stock: '', notes: '', is_active: true });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editProduct) {
                setForm({
                    name: editProduct.name || '',
                    description: editProduct.description || '',
                    sku: editProduct.sku || '',
                    price: editProduct.price || '',
                    cost_price: editProduct.cost_price || '',
                    unit: editProduct.unit || 'pcs',
                    product_type: editProduct.product_type || 'produk',
                    category_id: editProduct.category_id || '',
                    stock: editProduct.stock ?? '',
                    notes: editProduct.notes || '',
                    is_active: editProduct.is_active !== false,
                });
                setImagePreview(editProduct.image_url ? getApiUrl(editProduct.image_url) : null);
            } else {
                setForm({ name: '', description: '', sku: '', price: '', cost_price: '', unit: 'pcs', product_type: 'produk', category_id: '', stock: '', notes: '', is_active: true });
                setImagePreview(null);
            }
            setImageFile(null);
        }
    }, [isOpen, editProduct]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return toast.error('Nama produk wajib diisi');
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (imageFile) fd.append('file', imageFile);

            if (editProduct) {
                await axios.put(`/api/app/products/${editProduct.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Produk diperbarui');
            } else {
                await axios.post('/api/app/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Produk ditambahkan');
            }
            onSaved();
            onClose();
        } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan produk'); }
        finally { setSaving(false); }
    };

    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editProduct ? 'Edit Produk' : 'Tambah Produk'}
            size="3xl"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={saving} icon={saving ? <Loader2 className="w-4 h-4 animate-spin"/> : null}>
                        {editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image, Type, Basic Info */}
                <div className="space-y-6">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto Produk</label>
                        <label className="cursor-pointer group block">
                            <div className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border group-hover:border-indigo-400 flex flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <span className="text-xs text-gray-500 font-medium">Klik untuk upload foto</span>
                                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                    </div>

                    {/* Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe Produk</label>
                        <div className="flex gap-2">
                            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                                const Icon = cfg.icon;
                                return (
                                    <button key={key} type="button"
                                        onClick={() => setForm(f => ({ ...f, product_type: key, unit: key === 'jasa' ? 'jam' : 'pcs', stock: key === 'jasa' ? '' : f.stock }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${form.product_type === key ? cfg.color + ' border-current shadow-sm' : 'bg-white dark:bg-dark-bg text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-dark-border'}`}>
                                        <Icon className="w-4 h-4" /> {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nama {TYPE_CONFIG[form.product_type]?.label || 'Produk'} <span className="text-red-500">*</span>
                        </label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder={form.product_type === 'jasa' ? 'Misal: Jasa Konsultasi...' : 'Misal: Kopi Arabica...'}
                            className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                </div>

                {/* Right Column: Details, Price, Stock, Category */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU / Kode</label>
                            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                placeholder="SKU-001"
                                className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                <option value="">Tanpa kategori</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={`grid gap-4 ${form.product_type === 'jasa' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Jual (Rp)</label>
                            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                placeholder="0"
                                className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        {form.product_type === 'produk' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Modal</label>
                                <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                                    placeholder="0"
                                    className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Satuan</label>
                            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                {(form.product_type === 'jasa' ? UNITS_JASA : UNITS_PRODUK).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        {form.product_type === 'produk' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stok</label>
                                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                                    placeholder="∞ (Unlimited)"
                                    className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Deskripsi lengkap tentang produk atau layanan Anda..."
                            rows={4}
                            className="w-full border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2.5 text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                    </div>

                    <div className="bg-gray-50 dark:bg-dark-bg/50 p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className="text-gray-400 focus:outline-none flex-shrink-0">
                                {form.is_active ? <ToggleRight className="w-8 h-8 text-green-500" /> : <ToggleLeft className="w-8 h-8" />}
                            </button>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Status Produk</p>
                                <p className="text-xs text-gray-500">{form.is_active ? 'Produk aktif dan dapat dijual / ditampilkan' : 'Produk diarsipkan atau disembunyikan'}</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─── Product Detail Modal ───────────────────────────────────────────────────────
function ProductDetailModal({ isOpen, onClose, product, category }) {
    if (!isOpen || !product) return null;
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detail Produk"
            size="2xl"
            footer={
                <ModalFooter>
                    <Button onClick={onClose}>Tutup</Button>
                </ModalFooter>
            }
        >
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Image */}
                    <div className="w-full md:w-1/3 flex-shrink-0">
                        <div className="w-full aspect-square rounded-2xl border-2 border-gray-100 dark:border-dark-border overflow-hidden bg-gray-50 dark:bg-dark-bg/50 flex items-center justify-center">
                            {product.image_url ? (
                                <img src={getApiUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <Package className="w-16 h-16 text-gray-300" />
                            )}
                        </div>
                    </div>
                    
                    {/* Right: Info */}
                    <div className="w-full md:w-2/3 space-y-6">
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h3>
                                    {product.sku && <p className="text-sm font-mono text-gray-500 mt-1">{product.sku}</p>}
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4 border border-gray-100 dark:border-dark-border">
                                <p className="text-xs text-gray-500 font-medium mb-1">Harga</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatPrice(product.price)} <span className="text-sm text-gray-400 font-normal">/{product.unit}</span>
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4 border border-gray-100 dark:border-dark-border">
                                <p className="text-xs text-gray-500 font-medium mb-1">Stok</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {product.stock !== null ? `${product.stock} ${product.unit}` : 'Tidak terbatas'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Kategori</p>
                                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                                        {category ? category.name : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Tipe</p>
                                    <p className="text-sm text-gray-900 dark:text-white mt-0.5 capitalize">
                                        {product.product_type}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Tanggal Dibuat</p>
                                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                                        {product.created_at ? format(new Date(product.created_at), 'dd MMM yyyy') : '-'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 font-medium mb-1.5">Deskripsi</p>
                                <div className="bg-gray-50 dark:bg-dark-bg p-3 rounded-lg border border-gray-100 dark:border-dark-border min-h-[80px]">
                                    {product.description ? (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{product.description}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Tidak ada deskripsi</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductListPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [viewProduct, setViewProduct] = useState(null);
    const [showCategories, setShowCategories] = useState(false);
    const LIMIT = 25;

    const fetchCategories = useCallback(async () => {
        try { const r = await axios.get('/api/app/products/categories'); setCategories(r.data); } catch {}
    }, []);

    const fetchProducts = useCallback(async (p = 1, q = '', cat = '', active = '', type = '') => {
        setLoading(true);
        try {
            const params = { page: p, limit: LIMIT };
            if (q) params.search = q;
            if (cat) params.category_id = cat;
            if (active !== '') params.is_active = active;
            if (type) params.product_type = type;
            const r = await axios.get('/api/app/products', { params });
            setProducts(r.data.products);
            setTotal(r.data.total);
        } catch { toast.error('Gagal memuat produk'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProducts(1, '', '', ''); fetchCategories(); }, []);

    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchProducts(1, search, filterCategory, filterActive, filterType); }, 350);
        return () => clearTimeout(t);
    }, [search, filterCategory, filterActive, filterType]);

    const handleToggleActive = async (product) => {
        try {
            const fd = new FormData();
            fd.append('is_active', !product.is_active);
            await axios.put(`/api/app/products/${product.id}`, fd);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !product.is_active } : p));
        } catch { toast.error('Gagal mengubah status'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus produk ini?')) return;
        try {
            await axios.delete(`/api/app/products/${id}`);
            toast.success('Produk dihapus');
            fetchProducts(page, search, filterCategory, filterActive, filterType);
        } catch { toast.error('Gagal hapus produk'); }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-indigo-500" /> Katalog Produk
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola produk dan layanan yang Anda tawarkan</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCategories(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                        <Tag className="w-4 h-4" /> Kategori
                    </button>
                    <button onClick={() => { setEditProduct(null); setShowForm(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Tambah Produk
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama, SKU..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                    className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                    className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Produk & Jasa</option>
                    <option value="produk">Produk</option>
                    <option value="jasa">Jasa</option>
                </select>
                <select value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1); }}
                    className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Semua Status</option>
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                </select>
                <button onClick={() => fetchProducts(page, search, filterCategory, filterActive)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{total} produk total</span>
                {filterCategory && <span>· Kategori: {categories.find(c => String(c.id) === String(filterCategory))?.name}</span>}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat produk...
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Package className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium">Belum ada produk</p>
                        <p className="text-sm mt-1">Klik "Tambah Produk" untuk mulai mengisi katalog</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="text-left px-4 py-3">Produk</th>
                                    <th className="text-left px-4 py-3 hidden md:table-cell">Kategori</th>
                                    <th className="text-left px-4 py-3">Harga Jual</th>
                                    <th className="text-left px-4 py-3 hidden lg:table-cell">Harga Modal</th>
                                    <th className="text-left px-4 py-3 hidden sm:table-cell">Stok</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-right px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-bg flex-shrink-0">
                                                    {p.image_url ? (
                                                        <img src={getApiUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-4 h-4 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-medium text-gray-800 dark:text-white">{p.name}</p>
                                                        {(() => { const cfg = TYPE_CONFIG[p.product_type]; if (!cfg) return null; const Icon = cfg.icon; return (
                                                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                                                                <Icon className="w-2.5 h-2.5" /> {cfg.label}
                                                            </span>
                                                        ); })()}
                                                    </div>
                                                    {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {p.category_name ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{ backgroundColor: p.category_color + '20', color: p.category_color }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.category_color }} />
                                                    {p.category_name}
                                                </span>
                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-gray-800 dark:text-white">{formatPrice(p.price)}</span>
                                            <span className="text-xs text-gray-400 ml-1">/{p.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            {p.product_type === 'produk' ? (
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">{formatPrice(p.cost_price)}</span>
                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-sm">
                                            {p.stock !== null ? (
                                                <span className={p.stock === 0 ? 'text-red-500 font-semibold' : p.stock <= 5 ? 'text-orange-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                                                    {p.stock} {p.unit}
                                                </span>
                                            ) : <span className="text-gray-400 text-xs">Tidak terbatas</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleActive(p)} className="flex items-center gap-1 text-xs">
                                                {p.is_active
                                                    ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600 font-medium hidden sm:inline">Aktif</span></>
                                                    : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400 hidden sm:inline">Nonaktif</span></>}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setViewProduct(p)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setEditProduct(p); setShowForm(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-border">
                        <span className="text-xs text-gray-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} produk</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => { const p = page - 1; setPage(p); fetchProducts(p, search, filterCategory, filterActive); }} disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="text-xs px-2 text-gray-600">{page}/{totalPages}</span>
                            <button onClick={() => { const p = page + 1; setPage(p); fetchProducts(p, search, filterCategory, filterActive); }} disabled={page === totalPages}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CategoryModal isOpen={showCategories} onClose={() => setShowCategories(false)} onSaved={fetchCategories} />
            <ProductFormModal
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditProduct(null); }}
                onSaved={() => { fetchProducts(page, search, filterCategory, filterActive); fetchCategories(); }}
                editProduct={editProduct}
                categories={categories}
            />
            <ProductDetailModal
                isOpen={!!viewProduct}
                onClose={() => setViewProduct(null)}
                product={viewProduct}
                category={categories.find(c => c.id === viewProduct?.category_id)}
            />
        </div>
    );
}
