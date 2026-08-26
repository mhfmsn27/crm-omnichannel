import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, RefreshCw, Trash2, Edit, Pause, Play, Calendar } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import PaywallGuard from '../../components/common/PaywallGuard';
import { useConfig } from '../../context/ConfigContext';

export default function UpsellingPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const { hasFeature } = useConfig();

    useEffect(() => {
        if (hasFeature('feat_upselling')) {
            fetchCampaigns();
        } else {
            setLoading(false);
        }
    }, [hasFeature]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/app/upselling', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/app/upselling/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCampaigns();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const handleToggle = async (camp) => {
        const newStatus = camp.status === 'active' ? 'paused' : 'active';
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/app/upselling/${camp.id}`, { ...camp, status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(campaigns.map(c => c.id === camp.id ? { ...c, status: newStatus } : c));
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const filtered = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <PaywallGuard feature="feat_upselling" title="Upselling Campaign Actions Locked" description="Automate your sales with recurring broadcasts and upselling campaigns.">
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Upselling Campaign</h1>
                        <div className="text-sm text-gray-500 breadcrumbs">
                            <span>Dashboard</span> / <span className="text-indigo-600">Upselling Campaign</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchCampaigns} className="px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                        <Link to="create" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium shadow-sm">
                            <Plus className="w-4 h-4" /> Buat Campaign Baru
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <h3 className="font-bold text-gray-700">Daftar Upselling Campaign</h3>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Cari campaign..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Campaign Info</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Frekuensi Pengiriman</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Target & Kategori</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Template</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Tidak ada campaign</td></tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" /> Created: {new Date(c.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase">
                                                {c.frequency}
                                            </span>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Pukul {c.time && c.time.slice(0, 5)}
                                                {c.frequency === 'monthly' && ` (Tanggal ${c.day_of_month})`}
                                                {c.frequency === 'yearly' && ` (${c.day_of_month}/${c.month_of_year})`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700 capitalize">{c.target_type}</div>
                                            {c.target_type === 'label' && (
                                                <div className="text-xs text-gray-500">Labels selected</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 max-w-[200px] truncate">
                                                {c.message_template}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button
                                                onClick={() => handleToggle(c)}
                                                className={`p-1.5 rounded-lg border ${c.status === 'active' ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                                title={c.status === 'active' ? "Pause" : "Resume"}
                                            >
                                                {c.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PaywallGuard>
    );
}
