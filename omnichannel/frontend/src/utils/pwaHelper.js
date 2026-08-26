/**
 * PWA & Desktop Notification Helper for Agents
 * Enables background audio & system popup notifications when new messages arrive.
 */

export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[PWA] Service Worker registered with scope:', registration.scope);
            return registration;
        } catch (error) {
            console.warn('[PWA] Service Worker registration failed:', error.message);
        }
    }
    return null;
};

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('[Notification] This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const sendNativeNotification = (title, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return null;
    }

    try {
        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            silent: false,
            ...options
        };

        const notification = new Notification(title, defaultOptions);
        notification.onclick = () => {
            window.focus();
            if (options.url) {
                window.location.href = options.url;
            }
            notification.close();
        };

        return notification;
    } catch (e) {
        console.warn('[Notification] Failed to display native notification:', e.message);
        return null;
    }
};

export default {
    registerServiceWorker,
    requestNotificationPermission,
    sendNativeNotification
};
