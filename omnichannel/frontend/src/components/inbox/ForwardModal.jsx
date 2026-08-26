import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Send, User, Loader2, CheckCircle } from 'lucide-react';
import { getInitialsAvatar } from '../../utils/avatar';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

export default function ForwardModal({ isOpen, onClose, onForward, messageToForward }) {
    const [search, setSearch] = useState('');
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]); 

    useEffect(() => {
        if (isOpen) {
            fetchRecentConversations();
            setSearch('');
            setSelectedIds([]);
        }
    }, [isOpen]);

    const fetchRecentConversations = async () => {
        setLoading(true);
        try {
            // Reuse conversations endpoint
            const res = await axios.get('/api/app/inbox/conversations', { params: { limit: 20 } });
            // FIX: Extract conversations array from response object
            setConversations(res.data.conversations || []);
        } catch (err) {
            console.error(err);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (query.length > 2) {
            setLoading(true);
            try {
                const res = await axios.get('/api/app/inbox/conversations', { params: { search: query } });
                // FIX: Extract conversations array from response object
                setConversations(res.data.conversations || []);
            } catch(e) {
                setConversations([]);
            } finally { 
                setLoading(false); 
            }
        } else if (query.length === 0) {
            fetchRecentConversations();
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSend = () => {
        if (selectedIds.length === 0) return;
        onForward(selectedIds, messageToForward);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Forward Message"
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="ghost">Cancel</Button>
                    <Button 
                        onClick={handleSend} 
                        disabled={selectedIds.length === 0}
                        leftIcon={<Send className="w-4 h-4" />}
                    >
                        {selectedIds.length > 0 ? `Send (${selectedIds.length})` : 'Send'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="flex flex-col h-[50vh] -mx-4 -my-4">
                <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            placeholder="Search contact..."
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loading && <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
                    
                    {Array.isArray(conversations) && conversations.map(c => {
                        const isSelected = selectedIds.includes(c.id);
                        return (
                            <div 
                                key={c.id} 
                                onClick={() => toggleSelection(c.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                                        <img
                                            src={c.profile_pic_url || getInitialsAvatar(c.name)}
                                            onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(c.name); }}
                                            className="w-full h-full object-cover rounded-full"
                                            alt=""
                                        />
                                    </div>
                                    {isSelected && (
                                        <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 border-2 border-white">
                                            <CheckCircle className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{c.contact_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{c.phone_number}</p>
                                </div>
                            </div>
                        );
                    })}
                    {(!conversations || conversations.length === 0) && !loading && (
                        <div className="p-4 text-center text-gray-400 text-sm">No contacts found</div>
                    )}
                </div>

            </div>
        </Modal>
    );
}
