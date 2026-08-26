/**
 * Custom React Hooks Index
 * Export all custom hooks for easier imports
 */

// Accessibility Hooks
export { useFocusTrap, useRovingTabIndex, useAriaAnnounce, useScreenReaderOnly, SkipLink, useAnnounceOnChange, useModalAria, useListboxAria, useUniqueId } from './useAccessibility';

// Keyboard Shortcuts Hook
export { useKeyboardShortcuts, KeyboardShortcutsProvider, HelpModal, ShortcutHint, DEFAULT_SHORTCUTS } from './useKeyboardShortcuts';

// Re-export debounce hook if it exists in useDebounce.js
export { useDebounce } from './useDebounce';

// Utility Hooks
export {
    useLocalStorage,
    useSessionStorage,
    useMediaQuery,
    useClickOutside,
    usePrevious,
    useToggle,
    useAsync,
    useInterval,
    useDebouncedCallback,
    useCopyToClipboard,
} from './useUtils';

// Form Persistence
export { useDraft, useFormPersistence, draftState } from './useDraft.js';
