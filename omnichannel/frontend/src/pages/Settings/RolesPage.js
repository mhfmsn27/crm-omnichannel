import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Shield, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const COLOR_OPTIONS = [
    { value: 'blue',   label: 'Biru',   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
    { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    { value: 'purple', label: 'Ungu',   bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { value: 'green',  label: 'Hijau',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
    { value: 'orange', label: 'Oranye', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    { value: 'red',    label: 'Merah',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
    { value: 'gray',   label: 'Abu',    bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
];

const getColorClass = (color) =>
    COLOR_OPTIONS.find(c => c.value === color) || COLOR_OPTIONS[0];

const RoleBadge = ({ name, color }) => {
    const c = getColorClass(color);
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${c.bg} ${c.text} ${c.border}`}>
            <Shield className="w-3 h-3" />
            {name}
        </span>
    );
};

const PermissionGroup = ({ group, perms, selected, onToggle }) => {
    const [open, setOpen] = useState(true);
    const allChecked = perms.every(p => selected.includes(p.id));
    const toggleAll = () => {
        if (allChecked) {
            onToggle(selected.filter(id => !perms.map(p => p.id).includes(id)));
        } else {
            const merged = [...new Set([...selected, ...perms.map(p => p.id)])];
            onToggle(merged);
        }
    };
    return (
        <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{group}</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); toggleAll(); }} className="text-xs text-indigo-600 hover:underline font-bold">
                    {allChecked ? 'Hapus Semua' : 'Pilih Semua'}
                </button>
            </div>
            {open && (
                <div className="p-3 grid grid-cols-1 gap-1.5 bg-white">
                    {perms.map(p => (
                        <label key={p.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${selected.includes(p.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                            <input
                                type="checkbox"
                                checked={selected.includes(p.id)}
                                onChange={() => {
                                    if (selected.includes(p.id)) {
                                        onToggle(selected.filter(id => id !== p.id));
                                    } else {
                                        onToggle([...selected, p.id]);
                                    }
                                }}
                                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 flex-shrink-0"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-800">{p.label}</span>
                                {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const EMPTY_FORM = { id: null, name: '', description: '', role_type: 'agent', role_level: 1, permissions: [], color: 'blue' };

export default function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [allPerms, setAllPerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { refreshToken } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                axios.get('/api/app/roles'),
                axios.get('/api/app/roles/permissions'),
            ]);
            setRoles(rolesRes.data);
            setAllPerms(permsRes.data);
        } catch (err) {
            toast.error('Gagal memuat data role');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (role) => {
        setForm({
            id: role.id,
            name: role.name,
            description: role.description || '',
            role_type: role.role_type,
            role_level: role.role_level,
            permissions: Array.isArray(role.permissions) ? role.permissions : [],
            color: role.color || 'blue',
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (form.id) {
                await axios.put(`/api/app/roles/${form.id}`, form);
                toast.success('Role berhasil diupdate');
                // Refresh token to get updated permissions
                await refreshToken();
            } else {
                await axios.post('/api/app/roles', form);
                toast.success('Role berhasil dibuat');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan role');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Hapus role "${name}"? Semua user yang memiliki role ini akan direset.`)) return;
        try {
            await axios.delete(`/api/app/roles/${id}`);
            toast.success('Role dihapus');
            // Refresh token to get updated permissions
            await refreshToken();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menghapus');
        }
    };

    // Group permissions by group key
    const permsByGroup = allPerms.reduce((acc, p) => {
        if (!acc[p.group]) acc[p.group] = [];
        acc[p.group].push(p);
        return acc;
    }, {});

    const levelLabel = (level, type) => {
        if (type === 'admin_member') return 'Admin Penuh';
        if (level >= 10) return 'Supervisor';
        return 'Staff';
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat data role...</div>;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" /> Manajemen Role
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Buat role kustom dengan permission yang dapat dikonfigurasi untuk setiap anggota tim.</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm text-sm">
                    <Plus className="w-4 h-4" /> Buat Role
                </button>
            </div>

            {/* Roles list */}
            {roles.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Belum ada role kustom</p>
                    <p className="text-sm mt-1">Buat role pertama untuk mengatur hak akses tim Anda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {roles.map(role => {
                        const permsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                        return (
                            <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-indigo-200 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                        <RoleBadge name={role.name} color={role.color} />
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                            {levelLabel(role.role_level, role.role_type)}
                                        </span>
                                        <span className="text-xs text-gray-400">Level {role.role_level}</span>
                                    </div>
                                    {role.description && <p className="text-sm text-gray-500 mt-1 truncate">{role.description}</p>}
                                    <p className="text-xs text-gray-400 mt-1">{permsCount} permission aktif</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => openEdit(role)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(role.id, role.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <strong>Cara kerja:</strong> Role kustom menggantikan pengaturan permission individual. Saat menambah anggota tim, pilih role kustom dan permission akan otomatis diterapkan.
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? 'Edit Role' : 'Buat Role Baru'}
                size="lg"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving} icon={<Save className="w-4 h-4"/>}>
                            {saving ? 'Menyimpan...' : (form.id ? 'Simpan Perubahan' : 'Buat Role')}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSave} className="space-y-5 p-2">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Role <span className="text-red-500">*</span></label>
                        <input
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="cth. Sales Manager, CS Senior"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                        <input
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Opsional — jelaskan fungsi role ini"
                        />
                    </div>

                            {/* Role Type + Level */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Role</label>
                                    <select
                                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={form.role_type}
                                        onChange={e => {
                                            const t = e.target.value;
                                            setForm(prev => ({
                                                ...prev,
                                                role_type: t,
                                                role_level: t === 'admin_member' ? 99 : prev.role_level < 10 ? prev.role_level : 10
                                            }));
                                        }}
                                    >
                                        <option value="agent">Agent</option>
                                        <option value="admin_member">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Level Akses <span className="text-gray-400 font-normal">(1–99)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={99}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={form.role_level}
                                        onChange={e => setForm({ ...form, role_level: parseInt(e.target.value) || 1 })}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">≥10 = Supervisor, &lt;10 = Staff</p>
                                </div>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warna Badge</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: c.value })}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${c.bg} ${c.text} ${c.border} ${form.color === c.value ? 'ring-2 ring-offset-1 ring-indigo-500' : 'opacity-60 hover:opacity-100'}`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <RoleBadge name={form.name || 'Preview'} color={form.color} />
                                </div>
                            </div>

                            {/* Permissions — only for agent type */}
                            {form.role_type === 'agent' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Permission</label>
                                    {Object.entries(permsByGroup).map(([group, perms]) => (
                                        <PermissionGroup
                                            key={group}
                                            group={group}
                                            perms={perms}
                                            selected={form.permissions}
                                            onToggle={newPerms => setForm({ ...form, permissions: newPerms })}
                                        />
                                    ))}
                                </div>
                            )}
                            {form.role_type === 'admin_member' && (
                                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                                    Admin memiliki akses penuh ke semua fitur. Permission individual tidak berlaku.
                                </div>
                            )}

                        </form>
            </Modal>
        </div>
    );
}
