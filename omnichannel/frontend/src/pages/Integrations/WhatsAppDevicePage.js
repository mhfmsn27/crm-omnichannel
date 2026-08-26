import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import {
    Smartphone, Plus, Trash2, RefreshCw, CheckCircle, Wifi, WifiOff, Loader2, AlertCircle,
    BarChart2, Clock, Server, ArrowRight, X, Lock, Edit2, Send, MessageSquare, HelpCircle,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import { getInitialsAvatar } from '../../utils/avatar';
import Modal, { ModalFooter } from '../../components/common/Modal';

// --- HELPER: FORMAT DURATION ---
const formatDuration = (dateString) => {
    if (!dateString) return 'Not Connected';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Unknown';
        return formatDistanceToNow(date, { addSuffix: false });
    } catch (e) { return 'Unknown'; }
};

// --- COMPONENT: Device Report Modal ---
const DeviceReportModal = ({ isOpen, onClose, deviceId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && deviceId) fetchReport();
    }, [isOpen, deviceId]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/devices/${deviceId}/report`);
            setData(res.data);
        } catch (err) {
            toast.error("Failed to load report");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{data?.device_info?.name || 'Loading...'}</h3>
                        <p className="text-xs text-gray-500 font-mono">
                            {data?.device_info?.whatsapp_number || 'Unknown Number'} • {data?.device_info?.status}
                        </p>
                    </div>
                </div>
            }
        >
            <div className="bg-gray-50/50 dark:bg-[#0f172a]/50">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Incoming Today</span>
                                <span className="text-3xl font-extrabold text-blue-600">{data.stats_today.received}</span>
                                <span className="text-[10px] text-gray-400 mt-2">Messages</span>
                            </div>
                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Outgoing Today</span>
                                <span className="text-3xl font-extrabold text-green-600">{data.stats_today.sent}</span>
                                <span className="text-[10px] text-gray-400 mt-2">Messages</span>
                            </div>
                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                                {data.stats_today.failed > 5 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse m-2"></div>}
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Failed Today</span>
                                <span className={`text-3xl font-extrabold ${data.stats_today.failed > 0 ? 'text-red-600' : 'text-gray-300'}`}>{data.stats_today.failed}</span>
                                <span className="text-[10px] text-gray-400 mt-2">Errors</span>
                            </div>
                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Broadcast (Month)</span>
                                <span className="text-3xl font-extrabold text-purple-600">{data.broadcast_performance.total_messages}</span>
                                <span className="text-[10px] text-gray-400 mt-2">Sent in {data.broadcast_performance.total_campaigns} campaigns</span>
                            </div>
                        </div>

                        {/* Agent Performance Table */}
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] flex items-center justify-between">
                                <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">Agent Activity (Last 30 Days)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[420px]">
                                    <thead className="bg-gray-50 dark:bg-[#0f172a] text-gray-500 dark:text-slate-400 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Agent Name</th>
                                            <th className="px-6 py-3 text-right">Messages Sent</th>
                                            <th className="px-6 py-3 text-right">Performance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                                        {data.agent_performance.length > 0 ? data.agent_performance.map((agent, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors">
                                                <td className="px-6 py-3 font-medium text-gray-800 dark:text-slate-200">{agent.agent_name}</td>
                                                <td className="px-6 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">{agent.messages_handled}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className="bg-green-500 h-1.5 rounded-full"
                                                            style={{ width: `${Math.min((agent.messages_handled / 1000) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-gray-400">No agent activity recorded yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Technical Info */}
                        <div className="bg-gray-800 rounded-xl p-6 text-gray-300 font-mono text-xs">
                            <h4 className="text-gray-100 font-bold mb-3 flex items-center gap-2">
                                <Server className="w-4 h-4" /> Technical Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                                <div className="flex justify-between border-b border-gray-700 pb-1">
                                    <span>Session ID:</span>
                                    <span className="text-white">{data.device_info.session_id}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-700 pb-1 ml-4">
                                    <span>Connected Since:</span>
                                    <span className="text-white">{data.device_info.connected_at ? new Date(data.device_info.connected_at).toLocaleString() : '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-700 pb-1">
                                    <span>Uptime:</span>
                                    <span className="text-green-400">{formatDuration(data.device_info.connected_at)}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </Modal>
    );
};

// --- COMPONENT: Test Message Modal ---
const TestMessageModal = ({ isOpen, onClose, deviceId }) => {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('Hello from Test!');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!phone) return toast.error("Phone number is required");
        setSending(true);
        try {
            await axios.post(`/api/app/devices/${deviceId}/test`, { to: phone, message });
            toast.success("Test message sent!");
            onClose();
        } catch (err) {
            toast.error("Failed to send: " + (err.response?.data?.error || err.message));
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Test Send Message
                </div>
            }
            size="sm"
            footer={
                <ModalFooter>
                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending...' : 'Send Test'}
                    </button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Destination Number</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 dark:border-[#334155] rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. 628123456789"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Include country code (e.g. 62)</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Message</label>
                    <textarea
                        className="w-full p-2 border border-gray-300 dark:border-[#334155] rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
                        placeholder="Type your test message..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    ></textarea>
                </div>
            </div>
        </Modal>
    );
};

// --- COMPONENT: Device Card ---
const DeviceCard = ({ device, onDelete, onRetry, onOpenReport, onEdit, onOpenTest }) => {
    const fallbackAvatar = getInitialsAvatar(device.name);
    const profilePic = device.profile_pic_url ? getApiUrl(device.profile_pic_url) : fallbackAvatar;

    // Simple status check - rely only on status field
    const status = device.status?.toLowerCase() || 'disconnected';
    const isEffectiveConnected = status === 'connected';

    // Determine visual status based on status field
    let visualStatus = 'default';
    if (isEffectiveConnected) visualStatus = 'connected';
    else if (status === 'disconnected') visualStatus = 'disconnected';
    else if (status === 'scanned') visualStatus = 'scanned';
    else if (status === 'created') visualStatus = 'created';
    else if (status === 'connecting') visualStatus = 'connecting';

    // Dynamic Styles
    const styles = {
        connected: {
            border: 'border-emerald-200',
            bg: 'bg-emerald-50/20',
            badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: <Wifi className="w-3 h-3" />
        },
        disconnected: {
            border: 'border-red-200',
            bg: 'bg-red-50/20',
            badge: 'bg-red-100 text-red-700 border-red-200',
            icon: <WifiOff className="w-3 h-3" />
        },
        connecting: {
            border: 'border-blue-200',
            bg: 'bg-blue-50/20',
            badge: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: <Loader2 className="w-3 h-3 animate-spin" />
        },
        default: {
            border: 'border-amber-200',
            bg: 'bg-amber-50/20',
            badge: 'bg-amber-100 text-amber-700 border-amber-200',
            icon: <AlertCircle className="w-3 h-3" />
        }
    };

    const currentStyle = styles[visualStatus] || styles.default;

    return (
        <div className={`rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col relative overflow-hidden bg-white dark:bg-[#1e293b] group ${currentStyle.border} h-full`}>

            {/* Background Decor */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-30 -mr-6 -mt-6 transition-colors ${currentStyle.bg}`}></div>

            <div className="p-4 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img
                            src={profilePic}
                            onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                            alt={device.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm bg-white"
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-1">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[120px] text-sm" title={device.name}>{device.name}</h3>
                                <button onClick={() => onEdit(device)} className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">{device.whatsapp_number || 'No Number'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {device.device_info?.is_warmer_only && (
                            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-indigo-100 text-indigo-700 border-indigo-200">
                                WARMER ONLY
                            </div>
                        )}
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 shadow-sm ${currentStyle.badge}`}>
                            {currentStyle.icon} {visualStatus}
                        </div>
                    </div>
                </div>

                {/* Info Body */}
                <div className="space-y-2 mb-4 flex-1">
                    {visualStatus === 'connected' ? (
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-[#0f172a] p-1.5 rounded border border-gray-100 dark:border-[#334155]">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>Online: <b>{formatDuration(device.connected_at)}</b></span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-50 p-1.5 rounded border border-red-100">
                            <AlertCircle className="w-3 h-3" /> Device offline
                        </div>
                    )}

                    {/* Test Button Row - Only if Connected */}
                    {visualStatus === 'connected' && (
                        <button
                            onClick={() => onOpenTest(device.id)}
                            className="w-full py-1.5 mt-2 mb-1 bg-white dark:bg-[#0f172a] border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-500 transition-all flex items-center justify-center gap-1"
                        >
                            <Send className="w-3 h-3" /> Test Send Message
                        </button>
                    )}
                </div>

                {/* Footer Actions - Compact */}
                <div className="flex gap-2 mt-auto relative z-10">
                    <button
                        onClick={() => onOpenReport(device.id)}
                        className="flex-1 py-1.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] text-gray-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                        <BarChart2 className="w-3 h-3" /> Report
                    </button>

                    {visualStatus === 'connected' ? (
                        <>
                            <button
                                onClick={() => onRetry(device.id)}
                                className="px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] text-gray-500 dark:text-slate-400 rounded hover:text-indigo-500 hover:border-indigo-200 transition-all"
                                title="Reconnect / Scan New QR"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onDelete(device.id)}
                                className="px-2 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 border border-red-100 transition-all"
                                title="Delete Device"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => onRetry(device.id)}
                                className="flex-1 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> {visualStatus === 'created' ? 'Scan' : 'Reconnect'}
                            </button>
                            <button
                                onClick={() => onDelete(device.id)}
                                className="px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] text-gray-400 dark:text-slate-500 rounded hover:text-red-500 hover:border-red-200 transition-all"
                                title="Delete Device"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODALS ---
const AddDeviceModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [name, setName] = useState('');
    const [isWarmerOnly, setIsWarmerOnly] = useState(false);
    const [syncFullHistory, setSyncFullHistory] = useState(false);
    const [syncContacts, setSyncContacts] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setIsWarmerOnly(false);
            setSyncFullHistory(false);
            setSyncContacts(true);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connect New Device</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-normal">Give your WhatsApp number a friendly name.</p>
                </div>
            }
            size="md"
            footer={
                <ModalFooter>
                    <div className="flex justify-end gap-3 w-full">
                        <button onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onClick={() => onSubmit({ name, isWarmerOnly, syncFullHistory, syncContacts })} disabled={!name || isLoading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70 font-bold shadow-lg shadow-indigo-200 transition-all">
                            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Creating...' : 'Create Session'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Device Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Sales Team - Budi"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                        autoFocus
                    />
                </div>

                <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="warmerOnly"
                        className="mt-1 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={isWarmerOnly}
                        onChange={(e) => setIsWarmerOnly(e.target.checked)}
                    />
                    <label htmlFor="warmerOnly" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5">Khusus Warmer (Lewati Riwayat)</span>
                        <span className="text-indigo-700/80 dark:text-indigo-400/80 text-xs">Centang jika nomor ini dikhususkan untuk Warmer. Riwayat chat lama tidak akan ditarik ke dalam Inbox CRM.</span>
                    </label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="syncFullHistory"
                        className="mt-1 border-gray-300 rounded text-red-600 focus:ring-red-500"
                        checked={syncFullHistory}
                        onChange={(e) => setSyncFullHistory(e.target.checked)}
                    />
                    <label htmlFor="syncFullHistory" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-red-900 dark:text-red-300 block mb-0.5">Tarik Semua Riwayat Pesan Lama</span>
                        <span className="text-red-700/80 dark:text-red-400/80 text-xs">Peringatan: Berisiko membuat server terbebani (Not Responding) jika nomor WhatsApp memiliki riwayat pesan yang sangat besar.</span>
                    </label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="syncContacts"
                        className="mt-1 border-gray-300 rounded text-green-600 focus:ring-green-500"
                        checked={syncContacts}
                        onChange={(e) => setSyncContacts(e.target.checked)}
                    />
                    <label htmlFor="syncContacts" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-green-900 dark:text-green-300 block mb-0.5">Sinkronisasi Kontak WA</span>
                        <span className="text-green-700/80 dark:text-green-400/80 text-xs">Centang jika Anda ingin menarik seluruh buku telepon (Address Book) dari WA ke CRM. Biarkan mati jika Anda hanya ingin kontak dari Excel atau chat baru.</span>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

const EditDeviceModal = ({ isOpen, onClose, device, onSave }) => {
    const [name, setName] = useState('');
    const [isWarmerOnly, setIsWarmerOnly] = useState(false);

    useEffect(() => {
        if (device) {
            setName(device.name || '');
            setIsWarmerOnly(device.device_info?.is_warmer_only || false);
        }
    }, [device]);

    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Device Info"
            size="sm"
            footer={
                <ModalFooter>
                    <div className="flex justify-end gap-2 w-full">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors font-medium">Cancel</button>
                        <button onClick={() => onSave(device.id, name, isWarmerOnly)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-md transition-all">Save</button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Device Name</label>
                    <input
                        className="w-full border border-gray-300 dark:border-[#334155] p-2 rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Device Name"
                    />
                </div>
                <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="editWarmerOnly"
                        className="mt-1 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={isWarmerOnly}
                        onChange={(e) => setIsWarmerOnly(e.target.checked)}
                    />
                    <label htmlFor="editWarmerOnly" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5">Khusus Warmer (Lewati Riwayat)</span>
                        <span className="text-indigo-700/80 dark:text-indigo-400/80 text-[10px] leading-tight block">Centang jika nomor ini dikhususkan untuk Warmer. Pesan masuk tidak akan ditarik ke Inbox CRM.</span>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

const ScanQrModal = ({ isOpen, qrCode, sessionId, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null}
            size="sm"
            showClose={true}
        >
            <div className="text-center relative">
                <div className="mb-6">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 mb-4"><Smartphone className="w-6 h-6" /></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scan QR Code</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                </div>
                <div className="flex items-center justify-center p-4 border-2 border-gray-100 dark:border-[#334155] rounded-xl shadow-inner mb-6" style={{ backgroundColor: '#ffffff' }}>
                    {qrCode ? (
                        <div style={{ background: 'white', padding: '10px', borderRadius: '8px' }}>
                            <QRCode value={qrCode} size={220} />
                        </div>
                    ) : (
                        <div className="w-[220px] h-[220px] flex items-center justify-center flex-col text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                            <span className="text-xs font-medium">Generating QR...</span>
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 dark:bg-[#0f172a] p-3 rounded-lg border border-gray-100 dark:border-[#334155] text-left flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase">Session ID</span>
                    <span className="text-xs font-mono text-gray-700 dark:text-slate-200 bg-white dark:bg-[#1e293b] px-2 py-1 rounded border border-gray-200 dark:border-[#334155]">{sessionId?.substring(0, 12)}...</span>
                </div>
            </div>
        </Modal>
    );
};

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Koneksi WhatsApp
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Saya Mengerti
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4 text-sm text-gray-600 dark:text-slate-300">
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Langkah 1: Tambah Device</h4>
                    <p>Klik tombol <strong>"Add New Device"</strong>, lalu beri nama device Anda (misal: CS 1) dan klik Create.</p>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Langkah 2: Scan QR Code</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Buka aplikasi WhatsApp di HP Anda.</li>
                        <li>Buka <strong>Menu (Titik Tiga)</strong> atau <strong>Settings</strong>.</li>
                        <li>Pilih <strong>Linked Devices (Perangkat Tertaut)</strong>.</li>
                        <li>Klik tombol <strong>Link a Device</strong>.</li>
                        <li>Arahkan kamera HP ke QR Code yang muncul di layar ini.</li>
                    </ol>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded text-xs text-blue-700 dark:text-blue-300">
                    <strong>Tips:</strong> Pastikan HP memiliki koneksi internet yang stabil agar session tidak terputus.
                </div>
            </div>
        </Modal>
    );
};

// --- COMPONENT: Delete Device Confirmation Modal ---
const DeleteDeviceModal = ({ isOpen, onClose, onConfirm, onReconnect, deviceName, isActive, isLoading, loadingAction }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={null}
            size="sm"
            footer={
                <div className="bg-gray-50 dark:bg-[#0f172a] p-4 flex flex-col gap-2 border-t border-gray-100 dark:border-[#334155] w-full">
                    {!isActive && onReconnect && (
                        <button
                            onClick={onReconnect}
                            disabled={isLoading}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && loadingAction === 'reconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Coba Reconnect
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`w-full py-2 ${isActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white dark:bg-dark-surface border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'} rounded font-bold transition-colors flex items-center justify-center gap-2`}
                    >
                        {isLoading && loadingAction === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isLoading && loadingAction === 'delete' ? 'Menghapus...' : 'Ya, Hapus Device'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-2 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded font-medium transition-colors"
                    >
                        Batal
                    </button>
                </div>
            }
        >
            <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Device?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                    Anda yakin ingin menghapus <strong>{deviceName}</strong>?
                </p>
                {isActive ? (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800 mt-2 mb-4 text-left">
                        <strong>Perhatian:</strong> Device ini sedang aktif/terhubung. Menghapus device akan memutuskan koneksi WhatsApp secara paksa.
                    </p>
                ) : (
                    <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-100 dark:border-yellow-800 mt-2 mb-4 text-left">
                        <strong>Saran:</strong> Jika device hanya terputus (disconnected), Anda bisa mencoba <strong>Reconnect</strong> terlebih dahulu daripada menghapusnya.
                    </p>
                )}
            </div>
        </Modal>
    );
};

// --- COMPONENT: Retry Device Modal ---
const RetryDeviceModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [syncFullHistory, setSyncFullHistory] = useState(false);
    const [syncContacts, setSyncContacts] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setSyncFullHistory(false);
            setSyncContacts(true);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Reconnect Device"
            size="md"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end gap-3 pt-2">
                        <button onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onClick={() => onConfirm({ syncFullHistory, syncContacts })} disabled={isLoading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70 font-bold shadow-lg shadow-indigo-200 transition-all">
                            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Reconnecting...' : 'Tautkan Ulang'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Scan QR code kembali untuk menautkan ulang device ini.</p>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="retrySyncFullHistory"
                        className="mt-1 border-gray-300 rounded text-red-600 focus:ring-red-500"
                        checked={syncFullHistory}
                        onChange={(e) => setSyncFullHistory(e.target.checked)}
                    />
                    <label htmlFor="retrySyncFullHistory" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-red-900 dark:text-red-300 block mb-0.5">Tarik Semua Riwayat Pesan Lama</span>
                        <span className="text-red-700/80 dark:text-red-400/80 text-xs">Peringatan: Berisiko membuat server terbebani (Not Responding) jika nomor WhatsApp memiliki riwayat pesan yang sangat besar.</span>
                    </label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl">
                    <input
                        type="checkbox"
                        id="retrySyncContacts"
                        className="mt-1 border-gray-300 rounded text-green-600 focus:ring-green-500"
                        checked={syncContacts}
                        onChange={(e) => setSyncContacts(e.target.checked)}
                    />
                    <label htmlFor="retrySyncContacts" className="text-sm cursor-pointer select-none">
                        <span className="font-bold text-green-900 dark:text-green-300 block mb-0.5">Sinkronisasi Kontak WA</span>
                        <span className="text-green-700/80 dark:text-green-400/80 text-xs">Centang jika Anda ingin menarik seluruh buku telepon (Address Book) dari WA ke CRM. Biarkan mati jika Anda hanya ingin kontak dari Excel atau chat baru.</span>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

// --- MAIN PAGE ---
export default function WhatsAppDevicePage() {
    const { socket, isConnected } = useSocket();
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [limitStats, setLimitStats] = useState({ used: 0, limit: 0, allowed: true });

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
    const [retryDeviceId, setRetryDeviceId] = useState(null);
    const [deletingDevice, setDeletingDevice] = useState(null);
    const [editingDevice, setEditingDevice] = useState(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [deleteLoadingAction, setDeleteLoadingAction] = useState(null);

    // Selection State
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [scanningSessionId, setScanningSessionId] = useState(null);
    const [currentQr, setCurrentQr] = useState(null);

    useEffect(() => {
        fetchDevices();
        fetchStats();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/app/devices');
            setDevices(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/app/devices/stats');
            setLimitStats(res.data);
        } catch (err) { console.error(err); }
    };

    const [orgStatus, setOrgStatus] = useState(null);
    useEffect(() => {
        axios.get('/api/app/organization').then(res => setOrgStatus(res.data.subscription_status));
    }, []);

    // --- REAL-TIME LISTENERS ---
    useEffect(() => {
        if (!socket || !socket.on) return;

        socket.on('qr_received', ({ sessionId, qr }) => {
            if (sessionId === scanningSessionId) {
                setCurrentQr(qr);
            }
        });

        // UPDATED: Listen for profile_pic_url update
        socket.on('device_status_update', ({ sessionId, status, phone, profile_pic_url }) => {
            setDevices(prev => prev.map(d =>
                d.session_id === sessionId ? {
                    ...d,
                    status,
                    whatsapp_number: phone,
                    // Only update profile pic if provided in event
                    profile_pic_url: profile_pic_url || d.profile_pic_url,
                    connected_at: status === 'connected' ? new Date().toISOString() : d.connected_at
                } : d
            ));

            if (status === 'connected' && sessionId === scanningSessionId) {
                setIsQrModalOpen(false);
                setScanningSessionId(null);
                setCurrentQr(null);
                toast.success(`Device Connected! ${phone || ''}`);
            }

            // Refresh stats on any status update (e.g. new device connected/added via socket)
            fetchStats();
        });

        return () => {
            if (socket && socket.off) {
                socket.off('qr_received');
                socket.off('device_status_update');
            }
        };
    }, [socket, isConnected, scanningSessionId]);

    // --- HANDLERS ---
    const handleAddDevice = async ({ name, isWarmerOnly, syncFullHistory, syncContacts }) => {
        setLoading(true);
        try {
            const res = await axios.post('/api/app/devices', { name, isWarmerOnly, syncFullHistory, syncContacts });
            const newDevice = res.data;
            setIsAddModalOpen(false);
            setDevices(prev => [newDevice, ...prev]);
            setScanningSessionId(newDevice.session_id);
            setIsQrModalOpen(true);
            setCurrentQr(null);
            fetchStats();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // PERSONAL VERSION: Just show error, don't prompt upgrade
                toast.error("Failed: " + err.response.data.error);
                setIsAddModalOpen(false);
            } else {
                toast.error("Failed to create session: " + (err.response?.data?.error || err.message));
            }
        } finally { setLoading(false); }
    };

    const handleRetry = (id) => {
        setRetryDeviceId(id);
        setIsRetryModalOpen(true);
    };

    const confirmRetry = async ({ syncFullHistory, syncContacts }) => {
        if (!retryDeviceId) return;
        setIsDeleteLoading(true);
        try {
            const device = devices.find(d => d.id === retryDeviceId);
            if (device) {
                const res = await axios.post(`/api/app/devices/${retryDeviceId}/retry`, { syncFullHistory, syncContacts });

                // Uses new session ID if backend performed a reset
                const newSessionId = res.data.newSessionId || device.session_id;

                // Update local list with new ID immediately
                if (newSessionId !== device.session_id) {
                    setDevices(prev => prev.map(d => d.id === retryDeviceId ? { ...d, session_id: newSessionId, status: 'created' } : d));
                }

                setScanningSessionId(newSessionId);
                setIsQrModalOpen(true);
                setCurrentQr(null);
                toast.success(res.data.message || "Retry initiated");
                setIsRetryModalOpen(false);
                setRetryDeviceId(null);
            }
        } catch (err) {
            toast.error("Retry failed: " + (err.response?.data?.error || err.message));
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const device = devices.find(d => d.id === id);
        if (!device) return;

        // Cek apakah device aktif
        const isActive = ['connected', 'connecting', 'scanned', 'created'].includes(device.status?.toLowerCase());

        // Tampilkan modal konfirmasi dengan pilihan
        setDeletingDevice({ id, name: device.name, isActive });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingDevice) return;

        setIsDeleteLoading(true);
        setDeleteLoadingAction('delete');

        try {
            await axios.delete(`/api/app/devices/${deletingDevice.id}`);
            setDevices(prev => prev.filter(d => d.id !== deletingDevice.id));
            toast.success("Device dihapus");
            fetchStats();
        } catch (err) {
            toast.error("Gagal menghapus device");
        } finally {
            setIsDeleteModalOpen(false);
            setDeletingDevice(null);
            setIsDeleteLoading(false);
            setDeleteLoadingAction(null);
        }
    };

    const handleReconnectFromModal = async () => {
        if (!deletingDevice) return;

        // Tutup modal delete, buka modal retry
        setIsDeleteModalOpen(false);
        handleRetry(deletingDevice.id);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingDevice(null);
    };

    const handleOpenReport = (id) => {
        setSelectedDeviceId(id);
        setIsReportModalOpen(true);
    };

    const handleEditDevice = (device) => {
        setEditingDevice(device);
        setIsEditModalOpen(true);
    };

    const handleOpenTest = (id) => {
        setSelectedDeviceId(id);
        setIsTestModalOpen(true);
    };

    const handleUpdateDeviceName = async (id, newName, isWarmerOnly) => {
        try {
            const res = await axios.put(`/api/app/devices/${id}`, { name: newName, isWarmerOnly });
            setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName, device_info: { ...d.device_info, is_warmer_only: isWarmerOnly } } : d));
            toast.success("Device updated successfully");
            setIsEditModalOpen(false);
        } catch (err) { toast.error("Update failed: " + (err.response?.data?.error || err.message)); }
    };

    // FILTER: Exclude Official API Devices
    const unofficialDevices = devices.filter(d => d.type !== 'official');
    const disconnectedCount = unofficialDevices.filter(d => d.status?.toLowerCase() === 'disconnected').length;
    // PERSONAL VERSION: Bypass Limit
    const isLimitReached = false;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">

            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-green-600" /> WhatsApp Devices
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Manage your connected WhatsApp numbers and view performance reports.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" /> Panduan Koneksi
                    </button>
                    {/* Access Status Badge - Simplified for Personal Version */}
                    <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Active</span>
                    </div>
                    <button onClick={() => { fetchDevices(); fetchStats(); }} className="p-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 shadow-sm transition-all">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* GRID LAYOUT: 3 Columns on LG */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* ADD CARD: Always Visible for Personal Version */}
                <div
                    onClick={() => setIsAddModalOpen(true)}
                    className="border-2 border-dashed border-gray-300 dark:border-[#334155] rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 hover:border-indigo-500 hover:text-indigo-500 cursor-pointer transition-all h-[240px] bg-gray-50 dark:bg-[#0f172a] hover:bg-white dark:hover:bg-[#1e293b] hover:shadow-lg group"
                >
                    <div className="w-14 h-14 bg-white dark:bg-[#1e293b] rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-lg">Add New Device</span>
                    <span className="text-xs mt-1 opacity-70">Scan QR to connect</span>
                </div>

                {unofficialDevices.map(device => (
                    <div key={device.id} className="h-[240px]">
                        <DeviceCard
                            device={device}
                            onDelete={handleDelete}
                            onRetry={handleRetry}
                            onOpenReport={handleOpenReport}
                            onEdit={handleEditDevice}
                            onOpenTest={handleOpenTest}
                        />
                    </div>
                ))}
            </div>

            {/* MODALS */}
            <AddDeviceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddDevice}
                isLoading={loading}
            />
            <ScanQrModal
                isOpen={isQrModalOpen}
                qrCode={currentQr}
                sessionId={scanningSessionId}
                onClose={() => setIsQrModalOpen(false)}
            />
            <DeviceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                deviceId={selectedDeviceId}
            />
            <EditDeviceModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                device={editingDevice}
                onSave={handleUpdateDeviceName}
            />
            <TestMessageModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                deviceId={selectedDeviceId}
            />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <DeleteDeviceModal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                onReconnect={handleReconnectFromModal}
                deviceName={deletingDevice?.name || ''}
                isActive={deletingDevice?.isActive || false}
                isLoading={isDeleteLoading}
                loadingAction={deleteLoadingAction}
            />
            <RetryDeviceModal
                isOpen={isRetryModalOpen}
                onClose={() => { setIsRetryModalOpen(false); setRetryDeviceId(null); }}
                onConfirm={confirmRetry}
                isLoading={isDeleteLoading}
            />
        </div>
    );
}
