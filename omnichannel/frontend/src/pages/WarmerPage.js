import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, Plus, Trash2, BarChart2, Lock, Crown, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import WarmerReportModal from '../components/warmer/WarmerReportModal';
import { Users, BookOpen } from 'lucide-react';
import Modal, { ModalFooter } from '../components/common/Modal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';

// --- COMPONENT: Circle Card ---
const CircleCard = ({ circle, onToggle, onDelete, onOpenReport, onReset }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col relative transition-all ${circle.is_active ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">{circle.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded"><Users className="w-3 h-3" /> {circle.device_count} Devices</span>
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded capitalize"><BookOpen className="w-3 h-3" /> {circle.dictionary_mode}</span>
                    </div>
                </div>
                <button
                    onClick={() => onToggle(circle)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${circle.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${circle.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
                <div className="flex flex-col items-center w-1/3">
                    <span className="font-bold text-indigo-600 text-lg">{circle.interval_min}-{circle.interval_max}s</span>
                    <span className="text-[10px]">Random Delay</span>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex flex-col items-center w-1/3">
                    <span className="font-bold text-indigo-600 text-lg">{circle.daily_limit_per_device}</span>
                    <span className="text-[10px]">Max/Device</span>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex flex-col items-center w-1/3">
                    <span className="font-bold text-green-600 text-lg">{circle.total_sent_today || 0}</span>
                    <span className="text-[10px]">Sent Today</span>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between gap-2">
                <button onClick={() => onOpenReport(circle.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold flex-1 justify-center border border-indigo-100">
                    <BarChart2 className="w-4 h-4" /> View Report
                </button>
                <button
                    onClick={() => onReset(circle)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-xs border border-orange-100"
                    title="Reset counter"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(circle.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: Create Modal ---
const CreateCircleModal = ({ isOpen, onClose, devices, systemPreview, onSubmit }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: '',
        session_ids: [],
        interval_min: 60,
        interval_max: 300,
        daily_limit_per_device: 50,
        dictionary_mode: 'system',
        custom_dictionary_text: '' // Temp holder for textarea
    });

    if (!isOpen) return null;

    const toggleDevice = (id) => {
        setForm(prev => {
            const exists = prev.session_ids.includes(id);
            if (exists) return { ...prev, session_ids: prev.session_ids.filter(x => x !== id) };
            return { ...prev, session_ids: [...prev.session_ids, id] };
        });
    };

    const handleSubmit = () => {
        const payload = { ...form };
        if (payload.dictionary_mode === 'custom') {
            payload.custom_dictionary = payload.custom_dictionary_text.split('\n').filter(line => line.trim() !== '');
            if (payload.custom_dictionary.length === 0) return toast.error("Please enter custom messages");
        }
        if (payload.session_ids.length < 2) return toast.error("Select at least 2 devices");

        onSubmit(payload);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="2xl"
            title={
                <div className="flex justify-between items-center w-full pr-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Warmer Circle</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Step {step} of 2</p>
                    </div>
                    {step > 1 && (
                        <button onClick={() => setStep(1)} className="text-sm text-gray-600 hover:underline">
                            Back
                        </button>
                    )}
                </div>
            }
            footer={
                <ModalFooter className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <Button variant="outline" onClick={onClose} fullWidth className="sm:w-auto">Cancel</Button>
                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!form.name || form.session_ids.length < 2} fullWidth className="sm:w-auto">
                            Next Step
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} fullWidth className="sm:w-auto">
                            Create Circle
                        </Button>
                    )}
                </ModalFooter>
            }
        >
            <div className="space-y-6">
                {step === 1 && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Circle Name</label>
                            <input
                                className="w-full border p-3 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                placeholder="e.g. Sales Team Circle"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Members (Min 2)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {devices.map(d => (
                                    <div
                                        key={d.id}
                                        onClick={() => toggleDevice(d.id)}
                                        className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${form.session_ids.includes(d.id) ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${form.session_ids.includes(d.id) ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-500 dark:bg-slate-700'}`}>
                                                {d.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white">{d.name}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400">{d.whatsapp_number}</p>
                                            </div>
                                        </div>
                                        {form.session_ids.includes(d.id) && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                                    </div>
                                ))}
                                {devices.length === 0 && <p className="text-sm text-gray-400 col-span-1 sm:col-span-2 text-center py-4">No connected devices available.</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Interval (Seconds)</label>
                                <div className="flex gap-2 items-center">
                                    <input type="number" className="w-full border p-2 rounded-lg text-center bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" value={form.interval_min} onChange={e => setForm({ ...form, interval_min: parseInt(e.target.value) })} />
                                    <span className="text-gray-400">-</span>
                                    <input type="number" className="w-full border p-2 rounded-lg text-center bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" value={form.interval_max} onChange={e => setForm({ ...form, interval_max: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Daily Limit / Device</label>
                                <input type="number" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white" value={form.daily_limit_per_device} onChange={e => setForm({ ...form, daily_limit_per_device: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Dictionary Mode</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className={`flex-1 p-4 border rounded-xl cursor-pointer ${form.dictionary_mode === 'system' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="dict" checked={form.dictionary_mode === 'system'} onChange={() => setForm({ ...form, dictionary_mode: 'system' })} className="hidden" />
                                    <span className="font-bold text-gray-800 dark:text-white block mb-1">System (Auto)</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">Use our built-in database of natural conversations.</span>
                                </label>
                                <label className={`flex-1 p-4 border rounded-xl cursor-pointer ${form.dictionary_mode === 'custom' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="dict" checked={form.dictionary_mode === 'custom'} onChange={() => setForm({ ...form, dictionary_mode: 'custom' })} className="hidden" />
                                    <span className="font-bold text-gray-800 dark:text-white block mb-1">Custom (Manual)</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">Define your own specific conversation topics.</span>
                                </label>
                            </div>
                        </div>

                        {form.dictionary_mode === 'system' && (
                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Preview Content:</h4>
                                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-slate-400 space-y-1">
                                    {systemPreview.map((msg, i) => <li key={i}>"{msg}"</li>)}
                                    <li>...and 1000+ others.</li>
                                </ul>
                            </div>
                        )}

                        {form.dictionary_mode === 'custom' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Custom Messages (One per line)</label>
                                <textarea
                                    className="w-full border p-3 rounded-xl h-48 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="Halo gan, stok ready?&#10;Ready gan, silakan diorder.&#10;Oke siap ditunggu ya."
                                    value={form.custom_dictionary_text}
                                    onChange={e => setForm({ ...form, custom_dictionary_text: e.target.value })}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default function WarmerPage() {
    const [circles, setCircles] = useState([]);
    const [devices, setDevices] = useState([]);
    const [systemPreview, setSystemPreview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCircleId, setSelectedCircleId] = useState(null);
    const [stats, setStats] = useState({ locked: false }); // Paywall State
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        // Poll updates every 10s
        const timer = setInterval(fetchData, 10000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/app/warmer');
            setCircles(res.data.circles);
            setDevices(res.data.available_devices.filter(d => d.type !== 'official' && d.channel !== 'wa_coex'));
            setSystemPreview(res.data.system_preview || []);
            if (res.data.stats) setStats(res.data.stats); // New Stats from Backend
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data) => {
        try {
            await axios.post('/api/app/warmer', data);
            toast.success("Warmer Circle created");
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // PERSONAL VERSION: Just show error
                toast.error("Failed: " + err.response.data.error);
            } else {
                toast.error("Failed: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleToggle = async (circle) => {
        try {
            await axios.patch(`/api/app/warmer/${circle.id}/toggle`, { is_active: !circle.is_active });
            fetchData(); // Refresh to see state change
        } catch (err) { toast.error("Failed toggle"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this circle?")) return;
        try {
            await axios.delete(`/api/app/warmer/${id}`);
            fetchData();
        } catch (err) { toast.error("Failed delete"); }
    };

    const handleReset = async (circle) => {
        if (!confirm(`Reset counter for "${circle.name}"? This will set Sent Today back to 0.`)) return;
        try {
            await axios.post(`/api/app/warmer/${circle.id}/reset`);
            toast.success(`Counter reset for "${circle.name}"`);
            fetchData();
        } catch (err) {
            toast.error("Failed reset: " + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenReport = (id) => {
        setSelectedCircleId(id);
    };

    const isLocked = false; // PERSONAL VERSION: Bypass Limit

    if (loading && circles.length === 0) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Flame className="w-8 h-8 text-orange-500" /> Warmer Circles
                    </h2>
                    <p className="text-gray-500 text-sm">Automated multi-device interaction to improve number reputation.</p>
                </div>
                {!isLocked && (
                    <div className="flex gap-2">
                        <Button 
                            onClick={fetchData} 
                            variant="secondary" 
                            iconOnly
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button 
                            onClick={() => setIsModalOpen(true)}
                            leftIcon={<Plus className="w-4 h-4" />}
                            className="!bg-none bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm"
                        >
                            New Circle
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : circles.length === 0 && !isLocked ? (
                <EmptyState
                    title="No Warmer Circles Yet"
                    description="Create a circle with at least 2 connected WhatsApp devices to start warming up numbers automatically."
                    icon="plus"
                    action={{
                        label: 'Create Circle',
                        onClick: () => setIsModalOpen(true),
                        icon: Plus
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* PAYWALL CARD */}
                    {isLocked && (
                        <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px] group transition-all relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-red-100 flex items-center justify-center mb-4 z-10">
                                <Lock className="w-8 h-8 text-red-400" />
                            </div>
                            <span className="font-bold text-lg text-gray-700 z-10 flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" /> Premium Feature
                            </span>
                            <span className="text-xs mt-2 text-gray-500 max-w-[80%] z-10 mb-6">
                                Unlock WhatsApp Warmer to improve sender reputation automatically.
                            </span>
                            <button
                                onClick={() => navigate('/order')}
                                className="z-10 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 animate-pulse"
                            >
                                Upgrade Plan <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {circles.map(c => (
                        <CircleCard
                            key={c.id}
                            circle={c}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onOpenReport={handleOpenReport}
                            onReset={handleReset}
                        />
                    ))}
                </div>
            )}

            <CreateCircleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                devices={devices}
                systemPreview={systemPreview}
                onSubmit={handleCreate}
            />

            {selectedCircleId && (
                <WarmerReportModal
                    isOpen={true}
                    circleId={selectedCircleId}
                    onClose={() => setSelectedCircleId(null)}
                />
            )}
        </div>
    );
}
