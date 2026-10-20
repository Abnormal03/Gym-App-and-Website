const raw = import.meta.env.VITE_API_URL || 'https://gym-app-and-website.onrender.com';
// Single place for the backend origin. Trailing slashes and a stray /api suffix are removed.
export const API_ORIGIN = raw.replace(/\/+$/, '').replace(/\/api(\/v1)?$/, '');
