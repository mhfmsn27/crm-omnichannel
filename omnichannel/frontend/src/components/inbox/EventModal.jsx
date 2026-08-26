import React, { useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal';

/**
 * EventModal - Create and send event via WhatsApp
 * Note: WhatsApp events work in groups. Sending to individual chats may not work.
 */
export default function EventModal({ isOpen, onClose, onSend, isGroupChat }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        // Validate
        if (!name.trim()) {
            setError('Nama acara diperlukan');
            return;
        }
        if (!date) {
            setError('Tanggal diperlukan');
            return;
        }

        setIsSending(true);
        setError('');

        try {
            // Convert date/time to Unix timestamp
            const dateTimeStr = date && time ? `${date} ${time}` : date;
            const eventDate = new Date(dateTimeStr);
            const timestamp = eventDate.getTime();

            await onSend({
                type: 'event',
                data: {
                    name: name.trim(),
                    description: description.trim() || null,
                    location: location.trim() || null,
                    startTime: timestamp.toString(),
                    organizer: 'CRM User'
                }
            });
            onClose();
        } catch (err) {
            setError('Gagal mengirim acara');
            console.error('Send event error:', err);
        } finally {
            setIsSending(false);
        }
    };

    // Get tomorrow's date as default
    const getTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Buat Acara"
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
                            disabled={isSending}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            {isSending ? 'Mengirim...' : 'Kirim Acara'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Info for individual chats */}
                {!isGroupChat && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            Acara hanya berfungsi di dalam grup WhatsApp
                        </p>
                    </div>
                )}

                {/* Event Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nama Acara <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder="Contoh: Meeting Team"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi (opsional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Deskripsi acara..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi (opsional)</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Contoh: Room 101, Jakarta"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tanggal <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => { setDate(e.target.value); setError(''); }}
                                min={getTomorrow()}
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waktu</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        </Modal>
    );
}
