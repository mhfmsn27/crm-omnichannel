import { useEffect, useCallback, useState } from 'react';

/**
 * useFocusTrap - Trap focus within an element (for modals, dialogs)
 *
 * @param {boolean} isActive - Whether the trap is active
 * @returns {Object} ref to attach to the container element
 */
export function useFocusTrap(isActive) {
    const containerRef = useCallback((node) => {
        if (!node || !isActive) return;

        const focusableElements = node.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus first element on mount
        if (firstElement) {
            firstElement.focus();
        }

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        node.addEventListener('keydown', handleKeyDown);

        return () => {
            node.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive]);

    return containerRef;
}

/**
 * useRovingTabIndex - Manage roving tabindex for a list of items
 *
 * @param {number} itemCount - Number of items
 * @param {Object} options - Configuration options
 * @returns {Object} { activeIndex, setActiveIndex, handleKeyDown, getTabIndex, getAriaSelected }
 */
export function useRovingTabIndex(itemCount, options = {}) {
    const { loop = true, orientation = 'horizontal' } = options;
    const [activeIndex, setActiveIndex] = useState(options.initialIndex || 0);

    const handleKeyDown = useCallback((e) => {
        const isVertical = orientation === 'vertical';
        const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

        let newIndex = activeIndex;

        if (e.key === prevKey) {
            e.preventDefault();
            newIndex = activeIndex - 1;
            if (newIndex < 0) newIndex = loop ? itemCount - 1 : 0;
        } else if (e.key === nextKey) {
            e.preventDefault();
            newIndex = activeIndex + 1;
            if (newIndex >= itemCount) newIndex = loop ? 0 : itemCount - 1;
        } else if (e.key === 'Home') {
            e.preventDefault();
            newIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            newIndex = itemCount - 1;
        }

        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [activeIndex, itemCount, loop, orientation]);

    const getTabIndex = (index) => index === activeIndex ? 0 : -1;
    const getAriaSelected = (index) => index === activeIndex;

    return { activeIndex, setActiveIndex, handleKeyDown, getTabIndex, getAriaSelected };
}

/**
 * useAriaAnnounce - Announce messages to screen readers
 *
 * @returns {Object} { announce, PoliteAnnouncer, AssertiveAnnouncer }
 */
export function useAriaAnnounce() {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message, priority = 'polite') => {
        if (priority === 'assertive') {
            setAssertiveMessage('');
            setTimeout(() => setAssertiveMessage(message), 50);
        } else {
            setPoliteMessage('');
            setTimeout(() => setPoliteMessage(message), 50);
        }
    }, []);

    const PoliteAnnouncer = () => (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
        >
            {politeMessage}
        </div>
    );

    const AssertiveAnnouncer = () => (
        <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
        >
            {assertiveMessage}
        </div>
    );

    return { announce, PoliteAnnouncer, AssertiveAnnouncer };
}

/**
 * useScreenReaderOnly - Hook for screen reader only text
 *
 * @param {string} text - Text to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function useScreenReaderOnly(text, priority = 'polite') {
    return (
        <div
            role={priority === 'assertive' ? 'alert' : 'status'}
            aria-live={priority}
            className="sr-only"
        >
            {text}
        </div>
    );
}

/**
 * useSkipLink - Create accessible skip navigation link
 *
 * @param {string} targetId - ID of the main content element
 * @param {string} label - Label for the skip link
 */
export function SkipLink({ targetId, label = 'Skip to main content' }) {
    const handleClick = (e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.tabIndex = -1;
            target.focus();
            target.scrollIntoView();
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
            {label}
        </a>
    );
}

/**
 * useAnnounceOnChange - Announce changes to screen readers
 *
 * @param {any} value - Value to watch for changes
 * @param {Object} options - Configuration
 */
export function useAnnounceOnChange(value, options = {}) {
    const { onChange, priority = 'polite', debounce = 100 } = options;
    const { announce, PoliteAnnouncer, AssertiveAnnouncer } = useAriaAnnounce();

    useEffect(() => {
        if (onChange) {
            const timeout = setTimeout(() => {
                announce(onChange, priority);
            }, debounce);
            return () => clearTimeout(timeout);
        }
    }, [value, onChange, announce, priority, debounce]);

    return { PoliteAnnouncer, AssertiveAnnouncer };
}

/**
 * Accessibility attributes for modal dialogs
 *
 * @param {Object} props
 * @param {string} props.id - Unique ID for the modal
 * @param {string} props.title - Title/label for the modal
 * @param {boolean} props.isOpen - Whether modal is open
 */
export function useModalAria({ id, title, isOpen }) {
    return {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': id ? `${id}-title` : undefined,
        'aria-describedby': id ? `${id}-description` : undefined,
        id,
    };
}

/**
 * Accessibility attributes for listboxes
 *
 * @param {Object} props
 * @param {string} props.label - Listbox label
 * @param {string} props.multiple - Whether multiple selection is allowed
 */
export function useListboxAria({ label, multiple = false }) {
    return {
        role: 'listbox',
        'aria-label': label,
        'aria-multiselectable': multiple,
    };
}

/**
 * Generate unique IDs for accessibility
 */
let idCounter = 0;
export function useUniqueId(prefix = 'aria') {
    const [id] = useState(() => `${prefix}-${++idCounter}`);
    return id;
}

export default {
    useFocusTrap,
    useRovingTabIndex,
    useAriaAnnounce,
    useScreenReaderOnly,
    SkipLink,
    useAnnounceOnChange,
    useModalAria,
    useListboxAria,
    useUniqueId,
};
