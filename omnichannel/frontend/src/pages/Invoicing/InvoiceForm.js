import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, X, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Debounce hook for search
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
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

    // Fetch contacts when search changes
    useEffect(() => {
        if (debouncedSearch.length < 1) {
            setResults([]);
            return;
        }

        const fetchContacts = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/app/contacts?search=${encodeURIComponent(debouncedSearch)}&limit=20`);
                setResults(res.data.data || []);
            } catch (err) {
                console.error('Failed to search contacts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [debouncedSearch]);

    // Load selected contact details if value is set
    useEffect(() => {
        if (value && !selectedContact) {
            const contact = results.find(c => c.id.toString() === value.toString());
            if (contact) {
                setSelectedContact(contact);
                setSearch(contact.name);
            }
        }
    }, [value, results, selectedContact]);

    // Click outside to close dropdown
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
            {selectedContact && (
                <input type="hidden" value={value} />
            )}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    className="w-full border p-2 pl-10 pr-10 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Search contact by name or phone..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                        if (!e.target.value) {
                            handleClear();
                        }
                    }}
                    onFocus={() => setShowDropdown(true)}
                />
                {search && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (search.length > 0 || results.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {loading && (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            Searching...
                        </div>
                    )}

                    {!loading && results.length === 0 && search.length > 0 && (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            No contacts found for "{search}"
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <ul className="py-1">
                            {results.map((contact) => (
                                <li key={contact.id}>
                                    <button
                                        type="button"
                                        className={`w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors ${
                                            selectedContact?.id === contact.id ? 'bg-indigo-50' : ''
                                        }`}
                                        onClick={() => handleSelect(contact)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {contact.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate">{contact.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{contact.phone_number}</div>
                                            </div>
                                            {selectedContact?.id === contact.id && (
                                                <span className="text-xs text-indigo-600 font-medium">Selected</span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {results.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                            Showing {results.length} results
                        </div>
                    )}
                </div>
            )}

            {/* Selected Contact Display */}
            {selectedContact && (
                <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                        <div className="font-medium text-green-800 text-sm">{selectedContact.name}</div>
                        <div className="text-xs text-green-600">{selectedContact.phone_number}</div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-green-600 hover:text-green-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Added 'embedded' prop to handle layout adjustment
export default function InvoiceForm({ embedded = false }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        contact_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        document_type: 'invoice',
        valid_until: '',
        items: [{ description: '', quantity: 1, unit_price: 0 }],
        dp_amount: 0,
        shipping_cost: 0,
        courier: '',
        tracking_number: '',
        notes: ''
    });

    useEffect(() => {
        // Only load products, contacts are searched via autocomplete
        axios.get('/api/app/products?limit=1000').then(res => setProducts(res.data.products || []));
        axios.get('/api/app/invoice-settings').then(res => {
            if (res.data && res.data.due_days) {
                const due = new Date();
                due.setDate(due.getDate() + parseInt(res.data.due_days));
                setForm(prev => ({...prev, due_date: due.toISOString().split('T')[0]}));
            }
        }).catch(() => {});
    }, []);

    // ... (Handlers same as before) ...
    const handleItemChange = (idx, field, val) => {
        const newItems = [...form.items];
        newItems[idx][field] = val;
        
        // Auto-fill price if description matches a product exactly
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
        setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }]});
    };

    const removeItem = (idx) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
    };

    const handleSubmit = async () => {
        if (!form.contact_id) return toast.error("Select Contact");
        try {
            await axios.post('/api/app/invoices', form);
            toast.success("Invoice Created");
            navigate('/invoicing/list');
        } catch (err) {
            toast.error("Failed to create");
        }
    };

    const total = form.items.reduce((acc, item) => acc + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);

    // If embedded, remove page padding/header wrappers
    const wrapperClass = embedded ? "w-full" : "p-8 max-w-4xl mx-auto h-full overflow-y-auto";

    return (
        <div className={wrapperClass}>
            {!embedded && (
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/invoicing/list')} className="text-gray-500"><ArrowLeft className="w-6 h-6"/></button>
                    <h2 className="text-2xl font-bold text-gray-800">Create {form.document_type === 'invoice' ? 'Invoice' : 'Quotation'}</h2>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Document Type</label>
                        <select className="w-full border p-2 rounded-lg" value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})}>
                            <option value="invoice">Invoice</option>
                            <option value="quotation">Quotation</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Customer</label>
                        <ContactAutocomplete
                            value={form.contact_id}
                            onChange={(contactId) => setForm({...form, contact_id: contactId})}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Issue Date</label>
                            <input type="date" className="w-full border p-2 rounded-lg" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} />
                        </div>
                        {form.document_type === 'invoice' ? (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Due Date</label>
                                <input type="date" className="w-full border p-2 rounded-lg" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Valid Until</label>
                                <input type="date" className="w-full border p-2 rounded-lg" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} />
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-4">Items</label>
                    
                    {/* Desktop Headers */}
                    <div className="hidden md:flex gap-3 mb-2 px-2 text-xs font-bold text-gray-500 uppercase">
                        <div className="flex-1">Description</div>
                        <div className="w-24 text-center">Qty</div>
                        <div className="w-32 text-right">Unit Price</div>
                        <div className="w-32 text-right">Total</div>
                        <div className="w-8"></div>
                    </div>

                    {form.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 mb-4 md:mb-2 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg md:rounded-none border md:border-0 border-gray-100">
                            <input 
                                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="Description (or select product)" 
                                value={item.description} 
                                onChange={e => handleItemChange(idx, 'description', e.target.value)} 
                                list={`products-list-${idx}`}
                            />
                            <datalist id={`products-list-${idx}`}>
                                {products.map(p => (
                                    <option key={p.id} value={p.name}>{p.sku ? `[${p.sku}] ` : ''}Rp {parseInt(p.price).toLocaleString('id-ID')}</option>
                                ))}
                            </datalist>
                            <div className="flex gap-3">
                                <input className="w-24 border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                                <input className="flex-1 md:w-32 border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" type="number" min="0" placeholder="Price" value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} />
                            </div>
                            <div className="flex justify-between md:justify-end items-center gap-3">
                                <span className="md:hidden text-xs font-bold text-gray-500 uppercase">Total:</span>
                                <div className="w-full md:w-32 border p-2 rounded bg-white md:bg-gray-50 text-right font-mono flex items-center justify-end px-2 text-sm">{(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toLocaleString()}</div>
                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-100 p-2 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                    <button onClick={addItem} className="text-sm text-indigo-600 font-bold flex items-center gap-1 mt-2 hover:bg-indigo-50 px-3 py-2 rounded-lg w-fit transition-colors"><Plus className="w-4 h-4"/> Add Item</button>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-right space-y-2 w-64">
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span className="font-bold">Rp {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Down Payment (DP)</span>
                            <input 
                                type="number" 
                                className="w-32 border p-1 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                value={form.dp_amount}
                                onChange={e => setForm({...form, dp_amount: e.target.value})}
                                min="0"
                            />
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Biaya Pengiriman (Ongkir)</span>
                            <input 
                                type="number" 
                                className="w-32 border p-1 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                value={form.shipping_cost}
                                onChange={e => setForm({...form, shipping_cost: e.target.value})}
                                min="0"
                            />
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold text-indigo-600 border-t pt-2 mt-2">
                            <span>Sisa Tagihan</span>
                            <span>Rp {Math.max(0, total + (parseFloat(form.shipping_cost) || 0) - (parseFloat(form.dp_amount) || 0)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Kurir (Opsional)</label>
                        <input className="w-full border p-2 rounded-lg" placeholder="JNE / J&T / Sicepat..." value={form.courier} onChange={e => setForm({...form, courier: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nomor Resi (Opsional)</label>
                        <input className="w-full border p-2 rounded-lg" placeholder="Resi pengiriman..." value={form.tracking_number} onChange={e => setForm({...form, tracking_number: e.target.value})} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                    <textarea className="w-full border p-2 rounded-lg h-20" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>

                <button onClick={handleSubmit} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                    <Save className="w-5 h-5" /> Save Invoice
                </button>
            </div>
        </div>
    );
}
