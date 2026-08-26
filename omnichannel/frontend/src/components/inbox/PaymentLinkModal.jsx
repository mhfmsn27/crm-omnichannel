import React, { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * PaymentLinkModal - Create payment link modal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onCreated - Created handler (receives payment data)
 */
const DURATION_OPTIONS = [
    { value: 1, label: '1 jam' },
    { value: 6, label: '6 jam' },
    { value: 12, label: '12 jam' },
    { value: 24, label: '24 jam (default)' },
    { value: 48, label: '48 jam' },
    { value: 72, label: '72 jam' },
];

export default function PaymentLinkModal({ isOpen, onClose, onCreated }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [durationHours, setDurationHours] = useState(24);
    const [loading, setLoading] = useState(false);

    // Reset form when closed
    React.useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setDescription('');
            setDurationHours(24);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreate = async (isQris = false) => {
        if (!amount || !description.trim()) {
            toast.error('Isi jumlah dan deskripsi');
            return;
        }
        setLoading(true);
        try {
            onCreated({ 
                amount: parseInt(amount), 
                description: description.trim(), 
                duration_hours: durationHours,
                is_qris: isQris
            });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="absolute bottom-[68px] left-2 bg-white dark:bg-dark-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-dark-border p-4 z-50 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Buat Payment Link</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="space-y-3">
                {/* Description */}
                <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Deskripsi Pembayaran
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="cth: DP Pesanan #12345"
                        className="input"
                    />
                </div>

                {/* Amount */}
                <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Jumlah (IDR)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="cth: 150000"
                        min="1"
                        className="input"
                    />
                    {amount && !isNaN(parseInt(amount)) && (
                        <p className="text-xs text-gray-400 mt-1">
                            Rp {parseInt(amount).toLocaleString('id-ID')}
                        </p>
                    )}
                </div>

                {/* Duration */}
                <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        Berlaku Selama
                    </label>
                    <select
                        value={durationHours}
                        onChange={e => setDurationHours(parseInt(e.target.value))}
                        className="input"
                    >
                        {DURATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                    {/* Submit Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                    <button
                        onClick={() => handleCreate(false)}
                        disabled={loading || !amount || !description.trim()}
                        className="w-full btn btn-primary bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg text-white"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Buat Link Pembayaran
                    </button>
                    <button
                        onClick={() => handleCreate(true)}
                        disabled={loading || !amount || !description.trim()}
                        className="w-full btn bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors"
                    >
                        ⚡ Format Tagihan QRIS
                    </button>
                </div>
            </div>
        </div>
    );
}
