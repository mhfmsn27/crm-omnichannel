import React, { useState } from 'react';
import { X, EyeOff } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

const FilterChatModal = ({ isOpen, onClose, onFilter, teamMembers, labels, initialFilters }) => {
    const [channel, setChannel] = useState('');
    const [agentId, setAgentId] = useState('');
    const [selectedLabels, setSelectedLabels] = useState([]);
    const [filterBy, setFilterBy] = useState('');
    const [sortBy, setSortBy] = useState('last_message');
    const [hideKontakWa, setHideKontakWa] = useState(false);

    // Sync with props when opened
    React.useEffect(() => {
        if (isOpen && initialFilters) {
            setChannel(initialFilters.channel || '');
            setAgentId(initialFilters.agentId || '');
            setSelectedLabels(initialFilters.labels || []);
            setFilterBy(initialFilters.filterBy || '');
            setSortBy(initialFilters.sortBy || 'last_message');
            setHideKontakWa(initialFilters.hideKontakWa || false);
        }
    }, [isOpen, initialFilters]);

    // Dropdown state
    const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);

    if (!isOpen) return null;

    const handleLabelToggle = (labelId) => {
        if (selectedLabels.includes(labelId)) {
            setSelectedLabels(selectedLabels.filter(id => id !== labelId));
        } else {
            setSelectedLabels([...selectedLabels, labelId]);
        }
    };

    const handleApply = () => {
        onFilter({
            channel,
            agentId,
            labels: selectedLabels,
            filterBy,
            sortBy,
            hideKontakWa
        });
        onClose();
    };

    const handleReset = () => {
        const defaults = {
            channel: '',
            agentId: '',
            labels: [],
            filterBy: '',
            sortBy: 'last_message',
            hideKontakWa: false
        };

        setChannel(defaults.channel);
        setAgentId(defaults.agentId);
        setSelectedLabels(defaults.labels);
        setFilterBy(defaults.filterBy);
        setSortBy(defaults.sortBy);
        setHideKontakWa(defaults.hideKontakWa);

        onFilter(defaults);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Filter Percakapan Tingkat Lanjut"
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={handleReset} variant="ghost" className="mr-auto">
                        Reset Filter
                    </Button>
                    <Button onClick={handleApply}>
                        Terapkan
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4 overflow-visible p-1">
                {/* Tip Filter Status */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300">
                    <strong>Tip:</strong> Filter status utama (All, Unread, Urgent, Resolved) dapat dipilih langsung melalui tab di atas daftar chat.
                </div>

                {/* Tipe Channel */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                        Saluran Komunikasi (Channel)
                    </label>
                    <select
                        className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        value={channel}
                        onChange={e => setChannel(e.target.value)}
                    >
                        <option value="">Semua Saluran (All Channels)</option>
                        <option value="whatsapp">WhatsApp (QR Scan)</option>
                        <option value="wa-api">WhatsApp API (Official)</option>
                        <option value="wa-coex">WhatsApp CoEx</option>
                        <option value="email">Email Inbox</option>
                        <option value="messenger">Meta Messenger</option>
                        <option value="instagram">Instagram DM</option>
                        <option value="tiktok">TikTok Shop & DM</option>
                        <option value="shopee">Shopee Chat</option>
                        <option value="tokopedia">Tokopedia Chat</option>
                        <option value="line">LINE Official</option>
                        <option value="telegram">Telegram</option>
                        <option value="webchat">Webchat Widget</option>
                    </select>
                </div>

                {/* Agent */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                        Staf / Agent
                    </label>
                    <select
                        className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        value={agentId}
                        onChange={e => setAgentId(e.target.value)}
                    >
                        <option value="">Semua Agent</option>
                        {teamMembers && teamMembers.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                </div>

                {/* Label - Custom Dropdown */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                        Label / Tag Kontak
                    </label>

                    <button
                        type="button"
                        onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
                        className="w-full text-left border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center"
                    >
                        <span className={selectedLabels.length === 0 ? "text-gray-500" : ""}>
                            {selectedLabels.length === 0 ? "Pilih Label" : `${selectedLabels.length} Label Dipilih`}
                        </span>
                        <span className="text-gray-400 text-[10px]">▼</span>
                    </button>

                    {isLabelDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setIsLabelDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[70] max-h-48 overflow-y-auto custom-scrollbar">
                                {labels && labels.length > 0 ? (
                                    labels.map(l => (
                                        <div
                                            key={l.id}
                                            onClick={() => handleLabelToggle(l.id)}
                                            className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedLabels.includes(l.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-slate-500'}`}>
                                                {selectedLabels.includes(l.id) && <X className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-200">{l.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-sm text-gray-500 text-center">Belum ada label tersedia</div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Selected Labels Display */}
                    {selectedLabels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedLabels.map(lid => {
                                const lbl = labels?.find(l => l.id === lid);
                                return (
                                    <span key={lid} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300">
                                        {lbl?.name || lid} <button type="button" onClick={() => handleLabelToggle(lid)}><X className="w-3 h-3" /></button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Filter Berdasarkan Status Baca */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                            Status Baca
                        </label>
                        <select
                            className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filterBy}
                            onChange={e => setFilterBy(e.target.value)}
                        >
                            <option value="">Semua</option>
                            <option value="read">Sudah Dibaca</option>
                            <option value="unread">Belum Dibaca</option>
                        </select>
                    </div>

                    {/* Urutan Chat */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                            Urutkan
                        </label>
                        <select
                            className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="last_message">Percakapan Terakhir</option>
                            <option value="oldest">Terlama</option>
                            <option value="newest">Terbaru</option>
                        </select>
                    </div>
                </div>

                {/* Sembunyikan Kontak Tidak Dikenal Toggle */}
                <div className="relative overflow-hidden group p-3.5 border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-r from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-slate-800 rounded-xl flex items-center justify-between transition-all duration-300 hover:shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                            <EyeOff className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">Sembunyikan Kontak Tidak Dikenal</span>
                            <span className="block text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">Filter chat sementara yang belum tersimpan</span>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={hideKontakWa}
                            onChange={(e) => setHideKontakWa(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-xs dark:border-gray-600 peer-checked:bg-indigo-500"></div>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

export default FilterChatModal;
