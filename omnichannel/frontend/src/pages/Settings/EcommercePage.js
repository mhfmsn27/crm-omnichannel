import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Box, Activity, DollarSign, Settings, RefreshCw, X, Link, Trash2, Plus, AlertCircle, ShoppingCart, Globe, Clock, Package, Check } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const PLATFORMS = [
    { id: 'shopee', name: 'Shopee', color: '#EE4D2D', logo: '🛒' },
    { id: 'tokopedia', name: 'Tokopedia', color: '#03AC0E', logo: '🏪' },
    { id: 'lazada', name: 'Lazada', color: '#0D1588', logo: '📦' },
    { id: 'blibli', name: 'Blibli', color: '#E31837', logo: '🛍️' },
    { id: 'woocommerce', name: 'WooCommerce', color: '#96588A', logo: '🛠️' },
    { id: 'custom', name: 'Custom API', color: '#6366F1', logo: '⚙️' }
];

function ConnectionCard({ connection, onEdit, onDelete, onTest }) {
    const platform = PLATFORMS.find(p => p.id === connection.platform) || PLATFORMS[PLATFORMS.length - 1];

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${platform.color}20` }}
                    >
                        {platform.logo}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{connection.store_name || platform.name}</h3>
                        <p className="text-sm text-gray-500">{platform.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        connection.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                    }`}>
                        {connection.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <div className="space-y-2 text-sm">
                {connection.last_sync_at && (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                    </div>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                    <Globe className="w-4 h-4" />
                    {connection.store_id || 'No store ID'}
                </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <button
                    onClick={() => onTest(connection)}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Test
                </button>
                <button
                    onClick={() => onEdit(connection)}
                    className="flex-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(connection)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function ConnectionModal({ connection, onClose, onSave }) {
    const [form, setForm] = useState({
        platform: connection?.platform || 'shopee',
        storeName: connection?.store_name || '',
        storeId: connection?.api_key || '',
        apiKey: connection?.api_key || '',
        apiSecret: connection?.api_secret || '',
        webhookUrl: connection?.webhook_url || '',
        autoSyncProducts: connection?.auto_sync_products || false,
        autoSyncOrders: connection?.auto_sync_orders || false,
        isActive: connection?.is_active || false
    });

    const handleSave = () => {
        onSave({
            ...form,
            id: connection?.id,
            platform: form.platform,
            storeName: form.storeName,
            apiKey: form.apiKey,
            apiSecret: form.apiSecret,
            webhookUrl: form.webhookUrl,
            autoSyncProducts: form.autoSyncProducts,
            autoSyncOrders: form.autoSyncOrders,
            isActive: form.isActive
        });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={connection?.id ? 'Edit Connection' : 'Add New Connection'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>
                        {connection?.id ? 'Save Changes' : 'Add Connection'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                        <select
                            value={form.platform}
                            onChange={(e) => setForm({ ...form, platform: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {PLATFORMS.map(p => (
                                <option key={p.id} value={p.id}>{p.logo} {p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                        <input
                            type="text"
                            value={form.storeName}
                            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                            placeholder="My Shop"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="text"
                            value={form.apiKey}
                            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                            placeholder="Your API Key"
                            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                        <input
                            type="password"
                            value={form.apiSecret}
                            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                            placeholder="Your API Secret"
                            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                        <input
                            type="text"
                            value={form.webhookUrl}
                            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                            placeholder="https://your-domain.com/api/webhooks/ecommerce"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.autoSyncProducts}
                                onChange={(e) => setForm({ ...form, autoSyncProducts: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">Auto-sync Products</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.autoSyncOrders}
                                onChange={(e) => setForm({ ...form, autoSyncOrders: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">Auto-sync Orders</span>
                        </label>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Activate this connection</span>
                    </label>
                </div>

        </Modal>
    );
}

function OrderRow({ order }) {
    const platform = PLATFORMS.find(p => p.id === order.platform) || PLATFORMS[PLATFORMS.length - 1];

    return (
        <tr className="border-b hover:bg-gray-50">
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <span>{platform.logo}</span>
                    <span className="font-mono text-sm">{order.external_order_id}</span>
                </div>
            </td>
            <td className="p-4">{order.customer_name || 'N/A'}</td>
            <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.external_status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.external_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    order.external_status === 'unpaid' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                }`}>
                    {order.external_status || 'pending'}
                </span>
            </td>
            <td className="p-4 text-right font-medium">
                Rp {parseFloat(order.total_amount || 0).toLocaleString()}
            </td>
            <td className="p-4">
                {order.conversation_id ? (
                    <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Linked
                    </span>
                ) : (
                    <span className="text-gray-400">Not linked</span>
                )}
            </td>
        </tr>
    );
}

function ProductCard({ product }) {
    const images = product.images || [];

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {images.length > 0 ? (
                    <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <Package className="w-12 h-12 text-gray-300" />
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                <p className="text-lg font-bold text-indigo-600 mt-1">
                    Rp {parseFloat(product.price || 0).toLocaleString()}
                </p>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                    <span>Stock: {product.stock}</span>
                    <span className={`px-2 py-0.5 rounded ${
                        product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {product.status}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function EcommercePage() {
    const [loading, setLoading] = useState(true);
    const [connections, setConnections] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('connections');
    const [showModal, setShowModal] = useState(false);
    const [editingConnection, setEditingConnection] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [connRes, ordersRes, productsRes, statsRes] = await Promise.all([
                axios.get('/api/app/ecommerce/connections'),
                axios.get('/api/app/ecommerce/orders'),
                axios.get('/api/app/ecommerce/products'),
                axios.get('/api/app/ecommerce/stats')
            ]);

            setConnections(connRes.data);
            setOrders(ordersRes.data);
            setProducts(productsRes.data);
            setStats(statsRes.data);
        } catch (e) {
            console.error('E-commerce fetch error:', e);
            toast.error('Failed to load e-commerce data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await axios.put('/api/app/ecommerce/connections/' + data.id, data);
                toast.success('Connection updated');
            } else {
                await axios.post('/api/app/ecommerce/connections', data);
                toast.success('Connection added');
            }
            setShowModal(false);
            setEditingConnection(null);
            fetchData();
        } catch (e) {
            toast.error('Failed to save connection');
        }
    };

    const handleDelete = async (connection) => {
        if (!confirm('Delete this connection?')) return;
        try {
            await axios.delete('/api/app/ecommerce/connections/' + connection.id);
            toast.success('Connection deleted');
            fetchData();
        } catch (e) {
            toast.error('Failed to delete connection');
        }
    };

    const handleTest = async (connection) => {
        try {
            const res = await axios.post('/api/app/ecommerce/connections/' + connection.id + '/test');
            toast.success(res.data.message || 'Connection successful');
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Connection failed');
        }
    };

    const handleEdit = (connection) => {
        setEditingConnection(connection);
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-500" />
                        E-Commerce Integration
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Connect your online stores to sync products and orders
                    </p>
                </div>
                <button
                    onClick={() => { setEditingConnection(null); setShowModal(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Connection
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                            {stats.synced_orders || 0}
                        </div>
                        <div className="text-sm text-gray-500">Synced Orders</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {stats.linked_orders || 0}
                        </div>
                        <div className="text-sm text-gray-500">Linked to Chat</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {stats.paid_orders || 0}
                        </div>
                        <div className="text-sm text-gray-500">Paid Orders</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            Rp {(stats.total_revenue || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Total Revenue</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('connections')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${
                        activeTab === 'connections' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                    }`}
                >
                    Connections ({connections.length})
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${
                        activeTab === 'orders' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                    }`}
                >
                    <ShoppingBag className="w-4 h-4 inline mr-1" />
                    Orders ({orders.length})
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${
                        activeTab === 'products' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                    }`}
                >
                    <Package className="w-4 h-4 inline mr-1" />
                    Products ({products.length})
                </button>
            </div>

            {/* Connections Tab */}
            {activeTab === 'connections' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connections.map(conn => (
                        <ConnectionCard
                            key={conn.id}
                            connection={conn}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onTest={handleTest}
                        />
                    ))}
                    {connections.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-400">No connections yet</h3>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 text-indigo-600 font-medium"
                            >
                                Add your first connection
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Order ID</th>
                                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Customer</th>
                                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Chat Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <OrderRow key={order.id} order={order} />
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400">No orders yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                    {products.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-400">No products yet</h3>
                            <p className="text-sm text-gray-400 mt-1">Products will appear after syncing</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <ConnectionModal
                    connection={editingConnection}
                    onClose={() => { setShowModal(false); setEditingConnection(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}