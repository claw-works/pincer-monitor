// pincer API config
export const PINCER_BASE = import.meta.env.VITE_PINCER_BASE || 'http://10.0.1.10:8080'
export const API_KEY = import.meta.env.VITE_API_KEY || ''
export const ROOM_ID = import.meta.env.VITE_ROOM_ID || ''
export const POLL_INTERVAL = 5000 // ms

// Startup check: warn if required config is missing
if (!API_KEY) {
  console.warn('[pincer-monitor] ⚠️ VITE_API_KEY is not set — API requests will likely return 401')
}
if (!ROOM_ID) {
  console.warn('[pincer-monitor] ⚠️ VITE_ROOM_ID is not set — message feed will be empty')
}
