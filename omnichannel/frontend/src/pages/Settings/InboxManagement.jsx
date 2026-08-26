import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Inbox, Plus, Trash2, Edit2, Users, Smartphone, Check, X, Shield, AlertTriangle } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
];

export default function InboxManagement() {
    const [inboxes, setInboxes] = useState([]);
    const [devices, setDevices] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingInbox, setEditingInbox] = useState(null);
    const [selectedInboxId, setSelectedInboxId] = useState(null);
    const [inboxIsolationEnabled, setInboxIsolationEnabled] = useState(false);
    const [savingSetting, setSavingSetting] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        color: COLORS[0],
        icon: 'inbox',
        device_ids: [],
        is_default: false
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, inboxRes, deviceRes, teamRes] = await Promise.all([
                axios.get('/api/app/inboxes/settings'),
                axios.get('/api/app/inboxes'),
                axios.get('/api/app/devices'),
                axios.get('/api/app/team')
            ]);
            setInboxIsolationEnabled(settingsRes.data.inbox_isolation_enabled);
            setInboxes(inboxRes.data);
            setDevices(deviceRes.data.filter(d => d.status === 'connected'));
            setUsers(teamRes.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleIsolation = async (enabled) => {
        setSavingSetting(true);
        try {
            await axios.put('/api/app/inboxes/settings', {
                inbox_isolation_enabled: enabled
            });
            setInboxIsolationEnabled(enabled);
            toast.success(enabled ? 'Kotak Masuk Terpisah diaktifkan' : 'Kotak Masuk Terpisah dinonaktifkan');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update setting');
        } finally {
            setSavingSetting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingInbox) {
                await axios.put(`/api/app/inboxes/${editingInbox.id}`, form);
                toast.success('Inbox updated');
            } else {
                await axios.post('/api/app/inboxes', form);
                toast.success('Inbox created');
            }
            setShowModal(false);
            setEditingInbox(null);
            resetForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save inbox');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this inbox? Conversations will not be deleted.')) return;
        try {
            await axios.delete(`/api/app/inboxes/${id}`);
            toast.success('Inbox deleted');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete inbox');
        }
    };

    const handleEdit = (inbox) => {
        axios.get(`/api/app/inboxes/${inbox.id}`)
            .then(res => {
                setEditingInbox(inbox);
                setForm({
                    name: res.data.name,
                    description: res.data.description || '',
                    color: res.data.color || COLORS[0],
                    icon: res.data.icon || 'inbox',
                    device_ids: res.data.device_ids || [],
                    is_default: res.data.is_default
                });
                setShowModal(true);
            })
            .catch(err => {
                console.error(err);
                toast.error('Failed to load inbox data');
            });
    };

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            color: COLORS[0],
            icon: 'inbox',
            device_ids: [],
            is_default: false
        });
    };

    const openUserModal = (inboxId) => {
        setSelectedInboxId(inboxId);
        setShowUserModal(true);
    };

    const InboxFormModal = () => (
        <Modal
            isOpen={true}
            onClose={() => { setShowModal(false); setEditingInbox(null); resetForm(); }}
            title={editingInbox ? 'Edit Inbox' : 'Create New Inbox'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={() => { setShowModal(false); setEditingInbox(null); resetForm(); }}>Cancel</Button>
                    <Button onClick={handleSubmit}>
                        {editingInbox ? 'Save Changes' : 'Create Inbox'}
                    </Button>
                </ModalFooter>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Kotak Masuk LK"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Untuk tim CS LK"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setForm({ ...form, color })}
                                    className={`w-8 h-8 rounded-full border-2 ${form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'} transition-transform`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link to Devices (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">Auto-route conversations from these devices to this inbox</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {devices.map((device) => (
                                <label key={device.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.device_ids.includes(device.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setForm({ ...form, device_ids: [...form.device_ids, device.id] });
                                            } else {
                                                setForm({ ...form, device_ids: form.device_ids.filter(id => id !== device.id) });
                                            }
                                        }}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <Smartphone className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm">{device.name}</span>
                                    <span className="text-xs text-gray-400">{device.whatsapp_number}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_default}
                            onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm">Set as default inbox</span>
                    </label>

                </form>
        </Modal>
    );

    const UserAssignmentModal = () => {
        const [inboxUsers, setInboxUsers] = useState([]);
        const [selectedUsers, setSelectedUsers] = useState([]);
        const [canManage, setCanManage] = useState(false);

        useEffect(() => {
            if (selectedInboxId) {
                fetchInboxUsers();
            }
        }, [selectedInboxId]);

        const fetchInboxUsers = async () => {
            try {
                const res = await axios.get(`/api/app/inboxes/${selectedInboxId}/users`);
                setInboxUsers(res.data);
                setSelectedUsers(res.data.map(u => u.id));
            } catch (err) {
                console.error(err);
            }
        };

        const handleSaveUsers = async () => {
            try {
                await axios.post(`/api/app/inboxes/${selectedInboxId}/users`, {
                    user_ids: selectedUsers,
                    can_manage: canManage
                });
                toast.success('Users updated');
                setShowUserModal(false);
            } catch (err) {
                toast.error(err.response?.data?.error || 'Failed to update users');
            }
        };

        return (
            <Modal
                isOpen={true}
                onClose={() => setShowUserModal(false)}
                title="Manage Inbox Access"
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveUsers}>Save Access</Button>
                    </ModalFooter>
                }
            >
                <div className="p-2">
                    <p className="text-sm text-gray-600 mb-4">
                        Select which team members can access this inbox. Users not selected will not see this inbox.
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                        {users.map((user) => (
                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedUsers([...selectedUsers, user.id]);
                                        } else {
                                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                        }
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                                <div className={`px-2 py-0.5 text-xs rounded ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {user.role}
                                </div>
                            </label>
                        ))}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input
                            type="checkbox"
                            checked={canManage}
                            onChange={(e) => setCanManage(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm">Selected users can manage this inbox</span>
                    </label>

                </div>
            </Modal>
        );
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Global Toggle Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inboxIsolationEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                Kotak Masuk Terpisah
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${inboxIsolationEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {inboxIsolationEnabled ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Aktifkan fitur ini untuk memisahkan akses kotak masuk berdasarkan tim/device.
                                Setiap user hanya bisa melihat percakapan di inbox yang mereka miliki.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggleIsolation(!inboxIsolationEnabled)}
                        disabled={savingSetting}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${inboxIsolationEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${inboxIsolationEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </button>
                </div>

                {inboxIsolationEnabled && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">
                            <strong>Perhatian:</strong> Setelah mengaktifkan, pastikan untuk assign user ke inbox yang sesuai di menu "Manage users" pada setiap inbox.
                            User yang tidak di-assign ke inbox manapun tidak akan bisa melihat percakapan manapun.
                        </p>
                    </div>
                )}
            </div>

            {/* Only show inbox management if enabled */}
            {!inboxIsolationEnabled && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Fitur Nonaktif</h3>
                    <p className="text-gray-500 mb-4">Aktifkan toggle di atas untuk mulai menggunakan Kotak Masuk Terpisah</p>
                </div>
            )}

            {inboxIsolationEnabled && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Daftar Inbox</h2>
                            <p className="text-gray-500 text-sm">Kelola inbox yang tersedia untuk tim Anda</p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setEditingInbox(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                            <Plus className="w-4 h-4" /> New Inbox
                        </button>
                    </div>

                    {inboxes.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Belum ada Kotak Masuk Terpisah</h3>
                            <p className="text-gray-500 mb-4">Buat kotak masuk terpisah untuk membatasi akses setiap tim</p>
                            <button
                                onClick={() => { resetForm(); setEditingInbox(null); setShowModal(true); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                            >
                                Buat Kotak Masuk Pertama
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {inboxes.map((inbox) => (
                                <div key={inbox.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                                style={{ backgroundColor: inbox.color || '#6366f1' }}
                                            >
                                                <Inbox className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-800">{inbox.name}</h3>
                                                    {inbox.is_default && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Default</span>
                                                    )}
                                                </div>
                                                {inbox.description && (
                                                    <p className="text-sm text-gray-500 mt-0.5">{inbox.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {inbox.has_access ? 'Akses dibatasi' : 'Semua user'}
                                                    </span>
                                                    {inbox.unread_count > 0 && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                                                            {inbox.unread_count} unread
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openUserModal(inbox.id)}
                                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Manage users"
                                            >
                                                <Users className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(inbox)}
                                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(inbox.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {showModal && <InboxFormModal />}
            {showUserModal && <UserAssignmentModal />}
        </div>
    );
}
