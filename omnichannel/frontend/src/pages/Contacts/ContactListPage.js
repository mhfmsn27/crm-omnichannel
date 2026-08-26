import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Upload, Download, Trash2, Edit, Filter, Check, Smartphone, Mail, Globe, FileSpreadsheet, Tag, MoreHorizontal, BellOff, Bell, History, RotateCcw, MoreVertical } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import ContactFormModal from '../../components/contacts/ContactFormModal';
import ImportContactModal from '../../components/contacts/ImportContactModal';
import LabelSelector from '../../components/labels/LabelSelector';
import { Skeleton } from '../../components/common/Skeleton';
import { toast } from 'react-hot-toast';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const SourceBadge = ({ source, deviceName }) => {
    if (source === 'inbox') {
        return (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded text-[10px] font-medium border border-green-100 dark:border-green-800 max-w-[120px]">
                <Smartphone className="w-3 h-3 shrink-0" />
                <span className="truncate">{deviceName || 'Inbox'}</span>
            </div>
        );
    }
    if (source === 'import' || source === 'excel') {
        return (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100 dark:border-blue-800">
                <FileSpreadsheet className="w-3 h-3 shrink-0" />
                <span>Import</span>
            </div>
        );
    }
    if (source === 'google') {
        return (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded text-[10px] font-medium border border-red-100 dark:border-red-800">
                <Globe className="w-3 h-3 shrink-0" />
                <span>Google</span>
            </div>
        );
    }
    // Default / Manual
    return (
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200 dark:border-slate-600">
            <Plus className="w-3 h-3 shrink-0" />
            <span>Manual</span>
        </div>
    );
};

