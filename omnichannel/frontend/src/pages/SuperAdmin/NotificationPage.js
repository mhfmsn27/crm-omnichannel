import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { 
    Bell, QrCode, RefreshCw, Save, Send, Smartphone, AlertCircle, CheckCircle, FileText, Users, Image as ImageIcon, Loader2, Plus, Trash2, X, Edit, ToggleLeft, ToggleRight
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';
import SimpleEmojiPicker from '../../components/common/SimpleEmojiPicker';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

// Modal for QR Code
const ScanQrModal = ({ isOpen, onClose, qrCode, deviceName }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Scan QR Code"
            size="sm"
        >
            <div className="text-center">
                <p className="text-sm text-gray-500 mb-6">Connect <b>{deviceName}</b> via WhatsApp Linked Devices</p>
                
                <div className="flex items-center justify-center p-4 bg-white border-2 border-gray-100 rounded-xl shadow-inner mb-4">
                    {qrCode ? (
                        <QRCode value={qrCode} size={220} />
                    ) : (
                        <div className="w-[220px] h-[220px] flex items-center justify-center flex-col text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                            <span className="text-xs font-medium">Generating QR...</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400">Keep this window open until connected.</p>
            </div>
        </Modal>
    );
};

// Device Card Component
const SystemDeviceCard = ({ device, onDelete, onShowQr }) => {
    const isConnected = device.status?.toLowerCase() === 'connected';
    return (
        <div className={`bg-white p-5 rounded-xl border shadow-sm transition-all ${isConnected ? 'border-green-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{device.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{device.whatsapp_number || 'No Number'}</p>
                    </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {device.status}
                </div>
            </div>
            
            <div className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                <span className="font-mono bg-gray-50 px-1 rounded">{device.session_id.substring(0,15)}...</span>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-50">
                {!isConnected && (
                    <button 
                        onClick={() => onShowQr(device)}
                        className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center justify-center gap-1"
                    >
                        <QrCode className="w-3 h-3" /> Scan QR
                    </button>
                )}
                <button 
                    onClick={() => onDelete(device.id)}
                    className="px-3 py-2 bg-white border border-gray-200 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-100 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Modal for Template Editor
const TemplateModal = ({ isOpen, onClose, template, onSave }) => {
    const [form, setForm] = useState({ type: '', label: '', content: '' });

    useEffect(() => {
        if (template) {
            setForm({ type: template.type, label: template.label, content: template.content });
        } else {
            setForm({ type: '', label: '', content: '' });
        }
    }, [template, isOpen]);

    const handleSubmit = () => {
        if (!form.type || !form.label || !form.content) return toast.error("All fields required");
        onSave(form);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={template ? 'Edit Template' : 'New Template'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Template</Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type (System Key)</label>
                        <input 
                            className="w-full border p-2 rounded-lg text-sm bg-gray-50 font-mono" 
                            placeholder="welcome_message"
                            value={form.type}
                            onChange={e => setForm({...form, type: e.target.value})}
                            // disabled={!!template} // Optional: allow editing key or not
                        />
                        <p className="text-xs text-gray-400 mt-1">Unique key used by system events (e.g. order_success, sub_expired).</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label (Friendly Name)</label>
                        <input 
                            className="w-full border p-2 rounded-lg text-sm" 
                            placeholder="Welcome Message"
                            value={form.label}
                            onChange={e => setForm({...form, label: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
                        <textarea 
                            className="w-full border p-2 rounded-lg text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Hello {name}..."
                            value={form.content}
                            onChange={e => setForm({...form, content: e.target.value})}
                        />
                    </div>
            </div>
        </Modal>
    );
};

export default function NotificationPage() {
    const { socket, isConnected } = useSocket();
    const [activeTab, setActiveTab] = useState('device'); 
    const [loading, setLoading] = useState(false);
    const [devices, setDevices] = useState([]); 
    
    // QR State
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [scanningDevice, setScanningDevice] = useState(null);
    
    // Templates State
    const [templates, setTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    
    // Manual State
    const [broadcastForm, setBroadcastForm] = useState({
        target_type: 'all',
        message: '',
        media_url: '',
        device_id: '' 
    });
    const [showEmoji, setShowEmoji] = useState(false);

    useEffect(() => {
        fetchDevices();
        fetchTemplates();
    }, []);

    // Socket Listener
    useEffect(() => {
        if (!socket || !socket.on) return;

        socket.on('qr_received', ({ sessionId, qr }) => {
            if (scanningDevice && sessionId === scanningDevice.session_id) {
                setQrData(qr);
            }
        });

        socket.on('device_status_update', ({ sessionId, status, phone }) => {
            setDevices(prev => prev.map(d => d.session_id === sessionId ? { ...d, status, whatsapp_number: phone } : d));
            
            // Close modal if currently scanning this device and it connected
            if (scanningDevice && scanningDevice.session_id === sessionId && status === 'connected') {
                setIsQrOpen(false);
                setScanningDevice(null);
                setQrData(null);
                toast.success("Device connected successfully!");
            }
        });

        return () => {
            if (socket && socket.off) {
                socket.off('qr_received');
                socket.off('device_status_update');
            }
        };
    }, [socket, isConnected, scanningDevice]);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/sa/notifications/device');
            setDevices(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddDevice = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/sa/notifications/device');
            const newDevice = res.data;
            setDevices([newDevice, ...devices]);
            
            // Open QR immediately
            setScanningDevice(newDevice);
            setQrData(null); // Wait for socket
            setIsQrOpen(true);
            toast.success("Device created. Please scan QR.");
        } catch (err) {
            toast.error("Creation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDevice = async (id) => {
        if(!confirm("Remove this system device? Notifications might fail if no other device is connected.")) return;
        try {
            await axios.delete(`/api/sa/notifications/device/${id}`);
            setDevices(prev => prev.filter(d => d.id !== id));
            toast.success("Device removed");
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const handleShowQr = (device) => {
        setScanningDevice(device);
        setQrData(null);
        setIsQrOpen(true);
        axios.post('/api/sa/notifications/device');
    };

    // --- 2. TEMPLATE LOGIC (UPDATED) ---
    const fetchTemplates = async () => {
        try {
            const res = await axios.get('/api/sa/notifications/templates');
            setTemplates(res.data);
        } catch (err) { console.error(err); }
    };

    const handleTemplateSave = async (formData) => {
        try {
            if (editingTemplate) {
                await axios.put(`/api/sa/notifications/templates/${editingTemplate.id}`, formData);
                toast.success("Template updated");
            } else {
                await axios.post('/api/sa/notifications/templates', formData);
                toast.success("Template created");
            }
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to save: " + (err.response?.data?.error || err.message));
        }
    };

    const handleTemplateDelete = async (id) => {
        if(!confirm("Delete this template?")) return;
        try {
            await axios.delete(`/api/sa/notifications/templates/${id}`);
            toast.success("Template deleted");
            fetchTemplates();
        } catch (err) { toast.error("Failed to delete"); }
    };
    
    const handleTemplateToggle = async (t) => {
        try {
             await axios.put(`/api/sa/notifications/templates/${t.id}`, { is_active: !t.is_active });
             fetchTemplates();
        } catch(e) { toast.error("Toggle failed"); }
    };

    // --- 3. MANUAL BROADCAST LOGIC (unchanged) ---
    const handleBroadcastSubmit = async () => {
        if (!broadcastForm.message) return toast.error("Message cannot be empty");
        const connected = devices.filter(d => d.status === 'connected');
        if (connected.length === 0) return toast.error("No connected system devices!");
        
        if(!confirm(`Send this message to ${broadcastForm.target_type.toUpperCase()} members?`)) return;

        setLoading(true);
        try {
            const res = await axios.post('/api/sa/notifications/broadcast', broadcastForm);
            toast.success(res.data.message);
            setBroadcastForm({ ...broadcastForm, message: '', media_url: '' });
        } catch (err) {
            toast.error("Broadcast failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/inbox/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBroadcastForm({ ...broadcastForm, media_url: `${window.location.origin}${res.data.url}` });
        } catch (err) { toast.error("Upload failed"); }
    };

    const insertVariable = (v) => {
        setBroadcastForm(prev => ({ ...prev, message: prev.message + ` ${v} ` }));
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="w-8 h-8 text-indigo-600" /> Notification Center
            </h1>

            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-8">
                <button onClick={() => setActiveTab('device')} className={`px-6 py-3 font-medium border-b-2 flex items-center gap-2 ${activeTab === 'device' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    <Smartphone className="w-4 h-4" /> System Devices
                </button>
                <button onClick={() => setActiveTab('templates')} className={`px-6 py-3 font-medium border-b-2 flex items-center gap-2 ${activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    <FileText className="w-4 h-4" /> Auto Templates
                </button>
                <button onClick={() => setActiveTab('manual')} className={`px-6 py-3 font-medium border-b-2 flex items-center gap-2 ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    <Send className="w-4 h-4" /> Manual Broadcast
                </button>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                
                {/* TAB 1: DEVICES */}
                {activeTab === 'device' && (
                    <div>
                         <div className="flex justify-between items-center mb-6">
                             <div>
                                 <h3 className="font-bold text-gray-800 text-lg">System Senders</h3>
                                 <p className="text-sm text-gray-500">Add multiple devices for load balancing notifications.</p>
                             </div>
                             <button 
                                onClick={handleAddDevice}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                             >
                                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                 Add Device
                             </button>
                         </div>

                         {devices.length === 0 ? (
                             <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                 <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                 <p className="text-gray-500">No system devices connected.</p>
                             </div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {devices.map(dev => (
                                     <SystemDeviceCard 
                                        key={dev.id} 
                                        device={dev} 
                                        onDelete={handleDeleteDevice} 
                                        onShowQr={handleShowQr}
                                     />
                                 ))}
                             </div>
                         )}
                    </div>
                )}

                {/* TAB 2: TEMPLATES (UPDATED) */}
                {activeTab === 'templates' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg flex gap-2 text-sm text-blue-800 flex-1 mr-4">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>Variables available: <b>{`{name}`}</b>, <b>{`{org_name}`}</b>, <b>{`{phone}`}</b>, <b>{`{email}`}</b>. <br/>
                                Specific variables: <b>{`{invoice_url}`}</b> (Order), <b>{`{expiry_date}`}</b> (Warning).</p>
                            </div>
                            <button 
                                onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 text-sm whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" /> Create Template
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {templates.map(t => (
                                <div key={t.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow relative bg-white">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{t.label}</h4>
                                            <p className="text-xs text-gray-400 font-mono">{t.type}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleTemplateToggle(t)} className={t.is_active ? "text-green-600" : "text-gray-300"}>
                                                {t.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                            </button>
                                            <button onClick={() => { setEditingTemplate(t); setIsTemplateModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 p-1">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleTemplateDelete(t.id)} className="text-gray-400 hover:text-red-600 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 h-24 overflow-y-auto whitespace-pre-wrap border border-gray-100">
                                        {t.content}
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-400">No templates found.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: MANUAL BROADCAST */}
                {activeTab === 'manual' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Target Audience</label>
                                    <select 
                                        className="w-full border p-2 rounded-lg bg-white"
                                        value={broadcastForm.target_type}
                                        onChange={e => setBroadcastForm({...broadcastForm, target_type: e.target.value})}
                                    >
                                        <option value="all">All Members</option>
                                        <option value="free">Free Members</option>
                                        <option value="paid">Paid Members</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sender Device</label>
                                    <select 
                                        className="w-full border p-2 rounded-lg bg-white"
                                        value={broadcastForm.device_id}
                                        onChange={e => setBroadcastForm({...broadcastForm, device_id: e.target.value})}
                                    >
                                        <option value="">Auto (Random Load Balance)</option>
                                        {devices.filter(d => d.status === 'connected').map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg p-4 text-sm h-40 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Hello {name} from {org_name}..."
                                    value={broadcastForm.message}
                                    onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})}
                                />
                                <button 
                                    onClick={() => setShowEmoji(!showEmoji)}
                                    className="absolute bottom-3 right-3 text-gray-400 hover:text-gray-600"
                                >
                                    <span className="text-xl">😊</span>
                                </button>
                                {showEmoji && (
                                    <div className="absolute bottom-12 right-0 z-50">
                                        <SimpleEmojiPicker onEmojiClick={(e) => setBroadcastForm(prev => ({...prev, message: prev.message + e.emoji}))} />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 text-xs">
                                <button onClick={() => insertVariable('{name}')} className="bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Name</button>
                                <button onClick={() => insertVariable('{org_name}')} className="bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Org Name</button>
                                <button onClick={() => insertVariable('{Hi|Hello}')} className="bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Spintax</button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Media (Optional)</label>
                                <div className="flex gap-4 items-center">
                                    <input type="file" onChange={handleMediaUpload} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                    {broadcastForm.media_url && (
                                        <a href={broadcastForm.media_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> View Media
                                        </a>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleBroadcastSubmit}
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : <><Send className="w-4 h-4" /> Send Broadcast</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* QR MODAL */}
            <ScanQrModal 
                isOpen={isQrOpen} 
                onClose={() => { setIsQrOpen(false); setScanningDevice(null); }}
                qrCode={qrData}
                deviceName={scanningDevice?.name}
            />

            {/* Template Modal */}
            <TemplateModal 
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                template={editingTemplate}
                onSave={handleTemplateSave}
            />
        </div>
    );
}
