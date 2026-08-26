import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal, { ModalFooter } from '../components/common/Modal';

/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts
 *
 * @param {Object} shortcuts - Object mapping keyboard shortcuts to handlers
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether shortcuts are enabled
 * @param {string} options.tag - HTML element tag to attach listeners to
 * @param {boolean} options.preventDefault - Whether to prevent default behavior
 *
 * Usage:
 * useKeyboardShortcuts({
 *   'ctrl+k': () => openSearch(),
 *   'ctrl+n': () => newConversation(),
 *   'escape': () => closeModal(),
 *   '?': () => showHelp(),
 * });
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
    const {
        enabled = true,
        tag = 'document',
        preventDefault = true,
    } = options;

    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in input fields
        const target = event.target;
        const isInputField = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        // Allow Escape in input fields
        const isEscape = event.key === 'Escape';

        if (isInputField && !isEscape) return;

        // Build the key combination string
        const keys = [];

        if (event.ctrlKey || event.metaKey) keys.push('ctrl');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');

        // Add the main key (normalize for case-insensitivity)
        const key = event.key.toLowerCase();
        if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
            keys.push(key);
        }

        const combo = keys.join('+');

        // Check if this combo matches any shortcut
        const handler = shortcuts[combo];

        if (handler) {
            if (preventDefault) {
                event.preventDefault();
            }
            handler(event);
        }
    }, [shortcuts, enabled, preventDefault]);

    useEffect(() => {
        if (!enabled) return;

        const element = tag === 'document' ? document : document.querySelector(tag);
        if (!element) return;

        element.addEventListener('keydown', handleKeyDown);

        return () => {
            element.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, enabled, tag]);
}

/**
 * KeyboardShortcutsProvider - Provider component for global shortcuts
 */
export function KeyboardShortcutsProvider({ children, shortcuts = {} }) {
    useKeyboardShortcuts(shortcuts);
    return children;
}

/**
 * Default keyboard shortcuts for the app
 */
export const DEFAULT_SHORTCUTS = {
    // Navigation
    'ctrl+k': 'openSearch',
    'ctrl+/': 'showHelp',
    'escape': 'closeModal',
    '?': 'showHelp',

    // Inbox
    'ctrl+n': 'newConversation',
    'ctrl+r': 'refresh',
    'ctrl+f': 'focusSearch',

    // Messaging
    'ctrl+enter': 'sendMessage',
    'escape': 'clearInput',

    // Navigation
    'g h': 'goHome',
    'g i': 'goInbox',
    'g c': 'goContacts',
    'g s': 'goSettings',
};

/**
 * Shortcut hint component for displaying keyboard shortcuts
 */
export function ShortcutHint({ shortcut, className = '' }) {
    const formatShortcut = (combo) => {
        return combo.split('+').map(key => {
            switch (key) {
                case 'ctrl': return '⌘';
                case 'alt': return '⌥';
                case 'shift': return '⇧';
                case 'escape': return 'Esc';
                case 'enter': return '↵';
                case 'arrowup': return '↑';
                case 'arrowdown': return '↓';
                case 'arrowleft': return '←';
                case 'arrowright': return '→';
                case 'backspace': return '⌫';
                case ' ': return 'Space';
                default: return key.toUpperCase();
            }
        }).join(' + ');
    };

    return (
        <kbd className={`
            inline-flex items-center justify-center
            px-1.5 py-0.5
            bg-gray-100 dark:bg-slate-700
            border border-gray-200 dark:border-slate-600
            rounded text-[10px] font-mono font-bold
            text-gray-600 dark:text-gray-300
            shadow-sm
            ${className}
        `}>
            {formatShortcut(shortcut)}
        </kbd>
    );
}

/**
 * HelpModal - Modal showing all keyboard shortcuts
 */
export function HelpModal({ isOpen, onClose, shortcuts = {} }) {
    if (!isOpen) return null;

    const shortcutGroups = {
        'Navigation': {
            'ctrl+k': 'Open Search',
            'ctrl+/': 'Show Shortcuts',
            '?': 'Show Help',
            'g h': 'Go to Home',
            'g i': 'Go to Inbox',
            'g c': 'Go to Contacts',
            'g s': 'Go to Settings',
        },
        'Actions': {
            'ctrl+n': 'New Conversation',
            'ctrl+r': 'Refresh',
            'ctrl+f': 'Focus Search',
            'escape': 'Close Modal / Cancel',
        },
        'Messaging': {
            'ctrl+enter': 'Send Message',
            'escape': 'Clear Input',
        },
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keyboard Shortcuts"
            size="md"
            footer={
                <ModalFooter>
                    <button
                        onClick={onClose}
                        className="w-full btn btn-secondary"
                    >
                        Close
                    </button>
                </ModalFooter>
            }
        >
            <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(shortcutGroups).map(([group, items]) => (
                    <div key={group} className="mb-6 last:mb-0">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                            {group}
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(items).map(([shortcut, description]) => (
                                <div key={shortcut} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {description}
                                    </span>
                                    <ShortcutHint shortcut={shortcut} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

export default useKeyboardShortcuts;
