/**
 * Universal Native Bridge Helper for CRMHUB Omnichannel
 * Provides safe fallback between Native Capacitor (Android/iOS) and Web PWA
 */

export const isNativeApp = () => {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform());
};

export const getPlatform = () => {
    if (window.Capacitor && window.Capacitor.getPlatform) {
        return window.Capacitor.getPlatform(); // 'android', 'ios', 'web'
    }
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) return 'android';
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
    return 'web';
};

// Haptic Vibration Feedback
export const triggerHaptic = (type = 'light') => {
    try {
        if (isNativeApp() && window.Capacitor.Plugins?.Haptics) {
            const { Haptics, ImpactStyle } = window.Capacitor.Plugins;
            const style = type === 'heavy' ? ImpactStyle.Heavy : (type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light);
            Haptics.impact({ style });
        } else if ('vibrate' in navigator) {
            const ms = type === 'heavy' ? 50 : (type === 'medium' ? 30 : 15);
            navigator.vibrate(ms);
        }
    } catch (e) {
        // Silent catch for unsupported browsers
    }
};

// App Icon Unread Badge Counter
export const setBadgeCount = async (count = 0) => {
    try {
        if (isNativeApp() && window.Capacitor.Plugins?.Badge) {
            await window.Capacitor.Plugins.Badge.set({ count });
        } else if ('setAppBadge' in navigator) {
            if (count > 0) {
                await navigator.setAppBadge(count);
            } else {
                await navigator.clearAppBadge();
            }
        }
    } catch (e) {
        // Silent catch
    }
};

// Geolocation with Native/Web Fallback
export const getCurrentPosition = (options = { enableHighAccuracy: true, timeout: 10000 }) => {
    return new Promise((resolve, reject) => {
        if (isNativeApp() && window.Capacitor.Plugins?.Geolocation) {
            window.Capacitor.Plugins.Geolocation.getCurrentPosition(options)
                .then(pos => resolve({
                    coords: {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    }
                }))
                .catch(reject);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        } else {
            reject(new Error('Geolokasi GPS tidak didukung di perangkat ini'));
        }
    });
};
