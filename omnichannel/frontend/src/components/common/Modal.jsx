import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal - Reusable modal component with React Portal & Responsive Layout
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {ReactNode} props.children - Modal content
 * @param {ReactNode} props.footer - Modal footer content
 * @param {string} props.size - Modal size: 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'
 * @param {boolean} props.closeOnOverlay - Close when clicking overlay
 * @param {boolean} props.showClose - Show close button
 * @param {string} props.className - Additional CSS classes
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOverlay = true,
    showClose = true,
    className = '',
    ...props
}) {
    const modalRef = useRef(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        full: 'max-w-full',
    };

    const modalMarkup = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={closeOnOverlay ? onClose : undefined}
        >
            {/* Modal Content */}
            <div
                ref={modalRef}
                className={`
                    relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl ring-1 ring-white/10
                    w-full ${sizes[size]} max-h-[88vh] my-auto overflow-hidden flex flex-col
                    border border-gray-200 dark:border-slate-700
                    animate-in zoom-in-95 duration-200
                    ${className}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/60 shrink-0">
                        {title && (
                            <h2
                                id="modal-title"
                                className="font-bold text-gray-900 dark:text-white text-base"
                            >
                                {title}
                            </h2>
                        )}
                        {showClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/60 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
}

/**
 * Modal Footer Helper - Creates consistent footer layout
 */
export function ModalFooter({ children, className = '' }) {
    return (
        <div className={`flex items-center justify-end gap-2 ${className}`}>
            {children}
        </div>
    );
}
