import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Trash2, Shield, User, Edit, Lock, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../components/common/Modal';
import Button from '../components/common/Button';

const PERMISSIONS_LIST = [
    { id: 'view_all_chats', label: 'View All Chats (Super Agent)' },
    { id: 'manage_contacts', label: 'Manage Contacts (Create/Edit/Delete)' },
    { id: 'manage_labels', label: 'Manage Labels' },
    { id: 'manage_broadcast', label: 'Access Broadcast & Campaigns' },
    { id: 'manage_chatbot', label: 'Configure Chatbot & Knowledge Base' },
    { id: 'view_reports', label: 'View Reports' }
];

const ALL_CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'messenger', label: 'Messenger' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'webchat', label: 'Webchat' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'tiktok', label: 'TikTok' },
];

const DIVISIONS = [
    { value: 'CS', label: 'CS – Customer Service' },
    { value: 'AE', label: 'AE – Account Executive' },
    { value: 'CRM', label: 'CRM – Customer Relations' },
];

const ROLE_COLOR_MAP = {
    blue:   { bg: '#dbeafe', text: '#1d4ed8' },
    green:  { bg: '#dcfce7', text: '#15803d' },
    red:    { bg: '#fee2e2', text: '#b91c1c' },
    yellow: { bg: '#fef9c3', text: '#a16207' },
    purple: { bg: '#f3e8ff', text: '#7e22ce' },
    pink:   { bg: '#fce7f3', text: '#be185d' },
    indigo: { bg: '#e0e7ff', text: '#4338ca' },
    orange: { bg: '#ffedd5', text: '#c2410c' },
    gray:   { bg: '#f3f4f6', text: '#4b5563' },
};

const DIVISION_COLORS = { CS: 'bg-blue-100 text-blue-700', AE: 'bg-emerald-100 text-emerald-700', CRM: 'bg-orange-100 text-orange-700' };

