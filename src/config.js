// pincer API config — reads from localStorage first, falls back to env vars
export function getPincerBase() {
  return localStorage.getItem('pincer_url') || import.meta.env.VITE_PINCER_BASE || 'http://localhost:8080'
}

export function getApiKey() {
  return localStorage.getItem('pincer_api_key') || import.meta.env.VITE_API_KEY || ''
}

export function getRoomId() {
  return localStorage.getItem('pincer_room_id') || import.meta.env.VITE_ROOM_ID || ''
}

export function isConfigured() {
  return !!(getApiKey())
}

export function saveConfig({ url, apiKey, roomId }) {
  localStorage.setItem('pincer_url', url)
  localStorage.setItem('pincer_api_key', apiKey)
  if (roomId) localStorage.setItem('pincer_room_id', roomId)
}

export function clearConfig() {
  localStorage.removeItem('pincer_url')
  localStorage.removeItem('pincer_api_key')
  localStorage.removeItem('pincer_room_id')
}

export const POLL_INTERVAL = 5000 // ms
