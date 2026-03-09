// pincer API config
// VITE_PINCER_BASE: optional build-time default URL (pre-fills login form)
// API Key and Room ID are always entered by the user at login and stored in localStorage

export function getPincerBase() {
  return localStorage.getItem('pincer_url') ||
    import.meta.env.VITE_PINCER_BASE ||
    ''
}

export function getApiKey() {
  return localStorage.getItem('pincer_api_key') || ''
}

export function getRoomId() {
  return localStorage.getItem('pincer_room_id') || ''
}

/** True when both API key and room have been configured */
export function isConfigured() {
  return !!(getApiKey() && getRoomId())
}

export function saveConnection({ url, apiKey }) {
  localStorage.setItem('pincer_url', url)
  localStorage.setItem('pincer_api_key', apiKey)
}

export function saveRoomId(roomId) {
  localStorage.setItem('pincer_room_id', roomId)
}

export function clearConfig() {
  localStorage.removeItem('pincer_url')
  localStorage.removeItem('pincer_api_key')
  localStorage.removeItem('pincer_room_id')
}

/** VITE_PINCER_BASE at build time — used to decide if URL field should be pre-filled */
export const BUILD_TIME_BASE = import.meta.env.VITE_PINCER_BASE || ''

export const POLL_INTERVAL = 5000 // ms
