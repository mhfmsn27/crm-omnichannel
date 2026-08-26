import React from 'react';
import { User, Phone } from 'lucide-react';
import { getInitialsAvatar } from '../../utils/avatar';

/**
 * Contact Card Message Component
 * Displays shared WhatsApp contacts
 */
export function ContactCard({ data, isOutbound }) {
    let contactData;
    try {
        contactData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
        contactData = { name: 'Unknown Contact', phone: '' };
    }

    const { name, phone, vcard } = contactData;

    const handleViewContact = () => {
        if (vcard) {
            const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name || phone || 'contact'}.vcf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <div className="min-w-[200px] max-w-[280px] bg-white dark:bg-[#1e293b] rounded-lg shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-3 py-2 flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-full">
                    <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Kontak</span>
            </div>

            {/* Contact Info */}
            <div className="p-3">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <img
                        src={getInitialsAvatar(name)}
                        alt={name}
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {name || 'Unknown Contact'}
                        </p>

                        {phone && (
                            <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-gray-400 text-xs">
                                <Phone className="w-3 h-3" />
                                <span>{formatPhone(phone)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Contact Button */}
                <button
                    onClick={handleViewContact}
                    className={`w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors
                        ${isOutbound
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                >
                    Lihat Kontak
                </button>
            </div>
        </div>
    );
}

/**
 * Format phone number for display
 */
function formatPhone(phone) {
    if (!phone) return '';
    // Clean up phone number
    const cleaned = phone.replace(/[^0-9+]/g, '');
    // Format as Indonesian number if applicable
    if (cleaned.startsWith('62')) {
        return '0' + cleaned.slice(2);
    }
    return cleaned;
}

export default ContactCard;
