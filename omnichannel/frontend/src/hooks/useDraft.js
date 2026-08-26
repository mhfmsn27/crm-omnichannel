import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDraft - Persist form state to localStorage
 *
 * @param {string} key - Storage key
 * @param {Object} initialState - Initial state object
 * @param {Object} options - Configuration
 * @param {number} options.debounceMs - Debounce delay in ms
 * @param {number} options.maxAge - Max age in ms before draft expires
 * @param {Function} options.validator - Optional validator function
 * @returns {Object} { state, setState, clearDraft, isStale }
 */
export function useDraft(key, initialState = {}, options = {}) {
    const { debounceMs = 2000, maxAge = 7 * 24 * 60 * 60 * 1000, validator } = options;

    const storageKey = `draft_${key}`;
    const timeoutRef = useRef(null);

    // Load initial state from storage or default
    const [state, setState] = useState(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                const age = Date.now() - parsed.timestamp;

                // Check if draft is stale
                if (maxAge && age > maxAge) {
                    localStorage.removeItem(storageKey);
                    return initialState;
                }

                // Validate if validator provided
                if (validator && !validator(parsed.data)) {
                    localStorage.removeItem(storageKey);
                    return initialState;
                }

                return parsed.data;
            }
        } catch (error) {
            console.warn(`[useDraft] Failed to load draft "${key}":`, error);
        }
        return initialState;
    });

    const [isStale, setIsStale] = useState(false);

    // Save to storage (debounced)
    const saveToStorage = useCallback((newState) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            try {
                const draftData = {
                    data: newState,
                    timestamp: Date.now(),
                };
                localStorage.setItem(storageKey, JSON.stringify(draftData));
                setIsStale(false);
            } catch (error) {
                console.warn(`[useDraft] Failed to save draft "${key}":`, error);
            }
        }, debounceMs);
    }, [storageKey, debounceMs]);

    // Set state dan auto-save
    const setDraftState = useCallback((newState) => {
        setState((prev) => {
            const next = typeof newState === 'function' ? newState(prev) : newState;
            saveToStorage(next);
            return next;
        });
    }, [saveToStorage]);

    // Clear draft
    const clearDraft = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        localStorage.removeItem(storageKey);
        setState(initialState);
        setIsStale(false);
    }, [storageKey, initialState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        state,
        setState: setDraftState,
        clearDraft,
        isStale,
        hasDraft: localStorage.getItem(storageKey) !== null,
    };
}

/**
 * useFormPersistence - Hook untuk persistence state management
 *
 * @param {string} key - Storage key
 * @param {Object} initialState - Initial state
 * @param {Object} options
 */
export function useFormPersistence(key, initialState = {}, options = {}) {
    const draft = useDraft(key, initialState, options);
    const [isDirty, setIsDirty] = useState(false);

    // Track dirty state
    const setState = useCallback((newState) => {
        setIsDirty(true);
        draft.setState(newState);
    }, [draft.setState]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    return {
        ...draft,
        setState,
        isDirty,
    };
}

/**
 * draftState - Template literal helper for draft state
 *
 * @param {string} key - Draft key
 * @param {Object} initial - Initial state
 * @param {Object} options - Options
 */
export function draftState(key, initial = {}, options = {}) {
    return useDraft(key, initial, options);
}

export default useDraft;