const UnsubscribeLogsModal = ({ isOpen, onClose, onResubscribe }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            axios.get('/api/app/contacts/unsubscribe-logs')
                .then(res => setLogs(res.data))
                .catch(() => toast.error("Failed to load logs"))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Unsubscribe History"
            size="2xl"
        >
            <div className="p-0 custom-scrollbar -mx-4 -my-4">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-dark-bg border-b dark:border-dark-border sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">Date</th>
                            <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">Contact</th>
                            <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">Method</th>
                            <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-3 text-gray-600 dark:text-slate-400 text-xs">{new Date(log.unsubscribed_at).toLocaleString()}</td>
                                <td className="px-6 py-3">
                                    <p className="font-bold text-gray-800 dark:text-white">{log.contact_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 font-mono">{log.phone_number}</p>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.method === 'keyword' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                        {log.method}
                                    </span>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 truncate max-w-[150px]" title={log.details}>{log.details}</p>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button
                                        onClick={() => onResubscribe(log.contact_id)}
                                        className="text-xs bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center gap-1 ml-auto"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Resubscribe
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && logs.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400 dark:text-slate-500">No unsubscribe events recorded.</td></tr>}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default function ContactListPage() {
    const location = useLocation(); // Hook for URL params

    const [contacts, setContacts] = useState([]);
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [search, setSearch] = useState('');
    const [selectedLabelIds, setSelectedLabelIds] = useState([]);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [meta, setMeta] = useState({});
    const navigate = useNavigate();

    // Bulk Action State
    const [selectedContactIds, setSelectedContactIds] = useState([]);
    const [isBulkLabelOpen, setIsBulkLabelOpen] = useState(false);

    // Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isUnsubLogOpen, setIsUnsubLogOpen] = useState(false);

    // Initialize filters from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const labelIdsParam = params.get('label_ids');

        if (labelIdsParam) {
            const ids = labelIdsParam.split(',').map(Number);
            setSelectedLabelIds(ids);
        } else {
            setSelectedLabelIds([]);
        }
    }, [location.search]);

    useEffect(() => {
        fetchLabels();
    }, []);

    useEffect(() => {
        fetchContacts();
    }, [page, limit, search, selectedLabelIds]);

    const fetchLabels = async () => {
        try {
            const res = await axios.get('/api/app/labels');
            setLabels(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/contacts`, {
                params: {
                    page,
                    limit,
                    search,
                    label_ids: selectedLabelIds.join(',')
                }
            });
            setContacts(res.data.data);
            setMeta(res.data.meta);
            setSelectedContactIds([]); // Reset selection on fetch
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await axios.get('/api/app/contacts/export', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'contacts.xlsx');
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert("Export failed");
        }
    };

    const handleSubmit = async (formData, customValues) => {
        try {
            let contactId;
            if (editingContact) {
                await axios.put(`/api/app/contacts/${editingContact.id}`, formData);
                contactId = editingContact.id;
            } else {
                const res = await axios.post('/api/app/contacts', formData);
                contactId = res.data.id;
            }
            // Save custom field values if any
            if (customValues && Object.keys(customValues).length > 0) {
                await axios.post(`/api/app/contacts/${contactId}/field-values`, { values: customValues });
            }
            setIsFormOpen(false);
            fetchContacts();
            toast.success("Contact saved");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to save contact");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this contact?")) return;
        try {
            await axios.delete(`/api/app/contacts/${id}`);
            fetchContacts();
            toast.success("Deleted");
        } catch (err) {
            alert("Failed to delete");
        }
    };

    // Bulk Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedContactIds(contacts.map(c => c.id));
        } else {
            setSelectedContactIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedContactIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedContactIds.length} contacts?`)) return;
        try {
            await axios.post('/api/app/contacts/bulk-delete', { ids: selectedContactIds });
            toast.success("Bulk deleted successfully");
            setSelectedContactIds([]);
            fetchContacts();
        } catch (err) {
            toast.error("Bulk delete failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleBulkLabel = async () => {
        setIsBulkLabelOpen(true);
    };

    const submitBulkLabel = async (label) => {
        try {
            await axios.post('/api/app/contacts/bulk-label', {
                contact_ids: selectedContactIds,
                label_id: label.id
            });
            toast.success("Labels assigned");
            setIsBulkLabelOpen(false);
            setSelectedContactIds([]);
            fetchContacts();
        } catch (err) {
            toast.error("Bulk label failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleUnsubscribe = async (contactId) => {
        if (!confirm("Are you sure you want to UNSUBSCRIBE this contact? They will stop receiving automated messages.")) return;
        try {
            await axios.post(`/api/app/contacts/${contactId}/unsubscribe`);
            toast.success("Contact unsubscribed");
            fetchContacts();
        } catch (err) {
            toast.error("Failed to unsubscribe");
        }
    };

    const handleResubscribe = async (contactId) => {
        try {
            await axios.post(`/api/app/contacts/${contactId}/resubscribe`);
            toast.success("Contact resubscribed!");
            fetchContacts(); // Refresh list
        } catch (err) {
            toast.error("Failed to resubscribe");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col pb-20 md:pb-0 bg-gray-50 dark:bg-dark-bg">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    {/* Fixed Title Size */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Database Kontak</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Total: {meta.total || 0} Kontak</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setIsUnsubLogOpen(true)} className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                        <History className="w-4 h-4" /> <span className="hidden md:inline">Logs</span>
                    </button>
                    <button onClick={handleExport} className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => setIsImportOpen(true)} className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button onClick={() => { setEditingContact(null); setIsFormOpen(true); }} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs font-medium shadow-sm transition-colors">
                        <Plus className="w-4 h-4" /> <span className="hidden md:inline">Tambah Kontak</span><span className="md:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* BULK ACTION BAR */}
            {selectedContactIds.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-3 rounded-xl mb-4 flex justify-between items-center animate-in slide-in-from-top-2 sticky top-0 z-20 shadow-md">
                    <span className="text-sm font-bold text-indigo-800 dark:text-indigo-300 pl-2">{selectedContactIds.length} Selected</span>
                    <div className="flex gap-2">
                        <button onClick={handleBulkLabel} className="px-3 py-1.5 bg-white dark:bg-dark-surface text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 transition-colors">
                            <Tag className="w-3 h-3" /> Add Label
                        </button>
                        <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-white dark:bg-dark-surface text-red-600 dark:text-red-400 text-xs font-bold rounded border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-1 transition-colors">
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                </div>
            )}

            {/* TOOLBAR (Search & Filter) */}
            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-t-xl border border-gray-200 dark:border-dark-border border-b-0 flex flex-col md:flex-row gap-4 items-center justify-between z-10 relative">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Cari nama atau nomor..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* LIMIT SELECTOR - Lower Z-Index */}
                    <select
                        className="border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white cursor-pointer relative z-20"
                        value={limit}
                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    >
                        <option value={10}>10 Baris</option>
                        <option value={25}>25 Baris</option>
                        <option value={50}>50 Baris</option>
                        <option value={100}>100 Baris</option>
                    </select>

                    {/* LABEL FILTER - Higher Z-Index */}
                    <div className="relative w-full md:w-auto z-40">
                        <button
                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm outline-none transition-colors w-full md:w-auto justify-between md:justify-start ${selectedLabelIds.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-dark-border text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                {selectedLabelIds.length > 0 ? `${selectedLabelIds.length} Labels` : 'Filter Label'}
                            </div>
                            {selectedLabelIds.length > 0 && (
                                <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] px-1.5 rounded-full font-bold">{selectedLabelIds.length}</span>
                            )}
                        </button>

                        {isFilterDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsFilterDropdownOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border p-2 max-h-64 overflow-y-auto z-50 custom-scrollbar">
                                    <div className="mb-2 px-2 py-1 border-b border-gray-100 dark:border-dark-border flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface z-10">
                                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Pilih Label</span>
                                        {selectedLabelIds.length > 0 && (
                                            <button onClick={() => setSelectedLabelIds([])} className="text-xs text-red-500 hover:underline font-medium">Reset</button>
                                        )}
                                    </div>
                                    {labels.length > 0 ? labels.map(l => (
                                        <div
                                            key={l.id}
                                            onClick={() => {
                                                setSelectedLabelIds(prev => prev.includes(l.id) ? prev.filter(i => i !== l.id) : [...prev, l.id]);
                                            }}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedLabelIds.includes(l.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-dark-bg'}`}>
                                                {selectedLabelIds.includes(l.id) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-slate-300">{l.name}</span>
                                            <div className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: l.color }}></div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-gray-400 dark:text-slate-500 p-4 text-center">Belum ada label.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT - TABLE FOR DESKTOP, CARDS FOR MOBILE */}
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border shadow-sm rounded-2xl overflow-hidden flex-1 flex flex-col relative z-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">

                    {/* DESKTOP TABLE (Hidden on Mobile) */}
                    <table className="w-full text-left whitespace-nowrap hidden md:table">
                        <thead className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-200 dark:border-dark-border sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-2 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                                        className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-dark-bg"
                                    />
                                </th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">WhatsApp</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Labels</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Sub</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}><td colSpan="7" className="px-6 py-4"><Skeleton className="h-4 w-full bg-gray-200 dark:bg-slate-700" /></td></tr>
                                ))
                            ) : contacts.map(contact => (
                                <tr key={contact.id} className={`group hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-all duration-200 ${selectedContactIds.includes(contact.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20 shadow-[inset_4px_0_0_0_rgba(99,102,241,1)]' : ''}`}>
                                    <td className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(contact.id)}
                                            onChange={() => handleSelectOne(contact.id)}
                                            className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-dark-bg"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs mr-3">
                                                {contact.name ? contact.name.charAt(0).toUpperCase() : '#'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">{contact.name || 'Tanpa Nama'}</span>
                                                {contact.email && <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center text-gray-600 dark:text-slate-300 text-xs font-mono">
                                            <Smartphone className="w-3 h-3 mr-2 text-gray-400 dark:text-slate-500" />
                                            {contact.phone_number}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <SourceBadge source={contact.source} deviceName={contact.device_name} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {contact.labels && contact.labels.length > 0 ? contact.labels.map(l => (
                                                <span key={l.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }}>
                                                    {l.name}
                                                </span>
                                            )) : <span className="text-gray-400 dark:text-slate-600 text-xs">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {contact.is_subscribed !== false ? (
                                            <button
                                                onClick={() => handleUnsubscribe(contact.id)}
                                                title="Subscribed - Click to Unsubscribe"
                                                className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-1 rounded-full inline-flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                                            >
                                                <Bell className="w-3 h-3" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleResubscribe(contact.id)}
                                                title="Unsubscribed - Click to Resubscribe"
                                                className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-1 rounded-full inline-flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                                            >
                                                <BellOff className="w-3 h-3" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => { setEditingContact(contact); setIsFormOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => navigate(`/contacts/${contact.id}`)} className="p-1 text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors" title="View Detail">
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(contact.id)} className="p-1 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* MOBILE CARD VIEW (Visible on Mobile) */}
                    <div className="md:hidden p-4 space-y-4">
                        {loading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl bg-gray-200 dark:bg-slate-700" />)
                        ) : contacts.map(contact => (
                            <div key={contact.id} className={`bg-white dark:bg-dark-surface border rounded-xl p-4 shadow-sm ${selectedContactIds.includes(contact.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-dark-border'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(contact.id)}
                                            onChange={() => handleSelectOne(contact.id)}
                                            className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-5 h-5 bg-white dark:bg-dark-bg"
                                        />
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                            {contact.name ? contact.name.charAt(0).toUpperCase() : '#'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{contact.name || 'Tanpa Nama'}</h4>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{contact.phone_number}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingContact(contact); setIsFormOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(contact.id)} className="p-2 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3 items-center">
                                    <SourceBadge source={contact.source} deviceName={contact.device_name} />
                                    {contact.is_subscribed === false && (
                                        <span className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 dark:border-red-800 flex items-center gap-1">
                                            <BellOff className="w-3 h-3" /> Unsubscribed
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1 border-t border-gray-100 dark:border-dark-border pt-3">
                                    {contact.labels && contact.labels.length > 0 ? contact.labels.map(l => (
                                        <span key={l.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }}>
                                            {l.name}
                                        </span>
                                    )) : <span className="text-gray-400 dark:text-slate-600 text-xs italic">No labels</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!loading && contacts.length === 0 && (
                        <div className="py-12 bg-white dark:bg-dark-surface">
                            <EmptyState
                                title={selectedLabelIds.length > 0 ? "Tidak ada kontak" : "Belum ada kontak"}
                                description={selectedLabelIds.length > 0 ? "Coba hapus filter label untuk melihat semua kontak." : "Silakan tambah kontak baru secara manual atau import."}
                                icon="users"
                                action={!selectedLabelIds.length ? {
                                    label: 'Tambah Kontak',
                                    onClick: () => setIsFormOpen(true),
                                    icon: Plus
                                } : undefined}
                            />
                        </div>
                    )}
                </div>

                {/* PAGINATION */}
                <div className="bg-gray-50 dark:bg-dark-surface px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-between items-center mt-auto relative z-10">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                        Hal {meta.page || 1} / {meta.last_page || 1}
                    </span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-dark-bg text-gray-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Prev</button>
                        <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-dark-bg text-gray-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Next</button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ContactFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingContact}
                labels={labels}
            />
            <ImportContactModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchContacts}
            />

            {/* Bulk Label Select Popup (Simple) */}
            <Modal
                isOpen={isBulkLabelOpen}
                onClose={() => setIsBulkLabelOpen(false)}
                title="Select Label"
                size="sm"
            >
                <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                    {labels.map(l => (
                        <button key={l.id} onClick={() => submitBulkLabel(l)} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-sm flex items-center gap-2 transition-colors text-gray-800 dark:text-slate-200">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}></div>
                            {l.name}
                        </button>
                    ))}
                </div>
            </Modal>

            <UnsubscribeLogsModal
                isOpen={isUnsubLogOpen}
                onClose={() => setIsUnsubLogOpen(false)}
                onResubscribe={handleResubscribe}
            />
        </div>
    );
}
