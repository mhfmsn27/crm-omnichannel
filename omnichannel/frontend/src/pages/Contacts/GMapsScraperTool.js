import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Search, Save, Download, Star, Settings, History, Globe, Phone, CheckSquare, Square, Loader2, Lock, Crown, ArrowRight } from 'lucide-react';
import LocationInputOSM from '../../components/tools/LocationInputOSM';
import Modal, { ModalFooter } from '../../components/common/Modal';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const ConfigModal = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [provider, setProvider] = useState('serpapi');
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setApiKey('');
            setProvider('serpapi');
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!apiKey) return toast.error("Please enter API Key");
        setIsSaving(true);
        await onSave(provider, apiKey);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" /> API Configuration
                </div>
            }
            size="sm"
            footer={
                <ModalFooter>
                    <div className="w-full flex flex-col gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button onClick={onClose} disabled={isSaving} className="w-full text-gray-500 text-sm mt-2 hover:underline">Cancel</button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Provider</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setProvider('serpapi')}
                            className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${provider === 'serpapi' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                            SerpApi
                        </button>
                        <button
                            onClick={() => setProvider('google_places')}
                            className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${provider === 'google_places' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                            Google Places
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">API Key</label>
                    <input
                        type="password"
                        className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={`Paste your ${provider === 'serpapi' ? 'SerpApi' : 'Google'} Key`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {provider === 'serpapi' ? 'Get free key at serpapi.com' : 'Get key from Google Cloud Console'}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default function GMapsScraperTool() {
    const [config, setConfig] = useState({ has_serpapi: false, has_google: false });
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ locked: false }); // Paywall State
    const navigate = useNavigate();

    // Search State
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');
    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState({ nextPageToken: null, nextOffset: null });

    // Selection State
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [labelName, setLabelName] = useState('');

    // History
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchHistory();
        checkStats();
    }, []);

    const checkStats = async () => {
        try {
            const res = await axios.get('/api/app/tools/stats', { params: { tool_code: 'tool_scraper' } });
            setStats(res.data);
        } catch (e) { }
    };

    const fetchConfig = async () => {
        try {
            const res = await axios.get('/api/app/tools/scraper/config');
            setConfig(res.data || { has_serpapi: false, has_google: false });
        } catch (e) {
            console.warn("Failed to load config", e);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/app/tools/scraper/history');
            setHistory(res.data || []);
        } catch (e) { }
    };

    const handleSaveConfig = async (provider, key) => {
        try {
            await axios.post('/api/app/tools/scraper/config', { provider, api_key: key });
            toast.success("API Key Saved Successfully");
            setIsConfigOpen(false);
            fetchConfig();
        } catch (e) {
            console.error(e);
            toast.error("Failed to save config: " + (e.response?.data?.error || e.message));
        }
    };

    const handleSearch = async (isLoadMore = false) => {
        if (!config.has_serpapi && !config.has_google) {
            toast.error("Please configure API Key first");
            setIsConfigOpen(true);
            return;
        }
        if (!keyword || !location) return toast.error("Keyword and Location required");

        setLoading(true);
        if (!isLoadMore) {
            setResults([]);
            setPagination({ nextPageToken: null, nextOffset: null });
            setSelectedIndices([]);
        }

        try {
            const payload = {
                keyword,
                location,
                provider: config.has_serpapi ? 'serpapi' : 'google_places'
            };

            // Attach pagination params if loading more
            if (isLoadMore) {
                if (pagination.nextPageToken) payload.pageToken = pagination.nextPageToken;
                if (pagination.nextOffset !== null) payload.offset = pagination.nextOffset;
            }

            const res = await axios.post('/api/app/tools/scraper/search', payload);

            // Backend now returns { results: [], nextPageToken: ..., nextOffset: ... }
            const newResults = res.data.results || []; // Fallback if backend not updated yet
            const token = res.data.nextPageToken;
            const offset = res.data.nextOffset;

            if (isLoadMore) {
                setResults(prev => [...prev, ...newResults]);
            } else {
                setResults(newResults);
                if (newResults.length === 0) toast("No leads found. Try different keywords.");
                fetchHistory();
            }

            setPagination({ nextPageToken: token, nextOffset: offset });

        } catch (err) {
            toast.error(err.response?.data?.error || "Search failed");
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryItem = async (id) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/tools/scraper/history/${id}`);
            setResults(res.data);
            setPagination({ nextPageToken: null, nextOffset: null });
            setShowHistory(false);
        } catch (e) { } finally { setLoading(false); }
    };

    const toggleSelectAll = () => {
        if (selectedIndices.length === results.length) setSelectedIndices([]);
        else setSelectedIndices(results.map((_, i) => i));
    };

    const toggleSelect = (idx) => {
        setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    const handleSaveContacts = async () => {
        if (selectedIndices.length === 0) return;
        const contacts = selectedIndices.map(i => results[i]);

        try {
            const label = labelName || `Scrape ${keyword} ${new Date().toLocaleDateString()}`;
            const res = await axios.post('/api/app/tools/scraper/save', {
                contacts,
                label_name: label
            });
            toast.success(`Saved ${res.data.saved_count} contacts!`);
            setLabelName('');
            setSelectedIndices([]);
        } catch (err) { toast.error("Save failed"); }
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(results);
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, `Leads-${keyword}.xlsx`);
    };

    const isLocked = false; // PERSONAL VERSION: Bypass Limit

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-indigo-600" /> GMaps Scraper
                    </h2>
                    <p className="text-xs text-gray-500">Find business leads from Google Maps.</p>
                </div>
                {!isLocked && (
                    <div className="flex gap-2">
                        <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-lg border transition-colors ${showHistory ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'hover:bg-gray-100 text-gray-600'}`} title="History">
                            <History className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsConfigOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 border" title="Settings">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* LEFT: Search Form */}
                <div className="w-96 bg-white border-r p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-lg relative">

                    {/* PAYWALL OVERLAY */}
                    {isLocked && (
                        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <Lock className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" /> Feature Locked
                            </h3>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">Unlock GMaps Scraper to automatically find business leads and export them.</p>
                            <button
                                onClick={() => navigate('/order')}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                            >
                                Upgrade Plan <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {showHistory ? (
                        <div className="animate-in slide-in-from-left-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold">Search History</h3>
                                <button onClick={() => setShowHistory(false)} className="text-xs text-blue-600 hover:underline">Back to Search</button>
                            </div>
                            <div className="space-y-2">
                                {history.map(h => (
                                    <div key={h.id} onClick={() => loadHistoryItem(h.id)} className="p-3 border rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                                        <p className="font-bold text-sm text-gray-800">{h.keyword}</p>
                                        <p className="text-xs text-gray-500 truncate">{h.location}</p>
                                        <div className="flex justify-between mt-2 items-center">
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase">{h.provider_used}</span>
                                            <span className="text-[10px] font-bold text-indigo-600">{h.total_results} Leads</span>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No history yet.</p>}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Keyword</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                    <input
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder="e.g. Coffee Shop, Lawyer"
                                        value={keyword}
                                        onChange={e => setKeyword(e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                <LocationInputOSM onSelect={setLocation} initialValue={location} disabled={isLocked} />
                                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3" /> Autocomplete by OpenStreetMap
                                </p>
                            </div>

                            <button
                                onClick={() => handleSearch(false)}
                                disabled={loading || isLocked}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-indigo-100"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                Find Leads
                            </button>

                            {(!config.has_serpapi && !config.has_google && !isLocked) && (
                                <div className="bg-yellow-50 p-4 rounded-lg text-xs text-yellow-800 border border-yellow-200">
                                    <p className="font-bold mb-1">⚠️ Configuration Missing</p>
                                    <p>You need to set up an API Key before scraping.</p>
                                    <button onClick={() => setIsConfigOpen(true)} className="mt-2 text-indigo-600 underline">Open Settings</button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT: Results */}
                <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
                    {results.length > 0 ? (
                        <>
                            <div className="p-4 flex justify-between items-center bg-white border-b">
                                <h3 className="font-bold text-gray-800">{results.length} Businesses Found</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleExport} className="px-3 py-1.5 border bg-white rounded text-sm hover:bg-gray-50 flex items-center gap-1 text-gray-700 font-medium">
                                        <Download className="w-4 h-4" /> Export Excel
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4">
                                <table className="w-full bg-white rounded-lg shadow-sm overflow-hidden text-sm border-collapse">
                                    <thead className="bg-gray-50 border-b text-left">
                                        <tr>
                                            <th className="p-3 w-10 text-center border-r">
                                                <button onClick={toggleSelectAll} className="focus:outline-none">
                                                    {selectedIndices.length === results.length && results.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                                </button>
                                            </th>
                                            <th className="p-3 font-bold text-gray-600 border-r">Business Name</th>
                                            <th className="p-3 font-bold text-gray-600 border-r">Phone</th>
                                            <th className="p-3 font-bold text-gray-600 border-r">Rating</th>
                                            <th className="p-3 font-bold text-gray-600">Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {results.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${selectedIndices.includes(idx) ? 'bg-indigo-50' : ''}`} onClick={() => toggleSelect(idx)}>
                                                <td className="p-3 text-center border-r">
                                                    {selectedIndices.includes(idx) ? <CheckSquare className="w-5 h-5 text-indigo-600 mx-auto" /> : <Square className="w-5 h-5 text-gray-300 mx-auto" />}
                                                </td>
                                                <td className="p-3 font-medium text-gray-900 border-r">
                                                    {item.name}
                                                    {item.website && <a href={item.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}><Globe className="w-3 h-3 inline ml-2 text-blue-400 hover:text-blue-600" /></a>}
                                                </td>
                                                <td className="p-3 font-mono text-gray-600 border-r">{item.phone}</td>
                                                <td className="p-3 border-r">
                                                    <div className="flex items-center gap-1 text-orange-500 font-bold">
                                                        <Star className="w-3 h-3 fill-current" /> {item.rating || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-500 truncate max-w-xs" title={item.address}>{item.address}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {(pagination.nextPageToken || pagination.nextOffset) && (
                                    <div className="p-4 flex justify-center border-t bg-gray-50">
                                        <button
                                            onClick={() => handleSearch(true)}
                                            disabled={loading}
                                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Load More Results
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Action */}
                            {selectedIndices.length > 0 && (
                                <div className="p-4 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex items-center justify-between animate-in slide-in-from-bottom-4 z-20">
                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">{selectedIndices.length} Selected</span>
                                    <div className="flex gap-3 items-center">
                                        <input
                                            className="border p-2 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Label Name (e.g. Scrape Coffee)"
                                            value={labelName}
                                            onChange={e => setLabelName(e.target.value)}
                                        />
                                        <button onClick={handleSaveContacts} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-transform active:scale-95">
                                            Save to Contacts
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <MapPin className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-600">Start Searching</h3>
                            <p className="max-w-xs mt-2">Enter a keyword and location to find targeted business leads with phone numbers.</p>
                        </div>
                    )}
                </div>
            </div>

            <ConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                currentConfig={config}
                onSave={handleSaveConfig}
            />
        </div>
    );
}
