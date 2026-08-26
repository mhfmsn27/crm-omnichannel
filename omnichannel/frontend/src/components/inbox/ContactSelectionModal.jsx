import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, User, Phone, ArrowLeft, Smartphone, Loader2 } from 'lucide-react';
import { getInitialsAvatar } from '../../utils/avatar';
import Modal from '../common/Modal';

const isPhoneInput = (term) => term.replace(/[\s\-\+\(\)]/g, '').replace(/\D/g, '').length >= 6;

export default function ContactSelectionModal({ isOpen, onClose, onSelect, waDevices = [] }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingPhone, setPendingPhone] = useState(null);
    const [pendingContact, setPendingContact] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        } else {
            setSearchTerm('');
            setPendingPhone(null);
            setPendingContact(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen && pendingPhone === null) fetchContacts();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/contacts', {
                params: { limit: 20, search: searchTerm }
            });
            setContacts(res.data.data);
        } catch (err) {
            console.error("Failed to load contacts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleContactConfirm = (contact) => {
        if (waDevices.length === 0) {
            // No WA devices — select contact directly (will show error on send if no session)
            onSelect(contact);
            onClose();
            return;
        }
        if (waDevices.length === 1) {
            onSelect({ ...contact, device: waDevices[0] });
            onClose();
            return;
        }
        setPendingContact(contact);
        setPendingPhone(contact.phone_number);
    };

    const handlePhoneConfirm = (phone) => {
        if (waDevices.length === 1) {
            onSelect({ phone_number: phone, device: waDevices[0] });
            onClose();
            return;
        }
        setPendingContact(null);
        setPendingPhone(phone);
    };

    const handleDeviceSelect = (device) => {
        if (pendingContact) {
            onSelect({ ...pendingContact, device });
        } else {
            onSelect({ phone_number: pendingPhone, device });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    {pendingPhone && (
                        <button onClick={() => { setPendingPhone(null); setPendingContact(null); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors mr-1">
                            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    )}
                    <span>{pendingPhone ? 'Select WhatsApp Device' : 'New Message'}</span>
                </div>
            }
            size="md"
        >
            <div className="flex flex-col h-[60vh] -mx-4 -my-4">
                {pendingPhone ? (
                    /* Step 2: Device Picker */
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
                            Send first message to <span className="font-semibold text-gray-700 dark:text-gray-200">{pendingPhone}</span> via:
                        </p>
                        {waDevices.length === 0 ? (
                            <div className="text-center py-8 text-sm">
                                <p className="text-red-500 font-medium">No connected WhatsApp devices.</p>
                                <p className="text-gray-400 mt-1 text-xs">Please connect a WhatsApp device first in the Integration settings.</p>
                            </div>
                        ) : (
                            waDevices.map(device => (
                                <button
                                    key={device.id}
                                    onClick={() => handleDeviceSelect(device)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
                                        <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                                            {device.name}
                                        </h4>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    /* Step 1: Contact Search */
                    <>
                        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white placeholder-gray-500"
                                    placeholder="Search name or phone number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {loading && contacts.length === 0 ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                </div>
                            ) : contacts.length > 0 ? (
                                contacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleContactConfirm(contact)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                                            <img
                                                src={contact.profile_pic_url || getInitialsAvatar(contact.name || contact.phone_number)}
                                                onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(contact.name || contact.phone_number); }}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                                                {contact.name || contact.phone_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {contact.phone_number}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            ) : searchTerm && isPhoneInput(searchTerm) ? (
                                <button
                                    onClick={() => handlePhoneConfirm(searchTerm)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all text-left group border border-dashed border-green-300 dark:border-green-700"
                                >
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 border border-green-200 dark:border-green-700">
                                        <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-green-700 dark:text-green-400 text-sm truncate">
                                            Start chat with this number
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {searchTerm}
                                        </p>
                                    </div>
                                </button>
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    {searchTerm ? 'No contacts found. Enter a phone number to start a new chat.' : 'No contacts found.'}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
