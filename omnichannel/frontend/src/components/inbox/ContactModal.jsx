import React, { useState } from 'react';
import { User, Phone, Search } from 'lucide-react';
import axios from 'axios';
import Modal, { ModalFooter } from '../common/Modal';

/**
 * ContactModal - Send contact via WhatsApp
 */
export default function ContactModal({ isOpen, onClose, onSend, conversationId, contactPhone }) {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // Search existing contacts
    const searchContacts = async (query) => {
        if (!conversationId || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axios.get(`/api/app/contacts/search?q=${encodeURIComponent(query)}&limit=10`);
            if (res.data?.contacts) {
                setSearchResults(res.data.contacts);
            }
        } catch (err) {
            console.error('Contact search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        setPhone(val);
        setSelectedContact(null);

        if (val.length >= 10) {
            searchContacts(val);
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectContact = (contact) => {
        setSelectedContact(contact);
        setName(contact.name || '');
        setPhone(contact.phone_number || '');
        setSearchResults([]);
    };

    const handleSend = async () => {
        if (!phone) return;

        setIsSending(true);
        try {
            const contactData = {
                name: name || phone,
                phone: phone.replace(/[^0-9]/g, ''),
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${name || phone}\nTEL:${phone}\nEND:VCARD`
            };

            await onSend({
                type: 'contact',
                data: contactData
            });
            onClose();
        } catch (err) {
            console.error('Send contact error:', err);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kirim Kontak"
            size="md"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!phone || isSending}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
                        >
                            {isSending ? 'Mengirim...' : 'Kirim'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                {/* Contact Card Preview */}
                {selectedContact && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedContact.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{selectedContact.phone_number}</p>
                        </div>
                    </div>
                )}

                {/* Search/Phone Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Telepon</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="08xx-xxxx-xxxx"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Name Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama (opsional)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama kontak"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-slate-700 rounded-lg">
                        {searchResults.map((contact) => (
                            <button
                                key={contact.id}
                                onClick={() => handleSelectContact(contact)}
                                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-slate-700 last:border-b-0"
                            >
                                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-600 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{contact.phone_number}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {isSearching && (
                    <p className="text-sm text-gray-500 text-center">Mencari kontak...</p>
                )}
            </div>
        </Modal>
    );
}
