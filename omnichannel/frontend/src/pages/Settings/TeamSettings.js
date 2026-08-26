import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Trash2, Shield, Edit, Search, Tag, Settings, Globe, Facebook, Instagram, Send, Check, User, Lock, Smartphone, ChevronDown, ChevronRight, MessageCircle, Crown, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const COLOR_MAP = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
    gray:   { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
};
const getRoleColor = (color) => COLOR_MAP[color] || COLOR_MAP.blue;

const ALL_CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'messenger', label: 'Messenger' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'webchat', label: 'Webchat' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'tiktok', label: 'TikTok' },
];

// --- COMPONENT: Device Group ---
const DeviceGroup = ({ label, icon: Icon, devices, selectedDevices, onToggle }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (!devices || devices.length === 0) return null;

    const channelType = devices[0].type;
    const allSelected = devices.every(d => selectedDevices.includes(`${channelType}:${d.id}`));

    const toggleAll = (e) => {
        e.stopPropagation();
        const newIds = devices.map(d => `${channelType}:${d.id}`);
        if (allSelected) {
            // Remove all
            const remaining = selectedDevices.filter(id => !newIds.includes(id));
            onToggle(remaining, true); // Replace all
        } else {
            // Add missing
            const combined = [...new Set([...selectedDevices, ...newIds])];
            onToggle(combined, true);
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden bg-white">
            <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    <div className="p-1 bg-white rounded border border-gray-200 text-gray-500">
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{label}</span>
                    <span className="text-xs text-gray-400 font-normal">({devices.length})</span>
                </div>
                <button
                    onClick={toggleAll}
                    className="text-xs text-indigo-600 hover:underline font-bold px-2"
                >
                    {allSelected ? 'Unselect All' : 'Select All'}
                </button>
            </div>

            {isOpen && (
                <div className="p-2 grid grid-cols-1 gap-1 bg-white border-t border-gray-100">
                    {devices.map(d => {
                        const uniqueId = `${channelType}:${d.id}`;
                        const isChecked = selectedDevices.includes(uniqueId);
                        return (
                            <label key={d.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onToggle(uniqueId, false)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isChecked ? 'text-indigo-900' : 'text-gray-700'}`}>{d.name}</span>
                                    <span className="text-[10px] text-gray-500">{d.info}</span>
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function TeamSettings() {
    const [members, setMembers] = useState([]);
    const [customRoles, setCustomRoles] = useState([]);
    const [allPerms, setAllPerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [stats, setStats] = useState({ used: 0, limit: 0, allowed: true });
    const navigate = useNavigate();
    const { refreshToken } = useAuth();

    // Grouped Devices State
    const [groupedDevices, setGroupedDevices] = useState({
        whatsapp: [],
        messenger: [],
        instagram: [],
        telegram: [],
        webchat: []
    });

    const [form, setForm] = useState({
        id: null,
        name: '',
        email: '',
        password: '',
        role: 'agent',
        role_level: 1,
        permissions: [],
        assigned_devices: [],
        division: '',
        custom_role_id: null,
        handled_channels: ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok']
    });

    useEffect(() => {
        fetchTeam();
        fetchDevices();
        fetchRoles();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const [teamRes, statsRes] = await Promise.all([
                axios.get('/api/app/team'),
                axios.get('/api/app/team/stats')
            ]);
            setMembers(teamRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load team");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const [rolesRes, permsRes] = await Promise.all([
                axios.get('/api/app/roles'),
                axios.get('/api/app/roles/permissions'),
            ]);
            setCustomRoles(rolesRes.data);
            setAllPerms(permsRes.data);
        } catch (err) {
            console.error('Failed to fetch roles', err);
        }
    };

    const fetchDevices = async () => {
        try {
            const [devRes, msgRes, igRes, tgRes, wcRes] = await Promise.all([
                axios.get('/api/app/devices'),
                axios.get('/api/app/messenger/pages'),
                axios.get('/api/app/instagram/accounts'),
                axios.get('/api/app/telegram/bots'),
                axios.get('/api/app/webchat')
            ]);

            const groups = {
                whatsapp: devRes.data.map(d => ({ id: d.id, name: d.name, info: d.whatsapp_number, type: 'whatsapp' })),
                messenger: msgRes.data.map(d => ({ id: d.id, name: d.page_name, info: 'Facebook Page', type: 'messenger' })),
                instagram: igRes.data.map(d => ({ id: d.id, name: d.username, info: 'Instagram', type: 'instagram' })),
                telegram: tgRes.data.map(d => ({ id: d.id, name: d.first_name, info: `@${d.username}`, type: 'telegram' })),
                webchat: (Array.isArray(wcRes.data) ? wcRes.data : [wcRes.data]).filter(w => w.id).map(d => ({ id: d.id, name: d.name, info: 'Widget', type: 'webchat' }))
            };

            setGroupedDevices(groups);

        } catch (err) {
            console.error("Failed to fetch devices", err);
        }
    };

    const openCreate = () => {
        setForm({
            id: null, name: '', email: '', password: '',
            role: 'agent', role_level: 1, permissions: [],
            assigned_devices: [], division: '', custom_role_id: null, handled_channels: ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok']
        });
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
            assigned_devices: member.assigned_devices || [],
            division: member.division || '',
            custom_role_id: member.custom_role_id || null,
            handled_channels: Array.isArray(member.handled_channels) && member.handled_channels.length > 0 ? member.handled_channels : ['whatsapp', 'messenger', 'instagram', 'webchat', 'telegram', 'tiktok']
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleRoleTypeChange = (type) => {
        if (type === 'supervisor') {
            setForm(prev => ({
                ...prev, role: 'agent', role_level: 10, custom_role_id: null,
                permissions: prev.permissions.length > 0 ? prev.permissions : ['view_all_chats']
            }));
        } else if (type === 'admin') {
            setForm(prev => ({
                ...prev, role: 'admin_member', role_level: 100,
                permissions: [], assigned_devices: [], division: '', custom_role_id: null
            }));
        } else if (type === 'staff') {
            setForm(prev => ({
                ...prev, role: 'agent', role_level: 1, permissions: [],
                assigned_devices: [], division: '', custom_role_id: null
            }));
        }
    };

    const handleCustomRoleSelect = (roleId) => {
        if (!roleId) {
            setForm(prev => ({ ...prev, custom_role_id: null }));
            return;
        }
        const cr = customRoles.find(r => r.id.toString() === roleId.toString());
        if (!cr) return;
        setForm(prev => ({
            ...prev,
            custom_role_id: cr.id,
            role: cr.role_type,
            role_level: cr.role_level,
            permissions: Array.isArray(cr.permissions) ? cr.permissions : [],
        }));
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

    const handleDeviceToggle = (value, replace = false) => {
        if (replace) {
            setForm(prev => ({ ...prev, assigned_devices: value }));
        } else {
            // Value is ID string
            setForm(prev => {
                const current = prev.assigned_devices || [];
                if (current.includes(value)) {
                    return { ...prev, assigned_devices: current.filter(id => id !== value) };
                } else {
                    return { ...prev, assigned_devices: [...current, value] };
                }
            });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`/api/app/team/${form.id}`, form);
                toast.success("Member updated successfully");
                // Refresh token to sync permissions if this member was assigned a custom role
                if (form.custom_role_id) {
                    await refreshToken();
                }
            } else {
                if (!form.password) return toast.error("Password is required for new members");
                await axios.post('/api/app/team', form);
                toast.success("Member added successfully");
            }
            fetchTeam();
            setIsModalOpen(false);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // PERSONAL VERSION: Just show error
                toast.error("Failed: " + err.response.data.error);
                setIsModalOpen(false);
            } else {
                toast.error("Failed: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleRemove = async (id) => {
        if (!confirm("Remove this member? They will lose access immediately.")) return;
        try {
            await axios.delete(`/api/app/team/${id}`);
            fetchTeam();
            toast.success("Member removed");
        } catch (err) {
            toast.error("Failed to remove");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading team...</div>;

    const isLimitReached = false; // PERSONAL VERSION: Bypass Limit

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" /> Team Management
                    </h2>
                    <p className="text-gray-500 text-sm">Add agents to manage your inbox collaboratively.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                        {isLimitReached ? <Lock className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
                        <span>Seats: {stats.used} / {stats.limit}</span>
                    </div>
                    {!isLimitReached && (
                        <button onClick={openCreate} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
                            <UserPlus className="w-4 h-4" /> <span className="md:hidden">Add</span><span className="hidden md:inline">Add Member</span>
                        </button>
                    )}
                </div>
            </div>

            {/* PAYWALL CARD */}
            {isLimitReached && (
                <div className="mb-8 border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between group transition-all relative overflow-hidden gap-4">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                    <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-red-100 flex items-center justify-center flex-shrink-0">
                            <Lock className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <span className="font-bold text-lg text-gray-700 block">Agent Limit Reached</span>
                            <span className="text-xs text-gray-500">You have used {stats.used}/{stats.limit} seats.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/order')}
                        className="w-full md:w-auto z-10 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 animate-pulse"
                    >
                        Upgrade Plan <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* DESKTOP TABLE */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role Badge</th>
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
                                        <span className="font-medium text-gray-900">{m.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm">
                                    {m.email}
                                </td>
                                <td className="px-6 py-4">
                                    {m.custom_role_name ? (
                                        (() => {
                                            const c = getRoleColor(m.custom_role_color);
                                            return (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${c.bg} ${c.text} ${c.border}`}>
                                                    <Shield className="w-3 h-3" /> {m.custom_role_name}
                                                </span>
                                            );
                                        })()
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${m.role === 'admin_member' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                            {m.role === 'admin_member' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {m.role.replace('_member', '')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {m.role === 'admin_member' ? (
                                        <span className="font-bold text-gray-700">Full Access</span>
                                    ) : m.role_level >= 10 ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-indigo-600">Supervisor (Level {m.role_level})</span>
                                            <span className="text-[10px]">{m.permissions?.length || 0} Perms, {m.assigned_devices?.length === 0 ? 'All Devices' : `${m.assigned_devices.length} Devices`}</span>
                                            {m.division && <span className="text-[10px] font-semibold text-gray-500">Div: {m.division}</span>}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-blue-600">Staff (Assigned Only)</span>
                                            <span className="text-[10px]">{m.assigned_devices?.length === 0 ? 'All Devices' : `${m.assigned_devices.length} Devices`}</span>
                                            {m.division && <span className="text-[10px] font-semibold text-gray-500">Div: {m.division}</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleRemove(m.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="md:hidden space-y-4">
                {members.map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
                                    <p className="text-xs text-gray-500">{m.email}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRemove(m.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 items-center justify-between">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.role === 'admin_member' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                {m.role === 'admin_member' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {m.role.replace('_member', '')}
                            </span>

                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                {m.role === 'admin_member' ? 'Full Access' : (m.role_level >= 10 ? 'Super Agent' : 'Staff')}
                            </span>
                        </div>
                    </div>
                ))}
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
                        <Button onClick={handleSave}>{isEditing ? 'Save Changes' : 'Add Member'}</Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSave} className="space-y-5">

                    {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                    <input
                                        className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                    <input
                                        className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password {isEditing && '(Optional)'}</label>
                                    <input
                                        className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder={isEditing ? "Leave empty to keep current" : "••••••••"}
                                    />
                                </div>
                            </div>

                            {/* Role Configuration */}
                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Role & Access Level</label>

                                {/* Custom Role Selector */}
                                {customRoles.length > 0 && (
                                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                        <label className="block text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Gunakan Role Kustom (Opsional)
                                        </label>
                                        <select
                                            className="w-full border border-indigo-200 p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={form.custom_role_id || ''}
                                            onChange={e => handleCustomRoleSelect(e.target.value)}
                                        >
                                            <option value="">-- Pilih Role Kustom --</option>
                                            {customRoles.map(cr => (
                                                <option key={cr.id} value={cr.id}>{cr.name} (Level {cr.role_level})</option>
                                            ))}
                                        </select>
                                        {form.custom_role_id && (
                                            <p className="text-xs text-indigo-600 mt-1">
                                                Role kustom aktif — permission & level diatur otomatis dari role ini.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Option: Staff */}
                                    <label className={`p-3 border rounded-lg cursor-pointer flex items-start gap-3 transition-all ${form.role === 'agent' && form.role_level < 10 ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <input
                                            type="radio"
                                            name="roletype"
                                            checked={form.role === 'agent' && form.role_level < 10}
                                            onChange={() => handleRoleTypeChange('staff')}
                                            className="mt-1 text-blue-600"
                                        />
                                        <div>
                                            <span className="block font-bold text-sm text-gray-900">Staff (Agent)</span>
                                            <span className="block text-xs text-gray-500 mt-0.5">Basic access. Can only see and reply to chats assigned specifically to them.</span>
                                        </div>
                                    </label>

                                    {/* Option: Supervisor */}
                                    <label className={`p-3 border rounded-lg cursor-pointer flex items-start gap-3 transition-all ${form.role === 'agent' && form.role_level >= 10 ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <input
                                            type="radio"
                                            name="roletype"
                                            checked={form.role === 'agent' && form.role_level >= 10}
                                            onChange={() => handleRoleTypeChange('supervisor')}
                                            className="mt-1 text-indigo-600"
                                        />
                                        <div>
                                            <span className="block font-bold text-sm text-gray-900">Supervisor (Super Agent)</span>
                                            <span className="block text-xs text-gray-500 mt-0.5">Can view all chats (or restricted by device), transfer conversations, and manage selected data.</span>
                                        </div>
                                    </label>

                                    {/* Option: Admin */}
                                    <label className={`p-3 border rounded-lg cursor-pointer flex items-start gap-3 transition-all ${form.role === 'admin_member' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <input
                                            type="radio"
                                            name="roletype"
                                            checked={form.role === 'admin_member'}
                                            onChange={() => handleRoleTypeChange('admin')}
                                            className="mt-1 text-purple-600"
                                        />
                                        <div>
                                            <span className="block font-bold text-sm text-gray-900">Admin</span>
                                            <span className="block text-xs text-gray-500 mt-0.5">Full access to Billing, Settings, Team, and all system features.</span>
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
                                        <label key={ch.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded border border-gray-100 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={(form.handled_channels || []).includes(ch.id)}
                                                onChange={() => handleChannelToggle(ch.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{ch.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Pilih channel pesan mana saja yang dapat dihandle oleh user ini.</p>
                            </div>

                            {/* Permissions & Devices & Division */}
                            {form.role === 'agent' && (
                                <>
                                    {/* SUPERVISOR VIEW: DEFINE DIVISION */}
                                    {form.role_level >= 10 && (
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2 mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Crown className="w-4 h-4 text-purple-600" />
                                                <label className="text-xs font-bold text-gray-500 uppercase">Managed Division</label>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">Assign this Supervisor to lead a specific division. Staff can then join this division.</p>
                                            <input
                                                className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700 uppercase"
                                                placeholder="e.g. SALES, SUPPORT"
                                                value={form.division}
                                                onChange={e => setForm({ ...form, division: e.target.value.toUpperCase() })}
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* AGENT VIEW: SELECT DIVISION */}
                                    {form.role_level < 10 && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2 mb-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Division Assignment</label>
                                            <p className="text-xs text-gray-500 mb-2">Select the division this agent belongs to. A Supervisor must exist for this division.</p>

                                            {(() => {
                                                // Calculate available divisions from existing supervisors
                                                const availableDivisions = [...new Set(members
                                                    .filter(m => m.role_level >= 10 && m.division)
                                                    .map(m => m.division)
                                                )];

                                                // If editing and user has a division not in list (legacy or manual), add it to prevent blank
                                                if (form.division && !availableDivisions.includes(form.division)) {
                                                    availableDivisions.push(form.division);
                                                }

                                                if (availableDivisions.length === 0) {
                                                    return (
                                                        <div className="p-3 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
                                                            <Shield className="w-4 h-4" />
                                                            <span>No Supervisors found. Please create a <b>Supervisor</b> first to define a division.</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <select
                                                        className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                        value={form.division}
                                                        onChange={e => setForm({ ...form, division: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Division --</option>
                                                        {availableDivisions.map(div => (
                                                            <option key={div} value={div}>{div}</option>
                                                        ))}
                                                    </select>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* SUPERVISOR ONLY: PERMISSIONS */}
                                    {form.role_level >= 10 && !form.custom_role_id && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                <Lock className="w-3 h-3" /> Granular Permissions
                                            </label>
                                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                {(allPerms.length > 0 ? allPerms : []).map(p => (
                                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.permissions.includes(p.id)}
                                                            onChange={() => handlePermissionToggle(p.id)}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                        />
                                                        <span className="text-sm text-gray-700">{p.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {form.role_level >= 10 && form.custom_role_id && (
                                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-700">
                                            Permission diatur otomatis dari role kustom yang dipilih ({form.permissions.length} permission aktif).
                                        </div>
                                    )}

                                    {/* AGENT (STAFF & SUPERVISOR): DEVICE MANAGE */}
                                    {form.role === 'agent' && (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2 mt-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                <Smartphone className="w-3 h-3" /> Device Access (Leave empty for ALL)
                                            </label>

                                            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                                <DeviceGroup
                                                    label="WhatsApp Devices"
                                                    icon={MessageCircle}
                                                    devices={groupedDevices.whatsapp}
                                                    selectedDevices={form.assigned_devices}
                                                    onToggle={handleDeviceToggle}
                                                />
                                                <DeviceGroup
                                                    label="Messenger Pages"
                                                    icon={Facebook}
                                                    devices={groupedDevices.messenger}
                                                    selectedDevices={form.assigned_devices}
                                                    onToggle={handleDeviceToggle}
                                                />
                                                <DeviceGroup
                                                    label="Instagram Accounts"
                                                    icon={Instagram}
                                                    devices={groupedDevices.instagram}
                                                    selectedDevices={form.assigned_devices}
                                                    onToggle={handleDeviceToggle}
                                                />
                                                <DeviceGroup
                                                    label="Telegram Bots"
                                                    icon={Send}
                                                    devices={groupedDevices.telegram}
                                                    selectedDevices={form.assigned_devices}
                                                    onToggle={handleDeviceToggle}
                                                />
                                                <DeviceGroup
                                                    label="Webchat Widgets"
                                                    icon={Globe}
                                                    devices={groupedDevices.webchat}
                                                    selectedDevices={form.assigned_devices}
                                                    onToggle={handleDeviceToggle}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </form>
            </Modal>
        </div>
    );
}
