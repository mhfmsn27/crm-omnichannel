import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Smartphone, Users, Download, Save, RefreshCw, Loader2, ArrowRight, CheckCircle, Check, AlertCircle, AlertTriangle, Lock, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const StepIndicator = ({ current, step, title }) => (
    <div className="flex items-center flex-1 last:flex-none">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${current === step ? 'bg-indigo-600 text-white' : current > step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {current > step ? <Check className="w-4 h-4" /> : step}
        </div>
        <span className={`ml-2 text-sm font-medium ${current === step ? 'text-indigo-600' : current > step ? 'text-green-600' : 'text-gray-500'}`}>{title}</span>
        {step < 3 && <div className={`flex-1 h-1 mx-4 rounded ${current > step ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
    </div>
);

export default function GroupExtractorTool() {
    const [step, setStep] = useState(1);
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [selectedGroupJid, setSelectedGroupJid] = useState(null);
    const [extractedData, setExtractedData] = useState(null);

    const [saveMode, setSaveMode] = useState('contacts');
    const [labelName, setLabelName] = useState('');

    const [stats, setStats] = useState({ locked: false }); // Paywall State
    const navigate = useNavigate();

    useEffect(() => {
        fetchDevices();
        checkStats();
    }, []);

    const checkStats = async () => {
        try {
            const res = await axios.get('/api/app/tools/stats', { params: { tool_code: 'tool_group_grab' } });
            setStats(res.data);
        } catch (e) { }
    };

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/app/devices');
            const connectedDevices = res.data.filter(d =>
                d.status?.toLowerCase() === 'connected'
            );
            setDevices(connectedDevices);
        } catch (e) { }
    };

    const handleFetchGroups = async () => {
        if (!selectedDeviceId) return toast.error("Pilih device dulu");
        setLoading(true);
        setLoadingMessage("Mengambil daftar grup...");
        try {
            const res = await axios.get(`/api/app/tools/groups?device_id=${selectedDeviceId}`);
            setGroups(res.data);
            setStep(2);
        } catch (err) {
            toast.error(err.response?.data?.error || "Gagal mengambil grup");
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleExtract = async (groupJid) => {
        setLoading(true);
        setLoadingMessage("Mengekstrak anggota... (Ini mungkin butuh waktu saat sinkronisasi awal)");
        setSelectedGroupJid(groupJid);

        try {
            const res = await axios.post('/api/app/tools/groups/extract', {
                device_id: selectedDeviceId,
                group_jid: groupJid
            }, {
                timeout: 300000
            });

            setExtractedData(res.data);
            setLabelName(res.data.subject);
            setStep(3);
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            if (msg.includes('timed out')) {
                toast.error("Timeout: WhatsApp sedang sinkronisasi. Silakan coba lagi dalam 1-2 menit.");
            } else {
                toast.error(`Gagal extract: ${msg}`);
            }
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleSave = async () => {
        if (saveMode === 'csv') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(extractedData.participants.map(p => ({
                Phone: p.phone,
                Role: p.admin ? 'Admin' : 'Member',
                Group: extractedData.subject
            })));
            XLSX.utils.book_append_sheet(wb, ws, "Contacts");
            XLSX.writeFile(wb, `${extractedData.subject}-members.xlsx`);
            toast.success("File downloaded");
        } else {
            setLoading(true);
            setLoadingMessage("Menyimpan ke database...");
            try {
                const contacts = extractedData.participants.map(p => ({
                    phone: p.phone,
                    name: p.phone
                }));

                const res = await axios.post('/api/app/tools/groups/save', {
                    contacts,
                    label_name: labelName
                });

                toast.success(`Berhasil menyimpan ${res.data.saved_count} kontak!`);
                setStep(1);
                setGroups([]);
                setExtractedData(null);
            } catch (err) {
                toast.error("Gagal menyimpan kontak");
            } finally {
                setLoading(false);
                setLoadingMessage('');
            }
        }
    };

    const isLocked = false; // PERSONAL VERSION: Bypass Limit

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto relative">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-8 h-8 text-indigo-600" /> WhatsApp Group Extractor
                    </h2>
                    <p className="text-sm text-gray-500">Scrape contacts from joined groups for lead generation.</p>
                </div>
            </div>

            {/* PAYWALL OVERLAY */}
            {isLocked && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Lock className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" /> Feature Locked
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">Unlock Group Extractor to scrape members from your WhatsApp groups into your database.</p>
                    <button onClick={() => navigate('/order')} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                        Upgrade Plan <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex justify-between items-center px-4 mb-6">
                    <StepIndicator current={step} step={1} title="Select Device" />
                    <StepIndicator current={step} step={2} title="Choose Group" />
                    <StepIndicator current={step} step={3} title="Save Data" />
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm">

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                        <strong>Batasan Privasi WhatsApp:</strong> Hanya nomor yang sudah ada di kontak atau pernah berinteraksi (chat) dengan Anda yang akan muncul. Nomor lainnya disembunyikan oleh WhatsApp demi privasi pengguna (tampil sebagai LID).
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center rounded-xl">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-gray-700 font-medium">{loadingMessage}</p>
                        <p className="text-xs text-gray-500 mt-2 max-w-xs text-center">Jangan tutup halaman ini.</p>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6 text-center py-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <Smartphone className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold">Pilih Device Sumber</h3>
                        <p className="text-gray-500 max-w-md mx-auto">Pilih nomor WhatsApp yang sudah terhubung. Pastikan nomor tersebut sudah bergabung di dalam grup yang ingin diambil datanya.</p>

                        <div className="max-w-xs mx-auto mt-4">
                            <select
                                className="w-full border p-3 rounded-lg mb-4"
                                value={selectedDeviceId}
                                onChange={e => setSelectedDeviceId(e.target.value)}
                                disabled={isLocked}
                            >
                                <option value="">-- Pilih Device --</option>
                                {devices.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.whatsapp_number})</option>
                                ))}
                            </select>
                            {devices.length === 0 && (
                                <p className="text-xs text-red-500 mb-4">Tidak ada device terhubung. Silakan hubungkan di menu Devices.</p>
                            )}

                            <button
                                onClick={handleFetchGroups}
                                disabled={loading || !selectedDeviceId || isLocked}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                Ambil Daftar Grup
                            </button>
                        </div>
                    </div>
                )}

                {/* ... (Step 2 and 3 remain the same but are effectively hidden by overlay if locked) ... */}
                {/* To keep file concise, including Step 2 and 3 logic assuming isLocked prevents reaching them */}
                {step === 2 && !isLocked && (
                    <div>
                        {/* ... Group List UI ... */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Pilih Grup ({groups.length})</h3>
                            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-800">Kembali</button>
                        </div>
                        <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                            {groups.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">Tidak ada grup ditemukan.</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-gray-600">Nama Grup</th>
                                            <th className="p-4 font-bold text-gray-600 text-center">Members</th>
                                            <th className="p-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {groups.map(g => (
                                            <tr key={g.id} className="hover:bg-gray-50">
                                                <td className="p-4 font-bold text-gray-800">{g.subject}</td>
                                                <td className="p-4 text-center">{g.size || '-'}</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleExtract(g.id)}
                                                        disabled={loading}
                                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs hover:bg-indigo-100 disabled:opacity-50"
                                                    >
                                                        Extract Members
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {step === 3 && extractedData && !isLocked && (
                    <div>
                        {/* ... Save UI ... */}
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Hasil Ekstraksi</h3>
                                <p className="text-sm text-gray-500">Grup: <b>{extractedData.subject}</b> ({extractedData.size} Peserta)</p>
                            </div>
                            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-800">Pilih Grup Lain</button>
                        </div>
                        {/* ... Table and Save Form ... */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-bold text-gray-600">No. WhatsApp / ID</th>
                                                <th className="p-3 font-bold text-gray-600">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {extractedData.participants.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-mono">
                                                        {p.phone}
                                                    </td>
                                                    <td className="p-3">
                                                        {p.admin ? <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-bold">ADMIN</span> : <span className="text-gray-500 text-xs">Member</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl h-fit">
                                <h4 className="font-bold text-gray-800 mb-4">Simpan Data</h4>
                                <div className="space-y-3 mb-6">
                                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer bg-white ${saveMode === 'contacts' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                                        <input type="radio" name="save" checked={saveMode === 'contacts'} onChange={() => setSaveMode('contacts')} className="text-indigo-600 mr-3" />
                                        <span className="text-sm font-medium">Simpan ke Kontak</span>
                                    </label>
                                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer bg-white ${saveMode === 'csv' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                                        <input type="radio" name="save" checked={saveMode === 'csv'} onChange={() => setSaveMode('csv')} className="text-indigo-600 mr-3" />
                                        <span className="text-sm font-medium">Download Excel/CSV</span>
                                    </label>
                                </div>
                                {saveMode === 'contacts' && (
                                    <div className="mb-6 animate-in fade-in">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label Kontak</label>
                                        <input className="w-full border p-2 rounded-lg text-sm" value={labelName} onChange={e => setLabelName(e.target.value)} placeholder="Nama Grup" />
                                    </div>
                                )}
                                <button onClick={handleSave} disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (saveMode === 'csv' ? <Download className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                                    {saveMode === 'csv' ? 'Download File' : 'Simpan Sekarang'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}