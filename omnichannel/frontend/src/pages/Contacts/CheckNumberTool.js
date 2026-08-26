import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Upload, FileText, Play, History, Download, UserPlus, AlertCircle, CheckCircle, XCircle, RefreshCw, Plus, Lock, Crown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Modal, { ModalFooter } from '../../components/common/Modal';

// Simple Modal Component for Saving
const SaveModal = ({ isOpen, onClose, onSave }) => {
    const [labelName, setLabelName] = useState('');
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Save Valid Numbers"
            size="sm"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                        <button onClick={() => onSave(labelName)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Save Contacts</button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Create New Label</label>
                    <input className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Valid Batch 1" value={labelName} onChange={e => setLabelName(e.target.value)} autoFocus />
                    <p className="text-xs text-gray-500 mt-2">Or leave empty to save without specific label.</p>
                </div>
            </div>
        </Modal>
    );
};

export default function CheckNumberTool() {
    const [activeTab, setActiveTab] = useState('overview'); // overview, result
    const [devices, setDevices] = useState([]);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ locked: false }); // Paywall State
    const navigate = useNavigate();

    // Input State
    const [name, setName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [inputType, setInputType] = useState('manual');
    const [manualText, setManualText] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Active Process State
    const [activeBatch, setActiveBatch] = useState(null);
    const [progress, setProgress] = useState({ processed: 0, total: 0, valid: 0, invalid: 0 });

    // UI State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const socket = useSocket();

    useEffect(() => {
        fetchDevices();
        fetchHistory();
        checkStats();
    }, []);

    useEffect(() => {
        if (!socket || !socket.on) return;
        socket.on('check_progress', (data) => {
            if (activeBatch && activeBatch.id === String(data.batchId)) {
                setProgress(prev => ({ ...prev, processed: data.processed, valid: data.valid, invalid: data.invalid }));
            }
        });
        socket.on('check_complete', ({ batchId }) => {
            if (activeBatch && activeBatch.id === String(batchId)) {
                toast.success("Checking Completed!");
                fetchHistory();
                fetchBatchDetail(batchId);
            }
        });
        return () => {
            if (socket && socket.off) {
                socket.off('check_progress');
                socket.off('check_complete');
            }
        };
    }, [socket, activeBatch]);

    const checkStats = async () => {
        try {
            const res = await axios.get('/api/app/tools/stats', { params: { tool_code: 'tool_number_check' } });
            setStats(res.data);
        } catch (e) { }
    };

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/app/devices');
            const connectedDevices = res.data.filter(d =>
                d.type !== 'official' && d.status?.toLowerCase() === 'connected'
            );
            setDevices(connectedDevices);
        } catch (e) { }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/app/tools/check-number/history');
            setHistory(res.data);
        } catch (e) { }
    };

    const fetchBatchDetail = async (id) => {
        try {
            const res = await axios.get(`/api/app/tools/check-number/${id}`);
            setActiveBatch(res.data.batch);
            setHistoryItems(res.data.items);
            setProgress({
                processed: res.data.batch.valid_count + res.data.batch.invalid_count,
                total: res.data.batch.total_numbers,
                valid: res.data.batch.valid_count,
                invalid: res.data.batch.invalid_count
            });
            setActiveTab('result');
        } catch (e) { }
    };

    const handleStart = async () => {
        if (!name || !deviceId) return toast.error("Please fill all fields");
        if (inputType === 'manual' && !manualText) return toast.error("Enter numbers");
        if (inputType === 'file' && !file) return toast.error("Upload file");

        setLoading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('device_id', deviceId);
        formData.append('input_type', inputType);
        if (inputType === 'manual') formData.append('manual_numbers', manualText);
        if (inputType === 'file') formData.append('file', file);

        try {
            const res = await axios.post('/api/app/tools/check-number/start', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Process Started");
            setActiveBatch({ id: String(res.data.batchId), total_numbers: res.data.count });
            setProgress({ processed: 0, total: res.data.count, valid: 0, invalid: 0 });
            setActiveTab('result');
            fetchHistory();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // PERSONAL VERSION: Just show error
                toast.error("Failed: " + err.response.data.error);
            } else {
                toast.error(err.response?.data?.error || "Failed to start");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent = "Name,Phone\nJohn Doe,628123456789\nJane Smith,628987654321";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "whatsapp_check_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [historyItems, setHistoryItems] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [resPage, setResPage] = useState(1);

    useEffect(() => {
        if (activeTab === 'result' && activeBatch && activeBatch.id) {
            axios.get(`/api/app/tools/check-number/${activeBatch.id}`, { params: { page: resPage, status: filterStatus } })
                .then(res => setHistoryItems(res.data.items));
        }
    }, [resPage, filterStatus, activeTab, activeBatch]);

    const handleExport = async () => {
        if (!activeBatch || !activeBatch.id) return;
        const toastId = toast.loading("Downloading report...");
        try {
            const res = await axios.get(`/api/app/tools/check-number/${activeBatch.id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${activeBatch.name || 'Batch'}-Result.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.dismiss(toastId);
            toast.success("Download complete");
        } catch (e) {
            toast.dismiss(toastId);
            toast.error("Export failed. Please check permissions.");
        }
    };

    const handleSaveContacts = async (labelName) => {
        if (!activeBatch || !activeBatch.id) return;
        try {
            await axios.post(`/api/app/tools/check-number/${activeBatch.id}/save-contacts`, { new_label_name: labelName });
            toast.success("Valid numbers saved to contacts!");
            setIsSaveModalOpen(false);
        } catch (e) { toast.error("Failed to save"); }
    };

    const isLocked = false; // PERSONAL VERSION: Bypass Limit

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" /> WhatsApp Number Checker
                    </h2>
                    <p className="text-sm text-gray-500">Validate numbers before sending broadcast to avoid bans.</p>
                </div>
            </div>

            {/* CONTENT AREA or PAYWALL */}
            {isLocked ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm text-center p-8">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>
                    <h3 className="font-bold text-2xl text-gray-900 mb-3 flex items-center gap-2 justify-center">
                        <Crown className="w-6 h-6 text-yellow-500" /> Feature Locked
                    </h3>
                    <p className="text-gray-500 max-w-lg mb-8 leading-relaxed">
                        Unlock the <b>Number Checker</b> tool to validate thousands of WhatsApp numbers instantly.
                        Identify active numbers and reduce ban risks before sending broadcasts.
                    </p>
                    <button
                        onClick={() => navigate('/order')}
                        className="px-8 py-4 bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                    >
                        Upgrade Plan Now <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <>
                    {/* RESULT VIEW */}
                    {activeTab === 'result' && activeBatch ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className="flex items-center text-gray-600 hover:text-indigo-600 font-medium mb-4"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
                            </button>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-xl border shadow-sm">
                                    <p className="text-gray-500 text-xs font-bold uppercase">Total Numbers</p>
                                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{progress.total}</h3>
                                    <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}></div>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1 font-bold">{progress.processed} Processed</p>
                                </div>
                                <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <p className="text-green-800 text-xs font-bold uppercase">Valid WhatsApp</p>
                                    </div>
                                    <h3 className="text-3xl font-extrabold text-green-700">{progress.valid}</h3>
                                </div>
                                <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <p className="text-red-800 text-xs font-bold uppercase">Invalid / Unregistered</p>
                                    </div>
                                    <h3 className="text-3xl font-extrabold text-red-700">{progress.invalid}</h3>
                                </div>
                            </div>

                            {/* Actions & Table */}
                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button onClick={() => setFilterStatus('all')} className={`px-3 py-1 text-xs font-bold rounded ${filterStatus === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>All</button>
                                        <button onClick={() => setFilterStatus('valid')} className={`px-3 py-1 text-xs font-bold rounded ${filterStatus === 'valid' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Valid Only</button>
                                        <button onClick={() => setFilterStatus('invalid')} className={`px-3 py-1 text-xs font-bold rounded ${filterStatus === 'invalid' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Invalid Only</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">
                                            <UserPlus className="w-3 h-3" /> Save Valid
                                        </button>
                                        <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-white border text-gray-700 text-xs font-bold rounded hover:bg-gray-50">
                                            <Download className="w-3 h-3" /> Export Excel
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase">
                                            <tr>
                                                <th className="px-6 py-3">Input Number</th>
                                                <th className="px-6 py-3">Formatted</th>
                                                <th className="px-6 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {historyItems.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-3 font-mono text-gray-600">{item.input_number}</td>
                                                    <td className="px-6 py-3 font-mono text-gray-900">{item.formatted_number}</td>
                                                    <td className="px-6 py-3">
                                                        {item.status === 'pending' && <span className="text-gray-400 text-xs">Checking...</span>}
                                                        {item.status === 'checked' && item.is_registered && <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">VALID</span>}
                                                        {item.status === 'checked' && !item.is_registered && <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded">INVALID</span>}
                                                        {item.status === 'failed' && <span className="text-orange-600 text-xs">Error</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-3 border-t flex justify-end gap-2">
                                    <button disabled={resPage === 1} onClick={() => setResPage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-50">Prev</button>
                                    <button onClick={() => setResPage(p => p + 1)} className="px-3 py-1 text-xs border rounded">Next</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // OVERVIEW: SPLIT VIEW
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">

                            {/* LEFT: FORM */}
                            <div className="flex flex-col h-full">
                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <Play className="w-5 h-5 text-indigo-600" /> New Check Task
                                </h3>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Job Name</label>
                                            <input className="w-full border p-2.5 rounded-lg" placeholder="e.g. Leads Jakarta" value={name} onChange={e => setName(e.target.value)} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Select Device (Checker)</label>
                                            <select className="w-full border p-2.5 rounded-lg" value={deviceId} onChange={e => setDeviceId(e.target.value)}>
                                                <option value="">-- Select Connected Device --</option>
                                                {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.whatsapp_number})</option>)}
                                            </select>
                                            <p className="text-xs text-gray-400 mt-1">We use this device session to query WhatsApp servers.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Input Method</label>
                                            <div className="flex gap-4 mb-4">
                                                <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 ${inputType === 'manual' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'hover:bg-gray-50'}`}>
                                                    <input type="radio" name="input" checked={inputType === 'manual'} onChange={() => setInputType('manual')} className="hidden" />
                                                    <FileText className="w-5 h-5 text-indigo-600" />
                                                    <span className="font-bold text-gray-700">Copy-Paste</span>
                                                </label>
                                                <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 ${inputType === 'file' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'hover:bg-gray-50'}`}>
                                                    <input type="radio" name="input" checked={inputType === 'file'} onChange={() => setInputType('file')} className="hidden" />
                                                    <Upload className="w-5 h-5 text-indigo-600" />
                                                    <span className="font-bold text-gray-700">Upload File</span>
                                                </label>
                                            </div>

                                            {inputType === 'manual' ? (
                                                <textarea
                                                    className="w-full border p-3 rounded-lg h-40 text-sm font-mono"
                                                    placeholder="08123456789&#10;62812999999&#10;..."
                                                    value={manualText}
                                                    onChange={e => setManualText(e.target.value)}
                                                />
                                            ) : (
                                                <>
                                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 relative group transition-colors hover:border-indigo-400">
                                                        <input
                                                            type="file"
                                                            accept=".xlsx,.csv"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={e => setFile(e.target.files[0])}
                                                        />
                                                        <div className="pointer-events-none">
                                                            {file ? (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                                                                        <FileText className="w-6 h-6" />
                                                                    </div>
                                                                    <p className="font-bold text-gray-800">{file.name}</p>
                                                                    <p className="text-xs text-green-600 font-bold">Ready to upload</p>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="p-3 bg-gray-100 rounded-full text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                                        <Upload className="w-6 h-6" />
                                                                    </div>
                                                                    <p className="text-gray-600 font-medium">Click to upload .xlsx or .csv</p>
                                                                    <p className="text-xs text-gray-400">Column "Phone" or "Mobile" required</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* TEMPLATE DOWNLOAD */}
                                                    <div className="flex justify-end mt-2 items-center gap-2">
                                                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Wajib Gunakan Template ini
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadTemplate}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline transition-all"
                                                        >
                                                            <Download className="w-3 h-3" /> Download Template (.csv)
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleStart}
                                            disabled={loading}
                                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                            Start Checking
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: HISTORY */}
                            <div className="flex flex-col h-full min-h-[500px]">
                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-600" /> Recent History
                                </h3>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                                    <div className="overflow-y-auto p-4 custom-scrollbar flex-1 space-y-3">
                                        {history.map(batch => (
                                            <div key={batch.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => fetchBatchDetail(batch.id)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-700">{batch.name}</h4>
                                                        <p className="text-[10px] text-gray-500 mt-1">{new Date(batch.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${batch.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {batch.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200">
                                                    <div className="text-center">
                                                        <span className="block font-bold text-gray-800">{batch.total_numbers}</span>
                                                        <span className="text-[9px] text-gray-400 uppercase font-bold">Total</span>
                                                    </div>
                                                    <div className="text-center border-l border-gray-200">
                                                        <span className="block font-bold text-green-600">{batch.valid_count}</span>
                                                        <span className="text-[9px] text-green-600 uppercase font-bold">Valid</span>
                                                    </div>
                                                    <div className="text-center border-l border-gray-200">
                                                        <span className="block font-bold text-red-600">{batch.invalid_count}</span>
                                                        <span className="text-[9px] text-red-600 uppercase font-bold">Invalid</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {history.length === 0 && <p className="text-center text-gray-400 py-10">No history found.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <SaveModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveContacts}
            />
        </div>
    );
}
