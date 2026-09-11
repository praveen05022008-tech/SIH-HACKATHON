/**
 * Centralized API configuration for MAYAN-SAFE / SIF-SHIELD.
 * When deployed to Vercel, requests to /api/... resolve to the same origin serverless function.
 * In local development, if VITE_API_BASE_URL is not provided, it falls back to http://localhost:8000.
 */
export const API_BASE_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'http://localhost:8000';
    }
  }
  return (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ? 'http://localhost:8000' : '';
})();

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default apiUrl;