export default function TeamPage() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [customRoles, setCustomRoles] = useState([]);

    const [form, setForm] = useState({
        id: null,
        name: '',
        email: '',
        password: '',
        role: 'agent',
        role_level: 1,
        permissions: [],
        division: 'CS',
        custom_role_id: null,
        shift_start: '',
        shift_end: '',
        handled_channels: ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok'],
    });

    useEffect(() => {
        fetchTeam();
        fetchCustomRoles();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/team');
            setMembers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomRoles = async () => {
        try {
            const res = await axios.get('/api/app/roles');
            setCustomRoles(res.data);
        } catch (err) {
            console.error('[TeamPage] Failed to load custom roles:', err);
        }
    };

    const openCreate = () => {
        setForm({ id: null, name: '', email: '', password: '', role: 'agent', role_level: 1, permissions: [], division: 'CS', custom_role_id: null, shift_start: '', shift_end: '', handled_channels: ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok'] });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEdit = (member) => {
        setForm({
            id: member.id,
            name: member.name,
            email: member.email,
            password: '',
            role: member.role,
            role_level: member.role_level || 1,
            permissions: member.permissions || [],
            division: member.division || 'CS',
            custom_role_id: member.custom_role_id || null,
            shift_start: member.shift_start || '',
            shift_end: member.shift_end || '',
            handled_channels: Array.isArray(member.handled_channels) && member.handled_channels.length > 0 ? member.handled_channels : ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok'],
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handlePermissionToggle = (permId) => {
        setForm(prev => {
            const current = prev.permissions || [];
            if (current.includes(permId)) {
                return { ...prev, permissions: current.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...current, permId] };
            }
        });
    };

    const handleChannelToggle = (chId) => {
        setForm(prev => {
            const current = prev.handled_channels || [];
            if (current.includes(chId)) {
                return { ...prev, handled_channels: current.filter(c => c !== chId) };
            } else {
                return { ...prev, handled_channels: [...current, chId] };
            }
        });
    };

    const handleRoleTypeChange = (type) => {
        if (type === 'supervisor') {
            setForm(prev => ({ ...prev, role_level: 10, permissions: ['view_all_chats'], custom_role_id: null }));
        } else {
            setForm(prev => ({ ...prev, role_level: 1, permissions: [], custom_role_id: null }));
        }
    };

    const handleCustomRoleChange = (roleId) => {
        if (!roleId) {
            setForm(prev => ({ ...prev, custom_role_id: null }));
            return;
        }
        const cr = customRoles.find(r => String(r.id) === String(roleId));
        if (cr) {
            const perms = Array.isArray(cr.permissions) ? cr.permissions : [];
            setForm(prev => ({
                ...prev,
                custom_role_id: cr.id,
                role: cr.role_type,
                role_level: cr.role_level,
                permissions: perms,
            }));
        } else {
            toast.error("Custom role not found. Please refresh the page.");
            setForm(prev => ({ ...prev, custom_role_id: null }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (payload.role === 'admin_member') {
                payload.role_level = 100;
                payload.permissions = [];
                payload.division = null;
            }

            if (isEditing) {
                await axios.put(`/api/app/team/${form.id}`, payload);
                toast.success("Member updated successfully");
            } else {
                if (!form.password) return toast.error("Password is required for new members");
                await axios.post('/api/app/team', payload);
                toast.success("Member added successfully");
            }
            fetchTeam();
            setIsModalOpen(false);
        } catch (err) {
            toast.error("Failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleRemove = async (id) => {
        if (!confirm("Remove this member? They will lose access immediately.")) return;
        try {
            await axios.delete(`/api/app/team/${id}`);
            fetchTeam();
            toast.success("Member removed");
        } catch (err) {
            toast.error("Failed remove");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading team...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6 md:mb-8">
                <div>
                    <h2 className="text-xl md:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" /> Team Management
                    </h2>
                    <p className="text-gray-500 text-sm">Add agents to manage your inbox collaboratively.</p>
                </div>
                <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <UserPlus className="w-4 h-4" /> Add Member
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Division</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Access Level</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {members.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-900">{m.name}</span>
                                            {m.custom_role_name && (() => {
                                                const c = ROLE_COLOR_MAP[m.custom_role_color] || ROLE_COLOR_MAP.gray;
                                                return (
                                                    <span
                                                        className="ml-2 inline-flex px-1.5 py-0.5 rounded text-xs font-bold"
                                                        style={{ backgroundColor: c.bg, color: c.text }}
                                                    >
                                                        {m.custom_role_name}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{m.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${m.role === 'admin_member' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                        {m.role === 'admin_member' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                        {m.role.replace('_member', '')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {m.division ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${DIVISION_COLORS[m.division] || 'bg-gray-100 text-gray-600'}`}>
                                            <Briefcase className="w-3 h-3" />
                                            {m.division}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {m.role === 'admin_member' ? 'Full Access' :
                                        (m.role_level >= 10 ? `Supervisor (${m.permissions?.length || 0} Perms)` : 'Staff (Assigned Only)')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleRemove(m.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Team Member' : 'Add New Team Member'}
                size="lg"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>
                            {isEditing ? 'Save Changes' : 'Add Member'}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSave} className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                    <input
                                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input
                                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password {isEditing && '(Optional)'}</label>
                                    <input
                                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Role: Admin or Agent */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex items-center gap-2 ${form.role === 'agent' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                                        <input type="radio" name="mainrole" checked={form.role === 'agent'} onChange={() => setForm(prev => ({ ...prev, role: 'agent', role_level: 1, permissions: [], division: prev.division || 'CS', custom_role_id: null }))} />
                                        <div>
                                            <span className="block font-bold text-sm text-gray-900">Agent</span>
                                            <span className="block text-xs text-gray-500">Handles conversations</span>
                                        </div>
                                    </label>
                                    <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex items-center gap-2 ${form.role === 'admin_member' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-200' : 'hover:bg-gray-50'}`}>
                                        <input type="radio" name="mainrole" checked={form.role === 'admin_member'} onChange={() => setForm(prev => ({ ...prev, role: 'admin_member', role_level: 100, permissions: [], division: null, custom_role_id: null }))} />
                                        <div>
                                            <span className="block font-bold text-sm text-gray-900">Admin</span>
                                            <span className="block text-xs text-gray-500">Full access</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Handled Channels */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                    Handled Channels
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {ALL_CHANNELS.map(ch => (
                                        <label key={ch.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={(form.handled_channels || []).includes(ch.id)}
                                                onChange={() => handleChannelToggle(ch.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{ch.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Pilih channel pesan mana saja yang dapat dihandle oleh user ini.</p>
                            </div>

                            {/* Agent-only fields */}
                            {form.role === 'agent' && (
                                <>
                                    {/* Division */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" /> Division
                                            </label>
                                            <select
                                                className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                value={form.division || 'CS'}
                                                onChange={e => setForm({ ...form, division: e.target.value })}
                                                required
                                            >
                                                {DIVISIONS.map(d => (
                                                    <option key={d.value} value={d.value}>{d.label}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-400 mt-1">Auto-assignment routes new inbound chats to CS agents first.</p>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                                Shift Schedule
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                    value={form.shift_start || ''}
                                                    onChange={e => setForm({ ...form, shift_start: e.target.value })}
                                                />
                                                <span className="text-gray-500 text-sm">to</span>
                                                <input
                                                    type="time"
                                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                    value={form.shift_end || ''}
                                                    onChange={e => setForm({ ...form, shift_end: e.target.value })}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Leave blank for 24h access.</p>
                                        </div>
                                    </div>

                                    {/* Custom Role (optional) */}
                                    {customRoles.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Custom Role (Optional)</label>
                                            <select
                                                className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                value={form.custom_role_id || ''}
                                                onChange={e => handleCustomRoleChange(e.target.value)}
                                            >
                                                <option value="">— Use manual configuration below —</option>
                                                {customRoles.filter(cr => cr.role_type === 'agent').map(cr => (
                                                    <option key={cr.id} value={cr.id}>{cr.name} (Level {cr.role_level})</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-400 mt-1">Selecting a custom role overrides role type and permissions below.</p>
                                        </div>
                                    )}

                                    {/* Agent level (Staff / Supervisor) */}
                                    {!form.custom_role_id && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Access Level</label>
                                            <div className="flex flex-col gap-2">
                                                <label className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${form.role_level < 10 ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                                                    <input
                                                        type="radio"
                                                        name="roletype"
                                                        checked={form.role_level < 10}
                                                        onChange={() => handleRoleTypeChange('staff')}
                                                        className="text-blue-600"
                                                    />
                                                    <div>
                                                        <span className="block font-bold text-sm text-gray-900">Staff</span>
                                                        <span className="block text-xs text-gray-500">Only sees assigned chats in their division.</span>
                                                    </div>
                                                </label>
                                                <label className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${form.role_level >= 10 ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-200' : 'hover:bg-gray-50'}`}>
                                                    <input
                                                        type="radio"
                                                        name="roletype"
                                                        checked={form.role_level >= 10}
                                                        onChange={() => handleRoleTypeChange('supervisor')}
                                                        className="text-purple-600"
                                                    />
                                                    <div>
                                                        <span className="block font-bold text-sm text-gray-900">Supervisor</span>
                                                        <span className="block text-xs text-gray-500">Can monitor all chats in their division and transfer.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Permissions (only for Supervisor, no custom role) */}
                                    {form.role_level >= 10 && !form.custom_role_id && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                <Lock className="w-3 h-3" /> Additional Permissions
                                            </label>
                                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                {PERMISSIONS_LIST.map(p => (
                                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.permissions.includes(p.id)}
                                                            onChange={() => handlePermissionToggle(p.id)}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm text-gray-700">{p.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom role summary */}
                                    {form.custom_role_id && (() => {
                                        const cr = customRoles.find(r => String(r.id) === String(form.custom_role_id));
                                        return cr ? (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
                                                <span className="font-bold">{cr.name}</span>: Level {cr.role_level} · {(cr.permissions || []).length} permissions applied
                                            </div>
                                        ) : null;
                                    })()}
                                </>
                            )}

                        </form>
            </Modal>
        </div>
    );
}
