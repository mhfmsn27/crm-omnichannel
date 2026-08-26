import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Plus, CheckCircle, AlertCircle, Trash2, Edit, Users, Smartphone, Lock, Crown, ArrowRight, Activity, TrendingUp, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import Modal, { ModalFooter } from '../../components/common/Modal';

// --- COMPONENT: Rotator Card ---
const RotatorItem = ({ rotator, onDelete, onEdit }) => {
    const avgHealth = rotator.avg_health || 0;
    const totalMessages = rotator.total_messages || 0;
    const healthColor = avgHealth >= 80 ? 'text-green-600' : avgHealth >= 60 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">{rotator.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{rotator.description || 'No description'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(rotator)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Edit Group">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(rotator.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Delete Group">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Device Health Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Health Score</span>
                    </div>
                    <span className={`text-lg font-bold ${healthColor}`}>{avgHealth.toFixed(0)}%</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Messages</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{totalMessages.toLocaleString()}</span>
                </div>
            </div>

            {/* Device List */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Linked Devices</span>
                </div>
                <span className="font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">{rotator.device_count}</span>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export default function RotatorManager() {
    const socket = useSocket();
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [rotators, setRotators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ allowed: true, locked: false });

    // Modal States
    const [isCreateRotatorOpen, setIsCreateRotatorOpen] = useState(false);
    const [rotatorForm, setRotatorForm] = useState({ id: null, name: '', description: '', sessionIds: [] });
    const [isEditingRotator, setIsEditingRotator] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [devRes, rotRes, statRes] = await Promise.all([
                axios.get('/api/app/devices?exclude_status=terblokir'),
                axios.get('/api/app/broadcast/groups'),
                axios.get('/api/app/rotators/stats')
            ]);
            setDevices(devRes.data);
            setRotators(rotRes.data);
            setStats(statRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    // Rotator Actions (Create & Edit)
    const openCreateRotator = () => {
        setRotatorForm({ id: null, name: '', description: '', sessionIds: [] });
        setIsEditingRotator(false);
        setIsCreateRotatorOpen(true);
    };

    const openEditRotator = (rotator) => {
        setRotatorForm({
            id: rotator.id,
            name: rotator.name,
            description: rotator.description,
            sessionIds: rotator.session_ids || []
        });
        setIsEditingRotator(true);
        setIsCreateRotatorOpen(true);
    };

    const handleSaveRotator = async () => {
        if (!rotatorForm.name) return toast.error("Nama grup wajib diisi");
        if (rotatorForm.sessionIds.length < 2) return toast.error("Pilih minimal 2 perangkat yang terhubung");

        try {
            if (isEditingRotator) {
                await axios.put(`/api/app/rotators/${rotatorForm.id}`, rotatorForm);
                toast.success("Grup berhasil diperbarui");
            } else {
                await axios.post('/api/app/rotators', rotatorForm);
                toast.success("Grup berhasil dibuat");
            }
            setIsCreateRotatorOpen(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                if (confirm(`⚠️ Feature Locked!\n\n${err.response.data.error}\n\nUpgrade your plan to enable Rotator?`)) {
                    navigate('/order');
                }
            } else {
                toast.error("Gagal: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleDeleteRotator = async (id) => {
        if (!confirm("Delete this rotator group? (Devices will not be deleted)")) return;
        try {
            await axios.delete(`/api/app/rotators/${id}`);
            toast.success("Grup dihapus");
            fetchData();
        } catch (err) {
            toast.error("Gagal menghapus grup");
        }
    };

    const toggleDeviceSelection = (id) => {
        setRotatorForm(prev => {
            const ids = prev.sessionIds.includes(id)
                ? prev.sessionIds.filter(x => x !== id)
                : [...prev.sessionIds, id];
            return { ...prev, sessionIds: ids };
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Minimal Socket Listener just to keep device status updated
    useEffect(() => {
        if (!socket || !socket.on) return;
        socket.on('device_status_update', ({ sessionId, status, phone }) => {
            setDevices(prev => prev.map(d => d.session_id === sessionId ? { ...d, status, whatsapp_number: phone } : d));
        });
        return () => {
            if (socket && socket.off) {
                socket.off('device_status_update');
            }
        };
    }, [socket]);

    // Logic for valid devices to select: Only Connected devices
    // Official devices are NOT supported in Rotators
    const validDevices = devices.filter(d =>
        d.type !== 'official' && d.status?.toLowerCase() === 'connected'
    );

    const isBlocked = stats.locked;

    if (loading) return <div className="p-8 text-center text-gray-400 flex flex-col items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>Loading Manager...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" /> Rotator Groups
                    </h2>
                    <p className="text-gray-500 text-sm">Manage groups of devices for load balancing broadcasts.</p>
                </div>

                {!isBlocked && (
                    <button
                        onClick={openCreateRotator}
                        disabled={validDevices.length < 2}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create New Group
                    </button>
                )}
            </div>

            {validDevices.length < 2 && !isBlocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span>
                        You need at least <strong>2 connected WhatsApp devices</strong> to create a rotator group.
                        Please go to <a href="/integrations/whatsapp" className="underline font-bold hover:text-yellow-900">WhatsApp</a> to add more.
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* PAYWALL CARD */}
                {isBlocked && (
                    <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px] group transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-red-100 flex items-center justify-center mb-4 z-10">
                            <Lock className="w-8 h-8 text-red-400" />
                        </div>
                        <span className="font-bold text-lg text-gray-700 z-10 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-yellow-500" /> Premium Feature
                        </span>
                        <span className="text-xs mt-2 text-gray-500 max-w-[80%] z-10 mb-6">
                            Unlock Rotator to load balance your broadcasts across multiple WhatsApp numbers.
                        </span>
                        <button
                            onClick={() => navigate('/order')}
                            className="z-10 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 animate-pulse"
                        >
                            Upgrade Plan <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {rotators.map(r => (
                    <RotatorItem key={r.id} rotator={r} onDelete={handleDeleteRotator} onEdit={openEditRotator} />
                ))}

                {rotators.length === 0 && !isBlocked && (
                    <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 flex flex-col items-center">
                        <Layers className="w-12 h-12 mb-3 opacity-50" />
                        <p>No rotator groups found. Create one to start broadcasting safely.</p>
                    </div>
                )}
            </div>

            {/* MODAL FOR CREATE/EDIT */}
            <Modal
                isOpen={isCreateRotatorOpen}
                onClose={() => setIsCreateRotatorOpen(false)}
                title={isEditingRotator ? 'Edit Rotator Group' : 'New Rotator Group'}
                size="md"
                className="p-0 max-h-[90vh] flex flex-col"
                footer={
                    <ModalFooter>
                        <div className="w-full flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsCreateRotatorOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors">Cancel</button>
                            <button
                                onClick={handleSaveRotator}
                                disabled={rotatorForm.sessionIds.length < 2}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                            >
                                {isEditingRotator ? 'Update Group' : 'Create Group'}
                            </button>
                        </div>
                    </ModalFooter>
                }
            >
                <div className="space-y-5">
                    <p className="text-xs text-gray-500 mt-1">Distribute messages across multiple numbers.</p>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Group Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Sales Team A"
                            value={rotatorForm.name}
                            onChange={e => setRotatorForm({ ...rotatorForm, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                            placeholder="Optional description..."
                            value={rotatorForm.description}
                            onChange={e => setRotatorForm({ ...rotatorForm, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Select Devices</label>
                            <span className={`text-xs font-bold ${rotatorForm.sessionIds.length < 2 ? 'text-red-500' : 'text-green-600'}`}>
                                {rotatorForm.sessionIds.length} Selected (Min 2)
                            </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50 custom-scrollbar">
                            {validDevices.map(d => {
                                const isSelected = rotatorForm.sessionIds.includes(d.id);
                                return (
                                    <div
                                        key={d.id}
                                        onClick={() => toggleDeviceSelection(d.id)}
                                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-white border border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{d.name}</p>
                                                <p className="text-[10px] text-gray-500">{d.whatsapp_number}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {validDevices.length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-xs">No eligible devices available.</div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
