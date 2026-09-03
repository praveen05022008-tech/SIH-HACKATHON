/**
 * Centralized API configuration for MAYAN-SAFE / SIF-SHIELD.
 * When deployed to Vercel, requests to /api/... resolve to the same origin serverless function.
 * In local development, if VITE_API_BASE_URL is not provided, it falls back to http://localhost:8000.
 */
export const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL !== undefined)
    ? import.meta.env.VITE_API_BASE_URL
    : (import.meta.env?.DEV ? 'http://localhost:8000' : '');

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default apiUrl;
