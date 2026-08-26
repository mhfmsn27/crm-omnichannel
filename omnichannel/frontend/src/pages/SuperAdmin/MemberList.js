import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Power, Trash2, ShieldCheck, Mail, Plus, X, Loader2, BarChart2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import MemberReportModal from '../../components/common/MemberReportModal';

export default function MemberList() {
    const [members, setMembers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [meta, setMeta] = useState({});

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', password: '', organization_name: '' });
    const [creating, setCreating] = useState(false);

    // Report Modal State
    const [selectedReportMember, setSelectedReportMember] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => fetchMembers(), 500);
        return () => clearTimeout(timer);
    }, [search, page, limit]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/sa/members`, {
                params: { search, page, limit }
            });
            if (res.data.data) {
                setMembers(res.data.data);
                setMeta(res.data.meta);
            } else {
                setMembers(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMember = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await axios.post('/api/sa/members', newMember);
            toast.success("Member created successfully!");
            setShowModal(false);
            setNewMember({ name: '', email: '', password: '', organization_name: '' });
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create member");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (member) => {
        if (!confirm(`Are you sure you want to ${member.is_active ? 'SUSPEND' : 'ACTIVATE'} this organization?`)) return;
        try {
            await axios.post(`/api/sa/members/${member.id}/toggle-status`, {
                is_active: !member.is_active
            });
            fetchMembers();
            toast.success("Status Updated");
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this member? This will delete all their data (users, chats, etc) and cannot be undone.")) return;
        try {
            await axios.delete(`/api/sa/members/${id}`);
            toast.success("Member deleted");
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete member");
        }
    };

    return (
        <div className="p-8 h-full flex flex-col relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
                    <p className="text-sm text-gray-500">View and manage system users/organizations.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Member
                    </button>

                    <select
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={limit}
                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    >
                        <option value={10}>10 Rows</option>
                        <option value={20}>20 Rows</option>
                        <option value={50}>50 Rows</option>
                    </select>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Organization</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Owner Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {members.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                                            <p className="text-xs text-gray-500">ID: {m.id}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Mail className="w-4 h-4 text-gray-400" /> {m.owner_email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.is_active ? (
                                            <span className="flex items-center w-fit gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                                <ShieldCheck className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center w-fit gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                <Power className="w-3 h-3" /> Suspended
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/members/${m.id}`)}
                                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedReportMember(m)}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-gray-200"
                                                title="View Reports"
                                            >
                                                <BarChart2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(m)}
                                                className={`p-2 rounded-lg transition-colors border ${m.is_active ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 border-gray-200' : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'}`}
                                                title={m.is_active ? "Suspend" : "Activate"}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(m.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                                                title="Delete Member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && members.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No members found.
                                    </td>
                                    -</tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">
                        Showing page {meta.page || 1} of {meta.last_page || 1} (Total: {meta.total || 0})
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= (meta.last_page || 1)}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* ADD MEMBER MODAL */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add New Member"
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateMember} disabled={creating} icon={creating && <Loader2 className="w-4 h-4 animate-spin" />}>
                            {creating ? "Creating..." : "Create Member"}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleCreateMember} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. My Company"
                                    value={newMember.organization_name}
                                    onChange={e => setNewMember({ ...newMember, organization_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Admin Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. John Doe"
                                    value={newMember.name}
                                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="admin@example.com"
                                    value={newMember.email}
                                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="******"
                                    value={newMember.password}
                                    onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                                />
                            </div>
                        </form>
            </Modal>

            {/* REPORT MODAL */}
            {selectedReportMember && (
                <MemberReportModal
                    member={selectedReportMember}
                    onClose={() => setSelectedReportMember(null)}
                />
            )}
        </div>
    );
}

