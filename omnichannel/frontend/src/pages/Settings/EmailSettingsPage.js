import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Save, TestTube, CheckCircle, AlertCircle, Loader2, Send, History, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EmailSettingsPage() {
    const [cfg, setCfg] = useState({
        smtp_host: '', smtp_port: 587, smtp_secure: false,
        smtp_user: '', smtp_pass: '', smtp_from_email: '', smtp_from_name: '', smtp_enabled: false
    });
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');

    // Compose state
    const [compose, setCompose] = useState({ contact_id: '', to_email: '', subject: '', html: '' });
    const [sending, setSending] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/app/settings/email');
            setCfg({
                smtp_host: res.data.smtp_host || '',
                smtp_port: res.data.smtp_port || 587,
                smtp_secure: res.data.smtp_secure || false,
                smtp_user: res.data.smtp_user || '',
                smtp_pass: '', // never returned from API
                smtp_from_email: res.data.smtp_from_email || '',
                smtp_from_name: res.data.smtp_from_name || '',
                smtp_enabled: res.data.smtp_enabled || false
            });
        } catch {}
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/settings/email', cfg);
            toast.success('Pengaturan email disimpan');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            await axios.post('/api/app/settings/email/test', cfg);
            toast.success('Koneksi SMTP berhasil!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Test gagal');
        } finally {
            setTesting(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await axios.get('/api/app/email/logs');
            setLogs(res.data.logs);
        } catch {} finally { setLogsLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'logs') fetchLogs();
    }, [activeTab]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!compose.subject || !compose.html) return toast.error('Subject dan isi email wajib diisi');
        setSending(true);
        try {
            if (compose.contact_id) {
                await axios.post('/api/app/email/send', compose);
            } else if (compose.to_email) {
                await axios.post('/api/app/email/send-draft', compose);
            } else {
                return toast.error('Pilih kontak atau masukkan email manual');
            }
            toast.success('Email terkirim!');
            setCompose({ contact_id: '', to_email: '', subject: '', html: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal kirim email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-500" /> Email Channel
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Konfigurasi SMTP untuk mengirim email ke kontak</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-dark-border">
                {['settings', 'compose', 'logs'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                            activeTab === tab
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}>
                        {tab === 'compose' ? 'Kirim Email' : tab}
                    </button>
                ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-5 max-w-xl">
                    <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">SMTP Integration</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Supports Gmail, SendGrid, Mailgun, atau SMTP server apapun</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                {cfg.smtp_enabled ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg.smtp_enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <input type="checkbox" className="sr-only"
                                    checked={cfg.smtp_enabled}
                                    onChange={e => setCfg({ ...cfg, smtp_enabled: e.target.checked })} />
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cfg.smtp_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">SMTP Host</label>
                            <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_host} onChange={e => setCfg({ ...cfg, smtp_host: e.target.value })}
                                placeholder="smtp.gmail.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Port</label>
                            <input type="number" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_port} onChange={e => setCfg({ ...cfg, smtp_port: parseInt(e.target.value) || 587 })} />
                            <p className="text-[10px] text-gray-400 mt-0.5">587 (TLS) atau 465 (SSL)</p>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-indigo-600"
                                    checked={cfg.smtp_secure}
                                    onChange={e => setCfg({ ...cfg, smtp_secure: e.target.checked })} />
                                Use SSL/TLS
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Username / Email</label>
                            <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_user} onChange={e => setCfg({ ...cfg, smtp_user: e.target.value })} placeholder="your@email.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Password / App Password</label>
                            <input type="password" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_pass} onChange={e => setCfg({ ...cfg, smtp_pass: e.target.value })} placeholder="Kosongkan jika tidak diubah" />
                            <p className="text-[10px] text-gray-400 mt-0.5">Gunakan App Password untuk Gmail</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">From Email</label>
                            <input type="email" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_from_email} onChange={e => setCfg({ ...cfg, smtp_from_email: e.target.value })} placeholder="no-reply@domain.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">From Name</label>
                            <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={cfg.smtp_from_name} onChange={e => setCfg({ ...cfg, smtp_from_name: e.target.value })} placeholder="Nama Pengirim" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan
                        </button>
                        <button onClick={handleTest} disabled={testing || !cfg.smtp_host}
                            className="flex items-center gap-2 px-5 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border disabled:opacity-40">
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                            Test Koneksi
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Tips Konfigurasi
                        </p>
                        <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                            <p><strong>Gmail:</strong> smtp.gmail.com | Port 587 | Gunakan <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline">App Password</a></p>
                            <p><strong>SendGrid:</strong> smtp.sendgrid.net | Port 587 | Username: apikey</p>
                            <p><strong>Mailgun:</strong> smtp.mailgun.org | Port 587</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Compose Tab */}
            {activeTab === 'compose' && (
                <div className="max-w-xl space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">Pastikan SMTP sudah dikonfigurasi dan diaktifkan di tab Settings.</p>
                    </div>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Contact ID (opsional)</label>
                            <input type="number" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={compose.contact_id} onChange={e => setCompose({ ...compose, contact_id: e.target.value, to_email: '' })}
                                placeholder="Masukkan Contact ID" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 border-t border-gray-300 dark:border-dark-border"></div>
                            <span className="text-xs text-gray-400">atau</span>
                            <div className="flex-1 border-t border-gray-300 dark:border-dark-border"></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Email Manual</label>
                            <input type="email" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={compose.to_email} onChange={e => setCompose({ ...compose, to_email: e.target.value, contact_id: '' })}
                                placeholder="recipient@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Subject *</label>
                            <input type="text" required className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })}
                                placeholder="Subject email..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Isi Email (HTML supported) *</label>
                            <textarea rows={6} required className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
                                value={compose.html} onChange={e => setCompose({ ...compose, html: e.target.value })}
                                placeholder="<p>Halo {{name}},</p><p>Isi email di sini...</p>" />
                            <p className="text-[10px] text-gray-400 mt-0.5">HTML didukung. Gunakan {'{{name}}'} untuk nama kontak.</p>
                        </div>
                        <button type="submit" disabled={sending || !cfg.smtp_enabled}
                            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Kirim Email
                        </button>
                    </form>
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                            <History className="w-4 h-4" /> Riwayat Email
                        </h3>
                        <button onClick={fetchLogs} disabled={logsLoading}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
                            <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {logsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : logs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Belum ada email yang dikirim</p>
                    ) : (
                        <div className="space-y-2">
                            {logs.map(log => (
                                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{log.subject}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{log.to_email} · {new Date(log.created_at).toLocaleString('id-ID')}</p>
                                    </div>
                                    <span className={`flex-shrink-0 ml-3 text-xs font-bold px-2 py-0.5 rounded-full ${
                                        log.status === 'sent'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {log.status === 'sent' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}