import React, { useState } from 'react';
import { X, Plus, Trash2 as Trash, BarChart3 } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

/**
 * PollModal - Create and send poll via WhatsApp
 * Note: WhatsApp polls work in groups. Sending to individual chats may not work.
 */
export default function PollModal({ isOpen, onClose, onSend, isGroupChat }) {
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSend = async () => {
        // Validate
        const validOptions = options.filter(opt => opt.trim());
        if (!title.trim()) {
            setError('Judul poll diperlukan');
            return;
        }
        if (validOptions.length < 2) {
            setError('Minimal 2 opsi diperlukan');
            return;
        }

        setIsSending(true);
        setError('');

        try {
            await onSend({
                type: 'poll',
                data: {
                    title: title.trim(),
                    options: validOptions.map(opt => ({
                        optionName: opt.trim()
                    })),
                    isMultiSelect
                }
            });
            onClose();
        } catch (err) {
            setError('Gagal mengirim poll');
            console.error('Send poll error:', err);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Buat Polling"
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="ghost">
                        Batal
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending}
                        leftIcon={<BarChart3 className="w-4 h-4" />}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        {isSending ? 'Mengirim...' : 'Kirim Polling'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    {/* Info for individual chats */}
                    {!isGroupChat && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Polling hanya berfungsi di dalam grup WhatsApp
                            </p>
                        </div>
                    )}

                    {/* Poll Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pertanyaan Polling <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setError(''); }}
                            placeholder="Apa pendapat Anda?"
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Opsi <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => { updateOption(index, e.target.value); setError(''); }}
                                            placeholder={`Opsi ${index + 1}`}
                                            className="w-full pl-4 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-500" />
                                    </div>
                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(index)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {options.length < 10 && (
                            <button
                                onClick={addOption}
                                className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Opsi
                            </button>
                        )}
                    </div>

                    {/* Multi-select Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Pilih Banyak</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Izinkan voters memilih lebih dari satu opsi</p>
                        </div>
                        <button
                            onClick={() => setIsMultiSelect(!isMultiSelect)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                isMultiSelect ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        >
                            <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    isMultiSelect ? 'left-7' : 'left-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
            </div>
        </Modal>
    );
}
