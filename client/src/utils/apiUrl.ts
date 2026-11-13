/**
 * Utility to resolve the API & WebSocket base URL dynamically based on environment.
 * Supports:
 * - Vercel (Frontend) + Render (Backend/WebSocket)
 * - Localhost development & LAN multi-device access (192.168.x.x)
 * - Public tunnels (Cloudflare Tunnel, Localtunnel, Ngrok)
 * - Single-service deployment (Railway / Render monorepo)
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  // 1. Explicit production backend URL configured in environment (e.g. Render / Railway)
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  // 2. In browser runtime:
  if (typeof window !== 'undefined' && window.location) {
    const { origin, hostname } = window.location;

    // When deployed on Vercel:
    if (hostname.endsWith('.vercel.app')) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/\/$/, '');
      }
      console.warn('⚠️ [PulseCord] Running on Vercel! Ensure VITE_API_URL is configured in your Vercel Dashboard to point to your Render backend URL.');
      return origin;
    }

    // For local network (192.168.x.x, 10.x.x.x) or tunnel domains (*.trycloudflare.com, *.loca.lt):
    // Use the current origin so all devices route back to the host serving the app.
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }

    // Localhost dev / unified port
    return origin;
  }

  return envUrl || 'http://localhost:5000';
};

/**
 * Returns the WebSocket base URL.
 * Checks for dedicated VITE_WS_URL, and falls back to getApiBaseUrl().
 */
export const getSocketUrl = (): string => {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (wsUrl && !wsUrl.includes('localhost') && !wsUrl.includes('127.0.0.1')) {
    return wsUrl.replace(/\/$/, '');
  }
  return getApiBaseUrl();
};
