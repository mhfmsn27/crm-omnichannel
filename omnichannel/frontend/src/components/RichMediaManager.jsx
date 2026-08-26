import React, { useState } from 'react';
import { Image, Trash2, Plus, DollarSign, Package, Send, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const DEFAULT_PRODUCT = {
    id: null,
    name: '',
    description: '',
    price: '',
    currency: 'IDR',
    image_url: '',
    product_url: ''
};

function ProductCard({ product, onEdit, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(product);

    const handleSave = () => {
        if (!form.name) {
            toast.error('Product name required');
            return;
        }
        onEdit(form);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="bg-white border-2 border-dashed border-indigo-200 rounded-xl p-4 space-y-3">
                <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Product name"
                    className="w-full border rounded-lg px-3 py-2"
                />
                <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={2}
                />
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                            placeholder="Price"
                            className="w-full pl-8 pr-3 py-2 border rounded-lg"
                        />
                    </div>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        Save
                    </button>
                    <button onClick={() => setEditing(false)} className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover" />
            ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-300" />
                </div>
            )}
            <div className="p-3">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{product.name}</h4>
                        {product.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                        )}
                    </div>
                    {product.price && (
                        <span className="font-bold text-indigo-600">
                            {product.currency === 'IDR' && 'Rp '}
                            {parseInt(product.price).toLocaleString()}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditing(true)} className="flex-1 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                        Edit
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RichMediaManager({ conversationId, onSend }) {
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleAddProduct = () => {
        setProducts([...products, { ...DEFAULT_PRODUCT, id: `new-${Date.now() }` }]);
    };

    const handleUpdate = (index, updated) => {
        const newProducts = [...products];
        newProducts[index] = updated;
        setProducts(newProducts);
    };

    const handleDelete = (index) => {
        setProducts(products.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (products.length === 0) {
            toast.error('Add at least one product');
            return;
        }
        setSaving(true);
        try {
            await axios.post(`/api/app/inbox/conversations/${conversationId}/rich-media`, {
                type: 'product_list',
                products
            });
            toast.success('Product catalog sent');
            setProducts([]);
            if (onSend) onSend(products);
        } catch (e) {
            toast.error(e.response?.data?.error_message || 'Failed to send');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <span className="font-medium text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-indigo-500" />
                    Product Catalog
                    {products.length > 0 && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">{products.length}</span>
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
            </button>

            {!collapsed && (
                <div className="p-4 space-y-4">
                    {products.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                {products.map((product, i) => (
                                    <ProductCard
                                        key={product.id || i}
                                        product={product}
                                        onEdit={updated => handleUpdate(i, updated)}
                                        onDelete={() => handleDelete(i)}
                                    />
                                ))}
                                <button
                                    onClick={handleAddProduct}
                                    className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span className="text-sm">Add Product</span>
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSend}
                                    disabled={saving}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    {saving ? 'Sending...' : 'Send Catalog'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={handleAddProduct}
                            className="w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"
                        >
                            <Package className="w-8 h-8" />
                            <span>Add Product Catalog</span>
                            <span className="text-xs">Send product list to customer</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}