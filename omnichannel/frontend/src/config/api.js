// Use environment variable for API URL (Vite)
// Fallback to empty string for relative path in production (same-domain)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const getApiUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Remove trailing slash from base if present
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    // Ensure path starts with slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${cleanPath}`;
};
