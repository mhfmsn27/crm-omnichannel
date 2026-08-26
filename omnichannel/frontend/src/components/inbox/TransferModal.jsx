import React from 'react';
import { X, User } from 'lucide-react';
import { getInitialsAvatar } from '../../utils/avatar';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

/**
 * TransferModal - Transfer conversation to another agent
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onTransfer - Transfer handler (receives agentId)
 * @param {Array} props.agents - List of available agents
 */
export default function TransferModal({ isOpen, onClose, onTransfer, agents }) {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Transfer Chat
                </div>
            }
            size="sm"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="secondary" className="w-full">
                        Cancel
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-2">
                    {agents.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No other agents available.
                            </p>
                        </div>
                    ) : (
                        agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => onTransfer(agent.id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors text-left min-h-[60px]"
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                                    <img
                                        src={agent.profile_pic_url || getInitialsAvatar(agent.name)}
                                        onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(agent.name); }}
                                        className="w-full h-full object-cover"
                                        alt={agent.name}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                        {agent.name}
                                        {agent.division && (
                                            <span className="text-gray-500 font-normal ml-1">- {agent.division}</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{agent.email}</p>
                                </div>
                            </button>
                        ))
                    )}
            </div>
        </Modal>
    );
}
