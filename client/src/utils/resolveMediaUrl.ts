import { getApiBaseUrl } from './apiUrl';

/**
 * Resolves a media URL that may be a relative /uploads/ path
 * into an absolute URL. Absolute URLs (http/https) and
 * external URLs (dicebear etc.) are returned unchanged.
 */
export const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // Already absolute — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  // Relative /uploads/ path — prepend backend base URL
  if (cleanUrl.startsWith('/uploads/')) {
    const apiBase = getApiBaseUrl().replace(/\/$/, '');
    return `${apiBase}${cleanUrl}`;
  }
  return url;
};
