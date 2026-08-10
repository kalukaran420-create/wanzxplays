/**
 * Resolves a media URL that may be a relative /uploads/ path (served by the
 * Railway backend) into an absolute URL. Absolute URLs (http/https) and
 * external URLs (dicebear etc.) are returned unchanged.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // Already absolute — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative /uploads/ path — prepend backend base URL
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
};
