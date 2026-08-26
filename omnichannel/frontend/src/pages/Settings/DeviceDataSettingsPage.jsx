import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Settings, Save, Info, Smartphone, Trash2, RotateCcw, Loader2, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const DeviceDataSettingsPage = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        hiddenDevicesCount: 0,
        description: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hiddenDevices, setHiddenDevices] = useState([]);
    const [showHiddenDevices, setShowHiddenDevices] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/app/settings/device-data-hide');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            toast.error('Gagal memuat pengaturan');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        const newValue = !settings.enabled;
        setSaving(true);
        try {
            await axios.put('/api/app/settings/device-data-hide', { enabled: newValue });
            setSettings(prev => ({
                ...prev,
                enabled: newValue,
                message: newValue
                    ? 'Device data will be hidden when device is deleted'
                    : 'Device data will remain visible after device deletion'
            }));
            toast.success(newValue ? 'Mode Hidden Device aktif' : 'Mode Hidden Device nonaktif');
        } catch (err) {
            console.error('Failed to update settings:', err);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const fetchHiddenDevices = async () => {
        try {
            const res = await axios.get('/api/app/settings/hidden-devices');
            setHiddenDevices(res.data.devices || []);
        } catch (err) {
            console.error('Failed to fetch hidden devices:', err);
        }
    };

    const handleShowHiddenDevices = () => {
        if (!showHiddenDevices) {
            fetchHiddenDevices();
        }
        setShowHiddenDevices(!showHiddenDevices);
    };

    const handleRestoreDevice = async (deviceId) => {
        setRestoringId(deviceId);
        try {
            await axios.post(`/api/app/settings/restore-device/${deviceId}`);
            toast.success('Device berhasil di-restore');
            // Refresh lists
            fetchSettings();
            fetchHiddenDevices();
        } catch (err) {
            console.error('Failed to restore device:', err);
            toast.error('Gagal me-restore device');
        } finally {
            setRestoringId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Device Data Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Kelola bagaimana data device dan pesan berperilaku saat device dihapus
                    </p>
                </div>
            </div>

            {/* Main Toggle Setting */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                                Hide data saat device dihapus
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Saat enabled, menghapus device akan menyembunyikan semua data terkait
                                (messages, contacts, conversations, tickets) dari tampilan. Data dapat
                                ditampilkan kembali dengan cara me-restore device atau meng-add device
                                dengan nama yang sama.
                            </p>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    settings.enabled
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                                }`}>
                                    {settings.enabled ? '● Aktif' : '○ Nonaktif'}
                                </span>
                                {settings.enabled && settings.hiddenDevicesCount > 0 && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                        {settings.hiddenDevicesCount} device tersembunyi
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleToggle}
                            disabled={saving}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                settings.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'
                            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                                    settings.enabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Info Box */}
                <div className="px-6 pb-6">
                    <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            {settings.enabled ? (
                                <>
                                    <strong>Mode Aktif:</strong> Saat Anda menghapus device, data chat tidak akan
                                    hilang dari database tetapi akan disembunyikan dari tampilan. Anda dapat
                                    me-restore device kapan saja dari menu di bawah.
                                </>
                            ) : (
                                <>
                                    <strong>Mode Default (Saat ini):</strong> Saat Anda menghapus device,
                                    record device akan dihapus permanen. Data chat (messages, contacts)
                                    tetap tersimpan tetapi conversations mungkin tidak memiliki referensi device.
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Behavior Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Perbandingan Perilaku</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {/* Enabled State */}
                    <div className={`p-4 rounded-lg border-2 ${
                        settings.enabled
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-slate-700'
                    }`}>
                        <div className="flex items-center gap-2 mb-3">
                            <EyeOff className="w-5 h-5 text-indigo-600" />
                            <span className="font-bold text-gray-900 dark:text-white">Mode Hidden</span>
                            {settings.enabled && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded font-bold">AKTIF</span>
                            )}
                        </div>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Device disembunyikan, tidak dihapus
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Messages, contacts, conversations tersimpan
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Restore device dengan satu klik
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Re-add device dengan nama sama = data muncul
                            </li>
                        </ul>
                    </div>

                    {/* Disabled State */}
                    <div className={`p-4 rounded-lg border-2 ${
                        !settings.enabled
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-slate-700'
                    }`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-5 h-5 text-amber-600" />
                            <span className="font-bold text-gray-900 dark:text-white">Mode Default</span>
                            {!settings.enabled && (
                                <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded font-bold">SAAT INI</span>
                            )}
                        </div>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Device record dihapus permanen
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                Messages, contacts tidak terhapus
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">⚠</span>
                                Conversations mungkin kehilangan referensi
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">⚠</span>
                                Tidak ada opsi restore
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Hidden Devices List (only show if enabled and there are hidden devices) */}
            {settings.enabled && settings.hiddenDevicesCount > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Hidden Devices</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {settings.hiddenDevicesCount} device tersembunyi dari sistem
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleShowHiddenDevices}
                            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {showHiddenDevices ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showHiddenDevices ? 'Sembunyikan List' : 'Tampilkan List'}
                        </button>
                    </div>

                    {showHiddenDevices && (
                        <div className="p-6">
                            {hiddenDevices.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                                    Tidak ada device tersembunyi
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {hiddenDevices.map(device => (
                                        <div
                                            key={device.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-200 dark:bg-slate-700 rounded-lg">
                                                    <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{device.name}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {device.whatsapp_number || 'No Number'} • Dihapus {device.deleted_at ? formatDistanceToNow(new Date(device.deleted_at), { addSuffix: true }) : 'recently'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRestoreDevice(device.id)}
                                                disabled={restoringId === device.id}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                {restoringId === device.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Memproses...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RotateCcw className="w-4 h-4" />
                                                        Restore
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Warning for admins */}
            {settings.enabled && settings.hiddenDevicesCount === 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-700 dark:text-green-300 text-center">
                        🎉 Tidak ada device tersembunyi. Semua device aktif dan berjalan normal.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DeviceDataSettingsPage;
