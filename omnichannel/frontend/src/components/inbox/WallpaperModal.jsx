import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

/**
 * WallpaperModal - Chat wallpaper customization modal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save wallpaper handler
 */
export default function WallpaperModal({ isOpen, onClose, onSave }) {
    const [customUrl, setCustomUrl] = useState('');

    const PRESETS = [
        { type: 'image', value: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png', label: 'Classic WhatsApp' },
        { type: 'color', value: '#efeae2', label: 'Default Beige' },
        { type: 'color', value: '#ffffff', label: 'Clean White' },
        { type: 'color', value: '#0f172a', label: 'Dark Slate' },
        { type: 'color', value: '#1e293b', label: 'Midnight' },
        { type: 'image', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80', label: 'Abstract Gradient' },
        { type: 'image', value: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80', label: 'Dark Nebula' },
    ];

    const handleApply = (val) => {
        onSave(val);
        onClose();
    };

    // Reset custom URL when modal closes
    useEffect(() => {
        if (!isOpen) setCustomUrl('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Chat Wallpaper
                </div>
            }
            size="md"
        >
            <div className="space-y-6">
                    {/* Presets Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        {PRESETS.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleApply(preset.value)}
                                className="aspect-square rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all relative shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                title={preset.label}
                            >
                                {preset.type === 'image' ? (
                                    <img src={preset.value} className="w-full h-full object-cover" alt={preset.label} />
                                ) : (
                                    <div
                                        className="w-full h-full"
                                        style={{ backgroundColor: preset.value }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom URL Input */}
                    <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            Custom Image URL
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                className="flex-1 input"
                                placeholder="https://..."
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                            />
                            <Button
                                onClick={() => handleApply(customUrl)}
                                disabled={!customUrl}
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
            </div>
        </Modal>
    );
}
