import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

/**
 * ResolveModal - Resolve and close conversation
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onResolve - Resolve handler (receives closing message)
 * @param {string} props.defaultMessage - Default closing message
 */
export default function ResolveModal({ isOpen, onClose, onResolve, defaultMessage }) {
    const [message, setMessage] = useState(defaultMessage || 'Terima kasih telah menghubungi kami. Semoga hari Anda menyenangkan!');

    // Reset message when modal opens
    useEffect(() => {
        if (isOpen) {
            setMessage(defaultMessage || 'Terima kasih telah menghubungi kami. Semoga hari Anda menyenangkan!');
        }
    }, [isOpen, defaultMessage]);

    if (!isOpen) return null;

    const handleResolve = () => {
        onResolve(message);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Resolve Conversation
                </div>
            }
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleResolve}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                    >
                        Resolve & Close
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        This will mark the chat as <strong>"Done"</strong> and send a closing message with a rating link to the customer.
                    </p>

                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Closing Message
                    </label>
                    <textarea
                        className="w-full input h-24 resize-none"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Enter closing message..."
                    />
            </div>
        </Modal>
    );
}
