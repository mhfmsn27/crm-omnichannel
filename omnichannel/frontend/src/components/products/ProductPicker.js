import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Package, Search, Check, Plus, Minus } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import Modal, { ModalFooter } from '../common/Modal';

const formatPrice = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/**
 * ProductPicker — reusable modal untuk memilih produk dari katalog.
 *
 * Props:
 *   isOpen        : boolean
 *   onClose       : () => void
 *   onSelect      : (product, qty) => void   — dipanggil saat produk dipilih
 *   multiSelect   : boolean (default false)  — mode pilih banyak sekaligus
 *   onConfirm     : (items: [{product, qty}]) => void  — hanya untuk multiSelect
 */
export default function ProductPicker({ isOpen, onClose, onSelect, multiSelect = false, onConfirm }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState({}); // { productId: qty }
    const searchRef = useRef(null);

    const fetchProducts = useCallback(async (q = '', cat = '') => {
        setLoading(true);
        try {
            const params = { limit: 100, is_active: 'true' };
            if (q) params.search = q;
            if (cat) params.category_id = cat;
            const r = await axios.get('/api/app/products', { params });
            setProducts(r.data.products);
        } catch {}
        finally { setLoading(false); }
    }, []);

    const fetchCategories = useCallback(async () => {
        try { const r = await axios.get('/api/app/products/categories'); setCategories(r.data); } catch {}
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setFilterCategory('');
            setSelected({});
            fetchProducts('', '');
            fetchCategories();
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const t = setTimeout(() => fetchProducts(search, filterCategory), 300);
        return () => clearTimeout(t);
    }, [search, filterCategory]);

    const handleSingleSelect = (product) => {
        onSelect(product, 1);
        onClose();
    };

    const handleQty = (productId, delta) => {
        setSelected(prev => {
            const current = prev[productId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: next };
        });
    };

    const handleConfirmMulti = () => {
        const items = Object.entries(selected).map(([id, qty]) => ({
            product: products.find(p => String(p.id) === String(id)),
            qty
        })).filter(i => i.product && i.qty > 0);
        onConfirm(items);
        onClose();
    };

    if (!isOpen) return null;

    const selectedCount = Object.values(selected).reduce((a, b) => a + b, 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-500" />
                    Pilih Produk
                </div>
            }
            size="md"
            className="p-0 sm:max-w-lg flex flex-col max-h-[90vh]"
            footer={
                multiSelect ? (
                    <ModalFooter>
                        <div className="w-full flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedCount > 0 ? `${selectedCount} item dipilih` : 'Belum ada yang dipilih'}
                            </span>
                            <button onClick={handleConfirmMulti} disabled={selectedCount === 0}
                                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                Pilih Produk
                            </button>
                        </div>
                    </ModalFooter>
                ) : null
            }
        >
            {/* Search + filter */}
            <div className="p-3 border-b border-gray-100 dark:border-dark-border flex-shrink-0 space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari produk..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                {categories.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        <button onClick={() => setFilterCategory('')}
                            className={`flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors ${!filterCategory ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400'}`}>
                            Semua
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setFilterCategory(String(cat.id))}
                                className={`flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors ${filterCategory === String(cat.id) ? 'text-white' : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400'}`}
                                style={filterCategory === String(cat.id) ? { backgroundColor: cat.color } : {}}>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Memuat produk...</div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Package className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Produk tidak ditemukan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-dark-border">
                        {products.map(p => {
                            const qty = selected[p.id] || 0;
                            return (
                                <div key={p.id}
                                    onClick={!multiSelect ? () => handleSingleSelect(p) : undefined}
                                    className={`flex items-center gap-3 px-4 py-3 ${!multiSelect ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg' : ''} transition-colors`}>
                                    {/* Image */}
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-bg flex-shrink-0">
                                        {p.image_url
                                            ? <img src={getApiUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{formatPrice(p.price)}</span>
                                            <span className="text-xs text-gray-400">/{p.unit}</span>
                                            {p.category_name && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                                    style={{ backgroundColor: p.category_color + '20', color: p.category_color }}>
                                                    {p.category_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Multi-select qty controls */}
                                    {multiSelect && (
                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            {qty > 0 ? (
                                                <>
                                                    <button onClick={() => handleQty(p.id, -1)}
                                                        className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-white">{qty}</span>
                                                </>
                                            ) : null}
                                            <button onClick={() => handleQty(p.id, 1)}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${qty > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                                {qty > 0 ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
