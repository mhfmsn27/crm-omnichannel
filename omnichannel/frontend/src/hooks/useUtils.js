import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useLocalStorage - Sync state with localStorage
 *
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {[any, Function]} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

/**
 * useSessionStorage - Sync state with sessionStorage
 *
 * @param {string} key - sessionStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {[any, Function]} [value, setValue]
 */
export function useSessionStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading sessionStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting sessionStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

/**
 * useMediaQuery - Respond to CSS media queries
 *
 * @param {string} query - Media query string
 * @returns {boolean} Whether the query matches
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Create event listener
        const handler = (e) => setMatches(e.matches);

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
        // Legacy browsers
        else {
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }
    }, [query]);

    return matches;
}

/**
 * useClickOutside - Detect clicks outside an element
 *
 * @param {RefObject} ref - Ref to the element
 * @param {Function} handler - Callback when clicked outside
 * @param {boolean} enabled - Whether to listen for clicks
 */
export function useClickOutside(ref, handler, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler, enabled]);
}

/**
 * usePrevious - Get the previous value of a variable
 *
 * @param {any} value - Current value
 * @returns {any} Previous value
 */
export function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

/**
 * useToggle - Toggle between two values
 *
 * @param {boolean} initialValue - Initial toggle state
 * @returns {[boolean, Function]} [value, toggle, setTrue, setFalse]
 */
export function useToggle(initialValue = false) {
    const [value, setValue] = useState(initialValue);

    const toggle = useCallback(() => setValue(v => !v), []);
    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);

    return [value, toggle, setTrue, setFalse];
}

/**
 * useAsync - Handle async operations with loading/error states
 *
 * @param {Function} asyncFunction - Async function to execute
 * @param {Array} dependencies - Dependencies that trigger re-execution
 * @returns {Object} { execute, loading, error, data, setData }
 */
export function useAsync(asyncFunction, dependencies = []) {
    const [state, setState] = useState({
        loading: false,
        error: null,
        data: null,
    });

    const execute = useCallback(async (...args) => {
        setState({ loading: true, error: null, data: null });
        try {
            const result = await asyncFunction(...args);
            setState({ loading: false, error: null, data: result });
            return result;
        } catch (error) {
            setState({ loading: false, error, data: null });
            throw error;
        }
    }, dependencies);

    const setData = useCallback((data) => {
        setState(prev => ({ ...prev, data }));
    }, []);

    return { execute, loading: state.loading, error: state.error, data: state.data, setData };
}

/**
 * useInterval - Set an interval
 *
 * @param {Function} callback - Function to call on each interval
 * @param {number|null} delay - Interval delay in ms (null to pause)
 */
export function useInterval(callback, delay) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const id = setInterval(() => savedCallback.current(), delay);
        return () => clearInterval(id);
    }, [delay]);
}

/**
 * useDebouncedCallback - Debounce a callback function
 *
 * @param {Function} callback - Function to debounce
 * @param {number} wait - Debounce delay in ms
 * @returns {Function} Debounced function
 */
export function useDebouncedCallback(callback, wait) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, wait);
    }, [callback, wait]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * useCopyToClipboard - Copy text to clipboard
 *
 * @returns {Object} { copy, copied, error }
 */
export function useCopyToClipboard() {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const copy = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setError(null);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setError(err);
            setCopied(false);
        }
    }, []);

    return { copy, copied, error };
}

export default {
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
};
