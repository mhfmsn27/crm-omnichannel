import React from 'react';
import { createPortal } from 'react-dom';
import { X, Forward, Download } from 'lucide-react';

/**
 * Lightbox - Full screen image/video viewer with download and forward options
 *
 * @param {Object} props
 * @param {string} props.src - Media source URL
 * @param {string} props.type - Media type ('image' or 'video')
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onForward - Forward handler
 */
export default function Lightbox({ src, type, onClose, onForward }) {
    if (!src) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full transition-colors"
                aria-label="Close"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Media Container */}
            <div className="flex-1 flex items-center justify-center w-full max-w-5xl">
                {type === 'video' ? (
                    <video
                        src={src}
                        controls
                        className="max-w-full max-h-[80vh] rounded shadow-2xl"
                        autoPlay
                    />
                ) : (
                    <img
                        src={src}
                        alt="Full screen"
                        className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-4">
                <a
                    href={src}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Download
                </a>
                {onForward && (
                    <button
                        onClick={onForward}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                        <Forward className="w-4 h-4" />
                        Forward
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}
