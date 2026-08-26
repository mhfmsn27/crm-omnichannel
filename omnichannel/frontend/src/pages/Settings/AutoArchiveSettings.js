import React, { useState, useEffect } from 'react';
import { Archive, Clock, Save, RefreshCw, Info } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AutoArchiveSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/settings/auto-archive');
            setSettings(res.data);
        } catch (e) {
            setSettings({
                auto_archive_enabled: false,
                archive_after_days: 30,
                archive_resolved_only: true
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/settings/auto-archive', settings);
            toast.success('Settings saved');
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Archive className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Auto Archive Settings</h1>
                    <p className="text-sm text-gray-500">Configure automatic chat archiving</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium">Enable Auto Archive</h3>
                        <p className="text-sm text-gray-500">Automatically archive old conversations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings?.auto_archive_enabled || false}
                            onChange={(e) => setSettings({ ...settings, auto_archive_enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:ring-0 peer-checked:ring-inset peer-checked:bg-indigo-600">
                        </div>
                    </label>
                </div>

                {/* Archive after days */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Archive after (days)</label>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={settings?.archive_after_days || 30}
                            onChange={(e) => setSettings({ ...settings, archive_after_days: parseInt(e.target.value) })}
                            className="border rounded-lg px-3 py-2 w-24"
                        />
                        <span className="text-sm text-gray-500">days of inactivity</span>
                    </div>
                </div>

                {/* Resolved only toggle */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                        <h3 className="font-medium">Archive resolved only</h3>
                        <p className="text-sm text-gray-500">Only archive resolved conversations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings?.archive_resolved_only !== false}
                            onChange={(e) => setSettings({ ...settings, archive_resolved_only: e.target.checked })}
                            className="peer sr-only"
                        />
                        <div className="peer-checked:bg-indigo-600 w-11 h-6 bg-gray-200 rounded-full relative inline-flex items-center peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 after:absolute after:content-[''] after:absolute after:rounded-full after:bg-white after:translate-x-0 checked:translate-x-5 rtl:checked:-translate-x-5">
                        </div>
                    </label>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                </button>

                <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-medium">How auto-archive works</p>
                        <p className="mt-1">Conversations older than {settings?.archive_after_days || 30} days will be archived automatically. Archived chats are moved to archive and no longer appear in the main inbox but can be searched in archive.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}