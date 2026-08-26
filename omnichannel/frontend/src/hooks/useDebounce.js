import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing a value
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {*} The debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Custom hook for debouncing a callback function
 * @param {function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {function} The debounced callback
 */
export function useDebouncedCallback(callback, delay = 300) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

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
 * Custom hook for throttling a callback function
 * @param {function} callback - The callback to throttle
 * @param {number} limit - Minimum time between calls in milliseconds (default: 300)
 * @returns {function} The throttled callback
 */
export function useThrottledCallback(callback, limit = 300) {
    const lastCall = useRef(0);
    const timeoutRef = useRef(null);

    const throttledCallback = useCallback((...args) => {
        const now = Date.now();

        if (now - lastCall.current >= limit) {
            lastCall.current = now;
            callback(...args);
        } else {
            // Schedule for later if not already scheduled
            if (!timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    lastCall.current = Date.now();
                    callback(...args);
                    timeoutRef.current = null;
                }, limit - (now - lastCall.current));
            }
        }
    }, [callback, limit]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return throttledCallback;
}

/**
 * Debounce utility function (not a hook)
 * @param {function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} The debounced function
 */
export function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle utility function (not a hook)
 * @param {function} fn - The function to throttle
 * @param {number} limit - Minimum time between calls
 * @returns {function} The throttled function
 */
export function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
